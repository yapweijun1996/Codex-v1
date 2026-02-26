import { elements, escapeHtml } from './ui-dom.js';
import { buildApprovalMetaLinesHtml } from './ui-approval-format.js';
import { formatRemaining, truncateText, riskLabelFromNumber } from './ui-approval-modal-utils.js';
import { buildBatchApprovalHtml } from './ui-approval-batch-view.js';
import {
    attachBatchApprovalListeners,
    getCheckedCallIdsFromBatchRoot,
} from './ui-approval-batch-controller.js';

export function createApprovalModalView({ callId, firstQuestion, meta, agent }) {
    const id = callId ? String(callId) : '';
    const toolName = meta && meta.tool ? String(meta.tool) : 'tool';
    const isDebug = Boolean(agent && agent.debug);
    const riskNum = meta && typeof meta.risk === 'number' ? meta.risk : null;
    const argsPreview = isDebug && meta && meta.args ? JSON.stringify(meta.args, null, 2) : '';
    const questionText = firstQuestion && firstQuestion.question
        ? String(firstQuestion.question)
        : `Approve tool call: ${toolName}?`;
    const intentRaw = meta && typeof meta.intent === 'string' ? meta.intent : '';
    const intent = truncateText(String(intentRaw || '').trim(), 180);
    const approvalTimeoutMs = (agent && typeof agent.approvalTimeoutMs === 'number' && Number.isFinite(agent.approvalTimeoutMs) && agent.approvalTimeoutMs > 0)
        ? agent.approvalTimeoutMs
        : 300_000;
    const startedAt = Date.now();
    const isBatch = Boolean(meta && meta.batch && Array.isArray(meta.tools) && meta.tools.length > 1);

    const setApproveEnabled = (enabled) => {
        if (!elements || !elements.confirmOk) return;
        try {
            elements.confirmOk.disabled = !enabled;
            elements.confirmOk.setAttribute('aria-disabled', enabled ? 'false' : 'true');
            elements.confirmOk.title = enabled ? '' : 'Select at least one tool call to approve.';
        } catch {
            // best-effort UI only
        }
    };

    const updateCountdownDom = ({ remaining, expiringSoon }) => {
        const root = elements && elements.confirmMessage ? elements.confirmMessage : null;
        if (!root || typeof root.querySelector !== 'function') return;
        const timerEl = root.querySelector('[data-approval-timer]');
        if (!timerEl) return;
        try {
            timerEl.textContent = formatRemaining(remaining);
            if (timerEl.classList && typeof timerEl.classList.toggle === 'function') {
                timerEl.classList.toggle('timer-warn', Boolean(expiringSoon));
            } else if ('className' in timerEl) {
                timerEl.className = expiringSoon ? 'timer-warn' : '';
            }
        } catch {
            // best-effort DOM update only
        }
    };

    const updateSelectionDom = () => {
        // Kept for backward compatibility: updated by controller on attach.
    };

    const buildMessage = () => {
        const elapsed = Date.now() - startedAt;
        const remaining = approvalTimeoutMs - elapsed;
        const expiringSoon = remaining <= 30_000;

        const questionHtml = `<div class="approval-question">${escapeHtml(questionText)}</div>`;
        const intentLabel = intent ? `Intent: ${intent}` : 'Intent: (not provided)';
        const intentHtml = intent
            ? `<div class="approval-intent" aria-label="${escapeHtml(intentLabel)}" title="${escapeHtml(intentLabel)}">${escapeHtml(intent)}</div>`
            : '';
        let metaHtml = '';

        if (isDebug && !isBatch) {
            const rClass = (typeof riskNum === 'number') ? `tier-${riskNum}` : '';
            const riskLabel = riskLabelFromNumber(riskNum);
            const metaLinesHtml = buildApprovalMetaLinesHtml(meta && meta.permissions, meta && meta.rateLimit);
            metaHtml = `
                <div class="approval-meta">
                    <span class="tool-name">${escapeHtml(toolName)}</span>
                    <span class="risk-badge ${rClass}">${escapeHtml(riskLabel)}</span>
                </div>
                ${metaLinesHtml}
                ${argsPreview ? `<div class="args-preview">${escapeHtml(argsPreview)}</div>` : ''}
            `;
        }

        let batchHtml = '';
        if (isBatch) {
            batchHtml = buildBatchApprovalHtml(meta.tools);
        }

        const timerHtml = `
            <div class="timer-section">
                <span>Auto-deny in:</span>
                <span data-approval-timer class="${expiringSoon ? 'timer-warn' : ''}">${formatRemaining(remaining)}</span>
            </div>
        `;

        return `
            <div class="approval-content">
                ${questionHtml}
                ${intentHtml}
                ${metaHtml}
                ${batchHtml}
                ${timerHtml}
            </div>
        `;
    };

    const attachBatchListeners = () => {
        if (!isBatch) return null;
        const root = elements && elements.confirmMessage ? elements.confirmMessage : null;
        return attachBatchApprovalListeners({ root, setApproveEnabled });
    };

    const getCheckedCallIds = () => {
        if (!isBatch) return [];
        const root = elements && elements.confirmMessage ? elements.confirmMessage : null;
        return getCheckedCallIdsFromBatchRoot(root);
    };

    return {
        id,
        toolName,
        isBatch,
        approvalTimeoutMs,
        startedAt,
        buildMessage,
        updateCountdownDom,
        attachBatchListeners,
        getCheckedCallIds,
    };
}
