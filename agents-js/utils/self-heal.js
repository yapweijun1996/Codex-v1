// Utilities for self-healing and loop detection.
// Keep this module environment-agnostic (no Node-only deps).

const DEFAULT_TOOL_TIMEOUT_MS = 30_000;
// Human approval should allow more time than tool execution.
const DEFAULT_APPROVAL_TIMEOUT_MS = 300_000;
const DEFAULT_REPEAT_FAILURE_THRESHOLD = 2;
const DEFAULT_LOOP_FINGERPRINT_THRESHOLD = 3;

function isPlainObject(value) {
    if (!value || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function stableStringify(value) {
    const seen = new WeakSet();

    function normalize(v) {
        if (v === null) return null;
        const t = typeof v;
        if (t === 'string' || t === 'number' || t === 'boolean') return v;
        if (t === 'bigint') return String(v);
        if (t === 'undefined') return null;
        if (t === 'function') return '[Function]';
        if (t === 'symbol') return String(v);

        if (t === 'object') {
            if (seen.has(v)) return '[Circular]';
            seen.add(v);

            if (Array.isArray(v)) return v.map(normalize);

            if (v instanceof Date) return v.toISOString();
            if (v instanceof Error) {
                return {
                    name: v.name,
                    message: v.message,
                };
            }

            if (!isPlainObject(v)) {
                // Best-effort: preserve enumerable keys only.
                const out = {};
                for (const k of Object.keys(v).sort()) {
                    out[k] = normalize(v[k]);
                }
                return out;
            }

            const out = {};
            for (const k of Object.keys(v).sort()) {
                out[k] = normalize(v[k]);
            }
            return out;
        }

        return String(v);
    }

    try {
        return JSON.stringify(normalize(value));
    } catch {
        // Last resort: never throw from stableStringify.
        return 'null';
    }
}

function safeJsonStringify(value) {
    // Prefer native JSON for compactness, but fall back to stableStringify on circulars.
    try {
        return JSON.stringify(value === undefined ? null : value);
    } catch {
        return stableStringify(value);
    }
}

function isRateLimitLike(input) {
    const text = String(input || '').toLowerCase();
    if (!text) return false;
    return (
        text.includes('too many requests') ||
        text.includes('rate limit') ||
        text.includes('ratelimit') ||
        text.includes('status: 429') ||
        text.includes('http 429') ||
        text.includes(' 429')
    );
}

// Small deterministic hash (djb2) to keep fingerprints compact.
function hashString(input) {
    const str = String(input || '');
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    // Convert to unsigned 32-bit then base36.
    return (hash >>> 0).toString(36);
}

function makeFailureFingerprint(toolName, failureType, args) {
    const argsStable = stableStringify(args);
    return `${toolName}:${String(failureType || 'unknown')}:${hashString(argsStable)}`;
}

module.exports = {
    DEFAULT_TOOL_TIMEOUT_MS,
    DEFAULT_APPROVAL_TIMEOUT_MS,
    DEFAULT_REPEAT_FAILURE_THRESHOLD,
    DEFAULT_LOOP_FINGERPRINT_THRESHOLD,
    stableStringify,
    safeJsonStringify,
    isRateLimitLike,
    hashString,
    makeFailureFingerprint,
};
