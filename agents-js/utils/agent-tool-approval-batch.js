const { stableStringify } = require('./self-heal');
const { RiskLevel } = require('./imda-constants');
const { getToolRisk, getToolIntent } = require('./agent-tools-registry');
const { getApprovalDecision, riskLabel, isApprovedResponse } = require('./imda-policy');
const { buildApprovalQuestion } = require('./approval-copy');
const { makeApprovalDenyKey } = require('./agent-tool-approval-keys');

function parseCallArgs(call) {
    try {
        return typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
    } catch {
        return undefined;
    }
}

function summarizeApprovalArgs(args, { maxLen = 80 } = {}) {
    if (args === undefined || args === null) return '';
    let text = '';
    try {
        text = stableStringify(args);
    } catch {
        text = '';
    }
    text = String(text || '').trim();
    if (!text || text === 'null' || text === '{}' || text === '[]') return '';
    if (text.length <= maxLen) return text;
    return `${text.slice(0, Math.max(0, maxLen - 3))}...`;
}

async function prepareBatchApprovals({ agent, toolCalls }) {
    const batchDecisions = new Map();
    if (!agent._approvalDenies) agent._approvalDenies = new Set();
    const needsApproval = toolCalls.some((call) => {
        const tool = agent.tools[call.name];
        if (!tool) return false;
        const toolRisk = getToolRisk(agent, call.name, tool);
        const agentTier = agent.riskProfile ? agent.riskProfile.tier : RiskLevel.NONE;
        const decision = getApprovalDecision({
            toolName: call.name,
            toolRisk,
            agentTier,
            approvalPolicy: agent && agent.approvalPolicy,
            trustedTools: agent && agent.trustedTools,
        });
        return Boolean(decision && decision.requires);
    });

    if (needsApproval) {
        const pending = [];
        const agentTier = agent.riskProfile ? agent.riskProfile.tier : RiskLevel.NONE;
        for (const call of toolCalls) {
            const tool = agent.tools[call.name];
            if (!tool) continue;
            if (!call.id) continue;
            const args = parseCallArgs(call);
            const denyKey = makeApprovalDenyKey(call.name, args);
            if (agent && agent._approvalDenies && agent._approvalDenies.has(denyKey)) continue;
            const toolRisk = getToolRisk(agent, call.name, tool);
            const approvalMode = (tool && tool.approvalMode === 'per_turn') ? 'per_turn' : 'per_call';
            const meta = tool && tool.meta ? tool.meta : null;
            const cached = approvalMode === 'per_turn'
                && toolRisk < RiskLevel.HIGH
                && agent
                && agent._approvalGrants
                && agent._approvalGrants.has(call.name);
            if (cached) continue;
            const decision = getApprovalDecision({
                toolName: call.name,
                toolRisk,
                agentTier,
                approvalPolicy: agent && agent.approvalPolicy,
                trustedTools: agent && agent.trustedTools,
            });
            if (decision && decision.requires) {
                pending.push({
                    id: call.id,
                    name: call.name,
                    risk: toolRisk,
                    args,
                    intent: getToolIntent(agent, call.name, args) || undefined,
                    denyKey,
                    approvalMode,
                    permissions: meta && Array.isArray(meta.permissions) ? meta.permissions : [],
                    rateLimit: meta && meta.rateLimit ? meta.rateLimit : null,
                });
            }
        }

        if (pending.length > 1) {
            const approvalCallId = `approval:batch:${Date.now()}`;
            const maxRisk = pending.reduce((m, p) => (p.risk > m ? p.risk : m), RiskLevel.NONE);
            const question = (agent && agent.debug)
                ? `Approve selected tool calls (${pending.length})?`
                : buildApprovalQuestion({ toolName: `${pending.length} tool calls`, toolRisk: maxRisk, isDebug: false });

            agent.emit('approval_required', {
                callId: approvalCallId,
                tool: '(batch)',
                risk: maxRisk,
                tools: pending,
                batch: true,
                promptSnapshot: question,
            });
            agent._setState('awaiting_input', { callId: approvalCallId, tool: '(batch)', risk: maxRisk, count: pending.length });
            const approvalPromise = agent._awaitUserInput(approvalCallId, agent.approvalTimeoutMs);
            agent.emit('user_input_requested', {
                callId: approvalCallId,
                questions: [{
                    question,
                    inputType: 'multi_select',
                    options: pending.map((p) => ({
                        title: (() => {
                            const argsText = summarizeApprovalArgs(p.args, { maxLen: 90 });
                            const argsPart = argsText ? ` args=${argsText}` : '';
                            return `${p.name}${argsPart} (${riskLabel(p.risk)})`;
                        })(),
                        value: p.id,
                        selected: true,
                    })),
                }],
            });
            const approval = await approvalPromise;
            const approvedCallIds = new Set();
            if (!approval.timedOut) {
                const v = approval.value;
                if (isApprovedResponse(v)) {
                    for (const p of pending) approvedCallIds.add(p.id);
                } else if (v && typeof v === 'object' && Array.isArray(v.approvedCallIds)) {
                    for (const id of v.approvedCallIds) approvedCallIds.add(id);
                } else if (Array.isArray(v)) {
                    for (const id of v) approvedCallIds.add(id);
                }
            }

            for (const p of pending) {
                const ok = approvedCallIds.has(p.id);
                batchDecisions.set(p.id, {
                    approved: ok,
                    timedOut: Boolean(approval.timedOut),
                    args: p.args,
                    risk: p.risk,
                    approvalMode: p.approvalMode,
                    toolName: p.name,
                });
                if (agent && agent._approvalDenies) {
                    if (ok) agent._approvalDenies.delete(p.denyKey);
                    else agent._approvalDenies.add(p.denyKey);
                }
                if (ok && p.approvalMode === 'per_turn' && agent && agent._approvalGrants && p.risk < RiskLevel.HIGH) {
                    agent._approvalGrants.add(p.name);
                }
            }

            agent._setState('thinking', { reason: approval.timedOut ? 'approval_timeout' : 'approval_batch_resolved' });
        }
    }

    return { needsApproval, batchDecisions };
}

module.exports = {
    prepareBatchApprovals,
};
