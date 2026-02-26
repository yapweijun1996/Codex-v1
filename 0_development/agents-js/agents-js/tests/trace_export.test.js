const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

function createTraceAgent() {
    let callCount = 0;
    const llm = {
        modelName: 'test-model',
        async chat() {
            callCount += 1;
            if (callCount === 1) {
                return {
                    content: null,
                    tool_calls: [{ id: 'call_1', name: 'needs_approval', arguments: JSON.stringify({ api_key: 'secret-value' }) }],
                };
            }
            return { content: 'done', tool_calls: [] };
        }
    };
    const tools = [{
        name: 'needs_approval',
        description: 'Requires approval',
        risk: RiskLevel.HIGH,
        parameters: { type: 'object', properties: { api_key: { type: 'string' } } },
        func: async () => ({ ok: true }),
    }];
    return new Agent({ llm, tools, maxTurns: 2 });
}

describe('Trace export', () => {
    it('exports standardized trace with redaction', async () => {
        const agent = createTraceAgent();
        agent.on('user_input_requested', ({ callId }) => {
            agent.respondToUserInput(callId, 'Approve');
        });

        const result = await agent.run('trigger');
        expect(String(result)).toContain('done');

        const trace = agent.exportSessionTrace();
        expect(trace).toBeTruthy();
        expect(trace.version).toBe('1.0-opencode');
        expect(trace.metadata).toBeTruthy();
        expect(trace.metadata.agent.model).toBe('test-model');
        expect(Array.isArray(trace.events)).toBe(true);
        expect(trace.events.length).toBeGreaterThan(0);

        const approvalEvent = trace.events.find((ev) => ev.type === 'approval.required');
        expect(approvalEvent).toBeTruthy();
        const payload = approvalEvent.payload || {};
        expect(payload.promptSnapshot || '').toContain('needs_approval');
        expect(JSON.stringify(payload)).not.toContain('secret-value');
        expect(JSON.stringify(payload)).toContain('[REDACTED]');

        const stateEvent = trace.events.find((ev) => (
            ev.type === 'state.changed'
            && ev.payload
            && ev.payload.metadata
            && typeof ev.payload.metadata.estimatedTokens === 'number'
        ));
        expect(stateEvent).toBeTruthy();
    });
});
