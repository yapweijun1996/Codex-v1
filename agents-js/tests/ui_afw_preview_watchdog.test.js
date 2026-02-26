import { initAfwAutomationBindings, exposeAfwAutomationApis } from '../browser/ui-afw-automation.js';
import { createPreviewWatchdog } from '../browser/ui-afw-preview-watchdog.js';

function createMockFrame(name = 'frame') {
  const listeners = new Map();
  return {
    _name: name,
    addEventListener(type, handler) {
      const set = listeners.get(type) || new Set();
      set.add(handler);
      listeners.set(type, set);
    },
    removeEventListener(type, handler) {
      const set = listeners.get(type);
      if (!set) return;
      set.delete(handler);
    },
    emit(type, event = {}) {
      const set = listeners.get(type);
      if (!set) return;
      for (const handler of Array.from(set)) handler(event);
    },
  };
}

describe('AFW preview watchdog', () => {
  it('uses exponential backoff for blocked window and resets after success', () => {
    const watchdog = createPreviewWatchdog({
      blockMs: 1000,
      maxBlockMs: 5000,
      maxFailures: 1,
    });

    const first = watchdog.trip('t1');
    expect(first.blocked).toBe(true);
    expect(first.backoffLevel).toBe(1);
    expect(first.blockMs).toBe(1000);

    const second = watchdog.trip('t2');
    expect(second.blocked).toBe(true);
    expect(second.backoffLevel).toBe(2);
    expect(second.blockMs).toBe(2000);

    watchdog.noteSuccess('ok');
    const third = watchdog.trip('t3');
    expect(third.blocked).toBe(true);
    expect(third.backoffLevel).toBe(1);
    expect(third.blockMs).toBe(1000);
  });

  it('enforces maxRebuildPerWindow hard limit and recovers after window', async () => {
    vi.useFakeTimers();
    try {
      const rebuild = vi.fn(() => true);
      const watchdog = createPreviewWatchdog({
        rebuildPreviewFrame: rebuild,
        maxFailures: 999,
        rebuildWindowMs: 30000,
        maxRebuildPerWindow: 2,
      });

      const a = watchdog.trip('r1', { autoRebuild: true });
      const b = watchdog.trip('r2', { autoRebuild: true });
      const c = watchdog.trip('r3', { autoRebuild: true });
      expect(a.rebuilt).toBe(true);
      expect(b.rebuilt).toBe(true);
      expect(c.rebuilt).toBe(false);
      expect(c.rebuildSkippedByLimit).toBe(true);
      expect(rebuild).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(30001);
      const d = watchdog.trip('r4', { autoRebuild: true });
      expect(d.rebuilt).toBe(true);
      expect(rebuild).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reloadPreview rebuilds and recovers after first load timeout', async () => {
    vi.useFakeTimers();
    const prevUiApi = globalThis.__AFW_UI_API__;
    try {
      const frame1 = createMockFrame('frame1');
      const frame2 = createMockFrame('frame2');
      const el = { previewFrame: frame1 };
      let compileCount = 0;
      const rebuildPreviewFrame = vi.fn(() => {
        el.previewFrame = frame2;
        return true;
      });
      const compilePreview = () => {
        compileCount += 1;
        if (el.previewFrame === frame2) {
          setTimeout(() => frame2.emit('load'), 0);
        }
      };

      initAfwAutomationBindings({
        state: { files: {}, selectedFile: 'index.html' },
        el,
        renderFiles: () => {},
        selectFile: () => {},
        compilePreview,
        rebuildPreviewFrame,
        setView: () => {},
        setViewport: () => {},
        logLine: () => {},
        queuePersist: () => {},
        ensureSelectedFile: () => {},
      });

      const pending = globalThis.__AFW_UI_API__.reloadPreview();
      await vi.runOnlyPendingTimersAsync();
      await vi.runOnlyPendingTimersAsync();
      const out = await pending;
      expect(out.ok).toBe(true);
      expect(out.loaded).toBe(true);
      expect(out.recovered).toBe(true);
      expect(out.blocked).toBe(false);
      expect(rebuildPreviewFrame).toHaveBeenCalledTimes(1);
      expect(compileCount).toBeGreaterThanOrEqual(2);
    } finally {
      if (prevUiApi === undefined) delete globalThis.__AFW_UI_API__;
      else globalThis.__AFW_UI_API__ = prevUiApi;
      vi.useRealTimers();
    }
  });

  it('reloadPreview returns blocked after consecutive failures', async () => {
    vi.useFakeTimers();
    const prevUiApi = globalThis.__AFW_UI_API__;
    try {
      const frame = createMockFrame('frame');
      const el = { previewFrame: frame };

      initAfwAutomationBindings({
        state: { files: {}, selectedFile: 'index.html' },
        el,
        renderFiles: () => {},
        selectFile: () => {},
        compilePreview: () => {},
        rebuildPreviewFrame: () => false,
        setView: () => {},
        setViewport: () => {},
        logLine: () => {},
        queuePersist: () => {},
        ensureSelectedFile: () => {},
      });

      const first = globalThis.__AFW_UI_API__.reloadPreview();
      await vi.runOnlyPendingTimersAsync();
      const out1 = await first;
      expect(out1.ok).toBe(true);
      expect(out1.loaded).toBe(false);

      const second = globalThis.__AFW_UI_API__.reloadPreview();
      await vi.runOnlyPendingTimersAsync();
      const out2 = await second;
      expect(out2.ok).toBe(true);
      expect(out2.loaded).toBe(false);
      expect(out2.blocked).toBe(true);

      const out3 = await globalThis.__AFW_UI_API__.reloadPreview();
      expect(out3.ok).toBe(false);
      expect(out3.blocked).toBe(true);
    } finally {
      if (prevUiApi === undefined) delete globalThis.__AFW_UI_API__;
      else globalThis.__AFW_UI_API__ = prevUiApi;
      vi.useRealTimers();
    }
  });

  it('bridge timeout trips watchdog hook', async () => {
    vi.useFakeTimers();
    const prevWindow = globalThis.window;
    const prevApi = globalThis.__AFW_PREVIEW_API__;
    try {
      const parentListeners = [];
      globalThis.window = {
        addEventListener(type, handler) {
          if (type === 'message') parentListeners.push(handler);
        },
      };
      const timeoutHook = vi.fn();
      const iframeWindow = {
        postMessage() {},
      };
      exposeAfwAutomationApis({
        getFiles: () => ({}),
        setFile: () => {},
        renameFile: () => false,
        deleteFile: () => false,
        refreshUi: () => {},
        getPreviewDriver: () => iframeWindow,
        isPreviewBlocked: () => false,
        onPreviewBridgeTimeout: timeoutHook,
      });

      const pending = globalThis.__AFW_PREVIEW_API__.screenshot();
      await vi.advanceTimersByTimeAsync(13000);
      const out = await pending;
      expect(out).toBeNull();
      expect(timeoutHook).toHaveBeenCalled();
      expect(parentListeners.length).toBe(1);
    } finally {
      if (prevWindow === undefined) delete globalThis.window;
      else globalThis.window = prevWindow;
      if (prevApi === undefined) delete globalThis.__AFW_PREVIEW_API__;
      else globalThis.__AFW_PREVIEW_API__ = prevApi;
      vi.useRealTimers();
    }
  });

  it('high-frequency screenshot timeouts do not cause rebuild storm', async () => {
    vi.useFakeTimers();
    const prevUiApi = globalThis.__AFW_UI_API__;
    const prevPreviewApi = globalThis.__AFW_PREVIEW_API__;
    const prevWindow = globalThis.window;
    try {
      let postCount = 0;
      const frameA = createMockFrame('frameA');
      frameA.contentWindow = { postMessage() { postCount += 1; } };
      const frameB = createMockFrame('frameB');
      frameB.contentWindow = { postMessage() { postCount += 1; } };
      const el = { previewFrame: frameA };
      const rebuildPreviewFrame = vi.fn(() => {
        el.previewFrame = frameB;
        return true;
      });

      globalThis.window = {
        addEventListener() {},
      };

      initAfwAutomationBindings({
        state: { files: {}, selectedFile: 'index.html' },
        el,
        renderFiles: () => {},
        selectFile: () => {},
        compilePreview: () => {},
        rebuildPreviewFrame,
        setView: () => {},
        setViewport: () => {},
        logLine: () => {},
        queuePersist: () => {},
        ensureSelectedFile: () => {},
      });

      const batch = Array.from({ length: 8 }, () => globalThis.__AFW_PREVIEW_API__.screenshot());
      await vi.advanceTimersByTimeAsync(13000);
      const out = await Promise.all(batch);
      expect(out.every((v) => v == null)).toBe(true);

      // First request can timeout + retry, then watchdog blocks queued requests.
      expect(rebuildPreviewFrame.mock.calls.length).toBeLessThanOrEqual(2);
      expect(postCount).toBeLessThanOrEqual(2);
      const status = globalThis.__AFW_UI_API__.getPreviewWatchdogStatus();
      expect(status.blocked).toBe(true);
      expect(status.consecutiveFailures).toBeGreaterThanOrEqual(2);
    } finally {
      if (prevUiApi === undefined) delete globalThis.__AFW_UI_API__;
      else globalThis.__AFW_UI_API__ = prevUiApi;
      if (prevPreviewApi === undefined) delete globalThis.__AFW_PREVIEW_API__;
      else globalThis.__AFW_PREVIEW_API__ = prevPreviewApi;
      if (prevWindow === undefined) delete globalThis.window;
      else globalThis.window = prevWindow;
      vi.useRealTimers();
    }
  });
});
