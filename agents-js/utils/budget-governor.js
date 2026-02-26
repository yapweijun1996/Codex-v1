function safeJsonParse(text) {
    if (typeof text !== 'string' || text.trim() === '') return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function classifyFailureBucket(parsed) {
    if (!parsed || parsed.isError !== true) return null;
    const error = String(parsed.error || parsed.errorType || parsed.message || '').toLowerCase();
    if (!error) return 'logic';
    if (error.includes('timeout') || error.includes('network') || error.includes('econn') || error.includes('fetch')) {
        return 'network';
    }
    return 'logic';
}

function countBudgetUsage(history, startIndex) {
    const arr = Array.isArray(history) ? history : [];
    const from = Number.isFinite(Number(startIndex)) ? Math.max(0, Number(startIndex)) : 0;
    let toolCalls = 0;
    let failures = 0;
    const failureBuckets = { network: 0, logic: 0 };

    for (let i = from; i < arr.length; i += 1) {
        const item = arr[i];
        if (!item || item.role !== 'system' || !item.name) continue;
        toolCalls += 1;
        const parsed = safeJsonParse(item.content);
        if (parsed && parsed.isError === true) {
            failures += 1;
            const bucket = classifyFailureBucket(parsed);
            if (bucket && Object.prototype.hasOwnProperty.call(failureBuckets, bucket)) {
                failureBuckets[bucket] += 1;
            }
        }
    }

    return { toolCalls, failures, failureBuckets };
}

function readPromptTokenLedger(agent) {
    const ledger = agent && agent._turnBudgetLedger && typeof agent._turnBudgetLedger === 'object'
        ? agent._turnBudgetLedger
        : null;
    if (!ledger) return 0;
    const promptTokens = Number(ledger.promptTokens || 0);
    return Number.isFinite(promptTokens) && promptTokens > 0 ? promptTokens : 0;
}

function bumpPromptTokenLedger(agent, promptTokens) {
    if (!agent || !Number.isFinite(Number(promptTokens))) return;
    const value = Number(promptTokens);
    if (value <= 0) return;
    if (!agent._turnBudgetLedger || typeof agent._turnBudgetLedger !== 'object') {
        agent._turnBudgetLedger = { promptTokens: 0, lastPromptSample: null };
    }
    const current = Number(agent._turnBudgetLedger.promptTokens || 0);
    const last = Number(agent._turnBudgetLedger.lastPromptSample);
    const hasLast = Number.isFinite(last) && last >= 0;
    const delta = hasLast
        ? (value >= last ? (value - last) : value)
        : value;
    agent._turnBudgetLedger.promptTokens = (Number.isFinite(current) ? current : 0) + Math.max(0, delta);
    agent._turnBudgetLedger.lastPromptSample = value;
}

function evaluateBudgetGovernor({ agent, turnStartIndex }) {
    const policy = agent && agent.runPolicy ? agent.runPolicy : null;
    const budget = policy && policy.budget ? policy.budget : null;
    if (!budget) return null;

    const usage = countBudgetUsage(agent && agent.history, turnStartIndex);
    usage.promptTokens = readPromptTokenLedger(agent);
    usage.promptTokensSource = 'turn_ledger';

    if (Number.isFinite(Number(budget.maxToolCalls)) && usage.toolCalls > Number(budget.maxToolCalls)) {
        return {
            exceeded: true,
            reason: 'tool_calls',
            usage,
            limit: Number(budget.maxToolCalls),
            message: `Soft budget fuse triggered: tool calls ${usage.toolCalls}/${Number(budget.maxToolCalls)} exceeded. Please narrow scope or increase policy.budget.maxToolCalls.`,
        };
    }

    if (Number.isFinite(Number(budget.maxFailures)) && usage.failures > Number(budget.maxFailures)) {
        return {
            exceeded: true,
            reason: 'failures',
            usage,
            limit: Number(budget.maxFailures),
            message: `Soft budget fuse triggered: tool failures ${usage.failures}/${Number(budget.maxFailures)} exceeded. Please revise input or increase policy.budget.maxFailures.`,
        };
    }

    if (Number.isFinite(Number(budget.maxPromptTokens)) && usage.promptTokens > Number(budget.maxPromptTokens)) {
        return {
            exceeded: true,
            reason: 'prompt_tokens',
            usage,
            limit: Number(budget.maxPromptTokens),
            message: `Soft budget fuse triggered: prompt tokens ${usage.promptTokens}/${Number(budget.maxPromptTokens)} exceeded. Please shorten context or increase policy.budget.maxPromptTokens.`,
        };
    }

    return { exceeded: false, reason: null, usage, limit: null, message: '' };
}

module.exports = {
    countBudgetUsage,
    bumpPromptTokenLedger,
    evaluateBudgetGovernor,
};
