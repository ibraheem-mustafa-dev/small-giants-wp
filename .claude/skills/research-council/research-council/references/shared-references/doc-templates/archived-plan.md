---
doc_type: archived-plan
required_dir: "archive"
required_grandparent_dir: "plans"
required_sections: []
optional_sections:
  - "Summary"
  - "Phases shipped"
  - "Outcome"
require_h1: true
max_lines: 3000
freshness_days: null
---

# Archived-Plan Template

## Purpose

Completed, superseded, or cancelled multi-phase plans that are no longer the active execution path. Lives in `.claude/plans/archive/`. The plan body is preserved verbatim for audit + reference, but is no longer the source of truth for any in-flight work — that role passes to whatever active phase plan / strategic plan / spec replaced it.

## Mandatory frontmatter

```yaml
---
doc_type: archived-plan
title: <plan name>
project: <project-slug>
archived: YYYY-MM-DD         # date the plan was archived
shipped_via_commits: [<sha>, ...]   # commits that closed the plan, if any
superseded_by: <path>        # active plan that replaced this one, if any
status: shipped | superseded | cancelled
---
```

## Scoring criteria

### Structural (40%)
- YAML frontmatter present
- H1 title present
- Line count ≤ 3,000
- Heading hierarchy clean

### Completeness (30%)
- No stub markers (TODO outside Open Questions sections)
- Phases marked complete or explicitly cancelled

### Quality (20%)
- UK English (web-platform identifiers in `code` spans exempt)
- Plain English
- Specific over generic — commit SHAs cited where work shipped

### Freshness (10%)
- No freshness requirement — archived plans are intentionally static

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Editing an archived plan to reflect new work | Don't. Add the new work to a NEW active phase plan; cite the archived plan as `references:` |
| Missing `superseded_by:` when replaced | Add it — chain of provenance breaks without it |
| `status: shipped` without commit SHAs | Cite the commits that closed the plan |
| Inline `// TODO` in archived plan | Open Questions should have been resolved before archiving |
