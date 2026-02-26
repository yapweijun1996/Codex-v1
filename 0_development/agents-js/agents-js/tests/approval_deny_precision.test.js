const { Agent } = require('../agents');
const { executeTools } = require('../utils/agent-tool-runner');
const { RiskLevel } = require('../utils/imda-constants');

describe('Approval deny precision', () => {
    it('re-prompts when tool args change within a turn', async () => {
        const fn = vi.fn(async () => ({ ok: true }));
        const agent = new Agent({
            llm: {},
            tools: [{ name: 'searxng_query', func: fn, risk: RiskLevel.MEDIUM }],
            approvalTimeoutMs: 500,
        });

        const approvals = [];
        agent.on('approval_required', (ev) => approvals.push(ev));

        agent.on('user_input_requested', ({ callId }) => {
            if (String(callId) === 'approval:c1') agent.respondToUserInput(callId, 'Deny');
            else if (String(callId) === 'approval:c2') agent.respondToUserInput(callId, 'Approve');
            else agent.respondToUserInput(callId, 'Deny');
        });

        await executeTools(agent, [{ id: 'c1', name: 'searxng_query', arguments: JSON.stringify({ query: 'r99 prices' }) }]);
        await executeTools(agent, [{ id: 'c2', name: 'searxng_query', arguments: JSON.stringify({ query: 'car prices' }) }]);

        expect(approvals.length).toBe(2);
        expect(fn).toHaveBeenCalledTimes(1);
    });
});
