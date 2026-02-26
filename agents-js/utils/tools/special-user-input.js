const { makeFailureFingerprint } = require('../self-heal');
const { recordToolFailure, clearToolFailure } = require('../agent-self-heal');
const { wrapToolOutput, buildToolResultMessage } = require('../agent-tool-formatter');
const { guardToolOutput } = require('../agent-tool-output-guard');
const { now, getActiveToolsSnapshot } = require('../agent-timing');

async function handleRequestUserInput({ agent, call, args, startTime }) {
    const questions = Array.isArray(args && args.questions)
        ? args.questions
        : (typeof (args && args.question) === 'string'
            ? [{ question: args.question, options: Array.isArray(args.options) ? args.options : undefined }]
            : []);
    const waitPromise = agent._awaitUserInput(call.id, agent.toolTimeoutMs);
    const payload = { callId: call.id, questions };
    agent.emit('user_input_requested', payload);
    agent._setState('awaiting_input', { callId: call.id, questions });

    const result = await waitPromise;
    const output = result.timedOut
        ? { error: 'Timeout', timeoutMs: agent.toolTimeoutMs, message: 'User input timed out.' }
        : { response: result.value };

    const guardedOutput = guardToolOutput({
        toolName: call.name,
        value: output,
        limits: agent && agent.toolOutputLimits,
    });
    agent.emit('tool_result', { tool: call.name, args, result: guardedOutput });

    if (result.timedOut) {
        recordToolFailure({
            toolFailureStreak: agent._toolFailureStreak,
            toolName: call.name,
            fingerprintOrType: 'timeout',
            args,
            makeFailureFingerprint,
        });
    } else {
        clearToolFailure({ toolFailureStreak: agent._toolFailureStreak, toolName: call.name });
    }

    const mcpResult = wrapToolOutput({
        toolFailureStreak: agent._toolFailureStreak,
        toolName: call.name,
        output: guardedOutput,
        isError: result.timedOut,
        limits: agent && agent.toolOutputLimits,
    });

    const endTime = now();
    agent._activeTools.delete(call.id);
    agent.emit('tool_call_end', {
        id: call.id,
        name: call.name,
        success: !result.timedOut,
        durationMs: Math.max(0, Math.round(endTime - startTime)),
    });
    if (agent._activeTools.size > 0) {
        agent._setState('executing', { active: getActiveToolsSnapshot(agent) });
    } else {
        agent._setState('thinking', { reason: 'user_input_received' });
    }

    const resultMessage = buildToolResultMessage({
        callId: call.id,
        toolName: call.name,
        mcpResult,
    });

    return { handled: true, resultMessage };
}

module.exports = { handleRequestUserInput };
