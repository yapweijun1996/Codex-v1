import { createAfwHostTools } from '../browser/ui-afw-agent-tools.js';

function withGlobals(fn) {
  const prevControl = globalThis.__AFW_CONTROL_API__;
  const prevPreview = globalThis.__AFW_PREVIEW_API__;
  const prevWorkspace = globalThis.__AFW_WORKSPACE_API__;
  const prevUi = globalThis.__AFW_UI_API__;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (prevControl === undefined) delete globalThis.__AFW_CONTROL_API__;
      else globalThis.__AFW_CONTROL_API__ = prevControl;
      if (prevPreview === undefined) delete globalThis.__AFW_PREVIEW_API__;
      else globalThis.__AFW_PREVIEW_API__ = prevPreview;
      if (prevWorkspace === undefined) delete globalThis.__AFW_WORKSPACE_API__;
      else globalThis.__AFW_WORKSPACE_API__ = prevWorkspace;
      if (prevUi === undefined) delete globalThis.__AFW_UI_API__;
      else globalThis.__AFW_UI_API__ = prevUi;
    });
}

function setupTool() {
  globalThis.__AFW_WORKSPACE_API__ = {
    listFiles: () => [],
    readFile: () => null,
    writeFile: () => false,
    deleteFile: () => false,
  };
  globalThis.__AFW_UI_API__ = {
    reloadPreview: async () => ({ ok: true, loaded: true }),
    setViewMode: () => true,
    setViewport: () => true,
  };
  const tools = createAfwHostTools();
  return tools.find((tool) => tool.name === 'run_ui_journey');
}

describe('AFW run_ui_journey tool', () => {
  it('runs scripted steps and assertions with pass result', async () => withGlobals(async () => {
    const calls = [];
    globalThis.__AFW_CONTROL_API__ = { getState: () => ({ enableInteractionTools: true }) };
    globalThis.__AFW_PREVIEW_API__ = {
      call: async (method, ...args) => {
        calls.push({ method, args });
        return { ok: true };
      },
      getDOM: async () => '<div id="status">Done</div>',
      getConsoleLogs: async () => [{ level: 'info', text: 'ok' }],
      getRuntimeErrors: async () => [],
      getPerfMetrics: async () => ({ lcp: 900, cls: 0.01, fcp: 400 }),
      screenshot: async () => 'data:image/png;base64,test',
    };
    const tool = setupTool();
    const out = await tool.func({
      steps: [
        { action: 'reload' },
        { action: 'set_viewport', size: 'mobile' },
        { action: 'hover', selector: '#menu' },
        { action: 'click', selector: '#run' },
        { action: 'type', selector: '#input', text: 'hello' },
        { action: 'press_key', key: 'Enter' },
        { action: 'capture_dom' },
        { action: 'capture_console' },
        { action: 'capture_runtime' },
        { action: 'capture_perf' },
        { action: 'capture_screenshot' },
      ],
      assertions: [
        { type: 'dom_includes', text: 'Done' },
        { type: 'assert_selector_exists', selector: '#status' },
        { type: 'assert_selector_text', selector: '#status', text: 'Done' },
        { type: 'console_errors_max', max: 0 },
        { type: 'runtime_errors_max', max: 0 },
        { type: 'perf_metric_max', metric: 'lcp', max: 1200 },
        { type: 'screenshot_captured' },
      ],
    });

    expect(out.pass).toBe(true);
    expect(out.failed.length).toBe(0);
    expect(out.passed_steps).toBe(11);
    expect(out.passed_assertions).toBe(7);
    expect(calls.slice(0, 4)).toEqual([
      { method: 'hover', args: ['#menu'] },
      { method: 'click', args: ['#run'] },
      { method: 'type', args: ['#input', 'hello'] },
      { method: 'pressKey', args: ['Enter'] },
    ]);
  }));

  it('fails on disabled interaction and returns structured failure', async () => withGlobals(async () => {
    globalThis.__AFW_CONTROL_API__ = { getState: () => ({ enableInteractionTools: false }) };
    globalThis.__AFW_PREVIEW_API__ = {
      call: async () => ({ ok: true }),
      screenshot: async () => 'data:image/png;base64,fail',
    };
    const tool = setupTool();
    const out = await tool.func({
      steps: [{ action: 'click', selector: '#blocked' }],
      assertions: [{ type: 'step_ok', index: 0 }],
    });

    expect(out.pass).toBe(false);
    expect(out.failed.length).toBe(1);
    expect(out.failed[0].kind).toBe('step');
    expect(out.evidence.screenshot_captured).toBe(true);
  }));

  it('fails when selector text assertion mismatches', async () => withGlobals(async () => {
    globalThis.__AFW_CONTROL_API__ = { getState: () => ({ enableInteractionTools: true }) };
    globalThis.__AFW_PREVIEW_API__ = {
      call: async () => ({ ok: true }),
      getDOM: async () => '<div id="status">Done</div>',
      screenshot: async () => 'data:image/png;base64,selector-mismatch',
    };
    const tool = setupTool();
    const out = await tool.func({
      steps: [{ action: 'capture_dom' }],
      assertions: [{ type: 'assert_selector_text', selector: '#status', text: 'Failed', exact: true }],
    });

    expect(out.pass).toBe(false);
    expect(out.failed[0].kind).toBe('assertion');
    expect(out.assertions[0].type).toBe('assert_selector_text');
    expect(out.assertions[0].ok).toBe(false);
  }));
});
