# Reality Audit — Sonnet C — Doc-to-Code Accuracy
## SGS Clone Pipeline — Round 2
**Date:** 2026-05-21  
**Auditor:** Claude Sonnet 4.6 (independent; no parallel output read)  
**Scope:** Code-as-evidence grading of 55 rubric items against primary scripts  
**Method:** Read-only. All verdicts cite file:line. No pipeline runs, no edits.

---

## Headline Verdict

The pipeline has a **working skeleton that covers roughly 60% of documented behaviour at code level**. The orchestrator, converter_v2, and recogniser form a coherent chain. The most critical architectural rules (status='built' filter, DB-first lookups, slot_synonyms via DB, sgs/container default, atomic-tag precedence, SKIP_TOP_LEVEL_TAGS) are verified in code. The biggest gap is the **visual-QA closure gate**: autonomy_gate.py defaults to full-page diff with `scope: "full-page"`, directly contradicting the binding rule that Stage 8 must use per-section cropped `--selector .sgs-{section}` diff at `<=1%`. The pipeline will pass sections it should fail. Chrome DevTools wiring is completely absent from all scripts. Stage 3 slot list is block.json-derived with `attribute_role: "auto-derived"` — the DB-driven canonical_slot lookup exists in db_lookup.py but Stage 3 does not call it. Several hard-coded lookup dicts remain despite the DB-first rule.

---

## Rubric Grading Table

| # | Item | Verdict | Evidence |
|---|------|---------|----------|
| **R0.1** | 100% deterministic output | PARTIAL | `uuid.uuid4()` at orchestrator:1591 (recognition_log row IDs); `datetime.now()` in run_id at orchestrator:394; converter_v2 `reset_pipeline_seed` called at orchestrator:976 — confirms seed reset exists. UUIDs in DB rows only, not in block markup output. Markup output is deterministic. |
| **A.1** | Full HTML scan | COVERED-VERIFIED | `--auto-section` flag at orchestrator:1815 delegates to voter's `--auto-section` mode. voter.py multi-section path documented at voter:21-25. Loop at orchestrator:981 iterates every matched boundary. |
| **A.2** | `<1%` pixel-diff per section × 3 viewports | PARTIAL | Three viewports wired [375, 768, 1440] at autonomy_gate:58. Threshold is `pass_threshold: 0.01` (=1%) at autonomy_gate:56. BUT scope is `"full-page"` not per-section — contradicts the binding rule. `scripts/pixel-diff.py` supports `--selector` at pixel-diff:323-327 but autonomy_gate never passes a selector. |
| **A.3** | Group sections into sgs/container except header/footer/hero | COVERED-VERIFIED | `SKIP_TOP_LEVEL_TAGS = {"header", "footer", "nav"}` at convert:371. `get_block_for_node` defaults to `("sgs/container", ...)` at convert:520-521. Hero routed via BEM match at confidence 1.0. |
| **A.4** | Match div classes to blocks except section root | COVERED-VERIFIED | `get_block_for_node` at convert:460 walks classes against `registered_block_slugs()` filtered to `status='built'` at db_lookup:107. Section root handled by SKIP_TOP_LEVEL_TAGS. |
| **A.5** | Hierarchy parent/child | COVERED-VERIFIED | `walk()` in convert.py recurses into child nodes; inner_blocks list built at convert:2837-2844 and 3056-3068. Recursion guard exists at recogniser/recursion-guard.py but not imported by convert.py directly (max_depth guard is in the standalone module only). |
| **A.6** | Translate slot names | PARTIAL | `canonical_slot_for()` exists in db_lookup:192 using slot_synonyms DB table. But Stage 3 `stage_3_slot_list` at orchestrator:870 reads block.json attributes directly and sets `attribute_role: "auto-derived"` — it does NOT call `canonical_slot_for()`. Slot translation happens inside converter_v2 walker but not in Stage 3 scaffold. |
| **A.7** | Extract slot content | COVERED-VERIFIED | `tools/recogniser-v2/extract.py` called at orchestrator:1217. converter_v2 `lift_attrs_for_block` at convert:524 lifts attributes per block schema. Token snap at orchestrator:1257-1265. |
| **A.8** | Unmatched scaffold OR extension | COVERED-VERIFIED | `stage_9b_autonomy_chain` at orchestrator:1462 scaffolds unrecognised_section entries. `atomic-block-scaffold.py` is the scaffolder. composer_fallback retired 2026-05-14 per comment at orchestrator:383. |
| **A.9** | Report unconverted with diagnostic | COVERED-VERIFIED | `leftover-bucket-router.py` called at orchestrator:1644. `operator-review.html` written at orchestrator:1728. `gap-review.md` at orchestrator:1720. `recognition_log` INSERT at orchestrator:1662. |
| **B.10** | Full HTML scan completeness | COVERED-VERIFIED | voter.py `--auto-section` mode; orchestrator loops all boundaries at orchestrator:981. |
| **B.11** | Hierarchy | COVERED-VERIFIED | `walk()` recursive at convert.py; `_lift_inner_blocks` at convert:960 for InnerBlock patterns. |
| **B.12** | InnerBlocks | COVERED-VERIFIED | `INNER_BLOCK_PATTERNS` dict at convert:908 maps block slugs to inner block patterns. `_lift_inner_blocks` at convert:960 walks matching child classes. |
| **B.13** | CSS extraction | COVERED-VERIFIED | `parse_css()` at convert:262 with brace-balanced media-query handling. Stage 0.7 CSS lift at orchestrator:294 harvests `<style>` blocks and linked stylesheets. DB-driven `css_property_suffixes()` at convert:1044. |
| **B.14** | Header/footer detection + alternate pipeline flagging | PARTIAL | Detection: SKIP_TOP_LEVEL_TAGS = {"header","footer","nav"} at convert:371 + LEGACY_ROLE_LOOKUP maps "header"/"footer" to sgs/header/sgs/footer at voter:111-114. Alternate builder pipeline: NOT wired. These sections are skipped/remapped but there is no dispatch to a separate theme-builder pipeline. The gap is acknowledged as "known" in docs but zero code exists for it. |
| **C.15** | Stage 0 — SGS-BEM lint | COVERED-VERIFIED | `stage_0_1_bem_lint` at orchestrator:97. strict/draft/legacy modes at orchestrator:105-147. |
| **C.16** | Stage 0.1 — token lint | COVERED-VERIFIED | `stage_0_5_token_lint` at orchestrator:159. Additive (TokenWritePlan) and legacy modes at orchestrator:188-265. |
| **C.17** | Stage 0.5 — CSS lift | COVERED-VERIFIED | `stage_0_7_css_lift` at orchestrator:294. Harvests inline `<style>` + linked stylesheets. Writes `theme/sgs-theme/styles/<client>.css`. |
| **C.18** | Stage 1 — boundary detection (patterns.slug NOT block-level) | PARTIAL | Stage 1 calls voter subprocess which returns `candidate_block_slug` at voter:37. Pattern matching in Stage 2 `score_candidates` at confidence-matrix:176 returns `"pattern:<slug>"` sentinel. Stage 1 produces block-level candidate slugs; Stage 2 upgrades to patterns. Spec says Stage 1 itself should match at pattern level — it doesn't, Stage 2 does. Functionally equivalent outcome but not the described architecture. |
| **C.19** | Stage 2 — confidence matrix + slot_synonyms | PARTIAL | `score_candidates` at confidence-matrix:176 ranks candidates. Slot_synonyms are DB-driven at db_lookup:123 and used in converter_v2 walker. Stage 2 output is a ranked block/pattern list — it does NOT invoke slot_synonyms (that's a converter-time operation, not match-time). |
| **C.20** | Stage 3 — DB-driven canonical_slot | PARTIAL | Stage 3 reads block.json attributes at orchestrator:898-906. `canonical_slot_for()` exists in db_lookup:192 but is not called by Stage 3. All slots emitted with `attribute_role: "auto-derived"`. The DB canonical slot lookup happens downstream in converter_v2, not in Stage 3 scaffold. |
| **C.21** | Stage 4 — extract.py harvest | COVERED-VERIFIED | `stage_4_5_6_7_8_extract` at orchestrator:927 calls `tools/recogniser-v2/extract.py` via subprocess at orchestrator:1215. |
| **C.22** | Stage 4.5 — token snap | COVERED-VERIFIED | `token_resolver().resolve_batch()` at orchestrator:1262. Gap candidates flagged at orchestrator:1264. `_reflect_new_token_in_theme_json` at orchestrator:529 propagates new tokens across multi-section runs. |
| **C.23** | Stage 5/6 — supports writer + modifier extractors | COVERED-VERIFIED | `supports_writer` wired at orchestrator:552. `modifier_extractors` wired at orchestrator:565. Both called within the Stage 4-8 loop at orchestrator:1331+1353. |
| **C.24** | Stage 7 — compose + serialise | COVERED-VERIFIED | converter_v2 `convert_page()` / `walk()` composes block markup. `emit_wp_block` serialises to WP comment format. |
| **C.25** | Stage 8 — per-section `<1%` pixel diff | CONTRADICTORY | autonomy_gate:59 `scope: "full-page"` is the hard-coded default. The config file `visual_qa_config.json` could in theory override this but the `scope` key is never consumed by a selector path in autonomy_gate.py. `scripts/pixel-diff.py` supports `--selector` but autonomy_gate never passes one. This is a direct contradiction of the binding rule `feedback_per_section_cropped_pixel_diff.md`. |
| **C.26** | Stage 9 — writes gap-candidate tables | COVERED-VERIFIED | `insert_recognition_log` at orchestrator:1568 writes uimax `recognition_log`. `attribute_gap_writer` at orchestrator:1686 writes `attribute_gap_candidates`. `functionality_gap_detector` at orchestrator:1703 writes behavioural gaps. All three soft-fail safely. |
| **D.27** | R1 — sgs/container at top-level for unmatched | COVERED-VERIFIED | `get_block_for_node` default return `("sgs/container", None)` at convert:520-521. Top-level unmatched sections emit sgs/container. |
| **D.28** | R2 — atomic-tag precedence | COVERED-VERIFIED | `ATOMIC_TAG_MAP` at convert:342-343 maps h1-h6 → core/heading etc. Check at convert:477 fires before class-based matching — atomic tags ALWAYS win. |
| **D.29** | R3 — slot-claim | COVERED-VERIFIED | "Block exists + element → sgs/container; slot intent travels via className" at convert:503-505. `attr_name_for_slot_or_alias` at db_lookup:212 resolves slot-to-attribute mapping. |
| **D.30** | R4 — status='built' filter | COVERED-VERIFIED | `registered_block_slugs()` at db_lookup:96 queries `WHERE status = 'built'`. Comment at db_lookup:100 explicitly states why planned slugs must be excluded. |
| **D.31** | R5 — CSS drives emission to 4 destinations, NEVER drops | PARTIAL | `_lift_root_supports_to_style` at convert:1841 lifts to `style.*` (WP native). `_detect_grid_container_from_css` at convert:374 lifts to sgs/container layout attrs. className preserved at convert:533. Stage 0.7 CSS lift at orchestrator:294 writes variation CSS. Four destinations exist. However no single code path explicitly asserts all 4 routes are visited — it is implicit via the combination of functions. No explicit "NEVER drops" guard or test. |
| **E.32** | FR1 — block-root harvest | COVERED-VERIFIED | `# ---- BLOCK-ROOT FAST PATH (FR1)` at convert:2735. Triggers on known SGS block with no element. |
| **E.33** | FR2 — atomic-tag precedence | COVERED-VERIFIED | ATOMIC_TAG_MAP at convert:342; guard fires before class matching at convert:477. |
| **E.34** | FR3 — pass-through | COVERED-VERIFIED | `walker_branch_taken, branch="pass_through"` at convert:3102. Children bubble up to parent inner_blocks. |
| **E.35** | FR4 — top-level sgs/container | COVERED-VERIFIED | Default fallback in `get_block_for_node` at convert:520-521. |
| **E.36** | FR5 — media-map | COVERED-VERIFIED | `_MEDIA_MAP` module-level dict at convert:230. `load_media_map()` at convert:233. `_resolve_media_url` uses it. |
| **E.37** | FR6 — CSS 4 destinations NEVER drops | PARTIAL | Same as D.31 — four paths exist but no explicit gate asserting all 4 fire before dropping a declaration. |
| **E.38** | FR7 — visual QA | PARTIAL | Three viewports wired in autonomy_gate. Full-page only — per-section selector path missing (see C.25). |
| **E.39** | FR8 — legacy retirement | COVERED-VERIFIED | `RETIRED_BLOCK_REMAP` at voter:130 maps retired slugs to pattern slugs. Assertion at voter:137 prevents LEGACY_ROLE_LOOKUP collision. |
| **E.40** | FR9 — sgs/heading swap | COVERED-VERIFIED | `if target == "core/heading"` and `sgs_classes_h` check at convert:2907-2913. Swaps to sgs/heading for styled headings. |
| **F.41** | No licensing talk | COVERED-VERIFIED | Zero occurrences of "license", "copyright", "IP firewall", "provenance_license" in orchestrator or convert.py. |
| **F.42** | Rosetta Stone — uimax writes carry SGS-block translation | COVERED-VERIFIED | `register_patterns.py` at step 3 INSERTs into uimax patterns table at register_patterns:11. Routes through `uimax_write.py` chokepoint at register_patterns:43-48. |
| **F.43** | Pattern boundaries — sections map to patterns, not single blocks | COVERED-VERIFIED | Pattern tier at confidence 0.95 in confidence-matrix:17-18. `"pattern:<slug>"` sentinel at confidence-matrix:254 recognised by Stage 3 at orchestrator:885. |
| **F.44** | Auto-derive slot list from block.json | COVERED-VERIFIED | Stage 3 reads every attribute from block.json at orchestrator:898-906. All slots derived from block.json, no hardcoded lists. |
| **F.45** | Full CSS scan before emitting | COVERED-VERIFIED | `parse_css()` at convert:262 parses the full CSS text (all rules + media queries). Stage 0.7 harvests all CSS sources before Stage 1. |
| **F.46** | Coverage gate | PARTIAL | `compute_attribute_coverage` exists in pixel-diff:62. Emitted as `attribute-coverage%` alongside pixel-diff. But no hard gate in autonomy_gate.py that blocks on low coverage — it is a reporting metric only. |
| **F.47** | DB-first dicts | MOSTLY-COVERED | `css_property_suffixes()` DB-driven at convert:1044 (refactored 2026-05-17 per blub.db row 260). `registered_block_slugs()` DB-driven. LEGACY_ROLE_LOOKUP at voter:101 is still a hardcoded dict (12 entries) — flagged as "for pre-rule mockups" but still exists in the live code path. |
| **F.48** | Playwright vs Chrome DevTools distinction | PARTIAL | Playwright is wired in extract.py:143 and visual_qa_capture.py. Chrome DevTools: zero occurrences of "cdp", "devtools", "chrome-devtools" across all scripts. The SKILL.md rule about Chrome DevTools wiring has no implementation. |
| **F.49** | cv2 output to WP PAGES not POSTS | PARTIAL | `upload_and_patch.py` at line 92 defaults to `pages` endpoint. However `wp_integration.py:build_deploy_command` takes `post_id` with no post_type parameter — it uses the generic `wp eval-file` command which could target either. No explicit `post_type` guard in the deploy helper. |
| **F.50** | widthMode emission | COVERED-VERIFIED | `_detect_client_layout_widths` at convert:3191 + `_write_client_layout_widths` at convert:3193. `attrs.setdefault("widthMode", "full")` at convert:1953. `_LIFT_CONTEXT["theme_widths"]` loaded at convert:3194. |
| **F.51** | Chrome DevTools wiring | MISSING | No script reference found. Zero occurrences across all 118 Python scripts. |
| **G.52** | Catalogue utilisation | PARTIAL | `registered_block_slugs()` queries `status='built'` blocks. No explicit reporting of what percentage of the catalogue was used per run. |
| **G.53** | Operator-review HTML | COVERED-VERIFIED | `operator-review.html` written via `simple_html_review_report.py` subprocess at orchestrator:1729-1738. |
| **G.54** | +REGISTER writes to sgs-db + uimax patterns | COVERED-VERIFIED | `register_patterns.py` at step 1: PHP pattern file; step 2: sgs-framework.db INSERT; step 3: uimax patterns INSERT via uimax_write chokepoint. Called at orchestrator:2133-2168 on success. |

---

## Section Commentary — Surprising Findings

**R0.1 — UUIDs in recognition_log rows only.** The non-determinism concern is narrower than expected. UUIDs appear only in DB row IDs (orchestrator:1591) — not in block markup output. Markup output is deterministic. The `make_run_id` timestamp (orchestrator:394) makes run directory names non-deterministic but the artefacts inside are content-stable given identical input. This is acceptable for a pipeline that runs once per client session.

**C.18/C.20 — Stage 1 and Stage 3 architectural drift from spec.** The spec says Stage 1 should match at pattern level and Stage 3 should use DB-driven canonical_slot. In code, pattern matching happens in Stage 2, and Stage 3 uses `attribute_role: "auto-derived"` with no DB slot lookup. The outcomes converge — the converter_v2 walker does the DB slot resolution at emission time — but the stage boundary descriptions in spec documentation are inaccurate.

**C.25 / F.48 — Per-section pixel diff is the most critical uncoded requirement.** The binding memory rule `feedback_per_section_cropped_pixel_diff.md` says Stage 8 MUST use `--selector .sgs-{section}`, not full-page. autonomy_gate.py hardcodes `scope: "full-page"` at line 59 and the `scope` key is never translated to a Playwright selector path anywhere in the gate. The standalone `scripts/pixel-diff.py` supports `--selector` but is never called by the gate with one. This is the single most dangerous implementation gap — the gate will PASS sections with structural noise from WP block wrappers inflating the diff floor.

**F.47 — LEGACY_ROLE_LOOKUP still in voter.py.** The DB-first rule (blub.db row 260) says no new hardcoded lookup dicts. voter.py has a 12-entry `LEGACY_ROLE_LOOKUP` dict at line 101. The voter's own comment says it is "for pre-rule mockups via the --legacy flag" — so it is intentionally retained as a fallback. However it is also consulted in non-legacy paths when the DB read fails (soft-fail to empty set). This is a grey area: legitimately retained legacy code, but the DB-first spirit says it should eventually be migrated into the DB.

**F.49 — wp_integration deploy helper has no post_type guard.** The `build_deploy_command` function accepts `post_id` with no post_type. It builds a `wp eval-file` command that could target a post or page — the script that runs via eval-file determines the type. This is not a code bug (the PHP script decides the type) but there is no validation at the Python level that the operator is targeting a page, not a post.

---

## Section H — Script Lifecycle Catalogue

| Script | Path | Classification |
|--------|------|----------------|
| `sgs-clone-orchestrator.py` | `scripts/` | keep-canonical — primary pipeline entry point |
| `converter_v2/convert.py` | `scripts/orchestrator/converter_v2/` | keep-canonical — DOM walker and block emitter |
| `converter_v2/db_lookup.py` | `scripts/orchestrator/converter_v2/` | keep-canonical — single DB read chokepoint |
| `converter_v2/convert_page.py` | `scripts/orchestrator/converter_v2/` | inspect — relationship to convert.py unclear |
| `orchestrator_main.py` | `scripts/orchestrator/` | keep-canonical — Phase 5 chain composer |
| `autonomy_gate.py` | `scripts/orchestrator/` | keep-canonical — needs per-section selector fix |
| `preflight_chain.py` | `scripts/orchestrator/` | keep-canonical |
| `staged_merge.py` | `scripts/orchestrator/` | keep-canonical |
| `staged_output.py` | `scripts/orchestrator/` | keep-canonical |
| `register_patterns.py` | `scripts/orchestrator/` | keep-canonical |
| `visual_qa_capture.py` | `scripts/orchestrator/` | keep-canonical — Playwright capture factory |
| `trace.py` | `scripts/orchestrator/` | keep-canonical |
| `token_resolver.py` | `scripts/orchestrator/` | keep-canonical |
| `variation_router.py` | `scripts/orchestrator/` | keep-canonical |
| `supports_writer.py` | `scripts/orchestrator/` | keep-canonical |
| `modifier_extractors.py` | `scripts/orchestrator/` | keep-canonical |
| `stage1_boundary_hook.py` | `scripts/orchestrator/` | keep-canonical |
| `wp_integration.py` | `scripts/orchestrator/` | keep-canonical |
| `atomic-block-scaffold.py` | `scripts/orchestrator/` | keep-canonical |
| `attribute-staged-apply.py` | `scripts/orchestrator/` | keep-canonical |
| `functionality-bulk-apply.py` | `scripts/orchestrator/` | keep-canonical |
| `media-sideload.py` | `scripts/orchestrator/` | keep-canonical |
| `critical-fix-verification.py` | `scripts/orchestrator/` | keep-canonical |
| `lingua_franca.py` | `scripts/orchestrator/` | inspect — role vs converter unclear |
| `mutex.py` | `scripts/orchestrator/` | keep-but-unique |
| `per-section-convention-voter.py` | `scripts/recogniser/` | keep-canonical — Stage 1 |
| `confidence-matrix.py` | `scripts/recogniser/` | keep-canonical — Stage 2 |
| `leftover-bucket-router.py` | `scripts/recogniser/` | keep-canonical — Stage 9a |
| `simple_html_review_report.py` | `scripts/recogniser/` | keep-canonical — Stage 9c |
| `attribute-gap-writer.py` | `scripts/recogniser/` | keep-canonical |
| `functionality-gap-detector.py` | `scripts/recogniser/` | keep-canonical |
| `gap-review-report.py` | `scripts/recogniser/` | keep-canonical |
| `recursion-guard.py` | `scripts/recogniser/` | keep-but-unique — not imported by convert.py |
| `bucket-c-classifier.py` | `scripts/recogniser/` | keep-canonical |
| `per-section-convention-voter.py` | `scripts/recogniser/` | keep-canonical |
| `confidence-matrix.py` | `scripts/recogniser/` | keep-canonical |
| `bem-lint.py` | `scripts/lints/` | keep-canonical |
| `token-lint.py` | `scripts/lints/` | keep-canonical |
| `match.py` | `scripts/value-matcher/` | inspect — not imported by orchestrator |
| `inheritance.py` | `scripts/value-matcher/` | inspect — not imported by orchestrator |
| `extract.py` | `tools/recogniser-v2/` | keep-canonical — Stage 4 extractor |
| `extract_strategies.py` | `tools/recogniser-v2/` | keep-canonical |
| `utils.py` | `tools/recogniser-v2/` | keep-canonical |
| `overrides/hero.py` | `tools/recogniser-v2/` | keep-canonical |
| `recogniser.py` | `tools/recogniser/` | retire — superseded by recogniser-v2 |
| `section_detector.py` | `tools/recogniser/` | retire — superseded |
| `style_extractor.py` | `tools/recogniser/` | retire — superseded |
| `fingerprint_indexer.py` | `tools/recogniser/` | retire — superseded |
| `output_router.py` | `tools/recogniser/` | retire — superseded |
| `serialiser.py` | `tools/recogniser/` | retire — superseded |
| `patch-featured-product.py` | `tools/recogniser/` | retire — one-shot patch |
| `test_matchers.py` | `tools/recogniser/` | retire with parent dir |
| `pixel-diff.py` | `scripts/` | keep-canonical — has `--selector` support needed by gate |
| `uimax_write.py` | `scripts/uimax-tools/` | keep-canonical — write chokepoint |
| `uimax-write-validator.py` | `scripts/uimax-tools/` | keep-canonical |
| `sgs-update-uimax-sync.py` | `scripts/uimax-tools/` | keep-canonical |
| `seed-block-compositions.py` | `scripts/uimax-tools/` | keep-but-unique — idempotent, one-shot |
| gap-detection scripts (6 files) | `scripts/gap-detection/` | inspect — not called by orchestrator |
| behavioural-analyser scripts (4 files) | `scripts/behavioural-analyser/` | inspect — DB back-fill tools, not pipeline |
| fingerprint-builder scripts (2 files) | `scripts/fingerprint-builder/` | inspect — audit utilities |
| drift-validator/validate.py | `scripts/drift-validator/` | keep-but-unique — DB health check |
| migrations (3 files) | `scripts/migrations/` | retire after confirming applied |
| `audit-block-uniformity.py` | `scripts/` | keep-but-unique — QC utility |
| `generate-block-reference.py` | `scripts/` | keep-but-unique — doc generator |
| `build-font-collection.py` | `scripts/` | keep-but-unique — one-shot |
| `pattern-classify.py` / `pattern-fingerprint.py` / `pattern-register.py` | `scripts/` | inspect — overlap with register_patterns.py |

---

## Top 10 Blocking Gaps

1. **Stage 8 pixel diff is full-page, not per-section.** autonomy_gate.py:59 `scope: "full-page"` — the gate will falsely pass sections that fail per-section closure. Fix: pass `--selector .sgs-{section_id}` into `capture()` for each boundary in the multi-section loop.

2. **Chrome DevTools wiring is entirely absent.** F.51 MISSING. Zero code across 118 scripts. The SKILL.md rule is orphaned.

3. **Stage 3 slot list does not call DB canonical_slot.** orchestrator:898-906 reads block.json attributes with `attribute_role: "auto-derived"`. The DB `slot_synonyms` table has canonical mappings that are never consulted at Stage 3. Slot resolution happens implicitly in converter_v2 but Stage 3 artefacts are the authoritative slot scaffold.

4. **autonomy_gate `scope` key is not wired to a selector path.** Even if `visual_qa_config.json` is edited to set `scope: "per-section"`, the gate has no code path that translates that value into a CSS selector passed to the capture callable.

5. **wp_integration `build_deploy_command` has no post_type validation.** The deploy helper builds commands that could target posts or pages. No Python-level guard enforces the P-USE-PAGES-NOT-POSTS rule at call time.

6. **header/footer alternate pipeline is completely unimplemented.** B.14 PARTIAL — sections are skipped/remapped but never dispatched to a theme-builder pipeline. The WP theme builder (block editor, template parts) path has no script representation.

7. **recursion-guard.py is not imported by converter_v2.** A.5 COVERED-VERIFIED on hierarchy but the standalone recursion guard module is unused by the converter. Deep mockups with excessive nesting could hit Python's default recursion limit without the guard firing.

8. **Coverage gate is advisory only, not a hard gate.** F.46 PARTIAL — `compute_attribute_coverage` in pixel-diff.py computes the metric but autonomy_gate.py does not consume it. A section can PASS autonomy gate with 0% attribute coverage.

9. **LEGACY_ROLE_LOOKUP consulted in soft-fail DB path.** If sgs-framework.db is temporarily unavailable, the voter falls back to an empty registered set AND will consult LEGACY_ROLE_LOOKUP for pattern routing decisions. This violates DB-first discipline in the failure mode.

10. **`value-matcher/match.py` and `value-matcher/inheritance.py` not imported by orchestrator.** Purpose unclear — may duplicate token_resolver.py functionality or be orphaned experimental code. Should be classified and either wired or retired.

---

## Top 10 Cleanup Candidates

1. **Retire `tools/recogniser/` entirely** — 7 files superseded by recogniser-v2. No imports from orchestrator verified.

2. **Migrate `LEGACY_ROLE_LOOKUP` to sgs-framework.db** — 12-entry hardcoded dict in voter.py:101. Should be a `legacy_role_mappings` table queryable alongside registered blocks.

3. **Consolidate `pattern-classify.py`, `pattern-fingerprint.py`, `pattern-register.py`** — three scripts in `scripts/` root that appear to overlap with `register_patterns.py` in the orchestrator. Roles need clarifying before one set is retired.

4. **Classify `gap-detection/` scripts** — 6 scripts not called by the orchestrator. May be standalone audit tools or orphaned experimental code.

5. **Classify `value-matcher/` scripts** — `match.py` and `inheritance.py` are not referenced by the orchestrator. Determine if they are superseded by `token_resolver.py`.

6. **Apply (and then retire) migration scripts** — 3 files in `scripts/migrations/` with date-stamped names. If already applied, they should be deleted.

7. **Remove `convert_page.py` overlap ambiguity** — `converter_v2/convert_page.py` exists alongside `convert.py`. The relationship is not clear from a read of the imports in the orchestrator.

8. **Wire `recursion-guard.py` into converter_v2 walker** — or document why Python's default recursion limit is sufficient for SGS mockup depths.

9. **Classify `lingua_franca.py`** — exists in orchestrator/ directory but its role vs converter_v2's own classification logic is unclear from directory inspection alone.

10. **Clean up `behavioural-analyser/` DB back-fill scripts** — 4 scripts that appear to be one-shot DB population tools. If the back-fill is complete, retire them or move to `scripts/migrations/`.

---

## Confidence and Caveats

**Confidence: Medium-High (70%).**

- All verdicts are grounded in file:line references from direct code reads.
- The three primary scripts (sgs-clone-orchestrator.py at 2,190 lines, convert.py at 3,282 lines, extract.py at 731 lines) were read in targeted sections, not exhaustively end-to-end. Long functions like `stage_4_5_6_7_8_extract` (roughly 500 lines) were sampled at entry, key branches, and exit.
- Some items marked PARTIAL may have additional implementation elsewhere that was not reached in the targeted read. In particular, `convert_page.py` and `lingua_franca.py` were not read in full.
- The autonomy_gate full-page vs per-section finding is high confidence — the `scope: "full-page"` default at line 59 and the absence of any selector path in `invoke_visual_qa` are conclusive.
- Chrome DevTools absence is high confidence — three independent grep patterns across all 118 scripts returned zero results.
