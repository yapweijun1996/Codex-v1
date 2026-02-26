# agents-js Browser Edition

## 🌐 纯浏览器版本 - 无需服务器

这是 `agents-js` 的**纯浏览器版本**，完全在客户端运行，无需 Node.js 服务器。

---

## ✨ 特性

### 核心功能
- ✅ **零服务器依赖** - 直接在浏览器中运行
- ✅ **单文件部署** - `standalone.html` 包含所有代码
- ✅ **用户自带 API Key** - 安全且私密
- ✅ **完整 Agent 逻辑** - ReAct 循环、工具调用
- ✅ **Thought Timeline + 打字机效果** - 同一气泡内展示 Step/Tool/Approval/Execute 时间线（非原始 CoT，参数默认脱敏）
- ✅ **Apple 风格 UI** - 极简、优雅

### 浏览器兼容工具
- ✅ `worldtime_now` - 使用 `Intl` API 获取任意时区时间（来自 `worldtime_tz` skill）
- ✅ `open_meteo_current` - 使用 Open-Meteo 获取实时天气（来自 `open_meteo_sg` skill）
- ❌ `run_command` - 已移除（需要 Node.js）

---

## 🚀 快速开始

### 方法 1：直接打开文件
1. 双击 `browser/standalone.html`
2. 在顶部输入你的 Gemini API Key
3. 开始对话！

### 方法 2：通过 HTTP 服务器
```bash
# 使用 Python
cd browser
python -m http.server 8000

# 或使用 npx
npx serve browser
```

然后访问 `http://localhost:8000/standalone.html`

---

## 🔑 获取 Gemini API Key

1. 访问 [Google AI Studio](https://aistudio.google.com/apikey)
2. 点击 "Create API Key"
3. 复制 API Key
4. 粘贴到浏览器版界面顶部的输入框

**注意**：你的 API Key 只存储在浏览器内存中，不会发送到任何服务器。

---

## 📖 使用示例

### 基础对话
```
用户: "Hello, who are you?"
助手: "I'm an AI assistant powered by Gemini..."
```

### 使用工具
```
用户: "What time is it in Tokyo?"
助手: [调用 get_world_time 工具]
      "It is currently 3:45 PM in Tokyo (Asia/Tokyo, UTC+09:00)..."
```

### 多时区查询
```
用户: "What time is it in New York, London, and Singapore?"
助手: [调用 get_world_time 多次]
      "Here are the current times:
       - New York: 2:45 AM (America/New_York, UTC-05:00)
       - London: 7:45 AM (Europe/London, UTC+00:00)
       - Singapore: 3:45 PM (Asia/Singapore, UTC+08:00)"
```

---

## 🏗️ 架构说明

### 技术栈
- **前端**: 纯 HTML/CSS/JavaScript
- **AI SDK**: `@google/genai` (通过 ESM CDN)
- **模块系统**: ES Modules (`type="module"`)
- **工具系统**: 浏览器兼容的纯 JS 函数

### 文件结构
```
browser/
  └── standalone.html    # 单文件应用（所有代码内嵌）
```

### 代码组织
```html
standalone.html
├── <style>              # Apple 风格 CSS
├── <body>               # UI 结构
└── <script type="module">
    ├── Import Gemini SDK
    ├── State Management
    ├── Browser Tools (get_world_time, etc.)
    ├── Gemini Integration
    └── UI Event Handlers
```

---

## 🔧 添加自定义工具

你可以轻松添加新的浏览器兼容工具：

```javascript
const browserTools = [
    // ... 现有工具
    {
        name: "calculate",
        description: "Perform basic math calculations",
        parameters: {
            type: "object",
            properties: {
                expression: { type: "string", description: "Math expression (e.g., '2 + 2')" }
            },
            required: ["expression"]
        },
        func: async ({ expression }) => {
            try {
                const result = eval(expression); // 注意：生产环境需要安全的计算器
                return { expression, result };
            } catch (error) {
                throw new Error(`Invalid expression: ${error.message}`);
            }
        }
    }
];
```

---

## 🆚 对比：浏览器版 vs 服务器版

| 特性 | 浏览器版 | 服务器版 |
|------|---------|---------|
| **部署** | 单文件 HTML | Node.js + Express |
| **API Key** | 用户输入 | 服务器环境变量 |
| **工具能力** | 仅浏览器 API | 完整 Node.js 生态 |
| **文件系统** | ❌ | ✅ |
| **Shell 命令** | ❌ | ✅ (`run_command`) |
| **时区查询** | ✅ (`Intl` API) | ✅ (Node.js 脚本) |
| **网络请求** | ✅ (`fetch`) | ✅ (`fetch` / `axios`) |
| **流式响应** | ✅ (打字机效果) | ✅ (SSE) |
| **安全性** | API Key 暴露风险 | API Key 隐藏 |

---

## 🔒 安全注意事项

### API Key 保护
- ⚠️ **不要在公共网站上硬编码 API Key**
- ✅ 让用户输入自己的 API Key
- ✅ 使用 `type="password"` 隐藏输入

### 跨域请求
- Gemini API 支持 CORS，可直接从浏览器调用
- 如果调用其他 API，需要确保支持 CORS

### 内容安全
- 使用 `escapeHtml()` 防止 XSS 攻击
- 避免使用 `eval()` 执行用户输入

---

## ⚙️ Runtime Config (AGENTS_CONFIG)

你可以在页面加载 bundle 之前，用 JavaScript 配置浏览器版启用/禁用 skills/tools/MCP。

示例（放在 `standalone.html` 里，且必须早于 `bootstrap.mjs` 初始化调用）：

```html
<script>
  // Global runtime toggles for browser edition
  globalThis.AGENTS_CONFIG = {
    // Disable MCP tools entirely in browser
    mcp: { enabled: false },

    // Skill-level filter (by skill id)
    skills: {
      // enabled: ['open_meteo_sg'],
      disabled: ['searxng_search'],
    },

    // Tool-level filter (by tool name)
    tools: {
      // enabled: ['open_meteo_current'],
      disabled: ['run_javascript'],
    },
  };
</script>
```

说明：
- `skills.enabled` 非空时，只有在列表里的 skills 会被加载
- `tools.enabled` 非空时，只有在列表里的 tools 会被注册给 Agent
- `mcp.enabled === false` 会阻止浏览器端触发任何 MCP 的网络请求

---

## 📦 部署选项

### 1. GitHub Pages
```bash
# 将 browser/ 目录推送到 gh-pages 分支
git subtree push --prefix browser origin gh-pages
```

访问: `https://yourusername.github.io/agents-js/standalone.html`

### 2. Vercel / Netlify
直接拖拽 `browser/` 目录到平台即可。

### 3. 本地文件
直接分享 `standalone.html` 文件，用户双击即可使用。

---

## 🎨 自定义样式

所有样式都在 `<style>` 标签中，使用 CSS 变量：

```css
:root {
    --accent-blue: #007AFF;    /* 主色调 */
    --bg-primary: #F5F5F7;     /* 背景色 */
    --text-primary: #1D1D1F;   /* 文字颜色 */
}
```

修改这些变量即可改变整体风格。

---

## 🐛 故障排除

### 问题：无法加载 Gemini SDK
**原因**: 网络问题或 CDN 不可用  
**解决**: 检查网络连接，或使用本地 SDK 文件

### 问题：API Key 无效
**原因**: Key 错误或已过期  
**解决**: 在 [Google AI Studio](https://aistudio.google.com/apikey) 重新生成

### 问题：工具调用失败
**原因**: 浏览器不支持某些 API  
**解决**: 使用现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）

---

## 🚧 限制

### 无法实现的功能
- ❌ 文件系统访问（读写本地文件）
- ❌ Shell 命令执行
- ❌ 后台任务调度
- ❌ 数据库连接

### 可以实现的功能
- ✅ 网络请求（`fetch`）
- ✅ 本地存储（`localStorage`）
- ✅ 时间/日期操作（`Intl`, `Date`）
- ✅ 数学计算
- ✅ 字符串处理

---

## 📝 许可证

与主项目相同。

---

## 🙏 贡献

欢迎提交 PR 添加更多浏览器兼容工具！

---

**享受纯浏览器的 AI Agent 体验！** 🎉
