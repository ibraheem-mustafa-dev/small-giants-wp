---
doc_type: report
phase: 4
session_date: 2026-05-10
status: complete
batches_complete: [B2, B3, B4, B5, B6, B7, B8, B9]
files_touched: 45
---

# Phase 4 Propagation Summary — 2026-05-10

## Scope

Land the SGS-prefixed BEM convention rule (Spec 13) across all skill / agent / command surfaces that emit drafts, ingest external sources, dispatch subagents, or query SGS data. Single Opus session.

## Strategic decisions (Phase 4 plan KJCs)

- **KJC #1 — Subagent vs inline:** Bean confirmed Option C (Hybrid) at session open, then revised to all-inline batch propagation via a Python helper script. Rationale: 40 files × surgical inserts = scriptable; subagent dispatch adds wrap overhead without judgement gain. Result: deterministic insertion at a single anchor (`## Common Mistakes` if present, else end-of-file), uniform templates per batch family.
- **KJC #2 — Skill-touch order:** Touched in batch order B2 → B9. Cross-references stable because the canonical block has identical wording; downstream skills referencing upstream skills don't see a moving target.

## Templates used (5 variants)

| Template | Used by | Length | Notes |
|---|---|---|---|
| A — One-line ref | B3, B9 (17 files) | ~3 lines | Mini-skills and reference-only |
| B — Lingua-franca | B4 (5 files) | ~10 lines | Ingestion skills (live scrape conversion + uimax write chokepoint) |
| C — Integration note | B5, B7 (12 files) | ~5 lines | Pipeline + WP + commands |
| C-Dispatch — Cold-prompt rule | B6 (4 files) | ~5 lines | Subagent / delegation skills |
| D — Agent enforcement | B8 (2 files) | ~5 lines | wp-sgs-developer, design-reviewer |

`/sgs-clone` got the C template plus an explicit Stage 0 pre-flight gate spec section (per Spec 13 §7.2).

## Files touched (45)

5 files in B2 (shipped earlier this session, commit `5a2ed4bd`) + 40 files in B3-B9 (commit forthcoming). Full target manifest at `.claude/scratch/phase-4-targets.txt`. Insert script at `.claude/scratch/phase-4-batch-insert.py` (idempotent — re-runs are no-ops).

## Verification

```
=== Grep verify: every file has Spec 13 path + marker + row 236 ===
Files missing markers: 0 / 40 (B3-B9)
Files missing markers in B2: 0 / 5 (verified earlier this session)
Total: 0 / 45
```

Each file contains: (a) the canonical path `.claude/specs/13-DRAFT-NAMING-CONVENTION.md`, (b) the "SGS-BEM Convention (Spec 13)" H2 section, (c) the blub.db row 236 reference.

## Skillscore deltas (B3-B9 batch)

### Score-passing (≥90%) — 13 of 40 in B3-B9 + all 3 in B2 = 16 of 45 overall

Files at A or A- post-edit. No regressions from passing to failing.

### Sub-90% baseline noise — 22 of 40 in B3-B9 + 2 in B2 = 24 of 45 overall

Pre-existing rubric-mismatch failures: command files (`.claude/commands/*.md`) graded as skills, agent files (`.claude/agents/*.md`) graded as skills, reference-style mini-skills (polish, bolder, colourise, distill, normalize, etc. — typically <50 lines each, no Goal/Stages/Common Mistakes). The skillscore validator does not currently distinguish between full skills, commands, agents, and reference-mini-skills. Bean's ruling 2026-05-10: do not restructure. The rubric mismatch is a future skillscore tier concern.

### Maximum gain: +2.9% (under 5% over-reach trigger per KJC #1)

Across all 40 B3-B9 edits, no positive delta exceeded +2.9%. No subagent (or in this case, no inline edit) over-reached the brief.

### Notable drops (all still ≥90%, none broke any gate)

- `sgs-clone`: 94.0 → 90.4 (-3.6). Got the longer Stage 0 gate template; longest insert in the batch. Still passing.
- `harden`: 95.1 → 92.3 (-2.8). Standard one-line template. Still passing.

Both drops are within surgical-edit tolerance (under 5% in either direction).

## Bespoke integration notes (follow-up pass, same session)

The first pass shipped a generic Template C to B5 (excluding `/sgs-clone`), B7, and Template D unioned across both B8 agents. The plan called for **per-skill integration notes** anchoring Spec 13 to the actual mechanism each skill uses. A follow-up Python helper (`.claude/scratch/phase-4-bespoke-integration-notes.py`, idempotent) added a `**Integration in this skill:**` paragraph immediately before the canonical reference line in 25 surfaces, and split the B8 union template into per-agent rules:

| Surface | Bespoke note (gist) |
|---|---|
| B3 ×14 (polish, bolder, colourise, harden, adapt, distill, normalize, extract, humanize, quieter, delight, critique, audit, optimise) | Routed via `/innovative-design`; conform to its SGS-BEM rule before downstream pipelines |
| B5 sgs-wp-engine | Block-builds, QA pipeline, pattern emission map class-name parts back to block.json — non-Spec-13 is a framework-correctness failure |
| B5 visual-qa | Mockup-parity-validator selector queries assume SGS-BEM on both sides; non-conformance causes silent parity failures |
| B5 clone-patterns | Cloned patterns inherit from source draft; pattern library promotion blocked on Spec 13 conformance |
| B5 interactive-design | Animation/interaction selectors target Spec 13 class names; CSS/JS keys off canonical class structure |
| B5 wp-block-development | block.json attribute values drive the modifier segment; slot ids become the element segment |
| B5 wp-block-themes | Style variations register as `--<modifier>`; theme.json palette/spacing slugs feed modifier segments |
| B5 wp-plugin-development | Plugins emitting blocks MUST register block.json attributes aligned with Spec 13 modifier values |
| B7 sgs-update | Stage 1 populates `is_canonical_for_sgs_drafts`; Stage 3 mirrors SGS blocks with the flag |
| B7 wp-blocks | Block search returns Spec 13 slot ids + block.json attribute values |
| B7 sgs-db | Naming-convention queries MUST filter `WHERE is_canonical_for_sgs_drafts=1` |
| B7 dev | Build/deploy phases that emit class names MUST validate Spec 13 conformance pre-deploy |
| B8 wp-sgs-developer | Build-time correctness rule: every block-render class name resolves to (slug, slot, attribute); flag gap candidates instead of ad-hoc classes |
| B8 design-reviewer | Non-conforming class names = fail criterion for design review; refuse to certify visual parity until convention is applied |

Verification:
```
B3+B5+B7 surfaces with Integration marker: 25 / 25
B8 split: wp-sgs-developer "fail criterion" count = 0 (expected 0)
B8 split: design-reviewer "fail criterion" count = 1 (expected ≥1)
```

## Cross-references locked across the framework

After Phase 4, every Bean-controlled skill, agent, and command that emits or accepts class names carries an explicit pointer to Spec 13 AND a per-skill integration note describing how the rule plugs into that skill's mechanism. Future sessions reading any of these surfaces immediately see (a) the rule, (b) where the rule applies in this skill, and (c) the canonical spec to consult for full detail. The `/sgs-clone` Stage 0 pre-flight gate, the lingua-franca-conversion sub-rule for live scrapes, the cold-prompt requirement for dispatch skills, and the per-agent enforcement rules are now propagation-complete.

## Next phases (per master plan `.claude/plan.md`)

- **Phase 6** — Mama's mockup migration to SGS-BEM (deferred to a future session; will use `/sgs-clone --legacy` for first-pass bypass)
- **Phase 7** — Orchestrator rewire (stages 1-2-9 hardcoded shortcuts → call dispatchers)
- **Phase 8** — Pipeline validation across all 9 Mama's sections + live deploy + eyes-on review

Phases 1-5 + Phase 4 = 6 of 8 phases complete (75%).
