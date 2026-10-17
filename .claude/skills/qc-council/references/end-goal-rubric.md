---
name: qc-council-end-goal-rubric
version: v2
target_skill: qc-council
target_skill_path: ~/.agents/skills/qc-council/SKILL.md
bean_signoff: confirmed
signoff_basis: "Bean's brief in 2026-05-21 session — explicit 8-stage spec + invoked-skills list + cross-referenced-by list + hard gates + references-to-load. The brief IS the rubric in everything but format."
created: 2026-05-21
last_updated: 2026-05-21
---

# /qc-council — End-Goal Rubric

## Primary purpose

A council protocol that catches the failure mode where a multi-rater diagnostic council ships fix-shape proposals straight into subagent implementation without validating that the proposed fix actually moves the metric the council claims is broken. Sits between research/diagnosis and implementation.

**Failure mode it exists to prevent:** 2026-05-21 Wave 1 dispatched G2 + G4 subagents off the back of council fix proposals. Both implemented exactly as prescribed. Both produced zero measurable movement. Council was correct about WHAT was broken; wrong about WHERE to fix it. The empirical-validation gate /qc-council enforces would have caught both no-ops before dispatch.

## End-state shape

After /qc-council runs on a fix-shape proposal set, the operator has:

1. A per-proposal verdict — `validated-shipped` / `validated-rejected` / `falsified` / `unverifiable`
2. For each `validated-shipped` proposal: an experiment-shaped step (hypothesis, baseline metric, fix shape with file:line, predicted post-fix metric, validation command, commit gate)
3. For each `falsified` proposal: the disproof captured for an auto-memory lesson write + a returned-to-Stage-0 question for the next council
4. A handoff to /spec-writer (write-up) + /phase-planner (sequencing) that carries the experiment frame all the way into implementer cold prompts

## Acceptance criteria (graded)

### A. Empirical-validation gate (HARD — fail = skill is broken)

- Stage 5 (empirical validation) is named, structured, and enforced as a HARD gate
- The gate REJECTS any fix-shape proposal that doesn't produce a predicted numeric outcome + baseline measurement command
- The gate REJECTS proposals where baseline measurement already matches the predicted post-fix value (= diagnosis wrong)
- The gate routes falsified proposals back to Stage 0 instead of forward to Stage 6

### B. Diagnostic-vs-fix-shape distinction (HARD — fail = skill misses the core point)

- Stage 4 (debate) explicitly separates triangulated diagnostic claims (TRUSTED) from triangulated fix-shape proposals (HYPOTHESIS)
- The skill body teaches operators to recognise the difference under pressure
- The Common Mistakes table includes "treating triangulated fix shape as a spec" as a named failure mode

### C. Persona seeding (HIGH)

- Stage 2 names 3-5 canonical personas (visible-eyeball, structural-diff, pipeline-forensics + optional code-path tracer + historical-context)
- Each persona has explicit fact-checking duty against ground-truth artifacts from Stage 1
- Persona-to-model mapping referenced via /delegate, never hardcoded

### D. Ground-truth pre-load (HIGH — per the `read-leftover-buckets-first` + `schema-enumeration-before-missing-x` rules)

- Stage 1 lists the canonical artifacts to read: leftover-buckets.json, extract.json, trace.jsonl, schema enumeration
- Stage 1 surfaces contradictions before raters propose anything
- The stage is gated — no rater dispatched if artifacts can't be loaded

### E. Experiment-shaped handoff (HIGH)

- Stage 6 produces a structured experiment-step format: hypothesis + baseline metric + measurement command + fix shape + predicted post-fix metric + validation command + commit gate
- Stage 7 implementer cold prompts MUST embed the commit gate ("do not commit if metric moves <X")
- Multi-wave plans get a between-wave validation gate, not just end-of-plan

### F. Ecosystem integration (HIGH)

- "Invoked Skills" section lists every downstream skill with concrete trigger conditions
- "When NOT to Use" names at least 3 sibling skills (qc, qc-inline, research-council, systematic-debugging)
- Cross-referenced-by note for Q2.d wire-up

### G. Skillscore + structure (MEDIUM — covered by skillscore gate)

- skillscore ≥ 80% (target 90%+)
- gap-analysis ≥ B
- Under 500 lines body
- One worked example
- Common Mistakes table with concrete fix→problem mapping

### H. Worked example (HIGH — defends against template-skill drift)

- `scripts/fixtures/example-council.json` shows a small end-to-end run with: input proposal set, persona outputs, Stage 5 baseline measurement, validated + falsified verdicts
- The example uses the actual 2026-05-21 Wave 1 (G2 + G4) as the canonical case study so future operators see the catch in context

## Anti-criteria (skill must NOT do these)

- Re-implement /qc or /qc-inline's full scenario/execution machinery — /qc-council layers on top, doesn't replace
- Hardcode model names — use /delegate everywhere
- Run silently without surfacing the validation gate to the operator
- Allow Stage 5 to be skipped on "I'm confident this fix will work" — the gate is unconditional
- Defer the empirical baseline measurement to the implementer — it MUST happen pre-dispatch

## Verification

Skill is verified by:
1. `python ~/.agents/skills/shared-references/sgs-skillscore.py validate ~/.agents/skills/qc-council/SKILL.md` returns ≥ 80
2. `/gap-analysis` on the skill returns grade B or higher
3. Running the fixture example-council.json through Stages 0-8 demonstrably catches the planted no-op (G4 in the fixture)
4. Cross-references in /qc, /qc-inline, /research-council, /strategic-plan, /phase-planner, /systematic-debugging, /brainstorming, /dispatching-parallel-agents added in Q2.d wire-up
