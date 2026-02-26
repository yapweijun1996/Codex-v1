---
name: frankfurter_fx
description: Get latest Foreign Exchange (FX) rates using Frankfurter API.
---

# Frankfurter FX

Use this skill to convert currencies or get current exchange rates.

## API Usage (Browser / run_javascript)

To get exchange rates, use the Frankfurter API with `fetch`.

```javascript
// REPLACE with requested currencies
const from = "USD";
const to = "SGD";
const url = `https://api.frankfurter.app/latest?from=${from}&to=${to}`;

const res = await fetch(url);
const data = await res.json();
return data;
```

## Tool Usage (Cross-Platform / tools.mjs)

If this skill provides `tools.mjs`, prefer calling the tool directly:

- Tool: `frankfurter_fx_latest`
- Input: `{ "from": "USD", "to": "SGD" }`
- Output: `{ ok, date, from, to, rate, text, source, url, ... }`

## Returns
A JSON object containing:
- `amount`: 1.0
- `base`: Source currency (e.g. "USD")
- `date`: Date string
- `rates`: Object with target rates (e.g. `{"SGD": 1.34}`)
