const { Agent } = require('../agents');

describe('tool_result for failures', () => {
    it('emits tool_result for tool_not_found', async () => {
        const llm = {
            calls: 0,
            async chat() {
                this.calls += 1;
                if (this.calls === 1) {
                    return {
                        content: null,
                        tool_calls: [
                            { id: 'call_1', name: 'missing_tool', arguments: '{}' },
                        ],
                    };
                }
                return { content: 'done', tool_calls: [] };
            },
        };

        const agent = new Agent({ llm, tools: [], maxTurns: 3 });
        const events = [];
        agent.on('tool_call_begin', (d) => events.push({ type: 'begin', d }));
        agent.on('tool_result', (d) => events.push({ type: 'result', d }));
        agent.on('tool_call_end', (d) => events.push({ type: 'end', d }));

        const response = await agent.run('trigger');
        expect(response).toBe('done');

        const begin = events.find((e) => e.type === 'begin' && e.d && e.d.name === 'missing_tool');
        const result = events.find((e) => e.type === 'result' && e.d && e.d.tool === 'missing_tool');
        const end = events.find((e) => e.type === 'end' && e.d && e.d.name === 'missing_tool');

        expect(begin).toBeTruthy();
        expect(result).toBeTruthy();
        expect(end).toBeTruthy();
        expect(result.d.result.error).toBe('Tool not found');
        expect(end.d.success).toBe(false);
    });
});
