const DB_NAME = 'agents_js_chat';
const DB_VERSION = 1;
const MAX_SESSIONS = 50;

function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains('sessions')) {
                const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
                sessions.createIndex('updatedAt', 'updatedAt', { unique: false });
            }

            if (!db.objectStoreNames.contains('messages')) {
                const messages = db.createObjectStore('messages', { keyPath: 'id' });
                messages.createIndex('bySession', 'sessionId', { unique: false });
                messages.createIndex('bySessionSeq', ['sessionId', 'seq'], { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function withStore(storeName, mode, handler) {
    return openDb().then((db) => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const result = handler(store, tx);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    }));
}

function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function createSession({ title, modelName }) {
    const session = {
        id: generateId(),
        title: title || 'New Chat',
        modelName: modelName || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSeq: 0,
    };

    await withStore('sessions', 'readwrite', (store) => {
        store.add(session);
    });

    await enforceSessionLimit();
    return session;
}

export async function listSessions(limit = MAX_SESSIONS) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('sessions', 'readonly');
        const store = tx.objectStore('sessions');
        const index = store.index('updatedAt');
        const sessions = [];

        const request = index.openCursor(null, 'prev');
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor || sessions.length >= limit) {
                resolve(sessions);
                return;
            }
            sessions.push(cursor.value);
            cursor.continue();
        };
        request.onerror = () => reject(request.error);
    });
}

export async function updateSession(id, patch) {
    return withStore('sessions', 'readwrite', (store) => {
        const req = store.get(id);
        req.onsuccess = () => {
            const session = req.result;
            if (!session) return;
            const updated = {
                ...session,
                ...patch,
                updatedAt: patch.updatedAt || Date.now(),
            };
            store.put(updated);
        };
    });
}

export async function deleteAllSessions() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['sessions', 'messages'], 'readwrite');
        tx.objectStore('sessions').clear();
        tx.objectStore('messages').clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

export async function deleteSession(sessionId) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['sessions', 'messages'], 'readwrite');
        tx.objectStore('sessions').delete(sessionId);
        const index = tx.objectStore('messages').index('bySession');
        const range = IDBKeyRange.only(sessionId);
        index.openCursor(range).onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

async function enforceSessionLimit() {
    const sessions = await listSessions(MAX_SESSIONS + 1);
    if (sessions.length <= MAX_SESSIONS) return;

    const toRemove = sessions.slice(MAX_SESSIONS);
    const db = await openDb();
    await new Promise((resolve, reject) => {
        const tx = db.transaction(['sessions', 'messages'], 'readwrite');
        const sessionStore = tx.objectStore('sessions');
        const messageStore = tx.objectStore('messages');

        toRemove.forEach((session) => {
            sessionStore.delete(session.id);
            const index = messageStore.index('bySession');
            const range = IDBKeyRange.only(session.id);
            index.openCursor(range).onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
        });

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

export async function getMessages(sessionId) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('messages', 'readonly');
        const index = tx.objectStore('messages').index('bySessionSeq');
        const range = IDBKeyRange.bound([sessionId, 0], [sessionId, Number.MAX_SAFE_INTEGER]);
        const results = [];
        const request = index.openCursor(range);
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor) {
                resolve(results);
                return;
            }
            results.push(cursor.value);
            cursor.continue();
        };
        request.onerror = () => reject(request.error);
    });
}

export async function addMessages(sessionId, messages) {
    if (!Array.isArray(messages) || messages.length === 0) return;

    const db = await openDb();
    await new Promise((resolve, reject) => {
        const tx = db.transaction(['sessions', 'messages'], 'readwrite');
        const sessionStore = tx.objectStore('sessions');
        const messageStore = tx.objectStore('messages');
        const sessionReq = sessionStore.get(sessionId);

        sessionReq.onsuccess = () => {
            const session = sessionReq.result;
            if (!session) return;
            let seq = session.lastSeq || 0;
            messages.forEach((msg) => {
                seq += 1;
                messageStore.add({
                    id: generateId(),
                    sessionId,
                    seq,
                    role: msg.role,
                    content: msg.content,
                    tool_calls: msg.tool_calls || null,
                    tool_call_id: msg.tool_call_id || null,
                    createdAt: Date.now(),
                });
            });
            sessionStore.put({
                ...session,
                lastSeq: seq,
                updatedAt: Date.now(),
            });
        };

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}
