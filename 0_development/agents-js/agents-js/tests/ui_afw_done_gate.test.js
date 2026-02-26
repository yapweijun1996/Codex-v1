import { runAfwDoneGate } from '../browser/ui-afw-done-gate.js';

describe('AFW done gate screenshot rules', () => {
  const prevPreviewApi = globalThis.__AFW_PREVIEW_API__;
  const prevUiApi = globalThis.__AFW_UI_API__;
  const prevControlApi = globalThis.__AFW_CONTROL_API__;

  afterEach(() => {
    if (prevPreviewApi === undefined) delete globalThis.__AFW_PREVIEW_API__;
    else globalThis.__AFW_PREVIEW_API__ = prevPreviewApi;
    if (prevUiApi === undefined) delete globalThis.__AFW_UI_API__;
    else globalThis.__AFW_UI_API__ = prevUiApi;
    if (prevControlApi === undefined) delete globalThis.__AFW_CONTROL_API__;
    else globalThis.__AFW_CONTROL_API__ = prevControlApi;
  });

  it('does not count screenshot_missing when collectScreenshot is false', async () => {
    globalThis.__AFW_CONTROL_API__ = {
      getState: () => ({ collectScreenshot: false, collectConsoleLogs: true }),
    };
    globalThis.__AFW_UI_API__ = {
      setViewport: () => true,
      reloadPreview: async () => ({ ok: true, loaded: true }),
    };
    globalThis.__AFW_PREVIEW_API__ = {
      getConsoleLogs: async () => [],
      getRuntimeErrors: async () => [],
      getPerfMetrics: async () => ({ fcp: 10, lcp: 20, cls: 0, longTasks: 0 }),
    };

    const out = await runAfwDoneGate();
    expect(out.pass).toBe(true);
    expect(out.issues.some((x) => String(x).includes('screenshot_missing'))).toBe(false);
  });

  it('downgrades screenshot api unavailable to warning', async () => {
    globalThis.__AFW_CONTROL_API__ = {
      getState: () => ({ collectScreenshot: true, collectConsoleLogs: true }),
    };
    globalThis.__AFW_UI_API__ = {
      setViewport: () => true,
      reloadPreview: async () => ({ ok: true, loaded: true }),
    };
    globalThis.__AFW_PREVIEW_API__ = {
      getConsoleLogs: async () => [],
      getRuntimeErrors: async () => [],
      getPerfMetrics: async () => ({ fcp: 10, lcp: 20, cls: 0, longTasks: 0 }),
      // no screenshot() on purpose
    };

    const out = await runAfwDoneGate();
    expect(out.pass).toBe(true);
    expect(out.issues.some((x) => String(x).includes('screenshot_missing'))).toBe(false);
    expect(Array.isArray(out.warnings)).toBe(true);
    expect(out.warnings).toContain('screenshot_api_unavailable');
  });

  it('downgrades screenshot_missing to warning after one retry when capture stays missing', async () => {
    let screenshotCalls = 0;
    globalThis.__AFW_CONTROL_API__ = {
      getState: () => ({ collectScreenshot: true, collectConsoleLogs: true }),
    };
    globalThis.__AFW_UI_API__ = {
      setViewport: () => true,
      reloadPreview: async () => ({ ok: true, loaded: true }),
    };
    globalThis.__AFW_PREVIEW_API__ = {
      getConsoleLogs: async () => [],
      getRuntimeErrors: async () => [],
      getPerfMetrics: async () => ({ fcp: 10, lcp: 20, cls: 0, longTasks: 0 }),
      screenshot: async () => {
        screenshotCalls += 1;
        return null;
      },
    };

    const out = await runAfwDoneGate();
    expect(out.pass).toBe(true);
    expect(out.issues.some((x) => String(x).includes('screenshot_missing'))).toBe(false);
    expect(out.warnings.some((x) => String(x).includes('screenshot_missing:2'))).toBe(true);
    expect(screenshotCalls).toBe(4);
  });

  it('retries reload once when not loaded and then proceeds', async () => {
    let reloadCalls = 0;
    globalThis.__AFW_CONTROL_API__ = {
      getState: () => ({ collectScreenshot: true, collectConsoleLogs: true }),
    };
    globalThis.__AFW_UI_API__ = {
      setViewport: () => true,
      reloadPreview: async () => {
        reloadCalls += 1;
        return { ok: true, loaded: reloadCalls % 2 === 0 };
      },
    };
    globalThis.__AFW_PREVIEW_API__ = {
      getConsoleLogs: async () => [],
      getRuntimeErrors: async () => [],
      getPerfMetrics: async () => ({ fcp: 10, lcp: 20, cls: 0, longTasks: 0 }),
      screenshot: async () => 'data:image/png;base64,ok',
    };

    const out = await runAfwDoneGate();
    expect(out.pass).toBe(true);
    expect(reloadCalls).toBe(4);
    expect(out.warnings.some((x) => String(x).includes('preview_reload_unloaded'))).toBe(false);
  });

  it('adds warning when reload stays unloaded after one retry', async () => {
    globalThis.__AFW_CONTROL_API__ = {
      getState: () => ({ collectScreenshot: true, collectConsoleLogs: true }),
    };
    globalThis.__AFW_UI_API__ = {
      setViewport: () => true,
      reloadPreview: async () => ({ ok: true, loaded: false }),
    };
    globalThis.__AFW_PREVIEW_API__ = {
      getConsoleLogs: async () => [],
      getRuntimeErrors: async () => [],
      getPerfMetrics: async () => ({ fcp: 10, lcp: 20, cls: 0, longTasks: 0 }),
      screenshot: async () => 'data:image/png;base64,ok',
    };

    const out = await runAfwDoneGate();
    expect(out.pass).toBe(true);
    expect(out.warnings.some((x) => String(x).includes('preview_reload_unloaded:desktop'))).toBe(true);
    expect(out.warnings.some((x) => String(x).includes('preview_reload_unloaded:mobile'))).toBe(true);
  });

  it('fails gate when journey result is detected as failed', async () => {
    globalThis.__AFW_CONTROL_API__ = {
      getState: () => ({ collectScreenshot: false, collectConsoleLogs: true }),
    };
    globalThis.__AFW_UI_API__ = {
      setViewport: () => true,
      reloadPreview: async () => ({ ok: true, loaded: true }),
    };
    globalThis.__AFW_PREVIEW_API__ = {
      getConsoleLogs: async () => [],
      getRuntimeErrors: async () => [],
      getPerfMetrics: async () => ({ fcp: 10, lcp: 20, cls: 0, longTasks: 0 }),
    };

    const out = await runAfwDoneGate({
      journeyResult: {
        pass: false,
        total_steps: 4,
        passed_steps: 2,
        total_assertions: 2,
        passed_assertions: 1,
        failed: [{ kind: 'assertion', type: 'assert_selector_text' }],
      },
    });
    expect(out.pass).toBe(false);
    expect(out.issues.some((x) => String(x).includes('journey_failed:1'))).toBe(true);
    expect(out.journey && out.journey.detected).toBe(true);
    expect(String(out.summary)).toContain('journey(pass=no');
  });

  it('keeps gate pass when journey result is detected as passed', async () => {
    globalThis.__AFW_CONTROL_API__ = {
      getState: () => ({ collectScreenshot: false, collectConsoleLogs: true }),
    };
    globalThis.__AFW_UI_API__ = {
      setViewport: () => true,
      reloadPreview: async () => ({ ok: true, loaded: true }),
    };
    globalThis.__AFW_PREVIEW_API__ = {
      getConsoleLogs: async () => [],
      getRuntimeErrors: async () => [],
      getPerfMetrics: async () => ({ fcp: 10, lcp: 20, cls: 0, longTasks: 0 }),
    };

    const out = await runAfwDoneGate({
      journeyResult: {
        pass: true,
        total_steps: 5,
        passed_steps: 5,
        total_assertions: 3,
        passed_assertions: 3,
        failed: [],
      },
    });
    expect(out.pass).toBe(true);
    expect(out.issues.some((x) => String(x).includes('journey_failed'))).toBe(false);
    expect(out.journey && out.journey.detected).toBe(true);
    expect(String(out.summary)).toContain('journey(pass=yes');
  });
});
