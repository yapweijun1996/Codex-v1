function getPlanElements() {
    return {
        list: document.getElementById('planList'),
        count: document.getElementById('planCount'),
        toggle: document.getElementById('planViewToggle'),
        copy: document.getElementById('planCopyButton'),
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text == null ? '' : text);
    return div.innerHTML;
}

function renderEmpty(listEl) {
    listEl.innerHTML = '<div class="list-empty">No plan yet.</div>';
}

function getShowCompleted() {
    return localStorage.getItem('plan_show_completed') === '1';
}

function setShowCompleted(next) {
    localStorage.setItem('plan_show_completed', next ? '1' : '0');
}

function formatStatusLabel(status) {
    const s = String(status || '');
    if (s === 'in_progress') return 'In progress';
    if (s === 'pending') return 'Pending';
    if (s === 'completed') return 'Completed';
    return s || 'Unknown';
}

function buildCopyText({ explanation, items, showCompleted }) {
    const lines = [];
    if (explanation) lines.push(`Plan: ${explanation}`);
    lines.push(showCompleted ? 'View: All steps' : 'View: Active steps');
    for (const it of items) {
        lines.push(`- [${String(it.status)}] ${String(it.step)}`);
    }
    return lines.join('\n');
}

function ensureHandlers() {
    const { toggle, copy } = getPlanElements();
    const store = globalThis;

    if (toggle && toggle.dataset.bound !== '1') {
        toggle.dataset.bound = '1';
        toggle.addEventListener('click', () => {
            const next = !getShowCompleted();
            setShowCompleted(next);
            // Trigger a lightweight re-render by emitting a synthetic update if present.
            // The next plan.updated event will refresh anyway; this only updates view mode immediately.
            const ev = store.__agentsPlanLastUpdate;
            if (ev) renderPlanUpdate(ev);
        });
    }

    if (copy && copy.dataset.bound !== '1') {
        copy.dataset.bound = '1';
        copy.addEventListener('click', async () => {
            const ev = store.__agentsPlanLastUpdate;
            const explanation = ev && typeof ev.explanation === 'string' ? ev.explanation.trim() : '';
            const plan = ev && Array.isArray(ev.plan) ? ev.plan : [];
            const showCompleted = getShowCompleted();
            const items = plan
                .filter((p) => p && typeof p === 'object' && typeof p.step === 'string' && typeof p.status === 'string')
                .filter((p) => showCompleted ? true : (p.status === 'pending' || p.status === 'in_progress'));

            const text = buildCopyText({ explanation, items, showCompleted });
            if (!text.trim() || !navigator.clipboard) return;

            const original = copy.textContent;
            try {
                await navigator.clipboard.writeText(text);
                copy.textContent = 'Copied';
                setTimeout(() => { copy.textContent = original; }, 1200);
            } catch {
                // no-op
            }
        });
    }
}

export function clearPlan() {
    ensureHandlers();
    const { list, count, toggle } = getPlanElements();
    if (!list) return;
    renderEmpty(list);
    if (count) count.textContent = '0';
    if (toggle) toggle.textContent = getShowCompleted() ? 'All' : 'Active';
}

export function renderPlanUpdate(payload) {
    ensureHandlers();
    const { list, count, toggle } = getPlanElements();
    if (!list) return;

    const explanation = payload && typeof payload.explanation === 'string' ? payload.explanation.trim() : '';
    const plan = payload && Array.isArray(payload.plan) ? payload.plan : [];
    const items = plan.filter((p) => p && typeof p === 'object' && typeof p.step === 'string' && typeof p.status === 'string');

    globalThis.__agentsPlanLastUpdate = payload || null;

    if (toggle) toggle.textContent = getShowCompleted() ? 'All' : 'Active';

    if (items.length === 0) {
        renderEmpty(list);
        if (count) count.textContent = '0';
        return;
    }

    const showCompleted = getShowCompleted();
    const active = items.filter((p) => p.status === 'pending' || p.status === 'in_progress');
    const visible = showCompleted ? items : active;

    const rows = [];
    if (explanation) {
        rows.push(`<div class="trace-item"><div>${escapeHtml(explanation)}</div></div>`);
    }

    for (const p of visible) {
        const status = String(p.status);
        const step = String(p.step);
        const label = formatStatusLabel(status);
        rows.push(`<div class="trace-item"><div><span class="plan-status ${escapeHtml(status)}">${escapeHtml(label)}</span> — ${escapeHtml(step)}</div></div>`);
    }

    list.innerHTML = rows.join('');
    if (count) count.textContent = `${active.length}/${items.length}`;
}
