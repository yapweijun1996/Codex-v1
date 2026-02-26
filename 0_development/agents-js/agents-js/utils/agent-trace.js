const { getTotalUsageFromHistory } = require('./agent-usage');
const { riskLabel } = require('./imda-policy');
const { getToolRegistrySnapshot } = require('./agent-tools-registry');

const DEFAULT_MAX_EVENTS = 1000;
const SENSITIVE_KEYS = [
    'api_key',
    'apikey',
    'secret',
    'password',
    'credential',
    'authorization',
    'bearer',
];

function isSensitiveKey(key) {
    if (!key) return false;
    const lowered = String(key).toLowerCase();
    if (SENSITIVE_KEYS.includes(lowered)) return true;
    return lowered.endsWith('token');
}

function redactValue(value, seen) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return value;
    if (typeof value !== 'object') return value;
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (Array.isArray(value)) {
        return value.map((item) => redactValue(item, seen));
    }

    const out = {};
    for (const [key, val] of Object.entries(value)) {
        if (isSensitiveKey(key)) {
            out[key] = '[REDACTED]';
            continue;
        }
        out[key] = redactValue(val, seen);
    }
    return out;
}

function normalizePayload(payload) {
    if (payload === undefined) return null;
    if (payload === null) return null;
    if (typeof payload === 'string' || typeof payload === 'number' || typeof payload === 'boolean') return payload;
    const seen = new Set();
    return redactValue(payload, seen);
}

function detectPlatform() {
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') return 'browser';
    return 'node';
}

function createTraceCollector(agent, options = {}) {
    const maxEvents = (options && Number.isFinite(options.maxEvents) && options.maxEvents > 0)
        ? Math.floor(options.maxEvents)
        : DEFAULT_MAX_EVENTS;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const events = [];
    const handlers = new Map();

    const push = (type, payload) => {
        events.push({
            timestamp: new Date().toISOString(),
            type,
            payload,
        });
        if (events.length > maxEvents) events.splice(0, events.length - maxEvents);
    };

    const on = (event, type, mapper) => {
        const handler = (payload) => {
            const mapped = mapper ? mapper(payload) : payload;
            push(type, mapped);
        };
        handlers.set(event, handler);
        if (agent && typeof agent.on === 'function') agent.on(event, handler);
    };

    on('turn_started', 'turn.started', (payload) => ({
        message: payload && payload.message ? String(payload.message) : '',
        timestamp: payload && payload.timestamp ? payload.timestamp : undefined,
    }));
    on('decision_trace', 'decision.trace');
    on('approval_required', 'approval.required');
    on('approval_skipped', 'approval.skipped');
    on('user_input_requested', 'user_input.requested');
    on('user_input_response', 'user_input.response');
    on('tool_call', 'tool.call.requested');
    on('tool_call_begin', 'tool.call.begin');
    on('tool_call_end', 'tool.call.end');
    on('tool_result', 'tool.result');
    on('knowledge_selected', 'knowledge.selected');
    on('tool_error', 'tool.error');
    on('plan_updated', 'plan.updated');
    on('context_compacted', 'context.compacted');
    on('state_changed', 'state.changed');
    on('turn_aborted', 'turn.aborted');
    on('agent_turn_complete', 'turn.completed');

    const exportSessionTrace = (exportOptions = {}) => {
        const platform = detectPlatform();
        const identity = agent && agent.identity ? agent.identity : null;
        const riskProfile = agent && agent.riskProfile ? agent.riskProfile : null;
        const modelName = agent && agent.llm && agent.llm.modelName ? agent.llm.modelName : null;
        const usage = getTotalUsageFromHistory(agent && agent.history ? agent.history : []);

        const turnCount = events.filter((ev) => ev.type === 'turn.started').length;
        const toolsUsed = Array.from(new Set(
            events
                .filter((ev) => ev.type === 'tool.call.begin' || ev.type === 'tool.result')
                .map((ev) => ev && ev.payload && ev.payload.name ? ev.payload.name : (ev.payload && ev.payload.tool ? ev.payload.tool : null))
                .filter(Boolean)
        ));
        let maxRisk = null;
        for (const ev of events) {
            if (ev.type !== 'approval.required' && ev.type !== 'approval.skipped') continue;
            const risk = ev && ev.payload && typeof ev.payload.risk === 'number' ? ev.payload.risk : null;
            if (risk === null) continue;
            if (maxRisk === null || risk > maxRisk) maxRisk = risk;
        }

        const summary = {
            totalTurns: turnCount,
            totalTokens: usage && typeof usage.total_tokens === 'number' ? usage.total_tokens : null,
            maxRiskLevel: maxRisk === null ? null : riskLabel(maxRisk),
            toolsUsed,
        };
        const toolRegistrySnapshot = getToolRegistrySnapshot(agent, toolsUsed);

        const normalizedEvents = events.map((ev, idx) => {
            const base = {
                idx,
                timestamp: ev.timestamp,
                type: ev.type,
                payload: normalizePayload(ev.payload),
            };
            return base;
        });

        return {
            version: '1.0-opencode',
            metadata: {
                sessionId,
                exportedAt: new Date().toISOString(),
                platform,
                agent: {
                    model: modelName,
                    tier: riskProfile && typeof riskProfile.tier === 'number' ? riskProfile.tier : null,
                    identity,
                },
            },
            summary,
            snapshot: agent && typeof agent.dumpSnapshot === 'function' ? agent.dumpSnapshot() : null,
            toolRegistrySnapshot,
            events: normalizedEvents,
        };
    };

    const dispose = () => {
        for (const [event, handler] of handlers.entries()) {
            if (agent && typeof agent.off === 'function') agent.off(event, handler);
            else if (agent && typeof agent.removeListener === 'function') agent.removeListener(event, handler);
        }
        handlers.clear();
    };

    return { sessionId, events, exportSessionTrace, dispose };
}

module.exports = { createTraceCollector };
