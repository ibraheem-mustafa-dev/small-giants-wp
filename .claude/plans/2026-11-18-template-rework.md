---
status: active
doc_type: plan
created: 2026-11-18
---

# Template rework: shop surfaces the cloning route fills without hand-tuning

Status (2026-11-19): Task 1 is done (the render check and its self-test). Task 2 has its groundwork and Task 5 step (a) is written and saved as a patch; every other task is open. This plan covers the shop surfaces and the before-and-after check. The general cloning work has its own brief, `.claude/prompts/2026-11-18-route-regular-pages.md`, for a second session.

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
- Run `scripts/render-scope/render-scope.py` before a plugin or theme change that could alter what a page renders: it says in seconds which pages the change can reach. The before-and-after check of Task 1 (`scripts/render-check/`, built 2026-11-19) runs only when the change's risk and reach warrant it (Bean, 2026-11-19: shared code, the theme, a changed default, or anything on the live shop's basket, checkout or account), because every Mama's fix deploys `main` whole and Mama's is the live shop. `main` does not deploy to `indus-test` or `eye-care-test` before Task 2.
- The second new site's own details (its bookings and event data) are parked until the general cloning work is settled; do not raise them.

## Out of scope

Everything in the general session's brief (route fixes, the token extractor, the button rule, the Claude Design instructions, the residual Custom CSS writer, one command for a foundation and for a surface); rebuilding WooCommerce's forms; subscriptions; the shop's emails; any write to `eye-care-test`; swapping the finished Mama's site's Custom CSS for settings (proved on a scratch copy only: `E:\sgs-tmp\template-rework\class-a\`, replay with `apply.py`).

## Order

Task 1 first. Tasks 2 and 3 need it. Tasks 4 to 6 are plugin work, one batched reseed at a time (`.claude/dev-setup.md`, "Adding a block attribute? Reseed FIRST"; examples `E:\sgs-tmp\mamas-register\round2\batch12.ps1`, `ship15.ps1`); say before a reseed starts, because the general session reseeds too. This session owns `plugins/sgs-blocks/includes/woocommerce/`, the look settings on the Cart, Checkout, `sgs/account`, `sgs/cart` and order blocks, the WooCommerce stylesheet's shop rules and `scripts/render-check/`; it adds only new files under `scripts/computed-route/` and asks the general session for any edit to an existing one. Route runs use a worktree with a copied cache and a lab or scratch copy, one surface at a time. Name the model on every helper: Sonnet for coding with a clear brief, a stronger one for reviews and root-cause work.

## Session breaks

Read this plan, `council-report.md` and `git log --oneline -15`. Find the first task whose Status is not done, rerun the previous task's check, continue.

## First action

Task 2: create `local-mediatest-eyeref` as its Status says, then run the render check of `419b4cb6a` against `main` on it and on `local-indus`.

### Task 1: Before-and-after render check
- Why: on 2026-11-18 a change for Mama's would have altered Eye Care's saved frames, caught only by a side agent reading code. Read first: `.claude/reports/2026-11-18-template-rework/checks.md`; the prototype `E:\sgs-tmp\template-rework\checks\capture.mjs` and `compare.py` and the hardened copy `E:\sgs-tmp\template-rework\class-a\checks\`; `scripts/parity/draft-live-walk.mjs`; `scripts/computed-route/lib/site-check-nav.mjs`; `scripts/local-wp/README.md` ("Scratch copies of a mirror")
- Changes: new `scripts/render-check/`: a run on a scratch copy of a site's mirror seeded with a customer, a saved item, a basket and one order of fixed date; capture, swap the build or run any `--step` command, restore the seed, capture, compare, drop the copy in every case. Per page and state at 375, 768, 1440 and each stylesheet breakpoint, at rest and under hover and focus: the server's HTML, stylesheets and scripts by hash, then each visible element's text, box and computed styles with animations finished and fonts ready. Identical bytes pass. A difference counts only if it shows on a second capture and exits 1 unless an entry in `sites/<client>/render-accepted.<target>.json` names its commit and the pair Bean saw. An unreached state (a failed sign-in, an empty basket where a filled one was asked for) exits 2. The Custom CSS census scripts (`E:\sgs-tmp\template-rework\overrides\export-custom-css.py`, `verify-count.php`) and the detector (`E:\sgs-tmp\template-rework\class-a\detector\check-custom-css-has-setting.py`) move into the repo
- Touches: scratch mirrors only
- Done when: `python scripts/render-check/render-check.py --self-test` proves on a scratch copy that the same build twice passes; the `cards` layout drawn as commit `9219e649c` drew it fails on the signed-in saved-items view; a failed sign-in exits 2; and the report names every signed-in view, the filled basket, the checkout and an order confirmation as reached
- Depends on: none
- Status: done 2026-11-19. `python scripts/render-check/render-check.py --self-test --jobs 4` passes all five cases on the committed code (reports `E:\sgs-tmp\render-check\selftest\20261119-073407`): the same build twice exits 0 with all 36 states reached; every signed-in view, the filled basket, the checkout and the order confirmation are reached on both sides; the `9219e649c` cards drawing exits 1 with only `account-saved-items` differing; a failed sign-in exits 2; a picture inverted under the same name exits 1 on pixels. Earlier runs on a machine at full load found four faults in the check itself, each fixed and covered by that run: a sign-in that timed out was not retried, a sign-in slower than 20 s was taken for a refused one (it now waits up to 60 s for the cookie and stops at once on the sign-in page's error), a marquee's resting position moved the screenshot by a pixel (elements an endless animation moves are left out of the pixel comparison and still compared by their readings), and the checkout coupon state was read with the order summary still loading on both sides (a state is now unreached while a WooCommerce loading placeholder shows outside the payment areas). As built (`scripts/render-check/README.md`): two scratch copies per run (before and after) instead of one copy swapped, so a difference can be re-captured on both sides; a hash pass of every same-origin response (bytes identical on either of two loads pass), then for the rest an element pass at 375, 768, 1440 and each uncovered stylesheet band, at rest and under forced hover and focus, plus a pixel comparison of the screenshots (pictures whose files did not change, embedded frames and fixed parts outside an open dialog left out); a difference counts only when a second round shows it. Opened states are generic (phone menu, basket drawer empty and filled, both coupon boxes, the account's address editor, the scrolled product page). The seed tries each product server-side until the shop accepts one in a basket (Mama's needs a flavour pick). The self-test has a fifth case beyond the four above (side agent's catch): a picture file changed under the same name fails on pixels. Mama's own saved-items view uses `product-cards`, so the self-test sets the account block's `wishlistLayout` to `cards` on both copies (Eye Care's setting) to exercise the `9219e649c` drawing. A second self-test after the code review (reports `E:\sgs-tmp\render-check\selftest\20261119-092553`, with E: full at 10:00 and three other runs alongside) showed the cards case still catching only `account-saved-items` and the failed sign-in still exiting 2, and found one weakness: under that load a sign-in twice ended with no sign-in cookie (`no wordpress_logged_in cookie after signing in`), so those states came back unreached (exit 2). That fails safe (never a false pass) but wastes a run, so a sign-in that ends with neither the cookie nor the sign-in page's error is now made once more, like one that throws (not yet proven by a self-test run; the logs showed no disk-full error behind it, so load is the likelier cause). The review also made each copy claim its port just before it is made (two runs at once had picked the same port) and copy side b from side a. The census scripts and the detector are in `scripts/render-check/census/` and reproduce the class A figures on `local-mediatest-classa` (70,092 characters in 70 attributes; detector 71 confirmed, 57 likely).

### Task 2: What `main` holds for Indus and Eye Care
- Why: both run `419b4cb6a`, `main` is 143 plugin and theme commits ahead, and a first comparison found four unwanted changes waiting. Read first: `checks.md`; `scripts/local-wp/refresh-from-remote.sh` (it only reads the server); `plugins/sgs-blocks/scripts/deploy_common.py::TARGETS`
- Changes: a scratch copy `local-mediatest-eyeref` holding `eye-care-test`'s database, uploads, extra plugin folders and its own `theme-snapshot-eye-care-test.json` (never pass `local-eye-care` as the local site); a render-check run of `main` against each site's live build; `.claude/reports/2026-11-18-template-rework/backlog.md` listing each difference with its commit and "fix", "make opt-in" or "Bean accepts"
- Touches: scratch mirrors; read-only SSH
- Done when: `backlog.md` lists every difference on both sites with a cause commit, including the four in `checks.md`
- Depends on: 1
- Status: not started; groundwork done 2026-11-19. Both sites run `419b4cb6a` (four sampled files hash-identical on the server). The build checkouts made for this (`E:\sgs-tmp\rc-build-419b`, `rc-build-main`) were removed when E: filled on 2026-11-19: make each again as a worktree under `E:\sgs-tmp` (`git worktree add --detach <path> <commit>`, then in PowerShell `npm ci` and `npm run build` in `plugins/sgs-blocks`, which runs webpack and the post-build transforms). `scratch-mirror.sh` can now copy a scratch copy and `scratch-mirror.sh target <copy> eye-care-test` makes `sync-build.sh` use that target's own theme.json. `eye-care-test` runs four plugins the Eye Care mirror may lack (FluentSMTP, Hostinger AI assistant, MailPoet, WooCommerce Stripe gateway). Next: create `local-mediatest-eyeref` from `local-eye-care`, mark its target, refresh it with `refresh-from-remote.sh local-mediatest-eyeref eye-care-test`, copy those plugin folders read-only from the server, then `render-check.py --from local-mediatest-eyeref --target eye-care-test --before E:\sgs-tmp\rc-build-419b --after <main checkout>` and the same `--from local-indus`. The `419b4cb6a` checkout's own `sync-build.sh` does not know `.scratch-target`, so the run may need this repo's script pointed at that build

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
- Status: step (a) written, not committed or tested, saved as the patch `.claude/backups/2026-11-19/task5a.patch` (uncommitted; all five files, written on `066264f10` and applying cleanly to `main` on 2026-11-19), never applied in the shared folder: apply it in a new worktree (`git apply`) and build there. The detector `plugins/sgs-blocks/scripts/check-named-extension-scope.py --site <copy>` (probe `named-extension-scope-probe.php`) reads the roster and the site's live block registry: on `local-mediatest-classa` it exits 1 with 15,413,644 bytes and 277,541 named-extension attributes on 388 block types not named for them. The change: `generate-extension-attributes.js` also writes `includes/extension-attributes-scope.generated.php` (719 attributes of `named` extensions in 6 groups, each with its blocks; the main schema file is unchanged, since about ten scripts read it), and `extension-attrs-rest-register.php::sgs_extension_attribute_schema_for` leaves a group's attributes off every block it does not name. Next: run the detector on a copy with that build (expect exit 0 and a much smaller payload), open the Cart, Checkout and a page in the editor with no block-recovery prompt, run the render check (`--before <main build checkout> --after <that worktree>`), then commit the detector, the generator and the filter as three commits (FP-5)

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
