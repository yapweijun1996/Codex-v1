// Vitest globals are enabled in vitest.config.js
const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

describe('Tool timeout (best-effort)', () => {
    it('returns a structured Timeout error when a tool exceeds toolTimeoutMs', async () => {
        const tools = [
            {
                name: 'slow_tool',
                description: 'Sleeps longer than timeout',
                risk: RiskLevel.NONE,
                parameters: { type: 'object', properties: {}, required: [] },
                func: async () => {
                    await new Promise((r) => setTimeout(r, 25));
                    return { ok: true };
                },
            },
        ];

        const llm = {
            calls: 0,
            histories: [],
            async chat(_systemPrompt, history) {
                this.calls++;
                this.histories.push(history);

                if (this.calls === 1) {
                    return {
                        content: null,
                        tool_calls: [
                            { id: 'call_1', name: 'slow_tool', arguments: '{}' },
                        ],
                    };
                }

                return { content: 'done', tool_calls: [] };
            },
        };

        const agent = new Agent({ llm, tools, toolTimeoutMs: 5 });
        const out = await agent.run('trigger');
        expect(out).toBe('done');

        const secondHistory = llm.histories[1];
        const toolMsgs = secondHistory.filter((m) => m.role === 'system' && m.name === 'slow_tool');
        expect(toolMsgs.length).toBeGreaterThanOrEqual(1);
        const parsed = JSON.parse(toolMsgs[toolMsgs.length - 1].content);
        const payload = parsed && parsed.structuredContent ? parsed.structuredContent : parsed;
        expect(payload).toHaveProperty('error', 'Timeout');
        expect(payload).toHaveProperty('timeoutMs');
    });
});
