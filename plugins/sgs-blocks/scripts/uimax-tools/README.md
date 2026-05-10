# uimax-tools

Python tools that integrate with the uimax data layer (`~/.agents/skills/ui-ux-pro-max/data/*.csv` and `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db`) and the sgs-framework DB. Used by the cloning pipeline at +REGISTER stage and by `/sgs-update`.

## Files

| File | Role | When called |
|---|---|---|
| `uimax-write-validator.py` | Pre-write validator. Rejects payloads that violate row 211 (no licensing keywords) or row 213 (Rosetta Stone — every artefact-shaped row must carry `equivalent_implementations.sgs_block` or be flagged `gap_candidate=true`). CLI usage: `python uimax-write-validator.py <table> <json-payload>` — exits 0 on valid, 1 on rejection. | Every `/uimax-*` skill mandates a call before each write. The validator runs as a subprocess. |
| `uimax_write.py` | Python helper module providing `validate_and_write(db_path, table, payload)` and `validate(table, payload)`. Atomic: subprocess-calls the validator, then INSERTs only if valid. Raises `ValidationError` with the validator's error list on rejection. Single chokepoint so future write code cannot accidentally skip the validator. | Imported by Python code that writes uimax rows (`/sgs-clone` Stage 9 +REGISTER, future scripts). |
| `seed-block-compositions.py` | One-shot seed script for sgs-framework.db `block_compositions` table. Walks `theme/sgs-theme/patterns/*.php`, extracts `<!-- wp:sgs/* -->` block markers, INSERTs one row per pattern with the block_slugs JSON list. Idempotent: re-run preserves count. | Run once during cloning-pipeline foundation prep, or whenever new patterns ship. |
| `sgs-update-uimax-sync.py` | Two-stage sync called by `/sgs-update` Stages 3+4. **Stage 3** writes SGS blocks to the uimax DB (canonical) via `uimax_write.py` validate chain, preserving any existing Rosetta Stone payloads on already-present component_keys (skip-if-exists logic). Then triggers `update-db.py regenerate-csvs` so EVERY DB table mirrors back to its CSV — closes the `compile-sqlite` data-loss vector across all 46 uimax tables, not just `component-libraries.csv`. **Stage 4** scans `animations` for `is_gap_candidate=1` rows and emits a markdown report at `<repo>/reports/uimax-gap-candidates-<date>.md`; on first run migrates the `animations` table schema by adding the columns `/uimax-scrape-animation` writes to. | Auto-called by `/sgs-update` Stage 3+4. Can also be run standalone with `--stage 3` or `--stage 4` flags. Supports `--dry-run`. |

## Hard Rules embedded in this folder

1. **No licensing language** (blub.db row 211) — `uimax-write-validator.py` rejects any payload with `license`, `licence`, `provenance_license`, `source_license`, `ip_firewall`, `copyright`, `redistribution`, `promotion_path`, or `external_patterns` fields.
2. **Rosetta Stone discipline** (blub.db row 213) — for artefact tables (`patterns`, `components`, `animations`, `naming_conventions`), the validator requires `equivalent_implementations.sgs_block` populated with a slug OR explicit `null` plus `gap_candidate=true`.

## How they fit together

```
[/uimax-* skill or /sgs-clone Stage 9 +REGISTER]
        |
        v
   uimax_write.validate_and_write()
        |
        +--> uimax-write-validator.py (subprocess) --> reject on rule violation
        |
        v
   sqlite3.execute(INSERT ...) into ui-ux-pro-max.db
```

For `/sgs-update`:

```
Stage 1: update-db.py (sgs-framework.db scan)
Stage 2: generate-block-reference.py (regenerate spec)
Stage 3: sgs-update-uimax-sync.py --stage 3
   |
   +-- Phase A: write new SGS blocks → uimax DB component_libraries
   |             (preserves existing Rosetta Stone payloads via skip-if-exists)
   +-- Phase B: subprocess(update-db.py regenerate-csvs)
                (mirrors ALL 46 DB tables → data/*.csv + data/stacks/*.csv)
Stage 4: sgs-update-uimax-sync.py --stage 4 (animations gap-candidate report)
```

**Architecture invariant: DB is canonical, CSVs are regenerated mirrors.** Any future
write to the uimax DB (whether from `/uimax-*` skills, `/sgs-clone` Stage 9 +REGISTER,
or any new Python writer) MUST be followed by `update-db.py regenerate-csvs` so the
CSV layer stays in sync. Don't write directly to CSVs — they will be overwritten on the
next regen pass.

## Captured 2026-05-10

`uimax_write.py`, `seed-block-compositions.py`, and `sgs-update-uimax-sync.py` were all added 2026-05-10 as part of pre-M9 prep (parking entries P-12, P-13, P-15 in `.claude/parking.md`). The validator (`uimax-write-validator.py`) predates this session.
