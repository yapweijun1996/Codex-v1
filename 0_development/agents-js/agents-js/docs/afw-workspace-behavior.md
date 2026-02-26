# AFW Workspace 行为规范

本文档描述 Agent Frontend Worker (AFW) 的工作区文件行为，避免“看起来删空了但仍有 `index.html`”的误解。

## 1. 关键约束（Invariant）

AFW 工作区 **不会保持空目录状态**。  
当删除最后一个文件时，系统会自动补回空内容的 `index.html`。

实现位置：
- `browser/ui-afw-automation.js`（workspace API `deleteFile`）
- `browser/ui-afw.js`（手动删除文件流程）

## 2. 设计目的

- 保障预览入口稳定：AFW 预览默认依赖 `index.html`。
- 避免“无文件”状态导致的预览与编辑器异常分支。

## 3. 对 Agent 行为的影响

- 用户请求 `delete all files` 时，Agent 可能删除所有现有文件，但系统仍会保留/重建 `index.html`。
- 因此，Agent 不应宣称“folder is empty”；正确表述应是“其余文件已删除，系统保留 `index.html` 作为最小入口文件”。

## 4. 工具结果解读建议

对 `apply_patch` 删除场景：
- `file_count` 表示写入更新的文件数量，不等于删除数量。
- 删除效果应结合 `deleted` 字段判断。

## 5. 验证步骤（手动）

1. 在 AFW 中确保仅剩一个文件（例如 `index.html`）。
2. 触发删除该文件（UI 删除或 `apply_patch` 删除）。
3. 执行 `list_files`。
4. 预期结果：列表中仍有 `index.html`（内容可能为空字符串）。

