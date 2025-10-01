# Demo 002

This folder contains a self-contained demonstration of exporting an HTML print form to an offline Excel workbook using ExcelJS.

## Overview
- `index.html` renders the sample print form and exposes an **Export Full Page to Excel (.xlsx)** button.
- `js/export_to_excel.js` wires the export button, inspects the rendered DOM, and streams the workbook to the browser.
- `vendor/exceljs.min.js` bundles the ExcelJS runtime used by the demo.
- `v50mainstore/...` stores the sample raster assets referenced by the page.

Serve the folder through any static web server (for example `python3 -m http.server 8808`) and open `http://localhost:8808/index.html` to try the export workflow.

> Loading the files through HTTP avoids the canvas security restriction that would otherwise prevent inline image conversion.

## How the exporter works
The logic in `js/export_to_excel.js` follows these stages:

1. **Hook the UI** – When the DOM is ready the script attaches a click handler to `.html_to_excel_btn`. The button is debounced by a `data-busy` flag to prevent concurrent exports.
2. **Measure the layout** – `buildLayoutModel` walks every `<td>/<th>` inside `.exp_to_excel_button_content`. It collects their pixel bounds via `getBoundingClientRect`, normalises the unique row/column edges, and builds arrays of column widths and row heights in pixels. Only “leaf” cells (those without nested tables) become exportable cells, but the routine also propagates the borders of any outer, nested tables onto the inner cells so that Excel can draw the missing strokes.
3. **Capture cell styling** – For each leaf cell the script extracts cleaned text, computed font information, alignment, background fills, and per-side borders. CSS colours are converted into Excel ARGB strings, and pixel border widths are translated to Excel line styles.
4. **Map pixels to Excel metrics** – Column widths are converted from pixels to Excel’s width units, and row heights are mapped to points (72 dpi) before writing them onto the worksheet.
5. **Write cells and merges** – Cells are sorted top-to-bottom, left-to-right. Each target cell receives its value and styles, and any spanning cells are merged. The code tracks occupied coordinates to avoid overwriting merged regions.
6. **Embed images** – `<img>` elements inside cells are rendered to a canvas and converted to Base64 (with an HTTP fetch fallback). The resulting workbook images are anchored using the measured pixel offsets so that their relative positioning roughly matches the browser layout.
7. **Generate and download** – A timestamped filename is assembled from `document.title`, the workbook buffer is produced via `workbook.xlsx.writeBuffer()`, and a temporary `<a>` element triggers the download.

The `CONFIG` block at the top of the file exposes tuning knobs (selectors, sheet name, minimum dimensions, export format, and debug logging).

## What the demo can and cannot do
| Capability | Notes |
| --- | --- |
| Preserve printed layout | Rows and columns are sized using live DOM measurements, so the Excel sheet broadly mirrors the browser rendering. Minor shifts are expected because Excel rounds metrics differently and uses different font rendering. |
| Nested tables | Outer table borders are merged onto inner leaf cells; however, outer-cell content itself is ignored, and deeply nested structures may still require manual adjustment. |
| Text styling | Font family, size, weight, italic, alignment, wrapping, fills, and per-side borders are exported when present. |
| Images | Inline `<img>` tags are embedded. The demo relies on canvas conversion; cross-origin images without CORS headers will be skipped unless served from the same origin. |
| Interactivity & scripts | Only rendered DOM content is captured. Runtime behaviours (e.g., dropdowns, hidden sections) must be expanded before export. |

## Known limitations & improvement ideas
- **Layout fidelity** – Measurements are rounded to whole pixels and then mapped into Excel’s coarse units. Fonts and wrapping may expand or shrink rows. A future improvement could record per-cell minimum heights based on line metrics to reduce overflow.
- **CSS coverage** – Advanced CSS (shadows, gradients, pseudo-elements, flexbox content, transforms) is not translated. Extending the style extractor could add support for text decoration, underline/strike-through, or number formats.
- **Merged-border heuristics** – The current nested-table border merge assumes that inner cells exactly align with outer cell edges. A geometry-aware reconciliation step could provide better support for uneven spans.
- **Image pipeline** – The script depends on `<canvas>` and falls back to `fetch`. Supplying a dedicated asset manifest or server-side proxy would make the process more reliable for cross-origin images.
- **Performance** – Large documents are processed synchronously. Streaming the DOM walk, throttling debug logs, or chunking image conversion would improve responsiveness for long forms.

## Developer tips
- Leave `CONFIG.DEBUG` enabled during integration to trace sizing and image placement in the console. Switch it off in production to suppress noise.
- To export a different section of the page, change `CONFIG.ROOT_SELECTOR` and ensure all required assets are within that container.
- If certain borders disappear, inspect whether the affected cell is a non-leaf table cell; wrapping its contents in a child table or div may help, or extend the border-merging logic.
- When adding new styles, prefer reading from `window.getComputedStyle` so both inline and stylesheet rules are honoured.

