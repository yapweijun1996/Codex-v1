const THEME_MODE_KEY = 'afw_theme_mode_v1';
const LEGACY_THEME_KEY = 'afw_theme_v1';
const DEFAULT_MODE = 'light';

function normalizeMode(value) {
  const mode = String(value || '').toLowerCase();
  if (mode === 'dark' || mode === 'system') return mode;
  return 'light';
}

function resolveTheme(mode, mediaQueryList) {
  if (mode !== 'system') return mode;
  return mediaQueryList && mediaQueryList.matches ? 'dark' : 'light';
}

function getSystemMedia(matchMediaFn) {
  if (typeof matchMediaFn !== 'function') return null;
  try {
    return matchMediaFn('(prefers-color-scheme: dark)');
  } catch {
    return null;
  }
}

function readMode(storage, fallbackMode) {
  if (!storage || typeof storage.getItem !== 'function') return fallbackMode;
  try {
    const savedMode = storage.getItem(THEME_MODE_KEY);
    if (savedMode) return normalizeMode(savedMode);
    const legacyTheme = storage.getItem(LEGACY_THEME_KEY);
    if (legacyTheme) return normalizeMode(legacyTheme);
    return fallbackMode;
  } catch {
    return fallbackMode;
  }
}

function writeMode(storage, mode, resolvedTheme) {
  if (!storage || typeof storage.setItem !== 'function') return;
  try {
    storage.setItem(THEME_MODE_KEY, mode);
    storage.setItem(LEGACY_THEME_KEY, resolvedTheme);
  } catch {
    // ignore persistence error
  }
}

function applyMode({ root, toggleButton, mode, mediaQueryList }) {
  const resolvedTheme = resolveTheme(mode, mediaQueryList);
  if (root && typeof root.setAttribute === 'function') {
    root.setAttribute('data-theme', resolvedTheme);
  }
  if (toggleButton) {
    const suffix = mode === 'system' ? `System (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})` : (mode === 'dark' ? 'Dark' : 'Light');
    const label = `Theme: ${suffix}`;
    toggleButton.textContent = label;
    if (typeof toggleButton.setAttribute === 'function') {
      toggleButton.setAttribute('aria-label', label);
    }
  }
  return resolvedTheme;
}

function nextMode(currentMode) {
  if (currentMode === 'light') return 'dark';
  if (currentMode === 'dark') return 'system';
  return 'light';
}

export function bindAfwTheme({
  root,
  toggleButton,
  storage,
  storageKey = THEME_MODE_KEY,
  defaultTheme = DEFAULT_MODE,
  matchMediaFn,
} = {}) {
  void storageKey;
  const doc = typeof document === 'object' && document ? document : null;
  const themeRoot = root || (doc && doc.documentElement ? doc.documentElement : null);
  const button = toggleButton || (doc && typeof doc.getElementById === 'function' ? doc.getElementById('afwThemeToggle') : null);
  const safeStorage = storage || (typeof localStorage === 'object' ? localStorage : null);
  const mediaQueryList = getSystemMedia(matchMediaFn || (typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia : null));

  let currentMode = readMode(safeStorage, normalizeMode(defaultTheme));
  let currentTheme = applyMode({ root: themeRoot, toggleButton: button, mode: currentMode, mediaQueryList });
  writeMode(safeStorage, currentMode, currentTheme);

  const onToggle = () => {
    currentMode = nextMode(currentMode);
    currentTheme = applyMode({ root: themeRoot, toggleButton: button, mode: currentMode, mediaQueryList });
    writeMode(safeStorage, currentMode, currentTheme);
  };

  const onSystemThemeChanged = () => {
    if (currentMode !== 'system') return;
    currentTheme = applyMode({ root: themeRoot, toggleButton: button, mode: currentMode, mediaQueryList });
    writeMode(safeStorage, currentMode, currentTheme);
  };

  if (button && typeof button.addEventListener === 'function') {
    button.addEventListener('click', onToggle);
  }

  if (mediaQueryList) {
    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', onSystemThemeChanged);
    } else if (typeof mediaQueryList.addListener === 'function') {
      mediaQueryList.addListener(onSystemThemeChanged);
    }
  }

  return {
    getTheme() {
      return currentTheme;
    },
    getMode() {
      return currentMode;
    },
    setTheme(nextTheme) {
      currentMode = normalizeMode(nextTheme);
      currentTheme = applyMode({ root: themeRoot, toggleButton: button, mode: currentMode, mediaQueryList });
      writeMode(safeStorage, currentMode, currentTheme);
      return currentTheme;
    },
    setMode(nextModeInput) {
      currentMode = normalizeMode(nextModeInput);
      currentTheme = applyMode({ root: themeRoot, toggleButton: button, mode: currentMode, mediaQueryList });
      writeMode(safeStorage, currentMode, currentTheme);
      return currentMode;
    },
    dispose() {
      if (button && typeof button.removeEventListener === 'function') {
        button.removeEventListener('click', onToggle);
      }
      if (mediaQueryList) {
        if (typeof mediaQueryList.removeEventListener === 'function') {
          mediaQueryList.removeEventListener('change', onSystemThemeChanged);
        } else if (typeof mediaQueryList.removeListener === 'function') {
          mediaQueryList.removeListener(onSystemThemeChanged);
        }
      }
    },
  };
}
