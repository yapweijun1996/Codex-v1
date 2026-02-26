export function isBrowserRuntime() {
    return typeof window !== 'undefined';
}

export function looksLikeCorsOrEnvRestriction(message) {
    const text = String(message || '').toLowerCase();
    if (!text) return false;
    return (
        text.includes('cors') ||
        text.includes('cross-origin') ||
        text.includes('access-control-allow-origin') ||
        text.includes('failed to fetch') ||
        text.includes('networkerror when attempting to fetch') ||
        text.includes('load failed') ||
        text.includes('mixed content') ||
        text.includes('blocked:mixed-content') ||
        text.includes('same origin') ||
        text.includes('same-origin')
    );
}

export function normalizeHeaders(headers) {
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return undefined;
    const out = {};
    for (const [k, v] of Object.entries(headers)) {
        if (!k) continue;
        if (v === undefined || v === null) continue;
        out[String(k)] = String(v);
    }
    return out;
}

export function parseAndValidateUrl(input) {
    const raw = String(input || '').trim();
    if (!raw) return { ok: false, error: 'Invalid URL: empty' };
    let u;
    try {
        u = new URL(raw);
    } catch {
        return { ok: false, error: 'Invalid URL' };
    }
    const protocol = String(u.protocol || '').toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
        return { ok: false, error: `Unsupported URL protocol: ${protocol || 'unknown'}` };
    }
    return { ok: true, url: u.toString() };
}

export function clampInt(n, { min, max, fallback }) {
    const x = Number(n);
    if (!Number.isFinite(x)) return fallback;
    const v = Math.floor(x);
    if (typeof min === 'number' && v < min) return min;
    if (typeof max === 'number' && v > max) return max;
    return v;
}

export function detectMode(mode, contentType) {
    const m = String(mode || 'auto').toLowerCase();
    if (m === 'text' || m === 'html_text' || m === 'json') return m;
    const ct = String(contentType || '').toLowerCase();
    if (ct.includes('application/json') || ct.includes('+json')) return 'json';
    if (ct.includes('text/html') || ct.includes('application/xhtml+xml')) return 'html_text';
    return 'text';
}

export function stripHtmlToText(html) {
    const s = String(html || '');
    if (!s) return '';

    // Remove scripts/styles.
    let out = s
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ');

    // Replace some structural tags with newlines.
    out = out
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\s*\/?p\b[^>]*>/gi, '\n')
        .replace(/<\s*\/?div\b[^>]*>/gi, '\n')
        .replace(/<\s*\/?li\b[^>]*>/gi, '\n- ')
        .replace(/<\s*\/?h[1-6]\b[^>]*>/gi, '\n');

    // Drop the rest of tags.
    out = out.replace(/<[^>]+>/g, ' ');

    // Minimal entity decode.
    out = out
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/g, "'");

    // Collapse whitespace.
    out = out
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[\t\f\v ]{2,}/g, ' ')
        .trim();
    return out;
}

export async function readBodyWithLimit(res, { maxBytes, controller }) {
    const limit = clampInt(maxBytes, { min: 1_000, max: 5_000_000, fallback: 200_000 });
    const body = res && res.body;
    if (!body || typeof body.getReader !== 'function') {
        const ab = await res.arrayBuffer();
        const bytes = ab ? ab.byteLength : 0;
        const sliced = bytes > limit ? ab.slice(0, limit) : ab;
        const truncated = bytes > limit;
        return { bytes: bytes > limit ? limit : bytes, truncated, arrayBuffer: sliced };
    }

    const reader = body.getReader();
    const chunks = [];
    let total = 0;
    let truncated = false;

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (!value) continue;
            const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
            if (total + chunk.byteLength > limit) {
                const keep = Math.max(0, limit - total);
                if (keep > 0) chunks.push(chunk.slice(0, keep));
                total = limit;
                truncated = true;
                if (controller) controller.abort();
                break;
            }
            chunks.push(chunk);
            total += chunk.byteLength;
        }
    } finally {
        try { reader.releaseLock(); } catch { /* ignore */ }
    }

    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
        out.set(c, offset);
        offset += c.byteLength;
    }
    return { bytes: total, truncated, arrayBuffer: out.buffer };
}

export function decodeToString(arrayBuffer, contentType) {
    const ct = String(contentType || '').toLowerCase();
    let charset = 'utf-8';
    const m = ct.match(/charset\s*=\s*([^;]+)/i);
    if (m && m[1]) charset = String(m[1]).trim().replace(/(^"|"$)/g, '') || 'utf-8';

    const bytes = arrayBuffer ? new Uint8Array(arrayBuffer) : new Uint8Array();
    if (typeof TextDecoder === 'function') {
        try {
            return new TextDecoder(charset, { fatal: false }).decode(bytes);
        } catch {
            return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        }
    }

    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
}
