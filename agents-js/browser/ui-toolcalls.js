function getToolCallElements() {
    return {
        list: document.getElementById('toolCallList'),
        count: document.getElementById('toolCallCount'),
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text == null ? '' : text);
    return div.innerHTML;
}

function formatStatus(status, success) {
    if (status === 'done') return success ? 'Done' : 'Failed';
    if (status === 'executing') return 'Executing';
    return 'Requested';
}

function formatArgs(args) {
    try {
        return JSON.stringify(args == null ? {} : args, null, 2);
    } catch {
        return String(args);
    }
}

function formatDurationMs(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n)) return '';
    return `${Math.max(0, Math.round(n))}ms`;
}

const state = {
    byId: new Map(), // id -> { id, name, args, status, success, durationMs, updatedAt }
};

function ensureEmptyState() {
    const { list } = getToolCallElements();
    if (!list) return;
    if (state.byId.size > 0) return;
    list.innerHTML = '<div class="list-empty">No tool calls yet.</div>';
}

function renderItem(item) {
    const { list } = getToolCallElements();
    if (!list || !item || !item.id) return;

    const existing = list.querySelector(`[data-tool-call-id="${CSS.escape(item.id)}"]`);
    const el = existing || document.createElement('div');
    el.className = 'trace-item toolcall-item';
    el.dataset.toolCallId = item.id;

    const statusText = formatStatus(item.status, item.success);
    const statusClass = item.status === 'done'
        ? (item.success ? 'completed' : 'failed')
        : item.status === 'executing'
            ? 'in_progress'
            : 'pending';

    const meta = [
        `<span class="plan-status ${statusClass}">${escapeHtml(statusText)}</span>`,
        `<strong>${escapeHtml(item.name || 'tool')}</strong>`,
        item.durationMs != null ? `<span class="toolcall-duration">${escapeHtml(formatDurationMs(item.durationMs))}</span>` : '',
    ].filter(Boolean).join(' ');

    const argsText = formatArgs(item.args);
    el.innerHTML = `
        <div class="toolcall-header">${meta}</div>
        <pre class="toolcall-args">${escapeHtml(argsText)}</pre>
    `;

    if (!existing) {
        el.addEventListener('click', () => {
            el.classList.toggle('open');
        });
        list.insertBefore(el, list.firstChild);
    }
}

function updateCount() {
    const { count } = getToolCallElements();
    if (!count) return;
    count.textContent = String(state.byId.size);
}

export function clearToolCalls() {
    state.byId.clear();
    const { list, count } = getToolCallElements();
    if (list) list.innerHTML = '<div class="list-empty">No tool calls yet.</div>';
    if (count) count.textContent = '0';
}

export function recordToolCallsRequested(details) {
    const calls = Array.isArray(details) ? details : [];
    for (const tc of calls) {
        if (!tc || !tc.name) continue;
        const id = typeof tc.id === 'string' ? tc.id : `${tc.name}:${Date.now()}`;
        const args = tc.arguments || {};
        const entry = state.byId.get(id) || { id, name: String(tc.name), args: {}, status: 'requested', success: null, durationMs: null, updatedAt: Date.now() };
        entry.name = String(tc.name);
        entry.args = args;
        entry.status = 'requested';
        entry.updatedAt = Date.now();
        state.byId.set(id, entry);
        renderItem(entry);
    }
    updateCount();
    ensureEmptyState();
}

export function markToolCallBegin(ev) {
    if (!ev) return;
    const id = ev.id ? String(ev.id) : null;
    if (!id) return;
    const name = ev.name ? String(ev.name) : 'tool';
    const args = ev.args || {};
    const entry = state.byId.get(id) || { id, name, args: {}, status: 'requested', success: null, durationMs: null, updatedAt: Date.now() };
    entry.name = name;
    entry.args = args;
    entry.status = 'executing';
    entry.updatedAt = Date.now();
    state.byId.set(id, entry);
    renderItem(entry);
    updateCount();
}

export function markToolCallEnd(ev) {
    if (!ev) return;
    const id = ev.id ? String(ev.id) : null;
    if (!id) return;
    const entry = state.byId.get(id);
    if (!entry) return;
    entry.status = 'done';
    entry.success = Boolean(ev.success);
    if (typeof ev.durationMs === 'number') entry.durationMs = ev.durationMs;
    entry.updatedAt = Date.now();
    state.byId.set(id, entry);
    renderItem(entry);
}

