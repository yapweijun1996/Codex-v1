const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

function createSingleTurnLlm(text = 'ok') {
    return {
        async chat() {
            return { content: text, tool_calls: [] };
        },
    };
}

describe('RunPolicy unified runtime entry', () => {
    it('exposes normalized default runPolicy', () => {
        const agent = new Agent({
            llm: createSingleTurnLlm(),
            tools: [],
            maxTurns: 7,
            approvalPolicy: 'unless_trusted',
            trustedTools: ['kb_search'],
            identity: { id: 'agent-a', tenantId: 'tenant-a', role: 'operator' },
            riskProfile: { tier: RiskLevel.LOW },
        });

        expect(agent.getRunPolicy()).toEqual({
            tier: RiskLevel.LOW,
            tenantId: 'tenant-a',
            approvalMode: 'unless_trusted',
            budget: {
                maxTurns: 7,
                maxToolCalls: 64,
                maxPromptTokens: 16000,
                maxFailures: 8,
            },
            traceLevel: 'standard',
            trustedTools: ['kb_search'],
        });
    });



    it('applies tier default budget template when maxTurns is not provided', () => {
        const agent = new Agent({
            llm: createSingleTurnLlm(),
            tools: [],
            riskProfile: { tier: RiskLevel.HIGH },
        });

        expect(agent.getRunPolicy().budget).toEqual({
            maxTurns: 50,
            maxToolCalls: 24,
            maxPromptTokens: 8000,
            maxFailures: 3,
        });
    });

    it('applies per-run policy and restores base policy after turn', async () => {
        const agent = new Agent({
            llm: createSingleTurnLlm('done'),
            tools: [],
            maxTurns: 5,
            approvalPolicy: 'always',
            identity: { id: 'agent-b', tenantId: 'tenant-base', role: 'operator' },
            riskProfile: { tier: RiskLevel.NONE },
        });

        const applied = [];
        agent.on('run_policy_applied', (ev) => applied.push(ev));

        const out = await agent.run('hello', {
            policy: {
                tier: RiskLevel.MEDIUM,
                tenantId: 'tenant-override',
                approvalMode: 'never',
                budget: { maxTurns: 2, maxToolCalls: 9 },
                traceLevel: 'full',
                trustedTools: ['read_url'],
            },
        });

        expect(out).toBe('done');
        expect(applied).toHaveLength(1);
        expect(applied[0]).toMatchObject({
            tier: RiskLevel.MEDIUM,
            tenantId: 'tenant-override',
            approvalMode: 'never',
        });

        expect(agent.getRunPolicy()).toMatchObject({
            tier: RiskLevel.NONE,
            tenantId: 'tenant-base',
            approvalMode: 'always',
        });
        expect(agent.getIdentity()).toMatchObject({ tenantId: 'tenant-base' });
        expect(agent.getRiskProfile()).toEqual({ tier: RiskLevel.NONE });

        const trace = agent.exportSessionTrace();
        const eventTypes = trace.events.map((ev) => ev.type);
        expect(eventTypes.includes('run.policy.applied')).toBe(true);
        expect(trace.metadata.agent.runPolicy).toMatchObject({
            tier: RiskLevel.NONE,
            tenantId: 'tenant-base',
            approvalMode: 'always',
        });
    });
});
