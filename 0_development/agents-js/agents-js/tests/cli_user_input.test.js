const { EventEmitter } = require('events');
const { registerUserInputHandler } = require('../utils/cli-user-input');

function createAgentStub() {
    const agent = new EventEmitter();
    agent.respondToUserInput = vi.fn();
    return agent;
}

describe('cli-user-input', () => {
    it('processes queued user_input_requested events sequentially', async () => {
        const agent = createAgentStub();
        let inFlight = 0;
        let maxInFlight = 0;
        let count = 0;
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const promptText = vi.fn(async () => {
            count += 1;
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await delay(10);
            inFlight -= 1;
            return { cancelled: false, value: `v${count}` };
        });

        const { waitForInputQueue } = registerUserInputHandler({
            agent,
            withPrompt: async (factory) => factory(),
            promptText,
            promptSelect: vi.fn(),
            promptMultiSelect: vi.fn(),
        });

        agent.emit('user_input_requested', {
            callId: 'c1',
            questions: [{ question: 'q1' }],
        });
        agent.emit('user_input_requested', {
            callId: 'c2',
            questions: [{ question: 'q2' }],
        });

        await waitForInputQueue();

        expect(maxInFlight).toBe(1);
        expect(agent.respondToUserInput.mock.calls).toEqual([
            ['c1', 'v1'],
            ['c2', 'v2'],
        ]);
    });

    it('maps multi_select cancel to Deny', async () => {
        const agent = createAgentStub();
        const promptMultiSelect = vi.fn(async () => ({ cancelled: true, value: [] }));

        const { waitForInputQueue } = registerUserInputHandler({
            agent,
            withPrompt: async (factory) => factory(),
            promptText: vi.fn(),
            promptSelect: vi.fn(),
            promptMultiSelect,
        });

        agent.emit('user_input_requested', {
            callId: 'approval-1',
            questions: [{
                question: 'Approve?',
                inputType: 'multi_select',
                options: [{ title: 'a', value: '1' }],
            }],
        });

        await waitForInputQueue();

        expect(promptMultiSelect).toHaveBeenCalled();
        expect(agent.respondToUserInput).toHaveBeenCalledWith('approval-1', 'Deny');
    });
});
