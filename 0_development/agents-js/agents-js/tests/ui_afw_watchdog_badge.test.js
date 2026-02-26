import { bindAfwPreviewWatchdogBadge } from '../browser/ui-afw-watchdog-badge.js';

function createBadgeMock() {
  const classes = new Set();
  return {
    textContent: '',
    _attrs: {},
    classList: {
      add(...names) { names.forEach((n) => classes.add(String(n))); },
      remove(...names) { names.forEach((n) => classes.delete(String(n))); },
      contains(name) { return classes.has(String(name)); },
    },
    setAttribute(name, value) {
      this._attrs[String(name)] = String(value);
    },
  };
}

describe('AFW preview watchdog badge', () => {
  it('renders healthy/recovering/blocked based on status', async () => {
    vi.useFakeTimers();
    const badge = createBadgeMock();
    const states = [
      { blocked: false, consecutiveFailures: 0 },
      { blocked: false, consecutiveFailures: 1 },
      { blocked: true, consecutiveFailures: 2 },
    ];
    let index = 0;
    const unbind = bindAfwPreviewWatchdogBadge({
      badge,
      getStatus: () => states[Math.min(index, states.length - 1)],
      intervalMs: 600,
    });

    expect(badge.textContent).toBe('healthy');
    expect(badge.classList.contains('is-healthy')).toBe(true);

    index = 1;
    await vi.advanceTimersByTimeAsync(700);
    expect(badge.textContent).toBe('recovering');
    expect(badge.classList.contains('is-recovering')).toBe(true);

    index = 2;
    await vi.advanceTimersByTimeAsync(700);
    expect(badge.textContent).toBe('blocked');
    expect(badge.classList.contains('is-blocked')).toBe(true);

    unbind();
    vi.useRealTimers();
  });
});
