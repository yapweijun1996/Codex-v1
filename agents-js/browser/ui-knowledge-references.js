const DEFAULT_MAX_IMAGES = 3;
const MAX_BASE64_CHARS = 1_500_000;
const DEFAULT_MIN_HIT_SCORE = 0.35;

function toText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeToolResult(result) {
    if (!result || typeof result !== 'object') return null;
    if (Array.isArray(result.hits) || Array.isArray(result.nodes)) return result;
    if (result.preview && typeof result.preview === 'object') {
        const preview = result.preview;
        if (Array.isArray(preview.hits) || Array.isArray(preview.nodes)) return preview;
    }
    return null;
}

function normalizeImageRef(raw, { hitId, title }) {
    const image = raw && typeof raw === 'object' ? raw : null;
    if (!image) return null;

    const mime = toText(image.mime_type) || 'image/jpeg';
    const directUrl = toText(image.url);
    const directDataUri = toText(image.data_uri);
    const rawData = toText(image.data_base64) || toText(image.data);

    let src = '';
    if (directDataUri.startsWith('data:image/')) {
        src = directDataUri;
    } else if (directUrl) {
        src = directUrl;
    } else if (rawData) {
        const looksDataUri = rawData.startsWith('data:image/');
        if (looksDataUri) src = rawData;
        else src = `data:${mime};base64,${rawData}`;
    }
    if (!src) return null;
    if (src.startsWith('data:') && src.length > MAX_BASE64_CHARS) return null;

    const page = Number(image.source_page_index);
    return {
        hitId,
        title,
        src,
        mime,
        sourcePage: Number.isFinite(page) ? page : null,
    };
}

async function parseJsonlKnowledge(text, map) {
    const lines = String(text || '').split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line) continue;
        try {
            const raw = JSON.parse(line);
            if (!raw || typeof raw !== 'object') continue;
            const hitId = toText(raw.id);
            if (!hitId) continue;
            const title = toText(raw.title) || hitId;
            const images = Array.isArray(raw.images) ? raw.images : [];
            const refs = images
                .map((image) => normalizeImageRef(image, { hitId, title }))
                .filter(Boolean);
            if (refs.length === 0) continue;
            map.set(hitId, refs);
        } catch {
            // ignore invalid lines
        }

        if ((i + 1) % 200 === 0) await Promise.resolve();
    }
}

function extractIds(items, { minScore = DEFAULT_MIN_HIT_SCORE } = {}) {
    if (!Array.isArray(items)) return [];
    const out = [];
    for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const id = toText(item.id);
        if (!id) continue;
        const score = Number(item.score);
        if (Number.isFinite(score) && score < minScore) continue;
        out.push(id);
    }
    return out;
}

export function extractKnowledgeHitIdsFromToolEvent(event) {
    if (!event || typeof event !== 'object') return [];
    const tool = toText(event.tool || event.name);
    if (!tool) return [];
    const isKnowledgeTool = (
        tool === 'memory_search'
        || tool === 'kb_search'
        || tool === 'memory__search_nodes'
    );
    if (!isKnowledgeTool) return [];

    const normalized = normalizeToolResult(event.result);
    if (!normalized) return [];
    const fromHits = extractIds(normalized.hits);
    const fromNodes = extractIds(normalized.nodes);
    return Array.from(new Set([...fromHits, ...fromNodes]));
}

export function extractKnowledgeSelectedIdsFromEvent(event) {
    if (!event || typeof event !== 'object') return [];
    const type = toText(event.type).toLowerCase();
    if (type !== 'knowledge.selected') return [];

    const selectedIds = Array.isArray(event.selectedIds)
        ? event.selectedIds
        : [];
    if (selectedIds.length > 0) {
        return Array.from(new Set(
            selectedIds.map((v) => toText(v)).filter(Boolean)
        ));
    }

    const selected = Array.isArray(event.selected) ? event.selected : [];
    return Array.from(new Set(
        selected
            .map((item) => toText(item && item.id))
            .filter(Boolean)
    ));
}

export function extractCitationIdsFromText(text) {
    const input = String(text || '');
    if (!input) return [];
    const pattern = /\[source:\s*#?([a-z0-9._:-]+)(?:\s+p\.?\s*(\d+))?\s*\]/ig;
    const out = [];
    let match = pattern.exec(input);
    while (match) {
        const id = toText(match[1]);
        if (id) out.push(id);
        match = pattern.exec(input);
    }
    return Array.from(new Set(out));
}

export function createKnowledgeReferenceResolver({
    fetchManifest,
    fetchImpl = fetch,
    maxImages = DEFAULT_MAX_IMAGES,
} = {}) {
    let indexReady = false;
    let indexMap = new Map();

    async function ensureIndex() {
        if (indexReady) return;
        indexReady = true;
        indexMap = new Map();

        let manifest = [];
        try {
            manifest = await fetchManifest();
        } catch {
            manifest = [];
        }

        const files = [];
        for (const skill of (Array.isArray(manifest) ? manifest : [])) {
            const knowledgeFiles = Array.isArray(skill && skill.knowledgeFiles) ? skill.knowledgeFiles : [];
            for (const file of knowledgeFiles) {
                const value = toText(file);
                if (value) files.push(value);
            }
        }

        const uniqueFiles = Array.from(new Set(files));
        for (const file of uniqueFiles) {
            try {
                const res = await fetchImpl(file);
                if (!res.ok) continue;
                const text = await res.text();
                await parseJsonlKnowledge(text, indexMap);
            } catch {
                // ignore broken knowledge file
            }
        }
    }

    return {
        async resolveByHitIds(hitIds) {
            await ensureIndex();
            if (!Array.isArray(hitIds) || hitIds.length === 0) return [];
            const refs = [];
            for (const rawId of hitIds) {
                const id = toText(rawId);
                if (!id) continue;
                const list = indexMap.get(id);
                if (!Array.isArray(list) || list.length === 0) continue;
                for (const ref of list) {
                    refs.push(ref);
                    if (refs.length >= maxImages) return refs;
                }
            }
            return refs;
        },
    };
}
