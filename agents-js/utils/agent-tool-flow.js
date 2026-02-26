const { buildSyntheticToolPlan } = require('./agent-tool-runner');
const { applyUsageToEntry, buildTokenUsageInfo } = require('./agent-usage');
const { bumpPromptTokenLedger } = require('./budget-governor');
const { emitDecisionTrace } = require('./decision-trace');
const {
    buildMemoryQueries,
    countSuccessfulEvidenceTools,
    detectApprovalBlock,
    formatApprovalBlockedHint,
    formatMemoryResult,
    getPendingPlanSteps,
    hasAnyTurnEvidence,
    hasMemoryToolActivitySince,
    hasEvidenceToolActivitySince,
    hasToolActivitySince,
    hasWebSearchToolRequested,
    isEmptyMemorySearchResult,
    isPersonalMemoryQuery,
    isRealtimeQuery,
    parseToolResultContent,
} = require('./agent-tool-flow-helpers');
const { buildAutoSavePayload, shouldAutoSave } = require('./rag/rag-autosave-policy');
const { recordKnowledgeSelections } = require('./agent-knowledge-selection');

function hasMemoryTools(agent) {
    if (!agent || !agent.tools) return false;
    const tools = agent.tools;
    return Boolean(
        tools.memory_search
        || tools.kb_search
        || tools.memory__search_nodes
        || tools.memory_read_graph
        || tools.memory__read_graph
    );
}

async function maybeAutoMemoryLookup({ agent, userInput }) {
    if (!agent || !hasMemoryTools(agent)) return false;
    const preferRagSearch = Boolean(agent.ragConfig && agent.ragConfig.enabled && agent.tools.memory_search);
    if (!preferRagSearch && !isPersonalMemoryQuery(userInput)) return false;

    const directSearchTool = agent.tools.memory_search;
    const kbSearchTool = agent.tools.kb_search;
    const searchTool = agent.tools['memory__search_nodes'];
    const readTool = agent.tools.memory_read_graph || agent.tools['memory__read_graph'];
    if (!kbSearchTool && !directSearchTool && !searchTool && !readTool) return false;

    const queries = buildMemoryQueries(userInput);
    if (!preferRagSearch && queries.length === 0) return false;

    let searchHit = false;
    let lastResult = null;
    const makeCallId = (idx) => `auto_mem_${Date.now()}_${idx}`;
    const recordAutoKnowledgeSelections = (toolCall, toolResults) => {
        if (!toolCall || !Array.isArray(toolResults) || toolResults.length === 0) return;
        recordKnowledgeSelections({
            agent,
            toolCalls: [toolCall],
            toolResults,
            turnCount: null,
        });
    };

    if (preferRagSearch) {
        const topK = agent.ragConfig && Number.isFinite(Number(agent.ragConfig.topK))
            ? Number(agent.ragConfig.topK)
            : 5;
        const minScoreBase = agent.ragConfig && Number.isFinite(Number(agent.ragConfig.minScore))
            ? Number(agent.ragConfig.minScore)
            : 0.2;
        const minScore = Math.max(minScoreBase, 0.35);

        if (kbSearchTool) {
            const kbCall = {
                id: makeCallId('kb'),
                name: 'kb_search',
                arguments: JSON.stringify({
                    query: userInput,
                    topK,
                    minScore,
                }),
            };
            const kbResults = await agent._executeTools([kbCall]);
            recordAutoKnowledgeSelections(kbCall, kbResults);
            const kbParsed = parseToolResultContent(kbResults[0]);
            lastResult = kbParsed;
            if (kbParsed && kbParsed.structuredContent && Array.isArray(kbParsed.structuredContent.hits) && kbParsed.structuredContent.hits.length > 0) {
                searchHit = true;
            }
        }

        if (!searchHit && directSearchTool) {
            const ragCall = {
                id: makeCallId('rag'),
                name: 'memory_search',
                arguments: JSON.stringify({
                    query: userInput,
                    topK,
                    minScore,
                    scope: 'all',
                }),
            };
            const results = await agent._executeTools([ragCall]);
            recordAutoKnowledgeSelections(ragCall, results);
            const parsed = parseToolResultContent(results[0]);
            lastResult = parsed;
            if (parsed && parsed.structuredContent && Array.isArray(parsed.structuredContent.hits) && parsed.structuredContent.hits.length > 0) {
                searchHit = true;
            }
        }
    }

    for (let i = 0; i < queries.length; i += 1) {
        if (searchHit) break;
        if (!searchTool) break;
        const call = {
            id: makeCallId(i),
            name: 'memory__search_nodes',
            arguments: JSON.stringify({ query: queries[i] }),
        };
        const results = await agent._executeTools([call]);
        recordAutoKnowledgeSelections(call, results);
        const parsed = parseToolResultContent(results[0]);
        lastResult = parsed;
        if (parsed && !isEmptyMemorySearchResult(parsed)) {
            searchHit = true;
            break;
        }
    }

    if (!searchHit && readTool) {
        const readCall = {
            id: makeCallId('read'),
            name: 'memory__read_graph',
            arguments: JSON.stringify({}),
        };
        const results = await agent._executeTools([readCall]);
        lastResult = parseToolResultContent(results[0]);
    }

    const summary = formatMemoryResult(lastResult);
    if (summary) {
        agent.history.push({ role: 'user', content: `Memory lookup (auto):\n${summary}` });
    } else {
        agent.history.push({ role: 'user', content: 'Memory lookup (auto): no results found.' });
    }

    return true;
}

async function maybeAutoMemorySave({ agent, userInput }) {
    if (!agent || !agent.tools || !agent.tools.memory_save) return false;
    if (!shouldAutoSave(agent)) return false;

    const payload = buildAutoSavePayload({ userInput });
    if (!payload) return false;

    const call = {
        id: `auto_mem_save_${Date.now()}`,
        name: 'memory_save',
        arguments: JSON.stringify(payload),
    };
    const results = await agent._executeTools([call]);
    const parsed = parseToolResultContent(results[0]);
    if (!parsed || !parsed.structuredContent || parsed.structuredContent.ok !== true) return false;

    agent.history.push({
        role: 'user',
        content: `Memory autosave (auto): saved id=${parsed.structuredContent.id}`,
    });
    return true;
}

async function handleToolCalls({ agent, currentStepResponse, turnCount }) {
    if (!currentStepResponse.tool_calls || currentStepResponse.tool_calls.length === 0) {
        return { handled: false };
    }

    const hasMemoryCapability = hasMemoryTools(agent);
    const webSearchRequested = hasWebSearchToolRequested(currentStepResponse.tool_calls);
    const memoryAlreadyChecked = hasMemoryToolActivitySince(agent.history, agent && agent._turnStartIndex);
    const memoryFirstEnabled = Boolean(agent && agent.ragConfig && agent.ragConfig.memoryFirst === true);
    const shouldGuardMemoryFirst = (
        memoryFirstEnabled
        && hasMemoryCapability
        && webSearchRequested
        && !memoryAlreadyChecked
    );
    if (shouldGuardMemoryFirst) {
        const guardCount = Number(agent._memoryFirstGuardCount || 0);
        if (guardCount < 2) {
            agent._memoryFirstGuardCount = guardCount + 1;
            agent.history.push({
                role: 'user',
                content: 'Policy reminder: Call kb_search or memory_search first. Use web search only if local JSONL/memory evidence is insufficient.',
            });
            if (typeof agent.emit === 'function') {
                agent.emit('memory_first_guard', {
                    attempt: agent._memoryFirstGuardCount,
                    tools: currentStepResponse.tool_calls.map((tc) => (tc && tc.name ? String(tc.name) : '')).filter(Boolean),
                });
            }
            return { handled: true };
        }
    }

    if (!currentStepResponse.content) {
        const synthetic = buildSyntheticToolPlan(currentStepResponse.tool_calls);
        emitDecisionTrace(agent, synthetic, turnCount);
        agent.emit('assistant_message_started', { step: turnCount });
        agent.emit('agent_message_content_delta', { delta: synthetic, step: turnCount });
        agent.history.push({ role: 'assistant', content: synthetic });
    }

    const assistantEntry = {
        role: 'assistant',
        content: currentStepResponse.content || null,
        tool_calls: currentStepResponse.tool_calls,
    };
    const applied = applyUsageToEntry(assistantEntry, currentStepResponse._usage);
    agent.history.push(assistantEntry);
    if (applied) {
        bumpPromptTokenLedger(agent, assistantEntry._tokenUsagePrompt);
        agent.emit('token_count', buildTokenUsageInfo(agent.history));
    }

    const toolResults = await agent._executeTools(currentStepResponse.tool_calls);
    agent.history.push(...toolResults);
    recordKnowledgeSelections({
        agent,
        toolCalls: currentStepResponse.tool_calls,
        toolResults,
        turnCount,
    });

    const approvalBlocked = detectApprovalBlock(toolResults);
    if (approvalBlocked) {
        if (agent) agent._approvalDeniedThisTurn = true;
        let maxRisk = 0;
        if (agent && agent.tools) {
            for (const b of approvalBlocked) {
                const t = b && b.tool ? agent.tools[b.tool] : null;
                const r = t && typeof t.risk === 'number' ? t.risk : 2;
                if (r > maxRisk) maxRisk = r;
            }
        }

        if (maxRisk >= 2) {
            const tools = approvalBlocked.map((b) => b.tool).filter(Boolean).join(', ');
            const reason = approvalBlocked[0] && approvalBlocked[0].error ? approvalBlocked[0].error : 'ApprovalDenied';
            const successCount = countSuccessfulEvidenceTools({ toolResults });
            const turnEvidence = hasAnyTurnEvidence({ history: agent && agent.history, startIndex: agent && agent._turnStartIndex });
            if (agent && typeof agent.emit === 'function') {
                agent.emit('approval_blocked', {
                    tools: approvalBlocked,
                    reason,
                    successCount,
                    turnEvidence,
                    timestamp: new Date().toISOString(),
                });
            }
            if (successCount === 0 && !turnEvidence) {
                const message = `I can't continue because approval was not granted for tool(s): ${tools}.\n\nIf you want me to use those tools, please approve. Otherwise, tell me what assumptions/region you want and I can give a best-effort, non-verified answer.`;
                return { handled: true, stopTurn: true, stopReason: reason, message };
            }

            if (agent && Array.isArray(agent.history)) {
                if (!agent._approvalDenyHints) agent._approvalDenyHints = new Set();
                const key = `${reason}:${tools}`;
                if (!agent._approvalDenyHints.has(key)) {
                    agent._approvalDenyHints.add(key);
                    agent.history.push({ role: 'user', content: formatApprovalBlockedHint(approvalBlocked) });
                }
            }
        }
    }

    return { handled: true };
}

module.exports = {
    handleToolCalls,
    isRealtimeQuery,
    hasToolActivitySince,
    hasEvidenceToolActivitySince,
    getPendingPlanSteps,
    maybeAutoMemoryLookup,
    maybeAutoMemorySave,
};
