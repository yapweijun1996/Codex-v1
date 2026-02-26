# Agent.js 逻辑评审（Tech Lead 视角）

## 1) 现状结论（你现在这套已经很强）

### 已有强项
1. **主循环完整**：`run()` 已覆盖中止、上下文裁剪、LLM 调用、工具执行、guard、收尾。  
2. **工具治理基础好**：已有 Tool Registry、risk 归一化、intent 模板、审批策略。  
3. **记忆链路可用**：具备 auto memory lookup/save + citation guard + knowledge selection。  
4. **可观测性不错**：trace collector + token usage + approval 事件与 stop reason。  
5. **兼容性方向正确**：`createAgentAsync` + browser 构建链具备跨运行时能力。

## 2) 关键差距（为什么“还不够强”）

### G1. 缺统一的运行策略对象（RunPolicy）
- 现状：`maxTurns`、`approvalPolicy`、`riskProfile`、`trustedTools` 分散在多处参数与配置中。
- 风险：不同入口（CLI/Browser/API）容易策略漂移，审计成本高。
- 建议：统一 `RunPolicy`（tier/budget/tenant/approval/trace），turn 级生效。

### G2. Planner 结构不硬约束
- 现状：有 synthetic plan，但不强制模型按结构化步骤执行。
- 风险：复杂任务时步骤跳跃、重复工具调用、回滚语义缺失。
- 建议：引入 `Plan V2`（stepId, objective, dependsOn, risk, rollbackHint, doneSignal）。

### G3. Side-effect 验证不足
- 现状：审批阻断与部分 guard 已有，但缺“执行后统一验证器”。
- 风险：工具成功返回 ≠ 业务安全完成（例如跨 tenant 写入、证据不足）。
- 建议：加 `PostToolValidator`，在 tool_result 后统一检查。

### G4. 预算与退避策略不统一
- 现状：有 timeout 与部分 guard，但 token/tool-call/error-budget 没做统一“熔断决策”。
- 风险：复杂请求易出现高成本循环。
- 建议：新增 BudgetGovernor（turnBudget/toolBudget/tokenBudget/failureBudget）。

### G5. 答案契约不统一
- 现状：citation guard 已有，但高风险动作的“证据摘要 + 变更说明”非强制。
- 风险：对外解释性不足，合规不可复核。
- 建议：`AnswerContract`：Tier2+ 必须输出 action summary + evidence + approval ref。

## 3) 与 codex-main / opencode-main 的对比启发

1. **opencode** 的 agent 配置强调“按角色分权 + 默认权限规则集”，你们可借鉴成 `Policy Preset`（build/plan/explore）。
2. **codex-main** 生态强调 approvalPolicy 显式传递，适合对齐为 `RunPolicy.approvalMode` 单一入口，避免散落开关。

> 结论：你们不需要重写 Agent，只需要在现有内核外补一层“策略与契约”，就能显著提升可控性与扩展性。

## 4) 建议的 agent.js 最小能力模型（可落地）

### 4.1 RunPolicy（执行策略）
```ts
type RunPolicy = {
  tier: 0 | 1 | 2 | 3;
  tenantId: string;
  approvalMode: 'always' | 'unless_trusted' | 'never';
  budget: {
    maxTurns: number;
    maxToolCalls: number;
    maxPromptTokens?: number;
    maxFailures: number;
  };
  traceLevel: 'minimal' | 'standard' | 'full';
};
```

### 4.2 PlanV2（结构化计划）
```ts
type PlanStep = {
  id: string;
  objective: string;
  dependsOn?: string[];
  toolHints?: string[];
  risk?: 'low' | 'medium' | 'high';
  rollbackHint?: string;
  doneSignal?: string;
};
```

### 4.3 AnswerContract（回答契约）
```ts
type AnswerContract = {
  requiresCitation: boolean;
  requiresActionSummary: boolean;
  requiresApprovalRef: boolean;
};
```

## 5) 分阶段实施（小步快跑）

### Phase A（低风险，1~2 PR）
1. 新增 `RunPolicy` 类型与默认合并逻辑（不改外部 API）。
2. 在 turn 前后打点 budget，超过阈值时软中断并给用户可执行建议。

### Phase B（中风险，1~2 PR）
1. 引入 `PlanV2` 校验器；不符合结构则要求模型重排计划。
2. 增加 `PostToolValidator`（tenant、evidence、side-effect 摘要）。

### Phase C（中高风险，2 PR）
1. 对 Tier2/Tier3 强制 `AnswerContract`。
2. Trace 导出增加 `policySnapshot` + `budgetLedger`，保证回放可审计。

## 6) 优先级建议（Tech Lead）

- **A. 先做 RunPolicy 统一入口**（收益最大，改动最小）
- **B. 再做 BudgetGovernor**（立刻降低失控成本）
- **C. 最后做 PlanV2 + PostToolValidator**（把“强”升级为“稳定强”）

