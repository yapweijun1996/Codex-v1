'use strict';

const fs = require('fs');

function safeJsonParse(text) {
    try {
        return { ok: true, value: JSON.parse(text) };
    } catch (err) {
        const msg = err && err.message ? String(err.message) : String(err);
        return { ok: false, error: msg };
    }
}

function normalizeTraceObject(raw) {
    if (!raw) return null;
    if (Array.isArray(raw)) {
        return { version: null, metadata: null, summary: null, events: raw };
    }
    if (typeof raw !== 'object') return null;

    if (Array.isArray(raw.events)) return raw;
    if (raw.trace && typeof raw.trace === 'object' && Array.isArray(raw.trace.events)) return raw.trace;
    return null;
}

function loadTraceFromFile(filePath) {
    const p = String(filePath || '').trim();
    if (!p) {
        return { ok: false, error: 'Missing trace file path' };
    }
    let text;
    try {
        text = fs.readFileSync(p, 'utf8');
    } catch (err) {
        const msg = err && err.message ? String(err.message) : String(err);
        return { ok: false, error: `Failed to read file: ${msg}` };
    }
    const parsed = safeJsonParse(text);
    if (!parsed.ok) return { ok: false, error: `Invalid JSON: ${parsed.error}` };
    return { ok: true, value: parsed.value };
}

module.exports = {
    safeJsonParse,
    normalizeTraceObject,
    loadTraceFromFile,
};
