describe('UI Thought Timeline - state machine stress', () => {
    it('does not crash on out-of-order events (turn.completed before approval.required)', async () => {
        vi.useFakeTimers();

        const { installFakeDom } = require('./helpers/fake_dom');
        const { FakeElement, restore } = installFakeDom();

        vi.resetModules();
        vi.doMock('../browser/ui-dom-base.js', () => ({ scrollToBottom: vi.fn() }));

        const { createStreamingAssistantMessage } = await import('../browser/ui-dom-streaming-assistant.js');
        const { createUiThoughtLogger } = await import('../browser/ui-thought-logger.js');

        const messagesArea = new FakeElement('div');
        const assistantStream = createStreamingAssistantMessage({
            elements: { messagesArea },
            removeEmptyState: () => {},
            marked: { parse: (s) => String(s) },
            escapeHtml: (s) => String(s),
        });
        const logger = createUiThoughtLogger({ assistantStream });
        logger.setUserMessage('hello');

        expect(() => logger.onEvent({ type: 'turn.completed' })).not.toThrow();
        expect(() => logger.onEvent({
            type: 'approval.required',
            tool: 'searxng_query',
            risk: 2,
            args: { query: 'x' },
        })).not.toThrow();

        vi.runAllTimers();
        restore();
        vi.useRealTimers();
    });

    it('samples exec_command.output (only first per id+stream)', async () => {
        vi.useFakeTimers();

        const { installFakeDom } = require('./helpers/fake_dom');
        const { FakeElement, findFirstByClass, restore } = installFakeDom();

        vi.resetModules();
        vi.doMock('../browser/ui-dom-base.js', () => ({ scrollToBottom: vi.fn() }));

        const { createStreamingAssistantMessage } = await import('../browser/ui-dom-streaming-assistant.js');
        const { createUiThoughtLogger } = await import('../browser/ui-thought-logger.js');

        const messagesArea = new FakeElement('div');
        const assistantStream = createStreamingAssistantMessage({
            elements: { messagesArea },
            removeEmptyState: () => {},
            marked: { parse: (s) => String(s) },
            escapeHtml: (s) => String(s),
        });
        const logger = createUiThoughtLogger({ assistantStream });

        logger.onEvent({ type: 'exec_command.begin', id: 'c1', command: 'echo hi' });
        for (let i = 0; i < 10; i += 1) {
            logger.onEvent({ type: 'exec_command.output', id: 'c1', stream: 'stdout', chunk: `line ${i}` });
        }
        logger.onEvent({ type: 'exec_command.end', id: 'c1', exitCode: 0, durationMs: 5 });

        vi.runAllTimers();
        const logs = findFirstByClass(messagesArea, 'thought-logs');
        expect(logs).toBeTruthy();

        // Expect: begin + one stdout sample + end
        expect(logs.childNodes.length).toBe(3);

        restore();
        vi.useRealTimers();
    });
});
