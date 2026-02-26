import {
  AFW_TURN_TYPE_CHAT,
  AFW_TURN_TYPE_UI_TASK,
  classifyAfwTurnTypeByToolName,
  finalizeAfwTurnDoneGate,
} from '../browser/ui-afw-chat-turn-gate.js';

describe('AFW chat turn done gate routing', () => {
  it('classifies turn type using ui tools only', () => {
    expect(classifyAfwTurnTypeByToolName(AFW_TURN_TYPE_CHAT, 'memory_search')).toBe(AFW_TURN_TYPE_CHAT);
    expect(classifyAfwTurnTypeByToolName(AFW_TURN_TYPE_CHAT, 'preview_click')).toBe(AFW_TURN_TYPE_UI_TASK);
    expect(classifyAfwTurnTypeByToolName(AFW_TURN_TYPE_CHAT, 'run_ui_journey')).toBe(AFW_TURN_TYPE_UI_TASK);
    expect(classifyAfwTurnTypeByToolName(AFW_TURN_TYPE_UI_TASK, 'memory_search')).toBe(AFW_TURN_TYPE_UI_TASK);
  });

  it('skips done gate for chat_turn', async () => {
    const logs = [];
    let doneGateCalls = 0;

    const out = await finalizeAfwTurnDoneGate({
      turnType: AFW_TURN_TYPE_CHAT,
      assistantText: 'Hello',
      journeyResult: null,
      runDoneGate: async () => {
        doneGateCalls += 1;
        return { skipped: false, summary: '[Done Gate PASS]', warnings: [], captures: [] };
      },
      logLine: (line) => logs.push(String(line || '')),
    });

    expect(doneGateCalls).toBe(0);
    expect(out.skipped).toBe(true);
    expect(logs.some((x) => x.includes('Done Gate skipped: chat_turn'))).toBe(true);
  });

  it('runs done gate for ui_task_turn and surfaces summary', async () => {
    const summaries = [];
    const warnings = [];
    const captures = [];
    const logs = [];
    let doneGateCalls = 0;
    const screenshotSeen = new Set();
    const gateWarningSeen = new Set();

    await finalizeAfwTurnDoneGate({
      turnType: AFW_TURN_TYPE_UI_TASK,
      assistantText: 'Done',
      journeyResult: { pass: true },
      runDoneGate: async () => {
        doneGateCalls += 1;
        return {
          skipped: false,
          summary: '[Done Gate PASS] issues=none warnings=preview_reload_unloaded:mobile',
          warnings: ['preview_reload_unloaded:mobile'],
          captures: [{ image: 'data:image/png;base64,1', size: 'desktop' }],
        };
      },
      onSummary: (text) => summaries.push(String(text || '')),
      onWarning: (text) => warnings.push(String(text || '')),
      onCapture: (item) => captures.push(item),
      logLine: (line) => logs.push(String(line || '')),
      screenshotSeen,
      gateWarningSeen,
    });

    expect(doneGateCalls).toBe(1);
    expect(summaries.some((x) => x.includes('[Done Gate PASS]'))).toBe(true);
    expect(warnings).toEqual(['preview_reload_unloaded:mobile']);
    expect(captures.length).toBe(1);
    expect(logs.some((x) => x.includes('[Done Gate PASS]'))).toBe(true);
  });
});
