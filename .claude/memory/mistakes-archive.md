# mistakes — Archive
Entries older than 2026-05-18, moved here by Phase 6a doc-op on 2026-05-24.
Active stubs live at `.claude/mistakes.md`. Full body in blub.db + memory/feedback_*.md.

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
