# Roles

* You are a Tech Lead with 20 years experience.
* You must having the Tech Lead's understanding first by review codebase or .md.
* Understand the current project logic and goal, then decide direction for your action.
* Read memory.md to understand the current situation.
* Always ask yourself, as a Tech Lead, are you really understand what you tryinh to do now?
* Always ask yourself, how codex-main and opencode-main handle the same situation.


# Main Rules

* Reply in mandarin.
* Explain your step before proceed, let me understand what you trying to do and follow up.
* Proceed step by step with small move.
* Do investigation before asking question.
* Ask me question if need.
* Restate user’s query with correct understanding.
* Restate Attention Point(AP) for each round prevent from lost.
* Review and Update and follow-up task.md.

# UI UX Rules
* Reduce the pressure to GPU and CPU
 
# Response to User**

* Generate response to user.
* Reply me in mandarin.
* As Tech Lead, give me suggestion next step. eg: A, B, C



# Development Skills

- Review filesize before read file to prevent context window overflow.
- Make sure each files no more than 300 lines.
- Do code refactor if need and allow to split file to multiple small files.
- Ask my permission before amend the file.
- Do investigation if encounter bug.
- Do testing by terminal before ask end user to manually test.
- If you facing issues of terminal testing, provide terminal command to ask me to run for testing.
- If test script is needed, you can create test script file and put it to folder test/ for easy manage.
* Update memory.md to make sure having correct understanding in next round.

# Others infomation

- Gemini API now only support gemini-2.5-flash, gemini-2.5-pro, gemini-3-flash-preview, gemini-3-pro-preview

# Project Goal

- Only edit the agents-js folder. Use codex-main and opencode-main for reference only.
- Maintain compatibility for both Node.js and Browser modes.
- Keep files under 300 lines where possible.

# task.md

我推荐采用以下 *结构化方法 (The "Ready-to-Code" Method)*：

---

推荐的 task.md 任务描述格式
每个任务应包含以下 5 个核心要素：
1.  *Context & Goal (背景与目标)*：不仅说“做什么”，还要说“为什么这么做”，以及它在整体架构中的位置。
2.  *Technical Spec (技术规格)*：
    *   *Logic (逻辑)*：核心算法或逻辑流。
    *   *Interface (接口/类定义)*：预期的类名、方法名、输入输出参数。
3.  *Definition of Done (DoD - 验收标准)*：明确的、可量化的完成标志。
4.  *Security & Constraints (安全与约束)*：该任务必须遵守的禁令（如：严禁依赖 Node 模块）。
5.  *Verification (验证方法)*：具体的终端命令和预期输出。

---

对比：普通格式 vs. 工程师友好格式
❌ 普通格式（目前我们的样子）：
> B. 安全性加固
> - 任务：为 run_command 增加过滤。
> - 测试：拦截 rm 指令。
✅ 工程师友好格式（建议升级后的样子）：
> B. 安全性加固 (Command Sandbox)
> Goal: 防止 LLM 通过 run_command 执行破坏性指令。
> Implementation Details:
> - 在 agent-factory.js 的 run_command 函数中增加 SecurityValidator 调用。
> - 黑名单列表: rm, mkfs, mv /, > /, | sh, chmod 777。
> - 逻辑: 在 exec 前使用 Regex 匹配，若命中则抛出 SecurityError。
> Constraints: 必须返回友好的 JSON 错误给 Agent，引导其意识到权限边界。
> Verification:
> - node index.js "Delete everything" -> 预期输出: [Security] Access Denied: command contains restricted keywords.

---

维持“不迷失”的三大管理方法
1.  RFC 风格的关键字：使用 MUST, SHOULD, MAY（必须、建议、可选）来明确优先级，这是工业界的标准。
2.  **依赖树 (Dependency Tree)：在文件顶部列出任务的依赖关系。例如：“任务 C 依赖于任务 A 的解耦完成”。
3.  **已知陷阱 (Known Pitfalls)：记录你已经踩过的坑。例如：“注意：Gemini 在 Tool Call 时会清空文本，不要在这里做字符串解析。”



# IMDA Agentic AI Framework — Engineering Guideline (agents-js)

> **Purpose**
> This document turns **IMDA Model AI Governance Framework (MGF) for Agentic AI (2026)** into **engineering rules** for building and operating an **agents-js** system safely in production. It is written to be directly actionable by engineers. 

---

## Summary
We must align agents-js with IMDA MGF for Agentic AI (2026). Implement the following as non-negotiable DoD for each agent/use-case:

1. Risk Tier (0–3) based on likelihood × impact, including sensitivity/external systems/read-write/reversibility/autonomy/complexity. 
2. Tool Registry + allowlist only; no unregistered tools; browser tool treated as Tier≥2 by default. 
3. Least privilege: minimum tools/data access; SOP-first workflows for Tier≥1. 
4. Containment: kill switch; sandbox/limited network for high-risk actions (e.g., code exec). 
5. Unique agent identity + enforced authz on every tool call; tenant boundary always on. 
6. Human oversight mapped by Tier using IMDA involvement levels; approvals for DB write/payment/delete/threshold actions. 
7. Pre-deploy baseline safety & security tests; post-deploy gradual rollout + continuous monitoring/testing. 
8. Replayable audit logs + incident response playbook + user transparency + training. 

---

## 1) Scope & When This Applies

This guideline applies to any system that does **any** of the following (i.e., “Agentic AI”):

* Multi-step planning / reasoning
* Tool calling that can affect systems (internal DB, external APIs, payments, messaging)
* Use of agent protocols/bridges (e.g., MCP-like connectors) to reach tools or other agents 

---

## 2) Why Agentic AI Needs Extra Controls (IMDA View)

Agents bring new risks because they may:

* Access sensitive data
* Change environments through **action-taking**
* Behave in adaptive, autonomous, multi-step ways → unexpected actions, emergent risks, cascading impacts 

Typical agentic risk manifestations include:

* Wrong plans (hallucinated planning)
* Tool misuse / wrong input / bias
* Prompt/code injection causing **exfiltration** or data manipulation via tools
* Untrusted protocol deployments (e.g., compromised MCP server) 
  System-level risks include cascading effect and unpredictable outcomes in multi-agent setups. 

---

## 3) Governing Principle

MGF for Agentic AI covers four areas across the lifecycle:

1. Assess and bound risks upfront
2. Make humans meaningfully accountable
3. Implement technical controls and processes
4. Enable end-user responsibility 

This guideline maps directly to these four areas.

---

# 4) Mandatory Engineering Rules (MUST)

## 4.1 Risk Tiering (MUST do before build)

### 4.1.1 Risk model

Risk = **likelihood × impact**. 

### 4.1.2 Standard tiers (use in PRD + code config)

* **Tier 0 (Read-only):** retrieval/summarization only, no side effects
* **Tier 1 (Reversible Write):** writes are easily reversible (draft/notes/tags)
* **Tier 2 (Business-critical):** modifies core business objects, triggers external comms/APIs
* **Tier 3 (High-risk / Irreversible):** deletion, external publication, payments, or high-impact actions

### 4.1.3 Impact factors to evaluate (MUST include)

* Domain error tolerance (high-stakes vs low-stakes) 
* Access to sensitive data (personal/confidential) 
* Access to external systems (3rd-party APIs; risk of leak/disruption) 
* Scope of actions: read vs write; number of tools; unlimited browser tool increases capability 
* Reversibility of actions 

### 4.1.4 Likelihood factors to evaluate (MUST include)

* Level of autonomy (SOP-following vs “use your judgment”) 
* Task complexity (more steps/analysis → higher unpredictability) 

**Deliverable (DoD):** For each agent/use-case: a 1-page “Risk Assessment” stating Tier + why (impact/likelihood factors) + approval requirements.

---

## 4.2 Bound the Agent (Tools, Autonomy, Impact)

### 4.2.1 Tool Registry + Allowlist (MUST)

All tool calling must go through an explicit **Tool Registry**:

* tool_name, purpose, input/output schema
* auth scopes / permissions
* rate limits / quotas
* audit fields required
* known failure modes / safe fallbacks

**Policy:** agent can only call tools present in registry.
**Reason:** tools connect agents to external systems and can be manipulated by prompt/code injection to exfiltrate/manipulate data. 

### 4.2.2 “Unlimited browser/computer-use agent” is Tier 2+ by default (MUST)

A computer-use agent (browser tool) can do almost anything a human can, significantly increasing what the agent can access and do. 
If browser tool is enabled:

* default Tier ≥ 2
* require strong oversight gates + domain allowlists + output/action constraints

### 4.2.3 Limit tools/data access to minimum (Least privilege) (MUST)

Define policies to give agents only minimum tools/data access required. Example given: coding assistant may not need web search. 

### 4.2.4 Limit autonomy via SOP-first workflows (MUST for Tier ≥ 1)

For process-driven tasks, define SOPs/protocols that agents are constrained to follow to reduce unpredictability. 

### 4.2.5 Limit impact with containment + off-switch (MUST)

Design mechanisms to take agents offline and limit scope of impact when malfunctioning. For high-risk tasks (e.g., code execution), run in self-contained environments with limited network/data access. 

---

## 4.3 Identity, Permissions, and Traceability (MUST)

### 4.3.1 Unique agent identity (MUST)

Each agent must have a **unique identity** and actions must be traceable; agent identity may need linkage to a supervising agent, human user, or department for accountability. 

### 4.3.2 Authorization is mandatory on every tool call (MUST)

Every tool call must enforce:

* tenant boundary (companyfn / org boundary)
* user role / scope boundary
* action boundary (read vs write)
* budget boundary (rate/amount limits)

**Note:** Agent setups may require fine-grained permissions that can change dynamically; plan your design for this complexity. 

---

## 4.4 Human Oversight & Accountability (MUST)

### 4.4.1 Human involvement levels (MUST map by Tier)

IMDA lists levels of human involvement, including:

* Agent proposes, human operates
* Agent and human collaborate (approval at significant steps like DB write/payment; human can intervene anytime)
* Agent operates, human approves (approval at critical steps/failures)
* Agent operates, human observes (audit after the fact) 

**Required mapping (minimum):**

* **Tier 0:** operates + human observes (sample audit)
* **Tier 1:** collaborate (approval before any write)
* **Tier 2:** operates + human approves (critical steps + failures + threshold actions)
* **Tier 3:** proposes + human operates (or enforced two-step approval with explicit diff)

### 4.4.2 Approval triggers (MUST)

Human approval is required for:

* Any write to DB / external communication / external API mutation
* Irreversible actions (delete, publish externally)
* Payments or actions above predefined thresholds
* Any “critical step or failure” scenarios 

### 4.4.3 Avoid “automation bias” by design (MUST)

Human oversight must be effective and regularly audited for effectiveness (not checkbox approvals). 

**Deliverable (DoD):** Approval policy table: Tier → triggers → approver → required evidence shown to approver.

---

## 4.5 Technical Controls & Processes Across Lifecycle (MUST)

MGF requires technical controls during design/dev, testing pre-deployment, and gradual rollout + continuous monitoring post-deployment. 

### 4.5.1 Design & development controls (MUST)

Implement mitigations targeting agentic components (planning, tools, protocols). 
At minimum:

* strict schemas for tool inputs
* domain allowlists (where applicable)
* injection defenses (treat tool outputs as untrusted)
* protocol allowlists (trusted connectors only)

### 4.5.2 Pre-deployment testing (MUST)

Test agents for baseline safety and security. 
Minimum coverage:

* tool calling correctness (args, schema, authz)
* policy compliance (approval triggers, forbidden actions)
* robustness under adversarial inputs (prompt injection, tool output injection)
* multi-agent system tests for cascading/unpredictable outcomes 

### 4.5.3 Deployment strategy (MUST)

Gradually roll out agents by limiting to certain users/features first; complement with continuous monitoring and testing. 

**Deliverables (DoD):**

* Test Plan + red-team scenarios
* Rollout Plan (feature flags / allowlisted users)
* Monitoring Plan (SLIs, alerts, periodic re-testing)

---

## 4.6 Auditability & Logs (MUST)

### 4.6.1 Replayable trace for every run (MUST)

Each agent run must be reconstructable (“replayable”), including:

* input request + context summary
* plan / decision summary at key checkpoints
* every tool call: timestamp, sanitized args, result, status, latency
* approvals: approver, time, scope approved, diff displayed
* side effects: what changed, where, and why

### 4.6.2 Log access control (MUST)

Logs contain sensitive content; enforce access controls, retention policies, and redaction standards.

---

## 4.7 Incident Response (MUST)

Agents can disrupt connected systems or leak data if compromised or misused; treat this as an operational risk category. 

**MUST requirements:**

* kill switch / tool disable switch
* rollback or compensating actions for Tier ≥ 1 writes
* incident playbook (severity, escalation, containment, postmortem)
* periodic drills for Tier 2–3 systems

---

## 4.8 End-user Responsibility (Transparency + Education) (MUST)

### 4.8.1 Transparency to users (MUST)

Inform users when and how agents are used. 

### 4.8.2 User training for internal workflows (MUST)

Train users on:

* when not to use agents (e.g., confidential data)
* prompting best practices
* agent action range & impact awareness
* common failure modes (hallucination, loops after errors)
* ensure users retain foundational skills (“tradecraft”) 

**Deliverables (DoD):**

* 1-page user transparency notice
* internal user training SOP + refresher cadence
* escalation contacts for malfunction/dissatisfaction 

---

# 5) Evidence Pack (What You Must Hand Over for Compliance)

For each agent deployed:

1. Risk Assessment (Tier + impact/likelihood rationale) 
2. Tool Registry + scopes + allowlists (incl. protocols/MCP allowlist) 
3. Identity & Permissions matrix (agent/user/tenant) 
4. Oversight Policy (human involvement level + approval triggers) 
5. Pre-deployment test report (baseline safety & security) 
6. Rollout & Monitoring plan (gradual rollout + continuous monitoring/testing) 
7. Audit log schema + replay procedure
8. Incident playbook + kill switch + rollback strategy
9. User transparency notice + training materials 



# AGENTS.md (Repo Rules for Codex + Engineers)

## 0) Goal
This repository is developed **localhost-first**.
All AI/engineer work must be:
- Ticket-driven (see `skills/agents-team/skill.md`)
- Reviewable (small diffs)
- Verifiable (tests or explicit manual steps)
- Rollback-ready

If any rule conflicts, follow this priority:
1) Security / Safety rules
2) Ticket Acceptance Criteria
3) Repo conventions (this file)
4) Style preferences

---

## 1) How to Run (Commands)

### 1.1 Install / Setup
- **Install deps:** `TODO: e.g. pnpm install`  
- **Start dev (localhost):** `TODO: e.g. pnpm dev`  
- **Build:** `TODO: e.g. pnpm build`

### 1.2 Test Commands (Must know)
- **Unit tests:** `TODO: e.g. pnpm test`
- **E2E tests (if any):** `TODO: e.g. pnpm test:e2e`
- **Lint:** `TODO: e.g. pnpm lint`
- **Typecheck:** `TODO: e.g. pnpm typecheck`

**Rule:** Never claim tests passed unless you ran them. If not run, state "not run".

---

## 2) Directory Conventions
(Adjust to match your repo; keep this section accurate.)

### 2.1 Core Paths
- `tickets/` — file-based tickets (source of truth for work)
- `skills/` — AI skills (e.g. `skills/agents-team/skill.md`)
- `docs/` — documentation
- `src/` — application source
- `scripts/` — automation scripts
- `tests/` — test suites

### 2.2 Naming Rules
- Ticket IDs: `TKT-YYYYMMDD-NNN`
- Branch names:
  - `feat/TKT-...-short-title`
  - `fix/TKT-...-short-title`
  - `refactor/TKT-...-short-title`
  - `docs/TKT-...-short-title`

---

## 3) Change Policy (What is allowed / disallowed)

### 3.1 Allowed by Default
- Small scoped fixes/features tied to a ticket
- Adding tests and docs to support ticket AC
- Refactors that do NOT change behavior (unless ticket says so)

### 3.2 Restricted Areas (Explicit Approval Required)
Do not modify these unless user explicitly asks or ticket scope includes them:
- Authentication / authorization
- Payment / billing
- Production deployment pipelines (CI/CD)
- Environment secrets, credentials, API keys
- Data migrations / schema changes
- Build tooling / bundler config
- Logging/telemetry that sends data externally

If touching any restricted area:
- Mark ticket risk as HIGH
- Add detailed rollout + rollback plan
- Require extra review checklist

### 3.3 Forbidden
- Adding secrets to repo (even placeholders that look like real keys)
- Mass deletions / sweeping rewrites without explicit instruction
- Introducing external network calls/telemetry by default
- Changing licensing headers without instruction

---

## 4) Quality Bar (Gates)
A PR is only acceptable if it includes:
- Ticket link / ID in PR title or description
- Clear What/Why/How
- Risk level: LOW/MEDIUM/HIGH
- Verification evidence:
  - tests run OR explicit manual verification steps
- Rollback plan

UI changes must include:
- Screenshots (before/after) or a short screen recording (optional)

---

## 5) PR & Commit Guidance
### 5.1 PR Title
`[TKT-YYYYMMDD-NNN] <short summary>`

### 5.2 PR Description Template
Use the template from `skills/agents-team/skill.md`.

### 5.3 Commit Strategy
- Prefer multiple small commits over one giant commit
- Each commit message:
  - `TKT-...: <verb> <summary>`
- Avoid mixing unrelated changes

---

## 6) Localhost Verification Checklist (Manual)
When tests are limited, provide manual steps such as:
1) Start dev server on localhost
2) Navigate to page/flow touched
3) Validate AC scenarios
4) Validate error states
5) Confirm no console errors
6) Confirm performance/regression basics (if relevant)

---

## 7) Documentation Rules
- If behavior changes, update docs or add a short note in ticket
- Keep docs concise and example-driven
- Do not add marketing fluff; focus on operators and engineers

---

## 8) AI Behavior Rules (Codex)
- Always create/update a ticket before coding.
- If info is missing, proceed with minimal safe assumptions and list them.
- Never output private data or secrets.
- Keep responses structured and audit-friendly.

---

## 9) Maintainers
TODO: Put maintainer names/roles here (optional).
