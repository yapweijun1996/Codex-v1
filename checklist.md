# AI Agent Enhancement Checklist

This checklist focuses exclusively on improving the AI assistant logic. Items are marked complete when implemented.

- [x] Normalize `YEAR()` expressions to PostgreSQL syntax in `runQuery.cfm`.
- [x] Log normalization events and query execution for debugging.
- [x] Display debug messages in the browser console.
- [x] Allow the AI to choose the most relevant table and document type from the schema. Use manual mapping only if the AI is unsure.
- [x] Move business rule enforcement to the AI by providing rules from `schema_config.json` rather than hard-coded checks.
- [x] Return a structured debug object showing the agent's decision path (table selection, intent, etc.).
- [x] Experiment with AI-generated summaries of chat history to improve follow-up handling.
- [x] Update `index.cfm` to parse the response fields from a new agent modeled after `ai_agent4.cfm` — `summary`, `sql`, `table`, `chart`, and `debug`.
- [x] Remove reliance on `agent.mode`; run SQL whenever `agent.sql` is present.
- [x] Insert `table` HTML returned by the agent directly; only build a table from `runQuery.cfm` results if missing.
- [x] Display charts when `chart` and `chartConfig` are provided, similar to the logic in `index4.cfm`.
- [x] Show the structured `debug` object in the debug panel for troubleshooting.
