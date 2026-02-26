const DEFAULT_EPISODIC_NODE_PATH = 'memory/episodic-memory.jsonl';
const RAG_DEFAULTS = Object.freeze({
    enabled: true,
    topK: 5,
    minScore: 0.2,
    maxContextChars: 6000,
    autoSave: true,
    memoryFirst: false,
    autoMemoryPrecheck: false,
    browserStoreName: 'agents_memory_v1',
});

const DEFAULT_CONFIG = {
    agent: {
        maxTurns: 50,
        maxProtectedRecentMessages: 12,
        debug: false,
        approvalPolicy: 'always',
        trustedTools: [],
        toolOutputLimits: null,
        compaction: {
            enabled: true,
            triggerMessages: 30,
            triggerTokens: null,
            keepRecentMessages: 8,
            maxSummaryChars: 20000,
            maxMessageChars: 2000,
            maxUserMessageTokens: 20000,
        },
        rag: {
            enabled: RAG_DEFAULTS.enabled,
            topK: RAG_DEFAULTS.topK,
            minScore: RAG_DEFAULTS.minScore,
            maxContextChars: RAG_DEFAULTS.maxContextChars,
            autoSave: RAG_DEFAULTS.autoSave,
            memoryFirst: RAG_DEFAULTS.memoryFirst,
            autoMemoryPrecheck: RAG_DEFAULTS.autoMemoryPrecheck,
            fixedJsonlPaths: [],
            episodicStoreNodePath: DEFAULT_EPISODIC_NODE_PATH,
            browserStoreName: RAG_DEFAULTS.browserStoreName,
        },
    },
};

const TOOL_OUTPUT_LIMIT_KEYS = ['maxStringChars', 'headChars', 'tailChars', 'maxArrayItems', 'maxObjectKeys', 'maxDepth'];
const APPROVAL_POLICY_VALUES = new Set(['always', 'unless_trusted', 'never']);

function normalizeApprovalPolicy(value) {
    if (typeof value !== 'string') return null;
    const v = value.trim().toLowerCase();
    return APPROVAL_POLICY_VALUES.has(v) ? v : null;
}

function normalizeStringList(input) {
    if (!input) return [];
    if (Array.isArray(input)) {
        const out = input.map((v) => (typeof v === 'string' ? v.trim() : String(v || '').trim())).filter(Boolean);
        return Array.from(new Set(out));
    }
    if (typeof input === 'string') {
        const out = input.split(',').map((s) => s.trim()).filter(Boolean);
        return Array.from(new Set(out));
    }
    return [];
}

function toBoolean(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value !== 'string') return fallback;
    const v = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(v)) return true;
    if (['0', 'false', 'no', 'off'].includes(v)) return false;
    return fallback;
}

function loadFileConfig() {
    try {
        return require('../config');
    } catch {
        return null;
    }
}

function loadGlobalConfig() {
    if (typeof globalThis === 'undefined') return null;
    return globalThis.AGENTS_CONFIG || globalThis.AGENTS_DEFAULT_CONFIG || null;
}

function normalizeConfig(input) {
    return (input && typeof input === 'object') ? input : {};
}

function normalizeToolOutputLimits(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const out = {};
    for (const key of TOOL_OUTPUT_LIMIT_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
        const n = Number(input[key]);
        if (!Number.isFinite(n)) continue;
        const v = Math.floor(n);
        if (v < 0) continue;
        if (key === 'maxDepth' && v < 1) continue;
        out[key] = v;
    }
    return Object.keys(out).length > 0 ? out : null;
}

function mergeAgentConfig(base, override) {
    const out = { ...base };
    if (!override || typeof override !== 'object') return out;
    if (!override.agent || typeof override.agent !== 'object') return out;

    const src = override.agent;
    out.agent = { ...out.agent };

    if (Number.isFinite(src.maxTurns)) out.agent.maxTurns = src.maxTurns;
    if (Number.isFinite(src.maxProtectedRecentMessages)) out.agent.maxProtectedRecentMessages = src.maxProtectedRecentMessages;
    if (typeof src.debug === 'boolean') out.agent.debug = src.debug;

    if (Object.prototype.hasOwnProperty.call(src, 'approvalPolicy')) {
        const normalized = normalizeApprovalPolicy(src.approvalPolicy);
        if (normalized) out.agent.approvalPolicy = normalized;
    }

    if (Object.prototype.hasOwnProperty.call(src, 'trustedTools')) {
        const raw = src.trustedTools;
        if (Array.isArray(raw) || typeof raw === 'string') {
            out.agent.trustedTools = normalizeStringList(raw);
        }
    }

    if (Object.prototype.hasOwnProperty.call(src, 'toolOutputLimits')) {
        const normalized = normalizeToolOutputLimits(src.toolOutputLimits);
        if (normalized) out.agent.toolOutputLimits = normalized;
    }

    if (src.compaction && typeof src.compaction === 'object') {
        out.agent.compaction = { ...out.agent.compaction };
        const c = src.compaction;
        if (typeof c.enabled === 'boolean') out.agent.compaction.enabled = c.enabled;
        if (Number.isFinite(c.triggerMessages)) out.agent.compaction.triggerMessages = c.triggerMessages;
        if (Number.isFinite(c.triggerTokens)) out.agent.compaction.triggerTokens = c.triggerTokens;
        if (Number.isFinite(c.keepRecentMessages)) out.agent.compaction.keepRecentMessages = c.keepRecentMessages;
        if (Number.isFinite(c.maxSummaryChars)) out.agent.compaction.maxSummaryChars = c.maxSummaryChars;
        if (Number.isFinite(c.maxMessageChars)) out.agent.compaction.maxMessageChars = c.maxMessageChars;
        if (Number.isFinite(c.maxUserMessageTokens)) out.agent.compaction.maxUserMessageTokens = c.maxUserMessageTokens;
    }

    if (src.rag && typeof src.rag === 'object') {
        out.agent.rag = { ...out.agent.rag };
        const r = src.rag;
        if (Object.prototype.hasOwnProperty.call(r, 'enabled')) out.agent.rag.enabled = toBoolean(r.enabled, out.agent.rag.enabled);
        if (Number.isFinite(r.topK)) out.agent.rag.topK = Math.max(1, Math.floor(r.topK));
        if (Number.isFinite(r.minScore)) out.agent.rag.minScore = Number(r.minScore);
        if (Number.isFinite(r.maxContextChars)) out.agent.rag.maxContextChars = Math.max(256, Math.floor(r.maxContextChars));
        if (Object.prototype.hasOwnProperty.call(r, 'autoSave')) out.agent.rag.autoSave = toBoolean(r.autoSave, out.agent.rag.autoSave);
        if (Object.prototype.hasOwnProperty.call(r, 'memoryFirst')) out.agent.rag.memoryFirst = toBoolean(r.memoryFirst, out.agent.rag.memoryFirst);
        if (Object.prototype.hasOwnProperty.call(r, 'autoMemoryPrecheck')) out.agent.rag.autoMemoryPrecheck = toBoolean(r.autoMemoryPrecheck, out.agent.rag.autoMemoryPrecheck);
        if (Array.isArray(r.fixedJsonlPaths) || typeof r.fixedJsonlPaths === 'string') {
            out.agent.rag.fixedJsonlPaths = normalizeStringList(r.fixedJsonlPaths);
        }
        if (typeof r.episodicStoreNodePath === 'string' && r.episodicStoreNodePath.trim()) {
            out.agent.rag.episodicStoreNodePath = r.episodicStoreNodePath.trim();
        }
        if (typeof r.browserStoreName === 'string' && r.browserStoreName.trim()) {
            out.agent.rag.browserStoreName = r.browserStoreName.trim();
        }
    }

    return out;
}

function applyEnvOverrides(inputConfig) {
    if (typeof process === 'undefined' || !process || !process.env) return inputConfig;
    let config = inputConfig;

    const maxTurnsRaw = process.env.AGENTS_MAX_TURNS;
    if (maxTurnsRaw && Number.isFinite(Number(maxTurnsRaw))) {
        const parsed = Number(maxTurnsRaw);
        if (parsed > 0) config = mergeAgentConfig(config, { agent: { maxTurns: parsed } });
    }

    const debugRaw = process.env.AGENTS_DEBUG;
    if (debugRaw !== undefined) {
        const normalized = String(debugRaw).toLowerCase();
        const enabled = normalized === '1' || normalized === 'true' || normalized === 'yes';
        config = mergeAgentConfig(config, { agent: { debug: enabled } });
    }

    const maxProtectedRaw = process.env.AGENTS_MAX_PROTECTED_RECENT;
    if (maxProtectedRaw && Number.isFinite(Number(maxProtectedRaw))) {
        const parsed = Number(maxProtectedRaw);
        if (parsed > 0) config = mergeAgentConfig(config, { agent: { maxProtectedRecentMessages: parsed } });
    }

    const approvalPolicyRaw = process.env.AGENTS_APPROVAL_POLICY;
    if (approvalPolicyRaw) {
        const normalized = normalizeApprovalPolicy(String(approvalPolicyRaw));
        if (normalized) config = mergeAgentConfig(config, { agent: { approvalPolicy: normalized } });
    }

    const trustedToolsJson = process.env.AGENTS_TRUSTED_TOOLS_JSON;
    if (trustedToolsJson) {
        try {
            const parsed = JSON.parse(String(trustedToolsJson));
            config = mergeAgentConfig(config, { agent: { trustedTools: parsed } });
        } catch {
            // ignore invalid json
        }
    }

    const trustedToolsRaw = process.env.AGENTS_TRUSTED_TOOLS;
    if (trustedToolsRaw) {
        config = mergeAgentConfig(config, { agent: { trustedTools: String(trustedToolsRaw) } });
    }

    const triggerTokensRaw = process.env.AGENTS_COMPACTION_TRIGGER_TOKENS;
    if (triggerTokensRaw && Number.isFinite(Number(triggerTokensRaw))) {
        const parsed = Number(triggerTokensRaw);
        if (parsed > 0) config = mergeAgentConfig(config, { agent: { compaction: { triggerTokens: parsed } } });
    }

    const toolOutputLimitsJson = process.env.AGENTS_TOOL_OUTPUT_LIMITS_JSON;
    if (toolOutputLimitsJson) {
        try {
            const parsed = JSON.parse(String(toolOutputLimitsJson));
            config = mergeAgentConfig(config, { agent: { toolOutputLimits: parsed } });
        } catch {
            // ignore invalid json
        }
    }

    if (process.env.AGENTS_RAG_ENABLED !== undefined) {
        config = mergeAgentConfig(config, { agent: { rag: { enabled: process.env.AGENTS_RAG_ENABLED } } });
    }
    if (process.env.AGENTS_RAG_TOPK !== undefined && Number.isFinite(Number(process.env.AGENTS_RAG_TOPK))) {
        config = mergeAgentConfig(config, { agent: { rag: { topK: Number(process.env.AGENTS_RAG_TOPK) } } });
    }
    if (process.env.AGENTS_RAG_MIN_SCORE !== undefined && Number.isFinite(Number(process.env.AGENTS_RAG_MIN_SCORE))) {
        config = mergeAgentConfig(config, { agent: { rag: { minScore: Number(process.env.AGENTS_RAG_MIN_SCORE) } } });
    }

    return config;
}

function getAgentConfig(overrides = null) {
    const fileConfig = normalizeConfig(loadFileConfig());
    const globalConfig = normalizeConfig(loadGlobalConfig());
    const overrideConfig = normalizeConfig(overrides);

    let config = mergeAgentConfig(DEFAULT_CONFIG, fileConfig);
    config = mergeAgentConfig(config, globalConfig);
    config = mergeAgentConfig(config, overrideConfig);
    config = applyEnvOverrides(config);
    return config;
}

module.exports = {
    DEFAULT_CONFIG,
    getAgentConfig,
};
