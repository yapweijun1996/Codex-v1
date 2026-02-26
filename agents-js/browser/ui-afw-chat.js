import { runAfwAgentTurn, stopAfwAgentTurn } from './ui-afw-agent-runtime.js';
import { runAfwDoneGate } from './ui-afw-done-gate.js';
import {
  AFW_TURN_TYPE_CHAT,
  AFW_TURN_TYPE_UI_TASK,
  classifyAfwTurnTypeByToolName,
  finalizeAfwTurnDoneGate,
} from './ui-afw-chat-turn-gate.js';

function shortJson(value, max = 160) {
  try {
    const text = JSON.stringify(value);
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max)}...` : text;
  } catch {
    const text = String(value || '');
    return text.length > max ? `${text.slice(0, max)}...` : text;
  }
}

function summarizeResult(ev) {
  const tool = String(ev && ev.tool || '');
  const result = ev && ev.result && typeof ev.result === 'object' ? ev.result : null;
  if (!result) return '';
  if (tool === 'preview_reload' && result.ok) return `reload=ok, loaded=${result.loaded ? 'yes' : 'no'}`;
  if (tool === 'preview_set_viewport' && result.ok) return `viewport=${result.size || 'desktop'}`;
  if (tool === 'preview_click') return `click ${result.selector || 'n/a'} -> ${result.ok ? 'ok' : 'fail'}`;
  if (tool === 'preview_hover') return `hover ${result.selector || 'n/a'} -> ${result.ok ? 'ok' : 'fail'}`;
  if (tool === 'preview_type') return `type ${result.selector || 'n/a'} chars=${result.chars || 0} -> ${result.ok ? 'ok' : 'fail'}`;
  if (tool === 'preview_press_key') return `press_key ${result.key || 'n/a'} -> ${result.ok ? 'ok' : 'fail'}`;
  if (tool === 'preview_drag') return `drag ${result.from_selector || 'n/a'} -> ${result.to_selector || 'n/a'} -> ${result.ok ? 'ok' : 'fail'}`;
  if (tool === 'preview_scroll') return `scroll y=${Number.isFinite(Number(result.y)) ? Number(result.y) : 0} -> ${result.ok ? 'ok' : 'fail'}`;
  if (tool === 'preview_get_console_logs' && Array.isArray(result.logs)) return `logs=${result.logs.length}`;
  if (tool === 'preview_get_runtime_errors' && Array.isArray(result.errors)) return `runtimeErrors=${result.errors.length}`;
  if (tool === 'preview_get_perf_metrics') {
    return `fcp=${result.fcp || 0}, lcp=${result.lcp || 0}, cls=${result.cls || 0}, longTasks=${result.longTasks || 0}`;
  }
  if (tool === 'preview_get_dom' && typeof result.dom === 'string') return `domChars=${result.dom.length}`;
  if (tool === 'grep_in_workspace' && Array.isArray(result.matches)) return `matches=${result.matches.length}, files=${result.files_scanned || 0}`;
  if (tool === 'replace_in_file' && result.ok) return `changed=${!!result.changed}, replacements=${result.replacements || 0}, range=${result.range ? `${result.range.line_start}-${result.range.line_end}` : 'n/a'}`;
  if (tool === 'edit' && result.ok) return `changed=${!!result.changed}, dryRun=${!!result.dry_run}, replacements=${result.replacements || 0}`;
  if (tool === 'apply_patch' && result.ok) return `files=${result.file_count || 0}, replacements=${result.replacements || 0}`;
  if (tool === 'run_ui_journey' && result && typeof result === 'object') {
    return `pass=${!!result.pass}, steps=${result.passed_steps || 0}/${result.total_steps || 0}, assertions=${result.passed_assertions || 0}/${result.total_assertions || 0}, failed=${Array.isArray(result.failed) ? result.failed.length : 0}`;
  }
  if (tool === 'preview_screenshot' && typeof result.image_base64 === 'string') return 'screenshot=captured';
  return shortJson(result, 120);
}

function getControlState() {
  const api = globalThis.__AFW_CONTROL_API__;
  if (!api || typeof api.getState !== 'function') return {};
  try { return api.getState() || {}; } catch { return {}; }
}

export function bindAfwChat({
  composer,
  input,
  getConfig,
  isBusy,
  setBusy,
  addChat,
  logLine,
  showNotice,
  onAgentEvent,
  onTurnStart,
  runAgentTurn = runAfwAgentTurn,
  runDoneGate = runAfwDoneGate,
}) {
  if (!composer || !input) return;
  const sendButton = composer.querySelector('button[type="submit"]');
  const inputCounter = composer.querySelector('#afwInputCount');

  const updateComposerUi = () => {
    const text = input.value || '';
    const nextCount = text.length;
    const running = typeof isBusy === 'function' && isBusy();
    composer.classList.toggle('is-running', running);
    composer.classList.toggle('has-text', !!text.trim());
    if (inputCounter) inputCounter.textContent = `${nextCount} / 2000`;
    if (sendButton) {
      sendButton.textContent = running ? 'Stop' : 'Send';
      sendButton.classList.toggle('danger', running);
      sendButton.classList.toggle('primary', !running);
      sendButton.disabled = running ? false : !text.trim();
    }
  };

  sendButton?.addEventListener('click', (event) => {
    const running = typeof isBusy === 'function' && isBusy();
    if (!running) return;
    event.preventDefault();
    event.stopPropagation();
    const ok = stopAfwAgentTurn('user_stop');
    if (ok) {
      addChat('agent', 'Stop requested. Agent is halting current turn...');
      logLine('Stop requested by user');
    } else {
      addChat('agent', 'Stop requested, but no active agent turn was found.');
      logLine('Stop requested but no active agent');
    }
  });

  input.addEventListener('input', updateComposerUi);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });
  updateComposerUi();

  composer.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || (typeof isBusy === 'function' && isBusy())) return;

    const cfg = typeof getConfig === 'function' ? getConfig() : null;
    if (typeof onTurnStart === 'function') onTurnStart(text);
    addChat('user', text);
    input.value = '';
    if (typeof setBusy === 'function') setBusy(true);
    updateComposerUi();
    logLine(`Chat message submitted (${cfg && cfg.provider ? cfg.provider : 'unknown'})`);

    try {
      const screenshotSeen = new Set();
      const gateWarningSeen = new Set();
      let turnType = AFW_TURN_TYPE_CHAT;
      let autoReloadEvidenceCaptured = false;
      let latestJourneyResult = null;
      const trackTurnTypeByTool = (toolName) => {
        turnType = classifyAfwTurnTypeByToolName(turnType, toolName);
      };
      const tryCaptureReloadEvidence = async () => {
        const control = getControlState();
        if (control.collectScreenshot === false) return;
        const previewApi = globalThis.__AFW_PREVIEW_API__;
        if (!previewApi || typeof previewApi.screenshot !== 'function') return;
        await new Promise((resolve) => setTimeout(resolve, 180));
        const image = await previewApi.screenshot();
        if (!image || screenshotSeen.has(image)) return;
        screenshotSeen.add(image);
        addChat('agent', 'Preview screenshot (auto after reload):', { image, alt: 'auto preview screenshot' });
      };
      const response = await runAgentTurn({
        config: cfg,
        message: text,
        onEvent: (ev) => {
          if (typeof onAgentEvent === 'function') onAgentEvent(ev);
          if (!ev || !ev.type) return;

          if (ev.type === 'tool.call.begin') {
            const name = String(ev.name || 'tool');
            trackTurnTypeByTool(name);
            const args = shortJson(ev.args, 120);
            addChat('agent', `Action: run ${name}${args ? ` ${args}` : ''}`);
          }

          if (ev.type === 'tool.result') {
            const tool = String(ev.tool || 'tool');
            trackTurnTypeByTool(tool);
            const summary = summarizeResult(ev);
            if (summary) addChat('agent', `Debug: ${tool} -> ${summary}`);
            if (tool === 'run_ui_journey') {
              const result = ev.result && typeof ev.result === 'object' ? ev.result : null;
              latestJourneyResult = result || null;
            }
            if (!autoReloadEvidenceCaptured && tool === 'preview_reload') {
              const result = ev.result && typeof ev.result === 'object' ? ev.result : null;
              if (result && result.ok) {
                autoReloadEvidenceCaptured = true;
                void tryCaptureReloadEvidence();
              }
            }
          }

          if (ev.type === 'tool.call.end') {
            const name = String(ev.name || 'tool');
            trackTurnTypeByTool(name);
            const ms = Number(ev.durationMs || 0);
            const success = ev.success !== false;
            addChat('agent', `Action: ${name} ${success ? 'done' : 'failed'}${ms > 0 ? ` (${ms}ms)` : ''}`);
          }

          if (ev.type === 'tool.error') {
            const name = String(ev.name || ev.tool || 'tool');
            const message = ev.error && ev.error.message ? ev.error.message : String(ev.error || 'unknown error');
            addChat('agent', `Debug Error: ${name} -> ${message}`);
          }

          if (ev.type === 'done_gate.viewport.checked') {
            const d = ev.details || {};
            addChat('agent', `Check: ${d.size || 'viewport'} console=${d.consoleErrors || 0}, runtime=${d.runtimeErrors || 0}, screenshot=${d.screenshot ? 'yes' : 'no'}`);
            if (d.loaded === false) {
              const warning = `preview_reload_unloaded:${d.size || 'viewport'}`;
              if (!gateWarningSeen.has(warning)) {
                gateWarningSeen.add(warning);
                addChat('agent', warning, { badges: [{ tone: 'warn', text: 'Warning' }] });
              }
            }
          }

          if (ev.type === 'tool.result' && ev.tool === 'preview_screenshot') {
            const result = ev.result && typeof ev.result === 'object' ? ev.result : null;
            const image = result && typeof result.image_base64 === 'string' ? result.image_base64 : '';
            if (image && !screenshotSeen.has(image)) {
              screenshotSeen.add(image);
              addChat('agent', 'Preview screenshot (captured by agent):', { image, alt: 'preview screenshot' });
            }
          }
          if (ev.type === 'response.chunk') return;
          if (ev.type === 'turn.completed') return;
          logLine(`Agent event: ${ev.type}`);
        },
      });
      addChat('agent', response);
      logLine('Chat response received');
      await finalizeAfwTurnDoneGate({
        turnType,
        assistantText: response,
        journeyResult: latestJourneyResult,
        runDoneGate,
        onEvent: (ev) => { if (typeof onAgentEvent === 'function') onAgentEvent(ev); },
        onSummary: (summary) => addChat('agent', summary),
        onWarning: (warning) => addChat('agent', warning, { badges: [{ tone: 'warn', text: 'Warning' }] }),
        onCapture: ({ image, size }) => addChat('agent', `Done Gate screenshot (${size}):`, { image, alt: `done gate ${size} screenshot` }),
        logLine,
        screenshotSeen,
        gateWarningSeen,
      });
    } catch (error) {
      const msg = error && error.displayMessage ? error.displayMessage : (error && error.message ? error.message : String(error));
      addChat('agent', msg);
      logLine(`Chat error: ${msg}`);
      showNotice(msg, 'error');
    } finally {
      if (typeof setBusy === 'function') setBusy(false);
      updateComposerUi();
    }
  });
}
