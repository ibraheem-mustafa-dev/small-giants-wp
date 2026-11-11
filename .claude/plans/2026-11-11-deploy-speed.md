---
doc_type: plan
title: Faster SGS deploys (partial upload and the other ship speed-ups)
status: active
created: 2026-11-11
governs: plugins/sgs-blocks/scripts deploy modules; .claude/deploy-architecture.md
---

# Faster SGS deploys

**Goal (Bean, 2026-11-11):** a deploy uploads only what changed instead of the whole 45 MB build, because the Hostinger link runs at about 0.14 MB/s and drops every minute or two; and every other way to cut a full `ship.py` run is taken. How the deploy works now: `.claude/deploy-architecture.md` (Partial upload, Isolation, Stage order).

## Done (on main)

| What | Commit | Proof |
|---|---|---|
| Partial upload: the live tree is listed over SSH, only changed files go, applied in a checked staging copy, `.bak` swap, full package only when needed | `7c9d5ec80`, `f4cfcf43e`, `d7d787c3a`, `ba0cb85f4`, `481c64b32` | `build-deploy.py --self-test` cases 25 and 26; sandybrown and mamas-test trials (numbers in deploy-architecture.md "Measured 2026-11-11") |
| `ship.py` no longer reseeds on every run, so a repeat ship hits the gate cache | `824c812cc` | `tests/test_ship.py` with a negative control |
| `npm run build` runs the fast gates beside webpack | `21a170a56` | 447 s to 270 s for the whole build at one commit, all 1,205 build files byte-identical |
| Two deploys of one commit no longer crash the second when both record the gate pass | `ea4b0ae70` | reproduced (PermissionError) and gone; deploy_cache self-test |
| Payload ceiling 55 MB, with what grew | `b50a4200a` | measured 46.1 MB |
| The deploy worktree's `vendor/` is a real folder, so Composer never writes the shared checkout and shipped autoload files carry no temp path | `983218295` | mamas-test repeat sent nothing; self-test case 27 |
| `run-motion-gates.py --jobs N` (default 1) | `d64bae4de`, `a43111864` | four at a time timed out a self-test inside `gate:full` under load, so the default stayed serial |
| Second-opinion fixes: build staging cleanup and safer move, fast-tier wiring gate (`assert-gate-wiring`), cut-off listing retried, `vendor/` links limited to the shared `vendor/` | `7f4cfc080` | self-tests with planted faults; the wiring check fails on a reverted `build` script |

## Parked

- **Editor check, change-scoped.** Built, unit-tested, not proven live; the code is `.claude/plans/patches/2026-11-11-editor-check-speed.patch` (`git apply` on main at `a43111864` applies cleanly). It records the sha256 of every file the editor loads after a clean run per mirror, and when only `build/blocks/<name>/` changed opens just the targets that draw those blocks (through synced patterns and template parts, `select-targets.mjs`, self-test with a negative control) plus targets whose content changed. Blocked on: a clean full run to record the baseline. On local-mamas every full run on 2026-11-11 hit `FAIL no-console-error page 148 contact`, a `TypeError ... reading 'forEach'` thrown by WooCommerce's own block script, intermittently (a three-at-once run did not hit it). Next: find why that WooCommerce script throws on the mirror's contact page (or whether the checker should ignore third-party script errors), get one clean run, then run a scoped run after a one-block change and compare its verdicts and time with a full run.
- **Editor check beside `gate:full`.** In the same patch (`build_and_gate()` starts the check in a thread after the build; the timing table shows it as `editor-check (alongside gate-full)`). Not run live yet. Next: one `ship.py` run on an uncached commit with `--editor-check`, compare wall clock with the serial order.
- **Not pursued:** three editors at once by default (13m11s against 14m39s serial for 50 targets on local-mamas, but the mirror dropped two requests and left those targets unanswered; `--parallel N` stays in the patch); a webpack persistent cache (webpack's own docs: the cache only hits at the same absolute path; with the fast gates now beside webpack, webpack's time is hidden anyway).

## Known, outside this work

- The mirror sync (`scripts/local-wp/sync-build.sh`) took about 32 minutes for 4,039 files from `E:` into WSL on 2026-11-11 while another sync ran; the deploy's editor check pays it every run. It copies `plugins/sgs-blocks/scripts/` (1,986 files) that no site runs.
- The shared checkout's `plugins/sgs-blocks/vendor/composer/autoload_*.php` still hold a base path into a deleted temp worktree, written by deploys before `983218295`; the next `composer dump-autoload` in the shared checkout rewrites them.
