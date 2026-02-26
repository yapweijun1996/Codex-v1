const { readJsonlFile, appendJsonlRecord } = require('./jsonl-reader');
const { normalizeRecord, toMemoryNode } = require('./record-normalizer');

class NodeMemoryStore {
    constructor({ fixedJsonlPaths = [], episodicStoreNodePath = '' } = {}) {
        this.fixedJsonlPaths = Array.isArray(fixedJsonlPaths) ? fixedJsonlPaths : [];
        this.episodicStoreNodePath = String(episodicStoreNodePath || '');
        this.fixedDocs = [];
        this.episodicDocs = [];
        this.fixedNodes = [];
        this.episodicNodes = [];
        this.loaded = false;
    }

    async loadFixed() {
        const docs = [];
        const nodes = [];

        for (const filePath of this.fixedJsonlPaths) {
            await readJsonlFile(filePath, {
                onRecord: async (raw) => {
                    const normalized = normalizeRecord(raw, { source: `fixed:${filePath}`, requireVector: false });
                    if (!normalized.ok || !normalized.searchDoc) return;
                    nodes.push(toMemoryNode(normalized.searchDoc));
                    if (normalized.hasVector) docs.push(normalized.searchDoc);
                },
            });
        }

        this.fixedDocs = docs;
        this.fixedNodes = nodes;
    }

    async loadEpisodic() {
        const docs = [];
        const nodes = [];

        if (!this.episodicStoreNodePath) {
            this.episodicDocs = docs;
            this.episodicNodes = nodes;
            return;
        }

        await readJsonlFile(this.episodicStoreNodePath, {
            onRecord: async (raw) => {
                const normalized = normalizeRecord(raw, { source: `episodic:${this.episodicStoreNodePath}`, requireVector: false });
                if (!normalized.ok || !normalized.searchDoc) return;
                nodes.push(toMemoryNode(normalized.searchDoc));
                if (normalized.hasVector) docs.push(normalized.searchDoc);
            },
        });

        this.episodicDocs = docs;
        this.episodicNodes = nodes;
    }

    async refresh() {
        await this.loadFixed();
        await this.loadEpisodic();
        this.loaded = true;
    }

    async ensureLoaded() {
        if (this.loaded) return;
        await this.refresh();
    }

    getDocs(scope = 'all') {
        if (scope === 'fixed') return this.fixedDocs.slice();
        if (scope === 'episodic') return this.episodicDocs.slice();
        return [...this.fixedDocs, ...this.episodicDocs];
    }

    getNodes({ scope = 'all', limit = 100 } = {}) {
        let list = [];
        if (scope === 'fixed') list = this.fixedNodes;
        else if (scope === 'episodic') list = this.episodicNodes;
        else list = [...this.fixedNodes, ...this.episodicNodes];

        const n = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 100;
        return list.slice(0, n);
    }

    async saveEpisodicRecord(record) {
        if (!this.episodicStoreNodePath) {
            throw new Error('episodicStoreNodePath is not configured');
        }

        await appendJsonlRecord(this.episodicStoreNodePath, record);

        const normalized = normalizeRecord(record, {
            source: `episodic:${this.episodicStoreNodePath}`,
            requireVector: false,
        });
        if (normalized.ok && normalized.searchDoc) {
            this.episodicNodes.unshift(toMemoryNode(normalized.searchDoc));
            if (normalized.hasVector) {
                this.episodicDocs.unshift(normalized.searchDoc);
            }
        }

        return normalized;
    }
}

module.exports = {
    NodeMemoryStore,
};
