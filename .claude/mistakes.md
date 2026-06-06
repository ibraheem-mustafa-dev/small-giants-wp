# small-giants-wp — Mistakes & Recurring Lessons
**Last updated:** 2026-06-02 (container/wrapper standardisation session — composite-mirror rule; 13 oldest stubs archived to memory/mistakes-archive.md)

<!-- ACTIVE — recent 30 mistakes as keyword stubs. Full body in blub.db `learnings` table or feedback_*.md files. Archive: memory/mistakes-archive.md. Search: grep -r KEYWORD memory/ + curl localhost:5050/api/learning?search=KEYWORD -->

## Active stubs (most recent 30)

### [2026-06-06] Bound-mode converter emit is a test cheat, not native conversion
- **Pattern key:** `bound-mode-is-test-cheating-not-conversion`
- **Feedback file:** [feedback_bound_mode_is_test_cheating_not_conversion.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_bound_mode_is_test_cheating_not_conversion.md)
- **Findings:** [reports/2026-06-06-doc-council-findings.md](.claude/reports/2026-06-06-doc-council-findings.md)
- **Rule:** Setting `sourceMode='bound'` in the converter so a block echoes `$content` is DOM-mirroring, not conversion. The block renders the draft DOM structure verbatim; it does not extract values into native attributes. Only the live WC configurator modes (`wc-product`/`sgs-cpt`) are legitimate bound modes. Cloning always targets Typed mode with populated attributes.

### [2026-06-06] Converter must emit native blocks, never replicate draft class/DOM structure
- **Pattern key:** `convert-not-mirror`
- **Findings:** [reports/2026-06-06-doc-council-findings.md](.claude/reports/2026-06-06-doc-council-findings.md)
- **Rule:** The converter's job is to EXTRACT values from the draft DOM and populate native block attributes. Emitting a block that echoes the draft's raw class tree / `$content` wholesale is mirroring — it perpetuates the draft's structure instead of converting it. Every emitted block must carry populated native attrs. If the native block cannot accept the extracted values yet, fix the block first (WS-4 / mirror) rather than short-circuiting via a bound-echo.

### [2026-06-06] Clone verification on a real homepage render, not just emitted markup inspection
- **Pattern key:** `verify-clone-on-real-homepage-not-emit`
- **Feedback file:** [memory/llm-eyeball-clone-verification-unreliable.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/llm-eyeball-clone-verification-unreliable.md)
- **Findings:** [reports/2026-06-06-doc-council-findings.md](.claude/reports/2026-06-06-doc-council-findings.md)
- **Rule:** Inspecting emitted `wp:` markup to declare "clone works" is not sufficient — an echoed `$content` can look structurally correct in markup but render incorrectly (or identically to a mirror) on the live homepage. Verification MUST be against the live-rendered homepage (Playwright + per-section pixel-diff + Bean R-22-13 sign-off).

### [2026-06-06] Diagnosis without delivery needs a conformance gate, not just a plan
- **Pattern key:** `diagnosis-without-delivery-needs-conformance-gate`
- **Feedback file:** [feedback_diagnosis_without_delivery_needs_conformance_gate.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_diagnosis_without_delivery_needs_conformance_gate.md)
- **Findings:** [reports/2026-06-06-doc-council-findings.md](.claude/reports/2026-06-06-doc-council-findings.md)
- **Rule:** Recurring defects (typography, grid, trust-bar, hero) were correctly diagnosed multiple sessions in a row — then the fixes were never wired, committed, or gated. A diagnosis is only closed when a conformance gate (a static assert, a CI test, or a pipeline-stage-gate hook) prevents the code path from being dead again. "Planned to build" is not "built"; "discussed in decisions.md" is not "enforced."

### [2026-06-04] Composite-conversion truth = the DOCS, not the legacy converter code; full KIND-scoped mirror, no trim
- **Pattern key:** `composite-conversion-truth-is-docs-not-legacy-code`
- **blub.db row:** `312`
- **Feedback file:** [feedback_composite_conversion_truth_is_docs.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_composite_conversion_truth_is_docs.md)
- **Rule:** Docs (Spec 22 §FR-22-21 + the KIND-scoped full mirror) are truth, NOT the unbuilt converter's current code — never cite a `convert.py` grep as evidence about the unified procedure. Never trim a composite's mirror below its KIND scope (section=full/layout=grid+width/content=width+spacing) — that's the R-22-9 divergence the mirror kills (trust-bar is a section that legitimately uses grid attrs). ONE universal procedure converts literal-containers AND composites identically; WS-4 first, converter-lift after.

### [2026-06-04] WP Interactivity `data-wp-on--<event>` silently won't bind a COLON event name
- **Pattern key:** `wp-interactivity-data-wp-on-rejects-colon-event-names`
- **Evidence (D164):** the product-card listened for `sgs:option-selected` via `data-wp-on--sgs:option-selected` — built in Phase C, never visually verified (swap was dormant). When U3 gave it data, the live test showed pills changing the radio but NEVER the price: WP's directive-suffix parser rejects the colon, no listener attaches, no console error. Decisive test: `el.dispatchEvent(new CustomEvent('sgs:option-selected',{bubbles:true,detail}))` directly on the card → no effect.
- **Rule:** never use a colon in an event name bound via `data-wp-on--`; bridge via `data-wp-init` + a captured-context `addEventListener`, or hyphenate. A present `data-wp-on--` attribute is NOT proof the listener bound — LIVE-TEST every custom-event→store-action wiring. Memory `wp-interactivity-data-wp-on-rejects-colon-event-names`.

### [2026-05-31] Pixel-diff mis-scores BOTH ways — verify live DOM, never the number alone
- **Pattern key:** `empty-section-false-pixel-diff-win`
- **Evidence (D117):** featured-product migration showed −30.9pp "WIN" on cropped pixel-diff while the live DOM had `textLen=0` (empty). Inverse also true: a reflowed-to-correct section (cards side-by-side) scores a false LOSS vs the stacked baseline crop.
- **Rule:** Verify the LIVE DOM (Playwright `el.innerText.length` + element layout) as the gate; pixel-diff is supplementary. Memory `empty-section-false-pixel-diff-win`; root CLAUDE.md "Root-cause methodology" §4.

### [2026-05-31] Reasoning/assuming instead of reading ground truth → 3 wrong diagnoses before the real cause
- **Pattern key:** `read-ground-truth-before-concluding` / root-cause-methodology
- **Evidence (D117/D118):** Diagnosed cards-stacking from reasoning, not the CSS; two fix attempts reverted. Reading the mockup CSS + computed styles + converter trace found the real cause (`.sgs-products` grid wrapper dissolved). A /qc-council 3-rater read of the FULL Spec 20/21 logs + code converged on the fix.
- **Rule:** No assumptions / no probability. Analyse ALL logs+debug data + verify every dependency (DB, block functionality, pipeline spec, truth-spec, pixel-diff-vs-live-DOM) BEFORE proposing a fix. Baked into root CLAUDE.md "Root-cause methodology" (D118).

### [2026-05-30] XS-3 walker condition too aggressive — regression on featured-product + social-proof; code reverted, DB layer kept
- **Pattern key:** `P-XS-3-TRIGGER-REFINEMENT`
- **Evidence (D109):** Walker condition consulting `blocks.tier` for section-root gating fired too broadly; featured-product + social-proof regressed against baseline. Code reverted; regression artefacts preserved in pipeline-state for refined-trigger session. D107 `blocks.tier` column + D108 `block_composition` table remain LIVE.
- **Rule:** When reverting a walker behaviour change, keep the DB layer landed (it's load-bearing for next iteration). Annotate the revert with the regression evidence path so the refined trigger isn't re-derived from scratch.

### [2026-05-30] D6 `sync-container-wrapping-blocks.py` threshold over-tight — 4 blocks flagged where 20-30 expected
- **Pattern key:** `P-D6-THRESHOLD-RETUNE`
- **Evidence (D112):** Inheritance audit script shipped + 4 blocks flagged with `wraps_block='sgs/container'`. Expected surface 20-30 blocks. Threshold tuning DEFERRED to follow-up session; script structure is sound, only the detection threshold needs widening.
- **Rule:** Inheritance / pattern-detection scripts ship with the threshold visible at the top of the script + a comment citing expected-surface-size. Threshold mismatch is a tuning task, not a structural rewrite.

### [2026-05-30] Docs applier conflated "walker code reverted" with "all related architectural updates deferred" — over-conservative; 51 spec edits incorrectly skipped
- **Pattern key:** `revert-scope-narrower-than-batch-scope`
- **Evidence:** XS-3 walker code reverted post-regression; docs applier interpreted as "skip ALL XS-batch architectural doc updates" and dropped 51 spec edits that documented D107 (LIVE), D108 (LIVE data layer), D110 (LIVE), D111 (LIVE). Only walker behaviour was reverted, not the DB layer.
- **Rule:** When applying docs for a batch with mixed LIVE / DEFERRED / REVERTED outcomes, treat each D-number independently. Read the per-decision status line; never let one revert collapse the batch into "skip everything".

### [2026-05-29] Handoff docs carry forward structural defences — never drop them when overwriting
- **Pattern key:** `handoff-docs-carry-forward-structural-defences`
- **blub.db row:** 290
- **Feedback file:** [feedback_handoff_docs_carry_forward_structural_defences.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_handoff_docs_carry_forward_structural_defences.md)

### [2026-05-29] `.claude` and `.agents` DB paths share inode (NTFS junction) — not two DBs to mirror; real two DBs are sgs-framework + ui-ux-pro-max
- **Pattern key:** `dbs-are-junction-not-mirror`
- **Feedback file:** `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_dbs_are_junction_not_mirror.md`
- **Evidence:** ls -la confirmed identical inode (8162774328448631), identical size (12.8MB), identical timestamp on both paths. os.path.realpath() returns .agents path for both. Most consistent with NTFS junction. Effect: one write to either path updates the same physical file. Prior "mirror-DB divergence" lessons (Fix 2 attributed to "implementer verification error") were structurally impossible at the file-system level.
- **Rule:** When a script/skill mentions "writing to both DBs" or "verifying mirror state between .claude and .agents", treat as redundant — both paths resolve to the same file. Real divergence concern = sgs-framework.db ↔ ui-ux-pro-max.db (different physical files), bridged by /sgs-update Stage 8.

### [2026-05-29] Hardcoded role-classification frozenset moved to DB but migration only UPDATEd existing slot_synonyms rows — never INSERTed missing role classifications → `link-href` silently absent from gate
- **Pattern key:** `db-migration-update-only-misses-spec-defined-rows`
- **Evidence (D99):** `_migrate_role_classification()` populated `slot_synonyms.role_classification` via `UPDATE slot_synonyms SET role_classification=? WHERE canonical_slot=?` per row. Since no slot_synonyms row had `role='link-href'`, the link-href classification never landed in DB. `_content_bearing_roles()` query against slot_synonyms returned 4 of 5 spec-defined roles. 32 block_attributes rows with role=link-href silently failed the walker gate (most were correctly-scalar attrs that fell through Tier A/B; 1 was a real bug — sgs/media.videoUrl). Fix: new `roles` lookup table seeded by INSERT OR REPLACE from _ROLE_CLASSIFICATION_MAP — per-role row exists for every spec-defined role, not just the ones that happen to have slot rows.
- **Rule:** When migrating a hardcoded enum/lookup to DB, the migration target must be the ENUM SCOPE (per-key table) not a DERIVED scope (per-row column on a different table). Migration target mismatch creates silent data gaps.

### [2026-05-29] `INSERT OR IGNORE` for code-seeded DB rows creates seed/DB divergence — use `INSERT OR REPLACE`
- **Pattern key:** `insert-or-ignore-creates-seed-divergence`
- **Evidence (D96 + D99):** `populate-db.py:CAPABILITY_RULES` and `html_tag_to_core_block` seed migration both used INSERT OR IGNORE. After first run, subsequent edits to the Python seed dict NEVER propagated to DB — IGNORE silently preserved old rows. Subagent C fixed CAPABILITY_RULES (added pre-pass DELETE for orphaned tags + switched to OR REPLACE); Subagent E fixed html_tag_to_core_block (OR REPLACE). Both fixes verified clean.
- **Rule:** For DB tables seeded from Python dicts at module load, use `INSERT OR REPLACE` so the Python dict stays authoritative. `INSERT OR IGNORE` is correct ONLY when the DB row is user-curated and the seed is just an initial value (i.e. operator edits should NOT be overwritten).

### [2026-05-27] /qc-council 4-rater cross-family triangulation catches bugs same-family tests miss
- **Pattern key:** `qc-council-cross-family-triangulation-finds-bugs`
- **Feedback file:** `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_qc_council_cross_family_triangulation_finds_bugs.md`
- **Evidence:** Spec 22 Phase 1.4 walker — 129+ same-family tests PASSED, /qc-council 4-rater (Sonnet + Haiku + Gemini Flash + main-thread inline) then surfaced 5 real bugs (D1 CSS-loss in walk_passthrough, D2 ImportError on documented `flush_essence_matches` API, D3 emit_atomic emitting wrong attr names post-γ-rebuild for sgs/heading/sgs/media/sgs/quote/sgs/icon-list, D4 dead Spec 16 D1 sidecar code, D5 chrome-skip dropping SGS-classed `<header>`). All 5 fixed in-flight before Phase 1.4b commit (`da3de993`).
- **Rule:** Run /qc-council BEFORE every converter/walker/SGS-block/DB-routing commit (blub.db 255 binding rule). Cross-family diversity (Anthropic Sonnet + Google Gemini + main-thread inline) is the single biggest quality lever.

### [2026-05-27] Spec 22 §FR-22-2.5 "Phase 0.1 backfill priority list" drift — 3 of 4 entries didn't grep-verify against codebase
- **Pattern key:** `spec-22-fr-22-2-5-priority-list-drift`
- **Feedback file:** `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_spec_22_fr_22_2_5_priority_list_drift.md`
- **Evidence:** Spec listed `sgs/social-proof.testimonials` (block doesn't exist), `sgs/info-box.items` (attr doesn't exist), `sgs/certification-bar.badges` (wrong attr name). Only `product-card.packSizes` grep-verified. Caught at Phase 1.3 dispatch by main-thread grep before Sonnet ran. Decision D89.
- **Rule:** Every load-bearing target name in any spec / next-session-prompt / cold-prompt MUST grep-verify against current codebase BEFORE dispatching action.

### [2026-05-25] Phases never ship as single commits; major-task cadence with /qc-council + /sgs-clone + predicted/actual delta per commit
- **Pattern key:** `phases-never-ship-as-single-commits`
- **blub.db row:** `288`
- **Feedback file:** [feedback_phases_never_ship_as_single_commits.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_phases_never_ship_as_single_commits.md)

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

### [2026-06-02] No composite block evades R-22-9 — composites with built-in wrappers mirror sgs/container
- **Pattern key:** `no-composite-evades-universal-rule`
- **Feedback file:** [feedback_no_composite_evades_universal_rule.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_no_composite_evades_universal_rule.md)

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
