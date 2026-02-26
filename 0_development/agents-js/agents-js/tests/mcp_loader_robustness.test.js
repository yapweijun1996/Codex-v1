describe('mcp-tool-loader robustness', () => {
    function loadSubject() {
        const proxyPath = require.resolve('../utils/mcp-proxy');
        const loaderPath = require.resolve('../utils/mcp-tool-loader');
        vi.resetModules();
        delete require.cache[proxyPath];
        delete require.cache[loaderPath];
        const mcpProxy = { listRemoteTools: vi.fn(), callRemoteTool: vi.fn() };
        require.cache[proxyPath] = {
            id: proxyPath,
            filename: proxyPath,
            loaded: true,
            exports: mcpProxy,
        };
        const loader = require('../utils/mcp-tool-loader');
        return { mcpProxy, ...loader };
    }

    it('dedupes tool names and normalizes parameters', async () => {
        const { mcpProxy, createRemoteToolDefinitions } = loadSubject();
        mcpProxy.listRemoteTools.mockResolvedValue([
            { name: 'echo', description: 'one', inputSchema: null },
            { name: 'echo', description: 'two', inputSchema: { type: 'object', properties: {} } },
        ]);

        const tools = await createRemoteToolDefinitions([
            { url: 'http://example.com/api', serverName: 'srv', namespace: true },
        ]);

        expect(tools.length).toBe(2);
        expect(tools[0].name).toBe('srv__echo');
        expect(tools[1].name).toBe('srv__echo_2');
        expect(tools[0].parameters).toHaveProperty('type', 'object');

        mcpProxy.callRemoteTool.mockResolvedValue({ ok: true });
        await tools[0].func({ a: 1 });
        expect(mcpProxy.callRemoteTool).toHaveBeenCalledWith(
            'http://example.com/api',
            'echo',
            { a: 1 },
            expect.any(Object)
        );
    });

    it('skips invalid server definitions and non-array tool lists', async () => {
        const { mcpProxy, createRemoteToolDefinitions } = loadSubject();
        mcpProxy.listRemoteTools.mockResolvedValue(null);
        const out = await createRemoteToolDefinitions([null, { url: '' }, { url: 'http://example.com' }]);
        expect(out).toEqual([]);
    });

    it('skips stdio servers without command', async () => {
        const { createMcpToolDefinitions } = loadSubject();
        const out = await createMcpToolDefinitions([
            { transport: 'stdio', serverName: 'stdio_one' },
        ], { quiet: true });
        expect(out).toEqual([]);
    });

    it('filters invalid tool entries from remote list', async () => {
        const { mcpProxy, createMcpToolDefinitions } = loadSubject();
        mcpProxy.listRemoteTools.mockResolvedValue([
            { name: 123 },
            { name: 'ok', inputSchema: null },
        ]);

        const out = await createMcpToolDefinitions([
            { url: 'http://example.com' },
        ], { quiet: true });

        expect(out.length).toBe(1);
        expect(out[0].name).toMatch(/ok/);
    });

    it('applies server risk overrides and approval mode to tools', async () => {
        const { mcpProxy, createRemoteToolDefinitions } = loadSubject();
        mcpProxy.listRemoteTools.mockResolvedValue([{ name: 'echo', description: 'x', inputSchema: null }]);

        const tools = await createRemoteToolDefinitions([
            {
                url: 'http://example.com/api',
                serverName: 'srv',
                namespace: true,
                defaultToolRisk: 1,
                toolRiskOverrides: { echo: 0 },
                approvalMode: 'per_turn',
            },
        ]);

        expect(tools.length).toBe(1);
        expect(tools[0].name).toBe('srv__echo');
        expect(tools[0].risk).toBe(0);
        expect(tools[0].approvalMode).toBe('per_turn');
    });
});
