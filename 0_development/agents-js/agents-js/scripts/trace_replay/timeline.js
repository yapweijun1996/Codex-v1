'use strict';

const { normalizeTraceObject, safeJsonParse } = require('./io');
const { truncate, firstLine, tsShort } = require('./text');
const { computeRiskAggregate, formatRiskAggregate, riskLabel } = require('./risk');

function normalizeToolArgs(rawArgs) {
    if (rawArgs == null) return null;
    if (typeof rawArgs === 'string') {
        const parsed = safeJsonParse(rawArgs);
        return parsed.ok ? parsed.value : { _raw: truncate(rawArgs, 160) };
    }
    if (typeof rawArgs === 'object') return rawArgs;
    return { _raw: String(rawArgs) };
}

function pickString(obj, keys) {
    for (const key of keys) {
        const v = obj && obj[key];
        if (typeof v === 'string') {
            const s = v.trim();
            if (s) return s;
        }
    }
    return '';
}

function summarizeToolArgsForLog({ toolName, argsObj }) {
    if (!argsObj) return '';
    if (typeof argsObj !== 'object') return `value=${truncate(String(argsObj), 120)}`;
    if (typeof argsObj._raw === 'string') return `raw="${truncate(argsObj._raw, 120)}"`;

    const name = String(toolName || '').toLowerCase();
    const obj = argsObj;
    if (name.includes('searxng') || name.includes('web_search') || name.includes('search')) {
        const q = pickString(obj, ['query', 'q', 'text', 'keywords']);
        if (q) return `query="${truncate(q, 140)}"`;
    }
    if (name === 'read_url' || name.includes('url_reader') || name.includes('read_url')) {
        const url = pickString(obj, ['url', 'href']);
        if (url) return `url="${truncate(url, 160)}"`;
    }

    // File-ish tools.
    if (
        name === 'read_file'
        || name === 'view_image'
        || name === 'list_dir'
        || name === 'grep_files'
        || name.includes('file')
    ) {
        const path = pickString(obj, ['filePath', 'path', 'dir', 'directory']);
        const pattern = pickString(obj, ['pattern', 'include']);
        if (path && pattern) return `path="${truncate(path, 120)}" pattern="${truncate(pattern, 80)}"`;
        if (path) return `path="${truncate(path, 140)}"`;
        if (pattern) return `pattern="${truncate(pattern, 120)}"`;
    }
    if (name === 'run_command') {
        const cmd = pickString(obj, ['command', 'cmd']);
        if (cmd) return `cmd="${truncate(cmd, 160)}"`;
    }

    if (name === 'run_javascript') {
        const code = pickString(obj, ['code', 'javascript', 'script']);
        if (code) return `codeChars=${code.length}`;
    }

    if (name === 'apply_patch') {
        const patchText = pickString(obj, ['patchText', 'patch']);
        if (patchText) return `patchChars=${patchText.length}`;
    }

    if (name === 'update_plan') {
        const steps = Array.isArray(obj.plan) ? obj.plan.length : 0;
        if (steps) return `steps=${steps}`;
        const explanation = pickString(obj, ['explanation']);
        if (explanation) return `explanation="${truncate(explanation, 120)}"`;
    }

    const keys = Object.keys(obj).filter(k => k !== '_raw');
    if (keys.length === 0) return '';
    const shown = keys.slice(0, 4);
    return `keys=${shown.join(',')}${keys.length > shown.length ? `(+${keys.length - shown.length})` : ''}`;
}

function summarizeToolResultForLog(result) {
    if (result == null) return 'null';
    if (typeof result === 'string') return `text ${result.length} chars`;
    if (Array.isArray(result)) return `array ${result.length}`;
    if (typeof result !== 'object') return String(result);

    if (result._agentsjs_tool_output_guard && typeof result._agentsjs_tool_output_guard === 'object') {
        const meta = result._agentsjs_tool_output_guard;
        const kind = meta.kind ? String(meta.kind) : '';
        const originalBytes = Number.isFinite(meta.originalBytes) ? meta.originalBytes : null;
        const keptBytes = Number.isFinite(meta.keptBytes) ? meta.keptBytes : null;
        const size = (originalBytes != null || keptBytes != null) ? `${originalBytes ?? '?'}B->${keptBytes ?? '?'}B` : '';
        const bits = [kind, size].filter(Boolean).join(' ');
        return bits ? `truncated ${bits}` : 'truncated';
    }

    if (Object.prototype.hasOwnProperty.call(result, 'exitCode')) {
        const exitCode = Number.isFinite(Number(result.exitCode)) ? Number(result.exitCode) : result.exitCode;
        const stdoutLen = (typeof result.stdout === 'string') ? result.stdout.length : 0;
        const stderrLen = (typeof result.stderr === 'string') ? result.stderr.length : 0;
        return `exitCode=${exitCode} stdout=${stdoutLen} stderr=${stderrLen}`;
    }

    const keys = Object.keys(result);
    return keys.length ? `object keys=${keys.length}` : 'object';
}

function summarizePlanUpdate(payload) {
    const explanation = payload && typeof payload.explanation === 'string' ? payload.explanation.trim() : '';
    const plan = payload && Array.isArray(payload.plan) ? payload.plan : [];
    const items = plan
        .filter((p) => p && typeof p === 'object')
        .filter((p) => typeof p.step === 'string' && typeof p.status === 'string');
    const active = items.filter((p) => p.status === 'pending' || p.status === 'in_progress');
    const next = active.find((p) => p.status === 'in_progress') || active[0] || null;

    const bits = [];
    if (explanation) bits.push(truncate(explanation, 120));
    if (items.length) bits.push(`steps ${active.length}/${items.length} active`);
    if (next && next.step) bits.push(`next: ${truncate(next.step, 100)}`);
    return bits.join(' | ');
}

function formatTimeline(trace, options = {}) {
    const t = normalizeTraceObject(trace);
    if (!t) return 'Timeline\n\nERROR: Invalid trace\n';

    const maxLines = (options && Number.isFinite(options.maxLines) && options.maxLines > 0)
        ? Math.floor(options.maxLines)
        : 140;
    const includeChildren = options && options.includeChildren !== false;

    const events = Array.isArray(t.events) ? t.events : [];
    let step = 0;
    const lines = [];
    lines.push('Timeline');
    lines.push('');

    const push = (line) => {
        if (lines.length - 2 >= maxLines) return false;
        lines.push(line);
        return true;
    };

    for (const ev of events) {
        const type = ev && ev.type ? String(ev.type) : '';
        const ts = tsShort(ev && ev.timestamp);
        const prefix = ts ? `[${ts}] ` : '';

        if (type === 'decision.trace' || type === 'decision_trace') {
            const s = ev && ev.payload && Number.isFinite(Number(ev.payload.step)) ? Number(ev.payload.step) : null;
            if (s && s >= 1) step = s;
            const thought = ev && ev.payload && typeof ev.payload.thought === 'string' ? ev.payload.thought : '';
            if (thought) {
                if (!push(`${prefix}Step ${step || '?'}: Thinking - ${truncate(firstLine(thought), 160)}`)) break;
            }
            continue;
        }

        if (type === 'turn.started') {
            step = 0;
            const msg = ev && ev.payload && typeof ev.payload.message === 'string' ? ev.payload.message : '';
            if (!push(`${prefix}Turn started${msg ? ` - ${truncate(firstLine(msg), 160)}` : ''}`)) break;
            continue;
        }

        if (type === 'context.compacted' || type === 'context.truncated') {
            const p = ev && ev.payload && typeof ev.payload === 'object' ? ev.payload : null;
            const before = p && Number.isFinite(Number(p.originalLength)) ? Number(p.originalLength) : null;
            const after = p && Number.isFinite(Number(p.newLength)) ? Number(p.newLength) : null;
            const summaryLen = p && Number.isFinite(Number(p.summaryLength)) ? Number(p.summaryLength) : null;
            const bits = [];
            if (before != null && after != null) bits.push(`${before}->${after}`);
            if (summaryLen != null) bits.push(`summary ${summaryLen} chars`);
            const extra = bits.length ? ` - ${bits.join(' ')}` : '';
            if (!push(`${prefix}Step ${step || '?'}: Context - compacted${extra}`)) break;
            continue;
        }

        if (type === 'plan.updated') {
            const info = summarizePlanUpdate(ev && ev.payload);
            if (!push(`${prefix}Step ${step || '?'}: Plan updated${info ? ` - ${info}` : ''}`)) break;
            continue;
        }

        if (type === 'tool.call.requested' || type === 'tool.call') {
            const details = ev && ev.payload && Array.isArray(ev.payload.details) ? ev.payload.details : [];
            const agg = computeRiskAggregate(details);
            if (!push(`${prefix}Step ${step || '?'}: Action - ${details.length || 0} tools${formatRiskAggregate(agg)}`)) break;
            if (includeChildren) {
                for (const d of details) {
                    const toolName = d && d.name ? String(d.name) : '(tool)';
                    const argsObj = normalizeToolArgs(d && d.arguments);
                    const intent = d && typeof d.intent === 'string' ? d.intent.trim() : '';
                    const args = summarizeToolArgsForLog({ toolName, argsObj });
                    const r = (d && typeof d.risk === 'number') ? riskLabel(d.risk) : '';
                    const line = `  - ${r ? `[${r}] ` : ''}${toolName}${intent ? ` (${truncate(intent, 80)})` : ''}${args ? ` ${args}` : ''}`;
                    if (!push(line)) break;
                }
            }
            continue;
        }

        if (type === 'approval.required') {
            const payload = ev && ev.payload && typeof ev.payload === 'object' ? ev.payload : null;
            const tools = payload && Array.isArray(payload.tools) ? payload.tools : [];
            const agg = computeRiskAggregate(tools, { fallbackMaxRisk: payload ? payload.risk : null });
            if (!push(`${prefix}Step ${step || '?'}: Approval required - ${tools.length || 0} tools${formatRiskAggregate(agg)}`)) break;

            if (includeChildren) {
                for (const t2 of tools) {
                    const toolName = t2 && t2.name ? String(t2.name) : '(tool)';
                    const argsObj = normalizeToolArgs(t2 && (t2.args || t2.arguments));
                    const intent = t2 && typeof t2.intent === 'string' ? t2.intent.trim() : '';
                    const args = summarizeToolArgsForLog({ toolName, argsObj });
                    const r = (t2 && typeof t2.risk === 'number') ? riskLabel(t2.risk) : '';
                    const line = `  - ${r ? `[${r}] ` : ''}${toolName}${intent ? ` (${truncate(intent, 80)})` : ''}${args ? ` ${args}` : ''}`;
                    if (!push(line)) break;
                }
            }
            continue;
        }

        if (type === 'approval.skipped') {
            const payload = ev && ev.payload && typeof ev.payload === 'object' ? ev.payload : null;
            const toolName = payload && payload.tool ? String(payload.tool) : '(tool)';
            const r = (payload && typeof payload.risk === 'number') ? riskLabel(payload.risk) : '';
            const policy = payload && typeof payload.policy === 'string' ? payload.policy.trim() : '';
            const reason = payload && typeof payload.reason === 'string' ? payload.reason.trim() : '';
            const why = [policy ? `policy=${policy}` : '', reason ? `reason=${reason}` : ''].filter(Boolean).join(' ');
            if (!push(`${prefix}Step ${step || '?'}: Approval skipped - ${r ? `[${r}] ` : ''}${toolName}${why ? ` (${truncate(why, 80)})` : ''}`)) break;
            continue;
        }

        if (type === 'tool.call.begin') {
            const name = ev && ev.payload && ev.payload.name ? String(ev.payload.name) : '(tool)';
            if (!push(`${prefix}Step ${step || '?'}: Executing - ${name}`)) break;
            continue;
        }

        if (type === 'tool.result') {
            const name = ev && ev.payload && ev.payload.tool ? String(ev.payload.tool) : '(tool)';
            const summary = summarizeToolResultForLog(ev && ev.payload ? ev.payload.result : null);
            if (!push(`${prefix}Step ${step || '?'}: Result - ${name}${summary ? ` (${summary})` : ''}`)) break;
            continue;
        }

        if (type === 'tool.error') {
            const name = ev && ev.payload && ev.payload.tool ? String(ev.payload.tool) : '(tool)';
            const err = ev && ev.payload && ev.payload.error ? truncate(firstLine(ev.payload.error), 160) : '';
            if (!push(`${prefix}Step ${step || '?'}: Error - ${name}${err ? ` (${err})` : ''}`)) break;
            continue;
        }

        if (type === 'tool.call.end') {
            const name = ev && ev.payload && ev.payload.name ? String(ev.payload.name) : '(tool)';
            const ok = ev && ev.payload && ev.payload.success === false ? 'error' : 'ok';
            const dur = ev && ev.payload && Number.isFinite(ev.payload.durationMs) ? ` ${Math.round(ev.payload.durationMs)}ms` : '';
            if (!push(`${prefix}Step ${step || '?'}: Done - ${name} (${ok})${dur}`)) break;
            continue;
        }
    }

    const shown = Math.max(0, lines.length - 2);
    const total = events.length;
    if (shown >= maxLines && total > 0) {
        lines.push(`\nTimeline truncated: showing ${shown} lines (maxLines=${maxLines}).`);
    }
    return `${lines.join('\n')}\n`;
}

module.exports = {
    formatTimeline,
    normalizeToolArgs,
    summarizeToolArgsForLog,
    summarizeToolResultForLog,
};
