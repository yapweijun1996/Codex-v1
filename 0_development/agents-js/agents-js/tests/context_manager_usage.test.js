const { ContextManager, estimateTokens } = require('../utils/context-manager');

describe('ContextManager token usage baselines', () => {
    it('uses _tokenUsagePrompt as baseline when present', () => {
        const history = [
            { role: 'user', content: 'u0' },
            { role: 'assistant', content: 'a0', _tokenUsagePrompt: 100 },
            { role: 'user', content: 'u1' },
            { role: 'assistant', content: 'a1' },
        ];

        const expected = 100 + estimateTokens(history.slice(2));
        const actual = estimateTokens(history);

        expect(actual).toBe(expected);
    });

    it('falls back to heuristic when no baseline exists', () => {
        const history = [
            { role: 'user', content: 'hello' },
            { role: 'assistant', content: 'world' },
        ];

        const expected = estimateTokens([history[0]]) + estimateTokens([history[1]]);
        const actual = estimateTokens(history);

        expect(actual).toBe(expected);
    });

    it('does not use baselines that were trimmed away', () => {
        const history = [
            { role: 'system', content: 'sys' },
            { role: 'assistant', content: 'a0', _tokenUsagePrompt: 100 },
            { role: 'user', content: 'u1' },
            { role: 'assistant', content: 'a1' },
        ];

        const cm = new ContextManager({ maxMessages: 2, preserveHeadMessages: 0 });
        const processed = cm.process(history).history;

        const expectedWithBaseline = 100 + estimateTokens(history.slice(2));
        const actual = estimateTokens(processed);

        expect(actual).not.toBe(expectedWithBaseline);
    });
});
