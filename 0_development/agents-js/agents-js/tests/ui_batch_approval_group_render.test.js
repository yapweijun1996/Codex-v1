describe('UI Thought Timeline - batch approval group rendering', () => {
    it('renders a single collapsible group with correct children count and preserves old nodes', async () => {
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

        const tools = Array.from({ length: 10 }, (_v, i) => ({
            name: i === 0 ? 'searxng_query' : `tool_${i}`,
            risk: i === 9 ? 3 : 2,
            intent: i === 0 ? 'Search query' : `Intent ${i}`,
            args: i === 0 ? { query: 'iphone 15 price singapore' } : { x: i },
        }));

        logger.onEvent({
            type: 'approval.required',
            batch: true,
            risk: 3,
            tools,
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
        expect(String(summaryText.textContent)).toContain('Approval required - 10 tools');
        expect(String(summaryText.textContent)).toContain('max Tier3');
        expect(String(summaryText.textContent)).toContain('Tier2=9');
        expect(String(summaryText.textContent)).toContain('Tier3=1');

        const body = findFirstByClass(group, 'thought-log-group-body');
        expect(body).toBeTruthy();
        expect(body.childNodes.length).toBe(10);

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
