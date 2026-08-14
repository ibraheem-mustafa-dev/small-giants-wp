---
block: sgs/option-picker
date: 2026-08-14
verdict: PASS
editor_capture_passed: true
editor_capture_run: true
capture_method: Playwright against the live sandybrown canary (wp.data selectBlock + direct DOM computed-style read), post-deploy
deployed_build: deploy 2026-08-14 (--payload plugins/sgs-blocks/src/blocks/option-picker/)
change: D4 — hide ToolsPanel's own duplicate <h2> title when nested in a PanelBody (Colours panel, InspectorControls group="styles")
source_sha: 0a97524de429ad31
---

## What this report verifies

`edit.js` gained `className="sgs-nested-tools-panel"` on the ToolsPanel inside the
"Colours" PanelBody, under `InspectorControls group="styles"` (the WordPress
"Styles" tab); `editor.css` gained the matching hide rule. Neither file is a
frontend surface (`check-editor-canvas-css.py option-picker` confirms).

## Live measurement

Inserted `sgs/option-picker` on a throwaway page (2434, force-deleted after use),
selected the block, switched the sidebar to the **Styles** tab (icon-only, found
via `aria-label`), expanded "Colours", and read the real computed styles of the
inner ToolsPanel's own header:

- `hasClass`: **true**
- inner `<h2>Colours</h2>` computed style: `position: absolute`, width < 2px,
  clipped to zero — hidden from view, present for screen readers
- "..." reset-all menu: still rendered at full width, fully clickable

## Anti-vacuity

The panel was collapsed by default (`initialOpen={false}`, unchanged) and explicitly
expanded before measurement.
