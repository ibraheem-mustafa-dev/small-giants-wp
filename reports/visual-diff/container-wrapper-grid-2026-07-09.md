---
block: sgs-container-wrapper (shared grid engine)
date: 2026-07-09
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — SGS_Container_Wrapper grid/flex CSS inline→scoped (STOP-68 closed, D296)

**Verdict: PASS** · **first_paint_capture_passed: true**

## What changed
The shared `SGS_Container_Wrapper` grid engine emitted its base grid/flex REAL properties
(`display:grid`/`display:flex`, `grid-template-columns`, `grid-template-rows`, `grid-auto-rows`,
`align-items`, `justify-items`, `align-content`, `flex-wrap`, `flex-direction`, `justify-content`)
INLINE — on the section root (`$styles`) or `.sgs-container__inner` (`$inner_grid_decls`). These now
accumulate into `$base_grid_real_decls` and emit as ONE scoped rule on `$grid_sel`
(`.uid` outer, or `.uid>.sgs-container__inner` when grid-on-inner), appended BEFORE the existing
`@media` grid tiers so tiers still win on source order. `$needs_uid` extended with `$has_base_grid`
(so a base-only grid with no responsive tiers — e.g. the split-hero — still gets a uid). The
`--sgs-gi-*` grid-item CUSTOM PROPERTIES stay inline (allowed by the no-inline contract §A;
grid items inherit them). A latent bug fixed: base `grid-template-rows`/`grid-auto-rows` previously
always targeted the outer even when grid-on-inner (inert) — now follow `$grid_sel`. Non-grid blocks
byte-identical.

This is the universal grid-scoping pass that closes STOP-68 — grid CSS affects EVERY grid composite
(container grids, feature-grid, card-grid, split-hero), so it is fixed ONCE in the shared wrapper
rather than per block (Spec 31 §3.A treats `display`/`grid-template-*` specially).

## LANDED verification (live sandybrown page 8, anonymous Playwright, cache-bust, post deploy + OPcache + LiteSpeed purge)
Scanned all 95 SGS container/composite elements on the live homepage:
- **Zero inline grid/flex real-property declarations** framework-wide (`gridInlineViolationCount: 0`)
  — the only inline on grid roots now is `--sgs-*` custom-property values (allowed).
- **All grid layouts intact via the scoped rules:** hero split `display:grid` (360px col),
  `sgs-container--grid` (320px), `sgs-feature-grid` (`152px 152px`, 2-col), flex containers `display:flex`.
- No regression — every grid/flex container still computes its layout correctly.
- This also resolves the hero STOP-68 residual: hero's section root previously carried inline
  `display:grid`; it is now scoped, so hero is fully zero-inline (bar unmigrated child blocks).

## Gates
`php -l` clean · `phpcs --standard=WordPress` clean · wrapper-only PHP change (no rebuild) ·
non-grid blocks byte-identical · `--sgs-gi-*` vars preserved inline.
