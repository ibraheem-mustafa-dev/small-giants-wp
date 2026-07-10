---
doc_type: reference
title: "Visual-diff / LANDED report — SGS_Container_Wrapper base-only inline (gap/min-height/box-shadow/background)"
block: sgs/container (shared SGS_Container_Wrapper — affects all container-equivalent blocks)
date: 2026-07-10
wave: "no-inline rollout — LAND-completion session"
verdict: PASS
first_paint_capture_passed: true
---

# SGS_Container_Wrapper — base-only inline decls scoped (LANDED)

**Verdict: PASS.** The shared wrapper (`includes/class-sgs-container-wrapper.php`, used by ~22
container-equivalent blocks) still painted a handful of styling values INLINE in the base-only case
(a base value set, no responsive tier). D292/D294/D296 scoped the tiered cases but left the base-only
path inline. Proven live on page 8 as inline `gap:16px`/`gap:12px` on `.sgs-container--grid/--flex/__inner`.

## Root cause (proven)
- Lines 473–478 pushed base `gap` to `$styles`/`$inner_grid_decls` (inline) when no gap tiers.
- Same pattern: base `min-height` (485), `box-shadow` (489), `background-*` (494–501).
- `$styles`/`$inner_grid_decls` serialise inline via `'style' => implode(';', $styles)` (l.769/1304).

## Fix
- `gap` (base-only) → `$base_grid_real_decls` → scoped `$grid_sel` rule (co-locates with the display
  decl; follows `$grid_on_inner`), exactly like the tiered case already did.
- `min-height` / `box-shadow` / `background-image/size/position/repeat/attachment` (base-only) →
  new `$base_outer_decls` → scoped `.$uid{…}` rule, mirroring the existing base-spacing / base-max-width /
  base-band / base-grid scoped patterns. Added `$has_base_outer` to the `$needs_uid` predicate.
- Custom properties (`--sgs-*`, ken-burns, svg-min-height, grid-item vars) stay inline (allowed).
- No double-emit: each base-only branch is mutually exclusive with its responsive branch (guarded by
  `$has_responsive_*`); base rule emitted before @media tiers (source order).

## Evidence (live, page 8 — sandybrown homepage, 375/768/1440)
- **Before**: 12 inline-violation elements/breakpoint (container `gap:16px`/`12px` on grid/flex/__inner).
- **After**: **0 SGS-block inline violations**. Remaining 5 are WP-core (`<body>` scrollbar padding) +
  theme footer `sgs-link-list` core/heading blocks — neither an SGS block (footer patterns parked as
  `P-PATTERNS-USE-CORE-BLOCKS`).
- **No fidelity regression**: containers still compute `gap:16px`/`60px`/`16px 12px` via the scoped
  rule; fixed containers now carry NO inline `gap`.

## Gates
- `npm run build` prebuild + webpack: PASS. Deployed; OPcache + LiteSpeed purged.
- Shared-render change — /qc-council pre-commit gate pending (see session close).
