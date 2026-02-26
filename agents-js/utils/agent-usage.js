function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function normalizeUsage(usage) {
    if (!usage || typeof usage !== 'object') return null;
    const input = toNumber(usage.input_tokens ?? usage.promptTokenCount ?? usage.prompt_tokens);
    const cachedInput = toNumber(
        usage.cached_input_tokens ?? usage.cachedContentTokenCount ?? usage.cached_prompt_tokens ?? usage.cachedPromptTokens
    );
    const output = toNumber(
        usage.output_tokens ?? usage.candidatesTokenCount ?? usage.completionTokenCount ?? usage.completion_tokens
    );
    const reasoningOutput = toNumber(
        usage.reasoning_output_tokens ?? usage.reasoningTokenCount ?? usage.thoughtsTokenCount ?? usage.reasoning_tokens
    );
    const total = toNumber(usage.total_tokens ?? usage.totalTokenCount ?? usage.total_tokens);
    if (input === null && cachedInput === null && output === null && reasoningOutput === null && total === null) return null;
    return {
        input,
        cachedInput,
        output,
        reasoningOutput,
        total,
    };
}

function applyUsageToEntry(entry, usage) {
    if (!entry || typeof entry !== 'object') return false;
    const normalized = normalizeUsage(usage);
    if (!normalized) return false;
    if (normalized.input !== null) entry._tokenUsagePrompt = normalized.input;
    if (normalized.cachedInput !== null) entry._tokenUsageCachedInput = normalized.cachedInput;
    if (normalized.output !== null) entry._tokenUsageCompletion = normalized.output;
    if (normalized.reasoningOutput !== null) entry._tokenUsageReasoningOutput = normalized.reasoningOutput;
    if (normalized.total !== null) entry._tokenUsageTotal = normalized.total;
    return true;
}

function getUsageFromEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const input = toNumber(entry._tokenUsagePrompt);
    const cachedInput = toNumber(entry._tokenUsageCachedInput);
    const output = toNumber(entry._tokenUsageCompletion);
    const reasoningOutput = toNumber(entry._tokenUsageReasoningOutput);
    let total = toNumber(entry._tokenUsageTotal);
    if (total === null && (input !== null || output !== null)) {
        total = (input || 0) + (output || 0);
    }
    if (input === null && cachedInput === null && output === null && reasoningOutput === null && total === null) {
        return null;
    }
    return {
        input_tokens: input || 0,
        cached_input_tokens: cachedInput || 0,
        output_tokens: output || 0,
        reasoning_output_tokens: reasoningOutput || 0,
        total_tokens: total || 0,
    };
}

function getTotalUsageFromHistory(history) {
    if (!Array.isArray(history)) return null;
    let totalInput = 0;
    let totalCachedInput = 0;
    let totalOutput = 0;
    let totalReasoningOutput = 0;
    let totalTokens = 0;
    let hasAny = false;

    for (const entry of history) {
        const usage = getUsageFromEntry(entry);
        if (!usage) continue;
        hasAny = true;
        totalInput += usage.input_tokens;
        totalCachedInput += usage.cached_input_tokens;
        totalOutput += usage.output_tokens;
        totalReasoningOutput += usage.reasoning_output_tokens;
        totalTokens += usage.total_tokens;
    }

    if (!hasAny) return null;
    if (!totalTokens && (totalInput || totalOutput)) {
        totalTokens = totalInput + totalOutput;
    }
    return {
        input_tokens: totalInput,
        cached_input_tokens: totalCachedInput,
        output_tokens: totalOutput,
        reasoning_output_tokens: totalReasoningOutput,
        total_tokens: totalTokens,
    };
}

function buildTokenUsageInfo(history, modelContextWindow = null) {
    const lastUsage = Array.isArray(history) && history.length > 0
        ? getUsageFromEntry(history[history.length - 1])
        : null;
    const totalUsage = getTotalUsageFromHistory(history);
    return {
        info: {
            total_token_usage: totalUsage || null,
            last_token_usage: lastUsage || null,
            model_context_window: modelContextWindow,
        },
        rate_limits: null,
    };
}

module.exports = {
    applyUsageToEntry,
    getUsageFromEntry,
    getTotalUsageFromHistory,
    buildTokenUsageInfo,
};
