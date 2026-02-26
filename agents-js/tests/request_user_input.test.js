// Vitest globals are enabled in vitest.config.js
const { Agent } = require('../agents');
const { getBuiltInTools } = require('../agent-factory');

function createSkillManagerStub() {
    return {
        refreshSkillsAsync: async () => {},
        refreshSkills: () => {},
        getSkillList: () => [],
        getSkillDetail: () => null,
    };
}

describe('request_user_input tool', () => {
    it('emits user_input_requested and resumes after response', async () => {
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
                            {
                                id: 'call_1',
                                name: 'request_user_input',
                                arguments: JSON.stringify({
                                    question: 'Pick one',
                                    options: ['A', 'B']
                                })
                            }
                        ],
                    };
                }

                return { content: 'done', tool_calls: [] };
            },
        };

        const skillManager = createSkillManagerStub();
        const builtInTools = getBuiltInTools(skillManager);
        const agent = new Agent({ llm, tools: builtInTools, toolTimeoutMs: 2000 });

        const events = [];
        agent.on('user_input_requested', (payload) => {
            events.push(payload);
            agent.respondToUserInput(payload.callId, 'A');
        });

        const out = await agent.run('trigger');
        expect(out).toBe('done');

        expect(events.length).toBe(1);
        expect(events[0].callId).toBe('call_1');
        expect(events[0].questions.length).toBe(1);
        expect(events[0].questions[0].question).toBe('Pick one');

        const secondHistory = llm.histories[1];
        const toolMsgs = secondHistory.filter((m) => m.role === 'system' && m.name === 'request_user_input');
        expect(toolMsgs.length).toBe(1);
        const parsed = JSON.parse(toolMsgs[0].content);
        const payload = parsed && parsed.structuredContent ? parsed.structuredContent : parsed;
        expect(payload).toHaveProperty('response', 'A');
    });

    it('returns timeout error when user does not respond', async () => {
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
                            { id: 'call_1', name: 'request_user_input', arguments: '{}' }
                        ],
                    };
                }

                return { content: 'done', tool_calls: [] };
            },
        };

        const skillManager = createSkillManagerStub();
        const builtInTools = getBuiltInTools(skillManager);
        const agent = new Agent({ llm, tools: builtInTools, toolTimeoutMs: 5 });

        const out = await agent.run('trigger');
        expect(out).toBe('done');

        const secondHistory = llm.histories[1];
        const toolMsgs = secondHistory.filter((m) => m.role === 'system' && m.name === 'request_user_input');
        expect(toolMsgs.length).toBe(1);
        const parsed = JSON.parse(toolMsgs[0].content);
        const payload = parsed && parsed.structuredContent ? parsed.structuredContent : parsed;
        expect(payload).toHaveProperty('error', 'Timeout');
    });
});
