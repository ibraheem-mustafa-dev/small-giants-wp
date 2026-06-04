---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline
title: "Method 2 — converter-lift BUILD phase plan (universal CSS→attr transfer)"
created: 2026-06-04
status: PLAN — pre-adversarial-council. Build = next session. Design source + council verdict: 2026-06-04-method2-converter-lift-design.md (D169).
plan_label: "[PLAN: opus] — orchestrator; Sonnet subagents build the serialised convert.py edits + parallel block/orchestrator edits"
---

# Phase — Method 2 converter-lift (universal CSS→attribute transfer)

**USP:** This is the half that makes a *cloned page actually look like the draft*. WS-4 gave every block the controls; this teaches the converter to fill them from ANY draft's CSS — so the pipeline can clone any HTML/CSS mockup fitting our blocks, at any nesting depth, not just Mama's homepage. It is the gate between "demo on one page" and "a real cloning product."

**Universality is the acceptance bar (Bean-directed).** Every step proves the *mechanism* is universal (the §FR-22-21 6-step procedure + a curated `canonical_slot` map covering the full CSS-property→attribute space, applied at every wrapper at any depth — R-22-9). "1% pixel-diff on Mama's" is necessary but NOT sufficient; each step also passes a **synthetic universality fixture** (varied CSS the Mama's draft does not exercise). No step ships as a per-section or per-block conditional (STOP #16/#33).

**Rule-compliance tag per step (Bean-directed):** **A** = what the spec (§FR-22-21 / FR-22-4.1 / FR-22-5 / FR-22-19) already says the pipeline should do. **B** = a clean pipeline upgrade that integrates without new issues. No step is a Mama's band-aid.

**Phase success criteria (done when):**
- [ ] Every wrapper's OUTER box CSS / CONTENT-WIDTH / GRID / per-item CSS lands on the correct destination attr per §FR-22-21, on BOTH the slug-None container path AND the composite path — verified on Mama's (live-DOM R-22-11) AND on a synthetic multi-pattern fixture.
- [ ] No layout CSS strands in `variation-d0-d2.css`; `css-d1-assignments.json` no longer a stranded artefact (B1=A consume-inline).
- [ ] The 7 verified defects D1–D7 (design doc) all close on the re-clone; Bean R-22-13 visual sign-off.
- [ ] `grep` shows no new hardcoded dict / per-block conditional in the converter (R-22-1); no 4th walker branch (R-22-3).
- [ ] Each fix carries its A/B tag + a passing universality-fixture check in its commit message.

**Entry context (read before starting):**
- `.claude/plans/2026-06-04-method2-converter-lift-design.md` — the 5 fix-shapes + council verdict (the path-split)
- `.claude/specs/22-...md` §FR-22-21 (6-step procedure) + §FR-22-4.1 (wrapper resolution) + §FR-22-5 (CSS routing) + §FR-22-19 (composite interiors)
- `.claude/reports/2026-06-02-container-wrapper-converter-gap-analysis.md` — file:line evidence
- run `pipeline-state/mamas-munches-homepage-2026-06-04-134425` — the baseline artefacts
- memories: `universal-lift-was-premature-not-falsified`, `pipeline-transfers-draft-css-not-converter-detection-hacks`, `composite-mirror-is-separate-from-cloning-fidelity`

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | /qc-council | pre-build gate every step (STOP #50) |
| skill | /subagent-prompt + /dispatching-parallel-agents + /delegate | dispatch |
| skill | /sgs-clone | re-clone to verify (Stage 11 + live-DOM) |
| skill | /sgs-update | re-index after block.json/DB changes |
| mcp | Playwright | live-DOM R-22-11 @1440/768/375 + draft-vs-clone diff |
| cli | python (convert.py, sqlite3) | build + DB |

---

## ⚡ FINAL PLAN — post-adversarial-council (2026-06-04; READ THIS — it supersedes the step bodies below where they conflict)

A 5-persona adversarial council (universality-auditor, cynic, spec-lawyer, ship-PM, adversarial-CSS-red-teamer) pre-mortemed the step bodies below. **Verdict: GO, conditional** on these folds. The step bodies below are retained for their Test blocks + detail; where they conflict with this section, THIS WINS. Three load-bearing council claims were verified at file:line (one was rejected as false — see ✗ below).

### MF-A [5/5 personas] — the curated map must be DB-driven + cover the value-space, or it is a Mama's band-aid (the headline finding)
The original "extend `_root_lift_rules`" is wrong on four counts, all verified: (i) `_root_lift_rules` (convert.py:498-516) is **15 longhand single-value entries** writing to WP `style.*` — NOT the wrapper-attr namespace (widthMode/contentWidth/gap/minHeight) and NOT the full property space; (ii) `_split_value_unit` (convert.py:537) drops every `clamp()/calc()/var()/min()/max()` (regex needs a bare number+unit); (iii) `background`/`box-shadow`/`background-image`/`min-height` are NOT in `_root_lift_rules` today (the plan asserted coverage that doesn't exist); (iv) a hardcoded Python map is an **R-22-1 violation** — the `property_suffixes` table (117 rows, `kind_override` column) ALREADY exists for CSS-property→attr-suffix mapping (the FR-22-5 D1 mechanism).
**FOLD:** the lift's map is built at runtime from `property_suffixes` (R-22-1, the same pattern as `atomic_tag_map()`/`_kind_for()`); a pre-build step verifies every CSS property the fixture expects to lift has a `property_suffixes` row (add missing rows via `populate-db.py` BEFORE building — a DB gap, never a code dict). The value parser gains a **CSS-function passthrough** (clamp/calc/var/min/max → stored as a raw string on attrs that accept raw CSS — the project supports raw-CSS controls per `block-style-controls-accept-raw-css`). Unmapped properties **FLAG to gap-candidate, never silent-drop** (FR-22-21 step 6) — proven by a deliberate fixture case (e.g. `clip-path`). The lift consumes `bp_decls` (Tablet/Mobile), not just `_sec_base` (the slug-None path currently discards `bp_decls` at convert.py:2114 → responsive overrides silently dropped). Destination = the wrapper-attr namespace, with a separate mechanism from the `style.*` `_root_lift_rules` shape.

### MF-B [3/5] — min-height is a BLOCK-layer fix, not a converter align-gate (re-layer; STOP #31 applied to my own STOP #49)
Verified: `class-sgs-container-wrapper.php:431` adds `sgs-container--has-min-height` on **min-height presence alone** (no `verticalAlign` reference), and `style.css:33` centres it. The helper DOES already read `verticalAlign` (line 197) + emit `align-items` from it (337/347) — so the centre-forcing class at 431 can CONFLICT with a top-aligned section.
**FOLD:** the fix is block-side — gate the `--has-min-height` class (or its CSS) on `verticalAlign === 'center'` so a non-centred min-height section is NOT force-centred. THEN the converter lifts `min-height`→`minHeight` **unconditionally** (faithful) and lifts the draft's centring idiom → `verticalAlign` **separately**. The centring detector must cover the idiom set (`align-items`/`justify-content`/`place-items`/`place-content`/child `margin:auto`/`align-self`), checked across `bp_decls` too — not just `align-items` in `_sec_base`. This becomes a new block-layer step (parallel with FS-4).

### MF-C [3/5] — do NOT edit the shared wrap function to read CSS; pass computed attrs in as a parameter
Verified: `db_lookup.py:2461 emit_sgs_container_wrapping` wraps **every top-level section** (slug-None AND composite — its docstring says so), not just composites. Editing it to read CSS changes OUTER attrs for all 9 sections from a 2nd code site → re-introduces the two-path divergence WS-4 killed.
**FOLD:** Step 3 computes the OUTER container attrs in the walker (one site, the same map as MF-A) and **passes them into `emit_sgs_container_wrapping` as a parameter** (it currently hardcodes `{"widthMode":"full"}` and ignores container-level attrs for the composite case). The `widthMode:"full"` stays as the faithful-absence DEFAULT (max-width absent → full per §FR-22-21 step 2); for hero specifically, §FR-22-21 step 3 says NO contentWidth (no inner). One computed dict, both paths.

### MF-D [Ship-PM, REVISED by Bean 2026-06-04] — ONE session, Opus orchestrator + subagents; re-sequence + front-load the visible win
**Bean's call (correct): ONE session.** The ship-PM's "2 sessions" assumed a generic context budget. With Opus + 1M context + the orchestrator-dispatches-subagents model, the build work runs in SUBAGENT contexts — the orchestrator only carries cold-prompt-out + diff/live-DOM-back, which is lean; 1M holds the whole build. The real constraints are wall-clock (re-clones) + the convert.py serialisation, NOT orchestrator context. So: one session, two PHASES (not two sessions).
**FOLD the build order (supersedes the Step 0→6 order below):**
- **Phase A (converter core — SERIALISE on convert.py; Opus dispatches one Sonnet subagent per step, verifies each before the next):** (A1) build the DB-driven map + value passthrough + FLAG + responsive [MF-A] → (A2) **Step 3-refined FIRST** (composite path via the param, MF-C — highest-risk + the first visible win: hero flat-pink + min-height) → (A3) Step 1 slug-None lift (reuses the map) → (A4) Step 2 sidecar deletion (mechanical cleanup). QA Gate 1.
- **Phase B (block + polish — PARALLEL Sonnet subagents, disjoint files):** MF-B min-height block-layer fix ∥ FS-4 sgs/media CSS ∥ D6+D7 converter variant/modifier ; THEN D5 layer-diagnosis (verify block-vs-converter first, STOP #31; if converter, already covered by A3's grid lift) ; THEN FS-5 image sideload (**should-ship, not must** — if it stalls on auth/idempotency, defer without blocking the gate) ; THEN the synthetic universality fixture (Step 0, **last** — regression harness, not a gate for the first win). QA Gate 2 + Bean R-22-13.
- **Subagent discipline (the throughput lever):** Opus orchestrates + verifies + fact-checks; Sonnet subagents do ALL building (cold prompt: edit-only-named-files, return uncommitted, no git stash, self-test). Parallelise Phase B (disjoint files); serialise Phase A (shared convert.py). Per `dont-fan-out-many-heavy-agents-at-once`: 2-3 subagents per batch, verify each batch before the next.
- **Context checkpoint = SAFETY VALVE only** (not a planned split): the genuine risk is the composite step (A2) thrashing — if it does, roll back fast (STOP #19) and handoff cleanly rather than iterating under pressure. Otherwise run straight through to QA Gate 2 + Bean sign-off in one session.

### SHOULD-FIX (fold into the relevant step)
- **FR citation:** modifier carry (`--send-to-ward`, D7) is governed by **§FR-22-1 table row 3** (modifier → emitted block as `variantStyle`/className), NOT §FR-22-4.1 (that's transparent-wrapper pass-through). Query `block_attributes` for `announcement-bar.variantStyle` to pick the destination.
- **Trace before fixing:** locate the `--Array` bug (D6) at a file:line in the variant-emit path before touching it; confirm `blocks.variant_attr` is populated for the affected blocks (FR-22-20 generalisation is partial).
- **Staleness gate:** add a test that enumerates `block_attributes` for `sgs/container` + asserts every wrapper-capability attr has a `property_suffixes` entry OR is on an explicit no-CSS-source allowlist — fail the build when a new attr appears unmapped (this is what makes "universal" true in 2 years, not just today).
- **Fixture value-syntax axis:** the synthetic fixture MUST add cases the original list omitted — `rem`/`%`/`vw` units, `clamp()/calc()/var()`, `background`/`margin`/`border` shorthands, a `::before` overlay (the D2 gradient may be a pseudo-element), logical props (`padding-inline`), and a deliberate unsupported prop (`clip-path`) to prove FLAG-not-drop.
- **Pre-step baseline capture:** store `getComputedStyle` JSON for all 9 Mama's sections @1440/768/375 BEFORE Session A, diff after each step (so "0 regressions" is measured, not eyeballed).

### ✗ REJECTED council claim (verified false — STOP #34)
Cynic MF-1 ("the sidecar file isn't written; `sgs-clone-orchestrator.py` doesn't exist; D4 has a different untraced cause"). Verified false: `css-d1-assignments.json` exists (19,928 bytes, 42 keys), `seed_d1_sidecar` IS a no-op stub (run log + extraction agent), and `sgs/feature-grid.gap=14px` IS the stranded value (D4's confirmed root cause). FS-2's premise holds; consume-inline is correct. (The cynic mis-grepped the write path.)

### Compliance recheck (Bean's A/B bar)
All folds keep every fix as A (spec-says) or B (clean upgrade): MF-A = A (R-22-1 + FR-22-5 `property_suffixes` is the spec's own mechanism); MF-B = B (block-quality CSS fix, correct layer) + A (faithful align transfer); MF-C = A (§FR-22-21 step 2 faithful-absence, one source of truth, no divergence); MF-D = sequencing only. No fold introduces a Mama's-specific conditional (R-22-9 intact).

---

## Step 0 — Re-baseline + build the universality fixture  [SESSION-START]
  Model:    inline (Opus) + Sonnet for fixture authoring
  Action:   Confirm the baseline run artefacts are current (convert.py unchanged since 2f86d9e6); author a SYNTHETIC universality fixture `sites/_dogfood/converter-lift-mockups/index.html` — a single draft exercising EVERY §FR-22-21 case the Mama's draft does NOT: a full-bleed section (no max-width), a capped section (max-width), a section whose inner __inner is ALSO the grid, a deeply-nested grid (grid on a great-grandchild), a min-height section WITH align-items:center, a min-height section WITHOUT centring (must NOT centre — STOP #49), a composite (hero/trust-bar) with a bespoke overlay, raw-px gap + token gap, and a section with shadow/border.
  Files:    sites/_dogfood/converter-lift-mockups/index.html (NEW)
  Outcome:  A fixture that, when cloned, exercises the full property→attr space + every emit path (slug-None, composite, grandchild-grid) at varied nesting.
  Exec:     SEQUENTIAL  Deps: none  Marker: SESSION-START  Time: ~15 min
  Tooling:  Read design doc + §FR-22-21; Write fixture
  On-Fail:  n/a (authoring)
  Cold-Entry: design doc + §FR-22-21 + this plan
  Universality: THIS STEP IS the universality harness — every later step validates against it, not only Mama's.
  Rule tag: B (test infrastructure — a dogfood fixture per the /sgs-clone dogfood loop)
  Test:
    Happy: `/sgs-clone` on the fixture runs clean; every case section appears in stage-1 boundaries.
    Edge: the min-height-not-centred section + the great-grandchild grid both produce boundaries.
    Fail: a malformed fixture halts Stage 1 → fix the fixture.
    Integration: the fixture is a permanent regression surface for future converter work.

## Step 1 — FS-1a/FS-2a: curated wrapper-capability lift on the slug-None container path
  Model:    sonnet (cold subagent) — convert.py edit; Opus verifies
  Action:   In `convert.py` slug-None top-level path (~2104-2129) + extend `_root_lift_rules` (~498): apply a CURATED `canonical_slot` map (DB-driven, R-22-1; NOT a blind suffix — STOP #48) transferring the section root's own CSS → container attrs per §FR-22-21 steps 2-4: background family, padding/margin/border, `min-height`→`minHeight` GATED on the draft carrying `align-items:center`/`justify-content:center` (STOP #49, else gap-candidate), `display:grid`+`grid-template-columns`(+responsive)→`layout`+`gridTemplateColumns`(+Tablet/Mobile), `gap` (raw px allowed, A4)→`gap`, inner `max-width`→`contentWidth`. The map covers the FULL property space, not only what Mama's sets.
  Files:    plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py
  Inputs:   §FR-22-21 steps 2-4; the curated map (extend existing `_root_lift_rules`)
  Outcome:  Any slug-None section's outer/content/grid CSS lands on the right attr; absence stays absence (R-22-21 step 6).
  Exec:     SEQUENTIAL (shares convert.py with Steps 2,3)  Deps: Step 0  Marker: (none)  Time: ~25 min
  Tooling:  /qc-council pre-build (confirm each curated entry's CSS reaches this path on the fixture + Mama's); python
  On-Fail:  git checkout convert.py; re-tune across a session boundary (STOP #19)
  Universality: fixture's full-bleed / capped / inner-is-grid / min-height-centred / min-height-NOT-centred sections each lift correctly; Mama's featured-product/brand/ingredients/gift/social-proof unchanged-or-correct.
  Rule tag: A (§FR-22-21 steps 2-4 + FR-22-5 CSS routing)
  Test:
    Happy: fixture re-clone → `getComputedStyle` per section matches the draft on outer/content/grid.
    Edge: min-height-NOT-centred section does NOT get centred (no `--has-min-height` flex trap); raw-px gap survives un-tokenised.
    Fail: a property with no curated entry → FLAG to gap-candidate, never silent-drop.
    Integration: feeds Step 2 (the resolved-block paths reuse the same curated map).

## Step 2 — FS-2 B1: delete the sidecar, consume CSS→attr inline (resolved-block + container paths)
  Model:    sonnet (cold subagent); Opus verifies
  Action:   Delete `seed_d1_sidecar` stub (`convert.py:167`) + its orchestrator call (`sgs-clone-orchestrator.py:1298-1308`) + the `css-d1-assignments.json` write. At each resolved-block / grid-bearing wrapper the walker reads the element's own CSS and maps via the SAME curated map from Step 1. Recovers the values currently stranded (feature-grid `gap:14px`, any block-level grid/gap at any depth).
  Files:    convert.py, sgs-clone-orchestrator.py
  Outcome:  No stranded sidecar; block-level grid/gap/typography lift inline at any nesting depth.
  Exec:     SEQUENTIAL (after Step 1)  Deps: Step 1  Marker: (none)  Time: ~20 min
  Tooling:  /qc-council pre-build; python
  On-Fail:  git checkout; revert
  Universality: fixture's great-grandchild grid + Mama's feature-grid gap both lift; no `css-d1-assignments.json` written.
  Rule tag: A (Spec 22 explicitly supersedes the Spec-16 sidecar — comment at convert.py:157-166)
  Test:
    Happy: `.sgs-feature-grid` gap = 14px on re-clone; fixture deep grid lifts.
    Edge: a block with no liftable CSS emits no spurious attrs.
    Fail: a sidecar reference left anywhere → grep convert.py + orchestrator returns 0.
    Integration: shares the curated map with Step 1 (one source of truth).

## Step 3 — FS-1b/FS-2b: faithful wrapper transfer on the COMPOSITE path (hero, trust-bar, any composite)
  Model:    sonnet (cold subagent); Opus verifies (sensitive — composite path)
  Action:   Replace the hardcoded `{"widthMode":"full"}` band-aid (`db_lookup.py:2461`, gap C1) with faithful transfer from the composite's OWN wrapper CSS onto the now-mirrored (WS-4) composite wrapper attrs; in the FR-22-19 `_route_composite_interior` path, transfer min-height/content-width/gap + STOP emitting a background-image the draft never set (hero gradient D2). Uses the same curated map. This is exactly the lift `universal-lift-was-premature-not-falsified` said lands AFTER WS-4 — WS-4 is now done, so the destination attrs exist.
  Files:    convert.py (_route_composite_interior), db_lookup.py (:2461 emit_sgs_container_wrapping)
  Outcome:  ANY composite (not just hero/trust-bar) gets faithful wrapper-CSS transfer via its mirror; no imposed gradient; min-height lifts.
  Exec:     SEQUENTIAL (after Step 2)  Deps: Step 2  Marker: (none)  Time: ~30 min
  Tooling:  /qc-council pre-build (HARD — STOP #50: confirm hero/trust-bar emit via this path on the canary, which the trace proved); python
  On-Fail:  git checkout; this is the highest-risk step — roll back fast (STOP #19), re-tune across a boundary
  Universality: fixture's composite-with-bespoke-overlay transfers faithfully; Mama's hero shows flat pink + min-height 520 + no gradient; trust-bar badges cap at 1100 + gap 16.
  Rule tag: A (C1 removal = WS-3 de-cheat + §FR-22-21; composite-mirror transfer = §FR-22-21 composite-mirror rule + the reinstated post-WS-4 lift)
  Test:
    Happy: hero outer `backgroundImage === 'none'` + `minHeight === '520px'`; trust-bar inner ≤1100 + gap 16.
    Edge: a composite WITHOUT a bespoke overlay still gets its mirror attrs (no double-emit, C3 guard intact).
    Fail: widthMode no longer hardcoded full where the draft has a max-width.
    Integration: depends on WS-4 mirror attrs existing (they do, D167).

## QA Gate 1 — convert.py serialised fixes integrity
  Model: inline (architectural)  Exec: SEQUENTIAL  Deps: Steps 1-3
  Check: `python -c "import convert"` clean; `grep -nE "_CAPABILITY_PRIORITY|seed_d1_sidecar|widthMode.*:.*full" convert.py db_lookup.py` shows C1 band-aid gone + sidecar gone; re-clone fixture + Mama's → live-DOM per-section matches draft on the lifted properties; no layout CSS in `variation-d0-d2.css` for lifted sections.
  Pass: all defects on slug-None + composite paths close on BOTH the fixture and Mama's; 0 new regressions @768/375.
  Fail: roll back the offending step; re-council.
  Marker: QA

## Step 4 — FS-3: variant + BEM-modifier + className preservation
  Model:    sonnet (cold subagent); Opus verifies the LAYER for D5
  Action:   (a) Fix the FR-22-20 variant-class emit to use the variant VALUE string, never a JS `Array.toString()` (the `--Array` bug, D6). (b) Carry arbitrary source BEM modifiers onto the emitted block's `className` (extend the D145 `is-style-*` carry to `--send-to-ward` etc., D7). (c) Diagnose D5 (product-card 380px not 640/384) LAYER FIRST (STOP #31) — likely a product-card block default width overriding its grid track, so a BLOCK fix, not converter.
  Files:    convert.py (variant emit + className carry); possibly src/blocks/product-card/* (if D5 is block-side)
  Outcome:  No `--Array` anywhere; arbitrary BEM modifiers preserved on any block; product-card fills its grid track.
  Exec:     SEQUENTIAL (after Step 3, shares convert.py)  Deps: Step 3  Marker: (none)  Time: ~25 min
  Tooling:  /qc-council pre-build; /wp-blocks (product-card schema before claiming D5 layer); python
  On-Fail:  git checkout
  Universality: any variant-bearing block emits its real variant value; any BEM modifier on any block is carried.
  Rule tag: A (FR-22-20 variant detection + FR-22-4.1 "className preserved on the emitted block")
  Test:
    Happy: grep emitted markup for `--Array` = 0; `--send-to-ward` present; product-card track 640/384.
    Edge: a block with no variant + no modifier emits clean (no spurious class).
    Fail: D5 fixed at the wrong layer → verify computed width on a test page first.
    Integration: variant carry composes with the WS-4 mirror (FR-22-20).

## Step 5 — FS-4: sgs/media 0×0-as-grid-child (BLOCK CSS)  [PARALLEL with Step 6]
  Model:    sonnet (cold subagent); Opus verifies on a test page
  Action:   Diagnose against live computed style (R-22-11): an `<img class="sgs-media">` as a direct grid child renders 0×0. Fix sgs/media block CSS for grid/flex-child context (likely `min-width:0` / `width:100%` / `align-self`/`justify-self`). BLOCK fix, NOT converter (STOP #31).
  Files:    plugins/sgs-blocks/src/blocks/media/style.css (+ editor.css if needed)
  Outcome:  sgs/media renders at its track width inside any grid/flex parent.
  Exec:     PARALLEL with Step 6  Deps: none (independent of convert.py)  Marker: (none)  Time: ~15 min
  Tooling:  Playwright (live computed style); test page with sgs/media in a 2-col grid
  On-Fail:  git checkout style.css
  Universality: sgs/media in ANY grid/flex parent renders ≥1px (test the fixture's nested-grid media + Mama's brand image).
  Rule tag: B (block-quality CSS upgrade — sgs/media should be robust as a grid/flex child)
  Test:
    Happy: brand image box ≥450px on re-clone; test-page media in grid renders.
    Edge: sgs/media as a flex child + as a block-flow child both unaffected.
    Fail: needs a deprecation? No — CSS-only, no save() change.
    Integration: visual-diff report required (visual block change → the commit gate).

## Step 6 — FS-5: image sideload dry-run → real upload  [PARALLEL with Step 5]
  Model:    sonnet (cold subagent); Opus verifies manifest + live 200s
  Action:   Wire Stage 4i media-sideload (`stage_4i_media_sideload`) from dry-run (`id:null`) to a real WP media upload + page patch (REST). Idempotent; respects the token-gated canary creds.
  Files:    plugins/sgs-blocks/scripts/orchestrator/ (media-sideload.py + stage_4i wiring)
  Outcome:  The draft's images upload to the WP media library; the cloned page references real attachment IDs (no 404/placeholder).
  Exec:     PARALLEL with Step 5  Deps: none  Marker: (none)  Time: ~25 min
  Tooling:  /qc-council pre-build (idempotency + auth); REST; Playwright (live image 200s)
  On-Fail:  git checkout; dry-run remains the safe default
  Universality: ANY draft's referenced images sideload; re-run is idempotent (no dupes).
  Rule tag: A (completing the spec'd Stage 4i — the stage exists, dry-run→real finishes it)
  Test:
    Happy: `media-sideload-manifest.json` shows real IDs; live page images load 200.
    Edge: re-run uploads 0 dupes (idempotent); a missing source image → flagged, not crash.
    Fail: auth failure → fail loud, do not silently dry-run.
    Integration: feeds Stage 10 patch.

## QA Gate 2 — full re-clone + Bean R-22-13
  Model: inline + Playwright  Exec: SEQUENTIAL  Deps: Steps 1-6
  Check: full `/sgs-clone` on Mama's page 144 + the fixture; live-DOM R-22-11 @1440/768/375 confirms D1-D7 all close + the fixture's full-property-space cases all transfer; pixel-diff informational (FR-22-18); Bean visual sign-off on cropped pairs.
  Pass: every defect closed on Mama's AND the universality fixture; Bean R-22-13 granted.
  Fail: per-defect rollback + re-council the failing fix-shape.
  Marker: QA / HANDOFF

---

## Key Judgement Calls

### Primary decisions
- **Decision:** Where does the composite-path lift (Step 3) actually land — `_route_composite_interior` vs the `db_lookup.py:2461` emit vs hero's render.php?
  - **Options:** (A) the converter emit path only / (B) converter + a render.php read / (C) the C1 band-aid removal alone
  - **Recommendation:** A — transfer onto the mirrored composite wrapper attrs at the converter emit; the block render.php already consumes those attrs (WS-4). Removing the C1 `widthMode:full` hardcode is part of it.
  - **Why:** the block side is done (WS-4); the gap is purely that the converter doesn't WRITE the attrs. Keep it converter-side, no render.php change.
  - **Cost of wrong choice:** touching render.php risks the WS-4 mirror; a 0-delta no-op if it lands on the wrong path (the trap the council caught).
  - **Who decides:** joint (confirm at Step 3's /qc-council pre-build).
- **Decision:** D5 (product-card 380px) — block or converter layer?
  - **Recommendation:** verify on a test page first (STOP #31); likely block-side (a default width overriding the grid track).
  - **Cost of wrong choice:** a converter fix for a block bug = wasted + doesn't generalise.
  - **Who decides:** joint (Step 4).

### Pre-emptive decisions (to be filled by the /adversarial-council — Bean-directed next step)
- _Folded into the adversarial-council pass: what breaks universality, what causes new issues post-fix, what's over/under-scoped._

---

## Notes
- The 3 convert.py steps SERIALISE (shared file — no parallel edits, `dont-fan-out-many-heavy-agents-at-once`). Steps 5+6 parallel (disjoint).
- Each step: /qc-council pre-build (STOP #50) → Sonnet build (cold prompt, edit-only-named-files, return uncommitted, no git stash, self-test) → Opus verify diff + live-DOM → commit by explicit path (theme thread shares the tree, STOP #41/#45) → re-clone where converter-touching.
- Pixel-diff is informational (FR-22-18); the gate is live-DOM structural parity (R-22-11) + Bean's eye (R-22-13).
