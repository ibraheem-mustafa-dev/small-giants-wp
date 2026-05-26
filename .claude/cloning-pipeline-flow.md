---
doc_type: visual-reference
project: small-giants-wp
purpose: Overview of the SGS Cloning Pipeline — stage-index table, entry-point chain, cross-cutting principles, and pointers to per-stage detail. Per-stage annotated blocks live in cloning-pipeline-stages.md.
session_date: 2026-05-13
last_annotated: 2026-05-24 (split into overview + stages file)
last_consolidated: 2026-05-24
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
| 1 | Section boundary detection | `recogniser/per-section-convention-voter.py` | `voter.json` | LIVE |
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

---

## Cross-cutting principles

**FR21 invariant** — NO mutation outside `pipeline-state/` until `autonomy_gate` approves promotion. Every stage writes artefacts to `pipeline-state/<run_id>/`; staged_merge validates schema; only `--promote` copies scaffolds to canonical locations.

**DB-first** — Before adding hardcoded lookup dicts, check `sgs-framework.db`: `property_suffixes` (117), `block_supports` (370), `modifier_suffixes` (19), `slot_synonyms`, `block_attributes` (1406). Refactor to `db_lookup.py`.

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
