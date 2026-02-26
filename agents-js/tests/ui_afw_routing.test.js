import { buildAfwSystemPrompt, getAfwRoutingHint, shouldPreferApplyPatch } from '../browser/ui-afw-routing.js';

describe('AFW routing behavior by provider/model', () => {
  it('prefers apply_patch for openai gpt-5 and prefers edit for gemini/openai gpt-4/oss', () => {
    expect(shouldPreferApplyPatch('openai', 'gpt-5')).toBe(true);
    expect(shouldPreferApplyPatch('openai', 'gpt-4.1')).toBe(false);
    expect(shouldPreferApplyPatch('openai', 'gpt-oss-120b')).toBe(false);
    expect(shouldPreferApplyPatch('gemini', 'gemini-2.5-pro')).toBe(false);

    const openAiHint = getAfwRoutingHint({ provider: 'openai', modelName: 'gpt-5' });
    expect(openAiHint).toContain('prefer "apply_patch"');
    expect(openAiHint).toContain('fallback to "edit"');

    const geminiHint = getAfwRoutingHint({ provider: 'gemini', modelName: 'gemini-2.5-pro' });
    expect(geminiHint).toContain('prefer "edit"');
    expect(geminiHint).toContain('fallback to "apply_patch"');

    const prompt = buildAfwSystemPrompt({
      provider: 'openai',
      modelName: 'gpt-5',
      basePrompt: 'BASE_PROMPT',
    });
    expect(prompt).toContain('BASE_PROMPT');
    expect(prompt).toContain('prefer "apply_patch"');
    expect(prompt).toContain('*** Begin Patch');
    expect(prompt).toContain('*** Delete File: <path>');
    expect(prompt).toContain('NEVER use legacy delete syntax like "! Delete: <path>".');
    expect(prompt).toContain('fix patch syntax and retry apply_patch once');
    expect(prompt).toContain('Do NOT call list_available_skills/read_skill_documentation for patch syntax errors');
  });
});
