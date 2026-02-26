---
name: open_meteo_sg
description: Get current weather forecast using Open-Meteo API (requires coordinates).
---

# Open Meteo Weather

Use this skill to get weather information.
**IMPORTANT**: This API requires Latitude and Longitude. You usually need to use `onemap_postcode` first to get these coordinates from a location name or postcode.

## API Usage (Browser / run_javascript)

```javascript
// REPLACE with actual coordinates (e.g. from onemap result)
const lat = 1.3521;
const lon = 103.8198;

// Fetch current weather variables
const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;

const res = await fetch(url);
const data = await res.json();
return data;
```

## Tool Usage (Cross-Platform / tools.mjs)

If this skill provides `tools.mjs`, prefer calling the tool directly:

- Tool: `open_meteo_current`
- Input: `{ "latitude": number, "longitude": number, "timezone"?: "auto"|string }`
- Output: `{ ok, location, current, text, source, url, ... }`

## Weather Codes (for interpretation)
- 0: Clear sky
- 1, 2, 3: Mainly clear, partly cloudy, and overcast
- 61, 63, 65: Rain: Slight, moderate and heavy intensity
- 95: Thunderstorm
