---
doc_type: plan
title: Finishing the three client sites to sellable quality (Indus, then Mama's, then Eye Care)
status: active
created: 2026-11-02
governs: Spec 48 (cloning system) evidence; Front H and Front F
---

# Finishing the three client sites (Indus, then Mama's, then Eye Care)

**Goal (Bean):** three sites good enough to present to prospective clients and sell, each matching its Claude Design draft at 375, 768 and 1440. Indus is finished and signed off first, then Mama's, then Eye Care (Bean 2026-11-07).

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

## Indus (state 2026-11-08)

- **Live:** framework `fe51b4e78` deployed to indus-test, and local-indus pushed to it (site-check 0 failed). sandybrown and mamas-test run `08c04900a`. The shared framework DB is sha `04b4a67ee57f`.
- **Bean's list:** `sites/indus-foods/build/qa/bean-r8-issues-list.txt`, 117 items. Per-item records are in `E:/sgs-tmp/indus-r8/bean-list/items-v2/<group>/<id>.json` (recount with `E:/sgs-tmp/indus-r8/bean-list/board/aggregate.py`). The board's 118th row, TABLE-records, is a tooling item and not on Bean's list. Bean's rulings are D-29, D-35, D-36, D-40, D-41 and D-42 in `divergences.json`.
- **Status:** 111 fixed, 4 ruled, 2 not faults. HP8 (Why Choose icon hover), AP1B (option pill lift timing) and AB7 (timeline card row gap and tablet width) were fixed again on 2026-11-08 after targeted reads found residuals.
- **Next:** Bean's look at indus-test and sign-off. The items closed only by script reads were checked by sight beside the draft on 2026-11-08 (framework `fe51b4e78`; fix catalogue, "By-sight check"): AB8, ND19, the drawer labels and heading line breaks were fixed on the way, and every other item matched.
- **Noticed, not on Bean's list:**
  - The home page is 36px wider than the screen at exactly 1024px.
  - The footer paragraph `cr-ref-footer-24` is centred at 768 to 1000px where the draft is left-aligned.
  - The drawer sectors card hover shadow (ND16) uses the desktop card's value: alpha .40 against .45. Not visible; Bean dropped a per-device shadow redesign for it.
  - The trade-account button hides at 1199px and below.
  - The draft's drawer Brands panel has an "OUR BRANDS" label above the tiles; live's has none.

## Mama's (after Indus sign-off)

- **Live:** mamas-test, framework `08c04900a`. Its content was pushed on 2026-11-05 (site-check 0 failed). Rounds P0 and R4 to R6 and the merged round are done (fix catalogue; `plans/2026-11-05-mamas-merged-round.md`).
- **Next:** Bean's look at mamas-test and his issues list, worked as above. The merged round plan's "Open" list holds what earlier rounds left.

## Eye Care (after Mama's)

- **Live:** eye-care-test, edited directly. Rounds 1 to 10 and the clean first paint are live at `53d789aa5`. The decided differences are in `decided.md`, and the round history is in the fix register.
- **Next:** Bean's list `.claude/prompts/Eye Care Bean list 2026-11-08.md` (15 items), worked as above, then Bean's approval.
  - The draft's index is `Eye Care Birmingham.dc.html`; the product pair uses gucci-oversized-cat-eye with the draft set to `curId: 2`.
  - Back up each post before editing it, under `sites/eye-care-ward-end/build/backups/<date>/` (local only: some backups hold public embed keys the secret scanner flags).
  - The next deploy to eye-care-test carries the touch-hover change; tap-check it at 375.
- **Noticed, not on Bean's list:**
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
