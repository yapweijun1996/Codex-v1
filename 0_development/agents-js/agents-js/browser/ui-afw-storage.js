const DB_NAME = 'afw_workspace_v1';
const STORE_NAME = 'workspace_state';
const KEY = 'active';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function sanitizePayload(payload, fallbackFiles) {
  const files = payload && payload.files && typeof payload.files === 'object' ? payload.files : fallbackFiles;
  const normalized = Object.entries(files || {}).reduce((acc, [name, content]) => {
    if (!name) return acc;
    acc[String(name)] = typeof content === 'string' ? content : String(content ?? '');
    return acc;
  }, {});

  if (!Object.keys(normalized).length) {
    return {
      files: { ...(fallbackFiles || {}) },
      selectedFile: Object.keys(fallbackFiles || {})[0] || 'index.html',
    };
  }

  let selectedFile = payload && typeof payload.selectedFile === 'string' ? payload.selectedFile : '';
  if (!selectedFile || !Object.prototype.hasOwnProperty.call(normalized, selectedFile)) {
    selectedFile = Object.keys(normalized).sort()[0];
  }
  return { files: normalized, selectedFile };
}

export async function loadWorkspaceState(fallbackFiles) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(KEY);
      req.onerror = () => reject(req.error || new Error('IndexedDB read failed'));
      req.onsuccess = () => {
        const payload = req.result && req.result.payload ? req.result.payload : null;
        resolve(sanitizePayload(payload, fallbackFiles));
      };
    });
  } catch {
    return sanitizePayload(null, fallbackFiles);
  }
}

export async function saveWorkspaceState(payload, fallbackFiles) {
  const data = sanitizePayload(payload, fallbackFiles);
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put({ id: KEY, payload: data, updatedAt: Date.now() });
      req.onerror = () => reject(req.error || new Error('IndexedDB write failed'));
      req.onsuccess = () => resolve(true);
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error && error.message ? String(error.message) : String(error) };
  }
}
