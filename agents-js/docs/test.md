# Manual Test Guide

This guide lists manual checks to validate core functionality after changes.

## Prerequisites
- Node.js installed.
- `.env` contains `GOOGLE_API_KEY` for live LLM tests.

## 1) Baseline Automated Tests

Run full test suite:

```bash
npx vitest run
```

## 2) Agent Core Loop

### 2.1 Simple tool call
```bash
node index.js "Calculate 12 * 34"
```
Expected:
- Tool call happens and response includes `408`.

### 2.2 Multi-step tool call
```bash
node index.js "Calculate 50 + 50, then divide by 2"
```
Expected:
- Multiple tool calls.
- Final response includes `50`.

### 2.3 Tool timeout
```bash
npx vitest run tests/tool_timeout.test.js
```
Expected:
- Timeout error is returned as structured result.

## 3) Token Usage Alignment

```bash
node index.js "Say hello and summarize your token usage if available"
```
Expected:
- Response includes token usage when provider returns it.

## 4) File Tools (Node-only)

### 4.1 List directory
```bash
node index.js "Use list_dir to list the current directory"
```
Expected:
- `list_dir` tool runs and returns directory entries.

### 4.2 Grep files
```bash
node index.js "Use grep_files to find 'Agent' in this repo"
```
Expected:
- `grep_files` tool runs and returns matches.

### 4.3 Browser restriction behavior
```bash
npx vitest run tests/file_tools.test.js
```
Expected:
- Browser-mode test returns structured `Environment restriction`.

## 5) Apply Patch (Node-only)

```bash
npx vitest run tests/apply_patch.test.js
```
Expected:
- Add/Update/Move/Delete flows pass.
- Paths are constrained to the workspace.

## 6) run_command Streaming Events (Node-only)

```bash
npx vitest run tests/run_command_events.test.js
```
Expected:
- `exec_command_begin` / `exec_command_output` / `exec_command_end` are emitted.

## 7) Browser Self-Healing

```bash
npx vitest run tests/self_heal_browser_env.test.js
```
Expected:
- Failure type `environment_restriction`.
- Advice mentions CORS or mixed content.

## 8) Snapshot Persistence

```bash
node index.js "Remember my name is Alex"
node index.js "What is my name?"
```
Expected:
- Second run recalls the name from `agent_session.json`.

## 9) Browser Build Smoke Test

```bash
npm run build:browser
```
Expected:
- `browser/agents.bundle.mjs` is generated without errors.
