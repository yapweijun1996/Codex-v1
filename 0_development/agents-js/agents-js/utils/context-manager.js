const { estimateTokens, isToolResultMessage } = require('./token-estimator');
const { enforceToolIntegrity, normalizeHistory } = require('./context-normalization');

function getToolCallIdsFromAssistantMessage(msg) {
    if (!msg || msg.role !== 'assistant' || !Array.isArray(msg.tool_calls)) return [];
    return msg.tool_calls
        .map(tc => (tc && typeof tc.id === 'string') ? tc.id : null)
        .filter(Boolean);
}

function isInstructionLikeUserMessage(msg) {
    if (!msg || msg.role !== 'user') return false;
    if (typeof msg.content !== 'string') return false;

    const trimmed = msg.content.trimStart();
    const lowered = trimmed.toLowerCase();
    const summaryPrefix = 'Another language model started to solve this problem';

    return trimmed.startsWith('# AGENTS.md instructions for ')
        || trimmed.startsWith('<user_instructions>')
        || trimmed.startsWith('<skill')
        || lowered.startsWith('<environment_context>')
        || lowered.startsWith('<turn_aborted>')
        || trimmed.startsWith(summaryPrefix);
}

function filterPromptHistory(history) {
    if (!Array.isArray(history)) return [];
    return history.filter((msg) => {
        if (!msg || typeof msg !== 'object') return false;
        if (msg.role !== 'system' && msg.role !== 'tool') return true;
        return isToolResultMessage(msg);
    });
}

function groupSelectedIntoAtoms(selectedIndices, history, headCount, protectedIndices) {
    const selectedSet = new Set(selectedIndices);
    const protectedSet = protectedIndices instanceof Set ? protectedIndices : new Set();
    const callIdToAssistantIndex = new Map();
    const callIdToResultIndices = new Map();

    for (const idx of selectedIndices) {
        const msg = history[idx];
        if (!msg || typeof msg !== 'object') continue;

        if (msg.role === 'assistant' && Array.isArray(msg.tool_calls)) {
            for (const tc of msg.tool_calls) {
                if (!tc || typeof tc.id !== 'string') continue;
                if (!callIdToAssistantIndex.has(tc.id)) callIdToAssistantIndex.set(tc.id, idx);
            }
        }

        if (isToolResultMessage(msg)) {
            const list = callIdToResultIndices.get(msg.tool_call_id) || [];
            list.push(idx);
            callIdToResultIndices.set(msg.tool_call_id, list);
        }
    }

    const assistantIndexToResultIndices = new Map();
    for (const [callId, resIdxs] of callIdToResultIndices.entries()) {
        const assistantIdx = callIdToAssistantIndex.get(callId);
        if (typeof assistantIdx !== 'number') continue;
        const list = assistantIndexToResultIndices.get(assistantIdx) || [];
        for (const rIdx of resIdxs) list.push(rIdx);
        assistantIndexToResultIndices.set(assistantIdx, list);
    }

    const assigned = new Set();
    const atoms = [];

    for (const idx of selectedIndices) {
        if (assigned.has(idx)) continue;
        const msg = history[idx];
        let atomIndices = [idx];

        if (msg && msg.role === 'assistant' && Array.isArray(msg.tool_calls)) {
            const resIdxs = assistantIndexToResultIndices.get(idx) || [];
            for (const rIdx of resIdxs) {
                if (selectedSet.has(rIdx)) atomIndices.push(rIdx);
            }
        }

        atomIndices = Array.from(new Set(atomIndices)).sort((a, b) => a - b);
        for (const i of atomIndices) assigned.add(i);

        atoms.push({
            indices: atomIndices,
            protected: atomIndices.some((i) => i < headCount || protectedSet.has(i)),
            minIndex: atomIndices[0],
        });
    }

    return atoms.sort((a, b) => a.minIndex - b.minIndex);
}

function truncateWithMarker(text, maxChars) {
    if (typeof text !== 'string') return text;
    if (!Number.isFinite(maxChars) || maxChars <= 0) {
        const removed = text.length;
        return `…${removed} chars truncated…`;
    }
    if (text.length <= maxChars) return text;

    const removed = text.length - maxChars;
    const left = Math.floor(maxChars / 2);
    const right = Math.max(0, maxChars - left);
    const prefix = text.slice(0, left);
    const suffix = right > 0 ? text.slice(text.length - right) : '';
    return `${prefix}…${removed} chars truncated…${suffix}`;
}

function maybeTruncateLargeToolOutputs(history, { maxToolOutputChars } = {}) {
    if (!maxToolOutputChars || !Array.isArray(history)) return history;
    const cap = Number(maxToolOutputChars);
    if (!Number.isFinite(cap) || cap <= 0) return history;

    return history.map((msg) => {
        if (!msg || typeof msg !== 'object') return msg;
        if (msg.role !== 'system' && msg.role !== 'tool') return msg;
        if (typeof msg.content !== 'string') return msg;
        if (msg.content.length <= cap) return msg;

        return {
            ...msg,
            content: truncateWithMarker(msg.content, cap),
        };
    });
}

class ContextManager {
    constructor(options = {}) {
        this.defaults = {
            maxMessages: 16,
            preserveHeadMessages: 2,
            protectRecentMessages: 0,
            maxEstimatedTokens: undefined,
            maxToolOutputChars: undefined,
            ...options,
        };
    }

    process(history, options = {}) {
        const cfg = { ...this.defaults, ...options };
        const fullLength = Array.isArray(history) ? history.length : 0;
        const original = filterPromptHistory(history);

        const maxMessages = Math.max(1, Number(cfg.maxMessages) || 16);
        const preserveHeadMessages = Math.max(0, Math.min(maxMessages, Number(cfg.preserveHeadMessages) || 0));
        const protectRecentMessages = Math.max(0, Math.min(original.length, Number(cfg.protectRecentMessages) || 0));
        const protectedIndices = new Set();
        if (protectRecentMessages > 0) {
            const start = Math.max(0, original.length - protectRecentMessages);
            for (let i = start; i < original.length; i++) protectedIndices.add(i);
        }
        for (let i = 0; i < original.length; i++) {
            if (isInstructionLikeUserMessage(original[i])) protectedIndices.add(i);
        }

        const headCount = Math.min(preserveHeadMessages, original.length, maxMessages);
        let selected;

        if (original.length <= maxMessages) {
            selected = Array.from({ length: original.length }, (_, i) => i);
        } else {
            const tailCount = Math.max(0, maxMessages - headCount);
            const indices = new Set();
            for (let i = 0; i < headCount; i++) indices.add(i);
            const tailStart = Math.max(headCount, original.length - tailCount);
            for (let i = tailStart; i < original.length; i++) indices.add(i);
            for (const idx of protectedIndices) indices.add(idx);
            selected = Array.from(indices).sort((a, b) => a - b);
        }

        selected = enforceToolIntegrity(selected, original);

        // Token-driven trimming: drop oldest non-head messages until under limit.
        const maxEstimatedTokens = cfg.maxEstimatedTokens;
        if (Number.isFinite(Number(maxEstimatedTokens))) {
            const cap = Number(maxEstimatedTokens);

            // Keep dropping from just after the head, respecting tool integrity.
            // Stop when nothing removable remains.
            while (true) {
                const current = selected.map(i => original[i]);
                const currentTokens = estimateTokens(normalizeHistory(current));
                if (currentTokens <= cap) break;

                const atoms = groupSelectedIntoAtoms(selected, original, headCount, protectedIndices);
                const removableAtoms = atoms.filter(atom => !atom.protected);
                if (removableAtoms.length === 0) break;

                const dropAtom = removableAtoms[0];
                const dropSet = new Set(dropAtom.indices);
                selected = selected.filter(i => !dropSet.has(i));
                selected = enforceToolIntegrity(selected, original);
            }
        }

        let outHistory = selected.map(i => original[i]);
        outHistory = normalizeHistory(outHistory);
        outHistory = maybeTruncateLargeToolOutputs(outHistory, cfg);

        return {
            history: outHistory,
            meta: {
                dropped: Math.max(0, fullLength - outHistory.length),
                estimatedTokens: estimateTokens(outHistory),
            },
        };
    }
}

module.exports = { ContextManager, estimateTokens };
