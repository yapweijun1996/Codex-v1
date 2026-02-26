const { Agent } = require('../agents');

describe('Token usage alignment', () => {
    it('records usage metadata and aggregates totals', async () => {
        const llm = {
            chat: async () => ({
                content: 'ok',
                tool_calls: [],
                usage: { input_tokens: 3, output_tokens: 2 },
            })
        };
        const agent = new Agent({ llm, tools: [] });
        let completion;
        let tokenCount;
        agent.on('agent_turn_complete', (data) => {
            completion = data;
        });
        agent.on('token_count', (data) => {
            tokenCount = data;
        });

        const response = await agent.run('hi');
        expect(response).toBe('ok');

        const last = agent.history[agent.history.length - 1];
        expect(last._tokenUsagePrompt).toBe(3);
        expect(last._tokenUsageCompletion).toBe(2);
        expect(last._tokenUsageTotal).toBeUndefined();

        expect(completion.tokenUsage.info.last_token_usage.total_tokens).toBe(5);
        expect(completion.tokenUsage.info.total_token_usage.total_tokens).toBe(5);
        expect(tokenCount.info.last_token_usage.total_tokens).toBe(5);
        expect(tokenCount.info.total_token_usage.total_tokens).toBe(5);
        expect(tokenCount.rate_limits).toBeNull();
    });
});
