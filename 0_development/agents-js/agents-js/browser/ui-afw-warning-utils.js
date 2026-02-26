export function extractPreviewReloadWarnings(warningsInput) {
  const warnings = Array.isArray(warningsInput) ? warningsInput : [];
  return warnings
    .map((item) => String(item || '').trim())
    .filter((item) => item.startsWith('preview_reload_unloaded:'));
}
