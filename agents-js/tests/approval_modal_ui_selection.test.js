describe('Browser approval modal UX (batch selection)', () => {
    it('updates selected count and disables Approve when none selected', async () => {
        vi.useFakeTimers();

        const handlers = { click: [], change: [] };
        const selectionEl = { textContent: '' };
        const timerEl = { textContent: '' };

        const makeCheckbox = (callId, checked) => ({
            checked: Boolean(checked),
            dataset: { callid: callId },
            getAttribute: (name) => (name === 'data-callid' ? callId : null),
        });

        const checkboxes = [
            makeCheckbox('c1', true),
            makeCheckbox('c2', true),
            makeCheckbox('c3', true),
        ];

        const confirmMessage = {
            innerHTML: '',
            addEventListener: (type, fn) => {
                if (!handlers[type]) handlers[type] = [];
                handlers[type].push(fn);
            },
            removeEventListener: (type, fn) => {
                if (!handlers[type]) return;
                handlers[type] = handlers[type].filter((h) => h !== fn);
            },
            querySelectorAll: (sel) => {
                if (sel === 'input[data-callid]') return checkboxes;
                if (sel === 'input[data-callid]:checked') return checkboxes.filter((c) => c.checked);
                return [];
            },
            querySelector: (sel) => {
                if (sel === '[data-approval-selection]') return selectionEl;
                if (sel === '[data-approval-timer]') return timerEl;
                return null;
            },
        };

        const confirmOk = { disabled: false, setAttribute: vi.fn(), title: '' };
        const confirmModal = { classList: { contains: vi.fn(() => true) } };

        let resolveConfirm;
        vi.doMock('../browser/ui-dom.js', () => ({
            elements: { confirmMessage, confirmOk, confirmModal },
            setStatus: vi.fn(),
            showConfirm: vi.fn(({ message }) => {
                confirmMessage.innerHTML = String(message || '');
                return new Promise((resolve) => { resolveConfirm = resolve; });
            }),
            hideConfirm: vi.fn(),
            escapeHtml: (s) => String(s),
        }));

        const { handleApprovalConfirm } = await import('../browser/ui-approval.js');

        const agent = { approvalTimeoutMs: 5000, respondToUserInput: vi.fn() };
        const p = handleApprovalConfirm({
            callId: 'approval:batch:test',
            firstQuestion: { question: 'Approve selected tool calls (3)?' },
            meta: {
                tool: '(batch)',
                risk: 2,
                batch: true,
                tools: [
                    { id: 'c1', name: 'a', risk: 2, args: { x: 1 } },
                    { id: 'c2', name: 'b', risk: 2, args: { y: 2 } },
                    { id: 'c3', name: 'c', risk: 2, args: { z: 3 } },
                ],
            },
            agent,
        });

        await Promise.resolve();

        expect(selectionEl.textContent).toBe('Selected 3/3');
        expect(confirmOk.disabled).toBe(false);

        const click = (approvalAction) => {
            const target = { dataset: { approvalAction } };
            for (const fn of handlers.click) fn({ target, preventDefault() {}, stopPropagation() {} });
        };

        click('select_none');
        expect(selectionEl.textContent).toBe('Selected 0/3');
        expect(confirmOk.disabled).toBe(true);

        // Re-select only one checkbox and emit a change event.
        checkboxes[1].checked = true;
        for (const fn of handlers.change) fn({ target: checkboxes[1] });

        expect(selectionEl.textContent).toBe('Selected 1/3');
        expect(confirmOk.disabled).toBe(false);

        resolveConfirm(true);
        await p;

        expect(agent.respondToUserInput).toHaveBeenCalledWith('approval:batch:test', { approvedCallIds: ['c2'] });

        vi.useRealTimers();
    });
});

