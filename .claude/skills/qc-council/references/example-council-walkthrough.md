Illustrative example: script and fixture names here are placeholders.

# Worked Example — 2026-05-21 Wave-1 (G2 + G4) Council Walkthrough

The canonical case study showing how `/qc-council` would have caught both Wave-1 no-ops before subagent dispatch.

## Background

On 2026-05-21 the SGS pipeline G1-G5 closure plan dispatched two parallel Sonnet subagents to implement council-proposed fixes:

- **G2** — strip `.page-id-N` scope prefix in cv2's `_collect_css_decls_for_element`
- **G4** — strip WP admin bar + sgs-header in `scripts/pixel-diff.py` before screenshot

Both subagents implemented the prescription exactly. Both produced zero measurable improvement. The council was correct about what was broken; wrong about where the fix needed to land. `/qc-council`'s Stage Five empirical-validation gate would have caught both before dispatch.

## Stage 0 — Detect

Council output contains two fix-shape proposals (G2 + G4). Council type: **fix-shape**. Stage Five gate is mandatory.

## Stage 1 — Load ground truth

Loaded:
- `pipeline-state/mamas-munches-homepage-2026-05-20-082521/leftover-buckets.json` — extraction_failed totals by section + source
- `pipeline-state/.../trace.jsonl` — per-stage events with `variation_css_rules` values
- `pipeline-state/.../extract.json` — per-section emitted block_markup
- mockup HTML at `sites/mamas-munches/mockups/homepage/index.html`
- live page DOM at `https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/`

Contradiction surfaced: council said "scope prefix breaks cv2's lookup" — but the leftover-buckets data showed `cv2_emitted_dynamic` source for 952 of 1108 failures (Path B sections), and `stage_3_slot_list` source for only 156 (Path A sections — hero + trust-bar). Council framed this as a single mechanism; the artefact showed two distinct paths.

## Stage 2 — Seed personas

- A (visible-eyeball) — Sonnet
- B (structural-diff) — Sonnet
- C (pipeline-forensics) — Sonnet
- D (code-path tracer) — Haiku — added because both proposals named specific code paths

## Stage 3 — Dispatch

Four parallel raters dispatched. Each receives the ground-truth pack from Stage One plus the proposal set.

## Stage 4 — Debate

Synthesised returns:

**Trusted diagnostics:**
- D1: cv2 fails to lift attributes for hero + trust-bar (triangulated A + B + C, evidence from leftover-buckets + extract.json)
- D2: pixel-diff per-section screenshots show WP chrome contamination ABOVE the hero on the live page (rater A screenshot evidence)

**Hypothesis proposals (must pass Stage Five):**
- P1 (G2): strip `.page-id-N` in `_collect_css_decls_for_element` will surface scoped CSS rules to cv2 — rater D challenges: "scoped rules are written to `theme/sgs-theme/styles/<client>.css`; cv2 reads from `_section_css` which is sourced from mockup inline `<style>` blocks, NOT from the generated variation CSS file. The strip targets a consumer that never receives the scope-prefixed input."
- P2 (G4): strip WP admin bar from screenshot will reduce per-section pixel-diff — rater A confirms chrome appears in the rendered viewport; rater D challenges: "`scripts/pixel-diff.py` uses Playwright `el.screenshot()` with a CSS selector — this clips to the element bounding box. Chrome above the selector is not in the captured pixels."

Both proposals **survive Stage Four** because the diagnostics are confirmed and the challenges are not yet quantitative. Both proceed to Stage Five.

## Stage 5 — Empirical validation (the gate that catches the no-ops)

### P1 (G2)

- Predicted: hero stage_3_slot_list failures drop from 142 to under 60; variation_css_rules climb from zero to at least eight
- Baseline command: run pipeline with G2 patch only; grep trace.jsonl + leftover-buckets.json
- Baseline result: hero failures still 142, variation_css_rules still zero
- Verdict: **FALSIFIED via baseline match-without-fix**

The smallest-pipeline-slice baseline measurement (which here happens to be a full pipeline run because cv2's input is assembled by the SGS clone runner that coordinates the flow) was run with the consumer-only patch applied. Numbers didn't move. Rater D's challenge was correct: the strip targets a consumer that never sees the input. **Returned to Stage Zero with the disproof:** the two-step fix needed — (Step One) the SGS clone runner merges variation CSS into `_section_css`; (Step Two) cv2 strips the scope prefix. Council reconvenes with the two-step proposal.

### P2 (G4)

- Predicted: trust-bar/1440 pixel-diff drops from 31.7 percent to under 15 percent
- Baseline command: `python scripts/pixel-diff.py --selector .sgs-trust-bar --viewport 1440x900 ...`
- Baseline result: same trust-bar/1440 baseline = 31.7 percent. Apply G4 chrome-strip patch. Re-measure: 31.7 percent (unchanged within noise).
- Verdict: **FALSIFIED via baseline match-after-fix**

The selector-cropped screenshot already excludes chrome above the element. Removing chrome from the DOM has no effect on the captured pixels. **Discarded.** Lesson captured: `pixel-diff per-section workflow does not inherit chrome contamination from full-page measurement`.

## Stage 6 — Experiment design (only for validated proposals)

Both Wave-1 proposals failed Stage Five. Nothing proceeds to Stage Six. Wave-1 reconvenes at Stage Zero with:
- The two-step G2 proposal (clone-runner CSS handoff + cv2 scope strip)
- A new diagnostic question for G4: "where does the real contamination live, if not in cropped screenshots?"

## Stage 7 — Implementation

No implementer subagents dispatched. Saved one wave of subagent work + zero commit-merge cycles + no false-positive merges to revert later.

## Stage 8 — Report

```
QC-Council Wave-1 — Report

Proposals in: 2
TRUSTED diagnostics: 2
HYPOTHESIS proposals: 2
Validated + shipped: 0
Falsified: 2 (both returned to Stage Zero with disproof)
Unverifiable: 0
Wave gate: FAILED — re-council before next wave

Saved one wave of subagent work + commit-merge cycles + a re-baselining
session by catching two no-op proposals pre-dispatch.

Falsified → an auto-memory lesson write invoked:
  - "Strip-the-consumer fixes need producer-side verification too"
    (pattern_key: producer-consumer-strip-fix-misses-handoff)
  - "Selector-cropped screenshots don't inherit full-page chrome
    contamination" (pattern_key: per-section-pixel-diff-excludes-chrome)
```

## What this run produced vs what 2026-05-21 actually did

| Outcome | Actual session (no qc-council) | With qc-council |
|---|---|---|
| Subagent dispatches | 4 (G2v1, G2v2, G4v1, G4v2) | 0 |
| Pipeline runs | 3 full + 4 measurement | 1 baseline per proposal (~5 min each) |
| Commit cycles | 0 (saved by safety clauses) | 0 |
| Operator time spent on diagnosis post-failure | ~45 min reading agent reports | 0 |
| Lessons captured | 1 (council-predictions-need-empirical-validation, a captured lesson) | Same — captured pre-empt rather than post-mortem |

The post-mortem lesson is the same lesson — but captured BEFORE the cost of the failed dispatches rather than after.
