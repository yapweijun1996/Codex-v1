const { readNodeMcpStdioServersFromJson } = require('../utils/mcp-config-adapter');

describe('mcp-config-adapter (stdio)', () => {
    it('extracts stdio servers from config json', () => {
        const json = JSON.stringify({
            mcpServers: {
                blogger: {
                    transport: 'stdio',
                    command: 'npx',
                    args: ['-y', '@mcproadev/blogger-mcp-server'],
                    env: { BLOGGER_API_KEY: 'k1' },
                },
                ctx: {
                    transport: 'http',
                    url: 'https://mcp.context7.com/mcp',
                },
            },
        });

        const servers = readNodeMcpStdioServersFromJson(json);
        expect(servers).toEqual([
            {
                serverName: 'blogger',
                transport: 'stdio',
                command: 'npx',
                args: ['-y', '@mcproadev/blogger-mcp-server'],
                env: { BLOGGER_API_KEY: 'k1' },
                namespace: true,
            },
        ]);
    });

    it('passes through tool risk overrides and approval mode', () => {
        const json = JSON.stringify({
            mcpServers: {
                memory: {
                    transport: 'stdio',
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-memory'],
                    defaultToolRisk: 0,
                    toolRiskOverrides: { search_nodes: 0, read_graph: 0 },
                    approvalMode: 'per_turn',
                },
            },
        });

        const servers = readNodeMcpStdioServersFromJson(json);
        expect(servers).toEqual([
            {
                serverName: 'memory',
                transport: 'stdio',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-memory'],
                defaultToolRisk: 0,
                toolRiskOverrides: { search_nodes: 0, read_graph: 0 },
                approvalMode: 'per_turn',
                namespace: true,
            },
        ]);
    });
});
