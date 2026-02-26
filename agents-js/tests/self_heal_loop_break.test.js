// Vitest globals are enabled in vitest.config.js
const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

describe('Self-Healing (loop break / hard stop)', () => {
    it('escalates to hard_stop after the same failing fingerprint occurs 3 times', async () => {
        const tools = [
            {
                name: 'always_fail',
                description: 'Fails with same error for loop testing',
                risk: RiskLevel.NONE,
                parameters: { type: 'object', properties: { x: { type: 'number' } }, required: ['x'] },
                func: async () => ({ error: 'Bad input', code: 'EINVAL' }),
            },
        ];

        const llm = {
            calls: 0,
            histories: [],
            async chat(_systemPrompt, history) {
                this.calls++;
                this.histories.push(history);

                if (this.calls <= 3) {
                    return {
                        content: null,
                        tool_calls: [
                            { id: `call_${this.calls}`, name: 'always_fail', arguments: '{"x":1}' },
                        ],
                    };
                }

                return { content: 'done', tool_calls: [] };
            },
        };

        const agent = new Agent({ llm, tools });
        const out = await agent.run('trigger');
        expect(out).toBe('done');

        // The 4th LLM call sees the 3rd tool result in history.
        const fourthHistory = llm.histories[3];
        const systemMsgs = fourthHistory.filter((m) => m.role === 'system' && m.name === 'always_fail');
        expect(systemMsgs.length).toBeGreaterThanOrEqual(3);

        const last = systemMsgs[systemMsgs.length - 1];
        const parsed = JSON.parse(last.content);
        const payload = parsed && parsed.structuredContent ? parsed.structuredContent : parsed;
        expect(payload).toHaveProperty('_self_heal');
        expect(payload._self_heal).toHaveProperty('repeatedFailures');
        expect(payload._self_heal.repeatedFailures).toBeGreaterThanOrEqual(3);
        expect(payload._self_heal).toHaveProperty('intervention', 'hard_stop');
        expect(payload._self_heal.advice).toMatch(/STOP:/);
    });
});
