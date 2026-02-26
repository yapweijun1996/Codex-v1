---
name: file_tools
description: Node-only filesystem listing and grep utilities
---

# File Tools

Node-only utilities for listing directories, searching file contents, and reading files.

## Tools

### list_dir
- Purpose: List directory entries with optional recursion and depth limits.
- Parameters:
  - path (string, default: ".")
  - recursive (boolean, default: false)
  - max_depth (number, default: 3)
  - include_files (boolean, default: true)
  - include_dirs (boolean, default: true)
  - include_hidden (boolean, default: false)
  - limit (number, default: 200)

### grep_files
- Purpose: Search file contents using a regex pattern.
- Parameters:
  - path (string, default: ".")
  - pattern (string, required)
  - flags (string, optional)
  - include (string regex, optional)
  - recursive (boolean, default: true)
  - max_depth (number, default: 5)
  - max_matches (number, default: 50)
  - max_file_size_bytes (number, default: 524288)
  - include_hidden (boolean, default: false)

### read_file
- Purpose: Read a text file with line offsets and limits.
- Parameters:
  - path (string, required)
  - offset (number, default: 1)
  - limit (number, default: 2000)
  - max_file_size_bytes (number, default: 524288)

### view_image
- Purpose: Read a local image and return base64 data.
- Parameters:
  - path (string, required)
  - max_file_size_bytes (number, default: 2097152)

## Notes
- In browser environments these tools return a structured error indicating they are Node-only.
