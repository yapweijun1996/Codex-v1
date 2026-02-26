function isPlainObject(value) {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function toFiniteInt(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.floor(n);
}

function byteLength(text) {
    const s = String(text == null ? '' : text);
    try {
        if (typeof Buffer !== 'undefined' && Buffer && typeof Buffer.byteLength === 'function') {
            return Buffer.byteLength(s, 'utf8');
        }
    } catch {
        // ignore
    }
    try {
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(s).length;
        }
    } catch {
        // ignore
    }
    return s.length;
}

function safeJson(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return null;
    }
}

const MAX_MEASURE_JSON_CHARS = 100000;

const DEFAULT_TOOL_OUTPUT_LIMITS = {
    maxStringChars: 12000,
    headChars: 8000,
    tailChars: 2000,
    maxArrayItems: 60,
    maxObjectKeys: 60,
    maxDepth: 5,
};

function mergeLimits(raw) {
    const limits = isPlainObject(raw) ? raw : null;
    const out = { ...DEFAULT_TOOL_OUTPUT_LIMITS };
    if (!limits) return out;
    out.maxStringChars = Math.max(256, toFiniteInt(limits.maxStringChars, out.maxStringChars));
    out.headChars = Math.max(0, toFiniteInt(limits.headChars, out.headChars));
    out.tailChars = Math.max(0, toFiniteInt(limits.tailChars, out.tailChars));
    out.maxArrayItems = Math.max(0, toFiniteInt(limits.maxArrayItems, out.maxArrayItems));
    out.maxObjectKeys = Math.max(0, toFiniteInt(limits.maxObjectKeys, out.maxObjectKeys));
    out.maxDepth = Math.max(1, toFiniteInt(limits.maxDepth, out.maxDepth));
    return out;
}

function buildGuarded({ toolName, kind, original, preview, meta }) {
    const originalJson = safeJson(original);
    const previewJson = safeJson(preview);
    const originalBytes = (originalJson && originalJson.length <= MAX_MEASURE_JSON_CHARS)
        ? byteLength(originalJson)
        : null;
    const keptBytes = (previewJson && previewJson.length <= MAX_MEASURE_JSON_CHARS)
        ? byteLength(previewJson)
        : null;
    return {
        _agentsjs_tool_output_guard: {
            tool: toolName || '',
            kind,
            truncated: true,
            originalBytes,
            keptBytes,
            ...meta,
        },
        preview,
    };
}

function guardString({ toolName, value, limits }) {
    const s = String(value);
    const maxChars = limits.maxStringChars;
    if (s.length <= maxChars) return s;

    const head = s.slice(0, Math.min(limits.headChars, maxChars));
    const tailBudget = Math.max(0, maxChars - head.length);
    const tail = limits.tailChars > 0
        ? s.slice(Math.max(0, s.length - Math.min(limits.tailChars, tailBudget)))
        : '';
    const sep = (tail && head) ? '\n...\n' : '...';
    const preview = `${head}${sep}${tail}`;
    return buildGuarded({
        toolName,
        kind: 'string',
        original: s,
        preview,
        meta: {
            originalChars: s.length,
            keptChars: preview.length,
        },
    });
}

function guardValueInner({ toolName, value, limits, depth, seen }) {
    if (value === null || value === undefined) return value;
    const t = typeof value;
    if (t === 'string') return guardString({ toolName, value, limits });
    if (t === 'number' || t === 'boolean') return value;
    if (t !== 'object') return String(value);

    if (seen.has(value)) {
        return buildGuarded({
            toolName,
            kind: 'circular',
            original: '[Circular]',
            preview: '[Circular]',
            meta: {},
        });
    }

    if (depth >= limits.maxDepth) {
        return buildGuarded({
            toolName,
            kind: 'max_depth',
            original: value,
            preview: `[Truncated: maxDepth=${limits.maxDepth}]`,
            meta: { maxDepth: limits.maxDepth },
        });
    }

    seen.add(value);

    if (Array.isArray(value)) {
        const originalLen = value.length;
        const maxItems = limits.maxArrayItems;
        const kept = maxItems > 0 ? value.slice(0, maxItems) : [];
        const preview = kept.map((item) => guardValueInner({ toolName, value: item, limits, depth: depth + 1, seen }));
        if (originalLen <= maxItems) return preview;
        return buildGuarded({
            toolName,
            kind: 'array',
            original: value,
            preview,
            meta: { originalItems: originalLen, keptItems: preview.length },
        });
    }

    if (!isPlainObject(value)) {
        const json = safeJson(value);
        if (json && json.length <= limits.maxStringChars) return value;
        return buildGuarded({
            toolName,
            kind: 'non_plain_object',
            original: json || String(value),
            preview: (json && json.length > limits.maxStringChars)
                ? guardString({ toolName, value: json, limits }).preview
                : (json || String(value)),
            meta: { originalType: Object.prototype.toString.call(value) },
        });
    }

    const entries = Object.entries(value);
    const maxKeys = limits.maxObjectKeys;
    const keptEntries = maxKeys > 0 ? entries.slice(0, maxKeys) : [];
    const preview = {};
    for (const [k, v] of keptEntries) {
        preview[k] = guardValueInner({ toolName, value: v, limits, depth: depth + 1, seen });
    }
    if (entries.length <= maxKeys) return preview;
    return buildGuarded({
        toolName,
        kind: 'object',
        original: value,
        preview,
        meta: { originalKeys: entries.length, keptKeys: keptEntries.length },
    });
}

function guardToolOutput({ toolName, value, limits }) {
    const merged = mergeLimits(limits);
    const seen = new Set();
    return guardValueInner({ toolName, value, limits: merged, depth: 0, seen });
}

module.exports = {
    DEFAULT_TOOL_OUTPUT_LIMITS,
    guardToolOutput,
};
