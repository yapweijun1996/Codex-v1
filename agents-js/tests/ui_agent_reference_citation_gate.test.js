function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
        setItem: (key, value) => {
            store.set(String(key), String(value));
        },
        removeItem: (key) => {
            store.delete(String(key));
        },
        clear: () => store.clear(),
    };
}

function makeAsyncIterator(events) {
    return (async function* iterate() {
        for (const ev of events) yield ev;
    })();
}

async function runUiAgentScenario({ finalResponse }) {
    vi.resetModules();

    const appendKnowledgeReferencesToLatestAssistantMessage = vi.fn();
    const addMessage = vi.fn();
    const addMessageBatch = vi.fn(async () => {});
    const fakeAgent = {
        history: [],
        runAsyncIterator: () => makeAsyncIterator([
            {
                type: 'knowledge.selected',
                tool: 'kb_search',
                selectedIds: ['doc-1'],
                selected: [{ id: 'doc-1', title: 'Doc 1' }],
                timestamp: new Date().toISOString(),
            },
            { type: 'turn.completed', finalResponse },
        ]),
    };

    vi.doMock('https://esm.run/@google/genai', () => ({ GoogleGenAI: class FakeGoogleGenAI {} }));
    vi.doMock('../browser/bootstrap.mjs', () => ({
        createBrowserToolset: () => ({
            ensureToolsReady: async () => ({ tools: [] }),
            fetchManifest: async () => [{ knowledgeFiles: ['/skills/k.jsonl'] }],
        }),
        createBrowserAgent: async () => ({ agent: fakeAgent }),
        DEFAULT_BROWSER_SYSTEM_INSTRUCTION: 'system',
        getExternalMcpConfigFromGlobal: () => null,
    }));
    vi.doMock('../browser/ui-dom.js', () => ({
        elements: {
            modelSelect: { value: 'gemini-2.5-flash' },
            messageInput: { disabled: true },
            sendButton: { disabled: true },
        },
        setStatus: vi.fn(),
        addMessage,
        appendKnowledgeReferencesToLatestAssistantMessage,
        createStreamingAssistantMessage: vi.fn(),
        addLoadingIndicator: () => ({ parentNode: true, textContent: '' }),
        removeLoadingIndicator: vi.fn(),
        addDecisionTrace: vi.fn(),
        addAuditTrace: vi.fn(),
        escapeHtml: (s) => String(s),
        showConfirm: vi.fn(),
    }));
    vi.doMock('../browser/ui-panel.js', () => ({
        openSkillDetail: vi.fn(),
        openMcpToolDetail: vi.fn(),
    }));
    vi.doMock('../browser/ui-usage.js', () => ({ setTokenUsage: vi.fn() }));
    vi.doMock('../browser/ui-approval.js', () => ({ handleApprovalConfirm: vi.fn(async () => ({ handled: false })) }));
    vi.doMock('../browser/ui-plan.js', () => ({ renderPlanUpdate: vi.fn() }));
    vi.doMock('../browser/ui-title.js', () => ({ maybeGenerateTitle: vi.fn() }));
    vi.doMock('../browser/ui-audit.js', () => ({ createUiAuditLogger: () => ({ onEvent: vi.fn() }) }));
    vi.doMock('../browser/ui-toolcalls.js', () => ({
        recordToolCallsRequested: vi.fn(),
        markToolCallBegin: vi.fn(),
        markToolCallEnd: vi.fn(),
    }));
    vi.doMock('../browser/ui-stream-guards.js', () => ({
        shouldSuppressAssistantChunk: () => ({ suppress: false, suppressAssistantText: false }),
    }));
    vi.doMock('../browser/ui-turn-status.js', () => ({ getUiStatusUpdateFromEvent: () => null }));
    vi.doMock('../browser/ui-skills.js', () => ({ loadSkillsUI: vi.fn() }));
    vi.doMock('../browser/ui-deferred-assistant-stream.js', () => ({
        createDeferredAssistantStream: () => ({
            onToolCall: vi.fn(),
            onChunk: vi.fn(),
            finalizeOrRenderFinal: ({ addMessage: add, finalResponse: response }) => {
                add('assistant', response);
            },
        }),
    }));
    vi.doMock('../browser/ui-thought-logger.js', () => ({
        createUiThoughtLogger: () => ({
            setUserMessage: vi.fn(),
            onEvent: vi.fn(),
        }),
    }));
    vi.doMock('../browser/ui-session.js', () => ({
        ensureActiveSession: vi.fn(async () => 'session-1'),
        addMessageBatch,
        updateSessionTitleIfNeeded: vi.fn(async () => {}),
        updateSessionTitle: vi.fn(async () => {}),
        syncSessions: vi.fn(async () => {}),
    }));

    globalThis.localStorage = createLocalStorageMock();
    globalThis.fetch = vi.fn(async () => ({
        ok: true,
        text: async () => [
            JSON.stringify({
                id: 'doc-1',
                title: 'Knowledge Doc 1',
                images: [{ mime_type: 'image/png', data_base64: 'QUJD', source_page_index: 6 }],
            }),
            '',
        ].join('\n'),
    }));

    const { handleApiKey, runAgent } = await import('../browser/ui-agent.js');
    await handleApiKey('test-key');
    await runAgent('how to make quotation');

    return {
        appendKnowledgeReferencesToLatestAssistantMessage,
        addMessage,
        addMessageBatch,
    };
}

describe('ui-agent references citation gate', () => {
    it('does not show references when final answer has no citation', async () => {
        const result = await runUiAgentScenario({
            finalResponse: 'Steps are listed below without source marker.',
        });
        expect(result.appendKnowledgeReferencesToLatestAssistantMessage).not.toHaveBeenCalled();
    });

    it('shows references when final answer cites selected knowledge id', async () => {
        const result = await runUiAgentScenario({
            finalResponse: 'Follow these steps [source:#doc-1 p.6].',
        });
        expect(result.appendKnowledgeReferencesToLatestAssistantMessage).toHaveBeenCalledTimes(1);
        const firstArg = result.appendKnowledgeReferencesToLatestAssistantMessage.mock.calls[0][0];
        expect(Array.isArray(firstArg)).toBe(true);
        expect(firstArg[0]).toMatchObject({
            hitId: 'doc-1',
            title: 'Knowledge Doc 1',
            sourcePage: 6,
        });
    });

    it('does not show references when citation id is not in selected knowledge', async () => {
        const result = await runUiAgentScenario({
            finalResponse: 'Reference exists but not selected [source:#doc-999 p.6].',
        });
        expect(result.appendKnowledgeReferencesToLatestAssistantMessage).not.toHaveBeenCalled();
    });
});
