const { buildCompletionData } = require('./agent-completion');
const { buildEnvironmentContext } = require('./agent-interaction');

function buildDebugLogger(agent) {
    return (...args) => {
        if (!agent.debug) return;
        console.log('[Debug]', ...args);
    };
}

function resetTurnState(agent) {
    agent.currentPlan = null;
    agent._decisionTraces = [];
    agent._pendingInputs = [];
    agent._toolFailureStreak = new Map();
    agent._approvalGrants.clear();
    agent._approvalDenies.clear();
    agent._approvalDeniedThisTurn = false;
    agent._memoryFirstGuardCount = 0;
    agent._citationGuardCount = 0;
    if (agent._approvalDenyHints) agent._approvalDenyHints.clear();
    if (Array.isArray(agent._knowledgeSelectedThisTurn)) agent._knowledgeSelectedThisTurn.length = 0;
    else agent._knowledgeSelectedThisTurn = [];
    if (agent._knowledgeSelectedIdSet instanceof Set) agent._knowledgeSelectedIdSet.clear();
    else agent._knowledgeSelectedIdSet = new Set();
    const turnStartIndex = agent.history.length;
    agent._turnStartIndex = turnStartIndex;
    return turnStartIndex;
}

function startAgentTurn(agent, userInput) {
    console.log(`\n--- [Agent] Starting Turn: "${userInput}" ---`);
    const dbg = buildDebugLogger(agent);
    const turnStartIndex = resetTurnState(agent);

    agent.emit('start', { message: userInput });
    agent.emit('turn_started', {
        message: userInput,
        timestamp: new Date().toISOString()
    });

    agent.history.push({ role: 'user', content: buildEnvironmentContext() });
    agent.history.push({ role: 'user', content: userInput });
    agent._setState('thinking', { input: userInput, step: 0 });

    return { dbg, turnStartIndex };
}

function finalizeAgentTurn({ agent, finalResponseText, turnCount, maxTurns, dbg }) {
    agent._setState('idle', { finalResponse: finalResponseText || null, turnCount });
    agent.emit('autosave', agent.dumpSnapshot());
    agent._turnStartIndex = null;

    const completionData = buildCompletionData({
        history: agent.history,
        finalResponseText,
        turnCount,
    });

    agent.emit('done', completionData);
    agent.emit('agent_turn_complete', completionData);

    if (!finalResponseText) {
        dbg('Turn limit reached', {
            turnCount,
            maxTurns,
            historyLength: agent.history.length,
        });
    }

    return finalResponseText || "Agent failed to produce a response within turn limit.";
}

module.exports = { startAgentTurn, finalizeAgentTurn };
