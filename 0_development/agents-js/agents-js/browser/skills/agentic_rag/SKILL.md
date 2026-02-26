# agentic_rag

## Purpose
Use Agentic RAG with local tools while keeping auditability and approval boundaries.

## Workflow (MUST)
1. Decide whether the question needs episodic memory, fixed knowledge, or both.
2. Call `memory_search` for mixed retrieval (`scope: "all"`) or focused retrieval (`scope: "episodic"`).
3. Call `kb_search` for fixed knowledge only.
4. Cite hit `id` values in reasoning/output when evidence is used.
5. If the user provides durable personal facts/preferences, call `memory_save` (episodic only).
6. Use `memory_read_graph` when user asks for memory overview/audit.

## Compatibility
- Legacy aliases are available: `memory__search_nodes`, `memory__read_graph`.
- Prefer new tools unless a legacy flow explicitly requires aliases.

## Safety
- Never claim fixed knowledge write support.
- If asked to write fixed knowledge, refuse and explain that fixed memory is read-only.
- Respect approvals for write actions (`memory_save`).
