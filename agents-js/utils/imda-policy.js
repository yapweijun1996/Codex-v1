const { RiskLevel } = require('./imda-constants');

// Control-plane tools must never require an IMDA approval gate.
// Otherwise we'd deadlock (approval prompt itself relies on user input tools).
const APPROVAL_EXEMPT_TOOLS = new Set([
    'request_user_input',
    'update_plan',
    'list_available_skills',
    'read_skill_documentation',
]);

function riskLabel(tier) {
    switch (tier) {
        case RiskLevel.HIGH:
            return 'Tier 3 (High Risk)';
        case RiskLevel.MEDIUM:
            return 'Tier 2 (Business Critical)';
        case RiskLevel.LOW:
            return 'Tier 1 (Reversible)';
        case RiskLevel.NONE:
        default:
            return 'Tier 0 (Read-only)';
    }
}

function normalizeApprovalPolicy(value) {
    if (typeof value !== 'string') return 'always';
    const v = value.trim().toLowerCase();
    if (v === 'unless_trusted') return 'unless_trusted';
    if (v === 'never') return 'never';
    return 'always';
}

function normalizeTrustedTools(value) {
    if (!Array.isArray(value)) return [];
    const out = value.map((t) => String(t || '').trim()).filter(Boolean);
    return Array.from(new Set(out));
}

function isTrustedTool(toolName, trustedTools) {
    if (!toolName) return false;
    const list = normalizeTrustedTools(trustedTools);
    if (list.length === 0) return false;
    return list.includes(String(toolName));
}

function baselineRequiresApproval({ toolName, toolRisk, agentTier }) {
    if (toolName && APPROVAL_EXEMPT_TOOLS.has(String(toolName))) return false;

    // IMDA baseline:
    // - Tier 3 (HIGH): always require approval
    // - Tier 2 (MEDIUM): always require approval (human approves business-critical steps)
    if (toolRisk >= RiskLevel.MEDIUM) return true;

    // Tier 1 (LOW): require approval for Tier 0 agents (read-only baseline).
    if (toolRisk === RiskLevel.LOW) return agentTier === RiskLevel.NONE;

    // Tier 0 (NONE): no approval required.
    return false;
}

function getApprovalDecision({ toolName, toolRisk, agentTier, approvalPolicy, trustedTools }) {
    const policy = normalizeApprovalPolicy(approvalPolicy);
    const baseline = baselineRequiresApproval({ toolName, toolRisk, agentTier });
    if (!baseline) return { requires: false, baselineRequires: false, bypassed: false, reason: 'not_required' };

    if (toolName && APPROVAL_EXEMPT_TOOLS.has(String(toolName))) {
        return { requires: false, baselineRequires: true, bypassed: true, reason: 'exempt' };
    }

    if (policy === 'never') {
        return { requires: false, baselineRequires: true, bypassed: true, reason: 'policy_never' };
    }

    if (policy === 'unless_trusted') {
        // Safety: never auto-bypass Tier 3.
        if (toolRisk >= RiskLevel.HIGH) {
            return { requires: true, baselineRequires: true, bypassed: false, reason: 'high_risk' };
        }
        if (isTrustedTool(toolName, trustedTools)) {
            return { requires: false, baselineRequires: true, bypassed: true, reason: 'trusted' };
        }
    }

    return { requires: true, baselineRequires: true, bypassed: false, reason: 'baseline' };
}

function requiresApproval({ toolName, toolRisk, agentTier }) {
    return baselineRequiresApproval({ toolName, toolRisk, agentTier });
}

function isApprovedResponse(value) {
    if (value == null) return false;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return ['approve', 'allow', 'yes', 'y'].includes(normalized);
    }
    if (typeof value === 'object' && Array.isArray(value.answers) && value.answers.length > 0) {
        return isApprovedResponse(value.answers[0]);
    }
    return false;
}

module.exports = {
    riskLabel,
    requiresApproval,
    isApprovedResponse,
    APPROVAL_EXEMPT_TOOLS,
    baselineRequiresApproval,
    getApprovalDecision,
    normalizeApprovalPolicy,
    normalizeTrustedTools,
};
