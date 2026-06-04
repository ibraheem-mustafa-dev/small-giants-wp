# Visual-diff — sgs/cta-section WS-4 composite-mirror (PoC) — 2026-06-04

verdict: PASS
first_paint_capture_passed: true

**Change:** WS-4 — cta-section's outer `<section>` is now the shared sgs/container element (via `SGS_Container_Wrapper::render(kind='section')`); 69 container attrs mirrored into block.json; `ContainerWrapperControls kind="section"` wired into edit.js. **Rename:** cta's own `layout` (centred/left/split) → `contentLayout` (the container owns `layout`=grid/flex); render.php + edit.js read `contentLayout ?? layout` for old-post fallback (dynamic block — no save-markup deprecation needed per council C4). **Double-emit guard (C3):** cta keeps its bespoke cover-image background (via `extra_styles`) + opacity overlay (in the interior) + `no_overlay` + nulled helper `backgroundImage` — so neither is double-emitted.

**Validation:** clean test page 599 (`/ws4-cta-section-poc/`) — a real `sgs/cta-section` with a cover-image bg + ribbon + InnerBlocks heading. curl markup + Playwright @1100.

## Result — PASS (live-DOM, R-22-11)
- 0 PHP errors/warnings/notices.
- Wrapper `<section>`: carries `sgs-container` (mirror) + `sgs-cta-section sgs-cta-section--centred wp-block-sgs-cta-section`; transition/hover CSS vars + the cover-image bg preserved via `extra_styles`.
- **Double-emit guard works:** `background-image` count = 1, `sgs-cta-section__overlay` count = 1 (no doubles).
- `__content` (1) + ribbon (1) + heading render through InnerBlocks; content centred (contentLayout); ribbon top-right.
- Container render remains byte-identical (extra_attrs/this path unaffected on the container itself).

PoC proves the **hardest section pattern**: attr-rename (collision resolution) + double-emit removal, with the composite's bespoke background/overlay kept faithful while the element becomes a full sgs/container.
