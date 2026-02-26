const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

describe('Decision trace fallback', () => {
    it('emits decision_trace for tool-only steps (no assistant content)', async () => {
        let calls = 0;
        const llm = {
            chat: async () => {
                calls += 1;
                if (calls === 1) {
                    return {
                        content: '',
                        tool_calls: [
                            { id: 't1', name: 'noop', arguments: {} },
                        ],
                    };
                }
                return { content: 'ok', tool_calls: [] };
            }
        };

        const agent = new Agent({
            llm,
            tools: [
                {
                    name: 'noop',
                    description: 'No-op tool',
                    risk: RiskLevel.NONE,
                    parameters: { type: 'object', properties: {} },
                    func: async () => ({ ok: true }),
                }
            ],
        });

        const traces = [];
        agent.on('decision_trace', (t) => traces.push(t));

        const response = await agent.run('hi');
        expect(response).toBe('ok');
        expect(traces.length).toBe(1);
        expect(traces.some((t) => String(t.thought || '').includes('I need to use tools'))).toBe(true);
    });

    it('emits decision_trace when tool calls exist but content lacks Thought/Plan', async () => {
        let calls = 0;
        const llm = {
            chat: async () => {
                calls += 1;
                if (calls === 1) {
                    return {
                        content: 'Action: Calling tool(s) now.',
                        tool_calls: [
                            { id: 't1', name: 'noop', arguments: {} },
                        ],
                    };
                }
                return { content: 'ok', tool_calls: [] };
            }
        };

        const agent = new Agent({
            llm,
            tools: [
                {
                    name: 'noop',
                    description: 'No-op tool',
                    risk: RiskLevel.NONE,
                    parameters: { type: 'object', properties: {} },
                    func: async () => ({ ok: true }),
                }
            ],
        });

        const traces = [];
        agent.on('decision_trace', (t) => traces.push(t));

        const response = await agent.run('hi');
        expect(response).toBe('ok');
        expect(traces.some((t) => String(t.thought || '').includes('Calling tools:'))).toBe(true);
        expect(traces.some((t) => String(t.thought || '').includes('noop'))).toBe(true);
    });
});
