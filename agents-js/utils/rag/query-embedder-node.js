const { DEFAULT_EMBEDDING_DIM, DEFAULT_EMBEDDING_MODEL } = require('./record-normalizer');
const { normalizeVector } = require('./vector-math');

const EMBEDDER_STATE = {
    loaded: false,
    mode: 'pending',
    model: DEFAULT_EMBEDDING_MODEL,
    error: null,
    fn: null,
};

function hashToken(token) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
        h ^= token.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
}

function buildFallbackVector(text) {
    const vec = new Array(DEFAULT_EMBEDDING_DIM).fill(0);
    const tokens = String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    if (tokens.length === 0) return vec;

    for (const token of tokens) {
        const h = hashToken(token);
        const idx = h % DEFAULT_EMBEDDING_DIM;
        const sign = ((h >> 8) & 1) === 0 ? 1 : -1;
        const mag = 0.5 + (((h >> 16) % 1000) / 1000);
        vec[idx] += sign * mag;
    }
    return normalizeVector(vec);
}

async function loadXenovaEmbedder() {
    // Use runtime dynamic import to keep Xenova optional in bundled builds.
    const runtimeImport = new Function('specifier', 'return import(specifier)');
    const xenovaPkg = '@xenova/' + 'transformers';
    const mod = await runtimeImport(xenovaPkg);
    if (!mod || typeof mod.pipeline !== 'function') {
        throw new Error('Invalid @xenova/transformers export');
    }

    const env = mod.env || {};
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    const extractor = await mod.pipeline('feature-extraction', DEFAULT_EMBEDDING_MODEL, { quantized: true });
    return async function embed(text) {
        const out = await extractor(String(text || ''), { pooling: 'mean', normalize: true });
        const data = out && out.data ? Array.from(out.data) : [];
        if (!Array.isArray(data) || data.length !== DEFAULT_EMBEDDING_DIM) {
            throw new Error(`Unexpected embedding dimension: ${data.length}`);
        }
        return data.map((n) => Number(n));
    };
}

async function ensureEmbedder() {
    if (EMBEDDER_STATE.loaded) return;
    EMBEDDER_STATE.loaded = true;

    try {
        EMBEDDER_STATE.fn = await loadXenovaEmbedder();
        EMBEDDER_STATE.mode = 'xenova';
        EMBEDDER_STATE.model = DEFAULT_EMBEDDING_MODEL;
        EMBEDDER_STATE.error = null;
    } catch (error) {
        EMBEDDER_STATE.fn = async (text) => buildFallbackVector(text);
        EMBEDDER_STATE.mode = 'fallback';
        EMBEDDER_STATE.model = DEFAULT_EMBEDDING_MODEL;
        EMBEDDER_STATE.error = String(error && error.message ? error.message : error);
    }
}

function getQueryEmbedderNode() {
    return {
        async embedQuery(query) {
            await ensureEmbedder();
            const vector = await EMBEDDER_STATE.fn(String(query || ''));
            return {
                vector,
                model: EMBEDDER_STATE.model,
                dimension: DEFAULT_EMBEDDING_DIM,
                mode: EMBEDDER_STATE.mode,
            };
        },
        getStatus() {
            return {
                mode: EMBEDDER_STATE.mode,
                model: EMBEDDER_STATE.model,
                error: EMBEDDER_STATE.error,
            };
        },
    };
}

module.exports = {
    buildFallbackVector,
    getQueryEmbedderNode,
};
