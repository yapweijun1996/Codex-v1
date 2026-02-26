const { normalizeRecord } = require('../utils/rag/record-normalizer');

describe('rag record normalizer', () => {
    it('accepts valid xenova 384 vector', () => {
        const raw = {
            id: 'id-1',
            type: 'note',
            title: 'hello',
            content: 'world',
            metadata: { tags: ['a'], source_pages: [1], updated_at: '2026-02-07T00:00:00.000Z' },
            embedding: {
                model: 'Xenova/all-MiniLM-L6-v2',
                dimension: 384,
                vector: new Array(384).fill(0.01),
            },
        };

        const out = normalizeRecord(raw, { requireVector: true, source: 'fixed:test' });
        expect(out.ok).toBe(true);
        expect(out.hasVector).toBe(true);
        expect(out.searchDoc.embedding_dim).toBe(384);
    });

    it('rejects model mismatch for vector-required record', () => {
        const raw = {
            id: 'id-2',
            title: 'hello',
            content: 'world',
            embedding: { model: 'other', dimension: 384, vector: new Array(384).fill(0) },
        };

        const out = normalizeRecord(raw, { requireVector: true });
        expect(out.ok).toBe(false);
        expect(out.reason).toBe('model_mismatch');
    });
});
