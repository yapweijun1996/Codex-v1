# Incident Response Runbook

Last Updated: 2026-02-14  
Owner: Engineering (Tech Lead)

## 1. Scope

本手册适用于 `agents-js` 的本地与部署环境故障处理，重点覆盖：
- Agent 无响应、循环调用、错误输出
- AFW（Agent Frontend Worker）执行异常
- 工具调用异常（schema/权限/环境限制）
- 高风险动作误执行风险

## 2. Severity Levels

### P0 (Critical)
- 服务不可用或错误执行高风险动作（删除/覆盖/外发）且可能造成不可逆影响。
- 目标：5 分钟内止损，30 分钟内给出回滚或隔离方案。

### P1 (High)
- 核心流程不可用（chat、ui_task、Done Gate）且影响主要使用场景。
- 目标：15 分钟内恢复最小可用，2 小时内完成根因定位。

### P2 (Medium)
- 部分功能退化（性能下降、警告噪音、非核心工具失败）。
- 目标：当日内修复或给出明确 workaround。

### P3 (Low)
- 文档、提示文案、可观测性细节问题。
- 目标：纳入常规迭代处理。

## 3. First 10 Minutes (Triage Checklist)

1. 记录现场：
   - 用户输入
   - 时间戳
   - 关键事件日志（tool.call/tool.result/error）
2. 判断级别（P0/P1/P2/P3）。
3. 立刻止损（若 P0/P1）：
   - 暂停高风险操作入口（特别是 destructive 写操作）。
   - 停止当前异常回合（AFW Stop）。
4. 建立单一沟通线程：
   - 指定 Incident Owner
   - 指定记录人（Timeline）

## 4. Containment Actions

### 4.1 Agent/AFW
- 触发 AFW Stop，终止当前回合。
- 必要时刷新 preview/session，避免坏状态延续。

### 4.2 Tool Layer
- 对异常工具临时降级（例如仅保留 read-only 工具）。
- 对重复失败工具启用“单次重试 + 明确错误返回”，禁止无穷重试。

### 4.3 High-Risk Paths
- 对 delete/write/export 类动作强制人工确认（若当前策略未开启，临时升级流程）。
- 在恢复前禁止批量 destructive 指令。

## 5. Diagnosis Workflow

1. 先确认“事实行为”再看模型文案：
   - 对 AFW 文件操作，始终以 `list_files` 结果为准。
2. 对比日志：
   - `tool.call.begin` 参数
   - `tool.result` 结构化返回（`error/hint/deleted/file_count`）
   - `tool.call.end` 成败与耗时
3. 对照系统约束文档：
   - AFW 空目录不会保留，删除最后文件会回补 `index.html`  
     见 `docs/afw-workspace-behavior.md`

## 6. Recovery & Verification

按改动类型执行验证：

```bash
npm test
npm run build
npx vitest run tests/ui_afw_chat_turn_gate_routing.test.js
npx vitest run tests/ui_afw_done_gate.test.js
```

若涉及 `apply_patch` / AFW 编辑链路，追加：

```bash
npx vitest run tests/ui_afw_apply_patch_compat.test.js
npx vitest run tests/agent_self_heal_patch_format.test.js
```

## 7. Rollback Strategy

1. 优先回滚“单点高风险改动”。
2. 保留审计信息：回滚前后版本、影响范围、数据状态差异。
3. 回滚后执行最小验证集（至少 chat + ui_task + 关键工具）。

## 8. Communication Template

## Initial Notice
- Incident ID:
- Severity:
- Start Time:
- Impact:
- Current Containment:
- Next Update ETA:

## Resolution Notice
- Root Cause:
- Fix Applied:
- Verification Evidence:
- Residual Risk:
- Follow-up Tasks:

## 9. Postmortem Template

- What happened:
- Timeline (UTC+local):
- Root cause:
- Why existing controls did not block:
- Immediate fix:
- Long-term fix:
- Tests/docs added:
- Owner / Due date:

