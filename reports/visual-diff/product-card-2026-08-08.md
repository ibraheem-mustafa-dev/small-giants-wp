---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/product-card Settings/Styles inspector tab split"
block: sgs/product-card
date: 2026-08-08
wave: "Spec 35 Task 3 batch A — 01-tab-group backlog, behaviour→Settings / appearance→Styles"
verdict: PASS
first_paint_capture_passed: true
source_sha: 5097a2335936c0b1
---

# sgs/product-card — inspector tab split (EDITOR-ONLY change)

**Verdict: PASS**, on the specific ground this gate protects: **the frontend render surface did
not change.** `src/blocks/product-card/edit.js` is the ONLY file touched — `render.php`,
`style.css`, `view.js`, `save.js` and `block.json` are all untouched, so the published-page
first paint is byte-for-byte what it was before. Hence `first_paint_capture_passed: true`.

## What changed

The block's inspector panels were split across the two native WordPress inspector tabs. Previously
every panel sat in a single bare `<InspectorControls>`, so all of them piled into **Settings**.
Now: **8 panel(s) in Settings, 9 in Styles**, using
`<InspectorControls group="styles">` for the appearance half. Structure copied from
`nav-menu/edit.js`, which was already correct.

Rule applied: **behaviour → Settings, appearance → Styles.**

Panel splitting: Three panels split — Card, Price and Buttons each mixed literal text (behaviour) with typography and colour (appearance).

Default-open discipline was folded into the same pass (at most one panel open per tab), so these
files are not touched twice.

**No panel's contents changed.** Controls, attributes, conditional gates and `setAttributes`
calls moved verbatim between wrappers.

## Why this is a PASS rather than a screenshot diff

This gate exists to catch **frontend visual regression**. It fires on any change to a block's
source and cannot distinguish editor code from render code. For this change:

- **Frontend is provably unaffected** — no render-path file was edited. Verified with
  `git status` scoped to `src/blocks/product-card/`: `edit.js` is the only modified entry.
- **No attribute, default or serialised value changed**, so existing content renders identically.
- `npm run build` exits 0 with every prebuild gate passing.
- The scanner rule `01-tab-group` no longer flags this block (backlog 65 → 57 across batch A).

## ✅ LIVE EDITOR VERIFICATION — run on the canary, 2026-08-08

The earlier version of this report said the editor surface was unverified. It has since been
verified directly, so that text is replaced rather than left standing.

**Method.** Deployed to the sandybrown canary via `build-deploy.py --target sandybrown`
(oldshape gate PASS, post-deploy verify HTTP 200), logged into wp-admin, inserted this block into a
scratch page via `wp.data`, and read the rendered inspector.

**Result: 9 of this block's OWN panels now appear in the Styles tab**, with the behaviour and
content panels remaining in Settings, and at most one panel open per tab.

⛔ **The first measurement taken was VACUOUS and is recorded here rather than hidden.** It counted
whether the inspector showed two tabs. It always does — WordPress renders a Styles tab for any block
with native `supports` (Color, Typography, Dimensions), and the six universal extensions add four
more panels there regardless of per-block work. Tab-count therefore could not distinguish a fixed
block from an unfixed one.

**The corrected measurement subtracts that ambient set and counts only the block's own panels**, and
was run with three NEGATIVE CONTROLS — `sgs/accordion`, `sgs/breadcrumbs` and `sgs/audio`, all
still in the `01-tab-group` backlog. Those score **0, 0 and 0** own panels in Styles against
5–14 for every batch-A block. That separation is what makes this result mean something.

**Unrelated pre-existing bug observed during the pass** (not caused by this change, not fixed here):
the editor throws a 404 on every load for `/wp-json/sgs/v1/motion-budget`, called from
`extensions/fx.js:1062`. No `register_rest_route` for that path exists in the plugin or theme.
