# Cookbook: Add New Tool

Last Updated: 2026-02-14  
Owner: Engineering (Tech Lead)

## 1. Goal

为 `agents-js` 新增一个工具，并保证：
- schema 合法
- 路由可达
- 风险可控
- 有测试与文档

## 2. Preconditions

1. 明确工具用途（读/写/外部调用）
2. 明确风险等级（Tier 0-3）
3. 明确运行环境（Node / Browser / 两者）

## 3. Implementation Steps

1. 定义工具接口
   - `name`、`description`
   - `parameters`（JSON schema）
   - `func`（返回结构化 JSON）
2. 注册到对应工具集
   - Node 工具放在 `utils/` 或 skill tools
   - AFW 工具放在 `browser/ui-afw-agent-tools.js` 或相关模块
3. 设置风险与元数据
   - `risk`
   - `meta.intentTemplate`（可读日志）
   - 必要时补 `permissions` / `rateLimit`
4. 补错误返回
   - 统一返回 `{ error, message, ... }`
   - 对常见失败提供可执行 hint
5. 补测试
   - 至少 1 个成功用例 + 1 个失败用例
6. 补文档
   - 更新 `docs/skills.md` 或相关领域文档
   - 若流程复杂，新增/更新 cookbook

## 4. Validation Commands

```bash
npm test
npm run build
```

如果是 AFW 工具，追加：

```bash
npx vitest run tests/ui_afw_preview_driver.test.js
npx vitest run tests/ui_afw_chat_turn_gate_routing.test.js
```

## 5. DoD Checklist

- [ ] 工具参数 schema 与实际实现一致
- [ ] 工具返回为可序列化 JSON
- [ ] 风险等级已声明
- [ ] 单元测试通过
- [ ] 构建通过
- [ ] 相关 docs 已更新

## 6. Common Pitfalls

1. 只改实现，忘记更新 schema
2. 返回非 JSON 可序列化对象
3. 错误信息不可操作（只有 failed 没有 hint）
4. 高风险工具没有审批/限制策略说明
5. 漏更新 docs，导致团队认知漂移

