# url_reader

Goal: Read a URL (HTTP/HTTPS) and return a compact, JSON-serializable result that works in both Node.js and Browser.

## Tools

### read_url

Fetch a URL and return a truncated text representation.

Parameters:
- url (string, required): The URL to fetch. Only `http:` and `https:` are allowed.
- method (string, optional): HTTP method. Default: `GET`. Allowed: `GET`, `HEAD`.
- headers (object, optional): Extra request headers (string values are recommended).
- timeoutMs (number, optional): Request timeout in ms. Default: `10000`.
- maxBytes (number, optional): Max bytes to read from the response body. Default: `200000`.
- mode (string, optional): `auto` (default), `text`, `html_text`, `json`.

Notes:
- Browser mode may fail due to CORS / mixed content restrictions. The tool returns a structured error for these cases.
- This tool does not execute scripts and does not support non-text/binary content.

Example:

```js
// tool call
read_url({
  url: 'https://api.frankfurter.app/latest?from=USD&to=SGD',
  mode: 'json',
  maxBytes: 100000,
})
```
