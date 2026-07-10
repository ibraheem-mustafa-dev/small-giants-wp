---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/container residual native color/border/typography reconcile"
block: sgs/container
date: 2026-07-10
wave: "no-inline rollout — RECONCILE"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/container — residual native colour/border/typography reconcile (LANDED)

**Verdict: PASS.** container was box-migrated + LANDED (spacing D292 + max-width/band D294 + grid
D296) but still declared `color`, `__experimentalBorder`, and `typography` native supports ENABLED
without `__experimentalSkipSerialization`, so those properties auto-inlined if set via WP's native
Styles panel. Now skip-serialised + scoped — **without editing the shared `SGS_Container_Wrapper`**
(container's own render.php reads the 3 supports, emits scoped CSS, and passes the uid + `has-*`
classes through the wrapper's existing `extra_classes` seam). Full detail: consolidated
`reports/visual-diff/reconcile-native-supports-2026-07-10.md`.

## Evidence (harness + live curl, page 1356, colour+border+font SET)
- **Zero inline** (#1): harness scan — no inline `style="…color…|…font…"` on `.wp-block-sgs-container`.
- **Scoped, not vanished:** live page carries `background-color:#abcdef` + `font-size:21px` scoped to
  the container's `.uid.wp-block-sgs-container` selector.
- Spacing / max-width / contentWidth / band / grid scoping unchanged; shared wrapper file untouched.

## Gates
- `npm run build` prebuild (dead-controls, hardcoded-defaults 0 net-new) + webpack: PASS.
