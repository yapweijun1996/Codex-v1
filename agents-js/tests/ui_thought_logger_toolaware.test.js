describe('ui-thought-logger tool-aware args summary', () => {
    it('summarizes search query args', async () => {
        const mod = await import('../browser/ui-thought-logger-helpers.js');
        const out = mod.summarizeToolArgsForLog({
            toolName: 'searxng_query',
            argsObj: { query: 'iphone 15 price singapore' },
        });
        expect(out).toContain('query="');
        expect(out).toContain('iphone 15');
    });

    it('summarizes url args', async () => {
        const mod = await import('../browser/ui-thought-logger-helpers.js');
        const out = mod.summarizeToolArgsForLog({
            toolName: 'read_url',
            argsObj: { url: 'https://example.com/a/b?c=d' },
        });
        expect(out).toContain('url="https://example.com');
    });
});
