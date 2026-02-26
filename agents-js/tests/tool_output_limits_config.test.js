const { Agent } = require('../agents');

describe('toolOutputLimits config', () => {
    it('applies AGENTS_CONFIG agent.toolOutputLimits to tool_result payloads', async () => {
        const prev = globalThis.AGENTS_CONFIG;
        globalThis.AGENTS_CONFIG = {
            agent: {
                toolOutputLimits: {
                    maxStringChars: 80,
                    headChars: 40,
                    tailChars: 20,
                    maxArrayItems: 10,
                    maxObjectKeys: 10,
                    maxDepth: 3,
                },
            },
        };

        try {
            const llm = {
                calls: 0,
                async chat() {
                    this.calls += 1;
                    if (this.calls === 1) {
                        return {
                            content: null,
                            tool_calls: [
                                { id: 'call_1', name: 'big_tool', arguments: '{}' },
                            ],
                        };
                    }
                    return { content: 'done', tool_calls: [] };
                },
            };

            const tools = [
                {
                    name: 'big_tool',
                    description: 'returns a very large string',
                    parameters: { type: 'object', properties: {} },
                    func: async () => 'x'.repeat(5000),
                    risk: 0,
                },
            ];

            const agent = new Agent({ llm, tools, maxTurns: 3 });
            let seen;
            agent.on('tool_result', (data) => {
                if (data && data.tool === 'big_tool') seen = data.result;
            });

            const response = await agent.run('trigger');
            expect(response).toBe('done');
            expect(seen).toBeTruthy();
            expect(typeof seen).toBe('object');
            expect(seen._agentsjs_tool_output_guard).toBeTruthy();
            expect(seen._agentsjs_tool_output_guard.kind).toBe('string');
            expect(seen._agentsjs_tool_output_guard.truncated).toBe(true);
            expect(typeof seen.preview).toBe('string');
        } finally {
            globalThis.AGENTS_CONFIG = prev;
        }
    });
});
