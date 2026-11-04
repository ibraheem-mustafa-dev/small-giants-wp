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
