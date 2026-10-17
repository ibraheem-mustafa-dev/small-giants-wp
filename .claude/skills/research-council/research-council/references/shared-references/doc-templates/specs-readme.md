---
doc_type: specs-readme
required_sections:
  - "Specification Index"
  - "Specification Standards"
optional_sections:
  - "Change Process"
max_lines: null
freshness_days: 60
---

# Specs README Template

## Purpose

Acts as the entry point for all formal specifications. It provides an index of specs and the standards they must follow.

## Required Sections

- Specification Index: List of all files in the specs/ folder with descriptions.
- Specification Standards: Rules for writing new specs.

## Scoring Criteria

### Structural (40%)
- Required sections present
- Links to spec files (if applicable)

### Completeness (30%)
- All specs in the folder are listed
- Clear standard definitions

### Quality (20%)
- Consistency in naming
- UK English spelling

### Freshness (10%)
- Updated within 60 days

## Example (minimal-but-passing)

```markdown
# Specifications Index

## Specification Index
- [001-parser.md](001-parser.md): Technical spec for the YAML parser.
- [002-reporting.md](002-reporting.md): JSON output schema.

## Specification Standards
- All specs must include a revision history.
- Use RFC-style language (MUST, SHOULD, MAY).
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Missing links | Ensure every spec file has a corresponding link |
| No standards | Define what makes a good spec for this project |
