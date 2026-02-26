---
name: mcp_tester
description: Test MCP-shaped tool outputs (content blocks + isError).
---

# MCP Tester (mcp_tester)

Goal: Provide a small, local skill that returns MCP-shaped tool results so we can validate Node/Browser compatibility before changing core agent logic.

Tools:

1) mcp_echo
- Description: Return an MCP CallToolResult with a text content block.
- Params:
  - text (string, required): text to echo
- Returns: MCP-shaped object
  - { content: [{ type: 'text', text: string }], isError?: boolean, structuredContent?: any }

2) mcp_fail
- Description: Return an MCP CallToolResult with isError=true.
- Params:
  - message (string, optional)

Example (Node CLI):
- node agents-js/index.js "Use mcp_echo with text 'hello', then show me the raw object fields you received."
