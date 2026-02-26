var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// utils/emitter.js
var emitter_exports = {};
__export(emitter_exports, {
  EventEmitter: () => EventEmitter
});
var EventEmitter;
var init_emitter = __esm({
  "utils/emitter.js"() {
    EventEmitter = class {
      constructor() {
        this._listeners = /* @__PURE__ */ new Map();
      }
      on(event, fn) {
        if (!this._listeners.has(event)) this._listeners.set(event, []);
        this._listeners.get(event).push(fn);
        return this;
      }
      once(event, fn) {
        const wrapper = (...args) => {
          this.off(event, wrapper);
          fn(...args);
        };
        return this.on(event, wrapper);
      }
      off(event, fn) {
        const listeners = this._listeners.get(event);
        if (!listeners) return this;
        this._listeners.set(event, listeners.filter((l) => l !== fn));
        return this;
      }
      removeListener(event, fn) {
        return this.off(event, fn);
      }
      removeAllListeners(event) {
        if (event) this._listeners.delete(event);
        else this._listeners.clear();
        return this;
      }
      emit(event, ...args) {
        const listeners = this._listeners.get(event);
        if (!listeners || listeners.length === 0) return false;
        for (const fn of listeners.slice()) {
          try {
            fn(...args);
          } catch (err) {
            console.error(`Error in listener for event "${event}":`, err);
          }
        }
        return true;
      }
    };
  }
});

// utils/async-event-queue.js
var require_async_event_queue = __commonJS({
  "utils/async-event-queue.js"(exports, module) {
    function createAsyncEventQueue() {
      const queue = [];
      const waiters = [];
      let closed = false;
      const notify = () => {
        while (waiters.length > 0) {
          const w = waiters.shift();
          if (typeof w === "function") w();
        }
      };
      return {
        push: (value) => {
          if (closed) return;
          queue.push(value);
          notify();
        },
        close: () => {
          if (closed) return;
          closed = true;
          notify();
        },
        async *iterate() {
          while (true) {
            if (queue.length > 0) {
              yield queue.shift();
              continue;
            }
            if (closed) return;
            await new Promise((resolve) => waiters.push(resolve));
          }
        }
      };
    }
    module.exports = { createAsyncEventQueue };
  }
});

// utils/agent-async-iterator.js
var require_agent_async_iterator = __commonJS({
  "utils/agent-async-iterator.js"(exports, module) {
    var { createAsyncEventQueue } = require_async_event_queue();
    function runAsyncIterator(agent, userInput, options = {}) {
      const { signal } = options;
      const q = createAsyncEventQueue();
      const on = (evt, fn) => agent.on(evt, fn);
      const off = (evt, fn) => {
        if (typeof agent.off === "function") agent.off(evt, fn);
        else agent.removeListener(evt, fn);
      };
      const handlers = {
        start: (data) => q.push({ type: "turn.started", input: data && data.message ? data.message : userInput }),
        thinking: (data) => q.push({ type: "thinking", step: data && data.step }),
        state_changed: (data) => q.push({ type: "state.changed", ...data }),
        context_truncated: (data) => q.push({ type: "context.truncated", ...data }),
        assistant_message_started: (data) => q.push({ type: "assistant_message_started", ...data }),
        agent_message_content_delta: (data) => q.push({ type: "response.chunk", delta: data && data.delta ? data.delta : "", step: data && data.step }),
        tool_call: (data) => q.push({ type: "tool.call", tools: data && data.tools ? data.tools : [], details: data && data.details ? data.details : [] }),
        tool_call_begin: (data) => q.push({ type: "tool.call.begin", ...data }),
        tool_call_end: (data) => q.push({ type: "tool.call.end", ...data }),
        tool_result: (data) => q.push({ type: "tool.result", tool: data && data.tool, args: data && data.args, result: data && data.result }),
        knowledge_selected: (data) => q.push({ type: "knowledge.selected", ...data }),
        tool_error: (data) => q.push({ type: "tool.error", tool: data && data.tool, error: data && data.error }),
        plan_updated: (data) => q.push({ type: "plan.updated", ...data }),
        approval_required: (data) => q.push({ type: "approval.required", ...data }),
        approval_skipped: (data) => q.push({ type: "approval.skipped", ...data }),
        user_input_requested: (data) => q.push({ type: "user_input.requested", ...data }),
        user_input_response: (data) => q.push({ type: "user_input.response", ...data }),
        approval_blocked: (data) => q.push({ type: "approval.blocked", ...data }),
        decision_trace: (data) => q.push({ type: "decision_trace", ...data }),
        token_count: (data) => q.push({ type: "token_count", info: data && data.info ? data.info : null }),
        exec_command_begin: (data) => q.push({ type: "exec_command.begin", ...data }),
        exec_command_output: (data) => q.push({ type: "exec_command.output", ...data }),
        exec_command_end: (data) => q.push({ type: "exec_command.end", ...data }),
        done: (data) => {
          q.push({
            type: "turn.completed",
            finalResponse: data && typeof data.response === "string" ? data.response : "",
            turnCount: data && data.turnCount,
            historyLength: data && data.historyLength
          });
          q.close();
        }
      };
      for (const [evt, fn] of Object.entries(handlers)) on(evt, fn);
      let aborted = false;
      const abortHandler = () => {
        aborted = true;
        q.push({ type: "error", message: "Aborted" });
        q.close();
      };
      if (signal && typeof signal.addEventListener === "function") {
        if (signal.aborted) abortHandler();
        else signal.addEventListener("abort", abortHandler, { once: true });
      }
      const runPromise = Promise.resolve().then(() => agent.run(userInput)).catch((err) => {
        const msg = err && err.message ? String(err.message) : String(err);
        q.push({ type: "error", message: msg });
        q.close();
        return null;
      });
      const iterator = (async function* iterate() {
        try {
          for await (const ev of q.iterate()) {
            yield ev;
          }
        } finally {
          for (const [evt, fn] of Object.entries(handlers)) off(evt, fn);
          if (signal && typeof signal.removeEventListener === "function") {
            signal.removeEventListener("abort", abortHandler);
          }
          await runPromise;
          if (aborted) return;
        }
      })();
      return iterator;
    }
    module.exports = { runAsyncIterator };
  }
});

// utils/self-heal.js
var require_self_heal = __commonJS({
  "utils/self-heal.js"(exports, module) {
    var DEFAULT_TOOL_TIMEOUT_MS = 3e4;
    var DEFAULT_APPROVAL_TIMEOUT_MS = 3e5;
    var DEFAULT_REPEAT_FAILURE_THRESHOLD = 2;
    var DEFAULT_LOOP_FINGERPRINT_THRESHOLD = 3;
    function isPlainObject(value) {
      if (!value || typeof value !== "object") return false;
      const proto = Object.getPrototypeOf(value);
      return proto === Object.prototype || proto === null;
    }
    function stableStringify(value) {
      const seen = /* @__PURE__ */ new WeakSet();
      function normalize(v) {
        if (v === null) return null;
        const t = typeof v;
        if (t === "string" || t === "number" || t === "boolean") return v;
        if (t === "bigint") return String(v);
        if (t === "undefined") return null;
        if (t === "function") return "[Function]";
        if (t === "symbol") return String(v);
        if (t === "object") {
          if (seen.has(v)) return "[Circular]";
          seen.add(v);
          if (Array.isArray(v)) return v.map(normalize);
          if (v instanceof Date) return v.toISOString();
          if (v instanceof Error) {
            return {
              name: v.name,
              message: v.message
            };
          }
          if (!isPlainObject(v)) {
            const out2 = {};
            for (const k of Object.keys(v).sort()) {
              out2[k] = normalize(v[k]);
            }
            return out2;
          }
          const out = {};
          for (const k of Object.keys(v).sort()) {
            out[k] = normalize(v[k]);
          }
          return out;
        }
        return String(v);
      }
      try {
        return JSON.stringify(normalize(value));
      } catch {
        return "null";
      }
    }
    function safeJsonStringify(value) {
      try {
        return JSON.stringify(value === void 0 ? null : value);
      } catch {
        return stableStringify(value);
      }
    }
    function isRateLimitLike(input) {
      const text = String(input || "").toLowerCase();
      if (!text) return false;
      return text.includes("too many requests") || text.includes("rate limit") || text.includes("ratelimit") || text.includes("status: 429") || text.includes("http 429") || text.includes(" 429");
    }
    function hashString(input) {
      const str = String(input || "");
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) + hash ^ str.charCodeAt(i);
      }
      return (hash >>> 0).toString(36);
    }
    function makeFailureFingerprint(toolName, failureType, args) {
      const argsStable = stableStringify(args);
      return `${toolName}:${String(failureType || "unknown")}:${hashString(argsStable)}`;
    }
    module.exports = {
      DEFAULT_TOOL_TIMEOUT_MS,
      DEFAULT_APPROVAL_TIMEOUT_MS,
      DEFAULT_REPEAT_FAILURE_THRESHOLD,
      DEFAULT_LOOP_FINGERPRINT_THRESHOLD,
      stableStringify,
      safeJsonStringify,
      isRateLimitLike,
      hashString,
      makeFailureFingerprint
    };
  }
});

// utils/agent-tool-approval-keys.js
var require_agent_tool_approval_keys = __commonJS({
  "utils/agent-tool-approval-keys.js"(exports, module) {
    var { stableStringify } = require_self_heal();
    function fnv1a32Hex(input) {
      const str = String(input || "");
      let hash = 2166136261;
      for (let i = 0; i < str.length; i += 1) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(16);
    }
    function makeApprovalArgsHash(args) {
      try {
        return fnv1a32Hex(stableStringify(args));
      } catch {
        return "0";
      }
    }
    function makeApprovalDenyKey(toolName, args) {
      return `${String(toolName || "")}:${makeApprovalArgsHash(args)}`;
    }
    module.exports = {
      makeApprovalArgsHash,
      makeApprovalDenyKey
    };
  }
});

// utils/imda-constants.js
var require_imda_constants = __commonJS({
  "utils/imda-constants.js"(exports, module) {
    var RiskLevel = Object.freeze({
      NONE: 0,
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3
    });
    var RISK_LEVEL_VALUES = new Set(Object.values(RiskLevel));
    function normalizeRiskLevel(value, fallback = RiskLevel.NONE) {
      return RISK_LEVEL_VALUES.has(value) ? value : fallback;
    }
    module.exports = { RiskLevel, normalizeRiskLevel };
  }
});

// utils/agent-tools-registry.js
var require_agent_tools_registry = __commonJS({
  "utils/agent-tools-registry.js"(exports, module) {
    var { RiskLevel, normalizeRiskLevel } = require_imda_constants();
    var DEFAULT_AUDIT_FIELDS = ["tool_call_id", "args_hash", "duration_ms"];
    function truncate(text, maxLen) {
      const s = String(text == null ? "" : text);
      const n = Number(maxLen);
      if (!Number.isFinite(n) || n <= 0) return s;
      if (s.length <= n) return s;
      return `${s.slice(0, Math.max(0, n - 3))}...`;
    }
    function toPlainObject(value) {
      return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    }
    function normalizeSchema(raw, fallback) {
      const candidate = toPlainObject(raw) || toPlainObject(fallback);
      if (!candidate) return null;
      const out = { ...candidate };
      if (!out.type && out.properties && typeof out.properties === "object") {
        out.type = "object";
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
      const permissions = Array.isArray(raw.permissions) ? raw.permissions.filter(Boolean).map((v) => String(v)) : [];
      const rateLimit = normalizeRateLimit(raw.rateLimit);
      const auditRaw = toPlainObject(raw.audit) || {};
      const auditFields = Array.isArray(auditRaw.fields) ? auditRaw.fields.filter(Boolean).map((v) => String(v)) : DEFAULT_AUDIT_FIELDS.slice();
      const failureModes = Array.isArray(raw.failureModes) ? raw.failureModes : [];
      const fallback = raw.fallback != null ? raw.fallback : null;
      const intentTemplate = typeof raw.intentTemplate === "string" ? raw.intentTemplate : "";
      return {
        inputSchema,
        outputSchema,
        permissions,
        rateLimit,
        audit: { fields: auditFields },
        failureModes,
        fallback,
        intentTemplate
      };
    }
    function formatIntentValue(v) {
      if (v === null || v === void 0) return "";
      if (typeof v === "string") return v;
      if (typeof v === "number" || typeof v === "boolean") return String(v);
      return "";
    }
    function renderIntentTemplate(template, args) {
      const t = String(template || "");
      if (!t) return "";
      const a = args && typeof args === "object" ? args : null;
      return t.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, key) => {
        if (!a) return "";
        if (key.endsWith("_len") || key.endsWith("_length")) {
          const baseKey = key.replace(/_(len|length)$/, "");
          const v = a[baseKey];
          if (typeof v === "string") return String(v.length);
          if (Array.isArray(v)) return String(v.length);
          return "";
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
          description: typeof tool.description === "string" ? tool.description : "",
          risk,
          permissions: meta.permissions,
          inputSchema: meta.inputSchema,
          outputSchema: meta.outputSchema,
          rateLimit: meta.rateLimit,
          audit: meta.audit,
          failureModes: meta.failureModes,
          fallback: meta.fallback,
          intentTemplate: meta.intentTemplate
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
      if (meta && typeof meta.risk === "number") return meta.risk;
      if (tool && typeof tool.risk === "number") return tool.risk;
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
      if (!meta) return "";
      if (toolName === "request_user_input" && args && typeof args === "object") {
        const q = typeof args.question === "string" ? args.question.trim() : "";
        if (q) return `request user input: "${truncate(q, 100)}"`;
        const qs = Array.isArray(args.questions) ? args.questions : null;
        if (qs && qs.length > 0) {
          const first = qs[0] && typeof qs[0] === "object" ? qs[0] : null;
          const firstQ = first && typeof first.question === "string" ? first.question.trim() : "";
          if (firstQ) {
            return `request user input (${qs.length} questions): "${truncate(firstQ, 80)}"`;
          }
          return `request user input (${qs.length} questions)`;
        }
        return "request user input";
      }
      const rendered = renderIntentTemplate(meta.intentTemplate, args);
      if (rendered) return rendered;
      return meta.description ? truncate(meta.description, 140) : "";
    }
    module.exports = {
      buildToolRegistry,
      registerTools,
      getToolMeta,
      getToolRisk,
      getToolRegistrySnapshot,
      getToolIntent
    };
  }
});

// utils/imda-policy.js
var require_imda_policy = __commonJS({
  "utils/imda-policy.js"(exports, module) {
    var { RiskLevel } = require_imda_constants();
    var APPROVAL_EXEMPT_TOOLS = /* @__PURE__ */ new Set([
      "request_user_input",
      "update_plan",
      "list_available_skills",
      "read_skill_documentation"
    ]);
    function riskLabel(tier) {
      switch (tier) {
        case RiskLevel.HIGH:
          return "Tier 3 (High Risk)";
        case RiskLevel.MEDIUM:
          return "Tier 2 (Business Critical)";
        case RiskLevel.LOW:
          return "Tier 1 (Reversible)";
        case RiskLevel.NONE:
        default:
          return "Tier 0 (Read-only)";
      }
    }
    function normalizeApprovalPolicy(value) {
      if (typeof value !== "string") return "always";
      const v = value.trim().toLowerCase();
      if (v === "unless_trusted") return "unless_trusted";
      if (v === "never") return "never";
      return "always";
    }
    function normalizeTrustedTools(value) {
      if (!Array.isArray(value)) return [];
      const out = value.map((t) => String(t || "").trim()).filter(Boolean);
      return Array.from(new Set(out));
    }
    function isTrustedTool(toolName, trustedTools) {
      if (!toolName) return false;
      const list = normalizeTrustedTools(trustedTools);
      if (list.length === 0) return false;
      return list.includes(String(toolName));
    }
    function baselineRequiresApproval({ toolName, toolRisk, agentTier }) {
      if (toolName && APPROVAL_EXEMPT_TOOLS.has(String(toolName))) return false;
      if (toolRisk >= RiskLevel.MEDIUM) return true;
      if (toolRisk === RiskLevel.LOW) return agentTier === RiskLevel.NONE;
      return false;
    }
    function getApprovalDecision({ toolName, toolRisk, agentTier, approvalPolicy, trustedTools }) {
      const policy = normalizeApprovalPolicy(approvalPolicy);
      const baseline = baselineRequiresApproval({ toolName, toolRisk, agentTier });
      if (!baseline) return { requires: false, baselineRequires: false, bypassed: false, reason: "not_required" };
      if (toolName && APPROVAL_EXEMPT_TOOLS.has(String(toolName))) {
        return { requires: false, baselineRequires: true, bypassed: true, reason: "exempt" };
      }
      if (policy === "never") {
        return { requires: false, baselineRequires: true, bypassed: true, reason: "policy_never" };
      }
      if (policy === "unless_trusted") {
        if (toolRisk >= RiskLevel.HIGH) {
          return { requires: true, baselineRequires: true, bypassed: false, reason: "high_risk" };
        }
        if (isTrustedTool(toolName, trustedTools)) {
          return { requires: false, baselineRequires: true, bypassed: true, reason: "trusted" };
        }
      }
      return { requires: true, baselineRequires: true, bypassed: false, reason: "baseline" };
    }
    function requiresApproval({ toolName, toolRisk, agentTier }) {
      return baselineRequiresApproval({ toolName, toolRisk, agentTier });
    }
    function isApprovedResponse(value) {
      if (value == null) return false;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return ["approve", "allow", "yes", "y"].includes(normalized);
      }
      if (typeof value === "object" && Array.isArray(value.answers) && value.answers.length > 0) {
        return isApprovedResponse(value.answers[0]);
      }
      return false;
    }
    module.exports = {
      riskLabel,
      requiresApproval,
      isApprovedResponse,
      APPROVAL_EXEMPT_TOOLS,
      baselineRequiresApproval,
      getApprovalDecision
    };
  }
});

// utils/approval-copy.js
var require_approval_copy = __commonJS({
  "utils/approval-copy.js"(exports, module) {
    var { RiskLevel } = require_imda_constants();
    function describeToolAction(toolName) {
      const name = String(toolName || "").trim();
      if (!name) return "use a tool";
      if (name === "run_command") return "run a command on your computer";
      if (name === "apply_patch") return "modify local files in your workspace";
      if (name === "read_file") return "read a local file from your workspace";
      if (name === "list_dir") return "list files in your workspace";
      if (name === "grep_files") return "search text in your workspace files";
      if (name === "view_image") return "open a local image from your workspace";
      if (name === "read_url") return "fetch and read a URL";
      if (name === "memory_search" || name === "kb_search" || name === "memory_read_graph") return "read local memory/knowledge";
      if (name === "memory_save") return "save information into local episodic memory";
      if (name.startsWith("memory__")) return "read saved memory";
      if (name.includes("__")) return "call an external MCP tool";
      return `use "${name}"`;
    }
    function buildApprovalQuestion({ toolName, toolRisk, isDebug }) {
      if (isDebug) {
        return `Approve tool call: ${toolName}?`;
      }
      const action = describeToolAction(toolName);
      const highRisk = typeof toolRisk === "number" && toolRisk >= RiskLevel.HIGH;
      if (highRisk) {
        return `High-risk action: allow the agent to ${action}?`;
      }
      return `Allow the agent to ${action}?`;
    }
    module.exports = {
      describeToolAction,
      buildApprovalQuestion
    };
  }
});

// utils/agent-tool-approval-batch.js
var require_agent_tool_approval_batch = __commonJS({
  "utils/agent-tool-approval-batch.js"(exports, module) {
    var { stableStringify } = require_self_heal();
    var { RiskLevel } = require_imda_constants();
    var { getToolRisk, getToolIntent } = require_agent_tools_registry();
    var { getApprovalDecision, riskLabel, isApprovedResponse } = require_imda_policy();
    var { buildApprovalQuestion } = require_approval_copy();
    var { makeApprovalDenyKey } = require_agent_tool_approval_keys();
    function parseCallArgs(call) {
      try {
        return typeof call.arguments === "string" ? JSON.parse(call.arguments) : call.arguments;
      } catch {
        return void 0;
      }
    }
    function summarizeApprovalArgs(args, { maxLen = 80 } = {}) {
      if (args === void 0 || args === null) return "";
      let text = "";
      try {
        text = stableStringify(args);
      } catch {
        text = "";
      }
      text = String(text || "").trim();
      if (!text || text === "null" || text === "{}" || text === "[]") return "";
      if (text.length <= maxLen) return text;
      return `${text.slice(0, Math.max(0, maxLen - 3))}...`;
    }
    async function prepareBatchApprovals({ agent, toolCalls }) {
      const batchDecisions = /* @__PURE__ */ new Map();
      if (!agent._approvalDenies) agent._approvalDenies = /* @__PURE__ */ new Set();
      const needsApproval = toolCalls.some((call) => {
        const tool = agent.tools[call.name];
        if (!tool) return false;
        const toolRisk = getToolRisk(agent, call.name, tool);
        const agentTier = agent.riskProfile ? agent.riskProfile.tier : RiskLevel.NONE;
        const decision = getApprovalDecision({
          toolName: call.name,
          toolRisk,
          agentTier,
          approvalPolicy: agent && agent.approvalPolicy,
          trustedTools: agent && agent.trustedTools
        });
        return Boolean(decision && decision.requires);
      });
      if (needsApproval) {
        const pending = [];
        const agentTier = agent.riskProfile ? agent.riskProfile.tier : RiskLevel.NONE;
        for (const call of toolCalls) {
          const tool = agent.tools[call.name];
          if (!tool) continue;
          if (!call.id) continue;
          const args = parseCallArgs(call);
          const denyKey = makeApprovalDenyKey(call.name, args);
          if (agent && agent._approvalDenies && agent._approvalDenies.has(denyKey)) continue;
          const toolRisk = getToolRisk(agent, call.name, tool);
          const approvalMode = tool && tool.approvalMode === "per_turn" ? "per_turn" : "per_call";
          const meta = tool && tool.meta ? tool.meta : null;
          const cached = approvalMode === "per_turn" && toolRisk < RiskLevel.HIGH && agent && agent._approvalGrants && agent._approvalGrants.has(call.name);
          if (cached) continue;
          const decision = getApprovalDecision({
            toolName: call.name,
            toolRisk,
            agentTier,
            approvalPolicy: agent && agent.approvalPolicy,
            trustedTools: agent && agent.trustedTools
          });
          if (decision && decision.requires) {
            pending.push({
              id: call.id,
              name: call.name,
              risk: toolRisk,
              args,
              intent: getToolIntent(agent, call.name, args) || void 0,
              denyKey,
              approvalMode,
              permissions: meta && Array.isArray(meta.permissions) ? meta.permissions : [],
              rateLimit: meta && meta.rateLimit ? meta.rateLimit : null
            });
          }
        }
        if (pending.length > 1) {
          const approvalCallId = `approval:batch:${Date.now()}`;
          const maxRisk = pending.reduce((m, p) => p.risk > m ? p.risk : m, RiskLevel.NONE);
          const question = agent && agent.debug ? `Approve selected tool calls (${pending.length})?` : buildApprovalQuestion({ toolName: `${pending.length} tool calls`, toolRisk: maxRisk, isDebug: false });
          agent.emit("approval_required", {
            callId: approvalCallId,
            tool: "(batch)",
            risk: maxRisk,
            tools: pending,
            batch: true,
            promptSnapshot: question
          });
          agent._setState("awaiting_input", { callId: approvalCallId, tool: "(batch)", risk: maxRisk, count: pending.length });
          const approvalPromise = agent._awaitUserInput(approvalCallId, agent.approvalTimeoutMs);
          agent.emit("user_input_requested", {
            callId: approvalCallId,
            questions: [{
              question,
              inputType: "multi_select",
              options: pending.map((p) => ({
                title: (() => {
                  const argsText = summarizeApprovalArgs(p.args, { maxLen: 90 });
                  const argsPart = argsText ? ` args=${argsText}` : "";
                  return `${p.name}${argsPart} (${riskLabel(p.risk)})`;
                })(),
                value: p.id,
                selected: true
              }))
            }]
          });
          const approval = await approvalPromise;
          const approvedCallIds = /* @__PURE__ */ new Set();
          if (!approval.timedOut) {
            const v = approval.value;
            if (isApprovedResponse(v)) {
              for (const p of pending) approvedCallIds.add(p.id);
            } else if (v && typeof v === "object" && Array.isArray(v.approvedCallIds)) {
              for (const id of v.approvedCallIds) approvedCallIds.add(id);
            } else if (Array.isArray(v)) {
              for (const id of v) approvedCallIds.add(id);
            }
          }
          for (const p of pending) {
            const ok = approvedCallIds.has(p.id);
            batchDecisions.set(p.id, {
              approved: ok,
              timedOut: Boolean(approval.timedOut),
              args: p.args,
              risk: p.risk,
              approvalMode: p.approvalMode,
              toolName: p.name
            });
            if (agent && agent._approvalDenies) {
              if (ok) agent._approvalDenies.delete(p.denyKey);
              else agent._approvalDenies.add(p.denyKey);
            }
            if (ok && p.approvalMode === "per_turn" && agent && agent._approvalGrants && p.risk < RiskLevel.HIGH) {
              agent._approvalGrants.add(p.name);
            }
          }
          agent._setState("thinking", { reason: approval.timedOut ? "approval_timeout" : "approval_batch_resolved" });
        }
      }
      return { needsApproval, batchDecisions };
    }
    module.exports = {
      prepareBatchApprovals
    };
  }
});

// utils/agent-self-heal.js
var require_agent_self_heal = __commonJS({
  "utils/agent-self-heal.js"(exports, module) {
    function isBrowserRuntime() {
      return typeof window !== "undefined";
    }
    function isBrowserEnvRestrictionLikeMessage(message) {
      const text = String(message || "").toLowerCase();
      if (!text) return false;
      return text.includes("cors") || text.includes("cross-origin") || text.includes("access-control-allow-origin") || text.includes("failed to fetch") || text.includes("networkerror when attempting to fetch") || text.includes("load failed") || text.includes("mixed content") || text.includes("blocked:mixed-content") || text.includes("insecure request") || text.includes("secure context") || text.includes("same origin") || text.includes("same-origin");
    }
    function getNodeErrorCode(output) {
      if (!output || typeof output !== "object") return null;
      const code = output.code || output.errno || output.error_code;
      return typeof code === "string" && code.trim() ? code.trim() : null;
    }
    function classifyNodeError({ code, message }) {
      const normalized = typeof code === "string" ? code.toUpperCase() : "";
      const msg = String(message || "").toLowerCase();
      const ioCodes = /* @__PURE__ */ new Set(["ENOENT", "EACCES", "EPERM", "ENOTDIR", "EISDIR"]);
      const netCodes = /* @__PURE__ */ new Set(["ECONNREFUSED", "ENOTFOUND", "EHOSTUNREACH", "ECONNRESET"]);
      if (ioCodes.has(normalized) || msg.includes("no such file") || msg.includes("permission denied")) {
        return "node_io_error";
      }
      if (netCodes.has(normalized) || msg.includes("connect") || msg.includes("econn")) {
        return "node_network_error";
      }
      return null;
    }
    function classifyToolFailure({ toolName, output, isRateLimitLike }) {
      if (output && typeof output === "object") {
        if (output.error) {
          if (String(output.error).toLowerCase() === "timeout") {
            return "timeout";
          }
          if (output.status === 429 || output.statusCode === 429 || output.code === 429 || typeof isRateLimitLike === "function" && (isRateLimitLike(output.error) || isRateLimitLike(output.message))) {
            return "rate_limited";
          }
          if (isBrowserRuntime()) {
            const err = String(output.error || "");
            const meta = [output.message, output.reason, output.detail, output.hint].filter(Boolean).map((v) => String(v)).join(" ");
            const combined = `${err} ${meta}`;
            if (String(output.platform || "").toLowerCase() === "browser" || err.toLowerCase() === "environment restriction" || isBrowserEnvRestrictionLikeMessage(combined)) {
              return "environment_restriction";
            }
          } else {
            const code = getNodeErrorCode(output);
            const message = output.message || output.error || "";
            const nodeType = classifyNodeError({ code, message });
            if (nodeType) return nodeType;
          }
          if (toolName === "run_command" && String(output.error).toLowerCase().includes("access denied")) {
            return "access_denied";
          }
          if (toolName === "apply_patch") {
            const text = `${output.error || ""} ${output.message || ""}`.toLowerCase();
            if (text.includes("invalid patch") || text.includes("unsupported patch")) {
              return "patch_format_error";
            }
          }
          return "tool_error";
        }
        if (toolName === "run_command" && typeof output.exitCode === "number" && output.exitCode !== 0) {
          return "nonzero_exit";
        }
      }
      return null;
    }
    function recordToolFailure({ toolFailureStreak, toolName, fingerprintOrType, args, makeFailureFingerprint }) {
      if (!toolFailureStreak || !toolName) return;
      let fingerprint = fingerprintOrType;
      let failureType = void 0;
      if (args !== void 0 && typeof fingerprintOrType === "string") {
        failureType = fingerprintOrType;
        fingerprint = makeFailureFingerprint(toolName, fingerprintOrType, args);
      }
      const prev = toolFailureStreak.get(toolName);
      if (prev && prev.fingerprint === fingerprint) {
        toolFailureStreak.set(toolName, {
          count: prev.count + 1,
          fingerprint,
          failureType: failureType || prev.failureType
        });
      } else {
        toolFailureStreak.set(toolName, { count: 1, fingerprint, failureType });
      }
    }
    function clearToolFailure({ toolFailureStreak, toolName }) {
      if (!toolFailureStreak || !toolName) return;
      toolFailureStreak.delete(toolName);
    }
    function withSelfHealHint({ toolFailureStreak, toolName, output, defaultLoopFingerprintThreshold }) {
      if (!toolFailureStreak || !toolName) return output;
      const state = toolFailureStreak.get(toolName);
      if (!state || state.count < 2) return output;
      const hardStop = state.count >= defaultLoopFingerprintThreshold;
      const adviceByType = {
        timeout: "This tool timed out repeatedly. Reduce scope/complexity, verify network/connectivity, or use an alternative tool.",
        rate_limited: "This tool is being rate limited. Wait before retrying, reduce call frequency, or consolidate requests.",
        format_error: "This tool returned a non-JSON-serializable output. Adjust parameters to return structured JSON, or check read_skill_documentation.",
        environment_restriction: "This tool appears blocked by the browser environment (CORS / same-origin policy, mixed content, or blocked network request). Do NOT retry the same call. Explain the limitation to the user and suggest running in Node.js, or using an explicitly configured proxy/alternative source.",
        node_io_error: "This tool appears to have hit a Node.js filesystem error (missing file/dir or permissions). Verify the path, check permissions, and confirm the working directory before retrying.",
        node_network_error: "This tool appears to have hit a Node.js network error. Verify host/port, connectivity, and whether the service is running before retrying.",
        patch_format_error: 'apply_patch format is invalid. Keep using apply_patch, fix to "*** Begin Patch ... *** Delete File: <path> ... *** End Patch", and retry once. Do not switch to list_available_skills for syntax-only failures.'
      };
      const baseAdvice = hardStop ? [
        "STOP: You have repeated the same failing tool call. You MUST change your approach.",
        adviceByType[state.failureType] || "Verify inputs and environment, then change approach.",
        "Do not retry with the same parameters. Either adjust inputs materially, or switch tools. If unsure, use list_available_skills and read_skill_documentation."
      ].join(" ") : [
        "This tool has failed repeatedly. Change strategy instead of retrying the same call.",
        adviceByType[state.failureType] || 'Verify inputs and environment first (e.g. for run_command: try "pwd" and "ls"; for file/path issues: confirm the path).',
        "If unsure, use list_available_skills and read_skill_documentation to find an appropriate alternative."
      ].join(" ");
      if (output && typeof output === "object" && !Array.isArray(output)) {
        return {
          ...output,
          _self_heal: {
            repeatedFailures: state.count,
            failureType: state.failureType || null,
            intervention: hardStop ? "hard_stop" : "soft_hint",
            advice: baseAdvice
          }
        };
      }
      return {
        result: output,
        _self_heal: {
          repeatedFailures: state.count,
          failureType: state.failureType || null,
          intervention: hardStop ? "hard_stop" : "soft_hint",
          advice: baseAdvice
        }
      };
    }
    module.exports = {
      isBrowserRuntime,
      isBrowserEnvRestrictionLikeMessage,
      classifyToolFailure,
      recordToolFailure,
      clearToolFailure,
      withSelfHealHint
    };
  }
});

// utils/mcp-adapter.js
var require_mcp_adapter = __commonJS({
  "utils/mcp-adapter.js"(exports, module) {
    function toMcpInputSchema(parameters) {
      const p = parameters && typeof parameters === "object" ? parameters : null;
      const schema = {
        type: "object",
        properties: {}
      };
      if (!p) return schema;
      if (p.type) schema.type = p.type;
      if (p.properties && typeof p.properties === "object") schema.properties = p.properties;
      if (Array.isArray(p.required)) schema.required = p.required;
      if (p.description) schema.description = p.description;
      if (p.title) schema.title = p.title;
      return schema;
    }
    function _isContentBlockArray(content) {
      return Array.isArray(content) && content.every((b) => b && typeof b === "object" && typeof b.type === "string");
    }
    function toMcpCallToolResult(output, { isError } = {}) {
      if (output && typeof output === "object" && !Array.isArray(output)) {
        const hasContent = _isContentBlockArray(output.content);
        const normalized = {
          content: hasContent ? output.content : void 0,
          structuredContent: output.structuredContent,
          isError: typeof output.isError === "boolean" ? output.isError : void 0
        };
        if (!normalized.content) {
          normalized.structuredContent = normalized.structuredContent === void 0 ? output : normalized.structuredContent;
          normalized.content = [{ type: "text", text: JSON.stringify(output, null, 2) }];
        }
        if (typeof isError === "boolean") normalized.isError = isError;
        return normalized;
      }
      if (typeof output === "string") {
        return {
          content: [{ type: "text", text: output }],
          ...typeof isError === "boolean" ? { isError } : null
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
        ...typeof isError === "boolean" ? { isError } : null
      };
    }
    module.exports = {
      toMcpInputSchema,
      toMcpCallToolResult
    };
  }
});

// utils/agent-tool-output-guard.js
var require_agent_tool_output_guard = __commonJS({
  "utils/agent-tool-output-guard.js"(exports, module) {
    function isPlainObject(value) {
      if (!value || typeof value !== "object") return false;
      if (Array.isArray(value)) return false;
      const proto = Object.getPrototypeOf(value);
      return proto === Object.prototype || proto === null;
    }
    function toFiniteInt(value, fallback) {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      return Math.floor(n);
    }
    function byteLength(text) {
      const s = String(text == null ? "" : text);
      try {
        if (typeof Buffer !== "undefined" && Buffer && typeof Buffer.byteLength === "function") {
          return Buffer.byteLength(s, "utf8");
        }
      } catch {
      }
      try {
        if (typeof TextEncoder !== "undefined") {
          return new TextEncoder().encode(s).length;
        }
      } catch {
      }
      return s.length;
    }
    function safeJson(value) {
      try {
        return JSON.stringify(value);
      } catch {
        return null;
      }
    }
    var MAX_MEASURE_JSON_CHARS = 1e5;
    var DEFAULT_TOOL_OUTPUT_LIMITS = {
      maxStringChars: 12e3,
      headChars: 8e3,
      tailChars: 2e3,
      maxArrayItems: 60,
      maxObjectKeys: 60,
      maxDepth: 5
    };
    function mergeLimits(raw) {
      const limits = isPlainObject(raw) ? raw : null;
      const out = { ...DEFAULT_TOOL_OUTPUT_LIMITS };
      if (!limits) return out;
      out.maxStringChars = Math.max(256, toFiniteInt(limits.maxStringChars, out.maxStringChars));
      out.headChars = Math.max(0, toFiniteInt(limits.headChars, out.headChars));
      out.tailChars = Math.max(0, toFiniteInt(limits.tailChars, out.tailChars));
      out.maxArrayItems = Math.max(0, toFiniteInt(limits.maxArrayItems, out.maxArrayItems));
      out.maxObjectKeys = Math.max(0, toFiniteInt(limits.maxObjectKeys, out.maxObjectKeys));
      out.maxDepth = Math.max(1, toFiniteInt(limits.maxDepth, out.maxDepth));
      return out;
    }
    function buildGuarded({ toolName, kind, original, preview, meta }) {
      const originalJson = safeJson(original);
      const previewJson = safeJson(preview);
      const originalBytes = originalJson && originalJson.length <= MAX_MEASURE_JSON_CHARS ? byteLength(originalJson) : null;
      const keptBytes = previewJson && previewJson.length <= MAX_MEASURE_JSON_CHARS ? byteLength(previewJson) : null;
      return {
        _agentsjs_tool_output_guard: {
          tool: toolName || "",
          kind,
          truncated: true,
          originalBytes,
          keptBytes,
          ...meta
        },
        preview
      };
    }
    function guardString({ toolName, value, limits }) {
      const s = String(value);
      const maxChars = limits.maxStringChars;
      if (s.length <= maxChars) return s;
      const head = s.slice(0, Math.min(limits.headChars, maxChars));
      const tailBudget = Math.max(0, maxChars - head.length);
      const tail = limits.tailChars > 0 ? s.slice(Math.max(0, s.length - Math.min(limits.tailChars, tailBudget))) : "";
      const sep = tail && head ? "\n...\n" : "...";
      const preview = `${head}${sep}${tail}`;
      return buildGuarded({
        toolName,
        kind: "string",
        original: s,
        preview,
        meta: {
          originalChars: s.length,
          keptChars: preview.length
        }
      });
    }
    function guardValueInner({ toolName, value, limits, depth, seen }) {
      if (value === null || value === void 0) return value;
      const t = typeof value;
      if (t === "string") return guardString({ toolName, value, limits });
      if (t === "number" || t === "boolean") return value;
      if (t !== "object") return String(value);
      if (seen.has(value)) {
        return buildGuarded({
          toolName,
          kind: "circular",
          original: "[Circular]",
          preview: "[Circular]",
          meta: {}
        });
      }
      if (depth >= limits.maxDepth) {
        return buildGuarded({
          toolName,
          kind: "max_depth",
          original: value,
          preview: `[Truncated: maxDepth=${limits.maxDepth}]`,
          meta: { maxDepth: limits.maxDepth }
        });
      }
      seen.add(value);
      if (Array.isArray(value)) {
        const originalLen = value.length;
        const maxItems = limits.maxArrayItems;
        const kept = maxItems > 0 ? value.slice(0, maxItems) : [];
        const preview2 = kept.map((item) => guardValueInner({ toolName, value: item, limits, depth: depth + 1, seen }));
        if (originalLen <= maxItems) return preview2;
        return buildGuarded({
          toolName,
          kind: "array",
          original: value,
          preview: preview2,
          meta: { originalItems: originalLen, keptItems: preview2.length }
        });
      }
      if (!isPlainObject(value)) {
        const json = safeJson(value);
        if (json && json.length <= limits.maxStringChars) return value;
        return buildGuarded({
          toolName,
          kind: "non_plain_object",
          original: json || String(value),
          preview: json && json.length > limits.maxStringChars ? guardString({ toolName, value: json, limits }).preview : json || String(value),
          meta: { originalType: Object.prototype.toString.call(value) }
        });
      }
      const entries = Object.entries(value);
      const maxKeys = limits.maxObjectKeys;
      const keptEntries = maxKeys > 0 ? entries.slice(0, maxKeys) : [];
      const preview = {};
      for (const [k, v] of keptEntries) {
        preview[k] = guardValueInner({ toolName, value: v, limits, depth: depth + 1, seen });
      }
      if (entries.length <= maxKeys) return preview;
      return buildGuarded({
        toolName,
        kind: "object",
        original: value,
        preview,
        meta: { originalKeys: entries.length, keptKeys: keptEntries.length }
      });
    }
    function guardToolOutput({ toolName, value, limits }) {
      const merged = mergeLimits(limits);
      const seen = /* @__PURE__ */ new Set();
      return guardValueInner({ toolName, value, limits: merged, depth: 0, seen });
    }
    module.exports = {
      DEFAULT_TOOL_OUTPUT_LIMITS,
      guardToolOutput
    };
  }
});

// utils/agent-tool-formatter.js
var require_agent_tool_formatter = __commonJS({
  "utils/agent-tool-formatter.js"(exports, module) {
    var { toMcpCallToolResult } = require_mcp_adapter();
    var { guardToolOutput } = require_agent_tool_output_guard();
    var {
      DEFAULT_LOOP_FINGERPRINT_THRESHOLD,
      safeJsonStringify
    } = require_self_heal();
    var {
      withSelfHealHint
    } = require_agent_self_heal();
    function wrapToolOutput({ toolFailureStreak, toolName, output, isError, limits }) {
      const alreadyGuarded = output && typeof output === "object" && output._agentsjs_tool_output_guard && Object.prototype.hasOwnProperty.call(output, "preview");
      const guardedOutput = alreadyGuarded ? output : guardToolOutput({ toolName, value: output, limits });
      const wrapped = withSelfHealHint({
        toolFailureStreak,
        toolName,
        output: guardedOutput,
        defaultLoopFingerprintThreshold: DEFAULT_LOOP_FINGERPRINT_THRESHOLD
      });
      return toMcpCallToolResult(wrapped, { isError });
    }
    function buildToolResultMessage({ callId, toolName, mcpResult }) {
      return {
        role: "system",
        tool_call_id: callId,
        name: toolName,
        content: safeJsonStringify(mcpResult)
      };
    }
    module.exports = { wrapToolOutput, buildToolResultMessage };
  }
});

// utils/agent-tool-approval-single.js
var require_agent_tool_approval_single = __commonJS({
  "utils/agent-tool-approval-single.js"(exports, module) {
    var { makeFailureFingerprint } = require_self_heal();
    var { recordToolFailure } = require_agent_self_heal();
    var { buildToolResultMessage, wrapToolOutput } = require_agent_tool_formatter();
    var { RiskLevel } = require_imda_constants();
    var { getToolIntent } = require_agent_tools_registry();
    var { getApprovalDecision, riskLabel, isApprovedResponse } = require_imda_policy();
    var { buildApprovalQuestion } = require_approval_copy();
    var { makeApprovalArgsHash, makeApprovalDenyKey } = require_agent_tool_approval_keys();
    function buildApprovalDeniedResult({ agent, callId, toolName, args, timedOut }) {
      const argsHash = makeApprovalArgsHash(args);
      const output = timedOut ? {
        error: "ApprovalTimeout",
        timeoutMs: agent.approvalTimeoutMs,
        message: "Approval request timed out.",
        tool: toolName,
        argsHash,
        guidance: "Approval was not granted for this specific tool call. Do not retry the exact same call in this turn."
      } : {
        error: "ApprovalDenied",
        message: "User denied approval.",
        tool: toolName,
        argsHash,
        guidance: "User denied approval for this specific tool call. Do not retry the exact same call in this turn."
      };
      recordToolFailure({
        toolFailureStreak: agent._toolFailureStreak,
        toolName,
        fingerprintOrType: "approval_denied",
        args,
        makeFailureFingerprint
      });
      const mcpResult = wrapToolOutput({
        toolFailureStreak: agent._toolFailureStreak,
        toolName,
        output,
        isError: true,
        limits: agent && agent.toolOutputLimits
      });
      return buildToolResultMessage({ callId, toolName, mcpResult });
    }
    async function requireApprovalIfNeeded({ agent, call, tool, args, toolRisk, agentTier, batchDecisions }) {
      const decisions = batchDecisions || /* @__PURE__ */ new Map();
      if (decisions.has(call.id)) {
        const decision2 = decisions.get(call.id);
        if (!decision2.approved) {
          agent._setState("thinking", { reason: decision2.timedOut ? "approval_timeout" : "approval_denied" });
          return {
            deniedResultMessage: buildApprovalDeniedResult({
              agent,
              callId: call.id,
              toolName: call.name,
              args,
              timedOut: decision2.timedOut
            })
          };
        }
        return { deniedResultMessage: null };
      }
      const decision = getApprovalDecision({
        toolName: call.name,
        toolRisk,
        agentTier,
        approvalPolicy: agent && agent.approvalPolicy,
        trustedTools: agent && agent.trustedTools
      });
      if (decision && decision.bypassed && agent && typeof agent.emit === "function") {
        agent.emit("approval_skipped", {
          tool: call.name,
          risk: toolRisk,
          policy: agent.approvalPolicy || "always",
          reason: decision.reason,
          args,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      if (!decision || !decision.requires) {
        return { deniedResultMessage: null };
      }
      if (!agent._approvalDenies) agent._approvalDenies = /* @__PURE__ */ new Set();
      const denyKey = makeApprovalDenyKey(call.name, args);
      if (agent._approvalDenies.has(denyKey)) {
        agent._setState("thinking", { reason: "approval_denied_cached" });
        return {
          deniedResultMessage: buildApprovalDeniedResult({
            agent,
            callId: call.id,
            toolName: call.name,
            args,
            timedOut: false
          })
        };
      }
      const approvalMode = tool && tool.approvalMode === "per_turn" ? "per_turn" : "per_call";
      const cached = approvalMode === "per_turn" && toolRisk < RiskLevel.HIGH && agent && agent._approvalGrants && agent._approvalGrants.has(call.name);
      if (cached) return { deniedResultMessage: null };
      const approvalCallId = `approval:${call.id || call.name}`;
      const approvalQuestion = agent && agent.debug ? `Approve tool call: ${call.name} (${riskLabel(toolRisk)})?` : buildApprovalQuestion({ toolName: call.name, toolRisk, isDebug: false });
      const meta = tool && tool.meta ? tool.meta : null;
      const intent = getToolIntent(agent, call.name, args) || void 0;
      agent.emit("approval_required", {
        callId: approvalCallId,
        tool: call.name,
        risk: toolRisk,
        args,
        intent,
        permissions: meta && Array.isArray(meta.permissions) ? meta.permissions : [],
        rateLimit: meta && meta.rateLimit ? meta.rateLimit : null,
        promptSnapshot: approvalQuestion
      });
      agent._setState("awaiting_input", { callId: approvalCallId, tool: call.name, risk: toolRisk });
      const approvalPromise = agent._awaitUserInput(approvalCallId, agent.approvalTimeoutMs);
      agent.emit("user_input_requested", {
        callId: approvalCallId,
        questions: [{ question: approvalQuestion, options: ["Approve", "Deny"] }]
      });
      const approval = await approvalPromise;
      if (approval.timedOut || !isApprovedResponse(approval.value)) {
        agent._setState("thinking", { reason: "approval_denied" });
        agent._approvalDenies.add(denyKey);
        return {
          deniedResultMessage: buildApprovalDeniedResult({
            agent,
            callId: call.id,
            toolName: call.name,
            args,
            timedOut: approval.timedOut
          })
        };
      }
      agent._approvalDenies.delete(denyKey);
      if (approvalMode === "per_turn" && agent && agent._approvalGrants) agent._approvalGrants.add(call.name);
      agent._setState("thinking", { reason: "approval_granted" });
      return { deniedResultMessage: null };
    }
    module.exports = {
      buildApprovalDeniedResult,
      requireApprovalIfNeeded
    };
  }
});

// utils/agent-tool-approval.js
var require_agent_tool_approval = __commonJS({
  "utils/agent-tool-approval.js"(exports, module) {
    var { makeApprovalDenyKey } = require_agent_tool_approval_keys();
    var { prepareBatchApprovals } = require_agent_tool_approval_batch();
    var { buildApprovalDeniedResult, requireApprovalIfNeeded } = require_agent_tool_approval_single();
    module.exports = {
      buildApprovalDeniedResult,
      requireApprovalIfNeeded,
      makeApprovalDenyKey,
      prepareBatchApprovals
    };
  }
});

// utils/agent-timeout.js
var require_agent_timeout = __commonJS({
  "utils/agent-timeout.js"(exports, module) {
    function callToolWithTimeout({ fn, timeoutMs, defaultTimeoutMs }) {
      const ms = typeof timeoutMs === "number" && timeoutMs > 0 ? timeoutMs : defaultTimeoutMs;
      let timer;
      const timeoutPromise = new Promise((resolve) => {
        timer = setTimeout(() => resolve({ timedOut: true }), ms);
        if (timer && typeof timer.unref === "function") timer.unref();
      });
      return Promise.resolve().then(() => Promise.race([
        Promise.resolve().then(fn).then((v) => ({ timedOut: false, value: v })),
        timeoutPromise
      ])).finally(() => {
        if (timer) clearTimeout(timer);
      });
    }
    module.exports = { callToolWithTimeout };
  }
});

// utils/agent-timing.js
var require_agent_timing = __commonJS({
  "utils/agent-timing.js"(exports, module) {
    function now() {
      if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now();
      }
      return Date.now();
    }
    function getActiveToolsSnapshot(agent) {
      const timestamp = now();
      return Array.from(agent._activeTools.values()).map((entry) => ({
        id: entry.id,
        name: entry.name,
        elapsedMs: Math.max(0, Math.round(timestamp - entry.startTime))
      }));
    }
    module.exports = { now, getActiveToolsSnapshot };
  }
});

// utils/agent-tool-exec-helpers.js
var require_agent_tool_exec_helpers = __commonJS({
  "utils/agent-tool-exec-helpers.js"(exports, module) {
    var { guardToolOutput } = require_agent_tool_output_guard();
    var { now, getActiveToolsSnapshot } = require_agent_timing();
    function beginToolCall({ agent, call, args, toolMeta }) {
      const startTime = now();
      agent._activeTools.set(call.id, { id: call.id, name: call.name, startTime });
      agent.emit("tool_call_begin", {
        id: call.id,
        name: call.name,
        args: args === void 0 ? null : args,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      agent._setState("executing", { toolCalls: toolMeta, active: getActiveToolsSnapshot(agent) });
      return startTime;
    }
    function emitToolResult({ agent, toolName, args, output }) {
      const guarded = guardToolOutput({
        toolName,
        value: output,
        limits: agent && agent.toolOutputLimits
      });
      agent.emit("tool_result", { tool: toolName, args: args === void 0 ? null : args, result: guarded });
      return guarded;
    }
    function endToolCall({ agent, callId, toolName, startTime, success }) {
      const endTime = now();
      agent._activeTools.delete(callId);
      agent.emit("tool_call_end", {
        id: callId,
        name: toolName,
        success: Boolean(success),
        durationMs: Math.max(0, Math.round(endTime - (startTime || endTime)))
      });
      if (agent._activeTools.size > 0) {
        agent._setState("executing", { active: getActiveToolsSnapshot(agent) });
      }
      return endTime;
    }
    module.exports = {
      beginToolCall,
      emitToolResult,
      endToolCall
    };
  }
});

// utils/command-parser.js
var require_command_parser = __commonJS({
  "utils/command-parser.js"(exports, module) {
    function normalizeToken(token) {
      return (token || "").trim().toLowerCase();
    }
    function isEnvAssignmentToken(token) {
      const t = String(token || "").trim();
      if (!t) return false;
      if (t.startsWith("-")) return false;
      const idx = t.indexOf("=");
      if (idx <= 0) return false;
      return idx < t.length - 1;
    }
    function splitCommandSegments(input) {
      const s = String(input || "");
      const segments = [];
      let buf = "";
      let quote = null;
      let escape = false;
      const push = () => {
        const out = buf.trim();
        if (out) segments.push(out);
        buf = "";
      };
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (escape) {
          buf += ch;
          escape = false;
          continue;
        }
        if (ch === "\\") {
          if (quote !== "'") {
            escape = true;
          }
          buf += ch;
          continue;
        }
        if (quote) {
          buf += ch;
          if (ch === quote) quote = null;
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          buf += ch;
          continue;
        }
        if (ch === ";" || ch === "\n" || ch === "\r") {
          push();
          continue;
        }
        if (ch === "&" && s[i + 1] === "&") {
          push();
          i++;
          continue;
        }
        if (ch === "|" && s[i + 1] === "|") {
          push();
          i++;
          continue;
        }
        if (ch === "|") {
          push();
          continue;
        }
        buf += ch;
      }
      push();
      return segments;
    }
    function scanUnsafeOperators(command) {
      const s = String(command || "");
      let quote = null;
      let escape = false;
      const isShellName = (name) => {
        const n = normalizeToken(name);
        if (!n) return false;
        if (n === "sh" || n === "bash" || n === "zsh") return true;
        if (n === "powershell" || n === "powershell.exe" || n === "pwsh" || n === "pwsh.exe") return true;
        return false;
      };
      const basename = (p) => {
        const raw = String(p || "");
        const parts = raw.split(/[\\/]/).filter(Boolean);
        return parts.length ? parts[parts.length - 1] : raw;
      };
      const readWord = (startIdx) => {
        let i = startIdx;
        while (i < s.length && /\s/.test(s[i])) i++;
        let j = i;
        while (j < s.length && !/\s/.test(s[j]) && !["|", "&", ";", ">", "<", "\n", "\r"].includes(s[j])) j++;
        return { word: s.slice(i, j), next: j };
      };
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === "\\") {
          if (quote !== "'") escape = true;
          continue;
        }
        if (quote) {
          if (ch === quote) quote = null;
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          continue;
        }
        if (ch === ">") {
          let j = i + 1;
          if (s[j] === ">") j++;
          while (j < s.length && /\s/.test(s[j])) j++;
          if (s[j] === "/") {
            return { safe: false, reason: "redirection to absolute path is restricted" };
          }
          continue;
        }
        if (ch === "|") {
          if (s[i + 1] === "|") {
            i++;
            continue;
          }
          const first = readWord(i + 1);
          let next = first.next;
          const firstName = basename(first.word);
          if (isShellName(firstName)) {
            return { safe: false, reason: "piping into a shell is restricted" };
          }
          if (normalizeToken(firstName) === "env") {
            let second = readWord(next);
            next = second.next;
            while (second.word && (normalizeToken(second.word).startsWith("-") || isEnvAssignmentToken(second.word))) {
              second = readWord(next);
              next = second.next;
            }
            const secondName = basename(second.word);
            if (isShellName(secondName)) {
              return { safe: false, reason: "piping into a shell is restricted" };
            }
          }
          i = next - 1;
          continue;
        }
      }
      return { safe: true };
    }
    function splitArgv(input) {
      const s = String(input || "").trim();
      if (!s) return [];
      const out = [];
      let buf = "";
      let quote = null;
      let escape = false;
      const push = () => {
        if (buf.length) out.push(buf);
        buf = "";
      };
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (escape) {
          buf += ch;
          escape = false;
          continue;
        }
        if (ch === "\\") {
          if (quote !== "'") {
            escape = true;
          }
          continue;
        }
        if (quote) {
          if (ch === quote) {
            quote = null;
          } else {
            buf += ch;
          }
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          continue;
        }
        if (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
          if (buf.length) push();
          continue;
        }
        buf += ch;
      }
      if (buf.length) push();
      return out;
    }
    function isShellWrapper(tokens) {
      const filtered = tokens.filter(Boolean);
      const t = filtered.map(normalizeToken).filter(Boolean);
      let cmd0 = t[0];
      if (!cmd0) return null;
      let tokenBase = filtered;
      let tBase = t;
      if (cmd0 === "env") {
        let idx = 1;
        while (idx < tBase.length) {
          const tk = tBase[idx];
          if (tk.startsWith("-") || isEnvAssignmentToken(tokenBase[idx])) {
            idx++;
            continue;
          }
          break;
        }
        if (idx >= tBase.length) return null;
        tokenBase = tokenBase.slice(idx);
        tBase = tBase.slice(idx);
        cmd0 = tBase[0];
      }
      if (cmd0 === "bash" || cmd0 === "zsh" || cmd0 === "sh") {
        const idx = tBase.findIndex((x) => x === "-c" || x === "-lc");
        if (idx !== -1 && tokenBase[idx + 1]) {
          const payload = tokenBase.slice(idx + 1).join(" ");
          if (payload) return { payload };
        }
      }
      if (cmd0 === "cmd" || cmd0 === "cmd.exe") {
        const idx = tBase.findIndex((x) => x === "/c" || x === "/r" || x === "-c");
        if (idx !== -1) {
          const payload = tokenBase.slice(idx + 1).join(" ");
          if (payload) return { payload };
        }
      }
      if (cmd0 === "powershell" || cmd0 === "powershell.exe" || cmd0 === "pwsh" || cmd0 === "pwsh.exe") {
        const idx = tBase.findIndex((x) => x === "-command" || x === "/command" || x === "-c");
        if (idx !== -1 && tokenBase[idx + 1]) {
          const payload = tokenBase.slice(idx + 1).join(" ");
          if (payload) return { payload };
        }
      }
      return null;
    }
    module.exports = {
      normalizeToken,
      isEnvAssignmentToken,
      splitCommandSegments,
      scanUnsafeOperators,
      splitArgv,
      isShellWrapper
    };
  }
});

// utils/command-danger-zone.js
var require_command_danger_zone = __commonJS({
  "utils/command-danger-zone.js"(exports, module) {
    var { normalizeToken, isEnvAssignmentToken } = require_command_parser();
    function looksLikeGitExecutable(cmd0) {
      return !!cmd0 && (cmd0.endsWith("git") || cmd0.endsWith("/git") || cmd0.endsWith("\\git"));
    }
    function isDangerousTokens(tokens) {
      const filtered = tokens.filter(Boolean);
      const t = filtered.map(normalizeToken).filter(Boolean);
      if (t.length === 0) return { dangerous: false };
      const unwrapLeadingWrappers = (raw2, norm) => {
        let i = 0;
        if (norm[i] === "sudo") {
          i++;
          if (i >= norm.length) return { dangerous: true, reason: "sudo without command" };
        }
        if (norm[i] === "env") {
          i++;
          while (i < norm.length && (norm[i].startsWith("-") || isEnvAssignmentToken(raw2[i]))) i++;
        }
        return { raw: raw2.slice(i), norm: norm.slice(i) };
      };
      const unwrapped = unwrapLeadingWrappers(filtered, t);
      if (unwrapped.dangerous) return { dangerous: true, reason: unwrapped.reason };
      const raw = unwrapped.raw;
      const n = unwrapped.norm;
      if (n.length === 0) return { dangerous: false };
      const first = n[0];
      if (looksLikeGitExecutable(first)) {
        const sub = n[1];
        if (sub === "reset") return { dangerous: true, reason: "git reset is restricted" };
        if (sub === "rm") return { dangerous: true, reason: "git rm is restricted" };
      }
      if (first === "rm") {
        const flags = new Set(n.slice(1).filter((x) => x.startsWith("-")));
        const hasF = flags.has("-f") || flags.has("-rf") || flags.has("-fr");
        const hasR = flags.has("-r") || flags.has("-rf") || flags.has("-fr") || flags.has("-rr") || flags.has("-rR");
        if (hasF) return { dangerous: true, reason: "rm with force is restricted" };
        if (hasR && flags.has("-f")) return { dangerous: true, reason: "rm -r -f is restricted" };
      }
      if (first === "chmod") {
        if (n.includes("777") || n.some((x) => x === "-R" || x === "-r") && n.includes("777")) {
          return { dangerous: true, reason: "chmod 777 is restricted" };
        }
      }
      if (first.startsWith("mkfs")) return { dangerous: true, reason: "mkfs is restricted" };
      if (first === "dd") return { dangerous: true, reason: "dd is restricted" };
      if (first === "del" || first === "erase") {
        if (n.includes("/f")) return { dangerous: true, reason: "del/erase with /f is restricted" };
      }
      if (first === "rd" || first === "rmdir") {
        if (n.includes("/s") && n.includes("/q")) return { dangerous: true, reason: "rd/rmdir with /s /q is restricted" };
      }
      const interpreterFlagByCmd = {
        python: "-c",
        python3: "-c",
        py: "-c",
        node: "-e",
        perl: "-e",
        ruby: "-e",
        php: "-r"
      };
      const evalFlag = interpreterFlagByCmd[first];
      if (evalFlag) {
        const idx = n.findIndex((x) => x === evalFlag || first === "node" && x === "--eval");
        if (idx !== -1 && raw[idx + 1]) {
          const payload = String(raw.slice(idx + 1).join(" ")).toLowerCase();
          const hasExecPrimitive = payload.includes("os.system") || payload.includes("subprocess") || payload.includes("child_process") || payload.includes("spawn(") || payload.includes("exec(") || payload.includes("popen(") || payload.includes("system(");
          const hasDangerousCommand = /rm\s+-[^\n]*f/.test(payload) || payload.includes("git reset") || payload.includes("git rm") || payload.includes("mkfs") || /\bdd\s+if=/.test(payload) || payload.includes("chmod 777");
          if (hasExecPrimitive && hasDangerousCommand) {
            return { dangerous: true, reason: "interpreter inline command execution is restricted" };
          }
        }
      }
      return { dangerous: false };
    }
    module.exports = { isDangerousTokens };
  }
});

// utils/security.js
var require_security = __commonJS({
  "utils/security.js"(exports, module) {
    var {
      splitCommandSegments,
      scanUnsafeOperators,
      splitArgv,
      isShellWrapper
    } = require_command_parser();
    var { isDangerousTokens } = require_command_danger_zone();
    function isNodeRuntime() {
      return typeof window === "undefined" && typeof process !== "undefined" && !!(process.versions && process.versions.node);
    }
    function checkCommandString(command, depth = 0) {
      if (depth > 5) {
        return { safe: false, reason: "command nesting too deep" };
      }
      const opScan = scanUnsafeOperators(command);
      if (!opScan.safe) return opScan;
      const segments = splitCommandSegments(command);
      for (const seg of segments) {
        const argv = splitArgv(seg);
        const wrap = isShellWrapper(argv);
        if (wrap && wrap.payload) {
          const inner = checkCommandString(wrap.payload, depth + 1);
          if (!inner.safe) return inner;
        }
        const tokenRes = isDangerousTokens(argv);
        if (tokenRes.dangerous) {
          return { safe: false, reason: tokenRes.reason || "Restricted command" };
        }
      }
      return { safe: true };
    }
    var SecurityValidator = class {
      static validateTool(toolName, args, context = {}) {
        const runtime = context.runtime || (isNodeRuntime() ? "node" : "browser");
        if (toolName === "run_command") {
          if (runtime !== "node") {
            return {
              safe: false,
              reason: "run_command is not supported in browser runtime",
              platform: runtime
            };
          }
          const command = args && typeof args.command === "string" ? args.command : "";
          const res = checkCommandString(command);
          return {
            safe: res.safe,
            reason: res.safe ? void 0 : res.reason,
            platform: runtime
          };
        }
        if (toolName === "apply_patch") {
          if (runtime !== "node") {
            return {
              safe: false,
              reason: "apply_patch is not supported in browser runtime",
              platform: runtime
            };
          }
          return { safe: true, platform: runtime };
        }
        return { safe: true, platform: runtime };
      }
    };
    module.exports = { SecurityValidator };
  }
});

// utils/tools/special-run-command.js
var require_special_run_command = __commonJS({
  "utils/tools/special-run-command.js"(exports, module) {
    function _isNodeRuntime() {
      return typeof window === "undefined" && typeof process !== "undefined" && !!(process.versions && process.versions.node);
    }
    function _getSpawn() {
      if (!_isNodeRuntime()) return null;
      try {
        const req = typeof __require === "function" ? __require : (0, eval)("require");
        const mod = req("child_process");
        return mod && typeof mod.spawn === "function" ? mod.spawn : null;
      } catch {
        return null;
      }
    }
    var { makeFailureFingerprint, DEFAULT_TOOL_TIMEOUT_MS, isRateLimitLike } = require_self_heal();
    var { recordToolFailure, clearToolFailure, classifyToolFailure } = require_agent_self_heal();
    var { wrapToolOutput, buildToolResultMessage } = require_agent_tool_formatter();
    var { guardToolOutput } = require_agent_tool_output_guard();
    var { now, getActiveToolsSnapshot } = require_agent_timing();
    var { SecurityValidator } = require_security();
    function emitToolResultGuarded({ agent, toolName, args, output }) {
      const guarded = guardToolOutput({
        toolName,
        value: output,
        limits: agent && agent.toolOutputLimits
      });
      if (agent && typeof agent.emit === "function") {
        agent.emit("tool_result", {
          tool: toolName,
          args,
          result: guarded
        });
      }
      return guarded;
    }
    async function handleRunCommand({ agent, call, args, startTime, signal }) {
      const spawn = _getSpawn();
      const command = args && typeof args.command === "string" ? args.command : "";
      if (signal && signal.aborted) {
        const output2 = { error: "Aborted", message: "Execution aborted." };
        const guardedOutput = emitToolResultGuarded({ agent, toolName: call.name, args, output: output2 });
        const mcpResult2 = wrapToolOutput({
          toolFailureStreak: agent._toolFailureStreak,
          toolName: call.name,
          output: guardedOutput,
          isError: true,
          limits: agent && agent.toolOutputLimits
        });
        const resultMessage2 = buildToolResultMessage({
          callId: call.id,
          toolName: call.name,
          mcpResult: mcpResult2
        });
        const endTime2 = now();
        agent._activeTools.delete(call.id);
        agent.emit("tool_call_end", {
          id: call.id,
          name: call.name,
          success: false,
          durationMs: Math.max(0, Math.round(endTime2 - startTime))
        });
        if (agent._activeTools.size > 0) {
          agent._setState("executing", { active: getActiveToolsSnapshot(agent) });
        } else {
          agent._setState("thinking", { reason: "tool_aborted" });
        }
        return { handled: true, resultMessage: resultMessage2 };
      }
      const verdict = SecurityValidator.validateTool("run_command", { command });
      if (!verdict.safe) {
        const output2 = {
          error: "Access Denied",
          reason: verdict.reason || "Restricted command",
          platform: verdict.platform
        };
        const guardedOutput = emitToolResultGuarded({ agent, toolName: call.name, args, output: output2 });
        recordToolFailure({
          toolFailureStreak: agent._toolFailureStreak,
          toolName: call.name,
          fingerprintOrType: "access_denied",
          args,
          makeFailureFingerprint
        });
        const mcpResult2 = wrapToolOutput({
          toolFailureStreak: agent._toolFailureStreak,
          toolName: call.name,
          output: guardedOutput,
          isError: true,
          limits: agent && agent.toolOutputLimits
        });
        const endTime2 = now();
        agent._activeTools.delete(call.id);
        agent.emit("tool_call_end", {
          id: call.id,
          name: call.name,
          success: false,
          durationMs: Math.max(0, Math.round(endTime2 - startTime))
        });
        if (agent._activeTools.size > 0) {
          agent._setState("executing", { active: getActiveToolsSnapshot(agent) });
        }
        const resultMessage2 = buildToolResultMessage({
          callId: call.id,
          toolName: call.name,
          mcpResult: mcpResult2
        });
        return { handled: true, resultMessage: resultMessage2 };
      }
      const timeoutMs = args && typeof args.timeoutMs === "number" && Number.isFinite(args.timeoutMs) && args.timeoutMs > 0 ? args.timeoutMs : agent.toolTimeoutMs || DEFAULT_TOOL_TIMEOUT_MS;
      agent.emit("exec_command_begin", {
        id: call.id,
        command,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      if (!spawn) {
        const output2 = {
          error: "Environment Restriction",
          message: "run_command is not available in this runtime."
        };
        const guardedOutput = emitToolResultGuarded({ agent, toolName: call.name, args, output: output2 });
        recordToolFailure({
          toolFailureStreak: agent._toolFailureStreak,
          toolName: call.name,
          fingerprintOrType: "environment_restriction",
          args,
          makeFailureFingerprint
        });
        const mcpResult2 = wrapToolOutput({
          toolFailureStreak: agent._toolFailureStreak,
          toolName: call.name,
          output: guardedOutput,
          isError: true,
          limits: agent && agent.toolOutputLimits
        });
        const endTime2 = now();
        agent._activeTools.delete(call.id);
        agent.emit("tool_call_end", {
          id: call.id,
          name: call.name,
          success: false,
          durationMs: Math.max(0, Math.round(endTime2 - startTime))
        });
        if (agent._activeTools.size > 0) {
          agent._setState("executing", { active: getActiveToolsSnapshot(agent) });
        }
        const resultMessage2 = buildToolResultMessage({
          callId: call.id,
          toolName: call.name,
          mcpResult: mcpResult2
        });
        return { handled: true, resultMessage: resultMessage2 };
      }
      const child = spawn(command, { shell: true });
      let spawnError = null;
      let aborted = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeoutMs);
      let abortHandler = null;
      if (signal && typeof signal.addEventListener === "function") {
        abortHandler = () => {
          aborted = true;
          child.kill("SIGTERM");
        };
        if (signal.aborted) abortHandler();
        else signal.addEventListener("abort", abortHandler, { once: true });
      }
      if (child.stdout) {
        child.stdout.on("data", (chunk) => {
          const text = String(chunk);
          stdout += text;
          agent.emit("exec_command_output", { id: call.id, stream: "stdout", chunk: text });
        });
      }
      if (child.stderr) {
        child.stderr.on("data", (chunk) => {
          const text = String(chunk);
          stderr += text;
          agent.emit("exec_command_output", { id: call.id, stream: "stderr", chunk: text });
        });
      }
      const exitCode = await new Promise((resolve) => {
        child.on("error", (error) => {
          spawnError = error;
          resolve(1);
        });
        child.on("close", (code, signalName) => {
          clearTimeout(timeout);
          if (signalName === "SIGTERM" || signalName === "SIGKILL") timedOut = true;
          resolve(typeof code === "number" ? code : 0);
        });
      });
      if (abortHandler && signal && typeof signal.removeEventListener === "function") {
        signal.removeEventListener("abort", abortHandler);
      }
      const output = {
        stdout: String(stdout).trim(),
        stderr: String(stderr).trim(),
        exitCode: typeof exitCode === "number" ? exitCode : 0
      };
      if (spawnError) {
        output.error = "Tool execution failed";
        output.message = String(spawnError.message || spawnError);
      } else if (aborted) {
        output.error = "Aborted";
        output.exitCode = 130;
      } else if (timedOut) {
        output.error = "Timeout";
        output.timeoutMs = timeoutMs;
        output.exitCode = 124;
      }
      const failureType = timedOut ? "timeout" : classifyToolFailure({ toolName: call.name, output, isRateLimitLike });
      if (failureType) {
        recordToolFailure({
          toolFailureStreak: agent._toolFailureStreak,
          toolName: call.name,
          fingerprintOrType: failureType,
          args,
          makeFailureFingerprint
        });
      } else {
        clearToolFailure({ toolFailureStreak: agent._toolFailureStreak, toolName: call.name });
      }
      const mcpResult = wrapToolOutput({
        toolFailureStreak: agent._toolFailureStreak,
        toolName: call.name,
        output: emitToolResultGuarded({ agent, toolName: call.name, args, output }),
        isError: Boolean(failureType),
        limits: agent && agent.toolOutputLimits
      });
      const endTime = now();
      agent._activeTools.delete(call.id);
      agent.emit("exec_command_end", {
        id: call.id,
        command,
        exitCode: output.exitCode,
        success: !failureType,
        durationMs: Math.max(0, Math.round(endTime - startTime))
      });
      agent.emit("tool_call_end", {
        id: call.id,
        name: call.name,
        success: !failureType,
        durationMs: Math.max(0, Math.round(endTime - startTime))
      });
      if (agent._activeTools.size > 0) {
        agent._setState("executing", { active: getActiveToolsSnapshot(agent) });
      }
      const resultMessage = buildToolResultMessage({
        callId: call.id,
        toolName: call.name,
        mcpResult
      });
      return { handled: true, resultMessage };
    }
    module.exports = { handleRunCommand };
  }
});

// utils/tools/special-update-plan.js
var require_special_update_plan = __commonJS({
  "utils/tools/special-update-plan.js"(exports, module) {
    function handleUpdatePlan({ agent, args }) {
      const explanation = args && typeof args.explanation === "string" ? args.explanation : void 0;
      const plan = args && Array.isArray(args.plan) ? args.plan : [];
      agent.currentPlan = plan;
      agent.emit("plan_updated", { explanation, plan });
      return { handled: false };
    }
    module.exports = { handleUpdatePlan };
  }
});

// utils/tools/special-user-input.js
var require_special_user_input = __commonJS({
  "utils/tools/special-user-input.js"(exports, module) {
    var { makeFailureFingerprint } = require_self_heal();
    var { recordToolFailure, clearToolFailure } = require_agent_self_heal();
    var { wrapToolOutput, buildToolResultMessage } = require_agent_tool_formatter();
    var { guardToolOutput } = require_agent_tool_output_guard();
    var { now, getActiveToolsSnapshot } = require_agent_timing();
    async function handleRequestUserInput({ agent, call, args, startTime }) {
      const questions = Array.isArray(args && args.questions) ? args.questions : typeof (args && args.question) === "string" ? [{ question: args.question, options: Array.isArray(args.options) ? args.options : void 0 }] : [];
      const waitPromise = agent._awaitUserInput(call.id, agent.toolTimeoutMs);
      const payload = { callId: call.id, questions };
      agent.emit("user_input_requested", payload);
      agent._setState("awaiting_input", { callId: call.id, questions });
      const result = await waitPromise;
      const output = result.timedOut ? { error: "Timeout", timeoutMs: agent.toolTimeoutMs, message: "User input timed out." } : { response: result.value };
      const guardedOutput = guardToolOutput({
        toolName: call.name,
        value: output,
        limits: agent && agent.toolOutputLimits
      });
      agent.emit("tool_result", { tool: call.name, args, result: guardedOutput });
      if (result.timedOut) {
        recordToolFailure({
          toolFailureStreak: agent._toolFailureStreak,
          toolName: call.name,
          fingerprintOrType: "timeout",
          args,
          makeFailureFingerprint
        });
      } else {
        clearToolFailure({ toolFailureStreak: agent._toolFailureStreak, toolName: call.name });
      }
      const mcpResult = wrapToolOutput({
        toolFailureStreak: agent._toolFailureStreak,
        toolName: call.name,
        output: guardedOutput,
        isError: result.timedOut,
        limits: agent && agent.toolOutputLimits
      });
      const endTime = now();
      agent._activeTools.delete(call.id);
      agent.emit("tool_call_end", {
        id: call.id,
        name: call.name,
        success: !result.timedOut,
        durationMs: Math.max(0, Math.round(endTime - startTime))
      });
      if (agent._activeTools.size > 0) {
        agent._setState("executing", { active: getActiveToolsSnapshot(agent) });
      } else {
        agent._setState("thinking", { reason: "user_input_received" });
      }
      const resultMessage = buildToolResultMessage({
        callId: call.id,
        toolName: call.name,
        mcpResult
      });
      return { handled: true, resultMessage };
    }
    module.exports = { handleRequestUserInput };
  }
});

// utils/agent-tool-specials.js
var require_agent_tool_specials = __commonJS({
  "utils/agent-tool-specials.js"(exports, module) {
    var { handleRunCommand } = require_special_run_command();
    var { handleUpdatePlan } = require_special_update_plan();
    var { handleRequestUserInput } = require_special_user_input();
    async function handleSpecialTool({ agent, call, args, startTime, signal }) {
      if (call.name === "run_command") {
        return handleRunCommand({ agent, call, args, startTime, signal });
      }
      if (call.name === "update_plan") {
        return handleUpdatePlan({ agent, call, args, startTime, signal });
      }
      if (call.name !== "request_user_input") {
        return { handled: false };
      }
      return handleRequestUserInput({ agent, call, args, startTime, signal });
    }
    module.exports = { handleSpecialTool };
  }
});

// utils/agent-tool-exec.js
var require_agent_tool_exec = __commonJS({
  "utils/agent-tool-exec.js"(exports, module) {
    var {
      DEFAULT_TOOL_TIMEOUT_MS,
      makeFailureFingerprint,
      stableStringify,
      isRateLimitLike
    } = require_self_heal();
    var {
      isBrowserRuntime,
      isBrowserEnvRestrictionLikeMessage,
      classifyToolFailure,
      recordToolFailure,
      clearToolFailure
    } = require_agent_self_heal();
    var { callToolWithTimeout } = require_agent_timeout();
    var { buildToolResultMessage, wrapToolOutput } = require_agent_tool_formatter();
    var { guardToolOutput } = require_agent_tool_output_guard();
    var { beginToolCall, emitToolResult, endToolCall } = require_agent_tool_exec_helpers();
    var { handleSpecialTool } = require_agent_tool_specials();
    var { now, getActiveToolsSnapshot } = require_agent_timing();
    var { RiskLevel } = require_imda_constants();
    var { getToolRisk } = require_agent_tools_registry();
    var { requireApprovalIfNeeded } = require_agent_tool_approval();
    async function executeToolCall({ agent, call, toolMeta, batchDecisions, signal }) {
      let startTime = null;
      let began = false;
      if (signal && signal.aborted) {
        let argsForBegin = null;
        try {
          argsForBegin = typeof call.arguments === "string" ? JSON.parse(call.arguments) : call.arguments;
        } catch {
          argsForBegin = null;
        }
        startTime = beginToolCall({ agent, call, args: argsForBegin, toolMeta });
        began = true;
        const output = { error: "Aborted", message: "Execution aborted." };
        const guardedOutput = emitToolResult({ agent, toolName: call.name, args: argsForBegin, output });
        const mcpResult = wrapToolOutput({
          toolFailureStreak: agent._toolFailureStreak,
          toolName: call.name,
          output: guardedOutput,
          isError: true,
          limits: agent && agent.toolOutputLimits
        });
        endToolCall({ agent, callId: call.id, toolName: call.name, startTime, success: false });
        return buildToolResultMessage({ callId: call.id, toolName: call.name, mcpResult });
      }
      const tool = agent.tools[call.name];
      if (!tool) {
        startTime = now();
        agent._activeTools.set(call.id, { id: call.id, name: call.name, startTime });
        began = true;
        agent.emit("tool_call_begin", { id: call.id, name: call.name, args: null, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
        agent._setState("executing", { toolCalls: toolMeta, active: getActiveToolsSnapshot(agent) });
        let argsForFingerprint;
        try {
          argsForFingerprint = typeof call.arguments === "string" ? JSON.parse(call.arguments) : call.arguments;
        } catch {
          argsForFingerprint = void 0;
        }
        const output = {
          error: "Tool not found",
          tool: call.name,
          hint: "Use list_available_skills to discover the correct tool, then read_skill_documentation before calling it."
        };
        const guardedOutput = emitToolResult({ agent, toolName: call.name, args: null, output });
        recordToolFailure({
          toolFailureStreak: agent._toolFailureStreak,
          toolName: call.name,
          fingerprintOrType: "tool_not_found",
          args: argsForFingerprint,
          makeFailureFingerprint
        });
        const mcpResult = wrapToolOutput({
          toolFailureStreak: agent._toolFailureStreak,
          toolName: call.name,
          output: guardedOutput,
          isError: true,
          limits: agent && agent.toolOutputLimits
        });
        const endTime = now();
        agent._activeTools.delete(call.id);
        agent.emit("tool_call_end", {
          id: call.id,
          name: call.name,
          success: false,
          durationMs: Math.max(0, Math.round(endTime - startTime))
        });
        agent._setState("executing", { active: getActiveToolsSnapshot(agent) });
        return buildToolResultMessage({ callId: call.id, toolName: call.name, mcpResult });
      }
      try {
        let args;
        args = typeof call.arguments === "string" ? JSON.parse(call.arguments) : call.arguments;
        const toolRisk = getToolRisk(agent, call.name, tool);
        const agentTier = agent.riskProfile ? agent.riskProfile.tier : RiskLevel.NONE;
        const approval = await requireApprovalIfNeeded({
          agent,
          call,
          tool,
          args,
          toolRisk,
          agentTier,
          batchDecisions
        });
        if (approval && approval.deniedResultMessage) return approval.deniedResultMessage;
        startTime = now();
        agent._activeTools.set(call.id, { id: call.id, name: call.name, startTime });
        began = true;
        agent.emit("tool_call_begin", { id: call.id, name: call.name, args, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
        agent._setState("executing", { toolCalls: toolMeta, active: getActiveToolsSnapshot(agent) });
        const special = await handleSpecialTool({ agent, call, args, startTime, signal });
        if (special && special.handled) {
          return special.resultMessage;
        }
        console.log(`  > Executing ${call.name} with args:`, args);
        const toolPromise = callToolWithTimeout({
          fn: () => tool.func(args),
          timeoutMs: agent.toolTimeoutMs,
          defaultTimeoutMs: DEFAULT_TOOL_TIMEOUT_MS
        }).then((value) => ({ kind: "tool", value })).catch((error) => ({ kind: "error", error }));
        const abortPromise = signal && typeof signal.addEventListener === "function" ? new Promise((resolve) => {
          if (signal.aborted) resolve({ kind: "abort" });
          else signal.addEventListener("abort", () => resolve({ kind: "abort" }), { once: true });
        }) : null;
        const outcome = abortPromise ? await Promise.race([toolPromise, abortPromise]) : await toolPromise;
        if (outcome && outcome.kind === "abort") {
          toolPromise.then(() => null, () => null);
          const output2 = { error: "Aborted", message: "Execution aborted." };
          const guardedOutput2 = emitToolResult({ agent, toolName: call.name, args, output: output2 });
          const mcpResult2 = wrapToolOutput({
            toolFailureStreak: agent._toolFailureStreak,
            toolName: call.name,
            output: guardedOutput2,
            isError: true,
            limits: agent && agent.toolOutputLimits
          });
          endToolCall({ agent, callId: call.id, toolName: call.name, startTime, success: false });
          return buildToolResultMessage({ callId: call.id, toolName: call.name, mcpResult: mcpResult2 });
        }
        if (outcome && outcome.kind === "error") throw outcome.error;
        const timed = outcome.value;
        const rawOutput = timed.timedOut ? {
          error: "Timeout",
          timeoutMs: agent.toolTimeoutMs,
          message: `Tool execution exceeded ${agent.toolTimeoutMs}ms`
        } : timed.value;
        let output = rawOutput === void 0 ? null : rawOutput;
        let formatError = false;
        if (!timed.timedOut) {
          try {
            JSON.stringify(output);
          } catch {
            formatError = true;
            try {
              output = JSON.parse(stableStringify(output));
            } catch {
              output = { error: "Format Error", message: "Tool output was not JSON serializable." };
            }
          }
        }
        const failureType = timed.timedOut ? "timeout" : formatError ? "format_error" : classifyToolFailure({
          toolName: call.name,
          output,
          isRateLimitLike
        });
        if (failureType) {
          recordToolFailure({
            toolFailureStreak: agent._toolFailureStreak,
            toolName: call.name,
            fingerprintOrType: failureType,
            args,
            makeFailureFingerprint
          });
        } else {
          clearToolFailure({ toolFailureStreak: agent._toolFailureStreak, toolName: call.name });
        }
        const guardedOutput = guardToolOutput({
          toolName: call.name,
          value: output,
          limits: agent && agent.toolOutputLimits
        });
        agent.emit("tool_result", {
          tool: call.name,
          args,
          result: guardedOutput
        });
        const mcpResult = wrapToolOutput({
          toolFailureStreak: agent._toolFailureStreak,
          toolName: call.name,
          output: guardedOutput,
          isError: Boolean(failureType),
          limits: agent && agent.toolOutputLimits
        });
        const endTime = now();
        agent._activeTools.delete(call.id);
        agent.emit("tool_call_end", {
          id: call.id,
          name: call.name,
          success: !failureType,
          durationMs: Math.max(0, Math.round(endTime - startTime))
        });
        if (agent._activeTools.size > 0) {
          agent._setState("executing", { active: getActiveToolsSnapshot(agent) });
        }
        return buildToolResultMessage({ callId: call.id, toolName: call.name, mcpResult });
      } catch (error) {
        console.error(`  > Error executing ${call.name}:`, error);
        agent.emit("tool_error", {
          tool: call.name,
          error: error.message
        });
        const errorMessage = String(error && error.message ? error.message : error);
        const errorCode = error && typeof error.code === "string" ? error.code : void 0;
        let argsForFingerprint;
        try {
          argsForFingerprint = typeof call.arguments === "string" ? JSON.parse(call.arguments) : call.arguments;
        } catch {
          argsForFingerprint = void 0;
        }
        const output = {
          error: "Tool execution failed",
          message: errorMessage,
          code: errorCode
        };
        const guardedOutput = emitToolResult({ agent, toolName: call.name, args: began ? argsForFingerprint : null, output });
        const failureType = classifyToolFailure({
          toolName: call.name,
          output,
          isRateLimitLike
        }) || (() => {
          if (isBrowserRuntime() && isBrowserEnvRestrictionLikeMessage(errorMessage)) {
            return "environment_restriction";
          }
          return isRateLimitLike(errorMessage) ? "rate_limited" : `exception:${errorMessage}`;
        })();
        recordToolFailure({
          toolFailureStreak: agent._toolFailureStreak,
          toolName: call.name,
          fingerprintOrType: failureType,
          args: argsForFingerprint,
          makeFailureFingerprint
        });
        const mcpResult = wrapToolOutput({
          toolFailureStreak: agent._toolFailureStreak,
          toolName: call.name,
          output: guardedOutput,
          isError: true,
          limits: agent && agent.toolOutputLimits
        });
        const endTime = now();
        if (began) {
          endToolCall({ agent, callId: call.id, toolName: call.name, startTime, success: false });
        }
        if (agent._activeTools.size > 0) {
          agent._setState("executing", { active: getActiveToolsSnapshot(agent) });
        } else {
          agent._setState("thinking", { reason: "tool_error" });
        }
        return buildToolResultMessage({ callId: call.id, toolName: call.name, mcpResult });
      }
    }
    module.exports = { executeToolCall };
  }
});

// utils/agent-tool-runner.js
var require_agent_tool_runner = __commonJS({
  "utils/agent-tool-runner.js"(exports, module) {
    var { prepareBatchApprovals } = require_agent_tool_approval();
    var { executeToolCall } = require_agent_tool_exec();
    function buildSyntheticToolPlan(toolCalls) {
      const lines = [];
      lines.push("Thought: I need to use tools to gather required information before answering.");
      lines.push("Plan:");
      toolCalls.forEach((call, idx) => {
        let argsPreview = "";
        try {
          const args = typeof call.arguments === "string" ? JSON.parse(call.arguments) : call.arguments || {};
          const compact = JSON.stringify(args);
          argsPreview = compact && compact !== "{}" ? ` with ${compact}` : "";
        } catch {
          argsPreview = "";
        }
        lines.push(`${idx + 1}. Call ${call.name}${argsPreview}.`);
      });
      lines.push("Action: Calling tool(s) now.");
      return lines.join("\n") + "\n";
    }
    async function executeTools(agent, toolCalls, options = {}) {
      const results = [];
      agent._activeTools.clear();
      const toolMeta = toolCalls.map((call) => ({ id: call.id, name: call.name }));
      agent._setState("thinking", { reason: "tools_planned", toolCalls: toolMeta });
      const { needsApproval, batchDecisions } = await prepareBatchApprovals({ agent, toolCalls });
      const signal = options && options.signal ? options.signal : null;
      const handleCall = (call) => executeToolCall({ agent, call, toolMeta, batchDecisions, signal });
      const outputs = needsApproval ? await (async () => {
        const ordered = [];
        for (const call of toolCalls) {
          ordered.push(await handleCall(call));
        }
        return ordered;
      })() : await Promise.all(toolCalls.map(handleCall));
      agent._activeTools.clear();
      agent._setState("thinking", { reason: "tools_completed", toolCount: toolCalls.length });
      return outputs.length ? outputs : results;
    }
    module.exports = { executeTools, buildSyntheticToolPlan };
  }
});

// utils/token-estimator.js
var require_token_estimator = __commonJS({
  "utils/token-estimator.js"(exports, module) {
    var APPROX_BYTES_PER_TOKEN = 4;
    var cachedEncoder = null;
    function getTextEncoder() {
      if (cachedEncoder) return cachedEncoder;
      if (typeof TextEncoder !== "undefined") {
        cachedEncoder = new TextEncoder();
      }
      return cachedEncoder;
    }
    function byteLength(text) {
      if (typeof text !== "string" || text.length === 0) return 0;
      const encoder = getTextEncoder();
      if (encoder) return encoder.encode(text).length;
      if (typeof Buffer !== "undefined") return Buffer.byteLength(text, "utf8");
      return text.length;
    }
    function approxTokensFromBytes(bytes) {
      const count = Number(bytes) || 0;
      return Math.ceil(count / APPROX_BYTES_PER_TOKEN);
    }
    function estimateTextTokens(text) {
      return approxTokensFromBytes(byteLength(text));
    }
    function estimateStructuredTokens(text) {
      return approxTokensFromBytes(byteLength(text));
    }
    function isToolResultMessage(msg) {
      return !!(msg && (msg.role === "system" || msg.role === "tool") && typeof msg.tool_call_id === "string");
    }
    function estimateTokensForMessage(msg) {
      if (!msg || typeof msg !== "object") return 0;
      try {
        const serialized = JSON.stringify(msg);
        return estimateStructuredTokens(serialized);
      } catch {
        return 0;
      }
    }
    function estimateTokensHeuristic(history) {
      if (!Array.isArray(history)) return 0;
      let tokens = 0;
      for (const msg of history) {
        tokens += estimateTokensForMessage(msg);
      }
      return tokens;
    }
    function estimateTokens(history) {
      if (!Array.isArray(history)) return 0;
      let baselineIdx = -1;
      let baselineTokens = 0;
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        const value = msg && Object.prototype.hasOwnProperty.call(msg, "_tokenUsagePrompt") ? Number(msg._tokenUsagePrompt) : NaN;
        if (Number.isFinite(value)) {
          baselineIdx = i;
          baselineTokens = value;
          break;
        }
      }
      if (baselineIdx >= 0) {
        const tail = history.slice(baselineIdx + 1);
        return baselineTokens + estimateTokensHeuristic(tail);
      }
      return estimateTokensHeuristic(history);
    }
    module.exports = {
      APPROX_BYTES_PER_TOKEN,
      estimateTokens,
      estimateTokensHeuristic,
      estimateTokensForMessage,
      estimateTextTokens,
      estimateStructuredTokens,
      approxTokensFromBytes,
      isToolResultMessage
    };
  }
});

// utils/context-normalization.js
var require_context_normalization = __commonJS({
  "utils/context-normalization.js"(exports, module) {
    var { isToolResultMessage } = require_token_estimator();
    function buildToolCallMaps(history) {
      const callIdToAssistantIndex = /* @__PURE__ */ new Map();
      const callIdToResultIndices = /* @__PURE__ */ new Map();
      for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        if (!msg || typeof msg !== "object") continue;
        if (msg.role === "assistant" && Array.isArray(msg.tool_calls)) {
          for (const tc of msg.tool_calls) {
            if (!tc || typeof tc.id !== "string") continue;
            if (!callIdToAssistantIndex.has(tc.id)) callIdToAssistantIndex.set(tc.id, i);
          }
        }
        if (isToolResultMessage(msg) && typeof msg.tool_call_id === "string") {
          const list = callIdToResultIndices.get(msg.tool_call_id) || [];
          list.push(i);
          callIdToResultIndices.set(msg.tool_call_id, list);
        }
      }
      return { callIdToAssistantIndex, callIdToResultIndices };
    }
    function buildAbortedToolResult(callId, name) {
      const msg = {
        role: "system",
        tool_call_id: callId,
        content: JSON.stringify({
          content: [{ type: "text", text: "aborted" }],
          isError: true
        })
      };
      if (typeof name === "string") msg.name = name;
      return msg;
    }
    function normalizeToolResultMessage(msg, name) {
      if (!msg || typeof msg !== "object") return msg;
      if (typeof name !== "string" || msg.name) return msg;
      return { ...msg, name };
    }
    function enforceToolIntegrity(selectedIndices, history) {
      const kept = new Set(selectedIndices);
      const { callIdToAssistantIndex, callIdToResultIndices } = buildToolCallMaps(history);
      for (const [callId, resIdxs] of callIdToResultIndices.entries()) {
        const assistantIdx = callIdToAssistantIndex.get(callId);
        const assistantKept = typeof assistantIdx === "number" && kept.has(assistantIdx);
        if (!assistantKept) {
          for (const idx of resIdxs) kept.delete(idx);
        }
      }
      return Array.from(kept).sort((a, b) => a - b);
    }
    function normalizeHistory(history) {
      if (!Array.isArray(history)) return history;
      const assistantCallIds = /* @__PURE__ */ new Set();
      const callIdToToolName = /* @__PURE__ */ new Map();
      for (const msg of history) {
        if (!msg || msg.role !== "assistant" || !Array.isArray(msg.tool_calls)) continue;
        for (const tc of msg.tool_calls) {
          if (!tc || typeof tc.id !== "string") continue;
          assistantCallIds.add(tc.id);
          if (typeof tc.name === "string" && !callIdToToolName.has(tc.id)) {
            callIdToToolName.set(tc.id, tc.name);
          }
        }
      }
      const callIdToResultMsg = /* @__PURE__ */ new Map();
      for (const msg of history) {
        if (!isToolResultMessage(msg)) continue;
        if (!assistantCallIds.has(msg.tool_call_id)) continue;
        if (!callIdToResultMsg.has(msg.tool_call_id)) {
          callIdToResultMsg.set(msg.tool_call_id, msg);
        }
      }
      const out = [];
      for (const msg of history) {
        if (isToolResultMessage(msg)) {
          continue;
        }
        out.push(msg);
        if (!msg || msg.role !== "assistant" || !Array.isArray(msg.tool_calls)) continue;
        for (const tc of msg.tool_calls) {
          if (!tc || typeof tc.id !== "string") continue;
          const name = typeof tc.name === "string" ? tc.name : callIdToToolName.get(tc.id);
          const existing = callIdToResultMsg.get(tc.id);
          if (existing) {
            out.push(normalizeToolResultMessage(existing, name));
            continue;
          }
          out.push(buildAbortedToolResult(tc.id, name));
        }
      }
      return out;
    }
    module.exports = {
      enforceToolIntegrity,
      normalizeHistory
    };
  }
});

// utils/context-manager.js
var require_context_manager = __commonJS({
  "utils/context-manager.js"(exports, module) {
    var { estimateTokens, isToolResultMessage } = require_token_estimator();
    var { enforceToolIntegrity, normalizeHistory } = require_context_normalization();
    function isInstructionLikeUserMessage(msg) {
      if (!msg || msg.role !== "user") return false;
      if (typeof msg.content !== "string") return false;
      const trimmed = msg.content.trimStart();
      const lowered = trimmed.toLowerCase();
      const summaryPrefix = "Another language model started to solve this problem";
      return trimmed.startsWith("# AGENTS.md instructions for ") || trimmed.startsWith("<user_instructions>") || trimmed.startsWith("<skill") || lowered.startsWith("<environment_context>") || lowered.startsWith("<turn_aborted>") || trimmed.startsWith(summaryPrefix);
    }
    function filterPromptHistory(history) {
      if (!Array.isArray(history)) return [];
      return history.filter((msg) => {
        if (!msg || typeof msg !== "object") return false;
        if (msg.role !== "system" && msg.role !== "tool") return true;
        return isToolResultMessage(msg);
      });
    }
    function groupSelectedIntoAtoms(selectedIndices, history, headCount, protectedIndices) {
      const selectedSet = new Set(selectedIndices);
      const protectedSet = protectedIndices instanceof Set ? protectedIndices : /* @__PURE__ */ new Set();
      const callIdToAssistantIndex = /* @__PURE__ */ new Map();
      const callIdToResultIndices = /* @__PURE__ */ new Map();
      for (const idx of selectedIndices) {
        const msg = history[idx];
        if (!msg || typeof msg !== "object") continue;
        if (msg.role === "assistant" && Array.isArray(msg.tool_calls)) {
          for (const tc of msg.tool_calls) {
            if (!tc || typeof tc.id !== "string") continue;
            if (!callIdToAssistantIndex.has(tc.id)) callIdToAssistantIndex.set(tc.id, idx);
          }
        }
        if (isToolResultMessage(msg)) {
          const list = callIdToResultIndices.get(msg.tool_call_id) || [];
          list.push(idx);
          callIdToResultIndices.set(msg.tool_call_id, list);
        }
      }
      const assistantIndexToResultIndices = /* @__PURE__ */ new Map();
      for (const [callId, resIdxs] of callIdToResultIndices.entries()) {
        const assistantIdx = callIdToAssistantIndex.get(callId);
        if (typeof assistantIdx !== "number") continue;
        const list = assistantIndexToResultIndices.get(assistantIdx) || [];
        for (const rIdx of resIdxs) list.push(rIdx);
        assistantIndexToResultIndices.set(assistantIdx, list);
      }
      const assigned = /* @__PURE__ */ new Set();
      const atoms = [];
      for (const idx of selectedIndices) {
        if (assigned.has(idx)) continue;
        const msg = history[idx];
        let atomIndices = [idx];
        if (msg && msg.role === "assistant" && Array.isArray(msg.tool_calls)) {
          const resIdxs = assistantIndexToResultIndices.get(idx) || [];
          for (const rIdx of resIdxs) {
            if (selectedSet.has(rIdx)) atomIndices.push(rIdx);
          }
        }
        atomIndices = Array.from(new Set(atomIndices)).sort((a, b) => a - b);
        for (const i of atomIndices) assigned.add(i);
        atoms.push({
          indices: atomIndices,
          protected: atomIndices.some((i) => i < headCount || protectedSet.has(i)),
          minIndex: atomIndices[0]
        });
      }
      return atoms.sort((a, b) => a.minIndex - b.minIndex);
    }
    function truncateWithMarker(text, maxChars) {
      if (typeof text !== "string") return text;
      if (!Number.isFinite(maxChars) || maxChars <= 0) {
        const removed2 = text.length;
        return `\u2026${removed2} chars truncated\u2026`;
      }
      if (text.length <= maxChars) return text;
      const removed = text.length - maxChars;
      const left = Math.floor(maxChars / 2);
      const right = Math.max(0, maxChars - left);
      const prefix = text.slice(0, left);
      const suffix = right > 0 ? text.slice(text.length - right) : "";
      return `${prefix}\u2026${removed} chars truncated\u2026${suffix}`;
    }
    function maybeTruncateLargeToolOutputs(history, { maxToolOutputChars } = {}) {
      if (!maxToolOutputChars || !Array.isArray(history)) return history;
      const cap = Number(maxToolOutputChars);
      if (!Number.isFinite(cap) || cap <= 0) return history;
      return history.map((msg) => {
        if (!msg || typeof msg !== "object") return msg;
        if (msg.role !== "system" && msg.role !== "tool") return msg;
        if (typeof msg.content !== "string") return msg;
        if (msg.content.length <= cap) return msg;
        return {
          ...msg,
          content: truncateWithMarker(msg.content, cap)
        };
      });
    }
    var ContextManager = class {
      constructor(options = {}) {
        this.defaults = {
          maxMessages: 16,
          preserveHeadMessages: 2,
          protectRecentMessages: 0,
          maxEstimatedTokens: void 0,
          maxToolOutputChars: void 0,
          ...options
        };
      }
      process(history, options = {}) {
        const cfg = { ...this.defaults, ...options };
        const fullLength = Array.isArray(history) ? history.length : 0;
        const original = filterPromptHistory(history);
        const maxMessages = Math.max(1, Number(cfg.maxMessages) || 16);
        const preserveHeadMessages = Math.max(0, Math.min(maxMessages, Number(cfg.preserveHeadMessages) || 0));
        const protectRecentMessages = Math.max(0, Math.min(original.length, Number(cfg.protectRecentMessages) || 0));
        const protectedIndices = /* @__PURE__ */ new Set();
        if (protectRecentMessages > 0) {
          const start = Math.max(0, original.length - protectRecentMessages);
          for (let i = start; i < original.length; i++) protectedIndices.add(i);
        }
        for (let i = 0; i < original.length; i++) {
          if (isInstructionLikeUserMessage(original[i])) protectedIndices.add(i);
        }
        const headCount = Math.min(preserveHeadMessages, original.length, maxMessages);
        let selected;
        if (original.length <= maxMessages) {
          selected = Array.from({ length: original.length }, (_, i) => i);
        } else {
          const tailCount = Math.max(0, maxMessages - headCount);
          const indices = /* @__PURE__ */ new Set();
          for (let i = 0; i < headCount; i++) indices.add(i);
          const tailStart = Math.max(headCount, original.length - tailCount);
          for (let i = tailStart; i < original.length; i++) indices.add(i);
          for (const idx of protectedIndices) indices.add(idx);
          selected = Array.from(indices).sort((a, b) => a - b);
        }
        selected = enforceToolIntegrity(selected, original);
        const maxEstimatedTokens = cfg.maxEstimatedTokens;
        if (Number.isFinite(Number(maxEstimatedTokens))) {
          const cap = Number(maxEstimatedTokens);
          while (true) {
            const current = selected.map((i) => original[i]);
            const currentTokens = estimateTokens(normalizeHistory(current));
            if (currentTokens <= cap) break;
            const atoms = groupSelectedIntoAtoms(selected, original, headCount, protectedIndices);
            const removableAtoms = atoms.filter((atom) => !atom.protected);
            if (removableAtoms.length === 0) break;
            const dropAtom = removableAtoms[0];
            const dropSet = new Set(dropAtom.indices);
            selected = selected.filter((i) => !dropSet.has(i));
            selected = enforceToolIntegrity(selected, original);
          }
        }
        let outHistory = selected.map((i) => original[i]);
        outHistory = normalizeHistory(outHistory);
        outHistory = maybeTruncateLargeToolOutputs(outHistory, cfg);
        return {
          history: outHistory,
          meta: {
            dropped: Math.max(0, fullLength - outHistory.length),
            estimatedTokens: estimateTokens(outHistory)
          }
        };
      }
    };
    module.exports = { ContextManager, estimateTokens };
  }
});

// utils/agent-state.js
var require_agent_state = __commonJS({
  "utils/agent-state.js"(exports, module) {
    var { estimateTokens } = require_context_manager();
    var { safeJsonStringify } = require_self_heal();
    function dumpSnapshot(agent) {
      const toolFailureStreak = agent._toolFailureStreak instanceof Map ? Object.fromEntries(agent._toolFailureStreak.entries()) : {};
      return {
        version: "1.0",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: agent.status,
        systemPrompt: agent.systemPrompt,
        history: agent.history,
        currentPlan: agent.currentPlan,
        decisionTraces: Array.isArray(agent._decisionTraces) ? agent._decisionTraces : [],
        toolFailureStreak
      };
    }
    function loadSnapshot(agent, snapshot, { emitPlanEvent = true } = {}) {
      if (!snapshot || typeof snapshot !== "object") return false;
      if (Array.isArray(snapshot.history)) {
        agent.history = snapshot.history;
      }
      if (typeof snapshot.systemPrompt === "string") {
        agent.systemPrompt = snapshot.systemPrompt;
      }
      agent.currentPlan = Array.isArray(snapshot.currentPlan) ? snapshot.currentPlan : snapshot.currentPlan || null;
      agent.status = typeof snapshot.status === "string" ? snapshot.status : "idle";
      if (snapshot.toolFailureStreak && typeof snapshot.toolFailureStreak === "object") {
        agent._toolFailureStreak = new Map(Object.entries(snapshot.toolFailureStreak));
      }
      agent._decisionTraces = Array.isArray(snapshot.decisionTraces) ? snapshot.decisionTraces : [];
      if (emitPlanEvent && agent.currentPlan) {
        agent.emit("plan_updated", { explanation: "Snapshot restored", plan: agent.currentPlan });
      }
      return true;
    }
    function setState(agent, status, metadata = {}) {
      const previous = agent.status;
      const snapshot = {
        ...metadata,
        historyLength: agent.history.length,
        estimatedTokens: estimateTokens(agent.history)
      };
      const metaString = safeJsonStringify(snapshot);
      if (previous === status && metaString === agent._lastStateMeta) return;
      agent.status = status;
      agent._lastStateMeta = metaString;
      agent.emit("state_changed", {
        status,
        previous,
        metadata: snapshot,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    function getState(agent) {
      return {
        status: agent.status,
        currentPlan: agent.currentPlan,
        historyLength: agent.history.length,
        estimatedTokens: estimateTokens(agent.history)
      };
    }
    module.exports = {
      dumpSnapshot,
      loadSnapshot,
      setState,
      getState
    };
  }
});

// config.js
var require_config = __commonJS({
  "config.js"(exports, module) {
    var CONFIG = {
      agent: {
        maxTurns: 50,
        maxProtectedRecentMessages: 12,
        // Optional: Tool output guard limits.
        // This prevents huge tool results (stdout/html/json) from bloating history/trace/UI.
        // toolOutputLimits: {
        //     maxStringChars: 12000,
        //     headChars: 8000,
        //     tailChars: 2000,
        //     maxArrayItems: 60,
        //     maxObjectKeys: 60,
        //     maxDepth: 5,
        // },
        compaction: {
          enabled: true,
          triggerMessages: 30,
          triggerTokens: null,
          keepRecentMessages: 8,
          maxSummaryChars: 2e4,
          maxMessageChars: 2e3,
          maxUserMessageTokens: 2e4
        }
      }
    };
    if (typeof globalThis !== "undefined") {
      if (!globalThis.AGENTS_DEFAULT_CONFIG) {
        globalThis.AGENTS_DEFAULT_CONFIG = CONFIG;
      }
    }
    module.exports = CONFIG;
  }
});

// utils/config.js
var require_config2 = __commonJS({
  "utils/config.js"(exports, module) {
    var DEFAULT_EPISODIC_NODE_PATH = "memory/episodic-memory.jsonl";
    var RAG_DEFAULTS = Object.freeze({
      enabled: true,
      topK: 5,
      minScore: 0.2,
      maxContextChars: 6e3,
      autoSave: true,
      memoryFirst: false,
      autoMemoryPrecheck: false,
      browserStoreName: "agents_memory_v1"
    });
    var DEFAULT_CONFIG = {
      agent: {
        maxTurns: 50,
        maxProtectedRecentMessages: 12,
        debug: false,
        approvalPolicy: "always",
        trustedTools: [],
        toolOutputLimits: null,
        compaction: {
          enabled: true,
          triggerMessages: 30,
          triggerTokens: null,
          keepRecentMessages: 8,
          maxSummaryChars: 2e4,
          maxMessageChars: 2e3,
          maxUserMessageTokens: 2e4
        },
        rag: {
          enabled: RAG_DEFAULTS.enabled,
          topK: RAG_DEFAULTS.topK,
          minScore: RAG_DEFAULTS.minScore,
          maxContextChars: RAG_DEFAULTS.maxContextChars,
          autoSave: RAG_DEFAULTS.autoSave,
          memoryFirst: RAG_DEFAULTS.memoryFirst,
          autoMemoryPrecheck: RAG_DEFAULTS.autoMemoryPrecheck,
          fixedJsonlPaths: [],
          episodicStoreNodePath: DEFAULT_EPISODIC_NODE_PATH,
          browserStoreName: RAG_DEFAULTS.browserStoreName
        }
      }
    };
    var TOOL_OUTPUT_LIMIT_KEYS = ["maxStringChars", "headChars", "tailChars", "maxArrayItems", "maxObjectKeys", "maxDepth"];
    var APPROVAL_POLICY_VALUES = /* @__PURE__ */ new Set(["always", "unless_trusted", "never"]);
    function normalizeApprovalPolicy(value) {
      if (typeof value !== "string") return null;
      const v = value.trim().toLowerCase();
      return APPROVAL_POLICY_VALUES.has(v) ? v : null;
    }
    function normalizeStringList(input) {
      if (!input) return [];
      if (Array.isArray(input)) {
        const out = input.map((v) => typeof v === "string" ? v.trim() : String(v || "").trim()).filter(Boolean);
        return Array.from(new Set(out));
      }
      if (typeof input === "string") {
        const out = input.split(",").map((s) => s.trim()).filter(Boolean);
        return Array.from(new Set(out));
      }
      return [];
    }
    function toBoolean(value, fallback) {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value !== 0;
      if (typeof value !== "string") return fallback;
      const v = value.trim().toLowerCase();
      if (["1", "true", "yes", "on"].includes(v)) return true;
      if (["0", "false", "no", "off"].includes(v)) return false;
      return fallback;
    }
    function loadFileConfig() {
      try {
        return require_config();
      } catch {
        return null;
      }
    }
    function loadGlobalConfig() {
      if (typeof globalThis === "undefined") return null;
      return globalThis.AGENTS_CONFIG || globalThis.AGENTS_DEFAULT_CONFIG || null;
    }
    function normalizeConfig(input) {
      return input && typeof input === "object" ? input : {};
    }
    function normalizeToolOutputLimits(input) {
      if (!input || typeof input !== "object" || Array.isArray(input)) return null;
      const out = {};
      for (const key of TOOL_OUTPUT_LIMIT_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
        const n = Number(input[key]);
        if (!Number.isFinite(n)) continue;
        const v = Math.floor(n);
        if (v < 0) continue;
        if (key === "maxDepth" && v < 1) continue;
        out[key] = v;
      }
      return Object.keys(out).length > 0 ? out : null;
    }
    function mergeAgentConfig(base, override) {
      const out = { ...base };
      if (!override || typeof override !== "object") return out;
      if (!override.agent || typeof override.agent !== "object") return out;
      const src = override.agent;
      out.agent = { ...out.agent };
      if (Number.isFinite(src.maxTurns)) out.agent.maxTurns = src.maxTurns;
      if (Number.isFinite(src.maxProtectedRecentMessages)) out.agent.maxProtectedRecentMessages = src.maxProtectedRecentMessages;
      if (typeof src.debug === "boolean") out.agent.debug = src.debug;
      if (Object.prototype.hasOwnProperty.call(src, "approvalPolicy")) {
        const normalized = normalizeApprovalPolicy(src.approvalPolicy);
        if (normalized) out.agent.approvalPolicy = normalized;
      }
      if (Object.prototype.hasOwnProperty.call(src, "trustedTools")) {
        const raw = src.trustedTools;
        if (Array.isArray(raw) || typeof raw === "string") {
          out.agent.trustedTools = normalizeStringList(raw);
        }
      }
      if (Object.prototype.hasOwnProperty.call(src, "toolOutputLimits")) {
        const normalized = normalizeToolOutputLimits(src.toolOutputLimits);
        if (normalized) out.agent.toolOutputLimits = normalized;
      }
      if (src.compaction && typeof src.compaction === "object") {
        out.agent.compaction = { ...out.agent.compaction };
        const c = src.compaction;
        if (typeof c.enabled === "boolean") out.agent.compaction.enabled = c.enabled;
        if (Number.isFinite(c.triggerMessages)) out.agent.compaction.triggerMessages = c.triggerMessages;
        if (Number.isFinite(c.triggerTokens)) out.agent.compaction.triggerTokens = c.triggerTokens;
        if (Number.isFinite(c.keepRecentMessages)) out.agent.compaction.keepRecentMessages = c.keepRecentMessages;
        if (Number.isFinite(c.maxSummaryChars)) out.agent.compaction.maxSummaryChars = c.maxSummaryChars;
        if (Number.isFinite(c.maxMessageChars)) out.agent.compaction.maxMessageChars = c.maxMessageChars;
        if (Number.isFinite(c.maxUserMessageTokens)) out.agent.compaction.maxUserMessageTokens = c.maxUserMessageTokens;
      }
      if (src.rag && typeof src.rag === "object") {
        out.agent.rag = { ...out.agent.rag };
        const r = src.rag;
        if (Object.prototype.hasOwnProperty.call(r, "enabled")) out.agent.rag.enabled = toBoolean(r.enabled, out.agent.rag.enabled);
        if (Number.isFinite(r.topK)) out.agent.rag.topK = Math.max(1, Math.floor(r.topK));
        if (Number.isFinite(r.minScore)) out.agent.rag.minScore = Number(r.minScore);
        if (Number.isFinite(r.maxContextChars)) out.agent.rag.maxContextChars = Math.max(256, Math.floor(r.maxContextChars));
        if (Object.prototype.hasOwnProperty.call(r, "autoSave")) out.agent.rag.autoSave = toBoolean(r.autoSave, out.agent.rag.autoSave);
        if (Object.prototype.hasOwnProperty.call(r, "memoryFirst")) out.agent.rag.memoryFirst = toBoolean(r.memoryFirst, out.agent.rag.memoryFirst);
        if (Object.prototype.hasOwnProperty.call(r, "autoMemoryPrecheck")) out.agent.rag.autoMemoryPrecheck = toBoolean(r.autoMemoryPrecheck, out.agent.rag.autoMemoryPrecheck);
        if (Array.isArray(r.fixedJsonlPaths) || typeof r.fixedJsonlPaths === "string") {
          out.agent.rag.fixedJsonlPaths = normalizeStringList(r.fixedJsonlPaths);
        }
        if (typeof r.episodicStoreNodePath === "string" && r.episodicStoreNodePath.trim()) {
          out.agent.rag.episodicStoreNodePath = r.episodicStoreNodePath.trim();
        }
        if (typeof r.browserStoreName === "string" && r.browserStoreName.trim()) {
          out.agent.rag.browserStoreName = r.browserStoreName.trim();
        }
      }
      return out;
    }
    function applyEnvOverrides(inputConfig) {
      if (typeof process === "undefined" || !process || !process.env) return inputConfig;
      let config = inputConfig;
      const maxTurnsRaw = process.env.AGENTS_MAX_TURNS;
      if (maxTurnsRaw && Number.isFinite(Number(maxTurnsRaw))) {
        const parsed = Number(maxTurnsRaw);
        if (parsed > 0) config = mergeAgentConfig(config, { agent: { maxTurns: parsed } });
      }
      const debugRaw = process.env.AGENTS_DEBUG;
      if (debugRaw !== void 0) {
        const normalized = String(debugRaw).toLowerCase();
        const enabled = normalized === "1" || normalized === "true" || normalized === "yes";
        config = mergeAgentConfig(config, { agent: { debug: enabled } });
      }
      const maxProtectedRaw = process.env.AGENTS_MAX_PROTECTED_RECENT;
      if (maxProtectedRaw && Number.isFinite(Number(maxProtectedRaw))) {
        const parsed = Number(maxProtectedRaw);
        if (parsed > 0) config = mergeAgentConfig(config, { agent: { maxProtectedRecentMessages: parsed } });
      }
      const approvalPolicyRaw = process.env.AGENTS_APPROVAL_POLICY;
      if (approvalPolicyRaw) {
        const normalized = normalizeApprovalPolicy(String(approvalPolicyRaw));
        if (normalized) config = mergeAgentConfig(config, { agent: { approvalPolicy: normalized } });
      }
      const trustedToolsJson = process.env.AGENTS_TRUSTED_TOOLS_JSON;
      if (trustedToolsJson) {
        try {
          const parsed = JSON.parse(String(trustedToolsJson));
          config = mergeAgentConfig(config, { agent: { trustedTools: parsed } });
        } catch {
        }
      }
      const trustedToolsRaw = process.env.AGENTS_TRUSTED_TOOLS;
      if (trustedToolsRaw) {
        config = mergeAgentConfig(config, { agent: { trustedTools: String(trustedToolsRaw) } });
      }
      const triggerTokensRaw = process.env.AGENTS_COMPACTION_TRIGGER_TOKENS;
      if (triggerTokensRaw && Number.isFinite(Number(triggerTokensRaw))) {
        const parsed = Number(triggerTokensRaw);
        if (parsed > 0) config = mergeAgentConfig(config, { agent: { compaction: { triggerTokens: parsed } } });
      }
      const toolOutputLimitsJson = process.env.AGENTS_TOOL_OUTPUT_LIMITS_JSON;
      if (toolOutputLimitsJson) {
        try {
          const parsed = JSON.parse(String(toolOutputLimitsJson));
          config = mergeAgentConfig(config, { agent: { toolOutputLimits: parsed } });
        } catch {
        }
      }
      if (process.env.AGENTS_RAG_ENABLED !== void 0) {
        config = mergeAgentConfig(config, { agent: { rag: { enabled: process.env.AGENTS_RAG_ENABLED } } });
      }
      if (process.env.AGENTS_RAG_TOPK !== void 0 && Number.isFinite(Number(process.env.AGENTS_RAG_TOPK))) {
        config = mergeAgentConfig(config, { agent: { rag: { topK: Number(process.env.AGENTS_RAG_TOPK) } } });
      }
      if (process.env.AGENTS_RAG_MIN_SCORE !== void 0 && Number.isFinite(Number(process.env.AGENTS_RAG_MIN_SCORE))) {
        config = mergeAgentConfig(config, { agent: { rag: { minScore: Number(process.env.AGENTS_RAG_MIN_SCORE) } } });
      }
      return config;
    }
    function getAgentConfig(overrides = null) {
      const fileConfig = normalizeConfig(loadFileConfig());
      const globalConfig = normalizeConfig(loadGlobalConfig());
      const overrideConfig = normalizeConfig(overrides);
      let config = mergeAgentConfig(DEFAULT_CONFIG, fileConfig);
      config = mergeAgentConfig(config, globalConfig);
      config = mergeAgentConfig(config, overrideConfig);
      config = applyEnvOverrides(config);
      return config;
    }
    module.exports = {
      DEFAULT_CONFIG,
      getAgentConfig
    };
  }
});

// utils/agent-setup.js
var require_agent_setup = __commonJS({
  "utils/agent-setup.js"(exports, module) {
    var { ContextManager } = require_context_manager();
    var { registerTools } = require_agent_tools_registry();
    var { DEFAULT_TOOL_TIMEOUT_MS, DEFAULT_APPROVAL_TIMEOUT_MS } = require_self_heal();
    var { getAgentConfig } = require_config2();
    var { RiskLevel, normalizeRiskLevel } = require_imda_constants();
    function normalizeRagConfigLite(input) {
      const raw = input && typeof input === "object" ? input : {};
      return {
        enabled: raw.enabled !== false,
        topK: Number.isFinite(Number(raw.topK)) ? Math.max(1, Math.floor(Number(raw.topK))) : 5,
        minScore: Number.isFinite(Number(raw.minScore)) ? Number(raw.minScore) : 0.2,
        maxContextChars: Number.isFinite(Number(raw.maxContextChars)) ? Math.max(256, Math.floor(Number(raw.maxContextChars))) : 6e3,
        autoSave: raw.autoSave !== false,
        memoryFirst: raw.memoryFirst === true,
        autoMemoryPrecheck: raw.autoMemoryPrecheck === true,
        fixedJsonlPaths: Array.isArray(raw.fixedJsonlPaths) ? raw.fixedJsonlPaths : [],
        episodicStoreNodePath: typeof raw.episodicStoreNodePath === "string" ? raw.episodicStoreNodePath : "",
        browserStoreName: typeof raw.browserStoreName === "string" ? raw.browserStoreName : "agents_memory_v1"
      };
    }
    function initializeAgentState(agent, {
      llm,
      tools = [],
      systemPrompt = "You are a helpful AI assistant.",
      toolTimeoutMs,
      approvalTimeoutMs,
      approvalPolicy,
      trustedTools,
      toolOutputLimits,
      maxTurns,
      compaction,
      maxProtectedRecentMessages,
      identity,
      riskProfile,
      ragConfig,
      ragService
    } = {}) {
      agent.llm = llm;
      const { toolMap, registry } = registerTools(tools);
      agent.tools = toolMap;
      agent.toolRegistry = registry;
      agent.systemPrompt = systemPrompt;
      agent.history = [];
      agent.status = "idle";
      agent.currentPlan = null;
      agent._decisionTraces = [];
      agent._pendingUserInputs = /* @__PURE__ */ new Map();
      agent._pendingInputs = [];
      agent._activeTools = /* @__PURE__ */ new Map();
      agent._lastStateMeta = null;
      const cfg = getAgentConfig({ agent: { maxTurns, compaction, toolOutputLimits, approvalPolicy, trustedTools } });
      agent.maxTurns = typeof maxTurns === "number" && Number.isFinite(maxTurns) && maxTurns > 0 ? Math.floor(maxTurns) : cfg.agent.maxTurns;
      agent.debug = Boolean(cfg.agent.debug);
      agent.compaction = cfg.agent.compaction || null;
      agent.maxProtectedRecentMessages = typeof maxProtectedRecentMessages === "number" && Number.isFinite(maxProtectedRecentMessages) && maxProtectedRecentMessages > 0 ? Math.floor(maxProtectedRecentMessages) : cfg.agent.maxProtectedRecentMessages;
      agent.toolTimeoutMs = typeof toolTimeoutMs === "number" && Number.isFinite(toolTimeoutMs) && toolTimeoutMs > 0 ? toolTimeoutMs : DEFAULT_TOOL_TIMEOUT_MS;
      agent.approvalTimeoutMs = typeof approvalTimeoutMs === "number" && Number.isFinite(approvalTimeoutMs) && approvalTimeoutMs > 0 ? approvalTimeoutMs : DEFAULT_APPROVAL_TIMEOUT_MS;
      agent.approvalPolicy = cfg.agent && typeof cfg.agent.approvalPolicy === "string" ? String(cfg.agent.approvalPolicy) : "always";
      agent.trustedTools = cfg.agent && Array.isArray(cfg.agent.trustedTools) ? cfg.agent.trustedTools.map((t) => String(t)).filter(Boolean) : [];
      agent.toolOutputLimits = cfg.agent && cfg.agent.toolOutputLimits && typeof cfg.agent.toolOutputLimits === "object" ? { ...cfg.agent.toolOutputLimits } : null;
      const mergedRag = {
        ...cfg.agent && cfg.agent.rag && typeof cfg.agent.rag === "object" ? cfg.agent.rag : null,
        ...ragConfig && typeof ragConfig === "object" ? ragConfig : null
      };
      agent.ragConfig = normalizeRagConfigLite(mergedRag);
      agent.ragService = ragService || null;
      agent._toolFailureStreak = /* @__PURE__ */ new Map();
      agent._approvalGrants = /* @__PURE__ */ new Set();
      agent._approvalDenies = /* @__PURE__ */ new Set();
      agent._approvalDeniedThisTurn = false;
      agent._approvalDenyHints = /* @__PURE__ */ new Set();
      agent._memoryFirstGuardCount = 0;
      agent._citationGuardCount = 0;
      agent._knowledgeSelectedThisTurn = [];
      agent._knowledgeSelectedIdSet = /* @__PURE__ */ new Set();
      agent._abortController = null;
      agent._abortReason = null;
      agent._traceCollector = null;
      const baseIdentity = { id: "anonymous", tenantId: "default", role: "user" };
      const resolvedIdentity = identity && typeof identity === "object" ? { ...baseIdentity, ...identity } : baseIdentity;
      agent.identity = Object.freeze({ ...resolvedIdentity });
      const resolvedTier = normalizeRiskLevel(riskProfile && riskProfile.tier, RiskLevel.NONE);
      agent.riskProfile = Object.freeze({ tier: resolvedTier });
      agent.contextManager = new ContextManager();
    }
    module.exports = { initializeAgentState };
  }
});

// utils/agent-usage.js
var require_agent_usage = __commonJS({
  "utils/agent-usage.js"(exports, module) {
    function toNumber(value) {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }
    function normalizeUsage(usage) {
      if (!usage || typeof usage !== "object") return null;
      const input = toNumber(usage.input_tokens ?? usage.promptTokenCount ?? usage.prompt_tokens);
      const cachedInput = toNumber(
        usage.cached_input_tokens ?? usage.cachedContentTokenCount ?? usage.cached_prompt_tokens ?? usage.cachedPromptTokens
      );
      const output = toNumber(
        usage.output_tokens ?? usage.candidatesTokenCount ?? usage.completionTokenCount ?? usage.completion_tokens
      );
      const reasoningOutput = toNumber(
        usage.reasoning_output_tokens ?? usage.reasoningTokenCount ?? usage.thoughtsTokenCount ?? usage.reasoning_tokens
      );
      const total = toNumber(usage.total_tokens ?? usage.totalTokenCount ?? usage.total_tokens);
      if (input === null && cachedInput === null && output === null && reasoningOutput === null && total === null) return null;
      return {
        input,
        cachedInput,
        output,
        reasoningOutput,
        total
      };
    }
    function applyUsageToEntry(entry, usage) {
      if (!entry || typeof entry !== "object") return false;
      const normalized = normalizeUsage(usage);
      if (!normalized) return false;
      if (normalized.input !== null) entry._tokenUsagePrompt = normalized.input;
      if (normalized.cachedInput !== null) entry._tokenUsageCachedInput = normalized.cachedInput;
      if (normalized.output !== null) entry._tokenUsageCompletion = normalized.output;
      if (normalized.reasoningOutput !== null) entry._tokenUsageReasoningOutput = normalized.reasoningOutput;
      if (normalized.total !== null) entry._tokenUsageTotal = normalized.total;
      return true;
    }
    function getUsageFromEntry(entry) {
      if (!entry || typeof entry !== "object") return null;
      const input = toNumber(entry._tokenUsagePrompt);
      const cachedInput = toNumber(entry._tokenUsageCachedInput);
      const output = toNumber(entry._tokenUsageCompletion);
      const reasoningOutput = toNumber(entry._tokenUsageReasoningOutput);
      let total = toNumber(entry._tokenUsageTotal);
      if (total === null && (input !== null || output !== null)) {
        total = (input || 0) + (output || 0);
      }
      if (input === null && cachedInput === null && output === null && reasoningOutput === null && total === null) {
        return null;
      }
      return {
        input_tokens: input || 0,
        cached_input_tokens: cachedInput || 0,
        output_tokens: output || 0,
        reasoning_output_tokens: reasoningOutput || 0,
        total_tokens: total || 0
      };
    }
    function getTotalUsageFromHistory(history) {
      if (!Array.isArray(history)) return null;
      let totalInput = 0;
      let totalCachedInput = 0;
      let totalOutput = 0;
      let totalReasoningOutput = 0;
      let totalTokens = 0;
      let hasAny = false;
      for (const entry of history) {
        const usage = getUsageFromEntry(entry);
        if (!usage) continue;
        hasAny = true;
        totalInput += usage.input_tokens;
        totalCachedInput += usage.cached_input_tokens;
        totalOutput += usage.output_tokens;
        totalReasoningOutput += usage.reasoning_output_tokens;
        totalTokens += usage.total_tokens;
      }
      if (!hasAny) return null;
      if (!totalTokens && (totalInput || totalOutput)) {
        totalTokens = totalInput + totalOutput;
      }
      return {
        input_tokens: totalInput,
        cached_input_tokens: totalCachedInput,
        output_tokens: totalOutput,
        reasoning_output_tokens: totalReasoningOutput,
        total_tokens: totalTokens
      };
    }
    function buildTokenUsageInfo(history, modelContextWindow = null) {
      const lastUsage = Array.isArray(history) && history.length > 0 ? getUsageFromEntry(history[history.length - 1]) : null;
      const totalUsage = getTotalUsageFromHistory(history);
      return {
        info: {
          total_token_usage: totalUsage || null,
          last_token_usage: lastUsage || null,
          model_context_window: modelContextWindow
        },
        rate_limits: null
      };
    }
    module.exports = {
      applyUsageToEntry,
      getUsageFromEntry,
      getTotalUsageFromHistory,
      buildTokenUsageInfo
    };
  }
});

// utils/agent-completion.js
var require_agent_completion = __commonJS({
  "utils/agent-completion.js"(exports, module) {
    var {
      getUsageFromEntry,
      getTotalUsageFromHistory
    } = require_agent_usage();
    function extractFinalAnswer(text) {
      if (typeof text !== "string") return null;
      const matches = Array.from(text.matchAll(/<final_answer>([\s\S]*?)<\/final_answer>/gi));
      if (matches.length === 0) return null;
      const last = matches[matches.length - 1];
      return typeof last[1] === "string" ? last[1].trim() : null;
    }
    function stripThoughtPlanActionPrefix(text) {
      if (typeof text !== "string") return text;
      const lines = text.split("\n");
      let i = 0;
      while (i < lines.length && !lines[i].trim()) i += 1;
      const first = lines[i] || "";
      if (!/^\s*Thought\s*:/i.test(first)) return text;
      const out = [];
      let skipping = true;
      for (let idx = i; idx < lines.length; idx += 1) {
        const line = lines[idx];
        const trimmed = line.trim();
        if (skipping) {
          if (!trimmed) continue;
          if (/^\s*(Thought|Plan|Action)\s*:/i.test(line)) continue;
          if (/^\s*(\d+\.|[-*])\s+/.test(line)) continue;
          skipping = false;
        }
        out.push(line);
      }
      return out.join("\n");
    }
    function sanitizeFinalResponse(text) {
      if (typeof text !== "string" || !text.trim()) return text;
      const extracted = extractFinalAnswer(text);
      let candidate = typeof extracted === "string" && extracted.trim() ? extracted : text;
      if (candidate === text) {
        candidate = stripThoughtPlanActionPrefix(candidate);
      }
      const patterns = [
        /without explicitly stating/i,
        /do not include/i,
        /forbidden/i,
        /i will now summarize/i,
        /the previous model has already completed/i,
        /the information has been retrieved/i
      ];
      const lines = candidate.split("\n");
      const filtered = lines.filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) return true;
        return !patterns.some((re) => re.test(trimmed));
      });
      return filtered.join("\n").trim();
    }
    function buildCompletionData({ history, finalResponseText, turnCount, modelContextWindow = null }) {
      const lastUsage = getUsageFromEntry(history[history.length - 1]);
      const totalUsage = getTotalUsageFromHistory(history);
      return {
        response: finalResponseText || "Agent failed to produce a response within turn limit.",
        turnCount,
        historyLength: history.length,
        tokenUsage: {
          info: {
            total_token_usage: totalUsage || null,
            last_token_usage: lastUsage || null,
            model_context_window: modelContextWindow
          }
        }
      };
    }
    module.exports = { buildCompletionData, sanitizeFinalResponse };
  }
});

// utils/agent-interaction.js
var require_agent_interaction = __commonJS({
  "utils/agent-interaction.js"(exports, module) {
    var { DEFAULT_TOOL_TIMEOUT_MS } = require_self_heal();
    function formatTimezoneOffset(minutes) {
      if (!Number.isFinite(minutes) || minutes === 0) return "Z";
      const sign = minutes > 0 ? "-" : "+";
      const abs = Math.abs(minutes);
      const hours = String(Math.floor(abs / 60)).padStart(2, "0");
      const mins = String(abs % 60).padStart(2, "0");
      return `${sign}${hours}:${mins}`;
    }
    function buildEnvironmentContext() {
      const now = /* @__PURE__ */ new Date();
      const iso = now.toISOString();
      const offset = formatTimezoneOffset(now.getTimezoneOffset());
      let cwd = null;
      try {
        if (typeof process !== "undefined" && process && typeof process.cwd === "function") {
          cwd = process.cwd();
        }
      } catch {
        cwd = null;
      }
      const lines = [
        "<environment_context>",
        `  <timestamp>${iso}</timestamp>`,
        `  <timezone_offset>${offset}</timezone_offset>`
      ];
      if (typeof cwd === "string" && cwd.length > 0) {
        lines.push(`  <cwd>${cwd}</cwd>`);
      }
      lines.push("</environment_context>");
      return lines.join("\n");
    }
    function awaitUserInput(agent, callId, timeoutMs) {
      const ms = typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TOOL_TIMEOUT_MS;
      return new Promise((resolve) => {
        const existing = agent._pendingUserInputs.get(callId);
        if (existing && typeof existing.reject === "function") {
          existing.reject(new Error("Superseded by new request"));
        }
        const entry = {
          done: false,
          resolve: (value) => {
            if (entry.done) return;
            entry.done = true;
            if (entry.timer) clearTimeout(entry.timer);
            agent._pendingUserInputs.delete(callId);
            if (agent && typeof agent.emit === "function") {
              agent.emit("user_input_response", {
                callId,
                timedOut: false,
                value,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
            resolve({ timedOut: false, value });
          },
          reject: () => {
            if (entry.done) return;
            entry.done = true;
            if (entry.timer) clearTimeout(entry.timer);
            agent._pendingUserInputs.delete(callId);
            if (agent && typeof agent.emit === "function") {
              agent.emit("user_input_response", {
                callId,
                timedOut: true,
                value: null,
                timestamp: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
            resolve({ timedOut: true });
          },
          timer: null
        };
        entry.timer = setTimeout(() => {
          if (entry.done) return;
          entry.done = true;
          agent._pendingUserInputs.delete(callId);
          if (agent && typeof agent.emit === "function") {
            agent.emit("user_input_response", {
              callId,
              timedOut: true,
              value: null,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
          resolve({ timedOut: true });
        }, ms);
        if (entry.timer && typeof entry.timer.unref === "function") entry.timer.unref();
        agent._pendingUserInputs.set(callId, entry);
      });
    }
    function respondToUserInput(agent, callId, response) {
      let targetId = callId;
      if (!targetId) {
        if (agent._pendingUserInputs.size !== 1) return false;
        targetId = Array.from(agent._pendingUserInputs.keys())[0];
      }
      const entry = agent._pendingUserInputs.get(targetId);
      if (!entry || typeof entry.resolve !== "function") return false;
      entry.resolve(response);
      return true;
    }
    function submitPendingInput(agent, text) {
      const value = typeof text === "string" ? text.trim() : "";
      if (!value) return false;
      if (!Array.isArray(agent._pendingInputs)) agent._pendingInputs = [];
      agent._pendingInputs.push(value);
      agent.emit("pending_input_queued", { content: value, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      return true;
    }
    function drainPendingInputs(agent) {
      if (!Array.isArray(agent._pendingInputs) || agent._pendingInputs.length === 0) return [];
      const items = agent._pendingInputs.slice();
      agent._pendingInputs = [];
      return items;
    }
    module.exports = {
      awaitUserInput,
      respondToUserInput,
      submitPendingInput,
      drainPendingInputs,
      buildEnvironmentContext
    };
  }
});

// utils/agent-lifecycle.js
var require_agent_lifecycle = __commonJS({
  "utils/agent-lifecycle.js"(exports, module) {
    var { buildCompletionData } = require_agent_completion();
    var { buildEnvironmentContext } = require_agent_interaction();
    function buildDebugLogger(agent) {
      return (...args) => {
        if (!agent.debug) return;
        console.log("[Debug]", ...args);
      };
    }
    function resetTurnState(agent) {
      agent.currentPlan = null;
      agent._decisionTraces = [];
      agent._pendingInputs = [];
      agent._toolFailureStreak = /* @__PURE__ */ new Map();
      agent._approvalGrants.clear();
      agent._approvalDenies.clear();
      agent._approvalDeniedThisTurn = false;
      agent._memoryFirstGuardCount = 0;
      agent._citationGuardCount = 0;
      if (agent._approvalDenyHints) agent._approvalDenyHints.clear();
      if (Array.isArray(agent._knowledgeSelectedThisTurn)) agent._knowledgeSelectedThisTurn.length = 0;
      else agent._knowledgeSelectedThisTurn = [];
      if (agent._knowledgeSelectedIdSet instanceof Set) agent._knowledgeSelectedIdSet.clear();
      else agent._knowledgeSelectedIdSet = /* @__PURE__ */ new Set();
      const turnStartIndex = agent.history.length;
      agent._turnStartIndex = turnStartIndex;
      return turnStartIndex;
    }
    function startAgentTurn(agent, userInput) {
      console.log(`
--- [Agent] Starting Turn: "${userInput}" ---`);
      const dbg = buildDebugLogger(agent);
      const turnStartIndex = resetTurnState(agent);
      agent.emit("start", { message: userInput });
      agent.emit("turn_started", {
        message: userInput,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      agent.history.push({ role: "user", content: buildEnvironmentContext() });
      agent.history.push({ role: "user", content: userInput });
      agent._setState("thinking", { input: userInput, step: 0 });
      return { dbg, turnStartIndex };
    }
    function finalizeAgentTurn({ agent, finalResponseText, turnCount, maxTurns, dbg }) {
      agent._setState("idle", { finalResponse: finalResponseText || null, turnCount });
      agent.emit("autosave", agent.dumpSnapshot());
      agent._turnStartIndex = null;
      const completionData = buildCompletionData({
        history: agent.history,
        finalResponseText,
        turnCount
      });
      agent.emit("done", completionData);
      agent.emit("agent_turn_complete", completionData);
      if (!finalResponseText) {
        dbg("Turn limit reached", {
          turnCount,
          maxTurns,
          historyLength: agent.history.length
        });
      }
      return finalResponseText || "Agent failed to produce a response within turn limit.";
    }
    module.exports = { startAgentTurn, finalizeAgentTurn };
  }
});

// utils/agent-llm-stream.js
var require_agent_llm_stream = __commonJS({
  "utils/agent-llm-stream.js"(exports, module) {
    async function runLlmStreamStep({ agent, stream, turnCount, currentStepResponse, signal }) {
      let messageStarted = false;
      for await (const chunk of stream) {
        if (signal && signal.aborted) {
          const err = signal.reason instanceof Error ? signal.reason : new Error("Aborted");
          err.name = "AbortError";
          throw err;
        }
        if (chunk.type === "text") {
          if (!messageStarted) {
            agent.emit("assistant_message_started", { step: turnCount });
            messageStarted = true;
          }
          currentStepResponse.content += chunk.delta;
          agent.emit("agent_message_content_delta", {
            delta: chunk.delta,
            step: turnCount
          });
        } else if (chunk.type === "tool_calls") {
          currentStepResponse.tool_calls.push(...chunk.tool_calls);
        }
      }
      return currentStepResponse;
    }
    module.exports = { runLlmStreamStep };
  }
});

// utils/decision-trace.js
var require_decision_trace = __commonJS({
  "utils/decision-trace.js"(exports, module) {
    function extractFirstSentence(text) {
      if (typeof text !== "string") return "";
      const trimmed = text.trim();
      if (!trimmed) return "";
      const match = trimmed.match(/^(.+?[.!?])\s/);
      return match ? match[1] : trimmed;
    }
    function sanitizeSummary(text, maxChars = 160) {
      const sentence = extractFirstSentence(text).replace(/\s+/g, " ").trim();
      if (sentence.length <= maxChars) return sentence;
      return `${sentence.slice(0, maxChars)}...`;
    }
    function parseThought(content) {
      if (typeof content !== "string") return "";
      const match = content.match(/(?:^|\n)\s*Thought:\s*(.+)/i);
      if (!match) return "";
      return sanitizeSummary(match[1]);
    }
    function parsePlanSteps(content) {
      if (typeof content !== "string") return null;
      const lines = content.split("\n");
      const planIdx = lines.findIndex((line) => /^\s*Plan\s*:/i.test(line));
      if (planIdx < 0) return null;
      let count = 0;
      for (let i = planIdx + 1; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line) continue;
        if (/^\s*Action\s*:/i.test(line)) break;
        if (/^(\d+\.|[-*])\s+/.test(line)) count += 1;
      }
      return count > 0 ? count : null;
    }
    function buildDecisionTrace(content) {
      const thought = parseThought(content);
      const planSteps = parsePlanSteps(content);
      if (!thought && planSteps == null) return null;
      return { thought, planSteps };
    }
    function canExtractDecisionTrace(content) {
      return Boolean(buildDecisionTrace(content));
    }
    function emitToolCallDecisionTrace(agent, toolCalls, step) {
      if (!agent || typeof agent.emit !== "function") return;
      if (!Array.isArray(toolCalls) || toolCalls.length === 0) return;
      const names = Array.from(new Set(
        toolCalls.map((tc) => tc && tc.name ? String(tc.name) : "").filter(Boolean)
      ));
      const label = names.length ? names.join(", ") : "unknown_tool";
      const thought = sanitizeSummary(`Calling tools: ${label}.`, 160);
      agent.emit("decision_trace", {
        step,
        thought,
        planSteps: toolCalls.length,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    function emitDecisionTrace(agent, content, step) {
      if (!agent || typeof agent.emit !== "function") return;
      const trace = buildDecisionTrace(content);
      if (!trace) return;
      const entry = {
        step,
        thought: trace.thought || null,
        planSteps: trace.planSteps,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (Array.isArray(agent._decisionTraces)) {
        agent._decisionTraces.push(entry);
        if (agent._decisionTraces.length > 200) {
          agent._decisionTraces = agent._decisionTraces.slice(-200);
        }
      }
      agent.emit("decision_trace", {
        step: entry.step,
        thought: entry.thought,
        planSteps: entry.planSteps,
        timestamp: entry.timestamp
      });
    }
    module.exports = { emitDecisionTrace, canExtractDecisionTrace, emitToolCallDecisionTrace };
  }
});

// utils/agent-llm.js
var require_agent_llm = __commonJS({
  "utils/agent-llm.js"(exports, module) {
    var { runLlmStreamStep } = require_agent_llm_stream();
    var { emitDecisionTrace, canExtractDecisionTrace, emitToolCallDecisionTrace } = require_decision_trace();
    var { getToolIntent, getToolRisk } = require_agent_tools_registry();
    function tryParseToolArgs(raw) {
      if (raw === null || raw === void 0) return null;
      if (typeof raw === "object") return raw;
      if (typeof raw !== "string") return { _raw: String(raw) };
      try {
        return JSON.parse(raw);
      } catch {
        return { _raw: raw };
      }
    }
    function hasMissingThoughtSignature(toolCalls) {
      return toolCalls.some((tc) => tc && !(tc.thought_signature || tc.thoughtSignature));
    }
    async function runLlmStep({ agent, llm, systemPrompt, llmHistory, turnCount, signal }) {
      let currentStepResponse = { content: "", tool_calls: [] };
      let usedStreaming = false;
      if (signal && signal.aborted) {
        const err = signal.reason instanceof Error ? signal.reason : new Error("Aborted");
        err.name = "AbortError";
        throw err;
      }
      if (typeof llm.chatStream === "function") {
        const stream = llm.chatStream(systemPrompt, llmHistory, { signal });
        currentStepResponse = await runLlmStreamStep({
          agent,
          stream,
          turnCount,
          currentStepResponse,
          signal
        });
        usedStreaming = true;
      } else {
        const response = await llm.chat(systemPrompt, llmHistory, { signal });
        currentStepResponse = response;
        if (response && response.usage) currentStepResponse._usage = response.usage;
      }
      const retryToolCalls = async () => {
        if (!usedStreaming || typeof llm.chat !== "function") return;
        const toolCalls2 = Array.isArray(currentStepResponse.tool_calls) ? currentStepResponse.tool_calls : [];
        if (toolCalls2.length === 0 || !hasMissingThoughtSignature(toolCalls2)) return;
        try {
          const retry = await llm.chat(systemPrompt, llmHistory, { signal });
          if (retry && retry.usage) currentStepResponse._usage = retry.usage;
          if (retry && Array.isArray(retry.tool_calls) && retry.tool_calls.length > 0) {
            currentStepResponse.tool_calls = retry.tool_calls;
          }
        } catch {
        }
      };
      await retryToolCalls();
      const content = currentStepResponse && typeof currentStepResponse.content === "string" ? currentStepResponse.content : "";
      const toolCalls = currentStepResponse && Array.isArray(currentStepResponse.tool_calls) ? currentStepResponse.tool_calls : [];
      if (signal && signal.aborted) {
        const err = signal.reason instanceof Error ? signal.reason : new Error("Aborted");
        err.name = "AbortError";
        throw err;
      }
      if (content) {
        emitDecisionTrace(agent, content, turnCount);
      }
      if (toolCalls.length > 0 && content && !canExtractDecisionTrace(content)) {
        emitToolCallDecisionTrace(agent, toolCalls, turnCount);
      }
      if (toolCalls.length > 0) {
        const enriched = toolCalls.map((tc) => {
          const toolName = tc && tc.name ? String(tc.name) : "";
          const args = tryParseToolArgs(tc && tc.arguments);
          const intent = getToolIntent(agent, toolName, args);
          const risk = getToolRisk(agent, toolName, tc);
          return {
            ...tc,
            intent: intent || void 0,
            risk
          };
        });
        agent.emit("tool_call", {
          tools: toolCalls.map((tc) => tc.name),
          details: enriched
        });
      }
      return currentStepResponse;
    }
    module.exports = { runLlmStep };
  }
});

// utils/agent-tool-flow-helpers.js
var require_agent_tool_flow_helpers = __commonJS({
  "utils/agent-tool-flow-helpers.js"(exports, module) {
    function isRealtimeQuery(text) {
      if (typeof text !== "string") return false;
      const value = text.toLowerCase();
      const realtimeTopics = [
        "weather",
        "forecast",
        "stock",
        "price",
        "prices",
        "exchange rate",
        "fx",
        "news"
      ];
      const hasTopic = realtimeTopics.some((topic) => value.includes(topic));
      const hasTimeQuery = /\b(current time|time now)\b/i.test(value);
      const hasRate = /\brate\b/i.test(value);
      const hasCurrencyCode = /\b[a-z]{3}\b/i.test(value);
      return hasTimeQuery || hasTopic || hasRate && hasCurrencyCode;
    }
    var MEMORY_TOOL_NAMES = /* @__PURE__ */ new Set([
      "memory_search",
      "kb_search",
      "memory__search_nodes",
      "memory_read_graph",
      "memory__read_graph"
    ]);
    var WEB_SEARCH_TOOL_NAMES = /* @__PURE__ */ new Set([
      "searxng_query",
      "read_url"
    ]);
    function normalizeToolName(name) {
      return String(name || "").trim().toLowerCase();
    }
    function isMemoryToolName(name) {
      return MEMORY_TOOL_NAMES.has(normalizeToolName(name));
    }
    function isWebSearchToolName(name) {
      return WEB_SEARCH_TOOL_NAMES.has(normalizeToolName(name));
    }
    function hasToolActivitySince(history, startIndex) {
      if (!Array.isArray(history)) return false;
      for (let i = Math.max(0, startIndex); i < history.length; i++) {
        const msg = history[i];
        if (!msg || typeof msg !== "object") continue;
        if ((msg.role === "system" || msg.role === "tool") && msg.tool_call_id) return true;
        if (msg.role === "assistant" && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) return true;
      }
      return false;
    }
    function hasMemoryToolActivitySince(history, startIndex) {
      if (!Array.isArray(history)) return false;
      for (let i = Math.max(0, startIndex); i < history.length; i++) {
        const msg = history[i];
        if (!msg || typeof msg !== "object") continue;
        if (msg.role !== "system" && msg.role !== "tool" || !msg.tool_call_id) continue;
        if (isMemoryToolName(msg.name)) return true;
      }
      return false;
    }
    function hasWebSearchToolRequested(toolCalls) {
      if (!Array.isArray(toolCalls)) return false;
      for (const tc of toolCalls) {
        if (!tc || typeof tc !== "object") continue;
        if (isWebSearchToolName(tc.name)) return true;
      }
      return false;
    }
    function hasEvidenceToolActivitySince(history, startIndex) {
      if (!Array.isArray(history)) return false;
      const ignored = /* @__PURE__ */ new Set([
        "update_plan",
        "list_available_skills",
        "read_skill_documentation",
        "request_user_input"
      ]);
      for (let i = Math.max(0, startIndex); i < history.length; i++) {
        const msg = history[i];
        if (!msg || typeof msg !== "object") continue;
        if (msg.role === "assistant" && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
          for (const tc of msg.tool_calls) {
            const name = tc && tc.name ? String(tc.name) : "";
            if (name && !ignored.has(name)) return true;
          }
        }
      }
      return false;
    }
    function getPendingPlanSteps(plan) {
      if (!Array.isArray(plan)) return [];
      return plan.filter((item) => item && typeof item === "object").filter((item) => item.status === "pending" || item.status === "in_progress").map((item) => typeof item.step === "string" ? item.step : "").filter(Boolean);
    }
    function isPersonalMemoryQuery(text) {
      if (typeof text !== "string") return false;
      const value = text.toLowerCase();
      return /(?:\bmy\b|\bmine\b|\bme\b|\bi\s+am\b|\bi'm\b|\bremember\b|\bdo you remember\b|\bwhat(?:'s| is)\s+my\b|\bwho am i\b|\bmy\s+favorite\b|\bmy\s+car\b|\bmy\s+name\b)/i.test(value);
    }
    function buildMemoryQueries(text) {
      if (typeof text !== "string") return [];
      const value = text.toLowerCase();
      const tokens = value.replace(/[^a-z0-9\s_-]/g, " ").split(/\s+/).filter(Boolean);
      const stopwords = /* @__PURE__ */ new Set([
        "the",
        "a",
        "an",
        "and",
        "or",
        "but",
        "to",
        "of",
        "for",
        "with",
        "in",
        "on",
        "at",
        "by",
        "about",
        "what",
        "whats",
        "what's",
        "is",
        "are",
        "was",
        "were",
        "do",
        "does",
        "did",
        "my",
        "mine",
        "me",
        "i",
        "am",
        "i'm",
        "remember",
        "please",
        "tell",
        "color"
      ]);
      const keywords = tokens.filter((token) => token.length > 1 && !stopwords.has(token));
      const hasCar = keywords.includes("car") || value.includes("car");
      const hasColor = value.includes("color") || value.includes("colour");
      const queries = [];
      if (hasCar && hasColor) queries.push("car color");
      if (hasCar) queries.push("car");
      if (hasColor) queries.push("color");
      for (const word of keywords) {
        if (!queries.includes(word)) queries.push(word);
      }
      return queries.slice(0, 3);
    }
    function parseToolResultContent(resultMessage) {
      if (!resultMessage || typeof resultMessage.content !== "string") return null;
      try {
        return JSON.parse(resultMessage.content);
      } catch {
        return null;
      }
    }
    function detectApprovalBlock(toolResults) {
      if (!Array.isArray(toolResults) || toolResults.length === 0) return null;
      const blocked = [];
      for (const msg of toolResults) {
        const parsed = parseToolResultContent(msg);
        if (!parsed || typeof parsed !== "object") continue;
        const structured = parsed.structuredContent && typeof parsed.structuredContent === "object" ? parsed.structuredContent : null;
        const err = structured && typeof structured.error === "string" ? structured.error : null;
        if (err === "ApprovalDenied" || err === "ApprovalTimeout") {
          blocked.push({
            tool: msg && msg.name ? String(msg.name) : null,
            callId: msg && msg.tool_call_id ? String(msg.tool_call_id) : null,
            error: err
          });
        }
      }
      return blocked.length > 0 ? blocked : null;
    }
    function formatApprovalBlockedHint(blocked) {
      const tools = blocked.map((b) => b && b.tool ? b.tool : "").filter(Boolean);
      const unique = Array.from(new Set(tools));
      const list = unique.length ? unique.join(", ") : "the requested tool(s)";
      return `User denied approval for: ${list}.
Update your plan: mark the related step(s) as blocked/cannot-complete, then continue with a partial answer using the approved tool results.
Do not keep re-requesting the same tool unless the user explicitly asks to try again or changes their decision.`;
    }
    function countSuccessfulEvidenceTools({ toolResults }) {
      if (!Array.isArray(toolResults) || toolResults.length === 0) return 0;
      const ignored = /* @__PURE__ */ new Set([
        "update_plan",
        "list_available_skills",
        "read_skill_documentation",
        "request_user_input"
      ]);
      let count = 0;
      for (const msg of toolResults) {
        const name = msg && msg.name ? String(msg.name) : "";
        if (name && ignored.has(name)) continue;
        const parsed = parseToolResultContent(msg);
        if (!parsed || typeof parsed !== "object") continue;
        if (parsed.isError === false) {
          count += 1;
          continue;
        }
        const structured = parsed.structuredContent && typeof parsed.structuredContent === "object" ? parsed.structuredContent : null;
        const hasErr = structured && typeof structured.error === "string" && structured.error.length > 0;
        if (!hasErr && parsed.isError !== true) {
          count += 1;
        }
      }
      return count;
    }
    function hasAnyTurnEvidence({ history, startIndex }) {
      if (!Array.isArray(history)) return false;
      const from = typeof startIndex === "number" && Number.isFinite(startIndex) ? Math.max(0, startIndex) : 0;
      const ignored = /* @__PURE__ */ new Set([
        "update_plan",
        "list_available_skills",
        "read_skill_documentation",
        "request_user_input"
      ]);
      for (let i = from; i < history.length; i += 1) {
        const msg = history[i];
        if (!msg || typeof msg !== "object") continue;
        const name = msg && msg.name ? String(msg.name) : "";
        if (name && ignored.has(name)) continue;
        if (!((msg.role === "system" || msg.role === "tool") && msg.tool_call_id && name)) continue;
        const parsed = parseToolResultContent(msg);
        if (!parsed || typeof parsed !== "object") continue;
        if (parsed.isError === false) return true;
        const structured = parsed.structuredContent && typeof parsed.structuredContent === "object" ? parsed.structuredContent : null;
        const hasErr = structured && typeof structured.error === "string" && structured.error.length > 0;
        if (!hasErr && parsed.isError !== true) return true;
      }
      return false;
    }
    function formatMemoryResult(mcpResult) {
      if (!mcpResult || typeof mcpResult !== "object") return "";
      if (Array.isArray(mcpResult.content)) {
        const text = mcpResult.content.filter((b) => b && b.type === "text" && typeof b.text === "string").map((b) => b.text).join("\n");
        if (text.trim()) return text.trim();
      }
      if (mcpResult.structuredContent !== void 0) {
        try {
          return JSON.stringify(mcpResult.structuredContent, null, 2);
        } catch {
          return String(mcpResult.structuredContent);
        }
      }
      return "";
    }
    function isEmptyMemorySearchResult(mcpResult) {
      if (!mcpResult || typeof mcpResult !== "object") return true;
      if (Array.isArray(mcpResult.structuredContent)) return mcpResult.structuredContent.length === 0;
      if (mcpResult.structuredContent && typeof mcpResult.structuredContent === "object") {
        const hits = mcpResult.structuredContent.hits;
        if (Array.isArray(hits)) return hits.length === 0;
        const nodes = mcpResult.structuredContent.nodes;
        if (Array.isArray(nodes)) return nodes.length === 0;
      }
      if (Array.isArray(mcpResult.content)) {
        const text = mcpResult.content.map((c) => c && c.text ? String(c.text) : "").join(" ");
        if (!text.trim()) return true;
        if (/\bno\s+results\b|\bnone\b|\bempty\b|\[\s*\]/i.test(text)) return true;
      }
      return false;
    }
    module.exports = {
      buildMemoryQueries,
      countSuccessfulEvidenceTools,
      detectApprovalBlock,
      formatApprovalBlockedHint,
      formatMemoryResult,
      getPendingPlanSteps,
      hasAnyTurnEvidence,
      hasMemoryToolActivitySince,
      hasEvidenceToolActivitySince,
      hasToolActivitySince,
      hasWebSearchToolRequested,
      isEmptyMemorySearchResult,
      isMemoryToolName,
      isPersonalMemoryQuery,
      isRealtimeQuery,
      isWebSearchToolName,
      parseToolResultContent
    };
  }
});

// utils/rag/rag-autosave-policy.js
var require_rag_autosave_policy = __commonJS({
  "utils/rag/rag-autosave-policy.js"(exports, module) {
    function compactText(input, maxLen = 240) {
      const text = String(input || "").trim().replace(/\s+/g, " ");
      if (text.length <= maxLen) return text;
      return `${text.slice(0, Math.max(0, maxLen - 3))}...`;
    }
    function buildAutoSavePayload({ userInput }) {
      const text = String(userInput || "").trim();
      if (!text) return null;
      const patterns = [
        {
          type: "fact",
          title: "User name",
          regex: /\bmy\s+name\s+is\s+([^\n.,!?]{2,80})/i,
          map: (m) => `User says their name is ${m[1].trim()}.`
        },
        {
          type: "preference",
          title: "User preference",
          regex: /\bmy\s+favorite\s+([^\n.,!?]{2,60})\s+is\s+([^\n.,!?]{2,120})/i,
          map: (m) => `Favorite ${m[1].trim()}: ${m[2].trim()}.`
        },
        {
          type: "preference",
          title: "User preference",
          regex: /\bi\s+(?:like|love|prefer)\s+([^\n.,!?]{3,120})/i,
          map: (m) => `User preference: ${m[1].trim()}.`
        },
        {
          type: "note",
          title: "Remembered note",
          regex: /\bremember\s+that\s+([^\n]{4,200})/i,
          map: (m) => m[1].trim()
        }
      ];
      for (const p of patterns) {
        const match = text.match(p.regex);
        if (!match) continue;
        const content = compactText(p.map(match), 220);
        if (!content) return null;
        return {
          type: p.type,
          title: p.title,
          content,
          metadata: {
            tags: ["auto_saved"],
            source: "agentic_rag_policy"
          }
        };
      }
      return null;
    }
    function shouldAutoSave(agent) {
      return Boolean(agent && agent.ragConfig && agent.ragConfig.enabled && agent.ragConfig.autoSave);
    }
    module.exports = {
      buildAutoSavePayload,
      shouldAutoSave
    };
  }
});

// utils/knowledge-evidence.js
var require_knowledge_evidence = __commonJS({
  "utils/knowledge-evidence.js"(exports, module) {
    function toText(value) {
      return String(value == null ? "" : value).trim();
    }
    var KNOWLEDGE_TOOL_NAMES = /* @__PURE__ */ new Set([
      "kb_search",
      "memory_search",
      "memory__search_nodes"
    ]);
    function isKnowledgeToolName(name) {
      return KNOWLEDGE_TOOL_NAMES.has(toText(name).toLowerCase());
    }
    function toFiniteScore(value) {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    function normalizeHitItem(item) {
      if (!item || typeof item !== "object") return null;
      const id = toText(item.id);
      if (!id) return null;
      const title = toText(item.title) || id;
      const score = toFiniteScore(item.score);
      const source = toText(item.source || item.source_path || item.file || "");
      const sourcePages = Array.isArray(item.source_pages) ? item.source_pages.map((n) => Number(n)).filter((n) => Number.isFinite(n)).map((n) => Math.trunc(n)) : [];
      return {
        id,
        title,
        score,
        source,
        sourcePages,
        type: toText(item.type || ""),
        updatedAt: toText(item.updated_at || "")
      };
    }
    function normalizeHitsFromStructured(toolName, structured) {
      if (!structured || typeof structured !== "object") return [];
      if (Array.isArray(structured.hits)) {
        return structured.hits.map(normalizeHitItem).filter(Boolean);
      }
      if (toolName === "memory__search_nodes" && Array.isArray(structured.nodes)) {
        return structured.nodes.map(normalizeHitItem).filter(Boolean);
      }
      return [];
    }
    function extractStructuredContent(parsedToolResult) {
      if (!parsedToolResult || typeof parsedToolResult !== "object") return null;
      const structured = parsedToolResult.structuredContent;
      if (structured && typeof structured === "object") return structured;
      return null;
    }
    function extractKnowledgeSelectionFromParsed({
      toolName,
      args,
      parsedToolResult,
      maxSelected = 6,
      minScore = null
    } = {}) {
      if (!isKnowledgeToolName(toolName)) return null;
      const structured = extractStructuredContent(parsedToolResult);
      if (!structured) return null;
      let hits = normalizeHitsFromStructured(toolName, structured);
      if (hits.length === 0) return null;
      if (typeof minScore === "number" && Number.isFinite(minScore)) {
        hits = hits.filter((h) => !(typeof h.score === "number" && h.score < minScore));
      }
      if (hits.length === 0) return null;
      const n = Number.isFinite(Number(maxSelected)) ? Math.max(1, Math.floor(Number(maxSelected))) : 6;
      const selected = hits.slice(0, n);
      return {
        tool: toText(toolName),
        query: toText(args && args.query),
        scope: toText(args && args.scope),
        count: selected.length,
        totalHits: hits.length,
        selected
      };
    }
    function extractCitationEntriesFromText(text) {
      const input = String(text || "");
      if (!input) return [];
      const pattern = /\[source:\s*#?([a-z0-9._:-]+)(?:\s+p\.?\s*(\d+))?\s*\]/ig;
      const out = [];
      let match = pattern.exec(input);
      while (match) {
        const id = toText(match[1]);
        const pageRaw = match[2];
        const page = Number.isFinite(Number(pageRaw)) ? Math.trunc(Number(pageRaw)) : null;
        if (id) out.push({ id, page });
        match = pattern.exec(input);
      }
      return out;
    }
    function extractCitationIdsFromText(text) {
      const entries = extractCitationEntriesFromText(text);
      return Array.from(new Set(entries.map((e) => e.id).filter(Boolean)));
    }
    function hasCitationForKnowledge({
      text,
      knowledgeIds
    } = {}) {
      const ids = Array.isArray(knowledgeIds) ? knowledgeIds.map((v) => toText(v)).filter(Boolean) : [];
      if (ids.length === 0) return true;
      const cited = new Set(extractCitationIdsFromText(text));
      for (const id of ids) {
        if (cited.has(id)) return true;
      }
      return false;
    }
    function buildCitationReminder({ knowledgeIds = [] } = {}) {
      const list = Array.isArray(knowledgeIds) ? knowledgeIds.map((v) => toText(v)).filter(Boolean).slice(0, 6) : [];
      const sample = list.length > 0 ? list.join(", ") : "knowledge_id";
      return `Citation required: Your final answer used knowledge evidence. Add inline citations in this exact format: [source:#<id> p.<page>]. Example ids from this turn: ${sample}.`;
    }
    module.exports = {
      extractCitationEntriesFromText,
      extractCitationIdsFromText,
      extractKnowledgeSelectionFromParsed,
      hasCitationForKnowledge,
      isKnowledgeToolName,
      buildCitationReminder
    };
  }
});

// utils/agent-knowledge-selection.js
var require_agent_knowledge_selection = __commonJS({
  "utils/agent-knowledge-selection.js"(exports, module) {
    var { parseToolResultContent } = require_agent_tool_flow_helpers();
    var { extractKnowledgeSelectionFromParsed, isKnowledgeToolName } = require_knowledge_evidence();
    function parseToolArgs(raw) {
      if (!raw) return null;
      if (typeof raw === "object") return raw;
      if (typeof raw !== "string") return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch {
        return null;
      }
    }
    function buildToolCallMap(toolCalls) {
      const map = /* @__PURE__ */ new Map();
      if (!Array.isArray(toolCalls)) return map;
      for (const call of toolCalls) {
        if (!call || typeof call !== "object") continue;
        const id = call.id ? String(call.id) : "";
        if (!id) continue;
        map.set(id, call);
      }
      return map;
    }
    function toSelectedIds(selection) {
      const list = Array.isArray(selection && selection.selected) ? selection.selected : [];
      return list.map((item) => item && item.id ? String(item.id).trim() : "").filter(Boolean);
    }
    function recordKnowledgeSelections({
      agent,
      toolCalls,
      toolResults,
      turnCount
    }) {
      if (!agent || typeof agent !== "object") return 0;
      if (!Array.isArray(toolResults) || toolResults.length === 0) return 0;
      if (!Array.isArray(agent._knowledgeSelectedThisTurn)) agent._knowledgeSelectedThisTurn = [];
      if (!(agent._knowledgeSelectedIdSet instanceof Set)) agent._knowledgeSelectedIdSet = /* @__PURE__ */ new Set();
      const idSet = agent._knowledgeSelectedIdSet;
      const callMap = buildToolCallMap(toolCalls);
      let emitted = 0;
      for (let i = 0; i < toolResults.length; i += 1) {
        const result = toolResults[i];
        const callId = result && result.tool_call_id ? String(result.tool_call_id) : "";
        const linkedCall = callId && callMap.get(callId) || (Array.isArray(toolCalls) ? toolCalls[i] : null);
        const toolName = String(result && result.name || linkedCall && linkedCall.name || "").trim();
        if (!isKnowledgeToolName(toolName)) continue;
        const parsed = parseToolResultContent(result);
        const args = parseToolArgs(linkedCall && linkedCall.arguments);
        const selection = extractKnowledgeSelectionFromParsed({
          toolName,
          args,
          parsedToolResult: parsed,
          maxSelected: 6,
          minScore: Number.isFinite(Number(agent.ragConfig && agent.ragConfig.minScore)) ? Number(agent.ragConfig.minScore) : null
        });
        if (!selection) continue;
        const selectedIds = toSelectedIds(selection);
        if (selectedIds.length === 0) continue;
        const newSelectedIds = [];
        for (const id of selectedIds) {
          if (idSet.has(id)) continue;
          idSet.add(id);
          newSelectedIds.push(id);
        }
        const payload = {
          ...selection,
          callId: callId || (linkedCall && linkedCall.id ? String(linkedCall.id) : ""),
          step: Number.isFinite(Number(turnCount)) ? Number(turnCount) : null,
          selectedIds,
          newSelectedIds,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        agent._knowledgeSelectedThisTurn.push(payload);
        if (typeof agent.emit === "function") agent.emit("knowledge_selected", payload);
        emitted += 1;
      }
      return emitted;
    }
    module.exports = { recordKnowledgeSelections };
  }
});

// utils/agent-tool-flow.js
var require_agent_tool_flow = __commonJS({
  "utils/agent-tool-flow.js"(exports, module) {
    var { buildSyntheticToolPlan } = require_agent_tool_runner();
    var { applyUsageToEntry, buildTokenUsageInfo } = require_agent_usage();
    var { emitDecisionTrace } = require_decision_trace();
    var {
      buildMemoryQueries,
      countSuccessfulEvidenceTools,
      detectApprovalBlock,
      formatApprovalBlockedHint,
      formatMemoryResult,
      getPendingPlanSteps,
      hasAnyTurnEvidence,
      hasMemoryToolActivitySince,
      hasEvidenceToolActivitySince,
      hasToolActivitySince,
      hasWebSearchToolRequested,
      isEmptyMemorySearchResult,
      isPersonalMemoryQuery,
      isRealtimeQuery,
      parseToolResultContent
    } = require_agent_tool_flow_helpers();
    var { buildAutoSavePayload, shouldAutoSave } = require_rag_autosave_policy();
    var { recordKnowledgeSelections } = require_agent_knowledge_selection();
    function hasMemoryTools(agent) {
      if (!agent || !agent.tools) return false;
      const tools = agent.tools;
      return Boolean(
        tools.memory_search || tools.kb_search || tools.memory__search_nodes || tools.memory_read_graph || tools.memory__read_graph
      );
    }
    async function maybeAutoMemoryLookup({ agent, userInput }) {
      if (!agent || !hasMemoryTools(agent)) return false;
      const preferRagSearch = Boolean(agent.ragConfig && agent.ragConfig.enabled && agent.tools.memory_search);
      if (!preferRagSearch && !isPersonalMemoryQuery(userInput)) return false;
      const directSearchTool = agent.tools.memory_search;
      const kbSearchTool = agent.tools.kb_search;
      const searchTool = agent.tools["memory__search_nodes"];
      const readTool = agent.tools.memory_read_graph || agent.tools["memory__read_graph"];
      if (!kbSearchTool && !directSearchTool && !searchTool && !readTool) return false;
      const queries = buildMemoryQueries(userInput);
      if (!preferRagSearch && queries.length === 0) return false;
      let searchHit = false;
      let lastResult = null;
      const makeCallId = (idx) => `auto_mem_${Date.now()}_${idx}`;
      const recordAutoKnowledgeSelections = (toolCall, toolResults) => {
        if (!toolCall || !Array.isArray(toolResults) || toolResults.length === 0) return;
        recordKnowledgeSelections({
          agent,
          toolCalls: [toolCall],
          toolResults,
          turnCount: null
        });
      };
      if (preferRagSearch) {
        const topK = agent.ragConfig && Number.isFinite(Number(agent.ragConfig.topK)) ? Number(agent.ragConfig.topK) : 5;
        const minScoreBase = agent.ragConfig && Number.isFinite(Number(agent.ragConfig.minScore)) ? Number(agent.ragConfig.minScore) : 0.2;
        const minScore = Math.max(minScoreBase, 0.35);
        if (kbSearchTool) {
          const kbCall = {
            id: makeCallId("kb"),
            name: "kb_search",
            arguments: JSON.stringify({
              query: userInput,
              topK,
              minScore
            })
          };
          const kbResults = await agent._executeTools([kbCall]);
          recordAutoKnowledgeSelections(kbCall, kbResults);
          const kbParsed = parseToolResultContent(kbResults[0]);
          lastResult = kbParsed;
          if (kbParsed && kbParsed.structuredContent && Array.isArray(kbParsed.structuredContent.hits) && kbParsed.structuredContent.hits.length > 0) {
            searchHit = true;
          }
        }
        if (!searchHit && directSearchTool) {
          const ragCall = {
            id: makeCallId("rag"),
            name: "memory_search",
            arguments: JSON.stringify({
              query: userInput,
              topK,
              minScore,
              scope: "all"
            })
          };
          const results = await agent._executeTools([ragCall]);
          recordAutoKnowledgeSelections(ragCall, results);
          const parsed = parseToolResultContent(results[0]);
          lastResult = parsed;
          if (parsed && parsed.structuredContent && Array.isArray(parsed.structuredContent.hits) && parsed.structuredContent.hits.length > 0) {
            searchHit = true;
          }
        }
      }
      for (let i = 0; i < queries.length; i += 1) {
        if (searchHit) break;
        if (!searchTool) break;
        const call = {
          id: makeCallId(i),
          name: "memory__search_nodes",
          arguments: JSON.stringify({ query: queries[i] })
        };
        const results = await agent._executeTools([call]);
        recordAutoKnowledgeSelections(call, results);
        const parsed = parseToolResultContent(results[0]);
        lastResult = parsed;
        if (parsed && !isEmptyMemorySearchResult(parsed)) {
          searchHit = true;
          break;
        }
      }
      if (!searchHit && readTool) {
        const readCall = {
          id: makeCallId("read"),
          name: "memory__read_graph",
          arguments: JSON.stringify({})
        };
        const results = await agent._executeTools([readCall]);
        lastResult = parseToolResultContent(results[0]);
      }
      const summary = formatMemoryResult(lastResult);
      if (summary) {
        agent.history.push({ role: "user", content: `Memory lookup (auto):
${summary}` });
      } else {
        agent.history.push({ role: "user", content: "Memory lookup (auto): no results found." });
      }
      return true;
    }
    async function maybeAutoMemorySave({ agent, userInput }) {
      if (!agent || !agent.tools || !agent.tools.memory_save) return false;
      if (!shouldAutoSave(agent)) return false;
      const payload = buildAutoSavePayload({ userInput });
      if (!payload) return false;
      const call = {
        id: `auto_mem_save_${Date.now()}`,
        name: "memory_save",
        arguments: JSON.stringify(payload)
      };
      const results = await agent._executeTools([call]);
      const parsed = parseToolResultContent(results[0]);
      if (!parsed || !parsed.structuredContent || parsed.structuredContent.ok !== true) return false;
      agent.history.push({
        role: "user",
        content: `Memory autosave (auto): saved id=${parsed.structuredContent.id}`
      });
      return true;
    }
    async function handleToolCalls({ agent, currentStepResponse, turnCount }) {
      if (!currentStepResponse.tool_calls || currentStepResponse.tool_calls.length === 0) {
        return { handled: false };
      }
      const hasMemoryCapability = hasMemoryTools(agent);
      const webSearchRequested = hasWebSearchToolRequested(currentStepResponse.tool_calls);
      const memoryAlreadyChecked = hasMemoryToolActivitySince(agent.history, agent && agent._turnStartIndex);
      const memoryFirstEnabled = Boolean(agent && agent.ragConfig && agent.ragConfig.memoryFirst === true);
      const shouldGuardMemoryFirst = memoryFirstEnabled && hasMemoryCapability && webSearchRequested && !memoryAlreadyChecked;
      if (shouldGuardMemoryFirst) {
        const guardCount = Number(agent._memoryFirstGuardCount || 0);
        if (guardCount < 2) {
          agent._memoryFirstGuardCount = guardCount + 1;
          agent.history.push({
            role: "user",
            content: "Policy reminder: Call kb_search or memory_search first. Use web search only if local JSONL/memory evidence is insufficient."
          });
          if (typeof agent.emit === "function") {
            agent.emit("memory_first_guard", {
              attempt: agent._memoryFirstGuardCount,
              tools: currentStepResponse.tool_calls.map((tc) => tc && tc.name ? String(tc.name) : "").filter(Boolean)
            });
          }
          return { handled: true };
        }
      }
      if (!currentStepResponse.content) {
        const synthetic = buildSyntheticToolPlan(currentStepResponse.tool_calls);
        emitDecisionTrace(agent, synthetic, turnCount);
        agent.emit("assistant_message_started", { step: turnCount });
        agent.emit("agent_message_content_delta", { delta: synthetic, step: turnCount });
        agent.history.push({ role: "assistant", content: synthetic });
      }
      const assistantEntry = {
        role: "assistant",
        content: currentStepResponse.content || null,
        tool_calls: currentStepResponse.tool_calls
      };
      const applied = applyUsageToEntry(assistantEntry, currentStepResponse._usage);
      agent.history.push(assistantEntry);
      if (applied) {
        agent.emit("token_count", buildTokenUsageInfo(agent.history));
      }
      const toolResults = await agent._executeTools(currentStepResponse.tool_calls);
      agent.history.push(...toolResults);
      recordKnowledgeSelections({
        agent,
        toolCalls: currentStepResponse.tool_calls,
        toolResults,
        turnCount
      });
      const approvalBlocked = detectApprovalBlock(toolResults);
      if (approvalBlocked) {
        if (agent) agent._approvalDeniedThisTurn = true;
        let maxRisk = 0;
        if (agent && agent.tools) {
          for (const b of approvalBlocked) {
            const t = b && b.tool ? agent.tools[b.tool] : null;
            const r = t && typeof t.risk === "number" ? t.risk : 2;
            if (r > maxRisk) maxRisk = r;
          }
        }
        if (maxRisk >= 2) {
          const tools = approvalBlocked.map((b) => b.tool).filter(Boolean).join(", ");
          const reason = approvalBlocked[0] && approvalBlocked[0].error ? approvalBlocked[0].error : "ApprovalDenied";
          const successCount = countSuccessfulEvidenceTools({ toolResults });
          const turnEvidence = hasAnyTurnEvidence({ history: agent && agent.history, startIndex: agent && agent._turnStartIndex });
          if (agent && typeof agent.emit === "function") {
            agent.emit("approval_blocked", {
              tools: approvalBlocked,
              reason,
              successCount,
              turnEvidence,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
          if (successCount === 0 && !turnEvidence) {
            const message = `I can't continue because approval was not granted for tool(s): ${tools}.

If you want me to use those tools, please approve. Otherwise, tell me what assumptions/region you want and I can give a best-effort, non-verified answer.`;
            return { handled: true, stopTurn: true, stopReason: reason, message };
          }
          if (agent && Array.isArray(agent.history)) {
            if (!agent._approvalDenyHints) agent._approvalDenyHints = /* @__PURE__ */ new Set();
            const key = `${reason}:${tools}`;
            if (!agent._approvalDenyHints.has(key)) {
              agent._approvalDenyHints.add(key);
              agent.history.push({ role: "user", content: formatApprovalBlockedHint(approvalBlocked) });
            }
          }
        }
      }
      return { handled: true };
    }
    module.exports = {
      handleToolCalls,
      isRealtimeQuery,
      hasToolActivitySince,
      hasEvidenceToolActivitySince,
      getPendingPlanSteps,
      maybeAutoMemoryLookup,
      maybeAutoMemorySave
    };
  }
});

// utils/agent-guards.js
var require_agent_guards = __commonJS({
  "utils/agent-guards.js"(exports, module) {
    var { isRealtimeQuery, hasEvidenceToolActivitySince, getPendingPlanSteps } = require_agent_tool_flow();
    var { hasCitationForKnowledge, buildCitationReminder } = require_knowledge_evidence();
    function applyTurnGuards({
      agent,
      userInput,
      turnStartIndex,
      currentStepResponse,
      realtimeGuardCount,
      planGuardCount
    }) {
      const isRealtime = isRealtimeQuery(userInput);
      const hasToolActivity = hasEvidenceToolActivitySince(agent.history, turnStartIndex);
      const isEmptyAnswer = !currentStepResponse.content || !String(currentStepResponse.content).trim();
      if (isRealtime && !hasToolActivity && realtimeGuardCount < 2) {
        const nextCount = realtimeGuardCount + 1;
        const reminder = nextCount === 1 ? "Reminder: This request asks for real-time data. You MUST call the relevant tools before providing a final answer." : "Final reminder: Call the relevant tools for real-time data before responding.";
        agent.history.push({ role: "user", content: reminder });
        agent.emit("realtime_tool_guard", {
          message: userInput,
          attempt: nextCount,
          emptyAnswer: isEmptyAnswer
        });
        return { shouldContinue: true, realtimeGuardCount: nextCount, planGuardCount };
      }
      const selectedKnowledgeIds = agent && agent._knowledgeSelectedIdSet instanceof Set ? Array.from(agent._knowledgeSelectedIdSet) : [];
      if (selectedKnowledgeIds.length > 0) {
        const citationGuardCount = Number(agent && agent._citationGuardCount || 0);
        const hasCitation = hasCitationForKnowledge({
          text: currentStepResponse && currentStepResponse.content,
          knowledgeIds: selectedKnowledgeIds
        });
        if (!hasCitation && citationGuardCount < 2) {
          const nextCount = citationGuardCount + 1;
          if (agent) agent._citationGuardCount = nextCount;
          agent.history.push({
            role: "user",
            content: buildCitationReminder({ knowledgeIds: selectedKnowledgeIds })
          });
          agent.emit("citation_guard", { attempt: nextCount, knowledgeIds: selectedKnowledgeIds });
          return { shouldContinue: true, realtimeGuardCount, planGuardCount };
        }
      }
      const pendingSteps = getPendingPlanSteps(agent.currentPlan);
      if (pendingSteps.length > 0 && planGuardCount < 1 && !(agent && agent._approvalDeniedThisTurn)) {
        const nextCount = planGuardCount + 1;
        agent.history.push({
          role: "user",
          content: `Reminder: You have pending plan steps. Complete them (use tools) before final answer. Pending: ${pendingSteps.join(" | ")}`
        });
        agent.emit("plan_completion_guard", { attempt: nextCount, pendingCount: pendingSteps.length });
        return { shouldContinue: true, realtimeGuardCount, planGuardCount: nextCount };
      }
      return { shouldContinue: false, realtimeGuardCount, planGuardCount };
    }
    module.exports = { applyTurnGuards };
  }
});

// utils/agent-history-helpers.js
var require_agent_history_helpers = __commonJS({
  "utils/agent-history-helpers.js"(exports, module) {
    var SUMMARY_PREFIX = "Another language model started to solve this problem and produced a summary of its thinking process. You also have access to the state of the tools that were used by that language model. Use this to build on the work that has already been done and avoid duplicating work. Here is the summary produced by the other language model, use the information in this summary to assist with your own analysis:";
    function isStrongInstruction(msg) {
      if (!msg || msg.role !== "user") return false;
      if (typeof msg.content !== "string") return false;
      const trimmed = msg.content.trimStart();
      return trimmed.startsWith("# AGENTS.md instructions for ") || trimmed.startsWith("<user_instructions>") || trimmed.startsWith("<skill");
    }
    function isEnvironmentContext(msg) {
      if (!msg || msg.role !== "user" || typeof msg.content !== "string") return false;
      return msg.content.trimStart().toLowerCase().startsWith("<environment_context>");
    }
    function isTurnAborted(msg) {
      if (!msg || msg.role !== "user" || typeof msg.content !== "string") return false;
      return msg.content.trimStart().toLowerCase().startsWith("<turn_aborted>");
    }
    function isSummaryMessage(msg) {
      if (!msg || msg.role !== "user" || typeof msg.content !== "string") return false;
      return msg.content.startsWith(SUMMARY_PREFIX);
    }
    function isSessionPrefixMessage(msg) {
      return isStrongInstruction(msg) || isEnvironmentContext(msg) || isSummaryMessage(msg);
    }
    function isInstructionLikeUserMessage(msg) {
      if (!msg || msg.role !== "user") return false;
      if (typeof msg.content !== "string") return false;
      const trimmed = msg.content.trimStart();
      const lowered = trimmed.toLowerCase();
      return trimmed.startsWith("# AGENTS.md instructions for ") || trimmed.startsWith("<user_instructions>") || trimmed.startsWith("<skill") || lowered.startsWith("<environment_context>") || lowered.startsWith("<turn_aborted>");
    }
    module.exports = {
      SUMMARY_PREFIX,
      isStrongInstruction,
      isEnvironmentContext,
      isTurnAborted,
      isSummaryMessage,
      isSessionPrefixMessage,
      isInstructionLikeUserMessage
    };
  }
});

// utils/text-utils.js
var require_text_utils = __commonJS({
  "utils/text-utils.js"(exports, module) {
    function truncateText(text, maxChars) {
      const s = typeof text === "string" ? text : "";
      if (!Number.isFinite(maxChars) || maxChars <= 0) return s;
      if (s.length <= maxChars) return s;
      return s.slice(0, maxChars) + "...";
    }
    function sanitizeSummaryText(text) {
      if (typeof text !== "string") return "";
      const lines = text.split("\n");
      const filtered = lines.filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        const lower = trimmed.toLowerCase();
        if (lower.startsWith("rules:") || lower.startsWith("rule:")) return false;
        if (lower.includes("forbidden")) return false;
        if (lower.includes("do not")) return false;
        if (lower.includes("must")) return false;
        if (lower.includes("should")) return false;
        if (lower.includes("not listing")) return false;
        if (lower.includes("summary prompt")) return false;
        return true;
      });
      return filtered.join("\n").trim();
    }
    module.exports = {
      truncateText,
      sanitizeSummaryText
    };
  }
});

// utils/history-compactor.js
var require_history_compactor = __commonJS({
  "utils/history-compactor.js"(exports, module) {
    var { estimateTextTokens } = require_token_estimator();
    var {
      SUMMARY_PREFIX,
      isStrongInstruction,
      isEnvironmentContext,
      isTurnAborted
    } = require_agent_history_helpers();
    var { truncateText, sanitizeSummaryText } = require_text_utils();
    var SUMMARY_PROMPT = [
      "You are performing a CONTEXT CHECKPOINT COMPACTION. Create a handoff summary for another LLM that will resume the task.",
      "",
      "Include:",
      "- Current progress and key decisions made",
      "- Important context, constraints, or user preferences",
      "- What remains to be done (clear next steps)",
      "- Any critical data, examples, or references needed to continue",
      "",
      "Rules:",
      "- Do NOT include real-time or volatile values (prices, exchange rates, news details). Instead, say they were retrieved.",
      "- Do NOT introduce unrelated topics from older tasks unless they are still active requirements.",
      "- Keep the summary focused on the current user intent and active work.",
      "- You are FORBIDDEN from listing specific numeric values, timestamps, or prices.",
      "- Summarize only task state, constraints, and decisions; omit detailed observations.",
      "",
      "Be concise, structured, and focused on helping the next LLM seamlessly continue the work."
    ].join("\n");
    function estimateMessageTokens(msg) {
      if (!msg || typeof msg !== "object") return 0;
      let content = "";
      if (typeof msg.content === "string") {
        content = msg.content;
      } else if (msg.content != null) {
        try {
          content = JSON.stringify(msg.content);
        } catch {
          content = "[unserializable content]";
        }
      }
      let toolCalls = "";
      if (msg.tool_calls != null) {
        try {
          toolCalls = JSON.stringify(msg.tool_calls);
        } catch {
          toolCalls = "[unserializable tool_calls]";
        }
      }
      const role = typeof msg.role === "string" ? msg.role : "";
      return estimateTextTokens(`${role}:${content}${toolCalls ? `
${toolCalls}` : ""}`);
    }
    function estimateHistoryTokens(history) {
      if (!Array.isArray(history) || history.length === 0) return 0;
      let total = 0;
      for (const msg of history) {
        total += estimateMessageTokens(msg);
      }
      return total;
    }
    function serializeMessage(msg, perMessageLimit) {
      if (!msg || typeof msg !== "object") return "";
      const role = typeof msg.role === "string" ? msg.role : "unknown";
      let content = "";
      if (typeof msg.content === "string") {
        content = msg.content;
      } else {
        try {
          content = JSON.stringify(msg.content);
        } catch {
          content = "[unserializable content]";
        }
      }
      return `${role.toUpperCase()}: ${truncateText(content, perMessageLimit)}`;
    }
    function serializeHistory(messages, { maxChars = 2e4, perMessageLimit = 2e3 } = {}) {
      const lines = [];
      let used = 0;
      for (const msg of messages) {
        const line = serializeMessage(msg, perMessageLimit);
        if (!line) continue;
        const nextUsed = used + line.length + 1;
        if (nextUsed > maxChars) break;
        lines.push(line);
        used = nextUsed;
      }
      return lines.join("\n");
    }
    function collectFixedPrefixIndices(history, tailStart) {
      const indices = /* @__PURE__ */ new Set();
      let lastEnv = -1;
      let lastAbort = -1;
      for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        if (isEnvironmentContext(msg)) lastEnv = i;
        if (isTurnAborted(msg)) lastAbort = i;
        if (isStrongInstruction(msg)) indices.add(i);
      }
      if (lastEnv >= 0) indices.add(lastEnv);
      if (lastAbort >= 0) indices.add(lastAbort);
      for (const idx of Array.from(indices)) {
        if (idx >= tailStart) indices.delete(idx);
      }
      return indices;
    }
    async function compactHistory({ history, llm, config, signal }) {
      if (!Array.isArray(history) || history.length === 0) {
        return { history: Array.isArray(history) ? history : [], compacted: false, originalLength: 0 };
      }
      const cfg = config || {};
      if (cfg.enabled === false) return { history, compacted: false, originalLength: history.length };
      const triggerMessages = Number.isFinite(cfg.triggerMessages) ? cfg.triggerMessages : 120;
      const triggerTokens = Number.isFinite(cfg.triggerTokens) ? cfg.triggerTokens : null;
      const estimatedTokens = triggerTokens && triggerTokens > 0 ? estimateHistoryTokens(history) : null;
      const overTokenTrigger = estimatedTokens != null ? estimatedTokens > triggerTokens : false;
      const overMessageTrigger = history.length > triggerMessages;
      if (!overMessageTrigger && !overTokenTrigger) {
        return { history, compacted: false, originalLength: history.length };
      }
      const keepRecent = Number.isFinite(cfg.keepRecentMessages) ? cfg.keepRecentMessages : 10;
      const tailStartIndex = Math.max(0, history.length - keepRecent);
      const fixedPrefixIndices = collectFixedPrefixIndices(history, tailStartIndex);
      const fixedPrefix = Array.from(fixedPrefixIndices).sort((a, b) => a - b).map((idx) => history[idx]);
      const compactCandidates = history.filter((_, idx) => !fixedPrefixIndices.has(idx) && idx < tailStartIndex);
      if (compactCandidates.length === 0) {
        return { history, compacted: false, originalLength: history.length };
      }
      const summaryInput = serializeHistory(compactCandidates, {
        maxChars: Number.isFinite(cfg.maxSummaryChars) ? cfg.maxSummaryChars : 2e4,
        perMessageLimit: Number.isFinite(cfg.maxMessageChars) ? cfg.maxMessageChars : 2e3
      });
      if (!summaryInput || !llm || typeof llm.chat !== "function") {
        return { history, compacted: false, originalLength: history.length };
      }
      const summaryResponse = await llm.chat(SUMMARY_PROMPT, [{ role: "user", content: summaryInput }], { signal });
      const rawSummaryText = summaryResponse && typeof summaryResponse.content === "string" ? summaryResponse.content.trim() : "";
      const summaryText = sanitizeSummaryText(rawSummaryText);
      if (!summaryText) return { history, compacted: false, originalLength: history.length };
      const summaryMessage = { role: "user", content: `${SUMMARY_PREFIX}
${summaryText}` };
      const tailMessages = history.slice(tailStartIndex);
      return {
        history: [...fixedPrefix, summaryMessage, ...tailMessages],
        compacted: true,
        summary: summaryText,
        originalLength: history.length
      };
    }
    async function maybeCompactAgentHistory(agent, options = {}) {
      if (!agent || !agent.compaction || agent.compaction.enabled === false) return null;
      const signal = options && options.signal ? options.signal : null;
      const result = await compactHistory({
        history: agent.history,
        llm: agent.llm,
        config: agent.compaction,
        signal
      });
      if (result && result.compacted) {
        agent.history = result.history;
        const summaryLength = result.summary ? result.summary.length : 0;
        console.log(`[Agent] History compacted: ${result.originalLength} -> ${agent.history.length} (summary ${summaryLength} chars)`);
        if (typeof agent.emit === "function") {
          agent.emit("context_compacted", {
            originalLength: result.originalLength,
            newLength: agent.history.length,
            summary: result.summary || null,
            summaryLength
          });
        }
      }
      return result || null;
    }
    module.exports = {
      compactHistory,
      maybeCompactAgentHistory,
      SUMMARY_PROMPT,
      SUMMARY_PREFIX
    };
  }
});

// utils/agent-trace.js
var require_agent_trace = __commonJS({
  "utils/agent-trace.js"(exports, module) {
    var { getTotalUsageFromHistory } = require_agent_usage();
    var { riskLabel } = require_imda_policy();
    var { getToolRegistrySnapshot } = require_agent_tools_registry();
    var DEFAULT_MAX_EVENTS = 1e3;
    var SENSITIVE_KEYS = [
      "api_key",
      "apikey",
      "secret",
      "password",
      "credential",
      "authorization",
      "bearer"
    ];
    function isSensitiveKey(key) {
      if (!key) return false;
      const lowered = String(key).toLowerCase();
      if (SENSITIVE_KEYS.includes(lowered)) return true;
      return lowered.endsWith("token");
    }
    function redactValue(value, seen) {
      if (value === null || value === void 0) return value;
      if (typeof value === "string") return value;
      if (typeof value !== "object") return value;
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
      if (Array.isArray(value)) {
        return value.map((item) => redactValue(item, seen));
      }
      const out = {};
      for (const [key, val] of Object.entries(value)) {
        if (isSensitiveKey(key)) {
          out[key] = "[REDACTED]";
          continue;
        }
        out[key] = redactValue(val, seen);
      }
      return out;
    }
    function normalizePayload(payload) {
      if (payload === void 0) return null;
      if (payload === null) return null;
      if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean") return payload;
      const seen = /* @__PURE__ */ new Set();
      return redactValue(payload, seen);
    }
    function detectPlatform() {
      if (typeof window !== "undefined" && typeof window.document !== "undefined") return "browser";
      return "node";
    }
    function createTraceCollector(agent, options = {}) {
      const maxEvents = options && Number.isFinite(options.maxEvents) && options.maxEvents > 0 ? Math.floor(options.maxEvents) : DEFAULT_MAX_EVENTS;
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const events = [];
      const handlers = /* @__PURE__ */ new Map();
      const push = (type, payload) => {
        events.push({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          type,
          payload
        });
        if (events.length > maxEvents) events.splice(0, events.length - maxEvents);
      };
      const on = (event, type, mapper) => {
        const handler = (payload) => {
          const mapped = mapper ? mapper(payload) : payload;
          push(type, mapped);
        };
        handlers.set(event, handler);
        if (agent && typeof agent.on === "function") agent.on(event, handler);
      };
      on("turn_started", "turn.started", (payload) => ({
        message: payload && payload.message ? String(payload.message) : "",
        timestamp: payload && payload.timestamp ? payload.timestamp : void 0
      }));
      on("decision_trace", "decision.trace");
      on("approval_required", "approval.required");
      on("approval_skipped", "approval.skipped");
      on("user_input_requested", "user_input.requested");
      on("user_input_response", "user_input.response");
      on("tool_call", "tool.call.requested");
      on("tool_call_begin", "tool.call.begin");
      on("tool_call_end", "tool.call.end");
      on("tool_result", "tool.result");
      on("knowledge_selected", "knowledge.selected");
      on("tool_error", "tool.error");
      on("plan_updated", "plan.updated");
      on("context_compacted", "context.compacted");
      on("state_changed", "state.changed");
      on("turn_aborted", "turn.aborted");
      on("agent_turn_complete", "turn.completed");
      const exportSessionTrace = (exportOptions = {}) => {
        const platform = detectPlatform();
        const identity = agent && agent.identity ? agent.identity : null;
        const riskProfile = agent && agent.riskProfile ? agent.riskProfile : null;
        const modelName = agent && agent.llm && agent.llm.modelName ? agent.llm.modelName : null;
        const usage = getTotalUsageFromHistory(agent && agent.history ? agent.history : []);
        const turnCount = events.filter((ev) => ev.type === "turn.started").length;
        const toolsUsed = Array.from(new Set(
          events.filter((ev) => ev.type === "tool.call.begin" || ev.type === "tool.result").map((ev) => ev && ev.payload && ev.payload.name ? ev.payload.name : ev.payload && ev.payload.tool ? ev.payload.tool : null).filter(Boolean)
        ));
        let maxRisk = null;
        for (const ev of events) {
          if (ev.type !== "approval.required" && ev.type !== "approval.skipped") continue;
          const risk = ev && ev.payload && typeof ev.payload.risk === "number" ? ev.payload.risk : null;
          if (risk === null) continue;
          if (maxRisk === null || risk > maxRisk) maxRisk = risk;
        }
        const summary = {
          totalTurns: turnCount,
          totalTokens: usage && typeof usage.total_tokens === "number" ? usage.total_tokens : null,
          maxRiskLevel: maxRisk === null ? null : riskLabel(maxRisk),
          toolsUsed
        };
        const toolRegistrySnapshot = getToolRegistrySnapshot(agent, toolsUsed);
        const normalizedEvents = events.map((ev, idx) => {
          const base = {
            idx,
            timestamp: ev.timestamp,
            type: ev.type,
            payload: normalizePayload(ev.payload)
          };
          return base;
        });
        return {
          version: "1.0-opencode",
          metadata: {
            sessionId,
            exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
            platform,
            agent: {
              model: modelName,
              tier: riskProfile && typeof riskProfile.tier === "number" ? riskProfile.tier : null,
              identity
            }
          },
          summary,
          snapshot: agent && typeof agent.dumpSnapshot === "function" ? agent.dumpSnapshot() : null,
          toolRegistrySnapshot,
          events: normalizedEvents
        };
      };
      const dispose = () => {
        for (const [event, handler] of handlers.entries()) {
          if (agent && typeof agent.off === "function") agent.off(event, handler);
          else if (agent && typeof agent.removeListener === "function") agent.removeListener(event, handler);
        }
        handlers.clear();
      };
      return { sessionId, events, exportSessionTrace, dispose };
    }
    module.exports = { createTraceCollector };
  }
});

// agents.js
var require_agents = __commonJS({
  "agents.js"(exports, module) {
    var { EventEmitter: EventEmitter2 } = (init_emitter(), __toCommonJS(emitter_exports));
    var { runAsyncIterator: runAgentAsyncIterator } = require_agent_async_iterator();
    var { executeTools } = require_agent_tool_runner();
    var { dumpSnapshot, loadSnapshot, setState, getState } = require_agent_state();
    var { initializeAgentState } = require_agent_setup();
    var { startAgentTurn, finalizeAgentTurn } = require_agent_lifecycle();
    var {
      awaitUserInput,
      respondToUserInput,
      submitPendingInput,
      drainPendingInputs
    } = require_agent_interaction();
    var {
      applyUsageToEntry,
      buildTokenUsageInfo
    } = require_agent_usage();
    var { sanitizeFinalResponse } = require_agent_completion();
    var { runLlmStep } = require_agent_llm();
    var { handleToolCalls, maybeAutoMemoryLookup, maybeAutoMemorySave } = require_agent_tool_flow();
    var { applyTurnGuards } = require_agent_guards();
    var { maybeCompactAgentHistory } = require_history_compactor();
    var { createTraceCollector } = require_agent_trace();
    var Agent = class extends EventEmitter2 {
      constructor({
        llm,
        tools = [],
        systemPrompt = "You are a helpful AI assistant.",
        toolTimeoutMs,
        approvalTimeoutMs,
        approvalPolicy,
        trustedTools,
        toolOutputLimits,
        snapshot,
        maxTurns,
        compaction,
        maxProtectedRecentMessages,
        identity,
        riskProfile,
        ragConfig,
        ragService,
        skillsDir
      } = {}) {
        super();
        initializeAgentState(this, {
          llm,
          tools,
          systemPrompt,
          toolTimeoutMs,
          approvalTimeoutMs,
          approvalPolicy,
          trustedTools,
          toolOutputLimits,
          maxTurns,
          compaction,
          maxProtectedRecentMessages,
          identity,
          riskProfile,
          ragConfig,
          ragService,
          skillsDir
        });
        if (snapshot) {
          this.loadSnapshot(snapshot, { emitPlanEvent: false });
        }
        this._traceCollector = createTraceCollector(this);
      }
      dumpSnapshot() {
        return dumpSnapshot(this);
      }
      loadSnapshot(snapshot, { emitPlanEvent = true } = {}) {
        return loadSnapshot(this, snapshot, { emitPlanEvent });
      }
      _setState(status, metadata = {}) {
        return setState(this, status, metadata);
      }
      getState() {
        return getState(this);
      }
      getIdentity() {
        return this.identity;
      }
      getRiskProfile() {
        return this.riskProfile;
      }
      _awaitUserInput(callId, timeoutMs) {
        return awaitUserInput(this, callId, timeoutMs);
      }
      respondToUserInput(callId, response) {
        return respondToUserInput(this, callId, response);
      }
      submitInput(text) {
        return submitPendingInput(this, text);
      }
      async run(userInput) {
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        if (this._abortController && this._abortController !== controller && !this._abortController.signal?.aborted) {
          this._abortController.abort();
        }
        this._abortController = controller;
        this._abortReason = null;
        const signal = controller ? controller.signal : null;
        const { dbg, turnStartIndex } = startAgentTurn(this, userInput);
        const compactResult = await this._maybeCompactHistory({ signal });
        if (compactResult && this.debug) dbg("Compaction result", { compacted: Boolean(compactResult.compacted), originalLength: compactResult.originalLength, newLength: Array.isArray(this.history) ? this.history.length : 0 });
        let finalResponseText = "";
        let turnCount = 0;
        const MAX_TURNS = this.maxTurns;
        let realtimeGuardCount = 0;
        let planGuardCount = 0;
        let memoryPrecheckDone = false;
        let memoryAutoSaveDone = false;
        try {
          while (turnCount < MAX_TURNS) {
            if (signal && signal.aborted) {
              const err = signal.reason instanceof Error ? signal.reason : new Error("Aborted");
              err.name = "AbortError";
              throw err;
            }
            turnCount++;
            console.log(`[Agent] Step ${turnCount}: Thinking...`);
            this._setState("thinking", { step: turnCount, maxTurns: MAX_TURNS });
            this.emit("thinking", { step: turnCount });
            const pending = drainPendingInputs(this);
            if (pending.length > 0) {
              for (const text of pending) {
                this.history.push({ role: "user", content: text });
              }
              this.emit("pending_input_applied", { count: pending.length });
            }
            const autoMemoryPrecheck = Boolean(this.ragConfig && this.ragConfig.autoMemoryPrecheck === true);
            if (autoMemoryPrecheck && !memoryPrecheckDone) {
              const didLookup = await maybeAutoMemoryLookup({ agent: this, userInput });
              memoryPrecheckDone = didLookup || memoryPrecheckDone;
            }
            if (signal && signal.aborted) {
              const err = signal.reason instanceof Error ? signal.reason : new Error("Aborted");
              err.name = "AbortError";
              throw err;
            }
            let currentStepResponse = { content: "", tool_calls: [] };
            const protectRecentMessages = Math.min(
              this.maxProtectedRecentMessages,
              Math.max(0, this.history.length - turnStartIndex)
            );
            const pruned = this.contextManager.process(this.history, { protectRecentMessages });
            const llmHistory = pruned.history;
            if (pruned.meta && pruned.meta.dropped > 0) {
              this.emit("context_truncated", {
                dropped: pruned.meta.dropped,
                estimatedTokens: pruned.meta.estimatedTokens,
                fullHistoryLength: this.history.length,
                sentHistoryLength: llmHistory.length
              });
            }
            currentStepResponse = await runLlmStep({
              agent: this,
              llm: this.llm,
              systemPrompt: this.systemPrompt,
              llmHistory,
              turnCount,
              signal
            });
            dbg(`Step ${turnCount} LLM response`, { contentLength: currentStepResponse && currentStepResponse.content ? String(currentStepResponse.content).length : 0, toolCalls: Array.isArray(currentStepResponse.tool_calls) ? currentStepResponse.tool_calls.length : 0 });
            const toolFlow = await handleToolCalls({ agent: this, currentStepResponse, turnCount });
            dbg(`Step ${turnCount} tool flow`, { handled: toolFlow.handled, stopTurn: Boolean(toolFlow && toolFlow.stopTurn) });
            if (!toolFlow.handled) {
              const guard = applyTurnGuards({
                agent: this,
                userInput,
                turnStartIndex,
                currentStepResponse,
                realtimeGuardCount,
                planGuardCount
              });
              if (guard.shouldContinue) {
                dbg(`Step ${turnCount} guard triggered`, {
                  realtimeGuardCount: guard.realtimeGuardCount,
                  planGuardCount: guard.planGuardCount
                });
              }
              realtimeGuardCount = guard.realtimeGuardCount;
              planGuardCount = guard.planGuardCount;
              if (guard.shouldContinue) continue;
              console.log(`[Agent] Final Answer Generated.`);
              const cleaned = sanitizeFinalResponse(currentStepResponse.content || "");
              const assistantEntry = { role: "assistant", content: cleaned };
              const applied = applyUsageToEntry(assistantEntry, currentStepResponse._usage);
              this.history.push(assistantEntry);
              if (applied) {
                this.emit("token_count", buildTokenUsageInfo(this.history));
              }
              finalResponseText = cleaned;
              if (!memoryAutoSaveDone) {
                try {
                  memoryAutoSaveDone = await maybeAutoMemorySave({
                    agent: this,
                    userInput
                  });
                } catch {
                }
              }
              this.emit("response", { content: finalResponseText });
              break;
            }
            if (toolFlow && toolFlow.stopTurn) {
              console.log(`[Agent] Turn stopped: ${toolFlow.stopReason || "approval_blocked"}`);
              const content = sanitizeFinalResponse(toolFlow.message || "Approval was not granted.");
              const assistantEntry = { role: "assistant", content };
              this.history.push(assistantEntry);
              finalResponseText = content;
              this.emit("response", { content: finalResponseText });
              break;
            }
          }
        } catch (error) {
          if (error && error.name === "AbortError") {
            const reason = this._abortReason || (error && error.message ? String(error.message) : "aborted");
            this.history.push({ role: "user", content: `<turn_aborted> ${reason}`.trim() });
            finalResponseText = "Aborted.";
          } else {
            const message = error && error.message ? String(error.message) : String(error);
            this._setState("error", { message });
            this.emit("autosave", this.dumpSnapshot());
            throw error;
          }
        }
        try {
          return finalizeAgentTurn({
            agent: this,
            finalResponseText,
            turnCount,
            maxTurns: MAX_TURNS,
            dbg
          });
        } finally {
          this._abortController = null;
          this._abortReason = null;
        }
      }
      async _executeTools(toolCalls) {
        const signal = this._abortController ? this._abortController.signal : null;
        return executeTools(this, toolCalls, { signal });
      }
      async _maybeCompactHistory(options = {}) {
        return await maybeCompactAgentHistory(this, options);
      }
      exportSessionTrace(options = {}) {
        if (!this._traceCollector || typeof this._traceCollector.exportSessionTrace !== "function") return null;
        return this._traceCollector.exportSessionTrace(options);
      }
      /**
       * Streaming interface for UI consumption.
       */
      async *runAsyncIterator(userInput, options = {}) {
        const signal = options && options.signal ? options.signal : this._abortController ? this._abortController.signal : void 0;
        if (signal && typeof signal.addEventListener === "function") {
          if (signal.aborted) this.stop("external_abort");
          else signal.addEventListener("abort", () => this.stop("external_abort"), { once: true });
        }
        yield* runAgentAsyncIterator(this, userInput, { ...options, signal });
      }
      stop(reason = "user_stop") {
        this._abortReason = reason;
        if (this._abortController && this._abortController.signal && !this._abortController.signal.aborted) {
          const abortError = new Error("Aborted");
          abortError.name = "AbortError";
          abortError.reason = reason;
          this._abortController.abort(abortError);
          this.emit("turn_aborted", { reason, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
        }
      }
    };
    module.exports = { Agent };
  }
});
export default require_agents();
//# sourceMappingURL=agents.bundle.mjs.map
