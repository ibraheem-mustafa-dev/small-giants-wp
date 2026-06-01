---
doc_type: master-plan
project: small-giants-wp
last_updated: 2026-06-01
status: closed — see archive
---

# Plan — small-giants-wp

The 2026-05-21 architecture programme closed 2026-05-22. Full content archived at [`plans/archive/2026-05-21-architecture-programme.md`](plans/archive/2026-05-21-architecture-programme.md).

**Active multi-phase plan:** [`plans/2026-05-24-strategic-plan.md`](plans/2026-05-24-strategic-plan.md). Phase 1 scope is now defined by **Spec 22 (Universal Block-Equivalent Extraction)** at [`specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`](specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md), implemented per [`plans/2026-05-26-phase-1-spec-22-implementation.md`](plans/2026-05-26-phase-1-spec-22-implementation.md). Phases 2-4 (header/footer cloner, parking sweep, skill optimisation) remain active scope. Most-recent active phase is whichever `plans/phase-N-*.md` exists without a `-complete.md` suffix.

For the doc-op programme (Phases 1-13, shipped 2026-05-24), see `decisions.md` D57-D60 + `handoff.md`.

## Progress 2026-05-30 — D107-D113 architectural cleanup batch

Phase 2 hybrid migration Stream A continuation shipped: voter tier column (D107), `block_composition` data layer 188 rows (D108), canonical_slot backfill 2.5% → 33.4% (D110), slot row retirements (D111), inheritance script expansion (D112), methodology STOP catalogue extensions (D113). XS-3 walker recursion reverted (D109) after regression. Pixel-diff trajectory **58.6% → 56.40%** (−2.20pp).

**Current focus / next steps:** refined XS-3 walker recursion trigger (parking P-XS-3-TRIGGER-REFINEMENT) + D6 threshold re-tune 4 → 20-30 blocks (P-D6-THRESHOLD-RETUNE) + block_attributes NULL canonical_slot vocabulary gaps. See `plans/2026-05-28-phase-2-hybrid-block-migration.md` for detailed Stream A scope.
