# Contributing Guide

Last Updated: 2026-02-14  
Owner: Engineering (Tech Lead)

## 1. 适用范围

适用于 `agents-js/` 目录内的代码、测试与文档变更。  
目标：小步提交、可审计、可回滚。

## 2. 交付流程（必须）

1. 明确任务目标与 DoD（写入 `task.md`）
2. 调研现状与影响面（代码 + 文档）
3. 小步实现（优先最小可验证改动）
4. 本地验证（测试/构建/手工验证）
5. 更新文档（`docs/` + `memory.md`）
6. 提交变更说明（风险、验证、回滚点）

## 3. 分支与提交建议

- 分支命名 SHOULD 使用：`feat/TKT-...`、`fix/TKT-...`、`refactor/TKT-...`、`docs/TKT-...`
- 提交信息 SHOULD 包含任务编号：`TKT-...: <verb> <summary>`
- 一个提交 SHOULD 只做一件事，避免混杂改动

## 4. 本地验证清单

## 基础命令

```bash
npm test
npm run build
```

## AFW 相关改动推荐补测

```bash
npx vitest run tests/ui_afw_chat_turn_gate_routing.test.js
npx vitest run tests/ui_afw_done_gate.test.js
npx vitest run tests/ui_afw_preview_driver.test.js
```

## 5. PR 必填内容

- What: 改了什么
- Why: 为什么改
- Risk: LOW/MEDIUM/HIGH
- Verification: 运行了哪些命令，结果是什么
- Rollback: 若异常如何回退
- Docs: 更新了哪些文档路径

## 6. 安全与约束

- 未经明确授权，不修改鉴权/支付/生产部署/密钥管理逻辑
- 禁止提交任何真实密钥或敏感信息
- 涉及 destructive 行为（删除/覆盖）时，必须给出保护策略或审批策略说明

## 7. 文档协同要求

- 行为变化 MUST 更新 `docs/`
- 新增工具/流程 SHOULD 配套 cookbook
- 关键约束（invariant）MUST 写在架构或领域文档中，避免仅存在于代码注释

