# Track A3 (label a3-fixes; plan Task 2): ready rf7, rf9 and rf10 to land

Evidence: `i1-branches.out` rows rf7-shop-forms, rf9-measure, rf10-data. Existing worktrees `E:/sgs-tmp/wt-<branch label>` (skip Setup step 1). Rebase each onto `main` first.
1. rf9-measure: the rebase conflicts in `scripts/computed-route/tools/run-tests.mjs` (main added the temp guard in `904c517dc`; rf9 added the driver check): keep both. Re-aim its 1 stale marker (`site-run-woo-page.mutations.json` entry 5). Run `scripts/parity/tests/w21-fresh-load.test.mjs` and `w17-states.test.mjs` once each inside a heavy slot (they were never run on a quiet machine) and report. <!-- dangling-ok: files a worker creates or that exist only on its branch -->
2. rf7-shop-forms: re-aim its 6 new stale markers; its edit to `u9-planted-draft.test` passes on main too, so make it fail without the fix or drop it.
3. rf10-data: its index is stale (all 14 listed paths match HEAD by blob): run `git -C E:/sgs-tmp/wt-rf10-data reset -q` (index only, no file change) and confirm `git status` is clean. Done when: each branch's changed tests pass and `check-mutation-lists.mjs` shows 0 new on each.
