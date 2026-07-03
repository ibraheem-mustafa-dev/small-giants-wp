# Visual diff — sgs/feature-grid: render real grids through the shared container grid engine (2026-07-04)

verdict: PASS
first_paint_capture_passed: true

## What
feature-grid rendered 3-across on desktop when the draft declared 4 columns. Root cause
(proven on the live node, STOP-43): the block's own render.php printed a higher-specificity
auto-flex `grid-template-columns` `<style>` (`repeat(auto-fill, minmax(240px,1fr))`) that
overrode the shared `SGS_Container_Wrapper`'s already-correct `repeat(4,1fr)` rule. The
wrapper IS the grid engine; every other grid block already renders through it — feature-grid
was the sole divergence (composite-mirror violation).

1. **render.php** — when an explicit `gridTemplateColumns` is present, delegate entirely to
   the shared wrapper (force `layout=grid`, emit NO competing `<style>`, use `--grid` class).
   auto-flex kept as the opt-in intrinsic mode (only when no explicit template); fixed-by-count
   branch unchanged. Default `layoutMode` flipped `auto-flex` → `fixed-columns` (grid is the
   default, auto-flex opt-in). v0.2.0 → 0.3.0.
2. **class-sgs-container-wrapper.php** — suppress the tablet/mobile `sgs-cols-{tier}-N !important`
   shorthand when a base `gridTemplateColumns` governs (a default `columnsTablet=2` was crushing
   the faithful base 4-col template at tablet). Extends the existing desktop guard to all tiers
   (D228 family). No converter change (the grid was already transferred correctly).

## LANDED on sandybrown page 8 (the homepage) — anonymous computed-style + visual
- **Feature-grid (ingredient grid) renders 4 / 4 / 2** at desktop(1440) / tablet(768) / mobile:
  - 1440: `gridTemplateColumns: 222px 222px 222px 222px`, 4 distinct columns, 4 info-boxes, `--grid` class, auto-flex override GONE, `sgs-cols-tablet-2` GONE.
  - 768: `160.25px × 4` — 4 columns (base template now governs tablet).
  - mobile: `1fr 1fr` → 2×2 grid; no horizontal overflow (`docScrollWidth == viewport`).
  - Visual screenshot confirms one row: Oats · Brewer's Yeast · Flaxseed · Fenugreek. Bean eye-confirmed (R-31-13).
- **Regression scan — all 6 grids on the page at desktop AND tablet, no regression:**
  hero 2/2, trust-bar 4/4, three sgs/container splits 2/2 each, feature-grid 4/4. Every block
  renders its expected column count via its own explicit template.
- Independent adversarial code review of the render + wrapper diff: no blocking correctness/regression bug;
  all 6 render cases traced; the one authored edge case (base template + per-tier COUNT, no tier template)
  is unreachable by either converter engine and by every shipped pattern (tracked follow-up).

npm build clean (dead-control guard green), 374 tests + cheat-gate (0 NEW) green, convert.py byte-identical.
