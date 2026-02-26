const EMBEDDING_DIM = 384;
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

let runtime = {
    loaded: false,
    mode: 'pending',
    fn: null,
    error: null,
};

function hashToken(token) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
        h ^= token.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
}

function normalize(vec) {
    let norm = 0;
    for (const n of vec) norm += n * n;
    if (!Number.isFinite(norm) || norm <= 0) return vec.map(() => 0);
    const scale = 1 / Math.sqrt(norm);
    return vec.map((n) => n * scale);
}

function fallbackEmbedding(text) {
    const vec = new Array(EMBEDDING_DIM).fill(0);
    const tokens = String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    for (const token of tokens) {
        const h = hashToken(token);
        const idx = h % EMBEDDING_DIM;
        const sign = ((h >> 8) & 1) === 0 ? 1 : -1;
        const mag = 0.5 + (((h >> 16) % 1000) / 1000);
        vec[idx] += sign * mag;
    }

    return normalize(vec);
}

async function loadXenovaInBrowser() {
    if (!globalThis || !globalThis.transformers) {
        throw new Error('transformers runtime is not available in browser');
    }
    const mod = globalThis.transformers;
    if (typeof mod.pipeline !== 'function') {
        throw new Error('transformers.pipeline is unavailable');
    }

    if (mod.env) {
        mod.env.allowLocalModels = false;
        mod.env.useBrowserCache = true;
    }

    const extractor = await mod.pipeline('feature-extraction', EMBEDDING_MODEL, { quantized: true });
    return async function embed(text) {
        const out = await extractor(String(text || ''), { pooling: 'mean', normalize: true });
        const data = out && out.data ? Array.from(out.data) : [];
        if (!Array.isArray(data) || data.length !== EMBEDDING_DIM) {
            throw new Error(`Unexpected embedding dimension: ${data.length}`);
        }
        return data.map((n) => Number(n));
    };
}

async function ensureEmbedder() {
    if (runtime.loaded) return;
    runtime.loaded = true;

    try {
        runtime.fn = await loadXenovaInBrowser();
        runtime.mode = 'xenova';
        runtime.error = null;
    } catch (error) {
        runtime.fn = async (text) => fallbackEmbedding(text);
        runtime.mode = 'fallback';
        runtime.error = String(error && error.message ? error.message : error);
    }
}

export async function embedQueryBrowser(query) {
    await ensureEmbedder();
    const vector = await runtime.fn(String(query || ''));
    return {
        vector,
        dimension: EMBEDDING_DIM,
        model: EMBEDDING_MODEL,
        mode: runtime.mode,
        error: runtime.error,
    };
}

export function getBrowserEmbedderStatus() {
    return { ...runtime, model: EMBEDDING_MODEL, dimension: EMBEDDING_DIM };
}
