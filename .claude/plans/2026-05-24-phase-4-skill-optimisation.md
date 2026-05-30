---
doc_type: phase-plan
phase: 4
parent_plan: .claude/plans/2026-05-24-strategic-plan.md
plan_label: opus
docscore_grade: B+ (self-assessed)
generated: 2026-05-23
renumbered: 2026-05-23 (was phase 3; Phase 2 slot now owned by header+footer cloner per strategic-plan revision)
primary_goal: "Run /skill-optimiser mode 2 + /batch-gap-analysis on the 15 WP/SGS skills now that the tools they describe have been fixed (Phases 1+2+3). LAST polish per Bean's directive."
---

# Phase 4 — Skill + command optimisation

> **Progress 2026-05-30 — 2 new operator scripts shipped + 1 ported (Stream A continuation, not Phase 4 entry):**
> - `build-deploy.py` (D3) — sandybrown canary fast-cycle deploy automation. Complements `/wp-sgs-deploy` (which remains canonical for palestine-lives.org production deploys).
> - `sync-container-wrapping-blocks.py` (D6) — expanded inheritance script; 4 blocks flagged at current threshold, threshold re-tune (4 → 20-30) deferred.
> - `assign-canonical.py` D99 port (D110) — canonical_slot backfill 2.5% → 33.4%, role 5.3% → 33.2%.
> Phase 4 entry still pending Phase 3 parking sweep close. These ops scripts feed Phase 4's eventual skill-vs-current-code grading by reducing pre-fix drift.

## Pre-conditions

Required BEFORE starting this phase (must be true to begin):

- [ ] Working tree clean on main (no uncommitted changes from prior session)
- [ ] Parent strategic plan read end-to-end (this session's context anchor)
- [ ] `pipeline-state/<latest-run>/leftover-buckets.json` reviewed if any pipeline-touching work (binding rule blub.db row 254)
- [ ] Relevant specs read (Spec 22 + Spec 17 for cloning-pipeline work; specs/02 for block work; etc. — Spec 16 retired 2026-05-26, see Spec 22)
- [ ] `~/.openclaw/workspace/memory/research/*` checked for prior research on the phase domain
- [ ] Confirmation that no in-flight uncommitted changes from earlier sessions need attention first

If any pre-condition fails, surface to Bean before proceeding — don't start the phase mid-state.

**USP:** Phases 1 + 2 + 3 fix the underlying tools/scripts/pipelines and clear parking. The skills describe those tools — so grading them BEFORE the fixes land measures stale content. Phase 4 runs AFTER, against the current code, so the gap-analysis is meaningful. Without this discipline, skills get graded against pre-fix scripts → false-positive gaps → wasted re-writes.

**Plan label:** `[PLAN: opus]` — gap-analysis runs in main conversation per blub.db row 176; multi-step analytical work; nuanced judgement on opportunity prioritisation.

**Aggregate cost estimate:** ~3-4 hrs wall-clock in a SINGLE dedicated session.

## Phase success criteria (done when)

- [ ] All 15 WP/SGS skills have a fresh `/skill-optimiser mode 2` (gap-analysis + research) evaluation
- [ ] /batch-gap-analysis review report written with per-skill scores + priority-ordered opportunities
- [ ] Each S-grade candidate has explicit Bean confirmation (S-grade screening per gap-analysis protocol)
- [ ] Per-skill JSON evaluation artefacts persisted (per /gap-analysis protocol)
- [ ] Waiting-queue documented for any opportunities deferred beyond Phase 3 close
- [ ] /handoff written; state.md current_phase advances to "post-recovery-complete"

## HARD GATE (blub.db row 176)

**/gap-analysis MUST run in main conversation, full protocol per target, NO subagent dispatch substitution.** Phase 3 is inline. Do NOT delegate the actual grading to subagents — only research-support subagents allowed (e.g. read a skill's references; do NOT have a subagent produce the grade).

## Entry context (read before starting — MANDATORY)

1. `.claude/plans/2026-05-24-strategic-plan.md` — strategic-plan parent
2. `.claude/plans/2026-05-25-phase-1-universal-extraction.md` (SHIPPED) — what changed about the converter/pipeline tools
3. `.claude/plans/2026-05-24-phase-2-parking-sweep.md` (SHIPPED) — what parking entries were closed
4. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — diagnostic artefact map
5. `.claude/cloning-pipeline-flow.md` — current pipeline state post Phases 1+2
6. `reports/phase-7-skills-audit-2026-05-22.md` + `-extended-` — Phase 7 baseline (input)
7. blub.db row 176 — gap-analysis discipline rule (https://blub.db / via curl)
8. The 14 skill SKILL.md files (read each one's frontmatter + description at minimum):
   - ~/.claude/skills/sgs-clone/SKILL.md
   - ~/.claude/skills/sgs-wp-engine/SKILL.md
   - ~/.claude/skills/sgs-discover/SKILL.md
   - ~/.claude/skills/sgs-email-branding/SKILL.md
   - ~/.claude/skills/sgs-extraction/SKILL.md
   - ~/.claude/skills/wp-abilities-api/SKILL.md
   - ~/.claude/skills/wp-block-development/SKILL.md
   - ~/.claude/skills/wp-block-themes/SKILL.md
   - ~/.claude/skills/wp-interactivity-api/SKILL.md
   - ~/.claude/skills/wp-performance/SKILL.md
   - ~/.claude/skills/wp-plugin-development/SKILL.md
   - ~/.claude/skills/wp-project-triage/SKILL.md
   - ~/.claude/skills/wp-rest-api/SKILL.md
   - ~/.claude/skills/wp-site-extraction/SKILL.md
   - ~/.claude/skills/wp-wpcli-and-ops/SKILL.md
   (15 total — verified at plan time 2026-05-23. Some prior session references said "14" — that was stale. Current canonical count = 15.)

## References

- blub.db row 176 — gap-analysis in main conversation
- `~/.agents/skills/skill-optimiser/SKILL.md` — mode 2 protocol
- `~/.agents/skills/gap-analysis/SKILL.md` — 8-step protocol
- `~/.agents/skills/batch-gap-analysis/SKILL.md` — review-report structure

## Tooling Index

| Type | Name | Used in |
|---|---|---|
| skill | `/skill-optimiser` (mode 2) | Per-skill evaluation |
| skill | `/batch-gap-analysis` | Cross-skill review report |
| skill | `/gap-analysis` | Direct per-target grade (sub-skill of batch-gap-analysis) |
| skill | `/research-check` | Research support for evaluations (subagent allowed for research, NOT grading) |
| skill | `/handoff` | Phase 3 close |
| python | `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | Verify DB state when a skill's claims need checking |
| cli | `gh` | GitHub research for WP-skill alignment claims |

---

## Execution flow

### Step 3.0 — Resume + count audit `[SESSION-START]`

```
Step 3.0 — Read Phases 1+2 close + count skills + verify protocol
  Model:       inline
  Action:      
                (a) Read post-Phase-2 handoff.md
                (b) `ls ~/.claude/skills/ | grep -E "^(wp-|sgs-)" | wc -l` — confirm 14 vs 15 actual
                (c) Read blub.db row 176 binding rule
                (d) Read /skill-optimiser SKILL.md mode 2 description
                (e) Read /gap-analysis 8-step protocol
                (f) Confirm Phase 1+2 are CLOSED in state.md
  Outcome:     Mental model of Phase 3 scope + protocol locked in
  Time:        20 min
  Tooling:     Read, Bash
  Marker:      SESSION-START
  Cold-Entry:  This phase plan + .claude/handoff.md + .claude/state.md
  Test:
    Happy: skill count matches handoff; protocol understood
    Edge: count off by 1-2 → reconcile with handoff
    Fail: blub.db row 176 inaccessible → use cached rule from CLAUDE.md
```

### Step 3.1 — Per-skill /skill-optimiser mode 2 evaluation (sequential, ~12-15 min each)

```
Step 3.1 — Run /skill-optimiser mode 2 on each WP/SGS skill
  Model:       inline /skill-optimiser (mode 2)
  Action:      For EACH skill in the entry-context list (~14-15 skills):
                 (a) Invoke /skill-optimiser with mode=2 (gap-analysis + research)
                 (b) Capture the JSON evaluation output to .claude/reports/phase-3/skill-optimiser/<skill>-2026-05-24.json
                 (c) Note S-grade candidates explicitly (require Bean confirmation per protocol)
                 (d) Note opportunities flagged for action vs deferred
  Outcome:     14-15 per-skill JSON evaluations
  Time:        12-15 min per skill × 14-15 skills = ~3 hrs
  Tooling:     /skill-optimiser
  Marker:      (none — multiple steps internally)
  Test:
    Happy: each skill returns a JSON eval; S-grades flagged
    Edge: a skill's content requires research that subagent should handle → invoke /research-check (subagent allowed for research support)
    Fail: a skill's eval errors out → surface; do NOT skip; investigate why
```

### Step 3.2 — /batch-gap-analysis review report

```
Step 3.2 — Cross-skill review report
  Model:       inline /batch-gap-analysis
  Action:      Synthesise the 14-15 per-skill evaluations into a cross-target review report at .claude/reports/phase-3/batch-gap-analysis-review-2026-05-24.md. Should include:
                 (a) Score distribution
                 (b) Common patterns across skills
                 (c) S-grade waiting queue
                 (d) Priority-ordered opportunity list
                 (e) Patterns where the underlying tool/script needs further work (regression risk)
  Outcome:     Single review report; opportunity list with priorities
  Time:        45 min
  Tooling:     /batch-gap-analysis
  Marker:      (none)
  Test:
    Happy: review report written; opportunities ranked
    Edge: most skills score similarly → surface lack of differentiation as itself a finding
    Fail: review report can't be written because eval JSONs are missing fields → re-run those skills
```

### Step 3.3 — Bean S-grade confirmations

```
Step 3.3 — Surface S-grade candidates for explicit confirmation
  Model:       inline
  Action:      For each S-grade flagged in Step 3.1, present to Bean with rationale + opportunities. Bean explicitly confirms or downgrades. Per gap-analysis protocol, S-grade requires affirmative sign-off (not just absence of objection).
  Outcome:     Each S-grade either confirmed-S or downgraded to A
  Time:        20-30 min wall-clock (depends on Bean response)
  Tooling:     /askUserQuestion or inline question
  Marker:      (none)
  Test:
    Happy: Bean signs off (or downgrades) each
    Edge: Bean wants to discuss criteria for S → log the discussion as a /capture-lesson candidate
    Fail: Bean is unavailable → defer to next session
```

### Step 3.4 — Opportunity dispatch decisions

```
Step 3.4 — Decide per opportunity: action now, defer to Phase 4, OR park
  Model:       inline /askUserQuestion + /capture-lesson if new rules surface
  Action:      For each high-priority opportunity from Step 3.2:
                 (a) Action-now: small enough to fix in this session (~15-30 min) → fix inline, /qc-inline, commit
                 (b) Defer to Phase 4: large enough to warrant its own phase → add to next-session-prompt
                 (c) Park: not Phase 3 scope (e.g. domain-specific to a future client) → parking entry
  Outcome:     Each opportunity has a docked destination (action-now SHA, Phase 4 entry, or parking ID)
  Time:        30-60 min depending on action-now scope
  Tooling:     /qc-inline, Edit, git, /capture-lesson
  Marker:      (none)
  Test:
    Happy: every opportunity docked
    Edge: an opportunity surfaces a pipeline regression → STOP; re-classify as Phase 2-residual; surface to Bean
    Fail: parking has no slot for the opportunity → create new entry inline
```

### QA Gate 3.A — Phase 3 close

```
QA Gate 3.A — Phase 3 acceptance criteria all met
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Steps 3.1-3.4 complete
  Check:   
            (a) Count of per-skill JSON evals = 14 (or count of skills audited)
            (b) Review report exists at canonical path
            (c) Each S-grade has Bean confirmation timestamp
            (d) Opportunity waiting-queue exists in writing
            (e) parking.md "Open" section contains only entries that POST-DATE Phase 3 start
            (f) state.md current_phase advances to "post-recovery-complete"
  Pass:    All 6 conditions met
  Fail:    Surface missing artefacts; either complete OR explicitly defer
  Marker:  QA
```

### Step 3.E — Phase 3 close `[HANDOFF]`

```
Step 3.E — Phase 3 close + post-recovery handoff
  Model:       inline
  Action:      Invoke /handoff. Update state.md (current_phase → "post-recovery-complete" or similar). Write next-session-prompt scoped to whatever Phase 4 work the opportunity list surfaces.
  Files:       .claude/handoff.md, .claude/next-session-prompt.md, .claude/state.md
  Outcome:     Recovery programme fully closed
  Exec:        SEQUENTIAL
  Deps:        QA Gate 3.A
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     /handoff
  Test: Happy: handoff regen; post-recovery state. Edge: opportunities defer multiple sessions → list them. Fail: /handoff stalls → manual.
```

---

## Key Judgement Calls

### Primary
- **D3A — All 14-15 skills in one session OR partition?**
  - Options: (A) all-in-one ~3hr session; (B) split into 2 sessions of 7-8 each
  - Recommendation: A
  - Why: Phase 3 only works if all skills are graded against the SAME post-Phases-1+2 state. Partitioning risks the codebase state drifting between sessions and one half of skills graded against different reality than the other.
  - Cost of wrong choice: B introduces eval inconsistency.

- **D3B — Research-support subagents allowed?**
  - Options: (A) Yes for research only, NOT for grading; (B) inline-only, no subagents at all
  - Recommendation: A
  - Why: blub.db row 176 forbids subagent DISPATCH for the grade itself. Research-only subagents (e.g. "read this skill's references and summarise X") are not the grade; they support it.
  - Cost of wrong choice: B inflates session time; A misinterpreted = lets subagents grade.

### Pre-emptive
- **Pre-empt 1:** What if /skill-optimiser mode 2 takes much longer than 12 min per skill? — Re-time after the first 3 skills. If actuals are 20+ min, partition into 2 sessions explicitly.
- **Pre-empt 2:** What if a skill fails the eval because its file structure is invalid (e.g. broken YAML frontmatter)? — That IS a finding. Don't fix mid-eval; log + continue + surface in batch-gap-analysis report.
- **Pre-empt 3:** What if Bean wants S-grade criteria changed mid-session? — Allowed. /capture-lesson the new criterion + re-grade affected skills.

## Living docs to update

- `.claude/state.md` current_phase
- `.claude/decisions.md` if S-grade criteria change OR new opportunities surface as architectural
- `.claude/parking.md` opportunities not actioned now
- `.claude/handoff.md` + `.claude/next-session-prompt.md`
- `~/.claude/skills/<skill>/SKILL.md` per-skill edits where opportunities action-now

## What success looks like

After Phase 3: 14-15 per-skill JSON evaluations exist + cross-skill review report exists + opportunity waiting-queue documented + state.md shows recovery programme complete. Next session opens with a clean parking + clean skills + measurable pipeline pixel-diff position (Phase 1 numbers held).


## Parking lot

Items surfaced during this phase that don't belong in the active step sequence — captured here so they don't get lost:

(empty at phase start — add entries as they surface; move closed items to `.claude/parking.md` archive at phase close)

