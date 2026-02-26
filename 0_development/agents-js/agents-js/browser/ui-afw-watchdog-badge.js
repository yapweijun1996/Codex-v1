const WATCHDOG_POLL_MS = 1200;

function pickState(status) {
  const s = status && typeof status === 'object' ? status : {};
  if (s.blocked) return { key: 'blocked', text: 'blocked' };
  if (Number(s.consecutiveFailures || 0) > 0) return { key: 'recovering', text: 'recovering' };
  return { key: 'healthy', text: 'healthy' };
}

export function bindAfwPreviewWatchdogBadge({
  badge,
  getStatus,
  intervalMs = WATCHDOG_POLL_MS,
  logLine,
} = {}) {
  if (!badge || typeof badge.classList?.add !== 'function') return () => {};
  const read = typeof getStatus === 'function' ? getStatus : () => ({ blocked: false, consecutiveFailures: 0 });
  let last = '';

  const applyState = () => {
    let status;
    try {
      status = read() || {};
    } catch {
      status = { blocked: false, consecutiveFailures: 0 };
    }
    const next = pickState(status);
    badge.textContent = next.text;
    badge.classList.remove('is-healthy', 'is-recovering', 'is-blocked');
    badge.classList.add(`is-${next.key}`);
    badge.setAttribute('data-watchdog', next.key);
    if (next.key !== last && typeof logLine === 'function') {
      logLine(`Preview watchdog UI => ${next.key}`);
      last = next.key;
    }
  };

  applyState();
  const ms = Math.max(500, Number(intervalMs) || WATCHDOG_POLL_MS);
  const timer = setInterval(applyState, ms);
  return () => clearInterval(timer);
}
