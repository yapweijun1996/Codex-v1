import { withPreviewCspMeta } from './ui-afw-preview-csp.js';

function escapeInlineScript(source) {
  return String(source || '').replace(/<\/script>/gi, '<\\/script>');
}

function stripManagedAssetRefs(html) {
  let output = String(html || '');
  // Remove external refs for AFW-managed assets to avoid duplicate load/404 in srcdoc mode.
  output = output.replace(
    /<link\b[^>]*href\s*=\s*["'](?:\.\/|\/)?style\.css(?:[?#][^"']*)?["'][^>]*>/gi,
    '',
  );
  output = output.replace(
    /<script\b[^>]*src\s*=\s*["'](?:\.\/|\/)?app\.js(?:[?#][^"']*)?["'][^>]*>\s*<\/script>/gi,
    '',
  );
  return output;
}

const DRIVER_BOOTSTRAP = `
(function initAfwDriver() {
  if (window.__AFDW_DRIVER__) return;
  const BRIDGE_CHANNEL = 'AFW_PREVIEW_BRIDGE_V1';
  const state = {
    logs: [],
    errors: [],
    perf: { lcp: 0, cls: 0, longTasks: 0, maxLongTask: 0, fcp: 0 }
  };
  const cap = (arr, max) => { if (arr.length > max) arr.splice(0, arr.length - max); };
  const pushLog = (level, args) => {
    const text = (args || []).map((a) => {
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch { return String(a); }
    }).join(' ');
    state.logs.push({ ts: Date.now(), level, text });
    cap(state.logs, 240);
  };
  const pushError = (name, message, stack) => {
    state.errors.push({ ts: Date.now(), name: String(name || 'Error'), message: String(message || ''), stack: String(stack || '') });
    cap(state.errors, 120);
  };

  ['log', 'warn', 'error', 'info'].forEach((key) => {
    const original = console[key];
    console[key] = function patchedConsole(...args) {
      pushLog(key, args);
      if (typeof original === 'function') original.apply(console, args);
    };
  });

  window.addEventListener('error', (event) => {
    pushError(event.error && event.error.name, event.message, event.error && event.error.stack);
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason && reason.message ? reason.message : String(reason || 'Unhandled rejection');
    const stack = reason && reason.stack ? reason.stack : '';
    pushError('UnhandledRejection', message, stack);
  });

  try {
    const poLcp = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const last = entries[entries.length - 1];
      if (last && last.startTime) state.perf.lcp = Math.round(last.startTime);
    });
    poLcp.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  try {
    const poCls = new PerformanceObserver((entryList) => {
      for (const e of entryList.getEntries()) {
        if (!e.hadRecentInput) state.perf.cls += e.value || 0;
      }
    });
    poCls.observe({ type: 'layout-shift', buffered: true });
  } catch {}
  try {
    const poLong = new PerformanceObserver((entryList) => {
      for (const e of entryList.getEntries()) {
        state.perf.longTasks += 1;
        state.perf.maxLongTask = Math.max(state.perf.maxLongTask, Math.round(e.duration || 0));
      }
    });
    poLong.observe({ type: 'longtask', buffered: true });
  } catch {}
  try {
    const paints = performance.getEntriesByType('paint') || [];
    const fcp = paints.find((p) => p && p.name === 'first-contentful-paint');
    if (fcp && fcp.startTime) state.perf.fcp = Math.round(fcp.startTime);
  } catch {}

  async function screenshot() {
    try {
      pushLog('info', ['[AFW] screenshot start']);
      try {
        window.scrollTo(0, 0);
      } catch {}
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const root = document.documentElement;
      const width = Math.max(window.innerWidth, 1);
      const height = Math.max(window.innerHeight, 1);
      const bodyBg = getComputedStyle(document.body || root).backgroundColor || '';
      const htmlBg = getComputedStyle(root).backgroundColor || '';
      const bgColor = (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent')
        ? bodyBg
        : ((htmlBg && htmlBg !== 'rgba(0, 0, 0, 0)' && htmlBg !== 'transparent') ? htmlBg : '#ffffff');
      const rawHtml = new XMLSerializer().serializeToString(root);
      const html = String(rawHtml)
        .replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi, '')
        .replace(/<link\\b[^>]*href\\s*=\\s*["']https?:[^"']*["'][^>]*>/gi, '')
        .replace(/\\s(?:src|href)\\s*=\\s*["']https?:[^"']*["']/gi, '')
        .replace(/url\\(\\s*["']?https?:[^)"']*["']?\\s*\\)/gi, 'none')
        .replace(/@import\\s+url\\(\\s*["']?https?:[^)"']*["']?\\s*\\)\\s*;?/gi, '');
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><rect width="100%" height="100%" fill="' + bgColor + '"/><foreignObject width="100%" height="100%">' + html + '</foreignObject></svg>';
      const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      try {
        const dataUrl = await new Promise((resolve) => {
          const image = new Image();
          image.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) return resolve(svgDataUrl);
              ctx.fillStyle = bgColor;
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(image, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } catch (error) {
              const message = error && error.message ? error.message : String(error || 'screenshot_failed');
              pushError('ScreenshotError', message, error && error.stack ? error.stack : '');
              resolve(svgDataUrl);
            }
          };
          image.onerror = () => resolve(svgDataUrl);
          image.src = url;
        });
        pushLog('info', ['[AFW] screenshot done', { ok: !!dataUrl, chars: dataUrl ? String(dataUrl).length : 0 }]);
        return dataUrl;
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      return null;
    }
  }

  window.__AFDW_DRIVER__ = {
    hover(selector) {
      const node = document.querySelector(String(selector || ''));
      if (!node) return { ok: false, error: 'Element not found' };
      try {
        node.dispatchEvent(new MouseEvent('pointerover', { bubbles: true, cancelable: true, composed: true }));
      } catch {}
      node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, composed: true }));
      node.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true, composed: true }));
      try { node.focus(); } catch {}
      return { ok: true };
    },
    click(selector) {
      const node = document.querySelector(String(selector || ''));
      if (!node) return { ok: false, error: 'Element not found' };
      node.click();
      return { ok: true };
    },
    type(selector, text) {
      const node = document.querySelector(String(selector || ''));
      if (!node) return { ok: false, error: 'Element not found' };
      const value = String(text || '');
      if ('value' in node) {
        node.focus();
        node.value = value;
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true, chars: value.length };
      }
      return { ok: false, error: 'Target is not input-like' };
    },
    pressKey(key) {
      const target = document.activeElement || document.body || document.documentElement;
      if (!target) return { ok: false, error: 'No active target' };
      const value = String(key || '').trim();
      if (!value) return { ok: false, error: 'Key is required' };
      const down = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true });
      const up = new KeyboardEvent('keyup', { key: value, bubbles: true, cancelable: true });
      target.dispatchEvent(down);
      if (value.length === 1) {
        target.dispatchEvent(new KeyboardEvent('keypress', { key: value, bubbles: true, cancelable: true }));
      }
      target.dispatchEvent(up);
      return { ok: true, key: value };
    },
    drag(fromSelector, toSelector) {
      const from = document.querySelector(String(fromSelector || ''));
      const to = document.querySelector(String(toSelector || ''));
      if (!from) return { ok: false, error: 'Source element not found' };
      if (!to) return { ok: false, error: 'Target element not found' };
      const dt = typeof DataTransfer === 'function' ? new DataTransfer() : null;
      const makeEvent = (type) => {
        if (typeof DragEvent === 'function') {
          return new DragEvent(type, {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt || undefined,
          });
        }
        const event = new Event(type, { bubbles: true, cancelable: true });
        if (dt) {
          try { Object.defineProperty(event, 'dataTransfer', { value: dt }); } catch {}
        }
        return event;
      };
      from.dispatchEvent(makeEvent('dragstart'));
      to.dispatchEvent(makeEvent('dragenter'));
      to.dispatchEvent(makeEvent('dragover'));
      to.dispatchEvent(makeEvent('drop'));
      from.dispatchEvent(makeEvent('dragend'));
      return { ok: true };
    },
    scrollTo(y) {
      const next = Number(y || 0);
      window.scrollTo(0, Number.isFinite(next) ? next : 0);
      return { ok: true, y: window.scrollY };
    },
    getDOM() {
      return document.documentElement.outerHTML;
    },
    screenshot,
    getConsoleLogs() {
      return state.logs.slice();
    },
    getRuntimeErrors() {
      return state.errors.slice();
    },
    getPerfMetrics() {
      return {
        lcp: state.perf.lcp,
        cls: Number((state.perf.cls || 0).toFixed(4)),
        longTasks: state.perf.longTasks,
        maxLongTask: state.perf.maxLongTask,
        fcp: state.perf.fcp,
      };
    },
  };

  window.addEventListener('message', async (event) => {
    if (event.source !== window.parent) return;
    const data = event && event.data && typeof event.data === 'object' ? event.data : null;
    if (!data || data.channel !== BRIDGE_CHANNEL || data.kind !== 'request') return;
    const id = String(data.id || '');
    const method = String(data.method || '');
    const args = Array.isArray(data.args) ? data.args : [];
    const send = (payload) => {
      try {
        if (event.source && typeof event.source.postMessage === 'function') {
          event.source.postMessage({
            channel: BRIDGE_CHANNEL,
            kind: 'response',
            id,
            ...payload,
          }, '*');
        }
      } catch {}
    };
    const fn = window.__AFDW_DRIVER__ && window.__AFDW_DRIVER__[method];
    if (typeof fn !== 'function') {
      send({ ok: false, error: 'Unknown preview method' });
      return;
    }
    try {
      const result = await fn(...args);
      send({ ok: true, result: result == null ? null : result });
    } catch (error) {
      send({ ok: false, error: error && error.message ? error.message : String(error) });
    }
  });
})();
`;

export function buildPreviewHtml(files = {}) {
  const sourceFiles = files && typeof files === 'object' ? files : {};
  const sourceHtml = sourceFiles['index.html'] || '<!doctype html><html><head></head><body><h1>Missing index.html</h1></body></html>';
  const sanitizedHtml = withPreviewCspMeta(stripManagedAssetRefs(sourceHtml));
  const css = String(sourceFiles['style.css'] || '');
  const js = String(sourceFiles['app.js'] || '');

  const styleTag = `<style>${css}</style>`;
  const driverTag = `<script>${escapeInlineScript(DRIVER_BOOTSTRAP)}</script>`;
  const appTag = `<script>${escapeInlineScript(js)}</script>`;

  let output = String(sanitizedHtml);
  output = output.includes('</head>') ? output.replace('</head>', `${styleTag}${driverTag}</head>`) : `${styleTag}${driverTag}${output}`;
  output = output.includes('</body>') ? output.replace('</body>', `${appTag}</body>`) : `${output}${appTag}`;
  return output;
}
