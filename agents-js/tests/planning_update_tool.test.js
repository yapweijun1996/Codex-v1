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

describe('update_plan tool', () => {
    it('emits plan_updated and stores currentPlan', async () => {
        const plan = [
            { step: 'Collect requirements', status: 'completed' },
            { step: 'Implement update_plan', status: 'in_progress' },
            { step: 'Add tests', status: 'pending' },
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
                            {
                                id: 'call_1',
                                name: 'update_plan',
                                arguments: JSON.stringify({
                                    explanation: 'Initial plan',
                                    plan,
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

        expect(builtInTools.some((t) => t.name === 'update_plan')).toBe(true);

        const agent = new Agent({ llm, tools: builtInTools });
        const events = [];
        agent.on('plan_updated', (payload) => events.push(payload));

        const out = await agent.run('trigger');
        expect(out).toBe('done');

        expect(events.length).toBeGreaterThanOrEqual(1);
        const last = events[events.length - 1];
        expect(last.explanation).toBe('Initial plan');
        expect(last.plan).toEqual(plan);

        expect(agent.currentPlan).toEqual(plan);

        const secondHistory = llm.histories[1];
        const toolMsgs = secondHistory.filter((m) => m.role === 'system' && m.name === 'update_plan');
        expect(toolMsgs.length).toBe(1);
        const parsed = JSON.parse(toolMsgs[0].content);
        expect(parsed.isError).not.toBe(true);
    });
});
