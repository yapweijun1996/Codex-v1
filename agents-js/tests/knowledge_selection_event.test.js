const { recordKnowledgeSelections } = require('../utils/agent-knowledge-selection');

describe('knowledge_selected event', () => {
    it('records selected knowledge and emits event payload', () => {
        const emitted = [];
        const agent = {
            ragConfig: { minScore: 0.2 },
            _knowledgeSelectedThisTurn: [],
            _knowledgeSelectedIdSet: new Set(),
            emit: (name, payload) => emitted.push({ name, payload }),
        };

        const count = recordKnowledgeSelections({
            agent,
            turnCount: 2,
            toolCalls: [
                {
                    id: 'kb_1',
                    name: 'kb_search',
                    arguments: JSON.stringify({ query: 'how to make quotation' }),
                },
            ],
            toolResults: [
                {
                    role: 'tool',
                    name: 'kb_search',
                    tool_call_id: 'kb_1',
                    content: JSON.stringify({
                        isError: false,
                        structuredContent: {
                            hits: [
                                { id: 'doc-1', title: 'Doc 1', score: 0.91 },
                                { id: 'doc-2', title: 'Doc 2', score: 0.55 },
                            ],
                        },
                    }),
                },
            ],
        });

        expect(count).toBe(1);
        expect(agent._knowledgeSelectedThisTurn).toHaveLength(1);
        expect(Array.from(agent._knowledgeSelectedIdSet)).toEqual(['doc-1', 'doc-2']);
        expect(emitted).toHaveLength(1);
        expect(emitted[0].name).toBe('knowledge_selected');
        expect(emitted[0].payload.tool).toBe('kb_search');
        expect(emitted[0].payload.selectedIds).toEqual(['doc-1', 'doc-2']);
    });

    it('ignores non-knowledge tool results', () => {
        const agent = {
            _knowledgeSelectedThisTurn: [],
            _knowledgeSelectedIdSet: new Set(),
            emit: () => {},
        };

        const count = recordKnowledgeSelections({
            agent,
            turnCount: 1,
            toolCalls: [{ id: 'x1', name: 'run_command', arguments: '{"command":"echo hello"}' }],
            toolResults: [{
                role: 'tool',
                name: 'run_command',
                tool_call_id: 'x1',
                content: '{"isError":false,"structuredContent":{"ok":true}}',
            }],
        });

        expect(count).toBe(0);
        expect(agent._knowledgeSelectedThisTurn).toEqual([]);
        expect(Array.from(agent._knowledgeSelectedIdSet)).toEqual([]);
    });
});
