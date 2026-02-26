const fs = require('fs');
const path = require('path');

const DEFAULT_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const DEFAULT_EMBEDDING_DIM = 384;
const DEFAULT_EPISODIC_NODE_PATH = 'memory/episodic-memory.jsonl';

const RAG_DEFAULTS = Object.freeze({
    enabled: true,
    topK: 5,
    minScore: 0.2,
    maxContextChars: 6000,
    autoSave: true,
    fixedJsonlPaths: [],
    episodicStoreNodePath: DEFAULT_EPISODIC_NODE_PATH,
    browserStoreName: 'agents_memory_v1',
});

function toBoolean(input, fallback) {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'number') return input !== 0;
    if (typeof input !== 'string') return fallback;
    const v = input.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(v)) return true;
    if (['0', 'false', 'no', 'off'].includes(v)) return false;
    return fallback;
}

function toNumber(input, fallback, { min = null, max = null } = {}) {
    const n = Number(input);
    if (!Number.isFinite(n)) return fallback;
    if (min !== null && n < min) return fallback;
    if (max !== null && n > max) return fallback;
    return n;
}

function toStringArray(input) {
    if (Array.isArray(input)) {
        return Array.from(new Set(input.map((v) => String(v || '').trim()).filter(Boolean)));
    }
    if (typeof input === 'string' && input.trim()) {
        return Array.from(new Set(input.split(',').map((s) => s.trim()).filter(Boolean)));
    }
    return [];
}

function discoverFixedJsonlPaths(skillsDir) {
    const root = (typeof skillsDir === 'string' && skillsDir.trim()) ? skillsDir : path.join(process.cwd(), 'skills');
    if (!fs.existsSync(root)) return [];

    const out = [];
    const stack = [root];
    while (stack.length > 0) {
        const cur = stack.pop();
        let entries = [];
        try {
            entries = fs.readdirSync(cur, { withFileTypes: true });
        } catch {
            continue;
        }

        for (const entry of entries) {
            const full = path.join(cur, entry.name);
            if (entry.isDirectory()) {
                stack.push(full);
                continue;
            }
            if (!entry.isFile()) continue;
            if (!entry.name.toLowerCase().endsWith('.jsonl')) continue;
            if (!full.includes(`${path.sep}knowledge${path.sep}`)) continue;
            out.push(full);
        }
    }

    out.sort();
    return out;
}

function normalizeRagConfig(raw = {}, { skillsDir } = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const cfg = {
        enabled: toBoolean(source.enabled, RAG_DEFAULTS.enabled),
        topK: Math.floor(toNumber(source.topK, RAG_DEFAULTS.topK, { min: 1, max: 50 })),
        minScore: toNumber(source.minScore, RAG_DEFAULTS.minScore, { min: -1, max: 1 }),
        maxContextChars: Math.floor(toNumber(source.maxContextChars, RAG_DEFAULTS.maxContextChars, { min: 256, max: 50000 })),
        autoSave: toBoolean(source.autoSave, RAG_DEFAULTS.autoSave),
        fixedJsonlPaths: toStringArray(source.fixedJsonlPaths),
        episodicStoreNodePath: String(source.episodicStoreNodePath || RAG_DEFAULTS.episodicStoreNodePath),
        browserStoreName: String(source.browserStoreName || RAG_DEFAULTS.browserStoreName),
    };

    if (cfg.fixedJsonlPaths.length === 0) {
        cfg.fixedJsonlPaths = discoverFixedJsonlPaths(skillsDir);
    }

    return cfg;
}

module.exports = {
    DEFAULT_EMBEDDING_MODEL,
    DEFAULT_EMBEDDING_DIM,
    DEFAULT_EPISODIC_NODE_PATH,
    RAG_DEFAULTS,
    discoverFixedJsonlPaths,
    normalizeRagConfig,
};
