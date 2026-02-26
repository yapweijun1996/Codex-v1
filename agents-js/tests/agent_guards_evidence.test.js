const { applyTurnGuards } = require('../utils/agent-guards');

describe('applyTurnGuards (evidence tool activity)', () => {
    it('treats update_plan as non-evidence for realtime guard', () => {
        const agent = {
            history: [
                { role: 'assistant', tool_calls: [{ id: '1', name: 'update_plan', arguments: '{}' }] },
            ],
            currentPlan: null,
            emit: () => {},
        };

        const res = applyTurnGuards({
            agent,
            userInput: 'what is the latest usd sgd rate today?',
            turnStartIndex: 0,
            currentStepResponse: { content: 'ok', tool_calls: [] },
            realtimeGuardCount: 0,
            planGuardCount: 0,
        });

        expect(res.shouldContinue).toBe(true);
        expect(res.realtimeGuardCount).toBe(1);
    });
});
