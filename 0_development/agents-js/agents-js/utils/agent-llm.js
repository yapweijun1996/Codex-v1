const { runLlmStreamStep } = require('./agent-llm-stream');
const { emitDecisionTrace, canExtractDecisionTrace, emitToolCallDecisionTrace } = require('./decision-trace');
const { getToolIntent, getToolRisk } = require('./agent-tools-registry');

function tryParseToolArgs(raw) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'object') return raw;
    if (typeof raw !== 'string') return { _raw: String(raw) };
    try {
        return JSON.parse(raw);
    } catch {
        return { _raw: raw };
    }
}

function hasMissingThoughtSignature(toolCalls) {
    return toolCalls.some((tc) => tc && !(tc.thought_signature || tc.thoughtSignature));
}

async function runLlmStep({ agent, llm, systemPrompt, llmHistory, turnCount, signal }) {
    let currentStepResponse = { content: '', tool_calls: [] };
    let usedStreaming = false;

    if (signal && signal.aborted) {
        const err = signal.reason instanceof Error ? signal.reason : new Error('Aborted');
        err.name = 'AbortError';
        throw err;
    }

    if (typeof llm.chatStream === 'function') {
        const stream = llm.chatStream(systemPrompt, llmHistory, { signal });
        currentStepResponse = await runLlmStreamStep({
            agent,
            stream,
            turnCount,
            currentStepResponse,
            signal,
        });
        usedStreaming = true;
    } else {
        const response = await llm.chat(systemPrompt, llmHistory, { signal });
        currentStepResponse = response;
        if (response && response.usage) currentStepResponse._usage = response.usage;

        // Non-streaming responses are emitted only at turn completion.
        // This avoids duplicated UI output when guards cause multiple LLM retries.

    }

    const retryToolCalls = async () => {
        if (!usedStreaming || typeof llm.chat !== 'function') return;
        const toolCalls = Array.isArray(currentStepResponse.tool_calls) ? currentStepResponse.tool_calls : [];
        if (toolCalls.length === 0 || !hasMissingThoughtSignature(toolCalls)) return;

        try {
            const retry = await llm.chat(systemPrompt, llmHistory, { signal });
            if (retry && retry.usage) currentStepResponse._usage = retry.usage;
            if (retry && Array.isArray(retry.tool_calls) && retry.tool_calls.length > 0) {
                currentStepResponse.tool_calls = retry.tool_calls;
            }
        } catch {
            // Keep streaming result if retry fails.
        }
    };

    await retryToolCalls();

    const content = currentStepResponse && typeof currentStepResponse.content === 'string'
        ? currentStepResponse.content
        : '';
    const toolCalls = currentStepResponse && Array.isArray(currentStepResponse.tool_calls)
        ? currentStepResponse.tool_calls
        : [];

    if (signal && signal.aborted) {
        const err = signal.reason instanceof Error ? signal.reason : new Error('Aborted');
        err.name = 'AbortError';
        throw err;
    }

    if (content) {
        emitDecisionTrace(agent, content, turnCount);
    }
    // Avoid double decision traces for tool-only steps: agent-tool-flow will emit
    // a synthetic Thought/Plan when content is empty.
    if (toolCalls.length > 0 && content && !canExtractDecisionTrace(content)) {
        emitToolCallDecisionTrace(agent, toolCalls, turnCount);
    }

    if (toolCalls.length > 0) {
        const enriched = toolCalls.map((tc) => {
            const toolName = tc && tc.name ? String(tc.name) : '';
            const args = tryParseToolArgs(tc && tc.arguments);
            const intent = getToolIntent(agent, toolName, args);
            const risk = getToolRisk(agent, toolName, tc);
            return {
                ...tc,
                intent: intent || undefined,
                risk,
            };
        });
        agent.emit('tool_call', {
            tools: toolCalls.map(tc => tc.name),
            details: enriched,
        });
    }

    return currentStepResponse;
}

module.exports = { runLlmStep };
