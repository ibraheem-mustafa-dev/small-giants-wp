---
doc_type: plan
title: Multi-site deploys - build and check once, ship to every site at the same time
status: closed 2026-10-17; open speed-ups are in .claude/deploy-architecture.md "Known limits and next speed-ups"
date: 2026-10-15
---

# Multi-site deploys

## Why

A deploy measured 671s on 2026-10-15: build about 270s and `gate:full` about 345s, run serially (item 7 now runs the gates four at a time), the site-specific work (stored-content audit, upload, unpack, purge, live checks) about 40s. The build and the gates are identical for every site, so deploying one commit to N sites repeats about 10 minutes N times, and the cost grows with every client test site.

## What changes

1. **`--target` takes a list.** `--target sandybrown,eye-care-test`, or `--target all` for every entry in `TARGETS`. Naming a target in the list counts as its explicit opt-in. One target behaves exactly as today.
2. **Build and gate once, ship in parallel.** With more than one target the run builds and runs `gate:full` once in its isolated worktree, then starts one child deploy per target from that worktree (`--skip-build`), all at the same time. Each child writes its own log; the parent prints one line per site (its result line and seconds) and exits non-zero if any site failed.
3. **A passed check is remembered.** `gate:full` passing and the built `build/` are cached under `~/.cache/sgs-deploy/<key>/`, where the key is the commit's tree hash plus the framework DB's sha256 (the full gates read the theme, `sites/`, `.claude/specs`, `.claude/plans` and the DB, not only the plugin, so nothing narrower is honest). A later deploy of the same commit with the same DB restores `build/` and skips the gates, logging when they passed. The cache is used only by isolated runs (a worktree at HEAD holds exactly the committed tree); `--no-isolate`, `--allow-dirty` and `--payload` runs never read or write it. `--no-cache` forces a fresh build and gate run. The newest 5 keys are kept.
4. **A theme-only deploy whose gates are cached skips the build**: the build exists only to feed the gates there.
5. **Packaging is serialised machine-wide.** Packaging swaps the shared `vendor/` autoloader to its no-dev form and back; two deploys packaging at once (two sessions today, or two sites now) could ship the dev autoloader (D849). The swap and the tar run under a lock file in the temp folder; packaging takes seconds.
6. **Motion QA runs only for sandybrown.** `qa:motion` probes the sandybrown canary whatever the target, so on another target its pass proved nothing about that site. It now runs when sandybrown is the target and logs a skip naming the reason otherwise.
7. **The gates run four at a time, longest first** (`run-gates.py --jobs 4`, set in `gate:fast`, `gate:full`, `gate:all` and `prebuild`). A serial and a parallel run on one clean tree returned identical verdicts and a planted failure still fails (`run-gates.py --self-test`). Each gate writes only to temp copies, or to a tracked file with exactly one writer (traced 2026-10-17).

## Where the code goes

`build-deploy.py` is 2,378 lines, over the 1,000-line limit, so it does not grow: the cache goes in `scripts/deploy_cache.py`, the multi-site orchestration in `scripts/deploy_multi.py`, each with a `--self-test` that `build-deploy.py --self-test` also runs. `build-deploy.py` only gains the calls into them.

## Verification

- `build-deploy.py --self-test` passes, with new cases: the key changes when the tree or the DB changes; a non-isolated run never touches the cache; `all` and a comma list resolve and an unknown name is refused; the package lock refuses a second holder.
- `--dry-run --target sandybrown,eye-care-test` prints one plan per site and one build.
- A real two-site theme deploy finishes in about one deploy's time; a repeat of the same commit restores from the cache and skips the gates; `probe-shop-filters.mjs` stays green on both sites.
- Parallel gates: the verdict table matches the serial run, and a planted failure turns it red (met 2026-10-17).

## Status (2026-10-15)

- Items 1-6 built (f1f5a1e76). `build-deploy.py --self-test` passes with cases 17-18, each proven red on a planted fault (a key that ignores the DB, a lock that does not lock).
- Measured live: a two-site `--theme-only` deploy shipped both sites in 28-39s end to end, side by side, each with its own client `theme.json` (md5-verified) and HTTP 200; `probe-shop-filters.mjs` green on both.
- The cache's live proof (a repeat deploy restoring from the cache) is open: every full deploy from `main` this afternoon aborted on in-flight motion work committed half-way (the `data-sgs-fx` list-match gate, fixed in 8d8b94849; then `generated-fx-effects.php` stale against the reseeded DB). Run it when `main` builds and gates green: `--target sandybrown,eye-care-test`, then the same command again, which must log `RESTORED` and `PASSED ... not re-run`.
- Later the same afternoon `main` also failed the fast tier's `check-element-manifest-conformance` after the reseed 668969624 (`orphan_style_defect=49 exceeds baseline 0`); reported to the motion sessions. The cache proof waits on that too.
- Item 7 adopted (2026-10-17, `35f9d91e7`, longest-first in the commit that follows it): on one clean tree the fast tier took 191.2s serial and 63.0s at 4 at a time, the full tier 340.5s and 207.4s, and 132.2s once the slowest gates start first; verdicts identical in both modes. The architecture of the deploy files and how to add to them is `.claude/deploy-architecture.md`.
- Open speed-ups (2026-10-17, council-checked; each needs a live canary or a re-timing to verify, so none is built): trim `probe-marquee.mjs` (367s of the 735s full motion QA: a 2s settle after about 32 page opens, a re-measured control in its reduced-motion pass, 1s measurement windows) by about 100s while keeping its 2% rate judge and every `/control` row red; run the scripts inside `run-motion-gates.py` four at a time (about 20 to 30s; it is the slowest full-tier gate at about 135s); re-run `run-gates.py --time` after any gate is added. Parallel live probes are ruled out: four at a time made two probes fail on non-200 pages and the canary CDN answered 403 for about seven minutes.
- Stopping a deploy mid-run (TaskStop, Ctrl+C) skips `run_isolated()`'s cleanup and leaks its `sgs-deploy-wt-*` worktree; remove it with `git worktree remove --force <path>` after checking no process uses it.
- `build-deploy.py` split into importable modules by job (99def9852, 4a7e0c669): the command is 496 lines; `deploy_common`, `deploy_guards`, `deploy_ship`, `deploy_verify` and `deploy_selftest` hold the steps (`.claude/dev-setup.md` "Where the code lives"). Self-test, `--assert-wired`, both path-loading scripts, single- and two-site dry runs, and the fast tier (161 gates) pass on the split. Another session's deploy recorded the first live cache pass (2026-10-15 17:04, commit 59022560). The live restore proof is still open: from 17:00 the shared DB was mid-reseed (`roster.json` stale, `motion_presets` 100 against 118 in the repo), so `gate:full` could not pass.

## Docs to update

`CLAUDE.md` Build and deploy, `.claude/dev-setup.md` deploy section, `/wp-sgs-deploy` skill if it names the flags.
