---
doc_type: visual-reference
project: small-giants-wp
purpose: Annotated one-page visual flow of the SGS Cloning Pipeline. Every stage shows scripts that run, files read/written, DB tables touched, skills dispatched, and wiring status. Use this as the cold-start map.
session_date: 2026-05-13
last_annotated: 2026-05-13 (post 4-reviewer QC: Sonnet/Haiku/Gemini Flash/Gemini Pro - Material corrections applied; line numbers refreshed)
line_number_policy: Line numbers cited in this doc are accurate as of 2026-05-13 against `sgs-clone-orchestrator.py` HEAD (1277 lines). If they drift after edits, grep for the function or constant name instead.
qc_consensus: 4 reviewers agree on all wiring-status claims. Material errors patched 2026-05-13.
last_verified: 2026-05-14
update_triggers:
  - Pipeline stage change (new stage, retired stage, renumbered)
  - Script wired or unwired (status flip in any stage block)
  - DB schema change affecting any pipeline stage
  - Skill dispatch change at any stage
  - Inline-function extraction (e.g. stage_0_7_css_lift retired - remove its stage block)
registry_entry: docs-registry.md row 11
companion_docs:
  - .claude/tooling-map.md - per-script inventory with status
  - .claude/skills-commands-map.md - per-skill/command inventory + /visual-qa addendum
  - .claude/db-tables-map.md - per-table R/W matrix
  - .claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md - authoritative spec
  - .claude/docs-registry.md - governance and update-trigger matrix
---

# SGS Cloning Pipeline - Annotated Flow

The big picture in one page, with EVERY script, file, DB table and skill plotted on the chart. Use this to spot gaps, weaknesses and optimisation opportunities at a glance.

## Legend

| Symbol | Meaning |
|--------|---------|
| ✓ | Wired into the live `/sgs-clone` path |
| ✗ | Built + tested but NOT wired into `/sgs-clone` |
| ⚠ | Wired but with caveat (e.g. bypasses validator, partial coverage) |
| ◯ | Fallback only (fires on unmatched section / error path) |
| [B] | Known bug |
| (R) | Reads file or DB table |
| (W) | Writes file or DB table |
| (X) | Dispatches skill or external tool |

## Live entry-point chain (verified 2026-05-13)

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

## Per-stage annotated flow

### Stage 0 — Pre-flight

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/preflight_chain.py       run_preflight() + run_precommit_gate │
│  ✓ orchestrator/mutex.py                  Cross-platform file lock (1hr stale) │
│  ✓ orchestrator/staged_output.py          Creates pipeline-state/<run_id>/   │
│                                                                             │
│ FILES (R):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/.mutex.lock                              │
│  plugins/sgs-blocks/scripts/orchestrator/schemas/stage-N.json (per stage)   │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/stage-0-preflight.json                   │
│                                                                             │
│ DB tables:    none                                                          │
│ Skills:       none                                                          │
│ STATUS:       LIVE - working                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 0.1 — BEM compliance lint

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/lints/bem-lint.py                             │
│       called directly by sgs-clone-orchestrator.py:1125 via the             │
│       `stage_0_1_bem_lint()` wrapper function (CORRECTED 2026-05-13 via QC) │
│       NOT via preflight_chain.run_precommit_gate as previously claimed -    │
│       run_precommit_gate exists in preflight_chain.py:155 but is only one   │
│       of two call paths; the live /sgs-clone path uses the direct wrapper.  │
│                                                                             │
│ FILES (R):                                                                  │
│  sites/<client>/mockups/<page>/index.html (the draft)                       │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/stage-0.1-bem-lint.json                  │
│                                                                             │
│ DB tables:    none                                                          │
│ Skills:       none                                                          │
│ Modes:        strict (halt) / draft (warn) / legacy (bypass)                │
│                                                                             │
│ NOTE: This is the role that /sgs-clone SKILL.md previously called           │
│       `validate-naming.py` (a planned filename that never shipped).         │
│       SKILL.md updated 2026-05-13 to point at bem-lint.py.                  │
│                                                                             │
│ STATUS:       LIVE - working                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 0.5 — Token-usage lint (additive token discovery)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/lints/token-lint.py                           │
│       called by preflight_chain.run_precommit_gate()                        │
│  ✓ plugins/sgs-blocks/scripts/value-matcher/match.py                        │
│       imported by token-lint.py at line 91 (this is the LIVE binding       │
│       for match.py - NOT via token_resolver as previously claimed)          │
│                                                                             │
│ FILES (R):                                                                  │
│  sites/<client>/mockups/<page>/index.html                                   │
│  theme/sgs-theme/theme.json (base tokens)                                   │
│  theme/sgs-theme/styles/<client>.json (variation overlay)                   │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/stage-0.5-token-lint.json                │
│  (in --apply mode) theme/sgs-theme/styles/<client>.json (new tokens)        │
│                                                                             │
│ DB tables:    none (reads theme.json directly, NOT design_tokens DB row)    │
│ Skills:       none                                                          │
│ Modes:        discover (default) / strict / legacy                          │
│                                                                             │
│ STATUS:       LIVE - working                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 0.7 — CSS lift (writes client variation CSS)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ⚠ INLINE in sgs-clone-orchestrator.py (no dedicated module)                │
│       function: stage_0_7_css_lift() around line 253                        │
│                                                                             │
│ FILES (R):                                                                  │
│  sites/<client>/mockups/<page>/index.html (extracts <style> blocks)         │
│                                                                             │
│ FILES (W):                                                                  │
│  theme/sgs-theme/styles/<client>.css (monolithic CSS dump)                  │
│                                                                             │
│ DB tables:    none                                                          │
│ Skills:       none                                                          │
│                                                                             │
│ WEAKNESS: Stage 0.7 isn't in Spec 15 §7 stage list (was added during        │
│           Phase 5h.1 commit 3dce6084 without spec entry). Dumps ALL CSS     │
│           into one variation file instead of splitting universal /          │
│           per-instance / bespoke per the captured                            │
│           feedback_cloning_preserves_intentional_bespoke_detail rule.       │
│           Tracked as architecture debt; not a Phase 6 blocker.              │
│                                                                             │
│ STATUS:       LIVE - working but wrong-architecture                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 1 — Section boundary detection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py    │
│       subprocess-called from sgs-clone-orchestrator.py at line 536          │
│  ✗ plugins/sgs-blocks/scripts/orchestrator/stage1_boundary_hook.py          │
│       TESTS-ONLY - should fire end-of-stage to enrich boundaries with       │
│       SGS-BEM primaries + equivalent_implementations                        │
│  ✗ plugins/sgs-blocks/scripts/orchestrator/lingua_franca.py                 │
│       TESTS-ONLY (transitive via stage1_boundary_hook)                      │
│                                                                             │
│ FILES (R):                                                                  │
│  sites/<client>/mockups/<page>/index.html                                   │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/voter.json                               │
│  pipeline-state/sgs-clone/<run_id>/stage-1.json                             │
│                                                                             │
│ DB tables (R):  slot_synonyms (sgs-framework.db)                            │
│ DB tables (W):  none at this stage                                          │
│                                                                             │
│ Skills (X):                                                                 │
│  ✗ /uimax-classify-naming - SHOULD be dispatched here per SKILL.md          │
│       but only fires if stage1_boundary_hook is wired (currently isn't)     │
│                                                                             │
│ GAP: Without stage1_boundary_hook + lingua_franca wired, sections from      │
│      non-SGS-BEM mockups don't get convention-converted before matching.    │
│                                                                             │
│ STATUS:       LIVE (voter works) but enrichment chain unwired                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 2 — Block-type match

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py               │
│       imported directly (not subprocess) by sgs-clone-orchestrator.py:514  │
│       function score_candidates() ranks each section's candidate blocks     │
│                                                                             │
│ FILES (R):                                                                  │
│  plugins/sgs-blocks/src/blocks/<slug>/block.json (filesystem scan for       │
│       registered block existence verification)                              │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/stage-2.json                             │
│                                                                             │
│ DB tables (R):  blocks (sgs-framework.db, indirectly via filesystem scan)   │
│ DB tables (W):  none                                                        │
│                                                                             │
│ Skills (X):     none                                                        │
│                                                                             │
│ GAP: Matches at BLOCK level only - no PATTERN-level matcher consulting      │
│      patterns table or block_compositions before falling through. For       │
│      Mama's: 6 of 9 sections return core/group (no match) and fall to      │
│      Stage 9b autonomy fallback.                                            │
│                                                                             │
│ STATUS:       LIVE - working but missing pattern-level lookup                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 3 — Slot list (per matched block)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ INLINE stage_3_slot_list() function in sgs-clone-orchestrator.py         │
│       (CORRECTED 2026-05-13 via Sonnet QC: previously claimed extract.py    │
│       subprocess at line 715 - that's actually Stage 4's extract call.      │
│       Stage 3 reads block.json directly in Python, no subprocess.)          │
│       This is one of the inline functions that should be extracted to its   │
│       own module per Bean's "deterministic not inline" architectural rule.  │
│                                                                             │
│ FILES (R):                                                                  │
│  plugins/sgs-blocks/src/blocks/<slug>/block.json (attribute definitions)    │
│                                                                             │
│ DB tables (R):  block_attributes (canonical_slot, role, derived_selector)   │
│                  - populated by /sgs-update Stage 4 (assign-canonical.py)   │
│                                                                             │
│ FILES (W):  pipeline-state/sgs-clone/<run_id>/stage-3-slot_list.json        │
│                                                                             │
│ STATUS:       LIVE - working but inline (extract-to-module candidate)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 4 — Slot extraction (the work happens here)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ tools/recogniser-v2/extract.py - dispatcher                              │
│  ✓ tools/recogniser-v2/extract_strategies.py - 11 role-based strategies     │
│  ✓ tools/recogniser-v2/utils.py - shared helpers                            │
│  ✓ tools/recogniser-v2/overrides/__init__.py - override registry            │
│  ✓ tools/recogniser-v2/overrides/hero.py - hero-specific (Phase 3 delete)   │
│  ✓ tools/recogniser-v2/data/role-templates.json - role recipes (READ)       │
│       Legacy v1 seed file. Per Spec 15 FR2 + §6 Stage 4, this content       │
│       should migrate to property_suffixes DB table - migration deferred     │
│       at Phase 1 + now parked as P-S15-ROLE-TEMPLATES-MIGRATE in            │
│       parking.md. /sgs-update does NOT keep this file in sync with the DB - │
│       silent drift risk. Future drift-check hook                            │
│       `role-templates-vs-property-suffixes-check.py` listed in              │
│       docs-registry section 7.                                              │
│  ✓ orchestrator/modifier_extractors.py - button_role/dynamic_link/variation │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4d) - lazy-loaded via               │
│       modifier_extractors() helper. In the per-section loop after the      │
│       supports_writer dispatch: button_role fires when target_block name   │
│       contains 'button'; dynamic_link parses every section_attr value      │
│       starting with ':' (only successful parses retained); match_block_    │
│       variation fires when block.json declares `variations`. Outputs land  │
│       on per_section_results.modifier_signals (keys: button_role,          │
│       dynamic_links, block_variation). Each dispatch soft-fails            │
│       independently.                                                       │
│                                                                             │
│ FILES (R):                                                                  │
│  sites/<client>/mockups/<page>/index.html                                   │
│  sites/<client>/research/<client>-media-map.json (mockup → WP attachment)   │
│  tools/recogniser-v2/data/role-templates.json                               │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/extract-<boundary_id>.json (per section) │
│  pipeline-state/sgs-clone/<run_id>/stage-4-extract.json                     │
│                                                                             │
│ DB tables (R):  block_attributes (canonical_slot, role, output_signature)   │
│                                                                             │
│ External tools: Playwright (computed-style extraction at 3 viewports)       │
│                                                                             │
│ STATUS:       LIVE for hero (42% coverage); partial for atomic blocks;      │
│               modifier_extractors LIVE post-Step-4d (button-role +          │
│               dynamic-link + block-variation classifiers)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 4.5 — Token snapping (per value) [LIVE]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/token_resolver.py - resolve() + resolve_batch()             │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4a) - lazy-loaded via              │
│       sgs-clone-orchestrator.py:token_resolver() helper, called per         │
│       matched section in stage_4_5_6_7_8_extract loop. Snaps raw values    │
│       to token_slug when confidence >= 0.6; gap candidates surface in       │
│       per_section_results.token_resolutions. 8 pytest tests still green.    │
│  ✓ orchestrator/variation_router.py - add_token() writes new tokens to      │
│       client variation JSON; hard-blocked from root theme.json mutation     │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4b) - lazy-loaded via              │
│       variation_router() helper. Inside the existing token_resolver soft-  │
│       fail block in stage_4_5_6_7_8_extract: every is_gap_candidate=true   │
│       resolution with a recognised role + non-empty string raw_value is    │
│       routed through add_token(client, role, slug, raw_value, write=True). │
│       Slug derived via token-lint._generate_slug (single canonical helper).│
│       (role, slug) tuples appended to per_section_results.new_tokens_       │
│       written. Soft-fail emits aggregate_warnings; never blocks extract.    │
│  ✓ plugins/sgs-blocks/scripts/value-matcher/match.py - the snap engine      │
│       (wired here via token_resolver + ALSO at Stage 0.5 via token-lint)   │
│  ✓ plugins/sgs-blocks/scripts/lints/token-lint.py - canonical slug gen     │
│       loaded lazily for _generate_slug() only (Phase 6 v2 Step 4b).         │
│                                                                             │
│ FILES (R):                                                                  │
│  theme/sgs-theme/theme.json                                                 │
│  theme/sgs-theme/styles/<client>.json (overlay merged into theme_json)     │
│                                                                             │
│ FILES (W):                                                                  │
│  theme/sgs-theme/styles/<client>.json (new token candidates, idempotent)    │
│                                                                             │
│ STATUS:       LIVE - Phase 6 v2 Step 4a+4b complete                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 5 — Default-inheritance check [LIVE]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/value-matcher/inheritance.py - lookup func   │
│       WIRED transitively 2026-05-14 (Phase 6 v2 Step 4c) via                │
│       supports_writer.py's optional import. inheritance.py loads if the     │
│       file exists; supports_writer falls back to its self-contained         │
│       default lookup otherwise.                                             │
│  ✓ orchestrator/supports_writer.py - filter_writes() omit-vs-emit           │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4c) - lazy-loaded via               │
│       sgs-clone-orchestrator.py:supports_writer() helper. Inside the        │
│       per-section loop after the variation_router dispatch: loads the       │
│       target block's block.json by slug, calls filter_writes(block_slug,   │
│       section_attrs, block_json, theme_json) and lands three fields on     │
│       per_section_results -- supports_decisions (debug trail),             │
│       supports_emitted_attributes (writes downstream must include),         │
│       supports_omitted_attributes (let WP cascade handle). Step 4i           │
│       staged-apply + Step 4j wp_integration consume these signals to        │
│       strip cascade-matching overrides at deploy time. Soft-fail on          │
│       missing block.json -- absence == emit everything.                     │
│                                                                             │
│ FILES (R):                                                                  │
│  theme/sgs-theme/theme.json (styles.elements.X + styles.blocks.X defaults)  │
│  plugins/sgs-blocks/src/blocks/<slug>/block.json (supports declarations)    │
│                                                                             │
│ DB tables (R):  block_supports                                              │
│                                                                             │
│ STATUS:       LIVE - Phase 6 v2 Step 4c complete                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 6 — Block.json emission

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ INLINE in sgs-clone-orchestrator.py / extract.py serialize_block()       │
│                                                                             │
│ FILES (R):                                                                  │
│  plugins/sgs-blocks/src/blocks/<slug>/block.json (schema validation)        │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/extract-<boundary_id>.json (markup field)│
│                                                                             │
│ DB tables:    none                                                          │
│ Skills:       none                                                          │
│                                                                             │
│ STATUS:       LIVE - working for matched sections                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 7 — Render to WP markup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ INLINE serialise inside extract.py.serialize_block()                     │
│  ◯ INLINE compose_atomic_pattern() at sgs-clone-orchestrator.py:339         │
│       FALLBACK ONLY - fires when matched block is core/group or             │
│       confidence == 0 (which it does for 6 of 9 Mama's sections). Emits a   │
│       flat wp:sgs/container with bare atomic blocks, NO BEM child wrappers. │
│  ✗ orchestrator/wp_integration.py - validate_block_markup, route_native    │
│       _feature, build_deploy_command - TESTS-ONLY                           │
│  ✗ orchestrator/attribute-staged-apply.py + functionality-bulk-apply.py +   │
│       media-sideload.py - TESTS-ONLY (production write path missing)        │
│                                                                             │
│ FILES (R):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/extract-*.json (per-section results)     │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/full-page-markup.html                    │
│  pipeline-state/sgs-clone/<run_id>/stage-7-compose.json                     │
│                                                                             │
│ GAP: The composer fallback emits text-only blocks for unmatched sections.   │
│      Real fix is to wire the autonomy chain (Stage 9b) so unmatched         │
│      sections trigger new-block scaffolding instead of flat composition.    │
│                                                                             │
│ STATUS:       LIVE for matched; FALLBACK for 6/9 Mama's sections            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 7b — Staged merge (FR21 keystone)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/staged_merge.py - walks every stage-N artefact,             │
│       validates schema, invokes per-stage apply callable, rolls back on    │
│       failure                                                               │
│  ✓ orchestrator/validate-stage-artifact.py - schema validator               │
│       imported by staged_merge.py:38                                        │
│                                                                             │
│ FILES (R):  pipeline-state/sgs-clone/<run_id>/stage-*.json                  │
│             plugins/sgs-blocks/scripts/orchestrator/schemas/stage-N.json    │
│                                                                             │
│ FR21 contract: NO mutation outside pipeline-state until autonomy_gate       │
│                approves promotion                                           │
│                                                                             │
│ STATUS:       LIVE - working                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 8 — Deploy + Visual Parity QA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/autonomy_gate.py - decision logic (PASS / FAIL / SURFACE)   │
│  ✓ orchestrator/visual_qa_capture.py - Playwright + PIL pixel-diff factory  │
│       imported by sgs-clone-orchestrator.py:1189                            │
│  ✓ tools/multi-frame-qa/capture.js - multi-frame capture (0/200/500/1000/   │
│       3000ms) - invoked via Playwright runtime                              │
│  ✓ scripts/screenshot-diff-helper.js - pixel-level diff via pixelmatch      │
│  ✓ scripts/mockup-parity-validator.js - computed-style diff                 │
│  ✓ scripts/global-styles-reset.js - 7-step variation reset post-deploy      │
│  ✓ scripts/wp-update-block-attrs.js - createBlock+replaceBlock helper       │
│                                                                             │
│ FILES (R):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/full-page-markup.html                    │
│  sites/<client>/mockups/<page>/index.html (reference for diff)              │
│  tools/recogniser-v2/visual_qa_config.json (thresholds)                     │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/screenshots/ (per-viewport PNGs)         │
│  pipeline-state/sgs-clone/<run_id>/stage-8-visual_qa.json                   │
│                                                                             │
│ External tools (X):                                                         │
│  Playwright (browser automation)                                            │
│  WP REST API at sandybrown staging (page creation)                          │
│  SSH/SCP to Hostinger (deploy via tar method per ../CLAUDE.md)              │
│                                                                             │
│ Skills (X):                                                                 │
│  - /visual-qa skill is SIBLING (not invoked here). Operator runs it        │
│    separately for the full 9-layer audit. Stage 8 uses visual_qa_capture   │
│    only (Quick-mode equivalent in Python).                                  │
│                                                                             │
│ Hard gate: pixel-diff ≤ 1% at 375/768/1440 viewports                        │
│                                                                             │
│ STATUS:       LIVE - working; pass gate currently failing for Mama's        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 9 — Coverage + Gap reporting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ recogniser/leftover-bucket-router.py - 5-bucket router                   │
│       subprocess-called from sgs-clone-orchestrator.py:989                  │
│  ✓ recogniser/simple_html_review_report.py - operator-review HTML           │
│       subprocess-called at line 1024                                        │
│  ✗ recogniser/attribute-gap-writer.py - INSERT to attribute_gap_candidates  │
│       TESTS-ONLY                                                            │
│  ✗ recogniser/functionality-gap-detector.py - behaviour-expectation gaps    │
│       TESTS-ONLY                                                            │
│  ✗ recogniser/gap-review-report.py - markdown gap-review.md                 │
│       TESTS-ONLY                                                            │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/stage-9-coverage.json                    │
│  pipeline-state/sgs-clone/<run_id>/operator-review.html                     │
│  pipeline-state/sgs-clone/<run_id>/gap-review.md (when gap-review-report    │
│       gets wired)                                                           │
│                                                                             │
│ DB tables (W):                                                              │
│  attribute_gap_candidates (sgs-framework.db) - when attribute-gap-writer    │
│       wired                                                                 │
│  recognition_log (uimax)                                                    │
│  functionality_gap_candidates (uimax) - when functionality-gap-detector     │
│       wired                                                                 │
│                                                                             │
│ STATUS:       LIVE for routing + report; GAP WRITES UNWIRED                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 9b — Autonomy chain (the recovery path)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ recogniser/bucket-c-classifier.py - role inference from property_suffixes│
│       declared at sgs-clone-orchestrator.py:53 (CLASSIFIER_SCRIPT)          │
│       invoked at line 846 via importlib (stage_9b_autonomy_chain)           │
│  ✓ orchestrator/atomic-block-scaffold.py - 4-file Gutenberg scaffold        │
│       imported by sgs-clone-orchestrator.py:855 (autonomy chain, NOT the    │
│       composer fallback as previously misdocumented)                        │
│                                                                             │
│ FILES (W) staging (FR21 - mutates NOTHING outside pipeline-state):          │
│  pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/block.json               │
│  pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/render.php               │
│  pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/edit.js                  │
│  pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/save.js                  │
│                                                                             │
│ DB tables (staged):  block_attributes rows queued for INSERT on --promote   │
│                                                                             │
│ GAP: The autonomy chain has 2 of N rails laid (classifier + scaffold).     │
│      Missing rails: attribute-gap-writer + functionality-gap-detector +    │
│      gap-review-report (Stage 9) for surfacing the proposals to operator.   │
│                                                                             │
│ STATUS:       PARTIALLY LIVE - classifier + scaffold fire, gap-writers don't│
└─────────────────────────────────────────────────────────────────────────────┘
```

### +REGISTER tail — Pattern registration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/register_patterns.py - register_run()                       │
│       imported by sgs-clone-orchestrator.py:1192; called at line 1262       │
│       on successful autonomy_gate decision                                  │
│  ⚠ uimax-tools/uimax_write.py - SHOULD be called but is BYPASSED            │
│       register_patterns.py uses sqlite3 directly, breaking Rosetta Stone    │
│       validator chain                                                       │
│  ⚠ uimax-tools/uimax-write-validator.py - bypassed transitively             │
│                                                                             │
│ FILES (W):                                                                  │
│  theme/sgs-theme/patterns/<slug>.php (PHP pattern file with markup)         │
│                                                                             │
│ DB tables (W):                                                              │
│  patterns (sgs-framework.db) - INSERT new auto-registered pattern row       │
│  block_compositions (sgs-framework.db) - INSERT inner-block list row        │
│  patterns (uimax) - INSERT with Rosetta Stone equivalent_implementations    │
│                                                                             │
│ Skills (X):                                                                 │
│  /uimax-sgs-scrape-pattern - pattern Rosetta Stone payload generation       │
│  /uimax-scrape-animation - per-animation Rosetta Stone payload              │
│                                                                             │
│ FIX NEEDED: route register_patterns.py writes through uimax_write.py so the │
│             validator fires. Currently the licensing + Rosetta Stone checks │
│             are silently skipped on every clone-pipeline write.             │
│                                                                             │
│ STATUS:       LIVE - working but bypasses validator (Phase 6 step 9)        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Final acceptance harness [GAP]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✗ orchestrator/critical-fix-verification.py - 5-check FR21 boundary harness│
│       TESTS-ONLY - should fire after +REGISTER to confirm no canonical     │
│       mutation outside FR21-designated paths                                │
│                                                                             │
│ Checks: no_root_theme_mutation, no_canonical_block_mutation,                │
│         no_licensing_in_uimax, plus 2 more                                  │
│                                                                             │
│ STATUS:       UNWIRED - Phase 6 step 8                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Sister pipeline — /sgs-update (11 stages)

Refreshes the data layer; runs OUT-OF-BAND from /sgs-clone.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ENTRY:    /sgs-update command at ~/.claude/commands/sgs-update.md           │
│ DRIVER:   ~/.claude/skills/sgs-wp-engine/scripts/update-db.py               │
│           ~/.claude/skills/sgs-wp-engine/scripts/populate-db.py             │
│           ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py (query helper)   │
│                                                                             │
│ Stage 1  Inventory      - walks plugins/sgs-blocks/src/blocks/ + theme/     │
│                           Writes to 17 DB tables                            │
│ Stage 2  Block.json     - parses every block.json; populates                │
│                           block_attributes, block_selectors, block_supports │
│           Script: plugins/sgs-blocks/scripts/generate-block-reference.py    │
│ Stage 3  Signatures     - parses render.php + save.js for output_signature  │
│           Script: behavioural-analyser/extract-signatures.py                │
│ Stage 4  Canonical      - assigns canonical_slot + role + derived_selector  │
│           Script: behavioural-analyser/assign-canonical.py                  │
│ Stage 5  Compositions   - parses theme/sgs-theme/patterns/*.php             │
│           Scripts: pattern-register.py, pattern-fingerprint.py,             │
│                    pattern-classify.py, uimax-tools/seed-block-compositions │
│ Stage 6  Token sync     - syncs theme.json categories to design_tokens table│
│ Stage 7  Animation sync - scans sgsAnimation enum values → uimax.animations │
│ Stage 8  uimax mirror   - syncs blocks → uimax.component_libraries          │
│           Script: uimax-tools/sgs-update-uimax-sync.py                      │
│           USES: uimax-tools/uimax_write.py + uimax-write-validator.py       │
│ Stage 9  Drift validator - every attr decomposes into known vocab           │
│           Script: drift-validator/validate.py                               │
│ Stage 10 Gap detection  - writes attribute_gap_candidates                   │
│           Script: gap-detection/detect.py                                   │
│ Stage 11 Doc regen      - regenerates .claude/specs/02-SGS-BLOCKS-REFERENCE │
│           Script: generate-block-reference.py                               │
│                                                                             │
│ MUTEX: /sgs-update + /sgs-clone share the build mutex (preflight_chain      │
│        ensures one runs at a time)                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Direct file accesses inventory (across the whole pipeline)

| File | Purpose | Stages that touch it |
|------|---------|----------------------|
| `theme/sgs-theme/theme.json` | Base design tokens + global default styles | 0.5 (R), 4.5 (R), 5 (R) |
| `theme/sgs-theme/styles/<client>.json` | Per-client token overrides + per-client style variation | 0.5 (R+W), 4.5 (R+W) |
| `theme/sgs-theme/styles/<client>.css` | Stage 0.7 monolithic CSS dump (architectural debt) | 0.7 (W) |
| `theme/sgs-theme/patterns/<slug>.php` | Registered pattern markup | +REGISTER (W), /sgs-update Stage 5 (R) |
| `theme/sgs-theme/templates/*.html` | Page templates (block-based) | (consumed by WP at render time, not by pipeline) |
| `plugins/sgs-blocks/src/blocks/<slug>/block.json` | Block schema | 2 (R), 3 (R), 5 (R), 6 (R), /sgs-update Stage 2 (R) |
| `plugins/sgs-blocks/src/blocks/<slug>/render.php` | Dynamic block renderer | /sgs-update Stage 3 (R via extract-signatures.py) |
| `sites/<client>/mockups/<page>/index.html` | Input mockup | 0.1 (R), 0.5 (R), 0.7 (R), 1 (R), 4 (R), 8 (R for diff) |
| `sites/<client>/research/<client>-media-map.json` | mockup filename → WP attachment ID | 4 (R) |
| `pipeline-state/sgs-clone/<run_id>/stage-*.json` | Per-stage artefacts | 0-9 (W), 7b staged-merge (R) |
| `pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/` | Staged new-block files | 9b (W), --promote (R+W to canonical) |
| `pipeline-state/sgs-clone/<run_id>/screenshots/` | Per-viewport PNGs | 8 (W) |
| `pipeline-state/sgs-clone/<run_id>/.mutex.lock` | Build mutex | 0 (W) |
| `tools/recogniser-v2/visual_qa_config.json` | Pixel-diff thresholds + viewport sizes | 8 (R), shared with /visual-qa skill |
| `tools/recogniser-v2/data/role-templates.json` | Role-keyed extraction recipes (legacy seed) | 4 (R) |
| `plugins/sgs-blocks/scripts/orchestrator/schemas/stage-N.json` | Per-stage artefact JSON schemas | 7b staged-merge (R via validate-stage-artifact) |
| `C:/Users/Bean/.openclaw/.env` | WP credentials for media-sideload + REST writes | 8 (R), media-sideload (R) |
| `C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db` | Authoritative SGS DB (29 tables) | many (R+W per stage matrix above) |
| `C:/Users/Bean/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` | uimax DB (48 tables) | 9 (W via gap-writers), +REGISTER (W) |

## DB table heat-map

### Heavily-touched (5+ touches per pipeline run when fully wired)

| Table | DB | Reads | Writes |
|-------|-----|-------|--------|
| `block_attributes` | sgs-framework | Stages 3, 4 | /sgs-update Stage 2+4 |
| `theme.json` (file) | n/a (file) | Stages 0.5, 4.5, 5 | 0.5 apply mode |
| `block.json` (file) | n/a (file) | Stages 2, 3, 5, 6 | (read-only in clone path) |

### Lightly-touched

| Table | DB | Used at |
|-------|-----|---------|
| `slot_synonyms` | sgs-framework | Stage 1 (R) |
| `block_supports` | sgs-framework | Stage 5 (R, when supports_writer wired) |
| `blocks` | sgs-framework | Stage 2 (R via filesystem) |
| `patterns` | sgs-framework | +REGISTER (W) |
| `block_compositions` | sgs-framework | +REGISTER (W) |
| `attribute_gap_candidates` | sgs-framework | Stage 9 (W, when wired) |
| `recognition_log` | uimax | Stage 9 (W) |
| `functionality_gap_candidates` | uimax | Stage 9 (W, when wired) |
| `component_libraries` | uimax | /sgs-update Stage 8 (R+W) |
| `patterns` | uimax | +REGISTER (W) |
| `animations` | uimax | /sgs-update Stage 7 (W), Stage 4 gap report (R) |

### DEAD tables (zero rows, no active writers — retirement candidates)

| Table | DB | Notes |
|-------|-----|-------|
| `sections_detected` | sgs-framework | Empty; no live writers |
| `extraction_cache` | sgs-framework | Empty; no live writers |
| `block_opportunities` | sgs-framework | Empty; no live writers |
| `weaknesses` | sgs-framework | Empty; no live writers |
| `animations` | sgs-framework | Empty; superseded by uimax.animations |

## Skill dispatch chain (when fully wired)

```
/sgs-clone
  ├─ Stage 1: /uimax-classify-naming ✗ (needs stage1_boundary_hook wired)
  ├─ Stage 7: /sgs-wp-engine (block-level questions, on-demand)
  ├─ Stage 8: (no skill dispatch - uses inline visual_qa_capture.py)
  ├─ +REGISTER: /uimax-sgs-scrape-pattern (pattern Rosetta Stone payload)
  ├─ +REGISTER: /uimax-scrape-animation (animation Rosetta Stone payload)
  └─ Anywhere ambiguity: /ui-ux-pro-max (judgement calls only)

/visual-qa (SIBLING - operator-invoked separately, NOT in /sgs-clone path)
  └─ scripts at C:/Users/Bean/.agents/skills/visual-qa/scripts/:
        responsive-screenshots.js, capture-states.js, global-css-diff.js,
        element-extractor.js, token-validator.js, a11y-audit.js,
        perf-check.js, run-audit.js (coordinator)
     [B] run-audit.js:137 had broken responsive-audit.js reference - FIXED 2026-05-13
```

## Status summary

| Aspect | Count | Notes |
|--------|-------|-------|
| Scripts catalogued | 107 | Across plugins/sgs-blocks/scripts/, scripts/, tools/ |
| Wired into /sgs-clone live path | 19 | Direct or transitive imports verified |
| Fallback-only | 1 | atomic-block-scaffold (also wired via autonomy chain) |
| Tests-only (built, NOT wired) | 14 | The Phase 6 wiring target |
| With known caveat (PARTIAL) | 2 | uimax_write, uimax-write-validator (bypassed in /sgs-clone path) |
| Standalone / build / retired | 73 | Out of scope for /sgs-clone wiring |
| Skill/command files referenced | 17 | Catalogued in skills-commands-map.md |
| /visual-qa internal scripts | 8 | Skill-bundle scripts at ~/.agents/skills/visual-qa/scripts/ |
| Pipeline stages defined | 10 + 4 tails | 0, 0.1, 0.5, 0.7, 1, 2, 3, 4, 5, 6, 7, 7b, 8, 9, 9b + DEPLOY/PARITY/REGISTER/UPDATE |
| Pipeline stages LIVE | 15 | Stages 0, 0.1, 0.5, 0.7, 1, 2, 3, 4, 6, 7, 7b, 8, 9, 9b, +REGISTER (CORRECTED 2026-05-13 - prior "13" undercounted 0.1, 0.5, 0.7, 9b) |
| Pipeline stages UNWIRED | 2 critical | Stage 4.5 token snap; Stage 5 default inheritance |
| Pipeline stages PARTIAL | 2 | Stage 9b autonomy chain (2 of N rails); +REGISTER (validator bypass) |

## Gaps + optimisation opportunities surfaced by this annotation

### Critical (block parity gate)

1. **Stage 4.5 token snap unwired** - colour/spacing/font values stay raw, never become slug references, variation CSS doesn't take effect. Phase 6 step 1+2. (~45 min)
2. **Stage 5 default inheritance unwired** - bloated per-block attribute writes that conflict with cascade defaults. Phase 6 step 3. (~30 min)
3. **Stage 1 convention enrichment unwired** - stage1_boundary_hook + lingua_franca + /uimax-classify-naming all blocked because the hook isn't called. Phase 6 step 5. (~30 min)
4. **Stage 9 gap-writers unwired** - operator can't see what's failing. Phase 6 step 6. (~30 min)

### Architectural debt (not Phase 6 blockers)

5. **Stage 0.7 CSS lift wrong-architecture** - dumps all CSS to one variation file instead of splitting universal / per-instance / bespoke. Captured rule violated. Tracked separately.
6. **+REGISTER bypasses uimax_write validator** - Rosetta Stone discipline silently skipped on every clone. Phase 6 step 9 fixes this (~20 min).
7. **Stage 2 has no pattern-level matcher** - sections fall through to block-level match then to composer fallback because patterns table never consulted at boundary. Future enhancement (post Phase 6).
8. **Stage 0.7 isn't in Spec 15 §7 stage list** - implementation drift from spec. Doc fix.

### Optimisation opportunities

9. **theme.json read 3+ times** (Stage 0.5, 4.5, 5) - could cache in run context.
10. **5 dead DB tables** in sgs-framework.db (sections_detected, extraction_cache, block_opportunities, weaknesses, animations) - retire or remove from schema.
11. **Per-section subprocess overhead** at Stage 4 (one Python startup per matched section) - could batch via single extract.py invocation taking a list of sections.

## Pattern-key tracking

This visual flow captures every entry from:
- `.claude/tooling-map.md` (107 scripts)
- `.claude/skills-commands-map.md` (17 commands+skills + 8 visual-qa internal)
- `.claude/db-tables-map.md` (29 sgs-framework tables + 48 uimax tables)
- `.claude/reports/2026-05-13-tooling-map-qc-gemini-flash.md` (Round 1 QC)
- `.claude/scratch/qc-tooling-map-haiku-round2.md` (Round 2 QC by Haiku)
- `.claude/scratch/qc-tooling-map-gemini-flash-round2.md` (Round 2 QC by Gemini)
- `.claude/scratch/visual-qa-audit.md` + `.claude/scratch/visual-qa-audit-qc.md`

Synced 2026-05-13. Next sync trigger: after Phase 6 wiring lands (status column updates) OR after the next /sgs-update Stage 11 doc regen.

## See also

- Full spec: [.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md](specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md)
- Master execution plan: [.claude/plans/spec-15-master-execution-plan.md](plans/spec-15-master-execution-plan.md)
- Phase 6 plan: [.claude/plans/phase-6-pattern-fidelity.md](plans/phase-6-pattern-fidelity.md)
- State: [.claude/state.md](state.md)
- Decisions log: [.claude/decisions.md](decisions.md)
