function normalizeHeaders(headers) {
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return {};
    const out = {};
    for (const [k, v] of Object.entries(headers)) {
        if (!k) continue;
        if (v === undefined || v === null) continue;
        out[String(k)] = String(v);
    }
    return out;
}

async function jsonRpcPost(fetchImpl, url, method, params, headers) {
    const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'accept': 'application/json, text/event-stream',
            ...normalizeHeaders(headers),
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: `${Date.now()}`,
            method,
            ...(params !== undefined ? { params } : null),
        }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    const data = text ? JSON.parse(text) : null;
    if (data && data.error) throw new Error(`JSON-RPC error: ${data.error.message || 'unknown'}`);
    return data ? data.result : null;
}

export async function loadMcpHttpToolsFromConfig(mcpConfig, { fetchImpl = fetch } = {}) {
    const cfg = (mcpConfig && typeof mcpConfig === 'object') ? mcpConfig : null;
    const servers = cfg && cfg.mcpServers && typeof cfg.mcpServers === 'object' ? cfg.mcpServers : null;
    if (!servers) return [];
    const out = [];
    for (const [serverName, server] of Object.entries(servers)) {
        if (!server || typeof server !== 'object') continue;
        const transport = server.transport ? String(server.transport).toLowerCase() : 'http';
        if (transport !== 'http') continue;
        const url = server.url ? String(server.url) : '';
        if (!url) continue;
        const headers = server.headers;
        const result = await jsonRpcPost(fetchImpl, url, 'tools/list', {}, headers);
        const tools = (result && Array.isArray(result.tools)) ? result.tools : (Array.isArray(result) ? result : []);
        for (const t of tools) {
            if (!t || !t.name) continue;
            const localName = `${serverName}__${t.name}`;
            out.push({
                name: localName,
                description: t.description ? `[MCP:${serverName}] ${t.description}` : `[MCP:${serverName}]`,
                parameters: t.inputSchema || { type: 'object', properties: {} },
                _skillSource: `remote:${url}`,
                func: async (args) => {
                    return await jsonRpcPost(fetchImpl, url, 'tools/call', {
                        name: String(t.name),
                        arguments: args || {},
                    }, headers);
                },
            });
        }
    }
    return out;
}
