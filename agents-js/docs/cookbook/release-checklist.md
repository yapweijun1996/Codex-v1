# Cookbook: Release Checklist

Last Updated: 2026-02-14  
Owner: Engineering (Tech Lead)

## 1. Goal

提供发布前后的标准检查清单，确保变更可回滚、可验证、可追踪。

## 2. Pre-Release Checklist

1. 范围确认
   - 本次变更包含哪些模块
   - 是否涉及高风险路径（delete/write/external actions）
2. 文档确认
   - `docs/` 已更新（行为变化必须有文档）
   - `task.md` / `memory.md` 已同步
3. 测试确认
   - 必跑测试已通过
4. 回滚确认
   - 回滚点与步骤已明确

## 3. Required Commands

```bash
npm test
npm run build
```

若涉及 AFW 关键流程，建议追加：

```bash
npx vitest run tests/ui_afw_chat_turn_gate_routing.test.js
npx vitest run tests/ui_afw_done_gate.test.js
npx vitest run tests/ui_afw_preview_driver.test.js
```

## 4. Release Notes Template

- What changed:
- Why:
- Risk:
- Verification evidence:
- Rollback plan:

## 5. Smoke Checks (Post-Release)

1. chat 回合（如 `hi`）正常响应
2. ui_task 回合执行 Done Gate
3. 关键工具链路可用（至少 1 个 read + 1 个 write 场景）
4. 无新增致命 console/runtime 错误

## 6. Rollback Procedure

1. 标记当前版本为失败候选
2. 回滚到上一个稳定版本
3. 重新执行最小验证集（chat + ui_task + 关键工具）
4. 发布事故说明与后续修复计划

## 7. Stop-Ship Conditions

满足任一条件应停止发布：

1. 高风险动作无审批/无保护
2. 核心流程不可用（chat / ui_task / done gate）
3. 回滚步骤不清晰或不可执行
4. 文档与代码行为明显不一致

