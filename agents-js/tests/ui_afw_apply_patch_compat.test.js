import { createAfwPatchEditTools } from '../browser/ui-afw-edit-tools.js';

function buildApi(files) {
  return {
    listFiles: () => Object.keys(files),
    readFile: (path) => files[path] ?? null,
    writeFile: (path, content) => {
      files[path] = content;
      return true;
    },
    deleteFile: (path) => {
      delete files[path];
      return true;
    },
  };
}

describe('AFW apply_patch compatibility', () => {
  it('accepts legacy Delete header', async () => {
    const files = { 'index.html': '<h1>x</h1>', 'dashboard.html': '<h1>legacy</h1>' };
    const api = buildApi(files);
    const tools = createAfwPatchEditTools({ getWorkspaceApi: () => api });
    const applyPatch = tools.find((tool) => tool.name === 'apply_patch');

    const out = await applyPatch.func({
      input: ['*** Begin Patch', 'Delete: dashboard.html', '*** End Patch'].join('\n'),
    });

    expect(out.ok).toBe(true);
    expect(files['dashboard.html']).toBeUndefined();
    expect(out.rewrites).toContain('legacy_delete_header');
  });

  it('accepts unified delete header with /dev/null target', async () => {
    const files = { 'index.html': '<h1>x</h1>', 'dashboard.html': '<h1>legacy</h1>' };
    const api = buildApi(files);
    const tools = createAfwPatchEditTools({ getWorkspaceApi: () => api });
    const applyPatch = tools.find((tool) => tool.name === 'apply_patch');

    const out = await applyPatch.func({
      input: ['*** Begin Patch', '--- dashboard.html', '+++ /dev/null', '*** End Patch'].join('\n'),
    });

    expect(out.ok).toBe(true);
    expect(files['dashboard.html']).toBeUndefined();
    expect(out.rewrites).toContain('unified_delete_header');
  });

  it('returns actionable hint on patch format errors', async () => {
    const files = { 'index.html': '<h1>x</h1>' };
    const api = buildApi(files);
    const tools = createAfwPatchEditTools({ getWorkspaceApi: () => api });
    const applyPatch = tools.find((tool) => tool.name === 'apply_patch');

    const out = await applyPatch.func({
      input: ['*** Begin Patch', 'nonsense', '*** End Patch'].join('\n'),
    });

    expect(out.error).toContain('Invalid patch: no operations found');
    expect(String(out.hint || '')).toContain('Delete must be "*** Delete File: <path>"');
  });
});

