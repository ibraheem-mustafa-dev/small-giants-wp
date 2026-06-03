---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline
plan_name: 2026-06-03-cloning-fidelity-triage-and-composite-remodel
generated: 2026-06-03
parent_plan: .claude/plans/2026-06-02-container-wrapper-standardisation.md
status: awaiting-approval
plan_label: "[PLAN: opus]"
---

# Phase — Cloning page-fidelity: triage + grid root-cause + composite-remodel (WS-4)

## 2026-06-03 PM UPDATE (D163)

**What was built this session (uncommitted):**
- **#3 (heading-align) + #8 (testimonial-slider)** — BUILT-uncommitted, pending Gate B. #8 additionally needs live 4-card verify before the gate.
- **WS-1c A3 (custom-width `margin-inline:auto` centring) + A4 (raw-px gap passthrough via new `sgs_container_gap_value()` helper)** — BUILT-uncommitted in `container/render.php`, pending Gate B.

**Dispositions refined by /qc-council (D163) — do NOT proceed with the original plan on these items:**
- **#4a grid-lift (converter-side align-items):** part of the FALSIFIED generic-lift exploration. align-items regression risk confirmed. Reconsider under WS-4 as a layout-only mechanism, NOT a standalone converter hack.
- **Generic converter-lift (blind DB-suffix fingerprint for WS-1c A5/A6 + B1):** FALSIFIED. sgs/container attr suffixes are overloaded → mis-maps; min-height also triggers a `--has-min-height` flex-centre render-trap. The blind fingerprint is UNSAFE. Correct paths: A5 = curated `_root_lift_rules` extension (canonical_slot precision, align-gated); A6 = WS-4 lift-only-gated sub-mechanism with own /qc-council; B1 = curated canonical_slot map, NOT revive the blind consume-path.
- **Real A5 (min-height) bug:** hero composite-interior extraction (`minHeightTablet=520px`) — NOT a slug-None container-path gap. Fix lives in the composite-interior path, not in `_root_lift_rules` blindly.

**Dedup audit result (4-rater /qc-council):** NO block merges — the block roster is sound; overlap is plumbing-level → shared helpers + the container-mirror, not merges. **content-collection = the pending 29th container block to REGISTER** (layout KIND) — register-not-merge; DB roster is still 28 until next session registers it.

**WS-4 scope confirmed:** ALL ~29 composites KIND-scoped (28 current + content-collection to register). WS-4 is the FOUNDATIONAL opener — must precede any standalone converter hacks on grid/min-height.

**composite-diff scanner update:** `sync-container-wrapping-blocks.py` extended this session to emit per-composite MISSING/ADDED/ALTERED capabilities vs sgs/container, plus an INDEX roll-up. This is the WS-4 input artefact.

---

**USP:** The canary page *looks broken* despite WS-1's width fix — composites are drifted, content-routing drops content, and the product grid collapses. This phase makes the cloned page actually match the design, and lands the composite-remodel mechanism (Bean's directive) so the fix is permanent across every client, not a one-off patch.

**Plan label:** [PLAN: opus] (architectural — WS-4 composite remodel + converter root-causes; Opus orchestrates, Sonnet/Haiku execute dispatched steps)

**Phase success criteria (done when):**
- [ ] Product grid: `.sgs-products` renders 5fr 3fr on desktop with cards FILLING their cells (Zookies ~640, Trial ~384), live-DOM verified (your point 1).
- [ ] Content-routing bugs #3/#6/#7/#8 root-caused + fixed + live-verified (heading-align, disclaimer, announcement-bar, reviews-slider).
- [ ] WS-1c container gaps (A3/A4/A5/A6) shipped — the canonical `sgs/container` is capability-complete so composites can mirror it.
- [ ] WS-4: every composite with a built-in wrapper mirrors `sgs/container` exactly via a SHARED mechanism; an `/sgs-update` run re-mirrors them on container version-bump; hero (#1) + trust-bar (#2) render correctly (no left-half collapse, badges = grid items).
- [ ] Each major change passes a /qc-council or /verify-loop gate; Bean visual sign-off (R-22-13) per fidelity milestone.

**Entry context (read before starting):**
- `.claude/parking.md` → P-CLONE-PAGE-VISUAL-TRIAGE (#1–#8) + P-CONTAINER-WRAPPER-STANDARDISATION (WS-1 progress + WS-4 directive) + P-TRUSTBAR-BOUND-GRID
- `.claude/decisions.md` D159 (WS-1 A1+A2 shipped + WS-4 sharpened directive + triage findings), D152 (composite-mirror rule), D150 (28-block roster + 3-KIND)
- `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §FR-22-21 (wrapper-conversion procedure + composite-mirror), §FR-22-19 (composite interiors), §FR-22-4.1 (fold), §6 (R-22-1..14)
- Run artefacts: `pipeline-state/mamas-munches-mamas-homepage-ws1-2026-06-03-060940/` (extract.json, trace.jsonl, leftover-buckets.json)
- `sites/mamas-munches/mockups/homepage/index.html` (draft truth) — served at `python -m http.server 8137 --bind 127.0.0.1` from `sites/mamas-munches/`
- Block code: `plugins/sgs-blocks/src/blocks/{container,hero,trust-bar,cta-section,modal,product-card,notice-banner,announcement-bar,testimonial-slider}/`
- Converter: `plugins/sgs-blocks/scripts/orchestrator/converter_v2/{convert.py,db_lookup.py,css_router.py}`

**References:**
- Existing shared-helper pattern (precedent for WS-4): `plugins/sgs-blocks/includes/render-helpers.php`, `includes/shape-dividers.php` (composites already `require_once` these)
- `block_composition` table (`container_kind` column, 28-block roster) — the propagation substrate (Workstream A, shipped `0d746073`)
- memory: `feedback_no_composite_evades_universal_rule`, `feedback_pipeline_transfers_draft_css_not_converter_detection_hacks`, `empty-section-false-pixel-diff-win`, measurement-vs-eye rule + STOP #46

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | /systematic-debugging | Wave 1a investigations |
| skill | /qc-council | Gate after every investigation wave + before each major commit (blub.db 255) |
| skill | /verify-loop | 2-attestation on each shipped fix |
| skill | /dispatching-parallel-agents | Wave 1a, 1b, WS-4 per-composite |
| skill | /subagent-driven-development | WS-4 implementer+reviewer pattern |
| skill | /sgs-wp-engine, /wp-block-development | block-side fixes (notice-banner, announcement-bar, composites) |
| skill | /wp-blocks (schema dump), /sgs-db | DB/schema ground truth before "missing X" |
| skill | /delegate | per-step model pick |
| agent | wp-sgs-developer | heavy block/render.php/converter build |
| agent | design-reviewer | visual parity draft-vs-clone |
| mcp | Playwright | live-DOM verify + draft-vs-clone computed-style diff |
| cli | build-deploy.py / sgs-clone-orchestrator.py | deploy + re-clone |

---

## Wave structure + dependency graph

```
WAVE 1 (this session) — fast parallel wins
  1a INVESTIGATE (parallel, read-only): grid-rootcause · disclaimer · announcement-bar · reviews-slider · heading-align
        ↓ (returns fix-shapes w/ file:line)
  GATE A: /qc-council the fix-shapes (R-22-7, blub.db 255)
        ↓
  1b IMPLEMENT (parallel, disjoint files) the validated fixes  ║  1c WS-1c container gaps A3/A4/A5/A6 (parallel, independent)
        ↓
  GATE B: deploy + re-clone + live-DOM verify @1440/768/375 + Bean sign-off (R-22-11/13)
        ↓  [SESSION boundary candidate — WS-1 complete + visible bugs fixed]
WAVE 2 (gated; likely next session) — WS-4 composite remodel
  2a DESIGN-GATE: /brainstorming + /qc-council on the shared-wrapper mechanism (PHP helper vs block.json mirror vs both)
        ↓
  2b BUILD shared container-wrapper render helper + the propagation WRITER (sync-container-wrapping-blocks.py report-only → writer) + /sgs-update wiring
        ↓
  2c REMODEL the composites (parallel /subagent-driven-development, one per KIND/block) to embed the exact mirror
        ↓
  GATE C: proof-of-propagation (add dummy attr to sgs/container → /sgs-update → all composites gain it) + per-composite live-editor + Bean sign-off
WAVE 3 (independent, schedule anytime) — image sideload (#5 + hero/product imgs; biggest pixel lever) + WS-2/WS-3 residual de-cheat
```

**Gates:** A (council fix-shapes) · B (live-DOM + Bean) · C (propagation proof + Bean). No wave proceeds past its gate.

---

## WAVE 1a — Parallel root-cause investigation (read-only)

> Dispatched together in ONE message (5 parallel agents). Each is READ-ONLY, returns a structured fix-shape: {issue, root_cause (file:line), draft_vs_clone_evidence, proposed_fix (file:line + change), predicted_post_fix (live-DOM), risk}. NO edits, NO commits. Cite `extract.json`/`trace.jsonl`/`leftover-buckets.json` + draft-vs-clone live DOM.

Step 1 — Investigate: product grid root-cause (your point 1)
  Model:    sonnet  (delegate: code-path trace + live-DOM)
  Action:   Root-cause why `.sgs-products` cards sit centred in each half instead of filling 5fr/3fr cells. Trace: does the converter lift the RESPONSIVE @media `grid-template-columns:5fr 3fr` onto the `.sgs-products` container (it becomes its own sgs/container per FR-22-4.1 rule 4), or only the base `1fr`? Check the emitted markup in extract.json + the live grid element's gridTemplateColumns AND each card's width + max-width/justify-self. Distinguish: (i) grid-template not lifted (extraction layer — your hypothesis), vs (ii) product-card has a max-width capping it at ~380, vs (iii) the card isn't `justify-self:stretch`. 
  Files:    READ convert.py (_detect_grid_container_from_css, _collect_responsive_grid_from_css ~2338-2416, _emit_wrapper_container, _fold_layout_into_attrs), db_lookup.py, product-card/{render.php,style.css,block.json}, extract.json, mockup index.html (.sgs-products + @media)
  Inputs:   run artefacts + draft truth
  Outcome:  A file:line root cause naming WHICH layer drops the desktop grid-template OR caps the card, + a proposed fix (likely WS-2 B3: responsive grid-template typed-lift onto the wrapper container) + predicted post-fix card widths (640/384).
  Exec:     PARALLEL with steps 2,3,4,5
  Deps:     none
  Marker:   (none)
  Time:     ~6 min
  Tooling:  /systematic-debugging, Playwright (draft-vs-clone grid measure), /sgs-db, /wp-blocks
  On-Fail:  if root cause ambiguous, return the 2 candidate hypotheses + the discriminating measurement for the main thread to run.
  Prompt:   [pre-written — see Appendix P1]
  Test:
    Happy:       returns file:line + a discriminating measurement (grid-template value on the wrapper vs card max-width) that isolates the layer.
    Edge:        if BOTH grid-not-lifted AND card-max-width are present, returns both with priority order.
    Fail:        artefact missing → names which artefact + falls back to live-DOM-only diagnosis.
    Integration: cross-checks emitted markup (extract.json) against live DOM (R-22-11).

Step 2 — Investigate: ingredients `__disclaimer` → empty notice-banner (#6)
  Model:    sonnet
  Action:   Root-cause why the draft disclaimer (text + no icon + specific border) clones to an EMPTY notice-banner with an unwanted icon + wrong border. Trace the `disclaimer`→sgs/notice-banner slot routing (D141) + notice-banner render.php + whether the text content is dropped at extraction (leaf-routing) or at render (FR-22-6 null-save / scalar drop). Check draft markup of `.sgs-ingredients-section__disclaimer`.
  Files:    READ convert.py (_route_text_leaf, content-leaf step), db_lookup.py (disclaimer slot), notice-banner/{render.php,block.json,deprecated.js}, extract.json, mockup
  Outcome:  file:line root cause (extraction drop vs render drop vs slot mis-route) + fix-shape + predicted post-fix (text present, no spurious icon, correct border).
  Exec:     PARALLEL with 1,3,4,5
  Deps:     none
  Marker:   (none)
  Time:     ~6 min
  Tooling:  /systematic-debugging, /wp-blocks, Playwright
  On-Fail:  return candidate layer + discriminating check.
  Prompt:   [pre-written — see Appendix P2]
  Test:
    Happy:       isolates the layer dropping the text (extract.json shows it present/absent).
    Edge:        distinguishes "icon added by block default" from "icon added by converter".
    Fail:        slot missing in DB → reports via /sgs-db, not assumption.
    Integration: emitted markup vs live DOM.

Step 3 — Investigate: announcement-bar content wrong (#7)
  Model:    sonnet
  Action:   Root-cause why `sgs-announcement-bar` clones with completely different content (lost outline, icon, box bg, button). Determine: is the draft section even SUPPOSED to be an announcement-bar block, or is it mis-routed? Compare draft markup/CSS vs the emitted block + announcement-bar render.php capabilities. (NB: announcement-bar may be a composite needing variant routing per FR-22-20, or a mis-classification.)
  Files:    READ convert.py (boundary/voter + leaf routing), db_lookup.py, announcement-bar/{render.php,block.json}, voter.json/stage-2.json, extract.json, mockup
  Outcome:  file:line root cause (mis-route vs dropped attrs vs block-capability gap) + fix-shape + predicted post-fix.
  Exec:     PARALLEL with 1,2,4,5
  Deps:     none
  Marker:   (none)
  Time:     ~6 min
  Tooling:  /systematic-debugging, /wp-blocks, Playwright
  On-Fail:  return candidate root causes.
  Prompt:   [pre-written — see Appendix P3]
  Test: Happy: names whether it's routing or attr-drop. Edge: flags if the block genuinely lacks the capability (gap-candidate). Fail: reports voter confusion. Integration: voter.json vs emitted markup.

Step 4 — Investigate: reviews / testimonial-slider section (#8)
  Model:    sonnet
  Action:   Root-cause why the reviews slider renders "very different" from the draft. Compare draft `.sgs-social-proof` slider structure/CSS vs the emitted testimonial-slider (or container) markup. Determine routing + whether the slider's grid/track is transferred (links to P-G5 testimonial-slider + the carousel-vs-grid variant).
  Files:    READ testimonial-slider/{render.php,style.css,block.json}, convert.py, extract.json, mockup (.sgs-testimonial-slider + @media)
  Outcome:  file:line root cause + fix-shape + predicted post-fix (structure matches draft).
  Exec:     PARALLEL with 1,2,3,5
  Deps:     none
  Marker:   (none)
  Time:     ~6 min
  Tooling:  /systematic-debugging, /wp-blocks, Playwright
  On-Fail:  candidate causes.
  Prompt:   [pre-written — see Appendix P4]
  Test: Happy: isolates structural divergence. Edge: separates "carousel-by-design" from "broken". Fail: reports if slider block absent. Integration: emitted vs live DOM.

Step 5 — Investigate: featured-product heading centred (#3)
  Model:    haiku  (narrow, single-attr trace — cheap)
  Action:   Confirm + locate why `.wp-block-sgs-heading` emits `text-align:center` for the Zookies heading when the draft is `start`/left. Is it (i) sgs/heading render.php/block default, (ii) converter emitting a centre align attr, or (iii) a deployed variation CSS rule? Draft heading is `start` (verified). Find the exact source + the one-line fix.
  Files:    READ heading/{render.php,block.json}, convert.py (heading emission), variation-d0-d2.css (in run dir), extract.json, mockup
  Outcome:  exact source (file:line) of the centre + a one-line fix-shape + predicted post-fix (heading left).
  Exec:     PARALLEL with 1,2,3,4
  Deps:     none
  Marker:   (none)
  Time:     ~4 min
  Tooling:  /systematic-debugging, /wp-blocks
  On-Fail:  return the 3 candidates ranked.
  Prompt:   [pre-written — see Appendix P5]
  Test: Happy: pinpoints the centre source. Edge: distinguishes block-default vs converter-emitted. Fail: n/a. Integration: emitted attr vs live computed style.

QA Gate A — Council the fix-shapes before any code
  Model:   inline (Opus orchestrates) + /qc-council (cross-model raters)
  Exec:    SEQUENTIAL
  Deps:    steps 1–5 complete
  Check:   Run /qc-council on the 5 returned fix-shapes — each gets a measured baseline + falsifiable predicted post-fix + commit-gate (R-22-7, blub.db 255). Drop any fix-shape no rater can defend with file:line. Verify each against ground truth (STOP #34/#44 — subagent findings are hypotheses).
  Pass:    every surviving fix-shape has: file:line root cause + baseline + falsifiable live-DOM prediction + a commit gate. No unverified "fix all instances" sweep.
  Fail:    a fix-shape's baseline already matches predicted (diagnosis wrong) → return to investigation. Council HOLD (<50 certainty) → surface to Bean.
  Marker:  QA

---

## WAVE 1b — Implement validated fixes (parallel, disjoint files)

> Only the council-validated fix-shapes from Gate A. Each dispatched agent edits ONLY its named files, returns uncommitted (no commit authority — STOP per dispatched-agents rule). Main thread builds/deploys/verifies/commits by explicit path. /qc-inline per small change; /qc-council before the batched commit.

Step 6 — Implement the validated fixes
  Model:    sonnet ×N (one per disjoint fix; PARALLEL via /dispatching-parallel-agents or /subagent-driven-development)
  Action:   Apply each validated fix-shape (grid-template lift / disclaimer text / announcement-bar / reviews-slider / heading-align) to its named files. Each agent: read the fix-shape, apply, run the local self-test (npm build for block changes; python -c import for converter), return diff + the falsifiable prediction it expects.
  Files:    per fix-shape (disjoint — verified non-overlapping at Gate A); converter changes to convert.py SERIALISE (shared file — one agent or sequential) while block changes parallelise.
  Inputs:   Gate A validated fix-shapes
  Outcome:  each fix applied + self-test green; returned uncommitted.
  Exec:     PARALLEL where files disjoint; convert.py edits SEQUENTIAL (shared file).
  Deps:     Gate A
  Marker:   (none)
  Time:     ~10 min
  Tooling:  /subagent-prompt (cold prompts embed the fix-shape + commit gate), /wp-block-development, /sgs-wp-engine
  On-Fail:  revert the single file (git checkout -- <file>); re-investigate that issue. No git stash in subagents.
  Prompt:   [generated per fix at Gate A close via /subagent-prompt — embeds the validated fix-shape + the verbatim commit gate]
  Test:
    Happy:       self-test green per agent; converter import clean.
    Edge:        shared convert.py edits don't collide (serialised).
    Fail:        build fails → revert that file only.
    Integration: combined build compiles; converter smoke test passes.

## WAVE 1c — WS-1c container gaps (independent; parallel with 1a/1b)

Step 7 — WS-1c: A3 custom-width centring + A4 raw-px gap + A5 min-height + A6 gridItem* (+ confirm A7 moot)
  Model:    sonnet  (one cohesive sgs/container build; render.php + convert.py)
  Action:   A3: custom widthMode adds margin:auto centring (verify render.php custom path centres). A4: render.php:150 raw-px gap — accept a raw px value (e.g. "16px") instead of forcing var(--wp--preset--spacing--X); detect token vs literal. A5: add min-height to the section fold lift (_root_lift_rules / the slug-None section path). A6: converter writes gridItem* defaults when a grid's items share uniform box CSS. Confirm A7 MOOT (_lift_core_block_style is dead code — grep 0 call sites; A2 inlined its logic) — if confirmed, delete the dead function or leave noted.
  Files:    container/{render.php,block.json,edit.js,style.css}, convert.py (_root_lift_rules ~498, fold, grid-item collection), db_lookup.py
  Inputs:   plan WS-1c gap register (Appendix B of the standardisation plan)
  Outcome:  4 gaps closed; each live-verifiable; A7 status resolved.
  Exec:     PARALLEL with Wave 1a/1b (independent files except convert.py — serialise convert.py edits with Step 6)
  Deps:     none (but convert.py edits serialise with Step 6)
  Marker:   (none)
  Time:     ~25 min
  Tooling:  /wp-block-development, /sgs-db, /wp-blocks, Playwright
  On-Fail:  per-gap revert; each gap is independent.
  Prompt:   [pre-written — see Appendix P7]
  Test:
    Happy:       A3 brand-like custom-width section centres; A4 a raw "16px" gap renders as 16px not an invalid token; A5 a min-height section gets the value; A6 uniform grid items get gridItem defaults.
    Edge:        A4 token value (e.g. "40") still maps to the preset var; only literals pass through raw.
    Fail:        invalid gap value → sanitised/skipped, not emitted raw-unsafe.
    Integration: full container render + a re-clone section using each.

QA Gate B — Deploy + live-DOM verify + Bean sign-off
  Model:   inline (Opus) + Playwright
  Exec:    SEQUENTIAL
  Deps:    steps 6,7 complete
  Check:   build-deploy.py --blocks-only + OPcache reset; re-clone page 144 (sgs-clone-orchestrator --skip-autonomy-gate --skip-register); Playwright @1440/768/375: (a) `.sgs-products` cards = ~640/384 filling cells; (b) #3 heading left; (c) #6 disclaimer text present + correct; (d) #7 announcement-bar matches draft; (e) #8 reviews structure matches; (f) WS-1c gaps render; (g) no regression on the 4 WS-1 sections (still full-bleed + capped). textLen sanity floors per section (no empty-section false win). /verify-loop 2-attestation on each.
  Pass:    every (a)–(g) live-DOM matches the falsifiable prediction; Bean visual sign-off on the cropped pairs (R-22-13, measurement-vs-eye — full-page draft-vs-clone diff, not width-only, per STOP #46).
  Fail:    any miss → root-cause that one (STOP #19 roll back fast); do NOT iterate a failing sensitive fix inline under context pressure.
  Marker:  QA  → [HANDOFF candidate — commit Wave 1 by explicit path; visual-diff reports per changed block; this is a clean session boundary]

---

## WAVE 2 — WS-4 composite remodel (GATED on Wave 1 complete; likely next session)

> The big architectural one — Bean's directive. Sensitive + touches the 28-block roster → design-gate FIRST, /subagent-driven-development for the per-composite build, proof-of-propagation gate. Detailed but gated; a fresh session executes it with this plan + Gate B's committed state as cold-entry.

Step 8 [SESSION-START] — Design-gate the shared-wrapper mechanism
  Model:    inline (Opus) + /brainstorming + /qc-council
  Action:   Decide the mechanism (KJC-1 below): (a) a SHARED PHP render helper (`includes/class-container-render.php`) that emits the exact sgs/container wrapper markup, which every composite render.php calls — single source of truth; + (b) block.json attr-mirror so each composite EXPOSES the container's editor controls (propagated by /sgs-update from the container's attr set, KIND-scoped via `block_composition.container_kind`). Settle: helper signature, how a composite passes its inner content through, how KIND-scoping limits which attrs mirror (section=full / layout=grid+width / content=width). Pressure-test against hero (split variant), trust-bar (bound grid), cta-section (layout enum collision C8), modal.
  Files:    READ container/{render.php,block.json}, hero/trust-bar/cta-section/modal render.php + block.json, includes/render-helpers.php (precedent), sync-container-wrapping-blocks.py
  Outcome:  a locked mechanism spec (helper signature + mirror rule + KIND scope) + a /qc-council-validated fix-shape.
  Exec:     SEQUENTIAL
  Deps:     Gate B
  Marker:   SESSION-START
  Time:     ~30 min
  Tooling:  /brainstorming, /qc-council, /wp-block-development, /library-docs (WP block render best-practice)
  On-Fail:  if mechanism contested, present options to Bean (KJC-1).
  Cold-Entry: this plan + `.claude/decisions.md` D159/D152 + Spec 22 §FR-22-21 + the committed Wave-1 state + parking P-CONTAINER-WRAPPER-STANDARDISATION.
  Test: Happy: mechanism handles all 4 SECTION composites without per-block special-casing. Edge: hero split + trust-bar bound-grid both fit the helper. Fail: a composite can't use the helper → it's a real divergence to resolve in the spec, not a workaround. Integration: helper + one composite renders identically pre/post.

Step 9 — Build the shared helper + the propagation WRITER + /sgs-update wiring
  Model:    sonnet (wp-sgs-developer agent) — heavy build
  Action:   Extract the container's wrapper render into the shared helper (Step 8 spec). Rewrite `sync-container-wrapping-blocks.py` from report-only → a WRITER that, for each block in `block_composition` with `wraps_block='sgs/container'`, mirrors the KIND-scoped container attr set into the composite's block.json (idempotent, dry-run default, --apply gated). Wire /sgs-update Stage 1 to run it after block_composition reconciliation.
  Files:    NEW includes/class-container-render.php; sync-container-wrapping-blocks.py; sgs-update-v2.py (Stage wiring); container/render.php (extract → call helper)
  Outcome:  helper exists + container uses it (renders identically); writer mirrors attrs in dry-run; /sgs-update wired.
  Exec:     SEQUENTIAL
  Deps:     Step 8
  Marker:   (none)
  Time:     ~45 min
  Tooling:  /wp-block-development, /sgs-db, /subagent-prompt
  On-Fail:  helper extraction must keep container output byte-identical (deprecated-safe) — if it diverges, revert + re-spec.
  Prompt:   [generated at Step 8 close via /subagent-prompt — embeds the locked mechanism spec]
  Test: Happy: container renders byte-identical pre/post helper extraction. Edge: dry-run writer reports the per-composite attr diff without writing. Fail: writer never auto-edits without --apply. Integration: /sgs-update runs the writer clean.

Step 10 — Remodel the composites (parallel /subagent-driven-development, batched by KIND)
  Model:    sonnet ×batches (implementer + spec-reviewer + quality-reviewer per batch)
  Action:   For each composite (SECTION: hero/cta-section/modal/trust-bar first — the visible ones; then LAYOUT; then CONTENT), remove its drifted built-in wrapper and replace with the shared helper call + the mirrored block.json attrs. Each composite keeps its OWN unique interior (hero split, trust-bar badges) but its WRAPPER is the exact mirror. deprecated.js where save() output changes.
  Files:    per-composite src/blocks/<slug>/{render.php,block.json,deprecated.js} — disjoint per agent; NO shared-file edits (FR-22-6.1)
  Outcome:  each composite mirrors the container wrapper; live-editor validated (old posts migrate, new persist).
  Exec:     PARALLEL per batch (one agent per block; SECTION batch first → Bean sign-off → LAYOUT/CONTENT)
  Deps:     Step 9
  Marker:   (none)
  Time:     ~90 min
  Tooling:  /subagent-driven-development, /dispatching-parallel-agents, /wp-block-development, Playwright
  On-Fail:  per-composite revert; a composite that loses content on re-save fails its gate.
  Prompt:   [generated per composite at Step 9 close — embeds the helper API + the composite's current interior to preserve]
  Test: Happy: hero no longer collapses to left half + image fills its half; trust-bar badges = grid items. Edge: hero split variant preserved. Fail: re-save content loss → block's gate fails. Integration: re-clone page 144 → hero/trust-bar render correctly.

QA Gate C — Proof-of-propagation + per-composite + Bean sign-off
  Model:   inline (Opus) + Playwright + /verify-loop
  Exec:    SEQUENTIAL
  Deps:    steps 8–10
  Check:   Add a dummy attr to container/block.json → run /sgs-update → confirm all KIND-matching composites gained it (proof the writer propagates). Live-editor: load an old post with each remodelled composite → no deprecation errors, content preserved; new post persists. Re-clone page 144: hero (#1) + trust-bar (#2) live-DOM correct. Bean visual sign-off (R-22-13).
  Pass:    propagation proven (dummy attr lands everywhere); zero composite re-save content loss; #1/#2 visually correct; Bean signs off.
  Fail:    propagation misses a composite (KIND mismatch) → fix the writer, not the block. Re-save loss → fix that deprecated.js.
  Marker:  QA  → [HANDOFF — WS-4 complete; remove the dummy attr; commit by explicit path]

---

## WAVE 3 — Independent (schedule anytime)
- **Image sideload (#5 + hero/product/brand images):** wire Stage 4i media-sideload from dry-run → real WP media upload + patch. The biggest single pixel lever now that structure is faithful. Independent of Waves 1/2 — can run in parallel or be its own session.
- **WS-2 residual** (B1 D1-sidecar revive/replace decision [KJC-3] · B2 multi-child fold · B4 D3 dual-write · B5 verbatim-fallback) + **WS-3 de-cheat** (C2 trust-bar static grid [folds into WS-4] · C3 _CAPABILITY_PRIORITY · C4 breakpoints · C5 _infer_role · C6 _GLOBAL_BARE_TAGS · C7 de-Mama's deploy script · C8 cta-section layout enum). Architectural debt; lower visible priority.

---

## Key Judgement Calls

### KJC-1 — WS-4 wrapper-mirror mechanism (decide at Step 8)
- **Options:** (a) shared PHP render helper only; (b) block.json attr-mirror only (each composite duplicates the attrs, /sgs-update keeps them synced); (c) BOTH — helper for render + attr-mirror for editor controls.
- **Recommendation:** (c) BOTH. The helper is the single render source of truth (no drift); the attr-mirror gives each composite the container's editor controls (client-experience rule — every control must be an inspector control) and is what /sgs-update propagates.
- **Why:** render-helper alone leaves composites without the container's editor controls; attr-mirror alone leaves render logic duplicated (the original drift cause).
- **Cost of wrong choice:** helper-only → clients can't edit composite wrappers; mirror-only → render drift returns. Re-work ~1 session.
- **Who decides:** Bean (architectural) — present at Step 8.

### KJC-2 — Image sideload: Wave 1 or Wave 3?
- **Options:** (a) do it now (Wave 1) — it's the biggest visible lever and would make Bean's sign-off meaningful; (b) defer to Wave 3 (structure-first).
- **Recommendation:** (b) defer — but FLAG: the missing images make every sign-off harder to read. If Bean wants the page to *look* finished sooner, promote to Wave 1.
- **Why:** structure-first keeps the variable isolated; but Bean's eye needs the images to judge fidelity.
- **Who decides:** Bean.

### KJC-3 — B1 D1-sidecar (WS-2): revive vs DB-replace
- **Options:** (a) revive the consume-path (~43 stranded assignments); (b) replace `seed_d1_sidecar` with a DB-driven lookup.
- **Recommendation:** defer to Wave 3; decide after Wave 1's grid root-cause (Step 1) reveals whether the D1 layer is even on the critical path for the visible bugs.
- **Who decides:** Bean (after Step 1 evidence).

### Pre-emptive decisions (inline Hidden-Decisions pass)
- **convert.py is a shared file across Steps 1/6/7** — serialise all convert.py edits (one agent or sequential); block-side edits parallelise. (Prevents the concurrent-edit race.)
- **Re-clone is required to see converter fixes** — Gate B must re-run sgs-clone-orchestrator (page 144), not just deploy blocks. Block-only fixes (heading, notice-banner) need deploy; converter fixes (grid, routing) need re-clone.
- **Theme thread shares the tree** — every commit by explicit path, verify `git log -1 --stat` (STOP #41/#45).
- **WP_DEBUG_DISPLAY false** on staging before any pixel/visual measure (contaminates layout).
- **Each investigation finding is a HYPOTHESIS** — Gate A verifies against ground truth before any code (STOP #34/#44).

---

## Appendices (pre-written dispatch prompts P1–P5, P7)
> Generated verbatim at dispatch time via /subagent-prompt with the run-dir paths + draft-vs-clone instructions + the read-only/return-fix-shape contract. Each embeds: the issue, the artefact paths, the draft truth, the "return {root_cause file:line, evidence, fix-shape, predicted live-DOM, risk}" schema, and the READ-ONLY/no-commit clause. (Held until Wave 1a dispatch to keep them current with the latest run-dir.)

---

## GROUNDED FINDINGS (2026-06-03 — Wave-1a investigations + Gate-A council + WS-4/#3 audits)

> The investigations + qc-council MATERIALLY corrected the guesses. Sequencing locked: **WS-4 (wrapper mirror) is FOUNDATIONAL — do it FIRST**, because wrapper-dependent fixes (#4 product-card width, #7) would be overwritten if done before WS-4 (Bean-directed). Independent fixes (#3 text-parity, #6 content, #8 slider-internals) can proceed in parallel — they don't touch the mirrored wrapper.

### Council-validated fix-shapes (replaces the Wave-1a guesses)
- **#3 heading/label alignment = customisation-parity GAP (not a CSS patch).** Audit confirmed: `text` HAS textAlign (attr+control+render); `heading` + `label` BOTH MISSING it (heading relies on global `style.css:6 .wp-block-sgs-heading{text-align:center}`). Universal fix = add `textAlign` attr + SelectControl + inline-style render to heading + label matching the **sgs/text pattern**; emit text-align on the WRAPPER (where the global CSS sits) + remove/guard the global centre. Secondary gaps: heading lacks edit.js controls for fontStyle/textDecoration/backgroundColour/inheritStyle (attrs+render exist); label lacks fontStyle + has a broken `attr()` responsive font-size (use scoped `<style>` instead). NOT just heading — bring all 3 text blocks to parity (R-22-9).
- **#4 product grid = TWO defects.** (a) `.sgs-products` (a grid wrapper → own sgs/container via FR-22-4.1 rule-4 `_emit_wrapper_container`) does NOT lift its responsive grid-template onto NATIVE attrs — only page-scoped variation CSS carries it. **Surgical+robust fix (Bean asked): in `_emit_wrapper_container`, run the same responsive-grid lift the fold path already does (`_detect_grid_container_from_css`/`_collect_responsive_grid_from_css`) → lift gridTemplateColumns(+Tablet/Mobile)+gap onto container_attrs.** Universal (every named grid wrapper). (b) `product-card/style.css:17,39-40` caps cards at 380px + margin:auto → cards don't fill cells. Fix = product-card FILLS by default; precise width control comes baked-in via **WS-4** (its wrapper mirrors sgs/container) — NOT a scoped `.sgs-products` CSS hack (R-22-9 violation) NOR a cardMaxWidth band-aid. **→ #4(b) is WS-4-dependent; do after WS-4.** #4(a) grid-lift is converter-independent — can do anytime.
- **#6 disclaimer.** Root = stale `block_composition` row (notice-banner `leaf`/`has_inner_blocks=0`). Fix at SOURCE: declare notice-banner's InnerBlocks template in block.json so `/sgs-update` re-derives `content-block`/`1` (a hand-patched DB row gets overwritten). + universal converter mechanism: when resolved block is content-block + has_inner_blocks=1 + child-recursion yields nothing + node has inline text → synthesise an `sgs/text` InnerBlocks child. + universal `showIcon=false` when the draft node has no icon child (faithful transfer). All convert.py + block.json (R-22-14 clean — no render fallback).
- **#7 announcement-bar.** Mis-route (`sgs-announcement-bar--send-to-ward` bare-block-routes to the block). Council: the converter slots-row fix would break legit `sgs/announcement-bar` elsewhere; just removing the modifier leaves `.sgs-announcement-bar` (still routes to the block). **Bean: likely self-resolves under WS-4** (composites get proper block-name wrapper CSS). **PARK #7 — revisit after WS-4.** (Interim option if needed: rename the mockup class to a real BEM element e.g. `.sgs-gift-section__ward-cta`.)
- **#8 slider — BUILT but BUGGY (Bean live-checked the 4-testimonial clone, uncommitted).** Current build: arrows→flex siblings, controls markup, slidesVisible 1→3, loop via `wrapIndex`. **TWO bugs Bean reported on the live 4-col slider:** (1) **columns far too thin — the card group only spans ~half the section width** (the `__stage{display:flex}`+`__track{flex:1}`+slide flex-basis sizing is wrong; the track/slides must fill the full section/`__inner` width, ~960/3 per card). (2) **nav must ALWAYS show + ROTATE even when total ≤ slidesVisible** — remove the "hide nav when total<=slidesVisible" gate; with 3 cards the autoplay/arrows rotate positions (1→2→3→1) continuously. Also tidy: pause-btn renders as a floating slider child, not inside `__controls`. **Fix-direction:** rebuild the slider's track/slide flex sizing to fill the section width + make nav always-on-rotating; verify live on the real 4-testimonial slider; then commit. (Draft confirmed has >3 testimonials — earlier "only 3" was page-144 stale; the real slider has 4.)

### WS-4 mechanism design (from the foundation audit — the build spec)
- **SCOPE = ALL composites in the `block_composition` container roster (Bean-directed), KIND-scoped — not just the 4 section blocks.** Apply the wrapper mirror to every block with a built-in wrapper across all 3 KINDs: SECTION (hero, cta-section, trust-bar; modal excluded), LAYOUT (card-grid, feature-grid, gallery, post-grid, pricing-table, trustpilot-reviews, google-reviews, form-field-tiles, testimonial-slider, tabs, accordion, form, multi-button), CONTENT (info-box, product-card, testimonial, quote, tab, accordion-item, form-step, notice-banner, option-picker, team-member, mobile-nav). The KIND-scope table (section=full / layout=grid+width / content=width+spacing) already covers all three — the audit detailed SECTION first because they're the visible #1/#2; the build extends the same mechanism to LAYOUT + CONTENT. (#4b product-card fill DEPENDS on the CONTENT-kind mirror — so content-kind is in scope, not optional.) The propagation writer iterates the whole roster; the shared helper + KIND-scoped attr-mirror are identical machinery per KIND.
- **Section-kind roster (the visible first batch — container_kind='section'):** hero, cta-section, modal, trust-bar. **MODAL = HARD EXCLUSION** (its `<div>+<button>+<dialog>`+`::backdrop` shell has no sgs/container mapping — tag `containerMirror:false`). Real targets: **hero, cta-section, trust-bar**.
- **Mechanism:** (a) a shared PHP wrapper class `includes/class-container-wrapper.php` — `SGS_Container_Wrapper::render($attrs,$block_class,$kind,$extra_classes,$extra_styles,$block)` returns `{open,close,uid}`; the composite's render.php calls it for the wrapper + keeps its OWN interior (hero split, trust-bar badges) between open/close. Single source of truth for all wrapper attrs/layers. (b) block.json attr-mirror, KIND-scoped (section=full / layout=grid+width / content=width+spacing). (c) `sync-container-wrapping-blocks.py` report-only → WRITER (`--apply`, idempotent, dry-run default) mirroring container's KIND-scoped attrs into each composite block.json; wired as `/sgs-update` Stage 11 (container version-bump → --apply gate to Bean).
- **BLOCKER to resolve FIRST:** cta-section `layout` enum collision (centred/left/split vs container grid/flex) → rename cta-section's to `contentLayout` + deprecated.js migrate. hero `overlayColour`→`backgroundOverlayColour` + deprecated.js migrate. trust-bar = additive (low risk, no rename).
- **Build sequence:** resolve cta-section `layout` rename → build helper (container behaviour unchanged) → trust-bar (additive) → cta-section (rename+deprecated) → hero (rename+deprecated) → modal excluded → run /sgs-update Stage 11 writer → per-composite pixel-diff + live-editor gate.
- WS-1c (A3-A6) should land BEFORE the helper so the mirror target is capability-complete.

### Locked sequencing (Bean-directed)
1. WS-1c (complete sgs/container) → 2. **WS-4 (wrapper mirror — FOUNDATIONAL)** → 3. wrapper-dependent fixes (#4b product-card fill, #7) → in parallel throughout: #3 text-parity, #6 notice-banner, #8 slider-nav-verify, #4a grid-lift (converter, independent).
