describe('UI Thought Timeline - out-of-order step numbering with multi tool.call', () => {
    it('uses the latest step number when tool.call arrives after assistant_message_started', async () => {
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
        logger.setUserMessage('trigger');

        // Step marker arrives before the tool.call event (common in streaming/incremental UIs).
        logger.onEvent({ type: 'assistant_message_started', step: 3 });

        const details = [
            { name: 'searxng_query', intent: 'Search', arguments: { query: 'car prices singapore' } },
            { name: 'read_url', intent: 'Read url', arguments: { url: 'https://example.com' } },
            { name: 'tool_2', intent: 'Intent 2', arguments: { x: 2 } },
        ];
        logger.onEvent({ type: 'tool.call', details });

        vi.runAllTimers();

        const thoughtLogs = findFirstByClass(messagesArea, 'thought-logs');
        expect(thoughtLogs).toBeTruthy();

        // We expect one step log line + one group entry.
        expect(thoughtLogs.childNodes.length).toBe(2);

        const group = thoughtLogs.childNodes[1];
        const summaryText = findFirstByClass(group, 'thought-log-text');
        expect(summaryText).toBeTruthy();
        expect(String(summaryText.textContent)).toContain('Step 3: Action');
        expect(String(summaryText.textContent)).toContain('3 tools');

        const body = findFirstByClass(group, 'thought-log-group-body');
        expect(body).toBeTruthy();
        expect(body.childNodes.length).toBe(3);

        restore();
        vi.useRealTimers();
    });
});
