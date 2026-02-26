export function createDeferredAssistantStream({
    createStreamingAssistantMessage,
    removeLoading,
    delayMs = 200,
    maxBufferedChars = 600,
} = {}) {
    let stream = null;
    let buffer = '';
    let thoughtDraft = '';
    let timer = null;

    const clearTimer = () => {
        if (!timer) return;
        clearTimeout(timer);
        timer = null;
    };

    const commit = (force = false) => {
        if (stream) return;
        if (!buffer && !force) return;
        clearTimer();
        if (typeof removeLoading === 'function') removeLoading();
        stream = createStreamingAssistantMessage();
        if (buffer) {
            stream.append(buffer);
            buffer = '';
        }
    };

    const discard = () => {
        clearTimer();
        buffer = '';
        if (stream && typeof stream.discard === 'function') stream.discard();
        stream = null;
    };

    const buildFinalText = (draft, answer) => {
        // Legacy helper, not used with new finalizeWithFinal logic inside ui-dom-messages
        const thought = String(draft || '').trim();
        const finalAnswer = String(answer || '').trim();
        if (thought && finalAnswer) return `Thought: (draft/unverified)\n${thought}\n\n${finalAnswer}`;
        if (thought) return `Thought: (draft/unverified)\n${thought}`;
        return finalAnswer;
    };

    const drainDraft = () => {
        clearTimer();
        // Since we are always streaming into thoughtBuffer in the DOM component,
        // we just return empty here because the state is held in the DOM component.
        // We rely on finalizeWithFinal to stitch things together.
        if (stream && typeof stream.promoteToThought === 'function') {
            // Just ensure it's in thought mode, return current buffer?
            // Actually, we don't need to extract it anymore.
            return '';
        }
        return '';
    };

    return {
        onChunk(delta) {
            const text = String(delta || '');
            if (!text) return;

            if (stream) {
                stream.append(text);
                return;
            }

            buffer += text;
            if (buffer.length >= maxBufferedChars) {
                commit();
                return;
            }
            if (!timer) timer = setTimeout(commit, delayMs);
        },
        onToolCall() {
            clearTimer();
            // Ensure the thought bubble exists even if no text was streamed yet.
            commit(true);
            if (stream && typeof stream.promoteToThought === 'function') {
                // In new logic, we are ALREADY in thought mode.
                // Just trigger a UI refresh or status update if needed.
                stream.promoteToThought('');
            }
            return '';
        },
        appendThought(text) {
            if (stream && typeof stream.appendThought === 'function') {
                stream.appendThought(text);
                return;
            }
            // If buffering, append to buffer but mark as thought?
            // For simplicity, commit immediately if we have system logs.
            if (!stream) commit(true);
            if (stream) stream.appendThought(text);
        },
        onStepBoundaryChanged() {
            clearTimer();
        },
        finalizeOrRenderFinal({ addMessage, finalResponse }) {
            clearTimer();
            if (stream) {
                if (typeof stream.finalizeWithFinal === 'function') {
                    stream.finalizeWithFinal({ finalResponse });
                } else {
                    stream.finalize();
                }
                stream = null;
                buffer = '';
                thoughtDraft = '';
                return;
            }
            
            // If we never started streaming (short answer), just render directly
            if (buffer || finalResponse) {
                if (typeof removeLoading === 'function') removeLoading();
                // If we have a buffer, it's technically a "thought" in our new paradigm
                // unless it was a super fast final answer.
                
                // UX Decision: If it's a direct final response without tools, 
                // do we wrap it in thought?
                // Answer: No, keep it simple.
                
                if (typeof addMessage === 'function') {
                     // If we have buffer but no stream, it means we buffered but didn't commit.
                     // It's likely just the answer.
                     const text = finalResponse || buffer;
                     addMessage('assistant', text);
                }
                buffer = '';
                thoughtDraft = '';
                return;
            }
        },
        drainDraft,
    };
}
