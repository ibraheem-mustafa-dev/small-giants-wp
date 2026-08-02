---
doc_type: report
project: small-giants-wp
created: 2026-08-02
phase: Phase 1 scoping gate
parent: .claude/plans/2026-08-01-db-derivation-and-converter-cleanup.md
---

# Phase 1 scoping — what actually needs a seeder

**Why this exists.** The Step 0.5 rebuild surfaced **18 empty tables nobody had on a list**. Phase 1
was scoped as "write seeders for the 4 known gaps, then delete the migrations". Treating all 18 as
gaps would have been the denominator error this project has now made four times. Each table below
was classified on **evidence** — does a writer exist anywhere in the repo — not on its name.

**Method.** Regex for `INSERT [OR x] INTO` / `REPLACE INTO` / `UPDATE <table>` across every `.py`
in `plugins/sgs-blocks/scripts/`, bucketed by where the writer lives (migration / seeder /
`db_lookup` / test / other). Then a sandbox experiment for the `db_lookup` group.

---

## THE HEADLINE FINDING — two "gaps" were never gaps

`converter/db/db_lookup.py` runs three idempotent seeders **at module load**. They only fire when
something **imports** `db_lookup` — i.e. when the *converter* runs. `/sgs-update` never imports it,
so a rebuild left those tables at zero and they read exactly like missing seeders.

Proven in a sandbox against a freshly-schema'd empty DB:

| table | before import | after import | live |
|---|---|---|---|
| `html_tag_to_core_block` | 0 | **17** | 17 ✅ exact |
| `roles` | 0 | **21** | 29 (partial) |
| `property_suffixes` | 0 | 0 | 154 — genuine gap |
| `slots` | 0 | 0 | 104 — genuine gap |
| `excluded_properties` | 0 | 0 | 10 — genuine gap |

⛔ **`roles` was wrongly on the known-unreproducible list.** It is 21/29 regenerative today. The
parent plan's F1 note had already corrected "roles is READ-ONLY"; the KNOWN list was never updated
to match. **Fixed:** `--rebuild` now calls `run_module_load_seeders()`, so both tables populate.

---

## Classification

### Group 1 — REGENERABLE, now wired (2 tables) ✅ done this session
`html_tag_to_core_block` (17/17 exact) · `roles` (21/29 — the 8-row shortfall is real Phase-1 work,
but it is a *shortfall*, not an absence).

### Group 2 — REGENERABLE, writer EXISTS but is not wired into `/sgs-update` (5 tables)
The cheapest Phase-1 win: the code already exists, it just never runs on a reseed.

| table | live rows | existing writer |
|---|---|---|
| `patterns` | 57 | `pattern-register.py`, `orchestrator/register_patterns.py` |
| `markup_examples` | 399 | `generate-markup-examples.py` |
| `pattern_coverage` | 108 | `uimax-tools/enrich-db.py` |
| `style_variations` | 8 | `uimax-tools/enrich-db.py` |
| `legacy_role_lookup` | 15 | `uimax-tools/seed-legacy-role-lookup.py` |

⚠ Verify each writer is idempotent **before** wiring it into a reseed. Not yet checked.

### Group 3 — ACCUMULATED OUTPUT, must NOT regenerate (2 tables)
These are ledgers written by pipeline runs over months. A rebuild SHOULD leave them empty; seeding
them would be fabricating history.

| table | live rows | written by |
|---|---|---|
| `attribute_gap_candidates` | 3,063 | clone runs (`gap-detection/*`, `recogniser/attribute-gap-writer.py`, `db_lookup`) |
| `block_changes` | 2,735 | no writer found — a historical audit trail |

**These two alone are 5,798 of the 19,138 live rows (30%).** Any "rebuild completeness" percentage
that counts them is wrong by construction.

### Group 4 — NO WRITER ANYWHERE (10 tables)
Zero `INSERT`/`UPDATE` anywhere in the repo. Each was hand-seeded once, or is orphaned. **Each needs
an individual decision — do not batch them.**

`_meta_schema_version` (1) · `block_styles` (63) · `components` (13) · `deploy_steps` (9) ·
`gotchas` (12) · `modifier_suffixes` (19) · `pipeline_corrections` (4) · `plugins` (3) ·
`theme_parts` (28) · `variations` (205)

⛔ `_meta_schema_version` holds one row from 2026-05-12 and is **superseded by `schema_migrations`**
(D464). Candidate for retirement, not a seeder.

### Group 5 — the genuine remaining gaps (3 tables)
`property_suffixes` (154) · `slots` (104) · `excluded_properties` (10). No writer, no module-load
seeder, and load-bearing for converter routing. **This is Phase 1's real core.**

⛔ Two `CREATE TABLE` statements for these live ONLY inside migrations queued for deletion
(`slots` in `2026-05-29-d99…:113`; `excluded_properties` in `2026-06-18-…:47`). Now also captured in
`dbschema/schema.sql`, so the DDL is no longer hostage to those files — but **do not delete any
migration before its replacement seeder is proven.**

### Partial reproducers (11 tables) — a separate question
`blocks` 205→117 · `block_attributes` 2947→2589 · `block_supports` 1340→521 ·
`block_composition` 210→19 · `block_capabilities` 96→23 · `design_tokens` 224→150 ·
`hooks` 5433→161 · `docs` 1257→46 · `indexed_files` 110→83 · `animation_tokens` 8→1 · `roles` 29→21.

⚠ **Not all of these are defects.** `hooks`, `docs` and `indexed_files` index *files on disk*
(including WordPress core), so a sandbox with a different filesystem view will legitimately produce
fewer rows. **Establish what each seeder's applicable input set was before calling any of these a
gap** — `hooks` at 161/5433 almost certainly reflects an absent WP core checkout, not a broken
seeder. Unmeasured as of this report.

---

## Recommended Phase 1 order

1. **Verify idempotency of the 5 Group-2 writers, then wire them into `/sgs-update`.** Existing code,
   highest ratio of reward to risk.
2. **Build regenerative seeders for the 3 Group-5 gaps**, following the proven
   `db_lookup._migrate_html_tag_to_core_block` + `scripts/data/*.json` pattern. Build the JSON from
   **live state**, never by replaying migration history (Step 0.5 proved history is unreplayable —
   `slot_synonyms` was retired, so three migrations reference a table that no longer exists).
3. **Measure the partial reproducers properly** before treating them as work.
4. **Decide Group 4 table by table**; retire `_meta_schema_version`.
5. **Only then** consider deleting migrations — and never one whose replacement is unproven.

**Group 3 is explicitly out of scope. It must stay empty on a rebuild.**
