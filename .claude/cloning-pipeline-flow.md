---
doc_type: reference
project: small-giants-wp
purpose: Overview of the SGS Cloning Pipeline — stage-index table, entry-point chain, cross-cutting principles, and pointers to per-stage detail. Per-stage annotated blocks live in cloning-pipeline-stages.md.
session_date: 2026-07-04
last_annotated: 2026-07-04
regenerated_note: Regenerated 2026-07-04 from the live scripts (execution-plan Step 1). Every claim below was traced against sgs-clone-orchestrator.py, converter_v2/__init__.py, and converter/ (the new modular engine) at that date. Line numbers will drift as the code changes — if a citation looks wrong, grep for the named function/constant rather than trusting the number.
registry_entry: docs-registry.yaml canonical_docs (cloning-pipeline-flow.md)
companion_docs:
  - .claude/cloning-pipeline-stages.md - per-stage annotated blocks (scripts, files, DB, gates, status)
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md - canonical pipeline spec (Spec 31)
update_triggers:
  - Pipeline stage change (new stage, retired stage, renumbered)
  - Script wired or unwired (status flip in any stage block)
  - DB schema change affecting any pipeline stage
  - New-engine (converter/) reaches a milestone that changes what SGS_NEW_ENGINE=1 actually does
---

# SGS Cloning Pipeline — Overview

Per-stage annotated blocks (scripts, files, DB tables, gates, status) are in
`.claude/cloning-pipeline-stages.md`. This file is the cold-start map.

> **STATUS (2026-07-04):** `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` (imported inside the package as `v3`) is the FROZEN production converter (D-MODULAR, D229) — it runs on every clone by default. A second, modular engine lives at `plugins/sgs-blocks/scripts/converter/` (`recognition.py`, `services/extraction.py`, `dispatch_table.py`, `resolvers/`) and is reached ONLY when the operator sets the environment variable `SGS_NEW_ENGINE=1` (STOP-28). See "The two converters" below. Live plan: read `.claude/CLAUDE.md` → "Authoritative pointers" for the current canonical plan pointer (it moves; do not cache its filename here).

---

## How cloning fidelity works — DO NOT REDESIGN THIS

**Read this before proposing any change to the cloning pipeline or fidelity strategy.**

**What a draft is:** an HTML file with embedded CSS whose classes follow SGS-BEM convention (`.sgs-<block>__<element>--<modifier>`). The converter's job is to faithfully transfer that draft's visual CSS into native WordPress SGS block attributes — producing a clone that looks identical to the draft AND remains fully editable in the block editor.

**Content and CSS are ONE recursive walk, not two passes (Spec 31 §2/§3).** In the frozen engine (`convert.py`/`v3.walk`) this is a single recursive function with exactly 3 permitted exceptions: atomic-tag swap / chrome-skip at top level / top-level section wrap in `sgs/container`. In the new engine, the same unification is `converter/services/extraction.py:build_block_markup()` (line 1319) — it merges variant attrs → CSS attrs (`_build_css_attrs`, line 1361) → content ScalarLifts (`extract_content`, line 1364) into ONE attrs dict per element, content winning on collision. No per-section code branches in either engine. No 4th walker exception without a spec amendment (R-31-3).

**Block choice is DB-driven, never invented (R-31-1):**
- Stage 1 (`recogniser/per-section-convention-voter.py`) finds section-roots.
- Stage 2 (`recogniser/confidence-matrix.py`) matches each section to the best-fit SGS block, cross-checked against `wp-blocks.py match` (`stage_2_match()`, sgs-clone-orchestrator.py:997).
- No confident match → the frozen engine falls back to `sgs/container`. The new engine's `converter/recognition.py:recognise_section()` (line 167) makes this explicit: a genuine no-match top-level section DEFAULTS to `db_lookup.container_default_slug()` (line 215); a genuinely AMBIGUOUS tie (≥2 registered candidates) stays loud `unrecognised` rather than being silently swallowed into a container.
- Every BEM node → block slug via DB lookup (`slots.standalone_block` in the frozen engine; `db_lookup.standalone_block_for()` in the new engine, `converter/recognition.py:89-97`). No per-section bespoke blocks, no hardcoded dicts.

**Fidelity = transferring the draft's CSS onto the chosen block's EDITABLE attributes** (Spec 31 §13.6 universal wrapper-conversion procedure): `align` / `maxWidth` / `contentWidth` / `gap` / `gridTemplateColumns` / `gridItem*` / background / padding. The clone reproduces the draft AND stays editable + reusable.

**Anti-pattern warning:** when a cloned section looks wrong, the fix is ALWAYS "complete the DB-driven attribute-transfer for that property". NEVER invent per-section blocks, hardcode values, or bypass the converter/DB. (blub.db 329 / `rule-critique-is-not-fix-shape-confirmation`)

---

## The two converters (verified 2026-07-04)

> ⚠ Forward marker: the whole fork + frozen fallback + `converter_v2/` tree are scheduled for DELETION once the new engine reaches parity (completion plan Phase 6) — the new engine becomes the only path.

| | Frozen engine (production default) | New engine (opt-in) |
|---|---|---|
| Entry point | `orchestrator/converter_v2/__init__.py` → `v3.walk()` (aliases `convert.py`) | `converter/recognition.py` + `converter/services/extraction.py` |
| Activated by | Always, unless the new engine produces markup | `SGS_NEW_ENGINE=1` environment variable |
| Per-section dispatch | `converter_v2/__init__.py:442-443` — `v3.walk(root, css_rules, variation_buf, depth=0, is_top_level=True)` | `converter_v2/__init__.py:419-441` — `converter.recognition.recognise_section(root)` then `converter.services.extraction.build_block_markup(rec, root, css_rules=css_rules, media_map=media_map or {})` |
| Fallback rule | N/A — this IS the fallback | If `SGS_NEW_ENGINE=1` but the new engine's `Recognition.kind == "unrecognised"` OR its emit contains no `"wp:"` markup, the frozen `v3.walk()` runs instead (same line 442-443 `if not block_markup:` guard) |
| Chrome-skip (header/footer/nav) | Handled inside `v3.walk()` | Explicit early-return at `converter_v2/__init__.py:385-398`, gated on `SGS_NEW_ENGINE=1` + `root.name in v3.SKIP_TOP_LEVEL_TAGS` |
| Transparent-wrapper absorb | `v3._absorb_transparent_wrappers(root, css_rules)` — runs UNCONDITIONALLY as a pre-pass for both engines (`converter_v2/__init__.py:407`) | same call, shared |
| Root className guarantee | `v3.ensure_root_section_class(block_markup, section_id)` — runs UNCONDITIONALLY as a post-pass for both engines (`converter_v2/__init__.py:454`) | same call, shared |

**Measured fact (2026-07-04 verification run, Mama's Munches homepage, `SGS_NEW_ENGINE=1`):** the frozen-engine fallback fired for **zero** of the 7 content sections — every section, including the skip-link emit, went through the new engine's `recognise_section` → `build_block_markup` path. This is evidence about that one page on that one date, not a claim that the new engine is complete for every draft shape.

---

## Stage-index table

Every row cites the function that actually runs it, in `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` unless noted. Line numbers as of 2026-07-04.

| # | Stage name | Function (file:line) | Primary output | Notes |
|---|-----------|----------------------|----------------|-------|
| 0 | Theme cache | inline in `main()` (loads `theme/sgs-theme/theme.json` + client variation, lines 2281–2314) | `run_ctx["theme_json"]` (in-memory, no separate JSON artefact) | No preflight/mutex call here — see "Dropped claims" below |
| 0.1 | BEM compliance lint | `stage_0_1_bem_lint()` (:121) | `stage-0.1-bem-lint.json` | modes: strict (halt) / draft (warn) / legacy (bypass) |
| 0.5 | Token-usage lint | `stage_0_5_token_lint()` (:193) | `stage-0.5-token-lint.json` | additive mode writes new-token candidates, not violations |
| 0.7 | CSS lift (4-destination router) | `stage_0_7_css_lift()` (:394), delegates to `orchestrator/css_router.py:route_css()` + `write_variation_css()` | `pipeline-state/<run>/variation-d0-d2.css` (D0+D2+D3-fallback) + D3 rows in `sgs-framework.db.attribute_gap_candidates` | Falls back to a verbatim CSS dump (`_stage_0_7_verbatim_fallback()`, :502) if `css_router` import/route fails. ⚠ The router's D1 typed-attr bucket is a DEAD OUTPUT — nothing reads its `d1` dict (verified 2026-07-04; cv2 re-derives from raw css_rules; the css_router.py:748 'consumed inline' docstring is stale). D1's fate = completion plan Step 14 / Spec 31 MF-2 (retire OR rewire) |
| 1 | Section boundary detection | `stage_1_boundary()` (:936) → subprocess `recogniser/per-section-convention-voter.py`, enriched by `orchestrator/stage1_boundary_hook.py:enrich_stage1_payload()` | `voter.json`, `stage-1.json` | lingua-franca conversion added here for non-SGS-BEM drafts |
| 2 | Block-type match | `stage_2_match()` (:997) → `recogniser/confidence-matrix.py:score_candidates()`, cross-checked against `wp-blocks.py match` | `stage-2.json` | wp-blocks result overrides confidence-matrix when it's >0.3 more confident |
| 3 | Slot list | `stage_3_slot_list()` (:1093) — reads each matched block's `block.json`, tags each attr `canonical_source: db` or `auto-derived` | `stage-3.json` | `auto-derived` sets `slot_canonicalisation_gap=True` for operator review |
| 4 | Extract + convert (per section) | `stage_4_5_6_7_8_extract()` (:1202) — loops every Stage-2 match, loads `--media-map` JSON (:1425–1428), calls `convert_section()` from `orchestrator/converter_v2/__init__.py` (:1454–1467) | `extract-result.json`, `stage-4.json` | cv2 (converter_v2) is the ONLY supported extraction path — the legacy `recogniser-v2/extract.py` subprocess is permanently retired. An unmatched, non-cv2-eligible section emits NO markup and is reported to the operator, not best-effort filled |
| 9 | Coverage + gap reporting | `stage_9_report()` (:1900) → subprocess `recogniser/leftover-bucket-router.py`, `recogniser/simple_html_review_report.py`; soft-fail calls to `attribute-gap-writer.py`, `functionality-gap-detector.py`, `gap-review-report.py` | `leftover-buckets.json`, `operator-review.html`, `gap-review.md`, `stage-9.json` | also INSERTs into the uimax `recognition_log` table |
| Gate | R-31-15 anti-mirror gate | `main()` (:2386–2404) → subprocess `orchestrator/pipeline-stage-gate.py`, which wraps `orchestrator/check_no_mirror.py --enforce --baseline` | non-zero exit HALTS the run before deploy/register | baseline-aware: only NEW violations (draft-class container / bound sourceMode not in `check-no-mirror-baseline.json`) fail. `--skip-stage-gate` opts out |
| 4i | Media sideload + apply-module load | `main()` (:2407–2509) → `orchestrator/media-sideload.py:sideload_batch()`; also lazy-loads `attribute-staged-apply.py` + `functionality-bulk-apply.py` | `media-sideload-manifest.json`, `stage-4i.json` | dry-run inventory only unless `--deploy-target` is set (then real WP media-library uploads) |
| 4j | wp-blocks schema validation | `main()` (:2511–2549) → `orchestrator/wp_integration.py:validate_block_markup()` (via the `wp-blocks` CLI) | `stage-4j.json` | soft-fails to `status: skipped` if the CLI is unavailable; `--no-schema-validation` opts out of the later hard gate inside `orchestrator_main.run()` |
| — | Structured log surfacing | `main()` (:2570–2586) → `orchestrator/surface_pipeline_logs.py:surface()` | `summary.log` + per-severity sidecar logs | reads `trace.jsonl`; runs before the deploy stage so dev-mode runs still get it |
| 10 | Per-page deploy | `main()` (:2593–2672) → subprocess `orchestrator/upload_and_patch.py` | live page/post REST PATCH + `link=<url>` on stdout | opt-in via `--deploy-target page:<id>` / `post:<id>`; exit codes 3–6 are named failure modes (variation-activation failure, 404, id-mismatch, non-JSON 200) |
| — | Stage 11 (pixel-diff) and Stage 11.5 (parity2) | **REMOVED 2026-07-04** | — | both had the same structural blind spot: pixel-diff scored an EMPTY section as a false WIN and a REFLOWED-to-correct section as a false LOSS; parity2 keyed elements by BEM class, comparing the draft's raw section against the clone's block WRAPPER. See Spec 20 |
| 11.6 | Universal computed-parity (sole fidelity signal) | `main()` (:2685–2742) → subprocess `node plugins/sgs-blocks/scripts/parity/computed-parity.js` | `computed-parity.json` | on by default after a successful Stage-10 deploy; `--no-computed-parity` opts out; compares EFFECTIVE computed values matched by CONTENT (CLAUDE.md rule 4a) |
| — | Autonomy chain / staged-merge tail | `main()` (:2744–2820) → `orchestrator/orchestrator_main.py:run()`, which itself loads `staged_output.py`, `preflight_chain.py` (`run_preflight()`, called), `staged_merge.py` (`merge()`, called), `autonomy_gate.py` (`invoke_visual_qa`/`autonomy_decision`/`emit_deliverable`, called) | `outcome` object (merge/autonomy/sgs_update result) | `capture_callable` is ALWAYS `visual_qa_capture.py:stub_capture` — there is no live Playwright pixel-diff capture path any more (removed 2026-07-04); `--skip-autonomy-gate` returns before this block runs (default in `--mode draft` unless `--enforce-autonomy-gate`) |
| +REG | Pattern registration (two-tier gate) | `main()` (:2822–2862) → `orchestrator/register_patterns.py:register_run()` | `theme/sgs-theme/patterns/<slug>.php` (promoted) OR `pipeline-state/<run>/proposed-patterns/` (staged) + DB rows | promotes to canonical ONLY when Stage 11.6's `overall_css_pct == 100`; otherwise stages for manual operator review. `--skip-register` opts out of both |
| — | Final acceptance harness | `main()` (:2864–2881) → `orchestrator/critical-fix-verification.py:run_harness()` | `critical-fix-verification.json` | soft-fail; runs after +REGISTER to verify FR21 invariants held |

---

## Live entry-point chain

```
1.  /sgs-clone command
       ↓ invokes
2.  plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py main()   ✓ ENTRY POINT
       ↓ runs stages 0.1 → 4j inline / via subprocess (table above)
       ↓ Stage 4 imports orchestrator/converter_v2 (convert_section),
         which internally forks to converter/ (new engine) when
         SGS_NEW_ENGINE=1, else stays on the frozen v3.walk()
       ↓ Stage 10 (opt-in) + Stage 11.6 (opt-in) run after deploy
       ↓ unless --skip-autonomy-gate, then imports
3.  plugins/sgs-blocks/scripts/orchestrator/orchestrator_main.py:run()  ✓
       ↓ loads (verified: module-level _load() calls in orchestrator_main.py)
       ├─ staged_output.py       ✓ (run_dir/stage_path helpers)
       ├─ preflight_chain.py     ✓ (run_preflight() IS called, line 89)
       ├─ staged_merge.py        ✓ (merge() IS called, line 108)
       └─ autonomy_gate.py       ✓ (invoke_visual_qa/autonomy_decision/emit_deliverable IS called)
       ↓ on success (gated on Stage 11.6 overall_css_pct==100 for PROMOTE, else STAGE)
4.  plugins/sgs-blocks/scripts/orchestrator/register_patterns.py:register_run()  ✓ +REGISTER tail
       ↓ then
5.  plugins/sgs-blocks/scripts/orchestrator/critical-fix-verification.py:run_harness()  ✓ final acceptance
```

**Dropped / corrected claims from the previous version of this doc (verified stale 2026-07-04):**
- `orchestrator/mutex.py` and a standalone "Stage 0 — Pre-flight" row citing `preflight_chain.run_preflight() + run_precommit_gate` as something `main()` calls directly — **not found**. `main()` does its own inline theme-cache load (lines 2281–2314); `preflight_chain.py` is only reached transitively, later, inside `orchestrator_main.run()` (step 3 above).
- The entry-chain claim "also loads `css_router.py`, `essence_match_detector.py` inline" — the DRIVER (`sgs-clone-orchestrator.py`) references neither; `essence_match_detector.py` EXISTS and is lazy-loaded by the frozen `convert.py:216-226` inside Stage 4 (soft-fail on ImportError), and `css_router.py` is Stage 0.7's dispatcher — neither is a bare inline load at the entry point.
- `orchestrator/composer_fallback.py` — retired 2026-05-14 (comment at sgs-clone-orchestrator.py:539); an unmatched section now surfaces to the operator via Stage 9, it does not fall through to a composer.
- Stage 11 (pixel-diff, `upload_and_patch.py` post-Stage-10) and Stage 11.5 (parity2) — both REMOVED 2026-07-04 (see stage table above). Any doc or memory still describing them as LIVE is stale.
- "Stage 8 — Deploy + Visual Parity QA via `autonomy_gate.py` + `visual_qa_capture.py`" as a numbered pipeline stage with a real pixel-diff capture — the capture path is a stub (`visual_qa_capture.stub_capture`) only; there is no live-capture visual QA stage left in the pipeline. The +REGISTER promotion gate is what actually decides "faithful enough", keyed on Stage 11.6.
- `.claude/decisions.md`/prior handoffs referencing `sourceMode='bound'` as reachable from cloning — confirmed still retired (D182); the converter_v2 dispatch never emits it for cloned trust-bars.

---

## Cross-cutting principles

**One recursive stream, content + CSS together (Spec 31 §2/§3).** Neither engine does a separate "extract content" pass followed by a separate "extract CSS" pass. The new engine's `build_block_markup()` (`converter/services/extraction.py:1319`) makes the merge explicit: variant attrs, then CSS attrs (`_build_css_attrs`), then content ScalarLifts — content overwrites CSS on a key collision, except for `gridItem*` defaults which use `setdefault` so an explicit CSS-pass value always wins (documented at extraction.py:1370-1380).

**DB-driven, no hardcoded dicts (R-31-1).** Both engines resolve block identity, container-kind, and property routing from `sgs-framework.db` (`db_lookup.py`), never from an `if slug == "sgs/x"` literal. The new engine's `dispatch_table.py:resolver_id()` is the canonical example: it routes a `(layer, css_property)` pair to exactly one resolver id using DB tables (`property_suffixes`, `block_attributes`, an excluded-properties table) — "it NAMES NO BLOCK" (dispatch_table.py:5).

**The frozen engine is the production default; the new engine is opt-in (STOP-28).** `SGS_NEW_ENGINE` unset (the default) means every clone runs 100% through `convert_section()` → `v3.walk()` (the frozen `converter_v2/convert.py`). Setting `SGS_NEW_ENGINE=1` activates the hybrid fork at `converter_v2/__init__.py:409-443`: per top-level section, try the new engine first; use its emitted markup only if `Recognition.kind != "unrecognised"` AND the emit contains `"wp:"` block-comment markup; otherwise silently fall back to the frozen walker for that section. Both paths still go through the same unconditional pre-pass (`_absorb_transparent_wrappers`, :407) and post-pass (`ensure_root_section_class`, :454).

**Media resolution is live end-to-end on both engines (verified 2026-07-04).** `main()` parses `--media-map <file>` into a dict at `stage_4_5_6_7_8_extract()` lines 1425-1428; that dict is threaded into `convert_section(..., media_map=_media_map_obj, ...)` at line 1457. Inside the new engine, `converter/services/lift_helpers.py:resolve_media_url()` (lines 133-148) looks up the mockup `<img src>` basename against the map and returns the resolved WP media URL, falling back to the original `src` on a miss.

**Chrome (header/footer/nav) is skipped, never cloned as page content.** Exception 2 of the 3 permitted walker exceptions (R-31-3). In the new-engine path this is an explicit early return (`converter_v2/__init__.py:385-398`) gated on `root.name in v3.SKIP_TOP_LEVEL_TAGS` — the one permitted hardcoded constant (3 entries).

**Structural gates fire in a fixed order, before deploy.** Anti-mirror (`pipeline-stage-gate.py` wrapping `check_no_mirror.py`) runs immediately after Stage 9 and HALTS the whole run on a new violation — before media-sideload, before deploy, before +REGISTER. wp-blocks schema validation (Stage 4j) is soft-fail by default but becomes a hard gate inside `orchestrator_main.run()` unless `--no-schema-validation` is passed. The +REGISTER promotion decision is the ONLY gate keyed on rendered fidelity (Stage 11.6's `overall_css_pct`), not on any earlier stage's output — an auto-promotion convenience; per Spec 31 §7b/R-31-13 the number alone never closes fidelity (Bean's eye is co-authoritative).

**Measured baseline (2026-07-04 verification run, Mama's Munches homepage via Stage 11.6 computed-parity):** content match 77%; CSS match 47% at 375px, 49% at 768px, 54% at 1440px. These are the actual `computed-parity.json` numbers from that run — cite them as a dated baseline, not a current live figure; re-run Stage 11.6 to get today's numbers.

**Read `leftover-buckets.json` first.** MANDATORY before any converter-quality conjecture — Stage 9 pre-classifies every gap. See `feedback_read_leftover_buckets_before_conjecturing.md`.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✓ | Verified as actually invoked in the traced code path |
| (R) | Reads file or DB table |
| (W) | Writes file or DB table |
| (X) | Dispatches subprocess or external tool |

---

## See also

- **Per-stage detail:** `.claude/cloning-pipeline-stages.md` — full script inventory, DB tables, and gate detail per stage
- **Canonical pipeline spec:** `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md`
- **Clone-fidelity measurement (canonical):** `.claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md` (computed-parity + Stage 11.6 + CLAUDE.md rule 4a)
- **State / current front / D-ceiling:** `.claude/state.md` + `.claude/next-session-prompt.md` (do not cache these here — they drift)
- **Decisions log:** `.claude/decisions.md`
