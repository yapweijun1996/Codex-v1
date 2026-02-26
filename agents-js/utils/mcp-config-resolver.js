const {
    readNodeMcpHttpServersFromEnv,
    readNodeMcpHttpServersFromJson,
    readBrowserMcpHttpServersFromGlobal,
    readNodeMcpHttpServersFromFile,
    readNodeMcpStdioServersFromEnv,
    readNodeMcpStdioServersFromJson,
    readNodeMcpStdioServersFromFile,
} = require('./mcp-config-adapter');

function parseExternalMcpUrls(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value !== 'string') return [];
    return value
        .split(/[\n,]/g)
        .map((s) => s.trim())
        .filter(Boolean);
}

function resolveMcpServers(options = {}) {
    const {
        mcpConfigJson,
        mcpConfigPath,
        externalMcpUrls,
        isBrowserRuntime: isBrowserOverride,
        isTestRuntime: isTestOverride,
    } = options;

    const isBrowserRuntime = (typeof isBrowserOverride === 'boolean')
        ? isBrowserOverride
        : (typeof window !== 'undefined');

    const isTestRuntime = (typeof isTestOverride === 'boolean')
        ? isTestOverride
        : (!isBrowserRuntime
            && typeof process !== 'undefined'
            && process
            && process.env
            && (process.env.NODE_ENV === 'test' || process.env.VITEST_WORKER_ID));

    const configServers = (() => {
        if (typeof mcpConfigJson === 'string' && mcpConfigJson.trim()) {
            return readNodeMcpHttpServersFromJson(mcpConfigJson)
                .concat(readNodeMcpStdioServersFromJson(mcpConfigJson));
        }
        if (isBrowserRuntime) return readBrowserMcpHttpServersFromGlobal();
        const fromEnv = readNodeMcpHttpServersFromEnv().concat(readNodeMcpStdioServersFromEnv());
        if (fromEnv.length > 0) return fromEnv;

        const fromFilePath = (typeof mcpConfigPath === 'string' && mcpConfigPath.trim())
            ? mcpConfigPath
            : ((typeof process !== 'undefined' && process && process.env && process.env.MCP_CONFIG_PATH)
                ? process.env.MCP_CONFIG_PATH
                : (isTestRuntime ? '' : (() => {
                    if (typeof window !== 'undefined') return '';
                    try {
                        const path = require('path');
                        return path.join(process.cwd(), 'mcp-config.json');
                    } catch {
                        return '';
                    }
                })()));

        if (!fromFilePath) return [];
        return readNodeMcpHttpServersFromFile(fromFilePath)
            .concat(readNodeMcpStdioServersFromFile(fromFilePath));
    })();

    const envUrls = (typeof process !== 'undefined' && process && process.env)
        ? parseExternalMcpUrls(process.env.EXTERNAL_MCP_URLS)
        : [];
    const urls = parseExternalMcpUrls(externalMcpUrls);
    const mergedUrls = (urls.length > 0 ? urls : envUrls);
    const combinedServers = configServers.concat(mergedUrls.map((u) => ({ url: u, namespace: false })));

    return { configServers, mergedUrls, combinedServers, isBrowserRuntime, isTestRuntime };
}

module.exports = { resolveMcpServers, parseExternalMcpUrls };
