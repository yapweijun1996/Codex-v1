const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

describe('IMDA foundation', () => {
    it('stores default identity and risk tier', () => {
        const agent = new Agent({ llm: {}, tools: [] });
        expect(agent.getIdentity()).toEqual({
            id: 'anonymous',
            tenantId: 'default',
            role: 'user',
        });
        expect(agent.getRiskProfile()).toEqual({ tier: RiskLevel.NONE });
    });

    it('accepts custom identity and risk tier', () => {
        const agent = new Agent({
            llm: {},
            tools: [],
            identity: { id: 'agent-1', tenantId: 'tenant-1', role: 'admin' },
            riskProfile: { tier: RiskLevel.HIGH },
        });
        expect(agent.getIdentity()).toEqual({
            id: 'agent-1',
            tenantId: 'tenant-1',
            role: 'admin',
        });
        expect(agent.getRiskProfile()).toEqual({ tier: RiskLevel.HIGH });
    });

    it('normalizes invalid risk tier to NONE', () => {
        const agent = new Agent({ llm: {}, tools: [], riskProfile: { tier: 99 } });
        expect(agent.getRiskProfile()).toEqual({ tier: RiskLevel.NONE });
    });
});
