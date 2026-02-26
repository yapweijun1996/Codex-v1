describe('ui-stream-guards', () => {
    it('suppresses synthetic tool plan chunks and keeps suppression sticky', async () => {
        const { shouldSuppressAssistantChunk } = await import('../browser/ui-stream-guards.js');

        const synthetic = [
            'Thought: I need to use tools to gather required information before answering.',
            'Plan:',
            '- Step 1',
            'Action: Calling tool(s) now.',
        ].join('\n');

        const first = shouldSuppressAssistantChunk({ delta: synthetic, suppressAssistantText: false });
        expect(first.suppress).toBe(true);
        expect(first.suppressAssistantText).toBe(true);

        const second = shouldSuppressAssistantChunk({ delta: 'Hello', suppressAssistantText: first.suppressAssistantText });
        expect(second.suppress).toBe(true);
        expect(second.suppressAssistantText).toBe(true);
    });

    it('does not suppress normal assistant text', async () => {
        const { shouldSuppressAssistantChunk } = await import('../browser/ui-stream-guards.js');
        const res = shouldSuppressAssistantChunk({ delta: 'Hi there', suppressAssistantText: false });
        expect(res.suppress).toBe(false);
        expect(res.suppressAssistantText).toBe(false);
    });
});

