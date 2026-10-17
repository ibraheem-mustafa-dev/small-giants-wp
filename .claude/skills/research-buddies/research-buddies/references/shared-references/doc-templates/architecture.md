---
doc_type: architecture
required_sections:
  - "System Overview"
  - "Component Diagram"
  - "Data Flow"
  - "Integration Surfaces"
optional_sections:
  - "Security Model"
  - "Deployment Pipeline"
max_lines: null
freshness_days: 30
---

# Architecture Template

## Purpose

A living document describing the system architecture, components, and data flows. It provides the mental model for how the system is built and how parts interact.

## Required Sections

- System Overview: High-level description of the system's purpose and tech stack.
- Component Diagram: Markdown-based (Mermaid) or list-based description of components.
- Data Flow: How information moves between components.
- Integration Surfaces: API definitions, file formats, or protocols.

## Scoring Criteria

### Structural (40%)
- All 4 required sections present
- Correct heading hierarchy
- Mermaid diagrams used where appropriate

### Completeness (30%)
- All components identified
- Integration points clearly defined
- No stale or removed features described

### Quality (20%)
- Technical accuracy
- Clear distinction between layers
- UK English spelling

### Freshness (10%)
- Updated within 30 days

## Example (minimal-but-passing)

```markdown
# Architecture

## System Overview
A Python-based CLI tool for scoring markdown files against templates. Uses YAML frontmatter parsing and regex analysis.

## Component Diagram
- Parser: Extracts YAML and content.
- Scorer: Applies rules to extracted data.
- Reporter: Generates JSON results.

## Data Flow
User runs CLI -> Parser reads .md -> Scorer applies logic -> Reporter outputs JSON.

## Integration Surfaces
- Input: .md files with YAML frontmatter.
- Output: Standard JSON schema for reporting.
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Outdated diagrams | Update diagrams immediately after structural changes |
| Lack of data flow | Explain how data moves, not just where it sits |
