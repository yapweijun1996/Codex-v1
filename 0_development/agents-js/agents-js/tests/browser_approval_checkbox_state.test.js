describe('Browser approval batch modal checkbox state', () => {
    it('does not re-render modal content during countdown (keeps user checkbox choices)', async () => {
        vi.useFakeTimers();

        const innerHtmlWrites = [];
        const timerEl = { textContent: '', classList: { toggle: vi.fn() } };
        const confirmMessage = {
            _html: '',
            set innerHTML(v) {
                this._html = v;
                innerHtmlWrites.push(v);
            },
            get innerHTML() {
                return this._html;
            },
            querySelector(sel) {
                if (sel === '[data-approval-timer]') return timerEl;
                return null;
            },
            querySelectorAll() {
                return [];
            },
        };

        let resolveConfirm;
        const showConfirm = vi.fn(({ message }) => {
            // Simulate UI writing the message once when opening the modal.
            confirmMessage.innerHTML = message;
            return new Promise((resolve) => {
                resolveConfirm = resolve;
            });
        });

        vi.doMock('../browser/ui-dom.js', () => ({
            elements: {
                confirmModal: { classList: { contains: vi.fn(() => true) } },
                confirmMessage,
            },
            setStatus: vi.fn(),
            showConfirm,
            hideConfirm: vi.fn(),
            escapeHtml: (s) => String(s),
        }));

        const { handleApprovalConfirm } = await import('../browser/ui-approval.js');

        const agent = {
            debug: false,
            approvalTimeoutMs: 10_000,
            respondToUserInput: vi.fn(),
        };

        const p = handleApprovalConfirm({
            callId: 'approval:batch:test',
            firstQuestion: { question: 'Approve selected tool calls (2)?' },
            meta: {
                tool: '(batch)',
                risk: 2,
                batch: true,
                tools: [
                    { id: 'call_a', name: 'tool_a', risk: 2, args: { a: 1 } },
                    { id: 'call_b', name: 'tool_b', risk: 2, args: { b: 2 } },
                ],
            },
            agent,
        });

        await vi.advanceTimersByTimeAsync(2500);
        resolveConfirm(true);
        await p;

        expect(innerHtmlWrites.length).toBe(1);

        vi.useRealTimers();
    });
});
