---
block: sgs/site-header-row
date: 2026-07-14
task: FR-S9-6 Task 2 — box/width props → {desktop,tablet,mobile} object model
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — site-header-row box/width → object model (D328 Task 2)

## What changed
- block.json: removed `supports.spacing` (one-system, R1); removed 16 flat `padding*/margin*Tablet/Mobile` + `maxWidthTablet/Mobile` + `contentWidthTablet/Mobile` orphans (were DEAD — the wrapper reads object keys, not these); added object `padding`/`margin` (default `{}`) + `maxWidth` (object `{}`) + `contentWidth` (object `{desktop:"full"}`).
- edit.js: `ResponsiveSpacingPanel` → shared `ResponsiveBoxControls` (ResponsiveOverride device switcher + BoxControl padding/margin + UnitControl max-width + SelectControl content-width). gap control unchanged.
- No render.php change (delegates to `SGS_Container_Wrapper` with `responsive_model=object`; wrapper already box/width-object-aware).

## qc-council: 2 cross-model raters, VALIDATED. Rater A cleared the wrapper transforms (no regression to 50+ flag-off blocks); rater B caught R1 (must drop supports.spacing) + R2 (footer-only).

## Live verification (sandybrown, full cache clear OPcache+LiteSpeed+CDN, 2026-07-14)
- 1440: header middle-row gap 16px; no overflow; WC blocks still gone (nav via adaptive-nav).
- 375: gap 16px; no overflow (scrollWidth 360 ≤ 375).
- 0 console errors.
- Header rows carry no explicit padding/margin/maxWidth today → object defaults `{}` emit nothing (full-width, no cap) — correct, matches prior. The new per-device controls are available for operators.

## Verdict: PASS — box/width props on the FR-S9-6 object model; no regression; no dead controls (guard 0).
