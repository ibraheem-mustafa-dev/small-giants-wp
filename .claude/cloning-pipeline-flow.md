---
doc_type: reference
project: small-giants-wp
purpose: Overview of the SGS Cloning Pipeline — stage-index table, entry-point chain, cross-cutting principles, and pointers to per-stage detail. Per-stage annotated blocks live in cloning-pipeline-stages.md.
session_date: 2026-07-05
last_annotated: 2026-07-05
regenerated_note: Regenerated 2026-07-05 after D276 (the frozen-engine deletion, commit c8690345). Every claim below was traced against sgs-clone-orchestrator.py, converter/entry.py, converter/walk.py, converter/services/extraction.py|assembly.py|css_pass.py at that date. Line numbers will drift as the code changes — if a citation looks wrong, grep for the named function/constant rather than trusting the number. Supersedes the 2026-07-04 revision, which still described the SGS_NEW_ENGINE fork + frozen fallback — both DELETED at D276.
registry_entry: docs-registry.yaml canonical_docs (cloning-pipeline-flow.md)
companion_docs:
  - .claude/cloning-pipeline-stages.md - per-stage annotated blocks (scripts, files, DB, gates, status)
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md - canonical pipeline spec (Spec 31)
update_triggers:
  - Pipeline stage change (new stage, retired stage, renumbered)
  - Script wired or unwired (status flip in any stage block)
  - DB schema change affecting any pipeline stage
  - Any change to converter/entry.py's failure contract or the orchestrator's status:'failed' handling
---

# SGS Cloning Pipeline — Overview

Per-stage annotated blocks (scripts, files, DB tables, gates, status) are in
`.claude/cloning-pipeline-stages.md`. This file is the cold-start map.

> **STATUS (2026-07-05, D276):** the modular `plugins/sgs-blocks/scripts/converter/` engine is the ONLY converter. Stage 4 enters via `converter/entry.py::convert_section()`, which calls `converter.recognition.recognise_section()` then `converter.services.assembly.build_block_markup()` unconditionally — no flag, no fork, no fallback. **The frozen engine (`orchestrator/converter_v2/convert.py`, ~6,386 lines, imported as `v3`) and the `SGS_NEW_ENGINE` environment-variable gate that used to fork between them are DELETED** (EXECUTION Step 16, commit `c8690345`). Anything below describing "the two converters," a frozen fallback, or `SGS_NEW_ENGINE` is historical — read it as "how it used to work," not current architecture. Failure contract: an unrecognised section, or an empty/non-`wp:` emit, or a raised exception returns `status:'failed'` + `failure_reason` (never a silent empty `sgs/container`) — see the Stage 4 row below for a KNOWN GAP in how the orchestrator currently consumes that status. Live plan: read `.claude/CLAUDE.md` → "Authoritative pointers" for the current canonical plan pointer (it moves; do not cache its filename here).

---

## How cloning fidelity works — DO NOT REDESIGN THIS

**Read this before proposing any change to the cloning pipeline or fidelity strategy.**

**What a draft is:** an HTML file with embedded CSS whose classes follow SGS-BEM convention (`.sgs-<block>__<element>--<modifier>`). The converter's job is to faithfully transfer that draft's visual CSS into native WordPress SGS block attributes — producing a clone that looks identical to the draft AND remains fully editable in the block editor.

**Content and CSS are ONE recursive walk, not two passes (Spec 31 §2/§3).** `converter/services/assembly.py:build_block_markup()` (line 48) merges variant attrs → CSS attrs → content ScalarLifts into ONE attrs dict per element, content winning on collision (the dispatch itself is the structural-signature registry in `converter/walk.py`, see Stage 4 detail in `cloning-pipeline-stages.md`). No per-section code branches. No 4th walker exception without a spec amendment (R-31-3) — the 3 permitted exceptions are atomic-tag swap / chrome-skip at top level (`converter/services/section_passes.py:SKIP_TOP_LEVEL_TAGS`) / top-level section wrap in `sgs/container`.

**Block choice is DB-driven, never invented (R-31-1):**
- Stage 1 (`recogniser/per-section-convention-voter.py`) finds section-roots.
- Stage 2 (`recogniser/confidence-matrix.py`) matches each section to the best-fit SGS block, cross-checked against `wp-blocks.py match` (`stage_2_match()`, sgs-clone-orchestrator.py:997).
- `converter/recognition.py:recognise_section()` (~line 167) is the ONE recognition entry: a genuine no-match top-level section DEFAULTS to `db_lookup.container_default_slug()`; a genuinely AMBIGUOUS tie (≥2 registered candidates) stays loud `unrecognised` — which `converter/entry.py::_convert_section_body()` then surfaces as `status:'failed'` with a `failure_reason`, never a silent empty container.
- Every BEM node → block slug via DB lookup (`db_lookup.standalone_block_for()`, `converter/recognition.py:89-97`). No per-section bespoke blocks, no hardcoded dicts.

**Fidelity = transferring the draft's CSS onto the chosen block's EDITABLE attributes** (Spec 31 §13.6 universal wrapper-conversion procedure): `align` / `maxWidth` / `contentWidth` / `gap` / `gridTemplateColumns` / `gridItem*` / background / padding. The clone reproduces the draft AND stays editable + reusable.

**Anti-pattern warning:** when a cloned section looks wrong, the fix is ALWAYS "complete the DB-driven attribute-transfer for that property". NEVER invent per-section blocks, hardcode values, or bypass the converter/DB. (blub.db 329 / `rule-critique-is-not-fix-shape-confirmation`)

---

## The converter (historical: "the two converters", pre-D276)

**(historical — deleted at D276, 2026-07-05).** Until D276 there were two converters wired behind a runtime fork: a frozen `orchestrator/converter_v2/convert.py` (imported as `v3`, production default) and the modular `converter/` engine, reachable only when the operator set `SGS_NEW_ENGINE=1`. The 2026-07-04 verification run (Mama's Munches homepage) measured the frozen fallback firing for zero of 7 content sections — evidence the new engine was already carrying production traffic before the fork was removed. EXECUTION Step 16 (commit `c8690345`, 2026-07-05) then deleted `orchestrator/converter_v2/` outright and removed the `SGS_NEW_ENGINE` gate; `converter/entry.py::convert_section()` is now the sole entry point, called unconditionally.

**Current architecture (post-D276):**

| | Entry point | What it does |
|---|---|---|
| Stage 4 call site | `sgs-clone-orchestrator.py:1387` — `from converter.entry import convert_section as _conv_section`, called at line 1464 | Per-section HTML+CSS → block markup |
| `convert_section()` | `converter/entry.py:137` (thin trace-lifetime wrapper around `_convert_section_body`) | Binds/unbinds the per-section trace, delegates to the body |
| `_convert_section_body()` | `converter/entry.py:186` | 1) chrome-skip if `root.name in SKIP_TOP_LEVEL_TAGS` (line 227) → `status:'chrome-skipped'`; 2) `_absorb_transparent_wrappers(root, css_rules)` pre-pass (line 247); 3) `recognise_section(root)` (line 260) — unrecognised/no-slug → `failure_reason` set, no markup attempted; 4) `build_block_markup(rec, root, css_rules=css_rules, media_map=media_map or {})` (line 264) — empty/non-`wp:` result or a raised exception also sets `failure_reason`; 5) on any `failure_reason`, returns `status:'failed'` (lines 275-293) — loud, never a silent empty container; 6) on success, `ensure_root_section_class()` (line 299-300) + attrs harvest, returns `status:'complete'` |
| Chrome-skip constant | `converter/services/section_passes.py:SKIP_TOP_LEVEL_TAGS` — the ONE permitted hardcoded constant (R-31-3 exception 2; header/footer/nav) | Unconditional now — no flag gates it |
| Recognition | `converter/recognition.py:recognise_section()` | See "Cross-cutting principles" below for the 4-branch order |
| Assembly (ONE-dispatch) | `converter/services/assembly.py:build_block_markup()` (line 48) | Merges variant → CSS → content attrs; delegates the structural-signature dispatch to `converter/walk.py` |

**KNOWN GAP (found by post-D276 QC, fix in progress, not yet closed):** the Stage-4 caller in `sgs-clone-orchestrator.py` (~lines 1510-1530) does not branch on `result.get("status")`. When `entry.py` returns `status:'failed'`, `block_markup` is `""`, so the `if _cv2_markup: aggregate_markup_parts.append(_cv2_markup)` guard at line 1530 simply skips appending it — the section silently disappears from the aggregate output with no corresponding `aggregate_errors` entry for the operator to see. `entry.py`'s loud-failure contract is correct; the orchestrator's consumption of that contract is the open item.

---

## Stage-index table

Every row cites the function that actually runs it, in `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` unless noted. Line numbers as of 2026-07-05 (post-D276) — the file grew ~10-20 lines vs the 2026-07-04 citations below due to the Step-16 converter-deletion comments; if a number looks off, grep the named function.

| # | Stage name | Function (file:line) | Primary output | Notes |
|---|-----------|----------------------|----------------|-------|
| -1 | Draft global-styles extraction (Spec 33) | `plugins/sgs-blocks/scripts/theme-extractor/extract.py` (standalone, run before the orchestrator) | `sites/<client>/theme-snapshot.json` | OPENING step of the whole pipeline — runs BEFORE Stage 0, before any block conversion. Measures the draft's rendered computed styles and generates the client's theme-snapshot (theme.json v3 global styles) that Stage 0 loads and that the converter's colour token-snap (§3.A step 6, Spec 31) exact-hex-snaps draft colours against. Hard prerequisite, not optional: FR-33-12 (Spec 33) fails the `/sgs-clone` run CLOSED if the snapshot wasn't generated/validated for the current draft — see Spec 33. |
| 0 | Theme cache | inline in `main()` (loads `theme/sgs-theme/theme.json` + client variation, lines 2281–2314) | `run_ctx["theme_json"]` (in-memory, no separate JSON artefact) | No preflight/mutex call here — see "Dropped claims" below |
| 0.1 | BEM compliance lint | `stage_0_1_bem_lint()` (:121) | `stage-0.1-bem-lint.json` | modes: strict (halt) / draft (warn) / legacy (bypass) |
| 0.5 | Token-usage lint | `stage_0_5_token_lint()` (:193) | `stage-0.5-token-lint.json` | additive mode writes new-token candidates, not violations |
| 0.7 | CSS lift (4-destination router) | `stage_0_7_css_lift()` (:394), delegates to `orchestrator/css_router.py:route_css()` + `write_variation_css()` | `pipeline-state/<run>/variation-d0-d2.css` (D0+D2+D3-fallback) + D3 rows in `sgs-framework.db.attribute_gap_candidates` | Falls back to a verbatim CSS dump (`_stage_0_7_verbatim_fallback()`, :502) if `css_router` import/route fails. **MF-2 RESOLVED (Step 14, 2026-07-04) as KEEP, not retire:** the router's D1 typed-attr bucket IS consumed — `ledger/coverage_check.py:199` reads `router_result["d1"]` for conservation accounting (the KEEP decision). It also has two pre-D1 passthrough branches (`css_router.py`, EXECUTION Step 13): a pseudo-element selector routes straight to D2 (no attr destination), and a non-device `@media` condition (thresholds outside the canonical 375/768/1440 set) also routes to D2, preserving the rule faithfully rather than dropping it. |
| 1 | Section boundary detection | `stage_1_boundary()` (:936) → subprocess `recogniser/per-section-convention-voter.py`, enriched by `orchestrator/stage1_boundary_hook.py:enrich_stage1_payload()` | `voter.json`, `stage-1.json` | lingua-franca conversion added here for non-SGS-BEM drafts |
| 2 | Block-type match | `stage_2_match()` (:997) → `recogniser/confidence-matrix.py:score_candidates()`, cross-checked against `wp-blocks.py match` | `stage-2.json` | wp-blocks result overrides confidence-matrix when it's >0.3 more confident |
| 3 | Slot list | `stage_3_slot_list()` (:1093) — reads each matched block's `block.json`, tags each attr `canonical_source: db` or `auto-derived` | `stage-3.json` | `auto-derived` sets `slot_canonicalisation_gap=True` for operator review |
| 4 | Extract + convert (per section) | `stage_4_5_6_7_8_extract()` (:1205) — loops every Stage-2 match, loads `--media-map` JSON (:1435–1438), calls `convert_section()` imported from `converter.entry` (:1387, called :1464) | `extract-result.json`, `stage-4.json` | `converter/entry.py` is the ONLY converter (the frozen `orchestrator/converter_v2/` package + `SGS_NEW_ENGINE` fork were DELETED at D276, 2026-07-05); the legacy `recogniser-v2/extract.py` subprocess remains permanently retired. An unrecognised/failed section returns `status:'failed'` + `failure_reason` (loud, per Rule 4) rather than emitting nothing silently — but see the KNOWN GAP note above: the orchestrator (~:1510-1530) doesn't yet branch on `status:'failed'`, so a failed section's empty markup is dropped from the aggregate without an `aggregate_errors` entry (fix in progress) |
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
0.  plugins/sgs-blocks/scripts/theme-extractor/extract.py (Spec 33)   ✓ OPENING STEP
       ↓ generates sites/<client>/theme-snapshot.json — hard prerequisite,
         FR-33-12 fails closed if missing/stale for the current draft
       ↓ then
1.  /sgs-clone command
       ↓ invokes
2.  plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py main()   ✓ ENTRY POINT
       ↓ runs stages 0.1 → 4j inline / via subprocess (table above)
       ↓ Stage 4 imports converter.entry (convert_section) — the
         ONLY converter as of D276 (no fork, no flag, no fallback;
         the frozen orchestrator/converter_v2 package is DELETED)
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

**Dropped / corrected claims (accumulated; most recent first):**
- **(2026-07-05, D276) The frozen `orchestrator/converter_v2/` package, the `SGS_NEW_ENGINE` fork, and the `convert.py`/`v3.walk()` fallback are DELETED, not merely "opt-out".** Any doc, memory entry, or STATUS block still describing "the frozen engine is the production default" or "set SGS_NEW_ENGINE=1 to reach the new engine" is stale as of EXECUTION Step 16 (commit `c8690345`). `converter/entry.py::convert_section()` is the only Stage-4 entry point, called unconditionally.
- (historical, still true) `essence_match_detector.py` EXISTS but is not referenced by the current driver either; it was lazy-loaded by the now-deleted frozen `convert.py:216-226` inside Stage 4 (soft-fail on ImportError). `css_router.py` remains Stage 0.7's dispatcher — never a bare inline load at the entry point.
- `orchestrator/mutex.py` and a standalone "Stage 0 — Pre-flight" row citing `preflight_chain.run_preflight() + run_precommit_gate` as something `main()` calls directly — **not found**. `main()` does its own inline theme-cache load; `preflight_chain.py` is only reached transitively, later, inside `orchestrator_main.run()` (step 3 above).
- `orchestrator/composer_fallback.py` — retired 2026-05-14 (comment at sgs-clone-orchestrator.py:539); an unmatched/unrecognised section now returns `status:'failed'` (post-D276) or previously surfaced to the operator via Stage 9 — it does not fall through to a composer.
- Stage 11 (pixel-diff, `upload_and_patch.py` post-Stage-10) and Stage 11.5 (parity2) — both REMOVED 2026-07-04 (see stage table above). Any doc or memory still describing them as LIVE is stale.
- "Stage 8 — Deploy + Visual Parity QA via `autonomy_gate.py` + `visual_qa_capture.py`" as a numbered pipeline stage with a real pixel-diff capture — the capture path is a stub (`visual_qa_capture.stub_capture`) only; there is no live-capture visual QA stage left in the pipeline. The +REGISTER promotion gate is what actually decides "faithful enough", keyed on Stage 11.6.
- `.claude/decisions.md`/prior handoffs referencing `sourceMode='bound'` as reachable from cloning — confirmed still retired (D182); the modular converter never emits it for cloned trust-bars.

---

## Cross-cutting principles

**One recursive stream, content + CSS together (Spec 31 §2/§3).** There is no separate "extract content" pass followed by a separate "extract CSS" pass. `build_block_markup()` (`converter/services/assembly.py:48`) makes the merge explicit: variant attrs, then CSS attrs, then content ScalarLifts — content overwrites CSS on a key collision, except for `gridItem*` defaults which use `setdefault` so an explicit CSS-pass value always wins. The dispatch key itself is computed once per node by the structural-signature registry in `converter/walk.py` (Spec 31 §13.3 FR-31-2.7/2.8).

**DB-driven, no hardcoded dicts (R-31-1).** Block identity, container-kind, and property routing resolve from `sgs-framework.db` (`converter/db/db_lookup.py`), never from an `if slug == "sgs/x"` literal. `dispatch_table.py` is the canonical example: it routes a `(layer, css_property)` pair to exactly one resolver id using DB tables (`property_suffixes`, `block_attributes`, an excluded-properties table) — it names no block.

**`converter/` is the ONLY converter (post-D276, 2026-07-05).** Every clone runs 100% through `converter.entry.convert_section()` → `recognise_section()` → `build_block_markup()`. There is no flag, no fork, no fallback — the frozen `orchestrator/converter_v2/convert.py` package and the `SGS_NEW_ENGINE` environment-variable gate that used to select between two engines were DELETED at EXECUTION Step 16 (commit `c8690345`). *(Historical, pre-D276: `SGS_NEW_ENGINE` unset meant every clone ran through the frozen `v3.walk()`; setting it to `1` activated a hybrid per-section fork that tried the modular engine first and fell back to the frozen walker on an unrecognised/empty emit. This is retained here only so old traces/logs referencing the flag make sense; it has no effect today.)*

**Media resolution is live end-to-end (verified 2026-07-05).** `main()` parses `--media-map <file>` into a dict at `stage_4_5_6_7_8_extract()` (~lines 1435-1438); that dict is threaded into `convert_section(..., media_map=_media_map_obj, ...)` (~line 1464→1467). `converter/services/lift_helpers.py:resolve_media_url()` looks up the mockup `<img src>` basename against the map and returns the resolved WP media URL, falling back to the original `src` on a miss.

**Chrome (header/footer/nav) is skipped, never cloned as page content.** Exception 2 of the 3 permitted walker exceptions (R-31-3). `converter/entry.py::_convert_section_body()` (line 227) returns `status:'chrome-skipped'` immediately when `root.name in SKIP_TOP_LEVEL_TAGS` (`converter/services/section_passes.py`) — the one permitted hardcoded constant (3 entries: header/footer/nav). Unconditional now — no flag gates it.

**Structural gates fire in a fixed order, before deploy.** Anti-mirror (`pipeline-stage-gate.py` wrapping `check_no_mirror.py`) runs immediately after Stage 9 and HALTS the whole run on a new violation — before media-sideload, before deploy, before +REGISTER. wp-blocks schema validation (Stage 4j) is soft-fail by default but becomes a hard gate inside `orchestrator_main.run()` unless `--no-schema-validation` is passed. The +REGISTER promotion decision is the ONLY gate keyed on rendered fidelity (Stage 11.6's `overall_css_pct`), not on any earlier stage's output — an auto-promotion convenience; per Spec 31 §7b/R-31-13 the number alone never closes fidelity (Bean's eye is co-authoritative). **KNOWN GAP:** the anti-mirror gate and the schema-validation gate both operate on whatever markup made it into `extract.json`/the aggregate — a section that returned `status:'failed'` contributes no markup and is therefore invisible to both gates too, not just to the operator (see the Stage 4 known-gap note above).

**Measured baseline, honest as of D276 (2026-07-05, post-programme, Mama's Munches homepage via Stage 11.6 computed-parity):** content match ~90%; CSS match 67% at 375px, 69% at 768px, 76% at 1440px. These figures are AFTER two rounds of fixing bugs found IN the computed-parity measurement instrument itself (a collection bug and a pairing bug — the tool is code, and code is QC-able; don't quote a parity number without checking what produced it). The prior 2026-07-04 pre-programme baseline (content 77%; CSS 47%/49%/54%) is superseded — cite the D276 figures as the current dated baseline, not a live number; re-run Stage 11.6 for today's.

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
- **State / current front / D-ceiling:** `.claude/LEDGER.md` (the one living status; do not cache these here — they drift)
- **Decisions log:** `.claude/decisions.md`
