const { RiskLevel, normalizeRiskLevel } = require('./imda-constants');
const { normalizeApprovalPolicy } = require('./imda-policy');

function toPositiveInt(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.floor(n);
}

function getTierDefaultBudget(tier) {
    if (tier === RiskLevel.HIGH) {
        return { maxTurns: 20, maxToolCalls: 24, maxPromptTokens: 8000, maxFailures: 3 };
    }
    if (tier === RiskLevel.MEDIUM) {
        return { maxTurns: 30, maxToolCalls: 40, maxPromptTokens: 12000, maxFailures: 5 };
    }
    if (tier === RiskLevel.LOW) {
        return { maxTurns: 40, maxToolCalls: 64, maxPromptTokens: 16000, maxFailures: 8 };
    }
    return { maxTurns: 50, maxToolCalls: 64, maxPromptTokens: 20000, maxFailures: 10 };
}

function normalizeBudget(input, defaults = {}, tier = RiskLevel.NONE) {
    const raw = (input && typeof input === 'object') ? input : {};
    const template = getTierDefaultBudget(tier);
    const fallbackTurns = toPositiveInt(defaults.maxTurns, template.maxTurns);
    return {
        maxTurns: toPositiveInt(raw.maxTurns, fallbackTurns),
        maxToolCalls: toPositiveInt(raw.maxToolCalls, toPositiveInt(defaults.maxToolCalls, template.maxToolCalls)),
        maxPromptTokens: toPositiveInt(raw.maxPromptTokens, toPositiveInt(defaults.maxPromptTokens, template.maxPromptTokens)),
        maxFailures: toPositiveInt(raw.maxFailures, toPositiveInt(defaults.maxFailures, template.maxFailures)),
    };
}

function normalizeTraceLevel(value) {
    const v = String(value || '').trim().toLowerCase();
    if (v === 'minimal' || v === 'standard' || v === 'full') return v;
    return 'standard';
}

function normalizeRunPolicy(input, defaults = {}) {
    const raw = (input && typeof input === 'object') ? input : {};
    const baseIdentity = (defaults.identity && typeof defaults.identity === 'object') ? defaults.identity : {};
    const baseTier = normalizeRiskLevel(defaults.tier, RiskLevel.NONE);
    const tier = normalizeRiskLevel(raw.tier, baseTier);
    const tenantId = typeof raw.tenantId === 'string' && raw.tenantId.trim()
        ? raw.tenantId.trim()
        : (typeof baseIdentity.tenantId === 'string' && baseIdentity.tenantId.trim() ? baseIdentity.tenantId.trim() : 'default');

    const approvalMode = normalizeApprovalPolicy(raw.approvalMode || defaults.approvalMode || 'always') || 'always';
    const trustedRaw = Array.isArray(raw.trustedTools)
        ? raw.trustedTools
        : (Array.isArray(defaults.trustedTools) ? defaults.trustedTools : []);
    const trustedTools = trustedRaw.map((v) => String(v || '').trim()).filter(Boolean);

    return {
        tier,
        tenantId,
        approvalMode,
        budget: normalizeBudget(raw.budget, defaults, tier),
        traceLevel: normalizeTraceLevel(raw.traceLevel || defaults.traceLevel),
        trustedTools,
    };
}

function snapshotRuntimePolicy(agent) {
    return {
        maxTurns: agent.maxTurns,
        approvalPolicy: agent.approvalPolicy,
        trustedTools: Array.isArray(agent.trustedTools) ? agent.trustedTools.slice() : [],
        identity: agent.identity,
        riskProfile: agent.riskProfile,
        runPolicy: agent.runPolicy,
    };
}

function applyRuntimePolicy(agent, normalizedPolicy) {
    if (!agent || !normalizedPolicy) return;
    agent.maxTurns = normalizedPolicy.budget.maxTurns;
    agent.approvalPolicy = normalizedPolicy.approvalMode;
    agent.trustedTools = normalizedPolicy.trustedTools.slice();

    const baseIdentity = (agent.identity && typeof agent.identity === 'object') ? agent.identity : { id: 'anonymous', tenantId: 'default', role: 'user' };
    const nextIdentity = {
        id: baseIdentity.id || 'anonymous',
        tenantId: normalizedPolicy.tenantId,
        role: baseIdentity.role || 'user',
    };
    agent.identity = Object.freeze(nextIdentity);
    agent.riskProfile = Object.freeze({ tier: normalizeRiskLevel(normalizedPolicy.tier, RiskLevel.NONE) });
    agent.runPolicy = Object.freeze({
        tier: normalizedPolicy.tier,
        tenantId: normalizedPolicy.tenantId,
        approvalMode: normalizedPolicy.approvalMode,
        budget: { ...normalizedPolicy.budget },
        traceLevel: normalizedPolicy.traceLevel,
        trustedTools: normalizedPolicy.trustedTools.slice(),
    });
}

function restoreRuntimePolicy(agent, snapshot) {
    if (!agent || !snapshot) return;
    agent.maxTurns = snapshot.maxTurns;
    agent.approvalPolicy = snapshot.approvalPolicy;
    agent.trustedTools = Array.isArray(snapshot.trustedTools) ? snapshot.trustedTools.slice() : [];
    agent.identity = snapshot.identity;
    agent.riskProfile = snapshot.riskProfile;
    agent.runPolicy = snapshot.runPolicy;
}

module.exports = {
    normalizeRunPolicy,
    snapshotRuntimePolicy,
    applyRuntimePolicy,
    restoreRuntimePolicy,
};
