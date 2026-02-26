function asText(value) {
  return String(value == null ? '' : value);
}
function asBool(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}
function asWaitMs(value, fallback = 80) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(5000, Math.trunc(n)));
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function countConsoleErrors(logs) {
  if (!Array.isArray(logs)) return 0;
  return logs.filter((item) => String(item && item.level || '').toLowerCase() === 'error').length;
}
function countRuntimeErrors(errors) {
  return Array.isArray(errors) ? errors.length : 0;
}
function getMetricValue(perf, metric) {
  const key = asText(metric).trim();
  if (!key) return NaN;
  const value = perf && typeof perf === 'object' ? perf[key] : NaN;
  return Number(value);
}
function stripTags(input) {
  return asText(input).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function makeDomSelectorProbe(html, selector) {
  const source = asText(html);
  const css = asText(selector).trim();
  if (!css) return { exists: false, text: '', error: 'selector is required' };

  try {
    if (typeof DOMParser === 'function') {
      const doc = new DOMParser().parseFromString(source, 'text/html');
      const node = doc.querySelector(css);
      return { exists: !!node, text: node ? asText(node.textContent || '').trim() : '' };
    }
  } catch (error) {
    return { exists: false, text: '', error: `invalid selector: ${error && error.message ? error.message : 'unknown'}` };
  }

  if (css.startsWith('#')) {
    const id = css.slice(1);
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const block = new RegExp(`<([\\w-]+)[^>]*\\sid=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i').exec(source);
    return { exists: !!block, text: block ? stripTags(block[2]) : '' };
  }
  if (css.startsWith('.')) {
    const klass = css.slice(1);
    const escaped = klass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const block = new RegExp(`<([\\w-]+)[^>]*\\sclass=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i').exec(source);
    return { exists: !!block, text: block ? stripTags(block[2]) : '' };
  }
  const tag = css.match(/^[a-zA-Z][\w-]*$/) ? css.toLowerCase() : '';
  if (tag) {
    const block = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(source);
    return { exists: !!block, text: block ? stripTags(block[1]) : '' };
  }
  return { exists: source.includes(css), text: '' };
}

export function createAfwJourneyTool({ getPreviewApi, getUiApi, getControlState } = {}) {
  const previewApi = typeof getPreviewApi === 'function' ? getPreviewApi : () => null;
  const uiApi = typeof getUiApi === 'function' ? getUiApi : () => null;
  const controlState = typeof getControlState === 'function' ? getControlState : () => ({});

  const executeStep = async (step = {}, ctx = {}) => {
    const action = asText(step.action).trim();
    if (!action) return { ok: false, action, error: 'Missing action' };

    if (action === 'wait') {
      const ms = asWaitMs(step.ms, 120);
      await sleep(ms);
      return { ok: true, action, ms };
    }

    if (action === 'reload') {
      const ui = uiApi();
      if (!ui || typeof ui.reloadPreview !== 'function') return { ok: false, action, error: 'UI API unavailable' };
      const out = await ui.reloadPreview();
      return { ok: true, action, loaded: !!(out && out.loaded) };
    }

    if (action === 'set_viewport') {
      const ui = uiApi();
      if (!ui || typeof ui.setViewport !== 'function') return { ok: false, action, error: 'UI API unavailable' };
      const size = asText(step.size || 'desktop');
      ui.setViewport(size);
      return { ok: true, action, size };
    }

    const preview = previewApi();
    if (!preview || typeof preview.call !== 'function') return { ok: false, action, error: 'Preview API unavailable' };
    const control = controlState();
    const needInteraction = new Set(['click', 'hover', 'type', 'press_key', 'drag', 'scroll']);
    if (needInteraction.has(action) && !control.enableInteractionTools) {
      return { ok: false, action, error: 'Interaction tools disabled by Control Switches' };
    }

    if (action === 'click') return { ok: true, action, result: await preview.call('click', asText(step.selector)) };
    if (action === 'hover') return { ok: true, action, result: await preview.call('hover', asText(step.selector)) };
    if (action === 'type') {
      const text = asText(step.text);
      return { ok: true, action, chars: text.length, result: await preview.call('type', asText(step.selector), text) };
    }
    if (action === 'press_key') return { ok: true, action, key: asText(step.key), result: await preview.call('pressKey', asText(step.key)) };
    if (action === 'drag') {
      return {
        ok: true,
        action,
        result: await preview.call('drag', asText(step.from_selector), asText(step.to_selector)),
      };
    }
    if (action === 'scroll') {
      const y = Number(step.y || 0);
      const target = Number.isFinite(y) ? y : 0;
      return { ok: true, action, y: target, result: await preview.call('scrollTo', target) };
    }

    if (action === 'capture_dom') {
      ctx.dom = typeof preview.getDOM === 'function' ? asText(await preview.getDOM()) : asText(await preview.call('getDOM'));
      return { ok: true, action, dom_chars: ctx.dom.length };
    }
    if (action === 'capture_console') {
      ctx.consoleLogs = typeof preview.getConsoleLogs === 'function'
        ? await preview.getConsoleLogs()
        : await preview.call('getConsoleLogs');
      return { ok: true, action, count: Array.isArray(ctx.consoleLogs) ? ctx.consoleLogs.length : 0 };
    }
    if (action === 'capture_runtime') {
      ctx.runtimeErrors = typeof preview.getRuntimeErrors === 'function'
        ? await preview.getRuntimeErrors()
        : await preview.call('getRuntimeErrors');
      return { ok: true, action, count: countRuntimeErrors(ctx.runtimeErrors) };
    }
    if (action === 'capture_perf') {
      ctx.perf = typeof preview.getPerfMetrics === 'function'
        ? await preview.getPerfMetrics()
        : await preview.call('getPerfMetrics');
      return { ok: true, action, perf: ctx.perf || {} };
    }
    if (action === 'capture_screenshot') {
      ctx.screenshot = typeof preview.screenshot === 'function'
        ? await preview.screenshot()
        : await preview.call('screenshot');
      return { ok: true, action, captured: !!ctx.screenshot };
    }

    return { ok: false, action, error: `Unsupported action: ${action}` };
  };

  const evaluateAssertion = async (assertion = {}, ctx = {}) => {
    const type = asText(assertion.type).trim();
    if (!type) return { ok: false, type, error: 'Missing assertion type' };
    const preview = previewApi();

    if (type === 'dom_includes') {
      if (!ctx.dom && preview && typeof preview.getDOM === 'function') ctx.dom = asText(await preview.getDOM());
      const needle = asText(assertion.text);
      const ok = !!needle && asText(ctx.dom).includes(needle);
      return { ok, type, detail: ok ? 'found' : `missing: ${needle}` };
    }
    if (type === 'dom_not_includes') {
      if (!ctx.dom && preview && typeof preview.getDOM === 'function') ctx.dom = asText(await preview.getDOM());
      const needle = asText(assertion.text);
      const ok = !!needle && !asText(ctx.dom).includes(needle);
      return { ok, type, detail: ok ? 'not found' : `unexpected text: ${needle}` };
    }
    if (type === 'assert_selector_exists') {
      if (!ctx.dom && preview && typeof preview.getDOM === 'function') ctx.dom = asText(await preview.getDOM());
      const selector = asText(assertion.selector);
      const probe = makeDomSelectorProbe(ctx.dom, selector);
      if (probe.error) return { ok: false, type, selector, error: probe.error };
      return { ok: !!probe.exists, type, selector, detail: probe.exists ? 'found' : 'not found' };
    }
    if (type === 'assert_selector_text') {
      if (!ctx.dom && preview && typeof preview.getDOM === 'function') ctx.dom = asText(await preview.getDOM());
      const selector = asText(assertion.selector);
      const expected = asText(assertion.text);
      const exact = asBool(assertion.exact, false);
      const probe = makeDomSelectorProbe(ctx.dom, selector);
      if (probe.error) return { ok: false, type, selector, error: probe.error };
      if (!probe.exists) return { ok: false, type, selector, error: 'selector not found' };
      const actual = asText(probe.text);
      const ok = exact ? actual === expected : actual.includes(expected);
      return { ok, type, selector, expected, actual, exact };
    }
    if (type === 'console_errors_max') {
      if (!ctx.consoleLogs && preview && typeof preview.getConsoleLogs === 'function') ctx.consoleLogs = await preview.getConsoleLogs();
      const max = Number(assertion.max == null ? 0 : assertion.max);
      const value = countConsoleErrors(ctx.consoleLogs);
      return { ok: value <= max, type, value, max };
    }
    if (type === 'runtime_errors_max') {
      if (!ctx.runtimeErrors && preview && typeof preview.getRuntimeErrors === 'function') ctx.runtimeErrors = await preview.getRuntimeErrors();
      const max = Number(assertion.max == null ? 0 : assertion.max);
      const value = countRuntimeErrors(ctx.runtimeErrors);
      return { ok: value <= max, type, value, max };
    }
    if (type === 'perf_metric_max') {
      if (!ctx.perf && preview && typeof preview.getPerfMetrics === 'function') ctx.perf = await preview.getPerfMetrics();
      const metric = asText(assertion.metric);
      const max = Number(assertion.max);
      const value = getMetricValue(ctx.perf, metric);
      const ok = Number.isFinite(max) && Number.isFinite(value) && value <= max;
      return { ok, type, metric, value, max };
    }
    if (type === 'screenshot_captured') {
      if (!ctx.screenshot && preview && typeof preview.screenshot === 'function') ctx.screenshot = await preview.screenshot();
      const ok = !!ctx.screenshot;
      return { ok, type };
    }
    if (type === 'step_ok') {
      const index = Number(assertion.index);
      const entry = Number.isFinite(index) ? ctx.stepResults[index] : null;
      return { ok: !!(entry && entry.ok), type, index, found: !!entry };
    }
    return { ok: false, type, error: `Unsupported assertion type: ${type}` };
  };

  return {
    name: 'run_ui_journey',
    description: 'Run scripted AFW preview journey with assertions and structured pass/fail report.',
    parameters: {
      type: 'object',
      properties: {
        steps: { type: 'array', items: { type: 'object' }, description: 'Ordered steps, e.g. reload/click/type/capture_*.' },
        assertions: { type: 'array', items: { type: 'object' }, description: 'Checks: dom_includes/dom_not_includes/assert_selector_exists/assert_selector_text/runtime_errors_max/console_errors_max/perf_metric_max/screenshot_captured/step_ok.' },
        stop_on_failure: { type: 'boolean', description: 'Stop execution on first failed step. Default true.' },
        screenshot_on_failure: { type: 'boolean', description: 'Capture screenshot if step/assertion fails. Default true.' },
        wait_ms_between_steps: { type: 'number', description: 'Delay between steps in ms. Default 80.' },
      },
      required: ['steps'],
    },
    func: async ({ steps = [], assertions = [], stop_on_failure, screenshot_on_failure, wait_ms_between_steps } = {}) => {
      if (!Array.isArray(steps) || steps.length === 0) return { error: 'steps must be a non-empty array' };
      const ctx = { dom: '', consoleLogs: null, runtimeErrors: null, perf: null, screenshot: null, stepResults: [] };
      const stopOnFailure = asBool(stop_on_failure, true);
      const screenshotOnFailure = asBool(screenshot_on_failure, true);
      const waitMs = asWaitMs(wait_ms_between_steps, 80);
      const preview = previewApi();
      const failed = [];

      for (let i = 0; i < steps.length; i += 1) {
        const result = await executeStep(steps[i], ctx);
        ctx.stepResults.push(result);
        if (!result.ok) {
          failed.push({ kind: 'step', index: i, action: result.action, error: result.error || 'step failed' });
          if (screenshotOnFailure && preview && typeof preview.screenshot === 'function') {
            try { ctx.screenshot = await preview.screenshot(); } catch {}
          }
          if (stopOnFailure) break;
        }
        if (waitMs > 0 && i < steps.length - 1) await sleep(waitMs);
      }

      const assertionResults = [];
      if (failed.length === 0 || !stopOnFailure) {
        for (let i = 0; i < assertions.length; i += 1) {
          const result = await evaluateAssertion(assertions[i], ctx);
          assertionResults.push(result);
          if (!result.ok) {
            failed.push({ kind: 'assertion', index: i, type: result.type, error: result.error || result.detail || 'assertion failed' });
            if (screenshotOnFailure && preview && typeof preview.screenshot === 'function' && !ctx.screenshot) {
              try { ctx.screenshot = await preview.screenshot(); } catch {}
            }
            if (stopOnFailure) break;
          }
        }
      }

      return {
        ok: failed.length === 0,
        pass: failed.length === 0,
        total_steps: steps.length,
        executed_steps: ctx.stepResults.length,
        passed_steps: ctx.stepResults.filter((item) => item && item.ok).length,
        total_assertions: Array.isArray(assertions) ? assertions.length : 0,
        passed_assertions: assertionResults.filter((item) => item && item.ok).length,
        failed,
        steps: ctx.stepResults,
        assertions: assertionResults,
        evidence: {
          dom_chars: asText(ctx.dom).length,
          console_error_count: countConsoleErrors(ctx.consoleLogs),
          runtime_error_count: countRuntimeErrors(ctx.runtimeErrors),
          perf: ctx.perf || {},
          screenshot_captured: !!ctx.screenshot,
          screenshot_base64: ctx.screenshot || null,
        },
      };
    },
  };
}
