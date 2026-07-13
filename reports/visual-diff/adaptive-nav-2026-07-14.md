---
block: sgs/adaptive-nav
date: 2026-07-14
decision: D327
verdict: PASS
first_paint_capture_passed: true
site: sandybrown canary (Mama's Munches homepage header nav)
change: "nav-list gap → FR-S9-6 {desktop,tablet,mobile} object model, emitted via the shared sgs_emit_responsive_css() on the block's own <ul>"
---

# Visual-diff / live-verify — sgs/adaptive-nav (D327, FR-S9-6)

## What changed
The gap between nav links (`gap`) → object model `{desktop:"28px"}`. adaptive-nav's gap
applies to its OWN `.sgs-adaptive-nav__list` `<ul>` (a block-owned element, NOT a wrapper
capability), so `render.php` emits it via the shared universal `sgs_emit_responsive_css()`
directly on the `<ul>` (`@media` tiers — matching the nav's existing viewport behaviour) —
it does NOT flip the wrapper's `responsive_model=object` (the wrapper doesn't own the
`<ul>` gap). This is legitimate under the D294 clarification (block-owned element via the
SHARED emitter, not a divergent per-block hack). `edit.js` gap → `ResponsiveOverride`.
The emitter's `normalise_object` lifts a legacy flat scalar to `{desktop}`, so an
un-migrated instance's flat gap keeps rendering.

## Live verification (sandybrown homepage header nav; caches cleared OPcache+LiteSpeed+CDN)

| Check | 1440px | 375px |
|-------|--------|-------|
| Nav `<ul>` `display` | `flex` ✅ | `flex` ✅ |
| Nav `<ul>` `gap` | `28px` ✅ | `28px` ✅ (desktop-only default → inherits) |
| Nav items resolved | 5 ✅ | (bar collapses to drawer below tier) |
| Reflow (`scrollWidth <= innerWidth`) | no overflow ✅ | no overflow ✅ |
| Console errors | none ✅ | none ✅ |
| Regression (D326 nav behaviour) | intact — WC injection still gone, collapse tier correct ✅ | |

## Verdict: PASS — nav-list gap on the FR-S9-6 engine via the shared emitter, live-verified, no regression to the D326 nav.
