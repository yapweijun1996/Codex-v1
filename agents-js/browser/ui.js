import {
    elements,
    toggleSidebar,
    autoResize,
    showConfirm,
    hideConfirm,
    ICONS,
} from './ui-dom.js';
import { closePanel } from './ui-panel.js';
import { renderTransparencyNotice } from './ui-transparency.js';

import {
    handleApiKey,
    runAgent,
    loadSkills,
    initApiKey,
    isLoading,
    setAgentHistory,
    exportTrace,
} from './ui-agent.js';
import { createSendHandler } from './ui-send.js';

import {
    syncSessions,
    selectSession,
    startNewChat,
    clearAllChats,
    initSessions,
    removeSession,
    updateSessionSearch,
} from './ui-session.js';

const handleSend = createSendHandler({ elements, isLoading, runAgent });
const SIDEBAR_SECTION_STATE_KEY = 'agents_sidebar_section_state_v2';

function initSidebarSections() {
    const sections = Array.from(document.querySelectorAll('.sidebar .sidebar-section'));
    if (!sections.length) return;

    let persisted = {};
    try {
        const raw = localStorage.getItem(SIDEBAR_SECTION_STATE_KEY);
        persisted = raw ? JSON.parse(raw) : {};
    } catch {
        persisted = {};
    }

    const save = () => {
        try {
            localStorage.setItem(SIDEBAR_SECTION_STATE_KEY, JSON.stringify(persisted));
        } catch {
            // ignore storage errors in restricted environments
        }
    };

    sections.forEach((section, index) => {
        const header = section.querySelector('.sidebar-header');
        if (!header) return;

        const title = header.querySelector('span')?.textContent?.trim() || `section-${index + 1}`;
        const key = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        section.classList.add('sidebar-collapsible');
        header.classList.add('sidebar-header-clickable');

        let headerRight = header.querySelector('.sidebar-header-right');
        if (!headerRight) {
            headerRight = document.createElement('div');
            headerRight.className = 'sidebar-header-right';
            header.appendChild(headerRight);
        }

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'mini-button sidebar-section-toggle';
        toggle.setAttribute('aria-label', `Toggle ${title}`);
        headerRight.appendChild(toggle);

        const applyCollapsed = (collapsed) => {
            section.classList.toggle('is-collapsed', collapsed);
            toggle.textContent = collapsed ? 'Show' : 'Hide';
            toggle.setAttribute('aria-expanded', String(!collapsed));
            persisted[key] = collapsed ? 1 : 0;
            save();
        };

        const hasPersistedValue = Object.prototype.hasOwnProperty.call(persisted, key);
        applyCollapsed(hasPersistedValue ? Boolean(persisted[key]) : true);
        toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            applyCollapsed(!section.classList.contains('is-collapsed'));
        });

        header.addEventListener('click', (event) => {
            if (event.target.closest('button, input, select, a, textarea')) return;
            applyCollapsed(!section.classList.contains('is-collapsed'));
        });
    });
}

function downloadTrace(trace) {
    if (!trace) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const blob = new Blob([JSON.stringify(trace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trace_${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function initListeners() {
    const on = (el, event, handler) => {
        if (!el) return;
        el.addEventListener(event, handler);
    };

    on(elements.sidebarToggle, 'click', toggleSidebar);
    on(elements.newChatTopButton, 'click', () => startNewChat(null, setAgentHistory));
    on(elements.panelClose, 'click', closePanel);
    on(elements.newChatButton, 'click', () => startNewChat(null, setAgentHistory));
    on(elements.clearChatsButton, 'click', async () => {
        const ok = await showConfirm({
            title: 'Clear all chats',
            message: 'This will remove all sessions. This cannot be undone.',
            confirmText: 'Clear all',
            cancelText: 'Cancel',
        });
        if (!ok) return;
        await clearAllChats(setAgentHistory);
    });
    on(elements.sessionSearch, 'input', (e) => updateSessionSearch(e.target.value));

    on(elements.auditTraceExport, 'click', () => {
        const trace = exportTrace();
        if (!trace) {
            showConfirm({
                title: 'Trace not available',
                message: 'Start a session first, then export the audit trace.',
                confirmText: 'OK',
                cancelText: 'Close',
            }).then(() => null);
            return;
        }
        downloadTrace(trace);
    });

    on(elements.auditTraceCopy, 'click', async () => {
        const trace = exportTrace();
        if (!trace) {
            showConfirm({
                title: 'Trace not available',
                message: 'Start a session first, then copy the audit trace.',
                confirmText: 'OK',
                cancelText: 'Close',
            }).then(() => null);
            return;
        }

        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
            showConfirm({
                title: 'Clipboard unavailable',
                message: 'Clipboard access is not available in this environment. Use Export to download the trace file instead.',
                confirmText: 'OK',
                cancelText: 'Close',
            }).then(() => null);
            return;
        }

        const text = JSON.stringify(trace, null, 2);
        const button = elements.auditTraceCopy;
        const originalLabel = button ? button.textContent : null;

        try {
            await navigator.clipboard.writeText(text);
            if (button) {
                button.textContent = 'Copied!';
                button.classList.add('copied');
                setTimeout(() => {
                    button.textContent = originalLabel || 'Copy';
                    button.classList.remove('copied');
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to copy trace:', err);
            showConfirm({
                title: 'Copy failed',
                message: 'Could not copy the trace to clipboard. Use Export to download the trace file instead.',
                confirmText: 'OK',
                cancelText: 'Close',
            }).then(() => null);
        }
    });

    on(elements.sendButton, 'click', handleSend);
    on(elements.messageInput, 'input', autoResize);
    on(elements.messageInput, 'keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    on(elements.apiKeyInput, 'change', (e) => handleApiKey(e.target.value));
    on(elements.modelSelect, 'change', () => {
        const val = elements.modelSelect.value;
        if (val) localStorage.setItem('gemini_model_name', val);
        const key = elements.apiKeyInput.value.trim();
        if (key) handleApiKey(key);
    });

    on(elements.apiKeyInput, 'input', (e) => {
        const val = e.target.value.trim();
        if (val) localStorage.setItem('gemini_api_key', val);
        else localStorage.removeItem('gemini_api_key');
    });

    on(elements.confirmCancel, 'click', () => hideConfirm(false));
    on(elements.confirmOk, 'click', () => hideConfirm(true));
    on(elements.confirmModal, 'click', (event) => {
        if (event.target === elements.confirmModal) hideConfirm(false);
    });

    on(elements.sessionList, 'click', async (event) => {
        const deleteButton = event.target.closest('.delete-button');
        if (deleteButton) {
            const sessionId = deleteButton.dataset.sessionId;
            if (sessionId) {
                const ok = await showConfirm({
                    title: 'Delete chat',
                    message: 'This will remove the selected session.',
                    confirmText: 'Delete',
                    cancelText: 'Cancel',
                });
                if (!ok) return;
                await removeSession(sessionId, setAgentHistory);
            }
            return;
        }

        const target = event.target.closest('.list-item');
        if (!target) return;
        const sessionId = target.dataset.sessionId;
        if (sessionId) await selectSession(sessionId, setAgentHistory);
    });

    // Code block copy functionality
    on(elements.messagesArea, 'click', (e) => {
        const btn = e.target.closest('.copy-code-button');
        if (!btn) return;

        const container = btn.closest('.code-block-container');
        const codeEl = container ? container.querySelector('code') : null;
        const textToCopy = btn.dataset.code || (codeEl ? codeEl.innerText : '');

        if (!textToCopy) return;

        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `${ICONS.check} Copied!`;
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    });
}

initListeners();
initSidebarSections();
loadSkills();
initApiKey();
initSessions();
renderTransparencyNotice();
