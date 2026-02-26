function normalizeVector(values) {
    if (!Array.isArray(values) || values.length === 0) return [];
    const out = values.map((n) => Number(n));
    let norm = 0;
    for (const n of out) {
        if (!Number.isFinite(n)) return [];
        norm += n * n;
    }
    if (!Number.isFinite(norm) || norm <= 0) return out.map(() => 0);
    const scale = 1 / Math.sqrt(norm);
    return out.map((n) => n * scale);
}

function cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return -1;
    if (a.length === 0 || b.length === 0) return -1;
    if (a.length !== b.length) return -1;

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

function topKByScore(items, topK, minScore) {
    const list = Array.isArray(items) ? items.slice() : [];
    const k = Number.isFinite(topK) && topK > 0 ? Math.floor(topK) : 5;
    const cutoff = Number.isFinite(minScore) ? Number(minScore) : -1;
    return list
        .filter((item) => item && Number.isFinite(Number(item.score)) && Number(item.score) >= cutoff)
        .sort((a, b) => Number(b.score) - Number(a.score))
        .slice(0, k);
}

module.exports = {
    cosineSimilarity,
    normalizeVector,
    topKByScore,
};
