import {
    elements,
    escapeHtml,
    removeEmptyState,
    scrollToBottom,
    showEmptyState,
} from './ui-dom-base.js';

import { createStreamingAssistantMessage as createStreamingAssistantMessageImpl } from './ui-dom-streaming-assistant.js';
import { bindKnowledgeReferenceImageGallery } from './ui-knowledge-gallery.js';

function parseThoughtContent(rawMarkdown) {
    let parsedContent = marked.parse(rawMarkdown || '');
    const thoughtStartRegex = /(?:^|\s)<p>(?:Thought|Thinking|Plan):/i;

    if (!thoughtStartRegex.test(parsedContent)) {
        return parsedContent;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = parsedContent;

    let reasoningElements = [];
    let answerStartIndex = -1;

    const children = Array.from(tempDiv.children);
    for (let i = 0; i < children.length; i++) {
        const el = children[i];
        const text = el.textContent || '';

        const isAnswerStart = (
            i > 0 &&
            !text.match(/^(Thought|Plan|Action|Step \d+):/i) &&
            (
                text.match(/^(It is|The |Currently|As of)/i) ||
                (el.tagName === 'P' && text.length > 20 && !text.includes('Plan:') && !text.includes('Action:'))
            )
        );

        if (isAnswerStart) {
            answerStartIndex = i;
            break;
        }

        reasoningElements.push(el);
    }

    if (reasoningElements.length === 0) {
        return parsedContent;
    }

    const reasoningHtml = reasoningElements.map((el) => el.outerHTML).join('');
    const remainingElements = answerStartIndex >= 0 ? children.slice(answerStartIndex) : [];
    const answerHtml = remainingElements.map((el) => el.outerHTML).join('');

    const thoughtBlock = `
        <details class="thought">
            <summary>Thought Process</summary>
            <div class="thought-content">${reasoningHtml}</div>
        </details>
    `;

    return thoughtBlock + answerHtml;
}

export function addMessage(role, content) {
    removeEmptyState();
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;

    const parsedContent = role === 'assistant'
        ? parseThoughtContent(content)
        : marked.parse(content || '');

    messageEl.innerHTML = `<div class="message-content">${parsedContent}</div>`;

    elements.messagesArea.appendChild(messageEl);
    scrollToBottom();
}

function getLastAssistantMessageContentEl() {
    const messages = elements.messagesArea.querySelectorAll('.message.assistant .message-content');
    if (!messages || messages.length === 0) return null;
    return messages[messages.length - 1] || null;
}

export function appendKnowledgeReferencesToLatestAssistantMessage(references = []) {
    const contentEl = getLastAssistantMessageContentEl();
    if (!contentEl) return;

    const existing = contentEl.querySelector('.knowledge-references');
    if (existing) existing.remove();

    const refs = Array.isArray(references) ? references.filter(Boolean) : [];
    if (refs.length === 0) return;
    const isSingle = refs.length === 1;

    const wrap = document.createElement('section');
    wrap.className = 'knowledge-references';
    if (isSingle) wrap.classList.add('is-single');

    const title = document.createElement('h4');
    title.className = 'knowledge-references-title';
    title.textContent = isSingle ? 'Reference (1)' : `References (${refs.length})`;
    wrap.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'knowledge-references-grid';
    if (isSingle) grid.classList.add('single');

    for (const ref of refs) {
        const card = document.createElement('figure');
        card.className = 'knowledge-reference-card';
        if (isSingle) card.classList.add('single');

        const img = document.createElement('img');
        img.className = 'knowledge-reference-image';
        img.src = String(ref.src || '');
        img.alt = String(ref.title || ref.hitId || 'knowledge reference');
        img.loading = 'lazy';
        img.decoding = 'async';
        bindKnowledgeReferenceImageGallery({ imageEl: img, references: refs, index: grid.childNodes.length });
        card.appendChild(img);

        const cap = document.createElement('figcaption');
        cap.className = 'knowledge-reference-caption';
        const parts = [];
        if (ref.title) parts.push(String(ref.title));
        if (ref.hitId) parts.push(`#${String(ref.hitId)}`);
        if (Number.isFinite(ref.sourcePage)) parts.push(`p.${Math.trunc(ref.sourcePage)}`);
        cap.textContent = parts.join(' · ');
        card.appendChild(cap);

        grid.appendChild(card);
    }

    wrap.appendChild(grid);
    contentEl.appendChild(wrap);
    scrollToBottom();
}

export function renderMessages(messages) {
    elements.messagesArea.innerHTML = '';
    if (!Array.isArray(messages) || messages.length === 0) {
        showEmptyState();
        return;
    }
    messages.forEach((msg) => {
        if (!msg || (msg.role !== 'user' && msg.role !== 'assistant')) return;
        addMessage(msg.role, msg.content || '');
    });
}

export function createStreamingAssistantMessage() {
    return createStreamingAssistantMessageImpl({
        elements,
        removeEmptyState,
        marked,
        escapeHtml,
    });
}

export function addLoadingIndicator() {
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading';
    loadingEl.textContent = 'Thinking...';
    elements.messagesArea.appendChild(loadingEl);
    scrollToBottom();
    return loadingEl;
}

export function removeLoadingIndicator(el) {
    if (el && el.parentNode) el.remove();
}

export function addToolLog(name, args, { status = 'Executing' } = {}) {
    removeEmptyState();
    const logEl = document.createElement('div');
    logEl.className = 'tool-log';
    const statusText = String(status || 'Executing');
    logEl.innerHTML = `
        <div class="tool-header">🔧 ${escapeHtml(statusText)} <strong>${escapeHtml(name)}</strong></div>
        <div class="tool-args">${escapeHtml(JSON.stringify(args, null, 2))}</div>
    `;
    logEl.querySelector('.tool-header').addEventListener('click', () => {
        logEl.classList.toggle('open');
    });
    elements.messagesArea.appendChild(logEl);
    scrollToBottom();
}
