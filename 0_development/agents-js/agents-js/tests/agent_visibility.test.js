const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

describe('Agent state visibility', () => {
    it('emits state transitions and tool telemetry', async () => {
        let callCount = 0;
        const llm = {
            chat: async () => {
                callCount += 1;
                if (callCount === 1) {
                    return {
                        content: null,
                        tool_calls: [{ id: 'c1', name: 'noop', arguments: '{}' }],
                    };
                }
                return { content: 'done', tool_calls: [] };
            },
        };

        const agent = new Agent({
            llm,
            tools: [{ name: 'noop', risk: RiskLevel.NONE, func: async () => ({ ok: true }) }],
        });

        const states = [];
        const begins = [];
        const ends = [];

        agent.on('state_changed', (evt) => states.push(evt.status));
        agent.on('tool_call_begin', (evt) => begins.push(evt));
        agent.on('tool_call_end', (evt) => ends.push(evt));

        const result = await agent.run('hello');

        expect(result).toBe('done');
        expect(states[0]).toBe('thinking');

        const executingIndex = states.indexOf('executing');
        const idleIndex = states.lastIndexOf('idle');
        expect(executingIndex).toBeGreaterThanOrEqual(0);
        expect(idleIndex).toBeGreaterThan(executingIndex);

        expect(begins).toHaveLength(1);
        expect(ends).toHaveLength(1);
        expect(ends[0].id).toBe('c1');
        expect(typeof ends[0].durationMs).toBe('number');
        expect(ends[0].durationMs).toBeGreaterThanOrEqual(0);
    });
});
