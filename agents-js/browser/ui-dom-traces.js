import { elements, escapeHtml } from './ui-dom-base.js';

export function shouldShowDecisionTrace() {
    const cfg = globalThis.AGENTS_CONFIG;
    if (cfg && cfg.ui && typeof cfg.ui.decisionTrace === 'boolean') return cfg.ui.decisionTrace;
    return true;
}

export function shouldShowAuditTrace() {
    const cfg = globalThis.AGENTS_CONFIG;
    if (cfg && cfg.ui && typeof cfg.ui.auditTrace === 'boolean') return cfg.ui.auditTrace;
    return true;
}

export function addAuditTrace(line) {
    if (!shouldShowAuditTrace()) return;
    const list = elements.auditTraceList;
    if (!list) return;
    if (list.children.length === 1 && list.firstElementChild && list.firstElementChild.textContent.includes('No audit')) {
        list.innerHTML = '';
    }

    const item = document.createElement('div');
    item.className = 'trace-item';
    item.innerHTML = `<div>${escapeHtml(String(line || ''))}</div>`;
    list.insertBefore(item, list.firstChild);

    const maxEntries = 100;
    while (list.children.length > maxEntries) {
        list.removeChild(list.lastChild);
    }

    if (elements.auditTraceCount) {
        elements.auditTraceCount.textContent = String(list.children.length);
    }
}

export function addDecisionTrace(entry) {
    if (!shouldShowDecisionTrace()) return;
    const list = elements.decisionTraceList;
    if (!list) return;
    if (list.children.length === 1 && list.firstElementChild && list.firstElementChild.textContent.includes('No trace')) {
        list.innerHTML = '';
    }

    const item = document.createElement('div');
    item.className = 'trace-item';
    const usageInfo = entry && entry.usage ? entry.usage : null;
    const totalTokens = usageInfo && usageInfo.total_token_usage
        ? usageInfo.total_token_usage.total_tokens
        : (usageInfo && usageInfo.last_token_usage ? usageInfo.last_token_usage.total_tokens : null);
    const usageLine = (totalTokens !== null && totalTokens !== undefined)
        ? `Tokens: ${totalTokens}`
        : null;
    const thought = entry && entry.thought ? String(entry.thought) : (usageLine ? 'Token usage' : 'No thought captured');
    const planSteps = usageLine
        ? null
        : (entry && typeof entry.planSteps === 'number') ? `Plan steps: ${entry.planSteps}` : 'Plan steps: n/a';
    const lines = [thought];
    if (usageLine) lines.push(usageLine);
    if (planSteps) lines.push(planSteps);
    item.innerHTML = lines.map((line) => `<div>${escapeHtml(line)}</div>`).join('');
    list.insertBefore(item, list.firstChild);

    const maxEntries = 50;
    while (list.children.length > maxEntries) {
        list.removeChild(list.lastChild);
    }

    if (elements.decisionTraceCount) {
        elements.decisionTraceCount.textContent = String(list.children.length);
    }
}

export function renderSessions(sessions, activeId, searchQuery = '') {
    const list = elements.sessionList;
    if (!list) return;
    list.innerHTML = '';

    const query = String(searchQuery || '').trim().toLowerCase();
    const filtered = Array.isArray(sessions)
        ? sessions.filter((session) => {
            const title = String(session.title || '').toLowerCase();
            return !query || title.includes(query);
        })
        : [];

    if (!Array.isArray(sessions) || sessions.length === 0) {
        list.innerHTML = '<div class="list-empty">No sessions.</div>';
        if (elements.sessionCount) elements.sessionCount.textContent = '0';
        return;
    }

    if (filtered.length === 0) {
        list.innerHTML = '<div class="list-empty">No matching sessions.</div>';
        if (elements.sessionCount) elements.sessionCount.textContent = String(sessions.length);
        return;
    }

    filtered.forEach((session) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        if (session.id === activeId) item.classList.add('active');
        item.dataset.sessionId = session.id;
        item.innerHTML = `<strong>${escapeHtml(session.title || 'New Chat')}</strong>
            <span>${new Date(session.updatedAt || session.createdAt).toLocaleString()}</span>`;
        const del = document.createElement('button');
        del.className = 'delete-button';
        del.textContent = 'Del';
        del.dataset.sessionId = session.id;
        item.appendChild(del);
        list.appendChild(item);
    });

    if (elements.sessionCount) elements.sessionCount.textContent = String(sessions.length);
}
