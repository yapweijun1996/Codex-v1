import { bindAfwTheme } from '../browser/ui-afw-theme.js';

function createStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    snapshot() {
      return { ...data };
    },
  };
}

function createButton() {
  const listeners = new Map();
  return {
    textContent: '',
    _attrs: {},
    addEventListener(name, fn) {
      listeners.set(String(name), fn);
    },
    removeEventListener(name) {
      listeners.delete(String(name));
    },
    setAttribute(name, value) {
      this._attrs[String(name)] = String(value);
    },
    click() {
      const fn = listeners.get('click');
      if (typeof fn === 'function') fn();
    },
  };
}

function createRoot() {
  return {
    _attrs: {},
    setAttribute(name, value) {
      this._attrs[String(name)] = String(value);
    },
  };
}

function createMediaQueryMock(initialMatches = false) {
  const listeners = new Set();
  const state = {
    matches: !!initialMatches,
    addEventListener(name, fn) {
      if (String(name) === 'change' && typeof fn === 'function') listeners.add(fn);
    },
    removeEventListener(name, fn) {
      if (String(name) === 'change' && typeof fn === 'function') listeners.delete(fn);
    },
    setMatches(next) {
      state.matches = !!next;
      for (const fn of listeners) fn({ matches: state.matches });
    },
  };
  return state;
}

describe('AFW theme toggle', () => {
  it('defaults to light and persists mode in localStorage', () => {
    const root = createRoot();
    const button = createButton();
    const storage = createStorage();

    const api = bindAfwTheme({ root, toggleButton: button, storage });
    expect(root._attrs['data-theme']).toBe('light');
    expect(button.textContent).toBe('Theme: Light');
    expect(storage.snapshot().afw_theme_mode_v1).toBe('light');

    button.click();
    expect(root._attrs['data-theme']).toBe('dark');
    expect(button.textContent).toBe('Theme: Dark');
    expect(storage.snapshot().afw_theme_mode_v1).toBe('dark');
    expect(api.getMode()).toBe('dark');
  });

  it('supports follow system mode and reacts to system theme changes', () => {
    const root = createRoot();
    const button = createButton();
    const storage = createStorage({ afw_theme_mode_v1: 'system' });
    const media = createMediaQueryMock(false);

    const api = bindAfwTheme({
      root,
      toggleButton: button,
      storage,
      matchMediaFn: () => media,
    });

    expect(api.getMode()).toBe('system');
    expect(root._attrs['data-theme']).toBe('light');
    expect(button.textContent).toBe('Theme: System (Light)');

    media.setMatches(true);
    expect(root._attrs['data-theme']).toBe('dark');
    expect(button.textContent).toBe('Theme: System (Dark)');
    expect(storage.snapshot().afw_theme_v1).toBe('dark');
  });

  it('keeps selected theme after refresh (rebind)', () => {
    const storage = createStorage();
    const firstRoot = createRoot();
    const firstButton = createButton();

    const firstApi = bindAfwTheme({
      root: firstRoot,
      toggleButton: firstButton,
      storage,
    });

    expect(firstRoot._attrs['data-theme']).toBe('light');
    firstButton.click();
    expect(firstRoot._attrs['data-theme']).toBe('dark');
    expect(storage.snapshot().afw_theme_mode_v1).toBe('dark');
    firstApi.dispose();

    const secondRoot = createRoot();
    const secondButton = createButton();
    const secondApi = bindAfwTheme({
      root: secondRoot,
      toggleButton: secondButton,
      storage,
    });

    expect(secondApi.getMode()).toBe('dark');
    expect(secondRoot._attrs['data-theme']).toBe('dark');
    expect(secondButton.textContent).toBe('Theme: Dark');
  });
});
