---
doc_type: phase-plan
filename_glob: "*phase-*.md"
required_dir: "plans"
required_sections:
  - "Pre-conditions"
  - "Parking lot"
optional_sections:
  - "Reframing"
  - "Phase Header"
  - "Phase success criteria"
  - "Entry context"
  - "References"
  - "Tooling Index"
  - "Dispatch bindings"
  - "Steps"
  - "Key Judgement Calls"
  - "Living docs to update"
  - "Parking lot"
require_h1: true
max_lines: 2000
freshness_days: 60
require_parent_plan: true
require_pre_conditions_section: true
require_parking_lot_section: true
require_step_pavr_format: true
require_no_shared_file_parallel: true
allowed_status_values:
  - draft
  - active
  - shipped
  - cancelled
  - superseded
allowed_step_markers:
  - SESSION-START
  - HANDOFF
  - QA
  - "(none)"
---

# Phase Plan Template

## Purpose

Detailed step-by-step execution plan for a single phase of a strategic plan. Per Phase 13 doc-op standard (2026-05-24), the canonical shape merges learned wisdom from the `phase-planner` skill's 14-field step block (Model / Action / Files / Inputs / Outcome / Exec / Marker / Time / Tooling / On-Fail / Cold-Entry / Prompt / 4-layer Test) with research-distilled additions from DevOps runbook + Ansible playbook + Claude Code best practices (Pre-condition step field, Rollback field, `## Pre-conditions` checklist section, `## Parking lot` section, cold-prompt readiness for parallel steps, no-shared-file-parallel rule). Full research: `~/.claude/memory/research/2026-05-24-strategic-plan-and-phase-plan-best-practice.md`.

## Mandatory frontmatter

```yaml
---
doc_type: phase-plan
project: <project-slug>
phase: <N>                              # phase number
title: <phase title>
parent_plan: .claude/plans/<strategic-plan>.md    # MANDATORY — links to parent
plan_label: opus | sonnet               # which model can BE the inline session
generated: YYYY-MM-DD
status: draft                           # draft | active | shipped | cancelled | superseded
authors: <names>
primary_goal: "<sentence>"
docscore_grade: <filled after Stage 7>
---
```

`parent_plan` is the orphan-prevention link — every phase plan must trace to a strategic plan.

## Canonical structure

```
# Phase N — <Title>

## (optional) Reframing                   ← if revising mid-phase
## Phase Header                           ← USP / docscore / aggregate cost / success criteria / entry context / references / tooling index
## Pre-conditions                         ← MANDATORY checklist (must be true BEFORE start) (P2)
## Dispatch bindings                      ← Apply-to-every-agent rules for this phase
## Steps                                  ← Each step in extended PAVR format (see below)
## Key Judgement Calls (KJC)              ← Decisions surfaced during plan + Hidden Decisions pass
## Living docs to update at phase close
## What success looks like (one-line)
## Parking lot                            ← MANDATORY (P10) — even if empty
```

## Step block — 16 fields (merge of OUR 14 + RESEARCH 2)

Every step uses this block:

```
Step N — <Task name>
  Model:        haiku | sonnet | inline
  Pre-condition: <what MUST be true before this step starts> (NEW — RESEARCH P3)
  Action:       <imperative — exact command / file change / operation>
  Files:        <explicit paths — supports no-shared-file-parallel check>
  Inputs:       <what this step consumes — prior-step outputs / spec sections / KJC decisions>
  Outcome:      <what "done" looks like — one sentence, testable>
  Verification: <how to check the Outcome — command / grep / test / screenshot — RENAMED from "Test" for canonical alignment>
    Happy:        <action → expected result>                                   (REQUIRED on every step)
    Edge:         <boundary condition>                                         (REQUIRED only on Marker: QA steps OR steps touching live infra — SSH/DB/REST/deploy)
    Fail:         <failure scenario + expected error handling>                 (same — QA/live-infra only; "N/A" acceptable on simple non-destructive steps)
    Integration:  <connected system or "standalone">                           (same — QA/live-infra only)
  Rollback:     <what to do if Verification fails — revert command / cleanup steps> (NEW — RESEARCH P3)
  Exec:         PARALLEL with steps N,M  |  SEQUENTIAL
  Deps:         none | step N must complete first
  Marker:       SESSION-START | HANDOFF | QA | (none)
  Estimate:     ~N min  (anchors ADHD Rule 2 smallest-first)
  Tooling:      <skills / MCPs / CLIs / commands / external tools>
  Cold-Entry:   <REQUIRED on SESSION-START markers — files a fresh session must read>
  Prompt:       <REQUIRED when Model is non-inline — pre-written subagent prompt via /subagent-prompt>
```

**No-shared-file-parallel rule (P8 HARD GATE):** No two steps marked `Exec: PARALLEL` may overlap in their `Files:` field. Prevents the 2026-04-28 race condition incident.

**Cold-prompt readiness for parallel steps (P11):** Steps marked `Exec: PARALLEL` whose Prompt is dispatched to a subagent MUST contain full context inline — no "as discussed above", "from Step N", "see earlier" references. Subagents see the prompt + nothing else.

## Markers (Marker field enum)

- `SESSION-START` — clean re-entry point; prior step committed, no open state. `Cold-Entry` MUST be populated.
- `HANDOFF` — clean stopping point; commit, update handoff doc, close session.
- `QA` — verification step; do not proceed past until check passes. ALWAYS `Exec: SEQUENTIAL`.
- `(none)` — mid-stream step, no special session significance.

QA gates insert after every 3-5 implementation steps and before any `SESSION-START` that follows a body of work.

## Scoring criteria

### Structural (40%)
- YAML frontmatter with all mandatory keys (especially `parent_plan`)
- Filename matches `phase-*-*.md` glob
- H1 title present
- Line cap ≤ 2,000
- `## Pre-conditions` section present (P2)
- `## Parking lot` section present (P10)
- Status enum canonical

### Completeness (30%)
- Every step has all 16 fields (excluding optional Cold-Entry/Prompt where N/A)
- Every parallel step pair's Files: do not overlap (P8)
- Every QA-marker step is Exec: SEQUENTIAL
- Verification: Happy+Outcome required on every step; Edge/Fail/Integration required only on `Marker: QA` steps OR steps where `Files:` touches live infra (SSH, DB, REST endpoints, deploy paths). "N/A" acceptable on simple non-destructive steps
- No stub markers outside Parking lot section

### Quality (20%)
- UK English (code-fence identifiers exempt)
- Plain English
- Parallel steps' Prompts contain no anaphoric references (P11)
- Specific over generic (file paths, commands, metrics)

### Freshness (10%)
- `last_updated` within 60 days OR `status: shipped`

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `## Pre-conditions` missing | Add the checklist — distinct from "success criteria" (after-state); pre-conditions are before-state |
| Step uses 14-field format instead of 16 | Add `Pre-condition:` and `Rollback:` fields |
| Parallel steps overlap on Files: | Resolve before commit — 2026-04-28 incident was exactly this |
| Parallel step's Prompt has "as above" / "the previous step" | Inline the context — subagent sees nothing else |
| No `## Parking lot` section | Add empty section — placeholder for mid-phase defers |
| Verification = "looks right" (not measurable) | Use command output / grep / test / screenshot |
| Estimate padded to safe upper-bound | Quote smallest plausible per `~/.claude/rules/time-estimates.md` |
| Marker SESSION-START without Cold-Entry | Cold-Entry is mandatory on these — fresh session needs it |
| Writing all 4 Verification layers for every step | Only QA-marker + live-infra steps need Edge/Fail/Integration — "N/A" is acceptable on simple non-destructive steps |
