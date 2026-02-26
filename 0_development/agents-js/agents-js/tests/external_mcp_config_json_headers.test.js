const http = require('http');
const path = require('path');

const { createAgentAsync } = require('../agent-factory');

function startHeaderCheckingMcpServer({ apiKey }) {
    const expected = String(apiKey || '');
    const server = http.createServer((req, res) => {
        if (req.method !== 'POST' || req.url !== '/mcp') {
            res.statusCode = 404;
            res.end('not found');
            return;
        }

        const got = String(req.headers['x-api-key'] || '');
        if (!expected || got !== expected) {
            res.statusCode = 401;
            res.setHeader('content-type', 'text/plain');
            res.end('unauthorized');
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

            if (rpc.method === 'tools/list') {
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id,
                    result: {
                        tools: [
                            {
                                name: 'secure_echo',
                                description: 'Echoes input text (requires X-API-Key).',
                                inputSchema: {
                                    type: 'object',
                                    properties: { text: { type: 'string' } },
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
                const text = String(args.text || '');

                if (name !== 'secure_echo') {
                    res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id,
                        error: { code: -32601, message: `Unknown tool: ${String(name)}` },
                    }));
                    return;
                }

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

describe('MCP_CONFIG_JSON (http headers)', () => {
    it('passes per-server headers and namespaces tool names', async () => {
        const mock = await startHeaderCheckingMcpServer({ apiKey: 'k123' });

        const prev = process.env.MCP_CONFIG_JSON;
        try {
            process.env.MCP_CONFIG_JSON = JSON.stringify({
                mcpServers: {
                    secure: {
                        transport: 'http',
                        url: mock.url,
                        headers: { 'X-API-Key': 'k123' },
                    },
                },
            });

            const { tools } = await createAgentAsync({
                skillsDir: path.join(__dirname, '../skills'),
                preferEsmTools: true,
            });

            const tool = tools.find((t) => t && t.name === 'secure__secure_echo');
            expect(tool).toBeTruthy();
            expect(tool._skillSource).toBe(`remote:${mock.url}`);

            const result = await tool.func({ text: 'hello' });
            expect(result.content).toEqual([{ type: 'text', text: 'hello' }]);
            expect(result.structuredContent).toEqual({ echo: 'hello' });
        } finally {
            if (prev === undefined) delete process.env.MCP_CONFIG_JSON;
            else process.env.MCP_CONFIG_JSON = prev;
            await mock.close();
        }
    }, 20000);
});
