// MCP config adapter (Node-focused MVP).
//
// Goal: read MCP server configs from env (`MCP_CONFIG_JSON`) and normalize into
// a list of HTTP servers with optional headers.

const { RiskLevel, normalizeRiskLevel } = require('./imda-constants');

function _safeJsonParse(text) {
    if (!text || typeof text !== 'string') return { value: null, error: null };
    try {
        return { value: JSON.parse(text), error: null };
    } catch (e) {
        return { value: null, error: (e && e.message) ? String(e.message) : 'Invalid JSON' };
    }
}

function _isNodeRuntime() {
    return (typeof window === 'undefined'
        && typeof process !== 'undefined'
        && !!(process.versions && process.versions.node));
}

function _getNodeDeps() {
    if (!_isNodeRuntime()) return null;
    // Lazy require: keeps this module browser-safe.
    // eslint-disable-next-line global-require
    const fs = require('fs');
    return { fs };
}

function _normalizeHeaders(headers) {
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return null;
    const out = {};
    for (const [k, v] of Object.entries(headers)) {
        if (!k) continue;
        if (v === undefined || v === null) continue;
        out[String(k)] = String(v);
    }
    return Object.keys(out).length > 0 ? out : null;
}

function _normalizeEnv(env) {
    if (!env || typeof env !== 'object' || Array.isArray(env)) return null;
    const out = {};
    for (const [k, v] of Object.entries(env)) {
        if (!k) continue;
        if (v === undefined || v === null) continue;
        out[String(k)] = String(v);
    }
    return Object.keys(out).length > 0 ? out : null;
}

function _parseRiskValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const normalized = normalizeRiskLevel(value, null);
        return normalized === null ? undefined : normalized;
    }
    if (typeof value !== 'string') return undefined;
    const v = value.trim().toLowerCase();
    const mapped = ({
        none: RiskLevel.NONE,
        low: RiskLevel.LOW,
        medium: RiskLevel.MEDIUM,
        high: RiskLevel.HIGH,
        'tier0': RiskLevel.NONE,
        'tier 0': RiskLevel.NONE,
        'tier1': RiskLevel.LOW,
        'tier 1': RiskLevel.LOW,
        'tier2': RiskLevel.MEDIUM,
        'tier 2': RiskLevel.MEDIUM,
        'tier3': RiskLevel.HIGH,
        'tier 3': RiskLevel.HIGH,
    })[v];
    return (typeof mapped === 'number') ? mapped : undefined;
}

function _normalizeToolRiskOverrides(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
    const out = {};
    for (const [k, v] of Object.entries(input)) {
        if (!k) continue;
        const risk = _parseRiskValue(v);
        if (typeof risk === 'number') out[String(k)] = risk;
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

function _normalizeApprovalMode(value) {
    if (typeof value !== 'string') return undefined;
    const v = value.trim().toLowerCase();
    if (v === 'per_turn') return 'per_turn';
    if (v === 'per_call') return 'per_call';
    return undefined;
}

function readBrowserMcpHttpServersFromGlobal() {
    const g = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
    const raw = g && g.EXTERNAL_MCP_CONFIG;
    if (!raw || typeof raw !== 'object') return [];
    const servers = raw.mcpServers && typeof raw.mcpServers === 'object' ? raw.mcpServers : null;
    if (!servers) return [];

    const out = [];
    for (const [serverName, cfg] of Object.entries(servers)) {
        if (!cfg || typeof cfg !== 'object') continue;
        const transport = cfg.transport ? String(cfg.transport).toLowerCase() : '';
        const url = cfg.url ? String(cfg.url) : '';
        if (!url) continue;
        if (transport && transport !== 'http') continue;
        out.push({
            serverName,
            url,
            headers: _normalizeHeaders(cfg.headers) || undefined,
            ...(() => {
                const defaultToolRisk = _parseRiskValue(cfg.defaultToolRisk);
                const toolRiskOverrides = _normalizeToolRiskOverrides(cfg.toolRiskOverrides || cfg.toolRisks);
                const approvalMode = _normalizeApprovalMode(cfg.approvalMode);
                return {
                    ...(typeof defaultToolRisk === 'number' ? { defaultToolRisk } : null),
                    ...(toolRiskOverrides ? { toolRiskOverrides } : null),
                    ...(approvalMode ? { approvalMode } : null),
                };
            })(),
            namespace: true,
        });
    }
    return out;
}

function readNodeMcpHttpServersFromJson(jsonText) {
    const parsed = _safeJsonParse(jsonText);
    const raw = parsed.value;
    if (!raw || typeof raw !== 'object') return [];
    const servers = raw.mcpServers && typeof raw.mcpServers === 'object' ? raw.mcpServers : null;
    if (!servers) return [];

    const out = [];
    for (const [serverName, cfg] of Object.entries(servers)) {
        if (!cfg || typeof cfg !== 'object') continue;
        const transport = cfg.transport ? String(cfg.transport).toLowerCase() : '';
        const url = cfg.url ? String(cfg.url) : '';
        if (!url) continue;
        if (transport && transport !== 'http') continue;

        out.push({
            serverName,
            url,
            headers: _normalizeHeaders(cfg.headers) || undefined,
            ...(() => {
                const defaultToolRisk = _parseRiskValue(cfg.defaultToolRisk);
                const toolRiskOverrides = _normalizeToolRiskOverrides(cfg.toolRiskOverrides || cfg.toolRisks);
                const approvalMode = _normalizeApprovalMode(cfg.approvalMode);
                return {
                    ...(typeof defaultToolRisk === 'number' ? { defaultToolRisk } : null),
                    ...(toolRiskOverrides ? { toolRiskOverrides } : null),
                    ...(approvalMode ? { approvalMode } : null),
                };
            })(),
            namespace: true,
        });
    }
    return out;
}

function readNodeMcpStdioServersFromJson(jsonText) {
    const parsed = _safeJsonParse(jsonText);
    const raw = parsed.value;
    if (!raw || typeof raw !== 'object') return [];
    const servers = raw.mcpServers && typeof raw.mcpServers === 'object' ? raw.mcpServers : null;
    if (!servers) return [];

    const out = [];
    for (const [serverName, cfg] of Object.entries(servers)) {
        if (!cfg || typeof cfg !== 'object') continue;
        const transport = cfg.transport ? String(cfg.transport).toLowerCase() : '';
        if (transport !== 'stdio') continue;
        const command = cfg.command ? String(cfg.command) : '';
        if (!command) continue;
        out.push({
            serverName,
            transport: 'stdio',
            command,
            args: Array.isArray(cfg.args) ? cfg.args.map(String) : [],
            env: _normalizeEnv(cfg.env) || undefined,
            ...(() => {
                const defaultToolRisk = _parseRiskValue(cfg.defaultToolRisk);
                const toolRiskOverrides = _normalizeToolRiskOverrides(cfg.toolRiskOverrides || cfg.toolRisks);
                const approvalMode = _normalizeApprovalMode(cfg.approvalMode);
                return {
                    ...(typeof defaultToolRisk === 'number' ? { defaultToolRisk } : null),
                    ...(toolRiskOverrides ? { toolRiskOverrides } : null),
                    ...(approvalMode ? { approvalMode } : null),
                };
            })(),
            namespace: true,
        });
    }
    return out;
}

function readNodeMcpHttpServersFromEnv() {
    if (typeof process === 'undefined' || !process || !process.env) return [];
    const text = process.env.MCP_CONFIG_JSON;
    if (!text) return [];
    const parsed = _safeJsonParse(text);
    if (!parsed.value) {
        // Keep it safe: do not print the JSON, only the parse error.
        console.error(`[MCP] MCP_CONFIG_JSON parse failed: ${parsed.error || 'Invalid JSON'}`);
        return [];
    }
    return readNodeMcpHttpServersFromJson(text);
}

function readNodeMcpStdioServersFromEnv() {
    if (typeof process === 'undefined' || !process || !process.env) return [];
    const text = process.env.MCP_CONFIG_JSON;
    if (!text) return [];
    const parsed = _safeJsonParse(text);
    if (!parsed.value) {
        console.error(`[MCP] MCP_CONFIG_JSON parse failed: ${parsed.error || 'Invalid JSON'}`);
        return [];
    }
    return readNodeMcpStdioServersFromJson(text);
}

function readNodeMcpHttpServersFromFile(filePath) {
    const deps = _getNodeDeps();
    if (!deps) return [];
    const { fs } = deps;
    const p = String(filePath || '').trim();
    if (!p) return [];

    try {
        if (!fs.existsSync(p)) return [];
        const text = fs.readFileSync(p, 'utf8');
        const parsed = _safeJsonParse(text);
        if (!parsed.value) {
            console.error(`[MCP] MCP config file parse failed (${p}): ${parsed.error || 'Invalid JSON'}`);
            return [];
        }
        return readNodeMcpHttpServersFromJson(text);
    } catch (e) {
        const msg = e && e.message ? String(e.message) : String(e);
        console.error(`[MCP] MCP config file read failed (${p}): ${msg}`);
        return [];
    }
}

function readNodeMcpStdioServersFromFile(filePath) {
    const deps = _getNodeDeps();
    if (!deps) return [];
    const { fs } = deps;
    const p = String(filePath || '').trim();
    if (!p) return [];

    try {
        if (!fs.existsSync(p)) return [];
        const text = fs.readFileSync(p, 'utf8');
        const parsed = _safeJsonParse(text);
        if (!parsed.value) {
            console.error(`[MCP] MCP config file parse failed (${p}): ${parsed.error || 'Invalid JSON'}`);
            return [];
        }
        return readNodeMcpStdioServersFromJson(text);
    } catch (e) {
        const msg = e && e.message ? String(e.message) : String(e);
        console.error(`[MCP] MCP config file read failed (${p}): ${msg}`);
        return [];
    }
}

module.exports = {
    readNodeMcpHttpServersFromEnv,
    readNodeMcpHttpServersFromJson,
    readBrowserMcpHttpServersFromGlobal,
    readNodeMcpHttpServersFromFile,
    readNodeMcpStdioServersFromEnv,
    readNodeMcpStdioServersFromJson,
    readNodeMcpStdioServersFromFile,
};
