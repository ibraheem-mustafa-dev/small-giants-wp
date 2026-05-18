# SGS Clone Pipeline — Reality Audit Round 2: Doc-to-Code Accuracy
**Auditor:** Claude Sonnet (Sonnet B)
**Date:** 2026-05-21
**Methodology:** Read-only code-as-evidence audit. Every verdict cites a script file:line. Doc citations are not evidence.
**Scope:** `sgs-clone-orchestrator.py` (1277+ lines) + `orchestrator/`, `recogniser/`, `lints/`, `value-matcher/`, `behavioural-analyser/`, `uimax-tools/`, `tools/recogniser-v2/`, `tools/recogniser/`, `scripts/*.py`

---

## Headline Verdict

The pipeline core (Stages 0–9, converter_v2, confidence matrix, attribute gap writing, recognition log) is substantially wired and load-bearing. The majority of Section A, C, D, and E specs are verified in code. The two most significant gaps are: (1) the confidence ≥ 0.7 gate described in Spec 15 §7 does not exist as an explicit gate — the pipeline maps anything below a registered block directly to `core/group` confidence 0.0, skipping the 0.7 threshold entirely; and (2) the `<1% pixel-diff per section` requirement (A.2, C.25) only fires when `--clone-url` is supplied — the default path uses `stub_capture` which returns 0.0 diff unconditionally and always passes. The F.47 DB-first rule is met for `convert.py` but `LEGACY_ROLE_LOOKUP` and `RETIRED_BLOCK_REMAP` remain hardcoded module-level dicts in `per-section-convention-voter.py`, which is a live Rule 11 partial violation.

---

## Rubric Grading Table

| ID | Item | Verdict | Evidence |
|----|------|---------|----------|
| R0.1 | 100% deterministic — no random seeds, no dict-ordering issues | PARTIAL | `uuid.uuid4()` at orchestrator.py:1591 (recognition_log row ids — non-deterministic, but advisory only). `datetime.now()` at orchestrator.py:394 baked into `run_id`. Output artefacts are timestamp-keyed. Functional output (block markup) is deterministic; run metadata is not. |
| A.1 | Scan full draft HTML page end-to-end | COVERED-VERIFIED | `convert_page.py:82` — `convert_page()` walks all top-level `<header>`, `<section>`, `<footer>` tags. `sgs-clone-orchestrator.py:948-981` — `--auto-section` loops every boundary from voter. |
| A.2 | <1% pixel-diff per section at 375/768/1440 | PARTIAL | `visual_qa_capture.py:97-122` — Playwright capture implemented. But `sgs-clone-orchestrator.py:2116-2118` — default path uses `stub_capture` (returns 0.0 diff). Only fires when `--clone-url` supplied. Real parity gate is opt-in, not mandatory. |
| A.3 | Group class sections into `sgs/container` UNLESS header/footer/hero | COVERED-VERIFIED | `convert.py:17,503-521` — unmatched section wrappers emit `sgs/container` with className. Registered blocks bypass the container wrap. `convert_page.py:109` — `is_top_level=True` on section walk. |
| A.4 | Match div classes to equivalent block, except section root | COVERED-VERIFIED | `convert.py:342-344` — atomic tag map. `confidence-matrix.py:232-313` — three-tier block/pattern/scaffold matching. |
| A.5 | Recognise hierarchy for parent and child blocks | COVERED-VERIFIED | `convert.py:2700-2871` — `walk()` recurse into children, inner_blocks lists assembled. Pass-through wrappers at `convert.py:3096-3111`. |
| A.6 | Translate attribute slot names | COVERED-VERIFIED | `db_lookup.py:119-180` — `_slot_synonyms()`, `slot_synonyms` table via `canonical_slot` + aliases. `convert.py:2302-2340` — `lift_subtree_into_block_attrs()` uses `block_attributes.canonical_slot`. |
| A.7 | Extract slot content (text, img src, link href) | COVERED-VERIFIED | `tools/recogniser-v2/extract.py` — legacy path for non-cv2 sections. `convert.py:1454-1460` — `_lift_styling_attrs()` for composite block roots. `db_lookup.py:123` — slot synonym DB lookups. |
| A.8 | Unmatched block → scaffold new OR existing-block extension | COVERED-VERIFIED | `sgs-clone-orchestrator.py:1462-1560` — `stage_9b_autonomy_chain()` scaffolds via `atomic-block-scaffold.py`. `confidence-matrix.py:270-283` — Tier 3 scaffold discovery. |
| A.9 | Report unconverted items with diagnostic info | COVERED-VERIFIED | `sgs-clone-orchestrator.py:1620-1769` — `stage_9_report()` writes `leftover-buckets.json` + `operator-review.html` + `gap-review.md`. |
| B.10 | Full HTML scan completeness — silent skip? | PARTIAL | `convert_page.py:62-79` — only `<header>`, `<section>`, `<footer>` tags collected. `<div>`, `<main>`, `<article>` as top-level sections are silently skipped unless body-fallback fires. Fallback at `convert_page.py:96-100` only triggers when zero sections found — so a page with a top-level `<main>` + one `<section>` child would return only the `<section>`. |
| B.11 | Hierarchy: nested DOM → nested SGS blocks? | COVERED-VERIFIED | `convert.py:2837-2871` — recursive `walk()` with `inner_blocks` accumulation. `convert.py:3066` — multi-block children from pass-through wrappers bubble up. |
| B.12 | Inner-block emission — composite blocks carry InnerBlocks through Stage 7? | COVERED-VERIFIED | `tools/recogniser-v2/extract.py:908-960` — `INNER_BLOCK_PATTERNS` dict keyed by slug. `_lift_inner_blocks()` at extract.py:960. `convert.py:2760-2765` — cv2 path also calls `_lift_inner_blocks`. |
| B.13 | CSS extraction completeness — all rules from mockup | PARTIAL | `stage_0_7_css_lift` at orchestrator.py:294 harvests `<style>` blocks + linked stylesheets. `convert.py:2870` — unmatched CSS rules go to `variation_buf`. However there is no systematic proof that every parsed CSS rule is assigned to one of the four destinations; the audit found no explicit "zero CSS loss" assertion in production paths (only in tests). |
| B.14 | Header/footer routing — detects + flags for alternate pipeline? | PARTIAL | `per-section-convention-voter.py:111-114` — `LEGACY_ROLE_LOOKUP` maps `"header"→"sgs/header"`, `"footer"→"sgs/footer"`. `confidence-matrix.py:232` — `sgs/header` and `sgs/footer` pass the registered-block gate. No alternate pipeline routing code found — blocks are matched like any other section, no flag emitted for a "header/footer alternate builder path". Doc claim of flagging for alternate builder is MISSING in code. |
| C.15 | Stage 0 pre-flight checks run | COVERED-VERIFIED | `sgs-clone-orchestrator.py:1906-1908` — `stage_0_1_bem_lint()`, `stage_0_5_token_lint()`, `stage_0_7_css_lift()` called in `main()` before Stage 1. |
| C.16 | Stage 0.1 BEM lint 3-mode (strict/draft/legacy) | COVERED-VERIFIED | `sgs-clone-orchestrator.py:97-148` — `stage_0_1_bem_lint()`. Strict: `sys.exit()` at line 147. Draft: warning. Legacy: bypassed at line 106. |
| C.17 | Stage 0.5 token-usage lint | COVERED-VERIFIED | `sgs-clone-orchestrator.py:159-266` — `stage_0_5_token_lint()`. Additive mode (default) and legacy `no_new_tokens` mode both implemented. |
| C.18 | Stage 1 boundary matches against `patterns.slug` + `slot_synonyms` | PARTIAL | `per-section-convention-voter.py` — voter nominates candidate slug from BEM class. `confidence-matrix.py:252-259` — Tier 2 checks `registered_patterns`. `slot_synonyms` table consulted in Stage 3 (db_lookup.py), not in Stage 1 boundary proper. Pattern-level match is there; slot_synonyms is post-Stage 1. |
| C.19 | Stage 2 confidence ≥ 0.7 gate | MISSING | `confidence-matrix.py:306-313` — the gate is `confidence == 0.0 AND block_name == "core/group"`. There is no explicit ≥ 0.7 threshold check. Spec 15 §7 mentions the 0.7 gate but it is not implemented. Low-confidence matches (e.g. 0.5 scaffold) pass through to extraction unchanged. |
| C.20 | Stage 3 uses `block_attributes.canonical_slot` + `derived_selector` | COVERED-VERIFIED | `db_lookup.py:7` — `block_attributes` table. `sgs-clone-orchestrator.py:898-906` — Stage 3 reads block.json attributes (not DB directly for slot list, but DB used in Stage 4 cv2 via `db.block_attrs()`). `convert.py:2321` — `lift_subtree_into_block_attrs()` uses `db.block_attrs(block_slug)`. |
| C.21 | Stage 4 ΔE2000 colour token snap | COVERED-VERIFIED | `value-matcher/match.py:32,134-138,252-255` — `delta_e_cie2000` from `colormath`. Thresholds: ≤2.0→1.0, ≤5.0→0.85, ≤10.0→0.6, >10.0→0.0. Called via `token_resolver.py` → `match.py`. |
| C.22 | Stage 5 default-inheritance against `styles.elements`/`styles.blocks` | COVERED-VERIFIED | `value-matcher/inheritance.py:2,9,156-166` — `styles.blocks.<block_slug>` and `styles.elements.<html_tag>` lookup implemented. Reachable via `supports_writer.py` → `inheritance.py`. |
| C.23 | Stage 6 block.json schema validation halts on failure | PARTIAL | `orchestrator/validate-stage-artifact.py` — stage artefact validation exists. `orchestrator/staged_merge.py` — schema violations at test line 139 prevent apply(). But `sgs-clone-orchestrator.py:2067` — `require_schema=False` is passed to `orchestrator_main.run()` in the legacy-artefact path, explicitly bypassing strict schema validation for the current main flow. |
| C.24 | Stage 7 WP block-comment markup with InnerBlocks | COVERED-VERIFIED | `tools/recogniser-v2/extract.py:429-441` — `serialize_block()` with optional `inner_blocks`. `convert.py:2948` — `emit_wp_block("sgs/heading", ...)`. All emissions use the `<!-- wp:slug {...} -->` pattern. |
| C.25 | Stage 8 per-section pixel-diff at 3 viewports | PARTIAL | `visual_qa_capture.py:97-122,191-207` — three viewports (375, 768, 1440) implemented in Playwright. `sgs-clone-orchestrator.py:2116` — defaults to `stub_capture` when `--clone-url` absent. Mandatory per-section diff gate not enforced. |
| C.26 | Stage 9 writes `attribute_gap_candidates` + `functionality_gap_candidates` | COVERED-VERIFIED | `sgs-clone-orchestrator.py:1675-1707` — `attribute_gap_writer()` and `functionality_gap_detector()` both called in `stage_9_report()`. Writes to uimax DB tables. |
| D.27 | R1 sgs/container auto-emitted at top-level | COVERED-VERIFIED | `convert.py:503-521` — unmatched nodes return `("sgs/container", ...)`. `convert_page.py:109` — `is_top_level=True` passed. |
| D.28 | R2 atomic-tag precedence (tag wins over BEM class) | COVERED-VERIFIED | `convert.py:342-344` — `ATOMIC_TAG_MAP` checked before BEM-class routing. `convert.py:465` — logic: block+no-element → emit block; otherwise resolve atomics first. |
| D.29 | R3 slot-claim precedence | MISSING | No `slot_claim` or `claimed` field found in `convert.py`. Pass-through handling at `convert.py:3096-3111` prevents double-emission but no explicit "slot already claimed → skip" guard was located. This is a gap relative to Spec 16 R3 as written. |
| D.30 | R4 status='built' filter | COVERED-VERIFIED | `db_lookup.py:100-107` — `SELECT slug FROM blocks WHERE status = 'built'`. Comment explicitly calls out the reasoning. |
| D.31 | R5 CSS-drives-emission: NEVER drops a CSS rule, 4 destinations | PARTIAL | `convert.py:2870` — `variation_buf.append(decls)` for unmatched CSS. `convert.py:2805,3093,3108,3121` — additional `variation_buf` writes. Four destinations (block attrs / WP native style.* / inline class / variation CSS) are implied but no single routing function with an exhaustive check enforces zero-loss. Silent drop risk remains unguarded. |
| E.32 | FR1 block-root slot harvest | COVERED-VERIFIED | `convert.py:2735` — "BLOCK-ROOT FAST PATH (FR1): lift subtree into typed attrs". `lift_subtree_into_block_attrs()` at line 2297. |
| E.33 | FR2 atomic-tag emission | COVERED-VERIFIED | `convert.py:342-344` — `ATOMIC_TAG_MAP` maps h1-h6 to `core/heading`, p to `core/paragraph`. Tags match before BEM routing. |
| E.34 | FR3 pass-through wrapper rule | COVERED-VERIFIED | `convert.py:3096-3111` — "PASS-THROUGH path" comment + logic. Children bubble up. |
| E.35 | FR4 top-level section container with className preserved | COVERED-VERIFIED | `convert.py:2845,2867` — `className` lifted from boundary class. "source CSS still binds (the className is preserved on the container)" at line 2867. |
| E.36 | FR5 media-map resolution | COVERED-VERIFIED | `convert.py:220-249` — `load_media_map()` + `_resolve_media_url()`. `sgs-clone-orchestrator.py:1098-1101` — media map loaded and passed to cv2. |
| E.37 | FR6 CSS 4-destination routing | PARTIAL | See D.31 — destinations exist in code but no exhaustive routing guard. Silent-loss path is possible for edge-case selectors. |
| E.38 | FR7 visual QA verification | PARTIAL | See A.2/C.25 — implemented in `visual_qa_capture.py` but stub-capture default bypasses it. |
| E.39 | FR8 legacy extract.py + extract_strategies.py + overrides/hero.py retired | CONTRADICTORY | Docs say retired. `sgs-clone-orchestrator.py:1217` — subprocess call to `tools/recogniser-v2/extract.py` is STILL LIVE for non-cv2-eligible sections. `tools/recogniser-v2/extract.py`, `extract_strategies.py`, `overrides/hero.py` all exist on disk. Legacy path fires on every section that is not `--converter-v2` + SGS-BEM canonical. This is the main runtime for uncertified mockups. |
| E.40 | FR9 `sgs/heading` composite block exists + converter routes to it | COVERED-VERIFIED | `src/blocks/heading/block.json:4` — `"name": "sgs/heading"`. `convert.py:2913-2948` — explicit routing to `sgs/heading` with schema lookup. |
| F.41 | Rule 1 licensing-keyword rejection | UNVERIFIABLE | No licensing/copyright keywords found in any pipeline script. No enforcement gate (e.g. keyword scanner hook) was located either. Rule is followed by absence, not enforced by code. |
| F.42 | Rule 2 Rosetta Stone (`equivalent_implementations.sgs_block`) | COVERED-VERIFIED | `uimax-write-validator.py:5-110` — full validator enforcing `equivalent_implementations.sgs_block` presence. `uimax_write.py` routes all writes through validator. `register_patterns.py:43-49` — routes uimax writes via `uimax_write.py`. |
| F.43 | Rule 3 Stage 1+2 at PATTERN boundaries | COVERED-VERIFIED | `confidence-matrix.py:252-259` — Tier 2 pattern match. `register_patterns.py:6-18` — pattern registration after successful clone. |
| F.44 | Rule 4 slot list auto-derived from block.json | COVERED-VERIFIED | `sgs-clone-orchestrator.py:898-906` — Stage 3 reads block.json attributes and auto-derives slots with `"attribute_role": "auto-derived"`. |
| F.45 | Rule 5 full CSS scan, zero silent loss | PARTIAL | CSS is harvested (Stage 0.7) and variation_buf accumulates unmatched rules. No zero-loss assertion in production runtime. See D.31/E.37. |
| F.46 | Rule 8 coverage gate `unresolved_slots == 0` | MISSING | `simple_html_review_report.py:138` — displays coverage percentage. No code found that HALTS or flags the pipeline when `unresolved_slots > 0`. Coverage is reported, not gated. |
| F.47 | Rule 11 DB-first (no banned hardcoded dicts in convert.py / per-section-convention-voter.py) | PARTIAL | `convert.py:1044-1057` — `_css_prop_to_suffix()` and `_breakpoint_suffixes()` are DB-driven replacements — PASS. `per-section-convention-voter.py:101-131` — `LEGACY_ROLE_LOOKUP` (18 entries) and `RETIRED_BLOCK_REMAP` (1 entry) remain as module-level hardcoded dicts — FAIL for voter script. Both are used at `voter.py:277-280`. |
| F.48 | Rule 12 Playwright wired vs Chrome DevTools MCP doc-only | COVERED-VERIFIED | `visual_qa_capture.py:88-122` — Playwright via Node subprocess (`require('playwright')`). Chrome DevTools MCP appears in no production script. Playwright is the real wiring. |
| F.49 | Rule 13 cv2 targets WP PAGES not POSTS | PARTIAL | `reports/brand-walkdown-2026-05-19/upload_and_patch.py:74-92` — `--target page` default, correct. `wp_integration.py:153-211` — `build_deploy_command()` takes `post_id` without enforcing `post_type=page`. No page-type enforcement in the deploy command builder itself. |
| F.50 | Rule 14 widthMode semantic emission within ±5% | COVERED-VERIFIED | `convert.py:1759,1941-1960` — `_get_theme_widths()` resolves `contentSize`/`wideSize` from theme.json. `convert.py:1953` — `attrs.setdefault("widthMode", "full")` and `attrs.setdefault("widthMode", matched)`. Semantic emission wired. |
| F.51 | Chrome DevTools MCP wiring — actually in code or doc-only? | MISSING | No Chrome DevTools MCP calls found in any production script. All browser automation uses Node/Playwright subprocess. Chrome DevTools MCP is doc-only for this pipeline. |
| G.52 | Catalogue-utilisation references | UNVERIFIABLE | No catalogue-utilisation metric or reference found in production scripts. The concept may be doc-only or implied by gap-detection outputs. |
| G.53 | operator-review.html surfaces every leftover | COVERED-VERIFIED | `simple_html_review_report.py:55-92` — renders all `leftover_buckets` dict entries. `sgs-clone-orchestrator.py:1728-1738` — subprocess call with `--buckets` path. |
| G.54 | +REGISTER writes to BOTH sgs-db `patterns` AND uimax `patterns` | COVERED-VERIFIED | `register_patterns.py:6-18` — steps 1 (PHP file), 2 (sgs-db INSERT), 3 (uimax INSERT). `_insert_sgs_pattern()` and `_insert_uimax_pattern()` are distinct functions. Rosetta Stone path confirmed via `uimax_write.py`. |

---

## Section Commentary — Surprising Findings

**C.19 is a true gap, not a documentation gap.** The 0.7 threshold is mentioned in Spec 15 §7 but no matching gate exists in `confidence-matrix.py`. The only effective gate is the hard drop to `core/group` confidence 0.0. Scaffold matches at 0.5 and secondary class matches between 0.0 and 1.0 pass through without any minimum threshold check. This is an active risk: a 0.5-confidence scaffold match will proceed to extraction where a human review should be the gate.

**F.39 (legacy extract.py) is the most consequential gap.** The docs say extract.py is retired or being retired, but it remains the live production path for every non-cv2-eligible section (`sgs-clone-orchestrator.py:1214-1248`). cv2 only fires when `--converter-v2` is passed AND the boundary's class signature is SGS-BEM canonical. The vast majority of live scrapes (non-Bean-controlled sites) run through `tools/recogniser-v2/extract.py` via subprocess. The retirement claim is aspirational, not factual.

**require_schema=False bypasses the Stage 6 halt.** `sgs-clone-orchestrator.py:2127` passes `require_schema=False` to `orchestrator_main.run()`. This was described as temporary ("legacy artefact shapes feed the merger") but it means the block.json schema validation halt described in C.23 does not fire in the current main production path.

**F.47 — voter dicts are not DB-first.** `LEGACY_ROLE_LOOKUP` and `RETIRED_BLOCK_REMAP` in `per-section-convention-voter.py` are hardcoded module-level dicts. The migration rule says convert.py must be DB-first, and it is; but the voter script was not migrated. `LEGACY_ROLE_LOOKUP` is 18 entries that would fit naturally into the `slot_synonyms` or `blocks` table.

---

## Section H — Script Lifecycle Catalogue

### `plugins/sgs-blocks/scripts/`

| Script | Status |
|--------|--------|
| `sgs-clone-orchestrator.py` | keep-canonical — entry point |
| `orchestrator/orchestrator_main.py` | keep-canonical — Phase 5e composition |
| `orchestrator/converter_v2/convert.py` | keep-canonical — cv2 converter |
| `orchestrator/converter_v2/convert_page.py` | keep-canonical — full-page entry |
| `orchestrator/converter_v2/db_lookup.py` | keep-canonical — DB access layer |
| `orchestrator/preflight_chain.py` | keep-canonical — preflight |
| `orchestrator/staged_merge.py` | keep-canonical — merge + rollback |
| `orchestrator/autonomy_gate.py` | keep-canonical — autonomy decision |
| `orchestrator/staged_output.py` | keep-canonical — artefact paths |
| `orchestrator/register_patterns.py` | keep-canonical — +REGISTER tail |
| `orchestrator/token_resolver.py` | keep-canonical — token snap |
| `orchestrator/variation_router.py` | keep-canonical — token writes |
| `orchestrator/supports_writer.py` | keep-canonical — supports decision |
| `orchestrator/modifier_extractors.py` | keep-canonical — BEM modifier signals |
| `orchestrator/stage1_boundary_hook.py` | keep-canonical — lingua franca enrichment |
| `orchestrator/lingua_franca.py` | keep-canonical — convention conversion |
| `orchestrator/visual_qa_capture.py` | keep-canonical — Playwright QA capture |
| `orchestrator/trace.py` | keep-canonical — diagnostic tracing |
| `orchestrator/wp_integration.py` | keep-canonical — WP deploy chain |
| `orchestrator/expected_rules.py` | keep-canonical — debug baseline |
| `orchestrator/critical-fix-verification.py` | keep-canonical — FR21 acceptance |
| `orchestrator/media-sideload.py` | keep-canonical — image staging |
| `orchestrator/attribute-staged-apply.py` | keep-canonical — staged attr apply |
| `orchestrator/functionality-bulk-apply.py` | keep-canonical — functionality apply |
| `orchestrator/mutex.py` | keep-canonical — run mutex |
| `orchestrator/attribute-staged-apply.py` | keep-canonical |
| `recogniser/per-section-convention-voter.py` | keep-canonical — Stage 1 |
| `recogniser/confidence-matrix.py` | keep-canonical — Stage 2 |
| `recogniser/leftover-bucket-router.py` | keep-canonical — Stage 9a |
| `recogniser/simple_html_review_report.py` | keep-canonical — operator HTML |
| `recogniser/attribute-gap-writer.py` | keep-canonical — gap DB writes |
| `recogniser/functionality-gap-detector.py` | keep-canonical — behaviour gaps |
| `recogniser/gap-review-report.py` | keep-canonical — markdown report |
| `recogniser/recursion-guard.py` | keep-canonical — recursion safety |
| `recogniser/bucket-c-classifier.py` | keep-canonical — scaffold role classifier |
| `recogniser/confidence-matrix.py` | keep-canonical |
| `lints/bem-lint.py` | keep-canonical — BEM validation |
| `lints/token-lint.py` | keep-canonical — token validation |
| `value-matcher/match.py` | keep-canonical — ΔE2000 + spacing match |
| `value-matcher/inheritance.py` | keep-canonical — WP default inheritance |
| `orchestrator/atomic-block-scaffold.py` | keep-canonical — scaffold generator |
| `uimax-tools/uimax_write.py` | keep-canonical — uimax chokepoint |
| `uimax-tools/uimax-write-validator.py` | keep-canonical — row-213 enforcement |
| `uimax-tools/sgs-update-uimax-sync.py` | keep-canonical — /sgs-update stages 3-4 |
| `uimax-tools/seed-block-compositions.py` | keep-but-unique — one-shot seed, idempotent |
| `generate-block-reference.py` | keep-canonical — spec doc regeneration |
| `audit-block-uniformity.py` | keep-but-unique — standalone audit tool |
| `build-font-collection.py` | keep-but-unique — font catalogue generator |
| `pattern-classify.py` | inspect — relationship to recogniser unclear |
| `pattern-fingerprint.py` | inspect — relationship to recogniser unclear |
| `pattern-register.py` | inspect — may duplicate register_patterns.py |
| `gap-detection/detect.py` | inspect — may overlap with recogniser/attribute-gap-writer |
| `gap-detection/triage.py` | inspect — overlap with leftover-bucket-router unclear |
| `gap-detection/coverage-ab-mining.py` | inspect |
| `gap-detection/coverage-de-mining.py` | inspect |
| `gap-detection/apply-css-var-bridge.py` | inspect — may be superseded by variation_router |
| `gap-detection/apply-fanout-proposals.py` | inspect |
| `gap-detection/apply-phase-3.5-vocab.py` | inspect — likely one-shot migration |
| `gap-detection/canonicalise-pass-2.py` | inspect — one-shot migration candidate |
| `gap-detection/canonicalise-slot-only.py` | inspect — one-shot migration candidate |
| `behavioural-analyser/assign-canonical.py` | inspect — may be superseded by db_lookup |
| `behavioural-analyser/backfill-coarse-roles.py` | inspect — likely migration one-shot |
| `behavioural-analyser/backfill-from-json-catalogue.py` | inspect |
| `behavioural-analyser/extract-signatures.py` | inspect |
| `fingerprint-builder/audit-attr-vocabulary.py` | retire — superseded by v2 |
| `fingerprint-builder/audit-attr-vocabulary-v2.py` | keep-but-unique |
| `drift-validator/validate.py` | keep-but-unique |
| `migrations/*.py` | retire — one-shot migration scripts, already applied |

### `tools/`

| Script | Status |
|--------|--------|
| `tools/recogniser-v2/extract.py` | keep-canonical — still live production path for non-cv2 sections |
| `tools/recogniser-v2/extract_strategies.py` | keep-canonical — dependency of extract.py |
| `tools/recogniser-v2/overrides/hero.py` | keep-canonical — live override for extract.py |
| `tools/recogniser-v2/utils.py` | keep-canonical |
| `tools/recogniser/recogniser.py` | retire — fully superseded by confidence-matrix + voter |
| `tools/recogniser/section_detector.py` | retire — functionality moved to voter |
| `tools/recogniser/fingerprint_indexer.py` | inspect |
| `tools/recogniser/output_router.py` | inspect |
| `tools/recogniser/serialiser.py` | retire — superseded by emit_wp_block in convert.py |
| `tools/recogniser/style_extractor.py` | inspect — may overlap with convert.py CSS parsing |
| `tools/recogniser/patch-featured-product.py` | retire — one-shot patch script |
| `tools/recogniser/test_matchers.py` | keep-but-unique — test coverage |

### `scripts/` (root-level)

| Script | Status |
|--------|--------|
| `scripts/pixel-diff.py` | keep-canonical — per-section pixel diff tool |
| `scripts/lint-naming-conventions.py` | keep-canonical — CI naming linter |
| `scripts/lint-patterns-for-personal-data.py` | keep-canonical — PII lint |
| `scripts/brand-palette-sampler.py` | keep-but-unique |
| `scripts/sgs-block-grep.py` | keep-but-unique |
| `scripts/qc-anti-cheat.py` | keep-canonical — QC integrity |
| `scripts/qc_anti_cheat_checks.py` | inspect — possible duplicate of qc-anti-cheat.py |
| `scripts/qc-correctness-regression.py` | keep-canonical |
| `scripts/qc-coverage-honesty.py` | keep-canonical |

---

## Top 10 Blocking Gaps

1. **C.19 — No confidence ≥ 0.7 gate.** Spec 15 §7 claims sections below 0.7 confidence are deferred or operator-reviewed. Code maps everything non-zero directly to extraction. Fix: add explicit threshold check in `confidence-matrix.py` or `stage_4_5_6_7_8_extract()`.

2. **E.39 / F.39 — Legacy extract.py is not retired.** `tools/recogniser-v2/extract.py` is the live production path for all non-cv2 sections. The claim of retirement is false. Retirement must be tracked explicitly — either cv2 coverage must reach 100% or the retirement milestone must be removed from docs.

3. **A.2 / C.25 — Pixel-diff gate is opt-in only.** `--clone-url` is required for real Playwright capture. Stub capture returns 0.0 unconditionally. The <1% spec is unenforceable on most runs. Fix: make `--clone-url` required, or add a warning gate when stub mode is used.

4. **C.23 — `require_schema=False` bypasses Stage 6 halt.** `sgs-clone-orchestrator.py:2127`. Fix: remove the override once legacy artefact shapes stabilise, or add a transitional schema migration.

5. **F.46 — Rule 8 coverage gate missing.** `unresolved_slots` is reported in `operator-review.html` but never gates the pipeline. Fix: add a halt or warning in `stage_9_report()` when coverage is below threshold.

6. **B.10 — Top-level `<main>`, `<div>`, `<article>` sections silently skipped.** `convert_page.py:62` only scans `<header>`, `<section>`, `<footer>`. A mockup using `<main>` as a page wrapper would drop content unless it is the only top-level element. Fix: extend `find_top_level_sections()` to include `<main>`.

7. **D.29 — Slot-claim precedence (R3) not implemented.** No `claimed` flag or `slot_claim` guard found in `convert.py`. Multiple sibling nodes could claim the same slot in edge cases. Fix: add a per-walk `claimed_slots` set and skip already-claimed slots.

8. **F.47 — `LEGACY_ROLE_LOOKUP` and `RETIRED_BLOCK_REMAP` are hardcoded in voter.** Rule 11 requires DB-first. These 19 entries should migrate to `slot_synonyms` / `blocks` tables. Fix: move to DB, add a deprecation warning when the hardcoded path fires.

9. **B.13 / D.31 / F.45 — CSS zero-loss is aspirational, not enforced.** No production-path assertion checks that every parsed CSS rule is routed to one of four destinations. Fix: add a `_unrouted_rules` counter in `walk()` and surface it in Stage 9 output.

10. **B.14 — Header/footer alternate builder pipeline not wired.** Docs reference an alternate pipeline for header/footer sections. Code maps them to `sgs/header` / `sgs/footer` via the standard confidence-matrix path with no special routing. Fix: either wire the alternate builder or remove the doc claim.

---

## Top 10 Cleanup Candidates

1. `tools/recogniser/recogniser.py` — fully superseded by voter + confidence-matrix.
2. `tools/recogniser/serialiser.py` — superseded by `emit_wp_block()` in convert.py.
3. `tools/recogniser/patch-featured-product.py` — one-shot patch script.
4. `scripts/gap-detection/canonicalise-pass-2.py` and `canonicalise-slot-only.py` — migration one-shots, likely already applied.
5. `scripts/gap-detection/apply-phase-3.5-vocab.py` — migration one-shot.
6. `scripts/migrations/*.py` — all three migration scripts are one-shots; should move to an `archive/` subdirectory.
7. `scripts/fingerprint-builder/audit-attr-vocabulary.py` — superseded by v2 variant.
8. `scripts/gap-detection/apply-css-var-bridge.py` — likely superseded by variation_router.
9. `scripts/orchestrator/converter_v2/test_root_supports_lift.py` — not in `tests/` subdirectory; should be moved.
10. `scripts/qc_anti_cheat_checks.py` — possible duplicate of `qc-anti-cheat.py`; inspect before deletion.

---

## Confidence and Caveats

**Confidence: High** for Sections A, C, D, E, F (most items directly code-verified). **Medium** for G.52 (catalogue-utilisation concept could live elsewhere) and B.13/D.31/F.45 (CSS zero-loss is a negative claim — I cannot assert a rule is never dropped from a full audit of all code paths). **Low** for F.41 (licensing rejection — enforced by absence, not by code gate).

**Caveats:** (1) `tools/recogniser-v2/extract.py` exceeds 600 lines; this audit did not perform a deep review of extraction strategy coverage. (2) The `gap-detection/` subdirectory contains multiple scripts whose exact relationship to the production pipeline is unclear — all marked `inspect`. (3) The `orchestrator/converter_v2/tests/` suite was not run; test coverage claims are based on file presence, not execution.
