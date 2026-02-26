import { createPreviewWatchdog } from './ui-afw-preview-watchdog.js';

const BRIDGE_CHANNEL = 'AFW_PREVIEW_BRIDGE_V1';
const BRIDGE_TIMEOUT_MS = 1800;
const BRIDGE_TIMEOUT_BY_METHOD = {
  screenshot: 6000,
  getDOM: 3500,
};
const PREVIEW_RELOAD_TIMEOUT_MS = 2500;
const PREVIEW_RELOAD_RETRY_MAX = 1;
let bridgeSeq = 0;
const bridgePending = new Map();
let bridgeListening = false;
const bridgeQueues = new WeakMap();
function bindBridgeListener({ logLine } = {}) {
  if (bridgeListening) return;
  window.addEventListener('message', (event) => {
    const data = event && event.data && typeof event.data === 'object' ? event.data : null;
    if (!data || data.channel !== BRIDGE_CHANNEL || data.kind !== 'response') return;
    const id = String(data.id || '');
    const pending = bridgePending.get(id);
    if (!pending) return;
    if (pending.win !== event.source) return;
    clearTimeout(pending.timer);
    bridgePending.delete(id);
    if (data.ok === false) {
      pending.reject(new Error(String(data.error || 'Preview bridge failed')));
      return;
    }
    pending.resolve(data.result == null ? null : data.result);
  });
  bridgeListening = true;
  if (typeof logLine === 'function') logLine('AFW preview bridge listener ready');
}
function callPreviewBridge(win, method, args, { logLine } = {}) {
  bindBridgeListener({ logLine });
  const id = `afw_bridge_${Date.now()}_${++bridgeSeq}`;
  const timeoutMs = BRIDGE_TIMEOUT_BY_METHOD[String(method || '')] || BRIDGE_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      bridgePending.delete(id);
      reject(new Error(`Preview bridge timeout: ${method}`));
    }, timeoutMs);
    bridgePending.set(id, { resolve, reject, timer, win });
    try {
      win.postMessage({
        channel: BRIDGE_CHANNEL,
        kind: 'request',
        id,
        method: String(method || ''),
        args: Array.isArray(args) ? args : [],
      }, '*');
    } catch (error) {
      clearTimeout(timer);
      bridgePending.delete(id);
      reject(error);
    }
  });
}
function enqueuePreviewBridge(win, method, args, { logLine, isBlocked } = {}) {
  const tail = bridgeQueues.get(win) || Promise.resolve();
  const run = tail
    .catch(() => null)
    .then(() => {
      if (typeof isBlocked === 'function' && isBlocked()) {
        throw new Error(`Preview bridge blocked: ${String(method || 'unknown')}`);
      }
      return callPreviewBridge(win, method, args, { logLine });
    });
  bridgeQueues.set(win, run.catch(() => null));
  return run;
}
function toRegex(pattern, flags = '') {
  try {
    return new RegExp(String(pattern || ''), String(flags || ''));
  } catch {
    return null;
  }
}
function clampInt(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}
function replaceWithLimit(text, regex, replacement, maxReplacements) {
  const source = String(text || '');
  const repl = String(replacement || '');
  const limit = Number(maxReplacements);
  if (!Number.isFinite(limit) || limit <= 0) {
    const replacedAll = source.replace(regex, repl);
    if (!regex.global) return { text: replacedAll, count: replacedAll === source ? 0 : 1 };
    const countRegex = new RegExp(regex.source, regex.flags);
    let count = 0;
    while (countRegex.exec(source)) {
      count += 1;
      if (countRegex.lastIndex === 0) break;
    }
    return { text: replacedAll, count };
  }
  if (!regex.global) {
    const replacedOne = source.replace(regex, repl);
    return { text: replacedOne, count: replacedOne === source ? 0 : 1 };
  }
  let count = 0;
  const replaced = source.replace(regex, (...args) => {
    if (count >= limit) return args[0];
    count += 1;
    return repl;
  });
  return { text: replaced, count };
}
export function exposeAfwAutomationApis({
  getFiles,
  setFile,
  renameFile,
  deleteFile,
  refreshUi,
  getPreviewDriver,
  logLine,
  isPreviewBlocked,
  onPreviewBridgeTimeout,
  onPreviewBridgeSuccess,
} = {}) {
  globalThis.__AFW_WORKSPACE_API__ = {
    listFiles: () => Object.keys(getFiles()).sort(),
    readFile: (name) => getFiles()[name] ?? null,
    writeFile: (name, content = '') => {
      setFile(String(name), String(content));
      refreshUi();
      return true;
    },
    renameFile: (from, to) => {
      const ok = renameFile(from, to);
      if (ok) refreshUi();
      return ok;
    },
    deleteFile: (name) => {
      const ok = deleteFile(name);
      if (ok) refreshUi();
      return ok;
    },
    grepInWorkspace: ({ pattern, flags = '', include, max_matches: maxMatches = 50 } = {}) => {
      if (!pattern) return { error: 'Missing pattern', message: 'pattern is required.' };
      const regex = toRegex(pattern, flags);
      if (!regex) return { error: 'Invalid pattern', message: 'Invalid regex pattern or flags.' };
      const includeRegex = include ? toRegex(include, '') : null;
      if (include && !includeRegex) return { error: 'Invalid include', message: 'Invalid include regex.' };

      const files = getFiles() || {};
      const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
      const limit = Number.isFinite(Number(maxMatches)) ? Math.max(1, Number(maxMatches)) : 50;
      const matches = [];

      for (const [path, content] of entries) {
        if (matches.length >= limit) break;
        if (includeRegex && !includeRegex.test(path)) continue;
        const lines = String(content || '').split(/\r?\n/);
        for (let i = 0; i < lines.length; i += 1) {
          if (matches.length >= limit) break;
          const line = lines[i];
          if (regex.test(line)) {
            matches.push({ path, line: i + 1, text: line });
          }
          if (regex.global) regex.lastIndex = 0;
        }
      }

      return {
        matches,
        truncated: matches.length >= limit,
        files_scanned: entries.length,
      };
    },
    replaceInFile: ({
      path,
      pattern,
      flags = '',
      replacement = '',
      line_start: lineStart,
      line_end: lineEnd,
      max_replacements: maxReplacements = 0,
    } = {}) => {
      const filePath = String(path || '');
      if (!filePath) return { error: 'Missing path', message: 'path is required.' };
      const files = getFiles() || {};
      if (!Object.prototype.hasOwnProperty.call(files, filePath)) return { error: 'File not found', path: filePath };

      const original = String(files[filePath] || '');
      const lines = original.split('\n');
      const start = clampInt(lineStart == null ? 1 : lineStart, 1, Math.max(1, lines.length));
      const end = clampInt(lineEnd == null ? lines.length : lineEnd, start, Math.max(start, lines.length));

      const prefix = lines.slice(0, start - 1);
      const target = lines.slice(start - 1, end);
      const suffix = lines.slice(end);
      let nextTargetText = target.join('\n');
      let replacedCount = 0;
      let mode = 'line_range';

      if (pattern != null && String(pattern) !== '') {
        const regex = toRegex(pattern, flags);
        if (!regex) return { error: 'Invalid pattern', message: 'Invalid regex pattern or flags.' };
        const out = replaceWithLimit(nextTargetText, regex, replacement, maxReplacements);
        nextTargetText = out.text;
        replacedCount = out.count;
        mode = 'pattern';
      } else {
        nextTargetText = String(replacement || '');
        replacedCount = nextTargetText === target.join('\n') ? 0 : 1;
      }

      const nextContent = [...prefix, nextTargetText, ...suffix].join('\n');
      const changed = nextContent !== original;
      if (changed) {
        setFile(filePath, nextContent);
        refreshUi();
      }
      return {
        ok: true,
        changed,
        path: filePath,
        mode,
        replacements: replacedCount,
        range: { line_start: start, line_end: end },
        chars_before: original.length,
        chars_after: nextContent.length,
      };
    },
  };
  const callDriver = async (method, ...args) => {
    if (typeof isPreviewBlocked === 'function' && isPreviewBlocked()) {
      if (typeof logLine === 'function') {
        logLine(`Preview bridge blocked by watchdog (${String(method || 'unknown')})`);
      }
      return null;
    }
    const win = getPreviewDriver();
    if (!win) return null;
    try {
      const result = await enqueuePreviewBridge(win, method, args, { logLine, isBlocked: isPreviewBlocked });
      if (typeof onPreviewBridgeSuccess === 'function') onPreviewBridgeSuccess(`bridge:${String(method || 'unknown')}`);
      return result;
    } catch (error) {
      const msg = String(error && error.message || '');
      if (msg.includes('Preview bridge blocked')) return null;
      const isBridgeTimeout = msg.includes('Preview bridge timeout');
      if (isBridgeTimeout && typeof onPreviewBridgeTimeout === 'function') {
        onPreviewBridgeTimeout(`bridge_timeout:${String(method || 'unknown')}`);
      }
      const isScreenshotTimeout = String(method || '') === 'screenshot'
        && isBridgeTimeout;
      if (isScreenshotTimeout) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 160));
          const retryResult = await enqueuePreviewBridge(win, method, args, { logLine, isBlocked: isPreviewBlocked });
          if (typeof onPreviewBridgeSuccess === 'function') onPreviewBridgeSuccess('bridge:screenshot_retry');
          return retryResult;
        } catch (retryError) {
          if (typeof logLine === 'function') {
            const retryMsg = retryError && retryError.message ? retryError.message : String(retryError);
            logLine(`Preview bridge retry failed (${String(method || 'unknown')}): ${retryMsg}`);
          }
          return null;
        }
      }
      if (typeof logLine === 'function') {
        const msg = error && error.message ? error.message : String(error);
        logLine(`Preview bridge request failed (${String(method || 'unknown')}): ${msg}`);
      }
      return null;
    }
  };

  globalThis.__AFW_PREVIEW_API__ = {
    call: callDriver,
    getDOM: () => callDriver('getDOM'),
    screenshot: () => callDriver('screenshot'),
    getConsoleLogs: () => callDriver('getConsoleLogs'),
    getRuntimeErrors: () => callDriver('getRuntimeErrors'),
    getPerfMetrics: () => callDriver('getPerfMetrics'),
  };
}
export function initAfwAutomationBindings({
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
} = {}) {
  const previewWatchdog = createPreviewWatchdog({
    rebuildPreviewFrame,
    logLine,
  });
  const tripPreviewWatchdog = (reason, options) => previewWatchdog.trip(reason, options);

  exposeAfwAutomationApis({
    getFiles: () => state.files,
    setFile: (name, content) => {
      state.files[name] = content;
      if (state.selectedFile === name) el.editor.value = content;
      queuePersist('api_write');
    },
    renameFile: (from, to) => {
      if (!state.files[from] || state.files[to]) return false;
      state.files[to] = state.files[from];
      delete state.files[from];
      if (state.selectedFile === from) state.selectedFile = to;
      queuePersist('api_rename');
      return true;
    },
    deleteFile: (name) => {
      if (!state.files[name]) return false;
      delete state.files[name];
      if (!Object.keys(state.files).length) state.files['index.html'] = '';
      ensureSelectedFile();
      queuePersist('api_delete');
      return true;
    },
    refreshUi: () => { renderFiles(); selectFile(state.selectedFile); compilePreview(); },
    logLine,
    isPreviewBlocked: () => previewWatchdog.isBlocked(),
    onPreviewBridgeTimeout: (reason) => {
      tripPreviewWatchdog(reason, { autoRebuild: true });
    },
    onPreviewBridgeSuccess: (reason) => {
      previewWatchdog.noteSuccess(reason);
    },
    getPreviewDriver: () => {
      try {
        return el.previewFrame && el.previewFrame.contentWindow ? el.previewFrame.contentWindow : null;
      } catch (error) {
        if (typeof logLine === 'function') {
          logLine(`Preview driver access blocked (cross-origin): ${error && error.message ? error.message : 'unknown error'}`);
        }
        return null;
      }
    },
  });
  globalThis.__AFW_UI_API__ = {
    reloadPreview: async () => {
      if (previewWatchdog.isBlocked()) {
        if (typeof logLine === 'function') logLine('UI API: preview reload blocked by watchdog');
        return { ok: false, loaded: false, blocked: true };
      }
      const frame = el && el.previewFrame ? el.previewFrame : null;
      if (!frame || typeof frame.addEventListener !== 'function') {
        compilePreview();
        if (typeof logLine === 'function') logLine('UI API: preview reloaded (no frame handle)');
        return { ok: true, loaded: false };
      }
      const waitFrameLoad = async (targetFrame) => await new Promise((resolve) => {
        let done = false;
        const finish = (ok) => {
          if (done) return;
          done = true;
          targetFrame.removeEventListener('load', onLoad);
          resolve(!!ok);
        };
        const onLoad = () => finish(true);
        targetFrame.addEventListener('load', onLoad, { once: true });
        compilePreview();
        setTimeout(() => finish(false), PREVIEW_RELOAD_TIMEOUT_MS);
      });
      let loaded = await waitFrameLoad(frame);
      let recovered = false;
      let attempt = 0;
      while (!loaded && attempt < PREVIEW_RELOAD_RETRY_MAX) {
        attempt += 1;
        const trip = tripPreviewWatchdog('reload_timeout', { autoRebuild: true });
        if (!trip.rebuilt || previewWatchdog.isBlocked()) break;
        const nextFrame = el && el.previewFrame ? el.previewFrame : null;
        if (!nextFrame || typeof nextFrame.addEventListener !== 'function') break;
        loaded = await waitFrameLoad(nextFrame);
        recovered = loaded;
      }
      if (loaded) {
        previewWatchdog.noteSuccess(recovered ? 'reload_recovered' : 'reload_ok');
      }
      if (typeof logLine === 'function') {
        const suffix = loaded ? (recovered ? ' (recovered)' : '') : ' (load timeout)';
        logLine(`UI API: preview reloaded${suffix}`);
      }
      return { ok: true, loaded, recovered, blocked: previewWatchdog.isBlocked() };
    },
    setViewMode: (mode) => {
      if (typeof setView === 'function') setView(mode);
      return true;
    },
    setViewport: (size) => {
      if (typeof setViewport === 'function') setViewport(size);
      return true;
    },
    getPreviewWatchdogStatus: () => previewWatchdog.getStatus(),
  };
}
