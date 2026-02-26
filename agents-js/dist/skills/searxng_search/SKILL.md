---
name: searxng_search
description: Search the web using private SearXNG instance on Mac Mini.
---

# SearXNG Search

Use this skill to look up real-time information, news, or any data from the web using a private SearXNG instance.

## When to use
- When the user asks about current events, news, or facts outside your internal knowledge.
- When you need to find specific URLs or documentation on the web.

## Tools
### `searxng_query`
Arguments:
- `query` (string): The search terms.
- `category` (string, optional): One of 'general', 'news', 'it', 'science'. Defaults to 'general'.

## Workflow
1. Analyze the user request.
2. If real-time data is needed, call `searxng_query`.
3. Process the results (focus on titles and snippets).
4. If the first page doesn't have enough info, refine the query and try again.
