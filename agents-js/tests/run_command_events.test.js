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

describe('run_command events', () => {
    it('emits exec_command begin/output/end events', async () => {
        const llm = {
            calls: 0,
            async chat() {
                this.calls += 1;
                if (this.calls === 1) {
                    return {
                        content: null,
                        tool_calls: [
                            { id: 'call_1', name: 'run_command', arguments: JSON.stringify({ command: 'echo hi' }) },
                        ],
                    };
                }
                return { content: 'done', tool_calls: [] };
            },
        };

        const tools = getBuiltInTools(createSkillManagerStub());
        const agent = new Agent({ llm, tools });
        setTimeout(() => {
            agent.respondToUserInput('approval:call_1', 'Approve');
        }, 0);

        const events = [];
        agent.on('exec_command_begin', (data) => events.push({ type: 'begin', data }));
        agent.on('exec_command_output', (data) => events.push({ type: 'output', data }));
        agent.on('exec_command_end', (data) => events.push({ type: 'end', data }));
        let toolResult;
        agent.on('tool_result', (data) => {
            if (data && data.tool === 'run_command') toolResult = data;
        });

        const response = await agent.run('trigger');
        expect(response).toBe('done');

        const begin = events.find((ev) => ev.type === 'begin');
        const output = events.find((ev) => ev.type === 'output' && String(ev.data.chunk || '').includes('hi'));
        const end = events.find((ev) => ev.type === 'end');

        expect(begin).toBeTruthy();
        expect(output).toBeTruthy();
        expect(end).toBeTruthy();
        expect(output.data.chunk).toContain('hi');
        expect(end.data.exitCode).toBe(0);
        expect(end.data.success).toBe(true);

        expect(toolResult).toBeTruthy();
        expect(toolResult.tool).toBe('run_command');
        expect(toolResult.result).toBeTruthy();
        expect(toolResult.result.stdout).toContain('hi');
    });
});
