export function safeJsonStringify(value, { indent = 0, maxLen = 1200 } = {}) {
    try {
        const text = JSON.stringify(value == null ? {} : value, null, indent);
        if (typeof text !== 'string') return '';
        if (text.length <= maxLen) return text;
        return `${text.slice(0, maxLen - 3)}...`;
    } catch {
        return '';
    }
}

export function shortCallId(callId) {
    const id = String(callId || '');
    if (!id) return '';
    const m = id.match(/_(\d+)$/);
    if (m && m[1]) return `#${m[1]}`;
    if (id.length <= 12) return id;
    return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function summarizeArgs(args) {
    const a = (args && typeof args === 'object' && !Array.isArray(args)) ? args : null;
    if (!a) return '';
    if (typeof a.timezone === 'string' && a.timezone) return `timezone: ${a.timezone}`;
    if (typeof a.query === 'string' && a.query) return `query: ${a.query}`;
    const firstKey = Object.keys(a)[0];
    if (!firstKey) return '';
    const v = a[firstKey];
    const valueText = (typeof v === 'string') ? v : safeJsonStringify(v, { maxLen: 120 });
    return `${firstKey}: ${String(valueText || '').trim()}`;
}

export function formatPermissions(perms) {
    if (!Array.isArray(perms) || perms.length === 0) return '';
    return perms.map((v) => String(v)).filter(Boolean).join(', ');
}

export function formatRateLimit(rateLimit) {
    if (!rateLimit || typeof rateLimit !== 'object') return '';
    const maxCalls = Number(rateLimit.maxCalls);
    const perSeconds = Number(rateLimit.perSeconds);
    if (!Number.isFinite(maxCalls) || !Number.isFinite(perSeconds)) return '';
    if (maxCalls <= 0 || perSeconds <= 0) return '';
    return `${Math.floor(maxCalls)}/${Math.floor(perSeconds)}s`;
}

function escapeInline(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function buildApprovalMetaLinesHtml(perms, rate) {
    const parts = [];
    const p = formatPermissions(perms);
    const r = formatRateLimit(rate);
    if (p) parts.push(`permissions: ${p}`);
    if (r) parts.push(`rate: ${r}`);
    if (parts.length === 0) return '';
    return `<div class="approval-meta-lines">${parts.map((line) => `<div class="approval-meta-line">${escapeInline(line)}</div>`).join('')}</div>`;
}

export function buildBatchMetaLineHtml(perms, rate) {
    const p = formatPermissions(perms);
    const r = formatRateLimit(rate);
    if (!p && !r) return '';
    const sep = p && r ? ' · ' : '';
    return `<div class="approval-batch-meta">${escapeInline(p ? `permissions: ${p}` : '')}${sep}${escapeInline(r ? `rate: ${r}` : '')}</div>`;
}
