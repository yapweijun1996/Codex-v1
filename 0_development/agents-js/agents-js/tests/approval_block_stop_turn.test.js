const { handleToolCalls } = require('../utils/agent-tool-flow');
const { RiskLevel } = require('../utils/imda-constants');

describe('Approval blocked turn stop', () => {
    it('stops the turn when a Tier2+ tool is denied', async () => {
        const agent = {
            tools: {
                searxng_query: { risk: RiskLevel.MEDIUM },
            },
            history: [],
            emit: vi.fn(),
            _executeTools: vi.fn(async () => {
                const mcpResult = {
                    content: [{ type: 'text', text: '{"error":"ApprovalDenied"}' }],
                    structuredContent: { error: 'ApprovalDenied', message: 'User denied approval.' },
                    isError: true,
                };
                return [{
                    role: 'system',
                    tool_call_id: 'approval:call_x',
                    name: 'searxng_query',
                    content: JSON.stringify(mcpResult),
                }];
            }),
        };

        const currentStepResponse = {
            content: null,
            tool_calls: [{ id: 'call_x', name: 'searxng_query', arguments: '{}' }],
        };

        const res = await handleToolCalls({ agent, currentStepResponse, turnCount: 1 });
        expect(res.handled).toBe(true);
        expect(res.stopTurn).toBe(true);
        expect(String(res.message || '')).toContain('approval');
    });
});
