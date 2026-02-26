'use strict';

const { riskLabel } = require('./risk');

function formatReport(analysis) {
    if (!analysis || analysis.ok === false) {
        const msg = analysis && analysis.error ? String(analysis.error) : 'Unknown error';
        return `Trace Replay PoC\n\nERROR: ${msg}\n`;
    }

    const toolNames = Object.keys(analysis.derived.toolsByName || {}).sort();
    const topTools = toolNames
        .map((name) => ({ name, count: analysis.derived.toolsByName[name] || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);

    const types = Object.keys(analysis.derived.countsByType || {}).sort();
    const typePairs = types
        .map((t) => `${t}=${analysis.derived.countsByType[t] || 0}`)
        .join(' ');

    const tierLabel = (typeof analysis.agent.tier === 'number') ? riskLabel(analysis.agent.tier) : '';
    const approvalsMax = (typeof analysis.derived.approvals.maxRisk === 'number')
        ? riskLabel(analysis.derived.approvals.maxRisk)
        : '';

    const lines = [];
    lines.push('Trace Replay PoC');
    lines.push('');
    lines.push(`Version:   ${analysis.version || '(unknown)'}`);
    lines.push(`Session:   ${analysis.sessionId || '(unknown)'}`);
    lines.push(`Exported:  ${analysis.exportedAt || '(unknown)'}`);
    lines.push(`Platform:  ${analysis.platform || '(unknown)'}`);
    lines.push('');
    lines.push(`Agent:     model=${analysis.agent.model || '(unknown)'}${tierLabel ? ` tier=${tierLabel}` : ''}`);
    lines.push(`Identity:  ${analysis.agent.identity ? JSON.stringify(analysis.agent.identity) : '(none)'}`);
    lines.push('');

    const summaryBits = [];
    if (analysis.summary.totalTurns != null) summaryBits.push(`turns=${analysis.summary.totalTurns}`);
    if (analysis.summary.totalTokens != null) summaryBits.push(`tokens=${analysis.summary.totalTokens}`);
    if (analysis.summary.maxRiskLevel) summaryBits.push(`maxRisk=${analysis.summary.maxRiskLevel}`);
    if (analysis.summary.toolsUsed && analysis.summary.toolsUsed.length) summaryBits.push(`toolsUsed=${analysis.summary.toolsUsed.length}`);
    lines.push(`Summary:   ${summaryBits.length ? summaryBits.join(' ') : '(missing)'}`);
    lines.push('');

    lines.push(`Events:    total=${analysis.derived.eventCount}`);
    if (analysis.derived.firstTimestamp || analysis.derived.lastTimestamp) {
        lines.push(`Timeline:  ${analysis.derived.firstTimestamp || '?'} -> ${analysis.derived.lastTimestamp || '?'}`);
    }
    if (typePairs) lines.push(`Types:     ${typePairs}`);
    lines.push('');

    const a = analysis.derived.approvals;
    if (a && a.total) {
        const bits = [`total=${a.total}`];
        if (approvalsMax) bits.push(`max=${approvalsMax}`);
        bits.push(`Tier2=${a.tier2 || 0}`);
        bits.push(`Tier3=${a.tier3 || 0}`);
        lines.push(`Approvals: ${bits.join(' ')}`);
        lines.push('');
    }

    if (analysis.derived.toolResultsTruncated) {
        lines.push(`Tool results truncated: ${analysis.derived.toolResultsTruncated}`);
        lines.push('');
    }

    if (topTools.length) {
        const maxName = Math.max(...topTools.map((t) => t.name.length), 4);
        lines.push('Top tools:');
        for (const t of topTools) {
            lines.push(`  - ${String(t.name).padEnd(maxName)}  calls=${t.count}`);
        }
        lines.push('');
    }

    return `${lines.join('\n')}\n`;
}

module.exports = { formatReport };
