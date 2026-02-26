const { makeFailureFingerprint } = require('./self-heal');
const { recordToolFailure } = require('./agent-self-heal');
const { buildToolResultMessage, wrapToolOutput } = require('./agent-tool-formatter');
const { RiskLevel } = require('./imda-constants');
const { getToolIntent } = require('./agent-tools-registry');
const { getApprovalDecision, riskLabel, isApprovedResponse } = require('./imda-policy');
const { buildApprovalQuestion } = require('./approval-copy');
const { makeApprovalArgsHash, makeApprovalDenyKey } = require('./agent-tool-approval-keys');

function buildApprovalDeniedResult({ agent, callId, toolName, args, timedOut }) {
    const argsHash = makeApprovalArgsHash(args);
    const output = timedOut
        ? {
            error: 'ApprovalTimeout',
            timeoutMs: agent.approvalTimeoutMs,
            message: 'Approval request timed out.',
            tool: toolName,
            argsHash,
            guidance: 'Approval was not granted for this specific tool call. Do not retry the exact same call in this turn.'
        }
        : {
            error: 'ApprovalDenied',
            message: 'User denied approval.',
            tool: toolName,
            argsHash,
            guidance: 'User denied approval for this specific tool call. Do not retry the exact same call in this turn.'
        };
    recordToolFailure({
        toolFailureStreak: agent._toolFailureStreak,
        toolName,
        fingerprintOrType: 'approval_denied',
        args,
        makeFailureFingerprint,
    });
    const mcpResult = wrapToolOutput({
        toolFailureStreak: agent._toolFailureStreak,
        toolName,
        output,
        isError: true,
        limits: agent && agent.toolOutputLimits,
    });
    return buildToolResultMessage({ callId, toolName, mcpResult });
}

async function requireApprovalIfNeeded({ agent, call, tool, args, toolRisk, agentTier, batchDecisions }) {
    const decisions = batchDecisions || new Map();

    if (decisions.has(call.id)) {
        const decision = decisions.get(call.id);
        if (!decision.approved) {
            agent._setState('thinking', { reason: decision.timedOut ? 'approval_timeout' : 'approval_denied' });
            return {
                deniedResultMessage: buildApprovalDeniedResult({
                    agent,
                    callId: call.id,
                    toolName: call.name,
                    args,
                    timedOut: decision.timedOut,
                })
            };
        }
        return { deniedResultMessage: null };
    }

    const decision = getApprovalDecision({
        toolName: call.name,
        toolRisk,
        agentTier,
        approvalPolicy: agent && agent.approvalPolicy,
        trustedTools: agent && agent.trustedTools,
    });
    if (decision && decision.bypassed && agent && typeof agent.emit === 'function') {
        agent.emit('approval_skipped', {
            tool: call.name,
            risk: toolRisk,
            policy: agent.approvalPolicy || 'always',
            reason: decision.reason,
            args,
            timestamp: new Date().toISOString(),
        });
    }
    if (!decision || !decision.requires) {
        return { deniedResultMessage: null };
    }

    if (!agent._approvalDenies) agent._approvalDenies = new Set();
    const denyKey = makeApprovalDenyKey(call.name, args);
    if (agent._approvalDenies.has(denyKey)) {
        agent._setState('thinking', { reason: 'approval_denied_cached' });
        return {
            deniedResultMessage: buildApprovalDeniedResult({
                agent,
                callId: call.id,
                toolName: call.name,
                args,
                timedOut: false,
            })
        };
    }

    const approvalMode = (tool && tool.approvalMode === 'per_turn') ? 'per_turn' : 'per_call';
    const cached = approvalMode === 'per_turn'
        && toolRisk < RiskLevel.HIGH
        && agent
        && agent._approvalGrants
        && agent._approvalGrants.has(call.name);
    if (cached) return { deniedResultMessage: null };

    const approvalCallId = `approval:${call.id || call.name}`;
    const approvalQuestion = (agent && agent.debug)
        ? `Approve tool call: ${call.name} (${riskLabel(toolRisk)})?`
        : buildApprovalQuestion({ toolName: call.name, toolRisk, isDebug: false });
    const meta = tool && tool.meta ? tool.meta : null;
    const intent = getToolIntent(agent, call.name, args) || undefined;
    agent.emit('approval_required', {
        callId: approvalCallId,
        tool: call.name,
        risk: toolRisk,
        args,
        intent,
        permissions: meta && Array.isArray(meta.permissions) ? meta.permissions : [],
        rateLimit: meta && meta.rateLimit ? meta.rateLimit : null,
        promptSnapshot: approvalQuestion,
    });
    agent._setState('awaiting_input', { callId: approvalCallId, tool: call.name, risk: toolRisk });
    const approvalPromise = agent._awaitUserInput(approvalCallId, agent.approvalTimeoutMs);
    agent.emit('user_input_requested', {
        callId: approvalCallId,
        questions: [{ question: approvalQuestion, options: ['Approve', 'Deny'] }],
    });
    const approval = await approvalPromise;
    if (approval.timedOut || !isApprovedResponse(approval.value)) {
        agent._setState('thinking', { reason: 'approval_denied' });
        agent._approvalDenies.add(denyKey);
        return {
            deniedResultMessage: buildApprovalDeniedResult({
                agent,
                callId: call.id,
                toolName: call.name,
                args,
                timedOut: approval.timedOut,
            })
        };
    }
    agent._approvalDenies.delete(denyKey);
    if (approvalMode === 'per_turn' && agent && agent._approvalGrants) agent._approvalGrants.add(call.name);
    agent._setState('thinking', { reason: 'approval_granted' });
    return { deniedResultMessage: null };
}

module.exports = {
    buildApprovalDeniedResult,
    requireApprovalIfNeeded,
};
