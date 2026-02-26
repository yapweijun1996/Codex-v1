const { DEFAULT_EMBEDDING_DIM, DEFAULT_EMBEDDING_MODEL } = require('./rag-config');

function toStringOrEmpty(v) {
    return typeof v === 'string' ? v : '';
}

function normalizeTags(metadata) {
    if (!metadata || typeof metadata !== 'object') return [];
    const list = Array.isArray(metadata.tags) ? metadata.tags : [];
    return Array.from(new Set(list.map((v) => String(v || '').trim()).filter(Boolean)));
}

function normalizeSourcePages(metadata) {
    if (!metadata || typeof metadata !== 'object') return [];
    const pages = Array.isArray(metadata.source_pages) ? metadata.source_pages : [];
    return pages
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n))
        .map((n) => Math.trunc(n));
}

function normalizeUpdatedAt(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const fromTop = raw.updated_at;
    const fromMeta = raw.metadata && typeof raw.metadata === 'object' ? raw.metadata.updated_at : null;
    const value = (typeof fromTop === 'string' && fromTop.trim()) ? fromTop : fromMeta;
    return typeof value === 'string' && value.trim() ? value : null;
}

function normalizeEmbedding(rawEmbedding) {
    const embedding = (rawEmbedding && typeof rawEmbedding === 'object') ? rawEmbedding : null;
    if (!embedding) return { hasVector: false, reason: 'missing_embedding', model: null, dimension: null, vector: null };

    const model = toStringOrEmpty(embedding.model);
    const dimension = Number(embedding.dimension);
    const vector = Array.isArray(embedding.vector) ? embedding.vector : null;

    if (model !== DEFAULT_EMBEDDING_MODEL) {
        return { hasVector: false, reason: 'model_mismatch', model, dimension, vector: null };
    }
    if (!Number.isFinite(dimension) || Number(dimension) !== DEFAULT_EMBEDDING_DIM) {
        return { hasVector: false, reason: 'dimension_mismatch', model, dimension, vector: null };
    }
    if (!vector || vector.length !== DEFAULT_EMBEDDING_DIM) {
        return { hasVector: false, reason: 'vector_length_mismatch', model, dimension, vector: null };
    }

    const normalized = vector.map((n) => Number(n));
    const hasInvalid = normalized.some((n) => !Number.isFinite(n));
    if (hasInvalid) {
        return { hasVector: false, reason: 'vector_invalid_number', model, dimension, vector: null };
    }

    return {
        hasVector: true,
        reason: null,
        model,
        dimension: DEFAULT_EMBEDDING_DIM,
        vector: normalized,
    };
}

function normalizeRecord(rawRecord, options = {}) {
    const { source = null, requireVector = false } = options;

    if (!rawRecord || typeof rawRecord !== 'object') {
        return { ok: false, reason: 'invalid_record', hasVector: false };
    }

    const id = toStringOrEmpty(rawRecord.id).trim();
    const title = toStringOrEmpty(rawRecord.title).trim();
    const content = toStringOrEmpty(rawRecord.content).trim();
    const type = toStringOrEmpty(rawRecord.type).trim() || 'note';

    if (!id || !content) {
        return { ok: false, reason: 'missing_required_fields', hasVector: false };
    }

    const metadata = (rawRecord.metadata && typeof rawRecord.metadata === 'object') ? rawRecord.metadata : {};
    const tags = normalizeTags(metadata);
    const sourcePages = normalizeSourcePages(metadata);
    const embedding = normalizeEmbedding(rawRecord.embedding);
    if (requireVector && !embedding.hasVector) {
        return {
            ok: false,
            reason: embedding.reason || 'missing_vector',
            hasVector: false,
        };
    }

    const searchDoc = {
        id,
        type,
        title: title || id,
        content,
        tags,
        source_pages: sourcePages,
        updated_at: normalizeUpdatedAt(rawRecord),
        vector: embedding.vector,
        embedding_model: embedding.model,
        embedding_dim: embedding.dimension,
        source,
        rawRecord,
    };

    return {
        ok: true,
        hasVector: embedding.hasVector,
        reason: embedding.reason,
        searchDoc,
    };
}

function toMemoryNode(searchDoc) {
    if (!searchDoc || typeof searchDoc !== 'object') return null;
    return {
        id: searchDoc.id,
        title: searchDoc.title,
        content: searchDoc.content,
        type: searchDoc.type,
        metadata: {
            tags: Array.isArray(searchDoc.tags) ? searchDoc.tags : [],
            source_pages: Array.isArray(searchDoc.source_pages) ? searchDoc.source_pages : [],
            updated_at: searchDoc.updated_at || null,
            source: searchDoc.source || null,
        },
    };
}

module.exports = {
    DEFAULT_EMBEDDING_DIM,
    DEFAULT_EMBEDDING_MODEL,
    normalizeRecord,
    toMemoryNode,
};
