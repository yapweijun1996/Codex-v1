const { readBrowserMcpHttpServersFromGlobal } = require('../utils/mcp-config-adapter');

describe('mcp-config-adapter (browser global)', () => {
    it('reads window/globalThis EXTERNAL_MCP_CONFIG and returns http servers', () => {
        const prev = globalThis.EXTERNAL_MCP_CONFIG;
        try {
            globalThis.EXTERNAL_MCP_CONFIG = {
                mcpServers: {
                    context7: {
                        transport: 'http',
                        url: 'https://mcp.context7.com/mcp',
                        headers: { 'X-API-Key': 'k123' },
                    },
                    local: {
                        transport: 'stdio',
                        command: 'npx',
                    },
                },
            };

            const servers = readBrowserMcpHttpServersFromGlobal();
            expect(servers).toEqual([
                {
                    serverName: 'context7',
                    url: 'https://mcp.context7.com/mcp',
                    headers: { 'X-API-Key': 'k123' },
                    namespace: true,
                },
            ]);
        } finally {
            if (prev === undefined) delete globalThis.EXTERNAL_MCP_CONFIG;
            else globalThis.EXTERNAL_MCP_CONFIG = prev;
        }
    });
});
