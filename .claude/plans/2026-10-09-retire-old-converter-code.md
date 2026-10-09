---
doc_type: plan
title: "Remove the old cloning pipeline code (superseded by Spec 47)"
spec: .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md
created: 2026-10-09
status: not started
---

# Remove the old cloning pipeline code

**Purpose.** Spec 47's computed route replaced the old converter pipeline (Bean, 2026-10-09). The old code (about 8 MB, over 360 tracked files) is superseded, so it is deleted rather than kept and re-pointed. Nothing in it is edited to chase spec renames.

**Why it is not a one-command delete.** The old directories are still wired into live tooling. Each wire must be cut first, or the next commit's gates fail for every session.

## Scope (all under `plugins/sgs-blocks/scripts/` unless stated)

| Remove | Size | Live wire to cut first |
|---|---|---|
| `converter/` | 198 files | `package.json::check:preset-absence-no-slug-literal`; `coverage-matrix/db_queries.py` imports `converter.services.has_inner`; `db-consistency/check_role_resolution_guess.py` and `resolver_bridge.py` import `converter.db.db_lookup` and `converter.resolvers`; `behavioural-analyser/assign-canonical.py` imports `db_lookup`; `check-converter-destination-shape.py`; `gates.json` entries |
| `recogniser/` | 40 files | `sgs-update-v2.py` seeds `block_render_repeaters` through `render_repeater_seeder.py`; only the converter reads those tables |
| `orchestrator/` and `sgs-clone-orchestrator.py` | 81 files | `orchestrator/upload_and_patch.py` calls `sync-business-info.py`, and `push-theme-snapshot.py` is its live replacement; confirm nothing else calls `upload_and_patch.py` |
| `oracle/` | 20 files | `oracle/provision_fixture_canaries.py`; check no live gate runs it |
| `cheat-gate/`, `excluded-gate/` | 24 files | `package.json::check:cheats` and `check:excluded`; check whether `gates.json` or `run-gates.py` run them |
| `parity/computed-parity.js` and its `fixtures/` | 3 files | Only the old orchestrator's Stage 11.6 calls it; docs name it; `scripts/check-no-client-names.py` whitelists its path |
| `seed-render-composition.py`, `seed-render-singletons.py`, `test_render_singleton_seeder.py` | 3 files | `sgs-update-v2.py` Stage 1 runs them; the `block_render_*` tables are read only by the converter |

Keep (live): `parity/draft-live-walk.mjs`, `parity/lib/`, `parity/GAP-CHECKLIST.md`, `theme-extractor/`, `push-theme-snapshot.py`, `derive-dark-palette.py`, `sync-business-info.py`, `business_info/`, and the root `scripts/computed-route/`.

## Steps

1. For each row, prove no live reader: `git grep` the directory name and its module names from every live entry point (`gates.json`, `run-gates.py`, `package.json`, `build-deploy.py`, `sgs-update-v2.py`, `.claude/hooks/`, `~/.claude/skills/*`, PHP runtime). Run `audit-script-reachability.py` before and after; run `gate:full` to prove nothing went red.
2. Cut each wire in the same commit as the delete it frees: the `package.json` scripts, `gates.json` entries, the `sgs-update-v2.py` seeder stage, the `db-consistency` checks that import the converter, and the `block_render_*` tables with their seeders and DB schema.
3. Reseed the framework DB from HEAD (never from a dirty tree) and diff the role map and tables against the previous seed.
4. Delete `.claude/rules/cloning-pipeline.md`'s converter paths, and the LEDGER Front E and Front N blocks.
5. Move the deletions in one commit per directory, `gate:full` green before each push. Archive nothing: git history keeps it.

## Open decisions for Bean

- Whether the `block_render_*` DB tables and their seeders go in this plan (recommended) or stay as unused data.
- Whether the R8 motion-recognition rules in the deleted Spec 31 §14 are dropped or logged as a deferred item in Spec 47.
