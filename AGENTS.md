# AGENTS.md

---

# 0. Operating Principles

- Explanations in Mandarin.
- Code and comments in English.
- Only implement the current task.
- Work on ONE objective per run.
- Do not refactor unrelated modules.
- Keep changes minimal and reversible.
- If unsure, STOP and ask.

---

# 1. Scope Discipline

- Modify only files explicitly related to the discussed task.
- Do NOT modify files outside the defined scope.
- If additional files are required, STOP and explain why.
- Do NOT reorganize folder structure.
- Do NOT introduce new libraries without approval.

---

# 1.1 Context Budget (Prevent Overflow)

- Keep task brief short (≤15 lines).
- Do not paste long logs; include only the most relevant 20–40 lines.
- Prefer searching (rg/grep) and reading small snippets instead of dumping full files.
- Avoid reading generated folders:
  - dist/
  - build/
  - node_modules/
  - lockfiles

---

# 2. Hard Stop Conditions (MUST STOP)

Stop immediately if task requires:

1. Database schema changes (migration, table/column modification)
2. Authentication / authorization logic changes
3. Payment / financial calculation logic changes
4. Core shared module changes
5. File deletion
6. Modification of built-in business constraints or default filters

Ask for confirmation before proceeding.

---

# 3. Completion Criteria

A task is complete when:

- Feature works as described.
- No unrelated code was modified.
- No syntax errors exist.
- No new console errors are introduced.
- Code remains readable and maintainable.

---

# 4. ERP Risk Awareness

ERP systems require caution with:

- Financial calculations
- Data integrity
- Inventory consistency
- Role-based access
- Business rule constraints

Rules:

- Never hardcode financial values.
- Never bypass validation logic.
- Never silently change filtering semantics.
- Never remove business constraints without confirmation.

---

# 5. Execution Strategy

- Prefer minimal patch over large refactor.
- Implement smallest working increment first.
- If multiple improvements are required, split into separate runs.
- For integration tasks, connect critical filter logic first before optimizing fields.

---

# 6. Output Format (Mandatory)

Each response must include:

## Goal
## Plan (≤5 steps)
## Files Touched
## What Changed
## Next Step
## Context Summary (≤8 lines)

Context Summary:
- Include only information required for the next run.
- Keep it concise and technical.

---

# 7. Safety Rule

If request is unclear, incomplete, destructive, or semantically risky:

STOP and ask before modifying code.

---

End of file.