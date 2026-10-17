---
doc_type: strategic-plan
required_dir: "plans"
required_sections:
  - "Out of scope"
  - "Phase overview"
optional_sections:
  - "Problem"
  - "Plain-English summary"
  - "Solution shape"
  - "Out of scope"
  - "Phase overview"
  - "Dependency Graph"
  - "Work Units"
  - "Risk Register"
  - "Effort Summary"
  - "Session Plan"
  - "Hidden Decisions"
  - "Per-phase handoff"
  - "Open Questions"
require_h1: true
max_lines: 2000
freshness_days: 90
require_timebox_field: true
require_out_of_scope_section: true
require_roam_risk_status: true
require_phase_overview_table: true
require_dependency_owner_column: true
milestone_count_max: 13
allowed_status_values:
  - draft
  - active
  - shipped
  - superseded
  - cancelled
---

# Strategic Plan Template

## Purpose

Multi-phase roadmap that takes an idea from "we want to ship X" to "phase-by-phase plan with gates, risks, dependencies, and per-phase handoffs to `/phase-planner`". Per Phase 13 doc-op standard (2026-05-24), the canonical shape merges learned wisdom from the `strategic-plan` skill's `plan-template.md` (rich Work Unit + GATE blocks + Effort Summary tables) with research-distilled anti-pattern fixes from Shape Up / SAFe / PMI / OKR / Stage-gate (Out-of-scope section, ROAM risk register, timebox-first appetite, dependency owner column). Full research: `~/.claude/memory/research/2026-05-24-strategic-plan-and-phase-plan-best-practice.md`.

## Mandatory frontmatter

```yaml
---
doc_type: strategic-plan
project: <project-slug>
plan_name: <YYYY-MM-DD-<feature-name>>
generated: YYYY-MM-DD
timebox: "<appetite — e.g. '6 weeks' / '2 sessions' / '~13 hrs'>"
status: draft                # draft | active | shipped | superseded | cancelled
authors: <names>
primary_goal: "<one-sentence outcome>"
motivation: "<why this matters — surface on re-entry after 7+ days per ADHD Rule 3>"
parent_plan: null            # path to prior plan if this revises
---
```

`timebox` is the appetite Shape Up calls "the constraint that gives the team focus." Declared BEFORE the feature list, not after.

## Canonical structure

```
# <Title>

## 1. Problem (≤ 200 words)             ← Specific story, not abstract
## 2. Plain-English summary (optional)   ← Problem → Effect → Solution
## 3. Solution shape                     ← What we'll do at a glance
## 4. Out of scope                       ← "No-Gos" — explicit list (HARD GATE)
## 5. Phase overview                     ← Table: phase / name / timebox / deliverable / depends-on (≤13 rows)
## 6. Dependency Graph                   ← ASCII or table with owner column
## 7. Work Units                         ← Per-unit blocks (Purpose / Files / Depends / Blocks / Estimate / Risk / Steps / VERIFY)
## 8. Gates                              ← Per-gate Pass/Fail/Decision blocks
## 9. Risk Register                      ← Table with ROAM status enum (Resolved/Owned/Accepted/Mitigated)
## 10. Effort Summary                    ← Per-unit time + cumulative
## 11. Session Plan                      ← Sessions × units × gate (project-specific)
## 12. Per-phase handoffs                ← Trigger / Entry context / Plan-Level Label hint per phase
## 13. Hidden Decisions (post-review)    ← Filled by Phase 5.2 cold reviewers
## 14. Open Questions                    ← Parking lot for unresolved questions
```

Sections may be omitted if genuinely N/A; order should not be inverted.

## Risk Register — ROAM status enum (S3)

```markdown
| Risk | Phase | Likelihood | Impact | Status | Mitigation / Owner |
|------|-------|-----------|--------|--------|--------------------|
| ... | ... | H/M/L | H/M/L | Resolved \| Owned \| Accepted \| Mitigated | ... |
```

`Status` must be one of `Resolved | Owned | Accepted | Mitigated`. Free-text status ("discussed", "thinking about") fails the check — forces resolution.

## Dependency owner column (S4)

Every dependency row in the dependency graph/table names an owner (person, agent, or "framework"). Stops orphan blockers.

## Phase overview table (S8 — MANDATORY)

```markdown
| Phase | Name | Timebox | Deliverable | Depends on | Gate |
|-------|------|---------|-------------|------------|------|
| 1 | <name> | <hrs/sessions> | <thing> | none | <criterion> |
| 2 | <name> | <hrs> | <thing> | Phase 1 | <criterion> |
```

Milestone count cap: ≤ 13 rows (PMI). Beyond this, mental model collapses.

## Scoring criteria

### Structural (40%)
- YAML frontmatter present with all mandatory keys
- H1 title present
- Line cap ≤ 2,000
- Status enum canonical (draft/active/shipped/superseded/cancelled)
- `timebox` field non-empty in frontmatter
- `## Out of scope` section present (S2 — HARD)
- Phase overview table present (S8) with ≤ 13 rows

### Completeness (30%)
- Dependency table has owner column populated
- Risk register status column uses ROAM enum only
- Every milestone gate has exit criteria (Pass/Fail)
- `## Problem` section ≤ 200 words (forces specificity)
- No stub markers outside Open Questions

### Quality (20%)
- UK English (code-fence identifiers exempt)
- Plain English
- Specific over generic (file paths, commands, metrics)
- Effort estimates avoid 3x ranges (no "4-30 hrs" — signals padding)

### Freshness (10%)
- `last_updated` within 90 days OR `status: shipped` (shipped plans intentionally stable)

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Skipping `## Out of scope` | Add it — single most-cited anti-pattern across 11 sources |
| Risk register status = free text | Use ROAM enum — Resolved/Owned/Accepted/Mitigated |
| Timebox declared after feature list | Move to frontmatter — Shape Up's #1 rule |
| Dependency table without owner column | Add the column — catches orphan blockers |
| Phase count > 13 | PMI cap — split into multiple strategic plans |
| Problem section abstract or > 200 words | Specific story, ≤ 200 words |
| Effort estimates 3x ranges ("4-30 hrs") | Signals padding — quote smallest plausible |
