# AFW Cookbook: Common Flows

Last Updated: 2026-02-14  
Owner: AFW Maintainers

## 1. 适用范围

本食谱覆盖 Agent Frontend Worker (AFW) 的高频操作流程与排障动作。  
目标：让工程师按步骤复现，不靠猜测。

## 2. Flow A: 纯聊天回合（chat_turn）

### 目标
- 用户只聊天（例如 `hi`），不触发 UI 工具链路。

### 预期
- 不执行 Done Gate。
- 不显示与工程检查相关的 warning（如 screenshot_missing）。

### 验证

```bash
npx vitest run tests/ui_afw_chat_turn_gate_routing.test.js
```

## 3. Flow B: UI 任务回合（ui_task_turn）

### 触发条件
- 本回合出现 `run_ui_journey` 或 `preview_*` 工具调用。

### 预期
- 执行 Done Gate。
- 硬失败规则生效（console/runtime/journey）。
- 截图缺失属于 warning，不阻断 PASS（在无硬失败前提下）。

### 验证

```bash
npx vitest run tests/ui_afw_done_gate.test.js
```

## 4. Flow C: 删除文件与 `index.html` 回补

### 关键事实
- AFW 删除最后一个文件后会自动补回空 `index.html`。
- 因此 “folder empty” 不是正确表述。

### 预期
- 删除其余文件后，`list_files` 至少包含 `index.html`。

### 参考
- `docs/afw-workspace-behavior.md`

## 5. Flow D: `apply_patch` 删除语法兼容

### 支持写法
- `*** Delete File: <path>`
- `Delete: <path>`（会被归一化）
- `! Delete: <path>`（会被归一化）
- `--- <path>` + `+++ /dev/null`（删除头归一化）

### 常见错误
- 返回 `Invalid patch: no operations found`

### 处理步骤
1. 保持使用 `apply_patch`
2. 修补 patch 语法后重试一次
3. 不要因纯语法问题切到 `list_available_skills/read_skill_documentation`

### 验证

```bash
npx vitest run tests/ui_afw_apply_patch_compat.test.js
npx vitest run tests/agent_self_heal_patch_format.test.js
```

## 6. Flow E: 快速排障清单

1. 先看 `tool.result` 是否有结构化 `error/hint`
2. 再看 `tool.call.end` 成败与耗时
3. `apply_patch` 类问题优先看 patch header/footer 是否合规
4. preview 类问题先区分 `loaded=false` 与 screenshot 失败
5. 仅当确认未知能力缺失时再查 skills 文档

