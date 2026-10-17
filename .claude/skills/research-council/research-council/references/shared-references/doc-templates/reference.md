---
doc_type: reference
required_sections: []
optional_sections: []
require_h1: false
max_lines: 3000
freshness_days: null
---

# Reference Template

## Purpose

Catalogues, inventories, archives, and similar reference documents that don't fit `spec` / `plan` / `handoff` / `decisions` / `mistakes` / `parking` shapes. Per Phase 13 doc-op standard (2026-05-24), `reference` is the catch-all for:

- Archive overflow files (`memory/<name>-archive.md`)
- Pipeline-state artefact inventories (`specs/21-*.md` carries this doc_type even though numbered)
- Catalogues of items (e.g. `specs/common-wp-styling-errors.md`)
- Operational quick-references that aren't full specs

References are intentionally low-ceremony — frontmatter + line cap + UK English are the only structural rules. No required sections, no FR IDs, no acceptance criteria.

## Mandatory frontmatter

```yaml
---
doc_type: reference
title: <descriptive title>
project: <project-slug>
generated: YYYY-MM-DD          # when the reference was created
last_updated: YYYY-MM-DD       # most-recent edit
canonical: true | false        # whether downstream consumers cite this as source-of-truth
purpose: |
  Multi-line description of what this catalogue/archive holds and when to read it.
---
```

## Scoring criteria

### Structural (40%)
- YAML frontmatter present with required keys
- Line count ≤ 3,000
- Heading hierarchy clean

### Completeness (30%)
- No stub markers (TODO, FIXME, TBD) in body
- Substantive content per section (if sections present)

### Quality (20%)
- UK English (web-platform identifiers in `code` spans exempt)
- Plain English
- Specific over generic

### Freshness (10%)
- No freshness requirement — references are intentionally stable

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Missing frontmatter | Add the 5-key block above |
| Confusing `reference` with `spec` | Specs have FRs + acceptance criteria. References don't. If you find yourself writing FRs, it's a spec. |
| Treating an active plan as a reference | Active plans use `doc_type: phase-plan` / `strategic-plan`. Move when shipped/archived. |
| Old content with no `last_updated` bump | Archives are stable but should track when content was last reviewed for accuracy |
