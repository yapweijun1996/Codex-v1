function truncateText(text, maxChars) {
    const s = String(text || '');
    const n = (typeof maxChars === 'number' && Number.isFinite(maxChars) && maxChars > 0)
        ? Math.floor(maxChars)
        : 8000;
    if (s.length <= n) return s;
    return s.slice(0, n) + '\n... (truncated)';
}

export function buildPrompt(systemPrompt, history) {
    const lines = [];
    if (systemPrompt) lines.push(String(systemPrompt).trim());
    for (const msg of (Array.isArray(history) ? history : [])) {
        if (!msg || typeof msg !== 'object') continue;
        const role = String(msg.role || '').toLowerCase();
        if (role === 'user') {
            lines.push(`User: ${String(msg.content || '')}`);
        } else if (role === 'assistant') {
            const text = msg.content == null ? '' : String(msg.content);
            lines.push(`Assistant: ${text}`);
        } else if (role === 'system' || role === 'tool') {
            const name = msg.name ? String(msg.name) : 'tool';
            const content = truncateText(msg.content, 6000);
            lines.push(`Tool(${name}) result: ${content}`);
        }
    }

    return lines.filter(Boolean).join('\n\n').trim();
}
