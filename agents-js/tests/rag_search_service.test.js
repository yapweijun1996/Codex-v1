const fs = require('fs');
const os = require('os');
const path = require('path');
const { createRagSearchService } = require('../utils/rag/rag-search-service');

function buildVector(seed) {
    return Array.from({ length: 384 }, (_v, i) => ((i + seed) % 13 === 0 ? 0.2 : 0));
}

describe('rag search service', () => {
    it('searches fixed knowledge and supports episodic save/read', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-service-'));
        const fixed = path.join(dir, 'fixed.jsonl');
        const episodic = path.join(dir, 'episodic.jsonl');

        const fixedRecord = {
            id: 'fixed-1',
            type: 'note',
            title: 'Fixed',
            content: 'Tesla gross margin in 2023 changed due to price cuts.',
            metadata: { tags: ['tesla'], source_pages: [4] },
            embedding: { model: 'Xenova/all-MiniLM-L6-v2', dimension: 384, vector: buildVector(1) },
        };
        fs.writeFileSync(fixed, `${JSON.stringify(fixedRecord)}\n`, 'utf8');

        const service = createRagSearchService({
            ragConfig: {
                enabled: true,
                topK: 5,
                minScore: 0,
                fixedJsonlPaths: [fixed],
                episodicStoreNodePath: episodic,
            },
            skillsDir: path.join(dir, 'skills'),
        });

        await service.init();

        const fixedHits = await service.searchKnowledge({ query: 'Tesla margin price cuts', topK: 3, minScore: 0 });
        expect(Array.isArray(fixedHits.hits)).toBe(true);
        expect(fixedHits.hits.length).toBeGreaterThan(0);
        expect(fixedHits.hits[0].id).toBe('fixed-1');

        const saved = await service.saveMemory({
            type: 'preference',
            title: 'User preference',
            content: 'User prefers concise answers.',
            metadata: { tags: ['preference'] },
        });
        expect(saved.ok).toBe(true);

        const fixedDenied = await service.saveMemory({
            scope: 'fixed',
            type: 'note',
            title: 'Should fail',
            content: 'fixed write is forbidden',
        });
        expect(fixedDenied.ok).toBe(false);
        expect(fixedDenied.error).toBe('fixed_memory_read_only');

        const graph = await service.readGraph({ limit: 10 });
        expect(Array.isArray(graph.nodes)).toBe(true);
        expect(graph.nodes.length).toBeGreaterThanOrEqual(2);

        const episodicHits = await service.search({ query: 'concise answers preference', scope: 'episodic', minScore: 0 });
        expect(Array.isArray(episodicHits.hits)).toBe(true);
        expect(episodicHits.hits.length).toBeGreaterThan(0);
    });
});
