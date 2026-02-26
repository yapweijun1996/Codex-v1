const {
    getUsageFromEntry,
    getTotalUsageFromHistory,
} = require('./agent-usage');

function extractFinalAnswer(text) {
    if (typeof text !== 'string') return null;
    const matches = Array.from(text.matchAll(/<final_answer>([\s\S]*?)<\/final_answer>/gi));
    if (matches.length === 0) return null;
    const last = matches[matches.length - 1];
    return typeof last[1] === 'string' ? last[1].trim() : null;
}

function stripThoughtPlanActionPrefix(text) {
    if (typeof text !== 'string') return text;
    const lines = text.split('\n');
    let i = 0;
    while (i < lines.length && !lines[i].trim()) i += 1;
    const first = lines[i] || '';
    if (!/^\s*Thought\s*:/i.test(first)) return text;

    const out = [];
    let skipping = true;
    for (let idx = i; idx < lines.length; idx += 1) {
        const line = lines[idx];
        const trimmed = line.trim();
        if (skipping) {
            if (!trimmed) continue;
            if (/^\s*(Thought|Plan|Action)\s*:/i.test(line)) continue;
            if (/^\s*(\d+\.|[-*])\s+/.test(line)) continue;
            skipping = false;
        }
        out.push(line);
    }

    return out.join('\n');
}

function sanitizeFinalResponse(text) {
    if (typeof text !== 'string' || !text.trim()) return text;
    const extracted = extractFinalAnswer(text);
    let candidate = (typeof extracted === 'string' && extracted.trim()) ? extracted : text;
    if (candidate === text) {
        candidate = stripThoughtPlanActionPrefix(candidate);
    }
    const patterns = [
        /without explicitly stating/i,
        /do not include/i,
        /forbidden/i,
        /i will now summarize/i,
        /the previous model has already completed/i,
        /the information has been retrieved/i,
    ];
    const lines = candidate.split('\n');
    const filtered = lines.filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) return true;
        return !patterns.some((re) => re.test(trimmed));
    });
    return filtered.join('\n').trim();
}

function buildCompletionData({ history, finalResponseText, turnCount, modelContextWindow = null }) {
    const lastUsage = getUsageFromEntry(history[history.length - 1]);
    const totalUsage = getTotalUsageFromHistory(history);
    return {
        response: finalResponseText || 'Agent failed to produce a response within turn limit.',
        turnCount,
        historyLength: history.length,
        tokenUsage: {
            info: {
                total_token_usage: totalUsage || null,
                last_token_usage: lastUsage || null,
                model_context_window: modelContextWindow,
            },
        },
    };
}

module.exports = { buildCompletionData, sanitizeFinalResponse };
