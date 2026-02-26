import { buildPreviewHtml } from '../browser/ui-afw-preview-driver.js';
import { exposeAfwAutomationApis } from '../browser/ui-afw-automation.js';
import { createAfwPatchEditTools } from '../browser/ui-afw-edit-tools.js';

describe('AFW preview driver buildPreviewHtml', () => {
  it('strips managed style/app external refs and keeps inline assets', () => {
    const html = [
      '<!doctype html>',
      '<html>',
      '<head>',
      '  <link rel="stylesheet" href="./style.css">',
      '</head>',
      '<body>',
      '  <h1>Hello</h1>',
      '  <script src="/app.js"></script>',
      '</body>',
      '</html>',
    ].join('\n');

    const output = buildPreviewHtml({
      'index.html': html,
      'style.css': 'body{color:red;}',
      'app.js': 'window.__AFW_TEST__ = true;',
    });

    expect(output).not.toMatch(/href=["'](?:\.\/|\/)?style\.css/i);
    expect(output).not.toMatch(/src=["'](?:\.\/|\/)?app\.js/i);
    expect(output).toContain('<meta http-equiv="Content-Security-Policy"');
    expect(output).toContain("default-src 'none'");
    expect(output).toContain("connect-src 'none'");
    expect(output).toContain('<style>body{color:red;}</style>');
    expect(output).toContain('window.__AFW_TEST__ = true;');
    expect(output).toContain('window.__AFDW_DRIVER__');
  });
});

describe('AFW preview bridge screenshot (no same-origin direct driver)', () => {
  it('returns screenshot via postMessage bridge when direct driver access is unavailable', async () => {
    const prevWindow = globalThis.window;
    const prevApi = globalThis.__AFW_PREVIEW_API__;

    try {
      const parentListeners = [];
      const parentWindow = {
        addEventListener(type, handler) {
          if (type === 'message') parentListeners.push(handler);
        },
      };

      const iframeWindow = {
        __AFDW_DRIVER__: undefined,
        postMessage(payload) {
          if (!payload || payload.kind !== 'request' || payload.method !== 'screenshot') return;
          const response = {
            channel: payload.channel,
            kind: 'response',
            id: payload.id,
            ok: true,
            result: 'data:image/png;base64,bridge-ok',
          };
          setTimeout(() => {
            for (const handler of parentListeners) {
              handler({ data: response, source: iframeWindow });
            }
          }, 0);
        },
      };

      globalThis.window = parentWindow;
      exposeAfwAutomationApis({
        getFiles: () => ({}),
        setFile: () => {},
        renameFile: () => false,
        deleteFile: () => false,
        refreshUi: () => {},
        getPreviewDriver: () => iframeWindow,
      });

      const image = await globalThis.__AFW_PREVIEW_API__.screenshot();
      expect(image).toBe('data:image/png;base64,bridge-ok');
    } finally {
      if (prevWindow === undefined) delete globalThis.window;
      else globalThis.window = prevWindow;
      if (prevApi === undefined) delete globalThis.__AFW_PREVIEW_API__;
      else globalThis.__AFW_PREVIEW_API__ = prevApi;
    }
  });
});

describe('AFW workspace grep API', () => {
  it('finds matches from in-memory workspace files', () => {
    const prevApi = globalThis.__AFW_WORKSPACE_API__;
    try {
      exposeAfwAutomationApis({
        getFiles: () => ({
          'index.html': '<h1>Hello AFW</h1>\n<p>green login page</p>',
          'style.css': 'body { color: green; }',
          'app.js': 'console.log("hello afw");',
        }),
        setFile: () => {},
        renameFile: () => false,
        deleteFile: () => false,
        refreshUi: () => {},
        getPreviewDriver: () => null,
      });

      const out = globalThis.__AFW_WORKSPACE_API__.grepInWorkspace({
        pattern: 'hello',
        flags: 'i',
        include: '\\.(html|js)$',
        max_matches: 10,
      });
      expect(Array.isArray(out.matches)).toBe(true);
      expect(out.matches.length).toBeGreaterThan(0);
      expect(out.files_scanned).toBe(3);
      expect(out.matches.some((m) => m.path === 'index.html')).toBe(true);
      expect(out.matches.some((m) => m.path === 'app.js')).toBe(true);
      expect(out.matches.some((m) => m.path === 'style.css')).toBe(false);
    } finally {
      if (prevApi === undefined) delete globalThis.__AFW_WORKSPACE_API__;
      else globalThis.__AFW_WORKSPACE_API__ = prevApi;
    }
  });
});

describe('AFW workspace replace API', () => {
  it('applies scoped regex replacement inside one file', () => {
    const prevApi = globalThis.__AFW_WORKSPACE_API__;
    const store = {
      'index.html': '<h1>Hello AFW</h1>\n<p>green login page</p>\n<p>Hello again</p>',
    };
    try {
      exposeAfwAutomationApis({
        getFiles: () => store,
        setFile: (name, content) => { store[name] = content; },
        renameFile: () => false,
        deleteFile: () => false,
        refreshUi: () => {},
        getPreviewDriver: () => null,
      });

      const out = globalThis.__AFW_WORKSPACE_API__.replaceInFile({
        path: 'index.html',
        pattern: 'Hello',
        flags: 'g',
        replacement: 'Hi',
        line_start: 1,
        line_end: 2,
      });
      expect(out.ok).toBe(true);
      expect(out.changed).toBe(true);
      expect(out.replacements).toBe(1);
      expect(store['index.html']).toContain('<h1>Hi AFW</h1>');
      expect(store['index.html']).toContain('<p>Hello again</p>');
    } finally {
      if (prevApi === undefined) delete globalThis.__AFW_WORKSPACE_API__;
      else globalThis.__AFW_WORKSPACE_API__ = prevApi;
    }
  });
});

describe('AFW edit/apply_patch tools', () => {
  it('edit tool replaces target text in one file', async () => {
    const files = { 'index.html': 'alpha\nbeta\ngamma' };
    const api = {
      readFile: (p) => files[p] ?? null,
      writeFile: (p, c) => { files[p] = c; return true; },
    };
    const [editTool] = createAfwPatchEditTools({ getWorkspaceApi: () => api });
    const out = await editTool.func({
      path: 'index.html',
      old_string: 'beta',
      new_string: 'BETA',
    });
    expect(out.ok).toBe(true);
    expect(out.changed).toBe(true);
    expect(out.replacements).toBe(1);
    expect(files['index.html']).toContain('BETA');
  });

  it('edit tool supports dry_run with diff preview and no write', async () => {
    const files = { 'index.html': 'alpha\nbeta\ngamma' };
    const api = {
      readFile: (p) => files[p] ?? null,
      writeFile: (p, c) => { files[p] = c; return true; },
    };
    const [editTool] = createAfwPatchEditTools({ getWorkspaceApi: () => api });
    const out = await editTool.func({
      path: 'index.html',
      old_string: 'beta',
      new_string: 'BETA',
      dry_run: true,
      preview_lines: 8,
    });
    expect(out.ok).toBe(true);
    expect(out.dry_run).toBe(true);
    expect(out.changed).toBe(true);
    expect(Array.isArray(out.diff_preview && out.diff_preview.lines)).toBe(true);
    expect(out.diff_preview.lines.some((line) => line === '-beta')).toBe(true);
    expect(out.diff_preview.lines.some((line) => line === '+BETA')).toBe(true);
    expect(files['index.html']).toContain('beta');
  });

  it('apply_patch tool updates file with codex-style patch', async () => {
    const files = { 'index.html': 'line1\nline2\nline3' };
    const api = {
      listFiles: () => Object.keys(files),
      readFile: (p) => files[p] ?? null,
      writeFile: (p, c) => { files[p] = c; return true; },
      deleteFile: (p) => { delete files[p]; return true; },
    };
    const tools = createAfwPatchEditTools({ getWorkspaceApi: () => api });
    const applyPatchTool = tools.find((t) => t.name === 'apply_patch');
    const patch = [
      '*** Begin Patch',
      '*** Update File: index.html',
      '@@',
      ' line1',
      '-line2',
      '+LINE-2',
      ' line3',
      '*** End Patch',
    ].join('\n');
    const out = await applyPatchTool.func({ input: patch });
    expect(out.ok).toBe(true);
    expect(out.file_count).toBe(1);
    expect(files['index.html']).toContain('LINE-2');
  });

  it('apply_patch supports Add File', async () => {
    const files = { 'index.html': 'base' };
    const api = {
      listFiles: () => Object.keys(files),
      readFile: (p) => files[p] ?? null,
      writeFile: (p, c) => { files[p] = c; return true; },
      deleteFile: (p) => { delete files[p]; return true; },
    };
    const tools = createAfwPatchEditTools({ getWorkspaceApi: () => api });
    const applyPatchTool = tools.find((t) => t.name === 'apply_patch');
    const patch = [
      '*** Begin Patch',
      '*** Add File: style.css',
      '+body { color: green; }',
      '*** End Patch',
    ].join('\n');
    const out = await applyPatchTool.func({ input: patch });
    expect(out.ok).toBe(true);
    expect(files['style.css']).toBe('body { color: green; }');
  });

  it('apply_patch supports Delete File', async () => {
    const files = { 'index.html': 'base', 'old.txt': 'legacy' };
    const api = {
      listFiles: () => Object.keys(files),
      readFile: (p) => files[p] ?? null,
      writeFile: (p, c) => { files[p] = c; return true; },
      deleteFile: (p) => { delete files[p]; return true; },
    };
    const tools = createAfwPatchEditTools({ getWorkspaceApi: () => api });
    const applyPatchTool = tools.find((t) => t.name === 'apply_patch');
    const patch = [
      '*** Begin Patch',
      '*** Delete File: old.txt',
      '*** End Patch',
    ].join('\n');
    const out = await applyPatchTool.func({ input: patch });
    expect(out.ok).toBe(true);
    expect(files['old.txt']).toBeUndefined();
  });

  it('apply_patch supports Move to', async () => {
    const files = { 'src.txt': 'alpha\nbeta' };
    const api = {
      listFiles: () => Object.keys(files),
      readFile: (p) => files[p] ?? null,
      writeFile: (p, c) => { files[p] = c; return true; },
      deleteFile: (p) => { delete files[p]; return true; },
    };
    const tools = createAfwPatchEditTools({ getWorkspaceApi: () => api });
    const applyPatchTool = tools.find((t) => t.name === 'apply_patch');
    const patch = [
      '*** Begin Patch',
      '*** Update File: src.txt',
      '*** Move to: dst.txt',
      '@@',
      ' alpha',
      '-beta',
      '+BETA',
      '*** End Patch',
    ].join('\n');
    const out = await applyPatchTool.func({ input: patch });
    expect(out.ok).toBe(true);
    expect(files['src.txt']).toBeUndefined();
    expect(files['dst.txt']).toContain('BETA');
  });
});
