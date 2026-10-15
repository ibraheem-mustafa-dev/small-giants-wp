---
doc_type: plan
title: Multi-site deploys - build and check once, ship to every site at the same time
status: in-progress
date: 2026-10-15
---

# Multi-site deploys

## Why

A deploy measured 671s on 2026-10-15: build about 270s, `gate:full` 345s (11 gates run one after another), the site-specific work (stored-content audit, upload, unpack, purge, live checks) about 40s. The build and the gates are identical for every site, so deploying one commit to N sites repeats about 10 minutes N times, and the cost grows with every client test site.

## What changes

1. **`--target` takes a list.** `--target sandybrown,eye-care-test`, or `--target all` for every entry in `TARGETS`. Naming a target in the list counts as its explicit opt-in. One target behaves exactly as today.
2. **Build and gate once, ship in parallel.** With more than one target the run builds and runs `gate:full` once in its isolated worktree, then starts one child deploy per target from that worktree (`--skip-build`), all at the same time. Each child writes its own log; the parent prints one line per site (its result line and seconds) and exits non-zero if any site failed.
3. **A passed check is remembered.** `gate:full` passing and the built `build/` are cached under `~/.cache/sgs-deploy/<key>/`, where the key is the commit's tree hash plus the framework DB's sha256 (the full gates read the theme, `sites/`, `.claude/specs`, `.claude/plans` and the DB, not only the plugin, so nothing narrower is honest). A later deploy of the same commit with the same DB restores `build/` and skips the gates, logging when they passed. The cache is used only by isolated runs (a worktree at HEAD holds exactly the committed tree); `--no-isolate`, `--allow-dirty` and `--payload` runs never read or write it. `--no-cache` forces a fresh build and gate run. The newest 5 keys are kept.
4. **A theme-only deploy whose gates are cached skips the build**: the build exists only to feed the gates there.
5. **Packaging is serialised machine-wide.** Packaging swaps the shared `vendor/` autoloader to its no-dev form and back; two deploys packaging at once (two sessions today, or two sites now) could ship the dev autoloader (D849). The swap and the tar run under a lock file in the temp folder; packaging takes seconds.
6. **Motion QA runs only for sandybrown.** `qa:motion` probes the sandybrown canary whatever the target, so on another target its pass proved nothing about that site. It now runs when sandybrown is the target and logs a skip naming the reason otherwise.
7. **The full gates run side by side** (`run-gates.py --jobs`), the slowest being about 75s, if a measured parallel run returns the same verdicts as the serial run and a planted failure still fails it. Each gate writes only to temp copies or in its baseline-update mode (checked 2026-10-15).

## Where the code goes

`build-deploy.py` is 2,378 lines, over the 1,000-line limit, so it does not grow: the cache goes in `scripts/deploy_cache.py`, the multi-site orchestration in `scripts/deploy_multi.py`, each with a `--self-test` that `build-deploy.py --self-test` also runs. `build-deploy.py` only gains the calls into them.

## Verification

- `build-deploy.py --self-test` passes, with new cases: the key changes when the tree or the DB changes; a non-isolated run never touches the cache; `all` and a comma list resolve and an unknown name is refused; the package lock refuses a second holder.
- `--dry-run --target sandybrown,eye-care-test` prints one plan per site and one build.
- A real two-site theme deploy finishes in about one deploy's time; a repeat of the same commit restores from the cache and skips the gates; `probe-shop-filters.mjs` stays green on both sites.
- Parallel gates: the verdict table matches the serial run, and a planted failure turns it red.

## Status (2026-10-15)

- Items 1-6 built (f1f5a1e76). `build-deploy.py --self-test` passes with cases 17-18, each proven red on a planted fault (a key that ignores the DB, a lock that does not lock).
- Measured live: a two-site `--theme-only` deploy shipped both sites in 28-39s end to end, side by side, each with its own client `theme.json` (md5-verified) and HTTP 200; `probe-shop-filters.mjs` green on both.
- The cache's live proof (a repeat deploy restoring from the cache) is open: every full deploy from `main` this afternoon aborted on in-flight motion work committed half-way (the `data-sgs-fx` list-match gate, fixed in 8d8b94849; then `generated-fx-effects.php` stale against the reseeded DB). Run it when `main` builds and gates green: `--target sandybrown,eye-care-test`, then the same command again, which must log `RESTORED` and `PASSED ... not re-run`.
- Later the same afternoon `main` also failed the fast tier's `check-element-manifest-conformance` after the reseed 668969624 (`orphan_style_defect=49 exceeds baseline 0`); reported to the motion sessions. The cache proof waits on that too.
- Item 7 (`run-gates.py --jobs`) built with self-test cases (opt-in). One measured parallel run: 241s wall-clock for the 11 full gates on a loaded machine (the serial sum on the same afternoon was 476-697s). `gate:full` adopts `--jobs 4` once a serial and a parallel run on the same tree return the same verdicts.
- Stopping a deploy mid-run (TaskStop, Ctrl+C) skips `run_isolated()`'s cleanup and leaks its `sgs-deploy-wt-*` worktree; remove it with `git worktree remove --force <path>` after checking no process uses it.
- Follow-up: `build-deploy.py` grew 78 lines (2,456); split its self-tests and post-deploy steps into modules.

## Docs to update

`CLAUDE.md` Build and deploy, `.claude/dev-setup.md` deploy section, `/wp-sgs-deploy` skill if it names the flags.
