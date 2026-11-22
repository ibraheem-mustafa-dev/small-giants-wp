Continue the general cloning work for Small Giants WP. The cloning route (`scripts/computed-route`) turns a Claude Design draft into WordPress blocks. Bean clones two new sites from drafts: SGS, and MIC, which has a shop. Neither has a hand-built copy, so every fix must read the look from the draft.

This session is the proof only. Fixing starts only after Bean has given a definitive register of confirmed issues. Bean is near the week's usage limit: spend tokens on the proof runs and the report, never on unconfirmed fixes.

You are the orchestrator. Helpers do the heavy work; you land any commits on main:
- Cherry-pick in `E:\sgs-tmp\wt-general-x` after `git fetch` and `git checkout --detach origin/main`.
- Run the touched modules' tests, `node tools/check-mutation-lists.mjs` (0 new stale), `python scripts/check-no-client-names.py --check`, and the all-client sweep.
- Push with `git push origin HEAD:main`, with `git branch --show-current` in the same command.

## Read first

- `.claude/plans/2026-11-19-general-cloning-work.md`: "Wave 2 close", "Method from 2026-11-22 afternoon", "Next" and "Open, traced but not built".
- `E:\sgs-tmp\general-cloning\wave2\SESSION-NOTES.md`: the coordination log, newest at the bottom.
- `E:\sgs-tmp\general-cloning\wave2\rounds\ROUND-COMMON.md`: how surface work is judged. All three clients at once; the hand-built finished surface is the shape check, never a source of values; a framework gap is proved from the DB and block.json first.

## State

- Route suite at 0 failures. All of round R1's (site top) diagnosed causes have landed.
- The all-client sweep is `scripts/computed-route/tools/route-sweep.mjs`, with frozen records in `E:\sgs-tmp\general-cloning\records\`. It counts hand-overs apart from real faults and fails a landing on a new real fault.
- All five hosted sites run current main (the live shop `mamas-test` at `ed5effd01`, the other four at `ca6abcbeb` or `cf6ca94e5`), with their saved content converted for the per-device alignment migration. `eye-care-clone-test`'s content is only partly converted, because the cloning process rewrites it.
- The shared framework DB is `06e1ad615650`: the setting record's Task 3 is published.
- Block changes are guarded by the setting record's gates. If a block's paint moves, rewrite its record:

  ```
  python plugins/sgs-blocks/scripts/setting-record/check.py sgs/<block> --write plugins/sgs-blocks/scripts/data/setting-records/<block>.json
  ```

## Tasks, in order

1. **Wait for the setting record's Task 4.** The setting record session (small-giants-wp-36) makes the route read setting placements from the DB instead of calibration. It sends Task 4's `scripts/computed-route` file list before touching those files, and messages when Task 4 is on main. Until then, nothing in this list starts.
2. **Fresh baseline sweep.** About 40 minutes, heavy:
   ```
   node tools/route-sweep.mjs --records E:\sgs-tmp\general-cloning\records --out E:\sgs-tmp\general-cloning\records\baseline-<main tip> --reread --slot-dir E:\sgs-tmp\general-cloning\heavy
   ```
   Then run it again with `--baseline` pointing at the first output, to show it is deterministic. The `--reread` replaces the stale frozen Eye Care inventories.
3. **The proof clones of all three clients** (Mama's, Indus, Eye Care), each run fully to the end with nothing fixed in between, on a fresh stripped scratch copy:
   - Make the copy with `scripts/local-wp/scratch-mirror.sh create`, then `strip`. Run `build-foundation.mjs <client> --site <copy>`, then every surface.
   - The shop pages stream's setup and steps run inside the same run (SESSION-NOTES.md, the 2026-11-22 15:30 entry): Stripe test mode, real product images, the signed-in test customer rc-customer, `site-build --catalogue`, `--checkout-content` and `--account-registration`, `part-look`, and state pictures via `E:\sgs-tmp\shop-pages\pairs-shot.mjs` at 375, 768 and 1440.
   - Collect alongside: the steps 2 and 3 sweep's real-fault lines, Fill's unmapped rows, computed-style differences, and draft-and-live picture pairs at 375, 768 and 1440.
   - Also run the full route suite once, and a `/code-review` (medium) of the 2026-11-22 afternoon commits listed under the plan's "Wave 2 close". Their findings go into the report; nothing is fixed.
4. **One findings report, grouped by surface type across the three clients:** headers, drawers and mega menus, footers, home pages, content pages, forms and flows, templates, shop pages.
   - Each finding gets an ID and one line: what differs, where (client, surface, element), and its evidence (a picture pair, a sweep line, a Fill unmapped row, a computed-style difference).
   - Label the repeated instances of one issue as one issue: one ID for the cause, listing each instance on each client.
   - Include as findings the open items under the plan's "Open, traced but not built" and round R1's leftovers.
   - Publish the report as a page.
5. **Hand over to Bean, and stop.** Give Bean the report's link. Open all three drafts in Bean's local browser (each client's draft entry file under `sites/<client>/handoff/`, opened with the Windows `start` command), so Bean can compare directly across the three. Bean then gives a definitive register of confirmed issues. Do nothing else until that register arrives: no fixes and no new helpers.
6. **Retire the clone-coverage register.** This is the one exception to the stop in step 5. It has Bean's go, is not a fix, and may run while step 3's clones run, as one helper of about 45 minutes. It covers `data/clone-coverage.json`, `capabilities.mjs`'s coverage tools, `content-coverage.mjs`, `delivery-map.mjs`, `verify-live.mjs` and their tests. Restate Spec 48's done-when lines against the setting record. The setting record session notes that its record lacks the "which code writes it, which test proves it" half; say in the commit whether anything replaces it.

## Guardrails

- **Heavy jobs** take `E:/sgs-tmp/general-cloning/heavy/slot-1` or `slot-2` by mkdir; rmdir only your own. The shop pages session uses `slot-3`. At most two helpers at once.
- **Sites you must not write to:** `local-mamas`, `mamas-test` and `eye-care-test`. The proof runs on scratch copies.
- **Held-out pages:** the four held-out pages (two Indus, two Eye Care: surfaces named about, food-service and contact) are never opened, listed or named in a helper brief until the final combined re-clone. Ask Bean whether this proof includes them.
- **No guessing:** trace every fault to the code that decides it.
- **Worktrees:**
  - Never link `node_modules` or `vendor`; check a worktree for links before removing it.
  - Keep `wt-general`, `wt-general-s`, `wt-general-t`, `wt-general-b1`, `wt-general-b3`, `wt-general-r3`, `wt-general-r4`, `wt-general-x`, `wt-general-scan`, `wt-w1a` and `wt-r6c`.
- **Server backups:** on the server, `wp db export` fails silently. Back a site up with `bash scripts/local-wp/backup-remote-db.sh <target> <label>`, and run the deploy's old-shape audit read-only before converting a site's content.
- **Brief files** carry the stream in their name.
- **Wrap-up:** run `/handoff` when the session's tasks are done, and tell the shop pages session to run its full `/handoff` too.
