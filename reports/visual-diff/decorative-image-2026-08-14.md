---
block: sgs/decorative-image
date: 2026-08-14
verdict: PASS
editor_capture_passed: true
editor_capture_run: true
capture_method: Playwright against the live sandybrown canary (wp.data selectBlock + direct DOM computed-style read), post-deploy
deployed_build: deploy 2026-08-14 (--payload plugins/sgs-blocks/src/blocks/decorative-image/)
change: D4 — hide ToolsPanel's own duplicate <h2> title when nested in a PanelBody (Responsive Overrides panel, InspectorControls group="styles")
source_sha: d7a7fdcdfc0bc076
---

## What this report verifies

`edit.js` gained `className="sgs-nested-tools-panel"` on the ToolsPanel inside the
"Responsive Overrides" PanelBody, under `InspectorControls group="styles"` (the
WordPress "Styles" tab); `editor.css` gained the matching hide rule. Neither file is
a frontend surface (`check-editor-canvas-css.py decorative-image` confirms).

## Live measurement

Inserted `sgs/decorative-image` on a throwaway page (2434, force-deleted after use),
selected the block, switched the sidebar to the **Styles** tab (icon-only, found via
`aria-label`), expanded "Responsive Overrides", and read the real computed styles of
the inner ToolsPanel's own header:

- `hasClass`: **true**
- inner `<h2>Responsive Overrides</h2>` computed style: `position: absolute`,
  width < 2px, clipped to zero — hidden from view, present for screen readers
- "..." reset-all menu: still rendered at full width, fully clickable

Screenshot confirms "Responsive Overrides" renders as one clean title in the panel
list (alongside Size / Transform / Effects / SVG Path Draw), with no duplicate.

## Anti-vacuity

The panel was collapsed by default (`initialOpen={false}`, unchanged) and explicitly
expanded before measurement. No decorative media was set on the probe block — this
panel's own controls render regardless of whether media is selected, confirmed by
its presence in the panel list without needing a media value first.
