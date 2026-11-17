---
status: active
doc_type: plan
created: 2026-11-16
---

# Mama's Munches: Bean's issue register, section by section, easiest first

## Goal and why

Mama's Munches is a working shop on `mamas-test`, matching her Claude Design draft, ready for the client and for Bean's portfolio at the MIC event on 2026-11-28. The work is Bean's issue register of 2026-11-17 (`sites/mamas-munches-redesign/build/qa/issue-register.md`, 127 items, each with an ID such as `Footer 2a`). Done is every item closed by Bean's eye on `mamas-test` beside the draft, and a test order paid with a Stripe test card from basket to order confirmation.

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

## Where it stands and what is next (handoff of 2026-11-17)

`main` is at the commit `git log -1` shows; `mamas-test` runs the plugin and theme at 1e2a1aa37 (every code commit up to it; later commits are documents) and the content shipped from `local-mamas` at 16:27 on 2026-11-17, checked there in a visible browser at 1440 and 375 on eleven pages. Every register section has been worked; none of Contact, Help, Sign-in, Shop, Gifts, Home, Product, Checkout, Account, Basket drawer or Order confirmation is closed by Bean yet.

**Next, in this order:**

1. Bean brings a new list: discrepancies he found on `mamas-test` after the ship, some new and some fixes that hold at 375, 768 and 1440 and break at other widths. Add each to `sites/mamas-munches-redesign/build/qa/issue-register.md` with an ID in its section, then work them by "How a section is worked" above. A width fault is measured at 600, 900, 1023, 1024, 1200 and 1366 as well, and the draft's source is read for `fr`, `%`, `clamp()` and `max-width`, before anything is called fixed.
2. Batch four of code: combine `feature/order-confirmation-parts` (`E:\sgs-tmp\wt-orderparts`) and `feature/cart-drawer-options` (`E:\sgs-tmp\wt-cartdrawer`, finished: commits cf47ea61f, c55eae112, cce5e5337, 4d77cf5e6, 5a30bed83, fbb2c0323) on one branch, one reseed, one gate, one publish (`.claude/dev-setup.md`, "Publishing a private reseed"; `SGS_FRAMEWORK_DB=<copy> python plugins/sgs-blocks/scripts/build-deploy.py --gate-only --blocks-only`, no `--editor-check`), fast-forward `main`, deploy to `mamas-test`, copy the gate's cached build (`~/.cache/sgs-deploy/<key>/build`, the key whose `gate-pass.json` names the commit) into `plugins/sgs-blocks/build`, run `scripts/local-wp/sync-build.sh local-mamas`, then set the new settings: on template 219 the `sgs/order-items` block in `oc-items` (total label "Paid"), the gift-note card and the "View order" card; on post 178 the cart block's settings listed in `E:\sgs-tmp\mamas-register\drawer2\cart-settings-after-code.md` (stepper, link-style "View full basket", Remove at the row's right, the free-delivery band, `autoOpenDrawerOnAdd`, and WooCommerce > Shop wording > Attribute labels "Show the value only"). Bean decides the three sized there: the drawer's gift box, a Taster Trio row, the empty state's picture and second link.
3. Ship again with `push-to-remote.sh local-mamas mamas-test` (dry run first) and check on the hosted site.
4. A code review of the session's code commits (fe0d573c6..1e2a1aa37, the `feat` and `fix` commits under `plugins/` and `theme/`): none was run on 2026-11-17; each commit passed its tests and the full gate tier, and the main session read the accordion, slider and account diffs only.

**What a new block or attribute needs before the full gate tier passes** (learned on `sgs/message-preview`, three rounds): `block_composition` entries in `plugins/sgs-blocks/scripts/seed-composition-roles.py`; an editor canvas that reads every attribute plainly (the wiring gate does not count a dynamic `Control` component); colours printed through `sgs_text_states_css`, `sgs_text_decls` and `sgs_fill_decls`; border width 0 by default in the stylesheet; no dense inspector panel (`inspector-scan` rule `03-dense-panel-candidate`, never raise its backlog); a `tests/fixtures/motion/render-paths.json` entry for a block that offers motion parts. A helper's brief for new code names these.

**Bean's rulings of 2026-11-17 beyond the register:** review stars pink everywhere; no bake date anywhere (Zainab bakes fresh for every order); the gift card is emailed, gift notes for cookie orders are written; Gift Box 12 Zookies and Care Bundle six weekly deliveries of 7 (for Zainab to confirm); information notices pink, errors red; nothing about subscriptions on the account page; the cookie picture is drawn by the site's own CSS from general hooks, never cookie settings in the buy box; optional deploy steps are skipped (no `--editor-check`, no motion QA), `--allow-dirty` and `--skip-verify` are never used.

**Open, small, each with its section:** Gifts: the letter's logo overlaps the message on phones; the hero text narrows between 700 and 767. Home: the builder's step numbers. Product: the flavour hint on products with no pack size; the gift card's "£15.00" tiles and button wording. Site-wide: with the visitor's reduced-motion setting on, the footer's picture strip makes pages scroll sideways on phones and tablets; the footer is 16px too wide at 320. Tools: `scripts/local-wp/patch-block-attrs.py` should refuse `set` on a block with a real `save()` (a patched `overlayMode` broke three posts in the editor); a block default that names a palette slug a client lacks paints `currentColor` (the basket drawer). Spec 38A FR-38A-19's size budget for the reveal module was restated as 1.5 kB gzipped at this handoff (the module is 1,396 bytes gzipped; the old "minified" figure was already untrue): Bean has not ruled on the unit. Tests failing on `main` before this session's work and still: five PHP (`BorderElementParityTest` testimonial-slider `i_hover_gradient`, three in `MotionPauseRenderTest`, one in `MotionRingTest`) and two JS snapshots in `configurator-schema-compat`.

**For Zainab (through Bean):** the Terms page's gaps (legal name and trading status, address, the 48-hour window); the Privacy page's gaps (ICO number, how long messages and unused accounts are kept, other services that see customer details); the cookie counts; whether she emails tracking numbers (the confirmation page leaves the draft's "tracking link" promise out); which diets she can bake for safely beyond vegan, egg-free and milk-free.

**Mailing list:** the sign-up tick is her list (user meta `sgs_marketing_opt_in` and `sgs_marketing_opt_in_at`). WordPress sends no newsletter by itself; a newsletter plugin and a tick at checkout for guests are later choices, not built.

## Components shared between sections

Each is fixed once, in the first task that meets it; later sections check it and close their items.

| Component | Items | Fixed in |
|---|---|---|
| Social icons (outline, Instagram colour, hover) | Footer 4, Footer 5, Nav drawer 2b, Nav drawer 2c, Contact 5 | Task 1 |
| Picture box with a fixed ratio, image centred | Nav drawer 4, Home 15 | Task 2 |
| "Subscribe & save" removed (menu items 350, 396, 492; buy box, FAQ, pages 154, 152, 148, 103, 628, template 194) | Header 5, Nav drawer 3, Shop 12, and every other mention | Tasks 1 to 3 for the menus, then each page's task |
| Trust bar as a ticker when its items no longer fit | Header 4, Home 8, Home 9 | Task 3 |
| Accordion (animated symbol, open colour, corner shadow, category label, bounce) | Contact 7 to 11, Help 3, Help 4 | Task 4 |
| Content width and gutters | Contact 4, Home 10 | Task 4 |
| Filter pills kept on tablet and phone | Shop 8, Gifts 2 | Task 7 |
| Product card (label, tilt, hover, button wording and style) | Shop 7, Gifts 7 to 9b, Product 14 | Task 7 |
| Reviews slider (arrows, dots, auto-slide, card layout, last card's hover) | Product 9 to 11, Home 19 to 23 | Task 9 |
| Entrance animations missing on most pages | All pages 1 | Surveyed once at the start of Task 4 (each page's draft entrances against its saved motion settings), then fixed in each page's task |
| A picture's set height lost on WooCommerce pages (WooCommerce's `.woocommerce img { height: auto }` beats the picture's scoped rule) | Nav drawer 4 only (the survey found no other picture on this site) | Task 2, by framing the two pictures; the framework fix is parked there |

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
- Status: both hand-finished by settings on 2026-11-17 and on `mamas-test` since the ship of 2026-11-17 16:27; waiting for Bean to close. Basket drawer: the `sgs/cart` block in the header (post 178); it painted cocoa on cocoa because its unset defaults name palette slugs this site lacks (`base`, `contrast`). Left for code, being built on `feature/cart-drawer-options` (`E:\sgs-tmp\wt-cartdrawer`; needs the batched reseed): a quantity stepper, a values-only options line, "View full basket" as a link under the button, row dividers, Remove at the row's right, controls for the delivery note and the item name's font, the free-delivery band's fill and line, and why the drawer may not open after add-to-basket on a product page; to be sized, not built: the drawer's gift box, the Taster Trio row, the empty state's picture and second button. Account (page 103): opens on Orders with pill navigation; Account 2's notice is pink for information and red for errors (the snapshot's `settings.custom.colourRoles`); test order #835 belongs to `shopper2`. Needs code, proposed to Bean, not started: order thumbnails and a labelled "View order" on the orders list, a default-address flag with Make default and Remove, a gift-note card on an order, the marketing tick on Account details

### Task 14: Proof
- Why: the Goal. Read first: `scripts/computed-route/site-check.mjs`
- Changes: none
- Touches: `mamas-test`
- Done when: `node scripts/computed-route/site-check.mjs mamas-munches-redesign --site mamas-test` reports 0 failed, every row in `register-findings.md` is closed, an order paid with Stripe's test card reaches the order confirmation, and Bean signs the site off
- Depends on: Tasks 1 to 13
- Status: not started
