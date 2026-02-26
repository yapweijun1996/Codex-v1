---
id: TKT-20260207-001
title: "Browser Sidebar Section Collapse with Default Hidden"
type: feature
priority: P2
status: DONE
owner: "codex"
requestor: "user"
risk: LOW
scope:
  in:
    - "Browser sidebar section-level show/hide toggle"
    - "Default all sections hidden on first load"
    - "Persist per-section collapsed state in localStorage"
  out:
    - "Core agent logic changes"
    - "Node CLI behavior changes"
constraints:
  - "localhost-first"
  - "only edit agents-js folder"
  - "keep files under 300 lines where possible"
acceptance_criteria:
  - "Each sidebar section supports show/hide toggle"
  - "On first load, all sections are hidden by default"
  - "Existing full sidebar toggle button (☰) still works"
  - "Section collapse state persists after refresh"
test_plan:
  - "npm run build:browser"
  - "npm test"
  - "Manual: open browser/standalone-built.html and verify section toggle behavior"
rollback_plan:
  - "Revert browser/ui.js and browser/ui-sidebar.css to previous commit"
  - "Rebuild browser output to restore previous standalone-built.html"
notes:
  - "Implements lightweight class toggling only; no extra dependencies"
---

## Context
Browser mode left sidebar has too many items and creates scanning overhead. We need section-level collapse controls to improve readability while keeping current global sidebar toggle behavior.

## Requirements
- Add per-section show/hide toggle in sidebar.
- First-time users should see all sections collapsed by default.
- Preserve user preference via localStorage.
- Keep UI changes lightweight and CPU/GPU friendly.

## Non-Goals
- No redesign of sidebar information architecture.
- No backend or agent execution changes.
- No changes to model/tool logic.

## Implementation Hints
- Initialize toggle controls in browser/ui.js for each `.sidebar-section`.
- Store collapsed states in localStorage under a versioned key.
- Use CSS class `.is-collapsed` to hide section body content.

## QA Checklist
- [x] First load: all sections show `Show` and content hidden.
- [x] Click header/toggle: section expands/collapses correctly.
- [x] Refresh: previous expanded/collapsed state is retained.
- [x] Global sidebar toggle still opens/closes the whole sidebar.
