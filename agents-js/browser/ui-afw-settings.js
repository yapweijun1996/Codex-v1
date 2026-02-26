const CONFIG_KEY = 'afw_settings_v1';
const API_KEY_LOCAL = 'afw_api_key_local';
const API_KEY_SESSION = 'afw_api_key_session';

const DEFAULT_CONFIG = {
  provider: 'gemini',
  model: 'gemini-2.5-pro',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  persistApiKey: false,
  themeMode: 'light',
};

function normalizeThemeMode(value) {
  const mode = String(value || '').toLowerCase();
  if (mode === 'dark' || mode === 'system') return mode;
  return 'light';
}

function loadConfig() {
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); } catch { stored = null; }
  const merged = { ...DEFAULT_CONFIG, ...(stored || {}) };
  const keyStore = merged.persistApiKey ? localStorage : sessionStorage;
  const keyName = merged.persistApiKey ? API_KEY_LOCAL : API_KEY_SESSION;
  merged.apiKey = keyStore.getItem(keyName) || '';
  return merged;
}

function persistConfig(config) {
  const safe = { ...config };
  delete safe.apiKey;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(safe));
  if (config.persistApiKey) {
    localStorage.setItem(API_KEY_LOCAL, config.apiKey || '');
    sessionStorage.removeItem(API_KEY_SESSION);
  } else {
    sessionStorage.setItem(API_KEY_SESSION, config.apiKey || '');
    localStorage.removeItem(API_KEY_LOCAL);
  }
}

function recommendedModel(provider) {
  return provider === 'openai' ? 'gpt-5' : 'gemini-2.5-pro';
}

export function initAfwSettings({ onSave, getThemeMode, setThemeMode } = {}) {
  const ui = {
    backdrop: document.getElementById('afwSettingsBackdrop'),
    form: document.getElementById('afwSettingsForm'),
    openButton: document.getElementById('afwSettingsButton'),
    closeButton: document.getElementById('afwSettingsClose'),
    cancelButton: document.getElementById('afwSettingsCancel'),
    providerBadge: document.getElementById('afwProviderBadge'),
    provider: document.getElementById('afwSettingProvider'),
    model: document.getElementById('afwSettingModel'),
    baseUrlWrap: document.getElementById('afwSettingBaseUrlWrap'),
    baseUrl: document.getElementById('afwSettingBaseUrl'),
    apiKey: document.getElementById('afwSettingApiKey'),
    persistKey: document.getElementById('afwSettingPersistKey'),
    theme: document.getElementById('afwSettingTheme'),
  };

  let config = loadConfig();
  let previousFocus = null;

  const applyProviderUi = () => {
    const isOpenAi = ui.provider.value === 'openai';
    ui.baseUrlWrap.classList.toggle('hidden', !isOpenAi);
    ui.providerBadge.textContent = ui.provider.value;
  };

  const fillForm = () => {
    const externalThemeMode = typeof getThemeMode === 'function' ? getThemeMode() : null;
    if (externalThemeMode) config.themeMode = normalizeThemeMode(externalThemeMode);
    ui.provider.value = config.provider;
    ui.model.value = config.model;
    ui.baseUrl.value = config.baseUrl;
    ui.apiKey.value = config.apiKey;
    ui.persistKey.checked = !!config.persistApiKey;
    if (ui.theme) ui.theme.value = normalizeThemeMode(config.themeMode);
    applyProviderUi();
  };

  const collectForm = () => ({
    provider: ui.provider.value,
    model: ui.model.value.trim() || recommendedModel(ui.provider.value),
    baseUrl: ui.baseUrl.value.trim() || DEFAULT_CONFIG.baseUrl,
    apiKey: ui.apiKey.value.trim(),
    persistApiKey: ui.persistKey.checked,
    themeMode: normalizeThemeMode(ui.theme ? ui.theme.value : config.themeMode),
  });

  const open = () => {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    fillForm();
    ui.backdrop.classList.remove('hidden');
    ui.backdrop.setAttribute('aria-hidden', 'false');
  };

  const close = () => {
    if (document.activeElement instanceof HTMLElement && ui.backdrop.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    ui.backdrop.classList.add('hidden');
    ui.backdrop.setAttribute('aria-hidden', 'true');
    if (previousFocus && typeof previousFocus.focus === 'function') {
      setTimeout(() => previousFocus.focus(), 0);
    }
  };

  ui.openButton?.addEventListener('click', open);
  ui.closeButton?.addEventListener('click', close);
  ui.cancelButton?.addEventListener('click', close);
  ui.backdrop?.addEventListener('click', (event) => {
    if (event.target === ui.backdrop) close();
  });

  ui.provider?.addEventListener('change', () => {
    applyProviderUi();
    if (!ui.model.value.trim() || ui.model.value === 'gemini-2.5-pro' || ui.model.value === 'gpt-5') {
      ui.model.value = recommendedModel(ui.provider.value);
    }
  });

  ui.form?.addEventListener('submit', (event) => {
    event.preventDefault();
    config = collectForm();
    persistConfig(config);
    applyProviderUi();
    if (typeof setThemeMode === 'function') setThemeMode(config.themeMode);
    if (typeof onSave === 'function') onSave(config);
    close();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!ui.backdrop || ui.backdrop.classList.contains('hidden')) return;
    close();
  });

  fillForm();
  return { getConfig: () => ({ ...config }) };
}
