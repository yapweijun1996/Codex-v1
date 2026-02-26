const { prepareBatchApprovals } = require('./agent-tool-approval');
const { executeToolCall } = require('./agent-tool-exec');
function buildSyntheticToolPlan(toolCalls) {
    const lines = [];
    lines.push('Thought: I need to use tools to gather required information before answering.');
    lines.push('Plan:');
    toolCalls.forEach((call, idx) => {
        let argsPreview = '';
        try {
            const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : (call.arguments || {});
            const compact = JSON.stringify(args);
            argsPreview = compact && compact !== '{}' ? ` with ${compact}` : '';
        } catch {
            argsPreview = '';
        }
        lines.push(`${idx + 1}. Call ${call.name}${argsPreview}.`);
    });
    lines.push('Action: Calling tool(s) now.');
    return lines.join('\n') + '\n';
}
async function executeTools(agent, toolCalls, options = {}) {
    const results = [];
    agent._activeTools.clear();
    const toolMeta = toolCalls.map((call) => ({ id: call.id, name: call.name }));
    // Do not mark tools as executing before approvals are granted.
    agent._setState('thinking', { reason: 'tools_planned', toolCalls: toolMeta });
    const { needsApproval, batchDecisions } = await prepareBatchApprovals({ agent, toolCalls });
    const signal = options && options.signal ? options.signal : null;
    const handleCall = (call) => executeToolCall({ agent, call, toolMeta, batchDecisions, signal });
    const outputs = needsApproval
        ? await (async () => {
            const ordered = [];
            for (const call of toolCalls) {
                ordered.push(await handleCall(call));
            }
            return ordered;
        })()
        : await Promise.all(toolCalls.map(handleCall));
    agent._activeTools.clear();
    agent._setState('thinking', { reason: 'tools_completed', toolCount: toolCalls.length });
    return outputs.length ? outputs : results;
}
module.exports = { executeTools, buildSyntheticToolPlan };
