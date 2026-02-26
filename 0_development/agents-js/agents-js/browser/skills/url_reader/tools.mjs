import {
    clampInt,
    decodeToString,
    detectMode,
    isBrowserRuntime,
    looksLikeCorsOrEnvRestriction,
    normalizeHeaders,
    parseAndValidateUrl,
    readBodyWithLimit,
    stripHtmlToText,
} from './url-reader-utils.mjs';

async function readUrl({
    url,
    method = 'GET',
    headers,
    timeoutMs = 10_000,
    maxBytes = 200_000,
    mode = 'auto',
} = {}) {
    if (typeof fetch !== 'function') {
        return { ok: false, error: 'fetch is not available in this runtime' };
    }

    const parsed = parseAndValidateUrl(url);
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const m = String(method || 'GET').toUpperCase();
    if (m !== 'GET' && m !== 'HEAD') {
        return { ok: false, error: `Unsupported method: ${m}` };
    }

    const timeout = clampInt(timeoutMs, { min: 500, max: 120_000, fallback: 10_000 });
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;

    const isBrowser = isBrowserRuntime();
    const reqHeaders = normalizeHeaders(headers);

    try {
        const res = await fetch(parsed.url, {
            method: m,
            headers: reqHeaders,
            signal: controller ? controller.signal : undefined,
        });

        const contentType = res.headers && typeof res.headers.get === 'function'
            ? (res.headers.get('content-type') || '')
            : '';

        if (m === 'HEAD') {
            return {
                ok: res.ok,
                url: parsed.url,
                status: res.status,
                statusText: res.statusText || '',
                contentType,
                bytes: 0,
                truncated: false,
                text: '',
            };
        }

        const { bytes, truncated, arrayBuffer } = await readBodyWithLimit(res, { maxBytes, controller });
        const rawText = decodeToString(arrayBuffer, contentType);
        const chosenMode = detectMode(mode, contentType);
        let text = rawText;

        if (chosenMode === 'html_text') {
            text = stripHtmlToText(rawText);
        } else if (chosenMode === 'json') {
            // Keep JSON readable but bounded.
            try {
                const obj = JSON.parse(rawText);
                text = JSON.stringify(obj, null, 2);
            } catch {
                // Not valid JSON; keep as text.
                text = rawText;
            }
        }

        if (!res.ok) {
            return {
                ok: false,
                error: `HTTP ${res.status}`,
                status: res.status,
                statusText: res.statusText || '',
                url: parsed.url,
                contentType,
                bytes,
                truncated,
                text,
            };
        }

        return {
            ok: true,
            url: parsed.url,
            status: res.status,
            statusText: res.statusText || '',
            contentType,
            bytes,
            truncated,
            mode: chosenMode,
            text,
        };
    } catch (error) {
        const msg = String(error && error.message ? error.message : error);
        if (isBrowser && looksLikeCorsOrEnvRestriction(msg)) {
            return {
                ok: false,
                error: 'Environment Restriction (Browser CORS)',
                platform: 'browser',
                reason: 'CORS blocked fetch',
                message: `Browser blocked this request (CORS / same-origin / mixed content). Original error: ${msg}`,
                url: parsed.url,
            };
        }

        const aborted = controller && controller.signal && controller.signal.aborted;
        if (aborted) {
            return {
                ok: false,
                error: 'timeout',
                message: `Request timed out after ${timeout}ms`,
                url: parsed.url,
            };
        }

        return { ok: false, error: 'fetch failed', message: msg, url: parsed.url };
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export default [
    {
        name: 'read_url',
        description: 'Fetch a URL and return a truncated text representation (works in Node and Browser; Browser may be CORS-limited).',
        meta: {
            intentTemplate: 'read URL {url}',
        },
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'HTTP/HTTPS URL to fetch.' },
                method: { type: 'string', description: 'HTTP method (GET or HEAD).', default: 'GET' },
                headers: { type: 'object', description: 'Optional request headers (string values).', additionalProperties: { type: 'string' } },
                timeoutMs: { type: 'number', description: 'Timeout in milliseconds (default 10000).', default: 10000 },
                maxBytes: { type: 'number', description: 'Max bytes to read from response body (default 200000).', default: 200000 },
                mode: { type: 'string', description: 'auto|text|html_text|json (default auto).', default: 'auto' },
            },
            required: ['url'],
        },
        func: readUrl,
    },
];
