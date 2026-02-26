const APPROX_BYTES_PER_TOKEN = 4;
let cachedEncoder = null;

function getTextEncoder() {
    if (cachedEncoder) return cachedEncoder;
    if (typeof TextEncoder !== 'undefined') {
        cachedEncoder = new TextEncoder();
    }
    return cachedEncoder;
}

function byteLength(text) {
    if (typeof text !== 'string' || text.length === 0) return 0;
    const encoder = getTextEncoder();
    if (encoder) return encoder.encode(text).length;
    if (typeof Buffer !== 'undefined') return Buffer.byteLength(text, 'utf8');
    return text.length;
}

function approxTokensFromBytes(bytes) {
    const count = Number(bytes) || 0;
    return Math.ceil(count / APPROX_BYTES_PER_TOKEN);
}

function estimateTextTokens(text) {
    return approxTokensFromBytes(byteLength(text));
}

function estimateStructuredTokens(text) {
    return approxTokensFromBytes(byteLength(text));
}

function isToolResultMessage(msg) {
    return !!(msg
        && (msg.role === 'system' || msg.role === 'tool')
        && typeof msg.tool_call_id === 'string');
}

function estimateTokensForMessage(msg) {
    if (!msg || typeof msg !== 'object') return 0;
    try {
        const serialized = JSON.stringify(msg);
        return estimateStructuredTokens(serialized);
    } catch {
        return 0;
    }
}

function estimateTokensHeuristic(history) {
    if (!Array.isArray(history)) return 0;
    let tokens = 0;
    for (const msg of history) {
        tokens += estimateTokensForMessage(msg);
    }
    return tokens;
}

function estimateTokens(history) {
    if (!Array.isArray(history)) return 0;
    let baselineIdx = -1;
    let baselineTokens = 0;

    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        const value = msg && Object.prototype.hasOwnProperty.call(msg, '_tokenUsagePrompt')
            ? Number(msg._tokenUsagePrompt)
            : NaN;
        if (Number.isFinite(value)) {
            baselineIdx = i;
            baselineTokens = value;
            break;
        }
    }

    if (baselineIdx >= 0) {
        const tail = history.slice(baselineIdx + 1);
        return baselineTokens + estimateTokensHeuristic(tail);
    }

    return estimateTokensHeuristic(history);
}

module.exports = {
    APPROX_BYTES_PER_TOKEN,
    estimateTokens,
    estimateTokensHeuristic,
    estimateTokensForMessage,
    estimateTextTokens,
    estimateStructuredTokens,
    approxTokensFromBytes,
    isToolResultMessage,
};
