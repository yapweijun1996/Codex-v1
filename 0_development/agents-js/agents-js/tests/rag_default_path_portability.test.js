const path = require('path');
const { DEFAULT_CONFIG, getAgentConfig } = require('../utils/config');
const { DEFAULT_EPISODIC_NODE_PATH, RAG_DEFAULTS } = require('../utils/rag/rag-config');

describe('rag default episodic path portability', () => {
    it('keeps default episodic path non-absolute to avoid machine-specific leakage', () => {
        expect(path.isAbsolute(DEFAULT_EPISODIC_NODE_PATH)).toBe(false);
        expect(path.isAbsolute(RAG_DEFAULTS.episodicStoreNodePath)).toBe(false);
        expect(path.isAbsolute(DEFAULT_CONFIG.agent.rag.episodicStoreNodePath)).toBe(false);
    });

    it('returns non-absolute default episodic path from merged agent config', () => {
        const cfg = getAgentConfig();
        expect(path.isAbsolute(cfg.agent.rag.episodicStoreNodePath)).toBe(false);
        expect(cfg.agent.rag.episodicStoreNodePath).toBe('memory/episodic-memory.jsonl');
    });
});
