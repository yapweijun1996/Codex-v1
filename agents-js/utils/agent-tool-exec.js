const {
    DEFAULT_TOOL_TIMEOUT_MS,
    makeFailureFingerprint,
    stableStringify,
    isRateLimitLike,
} = require('./self-heal');
const {
    isBrowserRuntime,
    isBrowserEnvRestrictionLikeMessage,
    classifyToolFailure,
    recordToolFailure,
    clearToolFailure,
} = require('./agent-self-heal');
const { callToolWithTimeout } = require('./agent-timeout');
const { buildToolResultMessage, wrapToolOutput } = require('./agent-tool-formatter');
const { guardToolOutput } = require('./agent-tool-output-guard');
const { beginToolCall, emitToolResult, endToolCall } = require('./agent-tool-exec-helpers');
const { handleSpecialTool } = require('./agent-tool-specials');
const { now, getActiveToolsSnapshot } = require('./agent-timing');
const { RiskLevel } = require('./imda-constants');
const { getToolRisk } = require('./agent-tools-registry');
const { requireApprovalIfNeeded } = require('./agent-tool-approval');

async function executeToolCall({ agent, call, toolMeta, batchDecisions, signal }) {
    let startTime = null;
    let began = false;
    if (signal && signal.aborted) {
        let argsForBegin = null;
        try {
            argsForBegin = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
        } catch {
            argsForBegin = null;
        }
        startTime = beginToolCall({ agent, call, args: argsForBegin, toolMeta });
        began = true;

        const output = { error: 'Aborted', message: 'Execution aborted.' };
        const guardedOutput = emitToolResult({ agent, toolName: call.name, args: argsForBegin, output });

        const mcpResult = wrapToolOutput({
            toolFailureStreak: agent._toolFailureStreak,
            toolName: call.name,
            output: guardedOutput,
            isError: true,
            limits: agent && agent.toolOutputLimits,
        });
        endToolCall({ agent, callId: call.id, toolName: call.name, startTime, success: false });
        return buildToolResultMessage({ callId: call.id, toolName: call.name, mcpResult });
    }
    const tool = agent.tools[call.name];
    if (!tool) {
        startTime = now();
        agent._activeTools.set(call.id, { id: call.id, name: call.name, startTime });
        began = true;
        agent.emit('tool_call_begin', { id: call.id, name: call.name, args: null, timestamp: new Date().toISOString() });
        agent._setState('executing', { toolCalls: toolMeta, active: getActiveToolsSnapshot(agent) });
        let argsForFingerprint;
        try {
            argsForFingerprint = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
        } catch {
            argsForFingerprint = undefined;
        }

        const output = {
            error: 'Tool not found',
            tool: call.name,
            hint: "Use list_available_skills to discover the correct tool, then read_skill_documentation before calling it.",
        };
        const guardedOutput = emitToolResult({ agent, toolName: call.name, args: null, output });
        recordToolFailure({
            toolFailureStreak: agent._toolFailureStreak,
            toolName: call.name,
            fingerprintOrType: 'tool_not_found',
            args: argsForFingerprint,
            makeFailureFingerprint,
        });
        const mcpResult = wrapToolOutput({
            toolFailureStreak: agent._toolFailureStreak,
            toolName: call.name,
            output: guardedOutput,
            isError: true,
            limits: agent && agent.toolOutputLimits,
        });
        const endTime = now();
        agent._activeTools.delete(call.id);
        agent.emit('tool_call_end', {
            id: call.id,
            name: call.name,
            success: false,
            durationMs: Math.max(0, Math.round(endTime - startTime)),
        });
        agent._setState('executing', { active: getActiveToolsSnapshot(agent) });
        return buildToolResultMessage({ callId: call.id, toolName: call.name, mcpResult });
    }
    try {
        let args;
        args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
        const toolRisk = getToolRisk(agent, call.name, tool);
        const agentTier = agent.riskProfile ? agent.riskProfile.tier : RiskLevel.NONE;

        const approval = await requireApprovalIfNeeded({
            agent,
            call,
            tool,
            args,
            toolRisk,
            agentTier,
            batchDecisions,
        });
        if (approval && approval.deniedResultMessage) return approval.deniedResultMessage;

        startTime = now();
        agent._activeTools.set(call.id, { id: call.id, name: call.name, startTime });
        began = true;
        agent.emit('tool_call_begin', { id: call.id, name: call.name, args, timestamp: new Date().toISOString() });
        agent._setState('executing', { toolCalls: toolMeta, active: getActiveToolsSnapshot(agent) });

        const special = await handleSpecialTool({ agent, call, args, startTime, signal });
        if (special && special.handled) {
            return special.resultMessage;
        }
        console.log(`  > Executing ${call.name} with args:`, args);
        const toolPromise = callToolWithTimeout({
            fn: () => tool.func(args),
            timeoutMs: agent.toolTimeoutMs,
            defaultTimeoutMs: DEFAULT_TOOL_TIMEOUT_MS,
        }).then((value) => ({ kind: 'tool', value })).catch((error) => ({ kind: 'error', error }));

        const abortPromise = (signal && typeof signal.addEventListener === 'function')
            ? new Promise((resolve) => {
                if (signal.aborted) resolve({ kind: 'abort' });
                else signal.addEventListener('abort', () => resolve({ kind: 'abort' }), { once: true });
            })
            : null;

        const outcome = abortPromise
            ? await Promise.race([toolPromise, abortPromise])
            : await toolPromise;

        if (outcome && outcome.kind === 'abort') {
            toolPromise.then(() => null, () => null);
            const output = { error: 'Aborted', message: 'Execution aborted.' };
            const guardedOutput = emitToolResult({ agent, toolName: call.name, args, output });
            const mcpResult = wrapToolOutput({
                toolFailureStreak: agent._toolFailureStreak,
                toolName: call.name,
                output: guardedOutput,
                isError: true,
                limits: agent && agent.toolOutputLimits,
            });
            endToolCall({ agent, callId: call.id, toolName: call.name, startTime, success: false });
            return buildToolResultMessage({ callId: call.id, toolName: call.name, mcpResult });
        }

        if (outcome && outcome.kind === 'error') throw outcome.error;
        const timed = outcome.value;
        const rawOutput = timed.timedOut
            ? {
                error: 'Timeout',
                timeoutMs: agent.toolTimeoutMs,
                message: `Tool execution exceeded ${agent.toolTimeoutMs}ms`,
            }
            : timed.value;
        let output = (rawOutput === undefined) ? null : rawOutput;
        let formatError = false;
        if (!timed.timedOut) {
            try {
                JSON.stringify(output);
            } catch {
                formatError = true;
                try {
                    output = JSON.parse(stableStringify(output));
                } catch {
                    output = { error: 'Format Error', message: 'Tool output was not JSON serializable.' };
                }
            }
        }
        const failureType = timed.timedOut
            ? 'timeout'
            : (formatError ? 'format_error' : classifyToolFailure({
                toolName: call.name,
                output,
                isRateLimitLike,
            }));
        if (failureType) {
            recordToolFailure({
                toolFailureStreak: agent._toolFailureStreak,
                toolName: call.name,
                fingerprintOrType: failureType,
                args,
                makeFailureFingerprint,
            });
        } else {
            clearToolFailure({ toolFailureStreak: agent._toolFailureStreak, toolName: call.name });
        }
        const guardedOutput = guardToolOutput({
            toolName: call.name,
            value: output,
            limits: agent && agent.toolOutputLimits,
        });
        agent.emit('tool_result', {
            tool: call.name,
            args,
            result: guardedOutput
        });
        const mcpResult = wrapToolOutput({
            toolFailureStreak: agent._toolFailureStreak,
            toolName: call.name,
            output: guardedOutput,
            isError: Boolean(failureType),
            limits: agent && agent.toolOutputLimits,
        });
        const endTime = now();
        agent._activeTools.delete(call.id);
        agent.emit('tool_call_end', {
            id: call.id,
            name: call.name,
            success: !failureType,
            durationMs: Math.max(0, Math.round(endTime - startTime)),
        });
        if (agent._activeTools.size > 0) {
            agent._setState('executing', { active: getActiveToolsSnapshot(agent) });
        }
        return buildToolResultMessage({ callId: call.id, toolName: call.name, mcpResult });
    } catch (error) {
        console.error(`  > Error executing ${call.name}:`, error);
        agent.emit('tool_error', {
            tool: call.name,
            error: error.message
        });
        const errorMessage = String(error && error.message ? error.message : error);
        const errorCode = error && typeof error.code === 'string' ? error.code : undefined;
        let argsForFingerprint;
        try {
            argsForFingerprint = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
        } catch {
            argsForFingerprint = undefined;
        }
        const output = {
            error: 'Tool execution failed',
            message: errorMessage,
            code: errorCode,
        };
        const guardedOutput = emitToolResult({ agent, toolName: call.name, args: began ? argsForFingerprint : null, output });
        const failureType = classifyToolFailure({
            toolName: call.name,
            output,
            isRateLimitLike,
        }) || (() => {
            if (isBrowserRuntime() && isBrowserEnvRestrictionLikeMessage(errorMessage)) {
                return 'environment_restriction';
            }
            return isRateLimitLike(errorMessage) ? 'rate_limited' : `exception:${errorMessage}`;
        })();
        recordToolFailure({
            toolFailureStreak: agent._toolFailureStreak,
            toolName: call.name,
            fingerprintOrType: failureType,
            args: argsForFingerprint,
            makeFailureFingerprint,
        });
        const mcpResult = wrapToolOutput({
            toolFailureStreak: agent._toolFailureStreak,
            toolName: call.name,
            output: guardedOutput,
            isError: true,
            limits: agent && agent.toolOutputLimits,
        });
        const endTime = now();
        if (began) {
            endToolCall({ agent, callId: call.id, toolName: call.name, startTime, success: false });
        }
        if (agent._activeTools.size > 0) {
            agent._setState('executing', { active: getActiveToolsSnapshot(agent) });
        } else {
            agent._setState('thinking', { reason: 'tool_error' });
        }
        return buildToolResultMessage({ callId: call.id, toolName: call.name, mcpResult });
    }
}

module.exports = { executeToolCall };
