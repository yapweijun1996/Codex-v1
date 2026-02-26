const { isRealtimeQuery, hasEvidenceToolActivitySince, getPendingPlanSteps } = require('./agent-tool-flow');
const { hasCitationForKnowledge, buildCitationReminder } = require('./knowledge-evidence');

function applyTurnGuards({
    agent,
    userInput,
    turnStartIndex,
    currentStepResponse,
    realtimeGuardCount,
    planGuardCount,
}) {
    const isRealtime = isRealtimeQuery(userInput);
    const hasToolActivity = hasEvidenceToolActivitySince(agent.history, turnStartIndex);
    const isEmptyAnswer = !currentStepResponse.content || !String(currentStepResponse.content).trim();

    if (isRealtime && !hasToolActivity && realtimeGuardCount < 2) {
        const nextCount = realtimeGuardCount + 1;
        const reminder = (nextCount === 1)
            ? 'Reminder: This request asks for real-time data. You MUST call the relevant tools before providing a final answer.'
            : 'Final reminder: Call the relevant tools for real-time data before responding.';
        agent.history.push({ role: 'user', content: reminder });
        agent.emit('realtime_tool_guard', {
            message: userInput,
            attempt: nextCount,
            emptyAnswer: isEmptyAnswer,
        });
        return { shouldContinue: true, realtimeGuardCount: nextCount, planGuardCount };
    }

    const selectedKnowledgeIds = (agent && agent._knowledgeSelectedIdSet instanceof Set)
        ? Array.from(agent._knowledgeSelectedIdSet)
        : [];
    if (selectedKnowledgeIds.length > 0) {
        const citationGuardCount = Number(agent && agent._citationGuardCount || 0);
        const hasCitation = hasCitationForKnowledge({
            text: currentStepResponse && currentStepResponse.content,
            knowledgeIds: selectedKnowledgeIds,
        });
        if (!hasCitation && citationGuardCount < 2) {
            const nextCount = citationGuardCount + 1;
            if (agent) agent._citationGuardCount = nextCount;
            agent.history.push({
                role: 'user',
                content: buildCitationReminder({ knowledgeIds: selectedKnowledgeIds }),
            });
            agent.emit('citation_guard', { attempt: nextCount, knowledgeIds: selectedKnowledgeIds });
            return { shouldContinue: true, realtimeGuardCount, planGuardCount };
        }
    }

    const pendingSteps = getPendingPlanSteps(agent.currentPlan);
    // If the user denied a gated tool in this turn, don't nag the model to "complete" pending plan steps.
    // Instead, let it revise the plan (e.g., mark blocked) and provide a partial answer.
    if (pendingSteps.length > 0 && planGuardCount < 1 && !(agent && agent._approvalDeniedThisTurn)) {
        const nextCount = planGuardCount + 1;
        agent.history.push({
            role: 'user',
            content: `Reminder: You have pending plan steps. Complete them (use tools) before final answer. Pending: ${pendingSteps.join(' | ')}`,
        });
        agent.emit('plan_completion_guard', { attempt: nextCount, pendingCount: pendingSteps.length });
        return { shouldContinue: true, realtimeGuardCount, planGuardCount: nextCount };
    }

    return { shouldContinue: false, realtimeGuardCount, planGuardCount };
}

module.exports = { applyTurnGuards };
