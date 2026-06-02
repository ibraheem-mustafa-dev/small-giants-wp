---
doc_type: visual-reference
project: small-giants-wp
purpose: Overview of the SGS Cloning Pipeline — stage-index table, entry-point chain, cross-cutting principles, and pointers to per-stage detail. Per-stage annotated blocks live in cloning-pipeline-stages.md.
session_date: 2026-05-13
last_annotated: 2026-05-24 (split into overview + stages file)
last_consolidated: 2026-05-29 (D99 architectural batch — slot_synonyms + legacy_role_lookup unified into `slots` table; `roles` table replaces slot_synonyms.role_classification; capability-aware tiebreaker FR-22-15 added; walker now queries slots/roles tables for resolution)
registry_entry: docs-registry.yaml canonical_docs (cloning-pipeline-flow.md)
companion_docs:
  - .claude/cloning-pipeline-stages.md - per-stage annotated blocks (scripts, files, DB, skills, status)
  - .claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md - canonical pipeline spec (Spec 16 retired 2026-05-26)
update_triggers:
  - Pipeline stage change (new stage, retired stage, renumbered)
  - Script wired or unwired (status flip in any stage block)
  - DB schema change affecting any pipeline stage
  - Skill dispatch change at any stage
---

> **2026-06-01 converter callout (cloning thread; D145/D146)** — two converter advances shipped:
> - **D146 (`270cd995`)** — `sgs/button` now replaces `core/button` everywhere (converter `atomic_tag_map` reverse-walks `blocks.replaces`); a new `button-group` slot routes `ctas`/`buttons` wrappers → `sgs/multi-button`; `_group_loose_buttons` post-pass wraps loose `sgs/button` runs in `sgs/multi-button` (WP-mirror, DB-derived slug, idempotent). Spec 11 / P-9 complete.
> - **D145 (`b93a3b51`)** — `walk()` carries `is-style-*` classes from the source node onto the emitted block (e.g. `is-style-trustpilot` on `sgs/star-rating`); the content-leaf ladder is now **tag-authoritative** (node's own tag via `atomic_tag_map` routes FIRST + ungated — `<img>`→sgs/media, `<p>`→text, `<a>`→core/button — THEN text-capable BEM segment, THEN sgs/text). Builds on D141's §FR-22-4.1.

> **2026-05-30 D107-D113 follow-up callout** — tier-driven Stage 1 + block_composition data layer + canonical_slot coverage uplift:
> - **D107 Stage 1 voter rewrite** — `per-section-convention-voter.py:295-305` now queries `blocks.tier` via `db_lookup.is_class_section_block()` helper (was: literal-slug-match against every `sgs-*` class). Section-roots → confidence 1.0; non-section-roots → gap-candidate.
> - **D107 /sgs-update integration** — `sgs-update-v2.py` Stage 1 `_index_sgs_block_files` reads `supports.sgs.is_section_root` from each `block.json` and writes `blocks.tier` (`'class-section'` if true else `'block'`). Idempotent. 2 rows currently `class-section`.
> - **D108 block_composition data layer LIVE; walker code DEFERRED** — new `block_composition` table (188 rows; schema: `block_slug` PK, `wraps_block`, `composition_role` enum, `has_inner_blocks`, `accepts_allowed_blocks`). The TABLE persists and is valid. The walker recursion code that would consume it (XS-3) was REVERTED (commit `f173b351` → `c76aa107`). Refined trigger queued at `P-XS-3-TRIGGER-REFINEMENT`.
> - **D110 assign-canonical.py D99 port + backfill** — script ported from retired `slot_synonyms` to post-D99 `slots`+`roles` schema (9 references migrated). `block_attributes.canonical_slot` coverage 52 → 692 rows (2.5% → 33.4% via initial backfill + XS-4 follow-ups); `role` coverage 110 → 689 (5.3% → 33.2%). ~1382 rows remain NULL (vocab/regex gaps logged).
> - **D111 section-scope slot retirement** — `slots` scope='section' pruned from 16 → 4 rows (keepers: core/group, hero, cta, cta-section); element scope grew to 92 (testimonial + testimonial-slider re-inserted at element scope, `inner` passthrough element row added).
> - **D112 D6 inheritance script** — new `plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` populates `block_composition.wraps_block`. Emits per-block diff Markdown to `pipeline-state/container-inheritance-sync/<date>/<block>.diff.md`. Operator-review gate (never auto-edits `block.json`). Threshold tuning queued at `P-D6-THRESHOLD-RETUNE` (4 blocks too few — target 20-30+).
> - **D113 D5 methodology updates** — STOP catalogue extended (entry #12).
> - **D3 build-deploy.py** — new automated deploy helper at `plugins/sgs-blocks/scripts/`.
> See `.claude/decisions.md` D107-D113 for full per-decision detail.

> **2026-05-29 D99 architectural cleanup batch** — recogniser/walker layer table changes:
> - `slot_synonyms` table RETIRED → unified into new `slots` table with composite PK `(slot_name, scope)`; 89 element + 16 section = 105 rows
> - `legacy_role_lookup` table RETIRED → migrated into `slots` table as scope='section' rows
> - NEW `roles` table (20 rows) replaces `slot_synonyms.role_classification` — fixes link-href bug at gate (`_content_bearing_roles()` now returns all 5 spec-defined roles)
> - NEW `property_suffixes.kind_override` column replaces `_KIND_BY_SUFFIX` hardcoded Python dict (17 rows)
> - `html_tag_to_core_block` seed switched from INSERT OR IGNORE → INSERT OR REPLACE (prevents seed/DB divergence)
> - `block_capabilities` wired into walker as FR-22-15 capability-aware BEM tiebreaker (replaces alphabetical fallback for multi-class disambiguation)
> - 4 retired blocks deleted from `blocks` table (sgs/back-to-top, sgs/data-display, sgs/icon-block, sgs/reading-progress)
> - sgs/svg-background, sgs/certification-bar retired (merged into container + trust-bar respectively)
> - /sgs-update Stage 1 gained UPDATE-on-drift; Stage 10 gained aggressive-prune default + attr-orphan detection + retired-blocks cleanup
> - Hard-link / NTFS-junction finding: .claude/.agents DB paths share inode = same physical file; real two DBs are sgs-framework + ui-ux-pro-max
> See `.claude/decisions.md` D93-D100 for full per-decision detail.

# SGS Cloning Pipeline — Overview

Per-stage annotated blocks (scripts, files, DB tables, skills, status) are in
`.claude/cloning-pipeline-stages.md`. This file is the cold-start map.

## Stage-index table

| # | Stage name | Primary script | Primary output | Status |
|---|-----------|----------------|----------------|--------|
| 0 | Pre-flight + Theme Cache | `orchestrator/preflight_chain.py` | `stage-0-preflight.json` | LIVE |
| 0.1 | BEM compliance lint | `lints/bem-lint.py` | `stage-0.1-bem-lint.json` | LIVE |
| 0.5 | Token-usage lint | `lints/token-lint.py` | `stage-0.5-token-lint.json` | LIVE |
| 0.7 | CSS lift (four-destination router) | `orchestrator/css_router.py` | `css-d1-assignments.json` + variation CSS | LIVE (Spec 22 §FR-22-5; was Spec 16 §FR6 — retired 2026-05-26) |
| 0.8 | Theme-widths detection | `converter_v2/convert.py` (inline fns) | `styles/<client>.json` (idempotent) | LIVE |
| 1 | Section boundary detection | `recogniser/per-section-convention-voter.py` | `voter.json` | LIVE (tier-driven post-D107) |
| 2 | Block-type match | `recogniser/confidence-matrix.py` | `stage-2.json` | LIVE |
| 3 | Slot list | `sgs-clone-orchestrator.py` (inline) | `stage-3-slot_list.json` | LIVE |
| 4 | Slot extraction | `converter_v2/convert.py` | `extract-<boundary>.json` | LIVE (cv2 only) |
| 4.5 | Token snapping | `orchestrator/token_resolver.py` | `styles/<client>.json` (tokens) | LIVE |
| 5 | Default-inheritance check | `orchestrator/supports_writer.py` | `supports_decisions` on section result | LIVE |
| 6 | Block.json emission | inline in `sgs-clone-orchestrator.py` | `extract-<boundary>.json` (markup field) | LIVE |
| 7 | Render to WP markup | inline + `orchestrator/composer_fallback.py` | `full-page-markup.html` | LIVE |
| 7b | Staged merge (FR21 keystone) | `orchestrator/staged_merge.py` | validates all stage-N.json artefacts | LIVE |
| — | Pre-deploy gate | `orchestrator/attribute-staged-apply.py` etc. | `stage-4i.json`, `stage-4j.json` | LIVE |
| 8 | Deploy + Visual Parity QA | `orchestrator/autonomy_gate.py` + `visual_qa_capture.py` | `stage-8-visual_qa.json` | LIVE |
| 9 | Coverage + Gap reporting | `recogniser/leftover-bucket-router.py` | `stage-9-coverage.json`, `gap-review.md` | LIVE |
| 9b | Autonomy chain (recovery) | `recogniser/bucket-c-classifier.py` + `orchestrator/atomic-block-scaffold.py` | `scaffold-<slug>/` | PARTIAL |
| 9c | Structured log surfacing | `orchestrator/surface_pipeline_logs.py` | `summary.log`, sidecar logs | LIVE |
| 10 | Per-page deploy | `orchestrator/upload_and_patch.py` | `extract.patched.json` + REST PATCH | LIVE (opt-in) |
| 11 | Per-section pixel-diff (deployed) | `orchestrator/upload_and_patch.py` (post-Stage-10) | `stage-11-pixel-diff.json` | LIVE |
| +REG | Pattern registration | `orchestrator/register_patterns.py` | `patterns/<slug>.php` + DB rows | LIVE |
| — | Final acceptance harness | `orchestrator/critical-fix-verification.py` | `critical-fix-verification.json` | LIVE |

---

## Live entry-point chain (verified 2026-05-13; ASCII art stale post 2026-05-20)

```
1.  /sgs-clone command
       ↓ invokes
2.  plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py        ✓ ENTRY POINT
       ↓ runs stages 0.1 → 9 inline + via subprocess
       ↓ then imports
3.  plugins/sgs-blocks/scripts/orchestrator/orchestrator_main.py  ✓
       ↓ loads
       ├─ staged_output.py         ✓
       ├─ preflight_chain.py       ✓
       ├─ staged_merge.py          ✓
       └─ autonomy_gate.py         ✓
       ↓ on success
4.  plugins/sgs-blocks/scripts/orchestrator/register_patterns.py ✓ +REGISTER tail
```

**Note (2026-05-20):** `css_router.py`, `essence_match_detector.py`, and
`stage_attribute_promotion.py` were added in the architectural rewrite and are
not yet reflected in the ASCII art above.
Tracked: `P-CLONING-PIPELINE-FLOW-DOC-DRIFT` in parking.md.

---

## Universal-path topology (Spec 22 FR-22-3)

The cloning pipeline emits via a single universal walker path with exactly 3 permitted exceptions. The legacy "two-route" topology (Spec 16 FR1 fast path + FR4 normal route) is **retired** — Spec 16 archived 2026-05-26.

- **Universal path** — every BEM-classed DOM node resolves to a block slug via Spec 00 §3.1 BEM canonical signal + `slot_synonyms.standalone_block` lookup. Walker recurses into children. Per-block behaviour comes from DB rows, not code branches. See Spec 22 §3 FR-22-1 + FR-22-3.
- **Permitted exception 1** — Atomic-tag swap (Spec 22 FR-22-3 / Appendix B). Bare HTML tags with no SGS classes route via DB-driven `db.atomic_tag_map()` (`slot_synonyms.html_semantic_tag` + `blocks.replaces` reverse-walk).
- **Permitted exception 2** — Chrome-skip at top level (header/footer/nav tags in `SKIP_TOP_LEVEL_TAGS` constant).
- **Permitted exception 3** — Top-level section wrap in `sgs/container` per architecture decision #4.

No other branches. Adding a 4th requires spec amendment with empirical justification (R-22-3). Canonical reference: `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`.

**D108 status (2026-05-30):** `block_composition` table (188 rows) is LIVE as a data layer; walker recursion code that would consume it (XS-3) was REVERTED (commit `f173b351` → `c76aa107`) pending a refined trigger. Treat `block_composition` as available for DB-driven queries but NOT yet a walker branch. Refined trigger formalised as **Spec 22 §FR-22-4.1 — Universal wrapper/container resolution** (Bean-directed, 2026-05-31, D118). §FR-22-4.1 is the canonical resolution rule for every sgs-classed wrapper below a section root: (1) block-match wins; (2) direct-descendant folds into the parent container (1-child → inner-CSS layer; grid/flex → container absorbs layout + grid-item CSS per item); (3) direct-descendant that matches a block → emitted as that block; (4) non-direct-descendant → its own sgs/container, then recurse. This supersedes `walk_passthrough` drop-and-bubble for sgs-classed wrappers, the depth-2 `_is_layout_bearing_wrapper` gate, and `_absorb_transparent_wrappers` (D52). FR-22-11 governs non-sgs-classed (transparent) wrappers — unchanged.

---

## Cross-cutting principles

**Universal wrapper-conversion procedure** — the canonical container/wrapper-handling behaviour. For any draft wrapper (container / section / composite block with a built-in wrapper):

1. **Identify levels** — OUTER = the wrapper's own element (`.sgs-<x>` / main div); INNER = its direct-descendant content wrapper if any (`__inner`/`__card-inner`: cap+centre via `max-width` + `margin:auto`); GRID = whichever level has `display:grid` / columns.
2. **Emit one sgs/container for the OUTER** (or, for a composite, its built-in wrapper which MIRRORS sgs/container). Transfer outer CSS → outer attrs: background\* / padding / margin / border / min-height → supports + attrs; `max-width` ABSENT → `widthMode:"full"`, PRESENT → `widthMode:"custom"` + `customWidth` (+ `margin:auto`).
3. **Content width (inner)** — inner exists (cap-only) → `contentWidth` = inner max-width; inner is ALSO the grid → contentWidth + grid both on the constrained content; no inner (hero) → no contentWidth; inner collapsed onto outer → just the outer max-width (brand).
4. **Grid + per-item** — `grid-template-columns` (+responsive) → `gridTemplateColumns` (+Tablet/Mobile); `gap` (raw px allowed) → `gap` (+responsive); UNIFORM box CSS → `gridItem*` defaults; UNIQUE per-item CSS → onto THAT child block's own CSS.
5. **Children** — every child's own CSS transfers faithfully onto its equivalent block/element. The container NEVER imposes alignment on children.
6. **Carry all CSS** — any property with no attr equivalent → FLAG (never silent-drop). Known flags: `grid-template-areas`, `overflow` (hero-specific).

The current implementation has tracked gaps (content-width attr not built, fold drops `__inner` max-width, gridItem\* never written, composites don't mirror) — see Spec 22 §FR-22-21 + the standardisation plan (`.claude/plans/2026-06-02-container-wrapper-standardisation.md`).

**FR21 invariant** — NO mutation outside `pipeline-state/` until `autonomy_gate` approves promotion. Every stage writes artefacts to `pipeline-state/<run_id>/`; staged_merge validates schema; only `--promote` copies scaffolds to canonical locations.

**DB-first** — Before adding hardcoded lookup dicts, check `sgs-framework.db`: `blocks.tier` (D107 column — `class-section` vs `block`), `block_composition` (D108 — 188 rows; walker consumption DEFERRED but data layer live), `slots` scope='element' (89 rows) / scope='section' (6 rows post-D111) + new `inner` element row, `roles` (20 rows, D99), `property_suffixes` (117 + `kind_override` column 17 rows), `block_supports`, `modifier_suffixes` (19), `block_attributes` (2074; `canonical_slot` 31.8% / `role` 32.6% post-D110 backfill), **`blocks.variant_attr`** (DESIGN — FR-22-20; names each block's variant-selector attr), **`variant_slots`** (DESIGN — FR-22-20; per-block discriminating slots by variant value; populated by `/sgs-update` from `supports.sgs.variants`). Refactor to `db_lookup.py`.

**Token-snap strict exact-match** — Snap only when token's resolved value equals the literal within tight tolerance (ΔE ≤ 1.0 for colour, ≤ 1px for spacing/font-size). Nearest-match (confidence 0.85) is NOT snap-eligible. See `mistakes.md` 2026-05-20 lesson 1.

**Operator-promotion is end-of-line cleanup** — dominant 50-85% of pixel-diff comes from structural gaps (cv2 emit shape, slot-resolver, measurement contamination, DOM-shape mismatches). Promotion closes the last 5-10% AFTER structural fixes land.

**Read `leftover-buckets.json` first** — MANDATORY before any converter-quality conjecture. The orchestrator pre-classifies every gap. See `feedback_read_leftover_buckets_before_conjecturing.md`.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✓ | Wired into the live `/sgs-clone` path |
| ✗ | Built + tested but NOT wired |
| ⚠ | Wired but with caveat |
| ◯ | Fallback only |
| [B] | Known bug |
| (R) | Reads file or DB table |
| (W) | Writes file or DB table |
| (X) | Dispatches skill or external tool |

---

## See also

- **Per-stage detail:** `.claude/cloning-pipeline-stages.md` — stage annotated blocks, script inventory, skill dispatch chain (full), DB heat-map (full)
- **Canonical pipeline spec:** `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` (Spec 16 retired 2026-05-26, archived at `.claude/specs/archive/`)
- **State:** `.claude/state.md`
- **Decisions log:** `.claude/decisions.md`
- **Artefact catalogue:** `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md`
