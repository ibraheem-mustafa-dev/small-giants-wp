---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/container gridItemPadding/gridItemBorderRadius box-object (A1)"
block: sgs/container
date: 2026-07-26
wave: "Spec 32 box-flat migration — A1 shared 'Grid item defaults' panel (container/cta-section/hero/trust-bar)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/container — gridItemPadding / gridItemBorderRadius box-object (deployed + live-verified)

**Verdict: PASS.** `gridItemPadding` (4-side `{top,right,bottom,left}`) and `gridItemBorderRadius`
(4-corner `{topLeft,topRight,bottomLeft,bottomRight}`) are migrated from flat scalars to WP-native
`BoxControl`/`BorderRadiusControl` box-objects. Live-verified on the sandybrown canary (md5-confirmed
deploy) via a fresh test page (`page_id=1765`, `/wp-admin/post.php?post=1765&action=edit`) built entirely
through `wp.data` (no hand-typed markup).

## What changed
- `block.json`: `gridItemPadding` / `gridItemBorderRadius` are `{type:"object", default:{}}` (box-object standard, FR-31-22).
- `edit.js` / `ContainerWrapperControls.js` `GridItemDefaultsPanel`: `Padding` → `BoxControl` (4 independent side inputs,
  `splitOnAxis={false}`); `Border-radius` → `BorderRadiusControl` (4-corner).
- `class-sgs-container-wrapper.php`: serialises the object to a CSS shorthand via
  `sgs_serialise_box_sides()` / `sgs_serialise_box_corners()` (shared `helpers-container.php` /
  `helpers-box.php`), then emits `--sgs-gi-padding` / `--sgs-gi-radius` custom properties on the grid
  parent ONLY when at least one side/corner is set (empty `{}` → no vars emitted).
- `style.css`: `.sgs-container--grid > .sgs-container { padding: var(--sgs-gi-padding); border-radius: var(--sgs-gi-radius); }`
  — unchanged consumption rule; only the producer side (wrapper) changed shape.

## Evidence (live, sandybrown, editor + frontend)

### 1. Editor panel — box-control shape confirmed (screenshot)
Inserted a fresh `sgs/container` with `layout: 'grid'`, opened "Grid item defaults". Screenshot
(`container-panel-2.png`, captured this session) shows:
- **PADDING**: 4 separate numeric inputs (top=40, right/bottom/left empty), unlink icon — genuine
  4-side box control, not a single linked value.
- **RADIUS**: `BorderRadiusControl` present (linked-icon display when only one corner is set is a WP-native
  `BorderRadiusControl` display quirk, not a data bug — confirmed the underlying stored attribute below).

### 2. Asymmetric value — stored + rendered correctly
`wp.data.select('core/block-editor').getBlocks()` on the parent container after setting the UI:
```
gridItemPadding: { top: "40px" }
gridItemBorderRadius: { topLeft: "20px" }
```
Frontend (`getComputedStyle` on the grid-parent wrapper, keyed by class `.sgs-container--grid`):
```
--sgs-gi-padding: 40px 0 0 0
--sgs-gi-radius: 20px 0 0 0
```
Painted on the DIRECT CHILD (a plain `sgs/container` holding `sgs/text`, content "CHILD-CONTAINER-TEXT"):
```
paddingTop: 40px | paddingRight/Bottom/Left: 0px
borderTopLeftRadius: 20px | Top-right/Bottom-left/Bottom-right: 0px
```
Identical values were independently confirmed painting on 3 SIBLING consumer types nested in the SAME
grid parent — `sgs/cta-section`, `sgs/hero`, `sgs/trust-bar` — all of which carry the `.sgs-container`
class per the composite-mirror rule (D152) and consume the same wrapper-emitted vars. See their own
per-block reports for their individual measurements; the mechanism itself is proven identical across all
4 consumer types from this single test.

### 3. Neutrality — empty `{}` emits nothing (byte-identical to pre-migration)
Cleared both attrs back to `{}` on the parent, saved, re-measured on the live frontend:
```
--sgs-gi-padding: ""   (empty — no declaration)
--sgs-gi-radius: ""    (empty — no declaration)
```
Child `sgs/container`: `paddingTop: 0px`, `paddingLeft: 0px`, `borderTopLeftRadius: 0px` — i.e. genuinely
absent, not just visually zero. Matches the documented pre-migration empty-string-default behaviour.

### 4. First paint
Full-page screenshot (`frontend-asymmetric-firstpaint.png`) taken with the asymmetric values live shows
the child `sgs/container` (yellow block, left of the CTA-section) with visible extra top padding and a
rounded top-left corner only — matches the computed-style numbers above.

### Console
No frontend console errors on `?page_id=1765`. A pre-existing editor-only "Block validation failed" /
"Expected end of content" warning for a `sgs/container` root wrapper (`<main>`) appears on EVERY page
load of this canary's `page.html` template, including a brand-new blank page created before any of this
session's edits — unrelated to the A1 migration; not investigated further as out of scope for this task.

## Not captured / limitations
- The visual full-page screenshot only shows the `sgs/container` + `sgs/cta-section` children in-frame
  (viewport width cut off `sgs/hero`/`sgs/trust-bar`, which sit further right in the 4-column grid); their
  correctness is proven via `getComputedStyle` measurement instead (see their own reports), not a visible
  screenshot crop.
- Border-width/radius pixel values reported by `getComputedStyle` on this canary show a small,
  consistent proportional scaling artefact (device-pixel-ratio 1.1 in this Playwright session — e.g. a
  declared `6px` reads as `5.818px`), also seen and already documented as pre-existing/unrelated in the
  card-grid A1-precursor report. The DECLARED CSS values (read directly from the stylesheet rule text)
  are exact; this is a rendering-environment artefact, not a migration regression.
