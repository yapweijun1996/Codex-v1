import {
    elements,
    setStatus,
    showConfirm,
    hideConfirm,
    escapeHtml
} from './ui-dom.js';
import { createApprovalModalView } from './ui-approval-modal.js';
export async function handleApprovalConfirm({ callId, firstQuestion, meta, agent }) {
    const id = callId ? String(callId) : '';
    if (!id || !id.startsWith('approval:')) return { handled: false };
    const view = createApprovalModalView({ callId, firstQuestion, meta, agent });

    setStatus('Awaiting approval...', 'warning');

    let timedOut = false;
    let warned = false;
    const timer = setTimeout(() => {
        timedOut = true;
        hideConfirm(false);
    }, view.approvalTimeoutMs);

    const countdown = setInterval(() => {
        if (timedOut) return;
        const elapsed = Date.now() - view.startedAt;
        const remaining = view.approvalTimeoutMs - elapsed;
        const expiringSoon = remaining <= 30_000;
        if (!warned && remaining <= 30_000) {
            warned = true;
            setStatus('Approval expiring soon...', 'warning');
        }
        if (elements && elements.confirmModal && elements.confirmModal.classList && elements.confirmModal.classList.contains('open')) {
            // Avoid re-rendering the whole modal content: it resets batch checkbox state.
            view.updateCountdownDom({ remaining, expiringSoon });
        }
    }, 1000);

    const okPromise = showConfirm({
        title: 'Approval Required',
        message: view.buildMessage(),
        confirmText: view.isBatch ? 'Approve Selected' : 'Approve',
        cancelText: view.isBatch ? 'Deny All' : 'Deny',
        modalClass: 'approval'
    });

    const cleanupBatchListeners = view.attachBatchListeners();

    const ok = await okPromise;

    if (typeof cleanupBatchListeners === 'function') cleanupBatchListeners();
    clearInterval(countdown);
    clearTimeout(timer);

    if (timedOut) {
        setStatus('Approval timed out (Auto-Denied).', 'danger');
        if (agent && typeof agent.respondToUserInput === 'function') {
            agent.respondToUserInput(id, 'Deny'); // Explicitly deny on timeout
        }
        return { handled: true, responded: true, timedOut: true };
    }

    if (!agent || typeof agent.respondToUserInput !== 'function') {
        return { handled: true, responded: false };
    }
    if (view.isBatch && ok) {
        agent.respondToUserInput(id, { approvedCallIds: view.getCheckedCallIds() });
        return { handled: true, responded: true };
    }

    agent.respondToUserInput(id, ok ? 'Approve' : 'Deny');
    return { handled: true, responded: true };
}
