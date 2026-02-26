const { registerTools } = require('../utils/agent-tools-registry');
const { registerToolDefinitions } = require('../utils/skill-loader');
const { getBuiltInTools } = require('../utils/built-in-tools');
const { RiskLevel } = require('../utils/imda-constants');

describe('IMDA tool registry', () => {
    it('defaults missing risk to MEDIUM in registerTools', () => {
        const { toolMap, registry } = registerTools([
            { name: 'safe_tool', func: async () => 'ok', risk: RiskLevel.LOW },
            {
                name: 'default_tool',
                func: async () => 'ok',
                parameters: {
                    type: 'object',
                    properties: { query: { type: 'string' } },
                },
                outputSchema: {
                    type: 'object',
                    properties: { ok: { type: 'boolean' } },
                },
            },
        ]);
        expect(toolMap.safe_tool.risk).toBe(RiskLevel.LOW);
        expect(toolMap.default_tool.risk).toBe(RiskLevel.MEDIUM);
        expect(registry.safe_tool.risk).toBe(RiskLevel.LOW);
        expect(registry.default_tool.risk).toBe(RiskLevel.MEDIUM);
        expect(registry.default_tool.permissions).toEqual([]);
        expect(registry.default_tool.audit.fields.length).toBeGreaterThan(0);
        expect(registry.default_tool.inputSchema.type).toBe('object');
        expect(registry.default_tool.inputSchema.properties.query.type).toBe('string');
        expect(registry.default_tool.outputSchema.type).toBe('object');
        expect(registry.default_tool.outputSchema.properties.ok.type).toBe('boolean');
    });

    it('defaults missing risk to MEDIUM in skill loader', () => {
        const tools = [];
        registerToolDefinitions([{ name: 'skill_tool', func: async () => 'ok' }], 'test', tools, { quiet: true });
        expect(tools[0].risk).toBe(RiskLevel.MEDIUM);
    });

    it('assigns built-in tool risk tiers', () => {
        const skillManager = {
            refreshSkillsAsync: async () => undefined,
            refreshSkills: () => undefined,
            getSkillList: () => [],
            getSkillDetail: () => null,
        };
        const builtIns = getBuiltInTools(skillManager);
        const byName = Object.fromEntries(builtIns.map((tool) => [tool.name, tool]));
        expect(byName.run_command.risk).toBe(RiskLevel.HIGH);
        expect(byName.apply_patch.risk).toBe(RiskLevel.HIGH);
        expect(byName.list_available_skills.risk).toBe(RiskLevel.NONE);
        expect(byName.request_user_input.risk).toBe(RiskLevel.LOW);
    });
});
