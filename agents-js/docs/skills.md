# 🛠️ 技能开发指南 (Skill Development)

`agents-js` 采用动态加载的技能系统。每个技能是一个独立目录。

## 📁 目录结构
```
skills/my_skill/
├── SKILL.md          # 技能文档（Agent 阅读，含 Instruction）
├── tools.mjs         # 核心：跨平台工具函数 (ESM 格式，推荐)
├── tools.js          # 兼容：Node-only 工具函数 (CommonJS)
└── scripts/          # 可选：辅助脚本
```

## 🚀 跨平台工具 (tools.mjs)
这是 v2.0 推荐的格式。它必须只使用标准 Web API（如 `fetch`），以便在浏览器中也能运行。

```javascript
// skills/my_skill/tools.mjs
export default [
    {
        name: "my_cross_platform_tool",
        description: "A tool that works in both Node and Browser",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search query" }
            },
            required: ["query"]
        },
        func: async ({ query }) => {
            const res = await fetch(`https://api.example.com?q=${query}`);
            return await res.json();
        }
    }
];
```

## ⚠️ Node-only 工具 (tools.js)
如果你需要调用 `child_process` 或 `fs`，请使用此格式。浏览器端构建时会自动忽略此类工具。

```javascript
// skills/my_skill/tools.js
module.exports = [
    {
        name: "run_local_script",
        description: "Executes a local node script (Node.js environment only)",
        // ... parameters ...
        func: async ({ scriptPath }) => {
            const { exec } = require('child_process');
            // ... logic ...
        }
    }
];
```

## 📝 编写技能文档 (SKILL.md)
这是给 Agent 看的“说明书”。

```markdown
---
name: my_skill
description: 获取 xxx 信息的专业技能
---
# 使用说明
1. 首先调用 list_available_skills。
2. 发现此技能后，阅读此文档。
3. 调用 my_cross_platform_tool 获取数据。
```

## 🔄 构建与生效
- **服务器版**：重启服务器即可自动加载（使用 `createAgentAsync`）。
- **浏览器版**：必须运行 `npm run build:browser` 重新生成 `standalone-built.html`。
