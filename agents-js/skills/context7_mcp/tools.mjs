const DEFAULT_MCP_URL = 'https://mcp.context7.com/mcp';

function isNodeRuntime() {
    return (typeof window === 'undefined'
        && typeof process !== 'undefined'
        && !!(process.versions && process.versions.node));
}

function getApiKey(explicitApiKey) {
    if (explicitApiKey && typeof explicitApiKey === 'string') return explicitApiKey;
    if (isNodeRuntime() && process.env && typeof process.env.CONTEXT7_API_KEY === 'string') {
        return process.env.CONTEXT7_API_KEY;
    }
    return null;
}

function safeJsonParse(text) {
    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return null;
    }
}

async function jsonRpcPost(url, payload, { headers, timeoutMs = 30000 } = {}) {
    if (typeof fetch !== 'function') {
        throw new Error('[context7_mcp] fetch() is not available in this runtime');
    }

    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    if (timer && typeof timer.unref === 'function') timer.unref();

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                // Context7 requires accepting both JSON and SSE.
                'accept': 'application/json, text/event-stream',
                ...(headers || {}),
            },
            body: JSON.stringify(payload),
            signal: controller ? controller.signal : undefined,
        });

        const text = await res.text();
        if (!res.ok) {
            throw new Error(`[context7_mcp] HTTP ${res.status} ${res.statusText}: ${text}`);
        }

        const data = safeJsonParse(text);
        if (!data || typeof data !== 'object') {
            throw new Error('[context7_mcp] Invalid JSON-RPC response');
        }
        if (data.error) {
            const msg = data.error.message || 'Unknown JSON-RPC error';
            throw new Error(`[context7_mcp] JSON-RPC error: ${msg}`);
        }
        return data.result;
    } catch (e) {
        if (e && e.name === 'AbortError') {
            throw new Error(`[context7_mcp] Timeout after ${timeoutMs}ms`);
        }
        throw e;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function mcpListTools({ mcpUrl, apiKey } = {}) {
    const url = mcpUrl || DEFAULT_MCP_URL;
    const key = getApiKey(apiKey);

    // Browser CORS note:
    // - Sending custom headers (like CONTEXT7_API_KEY) may be blocked by CORS.
    // - We only attach the key in Node; in Browser we try without it.
    const headers = (key && isNodeRuntime()) ? { CONTEXT7_API_KEY: key } : {};

    const result = await jsonRpcPost(url, {
        jsonrpc: '2.0',
        id: `tools/list:${Date.now()}`,
        method: 'tools/list',
        params: {},
    }, { headers });

    return (result && Array.isArray(result.tools)) ? result.tools : [];
}

async function mcpCallTool({ mcpUrl, apiKey, name, args } = {}) {
    const url = mcpUrl || DEFAULT_MCP_URL;
    const key = getApiKey(apiKey);
    const headers = (key && isNodeRuntime()) ? { CONTEXT7_API_KEY: key } : {};

    const result = await jsonRpcPost(url, {
        jsonrpc: '2.0',
        id: `tools/call:${Date.now()}`,
        method: 'tools/call',
        params: {
            name,
            arguments: args || {},
        },
    }, { headers });

    return result;
}

export default [
    {
        name: 'context7_resolve_library_id',
        description: 'Context7 MCP: resolve a library name to a Context7 libraryId (best-effort in Browser; full auth in Node via CONTEXT7_API_KEY).',
        meta: {
            intentTemplate: 'resolve library id: {libraryName}',
        },
        parameters: {
            type: 'object',
            properties: {
                libraryName: { type: 'string', description: 'Library name to resolve (e.g. "vitest").' },
                query: { type: 'string', description: 'Task/question to rank results.' },
                mcpUrl: { type: 'string', description: `Override MCP URL (default ${DEFAULT_MCP_URL}).` },
                apiKey: { type: 'string', description: 'Context7 API key (Node: also supports CONTEXT7_API_KEY env).', }
            },
            required: ['libraryName', 'query'],
        },
        func: async ({ libraryName, query, mcpUrl, apiKey } = {}) => {
            // The remote MCP tool name is typically "resolve-library-id".
            return await mcpCallTool({
                mcpUrl,
                apiKey,
                name: 'resolve-library-id',
                args: { libraryName, query },
            });
        }
    },
    {
        name: 'context7_query_docs',
        description: 'Context7 MCP: query docs for a Context7 libraryId (best-effort in Browser; full auth in Node via CONTEXT7_API_KEY).',
        meta: {
            intentTemplate: 'query docs: {query}',
        },
        parameters: {
            type: 'object',
            properties: {
                libraryId: { type: 'string', description: 'Context7 libraryId (e.g. /vitest-dev/vitest).' },
                query: { type: 'string', description: 'Question/task to fetch relevant documentation for.' },
                mcpUrl: { type: 'string', description: `Override MCP URL (default ${DEFAULT_MCP_URL}).` },
                apiKey: { type: 'string', description: 'Context7 API key (Node: also supports CONTEXT7_API_KEY env).', }
            },
            required: ['libraryId', 'query'],
        },
        func: async ({ libraryId, query, mcpUrl, apiKey } = {}) => {
            // The remote MCP tool name is typically "query-docs".
            return await mcpCallTool({
                mcpUrl,
                apiKey,
                name: 'query-docs',
                args: { libraryId, query },
            });
        }
    },
];
