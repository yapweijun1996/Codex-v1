// Vitest globals enabled
const { Agent } = require('../agents');

describe('Agent context events', () => {
    it('emits context_truncated when history is pruned before LLM call', async () => {
        const llm = {
            chat: async () => ({ content: 'ok', tool_calls: [] }),
        };

        const agent = new Agent({ llm, tools: [], compaction: { enabled: false } });
        // Pre-fill history to exceed default maxMessages (16)
        for (let i = 0; i < 50; i++) {
            agent.history.push({ role: 'user', content: `m${i}` });
        }

        const events = [];
        agent.on('context_truncated', (e) => events.push(e));

        await agent.run('trigger');

        expect(events.length).toBeGreaterThanOrEqual(1);
        const last = events[events.length - 1];
        expect(last.dropped).toBeGreaterThan(0);
        expect(last.fullHistoryLength).toBeGreaterThan(last.sentHistoryLength);
        expect(last.sentHistoryLength).toBeLessThanOrEqual(16);
    });
});
