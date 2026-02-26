const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

function createAbortableAgent() {
    let callCount = 0;
    const llm = {
        async chat() {
            callCount += 1;
            if (callCount === 1) {
                return {
                    content: null,
                    tool_calls: [{ id: 'call_1', name: 'slow', arguments: '{}' }],
                };
            }
            return { content: 'done', tool_calls: [] };
        }
    };
    const tools = [{
        name: 'slow',
        description: 'Never resolves.',
        risk: RiskLevel.NONE,
        parameters: { type: 'object', properties: {} },
        func: async () => new Promise(() => {}),
    }];
    return new Agent({ llm, tools, maxTurns: 2, toolTimeoutMs: 10000 });
}

describe('Kill Switch', () => {
    it('aborts an in-flight tool call and ends the turn', async () => {
        const agent = createAbortableAgent();
        const start = Date.now();
        const runPromise = agent.run('trigger');

        setTimeout(() => agent.stop('test_abort'), 20);

        const result = await Promise.race([
            runPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 400)),
        ]);

        expect(String(result)).toContain('Aborted');
        const hasAbortMarker = agent.history.some((msg) => {
            return msg && typeof msg.content === 'string' && msg.content.startsWith('<turn_aborted>');
        });
        expect(hasAbortMarker).toBe(true);
        expect(Date.now() - start).toBeLessThan(400);
    });
});
