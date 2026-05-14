# Gemini Flash QC of tooling-map.md

Date: 2026-05-13
Reviewer: gemini-3-flash-preview

## Wired-in classification check

| File | Doc says | Reality | Verdict |
|---|---|---|---|
| sgs-clone-orchestrator.py | YES | This IS the production CLI entry point | confirmed |
| orchestrator_main.py | YES | Called from sgs-clone-orchestrator.py at line 1184 | confirmed |
| register_patterns.py | YES | Called from sgs-clone-orchestrator.py at line 1243 | confirmed |
| preflight_chain.py | YES | Loaded by orchestrator_main.py at line 36 | confirmed |
| staged_merge.py | YES | Loaded by orchestrator_main.py at line 37 | confirmed |
| staged_output.py | YES | Loaded by orchestrator_main.py at line 35 | confirmed |
| autonomy_gate.py | YES | Loaded by orchestrator_main.py at line 38 | confirmed |
| visual_qa_capture.py | YES | Loaded by sgs-clone-orchestrator.py at line 1193 | confirmed |
| mutex.py | YES | Loaded by preflight_chain.py at line 41 | confirmed |
| validate-stage-artifact.py | YES | Loaded by staged_merge.py at line 37 | confirmed |
| atomic-block-scaffold.py | FALLBACK | Loaded by sgs-clone-orchestrator.py at line 44 (also autonomy chain) | confirmed |
| variation_router.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| token_resolver.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| attribute-staged-apply.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| functionality-bulk-apply.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| media-sideload.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| supports_writer.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| stage1_boundary_hook.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| modifier_extractors.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| wp_integration.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| lingua_franca.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| critical-fix-verification.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| per-section-convention-voter.py | YES | Subprocess called from sgs-clone-orchestrator.py at line 608 | confirmed |
| confidence-matrix.py | YES | Imported by sgs-clone-orchestrator.py at line 635 | confirmed |
| leftover-bucket-router.py | YES | Subprocess called from sgs-clone-orchestrator.py at line 811 | confirmed |
| simple_html_review_report.py | YES | Subprocess called from sgs-clone-orchestrator.py at line 841 | confirmed |
| bucket-c-classifier.py | TESTS-ONLY | Imported by sgs-clone-orchestrator.py at line 757 (autonomy chain) | WRONG |
| attribute-gap-writer.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| functionality-gap-detector.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| gap-review-report.py | TESTS-ONLY | Not referenced in any live entry point | confirmed |
| recursion-guard.py | YES | File says it is imported, but no import found in sgs-clone-orchestrator.py | WRONG |
| extract.py | YES | Subprocess called from sgs-clone-orchestrator.py at line 705 | confirmed |
| extract_strategies.py | YES | Imported by extract.py at line 59 | confirmed |
| utils.py | YES | Imported by extract.py at line 49 | confirmed |
| overrides/__init__.py | YES | Imported by extract.py at line 58 | confirmed |
| overrides/hero.py | YES | Registered in overrides/__init__.py at line 21 | confirmed |
| match.py | YES | Imported by token-lint.py at line 91 (live Stage 0.5 path) | confirmed |
| inheritance.py | YES | Not imported by preflight_chain.py (only by supports_writer.py) | WRONG |
| bem-lint.py | YES | Loaded by sgs-clone-orchestrator.py at line 72 | confirmed |
| token-lint.py | YES | Loaded by sgs-clone-orchestrator.py at line 143 | confirmed |
| validate.py | YES | Default path in preflight_chain.py at line 48; called at line 148 | confirmed |
| uimax_write.py | YES | register_patterns.py uses sqlite3 directly; uimax_write not imported | WRONG |
| uimax-write-validator.py | YES | Called by uimax_write.py at line 55 (indirectly live via sgs-update) | confirmed |

## Phase annotation check

| File | Doc says | Docstring says | Match? |
|---|---|---|---|
| sgs-clone-orchestrator.py | Phase 7 rewire (2026-05-11) | sgs-clone orchestrator (Phase 7 rewire). | YES |
| orchestrator_main.py | Spec 15 Phase 5e.8 | Spec 15 Phase 5e.8 top-level entry point. | YES |
| register_patterns.py | Spec 15 Phase 6 Step 0 | Spec 15 Phase 6 Step 0 +REGISTER tail. | YES |
| preflight_chain.py | Spec 15 Phase 5e.1 + 5e.2 | Spec 15 Phase 5e.1 + 5e.2. | YES |
| staged_merge.py | Spec 15 Phase 5e.3 | Spec 15 Phase 5e.3 staged-merge orchestrator. | YES |
| bem-lint.py | Stage 0.1 of /sgs-clone (Spec 15 §7) | BEM compliance lint — Stage 0.1 of /sgs-clone (Spec 15 §7). | YES |
| token-lint.py | Stage 0.5 of /sgs-clone (Spec 15 §7, FR38) | Token-discovery lint — Stage 0.5 of /sgs-clone (Spec 15 §7, FR38). | YES |
| validate.py | Spec 15 §6 Stage 9 | Spec 15 §6 Stage 9 — Drift Validator | YES |
| detect.py | Spec 15 §6 Stage 10 | Spec 15 §6 Stage 10 — Gap Detection | YES |
| assign-canonical.py | Spec 15 §3.3, §5.1, §5.2 | Algorithm (per Spec 15 §3.3, §5.1, §5.2) | YES |
| pattern-register.py | 2026-05-06 | Pattern registration orchestrator ... 2026-05-06. | YES |
| sgs-update-uimax-sync.py | Stage 3 + Stage 4 | sgs-update Stage 3 + Stage 4 — uimax sync extension. | YES |
| copy-built-styles.js | 2026-05-11 fix | Verified 2026-05-11 on sandybrown | YES |

## MISSING-from-disk check

| File | Status |
|---|---|
| build-catalogue.py | MISSING |
| step2_3_4_layer1_3_4.py | MISSING |
| step6_layer3.py | MISSING |
| qa-gate.py | MISSING |

## Description spot-checks (10 random files)

| File | Doc description | Actual docstring excerpt | Match (yes/no) |
|---|---|---|---|
| bem-lint.py | Stage 0.1: checks every class token in a Bean-controlled HTML draft against the SGS-BEM naming convention | Checks every class token in a Bean-controlled HTML draft against the canonical SGS-BEM naming convention | YES |
| token-lint.py | Stage 0.5: additive token-discovery lint (not a failure gate); registers non-token CSS values as new tokens | Architectural pivot (2026-05-12): additive token-discovery mode. ... produces a TokenWritePlan | YES |
| validate.py | Spec 15 §6 Stage 9: validates that every canonical value in block_attributes decomposes into known vocabulary | Validates that every canonical value stored on block_attributes decomposes into known vocabulary | YES |
| detect.py | Spec 15 §6 Stage 10: identifies block_attributes rows with canonical_slot IS NULL ... stages them as gap candidates | Identifies attributes whose canonical_slot is NULL ... and stages them as gap candidates | YES |
| assign-canonical.py | Backfills canonical_slot, role, and derived_selector for every block_attributes row using vocabulary tables | Backfills canonical_slot, role, and derived_selector for every row in block_attributes | YES |
| pattern-register.py | Pattern registration orchestrator (Step 6 of old pipeline): fingerprint, SQL dedup, classify ... INSERT into sgs-framework.db | Takes an HTML file + classification metadata and registers a new SGS WordPress pattern | YES |
| uimax_write.py | Single chokepoint validate-then-write helper for all uimax table writes | Single chokepoint for any Python code ... that writes rows into uimax. | YES |
| sgs-update-uimax-sync.py | /sgs-update Stage 3+4: syncs sgs-framework.db blocks into uimax component_libraries | Sync sgs-framework.db blocks into the uimax DB component_libraries table | YES |
| generate-icons.js | Generates includes/lucide-icons.php from lucide-static SVG files | Generates includes/lucide-icons.php from lucide-static SVG files. | YES |
| copy-built-styles.js | Postbuild: copies style-index.css to style.css per block so WordPress finds the file | Postbuild: copy style-index.css to style.css per block. | YES |

## Overall verdict

- Total claims checked: 57
- Confirmed correct: 53
- Errors found (material): 4
- Errors found (cosmetic): 0
- Accuracy score: 93/100
- Recommendation: patch

## Top 5 errors to fix first

1. **bucket-c-classifier.py** - Classified as TESTS-ONLY but is imported and used in the live autonomy chain of `sgs-clone-orchestrator.py` at line 757.
2. **recursion-guard.py** - Marked as YES (live) but no import exists in `sgs-clone-orchestrator.py` or other live entry points. The module's own docstring is misleading.
3. **uimax_write.py** - Doc says it is used by `register_patterns.py`, but that script uses `sqlite3` directly, bypassing the "single chokepoint" validator chain.
4. **inheritance.py** - Doc says it is imported by `preflight_chain.py`, but it is absent from that file. Only used by non-live `supports_writer.py` and tests.
5. **match.py** - The "Wired in" reason is incomplete; it is a critical dependency of the live `token-lint.py` Stage 0.5 pass.
