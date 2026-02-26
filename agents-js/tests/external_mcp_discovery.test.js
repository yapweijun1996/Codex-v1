const http = require('http');
const path = require('path');

const { createAgentAsync } = require('../agent-factory');

function startMockMcpServer() {
    const server = http.createServer(async (req, res) => {
        if (req.method !== 'POST' || req.url !== '/mcp') {
            res.statusCode = 404;
            res.end('not found');
            return;
        }

        let body = '';
        req.setEncoding('utf8');
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
            res.setHeader('content-type', 'application/json');

            let rpc;
            try {
                rpc = JSON.parse(body);
            } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: { code: -32700, message: 'Parse error' },
                }));
                return;
            }

            const id = rpc && rpc.id !== undefined ? rpc.id : null;

            if (!rpc || rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') {
                res.statusCode = 400;
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id,
                    error: { code: -32600, message: 'Invalid Request' },
                }));
                return;
            }

            if (rpc.method === 'tools/list') {
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id,
                    result: {
                        tools: [
                            {
                                name: 'remote_echo',
                                description: 'Echoes input text (mock MCP).',
                                inputSchema: {
                                    type: 'object',
                                    properties: {
                                        text: { type: 'string' },
                                    },
                                    required: ['text'],
                                },
                            },
                        ],
                    },
                }));
                return;
            }

            if (rpc.method === 'tools/call') {
                const params = rpc.params && typeof rpc.params === 'object' ? rpc.params : {};
                const name = params.name;
                const args = params.arguments && typeof params.arguments === 'object' ? params.arguments : {};

                if (name !== 'remote_echo') {
                    res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id,
                        error: { code: -32601, message: `Unknown tool: ${String(name)}` },
                    }));
                    return;
                }

                const text = String(args.text || '');
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id,
                    result: {
                        content: [{ type: 'text', text }],
                        structuredContent: { echo: text },
                    },
                }));
                return;
            }

            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id,
                error: { code: -32601, message: `Unknown method: ${rpc.method}` },
            }));
        });
    });

    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            const port = addr && typeof addr === 'object' ? addr.port : null;
            const url = `http://127.0.0.1:${port}/mcp`;
            resolve({
                url,
                close: () => new Promise((r) => server.close(r)),
            });
        });
    });
}

describe('External MCP discovery (env EXTERNAL_MCP_URLS)', () => {
    it('discovers remote tools and can call them', async () => {
        const mock = await startMockMcpServer();

        const prevUrls = process.env.EXTERNAL_MCP_URLS;
        const prevConfig = process.env.MCP_CONFIG_JSON;
        try {
            process.env.EXTERNAL_MCP_URLS = mock.url;
            // Ensure MCP_CONFIG_JSON doesn't override EXTERNAL_MCP_URLS for this test.
            delete process.env.MCP_CONFIG_JSON;

            const { skillManager, tools } = await createAgentAsync({
                skillsDir: path.join(__dirname, '../skills'),
                preferEsmTools: true,
            });

            const remoteTool = tools.find((t) => t && t.name === 'remote_echo');
            expect(remoteTool).toBeTruthy();
            expect(remoteTool._skillSource).toBe(`remote:${mock.url}`);

            const result = await remoteTool.func({ text: 'hello' });
            expect(result).toBeTruthy();
            expect(result.content).toEqual([{ type: 'text', text: 'hello' }]);
            expect(result.structuredContent).toEqual({ echo: 'hello' });

            await skillManager.refreshSkillsAsync({ preferEsmTools: true, quiet: true });
            const afterRefresh = skillManager.getTools().find((t) => t && t.name === 'remote_echo');
            expect(afterRefresh).toBeTruthy();
            expect(afterRefresh._skillSource).toBe(`remote:${mock.url}`);
        } finally {
            if (prevUrls === undefined) delete process.env.EXTERNAL_MCP_URLS;
            else process.env.EXTERNAL_MCP_URLS = prevUrls;
            if (prevConfig === undefined) delete process.env.MCP_CONFIG_JSON;
            else process.env.MCP_CONFIG_JSON = prevConfig;
            await mock.close();
        }
    }, 20000);
});
