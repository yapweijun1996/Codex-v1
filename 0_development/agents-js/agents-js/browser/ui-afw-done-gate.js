const VIEWPORTS = ['desktop', 'mobile'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getControlState() {
  const api = globalThis.__AFW_CONTROL_API__;
  if (!api || typeof api.getState !== 'function') return {};
  try { return api.getState() || {}; } catch { return {}; }
}

function countConsoleErrors(logs) {
  if (!Array.isArray(logs)) return 0;
  return logs.filter((item) => String(item && item.level || '').toLowerCase() === 'error').length;
}

async function reloadPreviewForGate(uiApi, size, onEvent, warnings) {
  if (!uiApi || typeof uiApi.reloadPreview !== 'function') return { loaded: true, retried: false };
  let retried = false;
  let reloadState = await uiApi.reloadPreview();
  let loaded = !!(reloadState && reloadState.loaded);
  if (!loaded) {
    retried = true;
    if (typeof onEvent === 'function') onEvent({ type: 'done_gate.viewport.reload_retry', details: { size } });
    reloadState = await uiApi.reloadPreview();
    loaded = !!(reloadState && reloadState.loaded);
  }
  if (!loaded) warnings.push(`preview_reload_unloaded:${size}`);
  return { loaded, retried };
}

async function captureScreenshotForGate(previewApi, { size, onEvent } = {}) {
  if (!previewApi || typeof previewApi.screenshot !== 'function') return { image: null, retried: false };
  let image = await previewApi.screenshot();
  if (image) return { image, retried: false };

  if (typeof onEvent === 'function') onEvent({ type: 'done_gate.viewport.screenshot_retry', details: { size } });
  image = await previewApi.screenshot();
  return { image: image || null, retried: true };
}

function buildSummary(result) {
  const status = result.pass ? 'PASS' : 'FAIL';
  const screenshots = result.screenshotsOk;
  const perf = result.perfSummary || {};
  const issues = result.issues && result.issues.length ? result.issues.join(' | ') : 'none';
  const warnings = result.warnings && result.warnings.length ? result.warnings.join(' | ') : 'none';
  const journey = result.journey && result.journey.detected
    ? `journey(pass=${result.journey.pass ? 'yes' : 'no'}, steps=${result.journey.passed_steps || 0}/${result.journey.total_steps || 0}, assertions=${result.journey.passed_assertions || 0}/${result.journey.total_assertions || 0})`
    : 'journey=not_run';
  return [
    `[Done Gate ${status}]`,
    `consoleErrors=${result.consoleErrors}`,
    `runtimeErrors=${result.runtimeErrors}`,
    `screenshots=${screenshots}/${VIEWPORTS.length}`,
    journey,
    `perf(fcp=${perf.fcp || 0}, lcp=${perf.lcp || 0}, cls=${perf.cls || 0}, longTasks=${perf.longTasks || 0})`,
    `issues=${issues}`,
    `warnings=${warnings}`,
  ].join(' ');
}

function normalizeJourneyForGate(journeyResult) {
  const raw = journeyResult && typeof journeyResult === 'object' ? journeyResult : null;
  if (!raw) return { detected: false, pass: true };
  return {
    detected: true,
    pass: raw.pass !== false && raw.ok !== false,
    total_steps: Number(raw.total_steps || 0),
    passed_steps: Number(raw.passed_steps || 0),
    total_assertions: Number(raw.total_assertions || 0),
    passed_assertions: Number(raw.passed_assertions || 0),
    failed: Array.isArray(raw.failed) ? raw.failed : [],
  };
}

export async function runAfwDoneGate({ assistantText, journeyResult, onEvent } = {}) {
  void assistantText;

  const previewApi = globalThis.__AFW_PREVIEW_API__;
  const uiApi = globalThis.__AFW_UI_API__;
  if (!previewApi || !uiApi) {
    return { skipped: false, pass: false, issues: ['preview_api_unavailable'], summary: '[Done Gate FAIL] preview api unavailable' };
  }

  const control = getControlState();
  const collectScreenshot = control.collectScreenshot !== false;
  const collectConsole = control.collectConsoleLogs !== false;
  const screenshotApiAvailable = typeof previewApi.screenshot === 'function';
  const shouldValidateScreenshot = collectScreenshot && screenshotApiAvailable;

  const evidence = {
    byViewport: {},
    perfSummary: {},
  };
  let totalConsoleErrors = 0;
  let totalRuntimeErrors = 0;
  let screenshotsOk = 0;
  const captures = [];
  const warnings = [];
  if (collectScreenshot && !screenshotApiAvailable) warnings.push('screenshot_api_unavailable');

  if (typeof onEvent === 'function') onEvent({ type: 'done_gate.started' });

  for (const size of VIEWPORTS) {
    if (typeof uiApi.setViewport === 'function') uiApi.setViewport(size);
    const reloadInfo = await reloadPreviewForGate(uiApi, size, onEvent, warnings);
    await sleep(180);

    const logs = collectConsole && typeof previewApi.getConsoleLogs === 'function'
      ? await previewApi.getConsoleLogs()
      : [];
    const runtimeErrors = typeof previewApi.getRuntimeErrors === 'function'
      ? await previewApi.getRuntimeErrors()
      : [];
    const perf = typeof previewApi.getPerfMetrics === 'function'
      ? await previewApi.getPerfMetrics()
      : {};
    const screenshotInfo = shouldValidateScreenshot
      ? await captureScreenshotForGate(previewApi, { size, onEvent })
      : { image: null, retried: false };
    const image = screenshotInfo.image;

    const consoleErrors = countConsoleErrors(logs);
    const runtimeCount = Array.isArray(runtimeErrors) ? runtimeErrors.length : 0;
    totalConsoleErrors += consoleErrors;
    totalRuntimeErrors += runtimeCount;
    if (image) {
      screenshotsOk += 1;
      captures.push({ size, image });
    }

    evidence.byViewport[size] = {
      hasScreenshot: !!image,
      consoleErrorCount: consoleErrors,
      runtimeErrorCount: runtimeCount,
      perf,
    };
    evidence.perfSummary[size] = perf;

    if (typeof onEvent === 'function') {
      onEvent({
        type: 'done_gate.viewport.checked',
        details: {
          size,
          consoleErrors,
          runtimeErrors: runtimeCount,
          screenshot: !!image,
          screenshotRetried: screenshotInfo.retried,
          loaded: reloadInfo.loaded,
          reloadRetried: reloadInfo.retried,
        },
      });
    }
  }

  const issues = [];
  if (totalConsoleErrors > 0) issues.push(`console_errors:${totalConsoleErrors}`);
  if (totalRuntimeErrors > 0) issues.push(`runtime_errors:${totalRuntimeErrors}`);
  if (shouldValidateScreenshot && screenshotsOk < VIEWPORTS.length) {
    warnings.push(`screenshot_missing:${VIEWPORTS.length - screenshotsOk}`);
  }
  const journey = normalizeJourneyForGate(journeyResult);
  if (journey.detected && !journey.pass) {
    issues.push(`journey_failed:${journey.failed.length || 1}`);
  }

  const result = {
    skipped: false,
    pass: issues.length === 0,
    consoleErrors: totalConsoleErrors,
    runtimeErrors: totalRuntimeErrors,
    screenshotsOk,
    captures,
    issues,
    warnings,
    journey,
    perfSummary: evidence.perfSummary.desktop || {},
    evidence,
  };
  result.summary = buildSummary(result);
  globalThis.__AFW_DONE_GATE_LAST__ = result;
  if (typeof onEvent === 'function') onEvent({ type: 'done_gate.completed', details: result });
  return result;
}
