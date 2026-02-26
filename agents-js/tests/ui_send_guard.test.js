describe('ui-send handler', () => {
    it('prevents double send before isLoading flips (inFlight guard)', async () => {
        const { createSendHandler } = await import('../browser/ui-send.js');

        const messageInput = {
            value: 'hello',
            style: { height: '100px' },
            focus: vi.fn(),
        };
        const sendButton = { disabled: false };

        let resolveRun;
        const runAgent = vi.fn(() => new Promise((resolve) => { resolveRun = resolve; }));
        const isLoading = vi.fn(() => false);

        const handleSend = createSendHandler({
            elements: { messageInput, sendButton },
            isLoading,
            runAgent,
        });

        handleSend();
        handleSend();

        // runAgent is called in a microtask
        await Promise.resolve();

        expect(runAgent).toHaveBeenCalledTimes(1);
        expect(sendButton.disabled).toBe(true);
        expect(messageInput.value).toBe('');

        resolveRun();
        // allow .finally() to run and clear inFlight (macrotask flush)
        await new Promise((r) => setTimeout(r, 0));

        messageInput.value = 'again';
        handleSend();
        await Promise.resolve();
        expect(runAgent).toHaveBeenCalledTimes(2);
    });
});
