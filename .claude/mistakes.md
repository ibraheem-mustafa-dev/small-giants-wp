# small-giants-wp — Mistakes & Recurring Lessons
**Last updated:** 2026-05-24 (Phase 6a — keyword-stub migration)

<!-- ACTIVE — recent 30 mistakes as keyword stubs. Full body in blub.db `learnings` table or feedback_*.md files. Archive: memory/mistakes-archive.md. Search: grep -r KEYWORD memory/ + curl localhost:5050/api/learning?search=KEYWORD -->

## Active stubs (most recent 30)

### [2026-05-24] wp eval blocked by project hook; use wp-load + HTTP curl instead
- **Pattern key:** `wp-eval-blocked-use-wp-load-curl-pattern`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_verify_wp_api_surface_before_dismissing_static_analyser.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_wp_api_surface_before_dismissing_static_analyser.md)

### [2026-05-22] register_block_variation() does not exist as PHP in WP 7.0; polyfill via get_block_type_variations filter is load-bearing
- **Pattern key:** `register-block-variation-not-a-php-function-use-filter`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_verify_wp_api_surface_before_dismissing_static_analyser.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_wp_api_surface_before_dismissing_static_analyser.md)

### [2026-05-22] Verify renderer paint targets against actual DOM emission, not assumed wrapper classes
- **Pattern key:** `verify-paint-target-against-live-dom-before-shipping`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md)

### [2026-05-24] Surface-level fix via HTML-tag side-channel violates Spec 00 BEM-as-canonical
- **Pattern key:** `evidence-based-deduction-not-probabilistic`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_evidence_based_deduction_not_probabilistic.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_evidence_based_deduction_not_probabilistic.md)

### [2026-05-24] Single-column DB fix leaves seed-script stale; future /sgs-update re-seeds the bug
- **Pattern key:** `comprehensive-db-audit-before-data-layer-changes`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_comprehensive_db_audit_before_data_layer_changes.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_comprehensive_db_audit_before_data_layer_changes.md)

### [2026-05-24] Spec-vs-impl drift: declared pipeline stages may not actually run
- **Pattern key:** `shipped-claims-need-grep-verify`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_shipped_claims_need_grep_verify.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_shipped_claims_need_grep_verify.md)

### [2026-05-24] Hardcoded dicts in scripts drift silently from DB-canonical data
- **Pattern key:** `db-first-no-hardcoded-dicts`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_db_first_no_hardcoded_dicts.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_db_first_no_hardcoded_dicts.md)

### [2026-05-24] Architectural changes touch 10-15 docs, not 3 — comprehensive doc walk required
- **Pattern key:** `active-prune-over-age-cutoff-archive`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_active_prune_over_age_cutoff_archive.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_active_prune_over_age_cutoff_archive.md)

### [2026-05-24] Walker pre-pass commit without Stage 11 pixel-diff measurement caused post-hoc regressions
- **Pattern key:** `pixel-diff-required-before-converter-commit`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_per_section_cropped_pixel_diff.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_per_section_cropped_pixel_diff.md)

### [2026-05-24] match.json confidence gate cannot be met by Stage 4 walker pre-pass alone
- **Pattern key:** `pipeline-gate-must-match-stage-that-produces-it`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_read_leftover_buckets_before_conjecturing.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_read_leftover_buckets_before_conjecturing.md)

### [2026-05-23] Subagent fabricated non-existent DB table claim — schema enumerate before trusting
- **Pattern key:** `schema-enumeration-before-gap-claims`
- **blub.db row:** `272`
- **Feedback file:** [feedback_schema_enumeration_before_gap_claims.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_schema_enumeration_before_gap_claims.md)

### [2026-05-23] Page 131 deleted; orchestrator silently reported OK via phantom-page path
- **Pattern key:** `verify-canary-page-exists-before-pipeline`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_shipped_claims_need_grep_verify.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_shipped_claims_need_grep_verify.md)

### [2026-05-23] Hand-authored patterns are structural debt — 0.95 confidence from a PHP file is not converter quality
- **Pattern key:** `pattern-production-readiness-gate`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_pattern_production_readiness_gate.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_pattern_production_readiness_gate.md)

### [2026-05-22] Verify WP API surface before dismissing static-analyser "Undefined function" warnings (blub.db row 283)
- **Pattern key:** `verify-wp-api-surface-before-dismissing-static-analyser`
- **blub.db row:** `283`
- **Feedback file:** [feedback_verify_wp_api_surface_before_dismissing_static_analyser.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_wp_api_surface_before_dismissing_static_analyser.md)

### [2026-05-22] wp-content-guard hook over-matches on stdout — guard should match argv only
- **Pattern key:** `wp-content-guard-scope-argv-not-output`
- **blub.db row:** `283`
- **Feedback file:** [feedback_wp7_live_verification_corrects_audit_assumptions.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_wp7_live_verification_corrects_audit_assumptions.md)

### [2026-05-22] Audit findings must be verified live on WP 7.0 before reporting as fact
- **Pattern key:** `wp7-live-verification-corrects-audit-assumptions`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_wp7_live_verification_corrects_audit_assumptions.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_wp7_live_verification_corrects_audit_assumptions.md)

### [2026-05-21] QC binding rule violated 3+ times in one session — structural hook enforcement is the only fix (row 281)
- **Pattern key:** `qc-gate-must-be-structural-not-prompt`
- **blub.db row:** `281`
- **Feedback file:** [feedback_multi_model_qc_before_commit.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_multi_model_qc_before_commit.md)

### [2026-05-21] Council predictions need empirical validation before being treated as fix specs (row 276)
- **Pattern key:** `council-predictions-need-empirical-validation`
- **blub.db row:** `276`
- **Feedback file:** [feedback_council_predictions_need_empirical_validation.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_council_predictions_need_empirical_validation.md)

### [2026-05-21] Skills only called by other skills should be non-user-invocable (row 277)
- **Pattern key:** `skills-only-called-by-others-non-user-invocable`
- **blub.db row:** `277`
- **Feedback file:** [feedback_skills_only_called_by_others_non_user_invocable.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_skills_only_called_by_others_non_user_invocable.md)

### [2026-05-21] Stale-doc-text caused regression of a deliberately-stripped licensing check
- **Pattern key:** `strip-feature-update-docs-same-commit`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_no_licensing_talk_in_cloning_context.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_no_licensing_talk_in_cloning_context.md)

### [2026-05-21] Don't port per-block legacy logic; fix the universal extraction path instead
- **Pattern key:** `universal-extraction-no-per-block-legacy`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_universal_extraction_no_per_block_legacy.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_universal_extraction_no_per_block_legacy.md)

### [2026-05-21] Every Gemini agent report contained fabricated line citations — grep-verify before relaying
- **Pattern key:** `verify-gemini-claims-by-grep`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_multi_model_qc_before_commit.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_multi_model_qc_before_commit.md)

### [2026-05-20] Five lessons: token-snap exact-match; @media scope; cv2 CSS-scope lookup; promotion is end-of-line; multi-rater council
- **Pattern key:** `token-snap-requires-strict-exact-match`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_cloning_preserves_intentional_bespoke_detail.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_cloning_preserves_intentional_bespoke_detail.md)

### [2026-05-20] CSS injection strategy assumed DOM injection; should have used body_class filter instead
- **Pattern key:** `body-class-strategy-over-dom-injection`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md)

### [2026-05-19] Schema enumeration before any "missing column/table" claim (blub.db row 272)
- **Pattern key:** `schema-enumeration-before-gap-claims`
- **blub.db row:** `272`
- **Feedback file:** [feedback_schema_enumeration_before_gap_claims.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_schema_enumeration_before_gap_claims.md)

### [2026-05-19] QC panel byte-equality check was tautological while the writer was inert
- **Pattern key:** `qc-panel-must-assert-file-existence`
- **blub.db row:** `273`
- **Feedback file:** [feedback_qc_panel_must_assert_file_existence.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_qc_panel_must_assert_file_existence.md)

### [2026-05-19] Header + footer are template parts, not Gutenberg blocks (3rd recurrence)
- **Pattern key:** `header-footer-are-template-parts-not-blocks`
- **blub.db row:** `274`
- **Feedback file:** [feedback_header_footer_are_template_parts_not_blocks.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_header_footer_are_template_parts_not_blocks.md)

### [2026-05-19] tar --exclude must be path-anchored not basename (blub.db row 275)
- **Pattern key:** `tar-exclude-must-be-specific-path-not-basename`
- **blub.db row:** `275`
- **Feedback file:** [feedback_tar_exclude_must_be_specific_path_not_basename.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_tar_exclude_must_be_specific_path_not_basename.md)

### [2026-05-18] Retired legacy feature before replacement was built; correct sequence is replace → migrate → retire
- **Pattern key:** `build-replacement-before-retiring-legacy`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_build_replacement_before_retiring_legacy.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_build_replacement_before_retiring_legacy.md)

### [2026-05-18] BEM regex [a-z0-9-]* silently matches --modifier shapes; use segmented kebab pattern
- **Pattern key:** `bem-regex-double-hyphen-false-positive`
- **blub.db row:** `<pending sync>`
- **Feedback file:** [feedback_bean_drafts_use_sgs_prefixed_bem_naming.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_bean_drafts_use_sgs_prefixed_bem_naming.md)

---

## Recurring patterns (older — stable reference)

| Lesson | One-line summary | Detail |
|--------|-----------------|--------|
| `always-screenshot-verify` | Take a frontend screenshot and inspect before claiming any fix complete | [feedback_always_screenshot_verify.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_always_screenshot_verify.md) |
| `verify-rendered-output-not-internal-metrics` | Internal metrics never prove visual outcomes — live-DOM assertion required | [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md) (blub.db row 194) |
| `block-validation-recovery` | Attribute changes not rendering → check for block validation errors in editor | [feedback_block_validation_recovery.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_block_validation_recovery.md) |
| `parallel-dispatch-shared-files` | Never run parallel agents on the same file — sequentialise or scope by file | [feedback_parallel_dispatch_shared_files.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_parallel_dispatch_shared_files.md) |
| `read-leftover-buckets-before-conjecturing` | Read pipeline-state/<run>/leftover-buckets.json FIRST when diagnosing converter gaps | [feedback_read_leftover_buckets_before_conjecturing.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_read_leftover_buckets_before_conjecturing.md) (blub.db row 254) |
| `multi-model-qc-before-commit` | Multi-model /qc panel (Sonnet+Haiku+Gemini+Cerebras) BEFORE every converter commit | [feedback_multi_model_qc_before_commit.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_multi_model_qc_before_commit.md) (blub.db row 255) |
| `per-section-cropped-pixel-diff` | Pixel-diff via --selector .sgs-{section} at 3 viewports, not full-page | [feedback_per_section_cropped_pixel_diff.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_per_section_cropped_pixel_diff.md) (blub.db row 256) |

## Reference catalogues

- **Common WordPress styling errors** — 21+ failure patterns each with cause + fix: [`specs/common-wp-styling-errors.md`](specs/common-wp-styling-errors.md)
- **Full archive** — entries older than 2026-05-18: [`memory/mistakes-archive.md`](memory/mistakes-archive.md)

## How to add a lesson

Use `/capture-lesson`. It appends the keyword-stub format here automatically and writes full body to feedback_*.md + blub.db.
