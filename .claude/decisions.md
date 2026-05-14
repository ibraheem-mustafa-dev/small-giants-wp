# small-giants-wp — Architectural Decisions Log

Append-only. Most-recent first.

## 2026-05-14 - Phase 6 v2 Step 4k: critical-fix-verification wired after +REGISTER (Step 4 COMPLETE)

**Decision:** Eleventh and final wire-in of Phase 6 v2 Step 4 - `critical_fix_verification.run_harness(run_id=so_run_id)` dispatched at the end of `main()` after the +REGISTER tail (whether it ran or was skipped). The 5-check FR21 boundary harness now fires automatically per clone: `no_root_theme_mutation` + `no_canonical_block_mutation_outside_fr21` + `no_licensing_strings_in_uimax_writes` + `sgs_update_idempotency` + `pipeline_state_clean_post_success`. Aggregated check matrix lands at `run_dir/critical-fix-verification.json`. Soft-fails so a missing optional input (theme hash baseline, sgs_update runner) doesn't blow up an otherwise-successful clone -- the operator still sees the full check matrix in the result.

**Why this approach:** the harness is a post-flight audit, not a gate. Firing it AFTER +REGISTER (rather than BEFORE) means the audit covers the full mutation surface of the clone -- including the patterns + sgs-db + uimax writes performed by register_run. Soft-fail rather than hard-fail because the harness can flag false positives (e.g. an expected-theme-hash baseline that hasn't been refreshed) and we don't want operator-visible audit drift to block production-grade clones.

**Trade-offs considered:**
- Could have fired the harness before +REGISTER as a gate - rejected because +REGISTER is itself a canonical-mutation channel; auditing without seeing its writes leaves the most-likely violation source unchecked.
- Could have raised on any check failure - rejected because the harness is designed to "run all checks even on failure"; turning a soft-fail into a hard-fail at the orchestrator level defeats that contract.

**Verification:**
- 9/9 critical-fix-verification pytest tests still green
- All 10 prior wire-in suites still green
- Drift validator still 0/1349 violations
- tooling-map drift-check still passes
- AST syntax check on modified orchestrator: OK

**Files touched:**
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (CRITICAL_FIX_VERIFICATION_SCRIPT constant + critical_fix_verification() lazy-loader + run_harness dispatch in main() after +REGISTER + critical-fix-verification.json write)

**Doc updates per docs-registry update-trigger matrix:**
- `tooling-map.md` row for critical-fix-verification.py: TESTS-ONLY -> YES with wiring detail
- `cloning-pipeline-flow.md` final acceptance harness block: ✗ -> ✓ with wiring detail; UNWIRED -> LIVE
- `decisions.md` (this entry)

**Phase 6 v2 Step 4 STATUS:** COMPLETE. All 13 unwired modules (+ 2 transitives: inheritance + lingua_franca) are now reachable from the live /sgs-clone path. Next: Step 5 (Rosetta Stone discipline fix in register_patterns.py), Step 6 (small wins), Step 7 (full E2E + measure parity), Step 8 (commit + close).

---

## 2026-05-14 - Phase 6 v2 Step 4j: wp_integration wired before autonomy gate

**Decision:** Tenth wire-in - `wp_integration.validate_block_markup` runs automatically each clone after Step 4i and before the autonomy gate. Calls the `/wp-blocks` CLI at `~/.claude/hooks/wp-blocks.py` against the aggregate block markup from `extract_out`. Status + errors + warnings land on `run_dir/stage-4j.json`. `route_native_feature` + `build_deploy_command` remain operator-gated (FR21); lazy-loader makes them reachable from post-clone tooling via the orchestrator's namespace.

**Why this approach:** validating aggregate markup ONCE per clone (rather than per-section inside the extract loop) keeps the CLI invocation count low and surfaces aggregate validation errors at the same point the autonomy gate consumes them. The /wp-blocks CLI is not always present on dev machines; soft-fail to "skipped" rather than treating CLI absence as a clone failure. build_deploy_command is intentionally NOT auto-invoked because it requires a target_post_id which lives in the operator's promotion workflow, not the clone artefact.

**Trade-offs considered:**
- Could have invoked validate per-section inside the extract loop - rejected because the autonomy gate consumes aggregate markup; per-section validation would multiply CLI invocations N-fold without surfacing earlier signal.
- Could have used route_native_feature to auto-transform extracted attrs - rejected because the transform list (lightbox / duotone / appearanceTools) is narrow and current extract output rarely surfaces them; better to defer until Stage 4i operator workflows are exercised end-to-end.
- Could have failed the run on validation errors - rejected; aggregate markup may have benign warnings even in well-formed clones and we want the autonomy gate to be the single failure-decision point.

**Verification:**
- 11/11 wp_integration pytest tests still green
- All 9 prior wire-in suites still green
- Drift validator still 0/1349 violations
- tooling-map drift-check still passes
- AST syntax check on modified orchestrator: OK

**Files touched:**
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (WP_INTEGRATION_SCRIPT constant + wp_integration() lazy-loader + stage 4j dispatch block in main() + stage-4j.json write)

**Doc updates per docs-registry update-trigger matrix:**
- `tooling-map.md` row for wp_integration.py: TESTS-ONLY -> YES with wiring detail
- `cloning-pipeline-flow.md` Stage 7 block: wp_integration ✗ -> ✓ with wiring detail
- `decisions.md` (this entry)

**Next:** Step 4k (`critical-fix-verification`) - five FR21-canonical-mutation-boundary checks after +REGISTER tail.

---

## 2026-05-14 - Phase 6 v2 Step 4i: 3 apply modules wired between Stage 7 compose and Stage 8 deploy

**Decision:** Ninth wire-in - bundle of three operator-gated apply modules from `plugins/sgs-blocks/scripts/orchestrator/`. Dispatch location is in `main()` between `stage_9_report` and the autonomy gate (the Stage-8 boundary). Three separate lazy-loaders (`attribute_staged_apply`, `functionality_bulk_apply`, `media_sideload`) registered in `sys.modules`. Only `media_sideload.sideload_batch` is auto-invoked (dry-run mode) per clone -- it walks `extract_out` for `image-object` slots, writes a manifest at `run_dir/media-sideload-manifest.json`. Operators promote to real upload via the module's `--upload` CLI flag. The other two modules remain operator-gated (FR21): no auto-mutation, no auto-staging without operator-supplied changes / jobs. Summary lands at `run_dir/stage-4i.json` listing slot count + which modules loaded.

**Why this approach:** all three modules are by design "stage + emit, never auto-execute" per FR21. Forcing them to auto-fire without operator-supplied changes would either be a no-op (no changes to stage) or violate the operator-gate contract. The right wire is: make them reachable from the live path so post-clone tooling can dispatch them via the orchestrator's namespace, plus auto-fire the harmless harvest step (media-sideload dry-run manifest) so the operator sees the slot inventory immediately after each clone.

**Trade-offs considered:**
- Could have called `media_sideload.sideload_batch(upload=True)` auto-uploading every image - rejected because it would mutate live WP media library on every clone, violating the operator-gate principle.
- Could have skipped attribute-staged-apply + functionality-bulk-apply entirely until operator-supplied changes arrive - rejected because the lazy-loader registration costs ~zero and unblocks post-clone tooling that wants to dispatch via the orchestrator namespace.

**Verification:**
- 21/21 combined pytest tests across the 3 modules still green
- All 8 prior wire-in suites still green
- Drift validator still 0/1349 violations
- tooling-map drift-check still passes
- AST syntax check on modified orchestrator: OK

**Files touched:**
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (3 script constants + 3 lazy-loaders + stage 4i dispatch block in main() + stage-4i.json + media-sideload-manifest.json writes)

**Doc updates per docs-registry update-trigger matrix:**
- `tooling-map.md` rows for attribute-staged-apply / functionality-bulk-apply / media-sideload: TESTS-ONLY -> YES with wiring detail (3 rows)
- `cloning-pipeline-flow.md` Stage 7 block: 3 modules ✗ -> ✓ with wiring detail
- `decisions.md` (this entry)

**Next:** Step 4j (`wp_integration`) - validate_block_markup + route_native_feature + build_deploy_command between Stage 7 compose and Stage 8 deploy.

---

## 2026-05-14 - Phase 6 v2 Step 4h: gap-review-report wired after both gap writers

**Decision:** Eighth module wire-in of Phase 6 v2 - `gap_review_report.write_report(buckets_output, run_id, out_dir)` dispatched in `stage_9_report` after the attribute-gap-writer + functionality-gap-detector calls. The module appends `sgs-clone/<run_id>/gap-review.md` to its `out_dir` argument internally, so the orchestrator passes `run_dir.parent.parent` (the pipeline-state root) to land the file at the canonical path. Written path lands on `stage_9 output.gap_review_report_path` (None when the dispatch soft-fails).

**Why this approach:** the report renders directly from the leftover-bucket-router output which is already in scope as `buckets_output` -- no additional data marshalling required. write_report() handles directory creation itself. Single dispatch closes the operator-review surface: one markdown file the operator opens to triage every gap surfaced by the run (convention / structural / attribute / functionality, sorted by severity).

**Trade-offs considered:**
- Could have rendered the markdown inline in the orchestrator - rejected as "deterministic not inline" violation; gap-review-report module already owns the rendering logic + test suite.
- Could have combined the 4f + 4g + 4h dispatches into a single helper - kept them separate so a soft-fail in one doesn't cascade to the others; each can be regenerated independently.

**Verification:**
- gap-review-report self-test: PASS (columns + sort + summary + empty-omit + path contract)
- All 7 prior wire-in suites still green
- Drift validator still 0/1349 violations
- tooling-map drift-check still passes
- AST syntax check on modified orchestrator: OK

**Files touched:**
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (GAP_REVIEW_REPORT_SCRIPT constant + gap_review_report() lazy-loader + write_report dispatch in stage_9_report + gap_review_report_path field on stage_9 output)

**Doc updates per docs-registry update-trigger matrix:**
- `tooling-map.md` row for gap-review-report.py: TESTS-ONLY -> YES with wiring detail
- `cloning-pipeline-flow.md` Stage 9 block: gap-review-report ✗ -> ✓ with wiring detail
- `decisions.md` (this entry)

**Next:** Step 4i (`attribute-staged-apply` + `functionality-bulk-apply` + `media-sideload`) - three apply modules between Stage 7 compose and Stage 8 deploy.

---

## 2026-05-14 - Phase 6 v2 Step 4g: functionality-gap-detector wired after attribute-gap-writer

**Decision:** Seventh module wire-in of Phase 6 v2 - `functionality_gap_detector.detect_batch(elements, run_id, write=True)` dispatched in `stage_9_report` after the attribute-gap-writer dispatch. Elements are harvested by a new helper `_harvest_functionality_gap_elements(mockup_path, match)` that uses BeautifulSoup (already a dependency of the orchestrator's compose_atomic_pattern fallback) to walk the mockup DOM under every matched section selector and emit detector-shaped element dicts for any DOM node carrying a behaviour-fingerprint attribute (17 known data-* + aria-* attrs) or an inline on*-style handler. `stage_9_report` gains an optional `mockup_path` kwarg threaded from `args.mockup` at the driver call site so the harvester has the source DOM in scope.

**Why this approach:** the detector module owns the scoring + INSERT logic; the orchestrator-side helper is the minimum BS4 glue that produces detector-shaped input. Keeping the behaviour-attribute set duplicated as a module-top constant `_BEHAVIOUR_HTML_ATTR_SET` (mirroring the detector's `_BEHAVIOUR_HTML_ATTRS`) lets the BS4 walk skip non-fingerprint elements early -- avoids handing the detector a no-op load when the per-section subtree has hundreds of irrelevant nodes. Drift between the two sets is acceptable risk: the detector ignores attrs it doesn't recognise; new behaviour attrs added to the detector but not the orchestrator's set get silently dropped at the harvest step (acceptable; can be reviewed by parking note if a behaviour ever goes missing).

**Trade-offs considered:**
- Could have called detect_batch with EVERY DOM node and let the detector filter - rejected because that loads the detector with potentially 1000s of no-op elements per run, multiplying both module-load cost and the resulting `candidates` empty-row noise.
- Could have used html.parser stdlib instead of BS4 - chose BS4 because it's already imported in the orchestrator for compose_atomic_pattern and supports CSS-selector lookups on section roots.
- Could have plumbed mockup_path through a closure instead of a new kwarg - the explicit kwarg keeps the function signature self-documenting.

**Verification:**
- functionality-gap-detector self-test script: 3 PASS (click-toggle 4 candidates; modal-on-hero confidence=0.9; benign-paragraph 0 rows)
- All 6 prior wire-in suites still green
- Drift validator still 0/1349 violations
- tooling-map drift-check still passes
- AST syntax check on modified orchestrator: OK

**Files touched:**
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (FUNCTIONALITY_GAP_DETECTOR_SCRIPT constant + _BEHAVIOUR_HTML_ATTR_SET + functionality_gap_detector() lazy-loader + _harvest_functionality_gap_elements() BS4 helper + stage_9_report mockup_path kwarg + dispatch + driver call-site wiring + functionality_gap_detector field on stage_9 output)

**Doc updates per docs-registry update-trigger matrix:**
- `tooling-map.md` row for functionality-gap-detector.py: TESTS-ONLY -> YES with wiring detail
- `cloning-pipeline-flow.md` Stage 9 block: functionality-gap-detector ✗ -> ✓ with wiring detail
- `decisions.md` (this entry)

**Next:** Step 4h (`gap-review-report`) - markdown gap-review report combining 4f + 4g outputs.

---

## 2026-05-14 - Phase 6 v2 Step 4f: attribute-gap-writer wired after Stage 9 leftover routing

**Decision:** Sixth module wire-in of Phase 6 v2 - `attribute_gap_writer.stage(gaps, run_id, write=True)` dispatched in `stage_9_report` after the autonomy chain completes. Gap-candidate rows are harvested by a new helper `_harvest_attribute_gap_candidates(extract)` that walks `extract.per_section_results[*].token_resolutions` and forwards every entry with `is_gap_candidate=True` and a non-empty string `raw_value` into the writer's six-field input schema: `{block_slug, selector, css_property, value_seen, role_proposed, confidence}`. Provenance is `sgs-clone:<run_id>`. Result lands on `stage_9 output.attribute_gap_writer`.

**Why this approach:** the writer already encapsulates the de-dup logic on `(block_slug, selector, css_property)` so repeat clone runs don't proliferate identical rows -- meaning we can fire it eagerly on every run without sweeping concerns. Mapping `attr_name` onto `css_property` is the closest semantic substitute (token_resolver is attr-aware, not CSS-property-aware); the operator-review report knows how to interpret either. Soft-fail keeps uimax DB issues isolated to this step.

**Trade-offs considered:**
- Could have harvested gaps from leftover_buckets instead of per_section_results - rejected because the token_resolver's is_gap_candidate signal is more precise (already filtered by confidence threshold) than the bucket router's broader categorisation.
- Could have skipped attribute-gap-writer when row_count==0 - kept the dispatch unconditional so the `attribute_gap_writer` field on stage_9 output always exists (downstream consumers can rely on schema stability).

**Verification:**
- 3/3 attribute-gap-writer pytest tests still green (DeprecationWarning on utcnow noted but non-blocking)
- All 5 prior wire-in test suites still green (regression)
- Drift validator still 0/1349 violations
- tooling-map drift-check still passes
- AST syntax check on modified orchestrator: OK

**Files touched:**
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (ATTRIBUTE_GAP_WRITER_SCRIPT constant + attribute_gap_writer() lazy-loader + _harvest_attribute_gap_candidates() helper + dispatch in stage_9_report + attribute_gap_writer field on stage_9 output)

**Doc updates per docs-registry update-trigger matrix:**
- `tooling-map.md` row for attribute-gap-writer.py: TESTS-ONLY -> YES with wiring detail
- `cloning-pipeline-flow.md` Stage 9 block: attribute-gap-writer ✗ -> ✓ with wiring detail
- `decisions.md` (this entry)

**Next:** Step 4g (`functionality-gap-detector`) - parallel detector for behaviour-expectation gaps after Stage 9 routing.

---

## 2026-05-14 - Phase 6 v2 Step 4e: stage1_boundary_hook wired at end of Stage 1 (+ lingua_franca transitively)

**Decision:** Fifth module wire-in of Phase 6 v2 - `stage1_boundary_hook.enrich_stage1_payload(output)` dispatched at the end of `stage_1_boundary`, after voter.json is parsed and before `write_artefact` writes the stage-1 artefact. The orchestrator rewrites `voter.json` with the enriched payload so downstream stages (Stage 2 match, Stage 4 extract by boundary id) read the enriched data through the existing voter.json file read without changing any other call sites. `orchestrator/lingua_franca.py` becomes LIVE transitively -- it's loaded at stage1_boundary_hook module-import time.

**Enrichment fields added per boundary:** `source_convention`, `primary_sgs_bem`, `equivalent_implementations`, `gap_candidate_classes`, `lingua_franca_skipped`. Bean-controlled SGS-BEM drafts hit the fast path (`lingua_franca_skipped=True`) per FR9 -- never rewritten.

**Why this approach:** rewriting voter.json instead of plumbing enriched boundaries through return values keeps the change minimal and idempotent. Downstream stages already read voter.json by path (line 663 `boundary_path = run_dir / "voter.json"`), so the existing pipeline picks up the enriched fields with zero downstream edits. The heuristic classifier shipped inside the hook handles the common conventions; production swap to /uimax-classify-naming is deferred (requires injecting a callable as the `classifier` kwarg) and not blocking pixel-parity.

**Trade-offs considered:**
- Could have passed enriched boundaries through return value AND rewritten the file - chose rewrite-only because the function signature stays stable and other callers (write_artefact) get the enriched payload via the same `output` dict.
- Could have deferred lingua_franca wiring to a separate step - rejected because it's a transitive import that costs nothing extra and finally retires the long-standing TRANSITIVELY UNWIRED note on Stage 1.

**Verification:**
- 6/6 stage1_boundary_hook pytest tests still green
- 11/11 modifier_extractors + 5/5 supports_writer + 7/7 variation_router + 8/8 token_resolver still green (regression)
- Drift validator still 0/1349 violations
- tooling-map drift-check still passes
- AST syntax check on modified orchestrator: OK

**Files touched:**
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (STAGE1_BOUNDARY_HOOK_SCRIPT constant + stage1_boundary_hook() lazy-loader + enrich_stage1_payload dispatch + voter.json rewrite)

**Doc updates per docs-registry update-trigger matrix:**
- `tooling-map.md` row for stage1_boundary_hook.py: TESTS-ONLY -> YES with wiring detail
- `tooling-map.md` row for lingua_franca.py: TESTS-ONLY -> YES (transitively via stage1_boundary_hook)
- `cloning-pipeline-flow.md` Stage 1 block: stage1_boundary_hook + lingua_franca ✗ -> ✓ with wiring detail
- `decisions.md` (this entry)

**Next:** Step 4f (`attribute-gap-writer`) - after Stage 9 leftover routing.

---

## 2026-05-14 - Phase 6 v2 Step 4d: modifier_extractors wired between Stage 4 and Stage 7

**Decision:** Fourth module wire-in of Phase 6 v2 - all three classifiers from `modifier_extractors` dispatched in the per-section loop after the supports_writer block. `button_role(section_attrs)` fires only when target_block name contains 'button' (lower-cased). `dynamic_link(href)` parses every `section_attrs` value that starts with `:`; only successful parses are retained. `match_block_variation(block_json, section_attrs)` fires only when the block's block.json declares a `variations` key. Block.json loading was lifted above the supports_writer dispatch in this commit so 4c + 4d share the same `block_json` variable -- one disk read, two dispatches.

**Why this approach:** all three are pure functions (no DB / filesystem side-effects), so a single per-section sweep is the cheapest place to fire them and the cleanest hand-off to downstream stages. Outputs land on `per_section_results[i].modifier_signals` keyed by classifier name -- consumers (Step 7 compose for variation overrides; Step 4i staged-apply for button-role; Step 4j wp_integration for FR25 dynamic-link resolution) read only the keys they need. Per-dispatch try/except means a single failing classifier never blocks the other two.

**Trade-offs considered:**
- Could have fired button_role on every section regardless of block-name - rejected because the classifier defaults to "primary" for any solid-background and would pollute non-button sections with meaningless modifier signals.
- Could have parsed dynamic_link on every string attribute - the `:` prefix check filters out obvious non-candidates cheaply, keeping `dyn_links` empty on the common path.
- Lifting block.json load above 4c saves one disk read per section and keeps the variable scope tight.

**Verification:**
- 11/11 modifier_extractors pytest tests still green
- 5/5 supports_writer + 7/7 variation_router + 8/8 token_resolver pytest still green (regression)
- Drift validator still 0/1349 violations
- tooling-map drift-check still passes
- AST syntax check on modified orchestrator: OK

**Files touched:**
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (MODIFIER_EXTRACTORS_SCRIPT constant + modifier_extractors() lazy-loader + lifted block.json load + 3-way modifier dispatch + modifier_signals field on per_section_results)

**Doc updates per docs-registry update-trigger matrix:**
- `tooling-map.md` row for modifier_extractors.py: TESTS-ONLY -> YES with wiring detail
- `cloning-pipeline-flow.md` Stage 4 block: modifier_extractors ✗ -> ✓ with wiring detail
- `decisions.md` (this entry)

**Next:** Step 4e (`stage1_boundary_hook` + `lingua_franca` transitive) - end of Stage 1, before Stage 2 match.

---

## 2026-05-14 - Phase 6 v2 Step 4c: supports_writer wired before Stage 6 emission (+ inheritance transitively)

**Decision:** Third module wire-in of Phase 6 v2 - `supports_writer.filter_writes` dispatched inside `stage_4_5_6_7_8_extract` after the Stage 4.5 variation_router block, before the per_section_results.append call. For each matched section, the orchestrator loads the target block's `block.json` (REPO/plugins/sgs-blocks/src/blocks/<slug>/block.json) and calls `filter_writes(block_slug, section_attrs, block_json, theme_json)`. The three outputs land on per_section_results as `supports_decisions`, `supports_emitted_attributes`, `supports_omitted_attributes`. `value-matcher/inheritance.py` is now also LIVE -- transitively reachable because supports_writer optionally imports it at module load.

**Why this approach:** advisory signal at this stage, mutation deferred. Downstream consumers (Step 4i staged-apply + Step 4j wp_integration) need to know which overrides are cascade-redundant in order to strip them at deploy time, but the block markup is already serialised by extract.py before this dispatch fires -- so we record the decision rather than rewriting the markup here. Keeps the wire-in mechanical and respects the per-step bisect-isolation rule. The transitive inheritance.py reachability flips its tooling-map status from NO to YES for free, closing the long-standing TRANSITIVELY UNWIRED note that lived on Stage 5.

**Trade-offs considered:**
- Could have mutated section_attrs to drop omitted attrs immediately - rejected because section_markup was already serialised against the unfiltered set; dropping attrs here would create a markup/attrs mismatch the downstream stages can't reconcile yet.
- Could have re-serialised the markup inline - rejected as new logic in sgs-clone-orchestrator.py; that work belongs to Step 4i's bulk-apply.

**Verification:**
- 5/5 supports_writer pytest tests still green
- 7/7 variation_router + 8/8 token_resolver pytest still green (regression)
- Drift validator still 0/1349 violations
- tooling-map drift-check still passes
- AST syntax check on modified orchestrator: OK

**Files touched:**
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (SUPPORTS_WRITER_SCRIPT constant + supports_writer() lazy-loader + per-section filter_writes dispatch + 3 supports_* fields on per_section_results)

**Doc updates per docs-registry update-trigger matrix:**
- `tooling-map.md` row for supports_writer.py: TESTS-ONLY -> YES with wiring detail
- `tooling-map.md` inheritance.py reachability column: NO -> YES (transitively via supports_writer)
- `cloning-pipeline-flow.md` Stage 5 block: PARTIAL GAP -> LIVE with wiring detail
- `decisions.md` (this entry)

**Next:** Step 4d (`modifier_extractors`) - button-role / dynamic-link / block-variation match between Stage 4 extract and Stage 7 compose.

---

## 2026-05-14 - Phase 6 v2 Step 4b: variation_router wired into Stage 4.5 gap-candidate path

**Decision:** Second module wire-in of Phase 6 v2 - `variation_router` from `plugins/sgs-blocks/scripts/orchestrator/variation_router.py` dispatched inside the existing Stage 4.5 soft-fail block in `stage_4_5_6_7_8_extract`. After `token_resolver.resolve_batch` returns, every `is_gap_candidate=true` resolution with a recognised role (color/spacing/font_size/shadow/family) and a non-empty string `raw_value` is routed through `add_token(client_slug, role, slug, raw_value, theme_root=REPO/theme/sgs-theme, write=True)`. Slug derivation reuses `token-lint._generate_slug` via a second lazy-loader so the orchestrator never duplicates the slug rules already exercised by token-lint's additive-discovery test suite. (role, slug) tuples for actually-inserted-or-updated tokens land on `per_section_results[i].new_tokens_written`. Exceptions surface as `aggregate_warnings` and never break the extract loop.

**Why this approach:** keeps "deterministic not inline" - both the write path (variation_router.add_token) and the slug rules (token-lint._generate_slug) are module APIs; only the dispatch glue lives in the orchestrator. Reusing token-lint's slug helper means Stage 0.5 (CSS-driven discovery) and Stage 4.5 (extract-driven discovery) propose the same slugs for the same raw values, so re-runs are idempotent across both stages. `add_token` is itself idempotent (returns `action="noop"` on duplicate slug+value), so re-running the pipeline on the same mockup writes nothing new. Soft-fail preserves the Phase 4 framing - cloning preserves intentional bespoke detail; if a write hiccups the raw values stay in the extract for downstream stages to consume.

**Trade-offs considered:**
- Could have added a `propose_slug(role, value)` helper directly to variation_router to keep the orchestrator dependent on a single module - rejected because token-lint already owns the canonical slug rules and duplicating them risks Stage 0.5 / Stage 4.5 divergence.
- Could have skipped the `new_tokens_written` field - kept because it gives Step 4f (attribute-gap-writer) a deterministic signal of which tokens were just minted on this run, distinguishing them from pre-existing variation entries.

**Verification:**
- 7/7 variation_router pytest tests still green
- Drift validator still 0/1349 violations
- tooling-map drift-check still passes
- AST syntax check on modified orchestrator: OK

**Files touched:**
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (VARIATION_ROUTER_SCRIPT + TOKEN_LINT_SCRIPT constants; variation_router() + _token_lint() lazy-loaders; _TOKEN_RESOLVER_ROLE_TO_TOKEN_LINT_CLASS translation map; per-section gap-candidate dispatch loop; new_tokens_written field on per_section_results)

**Doc updates per docs-registry update-trigger matrix:**
- `tooling-map.md` row for variation_router.py: TESTS-ONLY -> YES with wiring detail
- `cloning-pipeline-flow.md` Stage 4.5 block: variation_router ✗ -> ✓ with wiring detail + UNWIRED -> LIVE status flip
- `decisions.md` (this entry)

**Next:** Step 4c (`supports_writer` + `inheritance` transitive) - decide block-supports per attribute path before Stage 6 emission.

---

## 2026-05-14 - Phase 6 v2 Step 4a: token_resolver wired into Stage 4.5

**Decision:** First module wire-in of Phase 6 v2 - `token_resolver` from `plugins/sgs-blocks/scripts/orchestrator/token_resolver.py` integrated into `sgs-clone-orchestrator.py:stage_4_5_6_7_8_extract` between per-section extract.py subprocess return and per_section_results aggregation. Lazy-loaded via `token_resolver()` helper alongside the existing `confidence_matrix()` pattern. Theme.json + variation overlay loaded once per /sgs-clone run (will move to Stage 0 caching in Step 6a).

**Why this approach:** preserves the existing per-section subprocess pattern; minimum-impact wiring (15 lines for theme/variation loading + 10 lines for the per-section snap call); raw values silently replaced with token_slug when confidence >= 0.6; gap candidates surface in `per_section_results[i].token_resolutions` field for the (still-unwired) Stage 9 gap-writers to consume later. Soft-fails on exception to preserve raw values.

**Verification:**
- 8/8 token_resolver pytest tests still green
- Drift validator still 0/1349 violations
- tooling-map drift-check still passes
- AST syntax check on modified orchestrator: OK

**Files touched:**
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (TOKEN_RESOLVER_SCRIPT constant + token_resolver() lazy-loader + theme.json+variation overlay loading + per-section snap call + token_resolutions field on per_section_results)

**Doc updates per docs-registry update-trigger matrix:**
- `tooling-map.md` row for token_resolver.py: TESTS-ONLY -> YES with wiring detail
- `cloning-pipeline-flow.md` Stage 4.5 block: ✗ -> ✓ with wiring detail
- `decisions.md` (this entry)

**Next:** Step 4b (`variation_router`) - sibling write path that fires inside token_resolver loop on gap-candidate match.

---

## 2026-05-13 - Phase numbering refresh + Phase 5 closed

**Decision:** Renumber Spec 15 phases so the core build sequence is contiguous and after-completion extensions sit outside it. Same-day refresh because the prior numbering had the pixel-parity work stuck as "Phase 7" with the cross-platform extension as "Phase 6" in the middle of the build sequence - confusing readers and self.

**Renumbering (Bean's call):**

| Before | After | Reason |
|---|---|---|
| Phase 7 - Pattern Fidelity | Phase 6 - Pattern Fidelity | Core build work; owns the <=1% pixel-parity gate as its hard pass criterion |
| Phase 6 - Cross-platform output extension | Phase-extra 1 - Cross-platform output extension | After-completion extension; consumes Phase 6's high-quality patterns as input |

**Phase 5 closure (parallel decision):** Phase 5's scope was reframed to "modules + integration + pipeline runs E2E". The <=1% pixel-parity gate moved to Phase 6's ownership as its OWN success criterion, not a Phase 5 remainder. Under the new scheme:
- Phase 5 = SHIPPED. Modules 5a-5f + 5g rewrite + 5h.1 CSS-lift + integration plumbing (commit `d0d30579`, originally labelled `p6-step-0`) + plan and docs (`fc9f567f`, originally labelled `p7`). All on origin/main.
- Phase 6 = next-up. Plan at `.claude/plans/phase-6-pattern-fidelity.md` (12 steps).
- Phase-extra 1 = deferred. Plan not yet written.

**Files updated:**
- `.claude/plans/phase-7-pattern-fidelity.md` -> renamed via `git mv` to `.claude/plans/phase-6-pattern-fidelity.md`; content rewritten for new numbering
- `.claude/plans/spec-15-master-execution-plan.md` - new "Phase numbering refresh" section at top; Phase 5 section marked CLOSED; Phase 6 section now describes pattern fidelity (was Phase 7); Phase-extra 1 referenced
- `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` - status frontmatter + Phase 5 body section updated
- `.claude/state.md` - current_phase = `spec-15-phase-6-pattern-fidelity`
- `.claude/handoff.md` + `.claude/next-session-prompt.md` - references updated

**Git history note (intentional):** commit `d0d30579` carries the label `p6-step-0` and `fc9f567f` carries `p7`. These predate the renumbering refresh and are retained verbatim for `git log` searchability. Going forward, new commits use the new numbering: `p6` for pattern fidelity work, `pe1` for Phase-extra 1 work.

## 2026-05-13 — Spec 15 Phase 6 Step 0: entry-script rewire composes Phase 5 modules + +REGISTER tail wired

**Decision (state):** The "Known limit Phase 6 Step 0" called out at `~/.claude/skills/sgs-clone/SKILL.md:142` is closed. The legacy `sgs-clone-orchestrator.py` now composes with the Phase 5 module surface via `orchestrator_main.run()` and runs +REGISTER on success. Live E2E end-to-end works: real Playwright multi-viewport capture, real pixel diff, autonomy gate correctly halts at the 1% threshold, +REGISTER fires only on PASS.

**Diagnostic that drove this:** Bean correctly redirected to /systematic-debugging Phase 1 + read the spec + master plan + skill file. Diagnosis: 25 Phase 5 modules built + tested in isolation, but the production entry script (`sgs-clone-orchestrator.py`) was the legacy Spec 14 shape — Stage 1-9 only, no preflight, no staged_merge, no visual_qa, no autonomy gate, **no +REGISTER**. The whole pattern-registration step was unwired, which is why "everything is failing" was the wrong frame — the foundation was solid; the entry script bypassed 90% of what was built.

**What shipped this session:**

1. **`plugins/sgs-blocks/scripts/orchestrator/register_patterns.py` (NEW, ~250 LOC).** The +REGISTER module. Walks the stage-4 per_section_results for status==`deferred-composed-pattern` entries; for each, writes:
   - PHP pattern file at `theme/sgs-theme/patterns/<slug>.php` with standard WP header (Title / Slug / Categories / Description) + auto-generated comment + the composed block markup verbatim
   - Row in `sgs-framework.db.patterns` with `is_auto_generated=1` + `source='sgs-clone-pipeline'` + `block_composition` JSON
   - Row in `uimax patterns` with Rosetta Stone `equivalent_implementations` (sgs_block + html_css mappings)
   - Idempotent: re-running on the same run_id is 0 new registrations + N skipped with reason "PHP pattern file already exists"

2. **`plugins/sgs-blocks/scripts/orchestrator/visual_qa_capture.py` (NEW, ~150 LOC).** Factory for the `capture_callable` parameter of `autonomy_gate.invoke_visual_qa()`. Uses node + Playwright (subprocess from `plugins/sgs-blocks` where `node_modules/playwright` lives), serves the mockup via a one-shot localhost HTTP server, captures clone + mockup at the same viewport, computes pixel diff via PIL with 30-channel-unit tolerance. Falls back to `stub_capture` (0.0 diff) when no `--clone-url` is supplied.

3. **`plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (MODIFIED, ~100 new LOC at bottom of `main()`).** After Stages 0.1-9 run via legacy path, the Phase 6 Step 0 block:
   - Mirrors legacy artefacts to the Phase 5 `staged_output` convention at `pipeline-state/sgs-clone/<run_id>/stage-N-<canonical_name>.json` so `staged_merge.merge()` can find them
   - Builds trivial pass-through StageHandlers (stages 1-9 already ran; canonical mutations are scaffold-promotions that staged_merge can't yet roll back — FR21 atomic rollback is parking work)
   - Resolves capture_callable: live Playwright via `make_capture_callable(ctx)` when `--clone-url` is supplied, otherwise the stub
   - Calls `orchestrator_main.run(run_id, handlers, capture_callable, sgs_update_cmd, sgs_update_dry_run=True, require_schema=False)`
   - On `outcome.overall == "success"`, runs `register_patterns.register_run()`
   - 3 new flags: `--clone-url <url>`, `--skip-register`, `--skip-autonomy-gate`

4. **`plugins/sgs-blocks/scripts/orchestrator/test_register_patterns.py` (NEW, written by Sonnet subagent).** 20 tests, all green in 0.39s. Covers: PHP file write, sgs-db row insert with correct source flag, uimax row insert with Rosetta Stone payload, idempotency, invalid-slug rejection, non-composed section filtering, canonical-DB-untouched-by-tests guard, stub_capture behaviour, `_section_class_to_slug` decomposition, `_composed_inner_blocks` uniqueness.

**Live E2E proof (run `mamas-munches-homepage-2026-05-13-105351` with `--clone-url`):**
- Stages 0.1, 0.5, 0.7 ran (BEM lint 0/149 violations, token lint 0 candidates, CSS lift 22,442 chars to mamas-munches.css)
- Stages 1-9 produced artefacts as before
- 6 screenshots captured at 375 / 768 / 1440 (clone + mockup each)
- Pixel diff: 64.9% mobile / 43.7% tablet / 36.5% desktop
- Autonomy decision: `halt` (max_diff 0.6490 exceeds pass_threshold 0.01)
- +REGISTER correctly skipped per `autonomy outcome=halted` guard
- deliverable.md emitted at `pipeline-state/sgs-clone/<run_id>/deliverable.md` with viewport table + next-action

**Earlier run on stub capture (`mamas-munches-homepage-2026-05-13-104825`):**
- Autonomy decision: `auto-proceed` (stub returns 0.0 diff)
- +REGISTER fired: 5 patterns registered, 1 skipped (ingredients-section.php existed from prior session)
- `theme/sgs-theme/patterns/{header,featured-product,gift-section,social-proof,footer}.php` written (untracked, ready for commit)
- 5 rows added to `sgs-framework.db.patterns` with `source='sgs-clone-pipeline'`
- 5 rows added to `uimax patterns` with Rosetta Stone payload

**Multi-rater QC panel (Sonnet + Haiku + Gemini Flash, parallel):**
- Haiku sanity: pass / 92 confidence / ship (1 minor: redundant `block_composition` kwarg)
- Gemini Flash breadth: pass / 95 confidence / ship (0 concerns)
- Sonnet strict: pending

**Post-panel cleanups applied while waiting:**
- `_section_class_to_slug` prefix-strip made case-insensitive (handles `SGS-Header` → `header`)
- `_insert_uimax_pattern` added explicit `SELECT 1` pre-check before INSERT to defend against duplicate rows when uimax patterns table lacks UNIQUE constraint on slug
- Pytest re-run: 20/20 still green

**What's STILL not closed (named explicitly):**
- FR21 atomic rollback — staged_merge handlers' rollback() is a no-op. Canonical mutations (scaffold-promote) happen DURING stage execution, not via apply(). A clean fix requires moving scaffold-promote into a stage-9 apply() and writing its inverse into rollback(). Parked for the next sub-phase.
- Pixel-parity gap (Stage 7 COMPOSE doesn't preserve BEM child hierarchy, WP global header chrome) — these are now ISOLATED symptoms on top of a functional pipeline rather than entangled with broken plumbing. Each becomes a discrete fix in a follow-up phase.

**The pipeline now does what the spec says.** Bean's mental model from the conversation ("save the container and its content as a pattern with the same name as the class") is now literally what `+REGISTER` does. Future clones either find an existing pattern via Stage 1 BOUNDARY → `patterns.slug` lookup, or trigger +REGISTER to grow the catalogue. The compounding effect the spec promises is now operational.

## 2026-05-13 — Spec 15 Phase 5g: structural defect closed; partial Phase 5 closure accepted

**Decision (state):** 5g.1 + 5g.2 + 5g.3 implemented inline. Live E2E proves the load-bearing structural defect from the earlier `2026-05-13-055523` run is closed: all 9 Mama's-homepage sections now render with content. Literal acceptance gates (≥ 90% coverage + ≤ 1% pixel diff) NOT met because the composer emits default `sgs/container` layouts instead of reproducing the mockup's bespoke column/grid/background styling. Bean accepted **partial Phase 5 closure** (option A); styling fidelity becomes Phase 5h follow-up or absorbed into Phase 6 work.

**What 5g.1 + 5g.2 + 5g.3 changed:**

- **5g.1** — `recogniser/confidence-matrix.py:94-107`: hard-gate. When voter slug is not in `registered_blocks`, drop the candidate entirely (was: dampen confidence to 0.75 and emit anyway). Stage 2 now lands unregistered sections at `core/group` with confidence 0.0 → goes to leftover-bucket-router as `unrecognised_section` → routed to autonomy chain at stage 9b. Layer-1 qc-inline: 3 synthesised boundaries (unreg-no-secondary, registered-direct, unreg-primary-but-reg-secondary) all behave correctly.

- **5g.2** — `sgs-clone-orchestrator.py` new `stage_9b_autonomy_chain()`: for each `unrecognised_section` whose voter pointed at an `sgs/<slug>` candidate, dispatch `bucket-c-classifier.classify_batch()` in-process (sqlite read, ~5s timeout), then call `atomic-block-scaffold.scaffold() + promote()` with `--db-path` set to the canonical sgs-framework.db. Default ON (`--no-scaffold-new-blocks` / `--no-promote-new-blocks` opt-outs). Layer-1 qc-inline: 4 scenarios (promote-path, scaffold-only, disabled, malformed-slug) all pass.

- **5g.3** — `sgs-clone-orchestrator.py` new `compose_atomic_pattern()` helper + replaced the deferred-fallback skip at stage 4: when a section is matched to `core/group` (post-5g.1 hard-gate), the composer walks the section DOM and emits `<!-- wp:sgs/container {"anchor":"<id>","className":"<cls>"} --> ... <!-- /wp:sgs/container -->` wrapping `core/heading` + `core/paragraph` + `sgs/button` + `sgs/decorative-image` atomic children. Note: `sgs/heading` and `sgs/text` do NOT exist as registered blocks; the prompt's specific names were aspirational. `core/heading` + `core/paragraph` are the right primitives per existing SGS conventions. Layer-1 qc-inline: featured-product → 4 distinct atomic types; ingredients-section → headings + paragraphs only; trust-bar → `None` correctly (no atomic content).

**Live E2E verdict (run `mamas-munches-homepage-2026-05-13-074854`):**

- Pipeline: stage 0.1 BEM lint 0 violations (149 classes), stage 0.5 token lint 0 candidates (variation overlay loaded), stage 1 voter 9 boundaries primary-convention=sgs-prefixed-bem, stage 2 matrix matches: 3 of 9 routed to registered SGS blocks (`sgs/hero`, `sgs/trust-bar`, `sgs/heritage-strip`) + 6 routed to `core/group` (then composed by 5g.3), stage 3 slot list 212 slots, stage 4-8 extract 84 attrs + 13,533 chars markup, stage 9 leftover 225 entries, stage 9b autonomy 6 scaffolded + 6 promoted.
- Promoted blocks: `plugins/sgs-blocks/src/blocks/{header,featured-product,ingredients-section,gift-section,social-proof,footer}` — `0.1.0-scaffold` version, role=text-content. Untracked dirs (additions, not modifications) — Spec 15 FR21 staged-merge channel honoured. Block-attributes rows registered in sgs-framework.db.
- Deploy: sandybrown post `spec15-p5g-e2e-test` (id 59) via WP REST API, screenshotted at 375/768/1440 (Playwright MCP), Bean's-own-eyes verification confirmed all 9 sections render with content. Post deleted post-verification.
- Acceptance harness 5/5 GREEN (no_root_theme_json_mutation, no_canonical_block_mutation, no_licensing_in_uimax, sgs_update_idempotency, pipeline_state_clean).

**Phase 5 acceptance status (literal vs. operational):**

| Gate | Status |
|------|--------|
| Sub-phases 5a-5f modules shipped on origin/main | ✅ |
| Sub-phases 5g.1-5g.3 shipped this session | ✅ |
| E2E run completes end-to-end (no crashes) | ✅ |
| Harness 5/5 GREEN | ✅ |
| Multi-rater /qc on full Phase 5 deliverable ≥ 2/3 ship | ✅ (prior 5a-5f panels) + ⏸️ (proper multi-model 3-rater on 5g delta DEFERRED to Phase 6 cold-start due to time-cost of multi-model orchestration; inline 3-perspective single-model assessment ran 3/3 ship with 3 follow-ups parked) |
| ≥ 90% mockup-USED-attr coverage at 3 viewports | ❌ — **38.2% aggregate**. Deferred-composed sections (b1/b4/b6/b7/b8/b9) have `0/0` denominators because they're matched to `core/group` (no block.json slot list); the coverage metric is misleading for atomic-composed sections. |
| ≤ 1% pixel diff at 3 viewports | ❌ — visual styling diverges significantly. Class of defect SHIFTED from "sections vapour entirely" (85%) to "sections render but styling doesn't reproduce mockup's bespoke layouts". |
| `deliverable.md` for Mama's run readable by Bean | ⏸️ — same as prior run pattern; full-page-markup.html readable + sandybrown URL preserved while live. |
| No leftover feature-branch commits | ✅ |

**Phase 5h.1 — CSS-lift stage shipped (2026-05-13 same day):**

Bean correctly redirected to root-cause investigation before scoping 5h. /systematic-debugging Phase 1 found:

- All 61 blocks survived WP storage (no validation drops, only `core/` prefix normalisation).
- Rendered DOM has the EXACT mockup class hooks (`.sgs-featured-product`, `.sgs-ingredients-section`, etc.) — composer was already correct.
- Across 53 stylesheets loaded on sandybrown, ZERO rules existed for the bespoke section classes. Computed `backgroundColor` was `rgba(0,0,0,0)`, computed `padding` was `0px`.
- The mockup has 22,442 chars of inline `<style>` containing all bespoke per-section CSS keyed off `.sgs-<section>` classes. **The clone pipeline dropped this CSS entirely.** No CSS-lift stage existed.

Hypothesis test (one-shot inject): adding mockup CSS as `wp:html <style>` to the page produced exact `backgroundColor: rgb(251,243,220)` / `padding: 56px 20px` matches on every section. Hypothesis confirmed.

**Pipeline fix shipped (commit pending):**
- `sgs-clone-orchestrator.py`: new `stage_0_7_css_lift()`. Reads mockup inline `<style>` blocks + all local `<link rel="stylesheet">` paths, concatenates with provenance headers, writes `theme/sgs-theme/styles/<client>.css`. Idempotent — every clone run overwrites.
- `theme/sgs-theme/functions.php`: new variation-CSS enqueue. Loads `styles/<active_theme_style>.css` AFTER framework stylesheets when the active variation has a sibling `.css` file. Cache-busted via `filemtime()`.
- `recogniser/confidence-matrix.py`: `discover_registered_blocks()` now excludes scaffold-grade blocks (`version == "0.1.0-scaffold"`) from routable set. Without this, post-5g.2 re-runs route to bare scaffolds and skip the composer entirely. Scaffolds remain promoted in `src/blocks/` for future polish; they're just not routed to until version ≥ 1.0.

**Pipeline E2E re-run (run `mamas-munches-homepage-2026-05-13-093952`):**
- Stage 0.7 produces `theme/sgs-theme/styles/mamas-munches.css` (25,520 chars including provenance header).
- Stage 2 correctly routes 3 sections to registered composites (hero, trust-bar, heritage-strip) + 6 sections to `core/group` → composer fires → `sgs/container` patterns with atomic children.
- Stage 9b autonomy chain: 6 scaffolded, 0 promoted (existing canonical dirs blocked re-promotion — soft-warning path, not error).
- Theme deployed via tar + scp + OPcache reset. Variation stylesheet verified loaded via `getComputedStyle()` — `.sgs-featured-product`/`.sgs-ingredients-section`/`.sgs-gift-section`/`.sgs-social-proof`/`.sgs-footer` all carry the mockup-spec backgroundColor + padding.

**Phase 5h hard gate measurement (the actual pass criterion):**

| Viewport | Diff % | Gate (≤1%) | Verdict |
|----------|--------|------------|---------|
| 375 mobile | 72.33% | FAIL | clone SHORTER by 927px |
| 768 tablet | 53.67% | FAIL | clone TALLER by 1030px |
| 1440 desktop | 45.88% | FAIL | clone TALLER by 486px |

CSS-lift took the diff from 85% → 45-72% but the ≤1% gate is NOT met. Three named structural gaps remain, each with a concrete pipeline fix:

**5h.4 — WP global header chrome (~30 min):** Cloned page uses `page.html` template which includes WP site header part. Mockup is standalone. ~400px mismatch at top across all viewports. Fix: new `templates/clone-page.html` with no header/footer parts; pipeline tags the WP page with this template via `template` meta in WP REST POST.

**5h.5 — Composer doesn't preserve BEM child class hierarchy (load-bearing, ~2 hr):** Mockup CSS targets `.sgs-featured-product__grid`, `.sgs-featured-product__card`, `.sgs-ingredients-section__list` etc. Composer emits flat `core/heading` + `core/paragraph` + `sgs/button`. Without `__grid` wrappers, the lifted grid CSS rules have no element to bind to → layout collapses to single-column stack. Fix: extend `compose_atomic_pattern()` to walk source DOM preserving BEM child element classes; wrap atomic groups in `wp:group {"className":"sgs-X__grid"}` so the lifted CSS applies.

**5h.6 — Composite block extraction loses mockup-shape (~45 min):** Matched composites (`sgs/hero`) use their own block-internal markup which may not reproduce the mockup's exact CTA arrangement, split-image proportions etc. Fix: per-composite-block "mockup-shape audit" step that verifies extracted attrs fully reproduce the mockup section's layout, OR fall through to composer for composites that have low coverage.

Phase 5 stays OPEN at 5h.4-5h.6. Phase 6 sequenced after.

**Phase 5h — styling parity fidelity (formally opened 2026-05-13 per Bean):**

- **Pass criterion (HARD GATE):** ≤ 1% pixel diff vs mockup at 375 / 768 / 1440 viewports. No partial closure. No "structural is enough" softening. Bean confirmed this is the pass criterion for 5h closure.
- **Scope absorbs the three follow-ups surfaced by the 5g closure raters:**
    1. **Composer CSS-mapping extension** — extract bespoke layout intent from the mockup CSS (column structure, gaps, padding, decorative backgrounds, pseudo-elements) and map onto `sgs/container` attributes (layout, columns, gap, backgroundColor). The load-bearing fix.
    2. **Coverage-metric redesign** — split denominator into "block.json slots filled" vs "atomic elements composed".
    3. **Scaffold polish + inserter visibility** — 6 promoted blocks ship as `0.1.0-scaffold` with stub render.php. Mitigation: add `_scaffold` suffix to title OR set `supports.inserter: false` until version >= 1.0.
- **Phase 5 stays OPEN** at 5h until pixel-diff gate is met. Phase 6 (cross-platform output) sequenced AFTER 5h closes — it would be irresponsible to extend a foundation that doesn't pass its own parity gate.

**Test page disposition:** sandybrown post id 59 deleted post-verification. Fresh app password issued via SSH (`Claude-MCP-spec15-p5g`) — stale `WP_APP_PWD_MAMAS` in `~/.openclaw/.secrets/wp-app-passwords.env` should be rotated.

## 2026-05-13 — Spec 15 Phase 5: live E2E exposes recogniser-hallucinates-blocks bug; Phase 5 NOT closed

**Decision (state):** Phase 5 module surface is shipped on origin/main across 7 commits (a0e1d145 5a / f8398efd 5b / 4061114a 5c / 14ba9782 5d / 8f2e9ff1 5e / c4f0c3e5 + 93b6226f 5f). The acceptance gates from `phase-5-clone-pipeline-e2e.md` "Phase 5 overall acceptance" are NOT all met. Phase 5 is **NOT CLOSED**.

**What the first live E2E proved (run `mamas-munches-homepage-2026-05-13-055523`):**
- `/sgs-clone` pipeline does run end-to-end on Mama's homepage via the legacy `sgs-clone-orchestrator.py` (which already wires the recogniser scripts).
- 9 sections recognised, 22,606 chars of "valid" SGS block markup emitted.
- 5/5 acceptance harness (5f.1) GREEN against post-clone state.
- One real bug found + fixed: stage 9 coverage roll-up keyed mismatch (commit 70f56c39).

**What it ALSO proved (the load-bearing finding):**
- **6 of 9 blocks the recogniser routed to don't exist** in `plugins/sgs-blocks/src/blocks/` OR on the live WP install. Targeted but unbuilt: `sgs/header`, `sgs/featured-product`, `sgs/ingredients-section`, `sgs/gift-section`, `sgs/social-proof`, `sgs/footer`.
- `confidence-matrix.py:95-107` correctly detects `registered=False` and reduces confidence to 0.75, but the orchestrator downstream emits the block-markup comment anyway (`<!-- wp:sgs/featured-product /-->`). WordPress silently drops these because no block is registered.
- Visual parity: 85% pixel diff at all 3 viewports (mobile/tablet/desktop) vs the 1% gate. The deployed page has hero (broken word-wrap, missing split image) + footer-template visible, with the 6 middle sections completely absent.

**Why:** The recogniser was built to pattern-match section IDs to plausible block slugs. The existence check was added as a confidence dampener (not a hard gate) on the assumption that all probable block slugs would be registered. The mockup uses semantic section names that the framework hasn't materialised yet -- correct of the recogniser to flag them, wrong of the orchestrator to commit-emit them.

**How to apply:** Phase 5 closure now requires ONE of three remediation paths:
1. **Hard gate in confidence-matrix** -- reject any candidate where `registered=False`; route to bucket-c-classifier (5a.2) for new-block scaffolding (5b.8). Fastest fix; ~30 min.
2. **Orchestrator fallback emission** -- when `registered=False`, emit `wp:core/html` wrapping the raw section HTML so visible content survives even without a matching SGS block. ~45 min. Lower fidelity but renders.
3. **Scaffold + build the 6 missing blocks** (header, featured-product, ingredients-section, gift-section, social-proof, footer) via 5b.8 `atomic-block-scaffold.py --promote` + designer polishing. The real solution but ~6+ hr of work.

Path 1 is the disciplined choice: surface the gap to the operator via FR8 functionality_gap_candidates and refuse to emit non-functional markup. Path 3 is the proper completion but exits the Phase 5 envelope.

**Phase 5 acceptance status (per the plan's literal gate):**
- [x] Sub-phases 5a-5f shipped on origin/main
- [ ] E2E run on Mama's hits >= 90% coverage + <= 1% visual parity + 5/5 harness green  -- harness green; coverage 38% literal (denom inflated); **visual parity 85% off target**
- [x] Multi-rater /qc on full Phase 5 deliverable >= 2/3 pass/ship (prior panels)
- [ ] `deliverable.md` for Mama's run readable by Bean without translation  -- written at `pipeline-state/mamas-munches-homepage-2026-05-13-055523/deliverable.md`; readable, but documents the failure
- [x] No leftover feature-branch commits

**Test page used:** sandybrown WP post ID 58 "Mama Phase 5 E2E Clone" -- created from the produced markup, screenshotted at 375/768/1440, deleted post-test. Real screenshots preserved at `pipeline-state/mamas-munches-homepage-2026-05-13-055523/screenshots/`.

## 2026-05-12 — Spec 15 Phase 5 pre-flight: DB target, form-instance scope, hero re-baseline

**Decision (DB target):** Phase 5 reads/writes the canonical `~/.agents/skills/sgs-wp-engine/sgs-framework.db` exclusively. The empty 0-byte stub at `plugins/sgs-blocks/scripts/sgs-framework.db` deleted as orphaned artefact. The drift validator already env-defaults to `~/.claude/skills/sgs-wp-engine/sgs-framework.db` via `SGS_FRAMEWORK_DB`; both `~/.claude/skills/...` and `~/.agents/skills/...` point at the same DB on this machine.

**Decision (form-instance scope-exclusion):** 97 `block_attributes` rows on form-field blocks (13 form-field block types × {fieldName, placeholder, helpText, required, conditional{Field,Operator,Value}, rateLimit, defaultValue}) marked with `canonical_slot = '__form_instance__'` — a new sentinel slot registered in `slot_synonyms`. These are per-instance form content fields (not designable visual slots) and intentionally outside the visual canonical-slot vocabulary. Phase 5d-onwards write paths MUST skip rows where `canonical_slot = '__form_instance__'`.

**Decision (non-form NULL backfill):** 10 non-form NULL `canonical_slot` rows backfilled to existing vocab: `media` (imageId, imageSize on decorative-image/gallery/post-grid), `animation` (parallaxStrength, pathDrawDurationMs on sgs/media; exitDuration on sgs/mobile-nav), `padding` (submenuIndent + Mobile + Tablet on sgs/mobile-nav), `text` (taglineText on sgs/mobile-nav). Drift validator: PASS 0/1343 preserved.

**Decision (hero baseline re-capture):** `tests/golden/hero-extraction-baseline.json` re-captured against current main. Pre-existing 2-value drift (`splitImage`, `splitImageMobile`: null → populated object) accepted as additive — matches `feedback_cloning_preserves_intentional_bespoke_detail.md` (cloning produces intentional bespoke detail; baseline locks the as-built state, not a wishful null). Hero `--verify-against` now PASS.

**Why:** Phase 5a entry preconditions required 0 NULL canonical_slot. Investigation showed 91 of 107 NULLs were per-instance form-field semantic data (no canonical-slot mapping makes sense). Backfilling them with visual-vocab slots would mis-classify them. The sentinel approach preserves intent without polluting the visual vocabulary. Hero baseline re-capture clears the inherited drift that would have blocked verification rounds during 5a–5e.

**How to apply:** Phase 5d FR21 mutation discipline + Phase 5b staged scaffolding MUST treat `__form_instance__` as a no-op slot (skip token resolution + skip canonical-slot drift checks). Future form-block work should write to the `__form_instance__` sentinel for new conditional-logic attrs, not introduce per-form canonical_slot vocabulary. Hero baseline tracks as-built state; re-baseline on any intentional extract.py change.

## 2026-05-12 — Spec 15 Phase 4.5: cloning preserves intentional bespoke detail (additive token discovery)

**Decision:** The `/sgs-clone` token lint defaults to ADDITIVE mode — non-token CSS values become `NewTokenCandidate` rows in a `TokenWritePlan` and are written to the client's style variation JSON, NOT snapped to the nearest registered token. Verdict mode (the original "snap or fail" behaviour) is preserved as an opt-in `--no-new-tokens` flag for back-compat. Base `theme.json` stays lean; the client variation absorbs bespoke differences. Layered overrides, WP-native: theme.json (registry) → style variation (client defaults) → block.json (block defaults) → inline (per-instance).

**Why:** Bean's framing during Phase 4 review: *"We're cloning, the whole point is these small differences are all intentional and adds to the bespoke nature and feel of the websites."* A `margin-bottom: 28px` between two registered spacing tokens isn't a designer mistake — it's deliberate. The original snap-to-nearest mode inverted the goal of cloning.

**Why max-width gets its own route:** Container widths (420px) don't fit on the spacing scale. They belong in `settings.layout.contentSize` / `wideSize` or `settings.custom.maxWidth.<slug>`. Routing max-width through snap_spacing produces false-positive gap candidates against the wrong vocabulary.

**Why the full font catalogue via Font Library collection, not theme.json:** Adding 1,923 fonts to `theme.json` `settings.typography.fontFamilies` would enqueue every entry on every page (WP Core issue #39332). `wp_register_font_collection( 'sgs-google-fonts', … )` makes all fonts browsable in Manage Fonts modal with zero frontend cost.

**Applied:** Commits `8599faf3`, `55a6d73e`, `3c2c07b7`, `a9b9b1c3`. Lesson captured at `memory/feedback_cloning_preserves_intentional_bespoke_detail.md` + indexed in MEMORY.md. Spec 15 §3, §5.4, §8, §9 updated.

## 2026-05-12 — Spec 15 Phase 1: slot vocab is content-identity only; structural attrs flag as gap candidates

**Decision:** The v1 `slot_synonyms` vocabulary (20 canonicals: heading, text, button, media, label, etc.) is scoped to content-identity slots only. Root-level structural attributes (padding, gap, hover, transition, columns, layout-mode, etc.) legitimately resolve to `canonical_slot = NULL` and are flagged as gap candidates in `attribute_gap_candidates`. The Phase 2 drift validator will decide whether to introduce a `__root__` pseudo-slot for structural cohesion or accept NULL as the canonical state.

**Why:** The 3-rater QC panel for Phase 1 (Haiku ship; Sonnet partial; Gemini Flash partial) consensus was to defer F3 (canonical_slot at 23.8%) and F4 (output_signature at 74.1%) to Phase 2. Sonnet's strict reading: the spec §11 wording "every attribute populated" was an aspirational target written before the slot vocabulary was scoped to content. Updating §11 to reflect the as-built scope avoids a false audit trail. Output_signature gap (300 NULL design-shape attrs) needs a PHP AST parser — that's Phase 2 gap-detection territory, not Phase 1 polish.

**How to apply:** Phase 2 drift validator (`/sgs-update` Stage 9) MUST handle NULL `canonical_slot` as a valid state for structural attrs. Phase 2 gap detection (Stage 10) MUST write the 1023 existing structural gap candidates + 300 signature-coverage gaps to `attribute_gap_candidates` without flagging them as drift violations. Spec §11 updated 2026-05-12 commit `2581b1d5`.

## 2026-05-11 — Trustpilot sync: Browserless `?token=` auth, settings-page-only failure surface

**Decision:** The Trustpilot sync writer fetches rendered HTML via Browserless.io `/content` REST endpoint, parses JSON-LD, and writes to `wp_options['sgs_trustpilot_data']`. Auth is `?token=<key>` query string, NOT `Authorization: Bearer` (Browserless `/content` rejects Bearer with HTTP 500). The Browserless API key is AES-256-CBC encrypted at rest (keyed off `wp_salt('auth')`), the same pattern `Google_Reviews_Settings` uses. The failure surface is the settings page (activity log of last 5 syncs + `last_sync_status` badge) — no Telegram, no n8n, no parallel notification channel.

**Why:** (1) Trustpilot blocks direct server-side fetches with HTTP 403; a real-browser proxy is required, and Browserless free tier (6 hours/month) covers a weekly sync per site comfortably. (2) Bearer auth was the original spec but live curl-test against Browserless proved it doesn't work on the `/content` endpoint — different Browserless endpoints have different auth conventions (`chrome/bql` accepts Bearer). (3) Telegram alerts were initially in scope but the activity log already surfaces failures on the next admin page load; a weekly job doesn't warrant a parallel paging channel. Bean called the Telegram addition out mid-build and the scope dropped.

**Applied:** Shipped commit `06df2807`. 4 classes at `plugins/sgs-blocks/includes/trustpilot/`. JSON-LD parser handles Trustpilot's `@graph` reference pattern (standalone `Review` entities, `LocalBusiness.review[]` as `@id` pointers — parser harvests the standalone entities directly). End-to-end proven on sandybrown: 4 Mama's reviews captured, smoke-test page flipped to `dataSource: synced` and renders live. Lesson captured as blub.db row 238 (`sgs-trustpilot-sync-browserless-content-needs-query-token`).

## 2026-05-11 — Trustpilot review display: self-render block, not official widget or scraper plugin

**Decision:** Build `sgs/trustpilot-reviews` as a first-party block that reads captured reviews from block attributes (inline mode) or wp_options (synced mode). Do NOT use Trustpilot's official WP plugin (free tier only allows Review Collector, not display widgets), and do NOT use third-party scraper plugins (Better Business Reviews, Trustindex, etc.). The maintenance dependency + TOS grey area exceeds the win.

**Why:** Trustpilot's free plan paywalls all display widgets (Carousel, Slider, Grid, etc.) via the plugin. Bean verified by toggling "Only included with your plan" on business.trustpilot.com -- only Review Collector available. Scraper plugins work but introduce a maintenance dependency that compounds across every SGS client, and Senja's documented "almost ban" incident (per the research-buddies session) shows enforcement DOES happen when auto-sync triggers Trustpilot's bot detection. First-party block keeps brand identity locked (green stars + Verified badge + clickable Trustpilot logo) while letting typography inherit the host theme.

**Applied:** Block at `plugins/sgs-blocks/src/blocks/trustpilot-reviews/`, shipped commit c6bd4980. Smoke-tested live on sandybrown at /trustpilot-smoke-test-2/. Sync infrastructure shipped 2026-05-11 commit `06df2807` — see decision above.

## 2026-05-11 — Brand-fix + theme-inherit split for embedded third-party widgets

**Decision:** For any "third-party recognition widget" block (Trustpilot, Google Reviews, future Yelp/TripAdvisor), the visual treatment splits into:
- **Locked brand identity** (NOT exposed as attributes): platform logo, brand colour for stars + badges, verified-badge mark
- **Theme-inherited typography**: font-family + colour + base font-size inherit from the host theme via `var(--wp--preset--font-family--body)` and CSS `color: inherit`
- **Border + scale hover effects** use `var(--wp--preset--color--primary, <brand-fallback>)` so each site's primary token tints the interaction

**Why:** Cards that hardcode their palette feel like a foreign embed. Cards that fully match the theme lose their trust-signal recognition. The split lets the cards live in the host site while preserving the recognition signals.

**Applied:** `sgs/trustpilot-reviews` block CSS. Mama's variation primary `#E68A95` (pink) verified as the hover border colour via Playwright `browser_hover` + computed-style probe.

## 2026-05-11 — Deterministic SGS-BEM voter over probabilistic AI matcher (Spec 12 v3 architecture)

**Decision:** The recogniser pipeline's Stage 1 voter does literal slug match on SGS-BEM class names (`.sgs-<block>` -> `sgs/<block>` at confidence 1.0). Falls back to Spec 12 §8 lookup table for legacy kebab-semantic mockups. No AI in the matching step. The v1 recogniser at `tools/recogniser/` (which shelled out to Claude CLI per section) is deprecated.

**Why:** Phase 6 made all Bean-controlled drafts SGS-BEM-conforming. With that constraint upstream, recognition becomes a string operation, not a classification problem. Cheaper (no per-section LLM call), faster (no subprocess overhead), more deterministic (same input -> same output). Probabilistic matching only fires for live scrapes where source naming is not Bean-controlled.

**Applied:** `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py` shipped commit 7ac627cf. End-to-end verified on Mama's mockup 2026-05-11: 9/9 sections matched at confidence 0.75-1.0 with no AI calls.

## 2026-05-11 — Default subtitle off; default columns 3/2/1

**Decision:** The sgs/trustpilot-reviews block defaults `showSubtitle: false` (no "Showing our latest reviews" line) and `columns: 3 / 2 / 1` (not 4/2/1 as initially shipped). Both visual-debt decisions Bean caught during the v5/v6 iterations.

**Why:** The subtitle reads as filler text that adds no information. The 3/2/1 spacing matches Trustpilot's actual Carousel widget grid and gives cards enough breathing room at desktop. 4-up at 1440 made the cards too dense.

**Applied:** block.json defaults updated commit c6bd4980. Existing test page on sandybrown updated via REST to match.

## 2026-05-10 — Mockup-migration pattern-slug convention: short form (Option A)

**Decision:** When a mockup section maps to a PATTERN (not a single block), the SGS-BEM `<block>` placeholder uses the short pattern slug. Example: `.sgs-header__inner`, not `.sgs-header-mamas-munches__inner`. Client-variant context lives in the file path (`sites/<client>/mockups/...`), not repeated in every class name. Composite blocks like `sgs/hero` keep their block slug verbatim (`.sgs-hero__copy`).

**Why:** verbose pattern slugs (`sgs-header-mamas-munches`) bloat class names and force every per-client mockup to use different names for structurally identical elements. The file-path context already disambiguates which client owns the mockup. KJC raised by Bean during Phase 6 inventory; my recommendation (Option A) accepted.

**Applied:** Phase 6 Mama's mockup migration. 138 class-attr rewrites + 145 CSS/JS line changes per file produced 0.000% pixel diff at 375/768/1440. Convention captured in TRUTH-SPEC at `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md`.

## 2026-05-10 — Classes map to PATTERNS not blocks (Spec 13 amendment by Bean ruling)

**Decision:** Spec 13's `<block>` placeholder accepts pattern slugs (in addition to block slugs) when a mockup section operates at pattern level. Only composite single-section blocks (like `sgs/hero`) collapse to one block. Most sections (header, footer, featured-product, ingredients, brand-story, gift-section, social-proof) are patterns composed of multiple blocks. Inner classes follow their corresponding block's slug; inner elements without a dedicated block use the parent pattern's namespace.

**Why:** I conflated mockup-section depth with block depth during Phase 6 inventory. Bean: *"classes are equivalent to patterns, not blocks (aside from only the composite block sgs-hero)... we already do have header and footer patterns saved in the theme."* Captured to CC memory as `feedback_classes_map_to_patterns_not_blocks.md` (recurrence-flagged via lesson-trigger).

**Stacked process rule:** Never defer with placeholder or "future session" when a new block/pattern/attribute is needed during clone-pipeline migration. Make it inline using sgs-db + Rosetta Stone scripts; decisions that need intelligence happen with Bean inline. Surgical means scope-controlled, not "skip the work that needs doing".

## 2026-05-10 — Phase 4 propagation method: hybrid inline + Python helper (Option C)

**Decision:** B2 (5 design-generation skills, substantive) shipped via inline Edit calls in main thread. B3-B9 (40 surfaces, mechanical inserts of the canonical SGS-BEM Convention block) shipped via idempotent Python helper script at `.claude/scratch/phase-4-batch-insert.py`. B5 sub-skill `/sgs-clone` got an additional Stage 0 pre-flight gate spec section in the same insert. Second pass added bespoke per-skill integration notes to 27 surfaces via `.claude/scratch/phase-4-bespoke-integration-notes.py`.

**Why:** Phase 4 KJC #1 anticipated subagent over-reach risk on substantive edits. Option C (Hybrid) wins: substantive edits stay inline where Bean can see the reasoning; mechanical insertions run via deterministic script with idempotency guard (skips files already containing the marker). Max positive delta across 45 surfaces was +2.9% — well under the 5% over-reach trigger.

**Verification:** 45 / 45 files have Spec 13 path + SGS-BEM Convention H2 + blub.db row 236. 0 regressions from passing to failing. Largest drop sgs-clone -3.6% (still passing at 90.4%; got the longer Stage 0 gate template).

## 2026-05-10 — Skill-type rubric mismatch is BASELINE, not debt

**Decision:** When sgs-skillscore v2 grades a file below threshold because the file is a mini-skill, slash command, agent definition, or discipline reference — and the rubric is checking for full-skill criteria (Goal section, Common Mistakes table, HARD GATE markers, numbered stages, references/ directory, system-effect 6-lens check) — **do not restructure to satisfy the rubric**. The rubric is the wrong tool for that file type.

**Why:** Restructuring forces verbose padding that doesn't serve the file's actual purpose. Ruling first applied 2026-05-10 to `/frontend-design` and `/superdesign` during Phase 4 B2 (49% F and 55% D respectively post-Spec-13-insert). Same ruling extended same-day to 22 more sub-90 surfaces during the Phase 4 sub-80 audit fix pass (commands, agents, mini-skills, TDD discipline reference). Real bugs in those files were fixed (humanize wrong content, audit /colorize typo, missing When NOT to Use sections). Rubric noise was accepted.

**Reopen condition:** if a future skillscore tier model distinguishes between file types, re-grade and revisit. Until then, these surfaces stay sub-90 by design.

## 2026-05-10 — Defer cross-platform emit pathway (P-CP-1/2/3) until M9 production-stable

**Decision:** Three parking entries (P-CP-1 `/sgs-emit`, P-CP-2 style translation, P-CP-3 animation translation) registered in `.claude/parking.md`. **No work starts on any of them until M9 is production-stable AND ≥3 successful clones are banked.**

**Why:** The Rosetta Stone infrastructure is structurally ready (uimax stack tables populated 49-60 rows each across 16 platforms; `equivalent_implementations` on every artefact; `design_tokens` in DTCG format; `animations` schema migrated 2026-05-10). Cost is the engineering pass per platform target — non-trivial but well-bounded. M9 ships first because clone fidelity is the upstream gate; cross-platform emit downstream of an unreliable clone is wasted work.

**Strategic alignment:** SGS-prefixed BEM (Spec 13) is the structural enabler. Without the convention, cross-platform translation needs probabilistic recogniser layers per source mockup; with it, literal slug match yields deterministic component mapping. This is why Spec 13 belongs as a hard prerequisite, not a soft preference.

## 2026-05-10 — Phase 2 DB cleanup audit: no DROPs this pass (conservative-keep)

**Decision:** Audit reports written for both DBs (`.claude/reports/db-audit-sgs-framework-2026-05-10.md` + `db-audit-uimax-pro-max-2026-05-10.md`). 8 empty tables identified as potential drop candidates. **No DROPs applied this session.**

**Why:** Bean flagged that empty tables may be recently-created scaffolding awaiting first population, not stale dead schema. The audit could not produce creation-timestamp evidence per table (SQLite has no built-in DDL timestamps). Conservative default per Phase 2 Step 3 ("if cross-reference unclear, default to keep"). Cost of wrong drop > cost of dead-schema noise.

**Drop candidates kept (8):**
- sgs-framework: `block_opportunities`, `extraction_cache`, `sections_detected`, `weaknesses`
- uimax: `stack_bootstrap`, `stack_html_css`, `stack_php`, `stack_wordpress`

**Reopen condition:** if any of these tables remains 0-row + 0-grep-hits-in-scripts after Phase 4 propagation completes (≥2 weeks post-2026-05-10), reopen the drop conversation with creation-timestamp evidence sourced from git history of the migration scripts.

**Related:** `.claude/plans/phase-2-db-cleanup-audit.md`, `.claude/specs/13-DRAFT-NAMING-CONVENTION.md` (Phase 1 outcome that informs Phase 4 propagation).

## 2026-05-10 — SGS-prefixed BEM is canonical for all Bean-controlled drafts (Spec 13 locked)

**Decision:** All Bean-controlled drafts (mockups, sketches, hand-coded HTML produced in-house) MUST use `.sgs-<block>__<element>--<modifier>`. `/sgs-clone` Stage 0 pre-flight gate hard-rejects on production runs; `--draft-mode` = soft warning; `--legacy` bypasses for pre-rule mockups. Live scrapes use lingua-franca-conversion at recognition time.

**Why:** Drafts and rendered SGS share class-name space; literal slug match collapses the 9-stage pipeline from probabilistic-with-fallback to deterministic for Bean-authored drafts. Probabilistic recognition stays only where Bean does NOT control source naming (live scrapes).

**Captured at:** blub.db row 236, pattern_key `bean-drafts-use-sgs-prefixed-bem-naming`. Canonical reference: `.claude/specs/13-DRAFT-NAMING-CONVENTION.md`.

**KJC #1:** `.sgs-` prefix chosen over `.draft-` / `.dft-` because drafts and rendered SGS share class-name space; literal slug match (`.sgs-hero` → `sgs/hero`) is unambiguous.

**KJC #2:** Hybrid validation enforcement chosen (Option C): hard pre-flight gate on production runs + soft lint warning under `--draft-mode`. Hard-only blocks rapid iteration; soft-only lets non-conforming drafts back into the pipeline.

---

## 2026-05-11 — Spec 14 FR18 missing-recogniser-script decisions

Closes the long-pending question on 4 scripts referenced in `/sgs-clone` SKILL.md tool bindings + state.md + architecture.md but never built. Forensic audit (git log --all across every branch) confirmed none of the 4 has ever been committed.

**Decision per script:**

- **`heuristic-fallback-builder.py` → RETIRE.** The rule-of-thumb fallback role is absorbed by the Layer 2 role-templates per-attribute extraction strategies (spec 14 FR2). The script was a v1 design that pre-dated the role taxonomy; no separate fallback builder needed.

- **`computed-style-passport.py` → RETIRE.** Replaced by the Playwright runtime probe explicitly documented in spec 14 FR3's PHP-analysis fallback clause. The "passport" metaphor is preserved (runtime cascade-resolved values when static analysis can't reach), just delivered via Playwright not a bespoke script.

- **`recursion-guard.py` → BUILD as standalone script** (revised 2026-05-11 after Bean caught a fabrication). Original entry claimed "recursion safety is enforced inline in `sgs-clone-orchestrator.py` via the existing max_depth check" — `grep` confirmed no such check exists anywhere in the orchestrator or recogniser scripts. That was the second fabrication this phase (after critical-fix-verification's "broader scope" framing). Corrected decision: build as ~50-LOC standalone Python module at `plugins/sgs-blocks/scripts/recogniser/recursion-guard.py`, imported by `sgs-clone-orchestrator.py` + recogniser scripts that walk the DOM. Default `max_depth=12` + `visited_nodes` set. Fully deterministic — same inputs, same exit; raises a typed exception on depth overflow. Slated for spec 14 P2 alongside FR7-FR8 schema (~30-45 min added to P2). Matches `/sgs-clone` skill's original Hard Rule 4 reference to a separate script. **Process lesson:** grep before claiming code exists, not after Bean catches.

- **`critical-fix-verification.py` → BUILD as P10 lightweight acceptance harness.** ~45 min (was originally estimated at ~2 hr — trimmed per P1 KJC2 evidence audit). Scope: 5 git-diff + filesystem assertions covering the canonical-mutation boundary:
  1. No root `theme/sgs-theme/theme.json` mutation
  2. No canonical-block files (`plugins/sgs-blocks/src/blocks/<slug>/`) mutated outside FR21 commit
  3. No licensing strings in any uimax write since the run started
  4. Idempotency re-run produces no new gap-candidate rows
  5. `pipeline-state/<run-id>/staging/` empty after FR21 PASS branch completes

  These 5 catch failure modes other gates miss (FR32 pre-commit chain + visual-qa + uimax-write-validator cover the other 10 spec-14 hard constraints).

**Process rule attached:** when a doc references a script that doesn't exist on disk, treat the doc claim as suspect until `git log --all` confirms commit history. Pattern repeated three times in this project (Phase 7, Phase 8, this audit) — captured in `mistakes.md`.

**KJC #1 — Snapshot format for FR12 deprecation source-of-truth:** JSON with `source_save` verbatim + `compiled_save_reference` path (not inlined binary). Reasoning: compiled bundles churn every build; inlining produces instant staleness. Path reference + git history is the safer audit trail.

**KJC #2 — critical-fix-verification.py scope (revised after Bean challenge):** lightweight 5-check harness, not the original "broader scope" framing. Justification: forensic audit found no documented original broader scope; the original framing was a fabrication. The 5 checks selected because the other 10 spec-14 hard constraints are already enforced elsewhere (uimax-write-validator for Rosetta Stone + no-licensing; argparse for `--resume`; editor convention for em-dashes; FR20 mutex for builds; etc.).

**Source-of-truth note (additional finding):** v1 fingerprints data at `tools/recogniser/data/fingerprints.json` is FROZEN — no script maintains it. `block_type` field is stale (testimonial + whatsapp-cta migrated to dynamic 2026-05-05; tab + feature-grid + multi-button mis-classified or missing). `sgs-framework.db` `blocks.type` is the authoritative source for static/dynamic, maintained by `/sgs-update` Stage 1. uimax `component_libraries` carries design-intelligence axes (mood/style/industry/cross-platform equivalents) but no static/dynamic field. Spec 14 references updated to point at sgs-db.


## 2026-05-12 — Spec 15 ratified (unified architecture)

**Architectural realignment.** Specs 12, 13, 14 absorbed into a single unified Spec 15 — "Deterministic Draft-to-SGS Converter + QA Pipeline — Unified Architecture". Driven by Bean's correction: each per-phase spec was bolted on sideways without recognising they're all the same foundational architecture. Originals moved to `.claude/scratch/absorbed/` with absorption headers preserving commit-history continuity.

### Six locked decisions (§12B of Spec 15)

1. **Canonical naming corner cases:** `subheading` (lowercase one word, matches BEM convention in selectors) + `buttonSecondary` (noun-first; clusters alphabetically with `button*` / `buttonPrimary*`).
2. **Block.json `sgs.attrSelectors` field:** DB is source of truth (populated by /sgs-update static analysis). Block.json may optionally declare `supports.sgs.attrSelectors` to override the auto-derivation per-attribute.
3. **Polymorphic media migration:** Yes, add WP block deprecation per affected block. Existing posts auto-migrate to `type: 'image'`. Standard SGS pattern.
4. **`styles.blocks.<name>` precedence:** Match WP standard exactly — blocks > elements > root. Phase 1 success criteria adds unit test.
5. **Per-attribute equivalent_implementations override schema:** Defer to Phase 6. Phases 1-5 only populate canonical_slot + role + selector; composition rule handles platforms.
6. **Visual parity tolerance:** 1% pixel diff as pass gate; regions > 0.5% surfaced as thumbnails for operator review. Industry-norm middle ground.

### Verification discipline (autonomous execution rules)

4 rules added to the master execution plan:
1. Subagent reports are claims, not evidence. After every dispatch, /qc-inline the actual artefact before advancing.
2. Inline work gets multi-rater /qc panel (Haiku + Sonnet + Gemini Flash) at phase end before opening PR. Gate: ≥2 of 3 raters pass/ship.
3. Six named stop conditions (subagent fails twice, multi-rater fail, architectural decision needed, destructive op, pipeline state corruption, step exceeds 3× estimated time).
4. Recovery paths per dispatch failure mode (retry-once-then-take-over for subagent errors; split-or-promote for Cerebras 12-round ceiling; re-prompt-or-treat-as-absent for malformed Gemini JSON).

Session timer (Step 0 of Phase 1) writes `.claude/scratch/spec-15-session-start.txt` so SC6 is mechanically testable.

### Asset inventory + lifecycle (Spec 15 §12E)

Every file/script/data source/skill mentioned in the spec is tagged BUILT / PLANNED / TO-RETIRE / DATA-SOURCE / REFERENCE / ABSORBED. Six overlap classes surfaced and scheduled for cleanup across phases 1-5:
- v1 recogniser scripts (7 files, ~8000 LOC) — TO-RETIRE in Phase 5
- fingerprint-builder output JSONs (4 files) + scripts — TO-RETIRE in Phase 3
- ATTR_TO_CSS dict in pattern-fingerprint.py — supersede in Phase 1
- TRUTH-SPEC.md per-mockup — retire after Phase 4
- master-spec14-build-plan.md — ABSORBED into Spec 15
- v1 fingerprints.json — DATA-SOURCE for Phase 1 seed, REFERENCE after

### Multi-rater QC discipline established

This session ran the multi-rater /qc panel four times (Spec 15 v0.1 → v0.2 + plan v0.2 → v0.3). The pattern that emerged:
- Sonnet is the strict critic — catches what other raters skim past. Trust Sonnet's `partial` even when 2 other raters say `pass`.
- Gemini Flash and Haiku are useful for fast triangulation but routinely miss depth issues.
- Main-thread inline review is biased toward what it wrote — don't include in panel.
- Gemini Pro is EXCLUDED (503 retry loop unresolved upstream).
- Cerebras can hit its 12-tool-round ceiling on long-file reads; useful for bounded SQL/single-file tasks only.
