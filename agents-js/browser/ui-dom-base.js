export const ICONS = {
    copy: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    check: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    send: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`
};

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

if (globalThis.marked) {
    const renderer = new marked.Renderer();
    const originalCode = renderer.code.bind(renderer);
    renderer.code = function (code, infostring, escaped) {
        const html = originalCode(code, infostring, escaped);
        return `<div class="code-block-container">
            <button class="copy-code-button" data-code="${escapeHtml(code)}">${ICONS.copy} Copy</button>
            ${html}
        </div>`;
    };
    marked.use({ renderer });
}

export const elements = {
    apiKeyInput: document.getElementById('apiKeyInput'),
    modelSelect: document.getElementById('modelSelect'),
    statusBar: document.getElementById('statusBar'),
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    messageInput: document.getElementById('messageInput'),
    sendButton: document.getElementById('sendButton'),
    messagesArea: document.getElementById('messagesArea'),
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    newChatTopButton: document.getElementById('newChatTopButton'),
    sessionList: document.getElementById('sessionList'),
    sessionCount: document.getElementById('sessionCount'),
    newChatButton: document.getElementById('newChatButton'),
    clearChatsButton: document.getElementById('clearChatsButton'),
    skillList: document.getElementById('skillList'),
    skillCount: document.getElementById('skillCount'),
    mcpToolList: document.getElementById('mcpToolList'),
    mcpToolCount: document.getElementById('mcpToolCount'),
    decisionTraceList: document.getElementById('decisionTraceList'),
    decisionTraceCount: document.getElementById('decisionTraceCount'),
    auditTraceList: document.getElementById('auditTraceList'),
    auditTraceCount: document.getElementById('auditTraceCount'),
    auditTraceCopy: document.getElementById('auditTraceCopy'),
    auditTraceExport: document.getElementById('auditTraceExport'),
    transparencyNotice: document.getElementById('transparencyNotice'),
    panel: document.getElementById('skillDetailPanel'),
    panelTitle: document.getElementById('panelTitle'),
    panelContent: document.getElementById('panelContent'),
    panelClose: document.getElementById('panelClose'),
    confirmModal: document.getElementById('confirmModal'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmMessage: document.getElementById('confirmMessage'),
    confirmCancel: document.getElementById('confirmCancel'),
    confirmOk: document.getElementById('confirmOk'),
};

export function setStatus(text, status) {
    const dotClass = status === 'success'
        ? 'success'
        : status === 'danger'
            ? 'danger'
            : 'warning';
    if (elements.statusDot) {
        elements.statusDot.className = `status-dot ${dotClass}`;
    }
    if (elements.statusText) {
        elements.statusText.textContent = text;
    }
}

export function toggleSidebar() {
    elements.sidebar.classList.toggle('collapsed');
    const collapsed = elements.sidebar.classList.contains('collapsed');
    document.body.classList.toggle('sidebar-collapsed', collapsed);
}

export function removeEmptyState() {
    const empty = elements.messagesArea.querySelector('.empty-state');
    if (empty) empty.remove();
}

export function showEmptyState() {
    if (elements.messagesArea.querySelector('.empty-state')) return;
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
        <div class="empty-title">Pure Browser Agent</div>
        <div class="empty-subtitle">
            Enter your Gemini API Key above to start. Everything runs in your browser.
        </div>
    `;
    elements.messagesArea.appendChild(empty);
}

export function setSessionSearchValue(value) {
    if (!elements.sessionSearch) return;
    elements.sessionSearch.value = value;
}

let confirmResolver = null;

export function showConfirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', modalClass = '' }) {
    if (!elements.confirmModal) return Promise.resolve(false);
    elements.confirmTitle.textContent = title || 'Confirm';
    elements.confirmMessage.innerHTML = message || 'Are you sure?';
    elements.confirmOk.textContent = confirmText;
    elements.confirmCancel.textContent = cancelText;

    elements.confirmModal.classList.add('open');
    if (modalClass) elements.confirmModal.classList.add(modalClass);
    elements.confirmModal.setAttribute('aria-hidden', 'false');

    return new Promise((resolve) => {
        confirmResolver = resolve;
    });
}

export function hideConfirm(result) {
    if (!elements.confirmModal) return;
    elements.confirmModal.classList.remove('open');
    elements.confirmModal.classList.remove('approval');
    elements.confirmModal.setAttribute('aria-hidden', 'true');
    if (elements.confirmOk) elements.confirmOk.disabled = false;
    if (elements.confirmCancel) elements.confirmCancel.disabled = false;
    if (confirmResolver) {
        confirmResolver(Boolean(result));
        confirmResolver = null;
    }
}

export function scrollToBottom() {
    requestAnimationFrame(() => {
        elements.messagesArea.scrollTop = elements.messagesArea.scrollHeight;
    });
}

export function autoResize() {
    elements.messageInput.style.height = 'auto';
    const newHeight = Math.min(elements.messageInput.scrollHeight, 200);
    elements.messageInput.style.height = newHeight + 'px';
}
