const { ContextManager } = require('./context-manager');
const { registerTools } = require('./agent-tools-registry');
const { DEFAULT_TOOL_TIMEOUT_MS, DEFAULT_APPROVAL_TIMEOUT_MS } = require('./self-heal');
const { getAgentConfig } = require('./config');
const { RiskLevel, normalizeRiskLevel } = require('./imda-constants');

function normalizeRagConfigLite(input) {
    const raw = (input && typeof input === 'object') ? input : {};
    return {
        enabled: raw.enabled !== false,
        topK: Number.isFinite(Number(raw.topK)) ? Math.max(1, Math.floor(Number(raw.topK))) : 5,
        minScore: Number.isFinite(Number(raw.minScore)) ? Number(raw.minScore) : 0.2,
        maxContextChars: Number.isFinite(Number(raw.maxContextChars)) ? Math.max(256, Math.floor(Number(raw.maxContextChars))) : 6000,
        autoSave: raw.autoSave !== false,
        memoryFirst: raw.memoryFirst === true,
        autoMemoryPrecheck: raw.autoMemoryPrecheck === true,
        fixedJsonlPaths: Array.isArray(raw.fixedJsonlPaths) ? raw.fixedJsonlPaths : [],
        episodicStoreNodePath: typeof raw.episodicStoreNodePath === 'string' ? raw.episodicStoreNodePath : '',
        browserStoreName: typeof raw.browserStoreName === 'string' ? raw.browserStoreName : 'agents_memory_v1',
    };
}

function initializeAgentState(agent, {
    llm,
    tools = [],
    systemPrompt = "You are a helpful AI assistant.",
    toolTimeoutMs,
    approvalTimeoutMs,
    approvalPolicy,
    trustedTools,
    toolOutputLimits,
    maxTurns,
    compaction,
    maxProtectedRecentMessages,
    identity,
    riskProfile,
    ragConfig,
    ragService,
} = {}) {
    agent.llm = llm;
    const { toolMap, registry } = registerTools(tools);
    agent.tools = toolMap;
    agent.toolRegistry = registry;
    agent.systemPrompt = systemPrompt;
    agent.history = [];
    agent.status = 'idle';
    agent.currentPlan = null;
    agent._decisionTraces = [];
    agent._pendingUserInputs = new Map();
    agent._pendingInputs = [];
    agent._activeTools = new Map();
    agent._lastStateMeta = null;

    const cfg = getAgentConfig({ agent: { maxTurns, compaction, toolOutputLimits, approvalPolicy, trustedTools } });
    agent.maxTurns =
        (typeof maxTurns === 'number' && Number.isFinite(maxTurns) && maxTurns > 0)
            ? Math.floor(maxTurns)
            : cfg.agent.maxTurns;
    agent.debug = Boolean(cfg.agent.debug);
    agent.compaction = cfg.agent.compaction || null;
    agent.maxProtectedRecentMessages =
        (typeof maxProtectedRecentMessages === 'number'
            && Number.isFinite(maxProtectedRecentMessages)
            && maxProtectedRecentMessages > 0)
            ? Math.floor(maxProtectedRecentMessages)
            : cfg.agent.maxProtectedRecentMessages;

    agent.toolTimeoutMs =
        (typeof toolTimeoutMs === 'number' && Number.isFinite(toolTimeoutMs) && toolTimeoutMs > 0)
            ? toolTimeoutMs
            : DEFAULT_TOOL_TIMEOUT_MS;

    agent.approvalTimeoutMs =
        (typeof approvalTimeoutMs === 'number' && Number.isFinite(approvalTimeoutMs) && approvalTimeoutMs > 0)
            ? approvalTimeoutMs
            : DEFAULT_APPROVAL_TIMEOUT_MS;

    agent.approvalPolicy = (cfg.agent && typeof cfg.agent.approvalPolicy === 'string')
        ? String(cfg.agent.approvalPolicy)
        : 'always';
    agent.trustedTools = (cfg.agent && Array.isArray(cfg.agent.trustedTools))
        ? cfg.agent.trustedTools.map((t) => String(t)).filter(Boolean)
        : [];

    agent.toolOutputLimits = (cfg.agent && cfg.agent.toolOutputLimits && typeof cfg.agent.toolOutputLimits === 'object')
        ? { ...cfg.agent.toolOutputLimits }
        : null;
    const mergedRag = {
        ...(cfg.agent && cfg.agent.rag && typeof cfg.agent.rag === 'object' ? cfg.agent.rag : null),
        ...(ragConfig && typeof ragConfig === 'object' ? ragConfig : null),
    };
    agent.ragConfig = normalizeRagConfigLite(mergedRag);
    agent.ragService = ragService || null;

    agent._toolFailureStreak = new Map();
    agent._approvalGrants = new Set();
    agent._approvalDenies = new Set();
    agent._approvalDeniedThisTurn = false;
    agent._approvalDenyHints = new Set();
    agent._memoryFirstGuardCount = 0;
    agent._citationGuardCount = 0;
    agent._knowledgeSelectedThisTurn = [];
    agent._knowledgeSelectedIdSet = new Set();
    agent._abortController = null;
    agent._abortReason = null;
    agent._traceCollector = null;

    const baseIdentity = { id: 'anonymous', tenantId: 'default', role: 'user' };
    const resolvedIdentity = (identity && typeof identity === 'object')
        ? { ...baseIdentity, ...identity }
        : baseIdentity;
    agent.identity = Object.freeze({ ...resolvedIdentity });

    const resolvedTier = normalizeRiskLevel(riskProfile && riskProfile.tier, RiskLevel.NONE);
    agent.riskProfile = Object.freeze({ tier: resolvedTier });

    agent.contextManager = new ContextManager();
}

module.exports = { initializeAgentState };
