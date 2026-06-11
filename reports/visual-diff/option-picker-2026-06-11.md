# Visual diff — sgs/option-picker — 2026-06-11

verdict: PASS
first_paint_capture_passed: true

block: sgs/option-picker
change: C7 — group-label (legend) customisation: font-size + colour controls
canary: https://sandybrown-nightingale-600381.hostingersite.com
verified_by: live Playwright (editor preview, iframed canvas) + WP block-renderer REST (render.php output)
bean_eyeball: OWED (R-22-13 co-authoritative final sign-off)

## What changed (plain English)
The "Size"/"Flavour" group label above an option-picker's pills had no styling
controls — you could set its text but not its size or colour. Added two controls
in the Label panel (shown only when the label is visible): "Label font size"
(any CSS size, e.g. 18px / 1.2rem) and "Label colour" (theme token). Both apply
inline to the `<legend class="sgs-option-picker__label">`, so they override the
class-level default in style.css.

- block.json: new `labelFontSize` (string) + `labelColour` (string) attrs; version 0.1.6 → 0.1.7.
- edit.js: two controls in the Label panel (gated by showLabel) + the canvas
  preview legend now carries the inline style.
- render.php: emits `style="font-size:…;color:…"` on the visible legend, colour
  resolved via `sgs_colour_value()` (same path as the pill colours).
- style.css: unchanged — inline style beats the class-level `.sgs-option-picker__label`.

## dead-control check
`check-dead-controls.js` (prebuild guard) — 0 net-new dead controls across 71
blocks. Both new attrs are consumed in render.php AND the edit.js preview.

## editor verification (live, iframed canvas)
Inserted a fresh sgs/option-picker with label "Size", labelFontSize 26px,
labelColour primary:
- "Label font size" control present = true; "Label colour" control present = true.
- Preview legend inline style = `font-size: 26px; color: var(--wp--preset--color--primary);`
- Computed: font-size 26px; color rgb(230,138,149) (the primary token), not the default.
- Error-boundary count = 0; console errors = 0.

## frontend verification (render.php via block-renderer REST)
GET /wp/v2/block-renderer/sgs/option-picker with the same attrs returned:
`<legend id="sgs-op-1-legend" class="sgs-option-picker__label"
  style="font-size:26px;color:var(--wp--preset--color--primary)">Size</legend>`
- contains 26px: true; contains the primary preset var: true.
- first_paint_capture_passed: true (no animation/FOUC; static legend).

## verdict
PASS — the group-label size + colour controls render, apply in the editor, and
emit correctly from render.php on the frontend. Bean's editor eyeball (R-22-13)
is the remaining co-authoritative sign-off.
