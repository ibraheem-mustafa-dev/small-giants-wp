---
doc_type: claude-md
required_sections: []
optional_sections:
  - "Verification Rule"
  - "Completion Rule"
  - "Project Context"
  - "Canonical structure"
  - "Authoritative pointers"
  - "Project Lifecycle"
  - "Style Guidelines"
  - "Non-Negotiables"
  - "Conventions"
require_h1: false
max_lines: 80
freshness_days: 90
max_important_markers: 5
forbid_inferable_knowledge: true
---

# CLAUDE.md Template

## Purpose

Project rulebook for the AI agent. Per Phase 13 doc-op standard (2026-05-24), CLAUDE.md follows Karpathy's BEHAVIOUR-OVER-STRUCTURE principle distilled in `~/.claude/memory/research/2026-05-24-spec-docs-and-karpathy-manifest-best-practice.md`: rules describe how Claude should ACT, not what the codebase IS. Architecture lives in `architecture.md`; mission in `plans/current_mission.md`; decisions are stated as current truth in the spec/plan/CLAUDE.md doc they change (plus the commit message) — no separate decisions log; deploy in `dev-setup.md`.

## Karpathy rules (R1-R7) — encoded as the writing standard

**R1 — Behaviour over structure.** Every rule changes how Claude acts. If a rule describes a fact about the codebase (a noun statement), it belongs in `architecture.md`, not here. Verb-first rules (do X / don't do Y / when X, do Y) belong here.

**R2 — Success criteria over procedures.** "Loop on this until X is verified" beats "follow these N steps". Express acceptance as a measurable outcome; let the model find the path.

**R3 — Line cap ≤ 80.** Beyond this, Claude starts losing rules. Use `@path/to/import` to split domain knowledge into sub-files that load on demand.

**R4 — Pruning trigger.** If Claude violates a rule 3+ times, the file is too long. If Claude asks questions the file answers, the phrasing is ambiguous. Both signals → prune or clarify.

**R5 — No inferable knowledge.** Never include what Claude can derive by reading code. Only human-explicit context: env vars, deployment quirks, non-default conventions, gotchas with no code signal.

**R6 — IMPORTANT marker discipline.** Use `IMPORTANT:` or `YOU MUST` only on the rules Claude most frequently violates. ≤ 5 markers per file — overuse dilutes the signal.

**R7 — Hooks over repeated rules.** If a rule has been violated despite being in the file, convert it to a PostToolUse / PreToolUse hook. Hooks are deterministic; CLAUDE.md is advisory. After a rule lands as a hook, remove it from CLAUDE.md.

## Required Sections

- **Verification Rule** — Boris Cherny pattern: before doing any work, state how the work could be verified.
- **Completion Rule** — no hedging, no stubs, no "we could table this." Finish the thing or name the blocker.
- **Project Context** — 3–6 lines: stack, constraints, anything a fresh agent must know in the first minute. R5 applies: only what Claude can't derive.

## Optional Sections

- **Project Lifecycle** — checklist stages this project uses (e.g. `init → plan → phase → grade → sync`).
- **Style Guidelines** — UK English, casing, file-path conventions.
- **Non-Negotiables** — project-specific hard rules.
- **Authoritative pointers** — table of canonical docs (architecture / decisions / specs / pipeline-flow) so Claude knows where to look rather than restating content inline (R5 applies).

## Scoring Criteria

### Structural (40%)
- Required sections present (Verification Rule, Completion Rule, Project Context)
- Heading hierarchy clean (require_h1 optional — H2-first acceptable for manifest-style)
- Line count ≤ 80 (R3)
- `IMPORTANT:` / `YOU MUST` marker count ≤ 5 (R6)

### Completeness (30%)
- No `TODO` / `TBD` / placeholder stubs
- Each required section has ≥ 30 chars of real content
- No inferable-knowledge violations (R5): file paths derived by `ls` and naming conventions derived by reading 3 files DO NOT belong here

### Quality (20%)
- Verification-loop directive text present (not just heading)
- Completion / no-stubs rule text present (not just heading)
- UK English throughout
- No hedging language on rules
- Verb-first rule framing (R1) — rules read as actions, not descriptions

### Freshness (10%)
- File mtime within 90 days

## Example (minimal, manifest-style — passes all rules)

```markdown
# Project Rules

## Verification Rule
Before doing any work, state how that work could be verified. Every change needs a test or a manual-check command written into the task notes. If verification isn't possible, say so explicitly.

## Completion Rule
No hedging. No stubs. Finish the thing or name the blocker.

## Project Context
Node 20 LTS, TypeScript 5.4, React 18. Postgres 16. Deploys: Vercel (app), Fly.io (workers). Secrets in `.env.local` (gitignored).

## Authoritative pointers
- Architecture: `architecture.md`
- Decisions: stated as current truth in the doc they change (spec/plan/CLAUDE.md) + the commit message — no separate decisions log
- Specs: `specs/` (numbered)
- Pipeline overview: the project's canonical pipeline spec (e.g. `specs/31-UNIVERSAL-CLONING-PIPELINE.md` on small-giants-wp — check the project's own spec roster for its pointer; standalone `cloning-pipeline-flow.md`/`-stages.md` files are a legacy shape, archived on small-giants-wp 2026-07-28)

## Non-Negotiables
- UK English in all output
- 44px minimum touch targets (WCAG 2.2 AA)
- IMPORTANT: never commit `.env*` files
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Architecture details in CLAUDE.md | Move to `architecture.md` (R5) |
| Mission details in CLAUDE.md | Move to `plans/current_mission.md` |
| Verification rule as heading only | Add the directive text — heading alone fails content check |
| Over 80 lines | Prune (R3); reference canonical docs instead of restating |
| Hedging language ("maybe", "possibly") | Rules must be direct; commit or delete |
| `IMPORTANT:` on every rule | Limit ≤ 5 (R6) — emphasis dilutes when overused |
| Noun-style rules ("the project uses X") | Reframe as verbs ("when working with X, do Y") (R1) |
| Step-by-step procedures | Reframe as success criteria + let Claude loop (R2) |
| Rules that have been violated 3+ times | Convert to a hook (R7) and remove from CLAUDE.md |
