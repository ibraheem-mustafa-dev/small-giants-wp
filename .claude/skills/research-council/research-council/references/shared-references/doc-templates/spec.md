---
doc_type: spec
filename_glob: "[0-9][0-9]-*.md"
required_dir: "specs"
required_sections: []
optional_sections:
  - "Problem statement"
  - "Who this is for"
  - "Background"
  - "Goals"
  - "Non-goals"
  - "Hard constraints"
  - "Out of scope"
  - "Functional Requirements"
  - "Non-functional Requirements"
  - "Architecture"
  - "Data Model"
  - "Acceptance Criteria"
  - "Phasing"
  - "Migration"
  - "Open Questions"
require_h1: true
max_lines: 1500
freshness_days: 180
require_status_field: true
allowed_status_values:
  - draft
  - active
  - shipped
  - deferred
  - cancelled
  - locked
  - superseded
  - retired
require_spec_version: true
require_spec_id: true
require_title: true
require_lock_reason_when_locked: true
forbid_inline_todo_outside_open_questions: true
fr_id_pattern: "FR-{spec_id}-{N}"
fr_must_have_test_or_done_when: true
---

# Spec Template

## Purpose

Numbered architectural specifications for the project. Each spec is a SRS (system requirements specification) + SDD (system design document) for one feature / component / contract. Per Phase 13 doc-op standard (2026-05-24), the canonical shape is derived from RFC 2119 + TC39 + IEEE 1016-2009 + ARC42 + spec-writer-vs-corpus audit (Bean 2026-05-24); see `~/.claude/memory/research/2026-05-24-spec-docs-and-karpathy-manifest-best-practice.md`.

Filename convention: `.claude/specs/[NN]-NAME-IN-CAPS-OR-KEBAB.md` where `NN` is two-digit prefix. Non-numbered files in `.claude/specs/` are relocation candidates (move to `plans/` or `reports/`) UNLESS they are README.md, naming-conventions, or `doc_type: reference|catalogue` files.

## Mandatory frontmatter

```yaml
---
doc_type: spec               # spec | reference | catalogue
spec_id: <N>                 # integer, unique, registered in .claude/specs/README.md
spec_version: "M.m"          # MAJOR.MINOR — MINOR bump on addenda, MAJOR on structural rewrites
title: <title>
project: small-giants-wp
status: draft                # see enum below
authors: name(s)
session_date: YYYY-MM-DD
last_verified: YYYY-MM-DD    # date someone last confirmed spec matches implementation
status_history:
  - YYYY-MM-DD: v0.1 — initial draft
references: []               # repo-relative paths to companion specs/plans
absorbs: null                # spec_id of superseded spec, or null
absorbed_by: null            # spec_id of superseding spec, or null
lock_reason: null            # required when status=locked
---
```

`last_verified` is the staleness signal. Every `/handoff` doc-walk should bump it if the spec was confirmed accurate during the session.

## Status enum (canonical, aligned to `.claude/specs/README.md`)

- `draft` — under construction; not operative
- `active` — operative, implementation in progress
- `shipped` — implementation complete; spec captures final state
- `deferred` — paused; trigger named to revisit
- `cancelled` — abandoned; kept for archaeology only
- `locked` — frozen + FR numbers stable; revisions bump `spec_version` AND require `lock_reason`. Updates land via a new spec that `absorbs:` the locked one
- `superseded` — replaced; frontmatter names successor in `absorbed_by:`
- `retired` — feature gone; spec kept for traceability

## Canonical section order

```
> **One-liner:** [single sentence — what this builds and for whom]

## 0. Problem statement      ← problem before solution (IETF/RFC style)
## 1. Who this is for        ← audience table (role | what they get)
## 2. Goals & non-goals      ← what success looks like + what's out of scope
## 3. Hard constraints       ← constraint | source | non-negotiable Y/N
## 4. Functional Requirements ← FR-{spec_id}-{N} | requirement | priority | test
## 5. Non-functional requirements
## 6. Architecture / design decisions
## 7. Data model / schemas
## 8. Acceptance criteria    ← metric | target | how measured
## 9. Phasing                ← Phase N heading per wave
## 10. Migration / deprecations
## 11. Open Questions        ← table: question | owner | due
```

Sections may be omitted if genuinely N/A; order must not be inverted.

## Functional requirements

- Numbered with stable IDs `FR-{spec_id}-{N}` (e.g. `FR-36-1` for Spec 36's first requirement). Never renumber.
- Each FR ends with a Test or `Done when` clause naming a binary check, command, grep, or measurable signal.
- Use RFC 2119 normative keywords (`MUST`, `SHOULD`, `MAY`).
- Mark retired FRs `RETIRED` in place — never delete the row.

## Acceptance criteria (standalone section)

One row per FR with measurable outcome — not a vague checklist:

```markdown
| FR | Metric | Target | How measured |
|---|---|---|---|
| FR-36-1 | First-paint LCP on /sample-page | ≤ 2.5s | Lighthouse run after deploy |
| FR-36-2 | Computed-parity score on hero/375 | ≥ 95% | `node scripts/parity/draft-live-walk.mjs <config.mjs> --out <dir>` |
```

Or short Given-When-Then for behavioural FRs. This section is what phase gates consume.

## Cross-references

- YAML `references:` list for machine-readable links
- `§N.N` prose notation for inline references (e.g. "Spec 36 §4")
- `absorbs:` / `absorbed_by:` fields for spec supersession

Use repo-relative paths (not absolute, not URLs for internal docs).

## Length

Soft cap 300 lines for new specs. Existing specs over the cap are tolerated up to 1500 lines (max_lines) — split into parent + sub-specs (e.g. Spec 35 + Spec 35A) when growing beyond that. Inline implementation code is a drift signal — prune to the design level.

## Locked specs

When `status: locked`:
- `lock_reason:` is required in frontmatter
- A human-readable note at the top of the doc explains what triggers a revision review
- Updates land via a new spec that `absorbs:` the locked one, not in-place editing

No silent locks.

## Open Questions section

All TODO / FIXME / pending content lives in the dedicated Open Questions section. Inline `// TODO` or `> Note: pending` outside that section is forbidden — they get lost.

## Doc-type variants (spec / reference / catalogue)

- `doc_type: spec` — full template applies (this file)
- `doc_type: reference` — relaxed: no FR requirements, no acceptance criteria, no phasing (e.g. Spec 21 pipeline-state artefacts catalogue)
- `doc_type: catalogue` — append-only catalogue of items (e.g. common-wp-styling-errors.md); only requires frontmatter + line cap + freshness

## Scoring criteria

### Structural (40%)
- Filename matches `[0-9][0-9]-*.md` pattern OR is `README.md` / `naming-conventions.md`
- YAML frontmatter present with all 7 mandatory keys
- H1 title present
- Max-lines ≤ 1500
- Status enum value is canonical
- Locked status carries `lock_reason`

### Completeness (30%)
- FRs end with `Done when` / `Test` clauses (when `doc_type: spec`)
- Cross-references resolve (U5 check)
- No inline `TODO` / `FIXME` outside Open Questions section
- `last_verified` not stale relative to code changes
- FR IDs match `FR-{spec_id}-{N}` pattern (when `doc_type: spec`)

### Quality (20%)
- UK English (web-platform identifiers in `code` spans exempt)
- Plain English
- Specific over generic
- No hedging on acceptance criteria

### Freshness (10%)
- `last_verified` within 180 days OR `status: locked`

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Renumbering FRs on revision | Never renumber — append; mark superseded as RETIRED |
| Inline `TODO` in middle of spec | Move to Open Questions section |
| `status: locked` without `lock_reason` | Add lock_reason — silent locks rot |
| FR without `Done when` / `Test` clause | Acceptance is binary; vague FRs are not requirements |
| Restating a decision's rationale from elsewhere | State it once, where it's current truth (the spec/plan it changed), and link to that rather than duplicating |
| Spec drifted past 300 lines | Split into parent + sub-spec OR prune implementation detail |
| Non-numbered file in `.claude/specs/` | Relocate to `plans/` or `reports/` UNLESS it's README / naming-conventions / `doc_type: reference\|catalogue` |
| `last_verified` stale by months | Bump every session that touches the spec's implementation |
| Bare `FR-001` IDs | Use `FR-{spec_id}-{N}` to prevent cross-spec ID collisions |
| Inline addendum blocks accumulating at top of spec | Bump `spec_version` + add `status_history` entry instead |
