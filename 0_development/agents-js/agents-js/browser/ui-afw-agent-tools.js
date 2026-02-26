import { createAfwPatchEditTools } from './ui-afw-edit-tools.js';
import { createAfwInteractionTools } from './ui-afw-agent-tools-interaction.js';
import { createAfwJourneyTool } from './ui-afw-agent-tools-journey.js';

function getWorkspaceApi() {
  return globalThis.__AFW_WORKSPACE_API__ && typeof globalThis.__AFW_WORKSPACE_API__ === 'object'
    ? globalThis.__AFW_WORKSPACE_API__
    : null;
}

function getPreviewApi() {
  return globalThis.__AFW_PREVIEW_API__ && typeof globalThis.__AFW_PREVIEW_API__ === 'object'
    ? globalThis.__AFW_PREVIEW_API__
    : null;
}

function getUiApi() {
  return globalThis.__AFW_UI_API__ && typeof globalThis.__AFW_UI_API__ === 'object'
    ? globalThis.__AFW_UI_API__
    : null;
}

function getControlState() {
  const api = globalThis.__AFW_CONTROL_API__;
  if (!api || typeof api.getState !== 'function') return {};
  try { return api.getState() || {}; } catch { return {}; }
}

function asText(value) {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createAfwHostTools() {
  return [
    {
      name: 'list_files',
      description: 'List all files in the AFW workspace.',
      parameters: { type: 'object', properties: {} },
      func: async () => {
        const api = getWorkspaceApi();
        if (!api || typeof api.listFiles !== 'function') return { error: 'Workspace API unavailable' };
        return { files: api.listFiles() };
      },
    },
    {
      name: 'read_file',
      description: 'Read one file content from AFW workspace.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'File name, e.g. index.html' } },
        required: ['path'],
      },
      func: async ({ path } = {}) => {
        const api = getWorkspaceApi();
        if (!api || typeof api.readFile !== 'function') return { error: 'Workspace API unavailable' };
        const content = api.readFile(String(path || ''));
        if (content == null) return { error: 'File not found', path };
        return { path, content };
      },
    },
    {
      name: 'grep_in_workspace',
      description: 'Search text in AFW workspace files with regex pattern.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern to search for.' },
          flags: { type: 'string', description: 'Regex flags, e.g. i or gi.' },
          include: { type: 'string', description: 'Optional regex to filter file paths.' },
          max_matches: { type: 'number', description: 'Maximum number of matches to return.' },
        },
        required: ['pattern'],
      },
      func: async ({ pattern, flags, include, max_matches } = {}) => {
        const api = getWorkspaceApi();
        if (!api || typeof api.grepInWorkspace !== 'function') return { error: 'Workspace API unavailable' };
        return api.grepInWorkspace({ pattern, flags, include, max_matches });
      },
    },
    {
      name: 'replace_in_file',
      description: 'Apply partial replacement in one file by regex pattern or line range.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Target file path.' },
          pattern: { type: 'string', description: 'Regex pattern (optional if using line range replacement).' },
          flags: { type: 'string', description: 'Regex flags, e.g. i or gi.' },
          replacement: { type: 'string', description: 'Replacement text.' },
          line_start: { type: 'number', description: '1-based start line for scoped replacement.' },
          line_end: { type: 'number', description: '1-based end line for scoped replacement.' },
          max_replacements: { type: 'number', description: 'Maximum replacements (0 means unlimited).' },
        },
        required: ['path', 'replacement'],
      },
      func: async ({ path, pattern, flags, replacement, line_start, line_end, max_replacements } = {}) => {
        const api = getWorkspaceApi();
        if (!api || typeof api.replaceInFile !== 'function') return { error: 'Workspace API unavailable' };
        return api.replaceInFile({ path, pattern, flags, replacement, line_start, line_end, max_replacements });
      },
    },
    ...createAfwPatchEditTools({ getWorkspaceApi }),
    {
      name: 'write_file',
      description: 'Write full file content directly in AFW workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File name, e.g. style.css' },
          content: { type: 'string', description: 'Complete file content' },
        },
        required: ['path', 'content'],
      },
      func: async ({ path, content } = {}) => {
        const api = getWorkspaceApi();
        if (!api || typeof api.writeFile !== 'function') return { error: 'Workspace API unavailable' };
        const ok = api.writeFile(String(path || ''), String(content || ''));
        return { ok: !!ok, path, chars: String(content || '').length };
      },
    },
    {
      name: 'preview_reload',
      description: 'Rebuild preview and switch to preview mode.',
      parameters: { type: 'object', properties: {} },
      func: async () => {
        const ui = getUiApi();
        if (!ui || typeof ui.reloadPreview !== 'function') return { error: 'UI API unavailable' };
        const result = await ui.reloadPreview();
        if (typeof ui.setViewMode === 'function') ui.setViewMode('preview');
        const loaded = !!(result && typeof result === 'object' && result.loaded);
        return { ok: true, loaded };
      },
    },
    {
      name: 'preview_set_viewport',
      description: 'Set preview viewport: desktop, tablet, mobile.',
      parameters: {
        type: 'object',
        properties: { size: { type: 'string', enum: ['desktop', 'tablet', 'mobile'] } },
        required: ['size'],
      },
      func: async ({ size } = {}) => {
        const ui = getUiApi();
        if (!ui || typeof ui.setViewport !== 'function') return { error: 'UI API unavailable' };
        ui.setViewport(String(size || 'desktop'));
        return { ok: true, size };
      },
    },
    {
      name: 'preview_get_dom',
      description: 'Get full DOM HTML from preview.',
      parameters: { type: 'object', properties: {} },
      func: async () => {
        const api = getPreviewApi();
        if (!api || typeof api.getDOM !== 'function') return { error: 'Preview API unavailable' };
        const html = await api.getDOM();
        return { dom: asText(html).slice(0, 12000) };
      },
    },
    {
      name: 'preview_get_console_logs',
      description: 'Get console logs captured inside preview iframe.',
      parameters: { type: 'object', properties: {} },
      func: async () => {
        const api = getPreviewApi();
        if (!api || typeof api.getConsoleLogs !== 'function') return { error: 'Preview API unavailable' };
        const logs = await api.getConsoleLogs();
        return { logs };
      },
    },
    {
      name: 'preview_get_runtime_errors',
      description: 'Get runtime errors captured inside preview iframe.',
      parameters: { type: 'object', properties: {} },
      func: async () => {
        const api = getPreviewApi();
        if (!api || typeof api.getRuntimeErrors !== 'function') return { error: 'Preview API unavailable' };
        const errors = await api.getRuntimeErrors();
        return { errors };
      },
    },
    {
      name: 'preview_get_perf_metrics',
      description: 'Get lightweight performance metrics (FCP/LCP/CLS/long task).',
      parameters: { type: 'object', properties: {} },
      func: async () => {
        const api = getPreviewApi();
        if (!api || typeof api.getPerfMetrics !== 'function') return { error: 'Preview API unavailable' };
        return await api.getPerfMetrics();
      },
    },
    ...createAfwInteractionTools({ getControlState, getPreviewApi }),
    createAfwJourneyTool({ getPreviewApi, getUiApi, getControlState }),
    {
      name: 'preview_screenshot',
      description: 'Capture preview screenshot as base64 PNG.',
      parameters: { type: 'object', properties: {} },
      func: async () => {
        const ui = getUiApi();
        if (ui && typeof ui.setViewMode === 'function') ui.setViewMode('preview');
        if (ui && typeof ui.reloadPreview === 'function') await ui.reloadPreview();
        await wait(220);

        const api = getPreviewApi();
        if (!api || typeof api.screenshot !== 'function') return { error: 'Preview API unavailable' };
        const image = await api.screenshot();
        if (!image) {
          const logs = typeof api.getRuntimeErrors === 'function' ? await api.getRuntimeErrors() : [];
          const tainted = Array.isArray(logs) && logs.some((item) => String(item && item.message || '').toLowerCase().includes('tainted canvases'));
          return {
            error: 'Screenshot capture failed',
            hint: tainted ? 'tainted_canvas_cross_origin_assets' : 'preview_not_ready_or_render_blocked',
          };
        }
        return { image_base64: image };
      },
    },
  ];
}
