const RiskLevel = Object.freeze({
    NONE: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
});

const RISK_LEVEL_VALUES = new Set(Object.values(RiskLevel));

function normalizeRiskLevel(value, fallback = RiskLevel.NONE) {
    return RISK_LEVEL_VALUES.has(value) ? value : fallback;
}

module.exports = { RiskLevel, normalizeRiskLevel };
