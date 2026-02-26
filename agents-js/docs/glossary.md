# Glossary (agents-js)

Last Updated: 2026-02-14  
Owner: Engineering (Tech Lead)

## A

- Agent
  - 执行 ReAct 循环（Thought/Plan/Action）的运行实体。
- AFW (Agent Frontend Worker)
  - 浏览器内运行的前端 Agent 工作台，含 workspace、preview、chat、done gate。
- Approval Policy
  - 工具调用审批策略，如 `always`、`unless_trusted`、`never`。

## C

- chat_turn
  - 未触发 UI 工具链路的回合，通常不执行工程门禁检查。
- Context Manager
  - 对历史消息做裁剪与保护的模块，避免 token 溢出并保持 tool call/result 一致性。

## D

- Done Gate
  - AFW 回合结束时的工程检查聚合（console/runtime/journey/perf/screenshot）。
- Decision Trace
  - 非 CoT 的决策摘要日志，用于可观测性与审计。

## I

- IMDA Tier
  - 风险等级分层（Tier 0-3），用于审批与治理策略。

## P

- patch_format_error
  - `apply_patch` 的格式类错误（如 patch header/delete syntax 不合法）。
- Preview Watchdog
  - 预览桥接/重建的保护器，防止连续失败导致风暴重试。

## R

- ReAct
  - Reasoning + Acting 的多步推理执行模式。
- Runbook
  - 标准化故障处理手册（分级、止损、回滚、复盘）。

## T

- tool.call.begin / tool.result / tool.call.end
  - 工具执行生命周期事件，分别表示开始、结果、结束。
- Tool Registry
  - 工具元数据注册表，包含 risk/schema/permissions 等治理信息。
- turn
  - 一次完整用户输入到 Agent 结束响应的回合。

## U

- ui_task_turn
  - 本回合触发了 `run_ui_journey` 或 `preview_*` 等 UI 工具的回合。

## W

- Workspace Invariant
  - AFW 工作区关键不变量：删除最后一个文件后会自动补回 `index.html`。

