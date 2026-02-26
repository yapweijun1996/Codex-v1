// Vitest globals are enabled in vitest.config.js
const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

describe('Self-Healing (rate limit)', () => {
    it('classifies 429-like tool output as rate_limited and injects targeted advice after repeats', async () => {
        const tools = [
            {
                name: 'rate_limit_tool',
                description: 'Simulates API 429',
                risk: RiskLevel.NONE,
                parameters: { type: 'object', properties: {}, required: [] },
                func: async () => ({ error: 'Too Many Requests', status: 429 }),
            },
        ];

        const llm = {
            calls: 0,
            histories: [],
            async chat(_systemPrompt, history) {
                this.calls++;
                this.histories.push(history);

                if (this.calls <= 2) {
                    return {
                        content: null,
                        tool_calls: [
                            { id: `call_${this.calls}`, name: 'rate_limit_tool', arguments: '{}' },
                        ],
                    };
                }

                return { content: 'done', tool_calls: [] };
            },
        };

        const agent = new Agent({ llm, tools });
        const out = await agent.run('trigger');
        expect(out).toBe('done');

        const thirdHistory = llm.histories[2];
        const toolMsgs = thirdHistory.filter((m) => m.role === 'system' && m.name === 'rate_limit_tool');
        const parsed = JSON.parse(toolMsgs[toolMsgs.length - 1].content);
        const payload = parsed && parsed.structuredContent ? parsed.structuredContent : parsed;
        expect(payload).toHaveProperty('_self_heal');
        expect(payload._self_heal).toHaveProperty('failureType', 'rate_limited');
        expect(payload._self_heal.advice).toMatch(/rate limit/i);
    });
});
