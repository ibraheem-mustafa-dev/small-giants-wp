---
status: active
doc_type: plan
created: 2026-11-21
---

# Shop pages: fix and check every page type from the investigation

## Goal and why

Mama's and Eye Care's from-blank shop pages (product, shop listing, basket and drawer, checkout, account, order confirmation), built by the cloning route with no hand edits on the scratch copies `local-mediatest-trlab` and `local-mediatest-trec`, pass Bean's eye beside their drafts at 375 and 1440, and the route is ready for MIC (a new shop) cloned on 2026-11-28. Done, as Bean sees it: one pair per page type per client beside its draft, every listed fault fixed or recorded as a gap, and every check that used to look green while comparing nothing now able to fail.

## Approach

Bean asked for every page to be investigated before more fixing (2026-11-21 night). Six investigators wrote 99 findings, six independent checkers fact-checked them (several "missing setting" claims were wrong and were dropped), and one merge grouped them by cause into 68 fixes, F-1 to F-68, each with its proof, file::symbol, owner, size, render-scope need and check: `.claude/reports/2026-11-21-shop-investigation/MERGED.md` (read a fix's block there before building it; the findings and `verify-*.md` verdicts sit beside it). Tasks below group the fixes into lanes that touch different files, so helpers on separate worktrees build them in parallel, then one rebuild of both copies proves them together. Rejected: page-by-page rounds of a few faults (Bean's ruling of 2026-11-20: work by mechanism), because most causes span several pages.

## Out of scope

The general cloning session's own fixes (listed in Task 1's message; it builds them), the header, footer and nav drawer builds, subscriptions (D-4), and any WooCommerce page a draft does not draw (left at its default, named in the report: MERGED.md section 7).

## Order

- Task 1 and Task 2 first (no code). Task 3 (theme, first wave) and Tasks 4 to 6 (enablers and part-look foundations) run in parallel; the general session's RW-27 route half (F-29) lands only after Task 3's F-28, and its threshold write only after F-68 and F-30.
- Tasks 7 to 12 (one lane per page type) start once Tasks 4 and 5 land; they run in parallel, but `data/part-locators.json` and `data/part-look-modes.json` are shared: each lane rebases and lands its data edits one at a time.
- Task 13 (the plugin round) collects every lane's plugin settings into one batch and one announced private reseed (`.claude/dev-setup.md` "Publishing a private reseed"); never two reseeds at once, and tell the general session first.
- Task 14 rebuilds both copies once (one surface at a time per copy) and Task 15 is Bean's look and the deploy checks. The build runs through `/subagent-driven-development`.
- Every fix marked render-scope in MERGED.md runs `scripts/render-scope/render-scope.py` and lists its pages before any site's next deploy of `main`.

## Risks

- The copies were never truly from blank (S-2, S-6): a pass on a hand-finished leftover proves nothing. Task 2 must land before any live check counts.
- Wrong "missing setting" claims: before building any new setting (Task 13), run the four checks (database, motion system, theme Customizer settings, the hand-built site's setting names) and drop what already exists.
- Shared defaults: F-18, F-22, F-27, F-28, F-34, F-36, F-38, F-45, F-55, F-60, F-68 change what other sites render; each lists its pages (Bean's rule: a fix applies everywhere, an extension is opt-in).

## Session breaks

Read this plan, `MERGED.md` section 1 and `git log --oneline -20`; find the first task whose Status is not done; rerun the previous task's check; continue. Investigation scripts and pictures: `E:\sgs-tmp\template-rework\investigation\`; rebuild chain scripts: `chain.sh`, `chain-pl.sh` there.

## First action

Bean answers the eight decisions in MERGED.md section 6 (D-1 to D-8, each with a recommendation; five minutes).

## Wave 1: Decisions, setup and the first wave

### Task 1: Decisions recorded and the general session's list sent
- Why: eight choices only Bean can make shape Tasks 10 to 12; the general session owns 13 fixes. Read first: MERGED.md sections 4 and 6
- Changes: this plan's tasks updated with Bean's answers (D-1 to D-8); one message to the general session with section 4's list, settling owners of F-9 and F-20
- Touches: this plan; a cross-session message
- Done when: each D has an answer in this plan, and the general session has replied naming its build wave for each of its items
- Depends on: none
- Status: not started

### Task 2: Make both copies truly from blank and complete
- Why: Mama's drawer, checkout words and shop options were hand-finished leftovers, Eye Care's header is from 2026-10-28, Mama's intake is stale. Read first: MERGED.md section 3 (S-2 to S-14)
- Changes: a real strip of both copies (the new strip command, `99650a2c1`/`c2f980e44`, plus a reset of Mama's checkout page, S-6); Mama's intake re-run, then `manifest.mjs --apply` (S-3); a fresh Eye Care header (S-4); calibration of `sgs/product-card` on both copies and `sgs/account`'s kit hover rows on Mama's (S-5); registration step (S-9); test-mode gateway keys (S-10); missing upload files copied (S-11, S-12); the seeded customer's email confirmed (S-14)
- Touches: the two scratch copies only; never `local-mamas`, `local-eye-care` or any hosted site
- Done when: a read-only diff against `local-mamas` shows no hand-finished block settings left on Mama's copy, `manifest.mjs` lists no `noIntake`, and the checkout shows a test card field on both copies
- Depends on: none
- Status: not started

### Task 3: First wave: the closed filter drawer and its breakpoint (F-28, F-68)
- Why: the general session's RW-27 route half exposes a 1,790px blank band at 375 until F-28 lands, and MIC's phone filter needs both. Read first: MERGED.md F-28, F-68
- Changes: `theme/sgs-theme/assets/css/woocommerce.css` (closed `dialog#sgs-shop-filters` hidden whatever layout class; the ~8 rules fixed at 782px moved to a rule the theme prints from `sgs_shop_filter_drawer_breakpoint`, `inc/shop-filters-settings.php`)
- Touches: the theme; every site's shop (render-scope)
- Done when: on `local-mediatest-trec` at 375 the closed drawer takes 0px and opens and closes; with the option at 1060 the drawer shows from 1059 down and the sidebar from 1060 up (Playwright); render-scope lists the pages; message the general session after each fix lands
- Depends on: none
- Status: not started

### Task 4: Route enablers in this stream's files (F-1 own half, F-4, F-8, F-10, F-13)
- Why: these unblock propose and the h1 on several pages. Read first: MERGED.md F-1, F-4, F-8, F-10, F-13
- Changes: `lib/template-piece-product-field.mjs::placeTitle` sets `level: h1`; the commerce region reports its run (`lib/template-pieces-context.mjs`, region rule's run via `paint.runs`); the woo-layout piece claims the empty-basket branch; `lib/template-piece-frame.mjs` reports the wrapper it drops; the order reader treats state only the order action writes as the order (with D-3)
- Touches: route files only
- Done when: offline propose passes for Eye Care's shop, Mama's basket and Mama's checkout on the lab's saved inventories; each change has a test that fails first and a killed mutation list
- Depends on: none (F-13 waits on D-3)
- Status: not started

### Task 5: Part-look foundations (F-14 to F-17)
- Why: every page lane builds on these; F-17 removes three green-but-empty checks. Read first: MERGED.md F-14 to F-17 and section 8
- Changes: `lib/part-look-run.mjs` reads a one-file draft by its route (`part-look.json` entries, incl. Eye Care's shop) and refuses a surface it cannot open; `lib/fill-part-look.mjs` stated-size rule reads `height`, viewport-capped widths and grid tracks; current-state looks written; verify and compare report parts they did not compare as not verified
- Touches: route files; `data/part-look.json` per client
- Done when: Eye Care's part-look on shop, checkout and the signed-in account pairs parts it paired 0 of before (counts in the commit), and a verify with unpaired parts can no longer report all-match
- Depends on: none
- Status: not started

### Task 6: The basket drawer never paints near-black (F-18)
- Why: Eye Care's drawer is unreadable on every page. Read first: MERGED.md F-18, verify-basket.md
- Changes: `plugins/sgs-blocks/src/blocks/cart/render-scoped-css.php` (the `$has_panel` branch falls back to the site's surface colour, not `currentColor`)
- Touches: plugin; every site's drawer (render-scope)
- Done when: Eye Care's drawer reads on the copy at 375 and 1440; render-scope lists the pages
- Depends on: none
- Status: not started

## Wave 2: One lane per page type (parallel)

Each lane: read its MERGED.md blocks; tests fail first; mutation lists killed; offline propose and part-look checks; plugin settings it needs go to Task 13, not into the lane.

### Task 7: Basket lane (F-19, F-20, F-21, F-22, F-9 if ours)
- Changes and checks: per MERGED.md. Depends on: 5. Status: not started

### Task 8: Checkout lane (F-23 to F-26)
- Changes and checks: per MERGED.md (F-27 is the general session's extractor). Depends on: 5, 2. Status: not started

### Task 9: Shop lane (F-30 site-build shop-options step, F-6, F-31 own half, F-32 to F-35)
- Also, from the night's code review (`reports/2026-11-21-shop-investigation/code-review.md`): `lib/skeleton-filter-rail.mjs::handlerOf` strips the letter s, not whitespace (`/^{{s*|s*}}$/g`); `brand-strip/product-brands-source.php::sgs_brand_strip_brand_ids_with_visible_products` loads every product id per render with no cache (large catalogues); a catalogue term with `&` (stored `&amp;`) is planned as missing on every run (`lib/site-build-catalogue-axes.mjs::axisChanges`).
- Changes and checks: per MERGED.md; F-30 writes the 56 theme shop options from the draft (names only from eye-care-test, values from the draft). Depends on: 3, 5. Status: not started

### Task 10: Account lane (F-36, F-38 to F-41)
- Changes and checks: per MERGED.md, with D-1 and D-7. Depends on: 5. Status: not started

### Task 11: Confirmation lane (F-12, F-43 to F-47)
- Changes and checks: per MERGED.md, with D-2 and D-3; Mama's must build from its own draft, not WooCommerce's stock page. Depends on: 2, 4. Status: not started

### Task 12: Product lane (F-50 to F-55, the kit's content align from product-15)
- Also, from the night's code review: a simple product that sells out after its page loads keeps Add to Cart (the 409 branch of `product-card/view.js` calls `includes/class-cart-proxy.php::handle_availability`, which accepts only variable products: fall back to `Product_Manifest::build_simple()`); the express-pay screen-reader note in `buybox/extras.php::sgs_buybox_after_cart_form_action` asks a simple product's shopper to choose options.
- Changes and checks: per MERGED.md, with D-4, D-5 and D-8. Depends on: 4, 5. Status: not started

## Wave 3: Settings and proof

### Task 13: Plugin round (F-37, F-60 to F-66, and every lane's settings)
- Why: one batch and one reseed. Read first: MERGED.md section 5, `.claude/dev-setup.md` "Publishing a private reseed"
- Changes: the settings each item names, through the shared components (Spec 32, 35, 35A); bugs F-60 first
- Touches: plugin; framework database (reseed, announced); render-scope for F-60 and F-62
- Done when: the four checks recorded per new setting; build gates, inspector scan with no new finding, `audit-inline-styling --check` exit 0; publish succeeds
- Depends on: 7 to 12 (their settings lists)
- Status: not started. The reseed also picks up the block.json element selectors added for `sgs/cart`, `sgs/account` and `sgs/product-card` (`aae74374b`, `92a404f90`): it changes `motion_targets.css_element` for about 16 rows and no render

### Task 14: Rebuild both copies and prove every page
- Why: one rebuild proves all lanes together. Read first: `E:\sgs-tmp\template-rework\investigation\chain.sh`, `chain-pl.sh`
- Changes: none in code; rebuild every page type on both copies, part-look, pairs at 375 and 1440
- Touches: the two scratch copies
- Done when: every surface's propose and finalise pass with no green-but-empty check left (MERGED.md section 8 each now able to fail), and the pairs show each fixed fault gone; leftovers become a short round in this plan
- Depends on: 1 to 13
- Status: not started

### Task 15: Bean's look, and deploy checks
- Why: closes the Goal. Read first: this plan's Goal
- Changes: one pair per page type per client sent to Bean; the render-scope list against Mama's live build (`bcc47e0a6`); express pay checked by hand on a product with options before Mama's next deploy; report gaps G-1 to G-7
- Touches: none until Bean approves a deploy
- Done when: Bean passes one page per type, or names what fails (which returns to its lane)
- Depends on: 14
- Status: not started
