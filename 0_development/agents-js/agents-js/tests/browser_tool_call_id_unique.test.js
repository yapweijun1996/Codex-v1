describe('Browser tool_call id generation', () => {
    it('generates unique tool_call ids even when Date.now is the same', async () => {
        const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1234567890);

        const model = {
            generateContent: async () => ({
                response: {
                    functionCalls: [{ name: 'tool_a', args: { x: 1 } }],
                    text: '',
                },
            }),
        };

        const { createBrowserGeminiLlm } = await import('../browser/bootstrap.mjs');
        const llm = createBrowserGeminiLlm(model, { enableStreaming: false, tools: [] });

        const r1 = await llm.chat('', []);
        const r2 = await llm.chat('', []);

        expect(r1.tool_calls[0].id).not.toBe(r2.tool_calls[0].id);

        nowSpy.mockRestore();
    });
});

