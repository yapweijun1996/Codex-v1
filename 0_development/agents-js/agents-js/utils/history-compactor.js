const { estimateTextTokens } = require('./token-estimator');
const {
    SUMMARY_PREFIX,
    isStrongInstruction,
    isEnvironmentContext,
    isTurnAborted,
} = require('./agent-history-helpers');
const { truncateText, sanitizeSummaryText } = require('./text-utils');

const SUMMARY_PROMPT = [
    'You are performing a CONTEXT CHECKPOINT COMPACTION. Create a handoff summary for another LLM that will resume the task.',
    '',
    'Include:',
    '- Current progress and key decisions made',
    '- Important context, constraints, or user preferences',
    '- What remains to be done (clear next steps)',
    '- Any critical data, examples, or references needed to continue',
    '',
    'Rules:',
    '- Do NOT include real-time or volatile values (prices, exchange rates, news details). Instead, say they were retrieved.',
    '- Do NOT introduce unrelated topics from older tasks unless they are still active requirements.',
    '- Keep the summary focused on the current user intent and active work.',
    '- You are FORBIDDEN from listing specific numeric values, timestamps, or prices.',
    '- Summarize only task state, constraints, and decisions; omit detailed observations.',
    '',
    'Be concise, structured, and focused on helping the next LLM seamlessly continue the work.'
].join('\n');

function estimateMessageTokens(msg) {
    if (!msg || typeof msg !== 'object') return 0;
    let content = '';
    if (typeof msg.content === 'string') {
        content = msg.content;
    } else if (msg.content != null) {
        try {
            content = JSON.stringify(msg.content);
        } catch {
            content = '[unserializable content]';
        }
    }
    let toolCalls = '';
    if (msg.tool_calls != null) {
        try {
            toolCalls = JSON.stringify(msg.tool_calls);
        } catch {
            toolCalls = '[unserializable tool_calls]';
        }
    }
    const role = typeof msg.role === 'string' ? msg.role : '';
    return estimateTextTokens(`${role}:${content}${toolCalls ? `\n${toolCalls}` : ''}`);
}

function estimateHistoryTokens(history) {
    if (!Array.isArray(history) || history.length === 0) return 0;
    let total = 0;
    for (const msg of history) {
        total += estimateMessageTokens(msg);
    }
    return total;
}

function serializeMessage(msg, perMessageLimit) {
    if (!msg || typeof msg !== 'object') return '';
    const role = typeof msg.role === 'string' ? msg.role : 'unknown';
    let content = '';
    if (typeof msg.content === 'string') {
        content = msg.content;
    } else {
        try {
            content = JSON.stringify(msg.content);
        } catch {
            content = '[unserializable content]';
        }
    }
    return `${role.toUpperCase()}: ${truncateText(content, perMessageLimit)}`;
}

function serializeHistory(messages, { maxChars = 20000, perMessageLimit = 2000 } = {}) {
    const lines = [];
    let used = 0;
    for (const msg of messages) {
        const line = serializeMessage(msg, perMessageLimit);
        if (!line) continue;
        const nextUsed = used + line.length + 1;
        if (nextUsed > maxChars) break;
        lines.push(line);
        used = nextUsed;
    }
    return lines.join('\n');
}

function collectFixedPrefixIndices(history, tailStart) {
    const indices = new Set();
    let lastEnv = -1;
    let lastAbort = -1;

    for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        if (isEnvironmentContext(msg)) lastEnv = i;
        if (isTurnAborted(msg)) lastAbort = i;
        if (isStrongInstruction(msg)) indices.add(i);
    }

    if (lastEnv >= 0) indices.add(lastEnv);
    if (lastAbort >= 0) indices.add(lastAbort);

    // Filter out indices that are part of the protected tail (if any).
    for (const idx of Array.from(indices)) {
        if (idx >= tailStart) indices.delete(idx);
    }
    return indices;
}

async function compactHistory({ history, llm, config, signal }) {
    if (!Array.isArray(history) || history.length === 0) {
        return { history: Array.isArray(history) ? history : [], compacted: false, originalLength: 0 };
    }
    const cfg = config || {};
    if (cfg.enabled === false) return { history, compacted: false, originalLength: history.length };
    const triggerMessages = Number.isFinite(cfg.triggerMessages) ? cfg.triggerMessages : 120;
    const triggerTokens = Number.isFinite(cfg.triggerTokens) ? cfg.triggerTokens : null;
    const estimatedTokens = (triggerTokens && triggerTokens > 0)
        ? estimateHistoryTokens(history)
        : null;
    const overTokenTrigger = (estimatedTokens != null) ? estimatedTokens > triggerTokens : false;
    const overMessageTrigger = history.length > triggerMessages;

    if (!overMessageTrigger && !overTokenTrigger) {
        return { history, compacted: false, originalLength: history.length };
    }

    const keepRecent = Number.isFinite(cfg.keepRecentMessages) ? cfg.keepRecentMessages : 10;
    const tailStartIndex = Math.max(0, history.length - keepRecent);

    const fixedPrefixIndices = collectFixedPrefixIndices(history, tailStartIndex);
    const fixedPrefix = Array.from(fixedPrefixIndices).sort((a, b) => a - b).map(idx => history[idx]);

    const compactCandidates = history.filter((_, idx) => !fixedPrefixIndices.has(idx) && idx < tailStartIndex);
    if (compactCandidates.length === 0) {
        return { history, compacted: false, originalLength: history.length };
    }

    const summaryInput = serializeHistory(compactCandidates, {
        maxChars: Number.isFinite(cfg.maxSummaryChars) ? cfg.maxSummaryChars : 20000,
        perMessageLimit: Number.isFinite(cfg.maxMessageChars) ? cfg.maxMessageChars : 2000,
    });

    if (!summaryInput || !llm || typeof llm.chat !== 'function') {
        return { history, compacted: false, originalLength: history.length };
    }

    const summaryResponse = await llm.chat(SUMMARY_PROMPT, [{ role: 'user', content: summaryInput }], { signal });
    const rawSummaryText = summaryResponse && typeof summaryResponse.content === 'string' ? summaryResponse.content.trim() : '';
    const summaryText = sanitizeSummaryText(rawSummaryText);

    if (!summaryText) return { history, compacted: false, originalLength: history.length };

    const summaryMessage = { role: 'user', content: `${SUMMARY_PREFIX}\n${summaryText}` };
    const tailMessages = history.slice(tailStartIndex);

    return {
        history: [...fixedPrefix, summaryMessage, ...tailMessages],
        compacted: true,
        summary: summaryText,
        originalLength: history.length,
    };
}

async function maybeCompactAgentHistory(agent, options = {}) {
    if (!agent || !agent.compaction || agent.compaction.enabled === false) return null;

    const signal = options && options.signal ? options.signal : null;

    const result = await compactHistory({
        history: agent.history,
        llm: agent.llm,
        config: agent.compaction,
        signal,
    });

    if (result && result.compacted) {
        agent.history = result.history;
        const summaryLength = result.summary ? result.summary.length : 0;
        console.log(`[Agent] History compacted: ${result.originalLength} -> ${agent.history.length} (summary ${summaryLength} chars)`);
        if (typeof agent.emit === 'function') {
            agent.emit('context_compacted', {
                originalLength: result.originalLength,
                newLength: agent.history.length,
                summary: result.summary || null,
                summaryLength,
            });
        }
    }

    return result || null;
}

module.exports = {
    compactHistory,
    maybeCompactAgentHistory,
    SUMMARY_PROMPT,
    SUMMARY_PREFIX,
};
