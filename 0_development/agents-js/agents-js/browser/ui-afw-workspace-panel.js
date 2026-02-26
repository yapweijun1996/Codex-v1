const WORKSPACE_PANEL_KEY = 'afw_workspace_panel_v1';
const DEFAULT_STATE = { collapsed: true, rightCollapsed: false };

function loadState() {
  try {
    const raw = localStorage.getItem(WORKSPACE_PANEL_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_STATE, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(WORKSPACE_PANEL_KEY, JSON.stringify(state));
  } catch {
    // ignore persistence error
  }
}

export function bindAfwWorkspacePanel({ logLine } = {}) {
  const panel = document.getElementById('afwLeftPanel');
  const body = document.getElementById('afwWorkspaceBody');
  const toggle = document.getElementById('afwWorkspaceToggle');
  const rightPanel = document.getElementById('afwRightPanel');
  const rightToggle = document.getElementById('afwAgentPanelToggle');
  const workspace = document.getElementById('afwWorkspace');
  if (!panel || !body || !toggle || !workspace || !rightPanel || !rightToggle) return { isCollapsed: () => true };

  const state = loadState();

  const apply = () => {
    const collapsed = !!state.collapsed;
    panel.classList.toggle('collapsed', collapsed);
    body.classList.toggle('hidden', collapsed);
    workspace.classList.toggle('left-collapsed', collapsed);
    rightPanel.classList.toggle('collapsed', !!state.rightCollapsed);
    workspace.classList.toggle('right-collapsed', !!state.rightCollapsed);
    workspace.classList.toggle('both-collapsed', collapsed && !!state.rightCollapsed);
    toggle.textContent = collapsed ? 'Show Workspace' : 'Hide Workspace';
    rightToggle.textContent = state.rightCollapsed ? 'Show Agent Panel' : 'Hide Agent Panel';
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    rightToggle.setAttribute('aria-expanded', state.rightCollapsed ? 'false' : 'true');
  };

  toggle.addEventListener('click', () => {
    state.collapsed = !state.collapsed;
    apply();
    saveState(state);
    if (typeof logLine === 'function') {
      logLine(`Workspace panel => ${state.collapsed ? 'hidden' : 'visible'}`);
    }
  });
  rightToggle.addEventListener('click', () => {
    state.rightCollapsed = !state.rightCollapsed;
    apply();
    saveState(state);
    if (typeof logLine === 'function') {
      logLine(`Agent panel => ${state.rightCollapsed ? 'hidden' : 'visible'}`);
    }
  });

  apply();
  saveState(state);
  return { isCollapsed: () => !!state.collapsed };
}
