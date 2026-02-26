const { handleToolCalls, maybeAutoMemoryLookup } = require('../utils/agent-tool-flow');

function createAgentStub(overrides = {}) {
    return {
        tools: {
            memory_search: { name: 'memory_search', func: async () => ({ hits: [] }) },
            kb_search: { name: 'kb_search', func: async () => ({ hits: [] }) },
            searxng_query: { name: 'searxng_query', func: async () => ({ ok: true }) },
        },
        ragConfig: { enabled: true, memoryFirst: true, topK: 5, minScore: 0.2 },
        history: [],
        _turnStartIndex: 0,
        _memoryFirstGuardCount: 0,
        emit: () => {},
        _executeTools: async () => [],
        ...overrides,
    };
}

describe('memory-first policy', () => {
    it('does not block web search when memoryFirst is disabled', async () => {
        let executed = false;
        const agent = createAgentStub({
            ragConfig: { enabled: true, memoryFirst: false, topK: 5, minScore: 0.2 },
            _executeTools: async () => {
                executed = true;
                return [{ role: 'tool', name: 'searxng_query', tool_call_id: 'w1', content: '{"isError":false}' }];
            },
        });
        const out = await handleToolCalls({
            agent,
            turnCount: 1,
            currentStepResponse: {
                content: null,
                tool_calls: [{ id: 'w1', name: 'searxng_query', arguments: '{"query":"tno systems hq"}' }],
            },
        });

        expect(out.handled).toBe(true);
        expect(executed).toBe(true);
        expect(agent._memoryFirstGuardCount).toBe(0);
    });

    it('blocks web search tool calls until memory lookup is attempted', async () => {
        let executed = false;
        const agent = createAgentStub({
            _executeTools: async () => {
                executed = true;
                return [];
            },
        });
        const out = await handleToolCalls({
            agent,
            turnCount: 1,
            currentStepResponse: {
                content: null,
                tool_calls: [{ id: 'w1', name: 'searxng_query', arguments: '{"query":"tno systems hq"}' }],
            },
        });

        expect(out.handled).toBe(true);
        expect(executed).toBe(false);
        expect(agent._memoryFirstGuardCount).toBe(1);
        expect(agent.history.some((msg) => String(msg && msg.content || '').includes('kb_search or memory_search first'))).toBe(true);
    });

    it('allows web search after memory tool activity exists in current turn', async () => {
        let executed = false;
        const agent = createAgentStub({
            history: [
                {
                    role: 'tool',
                    name: 'kb_search',
                    tool_call_id: 'auto_mem_kb_1',
                    content: '{"isError":false,"structuredContent":{"hits":[{"id":"k1"}]}}',
                },
            ],
            _executeTools: async () => {
                executed = true;
                return [{ role: 'tool', name: 'searxng_query', tool_call_id: 'w1', content: '{"isError":false}' }];
            },
        });

        const out = await handleToolCalls({
            agent,
            turnCount: 1,
            currentStepResponse: {
                content: null,
                tool_calls: [{ id: 'w1', name: 'searxng_query', arguments: '{"query":"tno systems hq"}' }],
            },
        });

        expect(out.handled).toBe(true);
        expect(executed).toBe(true);
    });

    it('auto memory lookup prefers kb_search before memory_search', async () => {
        const calls = [];
        const emitted = [];
        const agent = createAgentStub({
            emit: (name, payload) => emitted.push({ name, payload }),
            _executeTools: async (toolCalls) => {
                const call = toolCalls[0];
                calls.push(call.name);
                if (call.name === 'kb_search') {
                    return [{
                        role: 'tool',
                        name: 'kb_search',
                        tool_call_id: call.id,
                        content: '{"isError":false,"structuredContent":{"hits":[{"id":"fixed-1"}]}}',
                    }];
                }
                return [{
                    role: 'tool',
                    name: call.name,
                    tool_call_id: call.id,
                    content: '{"isError":false,"structuredContent":{"hits":[]}}',
                }];
            },
        });

        const done = await maybeAutoMemoryLookup({
            agent,
            userInput: 'where is TNO Systems Pte Ltd headquarters',
        });

        expect(done).toBe(true);
        expect(calls[0]).toBe('kb_search');
        expect(calls).not.toContain('memory_search');
        const selected = emitted.find((ev) => ev.name === 'knowledge_selected');
        expect(selected).toBeTruthy();
        expect(selected.payload.tool).toBe('kb_search');
        expect(selected.payload.selectedIds).toContain('fixed-1');
    });
});
