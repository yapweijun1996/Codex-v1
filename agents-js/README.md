# agents-js

一个轻量级、跨平台的 AI Agent 框架，深度集成 Gemini API，支持双版本（Node.js 服务器版 + 纯浏览器单文件版）。

📚 Docs Start Here: `docs/README.md`

## 🌟 核心特性 (v2.0)
- **环境无关 (Environment Agnostic)**：同一套 Skill 逻辑同步支持 Node 和 Browser。
- **ReAct-Plus 循环**：强制 `Thought -> Plan -> Action` 逻辑，提高推理稳定性。
- **智能记忆管理**：自动裁剪长对话上下文，防止 Token 溢出。
- **安全沙箱**：内置指令校验器，防止危险 Shell 命令执行。

## 🧠 深度对齐 Codex 核心逻辑 (v2.5)
- **记忆一致性**：History Normalization 保证工具调用与结果严格配对，避免孤儿消息。
- **高精度 Token 管理**：原子化裁剪 + CJK 混合权重 + API 事实点同步，长对话更稳定。
- **运行可见性**：状态机事件流（thinking/executing/idle）与并发工具耗时遥测。
- **持久化能力**：Snapshot 导出/恢复，CLI 默认自动读写 `agent_session.json`。

---

## 🚀 快速开始

### 核心安装
```bash
npm install
echo "GOOGLE_API_KEY=your_key_here" > .env
```

### 开发接入 (Node.js)
```javascript
const { createAgentAsync } = require('./agent-factory');

async function main() {
    // v2.0 异步加载机制，确保 ESM 工具加载
    const { agent } = await createAgentAsync({
        modelName: "gemini-2.5-flash" 
    });

    const response = await agent.run("What time is it in Tokyo?");
    console.log(response);
}

main();
```

### 运行参数配置（Node + Browser）

#### Node.js（推荐：config.js）
编辑 `agents-js/config.js`：
```javascript
module.exports = {
  agent: { maxTurns: 50 }
};
```

#### Node.js（环境变量覆盖）
```bash
AGENTS_MAX_TURNS=50 node index.js "help me check current time"
```

#### 代码传参覆盖（Node/Browser 通用）
```javascript
const { createAgent } = require('./agent-factory');
const { agent } = createAgent({ maxTurns: 50 });
```

#### Browser（全局配置注入）
在加载浏览器 bundle 前注入：
```html
<script>
  globalThis.AGENTS_CONFIG = { agent: { maxTurns: 50 } };
</script>
```

#### Tool Output Limits (Context Guard)
你可以通过配置 `agent.toolOutputLimits` 控制工具输出的截断/摘要阈值，避免大型 stdout/HTML/JSON 进入 history/trace/UI 造成上下文膨胀。

Node/Browser 通用：
```js
globalThis.AGENTS_CONFIG = {
  agent: {
    toolOutputLimits: {
      maxStringChars: 12000,
      headChars: 8000,
      tailChars: 2000,
      maxArrayItems: 60,
      maxObjectKeys: 60,
      maxDepth: 5,
    },
  },
};
```

Node (env) 可选：
```bash
export AGENTS_TOOL_OUTPUT_LIMITS_JSON='{"maxStringChars":4000,"headChars":2500,"tailChars":800}'
```

### 🔍 决策审计日志 (Decision Trace)

为了提高透明度并方便调试，Agent 会实时输出简化的“决策摘要”（非原始 Chain-of-Thought）。该日志记录了模型在每一步的思考动机与计划步数。

#### Node.js (CLI)
终端运行 `index.js` 时默认开启：
```bash
# 默认开启（输出示例）
[Decision] Step 3: Thought: Re-executing tools to gather real-time data... | Plan steps: 6

# 如何关闭
AGENTS_DECISION_TRACE=0 node index.js "..."
```

#### Browser (UI)
在侧边栏的 **"DECISION TRACE"** 面板中实时显示最新 50 条日志。

同时，聊天列的同一 assistant 气泡内会展示 **Thought Timeline**（Step/Tool/Approval/Execute/Plan），用于解释动作与状态（非原始 CoT），其中 tool args 预览默认脱敏并截断。

- **如何关闭**：在加载页面 bundle 前通过全局配置禁用：
```javascript
globalThis.AGENTS_CONFIG = {
  ui: { decisionTrace: false }
};
```

### 📤 Trace 导出（含 Tool Registry 元信息）
Agent 支持导出可重放 trace，其中包含 **Tool Registry 快照**（仅本次实际使用的工具）。快照内记录：
- `risk`（IMDA Tier）
- `permissions`
- `rateLimit`
- `inputSchema` / `outputSchema`（若工具定义提供）

导出对象中的字段：
```json
{
  "toolRegistrySnapshot": {
    "run_command": {
      "name": "run_command",
      "risk": 3,
      "permissions": ["process.exec"],
      "rateLimit": null,
      "inputSchema": { "type": "object", "properties": { "command": { "type": "string" } } },
      "outputSchema": null
    }
  }
}
```

---

## 🔌 MCP 外部工具 (External MCP)

### 现状 (已实现)
- Node.js 端支持通过 `EXTERNAL_MCP_URLS` 动态发现并注册外部 MCP 工具（HTTP/HTTPS，JSON-RPC 2.0）。
- 当前实现默认使用 `POST` 调用 MCP 的 `tools/list` 与 `tools/call`。

同时支持 `MCP_CONFIG_JSON`（推荐）：允许为每个 MCP server 配置独立的 `headers`（例如 API Key），并默认使用命名空间避免与本地 skill 工具重名：`<serverName>__<toolName>`。

如果你希望使用可读性更好的多行 JSON（适合存 DB 导出的配置），Node.js 端也支持从 `mcp-config.json` 读取。
默认路径为当前工作目录下的 `mcp-config.json`（测试环境会跳过以避免本地配置影响单测），也可通过 `MCP_CONFIG_PATH` 或 `createAgentAsync({ mcpConfigPath })` 指定。

配置示例（Node.js）：
```bash
# 逗号或换行分隔多个 URL
export EXTERNAL_MCP_URLS="http://127.0.0.1:4000/mcp,https://your-mcp.example.com/mcp"

node agents-js/index.js "use the remote tool and summarize"
```

单测（内置 mock MCP server，验证发现+调用闭环）：
```bash
cd agents-js
npx vitest tests/external_mcp_discovery.test.js
npx vitest tests/external_mcp_config_json_headers.test.js
```

### 限制与安全注意 (Important)
- 认证/Headers：
  - `EXTERNAL_MCP_URLS`：适合无需额外认证头的 MCP server。
  - `MCP_CONFIG_JSON`：支持 per-server `headers`（用于 API Key）。
- Browser：浏览器无法读取 `.env`，也无法启动本地进程（stdio）。此外，浏览器直连外部 MCP（HTTP）在真实环境中经常被 CORS 预检拦截（尤其是需要自定义 Header 传 API Key 的服务，如 Context7）。
  - 结论：浏览器端 MCP 直连属于「实验性」能力；推荐在 Node 模式使用 MCP，或通过 Node Gateway 转发。
- 密钥管理：不要把 `.env`、任何 API Key、token 提交进 git；生产环境建议使用短期 token 或后端代理。

补充：我们也提供了一个本地 Skill 版本的 Context7（`skills/context7_mcp`），工具名为 `context7_resolve_library_id` / `context7_query_docs`。在浏览器环境下，如果 HTTP MCP 直连因为 CORS 失败，可以优先使用这个 Skill。

### MCP_CONFIG_JSON 示例（Node.js）
```bash
export MCP_CONFIG_JSON='{
  "mcpServers": {
    "context7": {
      "transport": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": { "CONTEXT7_API_KEY": "<YOUR_CONTEXT7_KEY>" }
    }
  }
}'

# 运行后，工具名会类似：context7__<toolName>
node agents-js/index.js "use context7__<toolName> to fetch docs and summarize"
```

### mcp-config.json 示例（Node.js，多行）
创建 `agents-js/agents-js/mcp-config.json`（该文件已加入 `.gitignore`，避免误提交密钥）：

```json
{
  "mcpServers": {
    "context7": {
      "transport": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": { "CONTEXT7_API_KEY": "<YOUR_CONTEXT7_KEY>" }
    }
  }
}
```

启动：
```bash
node agents-js/index.js "use context7__query-docs to fetch docs and summarize"
```

### Stdio MCP 示例（Node.js 专用）
适用于本地 MCP Server（通过 stdio 启动，例如 `server-memory`）：

```json
{
  "mcpServers": {
    "memory": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

启动示例：
```bash
node agents-js/index.js "use memory__list_memories and summarize"
```

### Roadmap（计划中）
为了支持“DB per-user key + serverless browser 注入”的模式，我们计划新增：
- 可选：Node 提供 MCP gateway，将 stdio 工具转为浏览器可用的 HTTP。

对应任务与实现细节以 `agents-js/task.md` 为准。

### Browser 注入示例（HTTP MCP）
⚠️ 实验性：以下方式依赖目标 MCP Server 的 CORS 配置（且必须允许自定义 Header）。如果你看到 CORS 报错，请改用 Node 版本（或实现 Gateway）。

在页面中先注入配置，再加载浏览器版 bundle：

```html
<script>
  // 由后端根据当前用户从 DB 生成（注意：前端可见，生产建议用短期 token 或后端代理）
  window.EXTERNAL_MCP_CONFIG = {
    mcpServers: {
      context7: {
        transport: 'http',
        url: 'https://mcp.context7.com/mcp',
        headers: { CONTEXT7_API_KEY: '<YOUR_CONTEXT7_KEY>' }
      }
    }
  };
</script>

<!-- 注意：memory 这类 transport: "stdio" 的 MCP server 在浏览器中不可用（无法 spawn 进程）。 -->
```

---

## 📖 详细文档 (Documentation)

请参阅 `docs/` 目录下的专题指南：

- [🛠️ 技能系统 (Skills Guide)](./docs/skills.md) - 如何编写跨平台工具。
- [🔧 API 参考 (API Reference)](./docs/api.md) - REST 与 SSE 流接口说明。
- [🏗️ 架构设计 (Architecture)](./docs/architecture.md) - 理解双版本与 Context 管理。
- [🚀 部署指南 (Deployment)](./docs/deployment.md) - Vercel/Railway/GH-Pages。
- [🎨 UI/UX 设计](./docs/ui-ux.md) - Apple 风格原则与优化。
- [🧪 MCP 调试指南](./docs/mcp-debugging.md) - Stdio MCP 常见问题排查。

---

## 🌐 浏览器版快速开始
1. 运行构建：`npm run build:browser`
2. 打开产物：双击 `browser/standalone-built.html`

---

## 🧪 测试
```bash
npm test
```

## 📄 许可证
MIT
