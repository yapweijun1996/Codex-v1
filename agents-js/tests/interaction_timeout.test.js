const {
    awaitUserInput,
    respondToUserInput,
    submitPendingInput,
    drainPendingInputs,
} = require('../utils/agent-interaction');

function createAgent() {
    return {
        _pendingUserInputs: new Map(),
        _pendingInputs: [],
        emit: () => {},
    };
}

describe('agent-interaction edge cases', () => {
    it('supersedes prior pending input request', async () => {
        const agent = createAgent();
        const first = awaitUserInput(agent, 'call_1', 100);
        const second = awaitUserInput(agent, 'call_1', 100);

        const ok = respondToUserInput(agent, 'call_1', 'A');
        expect(ok).toBe(true);

        const firstResult = await first;
        const secondResult = await second;
        expect(firstResult).toHaveProperty('timedOut', true);
        expect(secondResult).toHaveProperty('timedOut', false);
        expect(secondResult).toHaveProperty('value', 'A');
    });

    it('requires explicit callId when multiple pending', async () => {
        const agent = createAgent();
        const first = awaitUserInput(agent, 'call_a', 100);
        const second = awaitUserInput(agent, 'call_b', 100);

        const ok = respondToUserInput(agent, undefined, 'B');
        expect(ok).toBe(false);

        respondToUserInput(agent, 'call_a', 'A');
        respondToUserInput(agent, 'call_b', 'B');

        const firstResult = await first;
        const secondResult = await second;
        expect(firstResult).toHaveProperty('value', 'A');
        expect(secondResult).toHaveProperty('value', 'B');
    });

    it('queues and drains pending inputs', () => {
        const agent = createAgent();
        expect(submitPendingInput(agent, '  hello  ')).toBe(true);
        expect(submitPendingInput(agent, '')).toBe(false);
        const items = drainPendingInputs(agent);
        expect(items).toEqual(['hello']);
        expect(drainPendingInputs(agent)).toEqual([]);
    });
});
