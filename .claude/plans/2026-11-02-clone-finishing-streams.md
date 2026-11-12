---
doc_type: plan
title: Finishing the three client sites to sellable quality (Indus, then Eye Care, then Mama's)
status: active
created: 2026-11-02
governs: Spec 48 (cloning system) evidence; Front H and Front F
---

# Finishing the three client sites (Indus, then Eye Care, then Mama's)

**Goal (Bean):** three sites good enough to present to prospective clients and sell, each matching its Claude Design draft at 375, 768 and 1440. Indus is finished and signed off first, then Eye Care, then Mama's (Bean 2026-11-08).

**Focus (Bean 2026-11-08):** the work is Bean's hand-checked issues list for each site. Every item is fixed at its root cause, shipped to the live test site, and checked by sight on the live page beside the draft (side by side at the item's widths and states: hover, open, mid-animation), never closed on a script reading alone. Tooling is used only to find or fix the cause of an item on the list; it does not add new checks or new findings. A difference that is not on the list gets one line under the site's "Noticed, not on Bean's list" and is not worked unless Bean asks.

## Sites

| Site | Test site | Edited on | Draft | Decided differences |
|---|---|---|---|---|
| Indus | `indus-test` | mirror `local-indus` (http://localhost:8083), then pushed | `sites/indus-foods/handoff/` | `sites/indus-foods/build/qa/divergences.json` |
| Mama's | `mamas-test` | mirror `local-mamas` (http://localhost:8084), then pushed | `sites/mamas-munches-redesign/handoff/` | `sites/mamas-munches-redesign/build/qa/divergences.json` |
| Eye Care | `eye-care-test` (darkcyan, hand-built) | the site itself | `sites/eye-care-ward-end/handoff/` | `sites/eye-care-ward-end/build/qa/decided.md` |

## How an item is worked

1. Read the item's record first: what Bean said, its root cause and the solution built for it (Indus: `sites/indus-foods/build/qa/r8-root-causes.json`, the fix catalogue, and `E:/sgs-tmp/indus-r8/bean-list/items-v2/<group>/<id>.json`; Eye Care: the fix register). Any problem seen later is judged against that solution first: is it doing what it was built to do, did a later change undo it, did the record leave part of the cause untraced?
2. Reproduce it on the live test site beside the draft at the widths and states Bean names, after reading the site's decided differences. The draft is served locally (`scripts/computed-route/lib/draft.mjs::serveDraft` on the handoff folder) and opened in a Playwright tab next to live.
3. Find its cause from the saved block settings and the live computed styles: a setting not set, content, a framework bug, a missing capability, or a difference Bean ruled. Before calling anything a framework gap, read the whole block family's source and try its existing settings (extensions, element toggles, motion hover sources, floating layers). "All" or "every" in Bean's words means every element where live differs from the draft.
4. Fix at the cause:
   - a setting: set it directly on the mirror with `scripts/local-wp/patch-block-attrs.py` (dry run first); on Eye Care, edit eye-care-test directly;
   - a framework bug or missing capability: fix the block through the shared helper, control or emitter (Specs 32 and 35; never per-instance CSS), with a test that fails first; a new attribute goes through the reseed flow (`.claude/dev-setup.md`, "Publishing a private reseed");
   - a one-off look with no setting: the block's Custom CSS.
5. Ship: commit and push; deploy with `build-deploy.py --target <site>`, one site at a time (two uploads at once drop the SSH connection); sync the mirror's build (`scripts/local-wp/sync-build.sh`, run inside WSL); push the mirror with `scripts/local-wp/push-to-remote.sh local-<client> <client>-test` (dry run first); run `scripts/computed-route/site-check.mjs <client> --site <client>-test`.
6. Check the item by sight on the live page beside the draft, then record it in the client's fix catalogue (`sites/<client>/build/qa/fix-catalogue.md`; Eye Care: the round section of `plans/archive/2026-10-02-eye-care-fix-register.md`).
7. Bean looks and signs the site off.

Rules:
- Never run the clone route (`site-run.mjs`, `fill.mjs`, `intake.mjs`, `site-build.mjs --apply`) for these three clients: it rebuilds the posts and erases the fixes.
- Work, build and push from a clean worktree of origin/main with its own `node_modules`; run site-check there with `--repo C:/Users/Bean/Projects/small-giants-wp` (the secrets stay in the main checkout).
- On indus-test, `wp db export` exits 255 silently; push-to-remote backs up with mysqldump itself.

## Indus (complete: Bean signed it off 2026-11-08)

- **Live:** framework `f579fdb33` deployed to indus-test, and local-indus pushed to it (site-check 0 failed). sandybrown and mamas-test run the same framework code (deploy marker `e2c227b79`, a docs-only commit after `f579fdb33`; deployed 2026-11-09). The shared framework DB is sha `7c850505b401`.
- **Bean's list:** `sites/indus-foods/build/qa/bean-r8-issues-list.txt`, 117 items. Per-item records are in `E:/sgs-tmp/indus-r8/bean-list/items-v2/<group>/<id>.json` (recount with `E:/sgs-tmp/indus-r8/bean-list/board/aggregate.py`). The board's 118th row, TABLE-records, is a tooling item and not on Bean's list. Bean's rulings are D-29, D-35, D-36, D-40, D-41 and D-42 in `divergences.json`.
- **Status:** 111 fixed, 4 ruled, 2 not faults. HP8 (Why Choose icon hover), AP1B (option pill lift timing) and AB7 (timeline card row gap and tablet width) were fixed again on 2026-11-08 after targeted reads found residuals.
- **Bean's review of 2026-11-08 (12 items plus 8 he added): done and checked by sight on indus-test at framework `075c83652`** (shared DB `249cbaa57941`; fix catalogue, "Round 9"). The darker drawer blue was the draft's top-right glow, added in round 9b.
- **Bean's second review of 2026-11-08 (5 items): done, worked from the draft's source** (framework `ba6e4644e`, shared DB `c9b6e97f9a6e`; fix catalogue, "Round 9b").
- **Bean's last look of 2026-11-08 (4 items): done and checked by sight on indus-test** (framework `8372f42b0`, shared DB `7c850505b401`; fix catalogue, "Round 10").
- **Bean's follow-up of 2026-11-08 (6 items): done and checked by sight on indus-test** (framework `f579fdb33`; fix catalogue, "Round 11").
- **Signed off by Bean 2026-11-08** after round 11. sandybrown and mamas-test run the same framework (deployed 2026-11-09).
- **Noticed, not on Bean's list:**
  - The drawer sectors card hover shadow (ND16) uses the desktop card's value: alpha .40 against .45. Not visible; Bean dropped a per-device shadow redesign for it.
  - The trade-account button hides at 1199px and below.

## Mama's (now)

- **Live:** mamas-test, framework code `f579fdb33` (marker `e2c227b79`); it does not have Eye Care round 12's framework commits (`f791e433b` to `24095ea4f`). Its content was pushed on 2026-11-05 (site-check 0 failed). Rounds P0 and R4 to R6 and the merged round are done (fix catalogue; `plans/archive/2026-11-05-mamas-merged-round.md`).
- **Next:** work each surface from a checklist written from the draft's code, structure first, every element, state and width (the Eye Care round 14 method, auto memory "match-a-surface-by-reading-both-codebases-element-by-element"); Bean's look and issues list are the cross-check, not the scope. Everyday properties go in settings, never Custom CSS. The merged round plan's "Open" list holds what earlier rounds left.
- **Open from the merged round (2026-11-05), worked in this round with pairs in every state:**
  1. Home reviews slider: the card titles use Karla against the draft's Young Serif; the quote mark is missing; the footer reads name then date, where the draft has name on the left and "date · Trustpilot" on the right; the draft's arrows sit in the section header, and the slider's own arrows shrink the cards (they are off now). Copy the Product cards' settings first, then build header-placed arrows if no setting exists.
  2. Product summary line: the draft has "All 20 strawberry" in lower case; ours prints "Your 20: All 20 Vanilla". The default flavour is Vanilla against the draft's Strawberry (product data).
  3. Add to basket hover fill: paper on hover in the draft; there is no setting.
  4. Hover and selected-state pairs for every item (the content pass captured resting crops only).
  5. Product pinned gallery top: 140px on mamas-test at 1024 and 1440 against the draft's 108px (the mirror measured 109px, so the live header-height value differs from the mirror's); prove which `--sgs-header-height` each side resolves before changing `stickyOffset`.
  6. QC rule for every round: measure at 768 as well as 375 and 1440. The buybox gallery `top` rule shipped under tablet-up while the column is sticky only from desktop, which pushed Eye Care's tablet gallery over the info column (fixed by the Eye Care session in `abe9231d9`, verified on mamas-test at 768, 1024 and 1440).
  7. B5 box-string rule: flip `BOX_STRING_ENFORCED` from report-only to refusing once every site's live sweep is done (local-mamas swept and pushed; local-indus patched by the Indus session; eye-care-test surveyed in its Round 5). Check with `python plugins/sgs-blocks/scripts/find-scalar-tier-attrs.py --check`. History: `plans/archive/2026-11-03-mamas-framework-batch.md`.
- **Spec 49 is live (2026-11-12):** Mama's media work (images, backgrounds, effects on them) builds on the new media controls (`specs/49-SGS-MEDIA-SYSTEM.md`); every item of the old media issue register (`plans/archive/2026-11-09-media-controls-redesign.md`) is built.

## Eye Care (signed off 2026-11-12)

- **Live:** eye-care-test, edited directly. Rounds 1 to 14 are live. Round 14 is Bean's sign-off pass of 2026-11-10 and the systematic walk of checkout, order confirmation, sign-in, account (every tab), bag drawer and toast against the draft, element by element (fix register "Round 14"). It added SGS's own templates for the account Addresses (inline editor), Orders list, order detail and reset-password form; WooCommerce's block Local pickup (one location) restyled as the draft's two delivery cards; the Klarna pay-later line; "Loading payment options…" in place of WooCommerce's premature no-payment notice; Stripe card-field appearance from the checkout's field settings; WooCommerce notices in the SGS notice look; View bag opening the drawer; the toast's draft motion. Test order 1744 (Stripe test mode, the test customer) went through: thank-you owner note, both emails sent.
- **Live:** Round 15 is deployed (eye-care-test at main `02da8798e`): the final walks' open rows fixed as settings, the Custom CSS on posts 1609 and 9 converted into settings with no visible change (1609: 111 rules to 62, then 57 once the commerce-look settings out-ranked WooCommerce's rules; 9: 133 to 82), code-review items (a) to (e) fixed, and the round's own code review fixed (fix register "Round 15"). Bean signed the site off on 2026-11-12 without new screenshots.
- **Done at sign-off:** the three Eye Care plans are archived (fix register `plans/archive/2026-10-02-eye-care-fix-register.md`), the backlog's rows are checked and archived (`plans/archive/2026-11-12-framework-parked-backlog.md`; its open rows are not-built FRs in their specs), and this plan's current client is Mama's. The round 12 `/qc-council` review and the 375 tap-through (header, shop cards, size guide, bag) are done and their faults fixed (fix register "Round 15", After sign-off). Open for Bean: whether Eye Care wants Stripe's "charge your card for future payments" line gone (WooCommerce Stripe's Saved cards off, untested).
- **Code-review findings in older code:** (a) to (e) fixed in round 15; (f) `plugins/sgs-blocks/scripts/deploy_ship.py` creates the isolated deploy worktree and the upload batch folder under the system temp, against Bean's rule that temporary worktrees live in `E:\sgs-tmp`: parked with the deploy tooling.
- **Method (binding):** every surface is checked from a checklist written from the draft's code, structure first, every element, state and width, ticked only with a re-read live value; Bean's list is a cross-check, never the scope (auto memory "match-a-surface-by-reading-both-codebases-element-by-element").
- **Ship:** `python plugins/sgs-blocks/scripts/ship.py --target eye-care-test --takeover` (reseeds only when the shared DB lacks a block.json attribute; commerce-look attributes registered from PHP are not in a block.json, so pass `--reseed yes` after adding them). A reseed no longer triggers the next one (`824c812cc`), so a repeat ship hits the gate cache; `ship.py` cannot pass `--skip-gate-full`, so for a plugin-only deploy use `build-deploy.py --target eye-care-test --blocks-only --skip-gate-full` (Bean's explicit choice only). Every deploy now uploads only what the site lacks (`d7d787c3a`, on top of the resumable sftp `deploy_ship.py::upload_resumable`, kept because the Hostinger link resets connections about every 1 to 2 minutes); eye-care-test's next deploy sends one full upload (its `vendor/` is a broken symlink, which forces a full upload and is replaced by real files), then small deltas. Session `small-giants-wp-5f` built these and will not deploy to eye-care-test, which Bean presents. Message other sessions before a deploy.
- **Waiting on Spec 49:** the hero focal points (post 208) and the lens tag and outline (post 463) stay in Custom CSS until the media system gives them controls (`specs/49-SGS-MEDIA-SYSTEM.md`).
- Back up each post before editing it, under `sites/eye-care-ward-end/build/backups/<date>/` (local only).
- **Carried from round 12, still open:** `plugins/sgs-blocks/tests/php/run-header-ink-standalone.php` fails 2 of 29 (identical on unmodified code, found 2026-11-09). Done in round 13 (fix register "Round 13"): the reload offset trace, the six unmeasured entrance rows and the 768 side-by-side. Stripe is proven by test order #1744; the wallet row is decided (Stripe's own).
- **Noticed, not on Bean's list:** pages over the weight budget were cut and the plan closed on speed (`plans/archive/2026-11-03-page-weight-budget.md`); about 6,500 lint-js formatting errors (R3-25); eye-care-clone-test holds 213 blocks in the old single-value shape (migrate with `plugins/sgs-blocks/scripts/find-scalar-tier-attrs.py` before its next deploy); `local-eye-care` mirrors eye-care-clone-test, not eye-care-test (eye-care-test has no mirror).

## FW-F rollout to every site (open)

FW-F changes the stored shape of 155 attributes on 53 blocks, so every site's saved content must be swept to the per-device object shape immediately before that site's first deploy at or after `c7ce83476`; the deploy's old-shape audit refuses an unswept site. The sweep is `plugins/sgs-blocks/scripts/migrate-scalar-tier-live.php` with rules from `python plugins/sgs-blocks/scripts/find-scalar-tier-attrs.py --rules > rules.json` (the rules also cover the earlier gallery `layout`, nav-bar-menu `justifyContent` and cart `showZero` conversions): take a database backup (mysqldump as `scripts/local-wp/push-to-remote.sh` does), `wp eval-file migrate-scalar-tier-live.php dry-run rules.json`, then `apply rules.json undo.json` (it re-counts and errors if anything old-shape remains), then deploy straight after. On a server the script and rules are copied to the home folder first (the scripts folder is not in the deploy payload).
- eye-care-test and sandybrown (the canary): the Eye Care session runs the sweep before its next deploys of each (told 2026-11-03). The canary's motion-QA fixture pages are swept like any page.
- indus-test: done 2026-11-03 by the Indus session (local-indus and the server both swept, deploy `3d2a52377`, mirror push, site-check).
- mamas-test: deployed at FW-F (`1dd2bdb17`) and pushed from the already-swept local-mamas, so its content should already be in the FW-F shape; if the next deploy's old-shape audit refuses, sweep the server's content first (the Indus order: sweep, deploy, `push-to-remote.sh local-mamas mamas-test`, site-check).
- local-eye-care and eye-care-clone-test (the clone stream's): swept by whichever session next pushes or deploys them.

History: `plans/archive/2026-11-02-footer-framework-batch.md`.

## After the three sites are signed off

- Group the fix catalogues by cause into the clone pipeline's fix list (`plans/2026-10-30-clone-recognition-fixes.md`, "Rewind").
- Parked tooling, picked up only if it serves a future list item:
  - the animation-record live reader (`scripts/computed-route/record-live.mjs`, uncommitted);
  - the per-example checker (`E:/sgs-tmp/indus-r8/check117/checker/`, outside the repo; its rulings D-29, D-36 and D-41 and its contact tile and timeline finders are built);
  - the parity detectors C1 to C6 (`scripts/parity/detect.mjs`; C1 prints nothing until the end and has no per-page time limit);
  - walker parity with the applier;
  - a polish checklist for new clones: page states, drawer, touch, choice groups, card links, composed interactions, first seconds.
