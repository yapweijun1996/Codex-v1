# 🔧 API 端点参考

`agents-js` 服务器版提供标准的 RESTful API 和 SSE 流式接口。

## 1. 聊天接口 (Chat)

### `POST /api/chat`
阻塞式请求，等待 Agent 完成所有 ReAct 步骤后返回。

**请求体**:
```json
{
  "message": "What is the weather in Singapore?"
}
```

**响应体**:
```json
{
  "success": true,
  "response": "The current temperature in Singapore is 28°C...",
  "metadata": {
    "duration": "1450ms",
    "toolsUsed": ["onemap_postcode_lookup", "open_meteo_current"],
    "turnCount": 2
  }
}
```

## 2. 流式接口 (Streaming)

### `POST /api/chat/stream`
基于 Server-Sent Events (SSE) 指向的流式接口。

**事件流 (Events)**:
- `start`: 任务开始
- `thinking`: Agent 正在思考 (包含 step 计数)
- `assistant_message_started`: 助手开始输出文本
- `agent_message_content_delta`: 文本增量 (用于打字机效果)
- `tool_call`: 触发工具调用
- `tool_result`: 工具返回结果
- `response`: 最终完整回复
- `done`: 整个 turn 结束
- `error`: 发生错误

### Browser UI: Thought Timeline（事件映射）

浏览器端 UI 会将“流式事件”映射为同一 assistant 气泡内的 **Thought Timeline**（logs + draft + final）。

设计原则：
- 只展示“动作与状态”（可审计/可验证），不输出原始 Chain-of-Thought。
- tool args 预览默认 **脱敏 + 截断**，避免敏感信息出现在 UI。

事件到 Thought logs 的默认映射：
- `assistant_message_started(step=N)` -> `Step N: Thinking - ...`
- `tool_call` -> `Step N: Action - <toolName> (<intent>) <argsPreview>`
- `approval.required` -> `Step N: Approval required - <toolName> (TierX) <argsPreview>`
- `tool.call.begin` -> `Step N: Executing - <toolName>`
- `tool.call.end` -> `Step N: Done - <toolName> (ok|error) <durationMs>`
- `plan.updated` -> `Step N: Plan updated - <explanation/next step summary>`
- `turn.completed(finalResponse=...)` -> 进入 `final` 区域；若之前存在 `draft`，draft 会被清空并在 logs 中提示 “Draft replaced by final answer below.”

脱敏规则（与 trace redaction 对齐）：
- Key 匹配：`api_key`, `apikey`, `secret`, `password`, `credential`, `authorization`, `bearer`，以及所有 `*token` 结尾字段。

Tool intent（doing what）规则：
- UI 会为常见工具生成更语义化的 intent（例如 `searxng_query` / `onemap_postcode_lookup` / `read_url` / `read_file` 等）。
- 未匹配的工具则仅展示工具名 + argsPreview。

## 3. 信息与健康检查

### `GET /api/info`
获取当前服务器加载的所有技能和工具清单。

### `GET /api/health`
系统健康检查。
