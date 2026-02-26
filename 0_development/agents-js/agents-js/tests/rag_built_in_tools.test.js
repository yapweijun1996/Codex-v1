const { getBuiltInTools } = require('../utils/built-in-tools');
const { RiskLevel } = require('../utils/imda-constants');

describe('rag built-in tools', () => {
    it('registers rag tools and compatibility aliases', async () => {
        const ragService = {
            async search() {
                return { hits: [{ id: 'a', title: 'A', content: 'B', score: 0.9, tags: [], source_pages: [], type: 'note' }] };
            },
            async searchKnowledge() {
                return { hits: [{ id: 'k1' }] };
            },
            async saveMemory() {
                return { ok: true, id: 'm1' };
            },
            async readGraph() {
                return { nodes: [{ id: 'n1' }] };
            },
        };
        const skillManager = { refreshSkills() {}, getSkillList() { return []; }, getSkillDetail() { return null; } };

        const tools = getBuiltInTools(skillManager, { ragService });
        const byName = Object.fromEntries(tools.map((t) => [t.name, t]));

        expect(byName.memory_search).toBeTruthy();
        expect(byName.kb_search).toBeTruthy();
        expect(byName.memory_save).toBeTruthy();
        expect(byName.memory_read_graph).toBeTruthy();
        expect(byName.memory__search_nodes).toBeTruthy();
        expect(byName.memory__read_graph).toBeTruthy();

        expect(byName.memory_save.risk).toBe(RiskLevel.LOW);

        const alias = await byName.memory__search_nodes.func({ query: 'x' });
        expect(Array.isArray(alias.nodes)).toBe(true);
        expect(alias.nodes[0].id).toBe('a');
    });
});
