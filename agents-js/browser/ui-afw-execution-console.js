import { extractPreviewReloadWarnings } from './ui-afw-warning-utils.js';
const EXEC_KEY = 'afw_exec_console_v1';
const DEFAULT_EXEC_STATE = { collapsed: true };

function asText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function extractToolName(ev) {
  const details = ev && ev.details ? ev.details : {};
  if (details.toolName) return String(details.toolName);
  if (details.name) return String(details.name);
  if (ev.tool) return String(ev.tool);
  return 'tool';
}

function mapEvent(ev) {
  const type = String(ev && ev.type ? ev.type : 'unknown');
  if (type === 'tool.call') return { level: 'info', label: 'TOOL', message: `Requested: ${asText(ev.details && ev.details.map ? ev.details.map((d) => d.name).join(', ') : 'tool call')}` };
  if (type === 'tool.call.begin') return { level: 'working', label: 'RUN', message: `Running ${extractToolName(ev)}` };
  if (type === 'tool.call.end') return { level: 'ok', label: 'DONE', message: `${extractToolName(ev)} finished` };
  if (type === 'tool.error') return { level: 'error', label: 'ERR', message: `${extractToolName(ev)} failed: ${asText(ev.error).slice(0, 120)}` };
  if (type === 'approval.required') return { level: 'warn', label: 'WAIT', message: 'Approval required' };
  if (type === 'done_gate.started') return { level: 'working', label: 'GATE', message: 'Running done gate checks' };
  if (type === 'done_gate.viewport.checked') {
    const d = ev && ev.details ? ev.details : {};
    if (d.loaded === false) {
      return {
        level: 'warn',
        label: 'WARN',
        message: `preview_reload_unloaded:${d.size || 'viewport'}`,
      };
    }
    return { level: 'info', label: 'CHK', message: `${d.size || 'viewport'} console=${d.consoleErrors || 0} runtime=${d.runtimeErrors || 0} screenshot=${d.screenshot ? 'yes' : 'no'}` };
  }
  if (type === 'done_gate.completed') {
    const d = ev && ev.details ? ev.details : {};
    const status = d.pass ? 'PASS' : 'FAIL';
    const warningList = extractPreviewReloadWarnings(d && d.warnings);
    if (warningList.length > 0) {
      return { level: 'warn', label: 'WARN', message: warningList.join(', ') };
    }
    return { level: d.pass ? 'ok' : 'error', label: 'GATE', message: `${status} issues=${Array.isArray(d.issues) ? d.issues.join(',') || 'none' : 'none'}` };
  }
  if (type === 'turn.completed') return { level: 'ok', label: 'DONE', message: 'Turn completed' };
  if (type === 'error') return { level: 'error', label: 'ERR', message: asText(ev.message || 'Unknown error') };
  return null;
}

function loadExecState() {
  try {
    const raw = localStorage.getItem(EXEC_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_EXEC_STATE, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...DEFAULT_EXEC_STATE };
  }
}

function saveExecState(state) {
  try {
    localStorage.setItem(EXEC_KEY, JSON.stringify(state));
  } catch {
    // ignore persistence error
  }
}

export function bindAfwExecutionConsole() {
  const panel = document.getElementById('afwExecPanel');
  const list = document.getElementById('afwExecList');
  const clearBtn = document.getElementById('afwExecClear');
  const toggleBtn = document.getElementById('afwExecToggle');
  if (!list) return { onEvent: () => null, onTurnStart: () => null };
  const state = loadExecState();

  const applyCollapsed = () => {
    const collapsed = !!state.collapsed;
    list.classList.toggle('hidden', collapsed);
    if (panel) panel.classList.toggle('collapsed', collapsed);
    if (toggleBtn) toggleBtn.textContent = collapsed ? 'Show' : 'Hide';
  };

  const push = (level, label, message) => {
    const li = document.createElement('li');
    li.className = `afw-exec-item ${level}`;
    const time = new Date().toLocaleTimeString();
    li.innerHTML = `<span class="afw-exec-tag">${label}</span><span class="afw-exec-time">${time}</span><span class="afw-exec-msg">${message}</span>`;
    list.prepend(li);
    while (list.children.length > 160) list.removeChild(list.lastChild);
  };

  clearBtn?.addEventListener('click', () => { list.innerHTML = ''; });
  toggleBtn?.addEventListener('click', () => {
    state.collapsed = !state.collapsed;
    applyCollapsed();
    saveExecState(state);
  });

  applyCollapsed();
  saveExecState(state);

  return {
    onTurnStart(prompt) {
      push('info', 'TASK', asText(prompt).slice(0, 140));
    },
    onEvent(ev) {
      const mapped = mapEvent(ev);
      if (!mapped) return;
      push(mapped.level, mapped.label, mapped.message);
    },
  };
}
