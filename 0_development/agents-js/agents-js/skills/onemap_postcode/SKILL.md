---
name: onemap_postcode
description: Resolve Singapore Postcode (6 digits) to Address and Coordinates (Lat/Lng) using OneMap API.
---

# OneMap Postcode Search

Use this skill when the user provides a Singapore postal code (e.g., 339511) and wants to know the address, location, or needs coordinates (Latitude/Longitude) for weather lookup.

## API Usage (Browser / run_javascript)

To get address and coordinates, write JavaScript code using `fetch`:

```javascript
// REPLACE <POSTCODE> with the 6-digit code
const postcode = "339511"; 
const url = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postcode}&returnGeom=Y&getAddrDetails=Y`;

const response = await fetch(url);
const data = await response.json();

if (data.found > 0) {
  const result = data.results[0];
  return {
    address: result.ADDRESS,
    latitude: result.LATITUDE,
    longitude: result.LONGITUDE
  };
} else {
  return { error: "Not found" };
}
```

## Tool Usage (Cross-Platform / tools.mjs)

If this skill provides `tools.mjs`, prefer calling the tool directly:

- Tool: `onemap_postcode_lookup`
- Input: `{ "postcode": "339511" }`
- Output: `{ ok, found, postcode, address, latitude, longitude, text, source, url, ... }`

## Returns
- `ADDRESS`: The full address.
- `LATITUDE`: Latitude (string/number).
- `LONGITUDE`: Longitude (string/number).
