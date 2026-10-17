---
doc_type: dev-setup
filename_glob: "dev-setup.md"
required_sections: []
optional_sections:
  - "Project structure"
  - "Build process"
  - "Deployment process"
  - "Environment and tools"
  - "Known gotchas"
require_h1: true
max_lines: 1500
freshness_days: 180
---

# Dev-Setup Template

## Purpose

Project-level operational guide for developers / Claude Code sessions. Covers: build commands, deploy procedure, SSH details, local dev setup, scaffolding patterns, known gotchas. Per Phase 13 doc-op standard (2026-05-24), `dev-setup` is the operational counterpart to `architecture.md` (which carries system design + decisions): one says HOW, the other says WHAT.

This template was extracted from `architecture.md` during the 2026-05-24 Phase 10 D'-1 split — operational content was bloating the architecture doc with how-to-deploy detail unrelated to system shape.

## Mandatory frontmatter

```yaml
---
doc_type: dev-setup
title: <project> dev setup
project: <project-slug>
last_updated: YYYY-MM-DD
---
```

## Canonical structure

1. Project structure (directory tree at a glance)
2. Build process (npm / make / build commands)
3. Creating a new component / block / module (scaffold guide)
4. Deployment process (commands, environments, rollback)
5. Environment and tools (SSH, secrets, third-party CLI)
6. Known gotchas (pitfalls a new contributor would hit)

Sections optional — include only what's relevant to the project.

## Scoring criteria

### Structural (40%)
- YAML frontmatter present
- H1 title present
- Line count ≤ 1,500

### Completeness (30%)
- No stub markers
- Commands include actual examples (not "run the deploy command")

### Quality (20%)
- UK English (CLI flags + shell identifiers in `code` spans exempt)
- Plain English with concrete commands
- Specific over generic — paths, hostnames, port numbers in backticks

### Freshness (10%)
- `last_updated` within 180 days (deploy procedures rot fastest)

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Architectural decisions in dev-setup | Move to `architecture.md`, or state as current truth in the spec/plan doc it changes |
| Vague "run the build command" | Cite the exact command in a backtick block |
| Outdated SSH host / port | `last_updated` should be bumped when ops details change |
| Mixing per-client setup with framework setup | Per-client setup goes in `sites/<client>/` |
