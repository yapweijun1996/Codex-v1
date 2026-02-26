const { Agent } = require('../agents');
const { executeTools } = require('../utils/agent-tool-runner');
const { RiskLevel } = require('../utils/imda-constants');

describe('IMDA approval policy (execution policy)', () => {
    it('unless_trusted skips approval for trusted Tier 2 tool (but emits approval_skipped)', async () => {
        const toolFn = vi.fn(async () => ({ ok: true }));
        const agent = new Agent({
            llm: {},
            tools: [{ name: 'read_url', func: toolFn, risk: RiskLevel.MEDIUM }],
            approvalPolicy: 'unless_trusted',
            trustedTools: ['read_url'],
        });

        const required = [];
        const skipped = [];
        agent.on('approval_required', (ev) => required.push(ev));
        agent.on('approval_skipped', (ev) => skipped.push(ev));

        const call = { id: 'c1', name: 'read_url', arguments: JSON.stringify({ url: 'https://example.com' }) };
        const results = await executeTools(agent, [call]);

        expect(results).toHaveLength(1);
        expect(toolFn).toHaveBeenCalledTimes(1);
        expect(required).toHaveLength(0);
        expect(skipped).toHaveLength(1);
        expect(skipped[0].tool).toBe('read_url');

        const trace = agent.exportSessionTrace();
        const types = (trace && Array.isArray(trace.events))
            ? trace.events.map((e) => e && e.type).filter(Boolean)
            : [];
        expect(types.includes('approval.skipped')).toBe(true);
    });

    it('unless_trusted does not auto-bypass Tier 3 tools', async () => {
        const toolFn = vi.fn(async () => ({ ok: true }));
        const agent = new Agent({
            llm: {},
            tools: [{ name: 'danger', func: toolFn, risk: RiskLevel.HIGH }],
            approvalPolicy: 'unless_trusted',
            trustedTools: ['danger'],
            approvalTimeoutMs: 500,
        });

        const required = [];
        agent.on('approval_required', (ev) => required.push(ev));

        setTimeout(() => {
            agent.respondToUserInput('approval:c2', 'Approve');
        }, 0);

        const call = { id: 'c2', name: 'danger', arguments: '{}' };
        await executeTools(agent, [call]);

        expect(required).toHaveLength(1);
        expect(toolFn).toHaveBeenCalledTimes(1);
    });
});
