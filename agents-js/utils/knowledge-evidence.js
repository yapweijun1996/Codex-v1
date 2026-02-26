function toText(value) {
    return String(value == null ? '' : value).trim();
}

const KNOWLEDGE_TOOL_NAMES = new Set([
    'kb_search',
    'memory_search',
    'memory__search_nodes',
]);

function isKnowledgeToolName(name) {
    return KNOWLEDGE_TOOL_NAMES.has(toText(name).toLowerCase());
}

function toFiniteScore(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function normalizeHitItem(item) {
    if (!item || typeof item !== 'object') return null;
    const id = toText(item.id);
    if (!id) return null;
    const title = toText(item.title) || id;
    const score = toFiniteScore(item.score);
    const source = toText(item.source || item.source_path || item.file || '');
    const sourcePages = Array.isArray(item.source_pages)
        ? item.source_pages.map((n) => Number(n)).filter((n) => Number.isFinite(n)).map((n) => Math.trunc(n))
        : [];
    return {
        id,
        title,
        score,
        source,
        sourcePages,
        type: toText(item.type || ''),
        updatedAt: toText(item.updated_at || ''),
    };
}

function normalizeHitsFromStructured(toolName, structured) {
    if (!structured || typeof structured !== 'object') return [];
    if (Array.isArray(structured.hits)) {
        return structured.hits.map(normalizeHitItem).filter(Boolean);
    }
    if (toolName === 'memory__search_nodes' && Array.isArray(structured.nodes)) {
        return structured.nodes.map(normalizeHitItem).filter(Boolean);
    }
    return [];
}

function extractStructuredContent(parsedToolResult) {
    if (!parsedToolResult || typeof parsedToolResult !== 'object') return null;
    const structured = parsedToolResult.structuredContent;
    if (structured && typeof structured === 'object') return structured;
    return null;
}

function extractKnowledgeSelectionFromParsed({
    toolName,
    args,
    parsedToolResult,
    maxSelected = 6,
    minScore = null,
} = {}) {
    if (!isKnowledgeToolName(toolName)) return null;
    const structured = extractStructuredContent(parsedToolResult);
    if (!structured) return null;
    let hits = normalizeHitsFromStructured(toolName, structured);
    if (hits.length === 0) return null;

    if (typeof minScore === 'number' && Number.isFinite(minScore)) {
        hits = hits.filter((h) => !(typeof h.score === 'number' && h.score < minScore));
    }

    if (hits.length === 0) return null;
    const n = Number.isFinite(Number(maxSelected)) ? Math.max(1, Math.floor(Number(maxSelected))) : 6;
    const selected = hits.slice(0, n);
    return {
        tool: toText(toolName),
        query: toText(args && args.query),
        scope: toText(args && args.scope),
        count: selected.length,
        totalHits: hits.length,
        selected,
    };
}

function extractCitationEntriesFromText(text) {
    const input = String(text || '');
    if (!input) return [];
    const pattern = /\[source:\s*#?([a-z0-9._:-]+)(?:\s+p\.?\s*(\d+))?\s*\]/ig;
    const out = [];
    let match = pattern.exec(input);
    while (match) {
        const id = toText(match[1]);
        const pageRaw = match[2];
        const page = Number.isFinite(Number(pageRaw)) ? Math.trunc(Number(pageRaw)) : null;
        if (id) out.push({ id, page });
        match = pattern.exec(input);
    }
    return out;
}

function extractCitationIdsFromText(text) {
    const entries = extractCitationEntriesFromText(text);
    return Array.from(new Set(entries.map((e) => e.id).filter(Boolean)));
}

function hasCitationForKnowledge({
    text,
    knowledgeIds,
} = {}) {
    const ids = Array.isArray(knowledgeIds) ? knowledgeIds.map((v) => toText(v)).filter(Boolean) : [];
    if (ids.length === 0) return true;
    const cited = new Set(extractCitationIdsFromText(text));
    for (const id of ids) {
        if (cited.has(id)) return true;
    }
    return false;
}

function buildCitationReminder({ knowledgeIds = [] } = {}) {
    const list = Array.isArray(knowledgeIds) ? knowledgeIds.map((v) => toText(v)).filter(Boolean).slice(0, 6) : [];
    const sample = list.length > 0 ? list.join(', ') : 'knowledge_id';
    return (
        'Citation required: Your final answer used knowledge evidence. '
        + 'Add inline citations in this exact format: [source:#<id> p.<page>]. '
        + `Example ids from this turn: ${sample}.`
    );
}

module.exports = {
    extractCitationEntriesFromText,
    extractCitationIdsFromText,
    extractKnowledgeSelectionFromParsed,
    hasCitationForKnowledge,
    isKnowledgeToolName,
    buildCitationReminder,
};
