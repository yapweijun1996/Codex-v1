const { Agent } = require('../agents');

describe('Agent snapshot persistence', () => {
    it('emits autosave with snapshot and can restore state', async () => {
        const llm = {
            chat: async () => ({ content: 'ok', tool_calls: [] }),
        };

        const agent = new Agent({ llm, tools: [] });
        let snapshot = null;

        agent.on('autosave', (data) => {
            snapshot = data;
        });

        const result = await agent.run('hello');
        expect(result).toBe('ok');
        expect(snapshot).toBeTruthy();
        expect(Array.isArray(snapshot.history)).toBe(true);
        expect(snapshot.history.length).toBeGreaterThan(0);

        const restored = new Agent({ llm, tools: [], snapshot });
        expect(restored.history.length).toBe(snapshot.history.length);
        expect(restored.systemPrompt).toBe(snapshot.systemPrompt);
    });
});
