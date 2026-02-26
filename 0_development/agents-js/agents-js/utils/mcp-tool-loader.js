// Helpers to turn external MCP servers into local tool definitions.
// Pure JS; Node + Browser compatible.

const { listTools: listMcpTools, callTool: callMcpTool } = require('./mcp-router');
const { RiskLevel, normalizeRiskLevel } = require('./imda-constants');

function _safeUrlLabel(url) {
    try {
        const u = new URL(url);
        const host = (u.host || 'server').replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = (u.pathname || '').replace(/[^a-zA-Z0-9/_-]/g, '_').replace(/\/+$/g, '');
        const compactPath = path && path !== '/' ? path.replace(/\//g, '_') : '';
        return compactPath ? `${host}${compactPath}` : host;
    } catch {
        return String(url || 'server').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || 'server';
    }
}

function _pickUniqueName(base, used, fallbackPrefix) {
    const raw = String(base || '').trim();
    const initial = raw || `${fallbackPrefix}__tool`;
    if (!used.has(initial)) {
        used.add(initial);
        return initial;
    }
    for (let i = 2; i < 1000; i++) {
        const candidate = `${initial}_${i}`;
        if (!used.has(candidate)) {
            used.add(candidate);
            return candidate;
        }
    }
    // Extremely unlikely fallback.
    const last = `${initial}_${Date.now()}`;
    used.add(last);
    return last;
}

function _normalizeParameters(inputSchema) {
    if (inputSchema && typeof inputSchema === 'object' && !Array.isArray(inputSchema)) return inputSchema;
    return { type: 'object', properties: {} };
}

function _normalizeServers(input) {
    if (!Array.isArray(input)) return [];
    return input
        .map((v) => {
            if (!v) return null;
            if (typeof v === 'string') return { url: v };
            if (typeof v === 'object') return v;
            return null;
        })
        .filter(Boolean);
}

function _parseRiskValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return normalizeRiskLevel(value, undefined);
    }
    if (typeof value !== 'string') return undefined;
    const v = value.trim().toLowerCase();
    const mapped = ({
        none: RiskLevel.NONE,
        low: RiskLevel.LOW,
        medium: RiskLevel.MEDIUM,
        high: RiskLevel.HIGH,
    })[v];
    return (typeof mapped === 'number') ? mapped : undefined;
}

function _normalizeApprovalMode(value) {
    if (typeof value !== 'string') return undefined;
    const v = value.trim().toLowerCase();
    if (v === 'per_turn') return 'per_turn';
    if (v === 'per_call') return 'per_call';
    return undefined;
}

function _isDefaultMemoryServer(server, serverName) {
    if (String(serverName || '').toLowerCase() !== 'memory') return false;
    const transport = server && server.transport ? String(server.transport).toLowerCase() : '';
    if (transport !== 'stdio' && transport !== '') return false;
    const args = Array.isArray(server && server.args) ? server.args.map(String) : [];
    return args.some((a) => a.includes('@modelcontextprotocol/server-memory'));
}

function _resolveToolRisk({ server, serverName, localName, remoteName }) {
    const overrides = (server && server.toolRiskOverrides && typeof server.toolRiskOverrides === 'object' && !Array.isArray(server.toolRiskOverrides))
        ? server.toolRiskOverrides
        : null;
    if (overrides) {
        const byRemote = _parseRiskValue(overrides[remoteName]);
        if (typeof byRemote === 'number') return byRemote;
        const byLocal = _parseRiskValue(overrides[localName]);
        if (typeof byLocal === 'number') return byLocal;
    }

    if (_isDefaultMemoryServer(server, serverName) && (remoteName === 'search_nodes' || remoteName === 'read_graph')) {
        return RiskLevel.NONE;
    }

    const defaultRisk = _parseRiskValue(server && server.defaultToolRisk);
    return (typeof defaultRisk === 'number') ? defaultRisk : undefined;
}

async function createRemoteToolDefinitions(serversOrUrls, { quiet = false, timeoutMs, headers } = {}) {
    const servers = _normalizeServers(serversOrUrls)
        .map((s) => ({ ...s, transport: 'http', namespace: (s.namespace !== undefined) ? s.namespace : false }));
    return await createMcpToolDefinitions(servers, { quiet, timeoutMs, headers });
}

async function createMcpToolDefinitions(serversOrUrls, { quiet = false, timeoutMs, headers } = {}) {
    const servers = _normalizeServers(serversOrUrls);
    const usedNames = new Set();
    const out = [];

    for (const server of servers) {
        const transport = server.transport ? String(server.transport).toLowerCase() : 'http';
        const serverName = (server.serverName && String(server.serverName).trim())
            || (server.url ? _safeUrlLabel(server.url) : (server.name ? String(server.name) : 'mcp'));
        const namespace = (server.namespace !== undefined) ? Boolean(server.namespace) : true;
        const label = serverName;

        const url = (transport === 'http' || transport === 'https')
            ? String(server.url || '').trim()
            : '';

        // Keep legacy behavior: silently skip invalid http servers.
        if ((transport === 'http' || transport === 'https') && !url) {
            continue;
        }

        let remoteTools;
        try {
            remoteTools = await listMcpTools({
                ...server,
                transport,
                serverName,
            }, { timeoutMs, headers });
        } catch (e) {
            if (!quiet) {
                const target = (transport === 'stdio') ? serverName : (url || serverName);
                console.warn(`[SkillManager] External MCP tools/list failed for ${target}: ${String(e && e.message ? e.message : e)}`);
            }
            continue;
        }

        if (!Array.isArray(remoteTools)) continue;
        for (const t of remoteTools) {
            const remoteName = t && typeof t === 'object' ? t.name : null;
            if (!remoteName || typeof remoteName !== 'string') continue;

            const baseName = namespace ? `${serverName}__${remoteName}` : remoteName;
            const localName = _pickUniqueName(baseName, usedNames, `mcp_${label}`);
            const desc = (t && typeof t.description === 'string') ? t.description : '';
            const parameters = _normalizeParameters(t && t.inputSchema);
            const risk = _resolveToolRisk({ server, serverName, localName, remoteName });
            const approvalMode = _normalizeApprovalMode(server && server.approvalMode);

            const source = (transport === 'stdio')
                ? `stdio:${serverName}`
                : `remote:${url}`;
            const mcpMeta = (transport === 'stdio')
                ? { transport: 'stdio', serverName, remoteName }
                : { transport: 'http', url, remoteName, serverName };

            out.push({
                name: localName,
                description: desc ? `[MCP:${label}] ${desc}` : `[MCP:${label}]`,
                ...(typeof risk === 'number' ? { risk } : null),
                ...(approvalMode ? { approvalMode } : null),
                parameters,
                _skillSource: source,
                _mcp: mcpMeta,
                func: async (args) => {
                    return await callMcpTool({
                        ...server,
                        transport,
                        serverName,
                    }, remoteName, args, { timeoutMs, headers });
                },
            });
        }
    }

    return out;
}

module.exports = {
    createRemoteToolDefinitions,
    createMcpToolDefinitions,
};
