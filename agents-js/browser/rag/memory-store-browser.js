const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;
const STORE_KEY = 'records';

function toString(v) {
    return typeof v === 'string' ? v : '';
}

function normalizeRecord(raw, source) {
    if (!raw || typeof raw !== 'object') return null;
    const id = toString(raw.id).trim();
    const content = toString(raw.content).trim();
    if (!id || !content) return null;

    const title = toString(raw.title).trim() || id;
    const type = toString(raw.type).trim() || 'note';
    const metadata = (raw.metadata && typeof raw.metadata === 'object') ? raw.metadata : {};
    const tags = Array.isArray(metadata.tags) ? metadata.tags.map((t) => String(t || '').trim()).filter(Boolean) : [];
    const sourcePages = Array.isArray(metadata.source_pages) ? metadata.source_pages.map((n) => Number(n)).filter(Number.isFinite) : [];

    const embedding = (raw.embedding && typeof raw.embedding === 'object') ? raw.embedding : null;
    const hasVector = Boolean(
        embedding
        && embedding.model === EMBEDDING_MODEL
        && Number(embedding.dimension) === EMBEDDING_DIM
        && Array.isArray(embedding.vector)
        && embedding.vector.length === EMBEDDING_DIM
    );

    return {
        id,
        type,
        title,
        content,
        tags,
        source_pages: sourcePages,
        updated_at: toString(metadata.updated_at || raw.updated_at || ''),
        vector: hasVector ? embedding.vector.map((n) => Number(n)) : null,
        source,
        rawRecord: raw,
        hasVector,
    };
}

function toNode(doc) {
    return {
        id: doc.id,
        type: doc.type,
        title: doc.title,
        content: doc.content,
        metadata: {
            tags: doc.tags,
            source_pages: doc.source_pages,
            updated_at: doc.updated_at || null,
            source: doc.source,
        },
    };
}

async function nextMicrotask() {
    await Promise.resolve();
}

function openDb(storeName) {
    if (!globalThis.indexedDB) return Promise.resolve(null);

    return new Promise((resolve, reject) => {
        const req = globalThis.indexedDB.open(storeName, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_KEY)) {
                db.createObjectStore(STORE_KEY, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('indexedDB open failed'));
    });
}

async function readAllFromDb(db) {
    if (!db) return [];
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_KEY, 'readonly');
        const store = tx.objectStore(STORE_KEY);
        const req = store.getAll();
        req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
        req.onerror = () => reject(req.error || new Error('indexedDB read failed'));
    });
}

async function putToDb(db, record) {
    if (!db) return;
    await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_KEY, 'readwrite');
        const store = tx.objectStore(STORE_KEY);
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('indexedDB write failed'));
    });
}

async function fetchJsonl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return await res.text();
}

async function parseJsonlText(text, source) {
    const lines = String(text || '').split(/\r?\n/);
    const docs = [];

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line) continue;
        try {
            const raw = JSON.parse(line);
            const doc = normalizeRecord(raw, source);
            if (doc) docs.push(doc);
        } catch {
            // ignore invalid line
        }
        if ((i + 1) % 200 === 0) await nextMicrotask();
    }

    return docs;
}

export class BrowserMemoryStore {
    constructor({ fixedJsonlPaths = [], storeName = 'agents_memory_v1' } = {}) {
        this.fixedJsonlPaths = Array.isArray(fixedJsonlPaths) ? fixedJsonlPaths : [];
        this.storeName = String(storeName || 'agents_memory_v1');
        this.db = null;
        this.fixedDocs = [];
        this.episodicDocs = [];
        this.ready = false;
    }

    async init() {
        this.db = await openDb(this.storeName).catch(() => null);
        await this.refresh();
        this.ready = true;
    }

    async refresh() {
        await this.loadFixed();
        await this.loadEpisodic();
    }

    async loadFixed() {
        const all = [];
        for (const file of this.fixedJsonlPaths) {
            try {
                const text = await fetchJsonl(file);
                const docs = await parseJsonlText(text, `fixed:${file}`);
                all.push(...docs);
            } catch {
                // ignore failing fixed file
            }
        }
        this.fixedDocs = all;
    }

    async loadEpisodic() {
        const rows = await readAllFromDb(this.db).catch(() => []);
        this.episodicDocs = rows
            .map((raw) => normalizeRecord(raw, 'episodic:indexeddb'))
            .filter(Boolean);
    }

    getDocs(scope = 'all') {
        if (scope === 'fixed') return this.fixedDocs.filter((d) => d.hasVector);
        if (scope === 'episodic') return this.episodicDocs.filter((d) => d.hasVector);
        return [...this.fixedDocs, ...this.episodicDocs].filter((d) => d.hasVector);
    }

    getNodes(limit = 100) {
        const docs = [...this.fixedDocs, ...this.episodicDocs];
        const n = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 100;
        return docs.slice(0, n).map(toNode);
    }

    async saveEpisodic(record) {
        await putToDb(this.db, record).catch(() => null);
        const doc = normalizeRecord(record, 'episodic:indexeddb');
        if (doc) this.episodicDocs.unshift(doc);
        return doc;
    }
}
