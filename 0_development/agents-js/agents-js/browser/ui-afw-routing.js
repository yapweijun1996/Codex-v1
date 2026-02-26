export function shouldPreferApplyPatch(provider, modelName) {
  const providerId = String(provider || '').toLowerCase();
  const model = String(modelName || '').toLowerCase();
  if (providerId !== 'openai') return false;
  if (!model.includes('gpt-')) return false;
  if (model.includes('oss')) return false;
  if (model.includes('gpt-4')) return false;
  return true;
}

export function getAfwRoutingHint({ provider, modelName } = {}) {
  const preferApplyPatch = shouldPreferApplyPatch(provider, modelName);
  return preferApplyPatch
    ? 'AFW Tool Routing: prefer "apply_patch" for code edits; fallback to "edit" for simple literal replacements.'
    : 'AFW Tool Routing: prefer "edit" for targeted replacements; fallback to "apply_patch" for multi-hunk changes.';
}

export function buildAfwSystemPrompt({ provider, modelName, basePrompt } = {}) {
  const root = String(basePrompt || '').trim();
  const routing = getAfwRoutingHint({ provider, modelName });
  const tail = 'Always prefer partial edits over full-file rewrite when feasible.';
  const patchGuide = [
    'AFW apply_patch format rules (must follow exactly):',
    '- Use exact header line: "*** Begin Patch" (no trailing "***").',
    '- Use exact footer line: "*** End Patch".',
    '- Delete operation must use: "*** Delete File: <path>".',
    '- NEVER use legacy delete syntax like "! Delete: <path>".',
    '- If apply_patch returns patch format error: fix patch syntax and retry apply_patch once.',
    '- Do NOT call list_available_skills/read_skill_documentation for patch syntax errors.',
    '- Valid delete example:',
    '*** Begin Patch',
    '*** Delete File: dashboard.html',
    '*** Delete File: index.html',
    '*** End Patch',
  ].join('\n');
  return root ? `${root}\n\n${routing}\n${tail}\n${patchGuide}` : `${routing}\n${tail}\n${patchGuide}`;
}
