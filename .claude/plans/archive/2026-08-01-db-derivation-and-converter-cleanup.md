---
doc_type: plan
project: small-giants-wp
created: 2026-08-01
last_updated: 2026-09-04
track: Track 1 — cloning pipeline
status: COMPLETE (2026-09-04) — all 5 phases closed. Phases 0/1/1b/2/3 (D464, D470–D478); Phase 4
  (D954); Phase 5, all 5 defects fixed and committed (D954/D956). Archived — see decisions.md D956
  for the closing account.
spec: .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md
owner_decision: Bean, 2026-08-01 ("derive it, don't restore rows"; "clean script files and clean folders")
---

> ## STATUS 2026-08-02 — read before acting on anything below
>
> | Phase | State |
> |---|---|
> | **0 — make the DB rebuildable** | ✅ **COMPLETE** (D464). Table set rebuilds 39/39 exact. `plans/phase-0-db-rebuildable.md` carries the full result + 5 measured-false plan statements. |
> | **1 — regenerative seeders** | ✅ **COMPLETE (D470 seeders + D478 deletion).** Bean's stated bar — *"I want the vast majority of all migrations deleted and replaced"* — is now MET: **28 of 30 deleted**. Safe because `schema.sql` carries every CREATE/ALTER and the committed seed files were captured FROM LIVE (post-migration state). ⚠ **2 held back deliberately** (`testimonial-selector-fingerprint-override`, `testimonial-media-role-selector`): both UPDATE `block_attributes.derived_selector`, whose regenerability is UNPROVEN — never delete a migration before its replacement seeder is proven. `property_suffixes` 154/154 · `slots` 104/104 · `excluded_properties` 10/10 (all order-exact, D470) · `roles` 29/29 (D464) · `modifier_suffixes` 19/19 · `html_tag_to_core_block` 17/17 · `legacy_role_lookup` 15/15 · `markup_examples` wired. **No converter-load-bearing table is unreproducible.** `rebuild_compare.py`: identical 12→15, `empty (known Phase-1)`=0, `KNOWN_UNREPRODUCIBLE` now empty. Residue is NON-converter: T1.5 floor gate · T1.6 Group-4 decision · T1.7 WP corpus restore. |
> | **1b — Spec 31 column reconciliation** | ✅ **COMPLETE (D475).** §4's false `grid-layout`/`full-width-banner` gating claim corrected; 3 working columns added to the map; stale `has_inner_blocks` note fixed. Report: `reports/2026-08-02-spec31-column-reconciliation.md`. |
> | **2 — derive `scalar-media`** | ✅ **COMPLETE (D474), with a same-day regression fixed (D476).** Roster = `scripts/data/scalar-media-roles.json` (`sgs/hero` only). ⛔ Adding `sgs/testimonial-slider` BROKE it — a pre-condition guard now refuses any block where `is_class_section_block` is False. |
> | **3 — regression gate** | ✅ **DELIVERED (D471).** `check_schema_drift.py` gates SCHEMA; `check_row_floor.py` gates DATA — row counts AND per-column populated counts against a committed floor, failing only on DROPS, tolerating growth. Both fired correctly on their first real event (the D472 retirements) and are clean at **36 tables** (37 → 36 when `array_item_fields` was retired at D475). ✅ **WIRED (D473)** — both, plus `capture_seed_data.py --check`, run in `package.json` `prebuild`, and deliberately BEFORE `db-consistency` so they observe DB state before anything imports `db_lookup` and self-heals it. The earlier "still invoked MANUALLY / wiring is an open question" note here was stale from the moment D473 landed and survived two doc sweeps — caught by the handoff QC rater, not by me. |
> | **4 — purge** | ✅ **COMPLETE (2026-09-04).** This track had sat orphaned for a month — untracked in `LEDGER.md`, unmentioned by any of the 5 tracks that shipped to `main` in between — and was picked back up + verified fresh rather than trusted from this document. All 4 residue items closed: `check_preset_absence_no_slug_literal.py` WIRED into `gates.json`/`package.json` (Bean's call: wire, not delete); `orchestrator.py`→`dispatch_spine.py` renamed via a proper `--survey`/`--fix`/`--check`/`--self-test` migration script (`migrate-orchestrator-rename.py`, now itself a permanent gate) — 19 dotted references + 2 literals across 15 files, including one a narrow grep missed; `walk.py:20-26`'s false "Step 6 replaces `delegates_content`" claim corrected (3 sites); "Bean's call" file list resolved (3 of 5 deleted after fresh zero-ref verification — `audit-attr-vocabulary-v2.py`, `draft-vocab-lint.py`, `reclassify.py` — the `gap-detection/*.py` appliers were already gone from an earlier pass, and no concrete "migrations/ retention policy" artefact was found to delete). Full converter suite (743 tests) green throughout. |
> | **5 — loop defects** | ✅ **ALL 5 FIXED + shipped (2026-09-04, D954/D956).** `/qc-council` validated every proposed fix-shape before dispatch — caught two wrong assumptions (Defect 2 was worse than diagnosed; Defect 3 falsified as sharing Defect 2's mechanism) and one undersized fix-shape (Defect 5's original proposal needed real architecture changes; a cheaper correct alternative shipped instead). **Defect 1 (CRITICAL, section annihilation) FIXED** — per-column exception scoping in `run_mechanism_b`. **Defect 2 (padding shorthand) FIXED.** **Defect 3 (margin routing) FIXED** — `/sgs-update` run, `contentBandMargin` seeded into `property_suffixes`/`block_attributes`, margin routing confirmed live (no monkeypatch) — a real regression the council's own test coverage missed (the `margin:0 auto` centring-exclusion bypass) was caught by a live fixture test and fixed in the same pass. **Defect 4 (duplicate dissolve mechanisms) FIXED** — shared recursive helper. **Defect 5 (false array-lift warnings) FIXED** — scoped to the triggering attr's own item schema. Full detail + three process incidents (a subagent's unauthorised git stash; a hardcoded-dict cheat-gate trip resolved via a real DB-query refactor rather than baselining; 5 unrelated routing-determinism findings the `/sgs-update` run surfaced in nav-drawer/notice-banner/post-grid, fixed rather than baselined): `decisions.md` D954 + D956. |
>
> ### ⛔ CORRECTIONS to this document, measured 2026-08-02
> - **Layer 1 table is stale.** `block_attributes` is 2947+ not 2946; the `variations` row is gone
>   (table retired, D469). **Derive counts at runtime — never trust a number in this file.**
> - **"Migration replay" is a dead end, not a build step.** Proven: `slot_synonyms` was retired, so
>   three historical migrations reference a table the current schema correctly lacks. A May migration
>   cannot run against an August schema. Any plan step premised on replaying `migrations/` is void.
> - **F2's "24 deletable after seeders" is unsafe as stated** — see the classification report; several
>   "no writer" tables actually have writers OUTSIDE this repo (`~/.claude/skills/.../populate-db.py`).
>   ⛔ **`deploy_steps`' seeder re-issued the D336 outage recipe** and was rewritten (D468).
> - **F8 `design_tokens` and the `hooks`/`docs` question are ANSWERED:** `hooks` (5,433) and `docs`
>   (1,257) were never repo-derived — they were imported from the `wp-devdocs-mcp` index. That tooling
>   is still installed; `wp-hooks quick-add-all` + `dbschema/refresh_wp_reference.py` now refresh them
>   WITH a reconcile step (stale rows dropped, D-noted 2026-08-02).
> - **`variations` was NOT converter-critical** — I inferred that from a `SELECT` existing rather than
>   the call graph. Zero production callers. Retired at D469.
>
> **Canonical scope for Phase 1: `.claude/reports/2026-08-02-phase1-table-classification.md`.**
>
> ### ⛔ CARRIED FROM D470 — binding on any future seeder work
> - **`INSERT OR REPLACE` is the wrong default for a seeded table.** It assigns a NEW rowid, and
>   `property_suffixes` + `modifier_suffixes` are both read with `ORDER BY rowid` (the former with
>   `LIMIT 1`, so the first row WINS for a duplicated `css_property`). **Check whether order matters
>   BEFORE choosing the write mode**; the safe shape is compare-first, then DELETE + ordered re-INSERT.
> - **`behavioural-analyser/seed-slot-alias-extensions.py` is SUPERSEDED** — its four alias additions
>   are baked into `scripts/data/slots.json`. Extend the JSON; do not re-run the script.
> - **One writer per artefact:** `dbschema/capture_seed_data.py` owns the seed JSON, `db_lookup.py`
>   owns the tables. `--check` catches a hand-edited table that was never back-written.
> - **A population floor is the right gate for a CACHED fact and the WRONG gate for a DERIVED one**
>   (D471). `has_inner_blocks` is untrackable because FR-31-2.6 deleted the cache on purpose.
> - **Retiring a table and regenerating `schema.sql` are now TOOLS, not hand-operations** (D472):
>   `dbschema/retire_table.py` and `check_schema_drift.py --regenerate`. Both were done by hand three
>   times each first.
> - ⛔ **A stale FUNCTION NAME cost this plan a false blocker** (D472): `enrich-db.py`'s
>   `target_21_slot_synonyms` wrote `slots` correctly all along, while the real dropped-table query
>   sat in `target_210_health_check`, whose name gave no hint. **Read the body before recording a
>   grep hit as a blocker.**

# DB derivation + converter cleanup

⛔ **More than 3 blocks/files/call sites? The first deliverable is the
DETECTOR, not the edit — `.claude/THE-MIGRATION-METHOD.md`.** Measured: a census-driven pass moves the corrections out of the tree and into the detector, where one commit fixes hundreds of sites. Figures + derivation live in ONE place — do not copy them here.

## Pre-conditions

- **Phase 0 must pass before anything downstream is provable** — satisfied 2026-08-02 (D464).
- **A verified backup before any DB write.** Gitignored, no other copy; use `Connection.backup()`,
  not a file copy (WAL-mode).
- **Never delete a migration before its replacement seeder is PROVEN.** Two `CREATE TABLE`s lived
  only inside migrations queued for deletion; `dbschema/schema.sql` now also carries the DDL, but
  the rule stands.
- **Scope every DB statistic to `sgs/%`** — core blocks inflated a percentage three times.
- **Shared worktree** — commit by exact path; re-check the D-ceiling immediately before citing a D.

## Parking lot (deferred, with owners)

| Deferred | Owner |
|---|---|
| ~~`property_suffixes` / `slots` / `excluded_properties` seeders~~ | ✅ CLOSED D470 (T1.4) |
| ~~Row-count floor gate (Phase 3)~~ | ✅ CLOSED D471 (T1.5) |
| ~~Restore `hooks`/`docs` on rebuild~~ | ✅ CLOSED D471 (T1.7) |
| ~~`enrich-db.py --only` selector · `block_styles` retire/keep~~ | ✅ CLOSED D472 (T1.6) |
| Phase 2 `scalar-media` derivation · Phase 4 purge · Phase 5 loop defects | This plan, unchanged |
| `delegates_content` full removal | ⛔ Needs its own design gate — demote, don't drop (Bean, D-3) |

**Nothing silently dropped** — every deferral maps to a named task or phase, per STOP-29.

## THE ROOT CAUSE, IN ONE SENTENCE

**The knowledge-base DB cannot be rebuilt from scratch** — it is a gitignored artefact that has
accreted over months, whose foundational vocabulary tables exist only because ~15 one-off migration
scripts were each run by hand once, with no runner, no replay, and no tracking — so every derived
value downstream of them silently degrades and nothing detects it.

Everything else in this plan is a symptom of that.

## THE EVIDENCE (all independently verified this session)

### Layer 1 — the schema itself is unreproducible

| Table | Rows | CREATE TABLE exists? | Writer in `/sgs-update`? |
|---|---|---|---|
| `blocks` | 205 | **nowhere in the repo** | INSERT only (assumes table) |
| `block_attributes` | 2946 | **nowhere in the repo** | INSERT only |
| `block_composition` | 210 | **nowhere in the repo** | partial |
| `property_suffixes` | 154 | **nowhere in the repo** | **0 references** |
| `excluded_properties` | 10 | migrations only | **0 references** |
| `roles` | 29 | migration + `db_lookup` | **READ ONLY** (line 1866) |
| `slots` | 104 | migration only | UPDATEs `standalone_block` only; never creates rows |

A truly empty DB would not even have the tables the seeder expects.

### Layer 2 — three writers that exist but never fire on a reseed

1. **`role='scalar-media'`** — no writer anywhere. Applied by a hand-run `UPDATE` at D128
   (2026-06-01), never captured as a migration. Wiped by a reseed. Cost: hero `--mobile`/`--desktop`
   art-direction. Verified working in the real 2026-07-02 run; broken today.
2. **`block_composition.wraps_block` / `container_kind`** — the writer exists
   (`sync-container-wrapping-blocks.py:1308`) but `/sgs-update` Stage 11 calls it
   **without `--apply`** (deliberately operator-gated, sgs-update-v2.py:4718). So a reseed never
   writes it.
3. **`backfill-coarse-roles.py`, `backfill-from-json-catalogue.py`** — standalone role writers,
   never wired into `/sgs-update`.

### Layer 3 — the derivation chain collapses from the top

```
slots / roles / property_suffixes   (no reseed writer)
        └─> block_attributes.role   (sgs-scoped: 846/2440 filled, 1594 NULL)
                └─> emit_shape      (only sees content-bearing roles: 125 eligible, 117 seeded)
                        └─> the converter's content routing
```

`emit_shape` is NOT broken — its 8-attr shortfall is its FAIL-LOUD guard correctly refusing to guess
on form-field labels. It decayed 139→121→117 because the **eligible set** shrank, i.e. `role` moved
underneath it.

**`role` derivation can never produce `scalar-media`.** `assign-canonical.py:apply_role_detection_inline`
only emits from `_CONTENT_BEARING_ROLES` (5 values) and both write sites hard-skip anything outside
that set. `scalar-media` is classified `styling-behaviour` — categorically outside its output space.

### Not a problem, despite appearances

**`delegates_content` is sound.** It is derived fresh from `save.js` + `render.php` on every call —
nothing cached, nothing to rot. It is NOT part of the decay. See "Deferred" below.

## PHASES

Ordered so each phase makes the next one safe. Nothing after Phase 0 is trustworthy without it.

### Phase 0 — make the DB rebuildable (THE foundation)
- Author `schema.sql` (or a `bootstrap_schema()` in `sgs-update-v2.py`) with the full DDL for every
  table, generated from the live DB's `sqlite_master` so it matches reality exactly.
- Build a migration runner + `schema_migrations` tracking table; register all 28 existing migrations
  as already-applied against the current DB.
- **Gate:** `/sgs-update --rebuild` against an empty file produces a DB whose table set and row
  counts match the current one within a stated tolerance. Until this passes, nothing else is provable.

### Phase 1 — make everything REGENERATIVE; delete the migrations  (rescoped by Bean, 2026-08-01)

Bean: *"I want the vast majority of all migrations to be deleted and replaced by the regenerative and
robust sgs-update scripts that automatically keep everything synced, clean and up to date."*

That is a better goal than "wire the unwired writers". A migration is a **one-shot that must be
remembered**; a regenerative seeder is a **fact that re-asserts itself every run**. The whole decay
class this plan exists to kill comes from the former.

**Target end state:** `migrations/` holds only what genuinely cannot be regenerated. Everything else
becomes either (a) derived from source on every run, or (b) a git-tracked JSON data file applied
idempotently by a seeder — following the pattern `scripts/data/atomic-tag-map.json` +
`block-replacements.json` already use successfully.

**Ordering constraint (non-negotiable):** the replacement seeder must exist and be PROVEN before its
migration is deleted. Delete-first loses unrecoverable data — the DB is gitignored and these tables
have no other source. Phase 0's backup + rebuild proof is what makes this safe.

- `container_kind`/`wraps_block`: auto-`--apply` on reseed per **D-2**, with drift logged to
  `parking.md`. Pre-req: Step 0.6's finding on what `--apply` writes.

### Phase 1b — Spec 31 column-use reconciliation  (added by Bean, 2026-08-01)

Bean asked whether I had consulted Spec 31 for how every DB column is used across the pipeline.
**I had not** — I read §2.3/§2.4/§13 and Appendix D as needed, never a column-by-column audit. That is
a gap in my process against the project's own "read the governing spec IN FULL" rule, and it is exactly
where routing upgrades hide.

Three analyses commissioned:
1. **Spec-31 reconciliation** — every DB column vs what the spec says it is for vs what the converter
   actually reads. The valuable buckets: SPEC'D-BUT-UNUSED (designed capability nobody wired) and
   UNSPEC'D-BUT-USED (code depending on something the spec never blessed = drift).
2. **`/wp-blocks dump` opportunity scan** — what WP-native signal exists that the converter ignores:
   `providesContext`/`usesContext`, `transforms` (a native description of what a block converts FROM —
   directly a cloning concern), `selectors`, `variations`, `example`, `supports.inserter/multiple`.
   Plus a drift check: where the DB mirrors block.json, is the mirror complete?
3. **Migration → regenerative classification** — all 29 files bucketed, with the safe deletion order.

**FINDINGS — all three returned, headline items verified independently:**

**F1 · The self-healing pattern ALREADY EXISTS.** `db_lookup.py` runs three seeders **at module load**
(`_migrate_roles_table`, `_migrate_html_tag_to_core_block`, `_migrate_property_suffixes_kind_override`),
one with full two-way sync (`atomic-tag-map.json` → `INSERT OR REPLACE` + `DELETE … NOT IN`). Phase 1
is **extend a proven pattern to 4 tables**, not invent a mechanism. *(This also corrects my earlier
"roles is READ-ONLY, zero writers" — I had grepped only `sgs-update-v2.py`.)*

**F2 · Migrations: 5 deletable today, 24 after seeders, long-run survivors = 0 files.** But **two
`CREATE TABLE` statements live ONLY inside migrations queued for deletion** (`slots` in
`2026-05-29-d99…:113`; `excluded_properties` in `2026-06-18-…:47`), and **`property_suffixes` has no
production DDL anywhere** — 154 rows, only test fixtures. Relocate the DDL BEFORE deleting anything.

**F3 · The seeder cannot be a numbered stage.** Stage 1 itself consumes `slots`/`roles`/
`property_suffixes` (via `assign-canonical.py`), and `/sgs-update --stage N` runs stages in isolation.
It must be an unconditional pre-stage call PLUS the `db_lookup` module-load path, because the converter
imports `db_lookup` whether or not `/sgs-update` ever runs.

**F4 · `role='rating'` is declared, code-consumed, and permanently dark.** Zero attrs carry it, and the
candidates are mis-classified: `sgs/star-rating.rating` and `.maxRating` carry `role='number-css-px'`
(a star COUNT as a CSS pixel value); `sgs/testimonial.ratingStars`/`ratingScaleMax` carry `role=None`.
**Concrete proof of D-1** — the universal `role` fix unlocks features that have nothing to do with
art direction.

**F5 · `block_composition.composition_role` — 100% seeded (210/210), accessor built, ZERO callers.**
`wrapper-shell` has exactly ONE row: `sgs/container` — precisely the "one arbitrary holder" that
FR-31-2.7's classifier currently derives from three separate joins. Highest-value routing upgrade found.

**F6 · WP-native signal unused.** `providesContext`/`usesContext` (6 provide / 22 use, live in 4
render.php at runtime) is read **zero** times by the converter and stored in **no** DB column. It is
authored in block.json so it CANNOT drift — unlike `blocks.parent_block`, which has (5 of 23
relationships missing; `child_block_for_parent_token('sgs/site-header','row')` returns `None` today).
Note `sgs/container` PROVIDES the `gridItem*` family — the same attrs the loop-1 audit found shorthand
`padding` misrouting into.

**F7 · `block_selectors` (92 rows / 44 blocks) is orphaned, and Spec 31 contradicts itself.** §4 lists
it as the live step-3 disambiguator; §3.A's own MF-4 says `css_element`/`css_state`/`css_tier` do that
job now. Code confirms §3.A — zero `SELECT` from `block_selectors` in the converter, only comments
naming it as the fix for `AmbiguousLayerAttrError` (a hard-raise that stops clone runs). 7 of its rows
are for retired blocks.

**F8 · `design_tokens` — 220 of 224 rows never read.** Only 4 `shadow-%` rows are queried;
`services/token_snap.py` is an inert identity stub. §4 claims this table IS token-snap; the colour snap
actually runs against Spec-33's `theme-snapshot.json`. Needs a design decision (framework default as
fallback to per-client?), not a blind wiring.

**NOT a defect — checked:** the "99 content-bearing attrs with `emit_shape` NULL" alarm is core-block
noise (91 are `core/*`, skipped by design). The sgs NULLs are the 8 form-field labels the FAIL-LOUD
guard correctly held back. **Second time core blocks inflated a percentage this session — always scope
DB stats to `sgs/%` before drawing a conclusion.**

**Spec-31 corrections owed** (the spec is the system — amend, don't patch around):
- §592: says `splitImage` is "NOT content-walked" because `role='scalar-media'` — that role has 0 rows
  and the attr IS content-walked daily.
- §601: claims scalar-media art-direction routing was "re-homed, none dropped" — it wasn't.
- §4: lists `block_selectors` as active; §3.A MF-4 supersedes it in the same document.
- ~~§4: claims `css_layer` "FULLY SEEDED" — live coverage is 40%~~ **WITHDRAWN — my finding was
  false, caught by Bean.** `css_layer`'s values are `OUTER`/`CONTENT`/`GRID`/`GRID_AREA` — the
  three-layer CONTAINER model. It applies only to blocks that HAVE layers, so "40% of all
  `css_property`-bearing rows" was never the applicable denominator. Measured properly against the
  spec's stated source (`block.json supports.sgs.elements.<el>.layer`): **25 blocks declare a layer;
  35 carry `css_layer` in the DB.** The residual finding is small and different in kind — **5 blocks
  declare a layer in source and are MISSING from the DB mirror** (`form-field-tiles`, `form-step`,
  `mega-aside`, `mega-group`, `mega-panel`), same drift class as `parent_block`'s 5. A footnote, not
  a headline. **Method lesson: a coverage percentage is meaningless until the APPLICABLE denominator
  is established — this is the third denominator error this session (twice core-block inflation,
  once here).**
- `array_content.py` cites "§3.B.0.1" — that subsection does not exist in the current spec.

### Phase 2 — derive `scalar-media` (Bean's actual ask)
The art-direction signal is derivable from source, no hand-editing:
> an `image-object` attr that (a) the block's own `render.php` emits, and (b) has a `{attr}Mobile`
> companion attr → it is an art-directed media pair.

`splitImage`/`splitImageMobile` satisfy this. Implement as a `/sgs-update` sub-step alongside
`_populate_emit_shape`, and extend the role writer's output space to permit styling-behaviour roles
it can *derive* (not guess).
- **Alternative worth considering:** make `content_attr_for_element` modifier-aware (read the BEM
  `--mobile` modifier, prefer the `Mobile` attr) and delete the role entirely. Cleaner, but changes
  resolver behaviour for every block — needs its own design gate. **Bean's call.**
- **Gate:** re-run the 2026-07-02 draft; `splitImage`=desktop and `splitImageMobile`=mobile, matching
  that run's stored artefact exactly.

### Phase 3 — the regression gate
A prebuild check that fails when any seeded column's populated count drops below a committed floor.
This class of loss has now happened at least four times (`has_inner_blocks`, `scalar-media`,
`emit_shape`, `container_kind`). Ship with `--self-test` proving it can fail.

### Phase 4 — purge (dead scripts, stale comments, folders)

**DELETE — zero inbound refs, individually verified:**
```
recogniser/recursion-guard.py                       (SKILL.md's "it's wired" claim is false)
orchestrator/essence_match_detector.py              (served the deleted frozen engine)
orchestrator/token_resolver.py                      ┐ loaders defined at
orchestrator/variation_router.py                    │ sgs-clone-orchestrator.py:602/618/714/725,
orchestrator/supports_writer.py                     │ NEVER called. Bean confirms he
orchestrator/modifier_extractors.py                 ┘ never invokes these CLIs
orchestrator/test_{essence_match,token_resolver,variation_router,supports_writer,modifier_extractors}.py
converter/services/payload.py                       (0 importers; extraction.py:113 calls it superseded)
ledger/content_coverage_check.py + its test         (pulled from the gate list at D277: "fail-safes
                                                     GREEN … worse than no light")
fingerprint-builder/audit-attr-vocabulary.py        (v1; v2's docstring supersedes it)
rename-hover-attrs.py, fix-spec15-refs.py           (self-declared one-shots, 0 refs)
tools/recogniser-v2/extract.py                      (repo root; "permanently retired")
block_attributes.signature_confidence               ✅ DROPPED D759 2026-08-24 (0 rows, no writer, no reader)
```

**WIRE-OR-DELETE (a safety gate that never runs — do not silently drop):**
`converter/gates/check_preset_absence_no_slug_literal.py` — a real gate, not in `f5-commit-gate.py`'s
`_GATES`, not in `package.json`. Its own docstring claims "both run in CI"; **this repo has no CI**.
Recommend WIRING it rather than deleting.

**Bean's call (0 callers, but possibly deliberate audit trail):**
`fingerprint-builder/audit-attr-vocabulary-v2.py`, `lints/draft-vocab-lint.py` (a lint built and never
wired), `consistency/reclassify.py`, the 7 one-shot `gap-detection/*.py` appliers, and the
`migrations/` retention policy.

**Two more docs that are ACTIVELY WRONG (add to the comment purge):**
- `converter/README.md:46` — claims the gates are "collected by the prebuild pytest suite". `prebuild`
  only runs `pytest scripts/oracle/tests/`. Nothing collects `converter/tests/` automatically, so
  **converter regressions are not caught pre-build** unless someone runs a file by hand.
- `converter/README.md:49-52` — the gate table omits the live `gates/check_raw_sqlite.py`.

**Rename — the only safe one of the three "orchestrator"s:**
`converter/orchestrator.py` → `converter/dispatch_spine.py` (in-tree importers only; the other two are
hardcoded in `f5-commit-gate.py` and in `sgs-clone-orchestrator.py`'s own path constants).

**Do NOT move** `converter/`, `recogniser/`, `lints/`, `orchestrator/`, `cheat-gate/`,
`excluded-gate/`, `db-consistency/`, `ledger/`, `oracle/`, `no-inline/` — every one is a literal
string in `package.json` and/or `.claude/hooks/*.py`.

**`pipeline-state` ×3:** only `scripts/pipeline-state/` is written by the live orchestrator (25 homepage
runs, ~15.8 MB). Confirm the other two are empty before removing.

Comment/doc purge (category: actively WRONG about current behaviour):
- `walk.py:20-26, 88-95` — claims Step 6 "replaces" `delegates_content`. It doesn't; they coexist by
  design. **This misled this entire session.**
- Spec 31:601 — claims scalar-media art-direction routing was "re-homed, none dropped". It wasn't.
- Spec 31:592 — says `splitImage` is "NOT content-walked" because role=scalar-media. It is now.
- `/sgs-clone` SKILL.md — describes stages 5/6/7/8 and a Stage-11 pixel-diff that no longer exist,
  and four tool files absent from the repo.
- `assembly.py:11-12` — claims it calls `_bem_element_of`; that function has zero call sites.

Folder collisions to resolve: three things named "orchestrator"; three `pipeline-state` directories.

### Phase 5 — the loop defects (separate, already-evidenced)
1. **CRITICAL** — one decorative empty wrapper (`<div><span class="icon"></span></div>`) anywhere in
   a section aborts the WHOLE section: `status:failed`, 0 bytes markup, **0 content_gaps explaining
   why**. Reproduced with a clean control. Fix: scope the conservation raise to the dead subtree,
   emit a ContentGap instead of aborting.
2. Shorthand `padding` folds to inert `gridItemPadding`; longhand folds correctly to
   `contentBandPadding`.
3. Band `margin` always dropped in the fold path, but survives if the wrapper has a sibling.
4. Loop 2: bare tag / unparseable BEM dropped with a misleading reason; branch-C descends one level
   only.
5. Array lift logs FALSE drop gaps for content that emitted correctly (the hero's two CTA buttons).

### DEFERRED — `delegates_content`
Bean asked for it to be dropped. **Recommend against, with evidence:**
- It is derived fresh from source every call — self-healing, not part of the decay.
- `emit_shape` cannot replace it: swapping the CHILD-leg gate would break child routing for **17
  blocks** (accordion, tabs, form, modal, quote, site-header/footer, …) because those host
  *arbitrary* children, and `emit_shape` only describes *named* attrs.
- Loop 1 never consults it anyway (`classify == 'holder'`).

If Bean still wants it gone, it needs a new derived "accepts arbitrary children" signal first —
its own design gate.

## DECISIONS — SETTLED (Bean, 2026-08-01)

**D-1 · Fix `role` UNIVERSALLY, not scalar-media as a spot fix.** Bean: *"no spot fixes is the most
important rule — needs to be as wide-impacting as possible."* Measured and he is right: `role` is read
for routing at **78 call sites across 8 converter files** (re-counted 2026-08-01: `db_lookup` 29,
`array_content` 14, `field_extractors` 8, `walk` 7, `styling_content` 7, `scalar_content` 6,
`payload` 4, `extraction` 3 — `payload.py` is dead code queued for deletion, so 74/7 post-purge), and
**1594 of 2440 sgs attrs sit at NULL** (65%), invisible to every one of them. Art direction is one symptom of a backbone
failure. Scope = complete + idempotent `role` derivation; `emit_shape` heals as a consequence (it is
gated on role). **Not tied to any loop** — this deliberately widens future routing options.

**D-2 · `container_kind`: auto-apply on reseed, and drift LOUDLY into `parking.md`.** Bean's
improvement on the original either/or. A drift entry in the parking doc (standard `**Status:** OPEN`
shape) surfaces in the normal workflow instead of needing a separate check. **Pre-req:** confirm what
`--apply` writes beyond the DB before enabling (Step 0.6).

**D-3 · `delegates_content`: demote, don't drop.** Bean: *"we shouldn't use it for routing if it's not
needed"* + *"isn't this data replaceable by the child/parent columns."* **Measured: parent/`ancestor`
declarations + `accepts_allowed_blocks` cover 12 of the 17.** The 5 not covered
(`accordion-item`, `mega-group`, `modal`, `product-faq-item`, `quote`) are OPEN containers — they take
whatever an operator drops in, so nothing declares itself their child and there is no relationship to
read. Resolution: **route with parent/child + `allowedBlocks`** (richer, explicit); keep the
source-derived check ONLY as the narrow "is there a content region at all" gate for those 5. It stops
being a routing input. *(An earlier claim of mine that "17 blocks break" described a naive swap I
proposed, not the concept — corrected.)*

**D-4 · The section-annihilation bug does NOT get pulled forward.** Bean asked the right question:
how do the Mama's icons clone if this bug exists? **Answer, measured: the BEM class is the decisive
factor, not the content.** `class="icon-wrap"` fails even WITH content; `class="sgs-thing__icon"`
completes even when fully EMPTY — recognition resolves it to `sgs/icon` before the fragile recursive
path is reached. **No workaround/masking layer exists** (searched: zero `except ContentConservationError`
in production code), so there is no redundant machinery to strip — Bean's bloat suspicion is NOT
confirmed. **Live blast radius today: 0 sections** (homepage 6/6, phase-f 7/7, conformance 28/29 all
complete). Stays in Phase 5. *(My "pull it forward, it's armed right now" recommendation was set from a
synthetic test without measuring real exposure — withdrawn.)*

⚠ **Related, previously unknown:** `sites/mamas-munches/mockups/product/index.html` has **zero `sgs-`
classes anywhere**; all 4 of its sections fail as `unrecognised`. Separate issue — needs a decision on
whether that draft is meant to convert yet.

**Execution order: Phase 0 first** — nothing downstream is provable until the DB can be rebuilt, and
D-1's role work depends on it. Detailed step plan: `plans/phase-0-db-rebuildable.md`.

## METHOD NOTES (from this session's failures)

- Verify against the REAL draft + the stored run artefacts (`pipeline-state/sgs-clone/`, 25 homepage
  runs, newest 2026-07-02) — not synthetic HTML. Three of my findings this session were probe
  artefacts (a `£` encoding mismatch, a wrong result key, a missed directory).
- A subagent's absence claim is a hypothesis: one agent reported "no homepage runs exist" having
  searched only one of three `pipeline-state` directories.
- Never assert a drop without a negative control.
