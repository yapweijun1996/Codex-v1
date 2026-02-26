const getUsageElement = () => document.getElementById('tokenUsageText');

const formatUsage = (usageInfo) => {
    if (!usageInfo || typeof usageInfo !== 'object') return '—';
    const last = usageInfo.last_token_usage || null;
    const total = usageInfo.total_token_usage || null;
    const lastTotal = last && last.total_tokens != null ? last.total_tokens : null;
    const totalTotal = total && total.total_tokens != null ? total.total_tokens : null;
    if (lastTotal != null && totalTotal != null) return `last ${lastTotal} · total ${totalTotal}`;
    if (totalTotal != null) return `total ${totalTotal}`;
    if (lastTotal != null) return `last ${lastTotal}`;
    return '—';
};

export function setTokenUsage(usageInfo) {
    const el = getUsageElement();
    if (!el) return;
    el.textContent = formatUsage(usageInfo);
}
