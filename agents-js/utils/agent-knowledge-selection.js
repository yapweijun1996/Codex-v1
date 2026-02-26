const { parseToolResultContent } = require('./agent-tool-flow-helpers');
const { extractKnowledgeSelectionFromParsed, isKnowledgeToolName } = require('./knowledge-evidence');

function parseToolArgs(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    if (typeof raw !== 'string') return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

function buildToolCallMap(toolCalls) {
    const map = new Map();
    if (!Array.isArray(toolCalls)) return map;
    for (const call of toolCalls) {
        if (!call || typeof call !== 'object') continue;
        const id = call.id ? String(call.id) : '';
        if (!id) continue;
        map.set(id, call);
    }
    return map;
}

function toSelectedIds(selection) {
    const list = Array.isArray(selection && selection.selected) ? selection.selected : [];
    return list
        .map((item) => (item && item.id ? String(item.id).trim() : ''))
        .filter(Boolean);
}

function recordKnowledgeSelections({
    agent,
    toolCalls,
    toolResults,
    turnCount,
}) {
    if (!agent || typeof agent !== 'object') return 0;
    if (!Array.isArray(toolResults) || toolResults.length === 0) return 0;

    if (!Array.isArray(agent._knowledgeSelectedThisTurn)) agent._knowledgeSelectedThisTurn = [];
    if (!(agent._knowledgeSelectedIdSet instanceof Set)) agent._knowledgeSelectedIdSet = new Set();
    const idSet = agent._knowledgeSelectedIdSet;
    const callMap = buildToolCallMap(toolCalls);

    let emitted = 0;
    for (let i = 0; i < toolResults.length; i += 1) {
        const result = toolResults[i];
        const callId = result && result.tool_call_id ? String(result.tool_call_id) : '';
        const linkedCall = (callId && callMap.get(callId)) || (Array.isArray(toolCalls) ? toolCalls[i] : null);
        const toolName = String((result && result.name) || (linkedCall && linkedCall.name) || '').trim();
        if (!isKnowledgeToolName(toolName)) continue;

        const parsed = parseToolResultContent(result);
        const args = parseToolArgs(linkedCall && linkedCall.arguments);
        const selection = extractKnowledgeSelectionFromParsed({
            toolName,
            args,
            parsedToolResult: parsed,
            maxSelected: 6,
            minScore: Number.isFinite(Number(agent.ragConfig && agent.ragConfig.minScore))
                ? Number(agent.ragConfig.minScore)
                : null,
        });
        if (!selection) continue;

        const selectedIds = toSelectedIds(selection);
        if (selectedIds.length === 0) continue;

        const newSelectedIds = [];
        for (const id of selectedIds) {
            if (idSet.has(id)) continue;
            idSet.add(id);
            newSelectedIds.push(id);
        }

        const payload = {
            ...selection,
            callId: callId || (linkedCall && linkedCall.id ? String(linkedCall.id) : ''),
            step: Number.isFinite(Number(turnCount)) ? Number(turnCount) : null,
            selectedIds,
            newSelectedIds,
            timestamp: new Date().toISOString(),
        };
        agent._knowledgeSelectedThisTurn.push(payload);
        if (typeof agent.emit === 'function') agent.emit('knowledge_selected', payload);
        emitted += 1;
    }

    return emitted;
}

module.exports = { recordKnowledgeSelections };
