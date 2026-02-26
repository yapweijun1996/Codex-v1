const { McpStdioClient } = require('../utils/mcp-stdio-client');
describe('McpStdioClient (server-memory)', () => {
    it('discovers tools and can call read_graph', async () => {
        const client = new McpStdioClient({
            serverName: 'memory',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
            defaultTimeoutMs: 60000,
        });

        try {
            const listed = await client.listTools({ timeoutMs: 60000 });
            expect(Array.isArray(listed)).toBe(true);
            const names = listed.map((t) => t && t.name).filter(Boolean);
            expect(names.length).toBeGreaterThan(0);
            expect(names).toContain('read_graph');

            const result = await client.callTool('read_graph', {}, { timeoutMs: 60000 });
            expect(result).toBeTruthy();
            expect(Array.isArray(result.content)).toBe(true);
        } finally {
            await client.stop();
            expect(client.isRunning()).toBe(false);
        }
    }, 60000);
});
