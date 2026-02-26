/**
 * General text processing and sanitization utilities.
 * Pure JS; Node + Browser compatible.
 */

/**
 * Truncates text to a maximum number of characters.
 */
function truncateText(text, maxChars) {
    const s = typeof text === 'string' ? text : '';
    if (!Number.isFinite(maxChars) || maxChars <= 0) return s;
    if (s.length <= maxChars) return s;
    return s.slice(0, maxChars) + '...';
}

/**
 * Filters out instructional/rule lines from LLM-generated summaries to prevent policy leakage.
 */
function sanitizeSummaryText(text) {
    if (typeof text !== 'string') return '';
    const lines = text.split('\n');
    const filtered = lines.filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        const lower = trimmed.toLowerCase();
        if (lower.startsWith('rules:') || lower.startsWith('rule:')) return false;
        if (lower.includes('forbidden')) return false;
        if (lower.includes('do not')) return false;
        if (lower.includes('must')) return false;
        if (lower.includes('should')) return false;
        if (lower.includes('not listing')) return false;
        if (lower.includes('summary prompt')) return false;
        return true;
    });
    return filtered.join('\n').trim();
}

module.exports = {
    truncateText,
    sanitizeSummaryText,
};
