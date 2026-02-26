const path = require('path');
const { normalizeRagConfig } = require('./rag-config');
const { NodeMemoryStore } = require('./memory-store-node');
const { getQueryEmbedderNode } = require('./query-embedder-node');
const { cosineSimilarity, topKByScore } = require('./vector-math');

function normalizeTagsFilter(tags) {
    if (!Array.isArray(tags)) return [];
    return Array.from(new Set(tags.map((v) => String(v || '').trim().toLowerCase()).filter(Boolean)));
}

function tokenizeText(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

function lexicalScore(query, content) {
    const q = tokenizeText(query);
    const c = new Set(tokenizeText(content));
    if (q.length === 0 || c.size === 0) return 0;

    let hit = 0;
    for (const token of q) {
        if (c.has(token)) hit += 1;
    }
    return hit / q.length;
}

function normalizeScope(scope) {
    const value = String(scope || 'all').toLowerCase();
    if (value === 'episodic' || value === 'fixed' || value === 'all') return value;
    return 'all';
}

function generateMemoryId() {
    const rand = Math.random().toString(36).slice(2, 8);
    return `memory-${Date.now()}-${rand}`;
}

class RagSearchService {
    constructor(options = {}) {
        const skillsDir = options.skillsDir || path.join(process.cwd(), 'skills');
        this.config = normalizeRagConfig(options.ragConfig || {}, { skillsDir });
        this.store = new NodeMemoryStore({
            fixedJsonlPaths: this.config.fixedJsonlPaths,
            episodicStoreNodePath: this.config.episodicStoreNodePath,
        });
        this.embedder = getQueryEmbedderNode();
    }

    getConfig() {
        return { ...this.config };
    }

    async init() {
        await this.store.ensureLoaded();
    }

    async refresh() {
        await this.store.refresh();
    }

    async search(params = {}) {
        if (!this.config.enabled) return { hits: [], meta: { disabled: true } };

        const query = String(params.query || '').trim();
        if (!query) return { hits: [], meta: { reason: 'empty_query' } };

        const topK = Number.isFinite(Number(params.topK))
            ? Math.max(1, Math.floor(Number(params.topK)))
            : this.config.topK;
        const minScore = Number.isFinite(Number(params.minScore))
            ? Number(params.minScore)
            : this.config.minScore;
        const scope = normalizeScope(params.scope || 'all');
        const tagFilter = normalizeTagsFilter(params.tags);

        await this.store.ensureLoaded();
        const docs = this.store.getDocs(scope);
        const embedding = await this.embedder.embedQuery(query);

        const scored = [];
        for (const doc of docs) {
            if (!doc || typeof doc !== 'object') continue;
            const docTags = Array.isArray(doc.tags) ? doc.tags.map((t) => String(t).toLowerCase()) : [];
            if (tagFilter.length > 0 && !tagFilter.some((t) => docTags.includes(t))) continue;

            let score = -1;
            if (embedding.mode === 'xenova' && Array.isArray(doc.vector)) {
                score = cosineSimilarity(embedding.vector, doc.vector);
            } else {
                score = lexicalScore(query, `${doc.title || ''}\n${doc.content || ''}`);
            }

            scored.push({ doc, score });
        }

        const ranked = topKByScore(scored, topK, minScore);
        const hits = ranked.map(({ doc, score }) => ({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            score,
            tags: doc.tags || [],
            source_pages: doc.source_pages || [],
            type: doc.type,
            updated_at: doc.updated_at || null,
        }));

        return {
            hits,
            meta: {
                query,
                topK,
                minScore,
                scope,
                mode: embedding.mode,
                indexed: docs.length,
                fixedIndexed: this.store.fixedDocs.length,
                episodicIndexed: this.store.episodicDocs.length,
            },
        };
    }

    async searchKnowledge(params = {}) {
        return this.search({ ...params, scope: 'fixed' });
    }

    async saveMemory(params = {}) {
        if (!this.config.enabled) {
            return { ok: false, error: 'rag_disabled' };
        }
        const requestedScope = String(params.scope || params.target || '').toLowerCase();
        if (requestedScope === 'fixed') {
            return {
                ok: false,
                error: 'fixed_memory_read_only',
                message: 'fixed memory is read-only; use episodic memory only',
            };
        }

        const type = String(params.type || 'note');
        const title = String(params.title || '').trim();
        const content = String(params.content || '').trim();
        if (!title || !content) {
            return { ok: false, error: 'invalid_payload', message: 'title and content are required' };
        }

        const metadata = (params.metadata && typeof params.metadata === 'object') ? { ...params.metadata } : {};
        const ttlDays = Number.isFinite(Number(params.ttlDays)) ? Math.floor(Number(params.ttlDays)) : null;
        const tags = Array.isArray(metadata.tags)
            ? Array.from(new Set(metadata.tags.map((t) => String(t || '').trim()).filter(Boolean)))
            : [];

        const textForEmbedding = `${title}\n${content}`;
        const embedding = await this.embedder.embedQuery(textForEmbedding);

        const record = {
            id: generateMemoryId(),
            type,
            title,
            content,
            metadata: {
                ...metadata,
                tags,
                updated_at: new Date().toISOString(),
                ...(ttlDays !== null ? { ttl_days: ttlDays } : null),
            },
            embedding: {
                model: embedding.model,
                dimension: embedding.dimension,
                vector: embedding.vector,
            },
        };

        await this.store.ensureLoaded();
        await this.store.saveEpisodicRecord(record);

        return {
            ok: true,
            id: record.id,
            mode: embedding.mode,
        };
    }

    async readGraph(params = {}) {
        await this.store.ensureLoaded();
        const limit = Number.isFinite(Number(params.limit)) ? Math.max(1, Math.floor(Number(params.limit))) : 100;
        return {
            nodes: this.store.getNodes({ scope: 'all', limit }),
            meta: {
                limit,
                fixed: this.store.fixedNodes.length,
                episodic: this.store.episodicNodes.length,
            },
        };
    }
}

function createRagSearchService(options = {}) {
    return new RagSearchService(options);
}

module.exports = {
    createRagSearchService,
    RagSearchService,
};
