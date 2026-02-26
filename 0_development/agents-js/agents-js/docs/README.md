# Docs Index (agents-js)

Last Updated: 2026-02-14  
Owner: Engineering (Tech Lead)

## 1. 目标

本目录用于提供可执行、可维护、可回归的工程文档。  
原则：文档必须能直接指导实现、测试、排障与发布，不写抽象口号。

## 2. Start Here

1. 新成员上手：`README.md`（仓库根目录）
2. 架构理解：`docs/architecture.md`
3. API 与事件：`docs/api.md`
4. 测试与验证：`docs/test.md`
5. 贡献流程：`docs/contributing.md`
6. AFW 工作区约束：`docs/afw-workspace-behavior.md`
7. AFW 常见任务食谱：`docs/cookbook/afw-common-flows.md`
8. 新增工具食谱：`docs/cookbook/add-new-tool.md`
9. 新增技能食谱：`docs/cookbook/add-new-skill.md`
10. 发布检查食谱：`docs/cookbook/release-checklist.md`
11. 术语表：`docs/glossary.md`
12. 事故处理手册：`docs/runbook/incident-response.md`

## 3. 文档分层

### Foundation（基础）
- `docs/architecture.md`
- `docs/api.md`
- `docs/deployment.md`
- `docs/ui-ux.md`

### Workflow（工程流程）
- `docs/contributing.md`
- `docs/test.md`
- `docs/mcp-debugging.md`

### AFW Domain（Agent Frontend Worker）
- `docs/afw-workspace-behavior.md`
- `docs/cookbook/afw-common-flows.md`

### Cookbook（任务食谱）
- `docs/cookbook/add-new-tool.md`
- `docs/cookbook/add-new-skill.md`
- `docs/cookbook/afw-common-flows.md`
- `docs/cookbook/release-checklist.md`

### Glossary（术语）
- `docs/glossary.md`

### Runbook（故障与恢复）
- `docs/runbook/incident-response.md`

## 4. 文档质量门槛

- 每份文档 SHOULD 包含：适用范围、前置条件、步骤、验证命令、预期结果。
- 所有命令 MUST 可执行，禁止 `TODO` 命令。
- 行为变更 PR MUST 同步更新相关文档，否则视为未完成。
- 当代码行为与文档冲突时，MUST 先修文档或修代码，再合并。

## 5. 建议扩展（下一阶段）

- `docs/cookbook/release-checklist.md`：发布前检查、灰度、回滚步骤。
- `docs/runbook/perf-regression.md`：性能退化定位模板。
- `docs/runbook/security-escalation.md`：高风险安全事件响应模板。
