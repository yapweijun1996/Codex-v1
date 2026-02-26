import { escapeHtml } from './ui-dom.js';
import {
    safeJsonStringify,
    shortCallId,
    summarizeArgs,
    buildBatchMetaLineHtml,
} from './ui-approval-format.js';
import { truncateText, riskLabelFromNumber } from './ui-approval-modal-utils.js';

function pickFirstIntentPreview(tools) {
    if (!Array.isArray(tools) || tools.length === 0) return '';
    const firstWithIntent = tools.find((t) => t && typeof t.intent === 'string' && String(t.intent).trim());
    if (!firstWithIntent) return '';
    return truncateText(String(firstWithIntent.intent).trim(), 160);
}

function countSelectedRiskTiers(tools) {
    const list = Array.isArray(tools) ? tools : [];
    let t2 = 0;
    let t3 = 0;
    for (const t of list) {
        const r = t && typeof t.risk === 'number' ? t.risk : null;
        if (r === 2) t2 += 1;
        else if (r === 3) t3 += 1;
    }
    return { t2, t3 };
}

export function buildBatchApprovalHtml(tools) {
    const list = Array.isArray(tools) ? tools : [];
    const maxRisk = list.reduce((m, t) => {
        const r = t && typeof t.risk === 'number' ? t.risk : null;
        return (typeof r === 'number' && r > m) ? r : m;
    }, 0);
    const intentPreview = pickFirstIntentPreview(list);
    const intentPreviewText = intentPreview || '(not provided)';
    const intentPreviewLabel = intentPreview ? `Intent: ${intentPreview}` : 'Intent: (not provided)';
    const counts = countSelectedRiskTiers(list);
    const riskSummaryText = `Risk: max=${riskLabelFromNumber(maxRisk)}  T2:${counts.t2}  T3:${counts.t3}`;

    const rows = list.map((t, idx) => {
        const name = t && t.name ? String(t.name) : 'tool';
        const call = t && t.id ? String(t.id) : `call_${idx}`;
        const r = t && typeof t.risk === 'number' ? t.risk : null;
        const rl = riskLabelFromNumber(r);
        const rClass = (typeof r === 'number') ? `tier-${r}` : '';
        const intentRaw = t && typeof t.intent === 'string' ? t.intent : '';
        const intent = truncateText(String(intentRaw || '').trim(), 160);
        const argsSummary = summarizeArgs(t && t.args);
        const argsFull = safeJsonStringify(t && t.args, { indent: 2, maxLen: 1600 });
        const isEmptyArgs = !argsSummary && (!argsFull || argsFull === '{}' || argsFull === 'null');
        const showDetails = !isEmptyArgs;
        const metaLine = buildBatchMetaLineHtml(t && t.permissions, t && t.rateLimit);
        const intentLine = intent
            ? `<div class="approval-batch-intent" aria-label="${escapeHtml(`Intent: ${intent}`)}" title="${escapeHtml(`Intent: ${intent}`)}">${escapeHtml(intent)}</div>`
            : '';
        return `
            <label class="approval-batch-item" data-approval-item="${escapeHtml(call)}">
                <input type="checkbox" data-callid="${escapeHtml(call)}" data-risk="${escapeHtml(typeof r === 'number' ? String(r) : '')}" checked />
                <div class="approval-batch-main">
                    <div class="approval-batch-top">
                        <span class="approval-batch-name">${escapeHtml(name)}</span>
                        <span class="approval-batch-right">
                            <span class="risk-badge ${rClass}">${escapeHtml(rl)}</span>
                            <span class="approval-batch-id">${escapeHtml(shortCallId(call))}</span>
                        </span>
                    </div>
                    ${metaLine}
                    ${intentLine}
                    ${isEmptyArgs ? '' : `
                        <div class="approval-batch-sub">
                            <span class="approval-batch-summary">${escapeHtml(argsSummary || 'args: (see details)')}</span>
                            ${showDetails ? `<button type="button" class="approval-details-toggle" data-approval-action="toggle_details" data-callid="${escapeHtml(call)}">Details</button>` : ''}
                        </div>
                        ${showDetails ? `<pre class="approval-batch-details">${escapeHtml(argsFull || '')}</pre>` : ''}
                    `}
                </div>
            </label>
        `;
    }).join('');

    return `
        <div class="approval-batch">
            <div class="approval-batch-header">
                <div class="approval-batch-hint">Select which tool calls to approve:</div>
                <div class="approval-batch-actions">
                    <button type="button" class="approval-mini-btn" data-approval-action="select_all">All</button>
                    <button type="button" class="approval-mini-btn" data-approval-action="select_none">None</button>
                </div>
            </div>
            <div class="approval-batch-summaryline">
                <span data-approval-selection>Selected ${list.length}/${list.length}</span>
                <span data-approval-intent-preview class="approval-batch-intent-preview" aria-label="${escapeHtml(intentPreviewLabel)}" title="${escapeHtml(intentPreviewLabel)}">${escapeHtml(intentPreviewText)}</span>
                <span data-approval-risk-summary class="approval-batch-risk-summary">${escapeHtml(riskSummaryText)}</span>
            </div>
            <div class="approval-batch-list">${rows}</div>
        </div>
    `;
}
