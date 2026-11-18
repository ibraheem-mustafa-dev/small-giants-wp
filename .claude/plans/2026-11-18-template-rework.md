---
status: active
doc_type: plan
created: 2026-11-18
---

# Template rework: shop surfaces the cloning route fills without hand-tuning

Status (2026-11-18, end of day): planned, reviewed twice by councils, and re-cut on Bean's rulings. Nothing is built. This plan covers the shop surfaces and the before-and-after check. The general cloning work has its own brief, `.claude/prompts/2026-11-18-route-regular-pages.md`, for a second session.

## Goal and why

Finishing Mama's Munches took two rounds of hand-tuning on its shop surfaces (basket, checkout, order confirmation, account, product, shop, search, 404). Bean's ruling of 2026-11-18: each site starts from a blank slate that the cloning route (Spec 48) fills, so no site needs that again, and one client's change never alters another client's site. Two new sites are due comfortably able to go live before 2026-11-28, one with a shop. Done, as Bean sees it: that shop's surfaces are cloned from blank from its own draft with no hand-written CSS beyond real one-offs and no hand-rebuilt template; the pairs beside the draft pass his eye; and Mama's, Indus and Eye Care render exactly as before.

## Evidence

`.claude/reports/2026-11-18-template-rework/`: `council-report.md` (the verified verdict on the design; read it first), `inventory.md`, `by-missing-setting.md` (one helper's sorting of Mama's 542 Custom CSS rules, made without rendering a page: a list of leads, not facts), `class-a-results.md` (the one class tested: 5 of 11 groups held, seven faults found in existing settings), `checks.md` (the tick box look on Indus and Eye Care), `clone-audit.md`, `per-page.md`, `template-overrides.md`, `debt-lines.md`.

## Bean's rulings that bind this plan (2026-11-18)

- The theme's files stay; the route builds each site's own blank copy of every template.
- Fix what exists before building on it.
- A setting that exists is set and its Custom CSS removed, with the mechanism that missed it fixed. Every remaining look that would plausibly be used a second time becomes a setting now, in batches, through the shared helpers and standard controls (never a hand-coded control). Only a true one-off, or a look needing a rebuild not worth its cost, stays Custom CSS, and the route writes that CSS, never a hand.
- Each group in `by-missing-setting.md` is proved on a scratch copy before a setting is built for it (the side agent's warning, adopted).
- A component's look is read from the draft where it stands; the tick box look is a per-site token (built by another session, `4192dcf56`) and only the fallback where the draft drew none.
- A draft's own tokens and animation records are carried open-ended, under its own names, and set on the blocks they apply to.
- No Components page, no block map, no section-level block choice in the handoff. A block list in design words, yes.
- A clone goes through by default: Bean reads no long review table. The agent compares the built clone with the draft, proposes fixes, and names the areas where Bean's own eye would be easier or more accurate. Bean looks at one page per layout type.
- No plugin or theme change that alters what a page renders reaches `main` until the before-and-after check of Task 1 exists, because every Mama's fix deploys `main` whole and Mama's is becoming the live shop. `main` does not deploy to `indus-test` or `eye-care-test` before Task 2.
- The second new site's own details (its bookings and event data) are parked until the general cloning work is settled; do not raise them.

## Out of scope

Everything in the general session's brief (route fixes, the token extractor, the button rule, the Claude Design instructions, the residual Custom CSS writer, one command for a foundation and for a surface); rebuilding WooCommerce's forms; subscriptions; the shop's emails; any write to `eye-care-test`; swapping the finished Mama's site's Custom CSS for settings (proved on a scratch copy only: `E:\sgs-tmp\template-rework\class-a\`, replay with `apply.py`).

## Order

Task 1 first. Tasks 2 and 3 need it. Tasks 4 to 6 are plugin work, one batched reseed at a time (`.claude/dev-setup.md`, "Adding a block attribute? Reseed FIRST"; examples `E:\sgs-tmp\mamas-register\round2\batch12.ps1`, `ship15.ps1`); say before a reseed starts, because the general session reseeds too. This session owns `plugins/sgs-blocks/includes/woocommerce/`, the look settings on the Cart, Checkout, `sgs/account`, `sgs/cart` and order blocks, the WooCommerce stylesheet's shop rules and `scripts/render-check/`; it adds only new files under `scripts/computed-route/` and asks the general session for any edit to an existing one. Route runs use a worktree with a copied cache and a lab or scratch copy, one surface at a time. Name the model on every helper: Sonnet for coding with a clear brief, a stronger one for reviews and root-cause work.

## Session breaks

Read this plan, `council-report.md` and `git log --oneline -15`. Find the first task whose Status is not done, rerun the previous task's check, continue.

## First action

`git worktree add --detach E:\sgs-tmp\wt-render-check main` and start Task 1.

### Task 1: Before-and-after render check
- Why: on 2026-11-18 a change for Mama's would have altered Eye Care's saved frames, caught only by a side agent reading code. Read first: `.claude/reports/2026-11-18-template-rework/checks.md`; the prototype `E:\sgs-tmp\template-rework\checks\capture.mjs` and `compare.py` and the hardened copy `E:\sgs-tmp\template-rework\class-a\checks\`; `scripts/parity/draft-live-walk.mjs`; `scripts/computed-route/lib/site-check-nav.mjs`; `scripts/local-wp/README.md` ("Scratch copies of a mirror")
- Changes: new `scripts/render-check/`: a run on a scratch copy of a site's mirror seeded with a customer, a saved item, a basket and one order of fixed date; capture, swap the build or run any `--step` command, restore the seed, capture, compare, drop the copy in every case. Per page and state at 375, 768, 1440 and each stylesheet breakpoint, at rest and under hover and focus: the server's HTML, stylesheets and scripts by hash, then each visible element's text, box and computed styles with animations finished and fonts ready. Identical bytes pass. A difference counts only if it shows on a second capture and exits 1 unless an entry in `sites/<client>/render-accepted.<target>.json` names its commit and the pair Bean saw. An unreached state (a failed sign-in, an empty basket where a filled one was asked for) exits 2. The Custom CSS census scripts (`E:\sgs-tmp\template-rework\overrides\export-custom-css.py`, `verify-count.php`) and the detector (`E:\sgs-tmp\template-rework\class-a\detector\check-custom-css-has-setting.py`) move into the repo
- Touches: scratch mirrors only
- Done when: `python scripts/render-check/render-check.py --self-test` proves on a scratch copy that the same build twice passes; the `cards` layout drawn as commit `9219e649c` drew it fails on the signed-in saved-items view; a failed sign-in exits 2; and the report names every signed-in view, the filled basket, the checkout and an order confirmation as reached
- Depends on: none
- Status: not started

### Task 2: What `main` holds for Indus and Eye Care
- Why: both run `419b4cb6a`, `main` is 143 plugin and theme commits ahead, and a first comparison found four unwanted changes waiting. Read first: `checks.md`; `scripts/local-wp/refresh-from-remote.sh` (it only reads the server); `plugins/sgs-blocks/scripts/deploy_common.py::TARGETS`
- Changes: a scratch copy `local-mediatest-eyeref` holding `eye-care-test`'s database, uploads, extra plugin folders and its own `theme-snapshot-eye-care-test.json` (never pass `local-eye-care` as the local site); a render-check run of `main` against each site's live build; `.claude/reports/2026-11-18-template-rework/backlog.md` listing each difference with its commit and "fix", "make opt-in" or "Bean accepts"
- Touches: scratch mirrors; read-only SSH
- Done when: `backlog.md` lists every difference on both sites with a cause commit, including the four in `checks.md`
- Depends on: 1
- Status: not started

### Task 3: Faults in the settings that exist
- Why: seven were found by setting them on a scratch copy (`class-a-results.md`), and Bean's first batch of small items is still open. Read first: `class-a-results.md` "Settings that do not work or lose"; Spec 32 FR-32-31; Spec 02 FR-2-26; `plugins/sgs-blocks/includes/woocommerce/commerce-look/selectors.json`
- Changes: `sgsFieldPadding` losing to WooCommerce's active-field padding on the Cart; the look-table rows with no `cart` selector (about ten attributes print nothing there); `sgsSummaryWrapsButton` leaving the inner card; `sgs/product-card` `showCtaShadow` painting nothing (the general session's button rule may cover it: ask); the gift card panel outside the coupon's settings; `sgsSummaryTitleTextMargin` moving the phone step title; `sgs/account` `orderStatusLabels` reaching WooCommerce's own orders table; the tick box stylesheet's four faults in `checks.md`; a ticked shop-filter box showing two ticks; the theme mod `sgs_shop_filter_box_border` restored; Task 2's "fix" rows; then FR-2-26's two faults (`plugins/sgs-blocks/scripts/tests/test-wishlist-cards.mjs` fails first)
- Touches: plugin, theme, Spec 02, Spec 27, Spec 32
- Done when: each fault has a test that fails before its fix, and the render check passes on Mama's, Indus and Eye Care copies with only accepted entries
- Depends on: 1, 2
- Status: not started

### Task 4: Fill writes the shop settings that exist
- Why: most of round two's fixes set a setting that already existed, because the route does not write the shop settings (Spec 48 FR-48-87). Read first: Spec 48 FR-48-87, FR-48-14b, FR-48-94; `scripts/computed-route/fill.mjs`; `scripts/computed-route/lib/site-check-commerce-look.mjs`
- Changes: new `scripts/computed-route/lib/fill-part-look.mjs` with a sidecar `scripts/computed-route/data/part-locators.json` (how to find each look-table row's element in a draft: input type, role, autocomplete token, structure, never wording alone); Fill pairs the draft's element with the row and writes each column from its computed style on `woocommerce/cart` and `woocommerce/checkout`, and the existing `sgs/account` and `sgs/cart` settings the same way; a report of rows paired, values written and parts no setting holds
- Touches: route (worktree, new files), a lab copy
- Done when: on Mama's draft each written value equals the hand-set value on `local-mamas` posts 101, 102, 103 and 178 or is listed with both values, and the same run on a second shop draft reports rows paired over rows present
- Depends on: the general session's safe lab runs
- Status: not started

### Task 5: The look table gains fill and states, stops loading everywhere, and reaches the blocks that have nothing
- Why: the Cart and Checkout take their look from one table where a setting is a column name on a row; it has no fill or state column and reaches no other block; every extension attribute is registered on about 380 block types (15.4 MB of editor settings on `local-mamas`). Read first: Spec 27 FR-30-18; `plugins/sgs-blocks/includes/woocommerce/commerce-look/` (`selectors.json`, `table.php`, `writer.php`); `plugins/sgs-blocks/scripts/generate-commerce-look-table.js`; `plugins/sgs-blocks/includes/extension-attrs-rest-register.php`
- Changes, as three steps of three or more commits each, a detector first: (a) a named extension's attributes registered only on its named blocks; (b) columns `fill` and `colour` whose value holds normal, hover and focus, with each state's `css_state` written by the generator; (c) a `hosts` map per row in place of the `cart` and `checkout` keys, through the writer, the REST canvas route, the generator, the panels and the wiring gate, with hosts for `woocommerce/order-confirmation-*`, `woocommerce/store-notices`, `core/search` and `woocommerce/product-template`
- Touches: plugin, reseeds, Spec 27, Spec 32
- Done when: the editor settings payload on `local-mamas` falls from 15,413,644 bytes; a fill and hover fill on the coupon Apply row and on one new host paint at three widths and in the editor; unset, the render check passes on every site copy
- Depends on: 1
- Status: not started

### Task 6: A setting for every reusable look, each proved first
- Why: Bean's ruling. Read first: `by-missing-setting.md`, `class-a-results.md`, Task 4's report
- Changes: per group, on a scratch copy: run the detector, try the existing setting, and only for what is left build a row or column aimed at the right part (a setting that restyles every tick box label where the design changed two brings the CSS back); a list of each group's verdict (existing setting, new setting, route-written CSS, one-off) for Bean
- Touches: plugin, theme, batched reseeds, Spec 27, Spec 32
- Done when: on a scratch copy of `local-mamas` every rule of a converted group is replaced by its setting with no difference in the render check
- Depends on: 3, 5
- Status: not started

### Task 7: The order confirmation and the shop templates from blank
- Why: eight of Mama's twelve template overrides were rebuilt by hand and the order confirmation is not a surface the route can name. Read first: Spec 48 FR-48-56, FR-48-96; `scripts/computed-route/lib/template-copies.mjs`; `template-overrides.md`
- Changes: a map of each shop template's working piece (`scripts/computed-route/data/template-pieces.json`) and a builder the general session wires in; the order confirmation built from SGS blocks bound to the order (`plugins/sgs-blocks/includes/class-order-binding.php` gains the address keys)
- Touches: route (new files), plugin, a lab copy
- Done when: a lab run builds a shop draft's basket, checkout, account, order confirmation, 404 and search with no hand edit
- Depends on: 4
- Status: not started

### Task 8: Custom CSS survives a Shop manager's save
- Why: Spec 32 FR-32-30; route-written CSS raises its cost. Read first: Spec 32 FR-32-30; `plugins/sgs-blocks/includes/custom-css.php::sgs_strip_custom_css_from_blocks`
- Changes: as FR-32-30 rulings 1 and 2
- Touches: plugin
- Done when: FR-32-30's Done-when
- Depends on: 1
- Status: not started

### Task 9: Proof
- Why: the Goal. Read first: `scripts/computed-route/site-check.mjs`
- Changes: none to code
- Touches: lab copies only
- Done when: on a lab clone of the new shop's surfaces, hand-written Custom CSS is 0, settings set by hand after the run are 0 and every route-written rule is in the gap list; the render check passes on Mama's, Indus and Eye Care; Bean signs the pairs, one page per layout type (FP-13)
- Depends on: 1 to 8, and the general session's work
- Status: not started
