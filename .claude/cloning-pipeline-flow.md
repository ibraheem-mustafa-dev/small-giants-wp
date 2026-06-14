---
doc_type: visual-reference
project: small-giants-wp
purpose: Overview of the SGS Cloning Pipeline — stage-index table, entry-point chain, cross-cutting principles, and pointers to per-stage detail. Per-stage annotated blocks live in cloning-pipeline-stages.md.
session_date: 2026-05-13
last_annotated: 2026-06-13
registry_entry: docs-registry.yaml canonical_docs (cloning-pipeline-flow.md)
companion_docs:
  - .claude/cloning-pipeline-stages.md - per-stage annotated blocks (scripts, files, DB, skills, status)
  - .claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md - canonical pipeline spec (Spec 22)
update_triggers:
  - Pipeline stage change (new stage, retired stage, renumbered)
  - Script wired or unwired (status flip in any stage block)
  - DB schema change affecting any pipeline stage
  - Skill dispatch change at any stage
---


# SGS Cloning Pipeline — Overview

Per-stage annotated blocks (scripts, files, DB tables, skills, status) are in
`.claude/cloning-pipeline-stages.md`. This file is the cold-start map.

> **ACTIVE BUILD TARGET (updated 2026-06-13, D222):** The Wave-2 clone-fix programme core is largely SHIPPED. **Shipped:** FR-22-5.1 inherited/absent-value resolution (D201 Commit 3), FR-22-19 retirement / `_route_composite_interior` unified (D202 Commit 4), cross-node child→parent CSS routing (D201 Commit 2), Gate A + Gate B conformance suites built + wired (D195). **D222 SHIPPED:** name-free align/grid LAYER-ROUTER — hardcoded `verticalAlign`/`alignItems` attr-name fork removed; align resolves via `db.attr_for_layer_property(slug,"OUTER","align-items")` backed by the D222 `property_suffixes` migration; router-unification commit (`c5ecb4eb`) removed the last `verticalAlign` literal from `_merge_grid_attrs_into_container`. `iconCircleBackground` is the ONLY remaining named literal (council-ruled trust-bar-specific). notice-banner content-lift (IN-F) shipped. **OPEN:** ~13 per-block `if slug=="sgs/X"` literal carve-outs — de-literalisation programme at `.claude/plans/2026-06-13-converter-de-literalisation-audit.md`. FR-22-5.2 draft-driven breakpoints not yet built. Canonical plan: `.claude/plans/2026-06-09-clone-fix-build-plan.md` + sign-off ledger.

---

## How cloning fidelity works — DO NOT REDESIGN THIS

**Read this before proposing any change to the cloning pipeline or fidelity strategy.**

**What a draft is:** an HTML file with embedded CSS whose classes follow SGS-BEM convention (`.sgs-<block>__<element>--<modifier>`). The converter's job is to faithfully transfer that draft's visual CSS into native WordPress SGS block attributes — producing a clone that looks identical to the draft AND remains fully editable in the block editor.

**The converter is ONE universal recursive walker (FR-22-3).** Exactly 3 permitted exceptions exist: atomic-tag swap / chrome-skip at top level / top-level section wrap in `sgs/container`. No per-section code branches. No 4th exception without a spec amendment.

**Block choice is DB-driven, never invented:**
- Stage 1 (`per-section-convention-voter.py` → `blocks.tier`) finds section-roots.
- Stage 2 (`confidence-matrix.py`) matches each section to the best-fit SGS block.
- No confident match → falls back to `sgs/container` BY DESIGN (Decision 3). This is correct behaviour, not a gap.
- Every BEM node → block slug via `slots.standalone_block` DB lookup. No per-section bespoke blocks, no hardcoded dicts (R-22-1).

**Fidelity = transferring the draft's CSS onto the chosen block's EDITABLE attributes** (Spec 22 §FR-22-21 universal wrapper-conversion procedure): `widthMode` / `contentWidth` / `gap` / `gridTemplateColumns` / `gridItem*` / background / padding. The clone reproduces the draft AND stays editable + reusable.

**The remaining "Method-2" converter work is COMPLETING that attribute-transfer** where it is currently incomplete (D1 sidecar not yet consumed; composite routing not yet active). It is NOT:
- Creating a new composite block per draft section.
- Hardcoding per-section class names or CSS values.
- Mirroring the draft DOM / classes verbatim (`sourceMode='bound'` cheat — purged in WS-3).
- A "complete mirror" that bypasses the converter + DB.

**Anti-pattern warning:** when a cloned section looks wrong, the fix is ALWAYS "complete the DB-driven attribute-transfer for that property". NEVER invent per-section blocks, hardcode values, or bypass the converter/DB. (blub.db 329 / `rule-critique-is-not-fix-shape-confirmation`)

---

## Stage-index table

| # | Stage name | Primary script | Primary output | Status |
|---|-----------|----------------|----------------|--------|
| 0 | Pre-flight + Theme Cache | `orchestrator/preflight_chain.py` | `stage-0-preflight.json` | LIVE |
| 0.1 | BEM compliance lint | `lints/bem-lint.py` | `stage-0.1-bem-lint.json` | LIVE |
| 0.5 | Token-usage lint | `lints/token-lint.py` | `stage-0.5-token-lint.json` | LIVE |
| 0.7 | CSS lift (four-destination router) | `orchestrator/css_router.py` | `css-d1-assignments.json` + variation CSS | LIVE (Spec 22 §FR-22-5) |
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
| 11.5 | Draft-centric fidelity gate (parity2) | `parity2/` via `sgs-clone-orchestrator.py` (inline, post-Stage-10) | `parity2-report.json` (content%/layout%/css%/full% per section) | LIVE (soft-fail; D183 2026-06-07; commit `553334f3`; opt-out `--no-parity2`) |
| +REG | Pattern registration | `orchestrator/register_patterns.py` | `patterns/<slug>.php` + DB rows | LIVE |
| — | Final acceptance harness | `orchestrator/critical-fix-verification.py` | `critical-fix-verification.json` | LIVE |

---

## Live entry-point chain

```
1.  /sgs-clone command
       ↓ invokes
2.  plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py        ✓ ENTRY POINT
       ↓ runs stages 0.1 → 9 inline + via subprocess
       ↓ also loads css_router.py, essence_match_detector.py inline
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

---

## Universal-path topology (Spec 22 FR-22-3)

The cloning pipeline emits via a single universal walker path with exactly 3 permitted exceptions. Canonical spec: `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`.

- **Universal path** — every BEM-classed DOM node resolves to a block slug via Spec 00 §3.1 BEM canonical signal + `slots` (scope='element') `standalone_block` lookup. Walker recurses into children. Per-block behaviour comes from DB rows, not code branches. See Spec 22 §3 FR-22-1 + FR-22-3.
- **Permitted exception 1** — Atomic-tag swap (Spec 22 FR-22-3 / Appendix B). Bare HTML tags with no SGS classes route via DB-driven `db.atomic_tag_map()` (`blocks.replaces` reverse-walk; `html_semantic_tag` was NOT migrated from retired `slot_synonyms` — see Spec 22 §14).
- **Permitted exception 2** — Chrome-skip at top level (header/footer/nav tags in `SKIP_TOP_LEVEL_TAGS` constant).
- **Permitted exception 3** — Top-level section wrap in `sgs/container` per architecture decision #4.

No other branches. Adding a 4th requires spec amendment with empirical justification (R-22-3). Canonical reference: `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`.

**D108/D152 status:** `block_composition` table (197 rows post-D152; `container_kind` column added D152 — values `section|layout|content` for the 31-block container roster) is LIVE as a data layer; walker recursion code that would consume it (XS-3) was REVERTED (commit `f173b351` → `c76aa107`) pending a refined trigger. Treat `block_composition` as available for DB-driven queries but NOT yet a walker branch. Refined trigger formalised as **Spec 22 §FR-22-4.1 — Universal wrapper/container resolution** (Bean-directed, 2026-05-31, D118). §FR-22-4.1 is the canonical resolution rule for every sgs-classed wrapper below a section root: (1) block-match wins; (2) direct-descendant folds into the parent container (1-child → inner-CSS layer; grid/flex → container absorbs layout + grid-item CSS per item); (3) direct-descendant that matches a block → emitted as that block; (4) non-direct-descendant → its own sgs/container, then recurse. This supersedes `walk_passthrough` drop-and-bubble for sgs-classed wrappers, the depth-2 `_is_layout_bearing_wrapper` gate, and `_absorb_transparent_wrappers` (D52). FR-22-11 governs non-sgs-classed (transparent) wrappers — unchanged.

---

## Cross-cutting principles

**Universal wrapper-conversion procedure** — the canonical container/wrapper-handling behaviour. This procedure applies at every nesting depth — to every `sgs/container` and every composite wrapper in the draft tree, not only to top-level section-root wrappers. For any draft wrapper (container / section / composite block with a built-in wrapper):

1. **Identify levels** — OUTER = the wrapper's own element (`.sgs-<x>` / main div); INNER = its direct-descendant content wrapper if any (`__inner`/`__card-inner`: cap+centre via `max-width` + `margin:auto`); GRID = whichever level has `display:grid` / columns.
2. **Emit one sgs/container for the OUTER** (or, for a composite, its built-in wrapper which MIRRORS sgs/container). Transfer outer CSS → outer attrs: background\* / padding / margin / border / min-height → supports + attrs; `max-width` ABSENT → `widthMode:"full"`, PRESENT → `widthMode:"custom"` + `customWidth` (+ `margin:auto`).
3. **Content width (inner)** — inner exists (cap-only) → `contentWidth` = inner max-width; inner is ALSO the grid → contentWidth + grid both on the constrained content; no inner (hero) → no contentWidth; inner collapsed onto outer → just the outer max-width (brand).
4. **Grid + per-item** — `grid-template-columns` (+responsive) → `gridTemplateColumns` (+Tablet/Mobile); `gap` (raw px allowed) → `gap` (+responsive); UNIFORM box CSS → `gridItem*` defaults; UNIQUE per-item CSS → onto THAT child block's own CSS.
5. **Children** — every child's own CSS transfers faithfully onto its equivalent block/element. The container NEVER imposes alignment on children.
6. **Carry all CSS** — any property with no attr equivalent → FLAG (never silent-drop). Known flags: `grid-template-areas`, `overflow` (hero-specific).

**Routing key (D194, 2026-06-09):** `canonical_slot` is content-fork metadata ONLY — it gates the child-InnerBlock-vs-scalar decision (FR-22-2.1, read with `role` + `attr_type`), NOT the structural-box-CSS router. Structural wrapper box CSS routes **name-free**: a LAYER (OUTER/CONTENT/GRID) is detected by CSS signature + position, then the attr is `{layer-prefix}` + the `property_suffixes` suffix. Fake wrapper divs (`__inner`/`__content`/`__card-inner`) fold structurally by signature (FR-22-4.1 slug-None direct descendant), never by name.

**SHIPPED 2026-06-03 (A1+A2, commit 2f86d9e6, D159):** `contentWidth` attr built on `sgs/container` (block.json 0.2.0); fold now lifts `__inner` max-width → `contentWidth` (previously discarded); slug-None section path now sets `widthMode` from the section's own max-width (ABSENT → "full"; PRESENT → "custom"+"customWidth"). **Still-pending gaps:** D1 typed-attr sidecar written-but-not-consumed (B1, WS-2) so layout CSS strands in variation CSS; gap forced to spacing-token (A4, WS-1c); `gridItem*` never written (A6, WS-1c); `widthMode:"full"` band-aid at `db_lookup.py:2461` (slug-RESOLVED path, C1, WS-3) still present — see Spec 22 §FR-22-21 + the standardisation plan (`.claude/plans/archive/2026-06-02-container-wrapper-standardisation.md`).

**WS-4 composite-mirror — BLOCK-SIDE COMPLETE (2026-06-04, D167):** shared wrapper helper (`includes/class-sgs-container-wrapper.php`) + byte-identical `sgs/container` refactor SHIPPED; whole 29-block container roster mirrors `sgs/container` via the element route — hero (section, `bacbde57`), product-card (content, `f68bdc6f` + perf `82fd3b45`, configurator preserved), the 25 composites from D166 (4 section / 14 layout / 11 content), plus content-collection registered as the 29th (layout KIND, `40a9e03d`). EXCLUDED (`containerMirror:false`): modal + mobile-nav (`391e6cb1` — Popover shell, same class as modal). The helper gained an additive opt `extra_attr_html` (pre-escaped raw attr string appended to the opening tag — used for compact `data-wp-context` via `wp_interactivity_data_wp_context`; byte-identical when unused). Element route: a composite's own outer element mirrors `sgs/container` (carries wrapper capabilities), keeping only its unique interior. **Migration recipe + KIND rules + verification = Spec 22 §FR-22-21.1; `/sgs-update` Stage 11 auto-propagation = §FR-22-21.2 (report-only, STILL PENDING).** `/sgs-update` reconciled post-WS-4: `block_attributes` 2110→2739; roster 29; 0 orphans. **SEPARATE from page-clone fidelity:** the converter still routes wrapper classes to `sgs/container` (fallback, conf 0.10) — routing `.sgs-hero`→`sgs/hero` block + the converter-lift (post-WS-4 "Method 2") are the next-session follow-ups (memory `composite-mirror-is-separate-from-cloning-fidelity`).

**FR21 invariant** — NO mutation outside `pipeline-state/` until `autonomy_gate` approves promotion. Every stage writes artefacts to `pipeline-state/<run_id>/`; staged_merge validates schema; only `--promote` copies scaffolds to canonical locations.

**DB-first** — Before adding hardcoded lookup dicts, check `sgs-framework.db`: `blocks.tier` (D107 column — `class-section` vs `block`), `block_composition` (D108 — 197 rows post-D152; `container_kind` column added D152; walker consumption DEFERRED but data layer live), `slots` scope='element' (99 rows) / scope='section' (4 rows post-D111), `roles` (21 rows: D99 base 20 + `scalar-media` D128), `property_suffixes` (124 rows post-D222 migration; `kind_override` column 17 rows; **`align-items` now has TWO rows: `VerticalAlign` + `AlignItems` — added D222 migration `2026-06-13-property-suffixes-align-items.py`**), `block_supports`, `modifier_suffixes` (19), `block_attributes` (counts drift — `/sgs-db` is authoritative; was 2,739 post-WS-4 2026-06-04), **`blocks.variant_attr`** (FR-22-20; names each block's variant-selector attr), **`variant_slots`** (FR-22-20; per-block discriminating slots by variant value; populated by `/sgs-update` from `supports.sgs.variants`). Refactor to `db_lookup.py`. New rows belong in DATED MIGRATIONS (`migrations/YYYY-MM-DD-*.py`), never as module-load write side-effects in `db_lookup.py` (D222 lesson).

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
- **Canonical pipeline spec:** `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`
- **State:** `.claude/state.md`
- **Decisions log:** `.claude/decisions.md`
- **Artefact catalogue:** `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md`
