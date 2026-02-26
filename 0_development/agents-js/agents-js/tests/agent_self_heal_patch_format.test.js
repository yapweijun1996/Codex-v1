const { classifyToolFailure, withSelfHealHint, recordToolFailure } = require('../utils/agent-self-heal');
const { makeFailureFingerprint, DEFAULT_LOOP_FINGERPRINT_THRESHOLD } = require('../utils/self-heal');

describe('agent self-heal for apply_patch format errors', () => {
  it('classifies apply_patch invalid patch as patch_format_error', () => {
    const failure = classifyToolFailure({
      toolName: 'apply_patch',
      output: { error: 'Invalid patch: no operations found' },
      isRateLimitLike: () => false,
    });
    expect(failure).toBe('patch_format_error');
  });

  it('adds focused guidance after repeated patch format failures', () => {
    const streak = new Map();
    const args = { input: '*** Begin Patch\nDelete: x\n*** End Patch' };
    recordToolFailure({
      toolFailureStreak: streak,
      toolName: 'apply_patch',
      fingerprintOrType: 'patch_format_error',
      args,
      makeFailureFingerprint,
    });
    recordToolFailure({
      toolFailureStreak: streak,
      toolName: 'apply_patch',
      fingerprintOrType: 'patch_format_error',
      args,
      makeFailureFingerprint,
    });

    const out = withSelfHealHint({
      toolFailureStreak: streak,
      toolName: 'apply_patch',
      output: { error: 'Invalid patch: no operations found' },
      defaultLoopFingerprintThreshold: DEFAULT_LOOP_FINGERPRINT_THRESHOLD,
    });

    expect(out._self_heal).toBeTruthy();
    expect(String(out._self_heal.advice || '')).toContain('Do not switch to list_available_skills');
  });
});

