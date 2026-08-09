# small-giants-wp — Mistakes & Recurring Lessons
**Last updated:** 2026-08-09 (Spec 35 Track 1b — +2 stubs: enforcement-claim-without-reading-the-gate, metric-that-mis-ranks). ⚠ ACTIVE SET IS 49, NOT 30 — the cap drifted before this session and an archive sweep to memory/mistakes-archive.md is OWED. Not done here: retiring stubs at the end of a long session risks un-surfacing a live defence, and that judgement belongs in its own pass.

<!-- ACTIVE — recent 30 mistakes as keyword stubs. Full body in blub.db `learnings` table or feedback_*.md files. Archive: memory/mistakes-archive.md. Search: grep -r KEYWORD memory/ + curl localhost:5050/api/learning?search=KEYWORD -->

## Active stubs (most recent 30)
### [2026-08-09] I wrote "these gates ban the raw components" into a spec without reading either rule body — both claims were false
- **Pattern key:** `never-assert-an-enforcement-claim-without-reading-the-gate`
- **Feedback file:** [feedback_never_assert_an_enforcement_claim_without_reading_the_gate.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_never_assert_an_enforcement_claim_without_reading_the_gate.md)
- **Rule:** correcting Spec 35 Part H, I asserted that rules 04/08 gate raw `ColorPalette`/`LinkControl` out of a block's `edit.js`. Reading the bodies: `04-colour-alpha.js:92` returns early when `enableAlpha` is present (so `<ColorPalette enableAlpha>` passes clean), and `08-raw-url-link.js:99-101` matches `<TextControl type="url">` only and has never heard of `LinkControl`. **Neither is gated.** It was the one sentence in the change an operator would have acted on. A gate's NAME and its checklist item are not its CONDITION — read the matcher before describing what it enforces. Fixed by building rule 24 and proving the gap by planting `<ColorPalette enableAlpha>` in a real block: rule 04 reported 0, rule 24 flagged it.

### [2026-08-09] A metric can MIS-RANK, not merely undercount — and its own self-test can certify the defect
- **Pattern key:** `a-metric-that-gets-cheaper-when-you-hide-things`
- **Feedback file:** [feedback_a_metric_that_gets_cheaper_when_you_hide_things.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_a_metric_that_gets_cheaper_when_you_hide_things.md)
- **Rule:** a library-wide inspector census (median 12 / max 49 / total 1121) was rejected as a baseline (D543): it scored any composite as ONE row, could not see native `supports` panels (64 of 83 blocks) or `extensions/`, and summed mutually-exclusive branches — error with TWO signs. The live editor then proved it MIS-RANKED (D544): the block scoring 8 shows a client ~50 controls. Ask "what is the cheapest way to make this number fall, and does that help the user?" and validate ORDERING, not just magnitude. Its `--self-test` certified the worst defect as the expected answer, so it could never have caught this.

### [2026-07-28] A render_block injector must anchor past the leading scoped `<style>` block or its payload gets lifted/stripped, erasing injection AND evidence
- **Pattern key:** `render-injectors-must-anchor-past-leading-scoped-style`
- **Feedback file:** [feedback_render_injectors_must_anchor_past_leading_scoped_style.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_render_injectors_must_anchor_past_leading_scoped_style.md)
- **Rule:** hover-effects/animation/parallax/image-controls all wrote payloads assuming the first tag was the block root; the Spec-32 leading `<style>` got the write instead, and the p99 lift then stripped it — silently deleting the feature. Also exposed the D346 "inline-zero win" was partly vacuous. Verify the COMPUTED value on the live element, never that injector code ran.

### [2026-07-28] A shared wrapper reading a GENERIC attr name collides with a block's OWN vocabulary of the same name
- **Pattern key:** `shared-wrapper-generic-attr-name-collides-with-block-vocabulary`
- **Feedback file:** [feedback_shared_wrapper_generic_attr_collides_with_block_vocabulary.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_shared_wrapper_generic_attr_collides_with_block_vocabulary.md)
- **Rule:** `SGS_Container_Wrapper` read `layout` off any consuming block to decide grid CSS; `sgs/post-grid` also owns `layout` for its own display-mode enum, so the wrapper double-gridded it (the post-grid squish). Strip/rename block-vocabulary keys before delegating to a shared wrapper — never let it guess from a bare generic name.

### [2026-07-28] Chained shell commands mask a failed intermediate stage behind the chain's overall exit 0
- **Pattern key:** `chained-shell-commands-mask-a-failed-stage`
- **Feedback file:** [feedback_chained_shell_commands_mask_a_failed_stage.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_chained_shell_commands_mask_a_failed_stage.md)
- **Rule:** at commit `07c67642` an `&&`-chained build-then-push masked a failed build stage while the push still ran and the chain reported success. Guard each stage's exit code explicitly rather than trusting a long `&&` chain's aggregate result.

### [2026-07-28] An unreachable capability is a CONTROL-SURFACE problem, not a capability gap
- **Pattern key:** `an-unreachable-capability-is-a-control-surface-problem`
- **blub.db row:** `411`
- **Feedback file:** [feedback_unreachable_capability_is_a_control_surface_problem.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_unreachable_capability_is_a_control_surface_problem.md)
### [2026-07-21] An accurate derived value can still be UNUSABLE if under-keyed — ask what it must be KEYED BY before writing it
- **Pattern key:** `derived-value-must-be-keyed-to-be-usable`
- **blub.db row:** `407`
- **Feedback file:** [feedback_derived_value_must_be_keyed_to_be_usable.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_derived_value_must_be_keyed_to_be_usable.md)
### [2026-07-21] A gate firing on NEW findings is evidence about your data — explain every finding before baselining or bypassing
- **Pattern key:** `a-gate-firing-is-evidence-about-your-data`
- **blub.db row:** `408`
- **Feedback file:** [feedback_a_gate_firing_is_evidence_about_your_data.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_a_gate_firing_is_evidence_about_your_data.md)
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



### [2026-07-30] A budget gate globbed two directories and was structurally blind to the module it was meant to govern
- **Pattern key:** `a-gate-that-globs-a-directory-is-blind-to-everything-outside-it`
- **Evidence (D422):** `check-motion-bundle-budget.py` scanned `vendor-modules` + `shared/effects/gsap`. A new module at `shared/effects/smooth-scroll.js` — one level up — built, shipped and enqueued while the gate printed `GATE PASSED`, having never measured it. Fixed by adding `shared/effects` to `_WATCHED_SUBDIRS` and baselining at 5,777 bytes gz.
- **Rule:** After adding a file a gate is supposed to cover, RUN the gate and confirm the file appears BY NAME in its output. "The gate passed" is not evidence it looked.

### [2026-07-30] Three admin absence-checks ran logged-out and returned a clean-looking zero
- **Pattern key:** `a-zero-from-an-unauthenticated-fetch-proves-nothing`
- **Evidence (D422):** Verifying wp-admin ships no frontend bytes, the credential env failed to source (password contains shell metacharacters). The requests were redirected to the login page and reported "0 references" — a PASS for a test that never ran. Caught only because the result looked too clean; re-run with a real auth cookie plus a control asserting the page was an admin page.
- **Rule:** Every absence-check carries a positive control proving the fetched thing is what you think it is. A zero is evidence only once you have proved you were looking in the right place.

### [2026-07-30] A grep count was reported as a row count; the header was locked at 3, the regex said 5
- **Pattern key:** `a-grep-count-is-not-a-measurement`
- **Evidence (D422):** `grep -c 'wp:sgs/site-header-row'` returned 5 and was stated as "5 rows". Block markup emits an opening AND a closing comment per block (self-closing empty blocks emit one), so 3 rows = 5 matches. The header is `templateLock:'all'` at 3 rows — had 5 been true it would have meant the lock was BREACHED. Bean caught it. Second instance the same session: a "missing" settings blob was present; the pattern broke on the tag.
- **Rule:** Before quoting a count from a regex, state what ONE unit looks like in the text and confirm the pattern matches it exactly once.

### [2026-07-30] A library option that does not exist was passed for a session, reading as an enforced safety guarantee
- **Pattern key:** `an-option-name-that-does-not-exist-is-discarded-in-silence`
- **Evidence (D422):** The smoother passed `smoothTouch: false` to keep phone scrolling native. That option does not exist in Lenis 1.3.25 (zero occurrences in `lenis.mjs` AND `lenis.d.ts`); unknown keys are destructured past with no warning. The guarantee was delivered entirely by the vendor default and would have flipped if upstream changed it. Real name `syncTouch`. Found by the pre-commit qc-council.
- **Rule:** Verify every option key against the INSTALLED version's types/source — not memory, not another major version's docs — and pass values you depend on EXPLICITLY rather than relying on a default that happens to agree.

### [2026-08-04] A gate measured against the wrong document and reported 666 fictional selectors
- **Pattern key:** `a-gate-can-measure-the-wrong-document-entirely`
- **Evidence (D484):** Built `check-derived-selector-drift.py` comparing `block_attributes.derived_selector` against classes the BLOCK renders; it flagged 666 of 889 as naming a class that does not exist. `derived_selector` is a DRAFT-side matcher — `scalar_content.py:106-120` matches it against the draft DOM subtree, Spec 00 §3.1 calls it "a documented per-attr DB mapping", and Spec 31 §3.B calls hover selectors "synthetic placeholders that never exist in real markup". Inventing them is the design. Bean caught the premise and asked for the specs to be read before acting; the gate was deleted.
- **Rule:** Before building a detector, state which DOCUMENT the value under test is supposed to describe, and prove it by reading the consumer. A gate pointed at the wrong document produces confident, plausible, wholly false findings — and 666 of them would have driven a large rework.

### [2026-08-04] A perfect correlation was reported as a confirmed mechanism, twice in one session
- **Pattern key:** `a-correlation-is-not-a-mechanism`
- **Evidence (D481/D484):** (a) 99 of 99 inline `"role":"content"` declarations sat on attributes with no `css_property` — reported to Bean as confirming his "deterministic fingerprint left for derivation" hypothesis. The correlation was real; the cause was not. It is WordPress 7.0's own content-editability marker (commit `d307c8b0`), colliding on the key name, and reading it into the SGS role column would corrupt 8 attributes. (b) Bean's occupied-slot hypothesis was reported as plausible; `canonical_slot` is a pure name→alias dictionary lookup with no notion of occupancy.
- **Rule:** A correlation with no verified mechanism is a lead, not a finding. Say "correlates with" until the writer/consumer has been read. State the mechanism you checked and where.

### [2026-08-04] Three enforcement rules each shipped blind, and only a suspicious number caught them
- **Pattern key:** `a-rule-returning-zero-is-a-claim-requiring-evidence`
- **Evidence (D483):** Item 1 reported 0 violations against a true population of 65 (it counted `<InspectorControls>` elements instead of panels, skipping every block that wraps all panels in one — including `hero` at 15). Item 18 reported 12 against 15. Item 20 reported 43 against 23. All three passed their own self-tests, because the fixtures never presented the dominant real-world shape.
- **Rule:** Every new rule declares its EXPECTED population before it runs, and any result at or near zero is a claim requiring evidence, not a pass. A fixture set that omits the common case makes a blind rule look proven.

### [2026-08-05] A detector worked in every direct run and was inert in the seeder that calls it
- **Pattern key:** `a-module-can-work-run-directly-and-be-inert-when-imported`
- **Evidence:** Detector 4 assigned 42 rows every time `fingerprint_content_roles.py` was run from its own folder, and 0 inside the real `/sgs-update`. `assign-canonical.py` loads the fingerprint via `importlib.util.spec_from_file_location`, which does NOT put the loaded module's directory on `sys.path`, so `import detector4_referenced_not_output` raised `ModuleNotFoundError`. The `except` branch printed a warning to stderr, where it was buried in a 14-stage log, and the run exited 0. Every number in the commit that introduced the detector came from the working path. Caught only because the DB read `role='technical'` at 17 against a declared expectation of 59.
- **Rule:** When a script both runs standalone AND is imported by a pipeline, exercise the IMPORTING path before quoting any number from it. A degraded run that exits 0 is indistinguishable from a healthy one unless you check the number against a declared expectation.

### [2026-08-05] A subagent verified the theme patterns and missed the stored post content
- **Pattern key:** `verify-wider-than-the-agent-did` (existing rule, new instance)
- **Evidence:** The `multi-button` `direction`/`wrap` rename was verified by its subagent across block files and theme patterns — it correctly found and fixed two patterns. It never checked STORED post content. The deploy's `oldshape-audit` then found 3 NEW HIGH on canary posts 1596 and 2130, where shipping the rename would have had WordPress silently DELETE those attrs on the next editor save. The rename was pulled from the deploy.
- **Rule:** For any attribute rename or deletion, "no consumers in code" is only half the check. Stored content in the DB is the other half, and it is the half that loses client data. The gate caught it; the verification should have.

### [2026-08-06] A gate passed on a concurrent track's evidence, because it keys on a DATE not a DIFF
- **Pattern key:** `a-gate-can-be-date-keyed-instead-of-change-keyed`
- **Evidence:** The pre-commit visual-diff gate is satisfied by `reports/visual-diff/<block>-<DATE>.md` containing `verdict: PASS` + `first_paint_capture_passed: true`. Four of my changed blocks ALREADY had same-day reports written by a parallel track documenting a completely different change (`brand-strip`'s was about a `scrollDirection` enum; mine deleted a dead transition local). The gate would have passed my commit on their evidence. I appended my evidence to those four, clearly marked, rather than overwriting.
- **Rule:** When a gate passes, ask what it actually bound itself to. Date-keyed evidence is not change-keyed evidence, and on a shared worktree that difference is reachable in practice, not just in theory.

### [2026-08-06] I misread my own gate's output within minutes of building it
- **Pattern key:** `a-dead-assignment-is-dead-code-not-a-dead-control`
- **Evidence:** CHECK 5 (dead assignment) returned 18 findings and I reported them to Bean as "18 client-facing controls that do nothing". Triage against the real consumers: 12 were unused locals whose feature WORKS (`sgs_transition_vars( $attributes )` reads the raw attributes itself), 1 more the same via `SGS_Container_Wrapper`, 2 were abandoned attrs, and only 3 were genuine dead controls. The actionable backlog was 5, not 18 — and the wrong number would have justified a fleet of agents for work that mostly did not exist.
- **Rule:** A finding count is not a severity. Before handing a gate's list to anyone, check what each row's consumer actually does — especially when the gate is one you just wrote and are inclined to trust.

### [2026-08-06] I deleted a concurrent track's committed files with a careless glob
- **Pattern key:** `check-what-a-glob-matches-before-deleting`
- **Evidence:** After a bash-escaping accident produced malformed report files, I ran `rm -f reports/visual-diff/*-2026-08-06.md` to clean up "my" files. That glob also matched 10 TRACKED reports another track had committed the same day (`image-sequence`, `nav-menu`, `site-header`, `trust-bar`, …). Only `git status` showing ` D ` lines revealed it; restored with `git checkout -- reports/visual-diff/`.
- **Rule:** On a shared worktree a DELETE is a cross-track action exactly as a DB write is. List what a glob matches before removing it, and check `git status` immediately after any bulk delete.

### [2026-08-08] I fixed a DB column and silently restaged a derived artefact that scopes a WCAG gate
- **Pattern key:** `a-write-with-an-untraced-reader-propagates-silently`
- **Evidence:** D523 corrected 41 `inspector_control_type` rows. `build-roster.py:91` derives `roster.json`'s `surfaces.*` axes from a haystack that INCLUDES that column, so `sgs/form.successRedirect` becoming `SgsLinkControl` flipped `surfaces.link` false→true and left the committed artefact stale with no error. That file is the denominator every Spec 35 rule scopes against, and the same derivation feeds `surfaces.animation` — the scope of `17-reduced-motion-gate`, a live GATE-mode WCAG 2.3.3 rule with a documented 2026-07-30 precedent where a roster regen flipped 18 blocks and fired 18 false-positive WARNs. Found only because a QC-council rater checked `git status` for artefacts nobody had thought about.
- **Rule:** "What READS this?" and "what is DERIVED from this?" are two different greps. After writing a shared column, regenerate the derived artefacts and DIFF them — a regeneration you do not diff tells you nothing.

### [2026-08-08] My cross-check compared two documents I had written from the same wrong belief
- **Pattern key:** `two-artefacts-agreeing-is-not-verification-if-they-share-a-source`
- **Evidence:** I gated superseding the 27-condition checklist on an ABSORPTION MAP and "verified" it by mechanically comparing the contract's table against the tombstone's table. Clean MATCH, 30/30. A council rater then traced each item to its CITED TARGET and found conditions 15 and 18 marked ABSORBED into sections that did not contain their requirement. Both tables carried the identical error because I wrote both.
- **Rule:** A cross-check only verifies when the two artefacts were produced by INDEPENDENT routes. Verify a claim against the target it cites — does that section actually state the rule? — never against another copy of the claim.

### [2026-08-08] A truncated search manufactured a false absence, and I told Bean it "existed nowhere"
- **Pattern key:** `a-truncated-search-manufactures-a-false-absence`
- **Evidence:** Bean asked whether the QC council's control-ORDER point had been captured. I searched the contract for `order|ordering|sequence|cluster`, piped it through `Select-Object -First 20`, saw only `BorderRadius`/`border` hits, and reported that ordering "existed nowhere". It did exist — Cross-cutting A carried it at ~line 980 ("Panel order — three competitors converged on ordering being deliberate"), well past the 20-hit cutoff. I then wrote a NEW obligation on top of research that was already there. Only re-running the same search unbounded found it.
- **Rule:** A capped search can only ever prove PRESENCE, never absence. Before writing "X does not exist", re-run the search with no `head`/`-First`/`Select-Object` limit, or count total matches first. Distinct from `a-greps-blind-spot-is-the-shape-of-the-grep` — there the PATTERN was wrong; here the pattern was right and the OUTPUT was cut.

### [2026-08-08] Python's default text mode would have turned a 22-entry sweep into a 7,679-line diff
- **Pattern key:** `preserve-line-endings-or-a-rewrite-becomes-a-whole-file-diff`
- **Evidence:** Sweeping `decisions.md` to its archive, my script read with `read_text()` and would have written back with `write_text()`. On this CRLF checkout that silently converts EVERY line ending to LF — a 7,679-line diff masquerading as a 218-line archive move, on a shared worktree where another track is committing. Caught only because the script's byte count (1,121,611) disagreed with the gate's on-disk count (1,129,290) by exactly the line count, 7,679. Fixed with `newline=""` on both read and write; the real diff came out 218 out / 224 in.
- **Rule:** Any script that rewrites a repo file must open with `newline=""` on read AND write. And when two byte counts of the "same" file disagree by exactly the line count, that is a line-ending conversion, not a measurement error — sibling of `a-checksum-across-a-git-boundary-is-not-a-measurement`.

### [2026-08-08] The council's summary survived; its raw output did not, so a real finding was lost
- **Pattern key:** `a-summary-survives-but-the-raw-record-does-not`
- **Evidence:** The 2026-08-07/08 QC council produced findings A–I, D527 and the ABSORPTION MAP — all SUMMARIES, each written by me. No per-rater output was ever committed: there is no council report file anywhere in `reports/` or `memory/`. The control-ORDER point was raised by that council, never made it into any summary, and was recoverable only because Bean remembered it. Auditing "what else did they raise?" is impossible against a record that only contains what I already thought worth keeping.
- **Rule:** Commit the VERBATIM per-rater output before acting on a council, not the synthesis alone. A synthesis is lossy in exactly the direction that hides your own blind spots — the findings you did not think mattered are the ones the panel existed to surface.
