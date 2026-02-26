---
id: context7_mcp
name: Context7 MCP (Local Skill)
description: Context7 docs lookup via MCP JSON-RPC over HTTP.
---

# Context7 MCP (Local Skill)

This skill exposes Context7 documentation search as local tools.

Why this exists:
- Node mode: works with API key via `CONTEXT7_API_KEY`.
- Browser mode: direct MCP usage is often blocked by CORS when custom headers are required; this skill provides a best-effort path and clearer UX.

Defaults:
- MCP URL: `https://mcp.context7.com/mcp`

Config:
- Node: set `CONTEXT7_API_KEY` in `.env`.

Tools:
- `context7_resolve_library_id`: resolve a library name to a Context7 `libraryId`.
- `context7_query_docs`: query docs for a `libraryId`.
