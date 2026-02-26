const { getAgentConfig } = require('../utils/config');

describe('rag config env overrides', () => {
    it('applies AGENTS_RAG_* env overrides', () => {
        const prevEnabled = process.env.AGENTS_RAG_ENABLED;
        const prevTopK = process.env.AGENTS_RAG_TOPK;
        const prevMinScore = process.env.AGENTS_RAG_MIN_SCORE;

        process.env.AGENTS_RAG_ENABLED = 'false';
        process.env.AGENTS_RAG_TOPK = '9';
        process.env.AGENTS_RAG_MIN_SCORE = '0.45';

        try {
            const cfg = getAgentConfig();
            expect(cfg.agent.rag.enabled).toBe(false);
            expect(cfg.agent.rag.topK).toBe(9);
            expect(cfg.agent.rag.minScore).toBe(0.45);
        } finally {
            if (prevEnabled === undefined) delete process.env.AGENTS_RAG_ENABLED;
            else process.env.AGENTS_RAG_ENABLED = prevEnabled;

            if (prevTopK === undefined) delete process.env.AGENTS_RAG_TOPK;
            else process.env.AGENTS_RAG_TOPK = prevTopK;

            if (prevMinScore === undefined) delete process.env.AGENTS_RAG_MIN_SCORE;
            else process.env.AGENTS_RAG_MIN_SCORE = prevMinScore;
        }
    });
});
