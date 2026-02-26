# 🏗️ 架构设计 (Architecture)

`agents-js` 的核心目标是提供一个**跨环境稳定运行**的 AI Agent 框架。

## 1. 双平台战略 (Dual-Platform Strategy)

项目分为两个版本，共享 90% 的核心逻辑：

### 🖥️ 服务器版 (Node.js)
- **入口**: `server.js` + `agent-factory.js`
- **能力**: 完整的文件系统访问、Shell 命令执行 (`run_command`)。
- **加载机制**: 支持同步 (CJS) 和 异步 (ESM) 技能加载。
- **通信**: 支持 标准 JSON API 和 SSE (Server-Sent Events) 流。

### 🌐 浏览器版 (Standalone)
- **入口**: `browser/standalone-built.html`
- **能力**: 仅限 Web API（`fetch`, `localStorage` 等）。
- **加载机制**: 构建时预处理 (Manifest)，运行时异步动态 `import()` 工具模块。
- **安全**: 无需后端，API Key 仅存于内存。

## 2. ReAct-Plus 推理循环
我们实现了标准的 **Reasoning and Acting (ReAct)** 模式，并进行了增强：

1. **Thought**: Agent 分析用户意图。
2. **Plan**: Agent 制定执行步骤（v2.0 强制要求）。
3. **Action**: 调用已学习的工具。
4. **Observation**: 处理工具返回的结果。
5. **Self-Healing**: 如果工具连续失败 >=2 次，系统会自动注入纠错提示（Hint），引导 Agent 尝试其他方案。

## 3. 智能记忆管理 (Context Manager)
为了应对 80k 或更小的 Token 限制，`ContextManager` 执行以下操作：
- **锚点保留 (Head Preservation)**：始终保留第 1 轮对话（用户任务目标）。
- **滑动窗口 (Sliding Window)**：仅保留最近的 N 轮对话。
- **一致性保护 (Tool Integrity)**：在丢弃旧消息时，确保 `tool_call` 和 `tool_result` 始终成对出现或成对丢弃，防止模型因找不到结果而崩溃。

## 3.1 决策审计日志 (Decision Trace)
为了提高可观测性，系统会输出简化的“决策摘要”（非原始 Chain-of-Thought）。

- **Node.js (CLI)**：默认开启，输出 `[Decision] Step X: Thought: ... | Plan steps: N`。
  - 关闭方式：`AGENTS_DECISION_TRACE=0 node index.js "..."`
- **Browser (UI)**：侧边栏 **DECISION TRACE** 面板展示最新 50 条。
  - 关闭方式：`globalThis.AGENTS_CONFIG = { ui: { decisionTrace: false } };`
- **持久化**：决策日志写入 `agent_session.json`，可随快照恢复。

## 3.2 Browser Thought Timeline (Chat Bubble)
浏览器 UI 在聊天气泡内展示 **Thought Timeline**，用于解释“这一步在做什么”，而不是泄露原始 Chain-of-Thought。

- **结构**：`logs（事件行） + draft（未验证流式文本） + final（最终答案）`
- **事件来源**：Step 边界、tool.call / approval.required / tool.call.begin / tool.call.end、plan.updated
- **安全**：tool args 预览默认脱敏（api_key/secret/*token 等）并截断，避免敏感信息进入 UI

## 4. 工具发现流程 (Discovery Workflow)
Agent 的默认行为是：
- 启动时只拥有最基础的工具清单。
- 遇到未知任务 -> 调用 `list_available_skills`。
- 找到匹配项 -> 调用 `read_skill_documentation` 学习用法。
- 学习完毕 -> 执行具体的工具调用。

## 5. AFW Workspace 不变量
- AFW 工作区删除到最后一个文件时，会自动补回 `index.html`，不会保持空目录状态。
- 该行为是预览稳定性约束，不是模型幻觉。
- 详细说明见：`docs/afw-workspace-behavior.md`
