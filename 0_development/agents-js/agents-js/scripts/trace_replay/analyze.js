'use strict';

const { normalizeTraceObject } = require('./io');
const { computeRiskAggregate, riskLabel } = require('./risk');

function analyzeTrace(trace) {
    const t = normalizeTraceObject(trace);
    if (!t) {
        return {
            ok: false,
            error: 'Invalid trace shape: expected { events: [...] } or an events array',
        };
    }

    const events = Array.isArray(t.events) ? t.events : [];
    const countsByType = {};
    const toolsByName = {};
    let toolResultsTruncated = 0;

    let approvalsTotal = 0;
    let approvalsTier2 = 0;
    let approvalsTier3 = 0;
    let maxApprovalRisk = null;

    let firstTs = null;
    let lastTs = null;

    for (const ev of events) {
        const type = ev && ev.type ? String(ev.type) : '';
        if (type) countsByType[type] = (countsByType[type] || 0) + 1;

        const ts = ev && ev.timestamp ? String(ev.timestamp) : '';
        if (ts) {
            if (!firstTs) firstTs = ts;
            lastTs = ts;
        }

        if (type === 'tool.call.begin') {
            const name = ev && ev.payload && ev.payload.name ? String(ev.payload.name) : '';
            if (name) toolsByName[name] = (toolsByName[name] || 0) + 1;
        }

        if (type === 'tool.result') {
            const r = ev && ev.payload && ev.payload.result;
            if (r && typeof r === 'object' && r._agentsjs_tool_output_guard) toolResultsTruncated += 1;
            const name = ev && ev.payload && ev.payload.tool ? String(ev.payload.tool) : '';
            if (name) toolsByName[name] = (toolsByName[name] || 0) + 1;
        }

        if (type === 'approval.required' || type === 'approval.skipped') {
            approvalsTotal += 1;
            const tools = ev && ev.payload && Array.isArray(ev.payload.tools) ? ev.payload.tools : [];
            const agg = computeRiskAggregate(tools, { fallbackMaxRisk: ev && ev.payload ? ev.payload.risk : null });
            approvalsTier2 += agg.tier2 || 0;
            approvalsTier3 += agg.tier3 || 0;
            if (typeof agg.maxRisk === 'number') {
                if (maxApprovalRisk === null || agg.maxRisk > maxApprovalRisk) maxApprovalRisk = agg.maxRisk;
            }
        }
    }

    const meta = t.metadata && typeof t.metadata === 'object' ? t.metadata : null;
    const agentMeta = meta && meta.agent && typeof meta.agent === 'object' ? meta.agent : null;
    const summary = t.summary && typeof t.summary === 'object' ? t.summary : null;

    const out = {
        ok: true,
        version: t.version || null,
        sessionId: meta && meta.sessionId ? String(meta.sessionId) : null,
        exportedAt: meta && meta.exportedAt ? String(meta.exportedAt) : null,
        platform: meta && meta.platform ? String(meta.platform) : null,
        agent: {
            model: agentMeta && agentMeta.model ? String(agentMeta.model) : null,
            tier: agentMeta && agentMeta.tier != null ? agentMeta.tier : null,
            identity: agentMeta && agentMeta.identity ? agentMeta.identity : null,
        },
        summary: {
            totalTurns: summary && typeof summary.totalTurns === 'number' ? summary.totalTurns : null,
            totalTokens: summary && typeof summary.totalTokens === 'number' ? summary.totalTokens : null,
            maxRiskLevel: summary && typeof summary.maxRiskLevel === 'string' ? summary.maxRiskLevel : null,
            toolsUsed: summary && Array.isArray(summary.toolsUsed) ? summary.toolsUsed : null,
        },
        derived: {
            eventCount: events.length,
            firstTimestamp: firstTs,
            lastTimestamp: lastTs,
            countsByType,
            toolsByName,
            toolResultsTruncated,
            approvals: {
                total: approvalsTotal,
                tier2: approvalsTier2,
                tier3: approvalsTier3,
                maxRisk: maxApprovalRisk,
            },
        },
    };

    if (!out.summary.maxRiskLevel && typeof maxApprovalRisk === 'number') {
        out.summary.maxRiskLevel = riskLabel(maxApprovalRisk) || null;
    }

    return out;
}

module.exports = { analyzeTrace };
