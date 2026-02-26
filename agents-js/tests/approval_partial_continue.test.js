const { handleToolCalls } = require('../utils/agent-tool-flow');
const { RiskLevel } = require('../utils/imda-constants');

describe('Approval blocked behavior', () => {
    it('does not stop the turn if prior evidence exists in the same turn', async () => {
        const priorOk = {
            content: [{ type: 'text', text: 'ok' }],
            structuredContent: { ok: true },
            isError: false,
        };

        const agent = {
            tools: {
                worldtime_now: { risk: RiskLevel.MEDIUM },
                searxng_query: { risk: RiskLevel.MEDIUM },
            },
            history: [{
                role: 'system',
                tool_call_id: 'c_prev',
                name: 'worldtime_now',
                content: JSON.stringify(priorOk),
            }],
            _turnStartIndex: 0,
            emit: () => {},
            _executeTools: async () => [{
                role: 'system',
                tool_call_id: 'c1',
                name: 'searxng_query',
                content: JSON.stringify({
                    content: [{ type: 'text', text: '{"error":"ApprovalDenied"}' }],
                    structuredContent: { error: 'ApprovalDenied', message: 'User denied approval.' },
                    isError: true,
                }),
            }],
        };

        const currentStepResponse = {
            content: null,
            tool_calls: [{ id: 'c1', name: 'searxng_query', arguments: JSON.stringify({ query: 'r99 prices' }) }],
        };

        const res = await handleToolCalls({ agent, currentStepResponse, turnCount: 2 });
        expect(res.handled).toBe(true);
        expect(Boolean(res.stopTurn)).toBe(false);
    });
});
