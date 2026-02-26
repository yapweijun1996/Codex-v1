describe('Browser Thought Timeline (incremental logs)', () => {
    it('appends structured thought logs without re-rendering existing lines', async () => {
        vi.useFakeTimers();

        const { installFakeDom } = require('./helpers/fake_dom');
        const { FakeElement, findFirstByClass, restore } = installFakeDom();

        vi.resetModules();
        vi.doMock('../browser/ui-dom-base.js', () => ({ scrollToBottom: vi.fn() }));

        const { createStreamingAssistantMessage } = await import('../browser/ui-dom-streaming-assistant.js');

        const messagesArea = new FakeElement('div');
        const assistant = createStreamingAssistantMessage({
            elements: { messagesArea },
            removeEmptyState: () => {},
            marked: { parse: (s) => String(s) },
            escapeHtml: (s) => String(s),
        });

        assistant.appendThought({ kind: 'action', text: 'Step 1: Action - demo' });
        vi.runAllTimers();

        const thoughtLogs = findFirstByClass(messagesArea, 'thought-logs');
        const thought = findFirstByClass(messagesArea, 'thought');
        expect(thoughtLogs).toBeTruthy();
        expect(thoughtLogs.childNodes.length).toBe(1);

        const firstLine = thoughtLogs.childNodes[0];
        const firstTag = findFirstByClass(firstLine, 'thought-log-tag');
        expect(firstTag.textContent).toBe('ACT');

        // Preserve collapse state and existing DOM nodes.
        thought.open = false;
        assistant.appendThought({ kind: 'result', text: 'Step 1: Result - demo' });
        vi.runAllTimers();

        expect(thought.open).toBe(false);
        expect(thoughtLogs.childNodes.length).toBe(2);
        expect(thoughtLogs.childNodes[0]).toBe(firstLine);

        restore();
        vi.useRealTimers();
    });

    it('does not perform full innerHTML re-render for logs while appending', async () => {
        vi.useFakeTimers();

        const { installFakeDom } = require('./helpers/fake_dom');
        const { FakeElement, findFirstByClass, restore } = installFakeDom();

        vi.resetModules();
        vi.doMock('../browser/ui-dom-base.js', () => ({ scrollToBottom: vi.fn() }));
        const { createStreamingAssistantMessage } = await import('../browser/ui-dom-streaming-assistant.js');

        const messagesArea = new FakeElement('div');
        const assistant = createStreamingAssistantMessage({
            elements: { messagesArea },
            removeEmptyState: () => {},
            marked: { parse: (s) => String(s) },
            escapeHtml: (s) => String(s),
        });

        for (let i = 0; i < 100; i += 1) {
            assistant.appendThought({ kind: 'info', text: `Line ${i}` });
        }
        vi.runAllTimers();

        const thoughtLogs = findFirstByClass(messagesArea, 'thought-logs');
        expect(thoughtLogs).toBeTruthy();
        expect(thoughtLogs.childNodes.length).toBe(100);
        // Incremental renderer should append nodes, not overwrite thoughtLogs via innerHTML.
        expect(thoughtLogs._innerSetCount).toBe(0);

        restore();
        vi.useRealTimers();
    });

    it('does not re-render draft/final when only logs change', async () => {
        vi.useFakeTimers();

        const { installFakeDom } = require('./helpers/fake_dom');
        const { FakeElement, findFirstByClass, restore } = installFakeDom();

        vi.resetModules();
        vi.doMock('../browser/ui-dom-base.js', () => ({ scrollToBottom: vi.fn() }));
        const { createStreamingAssistantMessage } = await import('../browser/ui-dom-streaming-assistant.js');

        const messagesArea = new FakeElement('div');
        const marked = { parse: vi.fn((s) => String(s)) };

        const assistant = createStreamingAssistantMessage({
            elements: { messagesArea },
            removeEmptyState: () => {},
            marked,
            escapeHtml: (s) => String(s),
        });

        // First flush creates DOM. Draft/final are empty.
        assistant.appendThought({ kind: 'turn', text: 'Turn started' });
        vi.runAllTimers();

        const thoughtDraft = findFirstByClass(messagesArea, 'thought-draft');
        const finalAnswer = findFirstByClass(messagesArea, 'final-answer');
        expect(thoughtDraft).toBeTruthy();
        expect(finalAnswer).toBeTruthy();

        const draftRendersBefore = thoughtDraft._innerSetCount;
        const finalRendersBefore = finalAnswer._innerSetCount;
        const markedCallsBefore = marked.parse.mock.calls.length;

        // Append more logs only. Draft/final should not re-render.
        for (let i = 0; i < 50; i += 1) {
            assistant.appendThought({ kind: 'action', text: `Action ${i}` });
        }
        vi.runAllTimers();

        expect(thoughtDraft._innerSetCount).toBe(draftRendersBefore);
        expect(finalAnswer._innerSetCount).toBe(finalRendersBefore);
        expect(marked.parse.mock.calls.length).toBe(markedCallsBefore);

        restore();
        vi.useRealTimers();
    });

    it('renders a collapsible group entry when log entry has children', async () => {
        vi.useFakeTimers();

        const { installFakeDom } = require('./helpers/fake_dom');
        const { FakeElement, findFirstByClass, restore } = installFakeDom();

        vi.resetModules();
        vi.doMock('../browser/ui-dom-base.js', () => ({ scrollToBottom: vi.fn() }));
        const { createStreamingAssistantMessage } = await import('../browser/ui-dom-streaming-assistant.js');

        const messagesArea = new FakeElement('div');
        const assistant = createStreamingAssistantMessage({
            elements: { messagesArea },
            removeEmptyState: () => {},
            marked: { parse: (s) => String(s) },
            escapeHtml: (s) => String(s),
        });

        assistant.appendThought({
            kind: 'approval',
            text: 'Step 1: Approval required - 2 tools',
            children: [
                { kind: 'approval', text: '- [Tier2] searxng_query {query:"x"}' },
                { kind: 'approval', text: '- [Tier2] read_url {url:"https://example.com"}' },
            ],
        });
        vi.runAllTimers();

        const thoughtLogs = findFirstByClass(messagesArea, 'thought-logs');
        expect(thoughtLogs).toBeTruthy();
        expect(thoughtLogs.childNodes.length).toBe(1);

        const group = thoughtLogs.childNodes[0];
        expect(String(group.tagName || '').toLowerCase()).toBe('details');
        expect(String(group.className)).toContain('thought-log-group');

        restore();
        vi.useRealTimers();
    });
});
