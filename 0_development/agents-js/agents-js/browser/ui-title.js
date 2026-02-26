export async function maybeGenerateTitle({
    agent,
    sessionId,
    userMessage,
    assistantResponse,
    setTitle,
} = {}) {
    if (!agent || !sessionId) return;
    if (typeof setTitle !== 'function') return;

    try {
        const prompt = `Summarize this conversation into a short, concise title (max 5 words).
Return ONLY the title text, no quotes or punctuation.
User: ${userMessage}
Assistant: ${assistantResponse}`;

        const result = await agent.llm.chat([{ role: 'user', content: prompt }], {
            temperature: 0.3,
        });

        const title = result && result.content ? String(result.content).trim() : '';
        if (title && title.length < 50) {
            await setTitle(sessionId, title);
        }
    } catch (err) {
        console.warn('Failed to generate title:', err);
    }
}

