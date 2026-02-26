function extractFirstSentence(text) {
    if (typeof text !== 'string') return '';
    const trimmed = text.trim();
    if (!trimmed) return '';
    const match = trimmed.match(/^(.+?[.!?])\s/);
    return match ? match[1] : trimmed;
}

function sanitizeSummary(text, maxChars = 160) {
    const sentence = extractFirstSentence(text).replace(/\s+/g, ' ').trim();
    if (sentence.length <= maxChars) return sentence;
    return `${sentence.slice(0, maxChars)}...`;
}

function parseThought(content) {
    if (typeof content !== 'string') return '';
    const match = content.match(/(?:^|\n)\s*Thought:\s*(.+)/i);
    if (!match) return '';
    return sanitizeSummary(match[1]);
}

function parsePlanSteps(content) {
    if (typeof content !== 'string') return null;
    const lines = content.split('\n');
    const planIdx = lines.findIndex((line) => /^\s*Plan\s*:/i.test(line));
    if (planIdx < 0) return null;
    let count = 0;
    for (let i = planIdx + 1; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line) continue;
        if (/^\s*Action\s*:/i.test(line)) break;
        if (/^(\d+\.|[-*])\s+/.test(line)) count += 1;
    }
    return count > 0 ? count : null;
}

function buildDecisionTrace(content) {
    const thought = parseThought(content);
    const planSteps = parsePlanSteps(content);
    if (!thought && planSteps == null) return null;
    return { thought, planSteps };
}

function canExtractDecisionTrace(content) {
    return Boolean(buildDecisionTrace(content));
}

function emitToolCallDecisionTrace(agent, toolCalls, step) {
    if (!agent || typeof agent.emit !== 'function') return;
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) return;
    const names = Array.from(new Set(
        toolCalls
            .map((tc) => (tc && tc.name ? String(tc.name) : ''))
            .filter(Boolean)
    ));
    const label = names.length ? names.join(', ') : 'unknown_tool';
    const thought = sanitizeSummary(`Calling tools: ${label}.`, 160);
    agent.emit('decision_trace', {
        step,
        thought,
        planSteps: toolCalls.length,
        timestamp: new Date().toISOString(),
    });
}

function emitDecisionTrace(agent, content, step) {
    if (!agent || typeof agent.emit !== 'function') return;
    const trace = buildDecisionTrace(content);
    if (!trace) return;
    const entry = {
        step,
        thought: trace.thought || null,
        planSteps: trace.planSteps,
        timestamp: new Date().toISOString(),
    };
    if (Array.isArray(agent._decisionTraces)) {
        agent._decisionTraces.push(entry);
        if (agent._decisionTraces.length > 200) {
            agent._decisionTraces = agent._decisionTraces.slice(-200);
        }
    }
    agent.emit('decision_trace', {
        step: entry.step,
        thought: entry.thought,
        planSteps: entry.planSteps,
        timestamp: entry.timestamp,
    });
}

module.exports = { emitDecisionTrace, canExtractDecisionTrace, emitToolCallDecisionTrace };
