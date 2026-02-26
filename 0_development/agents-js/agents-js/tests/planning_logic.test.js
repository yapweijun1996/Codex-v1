// Vitest globals enabled
const { DEFAULT_SYSTEM_PROMPT } = require('../agent-factory');

describe('Planning Prompt', () => {
    it('includes Thought, Plan, and Action structure', () => {
        expect(DEFAULT_SYSTEM_PROMPT).toContain('Thought:');
        expect(DEFAULT_SYSTEM_PROMPT).toContain('Plan:');
        expect(DEFAULT_SYSTEM_PROMPT).toContain('Action:');
    });

    it('keeps skill discovery guidance', () => {
        expect(DEFAULT_SYSTEM_PROMPT).toContain("list_available_skills");
        expect(DEFAULT_SYSTEM_PROMPT).toContain("read_skill_documentation");
    });
});
