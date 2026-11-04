---
doc_type: plan
title: Gate, reseed and patch tooling speed and safety
status: active
created: 2026-11-04
owner: framework tooling (any session; serialise with the deploy queue)
---

# Gate, reseed and patch tooling speed and safety

## Why

On 2026-11-03/04 three parallel client streams spent most of their wall time waiting: each framework batch needed a shared-DB reseed (about 10 minutes), a hand-run full gate tier (6 to 15 minutes, run one gate at a time), then a deploy that ran the same full tier again, and every session held the others' reseeds and deploys meanwhile. Two shipped faults (an editor crash on every form and checkbox block, then on every block holding a multi-button) passed every gate because no gate loads the block editor. A patch script accepted a setting the block does not declare, so a fix silently did nothing.

## Done

- Step 1, reseed timing (2026-11-04): `sgs-update-v2.py` prints a per-stage table after every run. First measured table, a `--db` run on a copy of the framework DB, 327s in all: Stage 1 214s (65%), Stage 14 56s (17%), Stage 2 51s (16%), Stage 8 3s, Stages 3-7, 9-13 under 1s each. **This table is not a full reseed:** under `--db` the guard `_guard_children_for_db_override` skips 28 child scripts that do not read `$SGS_FRAMEWORK_DB` (Stage 12's report scanners, `build-roster.py`, `seed_history.py`, `check_schema_drift.py`, `check_value_identity.py` and others), so the ~10 minutes a shared-DB reseed takes minus 327s is spent in those children, which only a run on the shared DB (or step 8's readers honouring the env variable) exposes. Consequence for steps 2 and 3: a `--db` identity proof covers Stages 1, 2, 8, 11, 13 and 14 only; Stage 12's scanners are proven by running old and new code read-only on the same DB and comparing the report files they write.
- Fix found while measuring: under `--db` the guard also skipped `validate-motion-presets.mjs`, which opens no database, and returned an empty success, so `motion_presets_seed.validate_presets` raised "produced no verdict" and no `--db` reseed could finish. `DB_FREE_CHILDREN` in `sgs-update-v2.py` now lets listed database-free children run (test: `scripts/tests/test_seeder_routing.py::test_update_db_flag_runs_listed_db_free_children`).
- Step 2, identity proof (2026-11-04): `plugins/sgs-blocks/scripts/verify-reseed-identity.py` seeds two worktrees on two copies of the same starting DB (`--db`), then compares every table row by row (ignoring time-of-writing columns and `schema_metadata.last_*`), the repository files each run left changed (repository path and clock times normalised) and the Stage 12/13 finding lines. Same code on both sides: IDENTICAL (328s and 358s side by side). Negative control (`--plant-difference`): one changed database cell and one changed repository file, both reported. `--stage 12 --shared-readonly` proves a report-only stage on the shared DB without `--db` (which skips the scanners) and fails as inconclusive if the DB hash changed during the run.
- Step 4, upstream scrape cache (2026-11-04): Stage 2 skips the ten-source scrape when `schema_metadata.last_full_refresh_ts` is under 24 hours old and `wp_version_indexed` equals the requested WordPress version; `--refresh-upstream` or `--stage 2` forces it. Old against new on a copy of the shared DB: IDENTICAL; Stage 2 51s to 0s, the `--db` run 290s to 243s.
- Step 3, scanner pool (2026-11-04): Stage 12 runs `build-roster` first and alone, then the other 23 scanners 6 at a time, and still parses serially in scanner order. Old against new on the shared DB read-only (`--stage 12 --shared-readonly`): IDENTICAL repo files and finding lines, the DB hash unchanged; Stage 12 251s to 80s. Tests: `scripts/tests/test_stage_speedups.py`.
- Step 7, shared full-tier pass (2026-11-04): `build-deploy.py --gate-only` builds and runs `gate:full` for HEAD in the isolated worktree and records the pass in the deploy cache; the second run of the same commit took 14s (first 742s) and logged `gate:full PASSED for this commit ... not re-run`. A hand-run `npm run gate:full` records nothing. See `.claude/deploy-architecture.md` (Deploy cache).
- Step 10, patch script: `scripts/local-wp/patch-block-attrs.php` refuses a `set` of an attribute the block type does not declare, in a dry run too; `scripts/local-wp/test-patch-block-attrs.py` passes 4 of 4 and the unguarded script accepted the same patch.
- `run-gates.py` runs gates side by side by default (half the logical CPUs, at most 6), and the npm scripts pass no `--jobs` (`9c55a8fa3`). Measured on one tree: full tier 720s at 1, 242s at 4, 151s at 6 at once, identical verdicts. Recorded in `.claude/deploy-architecture.md` (Gate tiers).

## Steps

1. **Reseed timing.** Add stage timestamps to `plugins/sgs-blocks/scripts/sgs-update-v2.py` (each of its 14 stages and `seed_reference_data.py`), so every later step is measured, not estimated. Done when one reseed log prints a per-stage table.
2. **Identity proof first.** A `--verify-identity` mode (or a script beside it) that seeds two DB copies (`--db copyA` old code, `--db copyB` new code) from the same commit and fails on any difference in a sorted per-table dump (ignoring timestamp columns and `schema_metadata.last_*`) and in the regenerated repo files. Every speed-up below must pass it.
3. **Parallel report scanners.** Stage 12 runs 24 report-only scanners one after another (estimated 2-4 min): run them in a pool of 4-6 (results merged in a fixed order; `build-roster` first and alone, because it writes `roster.json`). Expected saving 1.5-3 min.
4. **Cache the upstream scrape.** Stage 2 scrapes ten WordPress/GitHub sources every run (estimated 1-3 min, all INSERT OR IGNORE): skip it when the last full refresh is under a day old and the WordPress version is unchanged, plus a `--refresh-upstream` flag. Expected saving 1-3 min.
5. **File-only stages side by side** (stages 6, 7, 11): 0.5-1.5 min. DB-writing stages stay serial.
6. **Per-block incremental Stage 1** (hash each block directory in `indexed_files`; re-derive changed blocks only, delete rows for removed attributes, re-run cross-block steps in full). Only after steps 2-5, and only behind the identity proof.
7. **Gate pass cache shared with the deploy.** A clean full-tier pass on a commit and framework DB writes the same record `build-deploy.py`'s `deploy_cache` reads, so the deploy skips a full tier the session already ran on that commit (today it runs twice per push).
8. **Per-worktree framework DB.** The writer already honours `--db` and `$SGS_FRAMEWORK_DB`, and `tree_guard` only protects the shared DB. Audit the ~116 readers of `sgs-framework.db` (gates, `check_schema_drift`, `check_value_identity`, `seed_history`, MCP and skill tools) so each honours `$SGS_FRAMEWORK_DB`, then let a session reseed and gate against its own copy and serialise only a short publish step. Decide how per-worktree repo outputs (`attr-role-map.json`, `roster.json`, `seed-history.json`) merge.
9. **Editor-crash gate.** A gate that loads every block in the block editor (the editor-canvas harness or a WordPress Playground/mirror run) and fails on "This block has encountered an error" or a console error. Planted negative control: the per-device flexDirection crash fixed in `3b47804e6`.
10. **Patch script refuses unknown settings.** `scripts/local-wp/patch-block-attrs.php` runs inside WordPress: look up the block type's registered attributes and refuse (in dry run too) a `set` of an attribute the block does not declare. On 2026-11-03 a fixer set `margin` on `sgs/form-field-tiles`, which declares none: it computed to 0px and build-deploy's oldshape audit later refused the deploy.

## Done when

A typical framework batch (1-5 blocks) reseeds in under 3 minutes with the identity proof green, the full tier runs once per commit, sessions reseed without holding each other, an editor crash fails the build, and the patch script refuses an undeclared attribute.
