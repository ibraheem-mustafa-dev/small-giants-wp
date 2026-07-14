---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline
title: "Converter completion — EXECUTION plan (single-session target, solo-subagent orchestration)"
generated: 2026-07-04
spec: .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md
strategic_source: 2026-07-04-new-engine-to-parity-delete-converter-v2.md (the requirements register — fact-checked D273 + qc-council-hardened; READ IT FIRST, this doc executes it)
status: READY pending Bean approval of the 4 open decisions (delete-last / 6-phase shape / FR-31-2.7 / scope)
---

# Converter completion — execution plan

**USP:** one session takes the new engine from "LANDED but incomplete" to THE only converter — your one-cascade requirement lands (the biggest single fidelity lever: CSS parity 47–54% today), product-card lands, and the 6,386-line frozen engine dies.

**Plan label:** [PLAN: opus] — architectural steps inline; mechanical steps dispatch to a SOLO Sonnet coding subagent (Bean-corrected STOP-39: ONE implementer at a time, foreground, named files, "do the work yourself, spawn no agents"; NEVER 2+ concurrent writers; read-only reviewers/tracers may run parallel).

**Aggregate estimate:** single session (optimistic per `time-estimates.md`): P1 ~10m · P2 ~2.5h · P3+P4 ~40m · P5 ~2h · P6 ~40m. HANDOFF markers after every QA gate = clean early-close points if the session must split; each gate leaves `main` green + pushed.

**Session-wide invariants (every step inherits these — repeat in every subagent prompt):**
- `convert.py` byte-identical until Step 19 (D-MODULAR). Branch `main`; verify D-ceiling before any new D.
- Tests from the CANONICAL cwd `plugins/sgs-blocks/scripts`: `python -m pytest converter/tests cheat-gate/tests tests/test_converter_conformance.py -q --import-mode=importlib` (baseline 371; never drop except with a named justification) + `python cheat-gate/run.py --check` exit 0 (73 baselined, 0 NEW).
- The 7 rules + R-31-1..15 (Spec 31 §13.1). Signals are DB facts, never `slug ==` / slot / role literals (STOP-38/41; gates: `no_slug_literal.py`, `check_slug_literals.py` Check #1, `check_converter_source.py` Check #9).
- Every guard is `raise`, never `assert` (STOP-27/D247). Zero silent drops (Rule 4): transferred / EXCLUDED-with-reason / gap-recorded.
- WRITTEN ≠ LANDED (STOP-4/21/44): each phase gate deploys `SGS_NEW_ENGINE=1` to page 8 (`--skip-autonomy-gate`) + computed checks. Baselines from the 2026-07-04 run: fallback = 0 sections; parity content 77% / CSS 47/49/54; all 6 images HTTP 200.
- R-31-5: each phase ships as ≥3 path-scoped commits (PowerShell piped `git commit -F -` for Write-tool files).

**Entry context (cold start reads):** Spec 31 IN FULL → the strategic source plan → `.claude/handoff.md` top → `converter/services/extraction.py` §extract_content+build_block_markup → `converter/dispatch_table.py` + `resolvers/__init__.py` → `orchestrator/converter_v2/__init__.py:385-460` (the fork).

**Tooling index:** solo Sonnet Agent dispatches (steps marked SOLO-SONNET) · read-only Explore reviewers at gates · `/sgs-db` + `wp-blocks.py dump` (DB ground truth) · Playwright/chrome-devtools (LANDED) · `/sgs-update` (reseed) · `/capture-lesson` (falsifications).

---

## PHASE 1 — regenerate the flow doc

### Step 1 — flow doc from the live scripts  [SOLO-SONNET]
- **Action:** rewrite `.claude/cloning-pipeline-flow.md` + `-stages.md` from the ACTUAL chain in `sgs-clone-orchestrator.py::main` (stages 0.1 / 0.5 / 0.7 css_router / 1 / 2 / 3 / 4 convert_section→the SGS_NEW_ENGINE fork / 4i media-sideload / 4j validate / 9 / gates / 10 deploy / 11.6 computed-parity). Docs only — zero code edits.
- **Rules/cheats:** no aspirational claims — every stage line cites the function (`file:line`); the 2026-07-04 fact-check proved doc drift misleads whole scopes.
- **Test:** grep each named stage function exists at the cited line; doc mentions the fork's measured fallback triggers (`__init__.py:419-443`).
- **On-fail:** main session corrects inline (docs, low risk).

## PHASE 2 — the modular universal walk (the core; lands product-card + the ONE cascade)

### Step 2 — spec amendments + design lock  [INLINE — architectural]
- **Action:** write into Spec 31: **FR-31-2.7** (container-vs-composite classifier — composed signal of `container_default_slug()` + `blocks.tier` + `block_composition` DB facts, at the RECOGNITION stage, never a 4th walker branch, R-31-3); the registry contract (**signature = structural DB facts only** {recognition kind, emit_shape, container_kind, role, tier, capability} — never slug; **ADDITIVE multi-handler emission** per node [D248 guard]; explicit priority); the **Ctx destination extension** (§13.3 note); the walker step order (strategic source §"per-node walker step order", 10 steps incl. post-lift passes).
- **DB ground truth:** `block_composition.container_kind` (13/14/4 roster), `block_attributes.emit_shape` (105 nested/33 child), `blocks.tier`, `blocks.variant_attr` + `variant_slots` (2 blocks — sparse, Step 17 populates).
- **Test:** spec sections cross-reference cleanly; no contradiction with §2.2/§13.1 (re-read after writing).

### Step 3 — Ctx/dispatch destination contract  [INLINE — frozen-contract change]
- **Files:** `converter/context.py`, `converter/orchestrator.py`, every `converter/resolvers/*.py` signature + tests.
- **Action:** extend `Ctx` (or the dispatch signature) with a DESTINATION (owning block slug + target attr-dict), defaulted to self so every existing caller/test is unaffected; the orchestrator writes `Write`s to the destination dict. Semantics decision (recorded): `layer_detect`-first, the old fold ladder re-expressed as explicit registry priorities.
- **Rules/cheats:** MF-4 — when ≥2 candidate attrs exist for one (block, layer, property), FAIL LOUD (never rowid-pick; `db_lookup.attr_for_layer_property` docstring admits rowid-first today). MF-3 — L2 CONTENT detection REJECTS a root node (`fold_helpers.detect_content_layer` gains the structural-position arg).
- **Test:** full suite green (default-destination = behaviour-identical); new unit: destination-parametric write lands on a parent dict.

### Step 4 — split the extraction monolith  [SOLO-SONNET — mechanical re-house, no logic change]
- **Files:** `converter/services/extraction.py` (1,533 lines) → `converter/services/assembly.py` (`build_block_markup` steps 3b/3c/4/5 + merge) + `converter/services/css_pass.py` (`_build_css_attrs`) + `extraction.py` keeps content dispatch. Import-forwarding so callers don't break.
- **Rules/cheats:** byte-equivalent behaviour (this step MOVES code only); Check #9 scans the new files; `no_slug_literal` covers services/ automatically.
- **Prompt-embed for the subagent:** the session-wide invariants + "MOVE, do not rewrite; no logic edits; run the suite before returning; do the work yourself, spawn no agents; touch ONLY the 3 named files + tests".
- **Test:** suite green; `git diff --stat` shows moves; emit-diff vs pre-step on the Mama's draft = byte-identical.

### Step 5 — single walker + total registry  [INLINE — architectural]
- **Files:** `converter/dispatch_table.py`, `converter/resolvers/__init__.py`, new `converter/walk.py`.
- **Action:** ONE walker owns recursion (unconditional descent — a nested element's children still walk); registry `structural signature → [handlers]` (ADDITIVE) with explicit priority; content handlers join the REGISTRY the CSS resolvers already use (D250). `recognise()` computes the dispatch key ONCE; `unrecognised` is a PRE-registry gate (loud), never a signature. Coverage test enumerates the producible signature space from the DB MINUS validity constraints (D212 forbidden combos).
- **Spec:** §2.0-2.6 + FR-31-3 (3 walker exceptions ONLY) + §12.4. Gates: widen `no_slug_literal.py` `_SCAN_FILES` to `dispatch_table.py` + `orchestrator.py` + `walk.py` (recognition.py already covered, :60) + plant-test the widening (STOP-31).
- **Test:** coverage test green; plant a slug-keyed registry entry → gate fires; suite green.

### Step 6 — wire emit_shape, delete the case-fork + Mechanisms A/B  [INLINE]
- **Files:** `converter/services/extraction.py` (fork at :1096-1187 dies), registry handlers.
- **Action:** per `role=content` attr (FR-31-2.2 allowlist): identity via `equivalent_block_for` (db_lookup:2489) → `emit_shape_for` (:2459) → `nested` lift / `child` InnerBlock + recurse. The B1-B4 lift logic (text/media/rating/array/styling) becomes identity-keyed handlers — RE-HOMED not rewritten.
- **Keep-list (every item verified present today; each needs a test in its new home):** MF5 `has_inner is None` guard (:1096-1101) · D212 mutual-exclusion `raise` (:1122-1131) · ADDITIVE arms (Case-1 = scalar+styling+array, Case-2 = B+array — :1110-1141, D248) · icon-bearing-leaf gating (`role.startswith("icon-")`, :1163-1176) · `expected_content_gaps` · G3 `accepts_allowed_blocks` validation (NULL = permissive+trace) · container-recursion family · scalar-media `*Mobile` art-direction · post-lift passes (variant fingerprint `db_lookup.detect_variant` on ASSEMBLED attrs :1434-1449 — DISTINCT from recognition-time `detect_variant_for_node`; layout trigger :1394-1398; inheritStyle :1458-1469; band-fold).
- **Test:** suite green; per-guard unit tests; emit-diff vs pre-step on Mama's = only the intended emit_shape deltas (product-card 9 nested attrs now lift).

### Step 7 — the ONE cascade (Bean's 2e2 — vital)  [INLINE]
- **Files:** `converter/services/fold_helpers.py`, `extraction.py`/`assembly.py` seams, `resolvers/content_band.py`.
- **Action:** every node's FULL declaration stream — root, folded band, grid item — runs the SAME dispatch cascade; only the destination differs (Step 3's contract). DELETE the max-width-only `lift_content_band_max_width` fallback + `route_interior_css_to_parent_slot`'s hand-rolled ladder (:551-571); the GAP-3 exclusions become EXCLUDED-with-reason entries in the ledger (the `:522-524` early-return that skips gap recording dies).
- **Rules/cheats:** Rule 4 zero-drop; R-31-9 (one mechanism for container AND composite — the two extraction.py seams collapse to one dispatch point); `check_d2_when_d1` Check #6 must stay green.
- **Test:** regression tests: a band's padding/background/text-align now transfer (they silently dropped before); trust-bar/ingredients bands unregressed; suite green.

### Step 8 — has_inner reader migration (new engine)  [SOLO-SONNET]
- **Files (exactly 7, verified):** `converter/context.py`, `recognition.py`, `orchestrator.py`, `coverage_report.py`, `dispatch_table.py:17`, `services/extraction.py`, `services/has_inner.py` → read `emit_shape` / per-attr checks. Column stays (Phase 6 drops it).
- **Test:** suite green; grep `has_inner_blocks` under converter/ = 0 non-test reads (except the migration shim if any).

### QA GATE A — Phase 2 closes  [HANDOFF-safe]
- **Check:** suite + cheat-gate green → `SGS_NEW_ENGINE=1` clone → page 8 → (a) fallback probe = 0 sections (vs the 2026-07-04 baseline); (b) **product-card LANDS** (price 28px Fraunces bold per the draft — computed, matched by content); (c) computed-parity ≥ 77/47/49/54 baseline, CSS expected to RISE (the 2e2 unification); (d) all 6 grids + bands unregressed; (e) TWO read-only reviewers in parallel (spec-conformance + code-quality) on the phase diff; (f) Bean eye.
- **Fail:** roll back the failing step's commits (path-scoped), re-enter at that step. ≥3 commits shipped this phase (R-31-5).

## PHASE 3 — extract db_lookup + icon_resolver

### Step 9 — move + shim  [SOLO-SONNET]
- **Action:** move to `converter/db/db_lookup.py` + `converter/services/icon_resolver.py`; leave import-forwarding SHIMS at `converter_v2/db_lookup.py` + `icon_resolver.py` (frozen `convert.py:37`/`:3612` + the 4 importlib path-loaders keep working — verified collision, strategic source Phase 3); rewire all 37+2 symbol imports across `converter/**`; update `import_ban.py` (ban ALL converter_v2 for converter/ — the shim forwards the other direction).
- **Test:** suite green; `SGS_NEW_ENGINE=1` AND flag-unset clones BOTH run; grep `from orchestrator.converter_v2` under converter/ = 0.

## PHASE 4 — relocate the entry + rewire every consumer

### Step 10 — relocate + rewire  [SOLO-SONNET]
- **Action:** `convert_section` + fork + seeds (`reset_pipeline_seed`/`seed_theme_json`/`seed_gap_context`/`ensure_root_section_class`, `converter_v2/__init__.py`) → orchestrator/converter home. Rewire the FULL verified consumer list: `css_router.py:42`, `expected_rules.py:46,49`, `sgs-clone-orchestrator.py` ×5, the 4 importlib loaders (`essence_match_detector.py:47`, `per-section-convention-voter.py:71`, `db-consistency/resolver_bridge.py:40`, `behavioural-analyser/assign-canonical.py:712`), + gate/oracle path refs (`check_bound_emit.py:40`, `check_hardcoded_dicts.py`, `check_parallel_bp.py:38`, `check_slug_literals.py:60`, `oracle/metamorphic.py:365`, `excluded-gate/scanner.py`).
- **QA GATE B:** suite + cheat-gate + a full clone (both flag states) + whole-tree grep: the only converter_v2 references left are the frozen tree itself + the shims.  [HANDOFF-safe]

## PHASE 5 — parity backlog (fact-checked list)

### Step 11 — A2 content-conservation ledger  [INLINE design → SOLO-SONNET build]
- **Action:** extend `declare_input` (`extraction.py:119-127` home) to capture CONTENT routing units so a dropped content node is UNACCOUNTED — the ONE ledger, never a parallel tracker (STOP-25; §12.2.1). This is the LAST STOP-28 gate (A1 resolved, D273).
- **Test:** plant a dropped node → UNACCOUNTED fires; suite green.

### Step 12 — CSS resolver completeness  [SOLO-SONNET, one resolver at a time]
- **Action:** lifts for the seeded props (`order`/`overflow`/`object-fit`/`position` family/`aspect-ratio`/`opacity`/`background-image`→Gradient + flex ITEM props — 8/11 have `property_suffixes` rows already, D250); seed `transform`/`filter`/`transition` via a dated `migrations/*.py` + `/sgs-update` reseed OR row in `excluded_properties` with reason (STOP-24 — never manual DB edit, never a code dict, Check #2). Delete the unregistered `styling_content.resolve` stub; build or delete `scalar_content`/`scalar_media` REGISTRY stubs (grid is LIVE — do not touch).
- **Test:** per-resolver fixture tests; ledger UNACCOUNTED shrinks; suite green.

### Step 13 — pseudo-elements + F-ii residual  [INLINE]
- **Action:** the parse bug is FIXED (`3d7e7d42`); now give `::before`/`::after` declarations a destination (uid-scoped passthrough CSS channel per §3 F-ii) or EXCLUDED-with-reason; same channel paints the non-device residual band (`grid.py:66` + `styling_helpers.py:387-405` — tier-aligned widths already paint via the D259 cascade).
- **Test:** the `rt-pseudo-before` fixture's overlay paints (or is EXCLUDED, ledger-visible); Mama's 600px band renders 4-across in the 600-767 range.

### Step 14 — re-implement the 2 frozen passes + css_router D1 decision  [INLINE]
- **Action:** port `_absorb_transparent_wrappers` (convert.py:2944) + `ensure_root_section_class` (:5181) into `converter/` (both verified running unconditionally via the frozen module today, `__init__.py:407`/`:454`); decide + implement css_router's D1 fate (MF-2: retire OR rewire — one recorded decision; D1 is currently a dead output).
- **Test:** emit-diff = identical with the ported passes; D1 decision has a test either way.

### Step 15 — variant data + automated gates  [SOLO-SONNET]
- **Action:** populate `block.json supports.sgs.variants` for variant-bearing blocks (only 2 have `variant_attr`+`variant_slots` rows today) + `/sgs-update` reseed; arm F3 render-oracle (Playwright draft-vs-clone 375/768/1440) + the THREE metamorphic relations (source-order permutation / BEM-synonym rename / px-scale-by-k — §12.2 item 3, the universality proof) + F6 DB-as-code suite; multi-shape fixtures for blocks absent from page 8.
- **QA GATE C — the parity gate:** full clone → fallback instrumented = 0 → computed-parity green at 3 breakpoints → the 6 families B/C/D/E/F/K per-row verified (Family E via fixtures) → Bean eye sign-off.  [HANDOFF-safe]

## PHASE 6 — flip + delete (only after Gate C)

### Step 16 — the flip  [INLINE]
- **Action:** re-point `check_bound_emit` + `check_parallel_bp` at `converter/` + refresh `check_hardcoded_dicts` baseline (verified per-gate 2026-07-04; `check_important_render` unaffected) → remove the `SGS_NEW_ENGINE` gate (new engine = only path; update STOP-28) → delete `convert.py` + `converter_v2/` + the shims + the test-side surface → drop `block_composition.has_inner_blocks` + migrate the ~11 external readers → `/sgs-update` reseed → final `/qc-council` → LANDED re-verify → commit + push + `/handoff`.
- **Test:** whole-tree grep converter_v2 = 0; suite green (goldens re-baselined with justification); full clone LANDED; Bean eye.

---

## Key Judgement Calls
1. **Session split points** — HANDOFF markers at Gates A/B/C. **Recommendation:** if context pressure hits mid-Phase-5, close at the nearest gate (each leaves main green+pushed) rather than pushing through degraded. Who decides: the session, by the gate states.
2. **Product-card golden re-seed (Gate A-b)** — the conformance golden is the old-composite baseline (post-revert). **Recommendation:** re-seed WITH the LANDED proof attached (STOP-21), never from emit alone.
3. **Pseudo/F-ii passthrough channel (Step 13)** — new uid-scoped CSS channel vs EXCLUDED. **Recommendation:** build the channel (it serves BOTH pseudo-elements and the residual band — one mechanism, R-31-9); EXCLUDE only genuinely unrepresentable cases with reasons.
4. **Parity "green" threshold (Gate C)** — **Recommendation:** no hard number; the gate is zero-fallback + per-family rows + Bean's eye (R-31-13). The CSS % must RISE from 47/49/54 and every regression must be explained; a single aggregate threshold invites gaming (CHEAT-cell lesson, §5).
