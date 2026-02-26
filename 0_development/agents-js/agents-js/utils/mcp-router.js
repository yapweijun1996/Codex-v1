// MCP Router: unified interface over HTTP + stdio transports.
// Pure JS; Node + Browser compatible (stdio path guarded by runtime check).

function _getProxy() {
    // Lazy require to make module-cache stubbing in tests reliable.
    // eslint-disable-next-line global-require
    return require('./mcp-proxy');
}

function isNodeRuntime() {
    return (typeof window === 'undefined'
        && typeof process !== 'undefined'
        && !!(process.versions && process.versions.node));
}

function _normalizeTransport(server) {
    const t = server && server.transport ? String(server.transport).toLowerCase() : '';
    if (t) return t;
    // Back-compat heuristic: treat a server with command as stdio.
    if (server && server.command) return 'stdio';
    return 'http';
}

function _normalizeHeaders(headers) {
    return (headers && typeof headers === 'object' && !Array.isArray(headers)) ? headers : null;
}

const _stdioClientCache = new Map();

function _getStdioClient(server, { timeoutMs } = {}) {
    const key = JSON.stringify({
        serverName: server.serverName,
        command: server.command,
        args: server.args,
        env: server.env || null,
        cwd: server.cwd || null,
    });
    if (_stdioClientCache.has(key)) return _stdioClientCache.get(key);

    // Lazy require: keep module browser-safe.
    // eslint-disable-next-line global-require
    const { McpStdioClient } = require('./mcp-stdio-client');
    const client = new McpStdioClient({
        serverName: server.serverName,
        command: server.command,
        args: server.args,
        env: server.env,
        cwd: server.cwd,
        defaultTimeoutMs: timeoutMs,
    });
    _stdioClientCache.set(key, client);
    return client;
}

async function listTools(server, options = {}) {
    const transport = _normalizeTransport(server);
    const timeoutMs = options && options.timeoutMs;

    if (transport === 'stdio') {
        if (!isNodeRuntime()) {
            throw new Error('[MCP][stdio] Not supported in this runtime.');
        }
        if (!server || !server.command) {
            throw new Error('[MCP][stdio] Invalid server: missing command.');
        }

        const client = _getStdioClient(server, { timeoutMs });
        const tools = await client.listTools({ timeoutMs });
        if (!server.keepAlive) {
            await client.stop();
        }
        return tools;
    }

    const url = server && server.url ? String(server.url).trim() : '';
    if (!url) throw new Error('[MCP][http] Invalid server: missing url.');

    const headers = _normalizeHeaders(server && server.headers) || _normalizeHeaders(options && options.headers);
    const { listRemoteTools } = _getProxy();
    return await listRemoteTools(url, { timeoutMs, headers });
}

async function callTool(server, toolName, args, options = {}) {
    const transport = _normalizeTransport(server);
    const timeoutMs = options && options.timeoutMs;

    if (transport === 'stdio') {
        if (!isNodeRuntime()) {
            throw new Error('[MCP][stdio] Not supported in this runtime.');
        }
        if (!server || !server.command) {
            throw new Error('[MCP][stdio] Invalid server: missing command.');
        }

        const client = _getStdioClient(server, { timeoutMs });
        return await client.callTool(toolName, args, { timeoutMs });
    }

    const url = server && server.url ? String(server.url).trim() : '';
    if (!url) throw new Error('[MCP][http] Invalid server: missing url.');
    const headers = _normalizeHeaders(server && server.headers) || _normalizeHeaders(options && options.headers);
    const { callRemoteTool } = _getProxy();
    return await callRemoteTool(url, toolName, args, { timeoutMs, headers });
}

module.exports = {
    listTools,
    callTool,
    isNodeRuntime,
};
