const { Agent } = require('../agents');
const { executeTools } = require('../utils/agent-tool-runner');
const { RiskLevel } = require('../utils/imda-constants');

describe('Batch approval UX', () => {
    it('asks once and applies per-call decisions', async () => {
        const aFn = vi.fn(async () => ({ ok: 'a' }));
        const bFn = vi.fn(async () => ({ ok: 'b' }));

        const agent = new Agent({
            llm: {},
            tools: [
                { name: 'tool_a', func: aFn, risk: RiskLevel.MEDIUM },
                { name: 'tool_b', func: bFn, risk: RiskLevel.MEDIUM },
            ],
            approvalTimeoutMs: 500,
        });

        const approvalEvents = [];
        agent.on('approval_required', (ev) => approvalEvents.push(ev));

        agent.on('user_input_requested', ({ callId }) => {
            if (String(callId).startsWith('approval:batch:')) {
                agent.respondToUserInput(callId, { approvedCallIds: ['c1'] });
                return;
            }
            agent.respondToUserInput(callId, 'Approve');
        });

        const calls = [
            { id: 'c1', name: 'tool_a', arguments: '{}' },
            { id: 'c2', name: 'tool_b', arguments: '{}' },
        ];

        const results = await executeTools(agent, calls);
        expect(approvalEvents.length).toBe(1);
        expect(aFn).toHaveBeenCalledTimes(1);
        expect(bFn).toHaveBeenCalledTimes(0);
        expect(results[1].content).toContain('ApprovalDenied');
    });
});
