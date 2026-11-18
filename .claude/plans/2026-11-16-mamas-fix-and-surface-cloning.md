---
status: active
doc_type: plan
created: 2026-11-16
---

# Mama's Munches: Bean's issue register, section by section, easiest first

## Goal and why

Mama's Munches is a working shop on `mamas-test`, matching her Claude Design draft, ready for the client and for Bean's portfolio at the MIC event on 2026-11-28. The work is Bean's issue register of 2026-11-17 (`sites/mamas-munches-redesign/build/qa/issue-register.md`, 127 items, each with an ID such as `Footer 2a`) and its round two (`issue-register-round-2.md`, 87 items, IDs carried on). Done is every item closed by Bean's eye on `mamas-test` beside the draft, and a test order paid with a Stripe test card from basket to order confirmation.

## Approach

One register section at a time, easiest first (Bean, 2026-11-17). A subagent does the work; the main session checks it and presents it; simple fixes are made as they are found and Bean decides the rest. Rejected: working the whole register at once (items share components, and a fix in one section is lost track of in another), and re-cloning every surface (the 2026-11-15 whole-site run was not presentable). Only the two surfaces Bean marked for it are re-cloned: the basket drawer and the account page.

## How a section is worked

The item method is `plans/2026-11-02-clone-finishing-streams.md`, "How an item is worked". A helper's standing brief is `sites/mamas-munches-redesign/build/qa/section-helper-brief.md`; the main session adds the section's posts and notes. Bean's rule since 2026-11-17: every remaining section is diagnosed, the simple fixes are made as they are found, and only the rest is put to him.

1. **Diagnose and fix the simple ones (subagent).** For every item: reproduce it on `local-mamas` beside the draft at the widths and states Bean names, find the cause in the saved block settings, the block's code and the computed styles, and name its layer: a site setting, a block bug, a missing setting, new behaviour Bean asked for, or a fault the draft shares. A fix is simple, and made on the spot, when the cause is proved, the fix is an existing setting, menu item or page content, and the target is clear; so are the removal of subscription mentions, the page's missing entrances (`entrance-survey.md`), and Custom CSS for a one-off look that a DB query shows no setting can hold. Anything needing code, a new setting, a rebuilt section, new wording or a choice is a proposal. The helper leaves its findings table, its catalogue rows and before-and-after screenshot pairs in `E:\sgs-tmp\mamas-register\<section>\`.
2. **Review (main session).** The saved settings are diffed before and after, the screenshot pairs are looked at, and each proposed cause is checked against the file or the live page (the `verifier` agent when there are many). The findings go into `register-findings.md` and the changes into `fix-catalogue.md`. An unproven cause goes back; it is never passed on.
3. **Propose (to Bean).** Only what is not simple: the item, what is wrong underneath, the options and a recommendation. An approved code fix is universal (FP-9), has a test that fails first, and, where it changes a shared rule, a before-and-after measurement on the three mirrors that can stop it.
4. **Ship and show.** Deploy to `mamas-test` when code changed (`build-deploy.py --target mamas-test --blocks-only`), push the mirror (`scripts/local-wp/push-to-remote.sh local-mamas mamas-test`, dry run first), check the changes on the hosted site in a visible browser, and Bean looks. An item is closed in the findings file when Bean has seen it.

Sections whose posts differ run side by side; a section that shares a component waits for the one that fixes it (Components shared between sections).

## Where things are

- `local-mamas` (http://localhost:8084): the hand-finished content, where fixes are made. Its content, block and theme code and WooCommerce version (11.3.0) match `mamas-test` (compared post by post on 2026-11-17); a section with a code change deploys to `mamas-test` before the mirror is pushed.
- `local-mediatest-mamaslab` (http://localhost:8091): the 2026-11-15 re-clone, kept as the lab for the route work parked in Task 12. `local-mediatest-mamashand` (8090) is a spare copy to drop in Task 12.
- The draft is served with `node scripts/computed-route/tools/draft-viewer.mjs mamas-munches-redesign --port 5180`.
- The parity walker's own list for `mamas-test` is `sites/mamas-munches-redesign/build/qa/parity-baseline-2026-11-16.md`. It cannot see the header, footer or the hand-built parts of Home, and pairs only 19 of Product's 112 elements, so it supports a diagnosis and never closes an item.
- Stripe: WooCommerce Stripe Gateway 11.1.1 runs in test mode on both sites with Eye Care's test keys. No test payment has been run; Apple Pay and Google Pay (Product 15) need her domain registered in Stripe, and no webhook is set.
- Calibration cache `E:\sgs-route-cache` is rebuilt (95 of 97 blocks; `sgs/buybox` and `sgs/theme-toggle` unmeasured). Intake matches the current draft; 74 changed rows carry the route's proposal, not Bean's review. Scratch scripts and logs: `E:\sgs-tmp\mamas-reclone\`.

## Where it stands and what is next (updated 2026-11-18, 03:00)

Bean's first register (`sites/mamas-munches-redesign/build/qa/issue-register.md`, 127 items) is worked and shipped. His second (`issue-register-round-2.md` beside it: his list of the evening of 2026-11-17, his review points of the same night and a "Bean's verdicts so far" section) is where the work is now. IDs carry on across the two files (Header 10, Home 24), so one ID names one row in `register-findings.md` and `fix-catalogue.md`. Bean ruled "no round three: round two finishes only at completion". He reviewed most of round one's items himself across widths, and that review is where round two's list came from, so round one is not re-checked.

**State.** `main` is at `bd80b1a33`, pushed. `mamas-test` runs the plugin and theme at `737e9fd36` (batch ten, the `sgs/account` order-page settings, deployed 2026-11-18 03:15; the marker is read back; batch nine went out at 02:25 as `69e86165b`). The order-page settings are deployed but not yet switched on for post 103. Its content dates from the push of 00:36 on 2026-11-18. `local-mamas` runs the same build and is ahead in content, not pushed: the standard arrows (Contact submit, Help's three cards, three Home links, four on the confirmation page, Sign in and Create account), the footer credit underline at 2px, the Shop cards' buttons pinned, the cookie builder's step spacing, the account area (address cards, details card, order thumbnails, gift note, email tick, "Hello, name", tab headings, the Orders row and single-order page aligned to the draft), the confirmation page (neutral not-viewable hero, the email form's look, the "View order" card, even gaps, white Instagram icon, pink labels), the gift card page (button wording, default £25, paper tiles) and the `919.98px` bound on post 101. Bean closed Shop 18, Product 15, all of Help and Gifts 13 to 15; the rest wait for his proofing, and he will follow up on the account and order confirmation screenshots (pairs of the draft beside the mirror).

**In flight at 03:15.** One helper is still running (its result arrives in the continued session): the gap above the footer and the gold labels site-wide (All pages 6 and 5; scratch `E:\sgs-tmp\mamas-register\r2f-gap-labels\`; it may write any post except 103 and 219 and reports what to change on those two). The `sgs/account` order-page code is built and waiting for its batch: eight commits on `feature/account-order-page` (worktree `E:\sgs-tmp\wt-r2-account-order`), already cherry-picked onto the reusable batch worktree `E:\sgs-tmp\wt-cartdrawer` (keep it), not yet rebased onto the latest `main`, reseeded or gated. Its settings: `ordersRowItemCount` with `ordersRowItemCountOne` and `ordersRowItemCountMany` (`{count}`; the separator belongs in the wording, as in "· {count} items"); `orderStepPlacedNote`, `orderStepProcessingNote`, `orderStepDispatchedNote`, `orderStepDeliveredNote` (`{date}` allowed); `orderDetailItemsHeading`, `orderDetailItemQtyFirst`; `orderDetailOrderAgain`, `orderDetailOrderAgainLabel` (WooCommerce's own order-again link, completed orders only); `orderDetailHelpLabel`, `orderDetailHelpUrl`, `orderDetailHelpUrlSource` (Bean: the Contact page); `menuAddressesCount`, `menuAccountTick`, `menuAccountTickLabel`; and the account button icon no longer carries `sgs/button`'s class, so the 16px Custom CSS rule on post 628 can go. Its builder expects `check-wiring-fingerprint` and `check-element-manifest-conformance` to clear at the reseed; if the second still fails, the three `menu…` attributes' roles are the cause. `git-tidy` has not run because it could remove the batch worktree.

**What landed since the handoff of 2026-11-17** (rows are in `register-findings.md` and `fix-catalogue.md`; helper folders under `E:\sgs-tmp\mamas-register\`):

- Basket page 7 and 8, Checkout 11 to 17 (`r2b-basket-checkout`): one summary card for basket and checkout, the empty basket rebuilt from the site's own blocks, sell everywhere and deliver to the UK only, field error text at 14px.
- Reduced motion, Footer 10, Home 39 (`r2b-reduced-motion`): the Footer 10 underline fault never reproduced, so its cause is unproved; the site rule is now `height: 2px` on the credit link's sweep line (Footer 12, on the mirror) and Bean's eye decides; `touchPause` is `hold` on the three strips.
- All pages 2 and Header 12, the breakpoint blind spot: every upper bound a helper builds is `N.98px` (`SGS_Breakpoints::query_width`, `src/utils/breakpoints.js::queryWidth`), every literal in the plugin and theme is migrated (`plugins/sgs-blocks/scripts/migrate-breakpoint-bounds.py`), and `plugins/sgs-blocks/scripts/check-breakpoint-bounds.py` is a fast-tier gate. Layout at 767, 768, 1023 and 1024 measured identical before and after on Mama's and on scratch copies of the Indus and Eye Care mirrors (`E:\sgs-tmp\mamas-register\round2\bpmeasure.mjs`, `bpdiff2.py`). The site's own Custom CSS held eleven whole-pixel bounds (posts 101, 102, 152, 154, 202, 346; a 919/920 pair on 101): all are `.98` now and the hosted pages print none.
- `sgs/button` link source `add-to-basket` (`addProductId`, `addAfter`): the empty basket page's button reads "Add a Taster Trio · £5" and adds in one tap. Its listener is delegated from the document and attached unconditionally, because the WooCommerce Cart block empties its markup while it loads (proved with `E:\sgs-tmp\mamas-register\round2\add-warm.mjs`, which visits two pages first; a fresh browser context hides the fault).
- Cart drawer: removing the last line keeps keyboard focus on the empty state's button. `sgs/order-items`: the thumbnail's Height setting outranks WooCommerce's `img` rule, and the Custom CSS line on template 219 is gone.
- Ticker under reduced motion (Bean's design): the marquee layer has `reducedMotionMode` (`wrap`, the default, or `swap`) and `swapInterval`. `swap` keeps the strip to one line, shows the whole items that fit and replaces them with the next group every interval with no movement; it pauses on hover, focus, a held touch and a hidden tab. Mama's three strips (posts 154, 176, 178) are on `swap` and their `rmwrap` Custom CSS is gone. A phrase wider than a phone strip wraps onto two lines.
- Removed Custom CSS a deployed fix replaced: the Gifts and Shop button pin (posts 150, 194).
- Batch nine, deployed at 02:25 (rows in `register-findings.md`): a fresh `wp_rest` nonce on a 403 (All pages 4: `includes/class-rest-nonce-refresh.php`, `src/shared/rest-nonce.js::fetchWithNonce`, Spec 27 FR-27-G1a; proved on the mirror and the hosted site as 403, fresh token, 200); `sgs/account` button icons, orders rows with thumbnails and a View label, the gift note, the email tick, per-tab headings, a Block Bindings source `sgs/customer`, and signed-out visitors on `orders`, `edit-address` and `edit-account` sent to sign-in (Spec 27); the Show-to rule `order-not-viewable`; gift card tiles in whole pounds (`Gift_Card_Money::format_whole`) and the button wording with `{amount}` and a default amount (post meta `_sgs_gift_card_button_label`, `_sgs_gift_card_default_amount`).

**Next, in this order:**

1. Take the gap and labels helper's result (above): check it against the register, look at a screenshot of each page it changed, and apply what it reports for posts 103 and 219.
2. Batch ten, the account order page branch: `git rebase main` in the batch worktree `E:\sgs-tmp\wt-cartdrawer` (the eight commits are already on it), reseed and gate with `E:\sgs-tmp\mamas-register\round2\batch5.ps1` (change the copy and log names to batch ten first), publish, fast-forward `main`, push, deploy (`ship12.ps1` beside it is the working script), copy the build from the cache key whose `gate-pass.json` names the commit, sync the mirror. A new attribute needs the lessons in "What a new block or attribute needs" below.
3. Set the new account settings on post 103 and remove the Custom CSS they replace.
4. Run the two content checks ("Before every push"), then push the mirror to `mamas-test`.
5. Hosted checks: `E:\sgs-tmp\mamas-register\round2\add-warm.mjs <base-url>`, `nonce-test.mjs`, and a sweep of every page at 375, 768 and 1440.
6. The remaining screenshot pairs for Bean (`E:\sgs-tmp\mamas-register\round2\pairs.py`, draft left and site right, saved in `...\for-bean\`), then fix what he reports from the account and confirmation screenshots, on the mirror, and push.
7. A code review of `8bf446072..HEAD`: batch nine and the review fixes have had none (the review of `fe0d573c6..875105a94` found no hole in order privacy, REST routes, redirects, escaping or prices and led to `6eb77ff33` and `cfc1cee42`). Editor code and CSS are covered only by the gates and Bean's eye.
8. Framework work Bean proposed and agreed, to start when round two is closed: rebuild the default checkout template more blank, and give the WooCommerce wrapper blocks the controls sites keep overriding. Evidence: the Custom CSS on posts 101 and 102 and on Eye Care's checkout, and the list "Rules a wrapper-block setting should own" in `E:\sgs-tmp\mamas-register\r2b-basket-checkout\findings.md` (coupon and gift card input and Apply button, toggle box, totals dividers, shadow room when a summary shadow is set, `display:flex` beside the delivery option gap, active-field padding when the label sits above, the gift-order tile's outline and legend, billing select padding). Plan it with `/plan`.

**Open with Bean:** the neutral confirmation wording ("Let's find your order." and "For your privacy we only show an order to the person who placed it. Confirm your email below, or sign in to see it.") was written by the main session, so he has not approved it; and WooCommerce's pink "Confirm your email address" banner above an unverified customer's orders (restyle, hide or leave).

**Before every push** export the mirror's posts and run the deploy's own content audit on them (`bash /mnt/e/sgs-tmp/mamas-register/round2/audit-mirror.sh local-mamas` in WSL, then `python plugins/sgs-blocks/scripts/audit-post-content-blocks.py E:/sgs-tmp/mamas-register/round2/audit-local-mamas --check --baseline plugins/sgs-blocks/scripts/oldshape-audit-baseline.json`), and run `python plugins/sgs-blocks/scripts/migrate-media-system/cli.py check --mirror mamas --active on`. A helper saved five alignment settings in the wrong shape on post 101 and the next deploy stopped twice (the old-shape audit, then the media guard, which also reads revisions); `cli.py fix --mirror mamas --apply` and `cli.py fix --remote mamas-test --apply` cleared the second (that tool's name for the mirror is `mamas`, not `local-mamas`).

**Framework debt found in round two** (each is a code task, none blocks the event): a pick group's Undo needs an on/off setting (hidden by Custom CSS here); `sgs/product-card`'s `cardMaxWidth` description in `block.json` does not mention `none` (`render.php` honours it since `e864e867d`); a `sgs/message-preview` line inside the Cart or Checkout block would show its fallback after the block redraws until the shopper types again (unproven, no site places one there); `scripts/local-wp/push-to-remote.sh` still does not run the stored-content audit or the media check before it copies (see "Before every push"); the Footer 10 site rule is now only `height: 2px` on the sweep line, and `plugins/sgs-blocks/src/blocks/business-info/style.css` keeps its `transform: scaleX()` reveal; the account order page's layout lives in about 13,700 characters of Custom CSS on post 103 for want of layout settings (batch ten and step 3 above retire it); the `swap` mode leaves a single item wider than the strip left-aligned once it wraps; `sgs/button`'s `top` source still binds per element; the Home hero is 3px wider than its box between 640 and 767 and a product card's picture area is slightly wider than its box at 320 (neither scrolls the page); `sgs/order-items` has no settings for row padding or the total row; the cart block lacks settings for the close target size, the Remove link size, the stepper number width and the gift box's styling; `scripts/local-wp/patch-block-attrs.py` replaces a whole `sgsCustomCss` string on `set` and re-serialises an empty object `{}` as `[]` inside `sgsMotion`; a block default that names a palette slug a client lacks (carried). Tests failing on `main` since before 2026-11-17: five PHP (`BorderElementParityTest` testimonial-slider `i_hover_gradient`, three in `MotionPauseRenderTest`, one in `MotionRingTest`) and two JS snapshots in `configurator-schema-compat`.

**What a new block or attribute needs before the full gate tier passes** (learned on `sgs/message-preview`, three rounds): `block_composition` entries in `plugins/sgs-blocks/scripts/seed-composition-roles.py`; an editor canvas that reads every attribute plainly (the wiring gate does not count a dynamic `Control` component); colours printed through `sgs_text_states_css`, `sgs_text_decls` and `sgs_fill_decls`; border width 0 by default in the stylesheet; no dense inspector panel (`inspector-scan` rule `03-dense-panel-candidate`, never raise its backlog); a `tests/fixtures/motion/render-paths.json` entry for a block that offers motion parts. A helper's brief for new code names these.

**Bean's rulings of 2026-11-17 beyond the register:** review stars pink everywhere; no bake date anywhere (Zainab bakes fresh for every order); the gift card is emailed, gift notes for cookie orders are written; Gift Box 12 Zookies and Care Bundle six weekly deliveries of 7 (for Zainab to confirm); information notices pink, errors red; nothing about subscriptions on the account page; the cookie picture is drawn by the site's own CSS from general hooks, never cookie settings in the buy box; optional deploy steps are skipped (no `--editor-check`, no motion QA), `--allow-dirty` and `--skip-verify` are never used. Round two's rulings: no round three; the Taster Trio's postage is included when the basket holds only Trios (normal rules otherwise) and the empty-basket button adds a Trio in one tap with default choices; the cookie builder's Undo button is removed while the swap of the oldest flavour at a fourth pick stays (it is the draft's behaviour, a live count explains it); the scrollbar track is brand pink (the dark pink read as red); the sort menu keeps all six options with "Default" first; checkout sells to all countries and delivers to the UK only (a card registered abroad must work); the basket's and checkout's summary are one design, with the checkout's input and button sizes and yellow Apply buttons; the blind spot at 1023 and 767 is fixed across the framework now, with the other pairs; proof as in step 4 above.

**Bean's rulings of 2026-11-18** (all in `issue-register-round-2.md`, "Bean's verdicts so far"): the "Taster Trio for a friend" row in a filled drawer is dropped; gift card tiles read "£15" and the button follows the draft; account addresses are the closest honest version (one delivery and one billing card, no address book, no "Make default"); the Help cards keep the outlined circle, while the three Home button links, "View order", "Send one", "Create an account", "Posted" and "Back to the kitchen" take the standard arrow (`sgs/button` icon `arrow-right`: on a filled button a disc, size 32, `mm-cocoa`, arrow `mm-paper`, icon 16, gap 10px; on a text-style button the plain arrow, icon 16, gap 6px), and typed arrows inside sentences stay; order confirmation keeps the order summary strip and the two address cards the draft lacks; no content mentions bake days (the account tick reads "Email me about new flavours"); screenshots for Bean come as pairs, the draft beside the site, at 375, 768 and 1440; "Something not right? Message Zainab" goes to the Contact page; tickers follow reduced motion, with his swap design built.

**Open, small, each with its section:** Gifts: the letter's logo overlaps the message on phones; the hero text narrows between 700 and 767. Product: the flavour hint on products with no pack size. Footer 10 (the attribution underline thinning on wide screens) was not reproduced by two helpers up to 1440px; Bean still sees it, so the mirror carries the 2px sweep line (Footer 12) and his eye decides. Spec 38A FR-38A-19's size budget for the reveal module was restated as 1.5 kB gzipped (the module is 1,396 bytes gzipped; the old "minified" figure was already untrue): Bean has not ruled on the unit. Site-wide, fixed on the mirror and waiting for the push: the 16px sideways scroll at 320 (the footer's "@mamasmunches" heading is one unbreakable word; the draft has the same fault; the font shrinks below 375px).

**For Zainab (through Bean):** the Terms page's gaps (legal name and trading status, address, the 48-hour window); the Privacy page's gaps (ICO number, how long messages and unused accounts are kept, other services that see customer details); the cookie counts; whether several Taster Trios still fit a letterbox; the two Help card summary lines ("How we look after your details." and "The small print on orders and delivery."); whether she emails tracking numbers (the confirmation page leaves the draft's "tracking link" promise out); which diets she can bake for safely beyond vegan, egg-free and milk-free.

**Mailing list:** the sign-up tick is her list (user meta `sgs_marketing_opt_in` and `sgs_marketing_opt_in_at`). WordPress sends no newsletter by itself; a newsletter plugin and a tick at checkout for guests are later choices, not built.

## Out of scope

Building subscriptions (deferred by Bean; every mention is hidden). Indus and Eye Care (never touched). Accepted differences are only Bean's: subscriptions hidden, the send-to-hospital menu item out, the account banner with `mamas-test`'s wording, and each "keep this" in the register (Contact 8). Each is recorded in `register-findings.md`, and in `sites/mamas-munches-redesign/build/qa/divergences.json` where the walker can pair the element (it cannot on the hand-built header, footer and drawer). The ledger's 42 withdrawn `touch-target` entries are removed (2026-11-17).

## Order

Tasks 1 to 11 run in order, one section at a time: each fixes shared components the next relies on. Task 12 touches only route code and the lab, so it can run beside any of them. Deploys and pushes to `mamas-test` run one at a time, at the end of each section.

## Risks

- A push from `local-mamas` replaces `mamas-test`'s whole database: take the script's backup, and re-check Stripe after the first push.
- A block fix changes every site that uses the block. Signal: `build-deploy.py`'s gates, and the canary before `mamas-test`.
- The recognisers removed by the 2026-11-02 rewind (`git log d79135af4..0ea1a6cb2~1 -- scripts/computed-route`) include ones a re-clone needs. Re-apply one rule at a time; that range as a whole made the clones worse.

## Session breaks

Read this plan, the findings file and `git log --oneline -15`. Find the first task whose Status is not done and the first item in its findings table that is not closed; rerun that item's check.

## First action

Start Task 1's diagnosis: brief a subagent with "How a section is worked" step 1 and the Footer section of the register.

## Wave 1: hand fixes, by section

### Task 1: Footer
- Why: 11 points, nearly all hover styles on one hand-built surface. Read first: the register's Footer section; "How a section is worked"
- Changes: Footer 1 to 8; the footer-shop menu loses "Subscribe & save" (item 396); the shared social icons. Every cause is a setting unset on this site (`register-findings.md`, Footer). Bean approved the fixes on 2026-11-17: Footer 1 matches the draft's balanced two lines, Footer 6 takes the logo teal #0E7E80
- Touches: `local-mamas` footer post and menus; any block the cause names; `mamas-test`
- Done when: every Footer row in `register-findings.md` is closed by Bean on `mamas-test`
- Depends on: none
- Status: done: fixed, shipped and approved by Bean on `mamas-test` on 2026-11-17

### Task 2: Nav drawer
- Why: 8 points. Read first: the register's Nav drawer section
- Changes: Nav drawer 1 to 5 (entrance animations, the three social cards, card height through the shared picture box, menu links that go nowhere, item 492 removed)
- Touches: `local-mamas` drawer post and menus; `mamas-test`
- Done when: every Nav drawer row is closed by Bean, and each drawer link opens its page at 375
- Depends on: Task 1 (social icons)
- Status: done: approved by Bean on `mamas-test` on 2026-11-17. Nav drawer 4 is held by Custom CSS on the two pictures. Parked framework work: an unwrapped SGS picture with a set height loses it to WooCommerce's `.woocommerce img { height: auto }` on any shop page; a two-class selector for every unwrapped picture was built, failed its size check on three mirrors and was reverted (it unmatched the buy box's photo frame rule and blew up Eye Care's header logo on its shop page); a later fix makes the selector opt-in for a plain rendered `img` (`includes/media/render-slot.php`) and explains the Eye Care logo first (`sites/mamas-munches-redesign/build/qa/register-findings.md`, Nav drawer)

### Task 3: Header
- Why: 9 points, one of them a new behaviour (the trust bar ticker). Read first: the register's Header section; Eye Care's trust bar on `eye-care-test` (read only)
- Changes: Header 1 to 9; menu item 350 removed. Header 9 (a pink slider background) is Bean's question, answered with a picture of both
- Touches: `local-mamas` header post; the trust bar's block if the ticker is a missing behaviour; `mamas-test`
- Done when: every Header row is closed by Bean, checked at 375, 768, 1024 and 1440
- Depends on: none
- Status: done: approved by Bean on `mamas-test` on 2026-11-17. Left open by him: whether the sticky header sliding under WordPress's admin bar for a signed-in visitor joins the list. The scrollbar's pink track reached `mamas-test` through the copied global-styles post; `push-theme-snapshot.py` was not run (it warns it would overwrite 33 keys edited on the site), so the theme file there takes the snapshot at the next theme deploy

### Task 4: Contact
- Why: 11 points; its accordion and gutters are shared. Read first: the register's Contact section; the Help page's accordion (the working one)
- Changes: Contact 1 to 11 (Contact 8 is "keep", recorded as an accepted difference)
- Touches: page 148 on `local-mamas`; `sgs/accordion` if a cause is in the block; `mamas-test`
- Done when: every Contact row is closed by Bean
- Depends on: Task 1 (social icons)
- Status: all eleven items and the ten entrances are on `mamas-test` (2026-11-17); waiting for Bean to close them. Parked framework work: an accordion item's category label prints only while the filter is on (Contact switches it on and hides its bar); Bean asked why code was needed and the answer is that none is

### Task 5: Help
- Why: 9 points. Read first: the register's Help section
- Changes: Help 1 to 9. Help 6 (policy boxes or buttons to the policy pages) is Bean's question, answered with a recommendation
- Touches: page 152 on `local-mamas`; `mamas-test`
- Done when: every Help row is closed by Bean
- Depends on: Task 4 (accordion)
- Status: Help 1 to 9 are on `mamas-test` since the ship of 2026-11-17 16:27; waiting for Bean to close. Help 1 is the accordion's filter band (pink, full width, the line under the chips) with the answer count below it; Help 6 is two buttons, a Terms page (725) and a Privacy page (3, `/privacy-policy/`), both with bracketed gaps for Zainab

### Task 6: Sign-in
- Why: 5 points, two of them WooCommerce behaviour (registration fields, where sign-up lands). Read first: the register's Sign-in section
- Changes: Sign-in 1 to 5
- Touches: page 628 on `local-mamas`; the account blocks if a cause is there; `mamas-test`
- Done when: every Sign-in row is closed by Bean, and a new test account lands on `/my-account/`
- Depends on: none
- Status: Sign-in 1 to 5 are on `mamas-test` since the ship of 2026-11-17 16:27; waiting for Bean to close: first and last name side by side from tablet up, the email-me tick (saved as `sgs_marketing_opt_in` with its date), a signed-in visitor sent to the account page, tested with two real sign-ups on the mirror (`shopper2`, `shopper3`). No password box (Bean): WooCommerce emails a set-password link

### Task 7: Shop
- Why: 14 points; its product card and filter pills are shared. Read first: the register's Shop section and Gifts 7 to 9b
- Changes: Shop 1 to 14. Bean's questions answered with a recommendation: Shop 3 (the reload on "All"), Shop 6 (a dropdown that joins the sort pill), Shop 12 (the selling point that replaces the subscription card), Gifts 9 (the button wording)
- Touches: shop template 194 on `local-mamas`; the product card and filter blocks; `mamas-test`
- Done when: every Shop row is closed by Bean
- Depends on: none
- Status: Shop 1 to 14 are on `mamas-test` since the ship of 2026-11-17 16:27; waiting for Bean to close: one category at a time and "All" without a reload (`sgsChipSingle`), the joined sort list (theme mod `sgs_shop_sort_arrow` `joined`, Chromium only), "Pick flavours" on every product with options, and the allergy card in place of Subscribe & save (Bean's wording; never the words "gluten-free")

### Task 8: Gifts
- Why: 13 points. Read first: the register's Gifts section
- Changes: Gifts 1 to 12
- Touches: the Gifts page on `local-mamas`; `mamas-test`
- Done when: every Gifts row is closed by Bean, and the note updates as it is typed
- Depends on: Task 7 (product card, filter pills)
- Status: Gifts 1 to 12 are on `mamas-test` since the ship of 2026-11-17 16:27; waiting for Bean to close. Gifts 11 is the new `sgs/message-preview` and `sgs/message-preview-line` blocks (the letter updates as the visitor types; no button). Open: on phones the letter's logo overlaps the message text; the hero text narrows between 700 and 767 wide

### Task 9: Product pages
- Why: 15 points on Zookies, then three on every other product. Read first: the register's two Product sections
- Changes: Product 1 to 15, then Other products 1 to 3 (every buy box follows the Zookies template; the gift card differs only on the buy box's right side); the shared reviews slider
- Touches: the single-product template and products on `local-mamas`; `sgs/buybox` and the slider if a cause is there; Stripe (Product 15); `mamas-test`
- Done when: every Product and Other products row is closed by Bean
- Depends on: Task 7 (product card)
- Status: Product 1 to 14 and Other products 1 to 3 are on `mamas-test` since the ship of 2026-11-17 16:27; waiting for Bean to close: Taster Trio, Gift Box and Care Bundle are variable products with Zookies' base, chips and flavours (eight variations each; one "any" variation is skipped by `Product_Manifest::build`), the gift card page (template 346) has the product page's frame with amount tiles and a custom amount of £10 to £100, the related cards read each product's WooCommerce Upsells (`linkedProductKind`), the gallery pins wherever the layout is two columns. Product 15 (Google and Apple Pay): the buy box now fires `woocommerce_after_add_to_cart_form`, so Stripe's express buttons can print; not yet seen on the hosted product page. Open: the flavour hint reads "Up to 3, split evenly" on products with no pack size; the gift card tiles read "£15.00" and its button "Add gift card to basket"; confirm on a real basket that a £10 custom card shows no saving

### Task 10: Home
- Why: 23 points, the hardest: a hero that does not respond to the screen (Home 7) and a broken cookie builder (Home 11 to 14). Read first: the register's Home section
- Changes: Home 1 to 23; Home 7 gets its own diagnosis first, the hero against the draft at eight widths from 320 to 1920. The site check's one failure belongs here: no page renders the "Build your Zookie" choice flow that `build/page-map.json` lists (the hand-finished Home builds the builder from `sgs/buybox`), `sites/mamas-munches-redesign/build/qa/site-check/2026-11-17T01-35-41/result.md`
- Touches: page 154 on `local-mamas`; the hero, builder and slider blocks; `mamas-test`
- Done when: every Home row is closed by Bean
- Depends on: Tasks 2 (picture box), 3 (trust bar), 4 (gutters), 9 (reviews slider)
- Status: Home 1 to 23 are on `mamas-test` since the ship of 2026-11-17 16:27; waiting for Bean to close: the cookie picture is the buy box's own preview drawn by the site's Custom CSS from three public hooks (the chosen options' colours, an `is-changed` class, restylable dots), with the pack tiles and the button under it; the gift row has arrows, dots and drag on phone and tablet; the review cards take hover at the slider's end. Open: the builder's step numbers read 2, 3, 4 on the left and 1 on the moved "How many" group

### Task 11: Checkout and order confirmation
- Why: Checkout 1 names no single fault: Bean says the checkout's problems are mainly the ones already solved on Eye Care's test site, and the confirmation page waits on a test purchase. Read first: the register's last two sections; `sites/eye-care-ward-end/build/qa/decided.md` and the checkout on `eye-care-test` (read only: its saved Checkout block settings, its Custom CSS and the checkout commits in `git log`)
- Changes: the diagnosis lists what was fixed on Eye Care's checkout and which of those faults Mama's has, then any difference from Mama's draft that remains, with screenshot pairs; a fix made in a block for Eye Care is already live here, so what remains is this site's settings (card fields through `sgsStripeMatchFields`) and anything Eye Care solved with its own Custom CSS, which is moved into the block if both sites need it; a Stripe test order is placed and the confirmation page shown to Bean beside the draft
- Touches: checkout and order-confirmation templates on `local-mamas`; a checkout block if a shared fix belongs there; `mamas-test`
- Done when: Bean has closed the checkout list and seen the confirmation page of a paid test order
- Depends on: Task 9
- Status: the checkout is on `mamas-test` since the ship of 2026-11-17 16:27; waiting for Bean to close (thirteen settings fixes, 13px small text, "Pay £8.95", the terms line under the button, the lock, "Secure" on phones, cash on delivery off, taxes off because the business is not VAT-registered). Bean's rulings: the phone field's label stays (nothing sends delivery texts); no postcode lookup (Eye Care's temporary solution is none, Spec 27 FR-30-23); the phone "Show order summary" bar is parked until after the event (the theme hides it below 920px on purpose); Klarna stays on (it shows live only if Zainab enables it in her Stripe account). The order confirmation (template 219) is rebuilt by hand and shipped: Bean saw the paid test order's page beside the draft and asked for a full rebuild, with no bake date anywhere. Waiting for code on `feature/order-confirmation-parts` (`E:\sgs-tmp\wt-orderparts`, commits bead3ec88, 0bf13dceb, 44db28691; needs the batched reseed): the item list with thumbnails and "Paid" for the slot `oc-items`, the gift-note card (`oc-gift-note`), the signed-in "View order" card (`oc-view-order`); then a guest who has not confirmed their email no longer sees an empty "What's coming" card

## Wave 2: the surfaces Bean called too different to list

### Task 12: The route clones one surface onto the lab, safely
- Why: a route run that clones one surface must never touch `local-mamas` (written when Basket drawer 1 and Account 1 were to be re-cloned; both were hand-built instead, Task 13). Read first: `scripts/computed-route/calibration-targets.json`, `manifest.mjs`, `lib/site-build-map.mjs::rowsForSite`, `lib/template-copies.mjs`
- Changes:
  - [ ] a `local-mediatest-mamaslab` entry in `calibration-targets.json` (`mirrorOf: mamas-test`), and a manifest for the lab that leaves the one for `local-mamas` alone
  - [ ] a lab run writes its walker files, origin files and ledger additions beside the lab's manifest, never over the committed ones that match `mamas-test` (the 2026-11-15 re-clone's copies are in `E:\sgs-tmp\mamas-reclone\reclone-build-files\`)
  - [ ] a run limited by `--only` builds no shared template copy unless that template is named, and refuses a template edited after the site build saved it (`site-run.mjs::runKeys`)
  - [ ] the basket drawer and the account's inner panels are surfaces the route can name (`lib/intake-skeletons.mjs::SURFACE_KINDS`, `lib/manifest-build.mjs::matchRecord`)
  - [ ] `apply.mjs` writes `no-setting-review.json` per surface, and `site-run.mjs` walks a surface whose apply gate failed
- Touches: route scripts, the lab mirror
- Done when: `site-run.mjs mamas-munches-redesign --site local-mediatest-mamaslab --only my-account` finishes every stage, `wp post get 103 --field=post_modified` on `local-mamas` is unchanged, no `wp_template` post on the lab is newer than before the run, and `git status --short sites/mamas-munches-redesign/build` shows no committed file changed
- Depends on: none
- Status: parked, not needed for the event. On 2026-11-17 three read-only investigations found that the basket drawer and the account area were the existing blocks with their settings never set, and that the order confirmation was never built; each was hand-built the same day (Task 13, Task 11). The route work listed here stands as framework work for after 2026-11-28; Bean has not ruled on dropping it
- Parked route work, not needed for these two surfaces: the order confirmation as a surface (S-32); the stale manifest entry for the gift-finder flow (post 159); intake reading `facts.json` before it is refreshed (the first run after a draft edit proposed 0 rows); a walk-only run of the template surfaces; Mama's `build/logo-svgparts.json` and a full theme-snapshot re-extraction; `sgs/buybox` calibration and `sgs/decorative-image`'s default paint; a tree comparison tool (`tools/tree-compare.mjs`); Fill's "no setting" report (3,224 reported, 699 real: run `/second-opinion` on the cause first); the walker's blindness to hand-built parts

### Task 13: Basket drawer and account page finished by hand
- Why: Basket drawer 1, Account 1 and Account 2. Read first: the gap tables in `E:\sgs-tmp\mamas-register\inv-basket-drawer` and `inv-account`, and the sections "Basket drawer finished by settings" and "Account area finished by settings" in `sites/mamas-munches-redesign/build/qa/register-findings.md`
- Changes: the `sgs/cart` block's settings in the header (post 178) and the `sgs/account` block's settings on page 103 set to the draft; the notice colours in the snapshot's `settings.custom.colourRoles`; then the code on `feature/cart-drawer-options` merged and its settings switched on
- Touches: posts 178 and 103 on `local-mamas`, `sites/mamas-munches-redesign/theme-snapshot.json`, the cart block, `mamas-test`
- Done when: Bean has closed Basket drawer 1, Account 1 and Account 2 on `mamas-test`
- Depends on: none
- Status: hand-finished by settings on 2026-11-17 and round two's code on `mamas-test` (batches four to seven, plugin and theme at `03a8fb2bd`); Bean has not closed any of it, and has not yet reviewed Account 3, Order confirmation 2 or Basket drawer 7 and 8. Basket drawer: the `sgs/cart` block in the header (post 178) now has the stepper, a text Remove link, the "View full basket" link, the free-delivery band and note controls, the opt-in open on add, the values-only options wording, the gift box (`panelGiftShow`) and the centred empty state with a one-tap Taster Trio add; a clean-up of the logo size as a setting is with a helper. Account (page 103): opens on Orders with pill navigation; a signed-out visitor to the card-view page goes to `/sign-in/`; notices are pink for information and red for errors (the snapshot's `settings.custom.colourRoles`); test order #835 belongs to `shopper2`. Needs code, proposed to Bean, not started: order thumbnails and a labelled "View order" on the orders list, a default-address flag with Make default and Remove, a gift-note card on an order, the marketing tick on Account details

### Task 14: Proof
- Why: the Goal. Read first: `scripts/computed-route/site-check.mjs`
- Changes: none
- Touches: `mamas-test`
- Done when: `node scripts/computed-route/site-check.mjs mamas-munches-redesign --site mamas-test` reports 0 failed, the main session's own checks pass (sideways scroll at 13 widths, reduced motion, keyboard focus, signed-out states, numbers), Bean has ticked his per-page checklists for round two by eye, every row in both registers is closed by Bean, an order paid with Stripe's test card reaches the order confirmation, and Bean signs the site off
- Depends on: Tasks 1 to 13 and the round-two work
- Status: not started. Bean's ruling of 2026-11-17: round one is not re-checked (he reviewed it across widths himself); the checklists cover round two only, and the first three are the surfaces he has never reviewed (account area, order confirmation, the basket drawer's gift tick and empty state)
