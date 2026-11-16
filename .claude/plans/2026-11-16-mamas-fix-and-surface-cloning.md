---
status: active
doc_type: plan
created: 2026-11-16
---

# Mama's Munches: hand-fix what is close, clone what is not, one surface at a time

## Goal and why

Mama's Munches is a working shop on `mamas-test`, ready for the client and for Bean's portfolio at the MIC event on 2026-11-28. Bean's method (2026-11-16) replaces "re-clone the whole site": he writes an issue register of `mamas-test`; surfaces that are mostly right are hand-fixed, one page or surface at a time; surfaces he judges too different are re-cloned by the route, one surface at a time, with logic specialised per surface type. Done is Bean's sign-off of `mamas-test` in one look, and a test order paid with a Stripe test card from basket to order confirmation.

## Approach

The hand-finished site is the answer key. For each surface the route clones, its block tree is compared with the hand-finished tree of the same surface (which block, in what nesting), the difference is traced to the script or rule that produced it, and that rule is fixed and re-run on that surface alone until the trees agree; the parity walker then judges style at 375, 768 and 1440. Rejected: one whole-site run (the 2026-11-15 baseline: 13 of 24 surfaces had a failed stage and Home was not presentable), and treating Fill's "no setting" count as missing settings (see Baseline).

## Where things are

- `local-mamas` (http://localhost:8084): the hand-finished content, restored 2026-11-16 from `/var/www/local-mamas-before-reclone-2026-11-15.sql` (WSL). Hand fixes are made here and pushed to `mamas-test` with `scripts/local-wp/push-to-remote.sh`. It runs HEAD's build; `mamas-test` runs `419b4cb6a`, so deploy `mamas-test` before the first push (`build-compare.mjs` refuses otherwise).
- `local-mediatest-mamaslab` (http://localhost:8091): the 2026-11-15 re-clone, the lab for cloning tests. `local-mediatest-mamashand` (8090) is a second copy of the hand-finished state; drop it once the lab is wired (Task 3).
- Calibration cache `E:\sgs-route-cache` was missing and is rebuilt (2026-11-15, on `local-mamas`): 95 of 97 blocks. Not measured: `sgs/buybox` (its fixture renders nothing on this mirror), `sgs/theme-toggle` (no dark palette), and `sgs/decorative-image`'s default paint.
- Intake was re-run against the current draft folder (it was stale against the draft edits of 2026-11-01 and 2026-11-10). 1,495 of Bean's review marks carried; 74 rows the edits changed carry the route's own proposal and are not Bean's review. Mama's theme snapshot has only its freshness key updated for `tokens/spacing.css`; a full re-extraction is owed (Task 2).
- Stripe: WooCommerce Stripe Gateway 11.1.1 is active in test mode on `mamas-test` and `local-mamas`, with the test keys Eye Care's test site uses (webhook secret and Apple Pay domain left empty).
- Pictures of every page (draft, re-clone, hand-finished, 1440 and 375): https://claude.ai/artifact/9GKuTVgnk6nXALN1yv41Nf. Run artefacts: `sites/mamas-munches-redesign/build/qa/site-run/2026-11-15T22-50-39/`; scratch scripts and logs: `E:\sgs-tmp\mamas-reclone\`.

## Baseline (2026-11-15 run on `local-mamas`, all stages)

| Class | Surface | Result |
|---|---|---|
| Regular page | Home | built; static copies for the builder, reviews and FAQ; hero flattened |
| Regular page | Gifts | skipped: inventory crashed (fixed, Task 1) |
| Regular page | Contact, Help, My account | built and walked (open rows at 1440: 457, 990, 157) |
| CPT | header, footer, drawer, 'send' form | built; the applier's gate then failed, which also stopped the walk |
| CPT | Build-your-Zookie flow | built and walked |
| Template page | Shop | skipped: same inventory crash (fixed, Task 1) |
| Template page | Product | built and walked; no working buy box, gallery or accordion |
| Template page | Basket, Checkout | page surfaces crashed on a missing path (fixed, Task 1); template copies built |
| Template page | Order confirmation | never cloned: no draft surface is matched to it |
| No row | basket drawer, cancel pop-up, account panels, sticky phone bar | not placed |

Home's block tree against the hand-finished one (`E:\sgs-tmp\mamas-reclone\home-hand.outline.txt`, `home-reclone.outline.txt`): five of eight sections match in nesting. The differences are specific recognisers: the hero loses its two columns and its h1 (a heading holding an inline image); the builder is a choice flow where the hand build uses `sgs/buybox`; the reviews are six containers where the hand build uses `sgs/testimonial-slider`; the FAQ is four containers where the hand build uses `sgs/accordion`; inline links ("Allergens", "Help & FAQs") become buttons.

Fill reported 3,224 values with no setting. Classified by reason (`E:\sgs-tmp\mamas-reclone\unmapped2.mjs`): 1,092 are "the default paint is unmeasured" (939 of them plain CSS defaults such as `transform: none`), 490 are motion notes, about 220 are `sgsTimeText` notes that change nothing, 121 are shape notes, and 699 are real "no setting" verdicts, most of which follow from a wrong block (a link built as `sgs/button`, a badge built as `sgs/text`, a slide built as `sgs/container`). It is a reporting fault and a recognition fault, not a count of missing settings.

## What happens next

1. Bean hands over his issue register of `mamas-test` at the start of the next session, each surface marked "polish" or "too different". It is set beside the walker's own list (`sites/mamas-munches-redesign/build/qa/parity-baseline-2026-11-16.md`): an item on both lists is confirmed, an item only on Bean's is something the walker cannot see, an item only on the walker's is checked by sight before it is worked.
2. Subscriptions are hidden first (Bean, 2026-11-16), as the opening hand fix: see Task 6.
3. "Polish" surfaces are hand-fixed on `local-mamas`, one surface at a time, then pushed to `mamas-test` (Task 6).
4. "Too different" surfaces are re-cloned on the lab mirror, one surface at a time, each with the recogniser its tree comparison names, and moved to `local-mamas` only when the tree agrees with the answer key and the walk is clean (Tasks 2 to 5, then 7).

## Gaps still open

- **The route cannot yet clone one surface safely.** It is wired to `local-mamas`, and a run limited to one surface still rebuilds the shared templates (front page, page shell, search, 404 and others) with no check for hand edits (Task 3).
- **Surfaces the route never clones:** the order confirmation, the basket drawer, the account's inner panels, the sticky phone bar (Tasks 2 and 7).
- **Working blocks the route builds as static copies:** FAQ accordions, the reviews slider, product rows and cards, the buy box and gallery, the hero's columns and main heading (Task 7).
- **Misleading run report:** 3,224 "no setting" rows of which 699 are real (Task 5).
- **Stale or missing route data:** `sgs/buybox` cannot be calibrated on this mirror; `sgs/decorative-image` has no default paint; Mama's logo `svgParts` file is missing; her theme snapshot needs a full re-extraction; intake proposes nothing on its first run after a draft edit (Task 2).
- **Stripe:** no test card payment has been run; Apple Pay and Google Pay need her domain registered in Stripe; no webhook is set (Tasks 6 and 8).
- **74 intake rows** changed by the draft edits carry the route's proposal, not Bean's review.
- **Tap targets:** the 42 `touch-target` entries in `build/qa/divergences.json` are withdrawn by Bean's ruling of 2026-11-15 and are still in the file. On the 2026-11-16 walk of `mamas-test` they excused nothing (each names an element number that site does not carry); they still leave the ledger in Task 6.
- **The walker is blind to what was rebuilt by hand.** It finds a draft element's counterpart by the marker class the cloner writes (`cr-ref-<surface>-<n>`). On `mamas-test` the header and footer carry none, and the hand-built parts of Home (hero, reviews) carry hand-named ones, so those draft elements read as "not found". A hand fix there is checked by sight (screenshots at 375, 768 and 1440 beside the draft), not by the walker (Task 6).
- **A lab re-clone overwrites the walker files of the site of record.** Fill regenerates `build/qa/parity/*.fill.mjs`, `build/*.origin.json` and adds ledger entries in the one `sites/mamas-munches-redesign/build/` folder, with the re-clone's element numbers. Walking `mamas-test` with those compares the wrong elements (Home: 42 text matches against 121 with the committed files, measured 2026-11-16). The committed files match `mamas-test`; the 2026-11-15 re-clone's copies are kept in `E:\sgs-tmp\mamas-reclone\reclone-build-files\` (Task 3).
- **A walk-only run skips the template surfaces.** `site-run.mjs --stages walk` fails Product, Shop, Basket and Checkout at "its Fill wrote no tree"; Shop and Product were walked by calling `scripts/parity/draft-live-walk.mjs` on their walker file directly. Basket and Checkout need items in the basket, which the walker does not add, so they are not compared (Task 2).

## Out of scope

Building subscriptions (deferred by Bean; everything that mentions them is hidden, Task 6); Indus and Eye Care (never touched); new block settings where Custom CSS holds a one-off look (Bean, 2026-11-15).

## Order

Tasks 2 to 5 are independent of each other and of the register. Tasks 6 and 7 wait for the register. Deploys and pushes to `mamas-test` run one at a time, last in each round.

## Risks

- A push from `local-mamas` replaces `mamas-test`'s whole database: take the script's backup, and re-check Stripe after the first push.
- The recognisers removed by the 2026-11-02 rewind (`git log d79135af4..0ea1a6cb2~1 -- scripts/computed-route`) include ones Mama's needs (`loopBlocks` placed the reviews slider and the gifts carousel). Re-apply one rule at a time against the answer key; that range as a whole made the clones worse.

## Session breaks

Read this plan, `git log --oneline -15`, and the LEDGER's Front H. Find the first task whose Status is not done and rerun the previous task's check.

## First action

`wsl -d Ubuntu -u root -- bash /mnt/c/Users/Bean/Projects/small-giants-wp/scripts/local-wp/scratch-mirror.sh list` (shows the lab and the hand-finished copy are up).

## Wave 1: before the register

### Task 1: The route stops skipping Gifts, Shop, Basket and Checkout
- Why: four of Mama's surfaces never reached Fill. Read first: `scripts/computed-route/lib/skeleton-inventory.mjs`
- Changes: `lib/skeleton-inventory.mjs::holdNavigation` (the click probe holds the page), `site-run.mjs::prepare` (a surface with no walker file)
- Touches: route scripts only
- Done when: `node scripts/computed-route/site-run.mjs mamas-munches-redesign --site local-mamas --only gifts,shop --stages inventory,propose` reports both ok, and `node --test scripts/computed-route/tests/skeleton-inventory-hold.test.mjs` passes
- Depends on: none
- Status: done (`957e48a8b`)

### Task 2: The remaining skip and stale-data faults
- Why: each stops or misleads a single-surface run. Read first: the helper findings quoted in this plan's Baseline, `lib/intake-skeletons.mjs`, `lib/manifest-build.mjs`, `apply.mjs`
- Changes:
  - [ ] `lib/intake-skeletons.mjs::SURFACE_KINDS` and `lib/manifest-build.mjs::matchRecord`: a parentless `result` record (the order confirmation, S-32) is a surface its template row matches
  - [ ] `manifest.mjs`: an entry whose page-map row is gone (the gift-finder flow, post 159) is removed, not kept
  - [ ] `lib/intake-run.mjs`: the skeleton step reads `facts.json` after it is refreshed (the first run after a draft change proposed 0 rows and dropped 938 marks)
  - [ ] `apply.mjs`: `no-setting-review.json` is written per surface, and `site-run.mjs` walks a surface whose apply gate failed
  - [ ] `site-run.mjs`: a run with `--stages walk` walks Product, Shop and the basket and checkout copies from the walker file already in `build/qa/parity/`, with no Fill tree needed
  - [ ] Mama's `build/logo-svgparts.json` (the logo's `svgParts`, which the applier's gate names on five surfaces) and a full theme-snapshot re-extraction (`plugins/sgs-blocks/scripts/theme-extractor/extract.py`)
- Touches: route scripts, `sites/mamas-munches-redesign/build`
- Done when: a run of `--only header,template-order-confirmation` on the lab finishes every stage, and a second `intake.mjs mamas-munches-redesign` straight after a draft edit proposes the same row count as the first
- Depends on: Task 3
- Status: not started

### Task 3: The route clones one surface onto the lab mirror
- Why: cloning tests must never touch `local-mamas`. Read first: `scripts/computed-route/calibration-targets.json`, `manifest.mjs`, `lib/site-build-map.mjs::rowsForSite`
- Changes: a `local-mediatest-mamaslab` entry in `calibration-targets.json` (`mirrorOf: mamas-test`); the surfaces manifest generated for the lab without overwriting the one for `local-mamas`; a lab run writes its walker files, origin files and ledger additions beside the lab's manifest, never over the committed ones that match `mamas-test`; `site-run.mjs --only <surface>` documented as the way to clone; a run limited by `--only` builds no shared template copy unless that template is named, and refuses a template edited after the site build saved it, as `site-build.mjs` does (`site-run.mjs::runKeys`, `lib/template-copies.mjs`)
- Touches: route config, the lab mirror
- Done when: `site-run.mjs mamas-munches-redesign --site local-mediatest-mamaslab --only contact` rebuilds Contact on 8091 `wp post get 148 --field=post_modified` on `local-mamas` is unchanged, and no `wp_template` post on the lab has a newer `post_modified` than before the run, and `git status --short sites/mamas-munches-redesign/build/qa/parity sites/mamas-munches-redesign/build/*.origin.json` shows no committed file changed
- Depends on: none
- Status: not started

### Task 4: A tree comparison that names the faulty rule
- Why: Bean's method compares the working page with the clone. Read first: `E:\sgs-tmp\mamas-reclone\outline.php`, `scripts/local-wp/export-block-tree.php`
- Changes: `scripts/computed-route/tools/tree-compare.mjs` (two sites, one post or template: per section, the blocks and nesting that differ, and for each cloned block the skeleton rule that proposed it)
- Touches: a new tool and its test
- Done when: run on Home (post 154, 8084 against 8091) it lists the five differences in this plan's Baseline and no others above section level
- Depends on: none
- Status: not started

### Task 5: The run report counts only real "no setting" rows
- Why: 3,224 reported, 699 real, and those mostly follow wrong blocks. Read first: `.claude/reports/2026-10-25-no-setting-diagnosis.md`, `lib/fill-resolve-element.mjs`
- Changes: Fill's report splits unmeasured-default, note-only and real rows; calibration measures the default paint of indexed slots (a menu's third item) so a CSS default is settled, not reported. Run `/second-opinion` on the cause before building.
- Touches: route scripts, calibration cache
- Done when: Mama's header reports under 60 "no setting" rows (319 today, 45 real)
- Depends on: none
- Status: not started

## Wave 2: with Bean's register

### Task 6: Hand-fix the surfaces Bean marks as close
- Why: Bean's register. Read first: `plans/2026-11-02-clone-finishing-streams.md` ("How an item is worked"), the register
- Changes: block settings on `local-mamas` with `scripts/local-wp/patch-block-attrs.py`, one surface at a time; Custom CSS where no setting holds a one-off look; the checkout's `sgsStripeMatchFields` so the card fields match the draft. First, hide subscriptions (Bean, 2026-11-16): no purchase-type cards in the buy box, which is laid out as the draft's one-off state; "Build your own box" without "or subscribe and save 10%"; the FAQ question "How does Subscribe & save work?" removed; the "Subscribe & save" menu item removed from the header, footer-shop and drawer-main menus (items 350, 396, 492); and every other mention in pages 154 (Home), 152 (Help), 148 (Contact), 103 (My account), 628 (Sign in) and the shop template (194). Each is recorded as an accepted difference in `build/qa/divergences.json`, and the 42 withdrawn `touch-target` entries are removed from it in the same pass
- Touches: `local-mamas`, then `mamas-test` (deploy, then `push-to-remote.sh`, dry run first)
- Done when: each register item is checked by sight on `mamas-test` beside the draft at 375, 768 and 1440 and recorded in `sites/mamas-munches-redesign/build/qa/fix-catalogue.md`
- Depends on: the register
- Status: not started

### Task 7: Clone each surface Bean marks as too different
- Why: these are the test surfaces for the route. Read first: this plan's Baseline, the surface's hand-finished tree
- Changes: per surface type, the recogniser the tree comparison names. Known from the baseline: FAQ lists as `sgs/accordion`; the reviews as `sgs/testimonial-slider` and product rows as a product collection (`loopBlocks`); the buy box; the hero's columns and a heading holding an inline image; an inline link stays a link; the order confirmation, account panels, basket drawer and sticky phone bar as surfaces
- Touches: route scripts, the lab mirror, then the surface's post on `local-mamas`
- Done when: the surface's tree agrees with the answer key (Task 4), the walker is clean at 375, 768 and 1440 with only Bean's accepted differences, and Bean has looked
- Depends on: Tasks 2, 3, 4 and the register
- Status: not started

### Task 8: Proof
- Why: the Goal. Read first: `scripts/computed-route/site-check.mjs`
- Changes: none
- Touches: `mamas-test`
- Done when: `node scripts/computed-route/site-check.mjs mamas-munches-redesign --site mamas-test` reports 0 failed, an order paid with Stripe's test card reaches the order confirmation, and Bean signs the site off
- Depends on: Tasks 6 and 7
- Status: not started
