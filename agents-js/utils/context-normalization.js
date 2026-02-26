const { isToolResultMessage } = require('./token-estimator');

function buildToolCallMaps(history) {
    const callIdToAssistantIndex = new Map();
    const callIdToResultIndices = new Map();

    for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        if (!msg || typeof msg !== 'object') continue;

        if (msg.role === 'assistant' && Array.isArray(msg.tool_calls)) {
            for (const tc of msg.tool_calls) {
                if (!tc || typeof tc.id !== 'string') continue;
                if (!callIdToAssistantIndex.has(tc.id)) callIdToAssistantIndex.set(tc.id, i);
            }
        }

        if (isToolResultMessage(msg) && typeof msg.tool_call_id === 'string') {
            const list = callIdToResultIndices.get(msg.tool_call_id) || [];
            list.push(i);
            callIdToResultIndices.set(msg.tool_call_id, list);
        }
    }

    return { callIdToAssistantIndex, callIdToResultIndices };
}

function buildAbortedToolResult(callId, name) {
    const msg = {
        role: 'system',
        tool_call_id: callId,
        content: JSON.stringify({
            content: [{ type: 'text', text: 'aborted' }],
            isError: true,
        }),
    };

    if (typeof name === 'string') msg.name = name;
    return msg;
}

function normalizeToolResultMessage(msg, name) {
    if (!msg || typeof msg !== 'object') return msg;
    if (typeof name !== 'string' || msg.name) return msg;
    return { ...msg, name };
}

function enforceToolIntegrity(selectedIndices, history) {
    const kept = new Set(selectedIndices);
    const { callIdToAssistantIndex, callIdToResultIndices } = buildToolCallMaps(history);

    for (const [callId, resIdxs] of callIdToResultIndices.entries()) {
        const assistantIdx = callIdToAssistantIndex.get(callId);
        const assistantKept = typeof assistantIdx === 'number' && kept.has(assistantIdx);
        if (!assistantKept) {
            for (const idx of resIdxs) kept.delete(idx);
        }
    }

    return Array.from(kept).sort((a, b) => a - b);
}

function normalizeHistory(history) {
    if (!Array.isArray(history)) return history;

    const assistantCallIds = new Set();
    const callIdToToolName = new Map();
    for (const msg of history) {
        if (!msg || msg.role !== 'assistant' || !Array.isArray(msg.tool_calls)) continue;
        for (const tc of msg.tool_calls) {
            if (!tc || typeof tc.id !== 'string') continue;
            assistantCallIds.add(tc.id);
            if (typeof tc.name === 'string' && !callIdToToolName.has(tc.id)) {
                callIdToToolName.set(tc.id, tc.name);
            }
        }
    }

    const callIdToResultMsg = new Map();
    for (const msg of history) {
        if (!isToolResultMessage(msg)) continue;
        if (!assistantCallIds.has(msg.tool_call_id)) continue;
        if (!callIdToResultMsg.has(msg.tool_call_id)) {
            callIdToResultMsg.set(msg.tool_call_id, msg);
        }
    }

    const out = [];

    for (const msg of history) {
        if (isToolResultMessage(msg)) {
            continue;
        }

        out.push(msg);

        if (!msg || msg.role !== 'assistant' || !Array.isArray(msg.tool_calls)) continue;
        for (const tc of msg.tool_calls) {
            if (!tc || typeof tc.id !== 'string') continue;
            const name = typeof tc.name === 'string' ? tc.name : callIdToToolName.get(tc.id);
            const existing = callIdToResultMsg.get(tc.id);
            if (existing) {
                out.push(normalizeToolResultMessage(existing, name));
                continue;
            }

            out.push(buildAbortedToolResult(tc.id, name));
        }
    }

    return out;
}

module.exports = {
    enforceToolIntegrity,
    normalizeHistory,
};
