const { Agent } = require('../agents');
const { executeTools } = require('../utils/agent-tool-runner');
const { RiskLevel } = require('../utils/imda-constants');

describe('IMDA approval gate', () => {
    it('executes tool when approval granted', async () => {
        const toolFn = vi.fn(async () => ({ ok: true }));
        const agent = new Agent({
            llm: {},
            tools: [{ name: 'danger', func: toolFn, risk: RiskLevel.HIGH }],
        });
        const call = { id: 'c1', name: 'danger', arguments: '{}' };
        setTimeout(() => {
            agent.respondToUserInput('approval:c1', 'Approve');
        }, 0);
        const results = await executeTools(agent, [call]);
        expect(toolFn).toHaveBeenCalledTimes(1);
        expect(results).toHaveLength(1);
    });

    it('does not emit tool_call_begin before approval', async () => {
        const toolFn = vi.fn(async () => ({ ok: true }));
        const agent = new Agent({
            llm: {},
            tools: [{ name: 'danger', func: toolFn, risk: RiskLevel.HIGH }],
            approvalTimeoutMs: 500,
        });
        const call = { id: 'c_pre', name: 'danger', arguments: '{}' };

        const begins = [];
        agent.on('tool_call_begin', (ev) => begins.push(ev));

        const p = executeTools(agent, [call]);
        await new Promise((r) => setTimeout(r, 10));
        expect(begins.length).toBe(0);

        agent.respondToUserInput('approval:c_pre', 'Approve');
        await p;
        expect(begins.length).toBe(1);
        expect(toolFn).toHaveBeenCalledTimes(1);
    });

    it('blocks tool when approval denied', async () => {
        const toolFn = vi.fn(async () => ({ ok: true }));
        const agent = new Agent({
            llm: {},
            tools: [{ name: 'danger', func: toolFn, risk: RiskLevel.HIGH }],
        });
        const call = { id: 'c2', name: 'danger', arguments: '{}' };
        setTimeout(() => {
            agent.respondToUserInput('approval:c2', 'Deny');
        }, 0);
        const results = await executeTools(agent, [call]);
        expect(toolFn).not.toHaveBeenCalled();
        expect(results[0].content).toContain('ApprovalDenied');
    });

    it('requires approval for Tier 2 tools even for Tier 2 agent', async () => {
        const toolFn = vi.fn(async () => ({ ok: true }));
        const agent = new Agent({
            llm: {},
            tools: [{ name: 'medium', func: toolFn, risk: RiskLevel.MEDIUM }],
            riskProfile: { tier: RiskLevel.MEDIUM },
        });
        const call = { id: 'c_med', name: 'medium', arguments: '{}' };
        setTimeout(() => {
            agent.respondToUserInput('approval:c_med', 'Approve');
        }, 0);
        await executeTools(agent, [call]);
        expect(toolFn).toHaveBeenCalledTimes(1);
    });
});
