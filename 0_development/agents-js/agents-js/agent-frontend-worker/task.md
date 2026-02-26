# Agent Frontend Worker - task.md

## Context & Goal
- 本 task.md 仅服务 `Agent Frontend Worker` 子项目，不影响 `agents-js/task.md` 主线。
- MVP-0 目标：先打通入口导航与独立页面，确保 `npm run preview` 后可从 `localhost:5500` 进入本项目页面。

## Technical Spec

### Logic
1. 在 `browser/index.html` 增加第三张卡片：`Agent Frontend Worker`。
2. 卡片点击后跳转到 `browser/agent-frontend-worker.html`。
3. `agent-frontend-worker.html` 先提供三栏工作台骨架（Workspace / IDE+Preview / Agent Panel），不接业务工具。

### Interface
- 入口页面：`browser/index.html`
- 子项目页面：`browser/agent-frontend-worker.html`
- 子项目任务：`agent-frontend-worker/task.md`

## Definition of Done
- `npm run preview` 后访问 `http://localhost:5500`，可看到 `Agent Frontend Worker` 卡片。
- 点击卡片后可进入 `http://localhost:5500/agent-frontend-worker.html`。
- 新页面可见三栏骨架与 MVP 状态文案。
- 子项目拥有独立 task 文件，不污染主 task。

## Security & Constraints
- 当前阶段仅做页面导航和静态骨架，不引入外网请求、不增加高风险工具。
- 后续功能必须遵循 Patch-only、可审计、可控制原则。

## Verification
```bash
cd agents-js
npm run preview
# 打开 http://localhost:5500
# 1) 确认出现 Agent Frontend Worker 卡片
# 2) 点击进入 /agent-frontend-worker.html
```

## Progress
- S1 (Done): 三栏 UIUX 壳层已完成（Workspace / IDE+Preview / Agent Panel）。
  - 已支持：文件列表与基础操作按钮、Code/Preview/Log 切换、viewport 切换、Run/Pause/Step/Stop、聊天区与日志区、左右分栏拖拽。
  - 文件：
    - `browser/agent-frontend-worker.html`
    - `browser/ui-afw.css`
    - `browser/ui-afw.js`
- S2 (Done): Workspace 持久化接入 IndexedDB（刷新后保留）。
  - 已支持：新建、重命名、删除、编辑后自动保存；刷新页面后恢复文件内容与当前选中文件。
  - 额外：暴露 `globalThis.__AFW_WORKSPACE_API__`（list/read/write/rename/delete）供后续 Agent 自动化流程复用。
  - 文件：
    - `browser/ui-afw-storage.js`
    - `browser/ui-afw.js`
- S2a (Done): UIUX 可用性修复（移动端 + 文件操作交互）。
  - 已支持：去除原生 `alert/prompt/confirm`，改为页面内 modal；新增操作结果提示（notice）；新建文件后自动选中并提示。
  - 已支持：小屏响应式优化（header/segment/runbar/composer 自适应布局）。
- S2b (Done): Settings 全屏配置弹窗（Gemini / OpenAI）。
  - 已支持：Header `Settings` 按钮；全屏 modal（desktop/tablet/mobile 均可用）。
  - 已支持：Provider、Model、Base URL、API Key、是否持久化 key。
  - 已支持：默认模型建议（Gemini=`gemini-2.5-pro`，OpenAI=`gpt-5`）。
  - 文件：
    - `browser/ui-afw-settings.js`
    - `browser/ui-afw-settings.css`
    - `browser/agent-frontend-worker.html`
    - `browser/ui-afw.js`
- S2c (Done): Agent Panel 低高度遮挡修复（Tablet/DevTools）。
  - 已支持：右侧面板改为稳定分区布局（Head / Chat / Controls / Runbar / Composer），避免 chat 与底部按钮互相覆盖。
  - 已支持：低高度视窗下控制区自适应压缩并可滚动，输入框保持可见。
  - 文件：
    - `browser/ui-afw-layout-fixes.css`
    - `browser/agent-frontend-worker.html`
- S2d (Done): Chat 接通真实 LLM（Gemini/OpenAI）+ Retry + 错误回显。
  - 已升级：AFW Chat 统一改为 `agents.mjs` 执行链（`Agent.runAsyncIterator`），不再使用独立直连聊天路径。
  - 已支持：Gemini 走 `createBrowserAgent`；OpenAI 走同一 Agent 内核 + OpenAI LLM 适配器。
  - 已支持：复用 `retry.mjs` 的 `executeWithRetry`；失败信息写入 Chat 与 Log。
  - 文件：
    - `browser/ui-afw-agent-runtime.js`
    - `browser/ui-afw.js`
    - `browser/ui-afw-chat.js`
- S2e (Done): Theme Toggle（Light/Dark）+ localStorage 持久化。
  - 已支持：
    - Header 新增主题切换按钮（`Theme: Light/Dark`）。
    - 默认主题改为 `Light`。
    - 主题选择持久化到 `localStorage`（刷新后保持）。
  - 文件：
    - `browser/agent-frontend-worker.html`
    - `browser/ui-afw.css`
    - `browser/ui-afw-theme.js`
    - `browser/ui-afw.js`
    - `tests/ui_afw_theme.test.js`
- S2f (Done): Theme 放进 Settings + Follow system。
  - 已支持：
    - Settings 新增 `Appearance > Theme`（Light / Dark / Follow system）。
    - `Follow system` 会根据系统深浅色变化自动切换。
    - 主题模式持久化到 localStorage（`afw_theme_mode_v1`）。
  - 文件：
    - `browser/agent-frontend-worker.html`
    - `browser/ui-afw-settings.js`
    - `browser/ui-afw-theme.js`
    - `browser/ui-afw.js`
    - `tests/ui_afw_theme.test.js`
  - 回归（新增）：
    - 已补“点击 Theme 按钮后刷新仍保持主题”单测（rebind 模拟刷新）。
- S2g (Done): 主题色值收敛（二阶段，提升 light/dark 一致性）。
  - 已支持：
    - `ui-afw.css` 增加完整语义色 token（badge/chat/segment/modal/settings/execution/controls/composer 等）。
    - `ui-afw-layout-fixes.css`、`ui-afw-composer.css`、`ui-afw-settings.css`、`ui-afw-chat-scroll.css` 改为引用 token，减少硬编码暗色。
    - `afwRunPulse` 与 stop 按钮脉冲动画色值也改为 token 驱动。
  - 文件：
    - `browser/ui-afw.css`
    - `browser/ui-afw-layout-fixes.css`
    - `browser/ui-afw-composer.css`
    - `browser/ui-afw-settings.css`
    - `browser/ui-afw-chat-scroll.css`

## Next Step Queue
- S3 (Done): IDE + Preview Driver 注入（console/error/screenshot/perf 基础链路）。
  - 已在 preview 注入 `window.__AFDW_DRIVER__`：
    - `click(selector)`
    - `type(selector, text)`
    - `scrollTo(y)`
    - `getDOM()`
    - `screenshot()`
    - `getConsoleLogs()`
    - `getRuntimeErrors()`
    - `getPerfMetrics()`
  - 已新增 `globalThis.__AFW_PREVIEW_API__` 供外层调用。
  - 文件：
    - `browser/ui-afw-preview-driver.js`
    - `browser/ui-afw-automation.js`
    - `browser/ui-afw.js`
- S4: Agent 控制开关与 patch-only 流程（propose/apply）。
  - S4a (Done): Agent Loop + Agent Tools 打通（先直改文件模式，后续再收敛 patch-only）。
    - 已支持工具：
      - `list_files`
      - `read_file`
      - `write_file`
      - `preview_reload`
      - `preview_set_viewport`
      - `preview_get_dom`
      - `preview_get_console_logs`
      - `preview_get_runtime_errors`
      - `preview_get_perf_metrics`
      - `preview_screenshot`
    - Agent 运行：Gemini / OpenAI 均通过 `agents.mjs` + `Agent.runAsyncIterator` 执行，工具可直接作用于 AFW Workspace/Preview。
    - 文件：
      - `browser/ui-afw-agent-tools.js`
      - `browser/ui-afw-agent-runtime.js`
      - `browser/ui-afw-automation.js`
- S4b (Done): Done Gate 程序判定（不依赖模型自述）。
  - 已支持：当 assistant 回复呈现“完成语义”时，自动执行 gate：
    - 检查 `consoleErrors == 0`
    - 检查 `runtimeErrors == 0`
    - 检查 3 视口截图（desktop/tablet/mobile）
    - 输出 PASS/FAIL 与 issue 列表
  - 已支持：Execution Console 展示 gate 过程事件（started/viewport/completed）。
  - 文件：
    - `browser/ui-afw-done-gate.js`
    - `browser/ui-afw-chat.js`
    - `browser/ui-afw-execution-console.js`
- S4c (Done): 挂载研究工具（`url_reader` + `searxng_search`）。
  - 已复用现有 Browser 技能模块，非重写逻辑：
    - `searxng_query`（来自 `browser/skills/searxng_search/tools.mjs`）
    - `read_url`（来自 `browser/skills/url_reader/tools.mjs`）
  - 已并入 AFW Agent 工具集，与 workspace/preview 工具共用同一 `Agent.runAsyncIterator` 执行链。
  - 文件：
    - `browser/ui-afw-agent-tools.js`
    - `browser/ui-afw-agent-runtime.js`
- S4d (Done): 挂载场景工具（`worldtime` / `onemap` / `open_meteo`）。
  - 已复用现有 Browser 技能模块，加入 AFW 工具池：
    - `worldtime_now`
    - `onemap_postcode_lookup`
    - `open_meteo_current`
  - 文件：
    - `browser/ui-afw-agent-tools.js`

- S4e (Done): 交互工具扩展（hover / press_key / drag）。
  - 已支持：
    - `preview_hover`（悬停）
    - `preview_press_key`（键盘按键）
    - `preview_drag`（拖拽）
  - 仍受 Control Switch `Enable interaction tools` 统一开关控制。
  - Preview driver 已新增对应实现：`hover` / `pressKey` / `drag`。
  - 文件：
    - `browser/ui-afw-preview-driver.js`
    - `browser/ui-afw-agent-tools.js`
    - `browser/ui-afw-agent-tools-interaction.js`

- S4f (Done): 脚本化用户旅程 + 断言层（可重复 E2E）。
  - 新增工具：`run_ui_journey`
  - 已支持：
    - `steps`（动作脚本）：reload/set_viewport/wait + click/hover/type/press_key/drag/scroll + capture_* 采证步骤。
    - `assertions`（预期校验）：`dom_includes`、`dom_not_includes`、`assert_selector_exists`、`assert_selector_text`、`console_errors_max`、`runtime_errors_max`、`perf_metric_max`、`screenshot_captured`、`step_ok`。
    - 失败策略：`stop_on_failure` + `screenshot_on_failure`。
    - 结果输出：结构化报告（pass/fail、步骤/断言统计、失败详情、证据摘要）。
  - 文件：
    - `browser/ui-afw-agent-tools-journey.js`
    - `browser/ui-afw-agent-tools.js`
    - `browser/ui-afw-chat.js`
    - `tests/ui_afw_journey_tool.test.js`

- S4g (Done): `run_ui_journey` 结果并入 Done Gate（统一验收出口）。
  - 已支持：
    - 当本轮执行 `run_ui_journey` 后，Done Gate 自动消费 journey 结果。
    - journey fail 会转为 Done Gate issue（`journey_failed:*`）并使最终 gate FAIL。
    - Done Gate summary 增加 `journey(...)` 字段，未执行时显示 `journey=not_run`。
  - 文件：
    - `browser/ui-afw-chat.js`
    - `browser/ui-afw-done-gate.js`
    - `tests/ui_afw_done_gate.test.js`

- S4h (Done): Preview CSP 调整（降低 srcdoc 告警噪音 + 放宽开发资源加载）。
  - 已支持：
    - 从 meta CSP 中移除 `frame-ancestors`（避免 about:srcdoc 无效指令告警）。
    - 允许常见开发资源来源（`http/https` + localhost）：
      - script/style/img/font
  - 文件：
    - `browser/ui-afw-preview-csp.js`
    - `tests/ui_afw_preview_csp.test.js`
