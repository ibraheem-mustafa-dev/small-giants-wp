---
status: active
doc_type: plan
created: 2026-11-18
---

# Template rework: shop surfaces the cloning route fills without hand-tuning

Status (2026-11-18): Bean ruled on decisions 1 and 2 and corrected the timetable; decision 4 is open; the class A swap (Task 5's first step) is running on a scratch copy. Deadline, in Bean's words: this work, two more whole sites designed, built and cloned, and the event material, all before 2026-11-28. So the order is by what removes the most hand work from the next clone, and nothing waits for the event to pass.

## Goal and why

Finishing Mama's Munches took two rounds of hand-tuning on its shop surfaces (basket, checkout, order confirmation, account, product, shop, search, 404). Bean's ruling of 2026-11-18: make them near-blank, malleable canvases the cloning route (Spec 48) fills, so no site needs that again, and never let one client's change alter another client's site. Done, as Bean sees it: the route clones the shop surfaces of two different drafts (Mama's and Eye Care's) onto lab copies with no hand-written CSS beyond real one-offs, no setting set by hand and no hand-rebuilt template; the pairs beside each draft pass his eye at 375, 768 and 1440; and Indus and Eye Care render exactly as before.

## Evidence

`.claude/reports/2026-11-18-template-rework/`: `inventory.md` (what ships and what it fixes), `by-missing-setting.md` (Mama's 542 Custom CSS rules classified and ranked), `per-page.md`, `template-overrides.md`, `debt-lines.md`, `checks.md` (the tick box look on Indus and Eye Care). The plan was reviewed by four independent reviewers and their findings fact-checked. What shapes it:

- The largest cause of the hand work was not CSS: about 63% of round two's 270 fixes set a setting or content that already existed (`sites/mamas-munches-redesign/build/qa/fix-catalogue.md`), because the route does not write the shop settings (Spec 48 FR-48-87).
- Of the 72,794 characters of Custom CSS, 55% stand in for a setting an SGS block lacks, 28% for one a wrapped WooCommerce or core block lacks, 10% for a setting that existed, under 2% fight a hard-coded default. About 31% of the declarations (layout, transforms, grid placement) fit no column the look table has or could reasonably gain.
- The Cart and Checkout blocks already have 689 look settings each from one table (`plugins/sgs-blocks/includes/woocommerce/commerce-look/selectors.json`) and still carried 14,206 characters of CSS: settings built for one draft lag the next draft.
- The theme's template files reach three sites as they are (`eye-care-test` serves the cart, checkout and order confirmation files; saved templates on the Indus and Eye Care mirrors still pull in theme part files), while a cloned site already gets its own copy of every template (FR-48-56). Editing the files risks signed-off sites for little gain.
- `main` is 143 plugin and theme commits ahead of what Indus and Eye Care run, and a first before-and-after comparison found four unwanted changes waiting for them (`checks.md`).

## Approach

(1) A before-and-after render check, run for every client site whenever framework code changes, and a first run that lists what `main` already holds for Indus and Eye Care. (2) The route writes the settings that exist, on two drafts, and its list of what no setting could hold becomes the ranked list for new settings. (3) The theme's files stay as they are; the blank canvas is the copy the route builds for each site from a map of each template's working piece, with the handoff asking for every special surface. (4) What no setting holds is written as Custom CSS by the route, aimed at a named part, never by hand (FR-48-109); a look is promoted to a setting when two drafts need it (FR-48-60), through the look table, which gains fill and state columns and reaches more blocks. (5) Proof on two drafts.

Rejected, with the reason: blanking the theme's files behind a freeze of each site's templates (feasible in WordPress, but it needs every part frozen too, a guard against the editor's Reset deleting a frozen copy, a stand-in for the shop filter markup that 322 stylesheet lines and the filter scripts hang on, and a write to `eye-care-test`, all for under 2% of the CSS; decision 1 keeps it open); building every ranked setting now (it proves Mama's on Mama's and leaves the next draft's gaps); `sgs/account` and other SGS blocks as look-table hosts in this plan (924 hand-built attributes, slot collisions; revisit after Task 12's evidence); swapping the finished Mama's site's CSS for settings (no visitor benefit, and database pushes to it end at go-live).

## Decisions at the design gate (Bean)

1. Templates. Ruled (Bean, 2026-11-18): the theme's files stay and the route builds each site's blank copy; "each site starts from a blank slate".
2. Settings. Ruled (Bean, 2026-11-18), his own third way: first fix the mechanism that missed a setting that exists, set the setting and remove the Custom CSS; then review every remaining case and convert whatever would plausibly be used a second time, without waiting for it to appear on a second draft; leave as Custom CSS only a true one-off, or a look that needs a block or system rebuilt where the pay-off is not worth it.
3. Withdrawn by its author on Bean's timetable: nothing is parked on a branch. Each batch goes to `main` after a before-and-after comparison on a scratch copy of the Mama's mirror shows no unwanted difference. The prototype in `E:\sgs-tmp\template-rework\checks\` is not that comparison and must not be used as the gate: it carries on and reports a pass when its sign-in fails (so the account, order and checkout views may never be looked at), it captures pages at rest only, and it measures 375, 768 and 1440 only. No plugin or theme change from this plan reaches `main` until the comparison (a) exits with a failure when sign-in fails or a listed state is not reached, and its report names every signed-in view, the filled basket, the checkout and an order confirmation as reached, (b) captures hover and focus, and (c) measures each stylesheet breakpoint. This matters more from the day Mama's becomes the live shop, because every deploy of `main` then reaches paying customers; `main` still does not deploy to `indus-test` or `eye-care-test` before Task 5.
4. The tick box look: opt-in per site through its snapshot, with its four faults fixed (recommended), or framework-wide once fixed, with Bean accepting the size change on Indus and Eye Care by eye.
5. A read-only local copy of `eye-care-test` for the render check (recommended; it brings that site's customer names and emails onto this PC, mail stays blocked).
6. Eye Care's draft as the second shop for the proof, cloned onto a lab copy only, never `eye-care-test` (recommended).

## Out of scope

Regular pages and the route's general mechanisms (the parallel route session, `.claude/prompts/2026-11-18-route-regular-pages.md`: lab safety for route runs, the applier, the residual Custom CSS writer, the "no setting" report fix); header, footer, drawer, mega, form and modal surfaces (already one container block each); WooCommerce's forms rebuilt; subscriptions; the shop's emails; any write to `eye-care-test`.

## Order

Wave 0 starts on approval; Tasks 1 and 3 are independent and Task 4 waits on the route session's lab safety. Wave 1 is plugin and theme work on the branch, one batched reseed at a time (`.claude/dev-setup.md`, "Adding a block attribute? Reseed FIRST"; examples `E:\sgs-tmp\mamas-register\round2\batch12.ps1`, `ship15.ps1`); only this plan adds block attributes, and the route session files the gaps it meets as rows for Task 8. This plan owns `plugins/`, `theme/`, `scripts/render-check/` and new route files; the route session owns every existing file under `scripts/computed-route/` and `scripts/parity/` and makes any one-line edit this plan needs there. Route runs for this plan use a worktree with a copied cache and the lab only, one surface at a time: the shared foundation once (tokens, media, menus, header, footer), then each surface run, checked and closed by Bean's eye before the next. The two sites due before 2026-11-28 are Small Giants Studio's own (no shop) and muslimsinconstruction.uk (a shop), so the shop surfaces are needed for one of them and regular pages for both. Deploys run one at a time, last. Each wave's architecture change lands as three or more commits (FP-5), and a change across more than three files gets its detector first.

## Risks

- The render check is noisy or passes without reaching a state: every page entry asserts it was reached (signed in, a basket line, an order number) and a miss fails the run; identical bytes from the server pass without a pixel compared; a difference counts only if it shows on a second capture; the self-test replays the real near miss of 2026-11-18.
- The look table grows the editor: every extension attribute is registered on about 380 block types today (`plugins/sgs-blocks/includes/extension-attrs-rest-register.php::sgs_register_extension_attrs_for_rest`); Task 6 confines a named extension to its named blocks before any row is added.
- Route-written Custom CSS is lost when a Shop manager saves the page (Spec 32 FR-32-30, not built): Task 11 builds it.
- The framework is frozen and a new engine is being designed (`.claude/LEDGER.md` Front E): stop after Task 5 if no further WordPress shop client is expected, since Tasks 1 to 5 pay for themselves on the three existing sites.

## Session breaks

Read this plan, `inventory.md` and `git log --oneline -15`. Find the first task whose Status is not done, rerun the previous task's check, continue.

## First action

Bean rules on the six decisions. Then `git worktree add --detach E:\sgs-tmp\wt-render-check main` and start Task 1.

## Wave 0: starts now, changes no page any site serves

### Task 1: Before-and-after render check
- Why: on 2026-11-18 a change for Mama's would have altered Eye Care's saved frames, and only a side agent reading code caught it. Read first: `.claude/reports/2026-11-18-template-rework/checks.md`, the prototype `E:\sgs-tmp\template-rework\checks\capture.mjs` and `compare.py`, `scripts/parity/draft-live-walk.mjs`, `scripts/computed-route/lib/site-check-nav.mjs`, `scripts/local-wp/README.md` ("Scratch copies of a mirror")
- Changes: new `scripts/render-check/`: `render-check.py` (a scratch copy of a site's mirror seeded with a customer, a saved item, a basket and one order of fixed date; capture; swap the build or run any `--step` command; restore the seed; capture; compare; drop the copy in every case), `capture.mjs` (per page and state at 375, 768 and 1440 plus each stylesheet breakpoint: the server's HTML, stylesheets and scripts by hash, then each visible element's text, box and computed styles with animations finished and fonts ready; each entry asserts its state was reached), `compare.py` (identical bytes pass; otherwise differences paired by text, role and order, confirmed on a second capture, exit 1 unless each matches an entry in `sites/<client>/render-accepted.<target>.json` naming the commit, the crop pair Bean saw and one use; exit 2 for an unreached state); the Custom CSS census scripts moved in from `E:\sgs-tmp\template-rework\overrides\` (`export-custom-css.py`, `verify-count.php`)
- Touches: scratch mirrors only
- Done when: `python scripts/render-check/render-check.py --self-test` proves four cases on a scratch copy: the same build twice passes; the `cards` layout drawn as commit `9219e649c` drew it fails on the signed-in saved-items view; a failed sign-in exits 2; a rule added behind a class no element carries is reported inert and passes
- Depends on: none
- Status: not started

### Task 2: What `main` holds for Indus and Eye Care
- Why: both run `419b4cb6a`; "0 differences" later means nothing until today's backlog is known. Read first: `checks.md`, `scripts/local-wp/refresh-from-remote.sh` (it only reads the server), `plugins/sgs-blocks/scripts/deploy_common.py::TARGETS`
- Changes: a scratch copy `local-mediatest-eyeref` holding `eye-care-test`'s database, uploads, extra plugin folders and its own `theme-snapshot-eye-care-test.json` (never pass `local-eye-care` as the local site); a render-check run of `main` against each site's build, read from the live file listing the deploy already uses (`plugins/sgs-blocks/scripts/deploy_delta.py::live_listing_cmd`), since the deploy cache no longer holds `419b4cb6a`; a triage list in `.claude/reports/2026-11-18-template-rework/backlog.md`: each difference with its commit, and "fix", "make opt-in" or "Bean accepts"
- Touches: scratch mirrors; read-only SSH
- Done when: `backlog.md` lists every difference on both sites with a cause commit, including the four in `checks.md`, and Bean has ruled on each "accepts"
- Depends on: 1, decision 5
- Status: not started

### Task 3: The handoff asks for every special surface and knows what a shop can do
- Why: Mama's draft had no 404, search or account sub-views, and promised things WooCommerce does not do (an address book, tracking links); `.claude/claude-design-handoff/PROMPT.txt` never mentions a shop. Read first: `.claude/specs/48A-CLAUDE-DESIGN-HANDOFF-FOLDER.md`, `.claude/claude-design-handoff/`, `scripts/computed-route/handoff-check.mjs`, Spec 48 FR-48-60 Status (the buy box census)
- Changes: `PROMPT.txt`, the uploaded `CLAUDE.md` and `handoff-schema/` ask a shop draft for the 404, search with and without results, the empty basket, the order confirmation, each account view signed in and out, and the notices, and list what the shop can and cannot do; Spec 48A v1.3 with a new FR; `handoff-check.mjs` warns on a missing one (the three existing folders predate it); a new `scripts/computed-route/lib/commerce-census.mjs` lists, per shop surface, each draft part with the setting that holds it or "missing", for one batched ruling at intake
- Touches: docs, new route files, Bean's desktop copy of the prompt
- Done when: the census run on Mama's and Eye Care's handoff folders prints each surface's parts, and `handoff-check.mjs` names the surfaces each folder lacks
- Depends on: none
- Status: not started

### Task 4: Fill writes the shop settings that already exist
- Why: the biggest share of the hand work. Read first: Spec 48 FR-48-87, FR-48-14b and FR-48-94, `scripts/computed-route/fill.mjs`, `plugins/sgs-blocks/includes/woocommerce/commerce-look/selectors.json`, `scripts/computed-route/lib/site-check-commerce-look.mjs`
- Changes: new `scripts/computed-route/lib/fill-part-look.mjs`: each table row gains a draft locator (input type, role, autocomplete token, structure; never the wording alone) in a sidecar `scripts/computed-route/data/part-locators.json`; Fill pairs the draft's element with the row and writes each column from its computed style on `woocommerce/cart` and `woocommerce/checkout`, and the existing `sgs/account` and `sgs/cart` settings the same way; a report of rows paired, values written and parts no setting holds
- Touches: route (worktree), the lab mirror and an Eye Care lab copy
- Done when: on both drafts the report shows rows paired over rows present, and on Mama's each written value equals the hand-set value on `local-mamas` posts 101, 102, 103 and 178 or is listed with both values
- Depends on: the route session's lab safety; decision 6
- Status: not started

## Wave 1: plugin and theme, in batches to `main`

### Task 5: The first batch of fixes
- Why: Bean's list of 2026-11-18 and Task 2's backlog. Read first: `checks.md`, `backlog.md`, Spec 32 FR-32-31, Spec 02 FR-2-26
- Changes: first, the class A swap (the 58 rules whose setting already existed: set the setting, delete the rule, prove the page unchanged; in progress on the scratch copy `local-mediatest-classa`, results and the replayable patches in `E:\sgs-tmp\template-rework\class-a\`), with a detector `check-custom-css-has-setting.py` that fails on any Custom CSS declaration a setting already holds, run before every mirror push and by the route's residual writer; then `theme/sgs-theme/assets/css/choice-controls.css` per decision 4, with the sign-in label no longer an inline row, the ticked colour never under 3:1 on its ground, the 22px minimum height yielding to `sgs_shop_filter_box_size`, and the theme mod `sgs_shop_filter_box_border` restored; `theme/sgs-theme/assets/css/woocommerce.css` hides WooCommerce's drawn tick when ticked; `sgs/account` `orderStatusLabels` reaches WooCommerce's own orders table; the backlog's "fix" rows; then FR-2-26's two faults (tests in `plugins/sgs-blocks/scripts/tests/test-wishlist-cards.mjs` fail first; correct the path FR-2-26 cites)
- Touches: plugin, theme, Spec 02, Spec 32
- Note: the tick box look is now a per-site token (Spec 32 FR-32-31): the `choice-controls.css` fixes above reach only a site that sets `settings.custom.choiceControls`, so Indus and Eye Care (which do not) render their tick boxes as before whatever this task changes there
- Done when: the render check passes on the Indus, Eye Care and Mama's copies with only accepted entries, and each fix's test fails before it and passes after
- Depends on: 2
- Status: not started

### Task 6: The look table gains fill and states, and stops loading everywhere
- Why: a ten-line column removes the coupon, wallet-card and summary groups on the blocks that already have the table. Read first: Spec 27 FR-30-18, `plugins/sgs-blocks/includes/woocommerce/commerce-look/table.php::sgs_commerce_look_table_column_css`, `plugins/sgs-blocks/scripts/generate-commerce-look-table.js`
- Changes: columns `fill` and `colour` whose value object holds normal, hover and focus, printed through `sgs_fill_decls`; a per-row selector for a chosen state; the generator writes each state's `css_state`; a named extension's attributes registered only on its named blocks; a test that every column kind has a writer case and a control case
- Touches: plugin, one reseed, Spec 27
- Done when: a fill and hover fill on the coupon Apply row paint on a Mama's scratch copy at three widths and in the editor canvas; unset, the render check passes on every site copy; `strlen( wp_json_encode( get_block_editor_server_block_settings() ) )` on `local-mamas` falls from 15,413,644
- Depends on: 1
- Status: not started

### Task 7: The look table reaches the blocks that have nothing
- Why: the order confirmation blocks, the notice banner, core search and the product grid take no look settings. Read first: `inventory.md`, `plugins/sgs-blocks/includes/woocommerce/commerce-look/writer.php`, `plugins/sgs-blocks/src/blocks/extensions/commerce-look/index.js` and `table-panels.js`, `plugins/sgs-blocks/scripts/wiring-fingerprint/wf_table.py`
- Changes: a `hosts` map per row (block name to selector) in place of the `cart` and `checkout` keys, carried through the writer, the REST canvas route, the generator (one roster entry per host), the panels (grouped by a `group` key), the wiring gate and `site-check-commerce-look.mjs` (the route session makes that edit); hosts added for `woocommerce/order-confirmation-*`, `woocommerce/store-notices`, `core/search`, `core/read-more`, `core/query-title` and `woocommerce/product-template`; a new Spec 27 FR for the part look table
- Touches: plugin, one reseed, Spec 27, Spec 32
- Done when: one WooCommerce host and `core/search` each paint a set fill at three widths and in the editor; unset, the render check passes on every site copy
- Depends on: 6
- Status: not started

### Task 8: A setting for every look that would be used a second time
- Why: Bean's ruling on decision 2. Read first: `.claude/reports/2026-11-18-template-rework/by-missing-setting.md` and the verdict per group Bean approved (`setting-verdicts.md` beside it), Task 4's report where it exists
- Changes: rows and columns for every group marked "convert"; site-wide parts (notice, field, primary and secondary button) as snapshot tokens where one look serves every block; the class D and F rules of `by-missing-setting.md` each as a fix or an off-by-default option
- Touches: plugin, theme, batched reseeds, Spec 27, Spec 32
- Done when: on a scratch copy of `local-mamas` every rule of a "convert" group is replaced by its setting and deleted with no difference in the before-and-after comparison, and what remains is only the groups marked "one-off" or "not worth a rebuild"
- Depends on: 7; Bean's approval of the verdicts
- Status: not started

## Wave 2: the route builds the canvases

### Task 9: Every template copy from a working-piece map
- Why: eight of Mama's twelve template overrides were rebuilt by hand. Read first: Spec 48 FR-48-56 and FR-48-96, `scripts/computed-route/lib/template-copies.mjs`, `template-overrides.md`
- Changes: new `scripts/computed-route/data/template-pieces.json` (each template's working piece: page content, the query, the product collection with the filter structure the theme's scripts need, the order confirmation's blocks) read by a new builder the route session wires into `template-copies.mjs`; the order confirmation becomes a surface built from SGS blocks bound to the order (`plugins/sgs-blocks/includes/class-order-binding.php` gains the address keys); a surface the draft lacks is composed from the site's own inner-page hero, card and button, never the theme's generic look
- Touches: route (worktree), plugin (the binding), the lab
- Done when: a lab run builds Mama's and Eye Care's order confirmation, 404 and search with no hand edit, and each pairs with its draft or its composed parts in the walker
- Depends on: 3, 4
- Status: not started

### Task 10: The residual goes to named parts
- Why: about a third of the look fits no setting. Read first: Spec 48 FR-48-109, Spec 32 FR-32-20
- Changes: the route session's residual writer takes a look-table row as its target, so any property lands on the named part in the host block's Custom CSS with its note and a gap row per use
- Touches: route (worktree)
- Done when: Task 4's "no setting" parts on both drafts are written as route-labelled Custom CSS and each appears in the run's gap list
- Depends on: 4, the route session's residual writer
- Status: not started

### Task 11: Custom CSS survives a Shop manager's save
- Why: Spec 32 FR-32-30; more route-written CSS raises its cost. Read first: Spec 32 FR-32-30, `plugins/sgs-blocks/includes/custom-css.php::sgs_strip_custom_css_from_blocks`
- Changes: as FR-32-30 rulings 1 and 2
- Touches: plugin
- Done when: FR-32-30's Done-when
- Depends on: none
- Status: not started

## Wave 3: proof

### Task 12: Two drafts, no hand-tuning
- Why: the Goal. Read first: `scripts/computed-route/site-check.mjs`, `per-page.md`
- Changes: none to code
- Touches: lab copies only
- Done when: on lab clones of Mama's and Eye Care's shop surfaces, hand-written Custom CSS is 0, settings set by hand after the run are 0, every route-written rule is in the gap list, and what is left is listed as a real one-off; the render check passes on Indus, Eye Care and Mama's; `site-check.mjs` reports 0 failed on both labs; Bean signs the pairs at three widths (FP-13)
- Depends on: 1 to 11
- Status: not started
