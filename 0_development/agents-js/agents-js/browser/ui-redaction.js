const SENSITIVE_KEYS = [
    'api_key',
    'apikey',
    'secret',
    'password',
    'credential',
    'authorization',
    'bearer',
];

function isSensitiveKey(key) {
    if (!key) return false;
    const lowered = String(key).toLowerCase();
    if (SENSITIVE_KEYS.includes(lowered)) return true;
    return lowered.endsWith('token');
}

function redactValue(value, seen) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return value;
    if (typeof value !== 'object') return value;
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (Array.isArray(value)) {
        return value.map((item) => redactValue(item, seen));
    }

    const out = {};
    for (const [key, val] of Object.entries(value)) {
        if (isSensitiveKey(key)) {
            out[key] = '[REDACTED]';
            continue;
        }
        out[key] = redactValue(val, seen);
    }
    return out;
}

export function redactForUi(value) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    const seen = new Set();
    return redactValue(value, seen);
}

export function tryParseJson(text) {
    if (typeof text !== 'string') return null;
    const s = text.trim();
    if (!s) return null;
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
}

export function truncate(text, max = 160) {
    const s = String(text || '').trim();
    if (!s) return '';
    if (s.length <= max) return s;
    return `${s.slice(0, max - 3)}...`;
}

export function formatArgsPreview(args, { max = 180 } = {}) {
    if (args == null) return '';
    try {
        const redacted = redactForUi(args);
        const s = JSON.stringify(redacted);
        return truncate(s, max);
    } catch {
        return '';
    }
}
