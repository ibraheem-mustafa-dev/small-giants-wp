---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/cta-section gridItemPadding/gridItemBorderRadius box-object (A1)"
block: sgs/cta-section
date: 2026-07-26
wave: "Spec 32 box-flat migration — A1 shared 'Grid item defaults' panel (container/cta-section/hero/trust-bar)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/cta-section — gridItemPadding / gridItemBorderRadius box-object (deployed + live-verified)

**Verdict: PASS.** `sgs/cta-section` imports the SAME shared `GridItemDefaultsPanel` component as
`sgs/container` (`components/ContainerWrapperControls.js`), and its whole root markup is emitted by the
same `SGS_Container_Wrapper::render()` helper (composite-mirror rule, D152) — so this is a genuine
independent-consumer check of the shared component, not a re-test of container's own code path.

## What changed
Same box-object migration as `sgs/container` (see that report for the shared mechanism detail):
`gridItemPadding`/`gridItemBorderRadius` → `{top,right,bottom,left}` / `{topLeft,topRight,bottomLeft,bottomRight}`
objects, serialised by the shared `helpers-container.php`/`helpers-box.php` helpers, emitted as
`--sgs-gi-padding`/`--sgs-gi-radius` on the GRID PARENT only when non-empty.

## Evidence (live, sandybrown, editor + frontend)

### 1. Editor panel exists on cta-section's own inspector
`cta-section/edit.js` imports and renders `<GridItemDefaultsPanel attributes={attributes} setAttributes={setAttributes} />`
(confirmed by source read this session) — same component, same box-control UI as documented in the
`sgs/container` report.

### 2. Consumption as a GRID CHILD — asymmetric painting
Test setup: a parent `sgs/container` (`layout: 'grid'`) with FOUR sibling children: `sgs/container`,
**`sgs/cta-section`**, `sgs/hero`, `sgs/trust-bar`. The parent's `gridItemPadding`/`gridItemBorderRadius`
were set asymmetrically:
```
gridItemPadding: { top: "40px" }
gridItemBorderRadius: { topLeft: "20px" }
```
`getComputedStyle` on the live frontend, keyed by the rendered `sgs/cta-section` root element
(class `sgs-container sgs-cta-section ...`):
```
paddingTop: 40px | paddingRight: 0px | paddingBottom: 0px | paddingLeft: 0px
borderTopLeftRadius: 20px | borderTopRightRadius: 0px | borderBottomLeftRadius: 0px | borderBottomRightRadius: 0px
```
This is IDENTICAL to the values measured on the sibling plain `sgs/container` child in the same grid —
proving `sgs/cta-section`'s root correctly inherits the shared `--sgs-gi-*` custom properties via its
`.sgs-container` class (composite-mirror rule) with no divergent CSS.

### 3. Neutrality
Parent's `gridItemPadding`/`gridItemBorderRadius` cleared to `{}`, re-measured on cta-section's root:
```
paddingTop: 0px | paddingLeft: 0px | borderTopLeftRadius: 0px
```
— genuinely absent (no `--sgs-gi-*` declared on the parent at all), matching pre-migration behaviour.

### 4. First paint
`frontend-asymmetric-firstpaint.png` (this session) shows the cta-section (pink block, centre) with a
visible rounded top-left corner and extra top space above its heading, matching the computed values.

### Console
No frontend console errors on the test page.

## Not captured / limitations
- cta-section's OWN InnerBlocks (heading/text/multi-button) do not carry the `.sgs-container` class, so
  they are not (and are not expected to be) grid-item consumers of cta-section's own `gridItemPadding` —
  that panel governs cta-section's role as a POTENTIAL grid PARENT (of nested container-family children),
  not its content column. This test exercised cta-section purely as a grid CHILD (the composite-mirror
  consumption path), which is the path this migration touches; cta-section-as-grid-PARENT was not
  separately exercised (no test instance nested a real `sgs/container` inside cta-section) as cta-section's
  `allowedBlocks` for its content column do not include `sgs/container`. This is documented, not assumed.
- Same DPR-1.1 proportional rendering artefact noted in the `sgs/container` report applies here too; not a
  migration regression.
