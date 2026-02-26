const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

describe('Pending input injection', () => {
    it('applies queued user input between reasoning steps', async () => {
        let callCount = 0;
        const seenHistories = [];
        const llm = {
            async chat(systemPrompt, history) {
                callCount += 1;
                seenHistories.push(history);
                if (callCount === 1) {
                    return {
                        content: null,
                        tool_calls: [{ id: 't1', name: 'noop', arguments: '{}' }],
                    };
                }
                return { content: 'done' };
            },
        };

        let injected = false;
        let agent;
        const tools = [
            {
                name: 'noop',
                description: 'No-op tool',
                risk: RiskLevel.NONE,
                parameters: { type: 'object', properties: {} },
                func: async () => {
                    if (!injected) {
                        injected = true;
                        agent.submitInput('pending message');
                    }
                    return { ok: true };
                },
            },
        ];

        agent = new Agent({ llm, tools });
        const result = await agent.run('start');

        expect(result).toBe('done');
        expect(seenHistories).toHaveLength(2);
        const secondHistory = seenHistories[1];
        const hasPending = secondHistory.some(
            (msg) => msg && msg.role === 'user' && msg.content === 'pending message'
        );
        expect(hasPending).toBe(true);
    });
});
