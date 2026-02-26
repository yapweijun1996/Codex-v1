// Vitest globals are enabled in vitest.config.js
const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

describe('Self-Healing (tool error recovery)', () => {
    it('injects a structured hint after the same tool fails twice', async () => {
        const tools = [
            {
                name: 'fail_tool',
                description: 'Always fails for testing',
                risk: RiskLevel.NONE,
                parameters: { type: 'object', properties: {}, required: [] },
                func: async () => ({ error: 'File not found', code: 'ENOENT' }),
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
                            {
                                id: `call_${this.calls}`,
                                name: 'fail_tool',
                                arguments: '{}',
                            },
                        ],
                    };
                }

                return { content: 'done', tool_calls: [] };
            },
        };

        const agent = new Agent({ llm, tools });
        const out = await agent.run('trigger');
        expect(out).toBe('done');

        // By the 3rd LLM call, the history should include the 2nd failure output
        // with a self-heal hint attached.
        const thirdHistory = llm.histories[2];
        const systemMsgs = thirdHistory.filter(m => m.role === 'system' && m.name === 'fail_tool');
        expect(systemMsgs.length).toBeGreaterThanOrEqual(2);

        const last = systemMsgs[systemMsgs.length - 1];
        const parsed = JSON.parse(last.content);
        const payload = parsed && parsed.structuredContent ? parsed.structuredContent : parsed;
        expect(payload).toHaveProperty('_self_heal');
        expect(payload._self_heal.repeatedFailures).toBeGreaterThanOrEqual(2);
        expect(payload._self_heal).toHaveProperty('failureType', 'node_io_error');
        expect(payload._self_heal.advice).toMatch(/failed repeatedly/i);
    });
});
