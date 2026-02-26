// Vitest globals are enabled in vitest.config.js
const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

describe('Self-Healing (format error safety)', () => {
    it('does not crash when a tool returns a circular object (history remains JSON parseable)', async () => {
        const tools = [
            {
                name: 'circular_tool',
                description: 'Returns a circular object',
                risk: RiskLevel.NONE,
                parameters: { type: 'object', properties: {}, required: [] },
                func: async () => {
                    const obj = { a: 1 };
                    obj.self = obj;
                    return obj;
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
                            { id: 'call_1', name: 'circular_tool', arguments: '{}' },
                        ],
                    };
                }

                return { content: 'done', tool_calls: [] };
            },
        };

        const agent = new Agent({ llm, tools });
        const out = await agent.run('trigger');
        expect(out).toBe('done');

        const secondHistory = llm.histories[1];
        const toolMsgs = secondHistory.filter((m) => m.role === 'system' && m.name === 'circular_tool');
        expect(toolMsgs.length).toBe(1);
        const parsed = JSON.parse(toolMsgs[0].content);
        const payload = parsed && parsed.structuredContent ? parsed.structuredContent : parsed;
        expect(payload).toHaveProperty('a', 1);
        expect(payload).toHaveProperty('self');
    });
});
