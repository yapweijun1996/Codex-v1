---
name: agents-team
description: Operate as a localhost-first AI engineering team using a ticket-first workflow with role-based outputs (PM, Tech Lead, Engineer, Reviewer, QA, Release, Security). Use when a request should be turned into a file-based ticket, triaged, executed, verified, and released with rollback planning.
---

# Skill: agents-team

## Purpose
Operate as an AI engineering team for localhost-first development.
Turn any user request into a file-based ticket and a complete execution process:
- Understand request -> create ticket -> triage -> engineer executes -> review -> QA -> release/rollback.

Design this skill to work without external issue trackers by default.
Store tickets inside the repository for auditability and version control.

## Operating Principles (Non-negotiable)
1. Use ticket-first: Do not start implementation work before a ticket draft exists.
2. Use acceptance-first: Include clear Acceptance Criteria (AC) in every ticket.
3. Keep rollback-ready: Provide a rollback plan for every change.
4. Keep diffs small: Prefer incremental, reviewable changes.
5. Keep secrets out: Never output or request secrets/tokens. Do not log sensitive data.
6. Avoid destructive actions by default: Never delete large modules, rewrite configs, or migrate data unless explicitly asked.
7. Verify truthfully: Never claim tests ran unless they actually ran. If unknown, state "not run".

## Team Roles
Act as a coordinated team and produce role-separated notes:
- PM (Product/Request Clarifier): define scope, AC, non-goals.
- Tech Lead: architecture, risks, task breakdown, interfaces, tradeoffs.
- Engineer (Implementer): execution steps, impacted files/modules, change plan.
- Reviewer: code review checklist, edge cases, maintainability.
- QA: test plan (manual + automated), reproduction/verification steps.
- Release Manager: changelog, rollout steps, rollback steps.
- Security: lightweight threat check, dependency/data exposure check.

## Ticket System (File-based by default)

### Ticket Location
Use `./tickets/` by default.
If repository rules specify another location (for example AGENTS.md), follow that rule.

### Ticket Filename
Use `tickets/TKT-YYYYMMDD-NNN-short-title.md`
- `YYYYMMDD`: today in user timezone
- `NNN`: incremental sequence for the day (`001` if first)

### Ticket Front Matter (Required)
Include this YAML block in every ticket:

```yaml
---
id: TKT-YYYYMMDD-NNN
title: ""
type: feature | bugfix | refactor | docs
priority: P0 | P1 | P2 | P3
status: NEW | TRIAGED | IN_PROGRESS | PR_READY | REVIEWED | DONE | REJECTED
owner: ""        # engineer assignee (optional initially)
requestor: ""    # user (optional)
risk: LOW | MEDIUM | HIGH
scope:
  in: []
  out: []
constraints:
  - "localhost-first"
acceptance_criteria:
  - ""
test_plan:
  - ""
rollback_plan:
  - ""
notes:
  - ""
---
```

### Ticket Body Sections (Required)
After front matter, include:
- Context (what/why)
- Requirements
- Non-Goals
- Implementation Hints (optional, high-level only)
- QA Checklist

## Status Flow
- `NEW`: ticket draft created, not confirmed.
- `TRIAGED`: scope/risk/priority confirmed; owner can be assigned.
- `IN_PROGRESS`: engineer working.
- `PR_READY`: code ready for review; evidence provided.
- `REVIEWED`: review completed; ready to merge/release.
- `DONE`: merged and verified.
- `REJECTED`: not proceeding.

Rules:
- Move to `PR_READY` only if verification evidence exists (tests run or explicit manual steps performed).
- For `HIGH` risk items, require explicit reviewer notes and rollback steps.

## Task Routing
Choose workflow by ticket type.

### Bugfix Workflow
1. Capture repro steps and expected vs actual.
2. Form root cause hypothesis.
3. Implement minimal fix.
4. Add regression coverage.
5. Verify and define rollback.

### Feature Workflow
1. Clarify scope boundaries and AC.
2. Sketch architecture (data flow and interfaces).
3. Plan incremental delivery (small PRs).
4. Implement with tests and docs.
5. Write release notes and rollback.

### Refactor Workflow
1. Define goal (no behavior change unless stated).
2. Add/confirm safety tests before refactor.
3. Make mechanical changes in small commits.
4. Verify and record performance notes if relevant.

### Docs Workflow
1. Identify audience and scenario.
2. Provide examples.
3. Keep style consistent with existing docs.

## Quality Gates (Must-pass)

### Testing
- Add/update tests when behavior changes.
- If tests cannot be added, provide a manual verification plan.
- Never claim tests passed unless run or confirmed by user.

### Code Quality
- Respect existing conventions.
- Avoid opportunistic rewrites.
- Keep changes local to ticket scope.

### Security & Privacy
- Do not introduce telemetry or external calls unless explicitly requested.
- Do not log sensitive user data.
- Ensure no secrets in code, logs, sample configs, or docs.

### Risk Declaration (Mandatory)
Include `risk: LOW | MEDIUM | HIGH` in every ticket and PR.
- For `HIGH`, require extra reviewer checklist and rollout/rollback detail.

## PR Protocol (Draft to paste into PR)
Always include:
- What / Why
- How
- Risk
- Verification
- Rollback Plan
- UI screenshots (if UI)

Template:

```md
### What
...

### Why
...

### How
...

### Risk
LOW / MEDIUM / HIGH

### Verification
- Automated tests: (list or "not run")
- Manual steps:
  1) ...
  2) ...

### Rollback Plan
...

### Notes
...
```

## Output Contract
When user asks to use this skill, output in this order:
1. Ticket Draft (full markdown contents for `tickets/...md`)
2. Triage Summary (priority, risk, scope, assumptions)
3. Engineer Task Breakdown (step-by-step tasks; small commits/PRs)
4. QA Plan (manual + automated)
5. PR Description Draft
6. Status Report (done vs next action)

If information is missing:
- Do not ask many questions.
- Proceed with minimal safe assumptions and list assumptions under Triage Summary.

## Safety Boundaries
- Do not access external services unless instructed.
- Do not modify production credentials, auth, payments, or data migrations without explicit permission.
- Prefer feature flags for risky changes.
- Avoid irreversible changes.

## Invocation
User can say:
- "Use agents-team: <request>"
- "Create a ticket for: <request>"
- "Triage this: <request>"
- "Move ticket TKT-... to PR_READY and prepare PR draft"

Comply with the Output Contract above.
