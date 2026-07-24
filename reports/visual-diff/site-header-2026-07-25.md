---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/site-header layout-preset depth (FR-37-28 row re-align)"
block: sgs/site-header
date: 2026-07-25
wave: "Spec 37 — FR-37-28 depth: presets re-align the middle row (editor-only)"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/site-header — layout-preset depth: middle-row re-alignment (editor-only change)

**Verdict: PASS.** This change is **editor-logic only** — `render.php` and the frontend
`style.css` are UNCHANGED, so an existing header's published first paint is unaffected
(`first_paint_capture_passed: true`). The change extends the existing FR-37-28 preset so that,
in addition to writing the container's `contentWidth` + `spacing.padding`, it also writes the
**middle row's** existing `justifyContent` attribute — the alignment half a preset previously
couldn't reach.

## What changed (editor code only)
- `src/blocks/site-header/edit.js` —
  - `applyLayoutPreset()` now also calls `updateBlockAttributes(middleRowClientId, { justifyContent })`
    from `PRESET_JUSTIFY` (Centred → `center`, Split/Minimal → `space-between`). No-op if the header
    has no middle row.
  - `getActiveLayoutPreset()` now also requires the middle row's `justifyContent` to match, so the
    active indicator stays honest against manual row edits.
  - The `Edit` component gains `clientId`, a `useSelect` lookup for the `rowSlot:'middle'` row, and
    `useDispatch(blockEditorStore).updateBlockAttributes`.
  - Help text updated to mention alignment.

## Why this is still not a frontend change
- **No new attribute** — `justifyContent` already exists on `sgs/site-header-row` (driven by its own
  "Distribution" control) and renders via the shared `SGS_Container_Wrapper`. The preset writes an
  existing attr; the converter round-trips it unchanged.
- **No edit to** `site-header/render.php`, `site-header/style.css`, `site-header-row/render.php`, or
  `site-header-row/style.css`. The alignment only changes when an operator *clicks a preset*, and then
  only via an attribute the row already rendered.
- **Fresh-insert behaviour preserved**: the header TEMPLATE seeds the middle row with
  `justifyContent:'space-between'`, so a new header still reads back as "Split" — verified unchanged.

## Live verification (FR-37-28 depth "Done when")
Performed post-deploy on the sandybrown canary (chrome-devtools): inserting a raw `sgs/site-header`,
selecting it, Styles → Layout preset → **Centred**, then confirming the middle `sgs/site-header-row`'s
Distribution reads **Centre** (`justifyContent:'center'`) and the logo/nav cluster centres — and
switching to **Split** returns it to Spread-apart (`space-between`).
