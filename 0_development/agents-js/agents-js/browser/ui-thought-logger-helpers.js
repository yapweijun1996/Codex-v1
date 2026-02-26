import { formatArgsPreview, truncate, tryParseJson } from './ui-redaction.js';

function isPlainObject(value) {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function pickString(obj, keys) {
    for (const key of keys) {
        const v = obj && obj[key];
        if (typeof v === 'string') {
            const s = v.trim();
            if (s) return s;
        }
    }
    return '';
}

function summarizeKv(key, value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') {
        const s = value.trim();
        if (!s) return '';
        return `${key}="${truncate(s, 120)}"`;
    }
    if (typeof value === 'number' && Number.isFinite(value)) return `${key}=${value}`;
    if (typeof value === 'boolean') return `${key}=${value ? 'true' : 'false'}`;
    return '';
}

function riskLabel(risk) {
    if (risk === 0) return 'Tier0';
    if (risk === 1) return 'Tier1';
    if (risk === 2) return 'Tier2';
    if (risk === 3) return 'Tier3';
    return String(risk ?? '');
}

function summarizePlanUpdate(payload) {
    const explanation = payload && typeof payload.explanation === 'string' ? payload.explanation.trim() : '';
    const plan = payload && Array.isArray(payload.plan) ? payload.plan : [];
    const items = plan
        .filter((p) => p && typeof p === 'object')
        .filter((p) => typeof p.step === 'string' && typeof p.status === 'string');
    const active = items.filter((p) => p.status === 'pending' || p.status === 'in_progress');
    const next = active.find((p) => p.status === 'in_progress') || active[0] || null;

    const bits = [];
    if (explanation) bits.push(truncate(explanation, 120));
    if (items.length) bits.push(`steps ${active.length}/${items.length} active`);
    if (next && next.step) bits.push(`next: ${truncate(next.step, 100)}`);
    return bits.join(' | ');
}

function normalizeToolArgs(rawArgs) {
    if (rawArgs == null) return null;
    if (typeof rawArgs === 'string') {
        const parsed = tryParseJson(rawArgs);
        return parsed == null ? { _raw: truncate(rawArgs, 160) } : parsed;
    }
    if (typeof rawArgs === 'object') return rawArgs;
    return { _raw: String(rawArgs) };
}

function getIntentText(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return truncate(raw.trim(), 140);
}

function firstLine(text) {
    const s = String(text || '').trim();
    if (!s) return '';
    const idx = s.indexOf('\n');
    return idx === -1 ? s : s.slice(0, idx);
}

function summarizeGuardMeta(meta) {
    if (!meta || typeof meta !== 'object') return '';
    const kind = meta.kind ? String(meta.kind) : '';
    const originalBytes = Number.isFinite(meta.originalBytes) ? `${meta.originalBytes}B` : '';
    const keptBytes = Number.isFinite(meta.keptBytes) ? `${meta.keptBytes}B` : '';
    const size = (originalBytes || keptBytes) ? `${originalBytes || '?'}->${keptBytes || '?'}` : '';
    const bits = [];
    if (kind) bits.push(kind);
    if (size) bits.push(size);
    return bits.join(' ');
}

function summarizeToolResultPayload(payload) {
    const r = payload && payload.result;
    if (r == null) return 'null';

    if (typeof r === 'string') {
        const s = r.trim();
        return s.length ? `text ${s.length} chars` : 'text';
    }
    if (Array.isArray(r)) return `array ${r.length}`;
    if (typeof r !== 'object') return String(r);

    if (r._agentsjs_tool_output_guard) {
        const meta = r._agentsjs_tool_output_guard;
        const info = summarizeGuardMeta(meta);
        return info ? `truncated ${info}` : 'truncated';
    }

    if (typeof r.error === 'string') {
        const e = truncate(r.error, 60);
        const msg = (typeof r.message === 'string') ? truncate(firstLine(r.message), 80) : '';
        return `error=${e}${msg ? ` (${msg})` : ''}`;
    }

    if (Object.prototype.hasOwnProperty.call(r, 'exitCode')) {
        const exitCode = Number.isFinite(Number(r.exitCode)) ? Number(r.exitCode) : r.exitCode;
        const stdoutLen = (typeof r.stdout === 'string') ? r.stdout.length : 0;
        const stderrLen = (typeof r.stderr === 'string') ? r.stderr.length : 0;
        return `exitCode=${exitCode} stdout=${stdoutLen} stderr=${stderrLen}`;
    }

    const keys = Object.keys(r);
    if (keys.length === 0) return 'object';
    return `object keys=${keys.length}`;
}

function buildToolLineText({ prefix, toolName, intent, args }) {
    const i = intent ? ` (${intent})` : '';
    const a = args ? ` ${args}` : '';
    return `${prefix}${toolName}${i}${a}`;
}

function summarizeToolArgsForLog({ toolName, argsObj }) {
    if (!argsObj) return '';
    if (typeof argsObj !== 'object') return summarizeKv('value', String(argsObj));

    if (typeof argsObj._raw === 'string') {
        return `raw="${truncate(argsObj._raw, 120)}"`;
    }

    const name = String(toolName || '').toLowerCase();
    const obj = argsObj;

    // Search tools.
    if (name.includes('searxng') || name.includes('web_search') || name.includes('search')) {
        const q = pickString(obj, ['query', 'q', 'text', 'keywords']);
        if (q) return `query="${truncate(q, 140)}"`;
    }

    // URL reader.
    if (name === 'read_url' || name.includes('url_reader') || name.includes('read_url')) {
        const url = pickString(obj, ['url', 'href']);
        if (url) return `url="${truncate(url, 160)}"`;
    }

    // File tools.
    if (
        name === 'read_file'
        || name === 'view_image'
        || name === 'list_dir'
        || name === 'grep_files'
        || name.includes('file')
    ) {
        const path = pickString(obj, ['filePath', 'path', 'dir', 'directory']);
        const pattern = pickString(obj, ['pattern', 'include']);
        if (path && pattern) return `path="${truncate(path, 120)}" pattern="${truncate(pattern, 80)}"`;
        if (path) return `path="${truncate(path, 140)}"`;
        if (pattern) return `pattern="${truncate(pattern, 120)}"`;
    }

    if (name === 'run_command') {
        const cmd = pickString(obj, ['command', 'cmd']);
        if (cmd) return `cmd="${truncate(cmd, 160)}"`;
    }

    if (name === 'run_javascript') {
        const code = pickString(obj, ['code', 'javascript', 'script']);
        if (code) return `codeChars=${code.length}`;
    }

    if (name === 'apply_patch') {
        const patchText = pickString(obj, ['patchText', 'patch']);
        if (patchText) return `patchChars=${patchText.length}`;
    }

    if (name === 'update_plan') {
        const steps = Array.isArray(obj.plan) ? obj.plan.length : 0;
        if (steps) return `steps=${steps}`;
        const explanation = pickString(obj, ['explanation']);
        if (explanation) return `explanation="${truncate(explanation, 120)}"`;
    }

    // Default: show up to 2 scalar fields.
    if (isPlainObject(obj)) {
        const parts = [];
        for (const [k, v] of Object.entries(obj)) {
            if (k === '_raw') continue;
            const s = summarizeKv(k, v);
            if (s) parts.push(s);
            if (parts.length >= 2) break;
        }
        if (parts.length) return parts.join(' ');
    }

    // Fallback: a compact redacted JSON-ish preview.
    return formatArgsPreview(obj, { max: 120 });
}

export {
    riskLabel,
    summarizePlanUpdate,
    normalizeToolArgs,
    getIntentText,
    firstLine,
    summarizeToolResultPayload,
    buildToolLineText,
    summarizeToolArgsForLog,
    truncate,
    formatArgsPreview,
};
