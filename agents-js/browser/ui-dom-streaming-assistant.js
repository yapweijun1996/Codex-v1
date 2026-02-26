import { scrollToBottom } from './ui-dom-base.js';
import {
    normalizeLogEntry,
    createLogLineNode,
    createLogGroupNode,
} from './ui-thought-log-render.js';

function truncateMiddle(text, max = 180) {
    const s = String(text || '');
    if (s.length <= max) return s;
    const head = Math.max(40, Math.floor(max * 0.6));
    const tail = Math.max(20, max - head - 5);
    return `${s.slice(0, head)} ... ${s.slice(-tail)}`;
}


export function createStreamingAssistantMessage({
    elements,
    removeEmptyState,
    marked,
    escapeHtml,
} = {}) {
    if (!elements || !elements.messagesArea) {
        throw new Error('createStreamingAssistantMessage: missing elements.messagesArea');
    }
    if (typeof removeEmptyState === 'function') removeEmptyState();

    const messageEl = document.createElement('div');
    messageEl.className = 'message assistant';
    messageEl.innerHTML = '<div class="message-content streaming-cursor"></div><div class="message-status"></div>';
    elements.messagesArea.appendChild(messageEl);

    const contentEl = messageEl.querySelector('.message-content');
    const statusEl = messageEl.querySelector('.message-status');

    const detailsEl = document.createElement('details');
    detailsEl.className = 'thought';
    detailsEl.open = true;

    const summaryEl = document.createElement('summary');
    summaryEl.textContent = 'Thought Process';

    const thoughtBodyEl = document.createElement('div');
    thoughtBodyEl.className = 'thought-content';

    const logWrapEl = document.createElement('div');
    logWrapEl.className = 'thought-logs';

    const draftWrapEl = document.createElement('div');
    draftWrapEl.className = 'thought-draft';

    thoughtBodyEl.appendChild(logWrapEl);
    thoughtBodyEl.appendChild(draftWrapEl);
    detailsEl.appendChild(summaryEl);
    detailsEl.appendChild(thoughtBodyEl);

    const finalEl = document.createElement('div');
    finalEl.className = 'final-answer';

    contentEl.appendChild(detailsEl);
    contentEl.appendChild(finalEl);

    let draftBuffer = '';
    let finalBuffer = '';
    const logs = [];
    let renderedLogCount = 0;
    let lastRenderedDraftSource = null;
    let lastRenderedFinalSource = null;
    let scheduled = false;
    let disposed = false;

    const setStatusText = (text) => {
        if (!statusEl) return;
        const next = String(text || '').trim();
        statusEl.textContent = next;
        statusEl.style.display = next ? 'flex' : 'none';
    };


    const renderLogs = () => {
        if (!logWrapEl) return;
        if (!logs.length) {
            logWrapEl.innerHTML = '';
            renderedLogCount = 0;
            return;
        }

        // Incremental render: append only new lines to reduce DOM churn.
        if (renderedLogCount > logs.length) {
            logWrapEl.innerHTML = '';
            renderedLogCount = 0;
        }
        if (renderedLogCount === 0 && !logWrapEl.childNodes.length) {
            // ok
        }

        const frag = document.createDocumentFragment();
        for (let i = renderedLogCount; i < logs.length; i += 1) {
            const normalized = normalizeLogEntry(logs[i]);
            if (!normalized) continue;

            if (normalized.children && normalized.children.length) {
                frag.appendChild(createLogGroupNode(document, normalized));
            } else {
                frag.appendChild(createLogLineNode(document, normalized, { withTag: true }));
            }
        }
        if (frag.childNodes.length) logWrapEl.appendChild(frag);
        renderedLogCount = logs.length;
    };

    const renderDraft = () => {
        if (!draftWrapEl) return;
        const text = String(draftBuffer || '');
        if (lastRenderedDraftSource === text) return;
        // Draft can be markdown; treat as unverified.
        draftWrapEl.innerHTML = text ? marked.parse(text) : '';
        lastRenderedDraftSource = text;
    };

    const renderFinal = () => {
        if (!finalEl) return;
        const text = String(finalBuffer || '');
        if (lastRenderedFinalSource === text) return;
        finalEl.innerHTML = text ? marked.parse(text) : '';
        lastRenderedFinalSource = text;
    };

    const flush = () => {
        scheduled = false;
        if (disposed) return;
        if (!contentEl || !contentEl.parentNode) return;
        renderLogs();
        renderDraft();
        renderFinal();
        scrollToBottom();
    };

    const scheduleFlush = (delay = 50) => {
        if (scheduled) return;
        scheduled = true;
        setTimeout(flush, delay);
    };

    return {
        append(delta) {
            if (disposed) return;
            const text = String(delta || '');
            if (!text) return;
            draftBuffer += text;
            lastRenderedDraftSource = null;
            scheduleFlush(50);
        },
        appendThought(text) {
            if (disposed) return;
            const entry = normalizeLogEntry(text);
            if (!entry) return;
            logs.push(entry);
            scheduleFlush(0);
        },
        appendToolIntent({ step, name, args, phase } = {}) {
            if (disposed) return;
            const s = step >= 1 ? `Step ${step}: ` : '';
            const toolName = String(name || '').trim();
            const toolArgs = args == null ? '' : truncateMiddle(JSON.stringify(args));
            const p = phase ? String(phase) : 'Action';
            const msg = toolName
                ? `${s}${p} -> ${toolName}${toolArgs ? ` ${toolArgs}` : ''}`
                : `${s}${p}`;
            const entry = normalizeLogEntry({ kind: 'action', text: msg });
            if (entry) logs.push(entry);
            scheduleFlush(0);
        },
        setStatusText,
        finalize() {
            if (disposed) return;
            flush();
            contentEl.classList.remove('streaming-cursor');
            setStatusText('');
            scrollToBottom();
        },
        finalizeWithFinal({ finalResponse } = {}) {
            if (disposed) return;
            if (finalResponse != null) finalBuffer = String(finalResponse);
            lastRenderedFinalSource = null;

            if (finalBuffer && String(draftBuffer || '').trim()) {
                logs.push({ kind: 'note', text: 'Draft replaced by final answer below.' });
                draftBuffer = '';
                lastRenderedDraftSource = null;
            }

            flush();
            contentEl.classList.remove('streaming-cursor');
            setStatusText('');
            scrollToBottom();
        },
        discard() {
            if (disposed) return;
            disposed = true;
            if (messageEl && messageEl.parentNode) messageEl.remove();
        },
    };
}
