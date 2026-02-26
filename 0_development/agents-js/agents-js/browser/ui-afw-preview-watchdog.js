const DEFAULT_BLOCK_MS = 4000;
const DEFAULT_MAX_FAILURES = 2;
const DEFAULT_MAX_BLOCK_MS = 60000;
const DEFAULT_REBUILD_WINDOW_MS = 30000;
const DEFAULT_MAX_REBUILD_PER_WINDOW = 2;

export function createPreviewWatchdog({
  rebuildPreviewFrame,
  logLine,
  blockMs = DEFAULT_BLOCK_MS,
  maxBlockMs = DEFAULT_MAX_BLOCK_MS,
  maxFailures = DEFAULT_MAX_FAILURES,
  rebuildWindowMs = DEFAULT_REBUILD_WINDOW_MS,
  maxRebuildPerWindow = DEFAULT_MAX_REBUILD_PER_WINDOW,
} = {}) {
  let consecutiveFailures = 0;
  let blockedUntil = 0;
  let backoffLevel = 0;
  let lastBlockMs = 0;
  const rebuildAt = [];

  const now = () => Date.now();
  const isBlocked = () => now() < blockedUntil;
  const baseBlockMs = Math.max(500, Number(blockMs) || DEFAULT_BLOCK_MS);
  const maxBlockWindowMs = Math.max(baseBlockMs, Number(maxBlockMs) || DEFAULT_MAX_BLOCK_MS);
  const rebuildWindow = Math.max(1000, Number(rebuildWindowMs) || DEFAULT_REBUILD_WINDOW_MS);
  const maxRebuilds = Math.max(1, Number(maxRebuildPerWindow) || DEFAULT_MAX_REBUILD_PER_WINDOW);

  const pruneRebuildHistory = () => {
    const threshold = now() - rebuildWindow;
    while (rebuildAt.length > 0 && rebuildAt[0] <= threshold) rebuildAt.shift();
  };

  const canRebuildNow = () => {
    pruneRebuildHistory();
    return rebuildAt.length < maxRebuilds;
  };

  const noteSuccess = (reason = 'ok') => {
    const hadState = consecutiveFailures > 0 || blockedUntil > 0;
    consecutiveFailures = 0;
    blockedUntil = 0;
    backoffLevel = 0;
    lastBlockMs = 0;
    if (hadState && typeof logLine === 'function') {
      logLine(`Preview watchdog recovered (${String(reason || 'ok')})`);
    }
  };

  const trip = (reason = 'failure', { autoRebuild = false } = {}) => {
    let rebuilt = false;
    let rebuildSkippedByLimit = false;
    consecutiveFailures += 1;
    if (autoRebuild && typeof rebuildPreviewFrame === 'function') {
      if (canRebuildNow()) {
        try {
          rebuilt = !!rebuildPreviewFrame(reason);
          if (rebuilt) rebuildAt.push(now());
        } catch {
          rebuilt = false;
        }
      } else {
        rebuildSkippedByLimit = true;
        if (typeof logLine === 'function') {
          logLine(`Preview watchdog rebuild skipped (limit ${maxRebuilds}/${rebuildWindow}ms)`);
        }
      }
    }
    if (consecutiveFailures >= Math.max(1, Number(maxFailures) || DEFAULT_MAX_FAILURES)) {
      backoffLevel += 1;
      const multiplier = 2 ** Math.max(0, backoffLevel - 1);
      lastBlockMs = Math.min(maxBlockWindowMs, baseBlockMs * multiplier);
      blockedUntil = now() + lastBlockMs;
      if (typeof logLine === 'function') {
        const left = Math.max(0, blockedUntil - now());
        logLine(`Preview watchdog tripped (${String(reason || 'failure')}, block ${left}ms, backoff x${multiplier})`);
      }
    }
    return {
      rebuilt,
      blocked: isBlocked(),
      consecutiveFailures,
      backoffLevel,
      blockMs: lastBlockMs,
      rebuildSkippedByLimit,
    };
  };

  const getStatus = () => {
    pruneRebuildHistory();
    return {
      blocked: isBlocked(),
      blockedUntil,
      consecutiveFailures,
      backoffLevel,
      blockMs: lastBlockMs,
      rebuildsInWindow: rebuildAt.length,
      maxRebuildPerWindow: maxRebuilds,
      rebuildWindowMs: rebuildWindow,
    };
  };

  return {
    isBlocked,
    noteSuccess,
    trip,
    getStatus,
  };
}
