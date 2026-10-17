---
target_type: pipeline
target_path: ~/.agents/skills/qc/SKILL.md
last_reviewed: 2026-04-27
bean_signoff: confirmed
domain: quality-control
---

# End-Goal Rubric — /qc

> **Scope note:** /qc is global. It QCs any artefact type — UI/code, written reports, gap-analysis outputs, plans, research, design specs, etc. The rubric describes end-results regardless of target type; scenarios and domain-mandatory checks adapt per target.

## End-Goal Criteria

| # | Criterion | Weight | 5/5 (end-result) | 1/5 (end-result) |
|---|-----------|--------|-------------------|-------------------|
| 1 | **real_context_verification** | 1.5 | QC verdicts reflect what would happen when the artefact is used in its real context — UI run in a browser like a user would, reports read by their target audience, plans walked through by the executing team, research consumed by a decision-maker. When data dependencies exist, test/placeholder data is created and the system run end-to-end with it — never skipped because "data isn't available". | Verdicts reflect verification against simplified contexts that don't match real usage — UI tested only against dev server with synthetic state, reports graded for grammar but not for whether the audience can act on them, plans validated for syntax but not feasibility, mocks left in place where real-flow execution was needed. |
| 2 | **goal_gate_discipline** | 1.3 | QC always knows what success means before grading. When the goal isn't documented, the pipeline halts and asks — never invents one. Verdicts are anchored to the artefact's actual stated purpose. | QC infers a goal from implementation, drifts toward easy wins; pipeline produces verdicts that grade the wrong thing; "looks correct" replaces "achieves the stated end-goal". |
| 3 | **smell_gated_deeper_look** | 1.2 | When surface tests pass but signs of a deeper issue exist, QC fires the appropriate deeper-look mode — code review for code, source cross-reference for reports, edge-case stress-test for plans, citation verification for research. Effort allocated where surface-level tests are insufficient. | Deeper-look fires whenever (including on clearly-failing tests where it's redundant) or never (missing real issues that surface tests didn't catch); effort wasted or gaps left unexamined. |
| 4 | **root_cause_investigation_capable** | 1.0 | When an issue feels deep-seated (recurrence, cross-target pattern, downstream effect that doesn't match its surface symptom), QC can opt into a root-cause investigation mode — traces the issue back to its origin rather than reporting only the symptom. The agent can request this mode explicitly OR /qc surfaces the option when patterns warrant it. | Issues reported only at surface level; recurring problems flagged repeatedly without ever digging into why; root causes left unexamined because "that's beyond QC's scope". |
| 5 | **evidence_per_verdict** | 1.2 | Every verdict can be re-derived by another session reading the artefacts. Pass/fail decisions reproducible because evidence (stdout excerpts, screenshots, JSON diffs, source quotes) is captured per scenario. | Verdicts state "pass" without evidence; another session can't verify without re-running QC; trust requires re-execution rather than reading the report. |
| 6 | **target_type_appropriate_scenarios** | 1.2 | QC catches issues across the full failure-mode space appropriate to the target type — UI: golden/edge/failure/a11y; reports: factual accuracy/internal consistency/completeness/argument validity; plans: feasibility/dependency-correctness/scope/risk-coverage; research: source quality/citation accuracy/conclusion validity. The scenario plan deliberately covers each category. | Generic scenarios used regardless of target type — running a11y checks on a written report, or factual accuracy on a CSS file. False confidence from grading the wrong dimensions. |
| 7 | **confidence_grade_agreement** | 1.0 | Verdicts internally consistent — grade and confidence score agree per the mapping; recommendations follow grades. Reports don't contradict themselves. | Grade says "pass" while confidence is 68; recommendation contradicts grade; mapping applied inconsistently across runs. |
| 8 | **domain_mandatory_checks** | 1.0 | Domain-required checks fire — a11y on UI; fact-checking with citation verification on reports/research; internal consistency on plans; ADHD-friendliness on Bean-facing artefacts. The skill knows which domain-required checks apply per target type and runs them. | Domain-mandatory checks skipped because they're "out of scope"; UI ships with hidden a11y violations; reports ship with unverified citations; plans pass QC despite unfeasible dependencies. |
| 9 | **downstream_consumable_findings** | 1.3 | Final report is plain-English, ADHD-friendly, jargon-free (no unnecessary technical acronyms or terms). Every finding has enough context, evidence, and recommended next-action that the downstream agent receiving it can act without further investigation — saving extra round-trips and tokens. | Reports are dense, jargon-heavy, structured for technical reviewers only; downstream agents have to re-investigate to figure out what each finding means and what to do; multiple round-trips between agents to clarify. |
| 10 | **stage_artifact_integrity** | 1.0 | Pipeline state canonical and traceable across runs — every stage's JSON has all required fields, run_id consistency preserved, validators pass between stages. A run can be replayed from its artefacts. | Stage artefacts have missing fields or inconsistent run_ids; pipeline state corrupted but advances anyway; runs can't be replayed because the trail is broken. |
| 11 | **kill_gate_honesty** | 1.0 | When a kill-gate condition fires, the pipeline stops cleanly and Bean knows exactly why — partial-report.md shows completed stages and the failure point. No masking of fundamental problems. | Kill gates fire but the pipeline continues; HALT.json written but next stage executes anyway; or pipeline invents a goal to dodge Stage 1's gate. Fundamental problems get masked. |

## Never Do (runtime / output anti-patterns)

- Skip end-to-end execution because "data isn't available" — create test/placeholder data and run with it
- Run deeper-look mode (Stage 5 code review or equivalent) when surface tests clearly fail — that mode is for "green tests, something smells", not for debugging broken tests
- Mock dependencies during scenario execution unless the scenario explicitly tests mock behaviour — real-context verification is the bar
- Proceed past goal-gate without a documented goal — invent nothing; ask the user
- Deliver a verdict without verbatim evidence attached
- Let `grade` and `recommendation` disagree — recalculate grade from confidence score range if conflict
- Skip domain-mandatory checks (a11y on UI, fact-check on research, etc.)
- Advance past a validator failure — write partial-report.md and stop; don't retry without fixing the root cause
- Emit a final report without a clear ship/fix/hold recommendation and a prioritised next-actions list
- Use technical jargon or unnecessary acronyms in findings — plain English, ADHD-friendly, downstream-readable

## Lens 6 Anchors

The /qc pipeline's value compounds across builds — a single run has marginal utility; a pattern of runs catching the same failure class builds institutional confidence. A recurring failure class (3+ runs) should be captured once — as a project-specific Claude Code auto-memory lesson, or folded into this skill's own Common Mistakes table if it's about how /qc itself works — so cross-run pattern detection works, not just produces one-off reports. A pipeline that produces correct verdicts in isolation but leaves no queryable trace is underperforming its end goal.
