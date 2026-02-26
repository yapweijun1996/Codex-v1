const { Agent } = require('../agents');
const { executeTools } = require('../utils/agent-tool-runner');
const { RiskLevel } = require('../utils/imda-constants');

describe('IMDA approval timeout', () => {
    it('times out approvals using approvalTimeoutMs (not toolTimeoutMs)', async () => {
        const toolFn = vi.fn(async () => ({ ok: true }));
        const agent = new Agent({
            llm: {},
            tools: [{ name: 'danger', func: toolFn, risk: RiskLevel.HIGH }],
            toolTimeoutMs: 5,
            approvalTimeoutMs: 10,
        });

        const call = { id: 'c_timeout', name: 'danger', arguments: '{}' };
        const results = await executeTools(agent, [call]);

        expect(toolFn).not.toHaveBeenCalled();
        expect(results).toHaveLength(1);
        expect(results[0].content).toContain('ApprovalTimeout');
        expect(results[0].content).toContain('"timeoutMs":10');
    });
});
