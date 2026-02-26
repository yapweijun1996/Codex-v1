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

describe('Agent.runAsyncIterator plan updates', () => {
    it('yields plan.updated when update_plan is called', async () => {
        const plan = [
            { step: 'Collect requirements', status: 'completed' },
            { step: 'Implement UI plan panel', status: 'in_progress' },
            { step: 'Run tests', status: 'pending' },
        ];

        const llm = {
            calls: 0,
            async chat() {
                this.calls += 1;
                if (this.calls === 1) {
                    return {
                        content: null,
                        tool_calls: [
                            {
                                id: 'call_1',
                                name: 'update_plan',
                                arguments: JSON.stringify({ explanation: 'Initial plan', plan }),
                            },
                        ],
                    };
                }
                return { content: 'done', tool_calls: [] };
            },
        };

        const skillManager = createSkillManagerStub();
        const tools = getBuiltInTools(skillManager);
        const agent = new Agent({ llm, tools, systemPrompt: 'test' });

        const events = [];
        for await (const ev of agent.runAsyncIterator('trigger')) {
            events.push(ev);
        }

        const planEv = events.find((e) => e && e.type === 'plan.updated');
        expect(planEv).toBeTruthy();
        expect(planEv.explanation).toBe('Initial plan');
        expect(planEv.plan).toEqual(plan);
    });
});

