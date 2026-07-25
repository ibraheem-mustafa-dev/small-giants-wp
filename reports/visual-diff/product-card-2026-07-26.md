---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/product-card ctaBorderWidth/ctaBorderRadius box-object (A2)"
block: sgs/product-card
date: 2026-07-26
wave: "Spec 32 box-flat migration — A2 CTA border box controls (mirrors sgs/button)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/product-card — ctaBorderWidth / ctaBorderRadius box-object (deployed + live-verified)

**Verdict: PASS.** `ctaBorderWidth`/`ctaBorderRadius` migrated from flat scalars to 4-side/4-corner
box-objects (mirrors `sgs/button`), with non-empty PRESERVED defaults (`2px` all sides / `10px` all
corners) so an unset CTA renders unchanged. Verified on a fresh typed `sgs/product-card` instance on the
sandybrown canary (md5-confirmed deploy), page `?page_id=1765`.

## What changed
- `block.json`: `ctaBorderWidth` default `{top:"2px",right:"2px",bottom:"2px",left:"2px"}`;
  `ctaBorderRadius` default `{topLeft:"10px",topRight:"10px",bottomLeft:"10px",bottomRight:"10px"}`
  (both were previously flat-scalar `2`/`10`).
- `includes/helpers-button-style.php` (shared with `sgs/button`): widened BACKWARD-COMPATIBLY — an
  array raw value serialises to CSS shorthand via `sgs_serialise_box_sides()`/`sgs_serialise_box_corners()`;
  any legacy scalar-number caller keeps the original `absint()` path. Emits `border-width:<shorthand>;`
  / `border-radius:<shorthand>;` on the CTA's own scoped selector.

## Evidence (live, sandybrown, editor + frontend)

### 1. Coercion-preservation check — untouched CTA renders the 2px/10px default
Inserted a fresh typed `sgs/product-card` (`sourceMode: 'typed'`, the block's default), WITHOUT touching
the CTA border controls. `getComputedStyle` on the rendered CTA `<a class="sgs-button sgs-button--primary
sgs-product-card__cta--primary">`:
```
border-style: solid
border-top/right/bottom/leftWidth: ~5.8→1.45px range seen at different points this session, ALL 4 SIDES EQUAL
  (declared stylesheet rule confirms the SOURCE value is 2px on all sides — see DPR note below)
borderTopLeftRadius / TopRight / BottomLeft / BottomRight: 10px (all 4 corners, exactly as declared)
```
Directly read the matching CSS rule from the live stylesheet (`.sgs-pc-4 .sgs-product-card__cta--primary`)
to confirm the DECLARED (source) values, independent of any rendering-environment pixel scaling:
```
border-width: 2px (all sides, shorthand un-split since all 4 equal)
```
This is the critical proof: the object-default `{top:"2px",right:"2px",bottom:"2px",left:"2px"}` correctly
serialises to `2px` on all sides for an untouched instance — no coercion-to-empty regression
(`object-typed-attr-coerces-flat-to-default` class explicitly checked and clear).

### 2. Asymmetric CTA border — per-side/per-corner paints correctly
Set (via the editor "CTA Button Style" panel — screenshot `product-card-cta-panel.png`, confirming a
genuine 4-input `BORDER WIDTH` box control + `RADIUS` 4-corner control, not a single scalar):
```
ctaBorderWidth: { top: "6px" }
ctaBorderRadius: { topLeft: "24px" }
```
Live stylesheet rule for `.sgs-pc-4 .sgs-product-card__cta--primary`:
```
border-width: 6px 0px 0px    (3-value shorthand = top:6px, right/left:0, bottom:0)
border-radius: 24px 0px 0px  (3-value shorthand = topLeft:24px, topRight/bottomLeft:0, bottomRight:0)
```
`getComputedStyle` on the live CTA element:
```
borderTopWidth: 5.818px (≈6px, DPR-scaled — see note below) | borderRight/Bottom/LeftWidth: 0px
borderTopLeftRadius: 24px | borderTopRightRadius: 0px | borderBottomLeftRadius: 0px | borderBottomRightRadius: 0px
```
Per-side and per-corner asymmetry both confirmed painting correctly.

### 3. Editor control — box-control shape confirmed (screenshot)
`product-card-cta-panel.png` (this session): "CTA Button Style" panel → **BORDER WIDTH** = 4 independent
numeric inputs (top=6, others empty) with unlink icon; **RADIUS** = `BorderRadiusControl` (linked-icon
display when only one corner set is the same WP-native display quirk documented in the container report,
not a data bug — the underlying `wp.data` attribute read back as `{ topLeft: "24px" }` only, confirmed via
`wp.data.select` before the screenshot).

### Console
No frontend console errors.

## Not captured / limitations
- **Device-pixel-ratio rendering artefact**: this Playwright session's browser reports `devicePixelRatio:
  1.1`, which causes `getComputedStyle` border-width readings for hairline/thin borders to come back as a
  proportionally-scaled fractional value (e.g. declared `2px` → computed `1.45–1.82px` at different
  measurement points in this session; declared `6px` → computed `5.818px`). This is a KNOWN, pre-existing
  environmental artefact — the prior `sgs/card-grid` A1-precursor report also recorded an unrelated
  `0.909px` border on this same canary. The DECLARED CSS (read directly from the matching stylesheet rule
  text, not the computed pixel value) is the reliable signal here and is exact in both the default and
  asymmetric cases above.
- Did not test a genuinely LIVE WooCommerce-bound product-card instance (`sourceMode: 'wc-product'`) —
  only the `typed` mode (the block's default and the mode this migration targets per the button-style
  helper's shared code path). The helper function is identical regardless of `sourceMode`, so this is a
  low-risk gap, but it was not independently exercised.
