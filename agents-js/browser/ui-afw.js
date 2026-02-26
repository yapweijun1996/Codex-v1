import { loadWorkspaceState, saveWorkspaceState } from './ui-afw-storage.js';
import { initAfwSettings } from './ui-afw-settings.js';
import { bindAfwChat } from './ui-afw-chat.js';
import { buildPreviewHtml } from './ui-afw-preview-driver.js';
import { initAfwAutomationBindings } from './ui-afw-automation.js';
import { bindAfwControls } from './ui-afw-controls.js';
import { bindAfwExecutionConsole } from './ui-afw-execution-console.js';
import { bindAfwWorkspacePanel } from './ui-afw-workspace-panel.js';
import { bindAfwPreviewIsolation } from './ui-afw-preview-isolation.js';
import { bindAfwChatScroll } from './ui-afw-chat-scroll.js';
import { bindAfwPreviewWatchdogBadge } from './ui-afw-watchdog-badge.js';
import { bindAfwTheme } from './ui-afw-theme.js';
const DEFAULT_FILES = {
  'index.html': '<!doctype html>\n<html>\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1" />\n  <title>AFW Demo</title>\n</head>\n<body>\n  <main class="app">\n    <h1>Agent Frontend Worker</h1>\n    <button id="btn">Click me</button>\n    <p id="out">Ready</p>\n  </main>\n</body>\n</html>',
  'style.css': 'body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; }\n.app { max-width: 680px; margin: 0 auto; }\nbutton { padding: 8px 12px; }',
  'app.js': "const btn = document.getElementById('btn');\nconst out = document.getElementById('out');\nif (btn && out) btn.addEventListener('click', () => { out.textContent = 'Clicked'; });",
};
const state = {
  files: { ...DEFAULT_FILES },
  selectedFile: 'index.html',
  runState: 'idle',
  viewMode: 'code',
  viewport: 'desktop',
  columns: [22, 50, 28],
  logs: [],
  saveTimer: null,
  chatBusy: false,
  settingsApi: null,
  themeApi: null,
};
const el = {
  fileList: document.getElementById('afwFileList'), fileLabel: document.getElementById('afwFileLabel'),
  editor: document.getElementById('afwEditor'), codeStatus: document.getElementById('afwCodeStatus'),
  previewFrame: document.getElementById('afwPreviewFrame'), previewShell: document.getElementById('afwPreviewShell'),
  chatList: document.getElementById('afwChatList'), logList: document.getElementById('afwLogList'),
  input: document.getElementById('afwInput'), runState: document.getElementById('afwRunState'),
  previewWatchdog: document.getElementById('afwPreviewWatchdog'),
  codePane: document.getElementById('afwCodePane'), previewPane: document.getElementById('afwPreviewPane'),
  logPane: document.getElementById('afwLogPane'), workspace: document.getElementById('afwWorkspace'),
  notice: document.getElementById('afwNotice'),
  modalBackdrop: document.getElementById('afwModalBackdrop'),
  modalTitle: document.getElementById('afwModalTitle'),
  modalMessage: document.getElementById('afwModalMessage'),
  modalInput: document.getElementById('afwModalInput'),
  modalOk: document.getElementById('afwModalOk'),
  modalCancel: document.getElementById('afwModalCancel'),
  imageModalBackdrop: document.getElementById('afwImageModalBackdrop'),
  imageModalImg: document.getElementById('afwImageModalImg'),
  imageModalClose: document.getElementById('afwImageModalClose'),
};
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
let imageModalPreviousFocus = null;
let chatScroll = null;
function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;'); }
function logLine(message) { const line = `[${new Date().toLocaleTimeString()}] ${message}`; state.logs.unshift(line); state.logs = state.logs.slice(0, 120); renderLogs(); }
function renderLogs() { el.logList.innerHTML = state.logs.map((line) => `<li>${escapeHtml(line)}</li>`).join(''); }
function showNotice(message, type = 'info') {
  if (!el.notice) return;
  el.notice.textContent = String(message || '');
  el.notice.className = `afw-notice ${type}`;
  if (el.notice._timer) clearTimeout(el.notice._timer);
  el.notice._timer = setTimeout(() => {
    el.notice.textContent = '';
    el.notice.className = 'afw-notice';
  }, type === 'error' ? 4200 : 2600);
}
function askAction({ title, message, mode = 'confirm', defaultValue = '', okText = 'OK' }) {
  return new Promise((resolve) => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    el.modalTitle.textContent = title || 'Confirm';
    el.modalMessage.textContent = message || '';
    el.modalOk.textContent = okText;
    el.modalInput.classList.toggle('hidden', mode !== 'text');
    el.modalInput.value = mode === 'text' ? String(defaultValue || '') : '';
    el.modalBackdrop.classList.remove('hidden');
    el.modalBackdrop.setAttribute('aria-hidden', 'false');
    if (mode === 'text') setTimeout(() => el.modalInput.focus(), 0);
    const done = (ok) => {
      if (document.activeElement instanceof HTMLElement && el.modalBackdrop.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      el.modalBackdrop.classList.add('hidden');
      el.modalBackdrop.setAttribute('aria-hidden', 'true');
      if (previousFocus && typeof previousFocus.focus === 'function') {
        setTimeout(() => previousFocus.focus(), 0);
      }
      cleanup();
      resolve({ ok, value: el.modalInput.value.trim() });
    };
    const onOk = () => done(true);
    const onCancel = () => done(false);
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel();
      if (event.key === 'Enter' && mode === 'text') onOk();
    };
    const onBackdrop = (event) => { if (event.target === el.modalBackdrop) onCancel(); };
    const cleanup = () => {
      el.modalOk.removeEventListener('click', onOk);
      el.modalCancel.removeEventListener('click', onCancel);
      el.modalBackdrop.removeEventListener('click', onBackdrop);
      window.removeEventListener('keydown', onKey);
    };
    el.modalOk.addEventListener('click', onOk);
    el.modalCancel.addEventListener('click', onCancel);
    el.modalBackdrop.addEventListener('click', onBackdrop);
    window.addEventListener('keydown', onKey);
  });
}
function queuePersist(reason = 'change') {
  if (state.saveTimer) clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(async () => {
    state.saveTimer = null;
    const result = await saveWorkspaceState({ files: state.files, selectedFile: state.selectedFile }, DEFAULT_FILES);
    if (!result.ok) logLine(`Persist warning (${reason}): ${result.error || 'unknown'}`);
  }, 120);
}
function renderFiles() {
  const names = Object.keys(state.files).sort();
  el.fileList.innerHTML = names.map((name) => {
    const active = state.selectedFile === name ? 'active' : '';
    return `<li><button class="afw-file-item ${active}" data-name="${name}">${name}</button></li>`;
  }).join('');
}
function selectFile(name, { persist = false } = {}) {
  if (!Object.prototype.hasOwnProperty.call(state.files, name)) return;
  state.selectedFile = name;
  el.fileLabel.textContent = name;
  el.editor.value = state.files[name];
  el.codeStatus.textContent = 'saved';
  renderFiles();
  if (persist) queuePersist('select_file');
}
function compilePreview() {
  el.previewFrame.srcdoc = buildPreviewHtml(state.files);
}
function rebuildPreviewFrame(reason = 'watchdog') {
  const current = el && el.previewFrame ? el.previewFrame : null;
  if (!current || !current.parentNode || typeof document.createElement !== 'function') return false;
  const next = document.createElement('iframe');
  next.id = current.id || 'afwPreviewFrame';
  if (current.className) next.className = current.className;
  next.setAttribute('sandbox', current.getAttribute('sandbox') || 'allow-scripts allow-forms allow-modals');
  current.parentNode.replaceChild(next, current);
  el.previewFrame = next;
  bindAfwPreviewIsolation({ frame: el.previewFrame, logLine });
  compilePreview();
  logLine(`Preview frame rebuilt (${String(reason || 'unknown')})`);
  return true;
}
function setView(mode) {
  state.viewMode = mode;
  el.codePane.classList.toggle('hidden', mode !== 'code');
  el.previewPane.classList.toggle('hidden', mode !== 'preview');
  el.logPane.classList.toggle('hidden', mode !== 'log');
  document.querySelectorAll('#afwViewMode button').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === mode));
}
function setViewport(size) {
  const sizes = {
    desktop: { w: '100%', h: '100%' },
    tablet: { w: '768px', h: '1024px' },
    mobile: { w: '390px', h: '844px' },
  };
  state.viewport = size;
  const target = sizes[size] || sizes.desktop;
  el.previewShell.style.width = target.w;
  el.previewShell.style.height = target.h;
  document.querySelectorAll('#afwViewport button').forEach((btn) => btn.classList.toggle('active', btn.dataset.size === size));
  logLine(`Viewport => ${size}`);
}
function setRunState(next) {
  const value = next === 'working' ? 'working' : 'idle';
  state.runState = value;
  if (!el.runState) return;
  el.runState.textContent = value;
  el.runState.classList.toggle('is-working', value === 'working');
  el.runState.setAttribute('aria-busy', value === 'working' ? 'true' : 'false');
}
function formatChatTime(ts) {
  const date = ts instanceof Date ? ts : new Date(ts || Date.now());
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function openImageModal(src, alt = 'Screenshot preview', trigger = null) {
  if (!el.imageModalBackdrop || !el.imageModalImg) return;
  imageModalPreviousFocus = trigger instanceof HTMLElement ? trigger : (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  el.imageModalImg.src = String(src || '');
  el.imageModalImg.alt = String(alt || 'Screenshot preview');
  el.imageModalBackdrop.classList.remove('hidden');
  el.imageModalBackdrop.setAttribute('aria-hidden', 'false');
}

function closeImageModal() {
  if (!el.imageModalBackdrop || !el.imageModalImg) return;
  if (document.activeElement instanceof HTMLElement && el.imageModalBackdrop.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  el.imageModalBackdrop.classList.add('hidden');
  el.imageModalBackdrop.setAttribute('aria-hidden', 'true');
  el.imageModalImg.removeAttribute('src');
  const previousFocus = imageModalPreviousFocus;
  imageModalPreviousFocus = null;
  if (previousFocus && typeof previousFocus.focus === 'function') {
    setTimeout(() => {
      if (typeof previousFocus.focus === 'function') previousFocus.focus();
    }, 0);
  }
}

function bindImageModal() {
  if (!el.imageModalBackdrop) return;
  el.imageModalClose?.addEventListener('click', closeImageModal);
  el.imageModalBackdrop.addEventListener('click', (event) => {
    if (event.target === el.imageModalBackdrop) closeImageModal();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeImageModal();
  });
}

function addChat(author, text, options = {}) {
  const n = document.createElement('div');
  n.className = `afw-chat-msg ${author === 'user' ? 'user' : 'agent'}`;
  n.setAttribute('data-role', author === 'user' ? 'me' : 'ai');

  const badges = options && Array.isArray(options.badges) ? options.badges : [];
  if (badges.length > 0) {
    const badgeRow = document.createElement('div');
    badgeRow.className = 'afw-chat-badges';
    for (const item of badges) {
      const badge = document.createElement('span');
      const tone = item && item.tone ? String(item.tone) : 'info';
      badge.className = `afw-chat-badge ${tone}`;
      badge.textContent = item && item.text ? String(item.text) : 'Info';
      badgeRow.appendChild(badge);
    }
    n.appendChild(badgeRow);
  }

  const message = document.createElement('div');
  message.className = 'afw-chat-msg-text';
  message.textContent = String(text || '');
  n.appendChild(message);

  const imageSrc = options && typeof options.image === 'string' ? options.image : '';
  if (imageSrc) {
    const image = document.createElement('img');
    image.className = 'afw-chat-image';
    image.src = imageSrc;
    image.alt = options.alt ? String(options.alt) : 'agent preview screenshot';
    image.addEventListener('click', () => openImageModal(imageSrc, image.alt, image));
    n.appendChild(image);
  }

  const meta = document.createElement('div');
  meta.className = 'afw-chat-meta';
  const who = author === 'user' ? 'Me' : 'AI';
  meta.textContent = `${who} • ${formatChatTime(options.timestamp)}`;
  n.appendChild(meta);

  el.chatList.appendChild(n);
  if (chatScroll && typeof chatScroll.onMessageAppended === 'function') {
    chatScroll.onMessageAppended();
  } else {
    el.chatList.scrollTop = el.chatList.scrollHeight;
  }
}
function ensureSelectedFile() {
  if (Object.prototype.hasOwnProperty.call(state.files, state.selectedFile)) return;
  const first = Object.keys(state.files).sort()[0];
  if (first) state.selectedFile = first;
}

function bindFileActions() {
  el.fileList.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-name]');
    if (!target) return;
    selectFile(target.dataset.name, { persist: true });
    showNotice(`Selected: ${target.dataset.name}`, 'success');
  });

  document.getElementById('afwFileNew').addEventListener('click', async () => {
    const result = await askAction({ title: 'Create File', message: 'Enter a new file name.', mode: 'text', defaultValue: 'new-file.js', okText: 'Create' });
    if (!result.ok) return;
    const name = result.value;
    if (!name) return showNotice('File name cannot be empty.', 'error');
    if (state.files[name]) return showNotice(`File already exists: ${name}`, 'error');
    state.files[name] = '';
    renderFiles();
    selectFile(name, { persist: true });
    queuePersist('file_new');
    logLine(`New file: ${name}`);
    showNotice(`Created: ${name}`, 'success');
  });

  document.getElementById('afwFileRename').addEventListener('click', async () => {
    const from = state.selectedFile;
    if (!from) return showNotice('No file selected.', 'error');
    const result = await askAction({ title: 'Rename File', message: `Rename "${from}" to:`, mode: 'text', defaultValue: from, okText: 'Rename' });
    if (!result.ok) return;
    const to = result.value;
    if (!to || to === from) return;
    if (state.files[to]) return showNotice(`Target exists: ${to}`, 'error');
    state.files[to] = state.files[from];
    delete state.files[from];
    renderFiles();
    selectFile(to, { persist: true });
    compilePreview();
    queuePersist('file_rename');
    logLine(`Rename: ${from} -> ${to}`);
    showNotice(`Renamed to: ${to}`, 'success');
  });

  document.getElementById('afwFileDelete').addEventListener('click', async () => {
    const name = state.selectedFile;
    if (!name) return showNotice('No file selected.', 'error');
    const result = await askAction({ title: 'Delete File', message: `Delete "${name}"? This action cannot be undone.`, mode: 'confirm', okText: 'Delete' });
    if (!result.ok) return;
    delete state.files[name];
    if (!Object.keys(state.files).length) state.files['index.html'] = '';
    ensureSelectedFile();
    renderFiles();
    selectFile(state.selectedFile, { persist: true });
    compilePreview();
    queuePersist('file_delete');
    logLine(`Delete file: ${name}`);
    showNotice(`Deleted: ${name}`, 'info');
  });
}

function bindEditor() {
  el.editor.addEventListener('input', () => {
    state.files[state.selectedFile] = el.editor.value;
    el.codeStatus.textContent = 'unsaved';
    queuePersist('edit_input');
  });
  el.editor.addEventListener('blur', () => { el.codeStatus.textContent = 'saved'; compilePreview(); logLine(`Saved: ${state.selectedFile}`); queuePersist('edit_blur'); });
}

function bindViewControls() {
  document.getElementById('afwViewMode').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-view]');
    if (button) setView(button.dataset.view);
  });
  document.getElementById('afwViewport').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-size]');
    if (button) setViewport(button.dataset.size);
  });
}

function bindChat() {
  const execConsole = bindAfwExecutionConsole();
  bindAfwChat({
    composer: document.getElementById('afwComposer'),
    input: el.input,
    getConfig: () => (state.settingsApi && typeof state.settingsApi.getConfig === 'function' ? state.settingsApi.getConfig() : null),
    isBusy: () => state.chatBusy,
    setBusy: (next) => {
      state.chatBusy = !!next;
      setRunState(state.chatBusy ? 'working' : 'idle');
    },
    addChat,
    logLine,
    showNotice,
    onAgentEvent: (ev) => execConsole.onEvent(ev),
    onTurnStart: (prompt) => execConsole.onTurnStart(prompt),
  });
}

function bindSplitters() {
  const onDrag = (which, clientX) => {
    const rect = el.workspace.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    if (which === 'left') { state.columns[0] = clamp(x, 16, 38); state.columns[1] = clamp(100 - state.columns[0] - state.columns[2], 30, 62); }
    if (which === 'right') { const right = clamp(100 - x, 20, 40); state.columns[2] = right; state.columns[1] = clamp(100 - state.columns[0] - right, 30, 62); }
    el.workspace.style.gridTemplateColumns = `${state.columns[0]}% 6px ${state.columns[1]}% 6px ${state.columns[2]}%`;
  };
  const wire = (id, which) => document.getElementById(id).addEventListener('mousedown', () => {
    const move = (e) => onDrag(which, e.clientX);
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });
  wire('afwSplitterLeft', 'left');
  wire('afwSplitterRight', 'right');
}

async function init() {
  const restored = await loadWorkspaceState(DEFAULT_FILES);
  state.files = restored.files;
  state.selectedFile = restored.selectedFile;
  renderFiles();
  selectFile(state.selectedFile);
  compilePreview();
  setView(state.viewMode);
  setViewport(state.viewport);
  setRunState(state.runState);
  state.themeApi = bindAfwTheme();
  chatScroll = bindAfwChatScroll({ chatList: el.chatList });
  addChat('agent', 'Agent Frontend Worker UI shell ready. Workspace persistence: ON.');
  logLine('AFW initialized');
  bindFileActions();
  bindEditor();
  bindViewControls();
  bindAfwPreviewIsolation({ frame: el.previewFrame, logLine });
  bindAfwWorkspacePanel({ logLine });
  bindChat();
  bindAfwControls({ logLine });
  bindSplitters();
  bindImageModal();
  state.settingsApi = initAfwSettings({
    getThemeMode: () => {
      if (!state.themeApi || typeof state.themeApi.getMode !== 'function') return 'light';
      return state.themeApi.getMode();
    },
    setThemeMode: (mode) => {
      if (!state.themeApi || typeof state.themeApi.setMode !== 'function') return;
      state.themeApi.setMode(mode);
    },
    onSave: (cfg) => {
      showNotice(`Settings saved: ${cfg.provider} / ${cfg.model} / theme=${cfg.themeMode}`, 'success');
      logLine(`Settings updated: ${cfg.provider}, theme=${cfg.themeMode}`);
    },
  });
  initAfwAutomationBindings({
    state,
    el,
    renderFiles,
    selectFile,
    compilePreview,
    rebuildPreviewFrame,
    setView,
    setViewport,
    logLine,
    queuePersist,
    ensureSelectedFile,
  });
  bindAfwPreviewWatchdogBadge({
    badge: el.previewWatchdog,
    getStatus: () => {
      const api = globalThis.__AFW_UI_API__;
      if (!api || typeof api.getPreviewWatchdogStatus !== 'function') return { blocked: false, consecutiveFailures: 0 };
      return api.getPreviewWatchdogStatus();
    },
    logLine,
  });
}

init().catch((error) => {
  addChat('agent', `Init error: ${error && error.message ? error.message : String(error)}`);
  logLine('Init failed');
});
