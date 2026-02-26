import {
    riskLabel,
    summarizePlanUpdate,
    normalizeToolArgs,
    getIntentText,
    firstLine,
    summarizeToolResultPayload,
    buildToolLineText,
    summarizeToolArgsForLog,
    truncate,
    formatArgsPreview,
} from './ui-thought-logger-helpers.js';

export function createUiThoughtLogger({ assistantStream } = {}) {
    let step = 0;
    let userMessage = '';
    const execOutputSeen = new Map(); // id:stream -> count

    const log = (kindOrPayload, text) => {
        if (!assistantStream || typeof assistantStream.appendThought !== 'function') return;
        const payload = (typeof kindOrPayload === 'object' && kindOrPayload && text === undefined)
            ? kindOrPayload
            : (text === undefined)
                ? { kind: 'info', text: String(kindOrPayload || '') }
                : { kind: kindOrPayload || 'info', text: String(text || '') };
        try {
            assistantStream.appendThought(payload);
        } catch {
            // Avoid breaking UI loop.
            try {
                assistantStream.appendThought(String(text === undefined ? kindOrPayload : text));
            } catch {
                // ignore
            }
        }
    };

    const computeRiskAggregate = (items, { fallbackMaxRisk } = {}) => {
        const list = Array.isArray(items) ? items : [];
        let maxRisk = (typeof fallbackMaxRisk === 'number' && Number.isFinite(fallbackMaxRisk))
            ? fallbackMaxRisk
            : null;
        let tier2 = 0;
        let tier3 = 0;
        for (const it of list) {
            const r = it && typeof it.risk === 'number' && Number.isFinite(it.risk) ? it.risk : null;
            if (r === null) continue;
            if (maxRisk === null || r > maxRisk) maxRisk = r;
            if (r === 2) tier2 += 1;
            if (r === 3) tier3 += 1;
        }
        return { maxRisk, tier2, tier3 };
    };

    const formatRiskAggregate = (agg) => {
        if (!agg) return '';
        const hasCounts = (agg.tier2 || 0) + (agg.tier3 || 0) > 0;
        const hasMax = typeof agg.maxRisk === 'number' && Number.isFinite(agg.maxRisk);
        if (!hasCounts && !hasMax) return '';

        // Avoid noisy summaries for low-risk-only groups.
        if (!hasCounts && agg.maxRisk < 2) return '';

        const max = hasMax ? `max ${riskLabel(agg.maxRisk)}` : '';
        const counts = hasCounts ? `Tier2=${agg.tier2 || 0} Tier3=${agg.tier3 || 0}` : '';
        const bits = [max, counts].filter(Boolean).join('; ');
        return bits ? ` (${bits})` : '';
    };

    return {
        setUserMessage(text) {
            userMessage = String(text || '');
        },
        onEvent(ev) {
            if (!ev || !ev.type) return;

            if (ev.type === 'turn.started') {
                const input = ev.input ? truncate(String(ev.input), 120) : '';
                log('turn', `Turn started${input ? ` - ${input}` : ''}`);
                return;
            }

            if (ev.type === 'thinking') {
                const nextStep = Number(ev.step || 0);
                if (Number.isFinite(nextStep) && nextStep >= 1) step = nextStep;
                return;
            }

            if (ev.type === 'context.truncated') {
                const dropped = Number.isFinite(Number(ev.dropped)) ? Number(ev.dropped) : null;
                const tokens = Number.isFinite(Number(ev.estimatedTokens)) ? Number(ev.estimatedTokens) : null;
                if (dropped && dropped > 0) {
                    log('context', `Step ${step || '?'}: Context - dropped ${dropped}${tokens ? ` (~${tokens} tokens)` : ''}`);
                }
                return;
            }

            if (ev.type === 'assistant_message_started') {
                const nextStep = Number(ev.step || 0);
                if (Number.isFinite(nextStep) && nextStep >= 1) step = nextStep;
                if (step === 1) {
                    const q = truncate(userMessage, 120);
                    log('step', `Step 1: Thinking - understand request${q ? `: ${q}` : ''}`);
                } else if (step >= 2) {
                    log('step', `Step ${step}: Thinking - use evidence and decide next action`);
                }
                return;
            }

            if (ev.type === 'plan.updated') {
                const info = summarizePlanUpdate(ev);
                log('plan', `Step ${step || '?'}: Plan updated${info ? ` - ${info}` : ''}`);
                return;
            }

            if (ev.type === 'tool.call') {
                const list = Array.isArray(ev.details) ? ev.details : [];
                if (list.length === 0) {
                    log('action', `Step ${step || '?'}: Action - request tool`);
                    return;
                }

                if (list.length > 1) {
                    const agg = computeRiskAggregate(list);
                    const children = [];
                    for (const tc of list) {
                        if (!tc || !tc.name) continue;
                        const toolName = String(tc.name);
                        const argsObj = normalizeToolArgs(tc.arguments);
                        const intent = getIntentText(tc.intent);
                        const args = summarizeToolArgsForLog({ toolName, argsObj });
                        children.push({
                            kind: 'action',
                            text: buildToolLineText({
                                prefix: '- ',
                                toolName,
                                intent,
                                args,
                            }),
                        });
                    }
                    log({
                        kind: 'action',
                        text: `Step ${step || '?'}: Action - ${children.length || list.length} tools${formatRiskAggregate(agg)}`,
                        children,
                    });
                    return;
                }

                for (const tc of list) {
                    if (!tc || !tc.name) continue;
                    const toolName = String(tc.name);
                    const argsObj = normalizeToolArgs(tc.arguments);
                    const intent = getIntentText(tc.intent);
                    const args = summarizeToolArgsForLog({ toolName, argsObj });
                    log('action', `Step ${step || '?'}: Action - ${toolName}${intent ? ` (${intent})` : ''}${args ? ` ${args}` : ''}`);
                }
                return;
            }

            if (ev.type === 'approval.required') {
                const isBatch = Boolean(ev.batch) || Array.isArray(ev.tools);
                if (isBatch) {
                    const tools = Array.isArray(ev.tools) ? ev.tools : [];
                    const agg = computeRiskAggregate(tools, { fallbackMaxRisk: ev.risk });
                    const children = [];
                    for (const t of tools) {
                        if (!t || !t.name) continue;
                        const toolName = String(t.name);
                        const argsObj = normalizeToolArgs(t.args);
                        const intent = getIntentText(t.intent);
                        const args = summarizeToolArgsForLog({ toolName, argsObj });
                        const r = riskLabel(t.risk);
                        children.push({
                            kind: 'approval',
                            text: `${r ? `[${r}] ` : ''}${buildToolLineText({
                                prefix: '- ',
                                toolName,
                                intent,
                                args,
                            })}`,
                        });
                    }
                    log({
                        kind: 'approval',
                        text: `Step ${step || '?'}: Approval required - ${children.length || tools.length} tools${formatRiskAggregate(agg)}`,
                        children,
                    });
                    return;
                }

                const toolName = ev.tool ? String(ev.tool) : '(unknown)';
                const argsObj = normalizeToolArgs(ev.args);
                const intent = getIntentText(ev.intent);
                const args = summarizeToolArgsForLog({ toolName, argsObj });
                const r = riskLabel(ev.risk);
                log('approval', `Step ${step || '?'}: Approval required - ${toolName}${r ? ` (${r})` : ''}${intent ? ` (${intent})` : ''}${args ? ` ${args}` : ''}`);
                return;
            }

            if (ev.type === 'approval.skipped') {
                const toolName = ev.tool ? String(ev.tool) : '(unknown)';
                const argsObj = normalizeToolArgs(ev.args);
                const args = summarizeToolArgsForLog({ toolName, argsObj });
                const r = riskLabel(ev.risk);
                const reason = ev.reason ? String(ev.reason) : '';
                const policy = ev.policy ? String(ev.policy) : '';
                const why = [reason ? `reason=${reason}` : '', policy ? `policy=${policy}` : ''].filter(Boolean).join(' ');
                log('approval', `Step ${step || '?'}: Approval skipped - ${toolName}${r ? ` (${r})` : ''}${why ? ` (${why})` : ''}${args ? ` ${args}` : ''}`);
                return;
            }

            if (ev.type === 'tool.call.begin') {
                log('exec', `Step ${step || '?'}: Executing - ${ev.name || '(tool)'}`);
                return;
            }

            if (ev.type === 'tool.result') {
                const toolName = ev.tool ? String(ev.tool) : '(tool)';
                const summary = summarizeToolResultPayload(ev);
                log('result', `Step ${step || '?'}: Result - ${toolName}${summary ? ` (${summary})` : ''}`);
                return;
            }

            if (ev.type === 'knowledge.selected') {
                const ids = Array.isArray(ev.selectedIds) ? ev.selectedIds : [];
                const preview = ids.slice(0, 3).join(', ');
                const totalHits = Number.isFinite(Number(ev.totalHits)) ? Number(ev.totalHits) : ids.length;
                const tool = ev.tool ? String(ev.tool) : 'knowledge_tool';
                log('result', `Step ${step || '?'}: Knowledge selected - ${tool} (${ids.length}/${totalHits})${preview ? ` ids=${preview}` : ''}`);
                return;
            }

            if (ev.type === 'tool.error') {
                const toolName = ev.tool ? String(ev.tool) : '(tool)';
                const msg = ev.error ? truncate(firstLine(ev.error), 140) : '';
                log('error', `Step ${step || '?'}: Error - ${toolName}${msg ? ` (${msg})` : ''}`);
                return;
            }

            if (ev.type === 'exec_command.begin') {
                const cmd = ev.command ? truncate(String(ev.command), 140) : '';
                log('command', `Step ${step || '?'}: Command - ${cmd || '(shell)'}`);
                return;
            }

            if (ev.type === 'exec_command.output') {
                const id = ev.id ? String(ev.id) : '';
                const stream = ev.stream ? String(ev.stream) : 'stdout';
                const key = `${id}:${stream}`;
                const seen = execOutputSeen.get(key) || 0;
                if (seen >= 1) return;
                execOutputSeen.set(key, seen + 1);
                const chunk = ev.chunk ? truncate(firstLine(ev.chunk), 160) : '';
                if (chunk) log(stream === 'stderr' ? 'stderr' : 'stdout', `Step ${step || '?'}: ${stream} - ${chunk}`);
                return;
            }

            if (ev.type === 'exec_command.end') {
                const exitCode = Number.isFinite(Number(ev.exitCode)) ? Number(ev.exitCode) : ev.exitCode;
                const duration = Number.isFinite(ev.durationMs) ? ` ${Math.max(0, Math.round(ev.durationMs))}ms` : '';
                log('done', `Step ${step || '?'}: Command done - exitCode=${exitCode}${duration}`);
                return;
            }

            if (ev.type === 'tool.call.end') {
                const ok = ev.success === false ? 'error' : 'ok';
                const duration = Number.isFinite(ev.durationMs) ? ` ${Math.max(0, Math.round(ev.durationMs))}ms` : '';
                log('done', `Step ${step || '?'}: Done - ${ev.name || '(tool)'} (${ok})${duration}`);
                return;
            }

            if (ev.type === 'turn.completed') {
                log('turn', 'Turn completed');
            }
        },
    };
}
