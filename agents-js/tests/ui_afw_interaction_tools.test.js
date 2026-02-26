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

function buildToolIndex() {
  const listFiles = () => [];
  const readFile = () => null;
  const writeFile = () => false;
  const deleteFile = () => false;
  globalThis.__AFW_WORKSPACE_API__ = { listFiles, readFile, writeFile, deleteFile };
  globalThis.__AFW_UI_API__ = { reloadPreview: async () => ({ ok: true }), setViewMode: () => true };
  const tools = createAfwHostTools();
  return Object.fromEntries(tools.map((tool) => [tool.name, tool]));
}

describe('AFW interaction tools', () => {
  it('blocks interaction tools when switch is disabled', async () => withGlobals(async () => {
    globalThis.__AFW_CONTROL_API__ = { getState: () => ({ enableInteractionTools: false }) };
    globalThis.__AFW_PREVIEW_API__ = { call: async () => ({ ok: true }) };
    const byName = buildToolIndex();
    const out = await byName.preview_hover.func({ selector: '#menu' });
    expect(out.error).toContain('Interaction tools disabled');
  }));

  it('forwards hover, press_key, and drag calls when enabled', async () => withGlobals(async () => {
    const calls = [];
    globalThis.__AFW_CONTROL_API__ = { getState: () => ({ enableInteractionTools: true }) };
    globalThis.__AFW_PREVIEW_API__ = {
      call: async (method, ...args) => {
        calls.push({ method, args });
        return { ok: true };
      },
    };
    const byName = buildToolIndex();

    const hover = await byName.preview_hover.func({ selector: '#menu' });
    const key = await byName.preview_press_key.func({ key: 'Enter' });
    const drag = await byName.preview_drag.func({ from_selector: '#from', to_selector: '#to' });

    expect(hover.ok).toBe(true);
    expect(key.ok).toBe(true);
    expect(drag.ok).toBe(true);
    expect(calls).toEqual([
      { method: 'hover', args: ['#menu'] },
      { method: 'pressKey', args: ['Enter'] },
      { method: 'drag', args: ['#from', '#to'] },
    ]);
  }));
});
