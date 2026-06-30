---
doc_type: phase-plan
project: small-giants-wp
phase: W3
thread: cloning-pipeline / Spec 31 §12.6 step-3
generated: 2026-06-30
spec: .claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md (§3, §12.6, §12.7)
grounded_in: Register B (port spec) + Register A (A1/A2) + D249 fact-check (CSS↔content unification)
---

# Phase W3 — Interior-walker wiring + CSS↔content unification

**USP:** This is THE keystone — the step that turns the converter from "tested-but-inert parts"
into a live engine. Until it lands, every resolver is WRITTEN-not-LANDED and the frozen
`convert.py` runs every clone. W3 is what finally makes wrapper CSS + content reach a real page,
draft-faithful — the thing the whole rebuild has been building toward (Spec 31 §12.6 step-3).

**Plan label:** [PLAN: opus] — the unification (Step 7) + ledger (Step 9) + LANDED gate (Step 10)
are architectural/expensive-to-undo; implementation steps dispatch to Sonnet. **Sonnet fallback:**
the dispatched steps are self-contained and can run Sonnet-inline if Opus is unavailable.
**Docscore:** _(run `/docscore` on this file once W3 ships + it moves to plans/archive/)_
**Aggregate cost estimate:** ~6 dispatched Sonnet steps (~80k tok each) + ~4 inline Opus gates;
order-of-magnitude ~0.7M tokens across the phase (calibrate down — Register B is pre-resolved).

**Phase success criteria (done when):**
- [ ] ONE production walk drives BOTH `process_element` (CSS resolvers) AND `extract_content`
      (content) into ONE emitted block per node — the two inert halves are connected.
- [ ] The full `_route_composite_interior` walker is faithfully ported into `run_mechanism_b`
      (all 3 branches: scalar-media column, slug-None fold + cross-node CSS, recursion).
- [ ] Responsive typography/colour lands (`_lift_styling_attrs_by_selector` consumes `_bp_decls`).
- [ ] ≥1 composite (hero `split`) is **LANDED-proven** on a canary: draft-vs-clone computed-style
      at 375/768/1440 (STOP-21), Bean signs off (R-22-13).
- [ ] A1 (media-map loader) + A2 (content-conservation ledger) land before production-wiring.
- [ ] Both conformance suites + the cheat gates (incl. the D249 Check #9) green; convert.py byte-identical.
- [ ] The G1–G5 child-routing gaps each have a recorded disposition (DONE-BY-PORT / CLOSE-IN-W3 / DEFER).

**Entry context (read before starting — WHOLE files, not greps; Bean directive):**
- `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` §1 (function inventory) + §3 (unified
  content+CSS routing) + §3.B3 (child-routing G1–G5) + §12.6/§12.7 (stage map).
- `.claude/specs/22-...` FR-22-2/2.1/2.2 (scalar-vs-child fork) + FR-22-3 (single recursive walker)
  + §FR-22-5.3 (the slot-keyed `slot_has_equivalent_block` predicate).
- The port-SOURCE in `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py`
  (read-to-port SANCTIONED, STOP-22 carve-out): `_route_composite_interior` (:4124) + the
  single-recursive walker (FR-22-3) + `_lift_styling_attrs_by_selector` (:3903) + its 5-helper
  closure + the array path (B4, PARTIAL even here).
- The NEW modular engine: `converter/orchestrator.py` (`process_element` — CSS spine) +
  `converter/services/extraction.py` (`extract_content`/`build_block_markup`/`run_mechanism_b`) +
  `converter/resolvers/*` (the 5 REAL CSS resolvers) + `converter/dispatch_table.py`.
- `.claude/decisions.md` head → D249 (the fact-check; D-ceiling D249).
- The handoff Registers A + B (verbatim source: `git show 71a7fbad:.claude/next-session-prompt.md`).

**References:**
- D249 (decisions.md) — the fact-check that surfaced Finding A (two disconnected inert halves).
- Register B — the line-referenced port spec (B1–B5 + B-order). The pre-resolved design for W3.
- Register A — A1 (media-map) seam done `afbcaa99`; A2 (content-ledger) design-gated.
- `~/.claude/rules/measurement-vs-eye.md` + R-22-11/R-22-13 — the LANDED gate is live computed-style
  vs draft + Bean's eye, never the emit alone.

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | /adversarial-council or /qc-council | Step 1 (design-gate), Step 9 (ledger gate) |
| skill | /delegate · /subagent-prompt | Steps 2–6, 8, 11 (dispatch) |
| skill | /subagent-driven-development | Steps 2–6 (implementer + 2 reviewers) |
| skill | /verify-loop · /systematic-debugging | Step 10 + any regression |
| mcp | Playwright / chrome-devtools | Step 10 (LANDED proof) |
| cli | sgs-db.py · wp-blocks.py dump | DB ground-truth throughout |
| cli | pytest (converter/tests + cheat-gate/tests) + cheat-gate/run.py --check | every QA gate |
| creds | .claude/secrets/sandybrown.env | Step 10 canary deploy + REST verify |

---

## Pre-conditions (must be true before W3 Step 1)
- [ ] Branch `main`, D-ceiling D249, tests green (176 converter + 45 cheat-gate), `cheat-gate/run.py --check` exit 0.
- [ ] The D249 fact-check is read + accepted (engine = two inert disconnected halves; do not re-litigate).
- [ ] The reading gate (next-session-prompt §MANDATORY READING GATE) is ticked — incl. the `convert.py` walker `_route_composite_interior` read (the meaty one) BEFORE Step 4.
- [ ] convert.py is byte-identical to its frozen state (D-MODULAR) — never edit it; the new conductor lives behind a flag until Step 10.
- [ ] Bean is available to sign off at Step 1 (design-gate) and Step 10 (LANDED) — both are co-authoritative gates (R-22-13), not optional.

---

## Steps

### Step 1 — DESIGN-GATE the W3 stage + resolve the G1–G5 disposition (Rule 7 / A14 / B5)
  Model:       inline (Opus) + /qc-council (cross-model raters)
  Action:      Run a council on THIS plan + the port-source. Produce the per-gap table labelling
               G1 (token-match predicate) / G2 (recursion) / G3 (NULL accepts_allowed_blocks) /
               G4 (scalar-vs-child fork FR-22-2.1/2.2) / G5 (slot_has_equivalent_block integration)
               as DONE-BY-PORT / CLOSE-IN-W3 / DEFER-with-blocker (STOP-18). Council fact-checks the
               port-source against Spec 31 §3 + §3.B3, NEVER the frozen output (rebuild-stage-authority).
  Files:       (read-only) convert.py:_route_composite_interior, Spec 31 §3/§3.B3, Spec 22 §FR-22-5.3
  Inputs:      this plan + Register B + Spec 31 §3.B3 status note (the v1 NO-GO + G1–G5)
  Outcome:     a recorded G1–G5 disposition table + a GO/NO-GO on the port plan; Bean sign-off.
  Exec:        SEQUENTIAL | Deps: none | Marker: SESSION-START | Time: 25 min
  Tooling:     /qc-council, sgs-db.py, wp-blocks.py dump
  On-Fail:     NO-GO → revise the port plan per the council register; do NOT build on an open gap.
  Cold-Entry:  this plan + Spec 31 §3/§3.B3 + Register B + convert.py:_route_composite_interior
  Test:
    Happy:       council returns convergent GO + every G1–G5 row labelled → Bean signs off.
    Edge:        a gap labelled CLOSE-IN-W3 with no concrete mechanism → push back, demand the mechanism.
    Fail:        council finds the port-source itself diverges from §3 → re-scope before any code.
    Integration: the disposition feeds Step 4's walker port (which gaps it must close vs defer).

### Step 2 — Port the 5 styling-lift helpers into the new tree
  Model:       sonnet (dispatched) | Action: faithfully port `_collect_css_decls_for_element`,
               `_extract_token_or_hex`, `_split_value_unit`, `_css_value_to_attr`,
               `_css_selector_has_class` (convert.py closure of `_lift_styling_attrs_by_selector`)
               into `converter/services/styling_helpers.py` (or extend it). Line-faithful; no new logic.
  Files:       converter/services/styling_helpers.py (+ a focused test)
  Inputs:      convert.py:3903–4030 (the helper closure)
  Outcome:     the 5 helpers exist in the new tree, unit-tested against convert.py behaviour.
  Exec:        SEQUENTIAL | Deps: Step 1 | Marker: (none) | Time: 10 min
  Tooling:     /subagent-driven-development, pytest
  On-Fail:     git revert the file; re-dispatch with the exact convert.py line range.
  Prompt:      "Port these 5 pure helper functions from convert.py (lines ~3903–4030) into
               plugins/sgs-blocks/scripts/converter/services/styling_helpers.py, line-faithful (no
               new logic, no slug literals). Add a pytest covering each with a representative input.
               Return the diff + test result. Do NOT touch any other file. (RETURN data, no shared writes.)"
  Test:
    Happy:       each helper returns convert.py-identical output on a sample → green.
    Edge:        unitless value / token-vs-hex / multi-class selector all handled.
    Fail:        a helper imports from convert.py → reject (must be self-contained).
    Integration: consumed by Step 3's styling-lift.

### Step 3 — Port `_lift_styling_attrs_by_selector` + extend for `_bp_decls` + wire to dispatch (B2)
  Model:       sonnet (dispatched) | Action: port the styling-lift into
               `converter/resolvers/styling_content.py` (replace its stub), FIXING the base-only drop
               — consume `_bp_decls` → emit `{attr}Tablet`/`{attr}Mobile` keyed off the DB suffix
               table (reuse the `_lift_typography_to_block_attrs` DB pattern, NOT a hardcoded map;
               `_FONT_WEIGHT_KEYWORDS` is the one permitted named-constant exception). Wire it into the
               content dispatch (`run_mechanism_styling` already exists — confirm it reaches this).
  Files:       converter/resolvers/styling_content.py, converter/services/extraction.py (wire), tests
  Inputs:      Step 2 helpers, convert.py:3903 (+ :4025 the dropped `_bp_decls`), Spec 31 §3.B2
  Outcome:     responsive typography/colour lifts to `{attr}Tablet`/`{attr}Mobile`; tests prove the
               bp tiers land (the inherited base-only bug is FIXED, not preserved).
  Exec:        SEQUENTIAL | Deps: Step 2 | Marker: (none) | Time: 15 min
  Tooling:     /subagent-driven-development, sgs-db.py (suffix table), pytest
  On-Fail:     revert; the base-only port is a regression — re-dispatch with the `_bp_decls` requirement.
  Prompt:      "(self-contained) Port _lift_styling_attrs_by_selector (convert.py:3903) into
               converter/resolvers/styling_content.py replacing the stub. Extend it to consume
               _bp_decls into {attr}Tablet/{attr}Mobile using the DB suffix table pattern from
               _lift_typography_to_block_attrs (convert.py:~1718) — NO hardcoded suffix map (the
               D249 Check #9 gate will reject one). Wire via run_mechanism_styling. Add tests proving
               base + tablet + mobile all land. Return diff + test output."
  Test:
    Happy:       a draft element with base+tablet+mobile font-size → 3 tier attrs emitted.
    Edge:        unitless line-height / keyword font-weight / token-vs-hex colour.
    Fail:        a hardcoded `{"Tablet":"Tablet"}` map → Check #9 gate fails the commit (good).
    Integration: feeds the content emit in Step 7.

### QA Gate A — styling-lift + helpers green, no new cheat
  Model:   sonnet | Exec: SEQUENTIAL | Deps: Steps 2–3
  Check:   `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests -q --import-mode=importlib && python cheat-gate/run.py --check`
  Pass:    all converter tests pass (count ≥ prior) AND cheat-gate exit 0 (0 NEW).
  Fail:    re-open Step 2/3; if Check #9 fires, a suffix-dict crept in — DB-source it.
  Marker:  QA

### Step 4 — Port the FULL `_route_composite_interior` walker into `run_mechanism_b` (B1)
  Model:       inline (Opus) — heavy, recursion + cross-node CSS, highest regression risk
  Action:      Replace the current flat `run_mechanism_b` (the D245 from-scratch recreation) with a
               faithful port of `_route_composite_interior` (convert.py:4124) — ALL THREE branches:
               (i) scalar-media column lift → `{attr}`/`{attr}Mobile` (hero `split` splitImage case);
               (ii) slug-None content-column FOLD + cross-node CSS routing
               (`_route_interior_css_to_parent_slot` — the hero `__content` 0%-transfer fix);
               (iii) recursion into child InnerBlocks. DB-keyed; NO slug literals; do NOT port or call
               `_atomic_attrs_for` (sibling, out of walker scope — STOP-18). Close exactly the G1–G5
               gaps Step 1 labelled CLOSE-IN-W3; carry `# TODO` for DEFER ones.
  Files:       converter/services/extraction.py (run_mechanism_b), converter/services/fold_helpers.py
               (the now-DB-sourced interior-routing helpers become live), tests
  Inputs:      Step 1 G1–G5 disposition, convert.py:4124 + the recursive walker (FR-22-3)
  Outcome:     run_mechanism_b walks recursively, lifts scalar-media columns, folds slug-None columns
               with cross-node CSS — behaviour-faithful to the working convert.py walker.
  Exec:        SEQUENTIAL | Deps: Step 1, Step 3 | Marker: (none) | Time: 30 min
  Tooling:     systematic-debugging, sgs-db.py, pytest
  On-Fail:     revert run_mechanism_b to the prior version; this is the high-blast step — roll back fast.
  Test:
    Happy:       a hero `split` draft → splitImage/splitImageMobile + content-column CSS all routed.
    Edge:        a slug-None content column → folded with its CSS to the parent (not dropped, not mirrored).
    Fail:        a thinned port (missing a branch) → hero split image evaporates (D212 shape) — caught by Step 10.
    Integration: drives child InnerBlocks; feeds the unified emit (Step 7).

### Step 5 — Port the array path as-is + TODO markers (B3)
  Model:       sonnet (dispatched) | Action: port the array/repeater behaviour faithful to convert.py
               with `# TODO FR-22-2.5` markers; do NOT complete FR-22-2.5 (scope-creep, own design-gate).
               Carry NO slug literals (the array slug literals live in `_atomic_attrs_for`, out of scope).
  Files:       converter/resolvers/array_content.py (confirm/align), tests | Inputs: convert.py array path, Spec 22 FR-22-2.5
  Outcome:     array lift is behaviour-identical to convert.py; incompleteness documented, not silent.
  Exec:        SEQUENTIAL | Deps: Step 4 | Marker: (none) | Time: 10 min
  Tooling:     /subagent-driven-development, pytest
  On-Fail:     revert; re-dispatch with the explicit "no slug literals, TODO not complete" constraint.
  Prompt:      "(self-contained) Align converter/resolvers/array_content.py with convert.py's array
               path, behaviour-faithful, NO slug literals, mark incompleteness `# TODO FR-22-2.5`. Do
               NOT complete FR-22-2.5. Add a test for one array block. Return diff + test output."
  Test:
    Happy:       a repeater draft → one child per item, fields lifted.
    Edge:        a gap-pending field → loud ContentGap (not garbage).
    Fail:        a slug literal appears → no_slug_literal gate fails (good).
    Integration: items feed the content emit.

### Step 6 — B4: ambiguous-attr fallback → loud ContentGap
  Model:       sonnet (dispatched) | Action: in `build_block_markup`, when `primary_content_attr` is
               None (ambiguous multi-attr), emit a tracked `ContentGap` instead of dumping bare
               inner-HTML a typed render.php may ignore (the latent silent-drop, extraction.py:~308→420).
  Files:       converter/services/extraction.py, tests | Inputs: Register B B4
  Outcome:     ambiguous child emit is loud (tracked), never a silent drop (Rule 4).
  Exec:        SEQUENTIAL | Deps: Step 4 | Marker: (none) | Time: 8 min
  Tooling:     pytest | On-Fail: revert; re-dispatch.
  Prompt:      "(self-contained) In converter/services/extraction.py build_block_markup, when
               db_lookup.primary_content_attr(slug) is None, append a loud ContentGap instead of
               emit_block_markup(slug, {}, content). Add a test. Return diff + test output."
  Test:
    Happy:       ambiguous slug → ContentGap recorded, no bare-HTML emit.
    Edge:        unambiguous slug → unchanged (primary attr used).
    Fail:        — ; Integration: ContentGap visible to the F5 ledger.

### QA Gate B — full content walker green + conservation intact
  Model:   inline | Exec: SEQUENTIAL | Deps: Steps 4–6
  Check:   `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests -q --import-mode=importlib && python cheat-gate/run.py --check`
  Pass:    converter tests green; Mechanism-B conservation (leaves == blocks + gaps) holds; 0 NEW cheats.
  Fail:    walker dropped/duplicated a node → systematic-debugging on the conservation assertion.
  Marker:  QA

### Step 7 — THE UNIFICATION: top-level conductor drives BOTH halves into ONE emit (D249 Finding A)
  Model:       inline (Opus) — architectural; this is the keystone the fact-check named
  Action:      Build the production walk (the missing caller): for each recognised draft node, build
               its Ctx + Decls, call BOTH `process_element` (CSS resolvers → wrapper/box/grid attrs)
               AND `extract_content` (content → scalar/child attrs), MERGE into one attr dict, and
               `emit_block_markup` ONE block. The Ctx-builder populates `area_name` (grid_area branch),
               `base_layer`, `has_inner_blocks`, `conn`. This connects the two inert halves (Spec 31 §3:
               "route every CSS declaration through §3.A AND its content through §3.B; both write into
               the same emitted block attrs"). Decide MF-2 here: css_router D1 retire-or-rewire.
  Files:       converter/orchestrator.py or a new converter/walk.py (the conductor) + extraction.py wiring
  Inputs:      process_element (orchestrator.py), extract_content (extraction.py), dispatch_table, Ctx model
  Outcome:     ONE walk produces a block whose attrs carry BOTH the node's CSS (L1–L4) AND its content;
               `process_element` finally has a production caller; the halves are connected.
  Exec:        SEQUENTIAL | Deps: Step 4 | Marker: (none) | Time: 30 min
  Tooling:     systematic-debugging, sgs-db.py
  On-Fail:     keep the conductor behind a flag / separate entry (do not swap convert.py live — D-MODULAR)
               until Step 10 LANDED-proves it; roll back the wiring on any conservation breach.
  Test:
    Happy:       a container node with max-width + padding + a heading child → one block, both lifted.
    Edge:        a COLLISION (CSS + content target same attr) → the orchestrator collision guard fires.
    Fail:        process_element raises (e.g. media_signal NotImplementedError reached) → investigate; a
                 scalar node must not reach the media branch (dispatch_table contract).
    Integration: this is THE integration — both subsystems through one emit.

### Step 8 — A1: media-map loader/driver
  Model:       sonnet (dispatched) | Action: load the run's real media-map (mockup src → uploaded WP
               URL) and thread it through the conductor → extract_content → run_mechanism_a →
               lift_scalar_content (the seam is already threaded, `afbcaa99`; build the LOADER). NO
               url-shape heuristic (R-22-1 / §3.B1).
  Files:       the conductor (Step 7) + a media-map loader module + tests | Inputs: Register A A1
  Outcome:     image srcs remap to real WP URLs on a wired run (no 404s); empty-map default only when unwired.
  Exec:        SEQUENTIAL | Deps: Step 7 | Marker: (none) | Time: 12 min
  Tooling:     /subagent-driven-development, pytest | On-Fail: revert loader; seam stays empty-map (safe).
  Prompt:      "(self-contained) Build a media-map loader that reads the run's mockup→WP-URL mapping and
               pass it into the Step-7 conductor's extract_content(media_map=…). No URL-shape heuristic.
               Add a test with a sample map. Return diff + test output."
  Test:
    Happy:       a draft <img src=mockup> → emitted {url: <WP URL>}.
    Edge:        src not in map → tracked (not a raw-src silent pass).
    Fail:        heuristic url-guess added → reject. Integration: feeds LANDED proof images.

### Step 9 — A2: extend the conservation ledger (`declare_input`) to CONTENT routing units
  Model:       inline (Opus) ledger design + sonnet build | Action: extend `declare_input` (the F2
               draft-derived ledger, §12.2.1) to capture CONTENT routing units (the draft's content
               nodes), so a dropped scalar node is UNACCOUNTED-and-caught through the ONE ledger — NOT a
               per-attr ContentGap inside the lift (that violates §3.B1 strict no-op + STOP-25). This is
               the design-gated A2 ruling (D247).
  Files:       the ledger module (ledger/ F2) + tests | Inputs: Register A A2, Spec 31 §12.2.1 + §3.B1
  Outcome:     content completeness is gated by the ledger; a dropped content node shows as UNACCOUNTED.
  Exec:        SEQUENTIAL | Deps: Step 7 | Marker: (none) | Time: 20 min
  Tooling:     /qc-council (ledger is a gate — adversarial-test the failure path), pytest
  On-Fail:     revert; the ledger is load-bearing — a wrong join masks drops (D240 lesson, key full identity).
  Test:
    Happy:       a planted dropped content node → UNACCOUNTED > 0 → hard fail.
    Edge:        a §3.B1 legitimate no-op (selector matched nothing) → accounted as gap, not a false drop.
    Fail:        ledger join keyed on partial identity → masks a drop (the D240 hole) — council must catch.
    Integration: gates Steps 7–8 output; runs in QA Gate C.

### QA Gate C — both conformance suites + ledger + cheat gates green
  Model:   inline | Exec: SEQUENTIAL | Deps: Steps 7–9
  Check:   `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests cheat-gate/tests -q --import-mode=importlib && python cheat-gate/run.py --check` + the F2 ledger `--check` + F6 db-consistency
  Pass:    all suites green; ledger UNACCOUNTED==0 + WRITTEN-not-LANDED tracked; convert.py byte-identical.
  Fail:    triage by suite; never proceed to LANDED with a red gate.
  Marker:  QA

### Step 10 — LANDED proof on a canary (STOP-21) — the real faithfulness gate
  Model:       inline (Opus) + Playwright/chrome-devtools | Action: run the Step-7 conductor to emit a
               GENUINE block for ≥1 composite (hero `split`), deploy to a fresh canary page (guard-safe
               REST create, creds `.claude/secrets/sandybrown.env`), read computed-style + innerText
               anonymously at 375/768/1440, compare to the DRAFT (oracle/verdict.py = LANDED). NOT
               emit-equivalence — WRITTEN≠LANDED. Bean signs off on the live page (R-22-13) + cropped pair.
  Files:       (deploy artefact + a verify script) | Inputs: Step 7 conductor output, the draft
  Outcome:     hero split renders draft-faithful on a real page — wrapper CSS + split image + content all land.
  Exec:        SEQUENTIAL | Deps: Step 9 | Marker: SESSION-START | Time: 25 min
  Tooling:     Playwright/chrome-devtools, oracle/verdict.py, REST (Store-API basic auth)
  On-Fail:     a LOSS → read live DOM (not the pixel-diff alone; empty section = false win) + trace.jsonl;
               roll back across a session boundary with the evidence baked in (STOP #19), don't iterate inline.
  Cold-Entry:  this plan Step 10 + the STOP-21 recipe + sandybrown.env + the hero split draft + Spec 31 §7b
  Test:
    Happy:       computed maxWidth/contentWidth/splitImage match draft at all 3 breakpoints → LANDED.
    Edge:        empty/soft-failed section → innerText.length>0 guard FAILS it (no false pixel win).
    Fail:        a value differs → extend the measurement set (background family/filter/parent chain) before concluding (measurement-vs-eye rule).
    Integration: this proves the unified engine on a real homepage — the phase's headline criterion.

### Step 11 — B-order cleanup: remove dead monkeypatch + delete `content_attrs_with_selector`
  Model:       sonnet (dispatched) | Action: confirm the A3 monkeypatch is gone (done `afbcaa99`),
               grep-confirm 0 readers of `content_attrs_with_selector`, then delete it. Keep `payload.py`
               + `content_select.py` (clean pure helpers) only if they don't diverge from the walker (D246 trap).
  Files:       orchestrator/converter_v2/db_lookup.py (or wherever the dead accessor lives), tests
  Inputs:      Register B B-order step 6 | Outcome: dead accessor removed, 0 readers, suite green.
  Exec:        SEQUENTIAL | Deps: Step 4 (walker no longer needs it) | Marker: (none) | Time: 8 min
  Tooling:     /subagent-driven-development, pytest | On-Fail: restore; a reader still exists — find it first.
  Prompt:      "(self-contained) grep-confirm 0 production readers of content_attrs_with_selector, then
               delete it + any dead test. Run the suite. If a reader exists, STOP and report it. Return diff + test."
  Test:
    Happy:       grep 0 readers → delete → suite green.
    Edge:        a test still references it → remove the test first.
    Fail:        a live reader found → do not delete; report. Integration: standalone.

### Step 12 — [HANDOFF] commit W3 + assign D-number + /handoff
  Model:       inline | Action: path-scoped commit on main (split per Register-B-order if large, R-22-5
               phases-never-single-commit); assign the D-number; run /handoff (carry STOP catalogue forward).
  Marker:      HANDOFF | Time: 10 min | Deps: Step 10 (Bean sign-off)
  Test: Happy: `git log` shows the W3 commits + D-number; handoff.md + next-session-prompt updated. Standalone.

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Where does the unified conductor (Step 7) live + how does it swap in?
  - **Options:** [A] new `converter/walk.py` behind a flag, swap live only after LANDED · [B] extend
    `orchestrator.process_element`'s module with a page-walk entry · [C] swap `convert.py`'s caller now.
  - **Recommendation:** A — a separate flagged conductor; convert.py stays the live conductor (D-MODULAR)
    until Step 10 LANDED-proves the new one.
  - **Why:** never swap the live pipeline on an unproven engine; STOP-28 + the whole rebuild philosophy.
  - **Cost of wrong choice:** swapping early (C) breaks live clones with zero rollback margin.
  - **Who decides:** joint (Bean signs the swap at Step 10).

- **Decision:** MF-2 — css_router's dead D1 path: retire or rewire?
  - **Options:** [A] retire D1 (the conductor reads draft CSS directly per node) · [B] rewire Stage 4 to consume D1.
  - **Recommendation:** A — retire D1; the conductor walks the draft per-node (Spec 31 §3 is per-element),
    making D1's pre-split redundant. Confirm no property is stranded (the gate's D2-when-D1 check guards this).
  - **Why:** two paths that can disagree is itself a defect class (Family K); one path is the spec goal.
  - **Cost of wrong choice:** leaving D1 as a dead stage silently strands properties (forbidden, §1 MF-2).
  - **Who decides:** architect (record in decisions.md).

- **Decision:** Walker port (Step 4) — inline Opus or dispatched Sonnet?
  - **Options:** [A] inline Opus · [B] Sonnet implementer + 2 reviewers.
  - **Recommendation:** A inline — it's the highest-regression, recursion + cross-node CSS step; Opus
    main-thread reasoning + the council's G1–G5 disposition in working memory beats a cold dispatch.
  - **Why:** Register B flags it HIGH-risk (thinned port → hero split evaporates).
  - **Cost of wrong choice:** a thinned/wrong port that passes tests but fails LANDED — a wasted Step 10.
  - **Who decides:** architect.

### Pre-emptive decisions (inline Hidden-Decisions pass — run /dispatching-parallel-agents gemini-flash + cerebras before executing if budget allows)

- **Decision:** What is the per-node Ctx the conductor builds, exactly?
  - **Recommendation:** `base_layer` (via layer_detect on base decls), `has_inner_blocks` (derived FRESH
    from save.js per Spec 31 §12.7, NOT the cached column), `area_name` (set only inside a grid_area
    parent walk), `block_slug` (from recognition, D244), `conn`. Document this contract at the conductor.
  - **Why:** Step 7 will pause here without it; the dispatch + resolvers all read these Ctx fields.

- **Decision:** How are CSS-attr and content-attr writes merged when both target the same block?
  - **Recommendation:** merge into one dict; the orchestrator COLLISION guard already hard-fails a
    duplicate attr — so a CSS write and a content write to the same attr is a routing bug to surface,
    not a silent last-wins. Styling attrs (quoteColour) and content attrs (quote) are different keys by design.
  - **Why:** prevents the D249-class silent-loss; the guard exists, use it.

- **Decision:** Which composites are in the LANDED fixture set (Step 10)?
  - **Recommendation:** start with hero `split` (exercises scalar-media column + content + L1–L4). Add a
    slug-None section (cross-node CSS fold) as the second. Page 8 is ONE fixture, never the gate (§7b).
  - **Why:** the single-canary blind spot — a page-8 match doesn't prove universality.

---

## Parking lot (deferred during W3 planning — not in W3 scope)
- **FR-22-2.5 array completion** — W3 Step 5 ports arrays as-is with `# TODO FR-22-2.5`; completing the
  array slot-wiring (`array_item_slot_for`, the `_atomic_attrs_for` slug-literal de-literalisation) is
  its own design-gated stage (STOP-18). **Status:** DEFERRED (own design-gate).
- **css_router D1 retire vs rewire (MF-2)** — decided at Step 7 (recommend retire); if rewire is chosen
  instead, that's a separate sub-task. **Status:** OPEN (resolved in Step 7).
- **Production-wiring / convert.py decommission** — swapping the new conductor in as the live engine is
  Spec 31 §8, gated on A1+A2+LANDED across the full fixture set, AFTER W3. **Status:** DEFERRED (post-W3 roadmap).
- **CLAUDE.md "LIVE cloning plan" pointer** still names the 2026-06-09 plan — update it to this W3 plan
  when W3 starts. **Status:** OPEN (1-line doc fix).

---

## Notes on protocol stages condensed (honest disclosure)
- **Research Pre-Gate (Stage 2):** SKIPPED deliberately — Register B is a pre-resolved port spec
  (qc-council'd D247); no novel tool/library/unknown. Not fabricating research.
- **Hidden Decisions (Stage 6):** inline pre-emptive set above; the full gemini-flash+cerebras dispatch
  is recommended at execution start (cheap, ~10× cheaper than mid-step pauses) but not run at plan-time.
- **Docscore (Stage 7) + blub.db plan record (Stage 8):** run `/docscore` on this file + write the
  plan record when W3 starts; deferred to keep this planning pass lean.
