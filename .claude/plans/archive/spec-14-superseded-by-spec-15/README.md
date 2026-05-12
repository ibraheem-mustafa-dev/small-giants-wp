---
doc_type: archive-readme
archived_on: 2026-05-12
---

# Spec 14 phase plans — superseded by Spec 15

Spec 14 was absorbed into Spec 15 (`.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md`) on 2026-05-12. The Spec 14 phase plans here are kept for archaeological reference only — do not execute.

| Original | Status | Spec 15 successor |
|---|---|---|
| `phase-1-doc-recon-and-snapshots.md` | Shipped 2026-05-12 as Spec 15 Phase 1 (commit `2581b1d5`) | `spec-15-master-execution-plan.md` §Phase 1 |
| `phase-2-schema-and-recursion-guard.md` | Superseded — Phase 1 already created the vocab tables; the recursion-guard module is now a Phase 3 / Phase 5 concern under Spec 15 | `spec-15-master-execution-plan.md` §Phase 2 (different scope: /sgs-update unified pipeline) |
| `phase-3-catalogue-build.md` | Superseded — fingerprint-builder catalogue retired by Spec 15 in favour of canonical_slot data on `block_attributes` | `spec-15-master-execution-plan.md` §Phase 3 |
| `phase-4-extract-refactor.md` | Superseded — extract.py refactor now driven by sgs-db canonical_slot reads | `spec-15-master-execution-plan.md` §Phase 3 (extract.py rewire) |

Single source of truth: `.claude/plans/spec-15-master-execution-plan.md` (plus the dedicated `phase-5-clone-pipeline-e2e.md`).
