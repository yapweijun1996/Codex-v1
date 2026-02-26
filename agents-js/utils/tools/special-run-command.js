function _isNodeRuntime() {
    return (typeof window === 'undefined'
        && typeof process !== 'undefined'
        && !!(process.versions && process.versions.node));
}

function _getSpawn() {
    if (!_isNodeRuntime()) return null;
    try {
        // Avoid static bundler resolution of Node core modules in browser builds.
        // eslint-disable-next-line no-eval
        const req = (typeof require === 'function') ? require : (0, eval)('require');
        const mod = req('child_process');
        return mod && typeof mod.spawn === 'function' ? mod.spawn : null;
    } catch {
        return null;
    }
}
const { makeFailureFingerprint, DEFAULT_TOOL_TIMEOUT_MS, isRateLimitLike } = require('../self-heal');
const { recordToolFailure, clearToolFailure, classifyToolFailure } = require('../agent-self-heal');
const { wrapToolOutput, buildToolResultMessage } = require('../agent-tool-formatter');
const { guardToolOutput } = require('../agent-tool-output-guard');
const { now, getActiveToolsSnapshot } = require('../agent-timing');
const { SecurityValidator } = require('../security');
function emitToolResultGuarded({ agent, toolName, args, output }) {
    const guarded = guardToolOutput({
        toolName,
        value: output,
        limits: agent && agent.toolOutputLimits,
    });
    if (agent && typeof agent.emit === 'function') {
        agent.emit('tool_result', {
            tool: toolName,
            args,
            result: guarded,
        });
    }
    return guarded;
}
async function handleRunCommand({ agent, call, args, startTime, signal }) {
    const spawn = _getSpawn();
    const command = args && typeof args.command === 'string' ? args.command : '';
    if (signal && signal.aborted) {
        const output = { error: 'Aborted', message: 'Execution aborted.' };
        const guardedOutput = emitToolResultGuarded({ agent, toolName: call.name, args, output });
        const mcpResult = wrapToolOutput({
            toolFailureStreak: agent._toolFailureStreak,
            toolName: call.name,
            output: guardedOutput,
            isError: true,
            limits: agent && agent.toolOutputLimits,
        });
        const resultMessage = buildToolResultMessage({
            callId: call.id,
            toolName: call.name,
            mcpResult,
        });
        const endTime = now();
        agent._activeTools.delete(call.id);
        agent.emit('tool_call_end', {
            id: call.id,
            name: call.name,
            success: false,
            durationMs: Math.max(0, Math.round(endTime - startTime)),
        });
        if (agent._activeTools.size > 0) {
            agent._setState('executing', { active: getActiveToolsSnapshot(agent) });
        } else {
            agent._setState('thinking', { reason: 'tool_aborted' });
        }
        return { handled: true, resultMessage };
    }
    const verdict = SecurityValidator.validateTool('run_command', { command });
    if (!verdict.safe) {
        const output = {
            error: 'Access Denied',
            reason: verdict.reason || 'Restricted command',
            platform: verdict.platform,
        };

        const guardedOutput = emitToolResultGuarded({ agent, toolName: call.name, args, output });

        recordToolFailure({
            toolFailureStreak: agent._toolFailureStreak,
            toolName: call.name,
            fingerprintOrType: 'access_denied',
            args,
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
        if (agent._activeTools.size > 0) {
            agent._setState('executing', { active: getActiveToolsSnapshot(agent) });
        }

        const resultMessage = buildToolResultMessage({
            callId: call.id,
            toolName: call.name,
            mcpResult,
        });

        return { handled: true, resultMessage };
    }

    const timeoutMs = (args && typeof args.timeoutMs === 'number' && Number.isFinite(args.timeoutMs) && args.timeoutMs > 0)
        ? args.timeoutMs
        : agent.toolTimeoutMs || DEFAULT_TOOL_TIMEOUT_MS;

    agent.emit('exec_command_begin', {
        id: call.id,
        command,
        timestamp: new Date().toISOString(),
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    if (!spawn) {
        const output = {
            error: 'Environment Restriction',
            message: 'run_command is not available in this runtime.',
        };

        const guardedOutput = emitToolResultGuarded({ agent, toolName: call.name, args, output });

        recordToolFailure({
            toolFailureStreak: agent._toolFailureStreak,
            toolName: call.name,
            fingerprintOrType: 'environment_restriction',
            args,
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
        if (agent._activeTools.size > 0) {
            agent._setState('executing', { active: getActiveToolsSnapshot(agent) });
        }

        const resultMessage = buildToolResultMessage({
            callId: call.id,
            toolName: call.name,
            mcpResult,
        });

        return { handled: true, resultMessage };
    }

    const child = spawn(command, { shell: true });
    let spawnError = null;
    let aborted = false;
    const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
    }, timeoutMs);

    let abortHandler = null;
    if (signal && typeof signal.addEventListener === 'function') {
        abortHandler = () => {
            aborted = true;
            child.kill('SIGTERM');
        };
        if (signal.aborted) abortHandler();
        else signal.addEventListener('abort', abortHandler, { once: true });
    }

    if (child.stdout) {
        child.stdout.on('data', (chunk) => {
            const text = String(chunk);
            stdout += text;
            agent.emit('exec_command_output', { id: call.id, stream: 'stdout', chunk: text });
        });
    }
    if (child.stderr) {
        child.stderr.on('data', (chunk) => {
            const text = String(chunk);
            stderr += text;
            agent.emit('exec_command_output', { id: call.id, stream: 'stderr', chunk: text });
        });
    }

    const exitCode = await new Promise((resolve) => {
        child.on('error', (error) => {
            spawnError = error;
            resolve(1);
        });
        child.on('close', (code, signalName) => {
            clearTimeout(timeout);
            if (signalName === 'SIGTERM' || signalName === 'SIGKILL') timedOut = true;
            resolve(typeof code === 'number' ? code : 0);
        });
    });
    if (abortHandler && signal && typeof signal.removeEventListener === 'function') {
        signal.removeEventListener('abort', abortHandler);
    }

    const output = {
        stdout: String(stdout).trim(),
        stderr: String(stderr).trim(),
        exitCode: typeof exitCode === 'number' ? exitCode : 0,
    };

    if (spawnError) {
        output.error = 'Tool execution failed';
        output.message = String(spawnError.message || spawnError);
    } else if (aborted) {
        output.error = 'Aborted';
        output.exitCode = 130;
    } else if (timedOut) {
        output.error = 'Timeout';
        output.timeoutMs = timeoutMs;
        output.exitCode = 124;
    }

    const failureType = timedOut
        ? 'timeout'
        : classifyToolFailure({ toolName: call.name, output, isRateLimitLike });

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

    const mcpResult = wrapToolOutput({
        toolFailureStreak: agent._toolFailureStreak,
        toolName: call.name,
        output: emitToolResultGuarded({ agent, toolName: call.name, args, output }),
        isError: Boolean(failureType),
        limits: agent && agent.toolOutputLimits,
    });

    const endTime = now();
    agent._activeTools.delete(call.id);
    agent.emit('exec_command_end', {
        id: call.id,
        command,
        exitCode: output.exitCode,
        success: !failureType,
        durationMs: Math.max(0, Math.round(endTime - startTime)),
    });
    agent.emit('tool_call_end', {
        id: call.id,
        name: call.name,
        success: !failureType,
        durationMs: Math.max(0, Math.round(endTime - startTime)),
    });
    if (agent._activeTools.size > 0) {
        agent._setState('executing', { active: getActiveToolsSnapshot(agent) });
    }

    const resultMessage = buildToolResultMessage({
        callId: call.id,
        toolName: call.name,
        mcpResult,
    });

    return { handled: true, resultMessage };
}

module.exports = { handleRunCommand };
