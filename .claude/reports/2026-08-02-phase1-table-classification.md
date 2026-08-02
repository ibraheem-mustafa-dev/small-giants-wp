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

**Idempotency AUDITED 2026-08-02 (source inspection, nothing executed):**

| table | idempotent? | mechanism | wire in? |
|---|---|---|---|
| `legacy_role_lookup` | **YES** | `INSERT OR IGNORE` on a `kebab_role` PRIMARY KEY; seed is a 15-entry list inside the script. Writes BOTH DB paths itself — the only one that does. | ✅ no caveats |
| `style_variations` | **YES** | true UPSERT `ON CONFLICT(slug) DO UPDATE`; reads `theme/sgs-theme/styles/*.json` | ✅ |
| `pattern_coverage` | **YES** | `INSERT OR IGNORE` (both branches) | ✅ but **must run AFTER `patterns`** — it reads `SELECT slug… FROM patterns` |
| `markup_examples` | **YES** | pre-fetch `existing` set then skip; reads each block's `block.json` | ✅ ⚠ writes only the **`.agents`** DB path, and `--reset-sgs` does a `DELETE` — never pass it in automation |
| `patterns` | ⛔ **SPLIT** | Writer B (`orchestrator/register_patterns.py:284`) is idempotent (SELECT-then-INSERT). **Writer A (`pattern-register.py:374`) is a bare `INSERT` with no dedup guard — looping it would duplicate rows.** | ⛔ **NEEDS-WORK** — Writer B is not standalone (needs a live clone-run artefact), so it cannot reseed 57 rows from nothing |

### The three "partial reproducers" — RE-CLASSIFIED, my earlier note was wrong

⛔ **I wrote that `hooks`/`docs`/`indexed_files` were "probably environment — they index WP core".
That was WRONG, and Bean corrected it before the audit confirmed it.**

| table | live→rebuilt | truth |
|---|---|---|
| `hooks` | 5433→161 | **Scans the REPO** (`rglob("*.php")` for `sgs_*`), no WP-core dependency at all. But there are **THREE competing writers with two different conflict keys** — `populate-db.py:484` (`INSERT OR IGNORE`, omits `plugin_slug`), `update-db.py:413/419` (UPDATE-or-INSERT), `enrich-db.py:718` (true UPSERT on `(name, hook_type)` — the most correct). **Consolidate to one before wiring.** ⚠ The 161-vs-5433 gap is still UNEXPLAINED — a repo scan should not lose 97%. Do not treat this as understood. |
| `docs` | 1257→46 | ⛔ **NO live writer found anywhere** across the repo, `~/.claude/skills`, `~/.claude/hooks`, `~/.agents/skills`. 1,257 rows exist with no known regenerator — possibly a since-deleted one-off. **A real gap, not an unrun script.** |
| `indexed_files` | 110→83 | Writer exists ONLY in `_retired/phase1-seed-indexed-files.py` (idempotent by design: hash-compare then insert/update/skip). **"Retired" is a deliberate signal — establish WHY before resurrecting.** |

### Group 3 — ACCUMULATED OUTPUT, must NOT regenerate (2 tables)
These are ledgers written by pipeline runs over months. A rebuild SHOULD leave them empty; seeding
them would be fabricating history.

| table | live rows | written by |
|---|---|---|
| `attribute_gap_candidates` | 3,063 | clone runs (`gap-detection/*`, `recogniser/attribute-gap-writer.py`, `db_lookup`) |
| `block_changes` | 2,735 | no writer found — a historical audit trail |

**These two alone are 5,798 of the 19,138 live rows (30%).** Any "rebuild completeness" percentage
that counts them is wrong by construction.

### Group 4 — investigated in depth 2026-08-02 ⚠ THE ORIGINAL PREMISE WAS WRONG

⛔ **CORRECTION — "no writer anywhere" was false, and the error was mine.** That search covered
`plugins/` and `scripts/` **inside this repo only**. Five of the ten are written by
`~/.claude/skills/sgs-wp-engine/scripts/populate-db.py`, which lives **outside the repo** and is
fully wired into its own `main()`. This is the exact failure mode already captured as
*"a file-scoped search hides the writer you concluded was absent"* — committed again here. **A
negative search result describes the SEARCH, not the codebase.**

| table | live | verdict | evidence |
|---|---|---|---|
| `modifier_suffixes` | 19 | ⛔ **BELONGS IN GROUP 5 — converter-load-bearing, NO writer** | read at `db_lookup.py:585` (`SELECT suffix, kind`), `:2146` (`kind='breakpoint'`), `:2262`. Empty ⇒ breakpoint/side resolution breaks. **Highest priority of the ten.** |
| `variations` | 205 | ⛔ **RETIREMENT CANDIDATE — I was wrong twice; see below** | superseded by `variant_slots`; zero production callers |
| `theme_parts` | 28 | SEEDER EXISTS — just run it | `populate-db.py:449` `INSERT OR REPLACE`, wired at `:763`. Pure `.glob('*.html')` mirror; description/variants always NULL ⇒ nothing curated. |
| `components` | 13 | SEEDER EXISTS — just run it | `populate-db.py:504/520/537` `INSERT OR REPLACE`, wired at `:769`. Scans `src/{components,utils,extensions}/*.js`; auto-generated descriptions. |
| `plugins` | 3 | SEEDER EXISTS, but **no live reader found** | `populate-db.py:565`, wired at `:772`. Worth asking whether anything surfaces it. |
| `deploy_steps` | 9 | ⛔ **SEEDER EXISTS BUT ITS CONTENT IS DANGEROUS** | `populate-db.py:622`, wired at `:775`. Its hardcoded rows encode the **hand-rolled tar/scp/ssh deploy recipe that caused D336 — two client sites down ~2.5h** — which `CLAUDE.md` now explicitly forbids in favour of `build-deploy.py`. **Do NOT re-run until its content is corrected.** |
| `gotchas` | 12 | HUMAN-AUTHORED, seeder exists | `populate-db.py:665`, wired at `:778`. Hand-distilled lessons transcribed as Python literals — unregenerable by any scan. The literal list IS the git-tracked source. |
| `pipeline_corrections` | 4 | **ACCUMULATED HISTORY — belongs in Group 3** | 4 timestamped April incident records. Records events, not derivable facts. Only reader is a retired script. Do not seed. |
| `_meta_schema_version` | 1 | **RETIRE** | one row from 2026-05-12; only reader is `_retired/migrate-spec-15-p1.py:143` reading its own marker. Superseded by `schema_migrations` (D464, 29 rows). |
| `block_styles` | 63 | RETIRE (leaning) — **not confirmed** | no live reader, no writer, not converter-read. Caveat: labels like "SGS Primary (Teal)" look hand-curated. **Check the editor JS for `registerBlockStyle` sync before dropping** — a JS-side search that was not performed. |

**Net effect on scope:** Group 4 collapses from "10 unknowns" to **ONE real converter-critical gap**
(`modifier_suffixes` — now SEEDED), 4 already-solved-operationally, 1 dangerous-to-run,
1 human-authored, 1 history, 2 retire.

### ⛔ `variations` — I called it converter-critical. It is not. Two errors.

**Error 1 — presence of a query is not behaviour.** I labelled it load-bearing because
`db_lookup.py` contains `SELECT attributes_json FROM variations`. Checking the CALL GRAPH instead:
`variation_attrs_for()` has **zero production callers** — the only hits are
`converter/tests/test_button_preset_seed.py` and a trace line inside the function itself. The live
pipeline (`assembly.py`, `walk.py`, `extraction.py`) never calls it. So a rebuild producing 0 rows
breaks nothing today; it only prevents an unwired button-preset feature from ever activating.

**Error 2 — it duplicates a system that already exists.** Bean identified this: the real variant
system is `variant_slots` + `blocks.variant_attr` (FR-31-20). Measured side by side:

| `variant_slots` (maintained, stamped 2026-08-02) | `variations` table |
|---|---|
| `sgs/hero` → `split` (splitImage, splitImageMobile), `standard` (backgroundImage), `video` (backgroundVideo, bgVideo), `svg-animated` (svgContent) | `sgs/hero` → `hero-split`, `hero-standard`, `hero-video`, `hero-animated` |

**The same four concepts, prefixed, minus the discriminating-slot data.** `variant_slots` carries what
the walker actually needs; the `variations` row carries a name. Button's entries are a genuinely
different thing — WP-native STYLE variations, declared in `button/block.json` under `"variations"`.

**Provenance of the 205:** 161 `native_wp` (a live WP+WooCommerce block-registry scrape — WooCommerce
injects `product`/`product_cat`/`product_tag` into `core/navigation-link`, which vanilla WP has not;
almost certainly from the deleted `~/.wp-blockmarkup-mcp/`) · 3 `sgs/button` (regenerable verbatim
from `block.json`) · **41 `sgs` rows with NO source anywhere** — not in any `block.json`
`"variations"`, not `registerBlockVariation`, and NOT matching `supports.sgs.variants` (a disjoint
vocabulary: testimonial's variant_slots say `classic-card`/`pull-quote-editorial`…, its `variations`
rows say `testimonial-card`/`testimonial-inline`…).

**Verdict: do NOT build a seeder.** Retire it, or wire the button-preset feature first and seed only
the 3 button rows from `block.json`. ⚠ Gap in the other direction: `sgs/business-info` declares 5
variations in its `block.json` and has **0** rows — so the table was never authoritative anyway.

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
