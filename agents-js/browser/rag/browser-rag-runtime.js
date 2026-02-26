import { BrowserMemoryStore } from './memory-store-browser.js';
import { embedQueryBrowser } from './query-embedder-browser.js';

function toNumber(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];
    return Array.from(new Set(tags.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean)));
}

function normalizeRagConfig(cfg) {
    const rag = cfg && cfg.agent && cfg.agent.rag && typeof cfg.agent.rag === 'object' ? cfg.agent.rag : {};
    return {
        enabled: rag.enabled !== false,
        topK: Math.max(1, Math.floor(toNumber(rag.topK, 5))),
        minScore: toNumber(rag.minScore, 0.2),
        autoSave: rag.autoSave !== false,
        browserStoreName: String(rag.browserStoreName || 'agents_memory_v1'),
        fixedJsonlPaths: Array.isArray(rag.fixedJsonlPaths)
            ? rag.fixedJsonlPaths.map((p) => String(p || '').trim()).filter(Boolean)
            : [],
    };
}

function collectManifestKnowledgePaths(manifest) {
    const paths = [];
    for (const skill of (Array.isArray(manifest) ? manifest : [])) {
        const files = Array.isArray(skill && skill.knowledgeFiles) ? skill.knowledgeFiles : [];
        for (const file of files) {
            const value = String(file || '').trim();
            if (value) paths.push(value);
        }
    }
    return Array.from(new Set(paths));
}

function cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return -1;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i += 1) {
        const av = Number(a[i]);
        const bv = Number(b[i]);
        if (!Number.isFinite(av) || !Number.isFinite(bv)) return -1;
        dot += av * bv;
        magA += av * av;
        magB += bv * bv;
    }
    if (magA <= 0 || magB <= 0) return -1;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function tokenize(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

function lexicalScore(query, content) {
    const q = tokenize(query);
    const c = new Set(tokenize(content));
    if (q.length === 0 || c.size === 0) return 0;
    let hit = 0;
    for (const t of q) {
        if (c.has(t)) hit += 1;
    }
    return hit / q.length;
}

function normalizeScope(scope) {
    const v = String(scope || 'all').toLowerCase();
    if (v === 'fixed' || v === 'episodic' || v === 'all') return v;
    return 'all';
}

function topK(items, k, minScore) {
    return items
        .filter((x) => x && Number.isFinite(Number(x.score)) && Number(x.score) >= minScore)
        .sort((a, b) => Number(b.score) - Number(a.score))
        .slice(0, k);
}

function createMemoryId() {
    const rand = Math.random().toString(36).slice(2, 8);
    return `memory-${Date.now()}-${rand}`;
}

class BrowserRagRuntime {
    constructor({ manifest, getAgentsConfig }) {
        this.getAgentsConfig = getAgentsConfig;
        this.config = normalizeRagConfig(getAgentsConfig() || {});
        const fixed = this.config.fixedJsonlPaths.length > 0
            ? this.config.fixedJsonlPaths
            : collectManifestKnowledgePaths(manifest);
        this.store = new BrowserMemoryStore({
            fixedJsonlPaths: fixed,
            storeName: this.config.browserStoreName,
        });
        this.ready = false;
    }

    async init() {
        if (this.ready) return;
        await this.store.init();
        this.ready = true;
    }

    async search(args = {}) {
        await this.init();
        if (!this.config.enabled) return { hits: [], meta: { disabled: true } };

        const query = String(args.query || '').trim();
        if (!query) return { hits: [] };

        const scope = normalizeScope(args.scope || 'all');
        const topk = Math.max(1, Math.floor(toNumber(args.topK, this.config.topK)));
        const minScore = toNumber(args.minScore, this.config.minScore);
        const tags = normalizeTags(args.tags);

        const docs = this.store.getDocs(scope);
        const queryEmbedding = await embedQueryBrowser(query);
        const scored = [];

        for (let i = 0; i < docs.length; i += 1) {
            const doc = docs[i];
            if (!doc) continue;

            const docTags = normalizeTags(doc.tags);
            if (tags.length > 0 && !tags.some((tag) => docTags.includes(tag))) continue;

            const score = (queryEmbedding.mode === 'xenova')
                ? cosineSimilarity(queryEmbedding.vector, doc.vector)
                : lexicalScore(query, `${doc.title || ''}\n${doc.content || ''}`);

            scored.push({ doc, score });
            if ((i + 1) % 200 === 0) await Promise.resolve();
        }

        const ranked = topK(scored, topk, minScore);
        return {
            hits: ranked.map(({ doc, score }) => ({
                id: doc.id,
                title: doc.title,
                content: doc.content,
                score,
                tags: doc.tags || [],
                source_pages: doc.source_pages || [],
                type: doc.type,
                updated_at: doc.updated_at || null,
            })),
        };
    }

    async kbSearch(args = {}) {
        return await this.search({ ...args, scope: 'fixed' });
    }

    async saveMemory(args = {}) {
        await this.init();
        if (!this.config.enabled) return { ok: false, error: 'rag_disabled' };
        const requestedScope = String(args.scope || args.target || '').toLowerCase();
        if (requestedScope === 'fixed') {
            return {
                ok: false,
                error: 'fixed_memory_read_only',
                message: 'fixed memory is read-only; use episodic memory only',
            };
        }

        const type = String(args.type || 'note');
        const title = String(args.title || '').trim();
        const content = String(args.content || '').trim();
        if (!title || !content) return { ok: false, error: 'invalid_payload' };

        const embedding = await embedQueryBrowser(`${title}\n${content}`);
        const metadata = (args.metadata && typeof args.metadata === 'object') ? { ...args.metadata } : {};
        const tags = Array.isArray(metadata.tags)
            ? Array.from(new Set(metadata.tags.map((t) => String(t || '').trim()).filter(Boolean)))
            : [];

        const record = {
            id: createMemoryId(),
            type,
            title,
            content,
            metadata: {
                ...metadata,
                tags,
                updated_at: new Date().toISOString(),
                ...(Number.isFinite(Number(args.ttlDays)) ? { ttl_days: Math.floor(Number(args.ttlDays)) } : null),
            },
            embedding: {
                model: embedding.model,
                dimension: embedding.dimension,
                vector: embedding.vector,
            },
        };

        await this.store.saveEpisodic(record);
        return { ok: true, id: record.id, mode: embedding.mode };
    }

    async readGraph(args = {}) {
        await this.init();
        const limit = Math.max(1, Math.floor(toNumber(args.limit, 100)));
        return { nodes: this.store.getNodes(limit) };
    }

    getTools() {
        return [
            {
                name: 'memory_search',
                description: 'Search local memory (browser runtime).',
                risk: 0,
                parameters: { type: 'object', properties: { query: { type: 'string' }, topK: { type: 'number' }, tags: { type: 'array', items: { type: 'string' } }, minScore: { type: 'number' }, scope: { type: 'string', enum: ['episodic', 'fixed', 'all'] } }, required: ['query'] },
                func: async (args) => await this.search(args),
            },
            {
                name: 'kb_search',
                description: 'Search fixed knowledge (browser runtime).',
                risk: 0,
                parameters: { type: 'object', properties: { query: { type: 'string' }, topK: { type: 'number' }, tags: { type: 'array', items: { type: 'string' } }, minScore: { type: 'number' } }, required: ['query'] },
                func: async (args) => await this.kbSearch(args),
            },
            {
                name: 'memory_save',
                description: 'Save episodic memory (browser runtime).',
                risk: 1,
                parameters: { type: 'object', properties: { type: { type: 'string', enum: ['note', 'preference', 'fact', 'task'] }, title: { type: 'string' }, content: { type: 'string' }, metadata: { type: 'object' }, ttlDays: { type: 'number' } }, required: ['type', 'title', 'content'] },
                func: async (args) => await this.saveMemory(args),
            },
            {
                name: 'memory_read_graph',
                description: 'Read local memory graph (browser runtime).',
                risk: 0,
                parameters: { type: 'object', properties: { limit: { type: 'number' } } },
                func: async (args) => await this.readGraph(args),
            },
            {
                name: 'memory__search_nodes',
                description: 'Compatibility alias of memory_search.',
                risk: 0,
                parameters: { type: 'object', properties: { query: { type: 'string' }, topK: { type: 'number' }, top_k: { type: 'number' }, minScore: { type: 'number' }, scope: { type: 'string', enum: ['episodic', 'fixed', 'all'] }, tags: { type: 'array', items: { type: 'string' } } }, required: ['query'] },
                func: async (args = {}) => {
                    const out = await this.search({ ...args, topK: args.topK != null ? args.topK : args.top_k });
                    return { nodes: Array.isArray(out.hits) ? out.hits : [] };
                },
            },
            {
                name: 'memory__read_graph',
                description: 'Compatibility alias of memory_read_graph.',
                risk: 0,
                parameters: { type: 'object', properties: { limit: { type: 'number' } } },
                func: async (args) => await this.readGraph(args),
            },
        ];
    }
}

export async function createBrowserRagTools({ manifest, getAgentsConfig }) {
    const runtime = new BrowserRagRuntime({ manifest, getAgentsConfig });
    await runtime.init();
    return runtime.getTools();
}
