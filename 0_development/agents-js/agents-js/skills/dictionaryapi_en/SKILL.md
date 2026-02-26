---
name: dictionaryapi_en
description: Free English dictionary definitions + phonetics via DictionaryAPI (dictionaryapi.dev).
user-invocable: true
metadata: {"clawdbot":{"requires":{"bins":["node"]}}}
---

Use DictionaryAPI to look up an English word (definitions, part of speech, phonetics, audio).

Hard rules:
- Do NOT use web_search.
- Do NOT use browser automation.

Input:
- The user provides a word. If the user provides a phrase, use the first token as the word.

Steps:
1) Extract WORD from user message.
2) Prefer tool call (cross-platform):
   - Tool: `dictionary_lookup`
   - Input: `{ "word": "hello", "lang"?: "en", "maxMeanings"?: 3 }`
3) Reply with a concise summary:
   - WORD
   - IPA (if available)
   - Audio URL (if available)
   - Top 1–3 meanings: part of speech + short definition
   - Example (if available)
