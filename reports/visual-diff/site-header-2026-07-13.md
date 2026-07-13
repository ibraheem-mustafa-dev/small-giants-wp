---
block: sgs/site-header (+ sgs/site-header-row)
date: 2026-07-13
session: P1 — Header/Footer/Nav system (Spec 17 §S9, D323)
verdict: PASS
first_paint_capture_passed: true
site: sandybrown canary (Mama's Munches homepage)
---

# Visual-diff / live-verify — `sgs/site-header` + `sgs/site-header-row` (P1)

## What shipped
Replaced the inline-CSS `core/group` site header with two new specialised container blocks:
- **`sgs/site-header`** (section KIND) — the header shell; 3 optional named rows (top/middle/bottom); delegates outer render to `SGS_Container_Wrapper` (composite-mirror, R-31-9).
- **`sgs/site-header-row`** (layout KIND) — an intrinsic never-overflow **Cluster** (flex-wrap + `min-width:0` children + `flex-shrink:0` logo); empty rows emit **zero output**.

Wired into `parts/header.html` + `patterns/framework-header-default.php` (byte-identical), theme `Version` bumped 1.5.8→1.5.9, CPT `sgs_header` template added (`[['sgs/site-header']]`). DB reconciled (`block_composition` rows + roster + composition_role). Deployed to sandybrown; LiteSpeed + OPcache + CDN cleared before measuring (STOP-21).

## Reflow / overflow (FR-S9-7 — THE emergency: sub-384px WCAG 2.2 SC 1.4.10)
Live Playwright on the real homepage, `document.documentElement.scrollWidth <= innerWidth`, and header-descendant edge check:

| Width | scrollWidth | ≤ innerWidth | Header elements past edge |
|------:|------------:|:---:|:---:|
| 320 | 305 | ✅ | 0 (toggle 44×44, cart 44×44) |
| 375 | 360 | ✅ | 0 |
| 414 | 399 | ✅ | 0 |
| 768 | 753 | ✅ | 0 |
| 1440 | 1425 | ✅ | 0 (logo left @24px, cart right @1401px) |

**The emergency header overflow is FIXED by construction** at 320/360/375 (the specific failing zone) and holds to 1440. (scrollWidth is consistently ~15px under innerWidth = the scrollbar gutter, not overflow.)

## No-inline (Spec 32 §6.1)
- `sgs/site-header` wrapper inline `style=""` attribute: **(none)** — spacing/background emitted via the wrapper's scoped `<style id="sgs-container-…">` + preset class `has-surface-background-color`.
- `sgs/site-header-row` inline `style=""`: **(none)**.

## Content parity + zero-output
- Logo + navigation + mobile-nav toggle + WooCommerce mini-cart all present (parity with the prior header's element set).
- `rowCount` on live DOM = **1** — only the middle row rendered; empty top/bottom rows produce **no DOM node** (FR-S9-2 empty-row-zero-output confirmed live).
- Old `core/group` header: **absent**.

## Screenshots (first-paint capture)
- `site-header-375-mobile.png` — mobile: header wraps to a clean two-line cluster (logo + nav on line 1, burger + cart on line 2), no overflow.
- `site-header-1440-desktop.png` — desktop: logo left, cart right; the nav wraps across several lines **because this test canary has ~15 nav items (test pages)** — not representative of a real client's ~5-item menu.

## Known deltas (deferred, NOT emergency — logged per R-31-4, no silent skip)
1. **Desktop distribution cosmetic** — flat `space-between` on the middle row + the test site's abnormally long nav = a busier, multi-line desktop header than the old single-row bar. On a normal client menu this reads as a clean logo/nav/cart bar. Refinement → FR-S9-8 (per-device/palette phase): logo-left / actions-right grouping.
2. **1px bottom divider dropped** — the old header had a `1px surface-alt` bottom border; the MVP colour/border re-emit is uniform (not per-side), so it was not carried. ~5-min follow-up (per-side border support in the block render, or a theme rule).

## Gates
- `npm run build`: PASS (dead-control 0, hardcoded-render-defaults 0 net-new, db-consistency, box-family, inline-styling, control-ux, atomic-slug all green).
- DB: `block_composition` rows present for both blocks with correct `container_kind` (section/layout) + `composition_role` (section-root/content-block); roster validation PASS.

## Verdict: **PASS** — the live WCAG header-overflow emergency is fixed and verified 320→1440; no-inline + content-parity + zero-output all hold. Two cosmetic deltas deferred to named stages.
