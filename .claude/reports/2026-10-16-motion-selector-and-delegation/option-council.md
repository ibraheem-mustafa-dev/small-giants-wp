---
doc_type: council-report
title: How a delegating card-grid should expose its card's controls (options B, C, V)
date: 2026-10-16
---

# How a delegating card-grid should expose its card's controls (options B, C, V)

Dated snapshot of a three-rater council (framework fit, editor feasibility, server render path; all read-only) on `sgs/card-grid` in `wc-product` and `cpt-collection` mode. Context and the proven causes are in `README.md` in this folder. The council reads code and the framework DB; nothing was built or run live, so every fix-shape below is a hypothesis until its experiment passes.

## Options

- B: the grid stores a nested `cardAttributes` object, its inspector shows the product card's own panels (extracted from `src/blocks/product-card/edit.js`), and render merges the object into every card.
- C: the grid contains one locked template `sgs/product-card` inner block (as core's Query Loop post-template does); every product renders with the template's attributes.
- V (Bean's variant): generate the grid's card controls from a recorded list of the card's panel names, labels and control types.

## Verdict

All three raters ranked C first, B second and V last (certainty high; no rater dissented on the ranking). Recommendation: C, with an "Edit card design" button in the grid's panel that selects the template card, so the card's controls are one click away.

## Evidence behind the ranking

- Framework DB: `sgs-update-v2.py::stage_1_sgs_codebase_scan` writes one `block_attributes` row per top-level attribute and never expands object properties, so B and V's `cardAttributes` would be one opaque row (the existing `separators` objects show it). C keeps the card as a real block with its own 518 rows and 27 `motion_targets`.
- Gates and tools: `scripts/lib/block-source-files.js::editFiles` does not follow imports outside the block folder, so B's imported card panels are invisible to the grid's `inspector-scan` and `check-dead-controls`. The clone pipeline (`computed-route/lib/tree.mjs::setAttr`) and calibration key on top-level DB rows; `scripts/wp-build-page.js` checks inner blocks fully but only checks that a nested object is an object. C needs no new teaching there.
- Motion: with C the template card's own `sgsMotion` covers all 27 card targets, so `motionDelegate` and `Sgs_Motion_Delegate` stop being needed for part motion (the grid-level stagger hand-over `hands_entrance` still needs a home). Widening `motionDelegate.parts` to the other 21 card parts is not a block.json-only change, because the grid's offered targets come from its own `supports.sgs.elements` (`extensions/motion/delegate-parts.js::elementsForSourceMode`).
- Editor: the card inspector JSX (`product-card/edit.js` lines 1604 to 3374) does not use `clientId`, so extracting it for B is mechanical (about 2,300 lines into 6 to 8 files) but large. `product-card/block.json` already reads `postId` from block context and binds to it when `productId` is 0, which is what C needs.
- V: panels are JSX, not data. A recorded list loses what each control writes, show/hide conditions, value transforms and contrast checks; the DB's control-type column is filled for 89 of 518 rows. V costs more than B and drifts.

## What C still has to solve (risks to close first)

1. Core renders inner blocks unless told otherwise: a template card would print itself once per grid. Core's post-template sets `skip_inner_blocks` through a `block_type_metadata_settings` filter and renders each post as `core/null`; SGS registers blocks with plain `register_block_type($block_json)`, so a filter is needed.
2. The `/block-renderer` endpoint builds a block with no inner blocks (comment in `product-card/render.php`), so the grid's editor preview cannot see the template's attributes; the editor needs a preview loop like core's `BlockContextProvider` plus `useBlockPreview`.
3. `card-grid/save.js` returns null and must become `InnerBlocks.Content`; `allowedBlocks` plus a lock so only one template card exists; core re-applies a locked template on every mount (the `site-header` seed-once guard is the precedent); switching to manual cards must remove or hide the template.
4. The template's `sourceMode` and `productId` must not override per-product values; `Product_Item_List::collect` would otherwise count a template with a product ID as an extra item.
5. The product card's "Connected product" panel is hidden when the card sits inside a grid; the grid's manual-card panels are hidden in products mode.
6. The card-part selector defect (README, Issue A) still applies to both options until the card's part names are fixed, and a template set to the typed card type would style names the grid's live cards do not print.

## Effort (smallest plausible)

C about 3 to 5 hours, B about 4 to 6 hours for the extraction alone (plus the seeder, gates, calibration and Solve changes for nested paths, which the raters did not estimate), V 8 or more.

## Experiment before committing

Build the smallest C slice: `save.js` to `InnerBlocks.Content`, one locked template card, the `skip_inner_blocks` filter, and merge the template's attributes in `render-delegated.php`. Pass when (a) the template prints once or not at all on the page, (b) every product card on draft 5291 (https://sandybrown-nightingale-600381.hostingersite.com/wp-admin/post.php?post=5291&action=edit) carries the template's button colours in both states, and (c) the editor shows the cards with the template's settings. If (c) cannot be done without a large preview rebuild, reconsider B.
