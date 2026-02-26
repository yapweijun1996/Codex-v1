const { executeTools } = require('../utils/agent-tool-runner');
const { RiskLevel } = require('../utils/imda-constants');

function createAgent(tools = {}) {
    const normalized = {};
    for (const [name, def] of Object.entries(tools)) {
        normalized[name] = {
            risk: RiskLevel.NONE,
            ...def,
        };
    }
    return {
        tools: normalized,
        toolTimeoutMs: 50,
        riskProfile: { tier: RiskLevel.MEDIUM },
        _activeTools: new Map(),
        _toolFailureStreak: new Map(),
        _setState: () => {},
        emit: () => {},
    };
}

function parseToolResult(message) {
    const parsed = JSON.parse(message.content);
    return parsed && parsed.structuredContent ? parsed.structuredContent : parsed;
}

describe('agent-tool-runner edge cases', () => {
    it('wraps thrown errors into tool execution failed result', async () => {
        const agent = createAgent({
            boom: { func: async () => { throw new Error('Failed to fetch'); } },
        });
        const result = await executeTools(agent, [
            { id: 'call_1', name: 'boom', arguments: '{}' },
        ]);

        const payload = parseToolResult(result[0]);
        expect(payload).toHaveProperty('error', 'Tool execution failed');
        expect(payload).toHaveProperty('message');
    });

    it('normalizes undefined output to null', async () => {
        const agent = createAgent({
            noop: { func: async () => undefined },
        });
        const result = await executeTools(agent, [
            { id: 'call_1', name: 'noop', arguments: '{}' },
        ]);

        const parsed = JSON.parse(result[0].content);
        expect(parsed).toHaveProperty('structuredContent', null);
    });

    it('serializes circular tool output', async () => {
        const agent = createAgent({
            circular: {
                func: async () => {
                    const value = { name: 'node' };
                    value.self = value;
                    return value;
                },
            },
        });
        const result = await executeTools(agent, [
            { id: 'call_1', name: 'circular', arguments: '{}' },
        ]);

        const payload = parseToolResult(result[0]);
        expect(payload).toHaveProperty('self', '[Circular]');
    });
});
