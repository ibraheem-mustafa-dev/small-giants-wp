---
doc_type: phase-plan
phase: phase-2-rubrics-universe
project: small-giants-wp
project_id: 14
generated_by: /phase-planner (2026-04-30, restructured 2026-04-30 v2)
plan_label: sonnet
status: ready
entry_condition: triage signed off + kills executed + dispatch-graph-validator clean + sandbox-preview gate green
---

[PLAN: sonnet]

# Phase 2 — Rubrics Universe (v2 — two-track restructure)

**USP:** Phase 2 produces *confirmed rubrics + finalised tooling spec* for the active surviving roster, BEFORE any structural fixes or optimiser passes that would otherwise be redone after Phase 4 settles. Track 1 also dogfoods the lifecycle stack: optimising the skills Phase 2 itself uses pays back inside the same phase.

**Plan label:** PLAN: sonnet
**Docscore:** TBD (run `/docscore` post-write)
**Aggregate cost estimate:** ~$2.20–4.00 / ~280K tokens across ~22 step-equivalents (rubric drafts × 3 + QC × 3 + optimiser × 9 + pipeline-rubric drafts × 13 + triage + email-html-builder structural pass)

**Phase success criteria (G2 — done when):**
- [ ] Track 1 — 9 independent skills: rubric confirmed AND `/skill-optimiser` re-grade ≥B (≥90% skillscore)
- [ ] Track 2 — 4 tooling-dependent skills: rubric confirmed (no optimiser pass — deferred to G2.5)
- [ ] email-html-builder structural pass: skillscore ≥85%
- [ ] P2.2b — surviving tools triaged + ~50–60 rubrics drafted (each QC-passed + Bean-confirmed)
- [ ] P2.2c — 13 pipeline rubrics drafted (each QC-passed + Bean-confirmed)
- [ ] **Tooling spec finalised** — the v2 spec at `.claude/specs/2026-04-27-optimisation-toolkit-design.md` updated with confirmed-rubric references and any scope adjustments surfaced during P2.2a/b/c

**Entry condition (P1.5 → P2):** triage signed off + kills executed + dispatch-graph-validator clean + sandbox-preview gate green.

**Entry context (read before starting this phase):**
- `.claude/plans/strategy/2026-04-29-tooling-triage.md` — signed-off triage decisions
- `.claude/specs/2026-04-27-optimisation-toolkit-design.md §10.1` — 22 confirmed rubric paths
- `.claude/specs/2026-04-27-optimisation-toolkit-design.md §5 Phase 2a/2b/2c` — phase spec
- `.claude/plans/master-plan.md §Phase 2` — P2.2a/b/c units + G2 gate
- `~/.claude/agents/.rubrics/seo-technical.md` — confirmed rubric reference shape (canonical example)
- `~/.claude/agents/.rubrics/backlog.md` — deferred B/C/D gaps
- `.claude/state.md` — confirm `current_phase: phase-2-rubrics-universe` (set by P1.5f handoff)

**References:**
- [`.claude/specs/2026-04-27-optimisation-toolkit-design.md`](../specs/2026-04-27-optimisation-toolkit-design.md) — master spec
- [`.claude/plans/master-plan.md`](master-plan.md)
- `~/.agents/skills/shared-references/correction-ledger.md` — past planning mistakes
- `~/.agents/skills/shared-references/model-routing.md` — dispatch rules
- blub.db pattern_key `gap-analysis-skill-inconsistency` (id=149, rec=3) — rule about HARD-GATE confirmation timing + canonical-output completeness; embedded into `/gap-analysis` Step 4.5 separately

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| skill | /lifecycle → skill-optimiser | Track 1 optimiser passes |
| skill | /lifecycle → agent-optimiser | email-html-builder structural pass |
| skill | /skill-writer (rubric draft) | All rubric drafts (P2.2a, P2.2b, P2.2c) |
| skill | /subagent-driven-development | Parallel batch dispatch (Sonnet) |
| skill | /dispatching-parallel-agents | Stage QC (Gemini Flash + 2 Sonnet personas) |
| skill | /delegate | Per-step model assignment |
| cli | sgs-skillscore.py | All QA gates |
| cli | dispatch-graph-validator.py | QA gate 1, G2 gate |

---

## Roster — Phase 2 scope

### P2.2a — Track 1: Full optimiser pass (9 skills + 1 structural fix)

These skills are the engine of Phase 2 itself — optimising them pays back inside the phase. None depend on the tooling spec.

| # | Skill | Rubric path | Type | Notes |
|---|-------|-------------|------|-------|
| 1 | `/capture-lesson` | `~/.agents/skills/capture-lesson/references/end-goal-rubric.md` | skill | Rule recurrence id=149 just incremented to 3 — classifier-router gap visible |
| 2 | `/qc` | `~/.agents/skills/qc/references/end-goal-rubric.md` | skill | Will be invoked during P2.2b/c QC stages |
| 3 | `/phase-planner` | `~/.agents/skills/phase-planner/references/end-goal-rubric.md` | skill | A (4.79) at last optimiser run |
| 4 | `/subagent-prompt` | `~/.agents/skills/subagent-prompt/references/end-goal-rubric.md` | skill | A (4.63) at last run |
| 5 | `/handoff` (command) | `~/.claude/commands/.rubrics/handoff.md` | command | Will write Phase 2/Phase 3 handoff |
| 6 | `/project-consolidate` | `~/.claude/skills/project-consolidate/references/end-goal-rubric.md` | skill | Recently graded |
| 7 | `/autopilot` | `~/.agents/skills/autopilot/references/end-goal-rubric.md` | skill | A- (4.4) at last run |
| 8 | `/strategic-plan` | `~/.agents/skills/strategic-plan/references/end-goal-rubric.md` | skill | A- (4.55) at last run |
| 9 | `/architecture-doc` | `~/.agents/skills/architecture-doc/references/end-goal-rubric.md` | skill | A (4.60) at last run |
| — | **email-html-builder** | (no rubric yet — Track 1 drafts one) | skill | Structural fix only — 63% → ≥85% |

### P2.2a — Track 2: Rubric draft ONLY (4 skills, optimiser parked to G2.5)

These depend on the tooling spec being finalised. Drafting and confirming the rubric in Phase 2 is safe; running `/skill-optimiser` against an unfinalised spec context risks rework.

| # | Skill | Path | Defer reason |
|---|-------|------|--------------|
| 1 | `/extract` | `~/.claude/skills/extract/` | Tooling-spec subject (extraction pipeline) |
| 2 | `/harden` | `~/.claude/skills/harden/` | Tooling-spec subject (robustness checks) |
| 3 | `/ethics-gate` | `~/.agents/skills/ethics-gate/` | Spec §4.3.3 formalises as shared module — wait |
| 4 | `/interactivity-capture` | `~/.agents/skills/interactivity-capture/` | Skill EXISTS (verified 2026-04-30, contradicts spec §4.3.1 "NEW"). Existing rubric at `references/end-goal-rubric.md` — verify against v2 format and re-confirm |

### Excluded from Phase 2 entirely (Phase 4 territory)

9 deletion-bound skills — migration notes deferred until Phase 4 design-brain spec finalises (Phase 4.1.12, 4.1.14). What migrates to `philosophy_rules` depends on the design-brain DB schema being settled.

`/critique`, `/adapt`, `/colourise`, `/bolder`, `/quieter`, `/normalize`, `/polish`, `/distill`, `/delight`

### Parked structural debt (G2.5 — deferred until rubrics confirmed + tooling spec finalised)

| Target | Pre-fix | Defer reason |
|--------|---------|--------------|
| `seo-technical` | 52% → **86% (done 2026-04-30)** | Structural pass complete this session. Lens 6 grade C (3.08) — content fixes for A-grade gaps queued for G2.5 |
| `design-reviewer` | 53% | Tooling-spec subject — wait for confirmed rubric + spec |
| `seo-auditor` | 59% | Tooling-spec subject — same |
| `sgs-extraction` | 85% | Tooling-spec subject — same |

---

## Rubric drafting — single-source orchestration via /rubric-writer

**Built 2026-04-30** — every rubric-draft step in this plan calls `/rubric-writer` (`~/.agents/skills/rubric-writer/SKILL.md`) rather than dispatching an inline prompt template. This is the structural deduplication of rubric-drafting logic across `/gap-analysis` Step 4.5, `/skill-writer` Stage 2, and Phase 2 batches — one implementation, three callers, one Stage QC pattern, one cross-turn confirmation HARD GATE.

`/rubric-writer` runs internally:
1. **Stage 1** — resolve target type (skill / agent / command / pipeline) and canonical save path
2. **Stage 2** — read target source file(s)
3. **Stage 3** — draft v2 rubric per spec §2.1 (frontmatter) + §2.2 (criteria + Never Do + optional Lens 6 Anchors) + §2.3 (world-state anchors)
4. **Stage 4** — 3-reviewer Stage QC peer-review (1 Gemini Flash + 2 Sonnet personas) + `certainty_calc.score()` to quantify reviewer agreement
5. **Stage 5** — present to Bean, **END THE TURN** (HARD GATE — no same-turn save)
6. **Stage 6** — save on Bean's next-turn confirm with `bean_signoff: confirmed`

For Phase 2 batch dispatch: `/subagent-driven-development` invokes `/rubric-writer` per target. Stage QC's reviewer panel runs inside each `/rubric-writer` invocation, so the batch's rubrics each get reviewed without a separate batch-level QC.

Pattern rationale: today's seo-technical run validated the Stage QC panel — 3 reviewers caught 6/12 anchors violating §2.3 plus 3 missing criteria that would have shipped without review. Cost: ~30s wall-clock per QC pass. ROI: avoids embedding bad rubrics that Phase 3 grades against.

---

## Steps

### Group A — Entry + Track 1 (rubric drafts → QC → confirm → optimiser passes)

```
Step 1 — [SESSION-START] Confirm entry conditions and update state
  Model:       inline
  Action:      Run dispatch-graph-validator (expect 0 dead refs). Confirm sandbox-preview gate green via /verify-loop --target-url smoke. Confirm state.md current_phase=phase-2-rubrics-universe.
  Files:       .claude/state.md (update if needed)
  Inputs:      .claude/plans/strategy/2026-04-29-tooling-triage.md, .claude/state.md
  Outcome:     Validator exits 0; state.md confirms phase-2; HARD-GATE rule embedded into /gap-analysis (verified by reading Step 4.5 of /gap-analysis SKILL.md and confirming the cross-turn pause rule is present)
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        5 min
  Tooling:     dispatch-graph-validator.py, sgs-skillscore.py, Read
  On-Fail:     Validator dead refs → fix or add ignore comments. /gap-analysis Step 4.5 missing the rule → run /lifecycle on /gap-analysis first.
  Cold-Entry:  Read this plan file + .claude/plans/strategy/2026-04-29-tooling-triage.md + .claude/state.md
  Test:
    Happy:       Validator clean, state.md shows phase-2, /gap-analysis Step 4.5 references the cross-turn pause rule
    Edge:        Acceptable validator ignore comments (task_shape enums) — pass
    Fail:        Dead ref → fix; missing rule → /lifecycle first
    Integration: standalone
```

```
Step 2 — Track 1 Batch 1: rubric drafts (3 skills, parallel)
  Model:       sonnet (3 parallel subagents via /subagent-driven-development)
  Action:      Dispatch 3 subagents to draft end-goal rubrics for: /capture-lesson, /qc, /phase-planner. Each subagent reads existing SKILL.md + any existing rubric, drafts a v2-format rubric (spec §2.1 frontmatter + §2.2 sections + world-state anchors per §2.3) at <skill-dir>/references/end-goal-rubric.md with `bean_signoff: pending`. Do NOT write `confirmed` — that comes after Stage QC + Bean.
  Files:       3 rubric files (one per skill)
  Inputs:      Spec §2.1, §2.2, §2.3; existing SKILL.md per skill
  Outcome:     3 v2 rubrics drafted, bean_signoff: pending
  Exec:        PARALLEL (different files, no overlap)
  Deps:        Step 1 complete
  Marker:      (none)
  Time:        15 min wall-clock
  Tooling:     /subagent-driven-development → /rubric-writer (Stage QC + cross-turn pause built in)
  On-Fail:     Subagent timeout → invoke /rubric-writer inline for that skill
  Prompt:      |
    Invoke /rubric-writer with target = [SKILL_NAME] at [SKILL_PATH].
    /rubric-writer handles:
      - Stage 1: resolve canonical save path (<skill-dir>/references/end-goal-rubric.md for skills)
      - Stage 2: read existing SKILL.md + any existing rubric
      - Stage 3: draft v2-format rubric per spec §2.1–§2.3 (world-state anchors)
      - Stage 4: 3-reviewer Stage QC + certainty_calc
      - Stage 5: present to Bean — END THE TURN (HARD GATE)
      - Stage 6: save with bean_signoff: confirmed on next-turn confirm
    Report back: rubric path, criterion count, weight pool sum, certainty score, Stage QC findings count.
  Test:
    Happy:       All 3 rubrics present, ≥6 criteria each, world-state anchors
    Edge:        Existing rubric exists → enhance to v2 format, don't discard content
    Fail:        Anchor still process-flavoured → flag in Stage QC
    Integration: standalone
```

```
Step 3 — Track 1 Batch 1: Stage QC + Bean confirm
  Model:       gemini-flash (1) + sonnet (2 personas) via /dispatching-parallel-agents
  Action:      For each of the 3 rubrics from Step 2: dispatch 3 parallel reviewers (1 Gemini Flash for framing-rule check, 2 Sonnet personas for practitioner + skill-evaluation perspectives). Synthesise findings inline. Present to Bean. Wait for confirmed/amend in a separate turn (HARD GATE — embedded rule).
  Files:       3 rubric files (potentially amended)
  Inputs:      Step 2 rubrics
  Outcome:     3 rubrics with bean_signoff: confirmed (or amended + confirmed)
  Exec:        SEQUENTIAL (one rubric at a time for clean Bean confirmation)
  Deps:        Step 2 complete
  Marker:      QA
  Time:        25 min (3 rubrics × ~8 min each including Bean confirmation)
  Tooling:     /dispatching-parallel-agents
  On-Fail:     Reviewer findings significant → amend rubric, re-present, re-confirm. Bean rejects → discuss what to change inline.
  Prompt:      (per-reviewer, reuses today's seo-technical reviewer prompts as templates — see ~/.claude/agents/.rubrics/seo-technical.md provenance)
  Test:
    Happy:       All 3 rubrics bean_signoff: confirmed
    Edge:        Bean amends one rubric materially → save as confirmed after amendment
    Fail:        Reviewer finds anchors violating §2.3 → amend before confirming
    Integration: writes to disk only after Bean's confirm in a separate turn
```

```
Step 4 — Track 1 Batch 1: /skill-optimiser passes (3 skills, parallel)
  Model:       sonnet (3 parallel subagents)
  Action:      For each confirmed Batch 1 rubric: invoke /lifecycle → skill-optimiser using the confirmed rubric as Lens 6 input. Re-grade post-optimiser. Target: skillscore ≥90%, gap-analysis grade ≥B.
  Files:       3 SKILL.md files (potentially edited by optimiser)
  Inputs:      Step 3 confirmed rubrics
  Outcome:     3 skills re-graded ≥B; correction-ledger entries appended
  Exec:        PARALLEL
  Deps:        Step 3 complete
  Marker:      (none)
  Time:        30 min wall-clock
  Tooling:     /lifecycle → skill-optimiser, sgs-skillscore.py
  On-Fail:     Below B → escalate to inline; do not re-dispatch failed subagent
  Prompt:      Run /lifecycle → skill-optimiser on [SKILL_NAME]. Use confirmed rubric at [RUBRIC_PATH] as Lens 6 input. Report: pre-fix grade, post-fix grade, delta, skillscore %.
  Test:
    Happy:       All 3 ≥90% skillscore, ≥B gap-analysis grade
    Edge:        Skill already at A → minor polish only, OK if delta is low
    Fail:        Below 85% → inline session
    Integration: each subagent independent
```

```
Step 5 — Track 1 Batch 2: rubric drafts (3 skills, parallel)
  Model:       sonnet (3 parallel subagents)
  Action:      Same pattern as Step 2. Skills: /subagent-prompt, /handoff (command), /project-consolidate.
  Files:       3 rubric files
  Inputs:      Spec §2.1–2.3
  Outcome:     3 v2 rubrics drafted, bean_signoff: pending
  Exec:        PARALLEL
  Deps:        Step 4 complete (or run interleaved if session permits)
  Marker:      (none)
  Time:        15 min
  Tooling:     /subagent-driven-development
  On-Fail:     Same pattern as Step 2
  Prompt:      (same template as Step 2)
  Test:        (same as Step 2)
```

```
Step 6 — Track 1 Batch 2: Stage QC + Bean confirm
  Model:       gemini-flash + sonnet × 2 via /dispatching-parallel-agents
  Action:      Same pattern as Step 3 for the 3 Batch 2 rubrics.
  Outcome:     3 rubrics bean_signoff: confirmed
  Exec:        SEQUENTIAL per rubric
  Deps:        Step 5 complete
  Marker:      QA
  Time:        25 min
  Tooling:     /dispatching-parallel-agents
  Test:        (same as Step 3)
```

```
Step 7 — Track 1 Batch 2: /skill-optimiser passes
  Model:       sonnet (3 parallel)
  Action:      Same pattern as Step 4 for 3 Batch 2 skills.
  Outcome:     3 skills re-graded ≥B
  Exec:        PARALLEL
  Deps:        Step 6 complete
  Marker:      (none)
  Time:        30 min
  Test:        (same as Step 4)
```

```
Step 8 — Track 1 Batch 3: rubric drafts (3 skills, parallel)
  Model:       sonnet (3 parallel)
  Action:      Same pattern. Skills: /autopilot, /strategic-plan, /architecture-doc.
  Outcome:     3 rubrics bean_signoff: pending
  Exec:        PARALLEL
  Deps:        Step 7 complete (or interleaved)
  Marker:      (none)
  Time:        15 min
  Test:        (same)
```

```
Step 9 — Track 1 Batch 3: Stage QC + Bean confirm
  Model:       gemini-flash + sonnet × 2
  Outcome:     3 rubrics bean_signoff: confirmed
  Exec:        SEQUENTIAL per rubric
  Deps:        Step 8 complete
  Marker:      QA
  Time:        25 min
  Test:        (same as Step 3)
```

```
Step 10 — Track 1 Batch 3: /skill-optimiser passes
  Model:       sonnet (3 parallel)
  Outcome:     3 skills re-graded ≥B
  Exec:        PARALLEL
  Deps:        Step 9 complete
  Marker:      (none)
  Time:        30 min
  Test:        (same as Step 4)
```

```
Step 11 — email-html-builder structural pass (independent of tooling spec)
  Model:       inline
  Action:      Invoke /lifecycle → skill-optimiser on ~/.claude/skills/email-html-builder/SKILL.md. Targets: ## Goal, When NOT to Use body, correction ledger ref, references/, HARD GATE tags, 6-lens system effect. Skillscore ≥85%.
  Files:       ~/.claude/skills/email-html-builder/SKILL.md, ~/.claude/skills/email-html-builder/references/
  Inputs:      Triage doc (sgs-email-branding merge done at description level in P1.5d)
  Outcome:     skillscore ≥85%
  Exec:        SEQUENTIAL (or parallel-safe if Step 10 still running, different files)
  Deps:        Step 1 complete
  Marker:      (none)
  Time:        30 min
  Tooling:     /lifecycle → skill-optimiser, sgs-skillscore.py
  Test:
    Happy:       Skillscore ≥85%, all 6 missing sections present
    Edge:        Body exceeds 300 lines → relocate examples to references/
    Fail:        Below 85% → fix lowest criterion, rerun
    Integration: standalone
```

**QA Gate 1 — Track 1 + email-html-builder complete**
```
QA Gate 1 — All 9 Track 1 skills ≥B + email-html-builder ≥85%
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Steps 4, 7, 10, 11 complete
  Check:   for f in 9-track-1-paths + email-html-builder-path; do python ~/.agents/skills/shared-references/sgs-skillscore.py validate $f; done
  Pass:    All 10 ≥85%. At least 7 ≥90%.
  Fail:    Any below 85% → return to that skill's optimiser step, fix, rerun
  Marker:  QA
```

### Group B — Track 2 (rubric draft only, optimiser parked to G2.5)

```
Step 12 — Track 2: rubric drafts (4 skills, parallel)
  Model:       sonnet (4 parallel — Sonnet max_parallel cap)
  Action:      Draft v2 rubrics for: /extract, /harden, /ethics-gate, /interactivity-capture. For interactivity-capture: read existing rubric and verify against v2 format — enhance, don't discard. For others: draft fresh.
  Files:       4 rubric files
  Outcome:     4 v2 rubrics, bean_signoff: pending
  Exec:        PARALLEL
  Deps:        Step 1 complete (independent of Track 1)
  Marker:      (none)
  Time:        20 min
  Tooling:     /subagent-driven-development
  Prompt:      (same template as Step 2 + interactivity-capture-specific note: read existing rubric first)
  Test:        (same as Step 2)
```

```
Step 13 — Track 2: Stage QC + Bean confirm (NO optimiser pass)
  Model:       gemini-flash + sonnet × 2
  Action:      Stage QC for the 4 Track 2 rubrics. Bean confirms. STOP — do NOT run /skill-optimiser. These skills wait for tooling spec finalisation (G2.5).
  Outcome:     4 rubrics bean_signoff: confirmed; Track 2 optimiser passes parked at .claude/parking.md
  Exec:        SEQUENTIAL per rubric
  Deps:        Step 12 complete
  Marker:      QA
  Time:        35 min (4 rubrics × ~9 min)
  Tooling:     /dispatching-parallel-agents
  On-Fail:     (same as Step 3)
  Test:        (same as Step 3, but no optimiser follow-up)
```

### Group C — P2.2b: Triage + draft rubrics for remaining tools

```
Step 14 — [SESSION-START] Triage remaining ~140 tools
  Model:       inline
  Action:      Glob all skills in ~/.claude/skills/ + ~/.agents/skills/. Filter out: 13 P2.2a skills + 9 deletion-bound + 4 already in seo cluster + Track 2's 4 (already done). For each remaining: classify RUBRIC (≥1 of: in 2+ pipelines, in CLAUDE.md Quick Reference, client-visible artefact) vs SKIP. Write to .claude/plans/phase-2-rubric-registry.md.
  Files:       .claude/plans/phase-2-rubric-registry.md (new)
  Outcome:     Registry has 50–70 RUBRIC + balance SKIP
  Exec:        SEQUENTIAL
  Deps:        QA Gate 1 + Step 13 complete (Tracks 1+2 rubrics done)
  Marker:      SESSION-START
  Time:        25 min
  Tooling:     Glob, Read, Write
  Cold-Entry:  Read this plan + .claude/state.md + .claude/plans/strategy/2026-04-29-tooling-triage.md
  Test:
    Happy:       ≥100 rows, 50–70 RUBRIC, rest SKIP, serving_pipeline populated
    Edge:        New skills since last audit → cap at 140 alphabetically, note cap
    Fail:        Glob empty → check path
    Integration: standalone
```

```
Step 15 — P2.2b: rubric drafts in parallel batches of 4
  Model:       sonnet (4 parallel × multiple batches)
  Action:      For each RUBRIC tool, draft v2 rubric. Stage QC pass per batch (Gemini Flash + 2 Sonnet personas).
  Outcome:     All RUBRIC tools have rubric files; Stage QC findings either resolved or logged
  Exec:        PARALLEL within each batch of 4
  Deps:        Step 14 complete
  Marker:      HANDOFF (multi-batch — natural session breakpoints)
  Time:        ~60 min wall-clock for 50 tools (12–13 batches × 4 in parallel × ~5 min/batch)
  Tooling:     /subagent-driven-development, /dispatching-parallel-agents (Stage QC)
  Prompt:      (same template as Step 2 + Stage QC pattern)
  Test:        (same as Step 2)
```

```
Step 16 — P2.2b: Bean confirmation pass (random spot-check 5)
  Model:       inline
  Action:      Per master plan G2 review-gate: Bean spot-checks 5 randomly selected P2.2b rubrics. Flag any that look wrong — amend before bean_signoff: confirmed. Rest get bulk-confirmed by Bean.
  Outcome:     All P2.2b rubrics bean_signoff: confirmed (or amended + confirmed)
  Exec:        SEQUENTIAL
  Deps:        Step 15 complete
  Marker:      QA
  Time:        15 min
  Tooling:     Read, inline review
  Test:
    Happy:       5 spot-checked rubrics pass; bulk-confirm rest
    Edge:        Bean flags 1+ as off → amend, re-spot-check
    Fail:        Multiple flagged → escalate to per-rubric review
    Integration: standalone
```

### Group D — P2.2c: 13 pipeline rubrics

```
Step 17 — P2.2c Batch 1: 7 pipeline rubrics + Stage QC
  Model:       sonnet (4 parallel × 2 sub-batches) + Stage QC per batch
  Action:      Draft pipeline rubrics for: sgs-discover, qc, ui-ux-pro-max, build-website, seo-full, research-pipeline, subagent-driven-development. Stage QC per sub-batch.
  Files:       7 pipeline rubric files at <pipeline-dir>/references/end-goal-rubric.md
  Outcome:     7 rubrics drafted, QC-passed
  Exec:        PARALLEL within sub-batch
  Deps:        QA Gate 1 + Step 13 complete (can run in parallel with P2.2b if session allows)
  Marker:      SESSION-START
  Time:        45 min
  Tooling:     /subagent-driven-development, /dispatching-parallel-agents
  Cold-Entry:  Read this plan + state.md + spec §5 Phase 2c pipeline list
  Prompt:      (pipeline-rubric variant — anchors describe client-visible outcomes, not internal stages)
  Test:        (same — pipeline-specific)
```

```
Step 18 — P2.2c Batch 2: 6 pipeline rubrics + Stage QC
  Model:       sonnet (3 parallel × 2 sub-batches) + Stage QC
  Action:      Same pattern. Pipelines: phase-planning-to-execution, capture-and-compound, insights-generation, site-extraction, onboarding, analytics-intelligence.
  Outcome:     6 rubrics drafted, QC-passed
  Exec:        PARALLEL
  Deps:        Step 17 complete (or interleaved)
  Marker:      HANDOFF
  Time:        35 min
  Test:        (same as Step 17)
```

```
Step 19 — P2.2c: Bean confirmation pass
  Model:       inline
  Action:      Bean spot-checks 3 of 13 pipeline rubrics; bulk-confirms rest after Stage QC findings addressed.
  Outcome:     All 13 pipeline rubrics bean_signoff: confirmed
  Exec:        SEQUENTIAL
  Deps:        Steps 17–18 complete
  Marker:      QA
  Time:        15 min
  Test:        (same as Step 16)
```

### Group E — Tooling spec finalisation + G2 exit

```
Step 20 — Update tooling spec with confirmed-rubric references
  Model:       inline
  Action:      Read all confirmed rubrics across P2.2a Track 1, Track 2, P2.2b, P2.2c. Update .claude/specs/2026-04-27-optimisation-toolkit-design.md: §10.1 rubric paths corrected (interactivity-capture exists, not "NEW"), §5 Phase 2 reflects actual scope, any §5 Phase 4 scope adjustments surfaced during rubric drafting.
  Files:       .claude/specs/2026-04-27-optimisation-toolkit-design.md
  Outcome:     Spec aligned with confirmed rubrics; ready as Phase 4 input
  Exec:        SEQUENTIAL
  Deps:        Steps 13, 16, 19 complete
  Marker:      (none)
  Time:        30 min
  Tooling:     Read, Edit
  Test:
    Happy:       Spec §10.1 paths match disk; §5 Phase 2 reflects actual roster; no orphan references
    Edge:        Rubric drafting surfaced a Phase 4 scope change → log to decisions.md
    Fail:        Spec contradicts disk state → reconcile, re-present
    Integration: feeds Phase 3 + Phase 4
```

**QA Gate 2 — G2 milestone**
```
QA Gate 2 — G2: Rubrics confirmed + tooling spec finalised
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Steps 11, 13, 16, 19, 20 complete
  Check:   Four assertions:
           1. Track 1 — 9 skills with bean_signoff: confirmed rubrics + skillscore ≥85% (10 paths total with email-html-builder)
           2. Track 2 — 4 skills with bean_signoff: confirmed rubrics (no skillscore requirement, parked)
           3. P2.2b registry has 50+ rubric files for RUBRIC-classified tools
           4. P2.2c — 13 pipeline rubrics bean_signoff: confirmed
           5. Spec §10.1 reflects disk state
           6. dispatch-graph-validator clean
  Pass:    All 6 assertions pass
  Fail:    Any failing → return to relevant step
  Marker:  QA
```

```
Step 21 — G2 milestone POST + state update
  Model:       inline
  Action:      Update .claude/state.md current_phase → phase-3-gap-analysis. Add to .claude/decisions.md: "Phase 2 v2 restructure (2026-04-30) — two-track P2.2a; structural debt parked to G2.5 except seo-technical (done) and email-html-builder (independent of tooling spec). 9 deletion-bound migration notes deferred to Phase 4." POST G2 milestone to Blub knowledge API.
  Files:       .claude/state.md, .claude/decisions.md
  Outcome:     state.md → phase-3; decisions.md updated; G2 POST confirmed
  Exec:        SEQUENTIAL
  Deps:        QA Gate 2 complete
  Marker:      HANDOFF
  Time:        10 min
  Tooling:     Write, Edit, Bash (curl)
  Test:
    Happy:       state.md → phase-3; curl returns 200; decisions.md has restructure note
    Edge:        API unreachable → pending_upload flag in session-insights.json
    Fail:        state.md write fails → write to state.md.tmp, alert Bean
    Integration: blub.db / knowledge API (non-blocking)
```

---

## G2.5 — Deferred work (does NOT run in Phase 2)

This section catalogues work parked from Phase 2 to be picked up after the tooling spec is finalised AND Phase 4 design-brain spec is settled.

### G2.5 — Track 2 optimiser passes (4 skills)

After tooling spec is finalised:
- `/extract` /skill-optimiser pass against confirmed rubric
- `/harden` /skill-optimiser pass
- `/ethics-gate` /skill-optimiser pass (and/or refactor as Phase 4.3.3 shared module)
- `/interactivity-capture` /skill-optimiser pass

### G2.5 — Structural debt content fixes (3 agents + seo-technical content)

After confirmed rubric for each:
- `design-reviewer` — body 585→≤300 lines, HARD GATE tags, correction ledger, 8 tool decls, 6 magic numbers
- `seo-auditor` — When NOT to Use body, ## Goal, ## Common Mistakes, correction ledger, HARD GATE, shared-refs
- `sgs-extraction` — System Effect / 6-lens section
- `seo-technical` — A-grade rubric gaps (score-methodology formula, business-impact-translation, evidence-quality, ai-crawler-management opportunity)

### G2.5 — 9 deletion-bound migration notes

After Phase 4.1 design-brain DB schema (philosophy_rules) is settled:
- `/critique`, `/adapt`, `/colourise`, `/bolder`, `/quieter`, `/normalize`, `/polish`, `/distill`, `/delight`
- Extract End-Goal criteria + Never Do + philosophy_rules candidates → `.claude/plans/phase-4-migration-notes.md`

---

## Key Judgement Calls

### Primary decisions (settled in this restructure)

- **Decision:** Two-track P2.2a — full pass on independents, rubric-only on tooling-dependents.
  - **Why:** The 9 independent skills are the engine of Phase 2 (capture-lesson, qc, phase-planner etc. run during P2.2b/c). Optimising them pays back inside the phase. Tooling-dependent skills risk rework if optimised before spec is finalised.
  - **Cost of wrong choice:** Rolling them all into one batch either wastes effort (pre-spec optimisation) or starves Phase 2 of improvements that compound through it.
  - **Settled.**

- **Decision:** Park 3 of 5 structural debt targets to G2.5.
  - **Why:** design-reviewer / seo-auditor / sgs-extraction are tooling-spec subjects. Fixing them before rubric + spec confirm risks rework. seo-technical structural pass already done; email-html-builder is independent of tooling spec.
  - **Settled.**

- **Decision:** Defer 9 deletion-bound migration notes to Phase 4.
  - **Why:** What migrates to philosophy_rules depends on Phase 4 DB schema being settled (4.1.1–4.1.5). Doing notes now risks redoing them.
  - **Settled.**

### Pre-emptive decisions (Hidden Decisions pass — collapsed inline per blub.db pattern)

- **What if /interactivity-capture's existing rubric is well-formed v2 already?** — Keep as-is, mark bean_signoff: confirmed without amendment. Spec §10.1 still needs updating from "NEW — build in Phase 4" to "exists at ~/.agents/skills/interactivity-capture/".
- **What if Stage QC reviewer panel finds a rubric needs full rework, not just amendment?** — Flag in inline summary, ask Bean if rework or accept-with-known-gaps. Don't loop indefinitely; cap at 2 rework rounds per rubric.
- **What if a P2.2b RUBRIC-classified tool has no SKILL.md (orphan)?** — Note in registry as "orphan — needs SKILL.md before rubric can be drafted", add to .claude/parking.md. Don't block.
- **G2 dependency on tooling spec finalisation:** Step 20 is the spec-update step. If spec-update surfaces a contradiction with confirmed rubrics, reconcile inline before G2.5 starts.

---

## Effort and shape

| Step group | Wall-clock | Session shape |
|------------|-----------|---------------|
| Group A (Track 1) | ~3 hr | 2-3 sessions of 1-1.5 hr each |
| Group B (Track 2) | ~1 hr | 1 session |
| Group C (P2.2b) | ~2 hr | 1-2 sessions |
| Group D (P2.2c) | ~1.5 hr | 1 session |
| Group E (spec + G2) | ~45 min | 1 session |
| **Total Phase 2** | **~8.5 hr** | **~5-7 sessions** |

G2.5 work runs after Phase 4 design-brain spec is settled — separate phase planning.
