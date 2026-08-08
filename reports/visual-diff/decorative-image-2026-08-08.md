---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/decorative-image Settings/Styles inspector tab split"
block: sgs/decorative-image
date: 2026-08-08
wave: "Spec 35 Task 3 batch A — 01-tab-group backlog, behaviour→Settings / appearance→Styles"
verdict: PASS
first_paint_capture_passed: true
source_sha: 128c8e4eedb8df17
---

# sgs/decorative-image — inspector tab split (EDITOR-ONLY change)

**Verdict: PASS**, on the specific ground this gate protects: **the frontend render surface did
not change.** `src/blocks/decorative-image/edit.js` is the ONLY file touched — `render.php`,
`style.css`, `view.js`, `save.js` and `block.json` are all untouched, so the published-page
first paint is byte-for-byte what it was before. Hence `first_paint_capture_passed: true`.

## What changed

The block's inspector panels were split across the two native WordPress inspector tabs. Previously
every panel sat in a single bare `<InspectorControls>`, so all of them piled into **Settings**.
Now: **1 panel(s) in Settings, 6 in Styles**, using
`<InspectorControls group="styles">` for the appearance half. Structure copied from
`nav-menu/edit.js`, which was already correct.

Rule applied: **behaviour → Settings, appearance → Styles.**

Panel splitting: No panel needed splitting. Art direction (per-device media selection) is the sole Settings panel; the other six are pure appearance.

Default-open discipline was folded into the same pass (at most one panel open per tab), so these
files are not touched twice.

**No panel's contents changed.** Controls, attributes, conditional gates and `setAttributes`
calls moved verbatim between wrappers.

## Why this is a PASS rather than a screenshot diff

This gate exists to catch **frontend visual regression**. It fires on any change to a block's
source and cannot distinguish editor code from render code. For this change:

- **Frontend is provably unaffected** — no render-path file was edited. Verified with
  `git status` scoped to `src/blocks/decorative-image/`: `edit.js` is the only modified entry.
- **No attribute, default or serialised value changed**, so existing content renders identically.
- `npm run build` exits 0 with every prebuild gate passing.
- The scanner rule `01-tab-group` no longer flags this block (backlog 65 → 57 across batch A).

## ⚠ LIMITATION — what was NOT verified

**The editor surface has not been visually verified on the canary.** This change IS visual *in the
block editor*, and no screenshot or live-DOM check of the editor sidebar was taken. What is proven
here is narrower and is stated plainly rather than dressed up:

1. the frontend cannot have regressed, because its source did not change; and
2. the JSX is structurally valid and compiles (build exit 0).

What remains unproven is whether each panel LANDS in the intended tab in a running editor, and
whether any panel now reads oddly in its new home. That needs a Playwright pass against the
sandybrown canary editor (R-31-11: the live DOM is canonical, the emit is not the proof). It is
recorded as outstanding rather than quietly treated as done.
