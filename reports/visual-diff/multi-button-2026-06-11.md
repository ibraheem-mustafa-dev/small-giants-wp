# Visual-diff — sgs/multi-button Step 7b control-UX sweep — 2026-06-11

verdict: PASS
first_paint_capture_passed: true

**Change:** editor-controls-only (edit.js): responsive attr families moved onto the `ResponsiveControl` device-icon switcher; `*Unit` SelectControls replaced by integrated `UnitControl`/`TypographyControls` compositions. NO attr schema, render.php, or frontend output change — frontend paint is byte-identical by construction.

**Validation (live canary editor, page 8, 2026-06-11):** block registers (wp.blocks.getBlockType non-null); page-8 editor shows 0 core/missing + 0 invalid blocks across 105 blocks after deploy; check-control-ux guard green with an EMPTY baseline (zero tolerance); build green ×3 guards. Spot-checked sgs/text: Font size renders as device-switcher + integrated unit, no separate Unit dropdown.

## Result — PASS (R-22-11)
