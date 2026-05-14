---
doc_type: tooling-map
project: small-giants-wp
generated: 2026-05-13
generated_by: research-check audit subagent (Sonnet) + Gemini Flash QC + main-thread reconciliation
purpose: Single authoritative reference for every script/tool in the SGS pipeline. Stop reinventing. Use this.
companion_docs:
  - .claude/skills-commands-map.md - All 17 slash commands + skills cross-referenced to pipeline stages
  - .claude/db-tables-map.md - All tables in sgs-framework.db + ui-ux-pro-max.db with read/write provenance per pipeline stage
  - .claude/reports/2026-05-13-tooling-map-qc-gemini-flash.md - Independent QC verdict 93/100
qc_status: PATCHED 2026-05-13 - applied 5 material corrections from Gemini Flash + /qc-inline + 2 corrections from Round 2 (Haiku + Gemini)
last_verified: 2026-05-14
update_triggers:
  - Any script add/remove/rename under plugins/sgs-blocks/scripts/, scripts/, or tools/
  - Any script wiring status change (TESTS-ONLY -> YES, etc.)
  - Any script status reclassification (CURRENT -> DEPRECATED, etc.)
enforcement: .claude/hooks/tooling-map-drift-check.py (committed 2026-05-13, currently passes)
registry_entry: docs-registry.md row 12
---

# SGS Cloning Pipeline - Tooling Map

## Companion documents

This document is the SCRIPT inventory. Two siblings extend it:

- **Skills + commands**: see [.claude/skills-commands-map.md](skills-commands-map.md) - all 17 slash commands and skills (e.g. /sgs-clone, /sgs-update, /sgs-db, /uimax-*, /chrome-devtools-cli, /playwright) catalogued with their pipeline position and the scripts each invokes.
- **Database tables**: see [.claude/db-tables-map.md](db-tables-map.md) - all 29 tables in sgs-framework.db + 48 tables in ui-ux-pro-max.db, mapped to the pipeline stages and scripts that read or write them.
- **QC report**: see [.claude/reports/2026-05-13-tooling-map-qc-gemini-flash.md](reports/2026-05-13-tooling-map-qc-gemini-flash.md) - independent verification by Gemini Flash, 93/100 accuracy, 5 material errors caught and patched into the tables below.

## Corrections applied 2026-05-13 (QC patch)

After the initial audit, two QC passes ran (`/qc-inline` + Gemini Flash) and surfaced 5 material errors. Original audit kept for history; the row-level tables below reflect the CORRECTED state.

| File | Original claim | Corrected claim | Source |
|---|---|---|---|
| bucket-c-classifier.py | TESTS-ONLY | YES - imported at sgs-clone-orchestrator.py:53 + called via importlib at line 846 (autonomy chain) | /qc-inline + Gemini Flash |
| recursion-guard.py | YES | NO - not imported in any live entry-point | Gemini Flash (missed by /qc-inline) |
| uimax_write.py | YES (via register_patterns.py) | NO via /sgs-clone path - register_patterns.py uses sqlite3 directly. STILL wired via /sgs-update path | Both |
| uimax-write-validator.py | YES | NO via /sgs-clone - same chain broken (transitive of uimax_write) | Both |
| inheritance.py | YES (via preflight_chain.py) | NO - only imported by supports_writer.py (unwired) + tests | Gemini Flash (I was wrong) |
| match.py | YES (transitive of token_resolver - which is unwired) | YES (correct status, wrong reason) - actually wired via token-lint.py:91 in live Stage 0.5 | Gemini Flash (I was wrong) |

**Net effect on the headline finding:** 14 modules unwired stands (bucket-c-classifier reclassification offsets recursion-guard reclassification). Plus 3 additional wired-in claims need their REASON corrected (uimax_write, uimax-write-validator, match.py - status was right or partially right, the import chain stated in the doc was wrong).

## Round 2 QC corrections (Haiku + Gemini Flash, 2026-05-13)

A second QC pass ran Haiku + Gemini Flash in parallel with explicit "trust nothing, verify everything against disk" instructions. Haiku 98/100; Gemini 85/100 (lower only due to ~/.agents/ and sqlite3 paths being unreachable from sandbox - not actual doc errors). Two new material corrections surfaced:

| # | File / Claim | Issue | Severity |
|---|---|---|---|
| 6 | `validate-naming.py` | Claimed CURRENT in inventory but `find` returns 0 results - file does not exist on disk despite being referenced in /sgs-clone SKILL.md | Material |
| 7 | Live pipeline entry-point #7 (atomic-block-scaffold import chain) | Doc previously claimed compose_atomic_pattern() imports atomic-block-scaffold. Reality: composer is self-contained; atomic-block-scaffold is imported by `stage_9b_autonomy_chain` at line 829. atomic-block-scaffold IS part of the wired autonomy chain, NOT a composer-fallback dependency. | Material - strengthens "wire the autonomy chain" finding |

Both applied to the tables below. The 14-module-unwired list confirmed by both reviewers individually.

## Live pipeline entry-points

1. `/sgs-clone` invokes -> `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (production CLI entry)
2. `sgs-clone-orchestrator.py` Stage 1 dispatches via subprocess -> `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py`
3. `sgs-clone-orchestrator.py` Stage 2 imports directly -> `plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py:score_candidates()`
4. `sgs-clone-orchestrator.py` Stages 4-8 dispatch via subprocess -> `tools/recogniser-v2/extract.py` (one call per matched section)
5. `sgs-clone-orchestrator.py` Stage 9 dispatches via subprocess -> `plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py`
6. `sgs-clone-orchestrator.py` Stage 9 dispatches via subprocess -> `plugins/sgs-blocks/scripts/recogniser/simple_html_review_report.py`
7. `sgs-clone-orchestrator.py` autonomy chain (Stage 9b, `stage_9b_autonomy_chain` at line 829) imports -> `plugins/sgs-blocks/scripts/orchestrator/atomic-block-scaffold.py`. The deferred fallback path (`compose_atomic_pattern()` at line 339) is SELF-CONTAINED - it does NOT import atomic-block-scaffold (CORRECTED 2026-05-13 via Gemini Flash Round 2 QC: prior doc claim was wrong; atomic-block-scaffold is part of the autonomy chain, not the composer fallback)
8. After all stages complete, `sgs-clone-orchestrator.py` imports -> `plugins/sgs-blocks/scripts/orchestrator/orchestrator_main.py:run()` (preflight + staged_merge + visual_qa + autonomy gate chain)
9. If `orchestrator_main.run()` returns `outcome.overall == 'success'`, the +REGISTER tail fires -> `plugins/sgs-blocks/scripts/orchestrator/register_patterns.py:register_run()`

`tools/recogniser-v2/extract.py` calls -> `tools/recogniser-v2/extract_strategies.py` (role dispatch) and `tools/recogniser-v2/overrides/hero.py` (hero-specific override, pending retirement)

`orchestrator_main.py` composes (loads at startup):
- `plugins/sgs-blocks/scripts/orchestrator/staged_output.py`
- `plugins/sgs-blocks/scripts/orchestrator/preflight_chain.py`
- `plugins/sgs-blocks/scripts/orchestrator/staged_merge.py`
- `plugins/sgs-blocks/scripts/orchestrator/autonomy_gate.py`

**Known gap (2026-05-13 post-QC):** 14 Phase 5 modules are BUILT and tested but NOT wired into the production orchestrator call chain. Specifically: `variation_router`, `token_resolver`, `attribute-staged-apply`, `functionality-bulk-apply`, `media-sideload`, `supports_writer`, `stage1_boundary_hook`, `modifier_extractors`, `wp_integration`, `lingua_franca`, `attribute-gap-writer`, `functionality-gap-detector`, `gap-review-report`, `critical-fix-verification`. (Note: `bucket-c-classifier` IS already wired - corrected 2026-05-13.) Plus `inheritance.py` is unwired by association (its only loader `supports_writer.py` is unwired). Plus `uimax_write.py` + validator are bypassed in /sgs-clone path (register_patterns.py uses sqlite3 directly), breaking Rosetta Stone discipline on the clone tail. This is the integration gap that causes 6 of 9 sections to "vapour" on the rendered page for Mama's mockup.

---

## Quick Index

- [Live pipeline core](#live-pipeline-core)
- [Pipeline modules (Phase 5 - partial wiring)](#pipeline-modules-phase-5---partial-wiring)
- [Recogniser modules](#recogniser-modules)
- [Extraction modules (recogniser-v2)](#extraction-modules-recogniser-v2)
- [v1 recogniser (TO-RETIRE)](#v1-recogniser-to-retire)
- [Token / value matching](#token--value-matching)
- [Lints (Stage 0.1 + 0.5)](#lints-stage-01--05)
- [DB vocabulary + gap detection](#db-vocabulary--gap-detection)
- [Behavioural analyser](#behavioural-analyser)
- [Drift validator](#drift-validator)
- [Pattern tools](#pattern-tools)
- [uimax tools](#uimax-tools)
- [Build + setup tools](#build--setup-tools)
- [Fingerprint builder](#fingerprint-builder)
- [QA / diff tools (scripts/)](#qa--diff-tools-scripts)
- [Multi-frame QA (tools/)](#multi-frame-qa-tools)
- [Tests](#tests)
- [Deprecated / to-retire](#deprecated--to-retire)
- [Open questions / verify](#open-questions--verify)

---

## Per-script tables by category

### Live pipeline core

These are the files that run on every `/sgs-clone` invocation in production today.

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| sgs-clone-orchestrator.py | plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py | 9-stage Draft-to-SGS pipeline driver; wraps all recogniser + extract scripts and writes JSON artefacts to pipeline-state/ | Phase 7 rewire (2026-05-11) | CURRENT | YES - this IS the entry point | Stages 1, 2, 9 wired to real dispatchers in Phase 7; Stage 4-8 calls extract.py; deferred fallback calls atomic-block-scaffold |
| orchestrator_main.py | plugins/sgs-blocks/scripts/orchestrator/orchestrator_main.py | Top-level Phase 5 chain: preflight -> staged_merge -> visual_qa -> autonomy gate -> sgs-update -> deliverable bundle | Spec 15 Phase 5e.8 | CURRENT | YES - called from sgs-clone-orchestrator.py after stages complete | Wires staged_output + preflight_chain + staged_merge + autonomy_gate |
| register_patterns.py | plugins/sgs-blocks/scripts/orchestrator/register_patterns.py | +REGISTER tail: writes PHP pattern file + inserts row into sgs-framework.db + inserts row into uimax patterns table after successful clone run | Spec 15 Phase 6 Step 0 | CURRENT | YES - called after orchestrator_main returns success | Idempotent at 3 gates; module-only, no CLI |

### Pipeline modules (Phase 5 - partial wiring)

Some loaded by `orchestrator_main` (preflight_chain, staged_merge, staged_output, autonomy_gate, visual_qa_capture, mutex, validate-stage-artifact). The remainder are BUILT but only called from tests. Outstanding work to wire into the production path for Phase 5d/5e/5f.

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| preflight_chain.py | plugins/sgs-blocks/scripts/orchestrator/preflight_chain.py | Pre-pipeline checks (mutex free, DB reachable, entry preconditions) + pre-commit gate (BEM lint + token lint + drift validator + Phase 1 unit tests) | Spec 15 Phase 5e.1 + 5e.2 | CURRENT | YES - loaded by orchestrator_main | Two chains: run_preflight() + run_precommit_gate() |
| staged_merge.py | plugins/sgs-blocks/scripts/orchestrator/staged_merge.py | Keystone FR21: walks every stage-N artefact, validates schema, invokes per-stage apply callable, rolls back atomically on failure; never mutates canonical code directly | Spec 15 Phase 5e.3 | CURRENT | YES - loaded by orchestrator_main | FR21 no-canonical-mutation discipline enforcer |
| staged_output.py | plugins/sgs-blocks/scripts/orchestrator/staged_output.py | Defines the pipeline-state/sgs-clone/<run_id>/stage-N-<name>.json dir convention so every stage writes to disk before next reads | Spec 15 Phase 5b.1 | CURRENT | YES - loaded by orchestrator_main | Mirrors the 9 stage names from Spec 15 §6 |
| autonomy_gate.py | plugins/sgs-blocks/scripts/orchestrator/autonomy_gate.py | Visual QA invoke + autonomy decision (PASS when diff <= threshold AND zero console errors) + sgs-update auto-invoke on PASS + deliverable bundle | Spec 15 Phase 5e.4 + 5e.5 + 5e.6 + 5e.7 | CURRENT | YES - loaded by orchestrator_main | Production capture callable supplied by visual_qa_capture.py; injectable for tests |
| visual_qa_capture.py | plugins/sgs-blocks/scripts/orchestrator/visual_qa_capture.py | Factory that returns the capture callable for autonomy_gate; uses Playwright to screenshot deployed clone + mockup, runs PIL pixel-diff | Phase 6 Step 0 | CURRENT | YES - imported by sgs-clone-orchestrator.py | Pure module, no CLI; dependency of autonomy_gate's production wiring |
| mutex.py | plugins/sgs-blocks/scripts/orchestrator/mutex.py | File-based build mutex preventing parallel /sgs-update + /sgs-clone runs from corrupting sgs-framework.db; stale-lock detection at 1 hour | Spec 15 Phase 5b.4 FR19 | CURRENT | YES - used by preflight_chain | Cross-platform (works on Windows + POSIX); lock file holds JSON {holder, pid, started_at, command} |
| validate-stage-artifact.py | plugins/sgs-blocks/scripts/orchestrator/validate-stage-artifact.py | Validates a /sgs-clone stage artefact against its JSON schema in orchestrator/schemas/stage-N.json; 7 check types | Spec 15 Phase 5b.2 | CURRENT | YES - staged_merge calls this per stage | Reads schemas from orchestrator/schemas/ subfolder |
| atomic-block-scaffold.py | plugins/sgs-blocks/scripts/orchestrator/atomic-block-scaffold.py | Emits 4 minimal Gutenberg files (block.json + render.php + edit.js + save.js) for a new-block candidate surfaced by bucket-C classifier; writes canonical_slot rows to sgs-framework.db | Spec 15 Phase 5b.8 | CURRENT | FALLBACK - called only when target_block == 'core/group' or confidence == 0 | --promote flag copies scaffold into plugins/sgs-blocks/src/blocks/<slug>/; staging-only by default |
| variation_router.py | plugins/sgs-blocks/scripts/orchestrator/variation_router.py | Single write path for token additions/updates during /sgs-clone: writes to client's style variation JSON, hard-blocked from mutating root theme.json | Spec 15 Phase 5d.3 | CURRENT | TESTS-ONLY - not yet wired into production path | Has CLI for standalone invocation; writing bespoke detail as new tokens per feedback_cloning_preserves_intentional_bespoke_detail |
| token_resolver.py | plugins/sgs-blocks/scripts/orchestrator/token_resolver.py | Attr-aware entry point: snaps (block_slug, attr_name, raw_value) to nearest theme.json token via value-matcher, or marks as gap candidate | Spec 15 Phase 5d.2 | CURRENT | **YES** - wired into sgs-clone-orchestrator.py Stage 4.5 by Phase 6 v2 Step 4a (2026-05-14). Lazy-loaded via `token_resolver()` helper at line ~520; called per matched section after extract.py returns; transforms section_attrs to use token_slug references when confidence >= 0.6; gap candidates surface in `token_resolutions` field on per_section_results | Wraps value-matcher/match.py; never mutates theme.json. Theme + variation overlay loaded once per /sgs-clone run in stage_4_5_6_7_8_extract |
| attribute-staged-apply.py | plugins/sgs-blocks/scripts/orchestrator/attribute-staged-apply.py | Writes extracted block attrs to a STAGING file first, emits wp eval-file deploy command after operator approval; never touches live WP DB directly | Spec 15 Phase 5b.6 | CURRENT | TESTS-ONLY | FR21 compliant: staging + emit only |
| functionality-bulk-apply.py | plugins/sgs-blocks/scripts/orchestrator/functionality-bulk-apply.py | Stages and emits a transactional wp eval-file command for applying a new attribute across many existing block instances atomically | Spec 15 Phase 5b.7 | CURRENT | TESTS-ONLY | All-or-nothing atomicity; simulates apply Python-side before operator runs deploy |
| media-sideload.py | plugins/sgs-blocks/scripts/orchestrator/media-sideload.py | Uploads image-object slots from draft data to WordPress REST /wp/v2/media; returns attachment ID + URL for downstream attribute rewrite | Spec 15 Phase 5b.5 | CURRENT | TESTS-ONLY | Dry-run default; --upload flag for actual POST; authenticates via Application Passwords |
| supports_writer.py | plugins/sgs-blocks/scripts/orchestrator/supports_writer.py | Omit-vs-emit decision: skips writing a per-block override when the resolved value matches the block's supports native default (let cascade apply) | Spec 15 Phase 5d.4 | CURRENT | TESTS-ONLY | Runs at WRITE time; pairs with inheritance.py which runs at EXTRACT time |
| stage1_boundary_hook.py | plugins/sgs-blocks/scripts/orchestrator/stage1_boundary_hook.py | End-of-Stage-1 hook: classifies source naming convention, runs lingua_franca on class_signature, enriches boundary with SGS-BEM primaries + equivalent_implementations | Spec 15 Phase 5c.4 | CURRENT | TESTS-ONLY | Production classifier dispatches to /uimax-classify-naming; injectable stub for tests |
| modifier_extractors.py | plugins/sgs-blocks/scripts/orchestrator/modifier_extractors.py | Three post-extraction classifiers: button_role() -> primary/secondary/ghost, dynamic_link() -> query descriptor for :latest-post() modifiers, match_block_variation() -> closest variation slug | Spec 15 Phase 5d.5 + 5d.6 + 5d.8 | CURRENT | TESTS-ONLY | Called between Stage 4 and Stage 7 |
| wp_integration.py | plugins/sgs-blocks/scripts/orchestrator/wp_integration.py | Three WP wiring points: validate_block_markup(), route_native_feature() for lightbox/duotone, build_deploy_command() (builds but never executes) | Spec 15 Phase 5d.7 + 5d.9 + 5d.10 | CURRENT | TESTS-ONLY | Stage 7 + Stage 8 wiring |
| lingua_franca.py | plugins/sgs-blocks/scripts/orchestrator/lingua_franca.py | Converts external source naming conventions to SGS-BEM at scrape time; preserves original in equivalent_implementations per Rosetta Stone discipline | Spec 15 Phase 5c | CURRENT | TESTS-ONLY | Handles BEM, Tailwind, and 3 other high-priority conventions |
| critical-fix-verification.py | plugins/sgs-blocks/scripts/orchestrator/critical-fix-verification.py | 5-check acceptance harness: root theme.json hash unchanged, no canonical block mutation outside FR21, plus 3 more boundary checks | Spec 15 Phase 5f.1 FR18 | CURRENT | TESTS-ONLY | Runs all checks even on failure; surfaces full picture to operator |

### Recogniser modules

Scripts that handle Stages 1, 2, and 9 of the pipeline (boundary detection, block matching, leftover routing).

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| per-section-convention-voter.py | plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py | Stage 1: determines naming convention per section, derives class signature, proposes candidate SGS block slug; deterministic for SGS-BEM drafts | Spec 14 P1 + Phase 7 rewire | CURRENT | YES - subprocess called from sgs-clone-orchestrator.py Stage 1 | Confidence 1.0 for SGS-BEM conformant drafts; falls back to lookup table for non-conforming sections |
| confidence-matrix.py | plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py | Stage 2: ranks SGS block candidates by combining voter candidate with block.json existence check, DOM shape, class overlap; importable score_candidates() | Spec 14 P1 + Phase 7 rewire | CURRENT | YES - imported directly (not subprocess) in sgs-clone-orchestrator.py Stage 2 | score_candidates() is the API; verifies slug against registered block.json files |
| leftover-bucket-router.py | plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py | Stage 9: routes unabsorbed DOM elements into 5 buckets (unrecognised_class, unrecognised_section, extraction_failed, animation_unclassified, structural_mismatch_or_orphan) | Spec 14 P1 | CURRENT | YES - subprocess called from sgs-clone-orchestrator.py Stage 9 | 5th bucket (structural_mismatch_or_orphan) added in 4-model peer review 2026-05-08 |
| simple_html_review_report.py | plugins/sgs-blocks/scripts/recogniser/simple_html_review_report.py | Stage 9: renders the operator-review HTML page from all stage JSON artefacts in a run dir | Spec 14 P1 | CURRENT | YES - subprocess called from sgs-clone-orchestrator.py Stage 9 | Accepts --run-dir shorthand to auto-locate all stage files |
| bucket-c-classifier.py | plugins/sgs-blocks/scripts/recogniser/bucket-c-classifier.py | Spec 15 Phase 5a.2: classifies unrouted DOM elements by voting into the closest Layer 2 ROLE from property_suffixes taxonomy in sgs-framework.db | Spec 15 Phase 5a.2 | CURRENT | **YES** - declared at sgs-clone-orchestrator.py:53 as CLASSIFIER_SCRIPT and called via importlib at line 846 (autonomy chain fires for unmatched sections) | CORRECTED 2026-05-13 via QC: was previously misclassified as TESTS-ONLY. Soft-fails to text-content fallback if classifier errors; feeds attribute-gap-writer downstream (which is itself still unwired) |
| attribute-gap-writer.py | plugins/sgs-blocks/scripts/recogniser/attribute-gap-writer.py | FR8 compliant: single entry point to INSERT rows into uimax.attribute_gap_candidates with mandatory provenance + run_id stamp | Spec 15 Phase 5a.4 | CURRENT | TESTS-ONLY | Sibling of functionality-gap-detector.py; never auto-deletes rows |
| functionality-gap-detector.py | plugins/sgs-blocks/scripts/recogniser/functionality-gap-detector.py | Spec 15 Phase 5a.3: detects when a draft DOM element expects behaviour (data-action, toggle, modal, scroll-reveal) that the matched SGS block does not provide; writes to uimax.functionality_gap_candidates | Spec 15 Phase 5a.3 | CURRENT | TESTS-ONLY | FR8 counter-discipline: writes only, never deletes |
| gap-review-report.py | plugins/sgs-blocks/scripts/recogniser/gap-review-report.py | Phase 5a.5: generates a markdown gap-review.md report sorted by severity for the operator after each clone run | Spec 15 Phase 5a.5 | CURRENT | TESTS-ONLY | Reads router output; groups by gap_level; emits to pipeline-state/<run_id>/gap-review.md |
| recursion-guard.py | plugins/sgs-blocks/scripts/recogniser/recursion-guard.py | Depth + cycle protection for DOM-walking pipeline scripts; max_depth=12, visited_nodes cycle detection | Spec 14 Phase 2 | CURRENT | **NO** - no import found in any live entry-point (sgs-clone-orchestrator.py, orchestrator_main.py, register_patterns.py, or their transitive imports) | CORRECTED 2026-05-13 via QC: was previously claimed YES via sgs-clone-orchestrator.py but no import exists. Module's own docstring is misleading. Should be wired into per-section-convention-voter.py and leftover-bucket-router.py for safety; currently isn't |
| __init__.py | plugins/sgs-blocks/scripts/recogniser/__init__.py | Empty package marker | - | CURRENT | YES - package namespace | No logic |

### Extraction modules (recogniser-v2)

Core slot-extraction engine called by the orchestrator per matched section.

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| extract.py | tools/recogniser-v2/extract.py | Spec 15 §6-driven dispatcher: reads canonical slot list from sgs-framework.db, resolves per-block overrides (currently hero only), dispatches each slot to the matching generic strategy | Spec 14 P4 refactor; Spec 15 Phase 3 rewire | CURRENT | YES - subprocess called from sgs-clone-orchestrator.py Stages 4-8 | 630 LOC after Spec 14 P4 refactor; will retire hero override once convention-path strategies mature (FR40) |
| extract_strategies.py | tools/recogniser-v2/extract_strategies.py | 11 role-based extraction strategies (text_content, richtext_html, image_src, etc.) dispatched by extract.py based on slot role | Spec 14 Phase 4 | CURRENT | YES - imported by extract.py | Confidence scale: 1.0 exact / 0.9 computed-style / 0.7 fuzzy / 0.5 fallback / 0.3 block.json default / 0.0 no element |
| utils.py | tools/recogniser-v2/utils.py | Shared helpers (numeric parsing, BS4, CSS classification, computed-style accessor) used by extract.py + overrides + extract_strategies | Spec 14 Phase 4 | CURRENT | YES - imported by extract.py | Pure helpers; no DOM/Playwright dependencies |
| overrides/__init__.py | tools/recogniser-v2/overrides/__init__.py | Override registry: maps block slug to override callable; dispatcher checks here before falling through to generic role-based extraction | Spec 14 Phase 4 | CURRENT | YES - imported by extract.py | Hero override deletion deferred (35-attr regression confirmed); tracks deferred status |
| overrides/hero.py | tools/recogniser-v2/overrides/hero.py | sgs/hero-specific extraction logic (50+ attributes); relocated from extract.py during P4 refactor | Spec 14 Phase 4 | TO-RETIRE (Phase 3 per Spec 15) | YES - registered in overrides/__init__.py | 908 LOC; deletion deferred until convention-path content-identity strategies mature |

### v1 recogniser (TO-RETIRE)

Pre-Spec 14 recogniser pipeline. Replaced by recogniser-v2 + /sgs-clone orchestrator. Scheduled for retirement in Spec 15 Phase 5 cleanup (move to `tools/recogniser-legacy/` or delete).

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| recogniser.py | tools/recogniser/recogniser.py | v1 main entry: orchestrates per-section Claude CLI matching pipeline; reads fingerprints.json; writes markdown summary + raw decisions JSON | Spec 14 P1 era | TO-RETIRE (Phase 5) | NO - replaced by sgs-clone-orchestrator.py | ~8000 LOC total v1 pipeline; 12% hero coverage |
| section_detector.py | tools/recogniser/section_detector.py | v1 Module 1: DOM walking to extract sections by semantic role + class signature | Spec 14 P1 era | TO-RETIRE (Phase 5) | NO | Mechanical DOM walking, no AI |
| style_extractor.py | tools/recogniser/style_extractor.py | v1 Module 4: maps computed CSS to SGS palette/spacing/typography tokens; flags misses for gap detector | Spec 14 P1 era | TO-RETIRE (Phase 5) | NO | Replaced by value-matcher + token_resolver |
| fingerprint_indexer.py | tools/recogniser/fingerprint_indexer.py | v1 Module 2: builds tools/recogniser/data/fingerprints.json from SGS DB + core WP blocks + WooCommerce blocks | Spec 14 P1 era | TO-RETIRE (Phase 5) | NO | fingerprints.json itself is a DATA-SOURCE (seed for Phase 1); this generator script retires |
| output_router.py | tools/recogniser/output_router.py | v1 Module 6: routes serialised block markup to header/footer template parts or wp post create | Spec 14 P1 era | TO-RETIRE (Phase 5) | NO | Replaced by register_patterns.py + staged output convention |
| serialiser.py | tools/recogniser/serialiser.py | v1 Module 5: emits valid WordPress block-comment markup from {block_name, attrs, inner_blocks[]}; round-trips through PHP parse_blocks() | Spec 14 P1 era | TO-RETIRE (Phase 5) | NO | Logic now handled inline in orchestrator / register_patterns |
| patch-featured-product.py | tools/recogniser/patch-featured-product.py | One-off: patches recogniser decisions JSON to replace featured-product placeholder with two sgs/product-card blocks for Mamas Munches | One-off 2026-05-01 | TO-RETIRE (Phase 5) | NO | Client-specific one-shot; of no reuse value |

### Token / value matching

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| match.py | plugins/sgs-blocks/scripts/value-matcher/match.py | Snaps arbitrary CSS values (colour, spacing, shadow, font-family) to nearest theme.json token using perceptual distance (DeltaE2000 for colour, plus/minus 5% for spacing) | Spec 15 Phase 1 / §5.4 | CURRENT | **YES** - imported by token-lint.py at line 91 (live Stage 0.5 path). ALSO imported by token_resolver.py but that loader is currently unwired | CORRECTED 2026-05-13 via Gemini QC: status was YES but doc previously stated the wrong import chain. The Stage 0.5 token-lint binding is the live one |
| inheritance.py | plugins/sgs-blocks/scripts/value-matcher/inheritance.py | Default-inheritance lookup: given (block_slug, slot, property_path, value), determines whether the value matches the theme.json global default or is a per-block override | Spec 15 FR35 / §10 | CURRENT | **NO** - imported only by supports_writer.py (itself unwired) + tests. NOT imported by preflight_chain.py as previously claimed | CORRECTED 2026-05-13 via Gemini QC: doc previously claimed import via preflight_chain.py - that was false. Wiring this module requires first wiring supports_writer.py |

### Lints (Stage 0.1 + 0.5)

Pre-pipeline lints that run before any extraction begins.

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| bem-lint.py | plugins/sgs-blocks/scripts/lints/bem-lint.py | Stage 0.1: checks every class token in a Bean-controlled HTML draft against the SGS-BEM naming convention (.sgs-<block>__<element>--<modifier>); three modes: strict / draft / legacy | Spec 15 Phase 4 / §7 | CURRENT | YES - called by preflight_chain.run_precommit_gate() | Hard-gate on strict mode; soft warning on draft mode; --legacy bypasses for pre-rule mockups |
| token-lint.py | plugins/sgs-blocks/scripts/lints/token-lint.py | Stage 0.5: additive token-discovery lint (not a failure gate); registers non-token CSS values as new tokens in client style variation JSON; produces a TokenWritePlan | Spec 15 Phase 4 / §7 FR38 | CURRENT | YES - called by preflight_chain.run_precommit_gate() | Architectural pivot 2026-05-12: now discovery mode, not violation mode |
| __init__.py | plugins/sgs-blocks/scripts/lints/__init__.py | Empty package marker | - | CURRENT | YES - package namespace | No logic |

### DB vocabulary + gap detection

Scripts that populate and maintain the vocabulary tables in sgs-framework.db (slot_synonyms, property_suffixes, modifier_suffixes, canonical_slot, role).

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| detect.py | plugins/sgs-blocks/scripts/gap-detection/detect.py | Spec 15 §6 Stage 10: identifies block_attributes rows with canonical_slot IS NULL, drains recognition_log extraction_failed events, stages both as gap candidates in sgs-framework.db.attribute_gap_candidates | Spec 15 Phase 1 / Stage 10 | CURRENT | NO - run by /sgs-update Stage 10 (not live clone path) | Idempotent; re-runs add zero rows when no new gaps |
| triage.py | plugins/sgs-blocks/scripts/gap-detection/triage.py | Phase 3 step 3.8: classifies attribute_gap_candidates rows into buckets (animation, layout, border, hover, form-field, empty-stem); applies proposed_action tags | Spec 15 Phase 3 step 3.8 | ONE-OFF | NO | Run once per phase; idempotent |
| apply-css-var-bridge.py | plugins/sgs-blocks/scripts/gap-detection/apply-css-var-bridge.py | Phase 3.5 follow-up: applies css-var-bridge role to ~30 mobile-nav attrs that route through CSS custom properties (--sgs-mn-*) in render.php | Spec 15 Phase 3.5 | ONE-OFF | NO | Idempotent; backup JSON created before update; reversible |
| apply-fanout-proposals.py | plugins/sgs-blocks/scripts/gap-detection/apply-fanout-proposals.py | Phase 3.5: applies canonical_slot + role from 5 fanout reports (phase-3.5-fanout-a1..a5.md) using tight-vocab collapse map (18 cross-cutting slots, not 52) | Spec 15 Phase 3.5 | ONE-OFF | NO | Idempotent; updates canonical_slot + role only, not derived_selector |
| apply-phase-3.5-vocab.py | plugins/sgs-blocks/scripts/gap-detection/apply-phase-3.5-vocab.py | Phase 3.5: inserts Tier 1 property_suffixes (BlockGap, ContentSize, etc.) + Tier 2 slot_synonyms (hover, transition, animation, etc.); re-runs assign-canonical + gap-detection after inserting | Spec 15 Phase 3.5 | ONE-OFF | NO | Idempotent via INSERT OR IGNORE |
| canonicalise-pass-2.py | plugins/sgs-blocks/scripts/gap-detection/canonicalise-pass-2.py | Phase 3.5+: second canonicalisation pass with whole-name-first lookup (fixes sgsAnimation alias winning) + expanded alias seeding | Spec 15 Phase 3.5+ | ONE-OFF | NO | Updates canonical_slot only; idempotent |
| canonicalise-slot-only.py | plugins/sgs-blocks/scripts/gap-detection/canonicalise-slot-only.py | One-shot: canonicalises rows where canonical_slot IS NULL using extended vocab; idempotent once all rows are filled | Spec 15 Phase 1/3 | ONE-OFF | NO | Preserves existing role + derived_selector |
| coverage-ab-mining.py | plugins/sgs-blocks/scripts/gap-detection/coverage-ab-mining.py | Ad-hoc coverage audit B1: queries live DB for Coverage A+B (slot coverage, property_suffixes, modifier_suffixes counts) | Phase 3.5 analysis | ONE-OFF | NO | Hard-coded DB path; one-session analysis script |
| coverage-de-mining.py | plugins/sgs-blocks/scripts/gap-detection/coverage-de-mining.py | Ad-hoc coverage audit B3: Coverage D+E analysis (theme.json token gap vs DB) | Phase 3.5 analysis | ONE-OFF | NO | Hard-coded DB path; one-session analysis script |

### Behavioural analyser

Scripts that extract and backfill role + selector data into sgs-framework.db.

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| assign-canonical.py | plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py | Backfills canonical_slot, role, and derived_selector for every block_attributes row using vocabulary tables (slot_synonyms, property_suffixes, modifier_suffixes) + v1 fingerprint overrides | Spec 15 Phase 1 / §3.3 | CURRENT | NO - run by /sgs-update Stage 4 | Called by apply-phase-3.5-vocab.py; also entry point for /sgs-update Stage 4 (incremental on NULL rows) |
| backfill-coarse-roles.py | plugins/sgs-blocks/scripts/behavioural-analyser/backfill-coarse-roles.py | Phase 3.5: refines coarse Phase 1 roles (color, typography, visual, behaviour, content) to role-templates.json taxonomy by porting finer-grained roles from legacy JSON catalogue | Spec 15 Phase 3.5 | ONE-OFF | NO | Idempotent; dry-run default |
| backfill-from-json-catalogue.py | plugins/sgs-blocks/scripts/behavioural-analyser/backfill-from-json-catalogue.py | Phase 3 step 3.1: one-shot backfill of role + derived_selector from legacy layer-3-internal-elements.json catalogue into sgs-framework.db block_attributes NULL rows | Spec 15 Phase 3 step 3.1 | ONE-OFF | NO | Idempotent; fills NULL rows only |
| extract-signatures.py | plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py | Reads every SGS block's render.php and/or save.js, extracts per-attribute output_signature JSON dicts, writes them into sgs-framework.db block_attributes.output_signature | Spec 15 (behavioural analysis) | CURRENT | NO - standalone analysis tool | Run manually to refresh output_signature column; optional beautifulsoup4 for JS fallback |

### Drift validator

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| validate.py | plugins/sgs-blocks/scripts/drift-validator/validate.py | Spec 15 §6 Stage 9: validates that every canonical value in block_attributes decomposes into known vocabulary; surfaces violations where data has drifted from canonical vocab | Spec 15 Phase 2 / Stage 9 | CURRENT | YES - called by preflight_chain.run_precommit_gate() | Read-only; idempotent; 4 violation types (slot not in slot_synonyms, role not in property_suffixes, bad selector prefix, unrecognised CamelCase modifier) |

### Pattern tools

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| pattern-register.py | plugins/sgs-blocks/scripts/pattern-register.py | Pattern registration orchestrator (Step 6 of old pipeline): fingerprint, SQL dedup, classify, operator confirm, write pattern.php + pattern.meta.json, INSERT into sgs-framework.db, call /sgs-update | 2026-05-06 | CURRENT | NO - superseded by register_patterns.py (the +REGISTER tail) | register_patterns.py is the live path; this is the older standalone version; see Open Questions |
| pattern-fingerprint.py | plugins/sgs-blocks/scripts/pattern-fingerprint.py | Computes a deterministic fingerprint for an HTML pattern + CSS bundle; exposes ATTR_TO_CSS dict as seed for Phase 1 role assignment | 2026-05-06 | CURRENT (partial-retire) | NO - called by pattern-register.py | ATTR_TO_CSS dict is the seed for vocabulary tables; annotate as deprecated once property_suffixes table ships |
| pattern-classify.py | plugins/sgs-blocks/scripts/pattern-classify.py | Classifies captured HTML patterns across 6 dimensions (category, industry, mood, style, content_shape, block_composition) | 2026-05-06 (Stage 4 of old pipeline) | CURRENT | NO - called by pattern-register.py | Called with --auto flag for non-interactive runs |

### uimax tools

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| uimax_write.py | plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py | Single chokepoint validate-then-write helper for all uimax table writes; calls uimax-write-validator.py first; raises ValidationError if payload violates row 211 (licensing) or row 213 (Rosetta Stone) | Spec 15 | CURRENT | **PARTIAL** - YES via /sgs-update path (used by sgs-update-uimax-sync.py); **NO via /sgs-clone path** - register_patterns.py uses sqlite3 directly, BYPASSING the validator | CORRECTED 2026-05-13 via QC: this is a Rosetta Stone discipline gap. register_patterns.py should be refactored to write uimax via this module so the validator fires on every clone-pipeline write |
| uimax-write-validator.py | plugins/sgs-blocks/scripts/uimax-tools/uimax-write-validator.py | Pre-write validator: rejects payloads with licensing-shaped keys (blub.db row 211) and payloads missing equivalent_implementations.sgs_block (blub.db row 213) | Spec 15 | CURRENT | **PARTIAL** - YES via /sgs-update path (transitive of uimax_write.py); **NO via /sgs-clone path** - same chain broken | CORRECTED 2026-05-13 via QC: CLI contract still valid; failure mode is silent bypass when register_patterns.py uses sqlite3 directly |
| sgs-update-uimax-sync.py | plugins/sgs-blocks/scripts/uimax-tools/sgs-update-uimax-sync.py | /sgs-update Stage 3+4: syncs sgs-framework.db blocks into uimax component_libraries; triggers update-db.py regenerate-csvs so CSVs are regenerated artefacts not source-of-record | /sgs-update Stage 3+4 | CURRENT | NO - run by /sgs-update (not /sgs-clone) | Preserves existing Rosetta Stone payloads; Stage 4 also scans is_gap_candidate animations rows + emits reports |
| seed-block-compositions.py | plugins/sgs-blocks/scripts/uimax-tools/seed-block-compositions.py | One-shot idempotent seed of sgs-framework.db block_compositions from theme pattern PHP files; preserves manual edits on re-run | 2026-05-10 | ONE-OFF | NO | Monotonically non-decreasing row count; orphaned rows NOT auto-deleted |

### Build + setup tools

Scripts at plugins/sgs-blocks/scripts/ that are part of the block build pipeline, not the clone pipeline.

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| generate-icons.js | plugins/sgs-blocks/scripts/generate-icons.js | Generates includes/lucide-icons.php from lucide-static SVG files; hooked into npm run build via prebuild script | Framework build | CURRENT | NO - build-time only | Run: node scripts/generate-icons.js; requires lucide-static in node_modules |
| copy-built-styles.js | plugins/sgs-blocks/scripts/copy-built-styles.js | Postbuild: copies style-index.css to style.css per block so WordPress finds the file (block.json declares "style": "file:./style.css" literally) | Framework build (2026-05-11 fix) | CURRENT | NO - postbuild step | Idempotent; copies LTR + RTL variants |
| build-font-collection.py | plugins/sgs-blocks/scripts/build-font-collection.py | Generates assets/font-collections/google-fonts.json from uimax google_fonts table (approximately 1,923 fonts); consumed by wp_register_font_collection() | 2026-05-12 | CURRENT | NO - run manually to refresh manifest | Byte-deterministic; --self-test flag; re-run when uimax google_fonts table refreshed |
| generate-block-reference.py | plugins/sgs-blocks/scripts/generate-block-reference.py | Auto-generates .claude/specs/02-SGS-BLOCKS-REFERENCE.md from sgs-framework.db | /sgs-update Stage 2 | CURRENT | NO - run by /sgs-update Stage 2 | Stage 2 of /sgs-update pipeline; --output flag for custom path |
| audit-block-uniformity.py | plugins/sgs-blocks/scripts/audit-block-uniformity.py | Scans all SGS block.json files for non-uniform patterns; exit 1 if issues found | Framework audit | CURRENT | NO - standalone audit | No phase annotation; pre-Spec 15 utility |

### Fingerprint builder

Scripts that produced (or audited the input to) the Spec 14 P3 output catalogue. The generators themselves (build-catalogue.py, step2_3_4_layer1_3_4.py, step6_layer3.py, qa-gate.py) are listed as TO-RETIRE in Spec 15 Phase 3 but do not exist on disk - see Open Questions. Only the two audit scripts remain.

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| audit-attr-vocabulary.py | plugins/sgs-blocks/scripts/fingerprint-builder/audit-attr-vocabulary.py | v1 audit: strips property + breakpoint suffixes to expose base word per slot; clusters base words across blocks to surface synonym candidates | Spec 15 Phase 1 / one-off | ONE-OFF (kept as reference) | NO | Writes reports/attr-vocabulary-audit-<date>.md |
| audit-attr-vocabulary-v2.py | plugins/sgs-blocks/scripts/fingerprint-builder/audit-attr-vocabulary-v2.py | v2 audit: multi-suffix decomposition (breakpoint, corner, side, state, variant, unit, property-type); exposes true slot identity after full decomposition | Spec 15 Phase 1 / one-off | ONE-OFF (kept as reference) | NO | More thorough than v1; sibling script, not replacement |

### QA / diff tools (scripts/)

Root-level scripts/ folder - visual QA, CSS audit, and WP operations tools.

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| colour-parity-audit.js | scripts/colour-parity-audit.js | Automated comparison between mockup HTML brief CSS custom properties and SGS variation JSON palette; diffs --variable -> palette slug with value mismatches | 2026-05-05 | CURRENT | NO - standalone QA tool | Extends measurement-vs-eye rule; node scripts/colour-parity-audit.js --mockup <html> --variation <json> |
| mockup-parity-validator.js | scripts/mockup-parity-validator.js | Compares computed styles of deployed SGS render vs source mockup at configured selectors + viewports; catches visual deltas missed by screenshots | 2026-05-04 | CURRENT | NO - standalone QA tool | Requires fingerprint map {mockup-selector: sgs-selector}; --viewports 375,1440 |
| screenshot-diff-helper.js | scripts/screenshot-diff-helper.js | Pixel-level QC gate: captures mockup + SGS render, aligns dimensions, runs pixelmatch, emits composite PNG + heatmap PNG + diff.json | QA pipeline | CURRENT | NO - standalone QA tool | Closes Gap H-5 (classifier human-eye gate); requires pixelmatch + playwright |
| css-pattern-audit.js | scripts/css-pattern-audit.js | Static analysis for risky CSS patterns in deployed/built CSS; catches defect classes that screenshots miss during sub-second time windows | L8 visual-qa layer | CURRENT | NO - standalone pre-deploy audit | Exit 0 = clean, 1 = violations; --dir or --file flag |
| font-source-audit.js | scripts/font-source-audit.js | Static analysis for external CDN font URLs in theme.json fontFace declarations; enforces self-hosted WOFF2 rule | Framework rule enforcement | CURRENT | NO - standalone pre-deploy audit | Scans theme.json + all styles/*.json variations |
| global-styles-reset.js | scripts/global-styles-reset.js | Encodes the 7-step wp_global_styles reset + reapply procedure required after any change to a variation JSON file | Post-deploy utility | CURRENT | NO - operator utility | Required after variation JSON changes; skipping causes "deployed but nothing changed" defects |
| render-mobile-override-audit.js | scripts/render-mobile-override-audit.js | Detects where render.php emits desktop inline CSS that @media mobile rules cannot override (defect F4: inline style beats @media without !important) | 2026-05-04 | CURRENT | NO - standalone pre-deploy audit | --block flag to target single block |
| brand-palette-sampler.py | scripts/brand-palette-sampler.py | Extracts dominant colours from brand source images via k-means clustering and compares against mockup CSS variable palette | 2026-05-05 | CURRENT | NO - standalone brand audit | Requires pillow, scikit-learn, numpy; optional colormath |
| sgs-block-grep.py | scripts/sgs-block-grep.py | Searches block names handling parenthetical qualifiers that break standard grep; combines literal + stripped form results ranked by confidence | 2026-05-08 | CURRENT | NO - developer utility | Fixes block-name-search-blindspot failure mode documented in .claude/mistakes.md |
| wp-update-block-attrs.js | scripts/wp-update-block-attrs.js | Playwright helper: updates a block's attributes on a live WP post via createBlock + replaceBlock (not updateBlockAttributes which silently drops changes on save) | 2026-05-04 | CURRENT | NO - operator/developer tool | Use when block HTML doesn't match current save.js; replaceBlock workaround documented inline |

### Newly surfaced (added 2026-05-13 from skills+commands audit)

These scripts are referenced in skill files (e.g. /sgs-clone SKILL.md) but were missed in the original audit. Added here to close the inventory.

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| ~~validate-naming.py~~ | RESOLVED 2026-05-13 - **GHOST REFERENCE, NOT A MISSING SCRIPT** | The Stage 0 BEM-compliance gate role this referenced is actually performed by `bem-lint.py` (which exists at `plugins/sgs-blocks/scripts/lints/bem-lint.py` and is wired via preflight_chain). The `validate-naming.py` name was the planned filename in /sgs-clone SKILL.md but implementation shipped as `bem-lint.py` and the SKILL.md was never updated. SKILL.md:243 fixed 2026-05-13 to point at `bem-lint.py`. | n/a | RESOLVED | n/a | Investigation: `/uimax-classify-naming` and `validate-naming.py` are NOT duplicates - the former classifies the convention (informational), the latter would have been a pass/fail compliance gate (role already filled by bem-lint.py). No real duplication. See [.claude/tooling-map.md - Open questions section](.claude/tooling-map.md#open-questions--verify) for full reasoning |
| visual_qa_config.json | tools/recogniser-v2/visual_qa_config.json | Config file holding visual QA thresholds + selector strategies; consumed by autonomy_gate.py + /sgs-update sync | Spec 15 Phase 5e + 6 Step 0 | CURRENT | YES - read by autonomy_gate.py at runtime | Config not script - included here so the inventory closes against the SKILL.md reference |

### Multi-frame QA (tools/)

| File | Path (relative to repo root) | What it does | Phase shipped | Status | Wired into /sgs-clone live? | Notes |
|---|---|---|---|---|---|---|
| capture.js | tools/multi-frame-qa/capture.js | Multi-frame visual QA capture: screenshots + DOM visibility snapshots at 5 timing frames (0ms, 200ms, 500ms, 1000ms, 3000ms); diffs two runs (SGS vs mockup) | Phase 6 Step 0 | CURRENT | NO - invoked by visual_qa_capture.py OR standalone | Supports --diff mode to diff two existing run dirs; --block flag with auto selector-strategy |

---

## Tests

Test files are co-located with the modules they test. All use the standard naming pattern `test_<module_name>.py`.

### orchestrator/ tests

All paths below are under `plugins/sgs-blocks/scripts/orchestrator/`.

| File | Tests |
|---|---|
| test_orchestrator_main.py | orchestrator_main.run() full chain with injectable stubs |
| test_preflight_chain.py | run_preflight() + run_precommit_gate() |
| test_staged_merge.py | merge(), rollback atomicity, FR21 no-mutation |
| test_staged_output.py | dir convention, stage-N file naming |
| test_autonomy_gate.py | autonomy_decision() PASS/FAIL/SURFACE logic |
| test_atomic_block_scaffold.py | scaffold emit + DB row insertion |
| test_attribute_staged_apply.py | stage() + approval gate + emit |
| test_functionality_bulk_apply.py | bulk atomicity + rollback simulation |
| test_media_sideload.py | dry-run + REST upload |
| test_supports_writer.py | omit vs emit decision |
| test_stage1_boundary_hook.py | convention classification + lingua_franca enrichment |
| test_modifier_extractors.py | button_role, dynamic_link, match_block_variation |
| test_wp_integration.py | validate_block_markup, route_native_feature, build_deploy_command |
| test_lingua_franca.py | BEM + Tailwind + 3 other convention conversions |
| test_mutex.py | acquire/release, stale lock, contention error |
| test_token_resolver.py | snap to token, gap candidate marking |
| test_variation_router.py | client variation write, root theme.json hard block |
| test_validate_stage_artifact.py | schema validation for stages 1-9 |
| test_critical_fix_verification.py | 5-check acceptance harness |
| test_register_patterns.py | PHP file write + sgs-db INSERT + uimax INSERT idempotency |

### recogniser/ tests

All paths below are under `plugins/sgs-blocks/scripts/recogniser/`.

| File | Tests |
|---|---|
| test_attribute_gap_writer.py | FR8 provenance stamp + run_id |
| test_bucket_c_classifier.py | role voting from property_suffixes |
| test_functionality_gap_detector.py | behaviour detection + uimax writes |
| test_gap_review_report.py | markdown output + severity sorting |
| test_leftover_bucket_router.py | 5-bucket routing logic |

### top-level tests/

All paths below are under `plugins/sgs-blocks/scripts/tests/`.

| File | Tests |
|---|---|
| tests/test_spec_15_phase_1.py | Phase 1 integration: assign-canonical + drift validator + schema checks |
| tests/__init__.py | Package marker |

---

## Deprecated / to-retire

Summary of everything the spec explicitly marks as TO-RETIRE:

| File | Retirement phase | Reason | Current status on disk |
|---|---|---|---|
| tools/recogniser/recogniser.py | Spec 15 Phase 5 | Replaced by sgs-clone-orchestrator.py + recogniser-v2 | EXISTS |
| tools/recogniser/section_detector.py | Spec 15 Phase 5 | Replaced by per-section-convention-voter.py | EXISTS |
| tools/recogniser/style_extractor.py | Spec 15 Phase 5 | Replaced by value-matcher + token_resolver | EXISTS |
| tools/recogniser/fingerprint_indexer.py | Spec 15 Phase 5 | Replaced by sgs-db scan + assign-canonical | EXISTS |
| tools/recogniser/output_router.py | Spec 15 Phase 5 | Replaced by register_patterns.py | EXISTS |
| tools/recogniser/serialiser.py | Spec 15 Phase 5 | Logic now inline in orchestrator | EXISTS |
| tools/recogniser/patch-featured-product.py | Spec 15 Phase 5 | Client-specific one-shot, no reuse value | EXISTS |
| tools/recogniser-v2/overrides/hero.py | Spec 15 Phase 3 | Override deleted after canonical-slot data populated (FR40); deferred due to 35-attr regression | EXISTS - DEFERRED |
| plugins/sgs-blocks/scripts/fingerprint-builder/build-catalogue.py | Spec 15 Phase 3 | Spec 14 P3 catalogue moves into sgs-db | MISSING from disk (no .py source) |
| plugins/sgs-blocks/scripts/fingerprint-builder/step2_3_4_layer1_3_4.py | Spec 15 Phase 3 | Same | MISSING from disk (only .pyc cache exists) |
| plugins/sgs-blocks/scripts/fingerprint-builder/step6_layer3.py | Spec 15 Phase 3 | Same | MISSING from disk (only .pyc cache exists) |
| plugins/sgs-blocks/scripts/fingerprint-builder/qa-gate.py | Spec 15 Phase 3 | Spec 14 P3 QA gate, obsolete after catalogue moves to sgs-db | MISSING from disk (no .py or .pyc) |
| plugins/sgs-blocks/scripts/pattern-fingerprint.py | Spec 15 Phase 1 (partial) | ATTR_TO_CSS dict superseded once property_suffixes table ships | EXISTS - partial retire pending |

---

## Open questions / verify

-1. **Round 3 finding (visual-qa audit + QC 2026-05-13):** The `/visual-qa` skill is a SIBLING pipeline, not part of the clone pipeline. It owns 8 internal JS scripts at `C:/Users/Bean/.agents/skills/visual-qa/scripts/` (operator-invoked deep audit, Full/Compare modes). The clone pipeline's Stage 8 uses the lightweight `visual_qa_capture.py` (Quick-mode equivalent). They share `visual_qa_config.json` but no code. **Live bug surfaced**: `run-audit.js:137` calls `responsive-audit.js` but the file on disk is `responsive-screenshots.js` - the audit coordinator would crash at L1. Tracked separately from Phase 6 work. Full audit at [.claude/scratch/visual-qa-audit.md](scratch/visual-qa-audit.md) (QC verified 100/100 at [.claude/scratch/visual-qa-audit-qc.md](scratch/visual-qa-audit-qc.md)). The 8 visual-qa skill scripts catalogued in [.claude/skills-commands-map.md](skills-commands-map.md).

0. **Resolved 2026-05-13 via QC** - the following 5 row-level claims were corrected: bucket-c-classifier (TESTS-ONLY -> YES), recursion-guard (YES -> NO), uimax_write + uimax-write-validator (YES -> PARTIAL split by pipeline path), inheritance (YES -> NO), match (correct status, wrong reason). See "Corrections applied 2026-05-13" near top of doc.

1. **fingerprint-builder/*.py ghost files:** Spec 15 asset inventory lists `build-catalogue.py`, `step2_3_4_layer1_3_4.py`, `step6_layer3.py`, and `qa-gate.py` as TO-RETIRE scripts, but only `.pyc` cache files exist for two of them (no `.py` source) and the other two have no presence at all. Either these were deleted without the spec being updated, or they were generated and never committed. The `.pyc` files imply the scripts DID exist and were run at some point. Safe to treat as already retired; the spec notes can be updated to RETIRED.

2. **pattern-register.py vs register_patterns.py relationship:** `pattern-register.py` is the older standalone pattern registration tool (Step 6 of the original pipeline). `register_patterns.py` is the newer +REGISTER tail wired into the live orchestrator. Both exist. `pattern-register.py` is NOT explicitly listed as TO-RETIRE in Spec 15. Verify whether `pattern-register.py` is still needed as a standalone operator tool, or whether it should be retired now that the +REGISTER tail handles all production pattern registration.

3. **Phase 5 wiring gap (critical):** 14 Phase 5 modules in `orchestrator/` are built and tested but NOT yet wired into the production orchestrator call chain (`sgs-clone-orchestrator.py`). The E2E decision note in Spec 15 (line 691) documents this explicitly - three architectural gaps cause 6-of-9 sections to become "vapour" on the rendered page. The modules exist and tests pass; the missing work is connecting them in the production path. Any session working on the clone pipeline should treat Phase 5d/5e wiring as the top priority. Affected modules: variation_router, token_resolver, attribute-staged-apply, functionality-bulk-apply, media-sideload, supports_writer, stage1_boundary_hook, modifier_extractors, wp_integration, lingua_franca, bucket-c-classifier, attribute-gap-writer, functionality-gap-detector, gap-review-report, critical-fix-verification.

4. **`__init__.py` files:** Three of these were inventoried (recogniser/, lints/, overrides/, tests/). The overrides/__init__.py contains functional content (the override registry dict). The others are empty package markers. All are CURRENT and required for Python package imports.

5. **One-off scripts in gap-detection/ and behavioural-analyser/:** Many scripts here are tagged ONE-OFF because they were written to run once per phase migration (e.g. canonicalise-pass-2.py, apply-fanout-proposals.py, backfill-coarse-roles.py). They are idempotent so re-running is safe, but they have no role in the live clone pipeline. Consider moving them to `.claude/scratch/migrations/` once their phase is fully closed, to reduce script-folder noise.

6. **brand-palette-sampler.py dependencies:** Requires `pillow`, `scikit-learn`, `numpy`, and optionally `colormath`. Not declared in any requirements.txt that I checked. If invoked from a fresh environment it will fail. Worth adding a setup note or requirements file.
