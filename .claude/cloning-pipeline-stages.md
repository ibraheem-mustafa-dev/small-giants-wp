---
doc_type: reference
project: small-giants-wp
purpose: Per-stage annotated blocks for the SGS Cloning Pipeline. Every stage shows the function that actually runs it, files read/written, DB tables touched, and wiring status. Overview and stage-index table are in cloning-pipeline-flow.md.
session_date: 2026-07-04
last_annotated: 2026-07-04
regenerated_note: Regenerated 2026-07-04 from the live scripts (execution-plan Step 1). Traced end-to-end against sgs-clone-orchestrator.py main() (2888 lines), plugins/sgs-blocks/scripts/orchestrator/converter_v2/__init__.py, and plugins/sgs-blocks/scripts/converter/ (the new modular engine).
line_number_policy: Line numbers cited are accurate as of 2026-07-04 against sgs-clone-orchestrator.py HEAD. If they drift, grep for the named function/constant instead of trusting the number.
update_triggers:
  - Pipeline stage change (new stage, retired stage, renumbered)
  - Script wired or unwired (status flip in any stage block)
  - DB schema change affecting any pipeline stage
  - New-engine (converter/) coverage change (which sections it now handles vs falls back)
---

# SGS Cloning Pipeline — Per-Stage Annotated Blocks

Overview and stage-index table: `.claude/cloning-pipeline-flow.md`

> **STATUS (2026-07-04):** the frozen `converter_v2/convert.py` (imported as `v3`) is the production converter for every clone by default. The new modular engine at `plugins/sgs-blocks/scripts/converter/` is reachable only when `SGS_NEW_ENGINE=1` is set (STOP-28). Stage 11 (pixel-diff) and Stage 11.5 (parity2) were REMOVED 2026-07-04 — Stage 11.6 (computed-parity) is now the sole rendered-fidelity signal.

---

## Stage 0 — Theme cache (inline, no wrapper function)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHERE: sgs-clone-orchestrator.py main(), lines 2281-2314 (inline, no         │
│        stage_0_*() function wraps this).                                    │
│                                                                             │
│ WHAT IT DOES (plain English): loads the base theme.json plus the client's  │
│ theme-snapshot.json ONCE per run, merges them (client overrides win per     │
│ token slug), and stashes the merged dict in run_ctx["theme_json"] so every  │
│ later stage reads the SAME tokens. When a later section mints a new design  │
│ token, _reflect_new_token_in_theme_json() (line 685) mutates this SAME dict │
│ so the next section in the run sees it too.                                 │
│                                                                             │
│ FILES (R):                                                                  │
│  theme/sgs-theme/theme.json (base tokens)                                   │
│  sites/<client>/theme-snapshot.json (client overlay — resolved by           │
│    _client_variation_path(), line 175; falls back to the legacy             │
│    theme/sgs-theme/styles/<client>.json path if the new one is missing)     │
│                                                                             │
│ FILES (W):    none — the merged dict lives only in run_ctx, in-memory       │
│ DB tables:    none                                                          │
│ STATUS:       LIVE — confirmed no separate stage-0*.json artefact is        │
│               written; do NOT expect one when debugging a run.             │
│ CORRECTED (was stale): the previous version of this doc claimed             │
│   orchestrator/preflight_chain.py:run_preflight() ran here. Grepped         │
│   sgs-clone-orchestrator.py for "preflight_chain" — zero matches.           │
│   preflight_chain.py IS reached, but only later, transitively, inside       │
│   orchestrator_main.run() (see the "Autonomy chain" block below).           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 0.1 — BEM compliance lint

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FUNCTION: stage_0_1_bem_lint() — sgs-clone-orchestrator.py:121               │
│ DELEGATES TO: plugins/sgs-blocks/scripts/lints/bem-lint.py                   │
│                (lint_html_file(), loaded via _load_lint_module())            │
│                                                                             │
│ WHAT IT DOES: checks every class token in the draft HTML against SGS-BEM    │
│ convention (.sgs-<block>__<element>--<modifier>). strict mode halts the     │
│ whole run on any violation (sys.exit at line 171); draft mode logs and       │
│ continues; legacy bypasses entirely.                                        │
│                                                                             │
│ FILES (R):   the mockup HTML passed via --mockup                            │
│ FILES (W):   pipeline-state/<run_id>/stage-0.1-bem-lint.json                │
│ DB tables:   none                                                          │
│ STATUS:      LIVE                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 0.5 — Token-usage lint

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FUNCTION: stage_0_5_token_lint() — sgs-clone-orchestrator.py:193             │
│ DELEGATES TO: plugins/sgs-blocks/scripts/lints/token-lint.py                 │
│                (lint_html_inline_styles())                                  │
│                                                                             │
│ WHAT IT DOES: scans inline style="" declarations in the draft. Default      │
│ (additive) mode turns any non-token raw value into a NewTokenCandidate in   │
│ a TokenWritePlan rather than flagging it as an error. Legacy                │
│ --no-new-tokens mode reverts to strict-or-warn violations (Spec 15 §9).     │
│                                                                             │
│ FILES (R):   the mockup HTML; the client's theme-snapshot.json (as the      │
│              variation_paths list, so candidates are checked against       │
│              client tokens too)                                            │
│ FILES (W):   pipeline-state/<run_id>/stage-0.5-token-lint.json              │
│ DB tables:   none                                                          │
│ STATUS:      LIVE                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 0.7 — CSS lift (4-destination router)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FUNCTION: stage_0_7_css_lift() — sgs-clone-orchestrator.py:394               │
│ DELEGATES TO: plugins/sgs-blocks/scripts/orchestrator/css_router.py          │
│                route_css() + write_variation_css() + write_d3_to_db()       │
│                                                                             │
│ WHAT IT DOES: harvests every CSS source the mockup references (inline       │
│ <style> blocks + local <link rel=stylesheet> files — external/CDN URLs are  │
│ skipped, _collect_mockup_css(), line 339) and routes each rule into one of  │
│ 4 buckets (Spec 16 §FR6): D0 global/reset (unscoped), D1 typed-attr lift    │
│ (⚠ a DEAD OUTPUT — the router classifies rules into its d1 dict but NO     │
│ downstream code reads it, verified 2026-07-04; cv2 independently re-derives │
│ typed attrs from the raw css_rules. css_router.py:748's "consumed inline"   │
│ docstring is STALE. D1's fate = an OPEN decision, completion plan Step 14   │
│ / Spec 31 MF-2: retire OR rewire), D2 wrapper CSS                          │
│ (scoped to .page-id-N), D3 gap candidates (written to the DB AND as a D2   │
│ fallback). Falls back to a verbatim CSS dump                               │
│ (_stage_0_7_verbatim_fallback(), line 502) if css_router import/route fails.│
│                                                                             │
│ FILES (R):   mockup HTML + any local linked stylesheets                    │
│ FILES (W):   pipeline-state/<run_id>/variation-d0-d2.css (D0+D2+D3-fallback)│
│ DB tables:   sgs-framework.db.attribute_gap_candidates (D3 rows)           │
│ STATUS:      LIVE                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1 — Section boundary detection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FUNCTION: stage_1_boundary() — sgs-clone-orchestrator.py:936                 │
│ SUBPROCESS: plugins/sgs-blocks/scripts/recogniser/per-section-convention-    │
│              voter.py                                                       │
│ ENRICHED BY: orchestrator/stage1_boundary_hook.py:enrich_stage1_payload()    │
│              (adds source_convention / primary_sgs_bem / gap_candidate_     │
│              classes / lingua_franca_skipped per boundary; soft-fails to    │
│              raw voter output on error)                                     │
│                                                                             │
│ FILES (R):   the mockup HTML                                                │
│ FILES (W):   pipeline-state/<run_id>/voter.json (rewritten in place after   │
│              enrichment), stage-1.json                                     │
│ DB tables:   none directly (voter uses blocks.tier internally — see        │
│              stage2 for the confirmed DB-table touches)                    │
│ STATUS:      LIVE                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 2 — Block-type match

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FUNCTION: stage_2_match() — sgs-clone-orchestrator.py:997                    │
│ DELEGATES TO: plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py    │
│               score_candidates() (imported, not subprocess)                 │
│ CROSS-CHECK: ~/.claude/hooks/wp-blocks.py match <description> — when the    │
│              wp-blocks CLI is more confident by >0.3, its result WINS      │
│              (chosen_source="wp_blocks_cli"), logged as a warning.          │
│                                                                             │
│ FILES (R):   pipeline-state/<run_id>/voter.json (Stage 1 output)           │
│ FILES (W):   pipeline-state/<run_id>/stage-2.json                          │
│ DB tables:   sgs-framework.db (via confidence-matrix's                     │
│              discover_registered_blocks/patterns/scaffolds)                │
│ STATUS:      LIVE                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 3 — Slot list

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FUNCTION: stage_3_slot_list() — sgs-clone-orchestrator.py:1093               │
│ DELEGATES TO: orchestrator/converter_v2/db_lookup.py:block_attrs()           │
│               (via the module-local _load_db_block_attrs() helper, :1076)   │
│                                                                             │
│ WHAT IT DOES: for every attribute declared in the matched block's           │
│ block.json, tags the slot entry with canonical_source: 'db' (DB row found)  │
│ or 'auto-derived' (DB miss, fell back to block.json inference, flags        │
│ slot_canonicalisation_gap=True for operator review). auto-derived is        │
│ NEVER silently treated as canonical.                                       │
│                                                                             │
│ FILES (R):   plugins/sgs-blocks/src/blocks/<slug>/block.json for each match │
│ FILES (W):   pipeline-state/<run_id>/stage-3.json                          │
│ DB tables:   sgs-framework.db.block_attributes                            │
│ STATUS:      LIVE                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 4 — Extract + convert (per section)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FUNCTION: stage_4_5_6_7_8_extract() — sgs-clone-orchestrator.py:1202         │
│                                                                             │
│ WHAT IT DOES: loops every Stage-2 match. For each boundary:                 │
│  1. Builds the section's HTML + merged CSS (mockup inline <style> blocks +  │
│     Stage 0.7's variation-d0-d2.css, the "G2 merge", lines 1386-1410).      │
│  2. Loads --media-map JSON into a dict (lines 1425-1428):                   │
│       if args.media_map and args.media_map.exists():                       │
│           _media_map_obj = json.loads(args.media_map.read_text(...))       │
│  3. Calls convert_section() — imported as _conv_section from                │
│     orchestrator.converter_v2 — at lines 1454-1467:                        │
│       result = _conv_section(html=_section_html, css=_section_css,          │
│           media_map=_media_map_obj, client_slug=..., repo_root=REPO,        │
│           trace=_cv2_trace, boundary_id=boundary_id,                       │
│           section_id=m.get("section_id") or "")                            │
│     convert_section lives in orchestrator/converter_v2/__init__.py and      │
│     internally forks between the frozen v3.walk() and the new converter/    │
│     engine (SGS_NEW_ENGINE=1) — see "The two converters" in                 │
│     cloning-pipeline-flow.md.                                              │
│  4. An unmatched section (confidence==0 and NOT cv2-eligible) emits NO      │
│     markup and is reported "status": "unmatched" for Stage 9 to surface —   │
│     composer_fallback (the old best-effort filler) was RETIRED 2026-05-14  │
│     (line 539 comment) specifically so a catalogue gap is never masked.    │
│                                                                             │
│ FILES (R):   mockup HTML; pipeline-state/<run_id>/voter.json;               │
│              pipeline-state/<run_id>/variation-d0-d2.css; --media-map JSON  │
│ FILES (W):   pipeline-state/<run_id>/extract-result.json, stage-4.json,     │
│              (when --debug-trace, the default) convert-trace-<boundary>.    │
│              jsonl per section                                             │
│ DB tables:   sgs-framework.db (block_attributes, slots, roles,              │
│              variant_slots, property_suffixes — read via db_lookup.py)     │
│ STATUS:      LIVE. cv2 (converter_v2) is the ONLY supported extraction      │
│              path — the legacy recogniser-v2/extract.py subprocess is      │
│              permanently retired (docstring, line 1206).                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 4 sub-mechanism — the frozen-vs-new-engine fork

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHERE: orchestrator/converter_v2/__init__.py, inside the section-level      │
│        function that convert_section() calls (the code below runs once     │
│        per top-level section).                                             │
│                                                                             │
│ 1. CHROME-SKIP (:385-398) — gated on SGS_NEW_ENGINE=1. If                   │
│    root.name in v3.SKIP_TOP_LEVEL_TAGS (header/footer/nav — the ONE        │
│    permitted hardcoded constant, R-31-3 exception 2), returns a             │
│    "status": "chrome-skipped" result immediately — never cloned as page    │
│    content.                                                                │
│                                                                             │
│ 2. TRANSPARENT-WRAPPER ABSORB (:407) — v3._absorb_transparent_wrappers(     │
│    root, css_rules). Runs UNCONDITIONALLY for BOTH engines. When a section  │
│    has exactly one direct BEM-named, non-composite child, its className    │
│    is absorbed into the section root so the walker emits ONE sgs/container  │
│    instead of two nested ones.                                            │
│                                                                             │
│ 3. NEW-ENGINE HYBRID FORK (:409-443) — gated on SGS_NEW_ENGINE=1:           │
│      from converter.recognition import recognise_section as _recognise     │
│      from converter.services.extraction import build_block_markup as _bbm  │
│      _rec = _recognise(root)                                              │
│      if _rec.slug and _rec.kind != "unrecognised":                         │
│          _new = _bbm(_rec, root, css_rules=css_rules, media_map=media_map  │
│                       or {})                                               │
│          if _new and "wp:" in _new:                                       │
│              block_markup = _new                                          │
│    Any exception in this block is caught and block_markup silently resets  │
│    to "" — the fallback below then runs. Default (flag unset): this whole  │
│    block never executes; block_markup stays "".                           │
│                                                                             │
│ 4. FROZEN FALLBACK (:442-443):                                             │
│      if not block_markup:                                                 │
│          block_markup = v3.walk(root, css_rules, variation_buf, depth=0,   │
│                                  is_top_level=True) or ""                  │
│    This is the ONLY path when SGS_NEW_ENGINE is unset — 100% of production │
│    clones today.                                                          │
│                                                                             │
│ 5. ROOT CLASSNAME GUARANTEE (:454) — v3.ensure_root_section_class(          │
│    block_markup, section_id). Runs UNCONDITIONALLY for BOTH engines,       │
│    idempotent, DB-driven off the Stage-3 section_id (not the walker        │
│    branch that produced the markup).                                      │
│                                                                             │
│ MEASURED (2026-07-04, Mama's Munches homepage, SGS_NEW_ENGINE=1): step 4   │
│ (frozen fallback) fired for ZERO of the 7 content sections — all 7 plus    │
│ the skip-link emit went through step 3 (the new engine).                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 4 sub-mechanism — the new engine's own recognition + emit (when SGS_NEW_ENGINE=1)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FILES: plugins/sgs-blocks/scripts/converter/recognition.py,                 │
│        plugins/sgs-blocks/scripts/converter/services/extraction.py,        │
│        plugins/sgs-blocks/scripts/converter/dispatch_table.py,             │
│        plugins/sgs-blocks/scripts/converter/resolvers/__init__.py          │
│                                                                             │
│ recognise() — recognition.py:46. 4-branch order (design §1), each DB-      │
│ driven (R-31-1), no per-block literal:                                    │
│   1. NAMED/composite  — a BEM root class (.sgs-<x>) mapping to a           │
│      registered block via db_lookup.block_exists("sgs/"+x) (line 58)      │
│   2. ATOMIC-TAG        — no sgs- root class, bare tag maps via             │
│      db_lookup.atomic_tag_map() (line 75-79)                              │
│   3. SCALAR element-slot — a BEM element class (.sgs-x__y) maps via        │
│      db_lookup.standalone_block_for() (line 89-97); has_inner_blocks is    │
│      DERIVED from the DB here, never hardcoded 0 (a slot can map to an     │
│      InnerBlocks-parent block — hardcoding 0 was the real-hero CTA-loss    │
│      bug, fixed 2026-06-30). NOTE: has_inner_blocks is RETIRED as the      │
│      dispatch signal (Spec 31 FR-31-2.6) — the per-attr emit_shape column  │
│      (seeded, 105 nested/33 child) replaces it; today's reads are legacy   │
│      pending the completion plan's Step 8 migration + Phase 6 column drop  │
│   4. UNRECOGNISED      — loud RED gap (unrecognised_gap(), line 103),      │
│      never a silent empty sgs/container                                   │
│                                                                             │
│ recognise_section() — recognition.py:167. Section-root-only refinement     │
│ (FR-31-4): if recognise() returns unrecognised AND it's a genuine          │
│ no-match (zero registered candidates, not an ambiguous tie), DEFAULTS to   │
│ db_lookup.container_default_slug() (line 215) instead of failing loud.     │
│ An ambiguous tie (≥2 registered candidates) stays unrecognised — never     │
│ silently swallowed into a container (R-31-9).                             │
│                                                                             │
│ build_block_markup() — services/extraction.py:1319. The Spec 31 §3         │
│ ONE-dispatch unification: merges variant attrs -> CSS attrs                │
│ (_build_css_attrs(), :1361) -> content ScalarLifts (extract_content(),     │
│ :1364) into one dict; content overwrites CSS on collision, except          │
│ gridItem* defaults (setdefault — CSS pass wins, :1370-1380). Post-lift     │
│ passes on the same dict: §2.3 layout trigger (:1394-1398, sets            │
│ layout="grid"/"flex" when the block's own CSS is display:grid/flex and    │
│ the block declares a `layout` attr), §2.4/FR-31-5.3 composite band-fold    │
│ (:1400-1432 — ⚠ currently a REDUCED pipeline: the BEM-less fallback lifts  │
│ ONLY max-width and the interior router uses a hand-rolled prop ladder,     │
│ silently dropping other band declarations; scheduled to unify into the ONE │
│ shared cascade — completion plan Step 7 / 2e2) (folds a sole pass-through  │
│ inner wrapper's box CSS onto the                                           │
│ composite's own contentWidth/contentBandPadding* attrs), FR-31-20 variant  │
│ fingerprint detection (:1434-1449, sets the variant-selector attr from the │
│ draft's lifted attrs via db_lookup.detect_variant()), and inheritStyle     │
│ resolution (:1451-1468, ports convert.py's --modifier -> is-style-<preset> │
│ mapping for string-enum inheritStyle blocks like sgs/button).             │
│                                                                             │
│ dispatch_table.py:resolver_id() — the DB-sourced routing function: given   │
│ (layer, css_property) + has_inner_blocks, returns exactly one resolver id  │
│ (typography / excluded / outer_box / content_band / grid / grid_area /     │
│ scalar_media / scalar_content / unrouted). NAMES NO BLOCK (line 5).       │
│                                                                             │
│ resolve_media_url() — services/lift_helpers.py:133-148. Resolves a mockup  │
│ <img src> basename against the media_map dict threaded in from Stage 4;    │
│ returns src unchanged on a miss (empty src, empty map, or no basename hit).│
│                                                                             │
│ DB tables:   sgs-framework.db (blocks, block_attributes, property_suffixes,│
│              variant_slots, roles, slots — read via converter_v2/          │
│              db_lookup.py, the ONE frozen-engine import the new engine is  │
│              permitted to reuse)                                          │
│ STATUS:      opt-in only (SGS_NEW_ENGINE=1). Inert in production.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 9 — Coverage + gap reporting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FUNCTION: stage_9_report() — sgs-clone-orchestrator.py:1900                  │
│                                                                             │
│ SUB-STEPS (each individually soft-fail, so one failure never blocks the    │
│ rest of Stage 9):                                                          │
│  9a router     — subprocess recogniser/leftover-bucket-router.py, writes   │
│                  leftover-buckets.json                                    │
│  9b log        — INSERT into uimax recognition_log (soft-fail)            │
│  9b-autonomy   — stage_9b_autonomy_chain() (:1697), scaffolds/promotes new │
│                  SGS blocks for unrecognised-section candidates            │
│  9c attr-gap   — recogniser/attribute-gap-writer.py, harvests every        │
│                  is_gap_candidate=true token resolution                    │
│  9d func-gap   — recogniser/functionality-gap-detector.py, harvests        │
│                  behaviour-fingerprint attrs (data-toggle, aria-expanded,  │
│                  inline on*-handlers) from the mockup DOM                  │
│  9e gap-report — recogniser/gap-review-report.py, renders gap-review.md    │
│  9f review-html— subprocess recogniser/simple_html_review_report.py,       │
│                  renders operator-review.html                             │
│  9g coverage   — inline roll-up: extracted-attr count vs slot-list count   │
│                  per boundary                                             │
│                                                                             │
│ FILES (R):   voter.json, match.json, slot-list.json, extract.json (all     │
│              re-serialised copies of the earlier stages' in-memory dicts) │
│ FILES (W):   pipeline-state/<run_id>/leftover-buckets.json,                │
│              operator-review.html, gap-review.md, stage-9.json            │
│ DB tables:   uimax recognition_log; attribute_gap_candidates lives in     │
│              sgs-framework.db (2,443 rows, verified 2026-07-04)           │
│ STATUS:      LIVE                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Gate — R-31-15 anti-mirror gate (STOP-6, wired 2026-06-21)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHERE: main(), sgs-clone-orchestrator.py:2386-2404 — runs immediately       │
│        after Stage 9 writes extract.json, BEFORE media-sideload, deploy,   │
│        or +REGISTER.                                                      │
│ SUBPROCESS: orchestrator/pipeline-stage-gate.py <run_dir>, which wraps      │
│              orchestrator/check_no_mirror.py --enforce --baseline          │
│              --baseline check-no-mirror-baseline.json                     │
│                                                                             │
│ WHAT IT DOES: scans extract.json for a "mirror cheat" — a draft-class      │
│ container (className carrying a BEM element class like sgs-x__y) or a     │
│ bound sourceMode. Baseline-aware: violations already in                   │
│ check-no-mirror-baseline.json are grandfathered; only a NEW violation      │
│ causes a non-zero exit, which HALTS the whole pipeline run                │
│ (sys.exit(gate_proc.returncode), line 2403) before the clone can reach the │
│ live page.                                                                │
│                                                                             │
│ FILES (R):   pipeline-state/<run_id>/extract.json                         │
│ FILES (W):   none (report goes to stdout/stderr)                          │
│ DB tables:   none                                                          │
│ OPT-OUT:     --skip-stage-gate (diagnostic runs only)                     │
│ STATUS:      LIVE, hard-halts on a new violation                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 4i — Media sideload + apply-module surface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHERE: main(), sgs-clone-orchestrator.py:2407-2509                          │
│ DELEGATES TO: orchestrator/media-sideload.py:sideload_batch(); lazy-loads   │
│               orchestrator/attribute-staged-apply.py + orchestrator/        │
│               functionality-bulk-apply.py (registered in sys.modules only, │
│               not executed here)                                          │
│                                                                             │
│ WHAT IT DOES: when --deploy-target is set, uploads every image slot in     │
│ extract_out to the WP media library (idempotent — dedupes by filename      │
│ before uploading); credentials come from the per-client env file           │
│ (.claude/secrets/sandybrown.env for the canary). An auth failure is a HARD │
│ error (SideloadAuthError is re-raised, never silently falls back to        │
│ dry-run leaving 404s in the page). Without --deploy-target, this is a      │
│ dry-run inventory only (no network calls).                                │
│                                                                             │
│ FILES (R):   extract_out (in-memory), mockup_root for relative image paths │
│ FILES (W):   pipeline-state/<run_id>/media-sideload-manifest.json,          │
│              stage-4i.json                                                │
│ DB tables:   none directly (uploads via WP REST, not a DB write)          │
│ STATUS:      LIVE                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 4j — wp-blocks schema validation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHERE: main(), sgs-clone-orchestrator.py:2511-2549                          │
│ DELEGATES TO: orchestrator/wp_integration.py:validate_block_markup(), which │
│               calls the ~/.claude/hooks/wp-blocks.py CLI                   │
│                                                                             │
│ WHAT IT DOES: validates the Stage 4 aggregate block_markup against each     │
│ block's block.json attribute schema. Reads the CLI's "issues" field        │
│ (falls back to "errors" for forward-compat) — this fallback exists because │
│ a naive read of only "errors" silently dropped every "Unknown block"       │
│ diagnostic (caught 2026-05-14).                                           │
│                                                                             │
│ FILES (R):   extract_out.block_markup (in-memory)                         │
│ FILES (W):   pipeline-state/<run_id>/stage-4j.json                        │
│ DB tables:   none directly (wp-blocks CLI reads sgs-framework.db itself)  │
│ OPT-OUT:     --no-schema-validation (affects the LATER hard gate inside    │
│              orchestrator_main.run(), not this soft-fail call itself)     │
│ STATUS:      LIVE, soft-fail here                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 10 — Per-page deploy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHERE: main(), sgs-clone-orchestrator.py:2593-2672                          │
│ SUBPROCESS: orchestrator/upload_and_patch.py <run_dir> --target <kind>      │
│              --target-id <id> --client <slug> [--push-theme-snapshot]      │
│                                                                             │
│ WHAT IT DOES: opt-in via --deploy-target page:<id> / post:<id>. Uploads    │
│ referenced images (delegates to Stage 4i's manifest) and PATCHes the       │
│ target WP page/post with the new block_markup via REST. Named exit codes: │
│  0 = OK; 3 = patched but variation activation FAILED (page has new markup │
│  but default theme tokens); 4 = target page 404 (deleted or wrong id);    │
│  5 = REST returned a different id than requested; 6 = HTTP 200 but no     │
│  id-bearing JSON (likely an auth-redirect HTML page). Anything else is a  │
│  generic soft-fail logged to stderr — the pipeline continues regardless.  │
│                                                                             │
│ FILES (R):   pipeline-state/<run_id>/extract.json + media-sideload-        │
│              manifest.json                                                │
│ FILES (W):   none locally — mutates the live WP page/post via REST PATCH  │
│ DB tables:   none locally (remote WP DB via REST)                         │
│ STATUS:      LIVE, opt-in                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 11 (pixel-diff) and Stage 11.5 (parity2) — REMOVED 2026-07-04

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Both stages were deleted from sgs-clone-orchestrator.py 2026-07-04. Comment │
│ at lines 2674-2683 documents why: pixel-diff scored an EMPTY section as a   │
│ false WIN (matches background) and a REFLOWED-to-correct section as a      │
│ false LOSS; parity2 keyed elements by BEM class, comparing the draft's raw │
│ <section> against the clone's block WRAPPER, drowning real diffs in false  │
│ positives. See .claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md.            │
│                                                                             │
│ If you find any script, doc, or memory entry still describing either of    │
│ these as a LIVE pipeline stage, that reference is stale — flag it.        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 11.6 — Universal computed-parity (sole fidelity signal)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHERE: main(), sgs-clone-orchestrator.py:2685-2742                          │
│ SUBPROCESS: node plugins/sgs-blocks/scripts/parity/computed-parity.js       │
│              --draft <mockup> --clone <deployed-url> --viewports          │
│              375,768,1440 --out computed-parity.json                      │
│                                                                             │
│ WHAT IT DOES: only runs after a successful Stage-10 deploy (result.        │
│ returncode == 0 and a link=<url> was printed). Compares EFFECTIVE          │
│ (computed) CSS values on the LIVE clone vs the SOURCE draft, matched by    │
│ CONTENT (not class/declaration) — CLAUDE.md rule 4a / STOP-42. Universal:  │
│ every computed CSS property is captured minus a documented blocklist       │
│ verified against property_suffixes, so any draft's CSS is covered without  │
│ a per-property allowlist.                                                 │
│                                                                             │
│ MEASURED (2026-07-04, Mama's Munches homepage): content match 77%; CSS     │
│ match 47% (375px) / 49% (768px) / 54% (1440px). Cite as a dated baseline;  │
│ re-run for today's number.                                                │
│                                                                             │
│ FILES (R):   the mockup HTML (--draft), the live deployed URL (--clone)    │
│ FILES (W):   pipeline-state/<run_id>/computed-parity.json                 │
│ DB tables:   none                                                          │
│ OPT-OUT:     --no-computed-parity                                         │
│ STATUS:      LIVE, soft-fail (never blocks the run) but IS the ONLY input  │
│              the +REGISTER promotion gate reads (see below)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Autonomy chain / staged-merge tail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHERE: main(), sgs-clone-orchestrator.py:2744-2820 — skipped entirely and   │
│        the run returns (line 2745-2746) if --skip-autonomy-gate is set     │
│        (the default in --mode draft unless --enforce-autonomy-gate).       │
│ DELEGATES TO: orchestrator/orchestrator_main.py:run(), which at its own     │
│               module load (lines 45-48) loads:                            │
│                 staged_output.py  (run_dir/stage_path helpers)             │
│                 preflight_chain.py (run_preflight() IS called, line 89)    │
│                 staged_merge.py    (merge() IS called, line 108)           │
│                 autonomy_gate.py   (invoke_visual_qa / autonomy_decision / │
│                                     emit_deliverable / auto_invoke_        │
│                                     sgs_update — all called)              │
│                                                                             │
│ WHAT IT DOES: mirrors the legacy stage-N.json artefacts to the Phase-5      │
│ staged_output convention (lines 2764-2780), builds trivial pass-through     │
│ StageHandlers (canonical mutations already happened during stage           │
│ execution — rollback here is a documented no-op / parking work), then      │
│ calls om.run() with capture_callable = visual_qa_capture.stub_capture      │
│ ALWAYS (line 2805) — there is NO live Playwright pixel-diff capture path    │
│ any more (removed 2026-07-04, same false-win/false-loss issue as Stage 11). │
│ Visual QA is now a human step (/visual-qa) or the Stage 11.6 gate below.   │
│                                                                             │
│ FILES (W):   pipeline-state/sgs-clone/<run_id>/stage-<N>-<name>.json       │
│              (Phase-5 convention), outcome.deliverable_path               │
│ DB tables:   whatever sgs-update writes when auto-invoked (sgs_update_     │
│              dry_run=True by default inside this inline call — line 2815) │
│ STATUS:      LIVE unless --skip-autonomy-gate                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## +REGISTER — Pattern registration (two-tier gate, rewired 2026-07-04)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHERE: main(), sgs-clone-orchestrator.py:2822-2862                          │
│ DELEGATES TO: orchestrator/register_patterns.py:register_run()             │
│                                                                             │
│ WHAT IT DOES (an auto-promotion CONVENIENCE — per Spec 31 §7b/R-31-13 the  │
│ aggregate % is a progress signal; fidelity CLOSES only with Bean's eye):    │
│ computed_parity_overall_pct == 100 -> PROMOTE to the                        │
│ canonical theme/sgs-theme/patterns/ directory. Anything less (including     │
│ None, when computed-parity didn't run) -> STAGE to                        │
│ pipeline-state/<run>/proposed-patterns/ for manual operator review.        │
│ Name-collision protection (patterns table keyed by slug, SELECT-then-      │
│ INSERT dedup) is unaffected by the promote/stage choice — it happens       │
│ inside register_run() regardless of target_dir.                           │
│                                                                             │
│ THIS REPLACES the old pixel-diff-based gate (outcome.overall=="success"    │
│ AND a real live-capture mode) — that gate was retired alongside Stage 11   │
│ and the live visual_qa_capture engine (same blind spot, Spec 20).          │
│                                                                             │
│ FILES (W):   theme/sgs-theme/patterns/<slug>.php (promoted) OR             │
│              pipeline-state/<run>/proposed-patterns/<slug>.php (staged)    │
│ DB tables:   sgs-framework.db.patterns, uimax rows for novel patterns      │
│ OPT-OUT:     --skip-register (skips BOTH promote and stage paths)         │
│ STATUS:      LIVE                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Final acceptance harness

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHERE: main(), sgs-clone-orchestrator.py:2864-2881                          │
│ DELEGATES TO: orchestrator/critical-fix-verification.py:run_harness()       │
│                                                                             │
│ WHAT IT DOES: the 4-check FR21 acceptance harness, run AFTER +REGISTER so   │
│ it can verify the canonical-mutation invariants held end-to-end (no root    │
│ theme.json mutation, no canonical-block mutation outside FR21 channels,    │
│ /sgs-update idempotency, pipeline-state clean post-success). Soft-fail —   │
│ a missing optional dependency never blows up an otherwise-successful run.  │
│                                                                             │
│ FILES (W):   pipeline-state/<run_id>/critical-fix-verification.json        │
│ DB tables:   none directly (reads/asserts on the state the earlier stages  │
│              already wrote)                                               │
│ STATUS:      LIVE, soft-fail                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Corrected / dropped claims (verified stale 2026-07-04)

- **`orchestrator/mutex.py`** — not referenced anywhere in `sgs-clone-orchestrator.py` (grepped, zero matches). Drop any claim that a cross-platform file lock runs at Stage 0.
- **`orchestrator/composer_fallback.py`** — retired 2026-05-14 (comment at line 539); an unmatched section now surfaces to the operator via Stage 9 (`"status": "unmatched"`), it never falls through to a best-effort composer emit.
- **`essence_match_detector.py`** — NOT referenced by the driver (`sgs-clone-orchestrator.py`, zero matches), but the module EXISTS (`orchestrator/essence_match_detector.py`) and is lazy-loaded by the frozen `convert.py:216-226` during Stage 4 (soft-fail). The old claim that the ENTRY POINT loads it inline is wrong; "the file does not exist" would be equally wrong.
- **Stage 11 (pixel-diff) and Stage 11.5 (parity2)** — REMOVED 2026-07-04. Stage 11.6 (computed-parity) is now the sole rendered-fidelity signal.
- **"Stage 8 — Deploy + Visual Parity QA" as a real pixel-diff stage** — the capture path (`visual_qa_capture.stub_capture`) is a stub only; there is no live Playwright capture in the pipeline any more. Do not describe Stage 8 as producing a real visual-QA pass/fail.
- **`pipeline-state/sgs-clone/<run_id>/` as the artefact root for the legacy stage-N.json files** — the legacy stages (0.1 through critical-fix-verification.json) write to `pipeline-state/<run_id>/` directly (no `sgs-clone/` subfolder). The `sgs-clone/<run_id>/` path is used ONLY by the Phase-5 `staged_output` convention inside the autonomy-chain tail (`so_run_dir`), which is a separate mirrored copy, not the primary artefact location.
- **`orchestrator/autonomy_gate.py` as directly imported by `main()`** — it is NOT imported in `sgs-clone-orchestrator.py` itself; it is loaded and called only inside `orchestrator/orchestrator_main.py` (module-level `_load()` at that file's lines 45-48, functions called at lines 94/114/129/133/145/159).

---

## See also

- Overview + stage-index table + cross-cutting principles: `.claude/cloning-pipeline-flow.md`
- Canonical pipeline spec: `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md`
- Clone-fidelity measurement (canonical): `.claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md`
