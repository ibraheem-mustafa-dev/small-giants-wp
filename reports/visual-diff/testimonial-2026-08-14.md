---
block: sgs/testimonial
date: 2026-08-14
verdict: PASS
editor_capture_passed: true
editor_capture_run: true
capture_method: Playwright against the live sandybrown canary (wp.data selectBlock + direct DOM computed-style read), post-deploy
deployed_build: deploy 2026-08-14 (--payload plugins/sgs-blocks/src/blocks/testimonial/)
change: D4 — hide ToolsPanel's own duplicate <h2> title when nested in a PanelBody (Typography AND Hover states panels — 2 instances, both under InspectorControls group="styles")
source_sha: 47564d6ceaf1da98
---

## What this report verifies

`edit.js` gained `className="sgs-nested-tools-panel"` on BOTH ToolsPanels this block
declares inside a PanelBody — "Typography" and "Hover states", both under
`InspectorControls group="styles"` (the WordPress "Styles" tab, not "Block"/
"Settings"); `editor.css` gained one matching hide rule shared by both. Neither file
is a frontend surface (`check-editor-canvas-css.py testimonial` confirms).

## Live measurement

Inserted `sgs/testimonial` (variant `classic-card`) on a throwaway page (2434,
force-deleted after use), selected the block, switched the sidebar to the **Styles**
tab (icon-only, found via `aria-label`), and read the real computed styles of both
panels' inner ToolsPanel headers:

- **Typography**: `hasClass: true`; inner `<h2>` `position: absolute`, width < 2px,
  clipped to zero; "..." reset-all menu still full-width and clickable
- **Hover states**: `hasClass: true`; inner `<h2>` `position: absolute`, width < 2px,
  clipped to zero; "..." reset-all menu still full-width and clickable

## Anti-vacuity

Both panels were collapsed by default (`initialOpen={false}`, unchanged) and were
explicitly expanded before measurement, one at a time, confirming each is real
content rather than a shared/duplicated DOM read.
