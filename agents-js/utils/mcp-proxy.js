// MCP JSON-RPC proxy (pure JS, works in Node + Browser).
//
// This module is intentionally small and protocol-focused.
// Skill/tool mapping (MCP Tool -> local tool definition) belongs in SkillManager.

let _idCounter = 0;

function _isNodeRuntime() {
    return (typeof window === 'undefined'
        && typeof process !== 'undefined'
        && !!(process.versions && process.versions.node));
}

function _makeId(prefix) {
    _idCounter = (_idCounter + 1) % 1000000;
    const rand = Math.random().toString(16).slice(2, 10);
    return `${prefix}:${Date.now()}:${_idCounter}:${rand}`;
}

function _normalizeHeaders(headers) {
    const h = headers && typeof headers === 'object' ? headers : null;
    // Note: Browser fetch forbids setting 'user-agent'. Only set it in Node.
    const base = {
        'content-type': 'application/json',
        // Some MCP servers (e.g. Context7) require accepting both JSON and SSE.
        'accept': 'application/json, text/event-stream',
        ...(_isNodeRuntime() ? { 'user-agent': 'agents-js/2.0' } : null),
    };
    return {
        ...base,
        ...(h ? h : null),
    };
}

function _validateHeadersAscii(headers) {
    if (!headers || typeof headers !== 'object') return;
    for (const [k, v] of Object.entries(headers)) {
        if (v === undefined || v === null) continue;
        const s = String(v);
        for (let i = 0; i < s.length; i++) {
            if (s.charCodeAt(i) > 255) {
                throw new Error(`[MCP] Invalid header value (non-ByteString) for "${k}" at char ${i}. `
                    + 'Header values must be ASCII/ByteString; check API keys and env config.');
            }
        }
    }
}

async function _readResponseBody(res) {
    try {
        return await res.text();
    } catch {
        return '';
    }
}

function _truncate(text, maxLen) {
    const s = String(text || '');
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen) + '...';
}

async function _jsonRpcPost(url, { method, params }, options = {}) {
    const {
        timeoutMs = 15000,
        headers,
        signal,
    } = options || {};

    if (typeof fetch !== 'function') {
        throw new Error('[MCP] fetch() is not available in this runtime. Provide a fetch polyfill.');
    }

    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timeout = (typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0)
        ? timeoutMs
        : 15000;

    let timer = null;
    const combinedSignal = (() => {
        if (!controller) return signal;
        if (signal && typeof signal === 'object') {
            // Best-effort: if an external signal aborts, abort our controller.
            try {
                if (signal.aborted) controller.abort();
                if (typeof signal.addEventListener === 'function') {
                    signal.addEventListener('abort', () => controller.abort(), { once: true });
                }
            } catch {
                // ignore
            }
        }
        return controller.signal;
    })();

    if (controller) {
        timer = setTimeout(() => controller.abort(), timeout);
        // Avoid keeping Node alive for timeout timers.
        if (timer && typeof timer.unref === 'function') timer.unref();
    }

    const payload = {
        jsonrpc: '2.0',
        id: _makeId(method),
        method,
        ...(params !== undefined ? { params } : null),
    };

    try {
        const requestHeaders = _normalizeHeaders(headers);
        _validateHeadersAscii(requestHeaders);

        let res;
        try {
            res = await fetch(url, {
                method: 'POST',
                headers: requestHeaders,
                body: JSON.stringify(payload),
                signal: combinedSignal,
            });
        } catch (e) {
            const name = e && e.name ? String(e.name) : 'Error';
            const msg = e && e.message ? String(e.message) : String(e);
            const cause = (e && e.cause) ? (e.cause.message ? String(e.cause.message) : String(e.cause)) : null;
            if (name === 'AbortError') {
                throw new Error(`[MCP] Request aborted (timeout ${timeout}ms) for ${url} (${method}).`);
            }
            throw new Error(`[MCP] fetch failed for ${url} (${method}): ${msg}${cause ? ` (cause: ${cause})` : ''}`);
        }

        const bodyText = await _readResponseBody(res);

        if (!res.ok) {
            throw new Error(`[MCP] HTTP ${res.status} ${res.statusText}: ${_truncate(bodyText, 1200)}`);
        }

        let data;
        try {
            data = bodyText ? JSON.parse(bodyText) : null;
        } catch {
            throw new Error(`[MCP] Invalid JSON response: ${_truncate(bodyText, 1200)}`);
        }

        if (!data || typeof data !== 'object') {
            throw new Error('[MCP] Empty or non-object JSON-RPC response.');
        }

        if (data.error) {
            const code = (data.error && data.error.code !== undefined) ? data.error.code : 'unknown';
            const msg = (data.error && data.error.message) ? data.error.message : 'Unknown JSON-RPC error';
            const extra = (data.error && data.error.data !== undefined)
                ? ` data=${_truncate(JSON.stringify(data.error.data), 1200)}`
                : '';
            throw new Error(`[MCP] JSON-RPC error ${code}: ${msg}${extra}`);
        }

        return data.result;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/**
 * MCP: tools/list
 * @returns {Promise<Array>} tools array (MCP Tool objects)
 */
async function listRemoteTools(url, options = {}) {
    const result = await _jsonRpcPost(url, { method: 'tools/list', params: {} }, options);
    const tools = (result && Array.isArray(result.tools))
        ? result.tools
        : (Array.isArray(result) ? result : null);

    if (!tools) {
        throw new Error('[MCP] tools/list returned an unexpected shape. Expected { tools: [...] }.');
    }
    return tools;
}

/**
 * MCP: tools/call
 * @returns {Promise<Object>} MCP CallToolResult
 */
async function callRemoteTool(url, name, args, options = {}) {
    if (!name || typeof name !== 'string') {
        throw new Error('[MCP] tools/call requires a tool name string.');
    }

    const params = {
        name,
        arguments: (args === undefined) ? {} : args,
    };

    const result = await _jsonRpcPost(url, { method: 'tools/call', params }, options);
    if (!result || typeof result !== 'object') {
        throw new Error('[MCP] tools/call returned an unexpected shape. Expected CallToolResult object.');
    }
    return result;
}

module.exports = {
    listRemoteTools,
    callRemoteTool,
};
