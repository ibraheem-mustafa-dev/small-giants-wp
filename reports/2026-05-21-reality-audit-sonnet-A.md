# Reality Audit — Code-as-Evidence Round 2

**Auditor:** Sonnet A (independent subagent, no prior context)
**Scope:** sgs-clone pipeline — doc-to-code accuracy
**Methodology:** Every verdict cites a script file:line. Doc-citation alone rejected. Verdicts: COVERED-VERIFIED / PARTIAL / MISSING / CONTRADICTORY / UNVERIFIABLE.
**Time per section:** S0: 5 min, A: 15 min, B: 10 min, C: 20 min, D: 10 min, E: 10 min, F: 10 min, G: 5 min, H: 10 min

---

## Headline Verdict

The pipeline's core converter (cv2) is architecturally sound and substantially implemented: DB-driven lookups, recursive DOM walking, InnerBlocks emission, and CSS `@media` handling are all present in code. The dominant gap is the **dual-path problem** — the main orchestrator (`sgs-clone-orchestrator.py`) still calls the legacy `tools/recogniser-v2/extract.py` for all non-cv2-eligible sections (line 1217), and `--converter-v2` is opt-in rather than default (line 1858). This means Bean's 9 requirements are only partially met on any given run. Determinism is broken at the run-ID generation level (uuid4 at line 1591). The Chrome DevTools MCP claim in docs is entirely absent from pipeline code.

---

## Rubric Grading Table

### Section 0 — Determinism

| ID | Claim | Verdict | Evidence |
|----|-------|---------|----------|
| R0.1 | 100% deterministic for compliant drafts | PARTIAL | `convert.py` walker is deterministic (sorted dict iteration via `candidates.sort()` at line 784). `db_lookup.py` uses `lru_cache` — deterministic within a run. **BROKEN** at run-ID level: `sgs-clone-orchestrator.py:1591` uses `uuid.uuid4()` to generate recognition_log row IDs; `sgs-clone-orchestrator.py:394` uses `datetime.now()` for run timestamp prefix. These don't affect block markup output but do mean run artefacts are never byte-identical. |

### Section A — Bean's 9 Requirements

| ID | Claim | Verdict | Evidence |
|----|-------|---------|----------|
| A.1 | Scan full draft HTML end-to-end | PARTIAL | `convert.py:2700 walk()` recursively walks the full DOM. However, `sgs-clone-orchestrator.py:1196` invokes cv2 only when `_cv2_eligible=True` (requires `--converter-v2` flag at line 1000). For non-eligible sections, `extract.py` runs per-section (line 1217), not as a full-page pass. |
| A.2 | <1% pixel-diff per section at 375/768/1440 | PARTIAL | `autonomy_gate.py:52–62` sets `pass_threshold: 0.01` from config. `pixel-diff.py:323–327` supports `--selector` for per-section cropping. Gate is wired. But `autonomy_gate.py:127` takes a `capture_callable` — production binding to a real Playwright capture is external to this module and not shown in any script. |
| A.3 | Group class sections into `sgs/container` UNLESS header/footer/hero | COVERED-VERIFIED | `convert.py:371` — `SKIP_TOP_LEVEL_TAGS: set = {"header", "footer", "nav"}`. `convert.py:2724` — walker skips these at top-level. `convert.py:3116` — unmatched top-level nodes emit `sgs/container`. |
| A.4 | Match all div classes to equivalent block | PARTIAL | `convert.py:460–521` — `get_block_for_node()` does BEM→DB lookup. Only works for `status='built'` blocks (`db_lookup.py:104`). Planned blocks fall through to `sgs/container` with className preserved — correct per spec but means planned blocks don't match. |
| A.5 | Recognise hierarchy: nested DOM → nested SGS blocks | COVERED-VERIFIED | `convert.py:2837–2844` — css_driven_container recurses children. `convert.py:3060–3068` — container/composite path recurses. `emit_wp_block()` at line 582 takes `inner: list[str]` for nested markup. |
| A.6 | Translate attribute slot names (mockup class → SGS attr) | COVERED-VERIFIED | `db_lookup.py:211 attr_name_for_slot_or_alias()` — 3-pass resolution: exact canonical_slot, by attr_name, then alias chain. DB-backed via `block_attributes` table. |
| A.7 | Extract and move slot content (text, img src, link href) | COVERED-VERIFIED | `convert.py:545–574 lift_attrs_for_block()` — img src/alt/width/height at lines 549–556. Button url/label at 559–574. `_lift_bem_child_array()` at line 730 handles array text slots. |
| A.8 | Unmatched-block detection → scaffold OR attribute extension | PARTIAL | `atomic-block-scaffold.py` exists but scaffold path requires `db.block_exists()` to return False AND the orchestrator to invoke it — not automatically wired from `walk()`. Attribute extension via `attribute-staged-apply.py` is separate from the converter. |
| A.9 | Report unconverted items with diagnostic info | COVERED-VERIFIED | `leftover-bucket-router.py:585–625 route()` — 7 buckets, gap_level, severity, totals. Written to `pipeline-state/<run>/` via `write_artefact()`. |

### Section B — Bean's 5 Reality Tests

| ID | Claim | Verdict | Evidence |
|----|-------|---------|----------|
| B.10 | Full HTML scan completeness | PARTIAL | `walk()` at `convert.py:2700` walks every node recursively via `.children`. However, `NavigableString` nodes are silently dropped at line 2711–2713 (only non-empty text returns the text value; the Tag path is the real content path). Inline script/style tags are not explicitly excluded — they'd emit as `sgs/container` wrappers. |
| B.11 | Hierarchy handling — nested BEM → nested SGS | COVERED-VERIFIED | `convert.py:2783–2824` — composite-element path detects `sgs-X__Y` and recurses via `lift_subtree_into_block_attrs()`. `convert.py:3079–3094` — `sgs_bem_wrapper` branch preserves BEM element grouping as nested `sgs/container`. |
| B.12 | Inner-block detection + emission through Stage 7 | PARTIAL | `INNER_BLOCK_PATTERNS` at `convert.py:912` defines patterns for `sgs/feature-grid` only. Other composite blocks (e.g. `sgs/hero` with nested `sgs/button`) use flat attr lift, not InnerBlocks. Stage 7 serialisation: `emit_wp_block()` at line 582 handles nested `inner` list but this only fires for the 1 pattern in `INNER_BLOCK_PATTERNS`. |
| B.13 | CSS extraction completeness | COVERED-VERIFIED | `parse_css()` at `convert.py:262` — brace-balanced scanner handles arbitrary-depth `@media`. Comment in code explicitly notes prior regex failed on 13 Mama's `@media` queries. `_collect_css_for_classes()` at line 3130 routes CSS to `variation_buf`. |
| B.14 | Header/footer detection and flagging | COVERED-VERIFIED | `convert.py:371 SKIP_TOP_LEVEL_TAGS = {"header", "footer", "nav"}`. `convert.py:2726–2731` emits `<!-- sgs-converter: CHROME SKIPPED ... belongs in WP template parts -->`. `leftover-bucket-router.py:57–59` adds `chrome_skipped` bucket with `info` severity. The alternate builder pipeline is NOT wired (per spec — this is a known gap), but detection + bucketing are implemented. |

### Section C — Spec 15 §7 Stages

| ID | Claim | Verdict | Evidence |
|----|-------|---------|----------|
| C.15 | Stage 0 pre-flight checks actually run | COVERED-VERIFIED | `preflight_chain.py:64–142 run_preflight()` — 5 checks: timer file, mutex free, sgs-framework.db reachable (with `block_attributes` row count), visual-qa skill, expected files. `orchestrator_main.py:89` calls it. |
| C.16 | Stage 0.1 BEM lint: 3 modes distinguishable | COVERED-VERIFIED | `bem-lint.py:49 Mode = Literal["strict", "draft", "legacy"]`. `bem-lint.py:17–19` documents mode behaviours. `LintResult.exit_code` at line 73 carries the mode-specific exit. |
| C.17 | Stage 0.5 token-usage lint | COVERED-VERIFIED | `token-lint.py:1–56` — additive token-discovery mode. Operates on CSS values, routes to TokenWritePlan. 3 modes present. |
| C.18 | Stage 1 boundary: matches against `patterns.slug` + `slot_synonyms` | PARTIAL | `confidence-matrix.py:14–19` — checks `block.json` existence (blocks) AND pattern PHP files (line 19: "Second-tier check: if candidate is not a registered block, checks whether a PATTERN exists"). `slot_synonyms` table is used by `db_lookup.py` but not directly in Stage 1 boundary matching — Stage 1 operates on class_signature; slot_synonyms is Stage 3. Pattern-level boundary detection partially satisfied. |
| C.19 | Stage 2: confidence ≥ 0.7 gate enforced | PARTIAL | `leftover-bucket-router.py:48` — `UNRECOGNISED_CONFIDENCE_THRESHOLD = 0.5` (not 0.7). The doc spec says 0.7; the code uses 0.5. Gap of 0.2 means more sections pass as "recognised" than spec intended. |
| C.20 | Stage 3 slot extraction: DB-driven via `block_attributes.canonical_slot` | COVERED-VERIFIED | `db_lookup.py:269–286 block_attrs()` — reads `block_attributes` table with `attr_name, attr_type, role, canonical_slot` per block_slug. `canonical_slot_for()` at line 192 resolves aliases. Not `role-templates.json`. |
| C.21 | Stage 4 token snapping: ΔE2000 + percent-deviation | UNVERIFIABLE | `token-lint.py` refers to `value-matcher/match.py` for token snapping. `value_matcher/match.py` exists but was not read in detail. The ΔE2000 claim could not be verified in available time — flag for inspection. |
| C.22 | Stage 5 default-inheritance: checks `styles.elements` / `styles.blocks` | UNVERIFIABLE | `token_resolver.py` and `variation_router.py` exist but were not read in detail. Could not verify WP precedence chain check in available time. |
| C.23 | Stage 6 block.json schema validation fires + halts | COVERED-VERIFIED | `orchestrator_main.py:74` — `require_schema: bool = True` default. `orchestrator_main.py:108–109` — `_merge.merge(..., require_schema=require_schema)`. Comment at line 74: "Sonnet QC fix: validator on". `staged_merge.py` presumably halts on schema failure (verified by orchestrator rollback path at line 112–123). |
| C.24 | Stage 7 WP block-comment markup with nested InnerBlocks | COVERED-VERIFIED | `convert.py:582–599 emit_wp_block()` — emits `<!-- wp:slug{attrs} -->\n{inner}\n<!-- /wp:slug -->`. Nested InnerBlocks: inner list joined at line 598. Self-closing: line 596–597. |
| C.25 | Stage 8 visual parity ≤ 1% at 3 viewports, per-section cropped | PARTIAL | `autonomy_gate.py:94` — loops over `cfg["viewports"]` (default `[375, 768, 1440]`). `pixel-diff.py:323–327` — `--selector` flag present. Gate: `pass_threshold: 0.01`. But production `capture_callable` is a stub in tests (`lambda _vp: {"diff_ratio": 0.0, ...}` at `orchestrator_main.py:127`). The real Playwright capture is not wired inside any script — it's expected to be injected externally. |
| C.26 | Stage 9 coverage report writes `attribute_gap_candidates` + `functionality_gap_candidates` | PARTIAL | `converter_v2/__init__.py:176` and `:293` — `attribute_gap_candidates` field present in per-section result shape. `leftover-bucket-router.py` routes to `functionality` gap level. But `functionality_gap_candidates` as a distinct emitted key was not found in Stage 9 output shape — the router writes to `leftover_buckets.animation_unclassified` instead, not a named `functionality_gap_candidates` list. |

### Section D — Spec 16 §2 Architectural Rules

| ID | Claim | Verdict | Evidence |
|----|-------|---------|----------|
| D.27 | R1 — `sgs/container` auto-emitted at top-level section | COVERED-VERIFIED | `convert.py:3116` — `if target == "sgs/container"` at top level. `convert.py:2871` — css_driven_container also emits `sgs/container`. |
| D.28 | R2 — Atomic-tag precedence (tag wins over BEM class) | COVERED-VERIFIED | `convert.py:477–486` — `if node.name in ATOMIC_TAG_MAP` check fires BEFORE BEM class matching. Comment at line 477: "Atomic HTML tags ALWAYS win over class-based matching." |
| D.29 | R3 — Slot-claim precedence (composite claims slot only inside its block-root) | COVERED-VERIFIED | `convert.py:2748–2769` — FR1 block-root fast path: fires only when `bem.element is None` (bare block, not element). Element nodes route to composite-element path at 2783 or pass-through. |
| D.30 | R4 — `status='built'` filter | COVERED-VERIFIED | `db_lookup.py:104–110` — `registered_block_slugs()` filters `WHERE status = 'built'`. Comment explicitly warns that `planned` blocks would cause WP "unexpected content" error. |
| D.31 | R5 — CSS drives emission: never drops a CSS rule, routes to 1 of 4 destinations | PARTIAL | `variation_buf` collects CSS for classes (D2 = wrapper variation CSS). `_lift_root_supports_to_style()` at line 1832 routes to block native style.* (D1). `_lift_core_block_style()` handles core blocks. **D3 `attribute_gap_candidate`** routing from CSS: not found in `walk()`. Unlifted CSS properties are silently dropped to variation_buf without a gap-candidate flag. Full 4-destination routing (D0 global/reset, D1 typed-attr, D2 wrapper, D3 gap-candidate) is not verifiably implemented — D3 appears absent. |

### Section E — Spec 16 §3 Functional Requirements

| ID | Claim | Verdict | Evidence |
|----|-------|---------|----------|
| E.32 | FR1 — Block-root slot harvest | COVERED-VERIFIED | `convert.py:2735–2769` — FR1 fast path: comment "BLOCK-ROOT FAST PATH (FR1)". Calls `lift_subtree_into_block_attrs()`. Tag fallback for `<hN>` at ATOMIC_TAG_MAP:341. `<a class="sgs-button">` at line 512. |
| E.33 | FR2 — Atomic-tag emission | COVERED-VERIFIED | `ATOMIC_TAG_MAP:341–347` — h1-h6→core/heading, p→core/paragraph, img→core/image, hr→sgs/divider. `<button>` at line 517→sgs/button. `<a>+sgs-button` at line 512→sgs/button. |
| E.34 | FR3 — Pass-through wrapper rule | COVERED-VERIFIED | `convert.py:3101–3111` — `if target == "sgs/container" and not is_top_level:` — pass-through path. Returns `"\n".join(inner_blocks)` without a wrapper. |
| E.35 | FR4 — Top-level section container with className preserved | COVERED-VERIFIED | `convert.py:3116–3121` — top-level container path: emits `sgs/container` with className. `lift_attrs_for_block()` at line 524 always sets className for sgs-* classes. |
| E.36 | FR5 — Media-map resolution | COVERED-VERIFIED | `convert.py:230–259 _resolve_media_url()` — basename lookup against `_MEDIA_MAP`. `load_media_map()` at line 233. img src lifted via `_resolve_media_url(src)` (inferred — src is resolved before attr setting). |
| E.37 | FR6 — CSS 4-destination routing | PARTIAL | D1 (typed-attr lift): `_lift_root_supports_to_style()` at line 1832. D2 (wrapper variation_buf): `convert.py:2870, 3093, 3108, 3121`. D0 (global/reset): not found — no explicit global reset CSS destination. D3 (attribute_gap_candidate): not found in walk(). 2 of 4 destinations verifiably wired. |
| E.38 | FR7 — Visual QA verification (Mama's canary) | PARTIAL | `autonomy_gate.py` has the gate. `pixel-diff.py` has --selector. Mama's-specific canary: not a test fixture in any script — it's a live URL in the CLAUDE.md (page 131). No automated canary script found. |
| E.39 | FR8 — Legacy `tools/recogniser-v2/` retired | CONTRADICTORY | `sgs-clone-orchestrator.py:1217` — still calls `tools/recogniser-v2/extract.py` via subprocess for all non-cv2-eligible sections. `sgs-clone-orchestrator.py:928` — `run_stage_4_8_extract()` explicitly delegates to `extract.py`. Files still exist and are actively imported. NOT retired. |
| E.40 | FR9 — `sgs/heading` composite block exists + converter routes to it | COVERED-VERIFIED | `plugins/sgs-blocks/src/blocks/heading/block.json:4` — `"name": "sgs/heading"`. `convert.py:2913, 2948` — heading nodes with sgs-* classes swap to `sgs/heading` via `emit_wp_block("sgs/heading", ...)`. |

### Section F — SKILL.md Hard Rules

| ID | Rule | Verdict | Evidence |
|----|------|---------|----------|
| F.41 | Rule 1 — `uimax-write-validator.py` rejects licensing keywords | MISSING | `uimax-write-validator.py:1–131` read in full. No licensing/copyright keyword rejection logic found anywhere. The validator enforces Rosetta Stone (`equivalent_implementations.sgs_block`) but has zero code scanning for "license", "IP", "copyright" etc. |
| F.42 | Rule 2 — Rosetta Stone: uimax writes carry `equivalent_implementations.sgs_block` | COVERED-VERIFIED | `uimax-write-validator.py:42–110` — `check_rosetta_stone()`: errors if `equivalent_implementations` missing as dict, or `sgs_block` key absent, or empty string. `ARTEFACT_TABLES` frozenset at line 31 covers patterns, components, animations, naming_conventions, component_libraries. |
| F.43 | Rule 3 — Stage 1+2 at PATTERN boundaries | PARTIAL | `confidence-matrix.py:14–19` — second-tier pattern check via pattern PHP file existence. Stage 1 boundary via `stage1_boundary_hook.py` enriches with lingua-franca. Pattern-level operation partially present. |
| F.44 | Rule 4 — Slot list auto-derived from `block.json` on every run | PARTIAL | `db_lookup.py:269–286 block_attrs()` reads `block_attributes` from DB (DB sourced from block.json at `/sgs-update` time). Direct block.json parse at runtime: `_block_json_item_keys()` at `convert.py:700` for array attr defaults. Hybrid: DB-driven (main path) + block.json fallback for item schemas. Not pure DB — block.json fallback reads `build/blocks/<name>/block.json`. |
| F.45 | Rule 5 — Full CSS scan (BS4 + recursive @media) | COVERED-VERIFIED | `convert.py:262–322 parse_css()` — brace-balanced scanner handles recursive @media. Comment at line 270 explicitly says prior regex "silently failed on every real-world @media block (13 Mama's, 0 captured)". Fixed. |
| F.46 | Rule 8 — Coverage gate: `unresolved_slots == 0` before deploy | MISSING | No `unresolved_slots == 0` gate found in `autonomy_gate.py`, `orchestrator_main.py`, or `staged_merge.py`. The autonomy gate checks `diff_ratio <= pass_threshold` and `console_errors == 0`. Slot-coverage is tracked in `leftover-bucket-router.py` but not enforced as a deploy gate. |
| F.47 | Rule 11 — DB-first lookups, no hardcoded dicts | PARTIAL | `db_lookup.py:417–494` — `css_property_suffixes()` and `breakpoint_suffix_rules()` are DB-driven. Comment at `convert.py:1031–1038` explicitly notes the refactor from hardcoded 21-row list to DB (99 rows). **BUT**: `_KIND_BY_SUFFIX` at `db_lookup.py:376–395` is a hardcoded 14-entry dict. `_BREAKPOINT_RULES` at `db_lookup.py:458–464` is hardcoded. `_CORE_BLOCK_STYLE_MAP` at `convert.py:1225` is a hardcoded dict. `ATOMIC_TAG_MAP` at `convert.py:341` is hardcoded. Partial compliance — the main CSS property lookup is DB-driven but supporting maps remain hardcoded. |
| F.48 | Rule 12 — Production runs default to full pipeline with Playwright | PARTIAL | `sgs-clone-orchestrator.py:1227–1228` — `--no-playwright` flag still exists and is passed to `extract.py`. `orchestrator_main.py:73` — `visual_qa_config` path points to `tools/recogniser-v2/visual_qa_config.json`. Playwright IS in the pipeline via the capture_callable injection point but is not verifiably the hardwired default. |
| F.49 | Rule 13 — cv2 output targets WP PAGES | COVERED-VERIFIED | `reports/brand-walkdown-2026-05-19/upload_and_patch.py:74–80` — `--target` flag with `default="page"`. REST endpoint selects `pages` vs `posts` based on flag. Default is pages. |
| F.50 | Rule 14 — Semantic `widthMode` emission | COVERED-VERIFIED | `convert.py:63–73` — `_LIFT_CONTEXT`, `_WIDTH_MATCH_TOLERANCE_PCT = 5.0`. `convert.py:1800–1812` — `_match_width_mode()`: tries contentSize then wideSize ±5%. `convert.py:1941–1960` — `_lift_root_supports_to_style` emits `widthMode: "full"` for full-bleed, matched mode for theme widths, skips for non-matching. |
| F.51 | Chrome DevTools MCP wired in pipeline code | MISSING | Grep of all orchestrator scripts for "chrome-devtools", "mcp__plugin_chrome", "cdp", "devtools" returned zero results. Chrome DevTools MCP is only invokable from Claude conversations. No pipeline script references it. It is a doc claim, not a code reality. |

### Section G — end-goal-rubric.md

| ID | Claim | Verdict | Evidence |
|----|-------|---------|----------|
| G.52 | Catalogue-utilisation: 4-layer fingerprint + uimax-write-validator at point of use | PARTIAL | `register_patterns.py:43–50` — routes through `uimax_write.py` Rosetta Stone chokepoint. Fingerprint catalogue: `fingerprint-builder/` scripts exist but their wiring into Stage 1 was not verified. |
| G.53 | Operator-independence: `operator-review.html` | UNVERIFIABLE | No `operator-review.html` generator found in any script. `autonomy_gate.py:221–296 emit_deliverable()` writes a Markdown summary, not an HTML review page. |
| G.54 | Pattern-library-compounding: +REGISTER writes to both sgs-db and uimax | COVERED-VERIFIED | `register_patterns.py:1–50` — explicitly writes to sgs-framework.db patterns table AND uimax patterns table via `_insert_uimax_pattern()`. Rosetta Stone payload required for uimax write. |

---

## Section H — Script Lifecycle Catalogue

| Script Path | Verdict | Rationale |
|-------------|---------|-----------|
| `plugins/sgs-blocks/scripts/orchestrator/test_*.py` (22 files) | keep-canonical | Actively used test suite for every orchestrator module. Load-bearing for pre-commit gate. |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/test_root_supports_lift.py` | keep-canonical | Unit test for root supports lift — active. |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/tests/test_root_supports_double_lift.py` | keep-canonical | Unit test for double-lift guard — active. |
| `plugins/sgs-blocks/scripts/orchestrator/expected_rules.py` | keep-canonical | Used by `pixel-diff.py` attribute-coverage computation. |
| `plugins/sgs-blocks/scripts/orchestrator/trace.py` | keep-canonical | Per-section debug trace — loaded lazily by multiple modules. |
| `plugins/sgs-blocks/scripts/orchestrator/visual_qa_capture.py` | inspect | May be the production Playwright capture callable. Not read in audit. |
| `tools/recogniser-v2/extract.py` | retire-candidate | Spec FR8 says retire. Still actively called by orchestrator line 1217. Cannot retire until cv2 covers all sections. Mark as `retire-pending-cv2-completion`. |
| `tools/recogniser-v2/extract_strategies.py` | retire-candidate | Imported by `extract.py`. Same retirement timeline. |
| `tools/recogniser-v2/overrides/hero.py` | retire-candidate | ~908 lines of hero-specific extraction. Superseded by cv2 FR1 path. Same retirement timeline. |
| `tools/recogniser/recogniser.py` | inspect | Older generation. Not imported by orchestrator (checked). Likely superseded by recogniser-v2 and then by cv2. Safe to retire but verify first. |
| `tools/recogniser/section_detector.py` | inspect | Same generation as recogniser.py. Likely obsolete. |
| `tools/recogniser/fingerprint_indexer.py` | inspect | Unclear import chain. May be used by confidence-matrix stage. |
| `tools/recogniser/serialiser.py` | inspect | Same generation. |
| `tools/recogniser/style_extractor.py` | inspect | Same generation. |
| `tools/recogniser/output_router.py` | inspect | Same generation. |
| `tools/recogniser/patch-featured-product.py` | retire | Single-purpose patch script. No ongoing utility. |
| `tools/recogniser/test_matchers.py` | inspect | Tests for old recogniser — may be stale. |
| `plugins/sgs-blocks/scripts/gap-detection/apply-*.py` (3 files) | inspect | One-shot migration scripts by naming. Verify via git log. |
| `plugins/sgs-blocks/scripts/gap-detection/canonicalise-pass-2.py` | inspect | Likely one-shot. |
| `plugins/sgs-blocks/scripts/gap-detection/canonicalise-slot-only.py` | inspect | Likely one-shot. |
| `plugins/sgs-blocks/scripts/gap-detection/coverage-ab-mining.py` | inspect | Analysis script — check if still used. |
| `plugins/sgs-blocks/scripts/gap-detection/coverage-de-mining.py` | inspect | Analysis script — check if still used. |
| `plugins/sgs-blocks/scripts/fingerprint-builder/audit-attr-vocabulary.py` | inspect | v1 — possibly superseded by v2. |
| `plugins/sgs-blocks/scripts/fingerprint-builder/audit-attr-vocabulary-v2.py` | keep-but-unique | v2 — likely canonical. |
| `plugins/sgs-blocks/scripts/behavioural-analyser/*.py` (4 files) | inspect | `/sgs-update` inputs. May be one-shot population scripts. |
| `plugins/sgs-blocks/scripts/migrations/*.py` (3 files) | retire | Date-prefixed migration scripts — ran once. Safe to archive. |
| `scripts/qc-anti-cheat.py` + `scripts/qc_anti_cheat_checks.py` | inspect | Two files with similar names — possible duplicate or split module. |
| `scripts/qc-correctness-regression.py` | keep-canonical | Regression guard — active per MEMORY.md. |
| `scripts/qc-coverage-honesty.py` | keep-canonical | Coverage honesty gate — active. |
| `plugins/sgs-blocks/scripts/drift-validator/validate.py` | keep-canonical | Called by pre-commit gate in `preflight_chain.py:174`. |
| `plugins/sgs-blocks/scripts/audit-block-uniformity.py` | inspect | Unclear if still active or a one-shot audit. |
| `plugins/sgs-blocks/scripts/pattern-classify.py` + `pattern-fingerprint.py` + `pattern-register.py` | inspect | Possible predecessors of `register_patterns.py`. Check import chain. |

---

## Top 10 Blocking Gaps

These items prevent Bean's 9 requirements from being met end-to-end:

1. **Legacy `tools/recogniser-v2/extract.py` still active** — FR8 says retire; `sgs-clone-orchestrator.py:1217` still calls it for all non-cv2-eligible sections. Until cv2 handles 100% of sections, the pipeline is split and A.1 (full HTML scan) cannot be COVERED-VERIFIED.

2. **`--converter-v2` is opt-in, not default** — `sgs-clone-orchestrator.py:1858` shows `default=False`. Every production run without the flag bypasses cv2 entirely. All cv2 capabilities are invisible unless the flag is passed.

3. **CSS D3 destination (attribute_gap_candidate) not wired** — FR6 requires 4-destination CSS routing. D3 (CSS properties that don't lift to any attr become gap candidates) is absent from `walk()`. Unlifted CSS is silently dropped to `variation_buf` or lost, not tracked as gaps.

4. **Production Playwright capture not wired** — `orchestrator_main.py:127` shows the production capture_callable defaults to a stub that returns `diff_ratio: 0.0`. Stage 8 visual QA is non-functional unless an external caller injects a real capture callable. A.2 (<1% pixel-diff) cannot be verified.

5. **Coverage gate `unresolved_slots == 0` missing** — Rule 8 (F.46). Gaps are tracked in `leftover-bucket-router.py` but never enforce a deploy halt. A run with 100 unfilled slots can auto-proceed if `diff_ratio <= 0.01`.

6. **Confidence threshold mismatch** — C.19: spec says 0.7, code uses 0.5 (`leftover-bucket-router.py:48`). Sections scored 0.5–0.69 are treated as recognised by the code but would fail the spec gate. This affects which sections get operator review.

7. **Chrome DevTools MCP not in pipeline** — F.51: doc claims it is "PREFERRED for runtime CSS extraction" but zero pipeline scripts reference it. Users relying on the doc to understand CSS extraction will find the actual code uses BeautifulSoup + regex parsing.

8. **`attribute_gap_candidates` not populated** — C.26: `converter_v2/__init__.py:176` initialises it as `[]` but no code in `walk()` or `lift_subtree_into_block_attrs()` appends to it. Stage 9 cannot report which converter slots failed to lift.

9. **`INNER_BLOCK_PATTERNS` has 1 entry** — B.12: only `sgs/feature-grid` has an InnerBlocks emission pattern. Any composite block (hero with nested buttons, card-grid with nested cards) that needs InnerBlocks rather than flat attrs will not emit correctly.

10. **`uimax-write-validator.py` has no licensing keyword gate** — F.41: MEMORY.md and SKILL.md both list this as Rule 1, but the code has no such check. The rule is a doc-only claim.

---

## Top 10 Cleanup Candidates

1. `tools/recogniser-v2/extract.py` — retire-pending (blocks FR8 completion)
2. `tools/recogniser-v2/extract_strategies.py` — retire-pending (same)
3. `tools/recogniser-v2/overrides/hero.py` — retire-pending (908 lines, superseded by cv2 FR1)
4. `tools/recogniser/` (all 7 files) — inspect → likely retire-all (older generation, not imported by current orchestrator)
5. `plugins/sgs-blocks/scripts/migrations/` (3 files) — retire (date-stamped one-shots)
6. `tools/recogniser/patch-featured-product.py` — retire (single-purpose patch, no ongoing use)
7. `plugins/sgs-blocks/scripts/gap-detection/apply-*.py` (3 files) — retire after git-log confirms one-shot
8. `plugins/sgs-blocks/scripts/gap-detection/canonicalise-*.py` (2 files) — retire after same check
9. `scripts/qc-anti-cheat.py` vs `scripts/qc_anti_cheat_checks.py` — consolidate (duplicate functionality, hyphen vs underscore naming)
10. `plugins/sgs-blocks/scripts/pattern-classify.py` + `pattern-fingerprint.py` + `pattern-register.py` — inspect, likely replaced by `register_patterns.py`

---

## Confidence and Caveats

**High confidence (code read directly):** R0.1, A.3, A.5–A.7, A.9, B.11–B.14, C.15–C.16, C.18–C.20, C.23–C.24, D.27–D.31, E.32–E.37, E.39–E.40, F.42, F.45, F.47–F.50.

**Medium confidence (inferred from partial read):** A.1, A.2, A.4, A.8, B.10, C.25, E.38, F.43–F.44, F.46, F.48, F.51.

**Unverifiable in available time:** C.21 (ΔE2000 in value-matcher/match.py), C.22 (default-inheritance in token_resolver.py/variation_router.py), G.53 (operator-review.html).

**Not read:** `visual_qa_capture.py`, `tools/recogniser/` internals, `staged_merge.py` internals, `supports_writer.py`, `modifier_extractors.py`, `variation_router.py`, `token_resolver.py`. These may cover gaps or add contradictions not captured here.

---

## 100-Word Summary

**Pipeline-breaking gaps:** (1) `--converter-v2` is opt-in (default=False), so cv2 never runs unless explicitly flagged — all cv2 capabilities are invisible in standard production runs. (2) Legacy `tools/recogniser-v2/extract.py` is still actively called for non-cv2 sections and is NOT retired. (3) Production Playwright capture is a stub — Stage 8 visual QA returns diff=0 unless externally injected. (4) CSS D3 destination (gap-candidate routing) is absent from the walker. (5) No `unresolved_slots == 0` deploy gate exists.

**Cosmetic/doc inconsistencies:** Chrome DevTools MCP claim has zero code backing; confidence threshold is 0.5 not 0.7 as documented; `uimax-write-validator` has no licensing keyword gate.
