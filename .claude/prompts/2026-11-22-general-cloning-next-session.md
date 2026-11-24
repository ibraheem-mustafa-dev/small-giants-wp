Continue the general cloning work for Small Giants WP. The cloning route (`scripts/computed-route`) turns a Claude Design draft into WordPress blocks. Before 2026-11-28 Bean clones two new sites from drafts: SGS, and MIC, which has a shop. Neither has a hand-built copy, so every fix must read the look from the draft.

This session is the proof only. Fixing starts only after Bean has given a definitive register of confirmed issues, grouped by root cause. Spend tokens on the proof runs and the report, never on unconfirmed fixes.

You are the orchestrator. Helpers do the heavy work; you land any commits on main:
- Work in a fresh worktree from `origin/main` under `E:\sgs-tmp`. Copy `scripts/computed-route/node_modules` from the main checkout with robocopy, and run `npm ci` in the worktree's `plugins/sgs-blocks` from PowerShell (the main checkout's plugin `node_modules` is empty; the look builder needs the plugin's Sass and postcss).
- Run the touched modules' tests, `node tools/check-mutation-lists.mjs` (0 new stale), `python scripts/check-no-client-names.py --check`, and the all-client sweep.
- Push with `git push origin HEAD:main`, with `git branch --show-current` in the same command.

## Where things stand (2026-11-24)

- **The three proof reclones are already running** (started about 02:40 on 2026-11-24, main `7ed5eb7d4`), so the long runs are under way before this session starts. One driver per client, `E:\sgs-tmp\general-cloning\reclone-2026-11-24\run-client.sh`:

  | Client | Worktree | Scratch copy (port) | Logs |
  |---|---|---|---|
  | Mama's Munches (`mamas-munches-redesign`) | `E:\sgs-tmp\wt-clone-mm` | `local-mediatest-rc-mm` (8131), copy of local-mamas | `E:\sgs-tmp\general-cloning\reclone-2026-11-24\mm\` |
  | Indus Foods (`indus-foods`) | `E:\sgs-tmp\wt-clone-in` | `local-mediatest-rc-in` (8132), copy of local-indus | `...\reclone-2026-11-24\in\` |
  | Eye Care (`eye-care-ward-end`) | `E:\sgs-tmp\wt-clone-ec` | `local-mediatest-rc-ec` (8133), copy of local-eye-care | `...\reclone-2026-11-24\ec\` |

  Each run: the copy made and stripped (`scratch-mirror.sh create`, `strip`); `build-foundation.mjs <client> --site <copy> --allow-unpicked` (tokens, media, menus, site build, manifest, looks, skeletons, then the header, footer and drawer); for the two shop clients the shop track (Stripe test mode with the test keys, `site-build --catalogue`, `--checkout-content`, `--account-registration`, and `scripts/render-check/seed.php` for the signed-in test customer `rc-customer`, its order and saved item, output `seed.json`); then `site-run.mjs <client> --site <copy> --only <every surface except header, footer, drawer and the held-out pages> --with-content`; then for the shop clients `part-look.mjs --write` and `--verify --strict --seed seed.json` on cart, checkout, my-account, header, product, shop, shop-chips, shop-sort, my-account-in and confirmation. Each run holds one heavy slot (`E:\sgs-tmp\general-cloning\heavy\slot-N`, `owner.txt` names it) until it ends.
- **Read each run's state** in its `progress.log` (one line per step, with exit codes and the log to open). The site run's per-surface status is `E:\sgs-tmp\wt-clone-<mm|in|ec>\sites\<client>\build\qa\site-run\<stamp>\status.json`; the foundation's step logs are under `sites/<client>/build/qa/foundation/<stamp>/`. A run that stopped part-way is resumed from its failed stage (`site-run.mjs ... --stages <stage>,...`, README "Running only what a change needs"), never by fixing route code first: a failure is a finding.
- **The four held-out pages were not cloned** (Indus about and food-service, Eye Care about and contact; the plan clones them once at the end with no fixing after). Ask Bean whether this proof includes them; if yes, run `site-run.mjs <client> --site <copy> --only <those two>` on the same copy once its run has finished.
- **Since this track paused:** calibration is retired (the setting record and the site looks replace it, `.claude/plans/archive/2026-11-21-setting-record.md`); `site-run.mjs --stages` reruns from one stage and the walk reuses its draft reading; the sweep builds every client's looks before it proposes. On 2026-11-23 and 24 main also gained: one secrets lookup through each site's `calibration-targets.json` entry; the setting record refreshed (buybox's two meter text-align entries, browser verdicts re-measured); Custom CSS scope repeat 5 against settings at most 4; the Custom CSS scoper's escape-safe off-site url check; product structured data with WooCommerce shipping classes and a shop-policies screen. None of it is deployed: every hosted site runs older code (sandybrown and indus-test `ca6abcbeb`, both Eye Care sites `cf6ca94e5`, Mama's live shop `ed5effd01`).

## Read first

- `.claude/plans/2026-11-19-general-cloning-work.md`: "Method from 2026-11-22 afternoon", "Next (Bean, 2026-11-22)", "Open, traced but not built" (with "Moved in from the plans archived on 2026-11-23") and Task 8 (Proof) with its register candidates.
- `E:\sgs-tmp\general-cloning\wave2\rounds\ROUND-COMMON.md`: how surface work is judged. All three clients at once; the hand-built finished surface is the shape check, never a source of values; a framework gap is proved from the DB and block.json first.

## Tasks, in order

1. **Check the three runs** (5 minutes, then as they finish): read each `progress.log`. Any FAIL line or stopped stage: open its log, say in one line what stopped it, and resume from that stage once (a stop the run cannot pass is itself a finding; record it and go on). The runs take hours; do task 2 meanwhile.
2. **Fresh baseline sweep** once a heavy slot is free (about 40 minutes): `node tools/route-sweep.mjs --records E:\sgs-tmp\general-cloning\records --out E:\sgs-tmp\general-cloning\records\baseline-<main tip> --reread --slot-dir E:\sgs-tmp\general-cloning\heavy`, then again with `--baseline` pointing at the first output to show it is deterministic. Done when both pass and no surface lists a block without a default look (a non-zero last column is a finding: name the block and why its look did not build). Also run the full route suite once, and a `/code-review` (medium) of round R1's commits (`525ad1c9a`, `7ff6ea088`, `9aa65da89`, `92f1a8a81`, `ca6abcbeb`, `334e16b52`, `455deb7fd`); their findings go into the report, nothing is fixed.
3. **Collect each finished run's evidence:** the sweep's real-fault lines, Fill's unmapped rows, computed-style differences from the walks, part-look's verify reports, and draft-and-live picture pairs at 375, 768 and 1440 (`E:\sgs-tmp\shop-pages\pairs-shot.mjs` with `--route --login --widths`, which also takes the shop states). Mama's home pairs also serve as Bean's check by eye of the setting record's proof (FP-13, plan Task 8 candidate c).
4. **One findings report, grouped by surface type across the three clients:** headers, drawers and mega menus, footers, home pages, content pages, forms and flows, templates, shop pages.
   - Each finding gets an ID and one line: what differs, where (client, surface, element), and its evidence (a picture pair, a sweep line, a Fill unmapped row, a computed-style difference).
   - Label the repeated instances of one issue as one issue: one ID for the cause, listing each instance on each client.
   - Include as findings the open items under "Open, traced but not built", round R1's leftovers, and Task 8's register candidates (a), (b) and (d); the framed pictures' missing padding setting for a layer that holds blocks is a finding. Mama's "Build your Zookie" builder is a custom build job, not counted. A shop page that failed because a shop setup step failed is a setup finding, not a cloning one: say which.
   - Publish the report as a page.
5. **Hand over to Bean, and stop.** Give Bean the report's link. Open all three drafts in Bean's local browser (each client's draft entry file under `sites/<client>/handoff/`, with the Windows `start` command) and give the three scratch copies' local addresses, so Bean can compare directly. Bean reviews the clones, adds the gaps he finds, and you sort both lists into one register by root cause and common fix. Bean approves the register; the fixes then land in one go. Do nothing else until that register arrives: no fixes and no new helpers.
6. **Retire the clone-coverage register.** The one exception to the stop in task 5: it has Bean's go, is not a fix, and may run while the clones run, as one helper of about 45 minutes. It covers `data/clone-coverage.json`, `capabilities.mjs`'s coverage tools, `content-coverage.mjs`, `delivery-map.mjs`, `verify-live.mjs` and their tests. Restate Spec 48's done-when lines against the setting record, and say in the commit whether anything replaces the register's "which code writes it, which test proves it" half.

## Guardrails

- **Heavy jobs** take `E:/sgs-tmp/general-cloning/heavy/slot-1`, `slot-2` or `slot-3` by mkdir; the three reclones hold all three while they run, so the sweep waits for one to finish. rmdir only your own.
- **Do not edit or rebase the three reclone worktrees** while their runs are going; they are the proof's code. Remove each (after checking it for links) only when its evidence is collected, and drop its scratch copy only after Bean has seen the clones.
- **Sites you must not write to:** `local-mamas`, `local-indus`, `local-eye-care`, `mamas-test` and `eye-care-test`. The proof runs on the scratch copies.
- **No guessing:** trace every fault to the code that decides it.
- **Worktrees:** never link `node_modules` or `vendor`; check a worktree for links before removing it.
- **The setting record and the looks:** if a block's paint moves, rewrite its record with `python plugins/sgs-blocks/scripts/setting-record/check.py sgs/<block> --write plugins/sgs-blocks/scripts/data/setting-records/<block>.json` only when the whole file should be regenerated; to add entries the proof finds, add just those entries and restamp (`check.py sgs/<block> --record <file> --restamp`), because a full rewrite also drops proof outcomes. After a record changes, reseed the DB's setting record tables (`python plugins/sgs-blocks/scripts/dbschema/seed_reference_data.py`, framework DB backed up first): the route reads `setting_placements`, not the files.
- **Server backups:** `bash scripts/local-wp/backup-remote-db.sh <target> <label>`; `wp db export` on the server fails silently.
- **Brief files** carry the stream in their name, and a helper's final reply must hold its whole report.
- **Wrap-up:** run `/handoff` when the session's tasks are done.
