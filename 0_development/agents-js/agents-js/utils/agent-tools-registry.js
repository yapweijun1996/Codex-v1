const { RiskLevel, normalizeRiskLevel } = require('./imda-constants');

const DEFAULT_AUDIT_FIELDS = ['tool_call_id', 'args_hash', 'duration_ms'];

function truncate(text, maxLen) {
    const s = String(text == null ? '' : text);
    const n = Number(maxLen);
    if (!Number.isFinite(n) || n <= 0) return s;
    if (s.length <= n) return s;
    return `${s.slice(0, Math.max(0, n - 3))}...`;
}

function toPlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function normalizeSchema(raw, fallback) {
    const candidate = toPlainObject(raw) || toPlainObject(fallback);
    if (!candidate) return null;
    const out = { ...candidate };
    if (!out.type && out.properties && typeof out.properties === 'object') {
        out.type = 'object';
    }
    return out;
}

function normalizeRateLimit(raw) {
    const obj = toPlainObject(raw);
    if (!obj) return null;
    const maxCalls = Number(obj.maxCalls);
    const perSeconds = Number(obj.perSeconds);
    if (!Number.isFinite(maxCalls) || !Number.isFinite(perSeconds)) return null;
    if (maxCalls <= 0 || perSeconds <= 0) return null;
    return { maxCalls: Math.floor(maxCalls), perSeconds: Math.floor(perSeconds) };
}

function normalizeToolMeta(tool) {
    const raw = toPlainObject(tool && tool.meta) || {};
    const inputSchema = normalizeSchema(raw.inputSchema, tool.parameters);
    const outputSchema = normalizeSchema(raw.outputSchema, tool.outputSchema);
    const permissions = Array.isArray(raw.permissions)
        ? raw.permissions.filter(Boolean).map((v) => String(v))
        : [];
    const rateLimit = normalizeRateLimit(raw.rateLimit);
    const auditRaw = toPlainObject(raw.audit) || {};
    const auditFields = Array.isArray(auditRaw.fields)
        ? auditRaw.fields.filter(Boolean).map((v) => String(v))
        : DEFAULT_AUDIT_FIELDS.slice();
    const failureModes = Array.isArray(raw.failureModes) ? raw.failureModes : [];
    const fallback = raw.fallback != null ? raw.fallback : null;
    const intentTemplate = typeof raw.intentTemplate === 'string' ? raw.intentTemplate : '';
    return {
        inputSchema,
        outputSchema,
        permissions,
        rateLimit,
        audit: { fields: auditFields },
        failureModes,
        fallback,
        intentTemplate,
    };
}

function formatIntentValue(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return '';
}

function renderIntentTemplate(template, args) {
    const t = String(template || '');
    if (!t) return '';
    const a = (args && typeof args === 'object') ? args : null;
    return t.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, key) => {
        if (!a) return '';
        if (key.endsWith('_len') || key.endsWith('_length')) {
            const baseKey = key.replace(/_(len|length)$/, '');
            const v = a[baseKey];
            if (typeof v === 'string') return String(v.length);
            if (Array.isArray(v)) return String(v.length);
            return '';
        }
        return truncate(formatIntentValue(a[key]), 120);
    }).trim();
}

function buildToolRegistry(tools) {
    const toolMap = {};
    const registry = {};
    for (const tool of tools) {
        if (!tool || !tool.name) continue;
        const risk = normalizeRiskLevel(tool.risk, RiskLevel.MEDIUM);
        tool.risk = risk;
        const meta = normalizeToolMeta(tool);
        tool.meta = meta;
        toolMap[tool.name] = tool;
        registry[tool.name] = {
            name: tool.name,
            description: typeof tool.description === 'string' ? tool.description : '',
            risk,
            permissions: meta.permissions,
            inputSchema: meta.inputSchema,
            outputSchema: meta.outputSchema,
            rateLimit: meta.rateLimit,
            audit: meta.audit,
            failureModes: meta.failureModes,
            fallback: meta.fallback,
            intentTemplate: meta.intentTemplate,
        };
    }
    return { toolMap, registry };
}

function registerTools(tools) {
    return buildToolRegistry(tools);
}

function getToolMeta(agent, toolName) {
    if (!agent || !agent.toolRegistry || !toolName) return null;
    return agent.toolRegistry[toolName] || null;
}

function getToolRisk(agent, toolName, tool) {
    const meta = getToolMeta(agent, toolName);
    if (meta && typeof meta.risk === 'number') return meta.risk;
    if (tool && typeof tool.risk === 'number') return tool.risk;
    return RiskLevel.MEDIUM;
}

function getToolRegistrySnapshot(agent, toolNames) {
    if (!agent || !agent.toolRegistry) return null;
    if (!Array.isArray(toolNames)) return null;
    const snapshot = {};
    for (const name of toolNames) {
        const entry = agent.toolRegistry[name];
        if (entry) snapshot[name] = entry;
    }
    return Object.keys(snapshot).length > 0 ? snapshot : null;
}

function getToolIntent(agent, toolName, args) {
    const meta = getToolMeta(agent, toolName);
    if (!meta) return '';

    if (toolName === 'request_user_input' && args && typeof args === 'object') {
        const q = (typeof args.question === 'string') ? args.question.trim() : '';
        if (q) return `request user input: "${truncate(q, 100)}"`;
        const qs = Array.isArray(args.questions) ? args.questions : null;
        if (qs && qs.length > 0) {
            const first = qs[0] && typeof qs[0] === 'object' ? qs[0] : null;
            const firstQ = first && typeof first.question === 'string' ? first.question.trim() : '';
            if (firstQ) {
                return `request user input (${qs.length} questions): "${truncate(firstQ, 80)}"`;
            }
            return `request user input (${qs.length} questions)`;
        }
        return 'request user input';
    }

    const rendered = renderIntentTemplate(meta.intentTemplate, args);
    if (rendered) return rendered;
    return meta.description ? truncate(meta.description, 140) : '';
}

module.exports = {
    buildToolRegistry,
    registerTools,
    getToolMeta,
    getToolRisk,
    getToolRegistrySnapshot,
    getToolIntent,
};
