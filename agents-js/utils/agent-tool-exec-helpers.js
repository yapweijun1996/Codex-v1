const { guardToolOutput } = require('./agent-tool-output-guard');
const { now, getActiveToolsSnapshot } = require('./agent-timing');

function beginToolCall({ agent, call, args, toolMeta }) {
    const startTime = now();
    agent._activeTools.set(call.id, { id: call.id, name: call.name, startTime });
    agent.emit('tool_call_begin', {
        id: call.id,
        name: call.name,
        args: args === undefined ? null : args,
        timestamp: new Date().toISOString(),
    });
    agent._setState('executing', { toolCalls: toolMeta, active: getActiveToolsSnapshot(agent) });
    return startTime;
}

function emitToolResult({ agent, toolName, args, output }) {
    const guarded = guardToolOutput({
        toolName,
        value: output,
        limits: agent && agent.toolOutputLimits,
    });
    agent.emit('tool_result', { tool: toolName, args: args === undefined ? null : args, result: guarded });
    return guarded;
}

function endToolCall({ agent, callId, toolName, startTime, success }) {
    const endTime = now();
    agent._activeTools.delete(callId);
    agent.emit('tool_call_end', {
        id: callId,
        name: toolName,
        success: Boolean(success),
        durationMs: Math.max(0, Math.round(endTime - (startTime || endTime))),
    });
    if (agent._activeTools.size > 0) {
        agent._setState('executing', { active: getActiveToolsSnapshot(agent) });
    }
    return endTime;
}

module.exports = {
    beginToolCall,
    emitToolResult,
    endToolCall,
};
