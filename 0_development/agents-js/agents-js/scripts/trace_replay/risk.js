'use strict';

function riskLabel(risk) {
    if (risk === 0) return 'Tier0';
    if (risk === 1) return 'Tier1';
    if (risk === 2) return 'Tier2';
    if (risk === 3) return 'Tier3';
    return '';
}

function computeRiskAggregate(items, { fallbackMaxRisk } = {}) {
    const list = Array.isArray(items) ? items : [];
    let maxRisk = (typeof fallbackMaxRisk === 'number' && Number.isFinite(fallbackMaxRisk))
        ? fallbackMaxRisk
        : null;
    let tier2 = 0;
    let tier3 = 0;
    for (const it of list) {
        const r = it && typeof it.risk === 'number' && Number.isFinite(it.risk) ? it.risk : null;
        if (r === null) continue;
        if (maxRisk === null || r > maxRisk) maxRisk = r;
        if (r === 2) tier2 += 1;
        if (r === 3) tier3 += 1;
    }
    return { maxRisk, tier2, tier3 };
}

function formatRiskAggregate(agg) {
    if (!agg) return '';
    const hasCounts = (agg.tier2 || 0) + (agg.tier3 || 0) > 0;
    const hasMax = typeof agg.maxRisk === 'number' && Number.isFinite(agg.maxRisk);
    if (!hasCounts && !hasMax) return '';
    if (!hasCounts && agg.maxRisk < 2) return '';
    const max = hasMax ? `max ${riskLabel(agg.maxRisk)}` : '';
    const counts = hasCounts ? `Tier2=${agg.tier2 || 0} Tier3=${agg.tier3 || 0}` : '';
    const bits = [max, counts].filter(Boolean).join('; ');
    return bits ? ` (${bits})` : '';
}

module.exports = { riskLabel, computeRiskAggregate, formatRiskAggregate };
