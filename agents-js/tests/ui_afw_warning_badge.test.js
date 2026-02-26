import { extractPreviewReloadWarnings } from '../browser/ui-afw-warning-utils.js';

describe('AFW warning badge extraction', () => {
  it('extracts preview_reload_unloaded warnings for chat', () => {
    const out = extractPreviewReloadWarnings([
      'preview_reload_unloaded:desktop',
      'screenshot_api_unavailable',
      'preview_reload_unloaded:mobile',
    ]);
    expect(out).toEqual([
      'preview_reload_unloaded:desktop',
      'preview_reload_unloaded:mobile',
    ]);
  });

  it('extracts preview_reload_unloaded warnings for execution console', () => {
    const out = extractPreviewReloadWarnings([
      'preview_reload_unloaded:desktop',
      'console_noise',
    ]);
    expect(out).toEqual(['preview_reload_unloaded:desktop']);
  });
});
