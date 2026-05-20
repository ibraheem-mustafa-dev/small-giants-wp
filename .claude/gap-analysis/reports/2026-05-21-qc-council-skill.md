# Gap Analysis: /qc-council skill

**Target:** `~/.agents/skills/qc-council/SKILL.md` (plus references/, hooks/, scripts/fixtures/)
**Type:** skill
**Date:** 2026-05-21
**Skillscore:** 92% (A-)
**Overall Grade: B (4.2/5)** — solid first draft with novel empirical-validation gate, but missing three patterns documented in 2026-04-18 deep-qc-skill research that the literature calls high-leverage.

## Strongest criterion
**Example quality — 4.7** (uses the actual 2026-05-21 Wave-1 G2+G4 incident — the failure the skill exists to prevent — as the canonical worked example).

## Weakest criterion
**Robustness — 3.2** (no hard iteration cap on the Stage-5→Stage-0 falsify-then-reconvene loop; no Stage-4 certainty_calc HOLD verdict for weak rater agreement; missing cross-model exclusion at dispatch).

## All gaps (graded by opportunity value)

| # | Gap | Criterion | Grade | Fix time | Expected uplift |
|---|-----|-----------|-------|----------|-----------------|
| 1 | **Cross-model enforcement absent at Stage 3 dispatch.** Stage 3 says "subject to /delegate's decision" but does not say "/delegate must exclude the generator model from rater selection". The 2026-04-18 deep-qc-skill research (15 sources, high-confidence) calls this "the single biggest quality lever per literature" because same-model self-critique is the most-cited failure mode in reflection frameworks. | completeness + robustness | **A** | 10 min | +0.5 completeness, +0.4 robustness |
| 2 | **No structural-pre-gates layer before LLM raters fire.** Stage 1 loads ground-truth artefacts, then Stage 2 seeds personas. Missing intermediate layer: deterministic schema validators, linters, hook validators that catch 60-80% of issues for free (CRITIC paper finding). Skipping cheap structural checks before paying for rater dispatch wastes tokens and slows feedback. | completeness | **A** | 20 min | +0.5 completeness |
| 3 | **No hard iteration cap on the falsify-then-reconvene loop.** Stage 8 routes `falsified` proposals back to Stage 0. No max-round count. If diagnostics are persistently wrong, the council could loop indefinitely. Research recommends max 2 fix-review rounds then escalate to operator. | robustness | **A** | 5 min | +0.4 robustness |
| 4 | **No certainty_calc wiring at Stage 4 debate.** `/qc` and `/qc-inline` both run `certainty_calc.score(responses)` to detect rater dissent and HOLD on certainty < 50. /qc-council's Stage 4 synthesis doesn't. Without it, a 3-rater council that splits 2-1 on a fix-shape proposal proceeds as if triangulated. Sibling skills already implement this — direct backport. | robustness | **A** | 15 min | +0.5 robustness; aligns with /qc + /qc-inline |
| 5 | **Complexity-threshold "When NOT to Use" entry is informal.** "Single fix, single file, clear diagnosis → just do it" exists but no concrete size threshold. Snorkel paradox: reflection hurts easy tasks. Add hard threshold (~30 lines / 1KB / ≤2 proposals — pick one). | routing accuracy | **B** | 5 min | +0.2 routing accuracy |
| 6 | **Body 308 lines vs 300-line budget.** Skillscore advisory. Move Stage-3 cold-prompt frame detail into references/canonical-personas.md (already exists — just trim the duplication). | clarity | **C** | 10 min | -8 lines, cleaner separation |
| 7 | **Magic numbers in stage text (5 lines flagged by skillscore).** Persona count "3-5", model multipliers "1.5x", certainty thresholds — explain inline or move to a constants block in references/. | clarity / hygiene | **D** | 10 min | skillscore +1-2pp |
| 8 | **No persona-divergence escalation rule.** Stage 4 says "drop unjustified proposals" but doesn't define what to do when two raters genuinely disagree on a TRUSTED diagnostic (not a fix-shape). Currently the synthesis would just pick one. Should escalate to Bean. | robustness | **C** | 15 min | +0.3 robustness |

## Opportunities (what this could become — S-grade screening)

### Opportunity 1 — Cross-model exclusion as enforced default (S-grade candidate)
**What it could become:** /qc-council becomes the first skill in the Bean ecosystem that enforces cross-model rater diversity at the dispatch layer — every Stage-3 rater call passes `exclude_models: [generator_model]` to /delegate. The current generator's model is read from the session context (CLAUDE_MODEL env or session metadata) and automatically excluded.
**Connects to:** /qc, /qc-inline (same backport applies), /research-council, /strategic-plan Phase-3 risk assessment, any future skill that dispatches reviewers.
**Non-obvious:** Yes — the cross-model rule is documented in academic literature (CRITIC, Reflexion follow-up papers, Snorkel) but is not standard practice in Claude-Code skills.
**Research finding:** deep-qc-skill 2026-04-18 — "single biggest quality lever per literature" — 15 sources.
**S-grade criteria hit:** USP (no other Bean skill enforces this), competitive moat (literature-backed practice nobody else automates), cross-system value (applies to every multi-rater skill).
**Showpiece potential:** Medium — directly demonstrable and citable.

### Opportunity 2 — Structural pre-gates as Stage 1.5
**What it could become:** Before any rater is dispatched, run cheap deterministic checks against the proposal set: schema validators (does the file:line referenced in fix_shape actually exist?), linter dry-runs (would the proposed change parse?), hook validators (does the predicted_post_fix metric have a measurement command that exists?). Proposals failing structural pre-gates never reach the rater layer — saves tokens, surfaces failures faster.
**Connects to:** /sgs-clone pipeline (already runs structural gates between stages), /qc (Stage-0 detect could share machinery), any skill that runs LLM checks on inputs.
**Non-obvious:** Yes — CRITIC paper finding that 60-80% of issues caught by structural gates means the LLM layer is overpaying for the easy cases.
**Research finding:** deep-qc-skill 2026-04-18 — structural-first ordering as primary recommendation.
**Showpiece potential:** Low — invisible cost-saver.

### Opportunity 3 — Auto-falsify-loop circuit-breaker with operator handoff
**What it could become:** Stage 8 routes falsified proposals back to Stage 0 up to twice; on the third reconvening, the skill stops auto-looping and surfaces to Bean: "two waves of council have failed to ship a validated fix. Either the diagnostic itself is wrong, or there's a deeper structural issue. Want me to escalate to /research-council before another wave?" Prevents the loop-of-doom failure mode where an agent chases tail-end disagreements.
**Connects to:** /research-council (escalation target), /strategic-plan (decision point when council can't converge), ADHD overwhelm prevention (Bean gets surfaced before the loop sprawls).
**Non-obvious:** Yes — most agent loops don't have hard caps; the operator-handoff threshold is a designed feature.
**Research finding:** deep-qc-skill 2026-04-18 recommends hard iteration cap.
**Showpiece potential:** Low — quiet but valuable.

## S-grade verdict
**Candidate: YES**
- Functional: USP ✓ (cross-model enforcement), innovative ✓ (ties /delegate + /dispatching-parallel-agents + structural gates + empirical gate into one skill), cross-system ✓ (applies to any multi-fix flow)
- Impact: competitive moat ✓ (literature-backed), revenue/time multiplier ✓ (saves wave-of-subagent cycles per use)
- Showpiece: medium ("honest path council" framing is publicly demonstrable)
- Hits 5 of 6 S-grade criteria

**Pending Bean's confirmation.** If Bean accepts, /qc-council becomes the first ecosystem skill to formalise cross-model rater diversity + empirical-validation-before-dispatch as enforced patterns rather than convention.

## 6-Lens System Effect — all passed
- **End-result:** PASS — validated fix-shape proposals shipped to /spec-writer + /phase-planner; eliminates no-op subagent dispatch cycles
- **OC↔CC connectivity:** PASS — inline + pipeline modes; JSON handoff format consumable by both systems
- **blub.db persistence:** PASS — Stage 8 → /capture-lesson on falsified proposals; future councils auto-surface via Stage 1 ground-truth load
- **Automation vs human-remember:** PASS — every gate enforced inline (HARD GATEs in code/text); not "operator remembers"
- **ADHD overwhelm:** PASS — net cognitive load DOWN (catches no-ops pre-dispatch instead of post-mortem)
- **Values alignment:** PASS — `references/end-goal-rubric.md` exists with `bean_signoff: confirmed` (signed-off via Bean's brief)

No veto triggered. No grade cap applied.

## Persona scores
- **Bean (the SGS operator):** 4.1 (B) — gate-firing reliability and ADHD-overwhelm reduction weighted 1.5×
- **Technical reviewer:** 3.9 (B) — completeness vs literature weighted heavier; flagged cross-model enforcement gap

Persona divergence: 0.2 — below flag threshold.

## Recommendations (priority order)

1. **Add cross-model enforcement to Stage 3** — single line: "/delegate is called with `exclude_models: [<generator_model>]` so no rater shares the model that produced the proposal set". 10 min. Closes Gap 1.
2. **Wire certainty_calc at Stage 4** — backport from /qc-inline. 15 min. Closes Gap 4.
3. **Add Stage 1.5 structural pre-gates** — new sub-stage that runs file:line existence checks + linter dry-runs on every fix_shape before dispatching raters. 20 min. Closes Gap 2.
4. **Add hard iteration cap (max 2 reconvene rounds) at Stage 8** — escalate to Bean on round 3. 5 min. Closes Gaps 3 + 8 (similar shape).
5. **Tighten "When NOT to Use" with concrete complexity threshold** — "≤ 2 proposals OR < 1 KB body OR single-file fix → just do it". 5 min. Closes Gap 5.
6. **Trim Stage-3 cold-prompt detail into references/** — duplication with canonical-personas.md. 10 min. Closes Gap 6.
7. **Annotate magic numbers** — convert "1.5×" / "3-5 personas" / etc. to named-constants block. 10 min. Closes Gap 7.

**Bulk-fix path:** all seven recommendations in ~75 min total. Bean's default per /lifecycle Mode A is fill-all-gaps. Recommend bulk-fix before declaring /qc-council ready for cross-reference wiring (Q2.d).

## Verification cadence (not recommendations)
- Re-grade after bulk fixes land (target: B+ → A-, 4.5+)
- Smoke-test the example-council.json fixture once Stage 1.5 + Stage 4 certainty wiring lands
- Add an integration test that dispatches an actual 3-rater council with a planted no-op and asserts it gets caught

## QC peer-review status
**Limitation:** Per Bean's "no Agent delegation" directive for this session, the formal 3-rater /qc panel (1×Gemini Flash + 2×Sonnet) was NOT dispatched. This evaluation includes a single-rater self-critique (run inline against the actual SKILL.md content, ground-truth-loaded research, and skillscore output). Findings are likely conservative — a full panel would probably surface 1-2 additional gaps around prompt-injection resistance and pipeline-mode artifact schema.

`qc_review.reviewers: ["inline-self-critique"]`, `qc_review.certainty: not_calculated_single_rater`, `qc_review.bean_response: pending`.

## Topics
`council-empirical-validation`, `cross-model-enforcement`, `structural-pre-gates`, `hypothesis-driven-dispatch`, `qc-council`, `lifecycle-quality-gate`, `falsification-loop-cap`
