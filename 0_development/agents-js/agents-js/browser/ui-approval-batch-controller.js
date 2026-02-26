import { truncateText, riskLabelFromNumber } from './ui-approval-modal-utils.js';

function cssEscapeFallback(text) {
    return String(text || '').replace(/"/g, '\\"');
}

function cssEscape(text) {
    if (globalThis && globalThis.CSS && typeof globalThis.CSS.escape === 'function') {
        return globalThis.CSS.escape(String(text || ''));
    }
    return cssEscapeFallback(text);
}

export function updateBatchSelectionDom({ root, setApproveEnabled }) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    const all = Array.from(root.querySelectorAll('input[data-callid]'));
    const checked = Array.from(root.querySelectorAll('input[data-callid]:checked'));
    const selected = checked.length;
    const total = all.length;

    let t2 = 0;
    let t3 = 0;
    let maxRisk = 0;
    for (const el of checked) {
        const risk = String(el.getAttribute('data-risk') || '').trim();
        if (risk === '2') t2 += 1;
        else if (risk === '3') t3 += 1;
        const n = Number(risk);
        if (Number.isFinite(n) && n > maxRisk) maxRisk = n;
    }

    const el = (typeof root.querySelector === 'function') ? root.querySelector('[data-approval-selection]') : null;
    if (el) {
        try {
            el.textContent = `Selected ${selected}/${total}`;
        } catch {}
    }

    const previewEl = (typeof root.querySelector === 'function') ? root.querySelector('[data-approval-intent-preview]') : null;
    if (previewEl) {
        let preview = '';
        let previewText = '';
        let ariaLabel = '';
        if (selected > 0) {
            const firstChecked = checked[0];
            const item = firstChecked && typeof firstChecked.closest === 'function'
                ? firstChecked.closest('.approval-batch-item')
                : null;
            const intentEl = item && typeof item.querySelector === 'function'
                ? item.querySelector('.approval-batch-intent')
                : null;
            preview = intentEl && typeof intentEl.textContent === 'string'
                ? truncateText(intentEl.textContent.trim(), 180)
                : '';
            previewText = String(preview || '').replace(/^Intent:\s*/i, '').trim();
            ariaLabel = previewText ? `Intent: ${previewText}` : 'Intent: (not provided)';
        } else {
            ariaLabel = 'Intent: (none selected)';
        }

        try {
            if (selected > 0) {
                previewEl.textContent = previewText || '(not provided)';
            } else {
                previewEl.textContent = '(none selected)';
            }
            previewEl.setAttribute('aria-label', ariaLabel);
            previewEl.setAttribute('title', ariaLabel);
        } catch {}
    }

    const riskEl = (typeof root.querySelector === 'function') ? root.querySelector('[data-approval-risk-counts]') : null;
    if (riskEl) {
        try {
            riskEl.textContent = `T2: ${t2}  T3: ${t3}`;
        } catch {}
    }

    const maxRiskEl = (typeof root.querySelector === 'function') ? root.querySelector('[data-approval-max-risk]') : null;
    if (maxRiskEl) {
        try {
            maxRiskEl.textContent = `Max risk: ${riskLabelFromNumber(maxRisk)}`;
        } catch {}
    }

    const summaryEl = (typeof root.querySelector === 'function') ? root.querySelector('[data-approval-risk-summary]') : null;
    if (summaryEl) {
        try {
            summaryEl.textContent = `Risk: max=${riskLabelFromNumber(maxRisk)}  T2:${t2}  T3:${t3}`;
        } catch {}
    }

    if (typeof setApproveEnabled === 'function') setApproveEnabled(selected > 0);
}

export function attachBatchApprovalListeners({ root, setApproveEnabled }) {
    if (!root || typeof root.addEventListener !== 'function') return null;

    const onChange = (event) => {
        const target = event && event.target ? event.target : null;
        if (!target || !target.dataset || !target.dataset.callid) return;
        updateBatchSelectionDom({ root, setApproveEnabled });
    };

    const onClick = (event) => {
        const target = event && event.target ? event.target : null;
        const action = target && target.dataset ? String(target.dataset.approvalAction || '') : '';
        if (!action) return;
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();

        const all = Array.from(root.querySelectorAll('input[data-callid]'));
        if (action === 'select_all') {
            for (const el of all) el.checked = true;
            updateBatchSelectionDom({ root, setApproveEnabled });
            return;
        }
        if (action === 'select_none') {
            for (const el of all) el.checked = false;
            updateBatchSelectionDom({ root, setApproveEnabled });
            return;
        }
        if (action === 'toggle_details') {
            const call = target && target.dataset ? String(target.dataset.callid || '') : '';
            if (!call) return;
            const item = root.querySelector(`[data-approval-item="${cssEscape(call)}"]`);
            if (!item || !item.classList) return;
            item.classList.toggle('details-open');
        }
    };

    root.addEventListener('change', onChange);
    root.addEventListener('click', onClick);
    updateBatchSelectionDom({ root, setApproveEnabled });

    return () => {
        try { root.removeEventListener('change', onChange); } catch {}
        try { root.removeEventListener('click', onClick); } catch {}
    };
}

export function getCheckedCallIdsFromBatchRoot(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return [];
    return Array.from(root.querySelectorAll('input[data-callid]:checked'))
        .map((el) => String(el.getAttribute('data-callid') || ''))
        .filter(Boolean);
}
