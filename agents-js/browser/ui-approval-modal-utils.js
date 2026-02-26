function formatRemaining(ms) {
    const safe = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function truncateText(value, maxLen) {
    const s = String(value == null ? '' : value);
    const n = Number(maxLen);
    if (!Number.isFinite(n) || n <= 0) return s;
    if (s.length <= n) return s;
    return `${s.slice(0, Math.max(0, n - 3))}...`;
}

function riskLabelFromNumber(riskNum) {
    return riskNum === 3
        ? 'Tier 3 (High Risk)'
        : riskNum === 2
            ? 'Tier 2 (Business Critical)'
            : riskNum === 1
                ? 'Tier 1 (Reversible)'
                : riskNum === 0
                    ? 'Tier 0 (Read-only)'
                    : 'Unknown Risk';
}

export {
    formatRemaining,
    truncateText,
    riskLabelFromNumber,
};
