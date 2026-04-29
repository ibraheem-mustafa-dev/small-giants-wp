---
doc_type: phase-plan
phase: phase-1-foundations
project: small-giants-wp
project_id: 14
parent_plan: .claude/plans/master-plan.md
spec_source: .claude/specs/2026-04-27-optimisation-toolkit-design.md
generated_by: /phase-planner
last_updated: 2026-04-29
---

# Phase 1 — Foundations

**USP:** Foundations gates everything. Ship 4 working toolkit utilities + 8 utility-aware lifecycle skills, and every later phase (Phase 2's 22 rubric optimisations, Phase 3's three-lens gap analysis, Phase 4's tooling rebuild) inherits canary-validated improvements automatically. Skip this and every downstream optimisation is unmeasured.

**Plan label:** `[PLAN: sonnet]` — well-scoped, mechanical-shaped (4 utilities + 8 skill edits following published spec). Opus-level reasoning only needed at the end-to-end demo (Step 14) and any KJC fork.

**Docscore:** B+ (self-graded; see §Self-grade at end)

**Aggregate cost estimate:** ~$3-6 across 14 dispatchable steps. Inline Opus reasoning ~$2 (steps 1, 13, 14, gates). Sonnet skill edits via subagent dispatch ~$1.50 (8 × ~$0.18). Cross-tier QC peer reviews via Gemini Flash ~$0 (free tier). Smoke-test runs ~$0 (local Python).

**Phase success criteria (done when):**
- [ ] All 4 utility modules exist at `~/.agents/skills/shared-references/optimisation-toolkit/` with passing smoke tests (exit 0)
- [ ] All 8 lifecycle/quality/QC skills updated per spec §5 Phase 1b table (rubric-gen wired into writers; certainty_calc wired into /qc + /qc-inline; Lens 6 always-on in /gap-analysis)
- [ ] Cross-tier QC peer-review evidence captured for each of the 8 skill updates — fresh Gemini Flash session reads the updated SKILL.md and confirms intent + identifies any drift (NOT self-apply — 2026-04-28 lesson R1)
- [ ] One end-to-end demo passes: `/skill-optimiser` runs on a real skill (suggested: `/humanize`), uses canary_split + few_shot_injector, produces a `delta >= 0.05` improvement, gate passes
- [ ] G1 milestone POSTed to `/api/knowledge` per master plan §11.5

**Entry context (read before starting):**
- `.claude/plans/master-plan.md` §7 Phase 1 + §11 G1 + §12.5 + §13 — sequencing, gate criteria, deletion-before-reference rule, phase handoff hint
- `C:/Users/Bean/.openclaw/.claude/subprojects/ssb/specs/2026-04-27-optimisation-toolkit-design.md` §4 (utilities) + §5 Phase 1 — design source of truth (the .claude/specs/ file is a pointer to this canonical location)
- `~/.agents/skills/shared-references/correction-ledger.md` — past mistakes
- `~/.agents/skills/shared-references/model-routing.md` — canonical routing
- `~/.claude/skills/skill-optimiser/SKILL.md` + `~/.claude/skills/qc/SKILL.md` — sample current state of the 8 skills being updated (read 2 to calibrate edit scope before all 8)

**References:**
- Master plan §7 — unit map (P1.1a + P1.1b)
- Master plan §11.5 — phase exit POST format
- Spec §4 — utility specs (canary_split, dspy_signature, certainty_calc, few_shot_injector)
- Spec §5 Phase 1b table — exact change per skill
- Master plan §10 R1 — cross-tier QC mandate
- Master plan §12.5 — deletion-before-reference rule (no Phase 1 dependencies on deleted skills; clear)
- 2026-04-28 lesson "self-apply broke live site" — drives mandatory cross-tier QC

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | /lifecycle | steps 6-13 (gates skill edits) |
| skill | /delegate | implicit (assigned inline; surface if any step diverges from cost estimate) |
| skill | /gap-analysis | step 14b (G1 self-check) |
| skill | /verify-loop | step 14a (build target); step 14b (self-demo) |
| dispatch | Sonnet subagent | steps 6, 8, 10, 11, 13 (skill edits) |
| dispatch | Gemini Flash | steps 7, 9, 12 (cross-tier QC peer review) |
| cli | python (3.13+) | steps 2, 3, 4 (utility build + smoke tests) |
| cli | sqlite3 | step 4 (few_shot_injector reads blub.db) |
| cli | curl | step 15 (POST G1 telemetry) |
| db | blub.db corrections + knowledge tables | step 4 (few_shot_injector embeddings) |
| db | blub.db /api/knowledge endpoint | step 15 (telemetry POST) |

---

## Steps

### Step 1 — Scaffold toolkit dir + canary_split.py [SESSION-START, smallest first action]

```
Step 1 — Scaffold + build canary_split.py
  Model:       inline (mechanical scaffold + reasoning about gate threshold)
  Action:      mkdir -p ~/.agents/skills/shared-references/optimisation-toolkit/tests
               Write canary_split.py with API: split(fixtures, holdout=0.2, seed=42) -> (train, holdout)
               + score(skill_run_fn, holdout, before, after) -> {before_score, after_score, delta, pass: bool}
               Gate: pass=True iff delta >= 0.05.
  Files:       ~/.agents/skills/shared-references/optimisation-toolkit/canary_split.py
               ~/.agents/skills/shared-references/optimisation-toolkit/tests/smoke_canary_split.py
               ~/.agents/skills/shared-references/optimisation-toolkit/__init__.py
  Inputs:      Spec §4.1 row 1 (canary_split spec)
  Outcome:     `python -c "from optimisation_toolkit.canary_split import split, score; print('ok')"` exits 0
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        25 min (≤5 min for scaffold; 20 min for the module + smoke test logic)
  Tooling:     python, Edit, Write
  On-Fail:     If Python import fails, check __init__.py is empty + sys.path. Revert by deleting the dir; no live consumers yet.
  Cold-Entry:  This phase plan + spec §4.1 row 1 + spec §4.4 smoke-test convention. No prior session state needed.
  Test:
    Happy:       splitfixturesseed42, holdout=0.2 over 100 fixtures returns 80/20 split deterministically
    Edge:        ≤5 fixtures triggers a clear error (insufficient sample); empty list raises ValueError
    Fail:        score() called with mismatched skill_run_fn signature raises TypeError with field name
    Integration: standalone (no consumer wiring yet)
```

### Step 2 — QA Gate: canary smoke test

```
QA Gate — canary_split.py smoke passes
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Step 1 complete
  Check:   python ~/.agents/skills/shared-references/optimisation-toolkit/tests/smoke_canary_split.py; echo $?
  Pass:    exit code 0; runs in <10s; assertions pass on known-good and fail on known-bad input
  Fail:    Read traceback; fix until exit 0. If structurally wrong (e.g. holdout overlap with train), revert Step 1 and rebuild.
  Marker:  QA
```

### Step 3 — Build dspy_signature, certainty_calc, few_shot_injector (PARALLEL)

```
Step 3 — Build remaining 3 utilities in parallel
  Model:       sonnet (3 parallel cold dispatches via subagent-driven-development; each is a self-contained Python module + smoke test)
  Action:      Spawn 3 Sonnet subagents simultaneously, one per utility. Each writes the module + smoke test per spec §4.1 + §4.4.
  Files:       ~/.agents/skills/shared-references/optimisation-toolkit/dspy_signature.py + tests/smoke_dspy_signature.py
               ~/.agents/skills/shared-references/optimisation-toolkit/certainty_calc.py + tests/smoke_certainty_calc.py
               ~/.agents/skills/shared-references/optimisation-toolkit/few_shot_injector.py + tests/smoke_few_shot_injector.py
  Inputs:      Spec §4.1 rows 2, 3, 4. canary_split.py from Step 1 available for import (only certainty_calc *might* import; dspy + few_shot do not depend on it).
  Outcome:     All 3 modules importable; all 3 smoke tests exit 0 in <10s with no network calls
  Exec:        PARALLEL with each other (no shared files)
  Deps:        Step 2 complete (canary_split landed and tested first per spec §4.3)
  Marker:      (none)
  Time:        20 min wall-time (3 parallel × ~20 min each in cold subagents)
  Tooling:     /subagent-driven-development, Sonnet × 3
  On-Fail:     If 1 of 3 fails: re-dispatch that one only with the failure log. If 2+ fail: pause and inspect — likely a shared spec ambiguity (escalate to Bean before re-dispatch).

  Prompt (per dispatched subagent — 3 variants, one per utility):
    """
    Cold-task. Read these files and produce ONLY the outputs specified — no exploration, no extras:

    1. C:/Users/Bean/Projects/small-giants-wp/.claude/plans/phase-1-foundations.md (this plan, §Step 3 + §Tooling Index)
    2. C:/Users/Bean/.openclaw/.claude/subprojects/ssb/specs/2026-04-27-optimisation-toolkit-design.md §4.1 row [N] + §4.4

    Build:
    - ~/.agents/skills/shared-references/optimisation-toolkit/[UTILITY].py implementing the API in row [N]
    - tests/smoke_[UTILITY].py per §4.4 (runs <10s, no network, asserts pass on known-good + fail on known-bad)

    Constraints:
    - Pure Python 3.13 stdlib + (only if §4.1 demands it) dspy / sqlite3 / numpy
    - Module is importable as `from optimisation_toolkit.[UTILITY] import ...`
    - few_shot_injector ONLY: connect read-only to ~/.openclaw/workspace/data/blub.db; query corrections + knowledge tables; use existing embeddings table (do not create columns)
    - certainty_calc: input is list[str] of 5 model responses; output dict {certainty: 0-100, dominant_answer: str, dissenting_count: int}; certainty algorithm = pairwise normalised-edit-distance agreement, weighted
    - dspy_signature: wrap any prompt in DSPy ChainOfThought; first-run uses MIPROv2 to search instruction+demos on canary held-out set; returns optimised prompt iff delta >= 0.05 else returns original

    Outputs to me (single response):
    - Full path of each file written
    - Output of `python tests/smoke_[UTILITY].py; echo $?`

    Stop when smoke test exits 0. Do NOT wire into any consumer skill.
    """
  Test:
    Happy:       smoke test exits 0
    Edge:        certainty_calc with all-identical responses returns certainty=100; few_shot_injector with empty blub.db returns []
    Fail:        dspy_signature with malformed signature raises clear DSPy-level error (caught + logged, not silent)
    Integration: standalone (consumer wiring is Phase 1b, not 1a)
```

### Step 4 — QA Gate: all 3 smoke tests pass

```
QA Gate — All Phase 1a utilities ready
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Step 3 complete (all 3 parallel branches landed)
  Check:   for u in canary_split dspy_signature certainty_calc few_shot_injector; do python ~/.agents/skills/shared-references/optimisation-toolkit/tests/smoke_$u.py || echo "FAIL: $u"; done
  Pass:    All 4 smoke tests exit 0; no "FAIL" lines printed; total runtime <40s
  Fail:    Re-dispatch the failing utility's subagent with the smoke-test log attached. Do NOT proceed to Phase 1b until all 4 green.
  Marker:  QA — gates Phase 1b
```

### Step 5 — [HANDOFF] Optional session break

```
HANDOFF — Phase 1a complete; Phase 1b is its own session
  Action:      Commit utilities. `cd small-giants-wp && git add -A && git -c commit.gpgsign=false commit -m "feat(toolkit): ship 4 optimisation utilities (Phase 1a)"`. Push.
               Update .claude/state.md current_phase to phase-1-foundations-1b. Run /handoff to generate next-session-prompt.md.
  Marker:      HANDOFF
  Time:        5 min
  Cold-Entry:  This plan §Step 6 onward + .claude/handoff.md.
```

### Step 6 — Update /skill-writer + /pipeline-writer + /command-writer (PARALLEL via /lifecycle)

```
Step 6 — Add rubric-generation to the 3 writer skills
  Model:       sonnet × 3 parallel (each skill edit follows the same template — different SKILL.md, no shared files)
  Action:      For each: open via /lifecycle (write mode); add rubric-generation sub-stage (writers: at Stage 2; pipeline-writer: Stage 1; command-writer: pre-command-body); add HARD GATE on Bean sign-off; for command-writer, output rubric to a `.rubrics/` adjacent dir.
  Files:       ~/.claude/skills/skill-writer/SKILL.md
               ~/.claude/skills/pipeline-writer/SKILL.md
               ~/.claude/skills/command-writer/SKILL.md
  Inputs:      Spec §5 Phase 1b table rows 1-3
  Outcome:     Each SKILL.md has a clearly-marked "Rubric generation" sub-stage + a HARD GATE block requiring Bean sign-off before continuing
  Exec:        PARALLEL with each other
  Deps:        Step 4 (utilities exist; writers will reference them)
  Marker:      (none)
  Time:        25 min wall-time (3 parallel × ~25 min each, mostly cold context loading + targeted edit)
  Tooling:     /lifecycle, Sonnet × 3, Edit
  On-Fail:     If a HARD GATE check rejects an edit: it usually means /lifecycle's pipeline-stage-gate.py demands the rubric draft before edits. Run /lifecycle in pipeline-start mode first.

  Prompt (per dispatched subagent — 3 variants):
    """
    Cold-task. /lifecycle SKILL EDIT mode. Goal: add rubric-generation to /[SKILL] per spec §5 Phase 1b row [N].

    Read in order:
    1. C:/Users/Bean/Projects/small-giants-wp/.claude/plans/phase-1-foundations.md §Step 6
    2. C:/Users/Bean/.openclaw/.claude/subprojects/ssb/specs/2026-04-27-optimisation-toolkit-design.md §5 Phase 1b row [N]
    3. ~/.claude/skills/[SKILL]/SKILL.md (current state)

    Edit ~/.claude/skills/[SKILL]/SKILL.md:
    - Insert a new sub-stage at the position named in spec row [N] ("Stage 2" for skill-writer, "Stage 1" for pipeline-writer, "pre-command-body" for command-writer)
    - Sub-stage is named "Rubric generation" — drafts an end-goal rubric the skill being authored will be measured against
    - For command-writer ONLY: write rubric to .rubrics/ adjacent dir
    - Add a HARD GATE block immediately after the rubric-generation sub-stage: requires Bean sign-off before continuing to the rest of the skill body

    Constraints:
    - DO NOT change other stages' wording
    - DO NOT add tools to the skill's frontmatter unless strictly required
    - Preserve existing references and correction-ledger consults

    Output: full path of file edited + a unified diff of the change.
    """
  Test:
    Happy:       Each updated SKILL.md grep matches `(?s)Rubric generation.*HARD GATE.*Bean sign-off`
    Edge:        Pre-existing HARD GATEs in the skill remain intact (re-grep originals before/after)
    Fail:        /lifecycle pipeline-stage-gate.py rejects → rerun in pipeline-start mode
    Integration: Manual: invoke /skill-writer on a throwaway test skill; confirm it pauses at rubric-gen for sign-off
```

### Step 7 — Cross-tier QC peer review of writers (Gemini Flash)

```
Step 7 — Cross-tier QC: 3 writer skill updates
  Model:       gemini-flash (cross-tier; NOT Sonnet — explicitly avoid self-apply per R1 + 2026-04-28 lesson)
  Action:      Dispatch Gemini Flash on each updated SKILL.md. Ask: "(1) Does this skill now generate a rubric before producing the artifact body? (2) Where exactly does the HARD GATE land? (3) Any drift from prior stages or contradictions with frontmatter? (4) Anything that would confuse a cold executor?"
  Files:       reads ~/.claude/skills/{skill,pipeline,command}-writer/SKILL.md (no writes)
               writes .claude/reports/phase-1-cross-tier-qc/<run_id>/{skill-writer,pipeline-writer,command-writer}.md
  Inputs:      Step 6 output diffs
  Outcome:     3 markdown reports — one per skill — each capturing answers to the 4 questions
  Exec:        PARALLEL × 3
  Deps:        Step 6 complete
  Marker:      (none)
  Time:        10 min wall-time (parallel; Gemini Flash is fast)
  Tooling:     /gemini-flash, Write
  On-Fail:     If Gemini Flash says drift/contradiction exists: STOP. Surface to Bean. Do not patch silently. Capture pattern in .claude/mistakes.md.

  Prompt (per dispatch):
    """
    Cold review. Read ~/.claude/skills/[SKILL]/SKILL.md. Answer in markdown:

    1. Does this skill generate an end-goal rubric BEFORE producing the artifact body? Quote the section.
    2. Where exactly does the HARD GATE land? Quote it.
    3. Drift / contradictions: any place where rubric-gen contradicts an earlier stage, the frontmatter, or the references? List each.
    4. Cold-executor confusion: would a fresh agent know whether to skip rubric-gen if the skill being authored already has one? List ambiguities.

    Constraint: be specific — quote line numbers / headings. No general "looks good" answers.
    """
  Test:
    Happy:       3 reports written; each has answers to all 4 questions
    Edge:        Gemini rate limit → retry with 30s back-off
    Fail:        Reports surface drift → escalate to Bean before Step 8
    Integration: Captured to .claude/reports/ for G1 evidence packet
```

### Step 8 — Update /skill-optimiser + /pipeline-optimiser (PARALLEL)

```
Step 8 — Wire rubric-aware Stage 1 into both optimisers
  Model:       sonnet × 2 parallel
  Action:      Stage 1 reads existing rubric file or generates inline; uses it as gap-finding instruction set in Stage 2.
  Files:       ~/.claude/skills/skill-optimiser/SKILL.md
               ~/.claude/skills/pipeline-optimiser/SKILL.md
  Inputs:      Spec §5 Phase 1b table rows 4-5; Step 7 cross-tier QC reports (apply learnings)
  Outcome:     Both optimisers' Stage 1 explicitly reads OR generates a rubric; Stage 2 uses it as Lens 6 input.
  Exec:        PARALLEL with each other
  Deps:        Step 7 complete (writer-pattern validated; same template applies here)
  Time:        20 min wall-time
  Tooling:     /lifecycle, Sonnet × 2
  On-Fail:     Same as Step 6.

  Prompt: As Step 6 prompt, but the change is: "Stage 1 reads existing <skill>/references/end-goal-rubric.md if present; otherwise generates one inline using the same logic /skill-writer's rubric-gen sub-stage uses; the rubric becomes Lens 6 of the gap-finding pass in Stage 2."
  Test:
    Happy:       grep `(?s)Stage 1.*rubric.*Lens 6` matches in both files
    Edge:        Skill being optimised has no rubric AND has no spec hints → optimiser must produce a fallback rubric, not crash
    Fail:        Cross-tier QC at Step 9 catches drift
    Integration: Demonstrated end-to-end at Step 14
```

### Step 9 — Cross-tier QC peer review of optimisers

```
Step 9 — Cross-tier QC: 2 optimiser skill updates
  Model:       gemini-flash × 2 parallel
  Action:      Same pattern as Step 7. Reports go to .claude/reports/phase-1-cross-tier-qc/<run_id>/{skill,pipeline}-optimiser.md
  Outcome:     2 markdown reports
  Time:        7 min
  Tooling:     /gemini-flash
  On-Fail:     Same as Step 7. (Prompt template identical to Step 7.)
  Test:        Happy: 2 reports written. Edge: rate limit → retry. Fail: drift → escalate. Integration: G1 evidence.
```

### Step 10 — Update /gap-analysis (Lens 6 always-on)

```
Step 10 — Wire Lens 6 always-on + fallback chain
  Model:       sonnet (single skill; one cold dispatch)
  Action:      Make Lens 6 (rubric-driven gap-finding) always run; implement fallback chain per spec §3.6 (rubric exists → use it; else generate inline; else use sibling-skill rubric as a stand-in proxy)
  Files:       ~/.claude/skills/gap-analysis/SKILL.md
  Inputs:      Spec §5 Phase 1b row 6; spec §3.6 fallback chain
  Outcome:     Lens 6 has no opt-out; fallback chain documented in skill body
  Exec:        SEQUENTIAL after Step 9 (so writer + optimiser patterns are validated first; gap-analysis often imitates them)
  Time:        15 min
  Tooling:     /lifecycle, Sonnet, Edit
  On-Fail:     If existing /gap-analysis already calls Lens 6 conditionally: surgical edit only — don't rewrite.

  Prompt: As Step 6 prompt, change: "Lens 6 must always run regardless of input shape. Implement fallback per spec §3.6: (a) read <target>/references/end-goal-rubric.md if present; (b) generate inline rubric using the same logic /skill-writer uses; (c) if target has no spec hints, use the closest-sibling skill's rubric as a proxy + flag the proxying."
  Test:
    Happy:       grep `Lens 6.*always` matches; grep for the 3 fallback steps each match a heading or list item
    Edge:        Empty target (skill with no SKILL.md body) → skill explicitly halts with a clear error, not silently skipping
    Fail:        Cross-tier QC at Step 12 catches
    Integration: Demonstrated at Step 14
```

### Step 11 — Update /qc + /qc-inline (wire certainty_calc)

```
Step 11 — Wire certainty_calc into QC Stage 3
  Model:       sonnet × 2 parallel
  Action:      In Stage 3 (evidence pass), call certainty_calc on the batch of 5 model responses; flag certainty <70 for Bean review; HOLD if <50 (don't proceed past Stage 3)
  Files:       ~/.claude/skills/qc/SKILL.md
               ~/.claude/skills/qc-inline/SKILL.md
  Inputs:      Spec §5 Phase 1b rows 7-8; spec §4.1 row 3 (certainty_calc spec)
  Outcome:     Stage 3 of both skills explicitly imports `from optimisation_toolkit.certainty_calc import score`; the <70 / <50 thresholds are documented; HOLD path tells the user what blocks
  Exec:        PARALLEL with each other
  Deps:        Step 10 complete (cross-tier QC pattern reused)
  Time:        15 min wall-time
  Tooling:     /lifecycle, Sonnet × 2
  On-Fail:     Same as Step 6.

  Prompt: As Step 6 prompt, change: "Stage 3 evidence pass now imports certainty_calc.score and runs it on the 5-response batch. Output: insert {certainty, dominant_answer, dissenting_count} into the QC report. Add: certainty<70 = flag for human review (continue with annotation); certainty<50 = HOLD (do not proceed past Stage 3, surface to Bean with the dissenting responses inline)."
  Test:
    Happy:       grep `from optimisation_toolkit.certainty_calc import` matches in both
    Edge:        Stage 3 with fewer than 5 responses: must call certainty_calc with what it has and emit a "low sample" annotation, not crash
    Fail:        Cross-tier QC at Step 12
    Integration: Tested live at Step 14
```

### Step 12 — Cross-tier QC peer review of /gap-analysis + /qc + /qc-inline (PARALLEL)

```
Step 12 — Cross-tier QC: final 3 skill updates
  Model:       gemini-flash × 3 parallel
  Action:      Same as Step 7 / Step 9.
  Files:       reads ~/.claude/skills/{gap-analysis,qc,qc-inline}/SKILL.md
               writes .claude/reports/phase-1-cross-tier-qc/<run_id>/{gap-analysis,qc,qc-inline}.md
  Outcome:     3 reports
  Time:        10 min
  Tooling:     /gemini-flash × 3
  On-Fail:     Same as Step 7.
  Test:        Happy: 3 reports written. Fail: any "drift" finding → escalate before Step 13.
```

### Step 13 — QA Gate: 8/8 cross-tier QC reports clean

```
QA Gate — All 8 lifecycle skills updated + cross-tier QC clean
  Model:   inline (Bean reads + signs off; this is judgement, not assertion)
  Exec:    SEQUENTIAL
  Deps:    Steps 6-12 complete
  Check:   ls .claude/reports/phase-1-cross-tier-qc/<run_id>/ | wc -l   # expect 8
           grep -li "drift\|contradiction\|ambiguity" .claude/reports/phase-1-cross-tier-qc/<run_id>/*.md
  Pass:    8 reports present; the second grep returns NO files (no drift findings); Bean signs off in chat
  Fail:    Any drift finding → triage in main thread + targeted re-edit + re-QC the affected skill only
  Marker:  QA — gates Step 14
```

### Step 14a — Build /verify-loop (merge /test-driven-development + /verification-before-completion)

```
Step 14a — Merge two testing skills into /verify-loop via /lifecycle
  Model:       inline (merge decisions are architectural; /lifecycle merge mode handles SKILL.md scaffolding)
  Action:      Invoke /lifecycle in merge mode. Source skills: /test-driven-development + /verification-before-completion.
               Output skill: /verify-loop. Spec for the merged skill:

               STAGE 0 — Read context
                 - If .claude/plans/*.md exists: read active plan, identify steps
                 - Read current TodoWrite state

               STAGE 1 — Classify verification per step
                 For each step/todo, determine proof-of-done type:
                   shell command | visual (Playwright) | unit test | API assertion | file assertion
                 Produce one commandable test per step (exact command, exit-0 = pass)

               STAGE 2 — Inject tests (dual-surface rule)
                 If active plan doc exists: append a "Verification Plan" table
                   (columns: Step | Test type | Command | Pass condition)
                 ALWAYS: queue a [TEST: <step-name>] todo immediately after each work todo

               STAGE 3 — Per-step gate (fires when a work todo is marked complete)
                 Run the paired [TEST] todo's command
                 Pass: mark [TEST] done, continue
                 Fail:
                   Auto-fix once (minimal targeted fix)
                   Re-run test
                   If pass: mark [TEST] done, continue
                   If still fail: insert [BLOCKED: <reason>] todo, HARD STOP, surface to Bean

               Also write the rubric (skill-writer's new rubric-gen stage fires first per Phase 1b)
               Output: ~/.claude/skills/verify-loop/SKILL.md + ~/.claude/commands/verify-loop.md

  Files:       creates ~/.claude/skills/verify-loop/SKILL.md
               creates ~/.claude/commands/verify-loop.md
               reads ~/.claude/skills/test-driven-development/SKILL.md
               reads ~/.claude/skills/verification-before-completion/SKILL.md
               writes ~/.claude/skills/verify-loop/references/end-goal-rubric.md (via rubric-gen stage)
  Inputs:      Existing /test-driven-development + /verification-before-completion SKILL.md content; Decisions 1-3 + A-F from §KJC
  Outcome:     ~/.claude/skills/verify-loop/SKILL.md exists; /verify-loop is invocable; rubric written; old skills marked for archival (NOT deleted yet — deletion is a separate lifecycle step)
  Exec:        SEQUENTIAL
  Deps:        Step 13 passed
  Marker:      (none)
  Time:        20 min
  Tooling:     /lifecycle, Edit, Write
  On-Fail:     If /lifecycle rejects the merge (e.g. insufficient overlap between source skills): manually scaffold SKILL.md from the spec above; use /lifecycle in new-skill mode instead.
  Test:
    Happy:       ls ~/.claude/skills/verify-loop/SKILL.md exits 0; grep "STAGE 3" SKILL.md matches; /verify-loop is listed in available skills
    Edge:        Test-driven-development had no fixture set → verify-loop SKILL.md handles "no fixtures" gracefully in Stage 1 (classifies what test type best fits the current task)
    Fail:        /lifecycle pipeline-stage-gate.py rejects → Bean signs off on rubric first, then re-run merge
    Integration: Demonstrated live in Step 14b
```

### Step 14b — End-to-end demo: run /skill-optimiser on /verify-loop [SESSION-START]

```
Step 14b — Prove the utility-aware loop works end-to-end using /verify-loop as the target
  Model:       inline (judgement on whether the loop genuinely improved the skill; also confirms /verify-loop itself works during the demo)
  Action:      Run /skill-optimiser on /verify-loop. This exercises the full Phase 1 stack in one pass:
               (a) Stage 1 reads the rubric written in Step 14a;
               (b) canary_split.py holds out 20% of /verify-loop's fixture set;
               (c) few_shot_injector queries blub.db for corrections relevant to testing/verification patterns;
               (d) at least one optimisation candidate is scored;
               (e) gate fires (delta >= 0.05, or "no change" with rationale — both are valid PASS);
               (f) /qc is called and certainty_calc fires at Stage 3;
               (g) report archived under .claude/reports/phase-1-end-to-end/<run_id>/

               Then immediately invoke /verify-loop on THIS plan (phase-1-foundations.md) to verify
               it works end-to-end as a tool: it should read the plan, classify tests for each step,
               append a Verification Plan table to the plan doc, and drop [TEST] todos.

  Files:       reads ~/.claude/skills/verify-loop/ (fixtures, SKILL.md, rubric)
               writes .claude/reports/phase-1-end-to-end/<run_id>/{rubric.md,canary-result.json,candidate-diff.md,qc-report.md,verdict.md}
               appends .claude/plans/phase-1-foundations.md §Verification Plan table (via /verify-loop self-demo)
  Inputs:      Step 14a output (verify-loop skill); all Phase 1a + 1b outputs
  Outcome:     verdict.md reads "PASS — utility-aware loop functioning" OR "FAIL — [where the loop broke]".
               /verify-loop self-demo produces a Verification Plan table for this plan doc.
               Both proofs must be present before G1 can be declared.
  Exec:        SEQUENTIAL
  Deps:        Step 14a complete
  Marker:      SESSION-START
  Time:        25 min
  Cold-Entry:  This plan (phase-1-foundations.md) §Steps 14a-15 + handoff.md + master plan §11 G1 criteria
  Tooling:     /skill-optimiser, /qc, /verify-loop, the 4 utilities
  On-Fail:     utility error → Phase-1.5 stub repair. SKILL.md stage broke → revert that skill, re-edit, re-QC. /verify-loop self-demo fails → treat as a failing test (Stage 3 HARD STOP applies to itself).

  Prompt:      Inline Opus run; no cold dispatch.
  Test:
    Happy:       verdict.md says PASS; Verification Plan table appended to this plan doc with ≥1 row per phase step
    Edge:        delta < 0.05 on /verify-loop optimisation → still PASS if gate correctly refused the candidate
    Fail:        Any utility raises an unhandled exception OR /qc skips Stage 3 OR /verify-loop self-demo errors → FAIL; do not POST G1
    Integration: This step IS the integration test for Phase 1; the self-demo of /verify-loop is the integration test for the skill itself
```

### Step 15 — POST G1 telemetry + Living Docs update

```
Step 15 — Phase exit: G1 milestone POST + state sync [HANDOFF]
  Model:       inline (mechanical, but the summary content needs main-thread judgement)
  Action:      POST G1 summary to /api/knowledge per master plan §11.5. Update .claude/state.md current_phase to "phase-2-rubrics-universe". Update .claude/decisions.md if Step 14b surfaced any architectural call. Run /handoff.
  Files:       writes .claude/state.md (Edit, frontmatter only)
               appends .claude/decisions.md (only if Step 14b produced a decision)
               writes .claude/handoff.md (via /handoff)
               writes .claude/next-session-prompt.md (via /handoff, points at Phase 2 handoff block from master plan §13)
  Inputs:      Step 14b verdict
  Outcome:     G1 marked PASS in blub.db knowledge feed; state.md ready for Phase 2; cold-entry pointer for next session in place
  Exec:        SEQUENTIAL
  Deps:        Step 14b PASS
  Marker:      HANDOFF
  Time:        10 min
  Tooling:     curl, /handoff, Edit
  On-Fail:     If POST returns non-2xx: log + retry once; if still failing, mark `pending_upload: true` in handoff.md and continue.
  Cold-Entry:  Next session reads handoff.md + master plan §13 Phase 2 handoff block.

  Check (commandable):
    curl -sf -X POST http://localhost:5050/api/knowledge \
      -H "Cookie: blub_auth=$BLUB_AUTH" \
      -H "Content-Type: application/json" \
      -d '{"category":"pipeline-run","tags":["phase-1-foundations","P1.1b","G1-PASS"],"title":"Phase 1 exit: foundations","content":"4 utilities + 8 lifecycle skills + cross-tier QC clean + /verify-loop shipped + end-to-end demo PASS","metadata":{"run_id":"<id>","phase":"1","project_id":14}}'
  Test:
    Happy:       curl exits 0 with 2xx; state.md frontmatter shows current_phase: phase-2-rubrics-universe
    Edge:        Blub dashboard down → mark pending_upload: true, do not block
    Fail:        state.md write fails → manual edit; never silently skip
    Integration: Phase 2 handoff block is now the next session's entry point
```

---

## Key Judgement Calls

### Primary decisions (surfaced during planning)

- **Decision 1 — Demo target for Step 14b (RESOLVED)**
  - **Chosen:** /verify-loop — the merged skill built in Step 14a becomes the optimiser's target
  - **Why:** Maximum ROI per Bean's call: the demo also fixes a real long-standing friction (lack of testing during dev). Exercises all four utilities (few_shot_injector pulls testing-pattern corrections from blub.db; canary_split scores the optimised rubric against held-out examples; certainty_calc runs at /qc Stage 3; dspy_signature wraps the rubric-gen prompt). Self-demo in Step 14b additionally proves /verify-loop works as a tool — two birds, one run.
  - **Decision author:** Bean (2026-04-29)

- **Decision 2 — Cross-tier QC reviewer model**
  - **Options:** [A] Gemini Flash (fast, free, weak at nuance); [B] Cerebras Llama 3.1 70B (free, faster than Flash, also weak at nuance); [C] Both in parallel and reconcile
  - **Recommendation:** A — Gemini Flash alone for Phase 1 (B as fallback if Flash rate-limits)
  - **Why:** R1 demands cross-tier (different family from Sonnet). Both A and B satisfy that. Adding both = doubling QC time without proportional value; Phase 1 skill edits are pattern-following, not creative — Flash catches drift adequately. Reserve C for Phase 4 design-brain Council where stakes are higher.
  - **Cost of wrong choice:** Medium — if Flash misses a drift, Step 13 Bean spot-check catches it. Worst case: re-dispatch on the missed skill.
  - **Who decides:** Bean (this is a R1-mitigation choice, not a pure mechanical pick)

- **Decision 3 — Parallel batching strategy for Step 6**
  - **Options:** [A] All 3 writers in parallel (current plan); [B] skill-writer first, then pipeline-writer + command-writer in parallel; [C] Sequential
  - **Recommendation:** A — full parallel
  - **Why:** Empirical ceiling per spec §3 is 3 parallel Sonnet subagents. The 3 writer skills share template structure; if all 3 fail in the same way, the spec ambiguity is caught faster than serial.
  - **Cost of wrong choice:** Low — if Sonnet rate-limits, Cerebras backstop is available via /delegate.
  - **Who decides:** Inline (mechanical)

### Pre-emptive decisions (Hidden Decisions pass — internal review against §14 of master plan + Step-3 ambiguity surface)

- **Decision A — What if blub.db is empty when few_shot_injector smoke test runs?**
  - **Resolution:** Smoke test fixture is synthetic — does NOT hit production blub.db. Production blub.db connection is exercised only in Step 14 demo. Spec §4.4 mandates "no network calls" in smoke tests.
  - **Why:** Avoids dev-env coupling; production blub.db state changes daily.

- **Decision B — Where do .rubrics/ outputs live for /command-writer?**
  - **Resolution:** Adjacent to the command being authored — i.e. `~/.claude/commands/<command-name>.rubric.md` (single file per command, dot-prefixed if needed for namespace cleanliness).
  - **Why:** Matches the existing `.rubrics:handoff` skill at `~/.claude/skills/.rubrics:handoff/...` precedent; keeps rubrics co-located with their target.

- **Decision C — What "rubric" structure does each writer skill emit?**
  - **Resolution:** Reuse the existing rubric format defined in spec §2 (Rubric file format). Writers don't invent a format — they emit conformant rubrics. If the existing format is silent on a field the writer needs (e.g. `serving_pipeline` for triage in Phase 2b), the writer adds it as YAML frontmatter and the format gets a backwards-compatible amendment in Phase 2b.

- **Decision D — When does Bean's HARD GATE sign-off happen — synchronously inline, or async?**
  - **Resolution:** Inline. The HARD GATE pauses the skill; Bean approves in chat; skill resumes. Async approval (e.g. via Telegram) is parked for a future automation-engine integration once Rule-7 push delivery ships (master plan §10 R-parking).
  - **Why:** Rule 4 (verification before completion) + Rule 9 (negotiated decisions). Inline keeps the loop tight.

- **Decision E — Cross-tier QC: what counts as a "drift finding" requiring escalation?**
  - **Resolution:** Drift = (a) a stage was reordered without the skill's frontmatter or correction-ledger explaining why, OR (b) a HARD GATE moved or weakened, OR (c) any stage now contradicts the skill's `description`. Anything else (typos, prose nits) is patched silently.
  - **Why:** Stage 13 grep filter looks for "drift|contradiction|ambiguity" — these are the load-bearing terms.

- **Decision F — What if Step 14 demo PASSES but with delta = 0.04 (just-below-gate)?**
  - **Resolution:** PASS the phase. The gate firing at <0.05 is the utility working correctly — refusing a marginal change. Phase 1 success criterion is "the loop functions", not "delta>=0.05 must be observed". Document the result in verdict.md with the actual delta.
  - **Why:** Avoids cargo-culting to force a high delta; protects against utility-gaming in later phases.

---

## Self-grade (proxy for /docscore)

| Criterion | Rating | Note |
|----------|--------|------|
| Coverage of phase scope | A | Both P1.1a + P1.1b mapped; G1 PASS criteria all wired into Step 14 / Step 15 |
| Step actionability | A- | Every step has Action, Files, Test (4 layers), On-Fail; pre-written prompts on every dispatched step |
| QA gate coverage | A | Gates after canary, after parallel utilities, after 8/8 cross-tier QC, end-to-end at Step 14 |
| Cold re-entry | A | SESSION-START + HANDOFF markers populated with Cold-Entry pointers |
| KJC + Hidden Decisions | A | 3 primary + 6 pre-emptive |
| Tooling Index | A | All commands surfaced |
| Routing-table cost discipline | B+ | Inline cost estimate; no per-step token estimate (would need /delegate dispatch per step — declined in favour of plan readability) |
| Living Docs update plan | A | Step 15 wires state.md + decisions.md + handoff.md + next-session-prompt.md |
| **Overall** | **B+ → A-** | Subtract a half-grade for the per-step token-estimate gap; add it back if Step 14 telemetry proves the inline estimates within ±20% |

If grade < B, fix before merge. B+ → ship.

---

## Stage 9 — Handoff offer

I've prepared this plan for fly-through execution. Choose your next move:

**(a) Start Step 1 inline now** — scaffold the toolkit dir + canary_split.py in this session (~25 min, ends at QA Gate Step 2 PASS).

**(b) Invoke `/subagent-driven-development`** — recommended once Step 1 lands. The plan has 4 strong parallel opportunities (Step 3 × 3, Step 6 × 3, Step 8 × 2, Step 11 × 2 + Step 7/9/12 cross-tier QC × 3). SDD dispatches Sonnet workers per parallel-eligible step while Opus parent stays free for the gates.

**(c) Refine an area** — most likely candidates: Decision 1 (demo target), Decision 2 (cross-tier reviewer), or the Test layer detail on Step 1.

**(d) `/handoff` for next session** — commit the plan, generate next-session-prompt.md pointing at Step 1.

**(e) Park** — leave the plan + return later.

---

★ Insight ─────────────────────────────────────
- **The ladder is canary_split → everything else.** Per spec §4.3, no other utility ships before canary_split passes its smoke. This is the single sequencing decision the spec makes for you — every later parallelisation flows from it.
- **Cross-tier QC is the entire reason Phase 1b is BLOCKING.** R1 + 2026-04-28 lesson: Sonnet self-applying on its own edits missed regressions. Gemini Flash reading fresh catches them. Phase 2's 22-rubric optimisation pass relies on this stack being trustworthy — that's why ~64% of Phase 1 wall-time is the lifecycle skill updates, not the utilities themselves.
- **HARD GATE on Bean sign-off is intentional friction.** The writer skills now refuse to author past rubric-gen without you confirming the rubric reflects intent. That's expensive in flow time but saves Phase 4's tooling rebuild from inheriting unmeasured rubrics. Rule 9 in action: you pick from the rubric the writer drafted; you don't invent it.
─────────────────────────────────────────────────

---
