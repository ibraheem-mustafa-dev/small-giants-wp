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
6. Check the item by sight on the live page beside the draft, then record it in the client's fix catalogue (`sites/<client>/build/qa/fix-catalogue.md`; Eye Care: the round section of `plans/2026-10-02-eye-care-fix-register.md`).
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

## Mama's (after Eye Care)

- **Live:** mamas-test, framework code `f579fdb33` (marker `e2c227b79`); it does not have Eye Care round 12's framework commits (`f791e433b` to `24095ea4f`). Its content was pushed on 2026-11-05 (site-check 0 failed). Rounds P0 and R4 to R6 and the merged round are done (fix catalogue; `plans/2026-11-05-mamas-merged-round.md`).
- **Next:** Bean's look at mamas-test and his issues list, worked as above. The merged round plan's "Open" list holds what earlier rounds left.
- **Waiting on Spec 49:** Mama's media work (images, backgrounds, effects on them) waits for the media system's cutover (`specs/49-SGS-MEDIA-SYSTEM.md`; plan register `plans/2026-11-09-media-controls-redesign.md`), so it is built once on the new controls.

## Eye Care (now)

- **Live:** eye-care-test, edited directly, on main `f9b2e70fa` (round 13's framework commits are in it). Rounds 1 to 13 are live: round 13 is Bean's list of 2026-11-09 (input focus, buttons, above-the-fold entrances, pop-up and lens motion, checkout, account and thank-you settings, reload and anchor jumps), checked live in real Chrome beside the draft in five passes; the header reload offset measures Home 0px at all widths, Shop 26px at 1440 and 0 at 768/375, Product 0/4/18px at 1440/768/375 (20 to 46px before); the product buy box and the shop sections 1 and 2 start at 0.01 under the fold rule. The fix register (`plans/2026-10-02-eye-care-fix-register.md`, "Round 13") lists every fix, the frameworks built and the known limits; the decided differences, including Bean's round 13 rulings, are in `decided.md`.
- **Next:** Bean's sign-off beside the draft at 375, 768 and 1440. Still unchecked: Stripe and the wallet buttons end to end, and a tap-through of the header, shop cards, bag and size guide at 375 for the touch-hover change.
- **Waiting on Spec 49:** Mama's media work (images, backgrounds, effects on them) waits for the media system's cutover (`specs/49-SGS-MEDIA-SYSTEM.md`; plan register `plans/2026-11-09-media-controls-redesign.md`), so it is built once on the new controls.

## Eye Care (now)

- **Live:** eye-care-test, edited directly, framework through `24095ea4f` (marker, 2026-11-09). Rounds 1 to 12 and the clean first paint are live: round 11 is Bean's 15-item list of 2026-11-08 and round 12 his second list of 2026-11-09, both in the fix register (`plans/2026-10-02-eye-care-fix-register.md`, "Round 11" and "Round 12"), verified live in real Chrome. The decided differences, including Bean's round 12 rulings, are in `decided.md`.
- **Next, in order:**
  1. Run `/qc-council` on round 12's framework code (`f791e433b` to `24095ea4f`, Spec 02 FR-2-20, Spec 38A FR-38A-43 and FR-38A-44, Spec 43 FR-43-24a, Spec 32): it has not been run.
  2. Compare the pages Bean has not checked: the 17 or so differences on checkout, account and thank-you are in `.claude/reports/2026-11-09-eye-care-unchecked-pages.md` (read-only, nothing fixed); fix each at its root cause, then check beside the draft (`node E:/sgs-tmp/ec-r11/serve-draft.mjs`, port 5182; the draft's index is `Eye Care Birmingham.dc.html`, the product pair uses gucci-oversized-cat-eye with `curId: 2`).
  3. Side-by-side of every page beside the draft at 375, 768 and 1440 (768 is mostly unchecked), including a tap-through of the header, shop cards, bag and size guide at 375 for the touch-hover change that deployed with round 12.
  4. Trace the reload offset (about 25px).
  5. Measure the six entrance rows not yet measured: filter chip, filter drawer, thank-you message, phone menu rise, size modal and lens steps (the 2026-11-08 sweep is `sites/eye-care-ward-end/build/qa/r11/entrances-2026-11-08.md`; parallax is checked).
  6. Non-admin customer sessions need a test customer login (only the admin exists); Stripe and the wallets are untested.
  7. Then Bean's approval.
- **Waiting on Spec 49:** the hero focal points (post 208) and the lens tag and outline (post 463) stay in Custom CSS until the media system (`specs/49-SGS-MEDIA-SYSTEM.md`, v0.7, approved 2026-11-10; Stage A under way, the Stage B cutover not built) gives them controls. Bean's original wording of 8 November: `.claude/reports/2026-11-09-bean-eye-care-list-wording.md`.
- Back up each post before editing it, under `sites/eye-care-ward-end/build/backups/<date>/` (local only: some backups hold public embed keys the secret scanner flags).
- **Noticed, not on Bean's list:**
  - `plugins/sgs-blocks/tests/php/run-header-ink-standalone.php` fails 2 of 29, identically on unmodified code; unrelated to round 12, found 2026-11-09.
  - Every page is over the weight budget (R3-23, `plans/2026-11-03-page-weight-budget.md`).
  - The plugin has about 6,500 lint-js formatting errors (R3-25), which needs a quiet window across sessions.
  - eye-care-clone-test (not the presented site) holds 213 blocks in the old single-value shape. Migrate them with `plugins/sgs-blocks/scripts/find-scalar-tier-attrs.py` before its next deploy.

## After the three sites are signed off

- Group the fix catalogues by cause into the clone pipeline's fix list (`plans/2026-10-30-clone-recognition-fixes.md`, "Rewind").
- Parked tooling, picked up only if it serves a future list item:
  - the animation-record live reader (`scripts/computed-route/record-live.mjs`, uncommitted);
  - the per-example checker (`E:/sgs-tmp/indus-r8/check117/checker/`, outside the repo; its rulings D-29, D-36 and D-41 and its contact tile and timeline finders are built);
  - the parity detectors C1 to C6 (`scripts/parity/detect.mjs`; C1 prints nothing until the end and has no per-page time limit);
  - walker parity with the applier;
  - a polish checklist for new clones: page states, drawer, touch, choice groups, card links, composed interactions, first seconds.
