# Stdio MCP Debugging Guide

Stdio transport uses child processes (stdin/stdout) for JSON-RPC. It is more sensitive to local environment issues than HTTP. Use the checklist below to debug server-memory or other stdio MCP servers.

## 1) Verify the command runs on its own
The `command` and `args` in `mcp-config.json` must work directly in your shell.

```bash
npx -y @modelcontextprotocol/server-memory
```

Expected: the process starts and waits for input. If you see `command not found` or download errors, fix your local Node.js setup first.

## 2) Watch stderr logs
`McpStdioClient` forwards stderr with a prefix:
- `[MCP][stdio:memory] ...` means the MCP server itself is logging.
- `Process exited with code 127` usually means the command is not on PATH.
- `Process exited with code 1` usually means the server crashed or a dependency is missing.

## 3) First-run download timeouts
`npx` may take longer on first run. Increase timeout in `mcp-config.json`:

```json
{
  "mcpServers": {
    "memory": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "timeoutMs": 60000
    }
  }
}
```

## 4) Confirm working directory
By default, `agents-js` reads `mcp-config.json` from the current working directory.
- If you run `node agents-js/index.js`, it looks in the repo root.
- Best practice: run from `agents-js/`, or set an explicit path:

```bash
export MCP_CONFIG_PATH="/absolute/path/to/mcp-config.json"
```

## 5) Common failures

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Tool list empty | handshake timeout or server exits | check stderr, run the command manually |
| JSON-RPC error -32601 | tool name mismatch | list tools and confirm `memory__` prefix |
| Process stays alive | client not stopped | ensure `client.stop()` is called |
