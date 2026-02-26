---
name: worldtime_tz
description: Get current time for any timezone (no external API required).
user-invocable: true
metadata: {"clawdbot":{"requires":{"bins":["node"]}}}
---

Get current time for any timezone using device's system clock.

Hard rules:
- Do NOT use web_search.
- Do NOT use browser automation.

Common timezones:
- Asia/Singapore, Asia/Tokyo, Asia/Shanghai
- America/New_York, America/Los_Angeles, America/Chicago
- Europe/London, Europe/Paris, Europe/Berlin
- Australia/Sydney, Australia/Melbourne

Input rules:
- If user asks for specific city/country, map to timezone (e.g., "Tokyo" -> "Asia/Tokyo")
- If no timezone specified, use device local time

Steps:
1) Determine timezone (optional):
   - If user mentions city/country, use corresponding timezone
   - Otherwise, omit timezone parameter for local time
2) Prefer tool call (cross-platform):
   - Tool: `worldtime_now`
   - Input: `{ "timezone"?: "Asia/Tokyo", "locale"?: "en-US" }`
3) Reply with a human-friendly summary:
   - Timezone
   - Current Date & Time
   - UTC Offset
   - Day of Week
