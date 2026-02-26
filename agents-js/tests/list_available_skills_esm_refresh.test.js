// Vitest globals are enabled in vitest.config.js
const path = require('path');
const { SkillManager } = require('../skill-manager');
const { getBuiltInTools } = require('../agent-factory');

describe('list_available_skills refresh includes ESM-only skills', () => {
    it('returns mcp_tester in the catalog', async () => {
        const skillsDir = path.resolve(__dirname, '../skills');
        const sm = new SkillManager(skillsDir);
        await sm.loadSkillsAsync({ preferEsmTools: true });

        const builtIns = getBuiltInTools(sm);
        const listTool = builtIns.find((t) => t && t.name === 'list_available_skills');
        expect(listTool).toBeTruthy();

        const skills = await listTool.func({});
        const ids = new Set((skills || []).map((s) => s && s.id).filter(Boolean));

        expect(ids.has('mcp_tester')).toBe(true);
    });
});
