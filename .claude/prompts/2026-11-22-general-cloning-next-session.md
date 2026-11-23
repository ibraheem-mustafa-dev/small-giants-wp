Continue the general cloning work for Small Giants WP. The cloning route (`scripts/computed-route`) turns a Claude Design draft into WordPress blocks. Before 2026-11-28 Bean clones two new sites from drafts: SGS, and MIC, which has a shop. Neither has a hand-built copy, so every fix must read the look from the draft.

This session is the proof only. Fixing starts only after Bean has given a definitive register of confirmed issues, grouped by root cause. Spend tokens on the proof runs and the report, never on unconfirmed fixes.

You are the orchestrator. Helpers do the heavy work; you land any commits on main:
- Work in a fresh worktree from `origin/main` under `E:\sgs-tmp` (the old `wt-general*` worktrees were removed on 2026-11-23). Copy `scripts/computed-route/node_modules` from the main checkout with robocopy, and run `npm ci` in the worktree's `plugins/sgs-blocks` from PowerShell (the main checkout's plugin `node_modules` is empty; the look builder needs the plugin's Sass and postcss).
- Run the touched modules' tests, `node tools/check-mutation-lists.mjs` (0 new stale), `python scripts/check-no-client-names.py --check`, and the all-client sweep.
- Push with `git push origin HEAD:main`, with `git branch --show-current` in the same command.

## What changed since this track paused (2026-11-22)

- **Calibration is retired** (setting record Task 4, 2026-11-23, `.claude/plans/archive/2026-11-21-setting-record.md`). The route reads where each block setting paints from the setting record (DB table `setting_placements`) and what each block looks like by default from the client's site look (`plugins/sgs-blocks/scripts/site-look/site_look.py`, files in `scripts/computed-route/site-look/<client>/`, built offline from the theme snapshot). There is no calibration cache and no recalibration step. The foundation command's `paint` stage is now `looks` (`lib/foundation-plan.mjs`). The gate `retire-calibration` keeps the removed files gone.
- **Iterating is faster.** `site-run.mjs --stages fill,build,apply,walk` reruns from one stage and keeps the earlier stages' outputs; the walk reuses its draft reading across runs (`--fresh-draft` forces a new one). Read `scripts/computed-route/README.md`, "Running only what a change needs", before rerunning anything.
- **The sweep builds the looks.** `tools/route-sweep.mjs` builds every client's site looks from the checkout under test before it proposes. Each surface's summary counts the blocks it proposed without a default look (the table's last column), and a comparison fails when a surface loses one. The frozen records' `cache/` folders are no longer read. Before this fix the sweep proposed every block without a look and said so only in its log, so any older sweep figure is suspect.
- **Hosted sites:** the live shop `mamas-test` runs `ed5effd01`; sandybrown and indus-test run `ca6abcbeb`; eye-care-test and eye-care-clone-test run `cf6ca94e5`. `main` is ahead of all five (the setting record and the retirement).

## Read first

- `.claude/plans/2026-11-19-general-cloning-work.md`: "Method from 2026-11-22 afternoon", "Next (Bean, 2026-11-22)", "Open, traced but not built", and Task 8 (Proof), including its register candidates from the setting record's proof.
- `E:\sgs-tmp\general-cloning\wave2\SESSION-NOTES.md`: the coordination log, newest at the bottom (the 2026-11-22 15:30 entry holds the shop track's needs for each run).
- `E:\sgs-tmp\general-cloning\wave2\rounds\ROUND-COMMON.md`: how surface work is judged. All three clients at once; the hand-built finished surface is the shape check, never a source of values; a framework gap is proved from the DB and block.json first.

## Tasks, in order

1. **Fresh baseline sweep.** About 40 minutes, heavy; the first run also builds each client's looks (about 30 minutes per client when cold, then seconds):
   ```
   node tools/route-sweep.mjs --records E:\sgs-tmp\general-cloning\records --out E:\sgs-tmp\general-cloning\records\baseline-<main tip> --reread --slot-dir E:\sgs-tmp\general-cloning\heavy
   ```
   Then run it again with `--baseline` pointing at the first output, to show it is deterministic. `--reread` replaces the stale frozen Eye Care inventories. Done when both runs pass and no surface lists a block without a default look (a non-zero last column is a finding: name the block and why its look did not build).
2. **The proof clones of all three clients** (Mama's, Indus, Eye Care), each run fully to the end with nothing fixed in between, on a fresh stripped scratch copy:
   - Make the copy with `scripts/local-wp/scratch-mirror.sh create`, then `strip`. Run `build-foundation.mjs <client> --site <copy>` (its `looks` stage builds every block's look), then every surface.
   - The shop track runs inside the same runs (Bean merged it into this proof on 2026-11-22): Stripe test mode, real product images, the signed-in test customer rc-customer, `site-build --catalogue`, `--checkout-content` and `--account-registration`, `part-look`, and state pictures via `E:\sgs-tmp\shop-pages\pairs-shot.mjs` at 375, 768 and 1440.
   - Collect alongside: the sweep's real-fault lines, Fill's unmapped rows, computed-style differences, and draft-and-live picture pairs at 375, 768 and 1440. Mama's home pairs also serve as Bean's check by eye of the setting record's proof (FP-13, Task 8 candidate c).
   - Also run the full route suite once, and a `/code-review` (medium) of round R1's commits listed under "Method from 2026-11-22 afternoon" (`525ad1c9a`, `7ff6ea088`, `9aa65da89`, `92f1a8a81`, `ca6abcbeb`, `334e16b52`, `455deb7fd`). Their findings go into the report; nothing is fixed.
3. **One findings report, grouped by surface type across the three clients:** headers, drawers and mega menus, footers, home pages, content pages, forms and flows, templates, shop pages.
   - Each finding gets an ID and one line: what differs, where (client, surface, element), and its evidence (a picture pair, a sweep line, a Fill unmapped row, a computed-style difference).
   - Label the repeated instances of one issue as one issue: one ID for the cause, listing each instance on each client.
   - Include as findings the open items under "Open, traced but not built" (with its list "Moved in from the plans archived on 2026-11-23"), round R1's leftovers, and Task 8's register candidates (a), (b) and (d). Candidate (e), the framed pictures' mat, is fixed on `main` (`4145d2745`, `3c8477911`); the block's missing padding setting for a layer that holds blocks is a finding. Mama's "Build your Zookie" builder is a custom build job, not counted.
   - Publish the report as a page.
4. **Hand over to Bean, and stop.** Give Bean the report's link. Open all three drafts in Bean's local browser (each client's draft entry file under `sites/<client>/handoff/`, opened with the Windows `start` command), so Bean can compare directly across the three. Bean reviews the clones, adds the gaps he finds, and you sort both lists into one register by root cause and common fix. Bean approves the register; the fixes then land in one go. Do nothing else until that register arrives: no fixes and no new helpers.
5. **Retire the clone-coverage register.** This is the one exception to the stop in task 4. It has Bean's go, is not a fix, and may run while task 2's clones run, as one helper of about 45 minutes. It covers `data/clone-coverage.json`, `capabilities.mjs`'s coverage tools, `content-coverage.mjs`, `delivery-map.mjs`, `verify-live.mjs` and their tests. Restate Spec 48's done-when lines against the setting record. The setting record lacks the register's "which code writes it, which test proves it" half; say in the commit whether anything replaces it.

## Guardrails

- **Heavy jobs** take `E:/sgs-tmp/general-cloning/heavy/slot-1`, `slot-2` or `slot-3` by mkdir (make the `heavy` folder first if it is missing); rmdir only your own. At most two helpers at once.
- **Sites you must not write to:** `local-mamas`, `mamas-test` and `eye-care-test`. The proof runs on scratch copies.
- **Held-out pages:** the four held-out pages (two Indus, two Eye Care: surfaces named about, food-service and contact) are never opened, listed or named in a helper brief until the final combined re-clone. Ask Bean whether this proof includes them.
- **No guessing:** trace every fault to the code that decides it.
- **Worktrees:** never link `node_modules` or `vendor`; check a worktree for links before removing it.
- **The setting record and the looks:** if a block's paint moves, rewrite its record with `python plugins/sgs-blocks/scripts/setting-record/check.py sgs/<block> --write plugins/sgs-blocks/scripts/data/setting-records/<block>.json`. A code edit under `plugins/sgs-blocks/scripts/setting-record/` or to `site_look.py` re-proves every record and rebuilds every look (comments and docstrings do not count): batch such edits and restamp once with `check.py --changed --restamp`.
- **Server backups:** on the server, `wp db export` fails silently. Back a site up with `bash scripts/local-wp/backup-remote-db.sh <target> <label>`, and run the deploy's old-shape audit read-only before converting a site's content.
- **Brief files** carry the stream in their name.
- **Wrap-up:** run `/handoff` when the session's tasks are done.
