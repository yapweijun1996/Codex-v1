# 浏览器版技能系统说明

## 🎯 问题：为什么浏览器版需要手动添加工具？

### **服务器版 vs 浏览器版的区别**

| 特性 | 服务器版（Node.js） | 浏览器版（Pure JS） |
|------|-------------------|-------------------|
| **文件系统访问** | ✅ `fs.readdirSync()` | ❌ 无法访问 |
| **动态加载模块** | ✅ `require()` | ❌ 无法使用 |
| **技能自动加载** | ✅ 扫描 `skills/` 目录 | ❌ 需要手动定义 |

---

## ✅ 解决方案：构建时注入技能

我们创建了一个**构建脚本**（`build-browser.js`），在构建时自动将 `skills/` 目录的工具注入到浏览器版中。

### **工作流程**

```
┌─────────────────┐
│  skills/        │
│  ├─ worldtime_tz│
│  │  └─ tools.js │  ← 原生工具定义
│  └─ ...         │
└─────────────────┘
         ↓
    [build-browser.js]
         ↓
  1. 扫描 skills/ 目录
  2. 加载每个 tools.js
  3. 检查浏览器兼容性
  4. 注入到 standalone.html
         ↓
┌─────────────────────────┐
│ standalone-built.html   │  ← 包含所有技能的浏览器版
└─────────────────────────┘
```

---

## 🔧 使用方法

### **1. 构建浏览器版**

```bash
# 方法 1: 使用 npm 脚本
npm run build:browser

# 方法 2: 直接运行脚本
node build-browser.js
```

### **2. 打开生成的文件**

```bash
# 生成的文件位于
browser/standalone-built.html

# 直接双击打开，或通过 HTTP 服务器
cd browser
python -m http.server 8000
# 访问 http://localhost:8000/standalone-built.html
```

---

## 📝 添加新技能

### **步骤 1：创建技能目录**

```
skills/
  └── my_new_skill/
      ├── SKILL.md       # 可选：文档说明
      └── tools.js       # 必需：工具定义
```

### **步骤 2：定义浏览器兼容工具**

```javascript
// skills/my_new_skill/tools.js
module.exports = [
    {
        name: "my_tool",
        description: "Tool description",
        parameters: {
            type: "object",
            properties: {
                param1: { type: "string", description: "..." }
            },
            required: ["param1"]
        },
        func: async ({ param1 }) => {
            // ✅ 使用浏览器 API
            const response = await fetch(`https://api.example.com?q=${param1}`);
            const data = await response.json();
            return data;
            
            // ❌ 不要使用 Node.js API
            // const fs = require('fs');  // 会被自动跳过
            // const { exec } = require('child_process');  // 会被自动跳过
        }
    }
];
```

### **步骤 3：重新构建**

```bash
npm run build:browser
```

---

## 🚫 浏览器不兼容的功能

构建脚本会**自动跳过**使用以下 Node.js API 的工具：

- ❌ `require()` - 模块加载
- ❌ `fs.*` - 文件系统
- ❌ `child_process` - 进程管理
- ❌ `process.*` - 进程信息

### **示例：会被跳过的工具**

```javascript
// ❌ 这个工具会被跳过（使用了 child_process）
{
    name: "run_command",
    func: async ({ command }) => {
        const { exec } = require('child_process');  // ← 不兼容
        return new Promise((resolve) => {
            exec(command, (error, stdout) => {
                resolve({ output: stdout });
            });
        });
    }
}
```

---

## ✅ 浏览器兼容的功能

以下功能可以在浏览器中使用：

### **1. 网络请求**
```javascript
const response = await fetch('https://api.example.com');
const data = await response.json();
```

### **2. 时间/日期**
```javascript
const now = new Date();
const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo'
});
```

### **3. 本地存储**
```javascript
localStorage.setItem('key', 'value');
const value = localStorage.getItem('key');
```

### **4. 数学计算**
```javascript
const result = Math.sqrt(16);
```

---

## 📊 当前状态

### **已包含的技能**

运行 `npm run build:browser` 后，查看输出：

```
🔨 Building browser edition with skills...

  ✓ Loaded skill: worldtime_tz (1 tools)
  ✓ Loaded skill: my_new_skill (2 tools)

📦 Found 2 skills

  ✓ Converted get_world_time from worldtime_tz
  ✓ Converted my_tool from my_new_skill
  ⊘ Skipping run_command (not browser-compatible)

🌐 Converted 2 browser-compatible tools

✅ Browser edition built successfully!
```

---

## 🔄 工作流程对比

### **服务器版（运行时加载）**

```
用户访问 → 服务器启动 → 扫描 skills/ → 加载工具 → 运行
```

- ✅ 动态：添加技能后无需重启
- ❌ 需要服务器

### **浏览器版（构建时注入）**

```
开发者构建 → 扫描 skills/ → 注入工具 → 生成 HTML → 用户打开
```

- ✅ 无需服务器
- ❌ 静态：添加技能后需要重新构建

---

## 🎨 自定义构建

你可以修改 `build-browser.js` 来自定义构建行为：

### **示例：添加额外的工具**

```javascript
// 在 build-browser.js 中
function buildBrowserEdition() {
    // ... 现有代码
    
    // 添加额外的手动定义工具
    const manualTools = [
        {
            name: "custom_tool",
            description: "My custom tool",
            parameters: { /* ... */ },
            func: async () => { /* ... */ }
        }
    ];
    
    const allTools = [...browserTools, ...manualTools];
    
    // ... 继续构建
}
```

---

## 🐛 故障排除

### **问题：工具没有被包含**

**原因**：工具使用了 Node.js API  
**解决**：检查工具代码，移除 `require()`, `fs`, `child_process` 等

### **问题：构建失败**

**原因**：`tools.js` 语法错误  
**解决**：检查 `tools.js` 的语法，确保可以被 `require()` 加载

### **问题：工具在浏览器中报错**

**原因**：工具使用了浏览器不支持的 API  
**解决**：使用浏览器兼容的替代方案（如 `fetch` 替代 `axios`）

---

## 📚 最佳实践

### **1. 技能设计原则**

- ✅ **优先使用 Web API**：`fetch`, `Intl`, `localStorage`
- ✅ **避免 Node.js 依赖**：不使用 `fs`, `child_process`
- ✅ **使用公开 API**：调用无需认证的 API（如 OneMap, Open-Meteo）

### **2. 构建流程**

```bash
# 开发流程
1. 添加/修改 skills/*/tools.js
2. npm run build:browser
3. 测试 browser/standalone-built.html
4. 提交代码
```

### **3. 版本管理**

```gitignore
# .gitignore
browser/standalone-built.html  # 构建产物，不提交
```

或者

```gitignore
# 如果想提交构建产物
# （方便用户直接下载使用）
!browser/standalone-built.html
```

---

## 🚀 未来改进

### **可能的增强**

1. **热重载**：监听 `skills/` 变化，自动重新构建
2. **选择性构建**：只包含指定的技能
3. **压缩优化**：使用 `esbuild` 压缩生成的 HTML
4. **TypeScript 支持**：支持 `.ts` 技能文件

---

## 📖 总结

| 特性 | 服务器版 | 浏览器版（手动） | 浏览器版（构建） |
|------|---------|----------------|----------------|
| **技能自动加载** | ✅ | ❌ | ✅ |
| **需要构建** | ❌ | ❌ | ✅ |
| **需要服务器** | ✅ | ❌ | ❌ |
| **动态更新** | ✅ | ❌ | ❌ |
| **部署简单** | ❌ | ✅ | ✅ |

**推荐使用**：浏览器版（构建）= 简单部署 + 自动技能加载 🎉

---

**现在你可以像服务器版一样，在浏览器版中自动获得所有兼容的技能！** 🚀
