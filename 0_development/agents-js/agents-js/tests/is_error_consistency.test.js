// Vitest globals are enabled in vitest.config.js
const { Agent } = require('../agents');
const { RiskLevel } = require('../utils/imda-constants');

function getLastToolMessage(history, toolName) {
    const toolMsgs = history.filter((m) => m.role === 'system' && m.name === toolName);
    expect(toolMsgs.length).toBeGreaterThanOrEqual(1);
    return toolMsgs[toolMsgs.length - 1];
}

describe('MCP isError consistency', () => {
    it('marks tool_not_found as isError', async () => {
        const llm = {
            calls: 0,
            histories: [],
            async chat(_systemPrompt, history) {
                this.calls++;
                this.histories.push(history);

                if (this.calls === 1) {
                    return {
                        content: null,
                        tool_calls: [
                            { id: 'call_1', name: 'missing_tool', arguments: '{}' },
                        ],
                    };
                }

                return { content: 'done', tool_calls: [] };
            },
        };

        const agent = new Agent({ llm, tools: [] });
        const out = await agent.run('trigger');
        expect(out).toBe('done');

        const secondHistory = llm.histories[1];
        const toolMsg = getLastToolMessage(secondHistory, 'missing_tool');
        const parsed = JSON.parse(toolMsg.content);
        expect(parsed.isError).toBe(true);
    });

    it('marks timeout as isError', async () => {
        const tools = [
            {
                name: 'slow_tool',
                description: 'Sleeps longer than timeout',
                risk: RiskLevel.NONE,
                parameters: { type: 'object', properties: {}, required: [] },
                func: async () => {
                    await new Promise((r) => setTimeout(r, 20));
                    return { ok: true };
                },
            },
        ];

        const llm = {
            calls: 0,
            histories: [],
            async chat(_systemPrompt, history) {
                this.calls++;
                this.histories.push(history);

                if (this.calls === 1) {
                    return {
                        content: null,
                        tool_calls: [
                            { id: 'call_1', name: 'slow_tool', arguments: '{}' },
                        ],
                    };
                }

                return { content: 'done', tool_calls: [] };
            },
        };

        const agent = new Agent({ llm, tools, toolTimeoutMs: 5 });
        const out = await agent.run('trigger');
        expect(out).toBe('done');

        const secondHistory = llm.histories[1];
        const toolMsg = getLastToolMessage(secondHistory, 'slow_tool');
        const parsed = JSON.parse(toolMsg.content);
        expect(parsed.isError).toBe(true);
    });

    it('marks nonzero run_command exit as isError', async () => {
        const tools = [
            {
                name: 'run_command',
                description: 'Simulated shell command',
                risk: RiskLevel.NONE,
                parameters: { type: 'object', properties: {}, required: [] },
                func: async () => ({ exitCode: 1, stdout: '', stderr: 'boom' }),
            },
        ];

        const llm = {
            calls: 0,
            histories: [],
            async chat(_systemPrompt, history) {
                this.calls++;
                this.histories.push(history);

                if (this.calls === 1) {
                    return {
                        content: null,
                        tool_calls: [
                            { id: 'call_1', name: 'run_command', arguments: '{}' },
                        ],
                    };
                }

                return { content: 'done', tool_calls: [] };
            },
        };

        const agent = new Agent({ llm, tools });
        const out = await agent.run('trigger');
        expect(out).toBe('done');

        const secondHistory = llm.histories[1];
        const toolMsg = getLastToolMessage(secondHistory, 'run_command');
        const parsed = JSON.parse(toolMsg.content);
        expect(parsed.isError).toBe(true);
    });
});
