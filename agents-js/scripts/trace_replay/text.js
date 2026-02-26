'use strict';

function truncate(text, maxLen) {
    const s = String(text == null ? '' : text);
    const n = Number(maxLen);
    if (!Number.isFinite(n) || n <= 0) return s;
    if (s.length <= n) return s;
    return `${s.slice(0, Math.max(0, n - 3))}...`;
}

function firstLine(text) {
    const s = String(text || '').trim();
    if (!s) return '';
    const idx = s.indexOf('\n');
    return idx === -1 ? s : s.slice(0, idx);
}

function tsShort(ts) {
    const s = String(ts || '');
    const tIdx = s.indexOf('T');
    if (tIdx === -1) return '';
    const end = s.endsWith('Z') ? s.length - 1 : s.length;
    return s.slice(tIdx + 1, Math.min(end, tIdx + 1 + 12));
}

module.exports = { truncate, firstLine, tsShort };
