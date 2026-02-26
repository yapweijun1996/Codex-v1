// Vitest globals are enabled in vitest.config.js
const { Agent } = require('../agents');

describe('Session isolation (Codex alignment)', () => {
    it('clears currentPlan at the start of each run()', async () => {
        const llm = {
            chat: vi.fn().mockResolvedValue({
                content: '<final_answer>ok</final_answer>',
                tool_calls: [],
            }),
        };
        const agent = new Agent({ llm, tools: [] });

        agent.currentPlan = [{ step: 'old task', status: 'pending' }];
        const response = await agent.run('hello');

        expect(response).toBe('ok');
        expect(agent.currentPlan).toBe(null);
    });
});
