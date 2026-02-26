const CONTROL_KEY = 'afw_controls_v1';

const DEFAULT_CONTROL_STATE = {
  allowPatchApply: true,
  autoTestAfterPatch: true,
  collectConsoleLogs: true,
  collectScreenshot: true,
  enableInteractionTools: false,
  limitScopeCurrentFile: false,
  collapsed: true,
};

function loadState() {
  try {
    const raw = localStorage.getItem(CONTROL_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_CONTROL_STATE, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...DEFAULT_CONTROL_STATE };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(CONTROL_KEY, JSON.stringify(state));
  } catch {
    // ignore persistence error
  }
}

export function bindAfwControls({ logLine } = {}) {
  const root = document.getElementById('afwControls');
  const body = document.getElementById('afwControlsBody');
  const toggleBtn = document.getElementById('afwControlsToggle');
  if (!root || !body || !toggleBtn) return { getState: () => ({ ...DEFAULT_CONTROL_STATE }) };

  const state = loadState();
  const inputs = Array.from(body.querySelectorAll('input[type="checkbox"][data-key]'));

  const applyCollapsed = () => {
    body.classList.toggle('hidden', !!state.collapsed);
    root.classList.toggle('collapsed', !!state.collapsed);
    toggleBtn.textContent = state.collapsed ? 'Show' : 'Hide';
  };

  for (const input of inputs) {
    const key = input.dataset.key;
    if (!key) continue;
    input.checked = !!state[key];
    input.addEventListener('change', () => {
      state[key] = !!input.checked;
      saveState(state);
      if (typeof logLine === 'function') logLine(`Control ${key} => ${state[key] ? 'ON' : 'OFF'}`);
    });
  }

  toggleBtn.addEventListener('click', () => {
    state.collapsed = !state.collapsed;
    applyCollapsed();
    saveState(state);
  });

  applyCollapsed();
  saveState(state);

  globalThis.__AFW_CONTROL_API__ = {
    getState: () => ({ ...state }),
    set(name, value) {
      if (!Object.prototype.hasOwnProperty.call(state, name) || name === 'collapsed') return false;
      state[name] = !!value;
      const target = inputs.find((n) => n.dataset.key === name);
      if (target) target.checked = !!value;
      saveState(state);
      return true;
    },
    toggle(name) {
      if (!Object.prototype.hasOwnProperty.call(state, name) || name === 'collapsed') return false;
      return this.set(name, !state[name]);
    },
  };

  return { getState: () => ({ ...state }) };
}
