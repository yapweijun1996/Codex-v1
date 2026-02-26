export {
    ICONS,
    elements,
    escapeHtml,
    setStatus,
    toggleSidebar,
    removeEmptyState,
    showEmptyState,
    setSessionSearchValue,
    showConfirm,
    hideConfirm,
    scrollToBottom,
    autoResize,
} from './ui-dom-base.js';

export {
    addMessage,
    appendKnowledgeReferencesToLatestAssistantMessage,
    renderMessages,
    createStreamingAssistantMessage,
    addLoadingIndicator,
    removeLoadingIndicator,
    addToolLog,
} from './ui-dom-messages.js';

export {
    shouldShowDecisionTrace,
    shouldShowAuditTrace,
    addAuditTrace,
    addDecisionTrace,
    renderSessions,
} from './ui-dom-traces.js';
