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
- `local-mediatest-mamaslab` (http://localhost:8091): the 2026-11-15 re-clone, the lab for the two re-clones. `local-mediatest-mamashand` (8090) is a spare copy to drop in Task 12.
- The draft is served with `node scripts/computed-route/tools/draft-viewer.mjs mamas-munches-redesign --port 5180`.
- The parity walker's own list for `mamas-test` is `sites/mamas-munches-redesign/build/qa/parity-baseline-2026-11-16.md`. It cannot see the header, footer or the hand-built parts of Home, and pairs only 19 of Product's 112 elements, so it supports a diagnosis and never closes an item.
- Stripe: WooCommerce Stripe Gateway 11.1.1 runs in test mode on both sites with Eye Care's test keys. No test payment has been run; Apple Pay and Google Pay (Product 15) need her domain registered in Stripe, and no webhook is set.
- Calibration cache `E:\sgs-route-cache` is rebuilt (95 of 97 blocks; `sgs/buybox` and `sgs/theme-toggle` unmeasured). Intake matches the current draft; 74 changed rows carry the route's proposal, not Bean's review. Scratch scripts and logs: `E:\sgs-tmp\mamas-reclone\`.

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
- The two re-clones need route work that may outrun the deadline. Signal: Task 12 not done by 2026-11-24; then the basket drawer and account page are hand-built from the draft with `scripts/wp-build-page.js`, and the route work stays parked here.
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
- Status: Footer 1 to 9 and the menu item are fixed and on `mamas-test` (pushed 2026-11-17, settings only); waiting for Bean to close each item there

### Task 2: Nav drawer
- Why: 8 points. Read first: the register's Nav drawer section
- Changes: Nav drawer 1 to 5 (entrance animations, the three social cards, card height through the shared picture box, menu links that go nowhere, item 492 removed)
- Touches: `local-mamas` drawer post and menus; `mamas-test`
- Done when: every Nav drawer row is closed by Bean, and each drawer link opens its page at 375
- Depends on: Task 1 (social icons)
- Status: every Nav drawer item, the menu badges and the `Zainab@` address are fixed and on `mamas-test` (2026-11-17; the menu link fix is commit `2b89c2945`, deployed); waiting for Bean to close them. Nav drawer 4 is fixed by Custom CSS on the two pictures: the fix at the source Bean chose was built, failed its size check on three mirrors and was reverted (it unmatched the buy box's photo frame rule and blew up Eye Care's header logo on its shop page; `register-findings.md`, Nav drawer). Parked framework work: an unwrapped SGS picture with a set height still loses it to WooCommerce's `.woocommerce img { height: auto }` on any shop; a fix makes the two-class selector opt-in for a plain rendered `img` (`includes/media/render-slot.php`) and explains the Eye Care logo first

### Task 3: Header
- Why: 9 points, one of them a new behaviour (the trust bar ticker). Read first: the register's Header section; Eye Care's trust bar on `eye-care-test` (read only)
- Changes: Header 1 to 9; menu item 350 removed. Header 9 (a pink slider background) is Bean's question, answered with a picture of both
- Touches: `local-mamas` header post; the trust bar's block if the ticker is a missing behaviour; `mamas-test`
- Done when: every Header row is closed by Bean, checked at 375, 768, 1024 and 1440
- Depends on: none
- Status: Header 1 to 6, 8 and 9 are fixed and on `mamas-test` (pushed 2026-11-17, settings and the theme snapshot's scrollbar track; the pink track reached `mamas-test` through the copied global-styles post, and `push-theme-snapshot.py` was not run because it warns it would overwrite 33 keys edited on the site: the theme file there takes the snapshot at the next theme deploy); waiting for Bean to close them. Header 7: the empty editor row is removed, and the strip Bean sees on desktop does not reproduce signed out, signed in or scrolled: waiting for his screenshot. Found and not on the list: signed in, the sticky header slides under WordPress's admin bar when the page is scrolled

### Task 4: Contact
- Why: 11 points; its accordion and gutters are shared. Read first: the register's Contact section; the Help page's accordion (the working one)
- Changes: Contact 1 to 11 (Contact 8 is "keep", recorded as an accepted difference)
- Touches: page 148 on `local-mamas`; `sgs/accordion` if a cause is in the block; `mamas-test`
- Done when: every Contact row is closed by Bean
- Depends on: Task 1 (social icons)
- Status: diagnosis running (2026-11-17), with the survey of every page's entrance animations (All pages 1) beside it

### Task 5: Help
- Why: 9 points. Read first: the register's Help section
- Changes: Help 1 to 9. Help 6 (policy boxes or buttons to the policy pages) is Bean's question, answered with a recommendation
- Touches: page 152 on `local-mamas`; `mamas-test`
- Done when: every Help row is closed by Bean
- Depends on: Task 4 (accordion)
- Status: not started

### Task 6: Sign-in
- Why: 5 points, two of them WooCommerce behaviour (registration fields, where sign-up lands). Read first: the register's Sign-in section
- Changes: Sign-in 1 to 5
- Touches: page 628 on `local-mamas`; the account blocks if a cause is there; `mamas-test`
- Done when: every Sign-in row is closed by Bean, and a new test account lands on `/my-account/`
- Depends on: none
- Status: not started

### Task 7: Shop
- Why: 14 points; its product card and filter pills are shared. Read first: the register's Shop section and Gifts 7 to 9b
- Changes: Shop 1 to 14. Bean's questions answered with a recommendation: Shop 3 (the reload on "All"), Shop 6 (a dropdown that joins the sort pill), Shop 12 (the selling point that replaces the subscription card), Gifts 9 (the button wording)
- Touches: shop template 194 on `local-mamas`; the product card and filter blocks; `mamas-test`
- Done when: every Shop row is closed by Bean
- Depends on: none
- Status: not started

### Task 8: Gifts
- Why: 13 points. Read first: the register's Gifts section
- Changes: Gifts 1 to 12
- Touches: the Gifts page on `local-mamas`; `mamas-test`
- Done when: every Gifts row is closed by Bean, and the note updates as it is typed
- Depends on: Task 7 (product card, filter pills)
- Status: not started

### Task 9: Product pages
- Why: 15 points on Zookies, then three on every other product. Read first: the register's two Product sections
- Changes: Product 1 to 15, then Other products 1 to 3 (every buy box follows the Zookies template; the gift card differs only on the buy box's right side); the shared reviews slider
- Touches: the single-product template and products on `local-mamas`; `sgs/buybox` and the slider if a cause is there; Stripe (Product 15); `mamas-test`
- Done when: every Product and Other products row is closed by Bean
- Depends on: Task 7 (product card)
- Status: not started

### Task 10: Home
- Why: 23 points, the hardest: a hero that does not respond to the screen (Home 7) and a broken cookie builder (Home 11 to 14). Read first: the register's Home section
- Changes: Home 1 to 23; Home 7 gets its own diagnosis first, the hero against the draft at eight widths from 320 to 1920. The site check's one failure belongs here: no page renders the "Build your Zookie" choice flow that `build/page-map.json` lists (the hand-finished Home builds the builder from `sgs/buybox`), `sites/mamas-munches-redesign/build/qa/site-check/2026-11-17T01-35-41/result.md`
- Touches: page 154 on `local-mamas`; the hero, builder and slider blocks; `mamas-test`
- Done when: every Home row is closed by Bean
- Depends on: Tasks 2 (picture box), 3 (trust bar), 4 (gutters), 9 (reviews slider)
- Status: not started

### Task 11: Checkout and order confirmation
- Why: Checkout 1 names no single fault: Bean says the checkout's problems are mainly the ones already solved on Eye Care's test site, and the confirmation page waits on a test purchase. Read first: the register's last two sections; `sites/eye-care-ward-end/build/qa/decided.md` and the checkout on `eye-care-test` (read only: its saved Checkout block settings, its Custom CSS and the checkout commits in `git log`)
- Changes: the diagnosis lists what was fixed on Eye Care's checkout and which of those faults Mama's has, then any difference from Mama's draft that remains, with screenshot pairs; a fix made in a block for Eye Care is already live here, so what remains is this site's settings (card fields through `sgsStripeMatchFields`) and anything Eye Care solved with its own Custom CSS, which is moved into the block if both sites need it; a Stripe test order is placed and the confirmation page shown to Bean beside the draft
- Touches: checkout and order-confirmation templates on `local-mamas`; a checkout block if a shared fix belongs there; `mamas-test`
- Done when: Bean has closed the checkout list and seen the confirmation page of a paid test order
- Depends on: Task 9
- Status: not started

## Wave 2: the two re-clones

### Task 12: The route clones one surface onto the lab, safely
- Why: Basket drawer 1 and Account 1 are re-cloned, and a route run must never touch `local-mamas`. Read first: `scripts/computed-route/calibration-targets.json`, `manifest.mjs`, `lib/site-build-map.mjs::rowsForSite`, `lib/template-copies.mjs`
- Changes:
  - [ ] a `local-mediatest-mamaslab` entry in `calibration-targets.json` (`mirrorOf: mamas-test`), and a manifest for the lab that leaves the one for `local-mamas` alone
  - [ ] a lab run writes its walker files, origin files and ledger additions beside the lab's manifest, never over the committed ones that match `mamas-test` (the 2026-11-15 re-clone's copies are in `E:\sgs-tmp\mamas-reclone\reclone-build-files\`)
  - [ ] a run limited by `--only` builds no shared template copy unless that template is named, and refuses a template edited after the site build saved it (`site-run.mjs::runKeys`)
  - [ ] the basket drawer and the account's inner panels are surfaces the route can name (`lib/intake-skeletons.mjs::SURFACE_KINDS`, `lib/manifest-build.mjs::matchRecord`)
  - [ ] `apply.mjs` writes `no-setting-review.json` per surface, and `site-run.mjs` walks a surface whose apply gate failed
- Touches: route scripts, the lab mirror
- Done when: `site-run.mjs mamas-munches-redesign --site local-mediatest-mamaslab --only my-account` finishes every stage, `wp post get 103 --field=post_modified` on `local-mamas` is unchanged, no `wp_template` post on the lab is newer than before the run, and `git status --short sites/mamas-munches-redesign/build` shows no committed file changed
- Depends on: none
- Status: not started
- Parked route work, not needed for these two surfaces: the order confirmation as a surface (S-32); the stale manifest entry for the gift-finder flow (post 159); intake reading `facts.json` before it is refreshed (the first run after a draft edit proposed 0 rows); a walk-only run of the template surfaces; Mama's `build/logo-svgparts.json` and a full theme-snapshot re-extraction; `sgs/buybox` calibration and `sgs/decorative-image`'s default paint; a tree comparison tool (`tools/tree-compare.mjs`); Fill's "no setting" report (3,224 reported, 699 real: run `/second-opinion` on the cause first); the walker's blindness to hand-built parts

### Task 13: Basket drawer and account page re-cloned
- Why: Basket drawer 1, Account 1 and Account 2. Read first: the draft's basket drawer and account surfaces; Eye Care's verify-email notice (already styled there)
- Changes: each surface cloned on the lab, compared with the draft at 375, 768 and 1440, fixed at the rule that built it wrongly, then moved to `local-mamas`; the verify-email notice takes the site's tokens
- Touches: route scripts, the lab, then `local-mamas` and `mamas-test`
- Done when: Bean has closed Basket drawer 1, Account 1 and Account 2 on `mamas-test`
- Depends on: Task 12
- Status: not started

### Task 14: Proof
- Why: the Goal. Read first: `scripts/computed-route/site-check.mjs`
- Changes: none
- Touches: `mamas-test`
- Done when: `node scripts/computed-route/site-check.mjs mamas-munches-redesign --site mamas-test` reports 0 failed, every row in `register-findings.md` is closed, an order paid with Stripe's test card reaches the order confirmation, and Bean signs the site off
- Depends on: Tasks 1 to 13
- Status: not started
