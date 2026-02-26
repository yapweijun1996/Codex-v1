import { GoogleGenAI } from 'https://esm.run/@google/genai';
import { Agent } from './agents.mjs';
import {
    createBrowserToolset,
    createBrowserAgent,
    DEFAULT_BROWSER_SYSTEM_INSTRUCTION,
    getExternalMcpConfigFromGlobal,
} from './bootstrap.mjs';
import {
    elements,
    setStatus,
    addMessage,
    appendKnowledgeReferencesToLatestAssistantMessage,
    createStreamingAssistantMessage,
    addLoadingIndicator,
    removeLoadingIndicator,
    addDecisionTrace,
    addAuditTrace,
    escapeHtml,
    showConfirm,
} from './ui-dom.js';
import { openSkillDetail, openMcpToolDetail } from './ui-panel.js';
import { setTokenUsage } from './ui-usage.js';
import { handleApprovalConfirm } from './ui-approval.js';
import { renderPlanUpdate } from './ui-plan.js';
import { maybeGenerateTitle } from './ui-title.js';
import { createUiAuditLogger } from './ui-audit.js';
import { recordToolCallsRequested, markToolCallBegin, markToolCallEnd } from './ui-toolcalls.js';
import { shouldSuppressAssistantChunk } from './ui-stream-guards.js';
import { getUiStatusUpdateFromEvent } from './ui-turn-status.js';
import { loadSkillsUI } from './ui-skills.js';
import { createDeferredAssistantStream } from './ui-deferred-assistant-stream.js';
import { createUiThoughtLogger } from './ui-thought-logger.js';
import {
    createKnowledgeReferenceResolver,
    extractCitationIdsFromText,
    extractKnowledgeSelectedIdsFromEvent,
} from './ui-knowledge-references.js';
import {
    ensureActiveSession,
    addMessageBatch,
    updateSessionTitleIfNeeded,
    updateSessionTitle,
    syncSessions,
} from './ui-session.js';

const state = {
    apiKey: null,
    modelName: null,
    agent: null,
    isLoading: false,
};

const toolset = createBrowserToolset();
let browserTools = [];
const knowledgeReferenceResolver = createKnowledgeReferenceResolver({ fetchManifest: () => toolset.fetchManifest() });
export function setAgentHistory(history) {
    if (!state.agent) return;
    state.agent.history = history;
}

export async function handleApiKey(key) {
    const trimmed = String(key || '').trim();
    if (!trimmed) return;
    try {
        const selectedModel = elements.modelSelect.value;
        const ready = await toolset.ensureToolsReady({ includeMcp: true });
        browserTools = ready.tools;
        const bundle = await createBrowserAgent({
            apiKey: trimmed,
            modelName: selectedModel,
            tools: browserTools,
            systemPrompt: DEFAULT_BROWSER_SYSTEM_INSTRUCTION,
            AgentClass: Agent,
            GoogleGenAI,
        });

        state.apiKey = trimmed;
        state.modelName = selectedModel;
        state.agent = bundle.agent;

        localStorage.setItem('gemini_api_key', trimmed);

        setStatus(`Ready (${selectedModel})`, 'success');
        elements.messageInput.disabled = false;
        elements.sendButton.disabled = false;
    } catch (error) {
        setStatus('Error initializing', 'danger');
        console.error(error);
    }
}

export async function runAgent(userMessage) {
    if (!state.agent) throw new Error('Please enter your API key first');

    const sessionId = await ensureActiveSession(state.modelName);

    addMessage('user', userMessage);
    const loadingEl = addLoadingIndicator();
    setStatus('Thinking...', 'warning');
    state.isLoading = true;
    elements.sendButton.disabled = true;

    await addMessageBatch(sessionId, [{ role: 'user', content: userMessage }]);
    await updateSessionTitleIfNeeded(userMessage);

    const approvalMetaByCallId = new Map();
    const audit = createUiAuditLogger({ addAuditTrace });
    let suppressAssistantText = false;
    let loadingVisible = true;
    let lastUiStatus = null;
    let lastUiStatusLevel = null;
    let lastLoadingText = null;
    const knowledgeSelectedIds = new Set();

    const setLoadingText = (text) => {
        if (!loadingVisible) return;
        if (!loadingEl || !loadingEl.parentNode) return;
        const next = String(text || '');
        if (next === lastLoadingText) return;
        lastLoadingText = next;
        loadingEl.textContent = next;
    };

    const applyUiStatus = (ev) => {
        const update = getUiStatusUpdateFromEvent(ev);
        if (!update) return;
        const nextText = String(update.statusText || '');
        const nextLevel = String(update.statusLevel || '');
        if (nextText && (nextText !== lastUiStatus || nextLevel !== lastUiStatusLevel)) {
            lastUiStatus = nextText;
            lastUiStatusLevel = nextLevel;
            setStatus(nextText, update.statusLevel);
        }
        if (update.loadingText) setLoadingText(update.loadingText);
    };

    const removeLoading = () => {
        if (!loadingVisible) return;
        loadingVisible = false;
        removeLoadingIndicator(loadingEl);
    };

    const assistantStream = createDeferredAssistantStream({
        createStreamingAssistantMessage,
        removeLoading,
    });
    const thoughtLogger = createUiThoughtLogger({ assistantStream });
    thoughtLogger.setUserMessage(userMessage);
    try {
        for await (const ev of state.agent.runAsyncIterator(userMessage)) {
            if (!ev || !ev.type) continue;
            audit.onEvent(ev);
            thoughtLogger.onEvent(ev);

            if (ev.type === 'state.changed') applyUiStatus(ev);

            if (ev.type === 'assistant_message_started') {
                suppressAssistantText = false;
            }

            if (ev.type === 'approval.required') {
                if (ev.callId) approvalMetaByCallId.set(String(ev.callId), ev);
            }

            if (ev.type === 'user_input.requested') {
                const callId = ev.callId ? String(ev.callId) : '';
                const questions = Array.isArray(ev.questions) ? ev.questions : [];
                const first = questions[0] && typeof questions[0] === 'object' ? questions[0] : null;
                const meta = approvalMetaByCallId.get(callId);

                if (callId && callId.startsWith('approval:')) {
                    const result = await handleApprovalConfirm({
                        callId,
                        firstQuestion: first,
                        meta,
                        agent: state.agent,
                    });
                    approvalMetaByCallId.delete(callId);
                    if (result && result.handled) continue;
                }
            }

            if (ev.type === 'tool.call') {
                assistantStream.onToolCall();
                suppressAssistantText = true;
                recordToolCallsRequested(ev.details);
            }

            if (ev.type === 'tool.call.begin') {
                markToolCallBegin(ev);
            }

            if (ev.type === 'tool.call.end') {
                markToolCallEnd(ev);
            }

            if (ev.type === 'decision_trace') {
                addDecisionTrace(ev);
            }

            if (ev.type === 'plan.updated') {
                renderPlanUpdate(ev);
            }

            if (ev.type === 'token_count') {
                addDecisionTrace({ thought: 'Token usage', usage: ev.info });
                setTokenUsage(ev.info);
            }

            if (ev.type === 'knowledge.selected') {
                const ids = extractKnowledgeSelectedIdsFromEvent(ev);
                for (const id of ids) knowledgeSelectedIds.add(id);
            }

            if (ev.type === 'response.chunk') {
                const delta = String(ev.delta || '');
                const decision = shouldSuppressAssistantChunk({ delta, suppressAssistantText });
                suppressAssistantText = decision.suppressAssistantText;
                if (decision.suppress) continue;

                assistantStream.onChunk(delta);
            }

            if (ev.type === 'turn.completed') {
                removeLoading();
                assistantStream.finalizeOrRenderFinal({ addMessage, finalResponse: ev.finalResponse });
                try {
                    const citedIds = extractCitationIdsFromText(ev.finalResponse || '');
                    const refIds = citedIds.filter((id) => knowledgeSelectedIds.has(id));
                    const refs = await knowledgeReferenceResolver.resolveByHitIds(refIds);
                    if (refs.length > 0) appendKnowledgeReferencesToLatestAssistantMessage(refs);
                } catch {
                    // Ignore reference rendering failures.
                }
                setStatus('Ready', 'success');

                if (ev.finalResponse) {
                    await addMessageBatch(sessionId, [{ role: 'assistant', content: ev.finalResponse }]);

                    // If this is the first turn, generate a better title via AI
                    if (state.agent.history && state.agent.history.length === 2) {
                        maybeGenerateTitle({
                            agent: state.agent,
                            sessionId,
                            userMessage,
                            assistantResponse: ev.finalResponse,
                            setTitle: updateSessionTitle,
                        });
                    }
                }

                await syncSessions();
            }

            if (ev.type === 'error') {
                removeLoading();
                addMessage('assistant', `Error: ${ev.message || 'Unknown error'}`);
                setStatus('Error', 'danger');
            }
        }
    } finally {
        state.isLoading = false;
        elements.sendButton.disabled = false;
    }
}

export function exportTrace() {
    if (!state.agent || typeof state.agent.exportSessionTrace !== 'function') return null;
    return state.agent.exportSessionTrace();
}

export async function loadSkills() {
    return loadSkillsUI({
        toolset,
        elements,
        escapeHtml,
        openSkillDetail,
        openMcpToolDetail,
        getExternalMcpConfigFromGlobal,
    });
}

export function initApiKey() {
    const savedModel = localStorage.getItem('gemini_model_name');
    if (savedModel && elements.modelSelect.querySelector(`option[value="${savedModel}"]`)) {
        elements.modelSelect.value = savedModel;
    }

    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        elements.apiKeyInput.value = savedKey;
        handleApiKey(savedKey);
    }
}

export function isLoading() {
    return state.isLoading;
}
