# task-archive.md

## Archive (Completed Tasks)

### 2026-02-04 (Recent)
- S31 Browser Gemini 3 response unwrap fix: 兼容 `.response` 缺失的返回结构，避免空回答与 turn limit。
- S32 Browser Gemini tool declarations wiring: browser 端传递 tools，恢复 functionCall。
- S33 Suppress non-streaming content deltas: 非流式模式仅输出最终回答，避免 UI 叠加。
- S34 Enable SSE streaming for gemini-3 in browser: 默认启用 streaming，可通过配置关闭。
- S35 Browser approval modal: 审批弹窗与 `approval_required` 事件对齐。
- S36 Gemini 3 browser streaming tool-call fallback: 缺 thought_signature 时降级为 text 注入。
- S37 Separate approval timeout from tool timeout: 审批等待与 tool timeout 分离。
- S38 Browser approval modal auto-timeout: 超时自动关闭弹窗并提示。
- S39 Approval countdown + 30s reminder: UI 倒计时与 30s 提醒。
- S40 IMDA Approval UX modes + MCP tool risk overrides: approvalMode、risk overrides 与生产/调试文案。
- S41 Production approval copy tuning: 审批提示改为“人话”文案。
- S42 Fix IMDA approval pre-exec telemetry: 审批前不 emit tool_call_begin。
- S43 Browser Plan panel: update_plan -> plan.updated -> UI 面板贯通。
- S31a Browser SDK parity: usage/retry/parsing 对齐，header token bar。
- S25 Tool log folding + system-note styling: 轻量化工具日志与思考展示。
- S26 Browser Gemini 3 preview stream fallback: 预览模型禁用 streaming 规避 400。
- S27 Browser SDK migration to @google/genai: Browser 端迁移新 SDK。
- S28 Debug logging for turn-limit diagnosis: debug 日志补齐关键诊断点。
- S29 Enable browser debug config by default: standalone 默认 debug。
- S30 Browser genai response text handling fix: 兼容 response.text 函数/字符串。
- IMDA-2 Tool Registry with Risk Metadata: 工具 risk 元数据完善。
- IMDA-3 Execution gate with real approval: Tier 审批门禁执行前生效。
- CLI-3 Approval UI alignment: CLI 审批提示含风险/身份。

### 2026-02-03 (Recent)
- S17 Browser UI/UX align to ChatGPT Light: 用户/助理对齐、胶囊输入框、代码块复制、输入不失焦、Header token bar 与细节微调。
- S31 Browser SDK parity (usage + retry + parsing): 补齐 usage 输出、轻量重试、解析对齐，并在 UI 中展示 token usage。
- Note: S17 与 S31 已从 `task.md` Active Tasks 移动到 Recently Completed。

### Completed (High Level)
- A Cross-Platform Adapter: [completed] ✅（Browser manifest + ESM tools；Node async loader；Node/Browser 行为对齐）
- B Command Sandbox: [completed] ✅（`utils/security.js` + `run_command` 门禁 + 测试）
- C Context Management: [completed] ✅（`utils/context-manager.js` + history 裁剪 + 测试）
- D Planning: [completed] ✅（system prompt + synthetic tool plan；用户验收通过）
- E MCP Alignment: [completed] ✅（工具定义/结果对齐 MCP；HTTP/stdio 支持；配置驱动；文档与测试）
- F Error Handling & Self-Healing: [completed] ✅（retry；timeout；rate limit；format error；loop break；browser env restriction；测试）
- G Log & Dedup Cleanup: [completed] ✅（核心工具冲突静默；built-in 优先）
- H Streaming AsyncIterator: [completed] ✅（新增 `Agent.runAsyncIterator()`，UI 可用 `for await...of` 消费事件流；保持 EventEmitter 兼容；补单测）
- I Browser ESM Agent Bundle: [completed] ✅（新增 `utils/emitter.js`；新增 `build-browser-agent.js` 产出 `browser/agents.bundle.mjs` + `browser/agents.mjs`（named export wrapper）；Browser 可 `import { Agent }`）
- J Standalone UI Streaming: [completed] ✅（`browser/standalone.html` 迁移到消费 `Agent.runAsyncIterator()`；修复 streaming 渲染函数作用域；加 `favicon` 占位消除 404 噪音）
- K System Instruction Tuning: [completed] ✅（创作/事实查询意图分流；减少“工具强制”导致的拒答；要求不输出 `Thought:`/`Plan:`）

### E. MCP Alignment (Completed)

Context & Goal:
- 目标：工具定义/工具结果逐步对齐 MCP，提升可复用性与外部集成能力。
- 约束：Node/Browser 都可用；tool result 仍需可被 `agents-js/gemini-adapter.js` 稳定 JSON.parse。

Current Status:
- [completed] ✅
- 已完成：`agents-js/utils/mcp-adapter.js`；`agents-js/skills/mcp_tester`；ESM skill refresh 修复；Context7 失败可读性与 Accept header 加固；E.1/E.2（核心执行链 MCP 包装 + Gemini adapter 兼容/展平）。
- 已完成：E.3（新增 `agents-js/utils/mcp-proxy.js` / `agents-js/utils/mcp-tool-loader.js`；`SkillManager.loadExternalMcpToolsAsync`；`createAgentAsync` 读取 `EXTERNAL_MCP_URLS` 并注入远程 tools；新增 `agents-js/tests/external_mcp_discovery.test.js`）。
- 已完成：E.4 MVP（新增 `agents-js/utils/mcp-config-adapter.js`；支持 `MCP_CONFIG_JSON` 的 per-server headers；远程 tools 默认命名空间 `server__tool`，避免与本地 skill 冲突；新增单测 `agents-js/tests/external_mcp_config_json_headers.test.js`）。
- 已完成：E.4.1（`agents-js/utils/mcp-proxy.js` 增强：默认 `Accept: application/json`、Node-only `User-Agent`、header ByteString 校验、更可读的 fetch/timeout 错误）。
- 已完成：E.4.4（Node 支持从 `mcp-config.json` 读取 MCP 配置；可用 `MCP_CONFIG_PATH` 或 `createAgentAsync({ mcpConfigPath })` 指定；并加入 `.gitignore`）。
- 已完成：E.5（stdio）基础设施（新增 `agents-js/utils/mcp-stdio-client.js`；`agents-js/utils/mcp-tool-loader.js` 支持 `transport: stdio`；`agents-js/utils/mcp-config-adapter.js` 解析 stdio servers；`agents-js/agent-factory.js` 合并 http+stdio 配置；新增 `agents-js/tests/mcp_stdio_client.test.js`；补充 `agents-js/mcp-config.json` 示例；新增 `agents-js/docs/mcp-debugging.md`）。
- 已完成：Memory MCP（stdio）作为本地验证/可选能力保留在 `agents-js/mcp-config.json`（注意隐私与持久化）。

### M. Advanced Planning (Codex Alignment)
Status: completed ✅

Context & Goal:
- 目标：从“自动合成计划”升级为“结构化显式计划”，对齐 `codex-main` 的 `update_plan` / Plan Mode 思路。

### M.1 Built-in `update_plan` Tool
Status: completed ✅

Goal: 提供结构化计划更新工具，便于 UI/客户端渲染与审计。

Implementation Details:
- 在内置工具集中注册 `update_plan`，参数包含 `explanation` 与 `plan` 列表。
- `plan` 结构：`[{ step: string, status: "pending|in_progress|completed" }]`。
- 记录计划更新事件，保持与现有事件兼容。

DoD:
- Agent 可调用 `update_plan` 并输出可渲染的结构化计划。

Progress Notes:
- 已在内置工具中加入 `update_plan`，并在 `Agent` 中记录 `currentPlan` + 触发 `plan_updated` 事件。
- 新增单测 `agents-js/tests/planning_update_tool.test.js`，覆盖事件与状态更新。

### M.2 Interactive `request_user_input` Tool
Status: completed ✅

Goal: 在信息不足或存在高影响决策时引导用户确认。

Implementation Details:
- 新增 `request_user_input` 工具，允许 Agent 暂停执行并提出问题。
- 确保与现有 `run()` 循环兼容，不破坏简单任务流。

DoD:
- 复杂任务下能先问清楚再执行；简单任务不被过度打断。

Progress Notes:
- 已在 `agents-js/index.js` 接入 readline 交互，CLI 可等待并恢复用户输入。
- `request_user_input` 支持超时并返回 MCP `isError`。

### M.3 Dual-Phase Instruction Tuning
Status: completed ✅

Goal: 对齐 Codex 的双阶段计划模式（Intent -> Implementation）。

Implementation Details:
- 更新系统提示词：复杂任务优先使用 `update_plan`；遇到不确定先 `request_user_input`。
- 保留现有“轻量任务直接执行”的体验。

DoD:
- 复杂任务输出结构化计划，且包含可操作的步骤。

Progress Notes:
- 更新 `DEFAULT_SYSTEM_PROMPT`：强制使用 `request_user_input` 处理歧义；复杂任务先 `update_plan`。

### E.1 Core Integration (Tool Result 统一 MCP)
Goal: `agents-js/agents.js#_executeTools` 返回的每条 tool result 都是 MCP `CallToolResult`（由 JSON 字符串承载进 history）。

Implementation Details:
- 对任意 raw output（object/string/null/array），调用 `toMcpCallToolResult(output, { isError })`。
- `isError` 来自失败分类（tool_not_found/tool_error/timeout/format_error/exception/...）。
- MCP result 仍通过 `safeJsonStringify` 存入 history（保持可序列化与 back-compat）。

DoD:
- 所有工具结果消息的 `msg.content` JSON.parse 后满足：
  - `content: [{ type: 'text', text: '...' }]`
  - `isError?: boolean`
  - `structuredContent?: any`
- 现有单测全部通过。

### E.2 Gemini Adapter Compatibility (展平 MCP blocks)
Goal: `agents-js/gemini-adapter.js#_convertHistory` 能识别 MCP `CallToolResult` 并转换为 Gemini `functionResponse` 所需结构。

Implementation Details:
- 解析 `msg.content` 后若形如 MCP：提取 text blocks 合并为 `text`，并在存在时优先保留 `structuredContent`。
- 保持输出紧凑：避免把 MCP `content` 数组原样塞进 Gemini history。

DoD:
- Node CLI 调用工具后不会因为 history 结构变化而报错。
- `npx vitest run` 通过。

### E.3 External MCP Server Discovery (Optional)
Goal: 通过 env/config 注册外部 MCP server（不再必须 hard-code 为 skill）。
Status: completed ✅ (HTTP-only)

Context & Goal:
- 允许通过 `EXTERNAL_MCP_URLS`（逗号分隔 URL 列表）动态发现外部 MCP tools。
- 发现后的 tools 必须像本地 tool 一样被 Gemini function calling 选择并可执行。

Technical Spec:
- Transport: JSON-RPC 2.0 over HTTP POST (use global `fetch`, Node/Browser 兼容)。
- Methods:
  - `tools/list` -> 返回 tool definitions（含 `inputSchema`）。
  - `tools/call` -> 返回 MCP `CallToolResult`。
- Mapping:
  - MCP `Tool.inputSchema` -> 本项目 tool `parameters`（JSON Schema）。
  - tool result：保持 MCP `CallToolResult`（由 `agents-js/utils/mcp-adapter.js` 兼容）。
- Errors:
  - 外部 server 不可用 / CORS / 429 / timeout：仅影响该 server 的 tools；不得阻塞本地 skills 加载。

Implementation Details:
- Add: `agents-js/utils/mcp-proxy.js`
  - `listRemoteTools(url)`
  - `callRemoteTool(url, name, args)`
- Update: `agents-js/skill-manager.js`
  - `loadExternalMcpToolsAsync({ urls, quiet })`：拉取并注册远程 tools（标记 `_skillSource = "remote:<url>"`）。
  - 注意：保持文件 <= 300 行；必要时做小幅拆分/重构。
- Update: `agents-js/agent-factory.js`
  - `createAgentAsync` 读取 `process.env.EXTERNAL_MCP_URLS` 并在本地 skills 加载后追加远程 tools。

DoD:
- 仅通过设置 `EXTERNAL_MCP_URLS` 即可让远程 tools 出现在可用工具列表中。
- 远程 tool 被调用时会正确发起 `tools/call` 并返回可序列化结果（history JSON round-trip）。
- `npx vitest run` 通过。

Verification:
- `EXTERNAL_MCP_URLS=http://localhost:PORT/mcp npx vitest run`
- `EXTERNAL_MCP_URLS=http://localhost:PORT/mcp node agents-js/index.js "use the remote tool and summarize"`

### E.4 Config-Driven MCP Servers (Hybrid, Node + Browser)
Goal: 支持“标准 MCP 配置”注入：Node 从 `.env` 读取 JSON；Browser 通过页面内的 `window.EXTERNAL_MCP_CONFIG` 读取（纯前端可用，无需网关）。
Status: completed ✅

Context & Goal:
- Node: 通过 `MCP_CONFIG_JSON`（JSON 字符串）配置多个 MCP servers（HTTP + stdio）。
- Browser: 通过 `<script>` 注入 `window.EXTERNAL_MCP_CONFIG`，只启用可在浏览器执行的 transport（默认 http）。
- 安全：支持 per-user API Key（来自 DB），但禁止在日志中泄露敏感 headers/env。

Technical Spec:
- Config shape (兼容 Claude 风格 `mcpServers`):
  - `mcpServers.<name>.transport`: `http` | `stdio`
  - `http`: `{ url, headers? }`
  - `stdio`: `{ command, args?, env? }` (Node only)
- Browser 限制：无法 `spawn` 本地进程；`transport: stdio` 必须被过滤或标记为需要网关。
- Browser 限制：无法 `spawn` 本地进程；`transport: stdio` 必须被过滤（本项目不提供 Browser->Node 网关）。

Implementation Details:
- Add: `agents-js/utils/mcp-config-adapter.js` (pure JS)
  - MVP(Node): `readNodeMcpHttpServersFromEnv()` / `readNodeMcpHttpServersFromJson()` -> parse `process.env.MCP_CONFIG_JSON`
  - Planned(Browser): `readBrowserMcpConfigFromGlobal()` -> read `window.EXTERNAL_MCP_CONFIG`
  - Node: 若 `MCP_CONFIG_JSON` 存在但 JSON 解析失败，打印安全错误信息（不回显内容）。
- Update: `agents-js/agent-factory.js`
  - 在 Node: 优先 `MCP_CONFIG_JSON`；否则回退 `EXTERNAL_MCP_URLS`
  - 在 Browser: 若存在 `window.EXTERNAL_MCP_CONFIG`，自动加载其中 `transport:http` servers
- Update: `agents-js/utils/mcp-proxy.js`
  - 默认 `Accept: application/json, text/event-stream` 以兼容 Context7 的 406 要求
- Update: `agents-js/utils/mcp-tool-loader.js`
  - 支持从 config server 生成 tools：`headers` 进入闭包并传给 `mcp-proxy`
  - 默认工具命名策略：`<serverName>__<toolName>` 以避免跨 server 重名冲突
  - 日志约束：不得打印 `headers`/`env` 原值（仅允许打印 keys 或 serverName）

DoD:
- Node: 仅设置 `MCP_CONFIG_JSON` 即可注册多个外部 MCP servers (HTTP) 并可调用。
- Browser: 通过注入 `window.EXTERNAL_MCP_CONFIG` 即可注册 HTTP MCP tools（带 headers）。
- 现有测试保持通过，并新增针对 config 的测试。

Verification:
- Node (HTTP):
  - `MCP_CONFIG_JSON='{"mcpServers":{"mock":{"transport":"http","url":"http://127.0.0.1:PORT/mcp"}}}' npx vitest run`
  - `MCP_CONFIG_PATH=./mcp-config.json node agents-js/index.js "use <server>__<tool>"`
- Browser (manual):
  - 在页面注入 `window.EXTERNAL_MCP_CONFIG` 后，浏览器版可列出并调用该 MCP 工具（需目标 server 允许 CORS）。

Progress Notes:
- 406 fix: Context7 MCP 需要 `Accept` 同时包含 `application/json` 与 `text/event-stream`。
- Browser hook: 新增 `readBrowserMcpHttpServersFromGlobal()` 读取 `window/globalThis.EXTERNAL_MCP_CONFIG`（HTTP-only）。
- Browser 限制：真实环境下 HTTP MCP 直连常见 CORS 预检拦截（尤其自定义 headers）；stdio MCP 在浏览器不可用。README 已明确说明该能力为实验性。

### E.5 Node Stdio MCP Servers (Optional)
Goal: 支持通过 `mcpServers` 配置启动本地 MCP server (stdio)，并动态注册其工具。
Status: completed ✅

Context & Goal:
- 复用业界常见 MCP server 分发方式（`npx -y <pkg>`），让 Node CLI/Server 可直接接入。

Technical Spec:
- Transport: JSON-RPC 2.0 over stdio (Node only: `child_process.spawn`).
- Process lifecycle: 可选 "eager"（启动时拉起）或 "lazy"（首次调用时拉起）；默认 lazy。
- Browser: 不支持；本项目不提供 Browser->Node 网关。需要浏览器可用能力时，优先使用 HTTP MCP（需目标 server 允许 CORS）或本地 Skill 作为替代。

Implementation Details:
- Add: `agents-js/utils/mcp-stdio-client.js` (Node-only)
  - `start()`, `stop()`, `listTools()`, `callTool(name,args)`
  - robust: 超时、进程退出、stdout JSON 分帧
  - defaultTimeoutMs: 60s（适配 npx 首次下载/启动偏慢）
- Update: `agents-js/utils/mcp-tool-loader.js`
  - 为 `transport: stdio` server 注册 tools，`func` 代理到 stdio client（工具名默认 `server__tool`）
  - 默认 `keepAlive=false`：完成 `tools/list` 后自动 stop，避免短命令（如 `node -e`）被子进程挂住；调用工具时会自动重启
- Update: `agents-js/utils/mcp-config-adapter.js`
  - 解析 `transport: stdio` 的 `{ command, args?, env? }`
- Update: `agents-js/agent-factory.js`
  - `mcp-config.json` / `MCP_CONFIG_JSON` 同时支持 http + stdio servers

DoD:
- Node: 配置一个 stdio MCP server 后，可 `tools/list` + `tools/call` 成功。
- Browser: 明确提示 stdio 不可用（不会提供 gateway）。

Verification:
- `node -e "require('dotenv').config(); const { createAgentAsync } = require('./agent-factory'); createAgentAsync({ quiet:false }).then(({tools})=>console.log(tools.map(t=>t.name).filter(n=>n.startsWith('blogger__'))));"`
- `node agents-js/index.js "use blogger__<toolName> ..."`

### E.6 Docs & Examples (Required)
Goal: 补齐动态配置与安全注意事项文档。
Status: completed ✅

Implementation Details:
- Update: `agents-js/README.md`
  - `EXTERNAL_MCP_URLS` (HTTP) 用法
  - `MCP_CONFIG_JSON` schema + 示例
  - Browser 注入 `window.EXTERNAL_MCP_CONFIG` 示例（含 headers）
  - 安全说明：不要在前端注入长期有效的高权限 key（推荐短期 token / 后端 proxy）

DoD:
- README 有完整、可复制的 Node/Browser 示例。
- 明确 Browser 对 CORS 与 stdio 的限制，以及可选网关方案。

Progress Notes:
- README 已移除旧的 Context7 endpoint/header 示例（统一为 `https://mcp.context7.com/mcp` + `CONTEXT7_API_KEY`），并补充 Browser `window.EXTERNAL_MCP_CONFIG` 注入示例。
- README 已补充 stdio MCP（`server-memory`）配置示例与启动方式。
- 新增 `agents-js/docs/mcp-debugging.md`，覆盖 stdio MCP 常见排查流程。

### Verification
- `npx vitest run`
- `node agents-js/index.js "get weather for 018940 and summarize"`

## Archive (2026-01-31)

### A. Context Alignment (Tool Output Normalization)
Status: completed ✅

Context & Goal:
- 目标：与 `codex-main` 的 normalize 规则完全一致，避免孤立 tool_call/tool_result，保证调用-输出原子性。

Technical Spec:
- Logic:
  - 在 `agents-js/utils/context-manager.js` 中统一处理 tool_call 与 tool_result 的配对。
  - 对缺失结果的 tool_call，插入 `aborted` 的 MCP 结果（`toMcpCallToolResult('aborted', { isError: true })`）。
  - 对无对应 tool_call 的 tool_result，统一清理。
  - 保证输出紧跟对应的 tool_call 顺序。
- Interface:
  - 更新 `normalizeHistory` 与相关辅助函数；必要时拆分小函数以保持单文件 < 300 行。
  - 更新 `agents-js/tests/normalization_integration.test.js` 新增缺失/孤立场景覆盖。

Definition of Done (DoD):
- 任意裁剪后 history 中不出现孤立的 tool_call/tool_result。
- 缺失结果会被补全为 `aborted`，并保持 JSON 可序列化。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持 JSON 可序列化输出。
- MUST 保持 `utils/context-manager.js` < 300 行。

Verification:
- `npx vitest run agents-js/tests/normalization_integration.test.js`
- `npx vitest run agents-js/tests/context_manager.test.js`

### B. Security Alignment (Command Parsing + Danger Rules)
Status: completed ✅

Context & Goal:
- 目标：对齐 `codex-main` 命令安全策略，识别 `bash -lc`/`sh -c` 内部指令与 `sudo` 递归，避免危险命令漏检。

Technical Spec:
- Logic:
  - 在 `agents-js/utils/command-parser.js` 中解析 `bash -lc` / `zsh -lc` / `sh -c` 形式的内联脚本，并将脚本拆分为独立命令段进行二次审计。
  - 在 `agents-js/utils/command-danger-zone.js` 中递归处理 `sudo` 前缀，并精细化 `git` 子命令规则（阻断 `reset`/`rm`）。
  - 允许 `git status` 等安全命令通过。
- Interface:
  - 更新 `agents-js/utils/command-parser.js`、`agents-js/utils/command-danger-zone.js`。
  - 更新 `agents-js/tests/security.test.js` 覆盖 `sudo git reset --hard`、`bash -lc "git reset --hard"`、`git status`。

Definition of Done (DoD):
- `sudo git reset --hard` 被拦截。
- `bash -lc "git reset --hard"` 被拦截。
- `git status` 仍可通过。

Security & Constraints:
- MUST 不执行任何命令，只做解析与规则判断。
- MUST 兼容 Node/Browser。
- MUST 避免引入 Node-only 依赖。

Verification:
- `npx vitest run agents-js/tests/security.test.js`

### C. Pending Input Support (Turn Alignment)
Status: completed ✅

Context & Goal:
- 目标：对齐 `codex-main` 的 pending_input 行为，允许在推理循环中插入新的用户输入。

Technical Spec:
- Logic:
  - 新增 pending input 队列，支持外部注入并在每步推理前消费。
  - 将待处理输入追加到 history，确保下一步 LLM 可见。
- Interface:
  - `Agent.submitInput(text)` 对外开放。

Definition of Done (DoD):
- 运行中可插入新的 user 输入，下一次 LLM 调用能看到该输入。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持 `agents.js` 行数 <= 300。

Verification:
- `npx vitest run agents-js/tests/pending_input.test.js`

## Archive (2026-02-03)

### S1. agents.js Deep Slimming (Step 1)

Context & Goal:
- 将 Agent 主流程按职责拆分，降低单文件复杂度并提升可测试性。

Technical Spec:
- Logic: 把 LLM 调用、tool 流程、completion 处理、usage 统计、interaction、state 管理等拆到 `utils/*` 模块；`agents.js` 保留编排与生命周期。
- Interface: `Agent` 对外 API 保持不变（`run()`, `runAsyncIterator()`, `dumpSnapshot()`, `loadSnapshot()`）。

Definition of Done (DoD):
- `agents.js` <= 300 行；拆分后的模块有对应测试覆盖；对 Node/Browser 双端行为无回归。

Security & Constraints:
- 核心模块不引入 Node-only 依赖；history/tool 输出保持可序列化。

Verification:
- `npm test`。

### S2. History Compactor Decoupling (瘦身计划)

Context & Goal:
- 把历史压缩逻辑从 Agent 主流程解耦为独立模块，便于测试与调参，同时保证序列化安全。

Technical Spec:
- Logic: `utils/history-compactor.js` 负责摘要生成、固定前缀保留、用户消息预算与 summary 注入；`Agent._maybeCompactHistory()` 调用该模块并在 compaction 时触发 `context_compacted` 事件。
- Interface: `compactHistory({ history, llm, config })` 与 `maybeCompactAgentHistory(agent)` 导出；配置在 `utils/config.js` 中注入到 Agent。

Definition of Done (DoD):
- compaction 可配置开关/阈值/摘要长度；summary 输出经 `sanitizeSummaryText`；`tests/history_compactor.test.js` 与 `tests/context_events.test.js` 通过。

Security & Constraints:
- 只处理可 JSON round-trip 的结构；摘要不含实时/波动数据；保持 Node/Browser 兼容。

Verification:
- `npm test`。

### S3. Server.js API Modularization (预防性瘦身)

Context & Goal:
- 通过拆分 handler，保持 `server.js` 轻量、易维护，同时避免入口文件膨胀。

Technical Spec:
- Logic: 将 `/api/chat` 与 `/api/chat/stream` 的请求处理与元数据提取下沉到 `utils/server-handlers.js`；`server.js` 只负责路由与中间件。
- Interface: `handleChatRequest(req, res)` 与 `handleChatStreamRequest(req, res)` 对外暴露；保持原 API 行为一致。

Definition of Done (DoD):
- `server.js` < 300 行；SSE 事件流仍可工作；错误处理保持结构化 JSON。

Security & Constraints:
- 不新增 Node-only 依赖到核心逻辑层；避免在 handler 里泄露敏感信息。

Verification:
- `npm test`。

### S4. Session Isolation + Plan Reset (Codex Alignment)

Context & Goal:
- 避免从 snapshot 恢复的结构化计划跨回合污染新对话；每次 `run()` 视为独立回合，显式清空 plan 与临时状态。

Technical Spec:
- Logic: 在 `Agent.run()` 开始时重置 `currentPlan`、`_decisionTraces`、`_pendingInputs`，并重建本回合的 tool failure 计数；保障新回合不继承旧计划。
- Interface: `Agent.run(userInput)` 保持对外接口不变；`utils/agent-state.js` 继续支持 snapshot 读写与 `plan_updated` 事件。

Definition of Done (DoD):
- `run()` 启动即 `currentPlan === null`；恢复 snapshot 后仍会在新回合清空计划；`tests/session_isolation_plan_reset.test.js` 通过。

Security & Constraints:
- 不引入 Node-only 依赖；history 保持 JSON 可序列化。

Verification:
- `npm test`。

### S5. MCP Tool Loader Refactor (Codex-style MCP Router)

Context & Goal:
- 进一步对齐 codex-main 的“明确边界 + 统一协议层”思路，减少 MCP 工具加载/调用路径的重复逻辑，并为后续自愈与权限控制预留空间。

Implementation Notes:
- 新增 `utils/mcp-router.js` 作为统一入口，封装 HTTP + stdio 的 `listTools`/`callTool`。
- `utils/mcp-tool-loader.js` 仅负责把 MCP tool metadata 映射成 Agent tools（并保留命名/去重/参数归一化逻辑）。

Definition of Done (DoD):
- `mcp-tool-loader.js` < 200 行（当前 132 行）；全量测试通过。

Verification:
- `npm test`（99 passed）。

### S6. Browser/Node Skill Bootstrap Alignment (减少重复代码)

Context & Goal:
- 浏览器版 `browser/standalone.html` 内含较多“Agent 初始化 + 工具加载 + System Instruction”逻辑，存在与 Node 端 `agent-factory.js` 演进不同步的风险；目标是收敛初始化入口，减少重复实现并保持 Node/Browser 行为更一致。

Implementation Notes:
- 新增 `browser/bootstrap.mjs`：抽出 manifest tools loader + MCP(HTTP) tools loader + Agent/Model 初始化封装。
- 新增 `browser/system-instruction.mjs`：集中管理浏览器端 system instruction 文本，避免散落与重复。
- `browser/standalone.html` 仅保留 UI 绑定、渲染与少量 glue code（tool/model/agent 初始化逻辑已移出）。
- 为保证浏览器 bundle，`utils/agent-tool-specials.js` 移除对 `child_process` 的顶层依赖（Node-only 动态加载）。

Definition of Done (DoD):
- `browser/standalone.html` 体积明显降低（1484 -> 1103 行）；浏览器版仍可通过 manifest + ESM tools 工作；`npm run build:browser` 成功。

Verification:
- `npm run build:browser`（esbuild 生成 `browser/agents.bundle.mjs` 成功）。

### S7. Browser Runtime Skill/Tool Toggles (AGENTS_CONFIG)

Context & Goal:
- 浏览器版需要在不改动构建产物的情况下，通过 JS 配置灵活启用/禁用 skills/tools/MCP；用于 Demo、权限边界演示、以及减少不必要的网络请求（尤其是 MCP/CORS）。

Implementation Notes:
- 新增 `browser/toolset-config.mjs`：解析/归一化 `AGENTS_CONFIG`，并对 `skills-manifest.json` 做 skill/tool 级过滤；提供 `mcp.enabled === false` 的强制关闭。
- 新增 `browser/prompt-utils.mjs`：抽离 prompt 拼接逻辑，确保 `browser/bootstrap.mjs` <= 300 行。
- `browser/bootstrap.mjs`：支持 `getAgentsConfig` 注入；`fetchManifest()` 返回过滤后的 manifest；`ensureToolsReady()` 在 `mcp.enabled === false` 时不触发 MCP 网络请求。
- 新增测试 `tests/browser_runtime_tool_toggle.test.js` 覆盖：skill/tool 过滤与 MCP 禁用。

Definition of Done (DoD):
- 通过 `globalThis.AGENTS_CONFIG` 在浏览器端可动态禁用 skills/tools/MCP；`browser/bootstrap.mjs` <= 300 行；测试通过。

Verification:
- `npm test`。

### S8. URL Reader Skill (read_url)

Context & Goal:
- 提供一个 Node/Browser 双端通用的 URL 读取工具，用于抓取公开资源（HTML/JSON/Text）；浏览器端遇到 CORS/混合内容等限制时，返回可被自愈识别的结构化错误，避免盲目重试。

Implementation Notes:
- 新增 `skills/url_reader/tools.mjs`：实现 `read_url`（http/https only，GET/HEAD，timeout/maxBytes，按 content-type 选择 text/html_text/json）。
- 新增 `skills/url_reader/url-reader-utils.mjs`：抽离流式读取/HTML 转文本/解码等逻辑，确保单文件 < 300 行。
- 新增 `skills/url_reader/SKILL.md`：技能文档与参数说明。
- 新增测试 `tests/url_reader.test.js`：覆盖 HTML/JSON/截断、协议限制、以及浏览器 CORS-like 错误返回。

Definition of Done (DoD):
- `read_url` 在 Node/Browser 均可注册；浏览器端 CORS-like 失败返回 `{ error: 'Environment Restriction (Browser CORS)', platform: 'browser', ... }`；`npm test` 与 `npm run build:browser` 通过。

Verification:
- `npm test`；`npm run build:browser`（manifest 显示 `url_reader`）。

### S9. Interactive CLI (Node REPL)

Context & Goal:
- 提供类似 codex-main 的终端交互体验（REPL），但保持 Node 版本轻量，实现连续对话与会话恢复。

Technical Spec:
- Logic: 新增 `cli.js`，启动后进入循环，接受多轮输入并调用 `agent.run()`；支持 `/exit`、`/reset`、`/help`、`/stats` 等命令；支持 `--resume` 读取 `agent_session.json`。
- Interface: 保持 `index.js` 为单次执行入口；新增脚本 `npm run chat` 指向 `node cli.js`。

Definition of Done (DoD):
- 可在终端连续对话；会话可用 `--resume` 继续；遇到 `request_user_input` 时可在 CLI 中回答。

Security & Constraints:
- 不引入新的 Node-only 依赖到核心逻辑层；CLI 仅作为 Node 入口；history/tool 输出保持可序列化。

Verification:
- `npm run chat` 启动后能连续对话；`node cli.js --resume` 能恢复会话。

### S10. file_tools add read_file + view_image (Node-only)

Context & Goal:
- 补齐与 codex-main 的基础文件工具能力，对齐本地文件读取与图片读取（Base64 文本返回）。

Technical Spec:
- Logic: `read_file` 支持 offset/limit/size cap；`view_image` 读取本地图片并返回 `mime_type` + `data_base64` + `byte_length`。
- Interface: `skills/file_tools/tools.js` 新增 tool 注册，封装到独立模块 `read-file.js` / `view-image.js`。

Definition of Done (DoD):
- `read_file` 与 `view_image` 在 CLI 中可用；`tests/file_tools.test.js` 覆盖通过。

Security & Constraints:
- Node-only；输出可 JSON 序列化；单文件 < 300 行。

Verification:
- `npx vitest run tests/file_tools.test.js`。

### S11. Memory auto lookup (multi-query + fallback)

Context & Goal:
- 当用户询问个人事实/偏好时，自动查询 memory MCP，减少漏检与反复追问。

Technical Spec:
- Logic: 预检阶段自动执行 `memory__search_nodes` 多关键词查询；若无命中则回退 `memory__read_graph`。
- Interface: 在 `agents.js` 每轮 LLM 前注入预检；实现放在 `utils/agent-tool-flow.js`。

Definition of Done (DoD):
- 仅在 memory 工具存在时生效；命中率提升；不修改 `DEFAULT_SYSTEM_PROMPT`。

Security & Constraints:
- Node/Browser 兼容；不写硬编码提示；单文件 < 300 行。

Verification:
- `npm test`。

### S12. Migrate Gemini adapter to @google/genai (Gemini 3 readiness)

Context & Goal:
- 解决 Gemini 3 Preview 对 `thoughtSignature` 的要求，替换旧 SDK 以获得原生支持。

Technical Spec:
- Logic: `gemini-adapter.js` 改用 `@google/genai` 的 `models.generateContent/Stream`；`gemini-helpers.js` 输出符合新 SDK 的 `functionDeclarations` 与 `functionResponse` 结构。
- Interface: 维持 `GeminiLLM` 的 `chat`/`chatStream` 签名不变。

Definition of Done (DoD):
- Gemini 3 工具调用不再报 `missing thought_signature`；全量测试通过。

Security & Constraints:
- Node/Browser 兼容；保持工具输出可序列化。

Verification:
- `npm test`。

### D. Token Usage Alignment (Sampling Request Parity)
Status: completed ✅

Context & Goal:
- 目标：与 `codex-main` 的 token usage 汇报保持一致，为 UI 与 telemetry 提供可复用数据。

Technical Spec:
- Logic:
  - 在每次 LLM 响应后提取 `prompt` / `completion` / `total` tokens（若可得）。
  - 将 usage 记录到 history 或 state 的 meta，确保可 JSON round-trip。
  - Streaming 时如果 provider 不回传 usage，允许留空，不影响主流程。
- Interface:
  - 在 `agents-js/agents.js` 统一写入 `_tokenUsagePrompt/_tokenUsageCompletion/_tokenUsageTotal`。
  - 若需要拆分，迁移到 `agents-js/utils/` 并保持单文件 < 300 行。

Definition of Done (DoD):
- 非流式响应可记录完整 usage。
- 流式响应不报错，usage 可缺省。
- `history` 仍可 JSON.stringify/parse。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持输出可序列化。

Verification:
- `npx vitest run agents-js/tests/token_usage.test.js`

### G. agents.js Refactor (Split Completion Builder)
Status: completed ✅

Context & Goal:
- 目标：将回合完成数据构建逻辑从 `agents.js` 拆出，控制单文件体积并提升可维护性。

Technical Spec:
- Logic:
  - 新增 `utils/agent-completion.js` 负责构建 completion payload。
  - `agents.js` 调用 `buildCompletionData` 产出事件数据。

Definition of Done (DoD):
- `agents.js` 行数下降且不影响完成事件数据结构。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持 JSON 可序列化输出。

Verification:
- `npx vitest run agents-js/tests/token_usage.test.js`

### H. agents.js Refactor (Split LLM Step)
Status: completed ✅

Context & Goal:
- 目标：将 LLM 调用与流式/非流式处理逻辑从 `agents.js` 拆出，降低复杂度。

Technical Spec:
- Logic:
  - 新增 `utils/agent-llm.js`，统一处理 streaming 与非 streaming 的事件发射与响应聚合。
  - `agents.js` 仅负责上下文裁剪与调用 `runLlmStep`。

Definition of Done (DoD):
- `agents.js` 行数下降且行为不变。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持 JSON 可序列化输出。

Verification:
- `npx vitest run agents-js/tests/token_usage.test.js`

### I. agents.js Refactor (Split Streaming Handler)
Status: completed ✅

Context & Goal:
- 目标：进一步拆分 streaming 事件处理，降低 `agent-llm.js` 复杂度。

Technical Spec:
- Logic:
  - 新增 `utils/agent-llm-stream.js` 处理流式增量与工具调用事件。
  - `agent-llm.js` 只负责分派。

Definition of Done (DoD):
- streaming 行为与事件顺序不变。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持 JSON 可序列化输出。

Verification:
- `npx vitest run agents-js/tests/token_usage.test.js`

### J. agents.js Refactor (Split Tool Call Flow)
Status: completed ✅

Context & Goal:
- 目标：将 tool-call 处理逻辑从 `agents.js` 抽离，降低控制流复杂度。

Technical Spec:
- Logic:
  - 新增 `utils/agent-tool-flow.js`，负责 synthetic plan、assistant entry 写入、工具执行与结果回填。
  - `agents.js` 仅负责调用 `handleToolCalls` 并判断是否进入最终回复。

Definition of Done (DoD):
- tool-call 行为与事件顺序不变。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持 JSON 可序列化输出。

Verification:
- `npx vitest run agents-js/tests/token_usage.test.js`

### E. Browser Self-Healing (CORS/Env Restriction)
Status: completed ✅

Context & Goal:
- 目标：对齐 Codex 的环境限制提示，降低浏览器端工具调用失败的困惑度。

Technical Spec:
- Logic:
  - 细分 `fetch` / CORS / mixed content 等错误样式。
  - 在自愈提示中建议：改用本地 skill 或通过后端代理。
- Interface:
  - 优化 `agents-js/utils/agent-self-heal.js` 的错误分类与提示文本。
  - 扩充 `agents-js/tests/self_heal_browser_env.test.js` 覆盖 mixed content 场景。

Definition of Done (DoD):
- 浏览器下出现 CORS/blocked/failed to fetch/mixed content 时输出明确提示。
- Node 端行为不受影响。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 不暴露敏感信息。

Verification:
- `npx vitest run agents-js/tests/self_heal_browser_env.test.js`

### F. Standard FS Tools (grep_files / list_dir)
Status: completed ✅

Context & Goal:
- 目标：对齐 `codex-main` 常用文件工具，提升本地调试与检索效率。

Technical Spec:
- Logic:
  - `list_dir`: 列出目录内容，支持递归/深度限制。
  - `grep_files`: 以正则搜索文本内容，限制最大结果数。
- Interface:
  - 新增 `agents-js/skills/file_tools`，对 Node 环境启用，Browser 环境提供友好错误。
  - 输出统一 MCP 结构。

Definition of Done (DoD):
- Node 可执行 `list_dir` 与 `grep_files`。
- Browser 调用返回清晰的不可用提示。

Security & Constraints:
- MUST 避免递归爆炸与过量 IO。
- MUST 保持单文件 < 300 行。

Verification:
- `npx vitest run agents-js/tests/file_tools.test.js`

### K. Test Coverage Reinforcement (Utils)
Status: completed ✅

Context & Goal:
- 目标：补强 `utils/` 低覆盖率模块的单元测试，提升稳定性与回归信心。

Technical Spec:
- Logic:
  - 增加 `agent-tool-runner` 异常分支测试。
  - 增加 `agent-interaction` 的 supersede/timeout 分支测试。
  - 增加 `retry` 高阶重试逻辑测试。
  - 增加 `mcp-tool-loader` 失败路径与命名去重测试。

Definition of Done (DoD):
- 新增测试文件并覆盖关键分支。
- 新增测试均通过。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持单文件 < 300 行。

Verification:
- `npx vitest run tests/agent_tool_runner_edge.test.js tests/interaction_timeout.test.js tests/retry_advanced.test.js tests/mcp_loader_robustness.test.js`

### L. Logic Tally & Alignment (Reference Codex)
Status: completed ✅

Context & Goal:
- 目标：对齐 `codex-main` 的核心逻辑（历史归一化、token 估算、状态机可见性），提高一致性与可观测性。
- [progress] ✅ 2026-01-30: L.1-L.4 已完成；CLI 记忆恢复已验证（index.js + agent_session.json）。

### L.1 History Normalization (Consistency)
Status: completed ✅

Goal: 历史裁剪后保持工具调用/结果配对一致，避免孤立 call 或孤立 output。

Implementation Details:
- 在 `agents-js/utils/context-manager.js` 中新增 normalize 逻辑。
- 逻辑：若删除了 tool_call，对应 tool result 必须同步删除；反之亦然。

DoD:
- 任意裁剪后 history 中不出现孤立的 tool_call/tool_result。

Progress Notes:
- 已加入 normalize 逻辑：补齐缺失 tool 输出（aborted），清理孤立 tool 结果，并保证输出紧跟对应 tool_call。
- 新增集成测试 `agents-js/tests/normalization_integration.test.js` 覆盖多轮并行调用与裁剪。

### L.2 Token Heuristics (Efficiency)
Status: completed ✅

Goal: 更接近 `codex-rs` 的 token 估算策略，减少过早或过晚裁剪。

Implementation Details:
- 为 system/user/assistant/tool 设定不同权重因子。
- 保持估算算法轻量且可解释。

DoD:
- 在相同上下文长度下，裁剪行为与 `codex-main` 更一致。
- 相关单测与压力测试通过。

Progress Notes:
- 采用原子化裁剪：token 超限时按“assistant 调用 + tool 结果”整块删除，避免补位导致的死循环风险。
- 新增压力测试 `agents-js/tests/context_manager_stress.test.js` 覆盖随机历史、极低 token、跨轮次工具结果与 Gemini 对齐。
- 加入 Token 估算权重（角色开销、结构化内容权重、缺失结果预留）。
- 增加 CJK 字符混合估算与事实点增量估算（_tokenUsagePrompt）。

### L.3 Agent State Visibility (Observability)
Status: completed ✅

Goal: 标准化 Agent 内部状态转换，提升外部 UI/调试可见性。

Implementation Details:
- 扩展 `agents-js/agents.js` 的状态变更事件，使其显式覆盖 thinking/executing/error/done。
- 与现有事件（start/done/agent_turn_complete）保持兼容。

Progress Notes:
- 增加 `state_changed`、`tool_call_begin`、`tool_call_end` 与 getState()；记录执行耗时。
- 新增 `agents-js/tests/agent_visibility.test.js` 验证状态序列与工具遥测。
- `agents-js/index.js` 增加状态与工具耗时日志输出，便于 CLI 观察。

DoD:
- 状态转换事件在多轮工具调用中可稳定观测。
- 相关测试通过。

### L.4 Agent Snapshot & Persistence (Recovery)
Status: completed ✅

Context & Goal:
- 对齐 Codex 的状态持久化能力，支持导出/恢复 Agent 完整内存状态。

Implementation Details:
- 新增 `dumpSnapshot()` / `loadSnapshot()`，支持通过构造函数注入快照。
- 运行结束触发 `autosave` 事件，输出快照供 Node/Browser 保存。
- `agents-js/index.js` 自动读取/写入 `agent_session.json`（CLI 记忆恢复）。

DoD:
- 快照恢复后历史与计划一致。
- autosave 事件在回合结束与异常时触发。

### R.1 Split Token Estimator (Context Manager)
Status: completed ✅

Context & Goal:
- 目标：将 token 估算逻辑从 `utils/context-manager.js` 拆分出来，减少单文件体积并提升可维护性。
- 原因：`context-manager.js` 超过 300 行上限。

Technical Spec:
- Logic: 把 `TOKEN_WEIGHTS` 与 `estimateTokens*` 方法迁移到新文件，并保持 API 行为不变。
- Interface:
  - 新增 `utils/token-estimator.js` 导出 `estimateTokens` 与 `isToolResultMessage`。
  - `context-manager.js` 通过 `require('./token-estimator')` 使用。

Definition of Done:
- `context-manager.js` 不再包含 token 估算实现。
- 旧行为不变，测试继续通过。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 避免非 JSON 可序列化输出。

Verification:
- `npm test` (或 `npx vitest`) 通过。

### R.2 Split Agent Helpers (Async Queue & Self-Heal)
Status: completed ✅

Context & Goal:
- 目标：拆分 `agents.js` 中的异步事件队列与自愈逻辑，降低文件体积并提升可维护性。
- 原因：`agents.js` 超过 300 行上限。

Technical Spec:
- Logic: 将 `_createAsyncEventQueue` 提取为 `utils/async-event-queue.js`；将自愈相关逻辑提取为 `utils/agent-self-heal.js`。
- Interface:
  - `agents.js` 通过 `createAsyncEventQueue` 调用事件队列。
  - `agents.js` 使用 `classifyToolFailure/recordToolFailure/clearToolFailure/withSelfHealHint` 等函数保持原有行为。

Definition of Done:
- `agents.js` 不再包含事件队列与自愈实现细节。
- 相关测试继续通过。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 不改变工具失败分类行为。

Verification:
- `npm test` (或 `npx vitest`) 通过。

### R.3 Split Async Iterator & Timeout Helper
Status: completed ✅

Context & Goal:
- 目标：拆分 `agents.js` 中的 async iterator 与 timeout 逻辑，降低文件体积并保持功能一致。
- 原因：`agents.js` 仍显著超出 300 行上限。

Technical Spec:
- Logic: 将 `runAsyncIterator` 实现移至 `utils/agent-async-iterator.js`，将 `_callToolWithTimeout` 移至 `utils/agent-timeout.js`。
- Interface:
  - `agents.js` 通过 `runAgentAsyncIterator(this, userInput, options)` 代理迭代器。
  - `agents.js` 通过 `callToolWithTimeout({ fn, timeoutMs, defaultTimeoutMs })` 调用工具。

Definition of Done:
- `agents.js` 不再包含迭代器与 timeout 实现细节。
- 行数明显下降，功能行为不变。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持超时语义与原实现一致。

Verification:
- `npm test` (或 `npx vitest`) 通过。

### R.4 Split Tool Execution Runner
Status: completed ✅

Context & Goal:
- 目标：将 `agents.js` 内部 `_executeTools` 逻辑迁出，降低文件体积并保持行为一致。
- 原因：`agents.js` 仍显著超出 300 行上限。

Technical Spec:
- Logic: 把工具执行与结果封装逻辑迁移到 `utils/agent-tool-runner.js`。
- Interface:
  - `agents.js` 通过 `executeTools(this, toolCalls)` 调用执行器。

Definition of Done:
- `agents.js` 不再包含工具执行的主体实现。
- 所有工具调用/事件/自愈逻辑行为不变。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持 JSON 可序列化的输出。

Verification:
- `npm test` (或 `npx vitest`) 通过。

Progress Notes:
- 已新增 `utils/agent-tool-formatter.js` 用于封装 MCP 输出与自愈提示逻辑。
- `utils/agent-tool-runner.js` 已改用 formatter，减少重复逻辑。
- 已新增 `utils/agent-tool-specials.js` 承接 `update_plan` 与 `request_user_input` 特殊分支。

### R.5 Split Agent State & Interaction
Status: completed ✅

Context & Goal:
- 目标：将 `agents-js/agents.js` 的状态管理与用户交互逻辑拆分，降低文件体积并保持行为一致。
- 原因：`agents.js` 仍显著超过 300 行上限。

Technical Spec:
- Logic: 迁移 `dumpSnapshot/loadSnapshot/_setState/getState/_awaitUserInput/respondToUserInput` 到独立模块。
- Interface:
  - 新增 `utils/agent-state.js`，导出 `dumpSnapshot`、`loadSnapshot`、`getState`、`setState`。
  - 新增 `utils/agent-interaction.js`，导出 `awaitUserInput`、`respondToUserInput`。
  - `agents.js` 调用上述模块并保持事件与行为一致。

Definition of Done:
- `agents.js` 行数明显下降（目标 <300 行）。
- 状态事件与快照格式保持不变。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持 JSON 可序列化的输出。

Verification:
- `npm test` (或 `npx vitest`) 通过。

### R.6 Split Agent Factory Built-ins
Status: completed ✅

Context & Goal:
- 目标：将 `agents-js/agent-factory.js` 中内置工具与系统提示抽离，降低文件体积并提升可维护性。
- 原因：`agent-factory.js` 超过 300 行上限。

Technical Spec:
- Logic: 迁移 `getBuiltInTools` 与 `DEFAULT_SYSTEM_PROMPT`。
- Interface:
  - 新增 `utils/built-in-tools.js`，导出 `getBuiltInTools`。
  - 新增 `utils/constants.js`，导出 `DEFAULT_SYSTEM_PROMPT`。
  - `agent-factory.js` 通过 `require` 引用。

Definition of Done:
- `agent-factory.js` 行数明显下降（目标 <300 行）。
- Built-in tools 行为与输出一致。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持工具输出 JSON 可序列化。

Verification:
- `npm test` (或 `npx vitest`) 通过。

### R.7 Split MCP Config Resolver
Status: completed ✅

Context & Goal:
- 目标：将 `createAgentAsync` 的 MCP 配置探测逻辑抽离，降低文件体积并集中配置解析。
- 原因：`agent-factory.js` 中 MCP 逻辑复杂且耦合。

Technical Spec:
- Logic: 迁移 MCP server 发现与合并逻辑，保持环境优先级不变。
- Interface:
  - 新增 `utils/mcp-config-resolver.js`，导出 `resolveMcpServers({ mcpConfigJson, mcpConfigPath, externalMcpUrls, isBrowserRuntime, isTestRuntime })`。
  - `agent-factory.js` 调用 `resolveMcpServers`，返回 `{ configServers, mergedUrls }` 或统一结构。

Definition of Done:
- `agent-factory.js` 行数明显下降。
- MCP server 解析顺序与结果保持一致。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 不引入 Node-only API 到 Browser 路径。

Verification:
- `npm test` (或 `npx vitest`) 通过。

### R.8 Split Security Logic
Status: completed ✅

Context & Goal:
- 目标：将 `utils/security.js` 的命令解析与危险规则拆分，降低单文件复杂度。

Technical Spec:
- Logic: 迁移 `checkCommandString`、`scanUnsafeOperators`、`splitCommandSegments`、`splitArgv` 等解析逻辑。
- Interface:
  - 新增 `utils/command-parser.js`。

Definition of Done:
- `utils/security.js` 行数显著下降（目标 <300 行）。
- `SecurityValidator.validateTool` 行为不变。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持判定结果一致。

Verification:
- `npm test` (或 `npx vitest`) 通过。

### R.9 Turn-Aware Context Protection (Codex Alignment)
Status: completed ✅

Context & Goal:
- 目标：对齐 codex-main 的“回合保护”裁剪逻辑，避免长历史导致本回合工具结果被裁剪，最终回答偏题。

Technical Spec:
- Logic: 在 `ContextManager.process` 增加 `protectRecentMessages`，并将最近 N 条消息标记为 protected。
- Interface:
  - `agents.js` 在每轮推理传入本回合新增消息数。
  - `context-manager.js` 在裁剪与原子分组时保留受保护消息。

Definition of Done:
- 长历史下，本回合多工具结果在最终回答前不被裁剪。
- 工具调用/结果配对完整性保持不变。

Security & Constraints:
- MUST 兼容 Node/Browser。
- MUST 保持 JSON 可序列化输出。

Verification:
- `npm test` 通过。

## Pitfalls
- Gemini streaming: tool_calls chunk 常无 text。
- Browser CORS: 需要清晰分类并停止盲目重试。
- Serialization: history/tool result 必须可 JSON round-trip。

## Archive (Moved from task.md 2026-02-03)

- S23. Chat bubble styling aligned to ChatGPT Light
  - Context & Goal: 降低气泡感，提升留白与阅读感，贴近 ChatGPT Light 的对话样式。
  - Technical Spec:
    - Logic: assistant 消息去边框、透明背景；user 消息改为浅灰块；增大行距与间距。
    - Interface: 仅修改 `ui-chat.css`。
  - DoD: 助手消息更像纯文本块；用户消息为轻灰背景；整体更轻。
  - Security & Constraints: 纯浏览器运行；不引入 Node-only 依赖；单文件 < 300 行。
  - Verification: 打开 `browser/standalone.html`，对话样式符合预期。


- S22. UI listener safety guards
  - Context & Goal: 修复部分 DOM 不存在时引发的事件绑定报错。
  - Technical Spec:
    - Logic: 添加安全绑定 helper，元素为空时跳过。
    - Interface: `ui.js` 使用 `on(el, event, handler)`。
  - DoD: 页面加载无 `addEventListener` 相关报错。
  - Security & Constraints: 纯浏览器运行；不引入 Node-only 依赖；单文件 < 300 行。
  - Verification: 打开 `browser/standalone.html`，控制台无报错。


- S21. Custom confirm modal (ChatGPT-like)
  - Context & Goal: 用轻量自定义弹窗替代浏览器原生 confirm，提升一致性与视觉体验。
  - Technical Spec:
    - Logic: 新增 modal DOM + CSS；`showConfirm` 返回 Promise，点击按钮或遮罩关闭。
    - Interface: `ui-dom.js` 提供 `showConfirm/hideConfirm`；`ui.js` 调用替换原 confirm。
  - DoD: 删除会话与清空全部均使用自定义弹窗；取消不执行删除。
  - Security & Constraints: 纯浏览器运行；不引入 Node-only 依赖；单文件 < 300 行。
  - Verification: 打开 `browser/standalone.html`，执行删除/清空，观察自定义弹窗并验证行为。


- IMDA-1. Core Risk & Identity Infrastructure
  - Context & Goal: 引入风险分级与代理身份基础数据结构，为后续安全策略与审计提供数据来源。
  - Technical Spec:
    - Logic: RiskLevel 枚举 (0-3) + normalize 函数；Agent 支持 identity 与 riskProfile。
    - Interface: Agent 提供 getIdentity/getRiskProfile；工厂方法透传 identity/riskProfile。
  - DoD: 默认 Tier 0；自定义 identity/riskProfile 可正确注入；单文件 < 300 行。
  - Security & Constraints: Node/Browser 兼容；不引入外部依赖。
  - Verification: npx vitest run tests/imda_foundation.test.js


- S20. Delete confirmation (sessions + clear all)
  - Context & Goal: 防止误删会话与清空记录，提升操作安全性。
  - Technical Spec:
    - Logic: 会话删除与清空全部前弹出确认提示。
    - Interface: `ui.js` 使用 `window.confirm`。
  - DoD: 单条删除与清空全部均需确认；取消不触发删除。
  - Security & Constraints: 纯浏览器运行；不引入 Node-only 依赖；单文件 < 300 行。
  - Verification: 打开 `browser/standalone.html`，尝试删除/清空并取消，确认未被删除。


- S19. Sessions UI enhancements (search + per-session delete)
  - Context & Goal: 提升会话列表可用性，支持搜索与单条删除，接近 ChatGPT 会话体验。
  - Technical Spec:
    - Logic: 搜索框按标题过滤；列表每条提供删除按钮；支持清空搜索。
    - Interface: `ui-storage.js` 新增单会话删除 API；`ui-agent.js` 负责搜索与删除逻辑。
  - DoD: 会话搜索可用；单条删除可用；删除当前会话会清空消息区。
  - Security & Constraints: 纯浏览器运行；不引入 Node-only 依赖；单文件 < 300 行。
  - Verification: 打开 `browser/standalone.html`，创建 3 会话，搜索过滤并删除其中一条。


- CLI-2. CLI refactor into small modules (TUI maintainability)
  - Context & Goal: 减少 `cli.js` 体积，提升可维护性并保持 TUI 行为一致。
  - Technical Spec:
    - Logic: UI 渲染/Spinner、交互输入、事件订阅分离到独立模块。
    - Interface: 新增 `utils/cli-ui.js`、`utils/cli-prompts.js`、`utils/cli-events.js`；`cli.js` 保留主流程。
  - DoD: `cli.js` < 300 行；TUI 行为与日志输出一致；模块均 < 300 行。
  - Security & Constraints: Node-only；不引入额外依赖；保持输出可序列化。
  - Verification: `node cli.js --help`。


- S18. Browser chat history (IndexedDB multi-sessions)
  - Context & Goal: 浏览器端支持多会话聊天记录，接近 ChatGPT 体验，页面刷新后仍可恢复。
  - Technical Spec:
    - Logic: IndexedDB 存储 `sessions` + `messages`，会话上限 50；标题取首条用户消息前 30 字；支持清空全部。
    - Interface: 左侧栏新增 Sessions 列表与 New/Clear 操作；加载会话时回填历史消息。
  - DoD: 可创建/切换/清空会话；刷新后历史仍在；对话继续正常。
  - Security & Constraints: 纯浏览器运行；不引入 Node-only 依赖；单文件 < 300 行。
  - Verification: 打开 `browser/standalone.html`，创建 2 个会话并刷新，确认恢复与切换正常。


- S16. Browser UI refactor to ChatGPT Light (low GPU load)
  - Context & Goal: 以 ChatGPT light mode 作为视觉目标，减少 blur/重阴影以降低 GPU/CPU 压力；浏览器版 UI 更聚焦对话。
  - Technical Spec:
    - Logic: `standalone.html` 拆分为结构（HTML）+ 样式（`ui-base.css`/`ui-chat.css`）+ 交互（`ui-dom.js`/`ui-agent.js`/`ui.js`），侧栏默认收起并可手动展开。
    - Interface: 继续使用 `Agent.runAsyncIterator`；技能/MCP/Decision Trace 仍可查看。
  - DoD: 页面视觉为 Light 模式；侧栏可折叠；无 blur；主对话区保持居中宽度 760px；功能完整。
  - Security & Constraints: 纯浏览器运行；不引入 Node-only 依赖；单文件 < 300 行。
  - Verification: 本地打开 `browser/standalone.html`，能对话、切换模型、查看技能与 MCP 列表。


- S15. Realtime guard narrowing + memory query regex fix
  - Context & Goal: 修复 memory 自动查询正则中的异常字符，避免匹配失效；同时收紧 realtime guard 触发条件，减少误触发与重复提醒。
  - Technical Spec:
    - Logic: `isPersonalMemoryQuery` 使用标准 `\b` 词边界与稳定短语匹配；`isRealtimeQuery` 仅在时间查询或明确实时主题时触发。
    - Interface: `utils/agent-tool-flow.js` 内部逻辑调整，不改变对外接口。
  - DoD: memory 自动查询触发稳定；非实时文本不再触发 realtime guard；行为保持 Node/Browser 一致。
  - Security & Constraints: 不引入 Node-only 依赖；输出可 JSON 序列化；单文件 < 300 行。
  - Verification: `npx vitest run tests/agent_guards_evidence.test.js`。


- S14. Browser Gemini structured history fix
  - Context & Goal: 修复浏览器模式 `generateContentStream` 的 400 错误，确保工具调用的 history 结构合法。
  - Technical Spec:
    - Logic: 浏览器端从 `buildPrompt` 改为 `convertHistory`；新增 `browser/gemini-helpers.mjs` 复用 Node 端 Gemini schema/历史转换逻辑。
    - Interface: `browser/bootstrap.mjs` 使用 `formatToolsForGemini` + `convertHistory` 生成 `contents`。
  - DoD: 浏览器模式调用模型不再出现 400；工具调用流程可正常工作。
  - Security & Constraints: 仅前端 ESM 文件；不引入 Node-only 依赖；保持输出可序列化；单文件 < 300 行。
  - Verification: `npm run build:browser` + `npm run preview`，UI 输入 `hi` 已验证正常。


- S13. History compaction (token trigger + protected tail)
  - Context & Goal: 修复压缩导致上下文丢失与乱序，并支持 token 触发以适配长对话。
  - Technical Spec:
    - Logic: 当消息数或 token 超阈值时触发；保留最近 N 条；摘要输入包含 User + Assistant；顺序为 Prefix -> Summary -> Recent。
    - Interface: 新增 `AGENTS_COMPACTION_TRIGGER_TOKENS`，映射到 `compaction.triggerTokens`。
  - DoD: 长对话触发压缩不丢最近上下文；token 触发可通过 env 生效；测试更新通过。
  - Security & Constraints: Node/Browser 兼容；输出可 JSON 序列化；单文件 < 300 行。
  - Verification: `npx vitest run tests/history_compactor.test.js`。


- Ran full test suite: `npm test` (48 files, 110 tests passed).


- Checked npm test output: all tests passed with routine warnings (dotenv tips, retry logs, and expected stderr from tool error cases).


- S10. file_tools add read_file + view_image (Node-only)
  - Context & Goal: 补齐与 codex-main 的基础文件工具能力，对齐本地文件读取与图片读取（Base64 文本返回）。
  - Technical Spec:
    - Logic: `read_file` 支持 offset/limit/size cap；`view_image` 读取本地图片并返回 `mime_type` + `data_base64` + `byte_length`。
    - Interface: `skills/file_tools/tools.js` 新增 tool 注册，封装到独立模块 `read-file.js` / `view-image.js`。
  - DoD: `read_file` 与 `view_image` 在 CLI 中可用；`tests/file_tools.test.js` 覆盖通过。
  - Security & Constraints: Node-only；输出可 JSON 序列化；单文件 < 300 行。
  - Verification: `npx vitest run tests/file_tools.test.js`。


- S11. Memory auto lookup (multi-query + fallback)
  - Context & Goal: 当用户询问个人事实/偏好时，自动查询 memory MCP，减少漏检与反复追问。
  - Technical Spec:
    - Logic: 预检阶段自动执行 `memory__search_nodes` 多关键词查询；若无命中则回退 `memory__read_graph`。
    - Interface: 在 `agents.js` 每轮 LLM 前注入预检；实现放在 `utils/agent-tool-flow.js`。
  - DoD: 仅在 memory 工具存在时生效；命中率提升；不修改 `DEFAULT_SYSTEM_PROMPT`。
  - Security & Constraints: Node/Browser 兼容；不写硬编码提示；单文件 < 300 行。
  - Verification: `npm test`。


- S12. Migrate Gemini adapter to @google/genai (Gemini 3 readiness)
  - Context & Goal: 解决 Gemini 3 Preview 对 `thoughtSignature` 的要求，替换旧 SDK 以获得原生支持。
  - Technical Spec:
    - Logic: `gemini-adapter.js` 改用 `@google/genai` 的 `models.generateContent/Stream`；`gemini-helpers.js` 输出符合新 SDK 的 `functionDeclarations` 与 `functionResponse` 结构。
    - Interface: 维持 `GeminiLLM` 的 `chat`/`chatStream` 签名不变。
  - DoD: Gemini 3 工具调用不再报 `missing thought_signature`；全量测试通过。
  - Security & Constraints: Node/Browser 兼容；保持工具输出可序列化。
  - Verification: `npm test`。
