---
doc_type: master-plan
project: small-giants-wp
parent_spec: .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md
title: Master Build Plan — Spec 14 Phases 2-10
session_date: 2026-05-11
authors: Bean + Claude (Opus 4.7)
plan_label: PLAN sonnet (most phases) with PLAN opus on P4 + P6 architectural steps
total_estimated_hours: 22-28 (with parallelisation; 30-35 sequential)
total_cost_usd: ~3.50-5.50 (mostly Haiku + Sonnet; some inline Opus for architecture)
companion_docs:
  - .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md (spec)
  - .claude/cloning-pipeline-flow.md (visual ref)
  - .claude/plans/phase-1-doc-recon-and-snapshots.md (executed)
---

# Master Build Plan — Spec 14 Phases 2-10

Single source of truth for the cross-phase view: dependencies, parallelisation, model allocation, cost roll-up. Per-phase execution detail in `phase-N-*.md` files.

## USP

Convert the spec from "approved on paper" to "shipped on disk" without context loss. Each phase produces concrete artefacts that the next phase reads; nothing in this plan refers to scripts that don't exist yet (the lesson from P1's three fabrication catches).

## Phase dependency map

```
P1 (done) ──→ P2 (schema + recursion-guard)
                │
                ↓
              P3 (catalogue files)
                │
                ├─→ P4 (extract.py refactor + golden file) ──→ P8 (WP integration wiring)
                │                                              │
                └─→ P5 (gap detection) ──→ P7 (lingua-franca conversion)
                                                              │
                                          P4 + P5 + P7 + P8 ──┤
                                                              ↓
                                                          P6 (staged scaffolding)
                                                              │
                                                              ↓
                                                          P9 (visual-qa gate + autonomy)
                                                              │
                                                              ↓
                                                          P10 (acceptance harness)
```

## Parallelisation opportunities (revised post-QC round-2)

| Phases | Why parallelisable | Wall-clock savings |
|---|---|---|
| P4 ∥ P5 (after P3 done) | P4 touches `extract.py` only; P5 touches `leftover-bucket-router.py` + Stage 9 of orchestrator. Disjoint files. | ~2 hr |
| Within P3: Layer 4 (`block_compositions`) ∥ Layer 1 envelopes (cheap) | Different stores | ~30 min |
| Within P6: FR11 (patterns) ∥ FR14 (block scaffold) ∥ FR19 (media sideload) | Different output paths | ~2 hr |
| Within P3: per-block Layer 3 generation (67 blocks) | Embarrassingly parallel via fanout dispatch | ~1 hr |

**Serialised (post-QC fix — Gemini Pro caught these collisions):**
- P4 → P8: both modify `tools/recogniser-v2/extract.py` (P4 refactors; P8 adds modifier handling). Must serialise.
- P5 → P7: both touch `sgs-clone-orchestrator.py` at different stages but a single Python file can race on merge if edited in two sessions. Serialise to keep audit trail clean.
- P10 cannot run in parallel with P9 (P10's harness wires into FR21).

## Model allocation (cost-aware)

| Phase | Primary model | Why |
|---|---|---|
| P2 | Haiku + Sonnet | Schema migrations (Haiku); recursion-guard module (Sonnet) |
| P3 | Sonnet | Catalogue authoring needs cross-platform-mapping judgement |
| P4 | Opus inline | extract.py refactor is architectural — override boundary, dispatcher design |
| P5 | Sonnet | Classifier logic; mostly mechanical with role-taxonomy lookup |
| P6 | Sonnet (FR11, FR19, FR20); Opus inline (FR12, FR13, FR14 — schema-mutation logic) | Heaviest phase; mixed-shape |
| P7 | Sonnet | Translation rules per source convention |
| P8 | Sonnet | Mostly wiring CLI calls into pipeline stages |
| P9 | Opus inline | Visual-qa gate orchestration is the structural keystone |
| P10 | Haiku + Sonnet | 5 git-diff + filesystem checks; lightweight |

## Pre-flight invariants (always check before any phase starts)

Before the first step of any phase runs, confirm:

1. `git status --porcelain` returns no lines touching that phase's mutation scope
2. `git branch --show-current` returns `main` (this is core framework work)
3. `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` returns a healthy summary (`/wp-blocks health` proxy)
4. The previous phase's commit landed on origin/main (`git log origin/main -1`)
5. Phase plan file exists at `.claude/plans/phase-N-*.md`

If any check fails, halt and resolve before proceeding. Do not skip.

## Cross-phase risks

| Risk | Mitigation | Owner phase |
|---|---|---|
| Mid-build, a future Claude (or this Claude losing context) re-introduces a false claim | P1 process rule: grep before claim. Plus FR32 pre-commit chain in P9 catches it mechanically | P1 (already done) + P9 |
| Schema migration (P2) breaks existing uimax queries on `component_libraries` | Migration is additive (new column, default 0); no row updates | P2 |
| FR5 refactor (P4) breaks hero extraction silently | Golden-file regression guard at `tests/golden/hero-extraction-baseline.json`; bit-exact diff in CI | P4 |
| P6 scaffolding writes to canonical paths instead of staging | FR21 staging dir + filesystem-move pattern enforced by code structure (different output base path); CI grep check on commit message | P6 + P9 |
| Long session loses context on P6 (heaviest phase) | P6 split into 4 sub-phases (P6a: patterns, P6b: attrs, P6c: functionality, P6d: blocks); each commits independently | P6 |

## Done-when

Master plan is complete when each phase has its plan file shipped + dependencies between phases match this map + the cumulative cost estimate is within budget.

Spec 14 is complete (separate condition) when all P10 acceptance checks PASS on a real Mama's mockup run.

## Per-phase plan files

| Phase | File | Estimated hr | Status |
|---|---|---|---|
| P1 | `phase-1-doc-recon-and-snapshots.md` | 0.75 hr | ✅ done (commit f467bc72) |
| P2 | `phase-2-schema-and-recursion-guard.md` | 1 hr | planned |
| P3 | `phase-3-catalogue-build.md` | 5-6 hr | planned |
| P4 | `phase-4-extract-refactor.md` | 3-4 hr | planned |
| P5 | `phase-5-gap-detection.md` | 2 hr | planned |
| P6 | `phase-6-staged-scaffolding.md` | 6-8 hr | planned |
| P7 | `phase-7-lingua-franca.md` | 2 hr | planned |
| P8 | `phase-8-wp-integration-wiring.md` | 4-5 hr | planned |
| P9 | `phase-9-autonomy-and-visual-qa.md` | 3-4 hr | planned |
| P10 | `phase-10-acceptance-harness.md` | 45 min | planned |

## Execution mode

This master plan + the 9 phase plans together are the script. Execution proceeds top-to-bottom through each phase, committing at phase boundaries. Per-step model dispatch happens inline (Opus parent dispatches Sonnet/Haiku subagents where the phase plan marks `Model: sonnet` or `Model: haiku`).

No re-planning mid-execution. If a step's premise is wrong (e.g. fabrication discovered like P1's recursion-guard), halt at that step, fix the plan, then resume.
