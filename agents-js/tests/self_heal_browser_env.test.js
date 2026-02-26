// Vitest globals are enabled in vitest.config.js
const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

describe('Self-Healing (browser environment restriction)', () => {
    it('classifies browser fetch/CORS-like failures as environment_restriction and injects targeted advice after repeats', async () => {
        const prevWindow = global.window;
        global.window = {};

        try {
            const tools = [
                {
                    name: 'web_search',
                    description: 'Simulates a browser-only blocked fetch/CORS failure',
                    risk: RiskLevel.NONE,
                    parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
                    func: async () => ({ error: 'Failed to connect to search service: Failed to fetch' }),
                },
                {
                    name: 'mixed_content',
                    description: 'Simulates a blocked mixed content request',
                    risk: RiskLevel.NONE,
                    parameters: { type: 'object', properties: {}, required: [] },
                    func: async () => ({ error: 'Blocked mixed content: http://insecure.local/api' }),
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
                                { id: `call_${this.calls}`, name: 'web_search', arguments: '{"query":"s70 prices"}' },
                            ],
                        };
                    }

                    if (this.calls <= 4) {
                        return {
                            content: null,
                            tool_calls: [
                                { id: `call_${this.calls}`, name: 'mixed_content', arguments: '{}' },
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
            const toolMsgs = thirdHistory.filter((m) => m.role === 'system' && m.name === 'web_search');
            const parsed = JSON.parse(toolMsgs[toolMsgs.length - 1].content);
            const payload = parsed && parsed.structuredContent ? parsed.structuredContent : parsed;
            expect(payload).toHaveProperty('_self_heal');
            expect(payload._self_heal).toHaveProperty('failureType', 'environment_restriction');
            expect(payload._self_heal.advice).toMatch(/cors|browser|same-origin/i);

            let mixedPayload = null;
            for (const hist of llm.histories) {
                const msgs = hist.filter((m) => m.role === 'system' && m.name === 'mixed_content');
                for (const msg of msgs) {
                    const parsed = JSON.parse(msg.content);
                    const payload = parsed && parsed.structuredContent ? parsed.structuredContent : parsed;
                    if (payload && payload._self_heal) {
                        mixedPayload = payload;
                        break;
                    }
                }
                if (mixedPayload) break;
            }
            expect(mixedPayload).toHaveProperty('_self_heal');
            expect(mixedPayload._self_heal).toHaveProperty('failureType', 'environment_restriction');
            expect(mixedPayload._self_heal.advice).toMatch(/mixed content|https|secure/i);
        } finally {
            global.window = prevWindow;
        }
    });
});
