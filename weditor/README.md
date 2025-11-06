# WEditor Playground Snippets

This playground shows how to hydrate **vanilla** WEditor instances directly in the browser without any bundler or server. Two editors (`editorA`, `editorB`) demonstrate the standard wiring you can reuse in other projects.

## Structure Overview

Each editable surface follows the same pattern:

1. A container `<div class="weditor" id="...">` with any initial fallback HTML.
2. Optional textareas with `data-weditor-for` for live output capture (paged HTML, raw HTML, or JSON state).
3. A sibling `<script type="application/json" class="weditor_app_json">` that stores the persisted JSON state.  
   The script may omit `data-weditor-for` when it is adjacent to the editor; WEditor auto-detects it.

WEditor scans for initial state in three places, in order:

1. `data-weditor-state="..."` attribute on the editor element (legacy).
2. `textarea[data-weditor-output="state"]` that already has JSON.
3. Nearby JSON script blocks (new standard).

## JSON Script Auto-Matching

With the updated `weditor.js`, a script block matches an editor when:

- It has `data-weditor-for="editorId"`; **or**
- It carries the helper class `weditor_app_json`; **or**
- It sits immediately before/after the editor (same parent, no other editor between them).

Matched scripts are read once, sanitized, and marked with `data-weditor-state-consumed="true"` to avoid re-applying after hydration.

```html
<div class="weditor" id="editorB"></div>
<textarea
  class="weditor_output weditor_output_json"
  data-weditor-for="editorB"
  data-weditor-output="state"
  placeholder="JSON editor state for Editor B. Persist this to reload editable content."></textarea>
<script class="weditor_app_json" type="application/json">
{ ... editor state JSON ... }
</script>
```

## Nested List Tips

When you need multi-level numbered lists, keep every child `<ol>` or `<ul>` inside the parent `<li>`. Example:

```html
<ol data-weditor-list-style="decimal-dot-zero">
  <li>Parent item
    <ol>
      <li>Child item
        <ol>
          <li>Grandchild item</li>
        </ol>
      </li>
    </ol>
  </li>
</ol>
```

Inside the editor you can rebuild the same structure without touching HTML: place the caret on a list item and press `Tab` to indent (create child level) or `Shift+Tab` to outdent. This guarantees clean numbering such as `1.0 → 1.1 → 1.1.1`.

Once the editor initializes it will populate the textarea with the state (keeping script untouched). Engineers can copy, persist, or tweak the JSON and simply refresh to preview the result.

## Notes

- No build step is required. Include `weditor.js` with `defer` and drop the markup into any static HTML page.
- The sanitation logic strips unsafe scripts/styles from imported Word documents while preserving layout metadata.
- To keep headers/footers disabled, ensure the JSON `header.enabled` and `footer.enabled` flags stay `false`.
- When experimenting with new layouts, consider clearing the textarea before refreshing to confirm the script state is actually applied.
