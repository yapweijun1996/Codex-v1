const { estimateTokens } = require('./context-manager');
const { safeJsonStringify } = require('./self-heal');

function dumpSnapshot(agent) {
    const toolFailureStreak = agent._toolFailureStreak instanceof Map
        ? Object.fromEntries(agent._toolFailureStreak.entries())
        : {};

    return {
        version: '1.0',
        timestamp: new Date().toISOString(),
        status: agent.status,
        systemPrompt: agent.systemPrompt,
        history: agent.history,
        currentPlan: agent.currentPlan,
        decisionTraces: Array.isArray(agent._decisionTraces) ? agent._decisionTraces : [],
        toolFailureStreak,
    };
}

function loadSnapshot(agent, snapshot, { emitPlanEvent = true } = {}) {
    if (!snapshot || typeof snapshot !== 'object') return false;

    if (Array.isArray(snapshot.history)) {
        agent.history = snapshot.history;
    }

    if (typeof snapshot.systemPrompt === 'string') {
        agent.systemPrompt = snapshot.systemPrompt;
    }

    agent.currentPlan = Array.isArray(snapshot.currentPlan) ? snapshot.currentPlan : snapshot.currentPlan || null;
    agent.status = typeof snapshot.status === 'string' ? snapshot.status : 'idle';

    if (snapshot.toolFailureStreak && typeof snapshot.toolFailureStreak === 'object') {
        agent._toolFailureStreak = new Map(Object.entries(snapshot.toolFailureStreak));
    }

    agent._decisionTraces = Array.isArray(snapshot.decisionTraces) ? snapshot.decisionTraces : [];

    if (emitPlanEvent && agent.currentPlan) {
        agent.emit('plan_updated', { explanation: 'Snapshot restored', plan: agent.currentPlan });
    }

    return true;
}

function setState(agent, status, metadata = {}) {
    const previous = agent.status;
    const snapshot = {
        ...metadata,
        historyLength: agent.history.length,
        estimatedTokens: estimateTokens(agent.history),
    };
    const metaString = safeJsonStringify(snapshot);
    if (previous === status && metaString === agent._lastStateMeta) return;

    agent.status = status;
    agent._lastStateMeta = metaString;
    agent.emit('state_changed', {
        status,
        previous,
        metadata: snapshot,
        timestamp: new Date().toISOString(),
    });
}

function getState(agent) {
    return {
        status: agent.status,
        currentPlan: agent.currentPlan,
        historyLength: agent.history.length,
        estimatedTokens: estimateTokens(agent.history),
    };
}

module.exports = {
    dumpSnapshot,
    loadSnapshot,
    setState,
    getState,
};
