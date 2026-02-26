import {
    elements,
    renderMessages,
    renderSessions,
    showEmptyState,
    setSessionSearchValue,
} from './ui-dom.js';

import {
    createSession,
    listSessions,
    updateSession,
    deleteAllSessions,
    deleteSession,
    getMessages,
    addMessages,
} from './ui-storage.js';
import { clearPlan } from './ui-plan.js';
import { clearToolCalls } from './ui-toolcalls.js';

const sessionState = {
    activeSessionId: null,
    sessionSearch: '',
};

export function getActiveSessionId() {
    return sessionState.activeSessionId;
}

export function setActiveSessionId(id) {
    sessionState.activeSessionId = id;
}

export async function syncSessions() {
    const sessions = await listSessions();
    renderSessions(sessions, sessionState.activeSessionId, sessionState.sessionSearch);
    if (!sessionState.activeSessionId && sessions.length > 0) {
        sessionState.activeSessionId = sessions[0].id;
    }
}

export async function initSessions() {
    const sessions = await listSessions();
    renderSessions(sessions, sessionState.activeSessionId, sessionState.sessionSearch);
    if (sessions.length > 0) {
        await selectSession(sessions[0].id, () => []);
        return;
    }
    showEmptyState();
}

export async function selectSession(sessionId, setAgentHistory) {
    sessionState.activeSessionId = sessionId;
    const messages = await getMessages(sessionId);
    const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        tool_calls: msg.tool_calls || undefined,
        tool_call_id: msg.tool_call_id || undefined,
    }));

    if (typeof setAgentHistory === 'function') {
        setAgentHistory(history);
    }

    renderMessages(history);
    clearPlan();
    clearToolCalls();
    await syncSessions();
}

export async function startNewChat(modelName, setAgentHistory) {
    const session = await createSession({
        title: 'New Chat',
        modelName: modelName || null,
    });
    sessionState.activeSessionId = session.id;
    if (typeof setAgentHistory === 'function') setAgentHistory([]);
    renderMessages([]);
    clearPlan();
    clearToolCalls();
    setSessionSearchValue('');
    sessionState.sessionSearch = '';
    await syncSessions();
}

export async function clearAllChats(setAgentHistory) {
    await deleteAllSessions();
    sessionState.activeSessionId = null;
    if (typeof setAgentHistory === 'function') setAgentHistory([]);
    renderMessages([]);
    clearPlan();
    clearToolCalls();
    showEmptyState();
    setSessionSearchValue('');
    sessionState.sessionSearch = '';
    await syncSessions();
}

export async function removeSession(sessionId, setAgentHistory) {
    await deleteSession(sessionId);
    if (sessionState.activeSessionId === sessionId) {
        sessionState.activeSessionId = null;
        if (typeof setAgentHistory === 'function') setAgentHistory([]);
        renderMessages([]);
        clearPlan();
        clearToolCalls();
        showEmptyState();
    }
    await syncSessions();
}

export function updateSessionSearch(query) {
    sessionState.sessionSearch = String(query || '').trim();
    syncSessions();
}

export async function ensureActiveSession(modelName) {
    if (sessionState.activeSessionId) return sessionState.activeSessionId;
    const session = await createSession({
        title: 'New Chat',
        modelName: modelName || null,
    });
    sessionState.activeSessionId = session.id;
    return session.id;
}

export async function addMessageBatch(sessionId, messages) {
    await addMessages(sessionId, messages);
}

export async function updateSessionTitle(sessionId, title) {
    if (!sessionId || !title) return;
    await updateSession(sessionId, { title: String(title).trim() });
    await syncSessions();
}

export async function updateSessionTitleIfNeeded(userMessage) {
    const sessions = await listSessions();
    const session = sessions.find((s) => s.id === sessionState.activeSessionId);
    if (!session) return;
    // 如果已经不是默认标题，就不再通过启发式更新
    if (session.title && session.title !== 'New Chat') return;

    const title = String(userMessage || '').trim().slice(0, 30) || 'New Chat';
    await updateSession(session.id, { title });
    await syncSessions();
}
