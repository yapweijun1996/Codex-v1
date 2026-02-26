## 当前上下文（自动维护）

### 最近目标
- S53：Browser UI 对齐 ChatGPT（Header/Sidebar/主列/Composer）。
- S54：Tool output 压缩（Context Guard）。
- S55：Replay-from-Trace PoC。
- S56：CSS 优化（降低 GPU 负载）。
- S57：与 codex-main / opencode-main 对齐检查与差距清单。
- S58：Tool Registry（IMDA 4.2.1）。

### 进行中
- S53 已进行：Header 增加 spacer/content 容器，新增 `--sidebar-width-current`；消息列与输入区统一内容宽度变量；sidebar 展开/收起同步 body class。
- S53 继续：降低 assistant 行高与段落间距、收紧 user 气泡、composer 扁平化、header 字号层级微调。
- S53 继续：Header 精简为 Logo/Title/Sidebar Toggle；设置区移入 Sidebar 顶部；状态条移至聊天列顶部。
- S53 已更新：Header 左侧改为 sidebar toggle，右侧新增 “+” 新聊天按钮（Browser UI 易用性提升）。
- S53 已完成：对齐与审批弹窗消息保留已验证。
- S54 已完成：新增 tool output guard，在进入 history/trace/UI 前压缩超大输出，避免上下文爆炸。
- S54 进展：支持通过 `AGENTS_CONFIG.agent.toolOutputLimits` / `AGENTS_TOOL_OUTPUT_LIMITS_JSON` 调整阈值（Node/Browser 一致）。
- S54 进展：`tool_result` 事件覆盖 normal/special/failure（含 tool_not_found/abort/exception、run_command、request_user_input），便于 UI timeline 与 trace 回放。

### UI 进展
- S64 进展：Browser Thought Timeline 的 logs 现消费 `tool.result/tool.error/context.truncated/exec_command.*`，支持结构化行（tag + kind class），并对 `exec_command.output` 做采样（每 stream 仅记录首条），避免 UI 刷屏与高频重绘。
- S64 进展：`thought-logs` 增量 append；draft/final 在 source 未变化时跳过 re-render（降低 marked.parse 与 innerHTML churn）；新增 UI 守门测试 `tests/ui_thought_logs_incremental.test.js`。
- S64 进展：`tool.call`/`approval.required` 多工具时输出可折叠 group（summary + children），提升可读性并降低滚动压力。
- S64 进展：tool-aware args 摘要（优先显示 query/url/path/cmd 等关键字段，避免整段 JSON 噪音），并新增单测 `tests/ui_thought_logger_toolaware.test.js`。
- S55 待启动：trace 重放脚本与摘要输出。
- S56 待启动：UI 样式与动画的 GPU 压力优化。
- S57 进行中：完成初步对齐检查，准备写入差距与后续执行项。
- S58 进行中：新增工具注册表结构（risk/meta/registry snapshot），审批与 trace 对齐 registry。
- S58 进展：Approval UI 显示 permissions/rateLimit 元信息（batch + single）。
- S58 进展：工具调用前草稿改为 Thought 折叠显示，不再作为最终答案直出。
- S58 进展：Thought 折叠前缀统一为 `Thought:` 以触发浏览器折叠逻辑。
- S58 进展：Tool Registry 新增 `intentTemplate`（可序列化），Core 在 `tool.call` / `approval.required` 事件中附带 `intent`，Browser Thought Timeline 不再硬编码 tool intent 映射。
- S58 进展：Built-in tools (`run_command`/`apply_patch`/`list_available_skills`/`read_skill_documentation`/`update_plan`/`request_user_input`) 增加 `meta.intentTemplate`，使 intent 机制覆盖内置工具。
- S58 进展：`run_javascript` 增加 `meta.intentTemplate`，并在 template 渲染器支持 `{field_len}` 占位符，避免在 UI/trace 泄露 code 内容。
- S58 进展：`request_user_input` 的 intent 对齐 `questions[]` 场景：优先显示单问题文本，其次显示问题数量与首个问题摘要。
- S50 进展：Batch approval modal summaryline 增加已选择工具的 intent preview（显示第一个已勾选工具的 intent，便于用户确认）。
- S50 进展：Batch approval modal summaryline 增加已选择工具的风险计数（T2/T3），降低误批风险。
- S50 进展：Batch approval modal 的 Max risk 改为“仅针对已勾选项”实时更新，避免误读（未选的高风险工具不会抬高 Max risk）。
- S50 进展：Batch approval modal summaryline 将风险信息压缩为一行（`Risk: max=... T2:.. T3:..`），改善移动端布局。
- S50 进展：Batch approval modal summaryline 的 intent preview 去掉可视前缀（仅显示 intent 文本），并把标签放到 `aria-label`/`title`。
- S50 进展：Batch approval modal 每个工具行的 intent 也去掉可视 `Intent:` 前缀，保留在 `aria-label`/`title`。
- S59 新增：仅展示真实草稿（不展示 synthetic tool plan），草稿只在 Thought 折叠中出现。
- S60 已完成：浏览器端新增 Audit Trace Copy 按钮，复制完整 trace JSON。
- S61 已完成：修正 trace redaction 保留 token 计数可观测性，并补齐 modelName。
- S62 已完成：streaming 缺 thoughtSignature 时非流式重试一次；降级文本不再暴露内部字段。
- S63 已实现：Browser UI 单轮单气泡 + Thought-first streaming；修复 `appendThought` 崩溃（buildCombinedText 未定义）并在无输出时强制创建 thought 气泡，避免审批流程因 UI 崩溃/日志吞掉导致超时。
- S64 进行中：Thought Timeline 语义化（Step/Tool/Approval/Execute），Thought UI 分离 logs 与 draft，避免日志与正文粘连。
- S64 进展：Thought logs 的 tool args 默认 redaction + 截断；对常见工具提供 intent 文案（search/postcode/url/file 等）。
- S44 进展：拆分 `utils/agent-tool-specials.js` -> `utils/tools/special-run-command.js` / `utils/tools/special-user-input.js` / `utils/tools/special-update-plan.js`，主文件降到 21 行。
- S44 进展：将 per-call 审批 gating 从 `utils/agent-tool-exec.js` 抽到 `utils/agent-tool-approval.js`，`utils/agent-tool-exec.js` 降到 260 行。
- S50/S44 进展：拆分 `browser/ui-approval.js` -> `browser/ui-approval-modal.js`（渲染 + batch 交互）与 `browser/ui-approval.js`（流程编排），将临界文件降到 72 行。
- S50 进展：继续拆分 `browser/ui-approval-modal.js` -> `browser/ui-approval-batch-view.js` / `browser/ui-approval-batch-controller.js` / `browser/ui-approval-modal-utils.js`，为后续 UX 增量预留空间。
- S50/S58 进展：Approval batch modal 每个工具行新增 intent 展示（来自 registry intentTemplate 渲染的事件字段）。
- S50/S58 进展：Approval single modal 新增 intent 展示（`Intent: ...`），与 batch 行为一致。
- S50 进展：Approval single modal 的 intent 去掉可视 `Intent:` 前缀，保留在 `aria-label`/`title`，与 batch 一致。
- S44/S58 进展：拆分 `utils/agent-tool-approval.js` 为 `utils/agent-tool-approval-batch.js` / `utils/agent-tool-approval-single.js` / `utils/agent-tool-approval-keys.js`，主入口文件仅做 re-export，避免后续爆 300 行。

### 测试
- `npm test` 已通过（当前基线：74 files / 160 tests）。
- `npm run build:browser` 已通过（更新 `browser/standalone-built.html`）。

### 新增测试（防逻辑回归）
- S54: `tests/logic_boundary_guard.test.js` 覆盖 BigInt/NaN/Infinity/深度/循环/超大字符串等边界，确保 guard 不崩溃且 JSON 可序列化。
- S64: `tests/ui_state_machine_stress.test.js` 覆盖乱序事件与 exec 输出风暴（采样行为），确保 UI timeline 不崩溃。
- S64: `tests/ui_batch_approval_group_render.test.js` 覆盖 batch approval group 的 children 数量一致性与增量 append（不重绘旧节点）。
- S64: `tests/ui_multi_tool_call_group_render.test.js` 覆盖 multi tool.call group 的 children 数量一致性、tool-aware args 摘要（query/url）与增量 append。
- S64: `tests/ui_step_out_of_order_tool_call_group.test.js` 覆盖乱序 step 事件（assistant_message_started 先到）时 tool.call group summary 的 step 标号稳定性。

### 测试工具/基建
- Browser UI 单测使用最小 fake DOM：`tests/helpers/fake_dom.js`（不引入 jsdom/happy-dom 依赖）。

### 上一轮目标（已完成）
- 修复 Browser mode 的 IMDA 审批时序问题：终端用户点击 Approve 前不应进入“执行中”状态，也不应显示 “Executing”。
- 对齐 IMDA Tier2/Tier3 的人类监督：Tier2/3 工具必须审批；控制面工具需豁免避免死锁。
- 补齐可审计追踪：在浏览器端能看到 approval/user-input/tool 的时间线，证明 Deny 后未执行。

### 关键结论（根因）
- 之前的 policy 允许 Tier2 工具在 agentTier=Tier2 时不弹审批，且 `tool_call_begin` 在审批前就 emit，导致 UI/日志看起来像“工具先执行”。
- Browser UI 在收到 LLM 的 `tool_calls` 时就显示 “Executing”，进一步放大“未审批先执行”的体感。

### 已采取的策略
- IMDA policy 调整：Tier2/Tier3 工具一律 require approval；Tier1 工具在 agentTier=Tier0 时 require approval；控制面工具（如 `request_user_input/update_plan`）豁免。
- 工具执行事件语义修正：`tool_call_begin` 只在审批通过后才 emit（避免“未审批先执行”的遥测）。
- Browser UI 调整：LLM 产出的 `tool.call` 仅标记为 “Requested”，真正开始执行时才显示 “Executing”。
- Trace 补齐：Core emit `user_input_response`（Approve/Deny/Timeout）；Browser sidebar 新增 Audit Trace 面板，默认开启并可复制。
- Plan 可视化：Browser mode 注入 `update_plan` control tool；async iterator 透出 `plan.updated`；Browser sidebar 新增 Plan 面板用于结构化展示（避免依赖 Thought/Plan 文本折叠）。
- Deny 强制停机：当 Tier2+ 工具被 Deny/Timeout，本回合直接 stop（避免模型在无证据情况下继续“猜测回答”，也避免重复弹审批）。
- 合并审批弹窗：同一轮出现多个需审批的 tool_calls 时，使用 batch approval 一次性勾选批准/拒绝（Browser + Node CLI）。
- 部分批准可继续：batch 勾选若拒绝其中一部分，Agent 会继续使用已批准工具的证据回答；仅在该步完全没有任何证据工具成功时才 stop。
- 全局证据感知：即便后续 step 因 cached deny 产生 ApprovalDenied，只要本 turn 早先已有证据工具成功，也不会 stop。
- 精确拒绝缓存：deny 按 tool+argsHash 缓存；同一 turn 若参数变化，会重新弹审批。
- Deny 反馈给 Agent：Deny 会以 tool result (ApprovalDenied/Timeout) 进入 history；同时在未停机情况下追加一条用户提示，要求 update_plan 标记 blocked 并给部分答案。
- Browser batch approval checkbox 修复：倒计时更新不再重绘整个 modal DOM，避免用户手动取消勾选后被自动重置为 checked。
- tool_call id 去重修复：Browser/Node 端 id 生成引入单调递增序列，避免 `Date.now()` 同毫秒导致重复 callId（影响 batch 勾选精确性）。

### 注意事项
- Tier 3（High Risk）工具仍必须逐次审批，不做自动放行或去重。
 - opencode-main 风格指南与现有 agents-js 风格存在差距（try/catch、else、命名等），需评估是否统一。
 - 多个文件仍可能超 300 行（如 `browser/SKILLS.md`、`SUMMARY.md`、`task-archive.md`），需拆分或归档策略。

### 状态
- `npm test` 全量已跑通（65 files / 139 tests）。
- `npm run build:browser` 已生成最新 `browser/standalone-built.html`。
- Approval modal：进一步压缩 batch 列表行高（减少空白、callId 顶行显示、空 args 不占行）。
- Approval modal：修复 `.modal-message` 的 `white-space: pre-wrap` 继承导致的“模板缩进换行被渲染为空行”。
- Browser：修复快速连点/连按 Enter 导致重复发送（send in-flight guard），避免 messages 重复。
- Browser：当收到 `tool.call` 或 step 切换时丢弃本步 streaming 草稿，避免留下“半成品答案”导致 assistant 重复。
- Browser：引入“延迟提交”流式输出；工具步骤的草稿不再闪现/清空，减少 end user 误判为卡顿或崩溃。
