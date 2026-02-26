export function isGeminiClientBadRequest(error) {
    const status = Number(error && (error.status || error.code || (error.response && error.response.status)));
    if (status === 400) return true;
    const msg = String(error && error.message || error || '');
    return /\b400\b/.test(msg) || /invalid[_\s-]?argument/i.test(msg);
}

export async function* emitFallbackFromChat(llm, systemPrompt, history) {
    const fallback = await llm.chat(systemPrompt, history);
    if (fallback && typeof fallback.content === 'string' && fallback.content) {
        yield { type: 'text', delta: fallback.content };
    }
    if (fallback && Array.isArray(fallback.tool_calls) && fallback.tool_calls.length > 0) {
        yield { type: 'tool_calls', tool_calls: fallback.tool_calls };
    }
}
