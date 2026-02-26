---
id: TKT-20260226-001
title: "Review agents-js agent logic and define capability upgrade plan"
type: feature
priority: P1
status: DONE
owner: "codex"
requestor: "user"
risk: MEDIUM
scope:
  in:
    - "agents-js/agents.js logic review"
    - "agent capability gap analysis"
    - "task/memory documentation update"
  out:
    - "large-scale planner refactor"
    - "UI-only changes unrelated to policy"
constraints:
  - "localhost-first"
  - "only edit agents-js"
acceptance_criteria:
  - "Provide a clear gap list for current agent architecture"
  - "Provide phased recommendations that keep Node+Browser compatibility"
  - "Update task.md and memory.md for follow-up"
test_plan:
  - "cd agents-js && npx vitest run tests/run_policy.test.js tests/imda_foundation.test.js tests/imda_approval_policy.test.js tests/async_iterator.test.js"
rollback_plan:
  - "Revert commit(s) for TKT-20260226-001 follow-up implementation"
notes:
  - "Analysis references agents-js and peer architecture notes from opencode-main/codex-main"
---

## Context
User asked for a review of `agents-js` logic and guidance on what `agent.js` must include to become more powerful and support project needs.

## Requirements
- Produce a technical review from Tech Lead perspective.
- Identify strong points, gaps, and implementation direction.
- Keep recommendations actionable and incremental.

## Non-Goals
- No direct refactor of runtime logic in this ticket.
- No API breaking changes.

## QA Checklist
- [x] Reviewed current core files in `agents-js`.
- [x] Wrote structured recommendation doc.
- [x] Updated task memory for next rounds.


## Follow-up Implementation (RunPolicy Unified Entry)
- Added runtime policy module to normalize/apply/restore run-level policy.
- Extended `Agent.run(userInput, { policy })` with per-run override support.
- Added `agent.getRunPolicy()` for observability and trace metadata export.
- Added regression tests for policy override + restore behavior.

## Follow-up Implementation (BudgetGovernor Auditability & Defaults)
- Added prompt budget audit fields in fuse payload: `promptTokensUsed`, `promptTokensSource=turn_ledger`.
- Added trace metadata turn-level ledger snapshot: `metadata.agent.turnBudgetLedger`.
- Added prompt budget boundary tests (`=limit` no fuse, `limit+1` fuse).
- Added maxFailures failure buckets (`network` / `logic`) for diagnostics.
- Added tier default budget templates in run-policy normalization.
