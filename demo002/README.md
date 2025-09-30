# Demo 001

This folder packages the minimum assets needed to demonstrate offline HTML ➜ Excel export.

## Files
- `index.html` – sample print form markup with export button
- `js/export_to_excel.js` – offline-export logic
- `vendor/exceljs.min.js` – ExcelJS runtime (minified)
- `v50mainstore/...` – sample images referenced by the page

## Usage
1. Serve the folder through any static web server (example: `cd demo001 && python3 -m http.server 8808`).
2. Open the page in the browser: `http://localhost:8808/index.html`.
3. Click **Export Full Page to Excel (.xlsx)** to download the offline workbook.

> Serving over HTTP avoids canvas security restrictions when converting images.
