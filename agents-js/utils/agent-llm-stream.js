async function runLlmStreamStep({ agent, stream, turnCount, currentStepResponse, signal }) {
    let messageStarted = false;

    for await (const chunk of stream) {
        if (signal && signal.aborted) {
            const err = signal.reason instanceof Error ? signal.reason : new Error('Aborted');
            err.name = 'AbortError';
            throw err;
        }
        if (chunk.type === 'text') {
            if (!messageStarted) {
                agent.emit('assistant_message_started', { step: turnCount });
                messageStarted = true;
            }
            currentStepResponse.content += chunk.delta;
            agent.emit('agent_message_content_delta', {
                delta: chunk.delta,
                step: turnCount,
            });
        } else if (chunk.type === 'tool_calls') {
            currentStepResponse.tool_calls.push(...chunk.tool_calls);
        }
    }

    return currentStepResponse;
}

module.exports = { runLlmStreamStep };
