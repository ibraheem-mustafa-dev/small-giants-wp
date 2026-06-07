---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "DB-usage conformance audit — do the pipeline scripts use the DB tables where the truth docs say they should?"
created: 2026-06-07
status: REFERENCE — audit findings; remediation items listed §6 (none fixed yet — this is the register)
method: "9 read-only parallel auditors, each read an assigned truth doc start-to-finish (doc = standard) and verified every DB-table-usage requirement against the actual scripts + sgs-framework.db"
docs_audited:
  round_1: ["specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md", "cloning-pipeline-flow.md", "cloning-pipeline-stages.md", "dev-setup.md"]
  round_2: ["specs/00", "specs/01", "specs/02", "specs/19", "specs/20", "specs/21", "specs/26", "specs/29", "decisions.md", "architecture.md", "state.md", "plans (method2/container/cloning/hybrid-block)"]
---

# DB-usage conformance audit

## 0. Verdict

**The pipeline is largely DB-conformant where it matters most.** The D99 table unification (`slot_synonyms` + `legacy_role_lookup` → `slots`; role_classification → `roles`) is **genuinely complete** — zero live queries to the retired tables anywhere. The core recognition + lift mechanisms (`slots`, `property_suffixes`/`kind_override`, `roles`, `modifier_suffixes`, `block_attributes`, `block_supports`, `block_capabilities`, `blocks.tier`, `blocks.replaces`, `block_composition.composition_role`/`has_inner_blocks`/`wraps_block`, `variant_attr`/`variant_slots`) are all actively queried at the stages the docs specify.

**But there is a convergent cluster of real gaps**: one silent R-22-1 breach (a "DB-driven" function that's actually hardcoded), a latent split-brain DB-path risk, two inert DB columns, conflicting gap-candidate write targets, an un-enforced block exclusion, widespread doc-drift (stale counts + a stale roster), and a documented script missing from disk. None are fidelity-blocking *today*, but several are latent footguns.

---

## 1. VIOLATIONS — code does NOT use the DB where the doc mandates (convergent across auditors)

| # | Violation | Where the docs mandate DB use | Code reality | Convergence | Fix |
|---|---|---|---|---|---|
| V1 | **`_sgs_bem_regex()` is hardcoded, not DB-driven.** Its docstring claims "fetch the canonical SGS-BEM regex from `uimax.naming_conventions`", but the body is a literal `re.compile(...)` with no query. The BEM regex — the pipeline's primary recognition signal — is NOT DB-authoritative and won't pick up naming-convention updates. | Spec 22 FR-22-8/9; Spec 00 §3; flow doc "against uimax.naming_conventions" | `db_lookup.py:255-266` — `UIMAX_DB` declared, never queried in this function. Only the standalone `wp-blocks.py` CLI queries the table. | **4 auditors** (Spec 22, flow, stages, Spec 00) | Make `_sgs_bem_regex()` actually read `naming_conventions` (or delete the false docstring + accept it as a documented constant). |
| V2 | **`attribute_gap_candidates` D3 writes go to the wrong DB.** The converter's hot-path `db_lookup.write_attribute_gap_candidate()` INSERTs into `sgs-framework.db`, which FR-22-8.1 explicitly marks **read-only / `is_stale=1`** and mandates **uimax** for all new writes. The `wp-blocks.py` CLI + `attribute-gap-writer.py` do it correctly (uimax); the library function does not. New gap candidates land in the frozen-legacy table. | Spec 22 FR-22-8.1; Spec 21 / stages doc | `db_lookup.py:1366` `connect(SGS_DB)` + INSERT; vs `attribute-gap-writer.py:131` (uimax). The two write paths target different DBs. | **2 auditors** (Spec 22, stages) | Point the library writer at uimax (single source); reconcile the stages-doc label. |
| V3 | **`block_composition` exclusion (`containerMirror:false`) is NOT enforced in the converter.** `_is_container_mirror_block()` gates only on `wraps_block='sgs/container'` — no `containerMirror`/exclusion check. `sgs/modal` (which has `wraps_block='sgs/container'` + `container_kind='section'`) and `sgs/mobile-nav` would return `True` and trigger the fold/mirror path, despite `containerMirror:false` in their block.json. The guard is honoured only by `sync-container-wrapping-blocks.py`, not `convert.py`. | Spec 29 §3 (modal + mobile-nav excluded) | `convert.py:~923` `_is_container_mirror_block` (wraps_block-only). | Spec 29 auditor | Add the exclusion check to `_is_container_mirror_block()` (read a `containerMirror` flag / exclude the 2 slugs via DB), OR null their `wraps_block`. |
| V4 | **`container_kind='layout'`/`'content'` + `accepts_allowed_blocks` are inert.** The walker branches only on `container_kind='section'` (`_is_section_kind_mirror_block`). `'layout'`/`'content'` gate nothing independently. `accepts_allowed_blocks` is **NULL across all 29 roster rows** — a dead column. | Spec 29 §4; container-standardisation WS-4 | `convert.py` reads only `='section'`; DB: `accepts_allowed_blocks NOT NULL = 0`. | **3 auditors** (Spec 29, decisions, plans) | Either wire `layout`/`content` into the fold decision (Method-2 follow-up) or document them as informational-only; populate or drop `accepts_allowed_blocks`. |
| V5 | **WS-3 C3/C5 still hardcoded.** `_CAPABILITY_PRIORITY` is a ~30-entry hardcoded Python list (`db_lookup.py:677`); `css_router._infer_role()` uses substring-match heuristics, not `property_suffixes.kind_override`. | container-standardisation WS-3 (C3/C5 — move hardcoded lists to DB) | `db_lookup.py:677`; `css_router.py:566`. | plans auditor (known WS-3 deferred) | Move `_CAPABILITY_PRIORITY` to a DB column; make `_infer_role` query `kind_override`. |
| V6 | **3 direct `sqlite3.connect` in `convert.py`** breach the FR-22-8 PASS test ("zero direct connects in convert.py — all DB via `db_lookup.py`"). They read `block_composition` (mirror-cache) + `blocks.parent_block` — correct tables, wrong discipline. | Spec 22 FR-22-8 PASS test | `convert.py:920, 950, 1871`. | Spec 22 auditor | Route the 3 reads through `db_lookup` wrappers. |

---

## 2. LATENT INFRASTRUCTURE RISKS (not a fidelity bug, but a footgun)

| # | Risk | Evidence | Why it matters |
|---|---|---|---|
| I1 | **DB-path split-brain.** `sgs-update-v2.py` writes the **`.agents`** DB (`SGS_DB = ~/.agents/.../sgs-framework.db`); `db_lookup.py` (the converter) + `generate-block-reference.py` (Spec 02 regen) read the **`.claude`** DB. On this machine they're the **same hard-linked inode** (`8162774328448631`), so it works. On a fresh install / different machine where they're NOT hard-linked, `/sgs-update` would populate `.agents` and the converter would read a **stale `.claude` copy** — a silent split-brain. | dev-setup auditor; Spec 00/02 auditor (`generate-block-reference.py:16` reads `.claude` vs `sgs-update-v2.py:64` writes `.agents`). | dev-setup.md never documents the dual-path / hard-link design. Should be a single canonical path or an explicitly-created symlink, with a warning. |
| I2 | **`assign-canonical.py` is missing from disk.** dev-setup.md documents it + `sgs-update-v2.py` Stage 1 tail calls it as a subprocess, but `plugins/sgs-blocks/scripts/assign-canonical.py` **does not exist**. Any Stage 1 run reaching the tail step fails/warns silently. | dev-setup auditor (`os.path.exists` → False; `sgs-update-v2.py:553` calls it). | `canonical_slot` backfill may be silently not running on `/sgs-update`. |
| I3 | **`block_selectors` read-without-write.** `generate-block-reference.py` queries `block_selectors` for Spec 02's Selectors section, but `sgs-update-v2.py` Stage 1 never writes it. Selectors added to block.json won't auto-populate. | Spec 00/02 auditor. | Spec 02 selectors section silently stale. |
| I4 | **`variant_attr`/`variant_slots` seeded for ONE block.** The FR-22-20 variant detector is genuinely wired end-to-end, but `blocks.variant_attr` is populated for **`sgs/hero` only** and `variant_slots` has 8 rows (all hero). Every other variant-bearing block (trust-bar, testimonial-slider, …) is unarmed → the `--Array` variant bug + wrong/absent variants. | decisions + plans + Spec 22 auditors. | This is the upstream cause of the deferred `--Array` bug. |

---

## 3. DOC-DRIFT — code is fine, the docs are stale (refresh the docs)

| # | Drift | Doc says | Reality |
|---|---|---|---|
| D-a | **Spec 21 heat-map row counts** — nearly every count stale. | slots 96; block_attributes 2077; canonical_slot 659 (31.7%); role 676; property_suffixes 117; block_capabilities 88; modifier_suffixes 19; roles 21 | slots **101**; block_attributes **2826**; canonical_slot **1080 (38.2%)**; role **1026**; property_suffixes **123**; block_capabilities **76** (a prune); modifier_suffixes 19 ✓; roles 21 ✓ |
| D-b | **dev-setup.md counts** — `slots` 96→**101**; `html_tag_to_core_block` 14→**16** (`iframe`/`video` added); `blocks.tier` "2 class-section"→**3** (`trust-bar` added D182); `block_composition` 189→**190** | (as above) | (as above) |
| D-c | **Spec 29 roster diverges from the DB.** Spec 29 lists `content-collection` as section (DB: **layout**); lists 10 content blocks (counter/media/brand-strip/timeline/…) that have **`wraps_block=NULL`** (never registered — they lack `containerKind` in block.json); lists `modal` as excluded but the DB has it under `section`. The DB reflects the *detected* roster; Spec 29 is the *aspirational* list. | Spec 29 §4 rosters | `sync-container-wrapping-blocks.py` EXPECTED set == the DB, not Spec 29 |
| D-d | **pipeline-stages.md DB labels** — Stage 0.7 (`css_router` reads `property_suffixes` + writes `attribute_gap_candidates`) labelled "DB: none"; Stage 9b (`bucket-c-classifier` reads `property_suffixes`) undocumented; Stage 9 says gap-candidates → sgs-framework.db (actually uimax via `attribute-gap-writer.py`); +REGISTER claims `component_libraries` R+W (actually written by `/sgs-update` Stage 8, not `register_patterns.py`). | per-stage "DB:" lines | (as above) |
| D-e | **Stage labels for `variant_attr`/`variant_slots`** — stages doc says "DESIGN/build-pending" but the converter calls `variant_attr_for()`/`detect_variant()` LIVE (`convert.py:3017`). It's built (just under-seeded — see I4). | Stage 4 block status | LIVE |
| D-f | **`block_composition` "read by Stage 1 + Stage 2"** — the heat-map attributes it to the voter + confidence-matrix, but **neither has any DB import**. `block_composition` is read only at Stage 4 (`convert.py`) via `db_lookup`. | Spec 21 heat-map | Stage-4-only |
| D-g | **`slot_synonyms` residual comments.** Zero live queries (clean D99), but many `db_lookup.py` inline comments/function names (`_slot_synonyms()`) still cite the retired table — misleading archaeology. | inline comments | function reads `slots` |

---

## 4. DEFERRED-BY-DESIGN (correct — the docs say so, and the code correctly holds)

- **`block_composition.wraps_block` → `__inner` passthrough / full XS-3 walker-recursion branch** — built + populated (29-block roster, `inner` slot row present) but consumption intentionally **reverted per D109** (measured +13.07pp / +10.40pp regression); gated on P-XS-3-TRIGGER-REFINEMENT. Note: `composition_role` + `has_inner_blocks` from the *same table* ARE consumed live (leaf-detection + InnerBlocks routing) — the deferral is scoped to the `wraps_block`→`__inner`-emit path only.
- **The full Method-2 §FR-22-21 CSS-transfer** using `container_kind` as a routing destination — partially built; D189 re-opened it (this session's work advanced it). 60 of 108 nodes still drop on the converter side.
- **`emit_sgs_container_wrapping`'s outer `widthMode:'full'`** — intentional per FR-22-4 (every top-level section is full-bleed); the inner-block C1 band-aid was separately removed (D159).
- **Stage-11 auto-apply** (`sync-container-wrapping-blocks.py --apply`) — `/sgs-update` runs it report-only, pending Bean sign-off. So container-mirror auto-propagation is semi-automatic by design.
- **Spec 26 Groups A/B/C** — build-deferred by explicit Bean scope call; only FR-26-D2 (REST write to `wp_global_styles`) shipped. Correct.
- **uimax recognition-oracle** (`recognition_log` per-emit, `animations`, `component_libraries` at runtime) — CLI-exposed but not walker-consumed; the spec's own `built_status` concedes these as DESCRIBED.

---

## 5. CONFORMS — the solid DB-driven foundation (the good news)

Verified actively queried at the correct stage/function: `slots` (scope element + section), `slots.standalone_block` + aliases, `property_suffixes` + `kind_override` (the FR-22-5 D1 router), `roles` (incl. `scalar-media` D128), `modifier_suffixes` (+ breakpoint vocab), `blocks.tier` (voter section-root), `blocks.replaces` + `html_tag_to_core_block` (atomic-tag swap), `block_capabilities` (FR-22-15 tiebreak), `block_attributes` (canonical_slot/role/derived_selector — Stage 3 + 4), `block_supports` (Stage 4/5 lift), `block_composition.composition_role`/`has_inner_blocks` (walker recursion gating), `block_composition.wraps_block`/`container_kind='section'` (mirror + exemption gates), `variant_attr`/`variant_slots` (FR-22-20 detector — wired, under-seeded), `surface_pipeline_logs` (Spec 20), `push-theme-snapshot` FR-26-D2, and **the typography lift map de-hardcoded to the DB this session (`cc978252`)**. The D99 migration is the standout: **clean, complete, zero retired-table references in live code.**

---

## 6. Prioritised remediation (none done yet — this is the register)

**Tier 1 — silent correctness footguns (fix soon):**
1. **I1 DB-path split-brain** — make `sgs-update` (write) and `db_lookup`/`generate-block-reference` (read) use ONE canonical path (or create the symlink + document it). The single highest latent risk.
2. **I2 `assign-canonical.py` missing** — restore the script or remove the Stage-1 call; verify `canonical_slot` backfill actually runs.
3. **V1 `_sgs_bem_regex` hardcoded** — make it DB-driven or delete the false "DB-driven" docstring.
4. **V2 gap-candidate wrong DB** — point the library writer at uimax (single source).
5. **V3 modal/mobile-nav exclusion** — enforce `containerMirror:false` in `convert.py`, not just the sync script.

**Tier 2 — known-deferred, schedule with the relevant workstream:**
6. **I4 variant seeding** — seed `variant_attr`/`variant_slots` for all variant-bearing blocks (fixes the `--Array` bug at source).
7. **V4 inert columns** — wire `container_kind` layout/content into the Method-2 fold, or document as informational; populate/drop `accepts_allowed_blocks`.
8. **V5 WS-3 C3/C5** — `_CAPABILITY_PRIORITY` + `_infer_role` to DB.
9. **V6** — route the 3 direct `convert.py` connects through `db_lookup`.

**Tier 3 — doc refresh (mechanical, do at next `/handoff`):**
10. Refresh Spec 21 heat-map counts, dev-setup.md counts, Spec 29 roster (to match the DB / sync EXPECTED set), pipeline-stages.md DB labels (Stage 0.7 / 9b / 9 / +REGISTER), and strip the residual `slot_synonyms` comments. **Note the doc-vs-DB drift pattern:** the docs are the standard, but their *counts/rosters* drift because they're hand-maintained — consider auto-generating the Spec 21 heat-map + Spec 29 roster from the DB (like Spec 02 is).

---

## 7. Methodology note

This audit followed the same primary-source discipline as the root-cause report (`2026-06-07-converter-root-cause-and-primary-source-methodology.md`): each auditor read the truth doc **as the standard**, then verified every "should use table X" claim against the **actual scripts + the actual DB rows** — never against another doc's summary. That's why it caught both the silent hardcode (V1, invisible to a doc-only read) and the stale counts (D-a/b, invisible to a code-only read). The conformance question is only answerable by holding the two sources — docs (standard) and code+DB (reality) — against each other.
