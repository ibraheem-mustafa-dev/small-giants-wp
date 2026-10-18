---
doc_type: investigation-report
title: Motion part selectors that match nothing, and delegating blocks that cannot reach their child's controls
date: 2026-10-16
spec: 38A-SGS-MOTION-MODEL (FR-38A-4, FR-38A-8, FR-38A-16)
---

# Motion part selectors that match nothing, and delegating blocks that cannot reach their child's controls

Dated snapshot of a read-only root-cause investigation (2026-10-16, canary `sandybrown` at the time, repo HEAD `3925d1c24` to `74f3b9665`). Nothing was fixed. Counts are as of that date; re-measure before quoting them. The three detailed reports sit beside this file: `selector-matrix-live.md` (live markup), `render-path-matrix-static.md` (source reading) and `delegation-survey.md` (child-block reach).

## What Bean reported

On draft 5291 (https://sandybrown-nightingale-600381.hostingersite.com/wp-admin/post.php?post=5291&action=edit), a products-mode `sgs/card-grid` with hover on the whole card, title, image (image zoom) and body (scale): the title and whole card work, the image and body hover do nothing. Separately, the card's button has no controls in the grid and is missing from the Effects targets.

## Issue A: a part's selector matches nothing on some render paths

### Root cause (proven)

`Sgs_Motion_Targets::resolve` turns a part into a selector: the part's declared `selector`, else `.sgs-<block slug>__<part>`. That is one name per part. Several blocks print different markup on different render paths, so the one name is right on one path and matches nothing on the others. `sgs/product-card` is the proven case: the typed path (`includes/product-card-builtin-render.php::sgs_product_card_builtin_render`) prints `sgs-product-card__image` and `__body`; the live product path (`src/blocks/product-card/render.php`, class `product-card--live`) prints `product-card__media`, `product-card-img` and `product-card-body`. A `wc-product` card-grid always renders the live path. On draft 5291 the delegated rules were scoped to `.sgs-product-card__image` and `.sgs-product-card__body`, which the live card does not print, while `.sgs-product-card__title` exists and works.

### Why the gate stayed green (two holes in `scripts/check-motion-part-selectors.py`)

1. It asks whether the class appears anywhere in the block's merged source (render.php, partials, included files), not whether every render path that prints the part's role prints it.
2. `emitted_elements` reads a modifier class (`__image--desktop`, `__cta--primary`, `__star--full`) as the plain element, so a part named `image`, `cta` or `star` counts as printed although the plain class is printed nowhere.

### Width (live measurement, 301 non-excluded parts, 70 blocks, 9,000+ instances on the canary)

Ten rows across five blocks cannot fire on some or all render paths: `product-card` image, body, price and cta; `responsive-logo` image; `star-rating` star; `card-grid` image and body (products mode, handed to the product card); `hero` inner and content-band (split layout prints no band). Another 188 rows miss only because the content or a setting does not ask for the element, which is expected. The static scan found the same set plus suspects: `gallery` image (video items and images with no attachment ID print a different wrapper), `separator` content (icon mode), `icon` label (the visible label is `__label-text`), further `product-card` parts on the typed and read-only paths (priceNote, cta2, noImageLabel, priceFromLabel, wishlist, rrp), `buybox` (five paths hand the page to core WooCommerce blocks), `theme-toggle` and the account card parts. A container `background` part has no element when the background image is not "simple" (`SGS_Container_Wrapper::render`, `$sgs_bg_img_is_simple`). 45 of 75 motion blocks have two or more render paths, 30 have one and are not exposed to this cause.

### What a universal fix needs

- One class vocabulary per part across all render paths of a block, or a declared selector per part that every path prints, or a declared per-path selector map.
- A block.json way to declare that a part is legitimately absent on a path (for example an `absentIn` list) so a gate can tell absent-by-design from broken.
- A gate that asserts, per render path, that every offered part's selector matches an element. The existing render harness (`tests/php/BlockHarnessRenderTrait.php::render_block`, `scripts/qa/lib/render-css-harness.php`) can render attribute-selected paths; product-card live paths need a minimal product stub.
- The gate's `emitted_elements` must use whole-token matching.

## Issue B: a delegating block cannot reach its child block's controls

### Root cause (proven)

In `wc-product` and `cpt-collection` mode `src/blocks/card-grid/render-delegated.php` renders each result with `render_block( [ 'blockName' => 'sgs/product-card', 'attrs' => $card_attrs ] )`, where `$card_attrs` is a hand-written list: `sourceMode`, `productId`, `showLadder`, `sgsMotion`, plus `showPickers` and `ctaBehaviour` in cpt-collection mode only. `sgs/product-card` declares 370 attributes; about 343 to 345 styling and behaviour settings (the button's colours in both states, `showCta`, card colours and borders, title, price, rating typography) cannot be supplied because the grid has no attribute that carries them. `supports.sgs.motionDelegate` maps only five grid parts (`item`, `title`, `image`, `body`, `noImageLabel`) onto the card, so 21 of the card's 26 motion parts, including `cta`, `cta2`, price and rating, are not offered as Effects targets in the grid. 37 attribute names are shared between the grid and the card (`titleColour`, `borderColour`, `cardPadding` and so on) but the grid's copies only paint the grid's own manual-card markup. In products mode the grid's inspector also shows panels that style markup the product cards never print.

### Width

`sgs/card-grid` to `sgs/product-card` is the only parent that hands a whole card to a child. Seven other places render a child block with a parent-built list and are deliberate compositions with smaller gaps: `buybox` to `option-picker` (standard and guided), `buybox` to `modal` and `choice-flow`, `product-card` to `option-picker`, `nav-drawer` to `google-rating-badge`, and `account` reusing a wishlist panel's attributes. Only `card-grid` declares `motionDelegate`. Among blocks that render their own items, interactive elements with no settings and no Effects target: pricing-table savings badge, trustpilot-reviews arrows and links, post-grid filter buttons and arrows, google-reviews logo link, team-member social links, gallery item link (pattern search; verify before acting). No mechanism exists that reflects a child's attribute schema into a parent's inspector.

### Options (recommendation, not fact)

- A: one `cardAttributes` setting on the grid with controls generated from the child's attribute schema, merged into each card.
- B (recommended in the survey): the same storage, but show the product card's own inspector inside the grid, which first needs the inspector extracted from `src/blocks/product-card/edit.js` (3,677 lines) and a block.json declaration so the framework DB and gates can see the nested attributes.
- C: a locked template product card inside the grid, as the Query Loop block does.
- D: keep forwarding by hand (rejected: about 343 keys would drift).
- Whichever is chosen, mapping every card part in `motionDelegate` is a block.json-only change.

## Bean's block categories (the exclusions are deliberate)

Container-kind blocks whose content is inner blocks (info-box, multi-button) mark their content parts `"motion": false` because the effect goes on the child block itself; nested elements, forced child/parent pairs (`sgs/tabs` + `sgs/tab`) and array items (card-grid cards) use parts as targets. The `motion: false` exclusions from `258260d5e` are correct for the first category and are not part of either issue.

## Next session (not started)

Fix Issue A and Issue B together under plan item 11 in `.claude/plans/archive/2026-10-12-spec38a-motion-build.md`, with the gate first (red on the ten rows above), then the selector vocabulary fix per block, then the delegation design (Bean to choose A, B or C).
