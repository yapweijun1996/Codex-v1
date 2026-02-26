describe('UI Thought Timeline - multi tool.call group rendering', () => {
    it('renders a single group with correct children and tool-aware args summaries', async () => {
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

        const details = [
            {
                name: 'searxng_query',
                intent: 'Search',
                risk: 2,
                arguments: { query: 'iphone 15 price singapore' },
            },
            {
                name: 'read_url',
                intent: 'Read url',
                risk: 2,
                arguments: { url: 'https://example.com/a/b?c=d' },
            },
            ...Array.from({ length: 8 }, (_v, i) => ({
                name: `tool_${i}`,
                intent: `Intent ${i}`,
                risk: i === 7 ? 3 : 2,
                arguments: { x: i, ok: true },
            })),
        ];

        logger.onEvent({
            type: 'tool.call',
            details,
        });

        vi.runAllTimers();

        const thoughtLogs = findFirstByClass(messagesArea, 'thought-logs');
        expect(thoughtLogs).toBeTruthy();
        expect(thoughtLogs.childNodes.length).toBe(1);

        const group = thoughtLogs.childNodes[0];
        expect(String(group.tagName || '').toLowerCase()).toBe('details');
        expect(String(group.className)).toContain('thought-log-group');

        const summaryText = findFirstByClass(group, 'thought-log-text');
        expect(summaryText).toBeTruthy();
        expect(String(summaryText.textContent)).toContain(`Action - ${details.length} tools`);
        expect(String(summaryText.textContent)).toContain('max Tier3');
        expect(String(summaryText.textContent)).toContain('Tier2=9');
        expect(String(summaryText.textContent)).toContain('Tier3=1');

        const body = findFirstByClass(group, 'thought-log-group-body');
        expect(body).toBeTruthy();
        expect(body.childNodes.length).toBe(details.length);

        const child0Text = findFirstByClass(body.childNodes[0], 'thought-log-text');
        expect(child0Text).toBeTruthy();
        // tool-aware search summary should surface query.
        expect(String(child0Text.textContent)).toContain('query="iphone 15');

        const child1Text = findFirstByClass(body.childNodes[1], 'thought-log-text');
        expect(child1Text).toBeTruthy();
        // tool-aware url summary should surface url.
        expect(String(child1Text.textContent)).toContain('url="https://example.com');

        const firstNode = thoughtLogs.childNodes[0];
        logger.onEvent({ type: 'tool.result', tool: 'searxng_query', result: { ok: true } });
        vi.runAllTimers();
        expect(thoughtLogs.childNodes.length).toBe(2);
        expect(thoughtLogs.childNodes[0]).toBe(firstNode);
        expect(thoughtLogs._innerSetCount).toBe(0);

        restore();
        vi.useRealTimers();
    });
});
