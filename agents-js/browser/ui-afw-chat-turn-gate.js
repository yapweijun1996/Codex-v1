import { extractPreviewReloadWarnings } from './ui-afw-warning-utils.js';

export const AFW_TURN_TYPE_CHAT = 'chat_turn';
export const AFW_TURN_TYPE_UI_TASK = 'ui_task_turn';

export function classifyAfwTurnTypeByToolName(currentType, toolName) {
  const current = currentType === AFW_TURN_TYPE_UI_TASK ? AFW_TURN_TYPE_UI_TASK : AFW_TURN_TYPE_CHAT;
  const name = String(toolName || '');
  if (!name) return current;
  if (name === 'run_ui_journey' || name.startsWith('preview_')) return AFW_TURN_TYPE_UI_TASK;
  return current;
}

export async function finalizeAfwTurnDoneGate({
  turnType,
  assistantText,
  journeyResult,
  runDoneGate,
  onEvent,
  onSummary,
  onWarning,
  onCapture,
  logLine,
  screenshotSeen,
  gateWarningSeen,
}) {
  if (turnType !== AFW_TURN_TYPE_UI_TASK) {
    if (typeof logLine === 'function') logLine(`Done Gate skipped: ${AFW_TURN_TYPE_CHAT}`);
    return { skipped: true, reason: AFW_TURN_TYPE_CHAT };
  }

  const gate = await runDoneGate({
    assistantText,
    journeyResult,
    onEvent,
  });
  if (gate && !gate.skipped) {
    if (typeof onSummary === 'function') onSummary(gate.summary);
    const gateWarnings = extractPreviewReloadWarnings(gate && gate.warnings);
    for (const warning of gateWarnings) {
      if (gateWarningSeen && gateWarningSeen.has(warning)) continue;
      if (gateWarningSeen) gateWarningSeen.add(warning);
      if (typeof onWarning === 'function') onWarning(warning);
    }
    const captures = Array.isArray(gate.captures) ? gate.captures : [];
    for (const capture of captures) {
      const image = capture && typeof capture.image === 'string' ? capture.image : '';
      const size = capture && capture.size ? String(capture.size) : 'viewport';
      if (!image || (screenshotSeen && screenshotSeen.has(image))) continue;
      if (screenshotSeen) screenshotSeen.add(image);
      if (typeof onCapture === 'function') onCapture({ image, size });
    }
    if (typeof logLine === 'function') logLine(gate.summary);
  }
  return gate;
}
