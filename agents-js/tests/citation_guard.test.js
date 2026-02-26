const { applyTurnGuards } = require('../utils/agent-guards');

describe('citation guard', () => {
    it('forces retry when knowledge was selected but final answer has no citation', () => {
        const emitted = [];
        const agent = {
            history: [],
            currentPlan: null,
            _approvalDeniedThisTurn: false,
            _knowledgeSelectedIdSet: new Set(['doc-1']),
            _citationGuardCount: 0,
            emit: (name, payload) => emitted.push({ name, payload }),
        };

        const out = applyTurnGuards({
            agent,
            userInput: 'how to make quotation',
            turnStartIndex: 0,
            currentStepResponse: { content: 'Here are the steps...' },
            realtimeGuardCount: 0,
            planGuardCount: 0,
        });

        expect(out.shouldContinue).toBe(true);
        expect(agent._citationGuardCount).toBe(1);
        expect(agent.history).toHaveLength(1);
        expect(String(agent.history[0].content || '')).toContain('Citation required');
        expect(emitted.some((ev) => ev.name === 'citation_guard')).toBe(true);
    });

    it('passes when cited source id matches selected knowledge', () => {
        const agent = {
            history: [],
            currentPlan: null,
            _approvalDeniedThisTurn: false,
            _knowledgeSelectedIdSet: new Set(['doc-1']),
            _citationGuardCount: 0,
            emit: () => {},
        };

        const out = applyTurnGuards({
            agent,
            userInput: 'how to make quotation',
            turnStartIndex: 0,
            currentStepResponse: { content: 'Please follow this. [source:#doc-1 p.6]' },
            realtimeGuardCount: 0,
            planGuardCount: 0,
        });

        expect(out.shouldContinue).toBe(false);
        expect(agent._citationGuardCount).toBe(0);
        expect(agent.history).toHaveLength(0);
    });
});
