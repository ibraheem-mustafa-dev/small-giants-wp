# mistakes — Archive
Entries moved here when active stubs exceed 30. Active stubs live at `.claude/mistakes.md`.
Last prune: 2026-08-12 (doc-audit — the 19-over-cap sweep flagged 2026-08-11 finally run; 2 more
entries dropped outright, not archived, because their linked `feedback_*.md` files never existed
under any name — see `.claude/reports/2026-08-12-doc-audit-register.md` §5).

---

## 2026-08-17 — cap sweep (31 → 30 active), oldest 1 by date, moved verbatim, to make room for 1 new entry at cap

### [2026-07-21] An accurate derived value can still be UNUSABLE if under-keyed — ask what it must be KEYED BY before writing it
- **Pattern key:** `derived-value-must-be-keyed-to-be-usable`
- **blub.db row:** `407`
- **Feedback file:** [feedback_derived_value_must_be_keyed_to_be_usable.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_derived_value_must_be_keyed_to_be_usable.md)

## 2026-08-16 — archive sweep (31 → 30 active), oldest 1 by date, moved verbatim, to make room for 1 new entry at cap

### [2026-08-08] Python's default text mode would have turned a 22-entry sweep into a 7,679-line diff
- **Pattern key:** `preserve-line-endings-or-a-rewrite-becomes-a-whole-file-diff`
- **Evidence:** Sweeping `decisions.md` to its archive, my script read with `read_text()` and would have written back with `write_text()`. On this CRLF checkout that silently converts EVERY line ending to LF — a 7,679-line diff masquerading as a 218-line archive move, on a shared worktree where another track is committing. Caught only because the script's byte count (1,121,611) disagreed with the gate's on-disk count (1,129,290) by exactly the line count, 7,679. Fixed with `newline=""` on both read and write; the real diff came out 218 out / 224 in.
- **Rule:** Any script that rewrites a repo file must open with `newline=""` on read AND write. And when two byte counts of the "same" file disagree by exactly the line count, that is a line-ending conversion, not a measurement error — sibling of `a-checksum-across-a-git-boundary-is-not-a-measurement`.

## 2026-08-15 — archive sweep (32 → 27 active), oldest 5 by date, moved verbatim, to make room for 3 new entries at cap

### [2026-07-17] Validate a grading tool against a gold-standard before trusting its score as a gate (low score can be a scorer bug)
- **Pattern key:** `validate-grading-tool-against-gold-standard-before-trusting-its-gate`
- **blub.db row:** `401`
- **Feedback file:** [feedback_validate_grading_tool_against_gold_standard.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_validate_grading_tool_against_gold_standard.md)

### [2026-07-17] Fact-check subagent-produced specifics (file paths, dates, versions) — structure-faithful is not fact-faithful
- **Pattern key:** `verify-subagent-facts-not-just-structure`
- **blub.db row:** `402`
- **Feedback file:** [feedback_verify_subagent_facts_not_just_structure.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_subagent_facts_not_just_structure.md)

### [2026-07-17] Setup go-forward protocol — one LEDGER, structural gates over prose, done=machine-evidence, verify contents not filenames
- **Pattern key:** `setup-simplification-go-forward-protocol`
- **blub.db row:** `397`
- **Feedback file:** [feedback_setup_simplification_go_forward_protocol.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_setup_simplification_go_forward_protocol.md)

### [2026-06-30] LANDED verification = direct page-source comparison, not the JS parity scripts
- **Pattern key:** `landed-verification-direct-page-source-compare-not-js-parity-scripts`
- **blub.db row:** `374`
- **Feedback file:** [feedback_landed_verification_direct_page_source_compare.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_landed_verification_direct_page_source_compare.md)
- **Rule:** SGS clone LANDED gate = deploy → copy rendered page-source HTML to a file → direct manual section comparison (tag converted / content moved / every CSS rule migrated / each rule on the CORRECT block-element) + computed-style at 375/768/1440 + Bean's eye. The JS parity scripts (mockup-parity-validator.js, screenshot-diff-helper.js) are unreliable — do NOT rely on them.

### [2026-06-28] Bind definition-of-done to the spec's FULL scope — never ship a minimum increment + call the rest "out of scope"
- **Pattern key:** `bind-definition-of-done-to-full-spec-scope`
- **blub.db row:** `<pending sync — dashboard down 2026-06-28>`
- **Feedback file:** [feedback_bind_done_to_full_spec_scope.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_bind_done_to_full_spec_scope.md)
- **Rule:** Read a spec'd subsystem's WHOLE spec section before scoping; set done = the spec's full universal scope; map every deferral to a named spec STAGE, never "out of scope". Root cause of repeated half-jobs: DoD set to the increment, not the spec scope (Spec 31 §3 already defined it). Extends STOP-26 to definition-of-done.

---

## 2026-08-12 — archive sweep (49 → 30 active), oldest 19 by date, moved verbatim

### [2026-06-21] Coverage/no-drop gate join must key on the FULL declaration identity (incl. responsive tier/media)
- **Pattern key:** `coverage-gate-join-must-key-full-declaration-identity`
- **Decision:** D240
- **Feedback file:** [feedback_coverage_gate_join_must_key_full_declaration_identity.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_coverage_gate_join_must_key_full_declaration_identity.md)
- **Rule:** A set-difference no-drop/coverage gate must key BOTH sides on the full unit identity (selector, property, tier/media) — a base-tier match silently masks a non-base drop. Run an adversarial-council on BUILT gates (their value is the failure path self-QC never exercises). The tier-blind F5 join hid 19 cross-tier drops.

### [2026-06-21] Don't defer small residuals out of habit — fact-check each against ground truth first
- **Pattern key:** `fact-check-residuals-dont-defer-small-polish`
- **Decision:** D241
- **Feedback file:** [feedback_fact_check_residuals_dont_defer_small_polish.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_fact_check_residuals_dont_defer_small_polish.md)
- **Rule:** At feature/audit close, label every residual DONE-NOW (minutes → do it), DISMISSED (fact-check shows not real / already safe — cite evidence) or DEFERRED (cite the concrete blocker). Never "DEFERRED (polish)" with no evidence — a fresh session pays the full re-read cost you already hold.

### [2026-06-16] Conflated device-tier vs arbitrary visual breakpoints — blanket-swept 599/600, broke WP-columns 781
- **Pattern key:** `device-tier-vs-visual-breakpoints-are-distinct`
- **Decision:** D228
- **Feedback file:** [feedback_device_tier_vs_visual_breakpoints_are_distinct.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_device_tier_vs_visual_breakpoints_are_distinct.md)
- **Rule:** Device-tier responsive (SGS Mobile/Tablet/Desktop attrs, wrapper+converter) must use 768/1024 consistently. A single rule's VISUAL breakpoint (min-width:600, WP-columns 781) is legitimate + must NOT be blanket-changed. NEVER a blind "fix all 599/600" sweep; classify each. A Haiku agent can't make this call.

### [2026-06-16] Framed the wrapper's hardcoded !important defaults as "blockers" instead of cheats to remove
- **Pattern key:** `wrapper-hardcoded-defaults-are-cheats-not-blockers`
- **Decision:** D228
- **Feedback file:** [feedback_wrapper_hardcoded_defaults_are_cheats_to_remove_not_blockers.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_wrapper_hardcoded_defaults_are_cheats_to_remove_not_blockers.md)
- **Rule:** A wrapper injecting hardcoded values (sgs-cols-* repeat(N,1fr)!important, align default, fixed breakpoint) that override the draft's faithful CSS = R-22-1 cheat to REMOVE/gate, never a "blocker". Composites use the universal SGS_Container_Wrapper — never a separate system. Variant setups are in variant_slots/blocks.variant_attr — query, don't guess.

### [2026-06-10] WC product-panel CSS force-columns EVERY label — nested labels overlap
- **Pattern key:** `wc-panel-css-force-columns-every-label`
- **Decision:** D201 (`fe7e4fff`)
- **Rule:** WC applies `float:left;width:150px;margin-left:-150px` to every label PANEL-WIDE. Nested per-control labels need inline `float:none;width:auto;margin:…` resets (no !important — inline wins; the width/margin hit flex items too). `woocommerce_wp_*` field labels must be SHORT — sentences go in `description`. Bean's eye caught what the visual pass mis-triaged as polish.

### [2026-06-09] File-scope `extends \WC_*` is a double timing trap (site fatal AND silent unregister)
- **Pattern key:** `file-scope-wc-class-extends-must-load-lazily`
- **Feedback file:** [feedback_file_scope_wc_class_extends_must_load_lazily.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_file_scope_wc_class_extends_must_load_lazily.md)
- **Rule:** Early require = parse-time site-wide fatal (sgs-blocks loads before woocommerce). But the lazy guard can be TOO EARLY too: `WC_Settings_Page` is admin-lazy and absent at `woocommerce_loaded` — guard + require at the CONSUMER hook; parse-time class_exists guard in the file itself. D199/D200.

### [2026-06-09] REST/one-shot gates cannot see admin-surface defects — visual pass is mandatory
- **Pattern key:** `visual-pass-mandatory-for-admin-ui`
- **Findings:** [reports/visual-p3/VISUAL-PASS-REPORT-2026-06-09.md](.claude/reports/visual-p3/VISUAL-PASS-REPORT-2026-06-09.md)
- **Rule:** P3 passed every server-side gate while its settings tab didn't exist and its preview button never bound (head-printed JS, no DOM-ready guard). Drive the real admin + adversarial visual raters before declaring any admin UI shipped. Extends `ship-gate-needs-human-eye-not-just-automated-gates`. D200.

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
- **Feedback file:** [feedback_llm_eyeball_clone_verification_unreliable.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_llm_eyeball_clone_verification_unreliable.md)
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

---

### [2026-08-08] The council's summary survived; its raw output did not, so a real finding was lost
- **Pattern key:** `a-summary-survives-but-the-raw-record-does-not`
- **Evidence:** The 2026-08-07/08 QC council produced findings A–I, D527 and the ABSORPTION MAP — all SUMMARIES, each written by me. No per-rater output was ever committed: there is no council report file anywhere in `reports/` or `memory/`. The control-ORDER point was raised by that council, never made it into any summary, and was recoverable only because Bean remembered it. Auditing "what else did they raise?" is impossible against a record that only contains what I already thought worth keeping.
- **Rule:** Commit the VERBATIM per-rater output before acting on a council, not the synthesis alone. A synthesis is lossy in exactly the direction that hides your own blind spots — the findings you did not think mattered are the ones the panel existed to surface.

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

## 2026-05-21 — Council predictions need empirical validation before being treated as fix specs (row 276)
- **Pattern key:** `council-predictions-need-empirical-validation` | **blub.db row:** 276
- **Feedback file:** feedback_council_predictions_need_empirical_validation.md

## 2026-05-21 — Skills only called by other skills should be non-user-invocable (row 277)
- **Pattern key:** `skills-only-called-by-others-non-user-invocable` | **blub.db row:** 277
- **Feedback file:** feedback_skills_only_called_by_others_non_user_invocable.md

## 2026-05-21 — Stale-doc-text caused regression of a deliberately-stripped licensing check
- **Pattern key:** `strip-feature-update-docs-same-commit`
- **Feedback file:** feedback_no_licensing_talk_in_cloning_context.md

## 2026-05-21 — Don't port per-block legacy logic; fix the universal extraction path instead
- **Pattern key:** `universal-extraction-no-per-block-legacy`
- **Feedback file:** feedback_universal_extraction_no_per_block_legacy.md

## 2026-05-21 — Every Gemini agent report contained fabricated line citations — grep-verify before relaying
- **Pattern key:** `verify-gemini-claims-by-grep`
- **Feedback file:** feedback_multi_model_qc_before_commit.md

## 2026-05-20 — Five lessons: token-snap exact-match; @media scope; cv2 CSS-scope lookup; promotion is end-of-line; multi-rater council
- **Pattern key:** `token-snap-requires-strict-exact-match`
- **Feedback file:** feedback_cloning_preserves_intentional_bespoke_detail.md

## 2026-05-20 — CSS injection strategy assumed DOM injection; should have used body_class filter instead
- **Pattern key:** `body-class-strategy-over-dom-injection`
- **Feedback file:** feedback_verify_rendered_output_not_internal_metrics.md

## 2026-05-19 — Schema enumeration before any "missing column/table" claim (row 272)
- **Pattern key:** `schema-enumeration-before-gap-claims` | **blub.db row:** 272
- **Feedback file:** feedback_schema_enumeration_before_gap_claims.md

## 2026-05-19 — QC panel byte-equality check was tautological while the writer was inert
- **Pattern key:** `qc-panel-must-assert-file-existence` | **blub.db row:** 273
- **Feedback file:** feedback_qc_panel_must_assert_file_existence.md

## 2026-05-19 — Header + footer are template parts, not Gutenberg blocks (3rd recurrence)
- **Pattern key:** `header-footer-are-template-parts-not-blocks` | **blub.db row:** 274
- **Feedback file:** feedback_header_footer_are_template_parts_not_blocks.md

## 2026-05-19 — tar --exclude must be path-anchored not basename (row 275)
- **Pattern key:** `tar-exclude-must-be-specific-path-not-basename` | **blub.db row:** 275
- **Feedback file:** feedback_tar_exclude_must_be_specific_path_not_basename.md

## 2026-05-18 — Retired legacy feature before replacement was built; correct sequence is replace → migrate → retire
- **Pattern key:** `build-replacement-before-retiring-legacy`
- **Feedback file:** feedback_build_replacement_before_retiring_legacy.md

## 2026-05-18 — BEM regex [a-z0-9-]* silently matches --modifier shapes; use segmented kebab pattern
- **Pattern key:** `bem-regex-double-hyphen-false-positive`
- **Feedback file:** feedback_bean_drafts_use_sgs_prefixed_bem_naming.md

---

## Previous archive (Phase 6a doc-op 2026-05-24 — entries older than 2026-05-18)

---

## 2026-05-18 — Substring matching on bounded-suffix vocabulary is too permissive

**The rule:** When matching a key against a set of known suffixes from a controlled vocabulary, use `endswith(suffix)` (anchored), not Python `in` (substring). Substring matching inflates match rate when any vocabulary item is a substring of another.

**Incident:** `compute_attribute_coverage` in `scripts/pixel-diff.py` used `suf_l in k` for suffix matching. For suffix "size" this matched `fontSize` / `iconSize` / `imageSize` — three distinct semantic suffixes. A false-positive coverage verdict would have routed the operator to wrong remediation work.

**Fix:** `key.endswith(suffix)` OR `key.endswith(suffix + breakpoint_tail)`. Commit `397295c3` (2026-05-18).

- **Pattern key:** `camelcase-endswith-is-case-sensitive-normalise-before-compare`
- **Feedback file:** [feedback_db_first_no_hardcoded_dicts.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_db_first_no_hardcoded_dicts.md)

---

## 2026-05-18 — Docstring promised "soft-reset to None at function exit" but implementation never did

**The rule:** When a docstring describes lifecycle behaviour (entry/exit, success/failure), the implementation MUST actually do it. Drift between docstring and code is a recurring source of subtle bugs that pass tests for the current call shape but fail in extensions.

**Incident:** `convert_section()` docstring said "Soft-reset to None at function exit so subsequent sections don't inherit." The reset was never implemented. Sequential dispatch was safe by accident; parallel dispatch would race on the module-level `_TRACE` global.

**Fix:** `try/finally` with `v3.set_trace(None, "")`. Commit `10a93d87` (2026-05-18).

- **Pattern key:** `docstring-lifecycle-claim-must-be-implemented`
- **Feedback file:** [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md)

---

## 2026-05-17 — Using WP POSTS as cv2 test target when SGS clones WEBSITES (= pages)

**The rule:** SGS Framework clones websites. Websites are PAGES (`page.html` template, no `.entry-content` max-width constraint). Never use WP POSTS (rendered via `single.html`) as clone output targets. Question every inherited target choice from handoffs.

**Incident:** cv2 pipeline output was being pushed to WP POST 65 rendered via `single.html`, which applies `.entry-content { max-width: 800px }`. Multiple sessions of pixel-diff optimisation baked in a template mismatch. Should have asked "post or page?" at session-1 hour 0.

- **Pattern key:** `cv2-output-target-must-be-page-not-post`
- **Feedback file:** [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md)

---

## 2026-05-17 — Dismissing wrapper-context width mismatch as "measurement noise"

**The rule:** When pixel-diff has a stable floor and Bean has a working reference, the floor is architecture not noise. First move: inspect the working reference, not dismiss the gap. "Structural" ≠ "unfixable".

**Incident:** brand pixel-diff stayed at ~36-58% against raw mockup. I framed the residual as "wrapper-context noise". Bean's hero-clone-poc on page template + `alignfull` proved it was fixable. WP-native alignment system (contentSize/wideSize + sgs/container widthMode) was the real fix.

- **Pattern key:** `verify-rendered-output-not-internal-metrics`
- **blub.db row:** `194`
- **Feedback file:** [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md)

---

## 2026-05-17 — Every new SGS render.php helper needs function_exists guard from day one

**The rule:** Every NEW top-level function in ANY block's render.php MUST be wrapped in `if ( ! function_exists( 'X' ) ) { ... }` from the first commit. WordPress calls `require_once` per block instance; multiple instances cause redeclare fatals.

**Incident:** Three "Cannot redeclare" fatals shipped — `sgs_text_build_inline_style`, `sgs_heading_safe_unit`, and siblings — crashing live pages when rendered N times.

- **Pattern key:** `render-php-helpers-need-function-exists-guard`
- **Feedback file:** [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md)

---

## 2026-05-17 — parse_css regex captured 0 of 13 @media blocks; every responsive variant silently dropped

**The rule:** Recogniser bugs that emit ZERO trace events look identical to clean runs. Before declaring a recognition gap "missing feature in converter", verify the parser saw the source data at all. Add `parse_input` trace events + an `expected-rules-<boundary>.jsonl` baseline.

**Incident:** `parse_css` regex required media body to end with `}` immediately after the last inner rule's `}`. Real CSS always has whitespace, so 0 of 13 @media blocks matched. Every responsive override was silently dropped.

- **Pattern key:** `regex-css-parser-must-handle-whitespace-in-media-blocks`
- **Feedback file:** [feedback_read_leftover_buckets_before_conjecturing.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_read_leftover_buckets_before_conjecturing.md)

---

## 2026-05-17 — Added rows to hardcoded _CSS_PROP_TO_SUFFIX dict when property_suffixes DB table had 99 rows

**The rule:** Before adding hardcoded lookup data to converter scripts, check `.claude/db-tables-map.md` for an existing canonical table. sgs-framework.db has `property_suffixes` (117 rows), `block_supports`, `modifier_suffixes`, `slot_synonyms`, `block_attributes` (1406 rows). Refactor to `db_lookup.py`; never add another in-script dict.

**Incident:** Added margin/gap rows to `convert.py:_CSS_PROP_TO_SUFFIX` (taking it to 21 hardcoded rows) when the DB already had 99 rows for the same purpose. Every "small fix" duplicated DB-driven data.

- **Pattern key:** `db-first-no-hardcoded-dicts`
- **blub.db row:** `260`
- **Feedback file:** [feedback_db_first_no_hardcoded_dicts.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_db_first_no_hardcoded_dicts.md)

---

## 2026-05-15 — Spent ~6 hours spot-fixing pixel-diff without reading leftover buckets

**The rule:** When diagnosing converter quality or pixel-diff gaps, READ `pipeline-state/<run>/leftover-buckets.json` BEFORE proposing fixes. The orchestrator already classifies every gap by (section, slot, reason) into 5 buckets.

**Incident:** 12 passes of full-page pixel diff conjecturing about causes for ~6 hours while bucket showed 212 `extraction_failed` entries in hero. After reading, the focused fix took ~60 min.

- **Pattern key:** `read-leftover-buckets-before-conjecturing`
- **blub.db row:** `254`
- **Feedback file:** [feedback_read_leftover_buckets_before_conjecturing.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_read_leftover_buckets_before_conjecturing.md)

---

## 2026-05-15 — Single-Sonnet implementer review missed 4+ hyperspecific patterns

**The rule:** Multi-model `/qc` panel (Sonnet + Haiku + Gemini Flash + Cerebras) runs BEFORE every commit touching converter / pipeline / SGS block logic. `/qc-inline` is the lightweight self-check; `/qc` is the dispatch gate.

**Incident:** 4 hyperspecific Mama's-only patterns slipped past single-Sonnet review and were caught by Bean: hardcoded section-name overrides, hardcoded class lookups, unconditional `mediaType="emoji"` default, unconditional `variant="split"` default.

- **Pattern key:** `multi-model-qc-before-every-converter-commit`
- **blub.db row:** `255`
- **Feedback file:** [feedback_multi_model_qc_before_commit.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_multi_model_qc_before_commit.md)

---

## 2026-05-15 — Ran full-page pixel-diff with no --selector flag despite the flag existing

**The rule:** Pixel-diff closure gate is PER-SECTION (cropped with `--selector .sgs-{section-name}`) at 3 viewports. Full-page diff has ~30-45% structural noise floor that no converter can avoid.

**Incident:** 12 passes of full-page diff plateaued at ~39%. `scripts/screenshot-diff-helper.js --selector .sgs-X` existed from the start and was never used.

- **Pattern key:** `per-section-cropped-pixel-diff-not-full-page`
- **blub.db row:** `256`
- **Feedback file:** [feedback_per_section_cropped_pixel_diff.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_per_section_cropped_pixel_diff.md)

---

## 2026-05-14 — Synonym laundering doesn't satisfy a captured rule when the concept itself is the violation

**The rule:** When a captured behavioural rule forbids a *concept* (not just a word), removing the word is not compliance. Check the rule's `Why:` — if it cites a domain reason, any code path encoding the concept is the violation regardless of vocabulary.

**Incident:** Renamed `LICENSING_BANNED_SUBSTRINGS` → `row-211 banned-key gate` after a first nudge. Bean: "It's not the word licensing itself that is banned, it's the concept." Stripped the check entirely.

- **Pattern key:** `synonym-laundering-doesnt-satisfy-concept-bans`
- **Feedback file:** [feedback_no_licensing_talk_in_cloning_context.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_no_licensing_talk_in_cloning_context.md)

---

## 2026-05-12 — Always merge to main when committing (no parked PRs across sessions)

**The rule:** Squash-merge to main is the default close-out of every feature-branch commit. Build → QC → commit → push → squash-merge → delete branch → checkout main → pull. Don't leave a PR open across sessions.

- **Pattern key:** `always-merge-to-main-when-committing`
- **Feedback file:** [feedback_always_merge_to_main.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_always_merge_to_main.md)

---

## 2026-05-12 — Multi-rater QC panel runs BEFORE commit, not after

**The rule:** A multi-rater QC panel exists to GATE the commit, not retroactively bless one. Order: build → /qc-inline per dispatch → multi-rater panel → apply panel fixes → commit. The commit step is LAST.

**Incident:** Spec 15 Phase 1 plan had commit before QC. Panel found real fixes, requiring a follow-up commit on the same branch.

- **Pattern key:** `qc-panel-gates-commit-not-follows-it`
- **Feedback file:** [feedback_qc_before_commit.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_qc_before_commit.md)

---

## 2026-05-12 — str.endswith(suffix) on camelCase is case-sensitive; matches silently miss

**The rule:** When peeling a property suffix off a camelCase attribute name, normalise case BEFORE comparison (`name.lower().endswith(suffix.lower())`) and handle the empty-prefix edge case explicitly.

**Incident:** `peel_property_suffix()` used raw `name.endswith(suffix)`. `'borderRadius'.endswith('BorderRadius')` returns `False`. Caught by pytest test 7.

- **Pattern key:** `camelcase-endswith-is-case-sensitive-normalise-before-compare`
- **Feedback file:** [feedback_db_first_no_hardcoded_dicts.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_db_first_no_hardcoded_dicts.md)

---

## 2026-05-11 — @wordpress/scripts emits style-index.css; register_block_type wants style.css

**The rule:** WP's `register_block_type_from_metadata` looks for `style.css` literally but @wordpress/scripts compiles to `style-index.css`. Bridge via a postbuild copy script (`copy-built-styles.js`).

**Incident:** Trustpilot block cards stacked vertically because per-block CSS silently wasn't being enqueued. Every existing SGS block had this gap; most were masked by fallback in universal CSS.

- **Pattern key:** `wordpress-scripts-style-index-vs-style-css`
- **Feedback file:** [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md)

---

## 2026-05-11 — Unprefixed global classes in namespaced PHP = silent fatal on first render

**The rule:** In `namespace SGS\Blocks;`, any global WP class reference (`WP_Block_Type_Registry`, `WP_Error`, etc.) MUST be prefixed with `\`. PHP resolves unqualified names as `SGS\Blocks\WP_X` (which doesn't exist) and fatals.

**Incident:** `includes/image-controls.php:45` — `WP_Block_Type_Registry::get_instance()` caused fatal `Class "SGS\Blocks\WP_Block_Type_Registry" not found` on first block render.

- **Pattern key:** `namespaced-php-global-class-needs-backslash-prefix`
- **Feedback file:** [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md)

---

## 2026-05-11 — Plan referencing fictional files: structural mitigation needed

**The rule:** (1) Plan files must pass an "all named scripts exist" gate before being marked actionable. (2) State.md cannot claim work "shipped" without a commit hash.

**Incident:** Phase 8 plan referenced 7 files; only 1 existed. State.md claimed `slot-filler.py` was "1116 LOC, 8/14 tests pass" — it had never been committed. 3rd recurrence of the same pattern in 4 weeks.

- **Pattern key:** `plan-files-must-reference-real-scripts`
- **Feedback file:** [feedback_shipped_claims_need_grep_verify.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_shipped_claims_need_grep_verify.md)

---

## 2026-05-10 — Classes in mockups map to PATTERNS, not single blocks

**The rule:** Most semantic class names in a mockup operate at the PATTERN level (header, footer, featured-product, etc.), not the single-block level. Only composite single-block sections like `sgs/hero` collapse to one block.

**Pre-flight check:** (1) Cross-reference `theme/sgs-theme/patterns/*.php`. (2) Run `sgs-db.py match "<keyword>"`. (3) Check `plugins/sgs-blocks/build/<slug>/block.json`.

- **Pattern key:** `mockup-classes-map-to-patterns-not-blocks`
- **blub.db row:** `209`
- **Feedback file:** [feedback_classes_map_to_patterns_not_blocks.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_classes_map_to_patterns_not_blocks.md)

---

## 2026-05-10 — Don't cite specifics from prior-session notes without grepping the source

**The rule:** Don't propagate specifics from a previous session's state.md/handoff into a new handoff without verifying they still hold against current code. Either grep/open named files to confirm, or frame the next-session task as "verify current state matches this note before acting".

**Incident:** Lifted stale script descriptions from state.md into the Phase 7 next-session-prompt. Bean: "How do you already know what stages to rewire?" — 4 named dispatcher modules didn't exist on disk.

- **Pattern key:** `dont-cite-specifics-from-prior-session-without-grepping`
- **Feedback file:** [feedback_shipped_claims_need_grep_verify.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_shipped_claims_need_grep_verify.md)

---

## 2026-05-10 — Bean-controlled drafts use SGS-prefixed BEM

**The rule:** Every Bean-controlled draft MUST use `.sgs-<block>__<element>--<modifier>`. `/sgs-clone` Stage 0 hard-rejects non-conforming drafts on production runs (`--draft-mode` soft-warns, `--legacy` bypasses for pre-rule mockups).

- **Pattern key:** `bean-drafts-use-sgs-prefixed-bem-naming`
- **blub.db row:** `236`
- **Feedback file:** [feedback_bean_drafts_use_sgs_prefixed_bem_naming.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_bean_drafts_use_sgs_prefixed_bem_naming.md)

---

## 2026-05-09 — Don't delegate the test of unproven work

**The rule:** The operator must witness the rendered output of an unproven system's first live test. Never delegate the proof step to a subagent. Never accept an agent's text report as evidence. Open the URL before claiming success.

**Incident:** M9 milestone. Orchestrator was unproven; delegated deploy + Playwright to wp-sgs-developer with a fallback that gutted the test. Agent took the fallback, reported "Post updated, zero console errors". Bean: "look at it". Hero-only with empty fields on live page.

- **Pattern key:** `dont-delegate-test-of-unproven-work`
- **blub.db row:** `221`
- **Feedback file:** [feedback_dont_delegate_the_test_of_unproven_work.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_dont_delegate_the_test_of_unproven_work.md)

---

## 2026-05-10 — Five lifecycle lessons (blub.db ids 215-218, 220)

1. **No --resume flags** inside skills/scripts/pipelines. Sessions are atomic. (`id 215`)
2. **C-grade gaps must pass impact litmus** — would an automated downstream tool actually consume the missing element today? (`id 216`)
3. **Verify "production path uses X" by grepping the actual script** before claiming it. (`id 217`)
4. **Analysis skills run /search--local FIRST and /qc-inline LAST** before shipping. (`id 218`)
5. **Broaden the search before declaring spec wrong** — search ≥4 places including owning skill's data/ folder. (`id 220`)

- **Pattern keys:** `no-resume-no-stage-resume-in-pipelines`, `c-grade-impact-litmus-not-rubric-pedantry`, `verify-production-path-by-grepping-the-script`, `analysis-skills-search-local-then-qc-inline`, `broaden-search-before-declaring-spec-wrong`
- **Feedback files:** [feedback_no_resume_no_stage_resume_in_pipelines.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_no_resume_no_stage_resume_in_pipelines.md), [feedback_c_grade_impact_litmus_not_rubric_pedantry.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_c_grade_impact_litmus_not_rubric_pedantry.md), [feedback_verify_production_path_by_grepping_the_script.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_production_path_by_grepping_the_script.md), [feedback_analysis_skills_search_local_then_qc_inline.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_analysis_skills_search_local_then_qc_inline.md), [feedback_broaden_search_before_declaring_spec_wrong.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_broaden_search_before_declaring_spec_wrong.md)

---

## 2026-05-07 — uimax is the Rosetta Stone of design

Every uimax row that describes a design artefact MUST carry equivalent-name mappings across SGS / HTML+CSS / Bootstrap / shadcn / Tailwind / React / AI-builder outputs. Missing SGS equivalent = gap candidate, never silent drop.

- **Pattern key:** `uimax-is-rosetta-stone-cross-platform-translation`
- **blub.db row:** `213`
- **Feedback file:** [feedback_uimax_is_the_rosetta_stone_of_design.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_uimax_is_the_rosetta_stone_of_design.md)

---

## 2026-05-06 — Never raise licensing / IP / copyright in SGS cloning contexts

Web designs and component patterns are not licenseable artefacts. No `license`, `provenance_license`, or "IP firewall" columns. No `clone_observations` table justified by IP risk. Source taxonomy is `idea` / `draft` / `<URL>`.

- **Pattern key:** `no-licensing-talk-in-cloning-context`
- **blub.db row:** `211`
- **Feedback file:** [feedback_no_licensing_talk_in_cloning_context.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_no_licensing_talk_in_cloning_context.md)

---

## 2026-05-08 — 4-model peer review found 11 fixes the design needed before first clone

Run a peer-review panel (Sonnet practical + Gemini Flash gap-scan + Gemini Pro deep-reasoning + ecosystem) BEFORE any new substantial-skill build session. Synthesise findings into a delta list. Cost: ~30 min. Avoids a half-finished rebuild after first real-clone failure.

- **Pattern key:** `design-peer-review-before-build`
- **Feedback file:** [feedback_multi_model_qc_before_commit.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_multi_model_qc_before_commit.md)

---

## 2026-05-08 — Rule-stage coverage audit: 28 genuine gaps after Option A revised

Before any substantial pipeline build, do the dissection pass — assign every captured rule to a stage with covered/partial/gap status. Top-12 gaps become next-session targets. Without this, pipeline ships with silent gaps that surface in first real run.

- **Pattern key:** `rule-stage-coverage-audit-before-build`
- **Feedback file:** [feedback_read_leftover_buckets_before_conjecturing.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_read_leftover_buckets_before_conjecturing.md)

---

## 2026-05-06 — background shorthand / ctaGap blind spot / pseudo-element measurement

Three related gaps:
1. Every child container with layout CSS needs a named block attribute as destination — no destination = silent drop.
2. `background:` shorthand ALWAYS becomes `background-image:` in framework default rules. `:not(.has-background)` on all default background rules.
3. Validator WATCHED set must include `::before`/`::after` and parent chain filters.

- **Pattern key:** `extend-measurement-set-when-human-eye-disputes`
- **blub.db row:** `207`
- **Feedback file:** [feedback_extend_measurement_set_when_human_eye_disputes.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_extend_measurement_set_when_human_eye_disputes.md)

---

## 2026-05-05 — Recogniser described as section-to-block mapper; it is section-to-pattern mapper

Mockup classes/sections map to PATTERNS, not single blocks. A pattern is a composite container. If no existing pattern fits, the gap is a NEW PATTERN, not a missing block.

- **Pattern key:** `mockup-classes-map-to-patterns-not-blocks`
- **blub.db row:** `209`
- **Feedback file:** [feedback_mockup_classes_map_to_patterns_not_blocks.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_mockup_classes_map_to_patterns_not_blocks.md)

---

## 2026-05-05 — getComputedStyle().backgroundColor lied; framework gradient was painting over it

When the human eye says "wrong" and the measurement says "right", the measurement is incomplete. Full background property family (`backgroundImage`, `backgroundSize`, `backgroundPosition`, `backgroundRepeat`, `filter`, `mixBlendMode`, `backdropFilter`) must be in the WATCHED set. Don't ask the human to do comparison work the script can do.

- **Pattern key:** `extend-measurement-set-when-human-eye-disputes`
- **blub.db row:** `207`
- **Feedback file:** [feedback_extend_measurement_set_when_human_eye_disputes.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_extend_measurement_set_when_human_eye_disputes.md)

---

## 2026-05-05 — Parity validator deltas dismissed as "structural noise" turned out to be 4 visible defects

A computed-style delta is NEVER "structural noise" without screenshot evidence. Padding/margin/min-height deltas >5px ARE visible. Classifier passes that turn FAILs into PASS verdicts MUST include a side-by-side screenshot grid as evidence.

- **Pattern key:** `verify-rendered-output-not-internal-metrics`
- **blub.db row:** `194`
- **Feedback file:** [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md)

---

## 2026-05-04 — wp_global_styles post is the actual cache layer; editing variation files alone never propagates

Editing `styles/<variation>.json` and deploying does NOT make changes visible. WP stores the merged result in a `wp_global_styles` post. Deploy procedure must include POST to `/wp-json/wp/v2/global-styles/{id}` to reset the cached merge, then re-apply the active variation.

- **Pattern key:** `wp-global-styles-post-is-cache-layer`
- **Feedback file:** [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md)

---

## 2026-05-04 — Fraunces font failed to load silently; computed font-family says correct value, browser uses fallback

Use `document.fonts` to check `status === 'loaded'` for every font in `theme.json`. `getComputedStyle()` reports declared value even when the resource load failed. Per SGS framework: NO external CDN for fonts — self-host all fonts in `theme/sgs-theme/assets/fonts/`.

- **Pattern key:** `font-resource-load-failure-is-invisible-to-getcomputedstyle`
- **Feedback file:** [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md)

---

## 2026-05-04 — Single-frame post-load screenshots miss first-paint defects

Take screenshots at MULTIPLE times after navigation (0ms, 200ms, 500ms, 1000ms, 3000ms). Run DOM measurement at the SAME EARLY moment (≤300ms). CSS entrance animations are a per-instance choice — never hardcode `animation: ... both; animation-delay: Nms` on structural elements.

- **Pattern key:** `multi-frame-screenshot-for-first-paint-defects`
- **Feedback file:** [feedback_always_screenshot_verify.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_always_screenshot_verify.md)

---

## 2026-05-04 — Dynamic blocks with InnerBlocks MUST save: () => <InnerBlocks.Content />, never null

`save: () => null` tells WP "this block produces no markup" — the serialiser drops the InnerBlocks tree entirely. `render.php` drives frontend output, but the save function must emit the InnerBlocks marker for `post_content` round-trips.

- **Pattern key:** `dynamic-block-innerblocks-must-save-content`
- **Feedback file:** [feedback_block_validation_recovery.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_block_validation_recovery.md)

---

## 2026-05-03 — Extension-via-binding is the wrong shape for shared block features; composition wins

When "feature X needs to be available on N different blocks", ask "is this feature a block?" If yes, build the block, use InnerBlocks composition. Extensions only when the feature is NOT a block.

- **Pattern key:** `composition-over-extension-for-block-features`
- **Feedback file:** [feedback_block_validation_recovery.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_block_validation_recovery.md)

---

## 2026-05-03 — Fingerprints must be auto-derived from block.json, never hand-written

Hand-written fingerprints drift immediately when block.json gains new attributes. Every fingerprint must be auto-generated; coverage is enforced by code, not by remembering.

- **Pattern key:** `fingerprints-auto-derived-from-block-json`
- **Feedback file:** [feedback_ingest_dont_generate_reference_data.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_ingest_dont_generate_reference_data.md)

---

## 2026-05-03 — Pull all CSS every time during extraction, classify after

Pull every CSS rule whose selector matches an element in the section. Classify after: block-attribute / universal / custom. Selective pulling means quietly losing design intent.

- **Pattern key:** `pull-all-css-classify-after`
- **Feedback file:** [feedback_read_leftover_buckets_before_conjecturing.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_read_leftover_buckets_before_conjecturing.md)

---

## 2026-05-01 — Auto-clone is structurally sound but visually insufficient

Programmatic translation captures structure + tokens but misses design choices in the gap between block defaults and mockup-specific styling. Auto-pipeline gets to ~65/100; last 35 points need deliberate top-to-bottom rebuild section by section.

- **Pattern key:** `auto-clone-needs-deliberate-topdown-walkthrough`
- **Feedback file:** [feedback_dont_delegate_the_test_of_unproven_work.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_dont_delegate_the_test_of_unproven_work.md)

---

*Archive created 2026-05-24 by Phase 6a doc-op migration.*


## Retired from mistakes.md active set 2026-06-23 (doc audit — ≤30 cap; all dated ≤2026-05-24)

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

### [2026-08-08] I fixed a DB column and silently restaged a derived artefact that scopes a WCAG gate
- **Pattern key:** `a-write-with-an-untraced-reader-propagates-silently`
- **Evidence:** D523 corrected 41 `inspector_control_type` rows. `build-roster.py:91` derives `roster.json`'s `surfaces.*` axes from a haystack that INCLUDES that column, so `sgs/form.successRedirect` becoming `SgsLinkControl` flipped `surfaces.link` false→true and left the committed artefact stale with no error. That file is the denominator every Spec 35 rule scopes against, and the same derivation feeds `surfaces.animation` — the scope of `17-reduced-motion-gate`, a live GATE-mode WCAG 2.3.3 rule with a documented 2026-07-30 precedent where a roster regen flipped 18 blocks and fired 18 false-positive WARNs. Found only because a QC-council rater checked `git status` for artefacts nobody had thought about.
- **Rule:** "What READS this?" and "what is DERIVED from this?" are two different greps. After writing a shared column, regenerate the derived artefacts and DIFF them — a regeneration you do not diff tells you nothing.

### [2026-08-08] My cross-check compared two documents I had written from the same wrong belief
- **Pattern key:** `two-artefacts-agreeing-is-not-verification-if-they-share-a-source`
- **Evidence:** I gated superseding the 27-condition checklist on an ABSORPTION MAP and "verified" it by mechanically comparing the contract's table against the tombstone's table. Clean MATCH, 30/30. A council rater then traced each item to its CITED TARGET and found conditions 15 and 18 marked ABSORBED into sections that did not contain their requirement. Both tables carried the identical error because I wrote both.
- **Rule:** A cross-check only verifies when the two artefacts were produced by INDEPENDENT routes. Verify a claim against the target it cites — does that section actually state the rule? — never against another copy of the claim.
