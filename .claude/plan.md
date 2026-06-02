---
doc_type: master-plan
project: small-giants-wp
last_updated: 2026-06-02
status: closed — see archive
---

# Plan — small-giants-wp

The 2026-05-21 architecture programme closed 2026-05-22. Full content archived at [`plans/archive/2026-05-21-architecture-programme.md`](plans/archive/2026-05-21-architecture-programme.md).

**Active primary plan (2026-06-02):** [`plans/2026-06-02-container-wrapper-standardisation.md`](plans/2026-06-02-container-wrapper-standardisation.md) — 5-workstream container/wrapper standardisation programme (D152). WS-1 SHIPPED (commit `0d746073`). WS-2–5 pending. Canonical procedure: Spec 22 §FR-22-21.

**Active cloning pixel-diff thread:** [`plans/2026-05-28-phase-2-hybrid-block-migration.md`](plans/2026-05-28-phase-2-hybrid-block-migration.md) — Streams B/C/D deferred; Stream A continuation feeds into WS-3/WS-4 of the standardisation programme.

**Canonical spec:** [`specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`](specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md) (Spec 22; replaces Spec 16 retired 2026-05-26). Phase 2-4 (header/footer cloner, parking sweep, skill optimisation) remain active scope.

For the doc-op programme (Phases 1-13, shipped 2026-05-24), see `decisions.md` D57-D60 + `handoff.md`.

## Progress 2026-06-02 — D152 container/wrapper standardisation WS-1

`block_composition.container_kind` column added + 28-block container roster populated. `sync-container-wrapping-blocks.py` rewritten to validated "wraps children" detection. trust-bar/modal block.json gained `supports.sgs.containerKind`. seed-composition-roles.py cleaned stale rows. Composite-mirror rule locked: no composite with built-in wrapper diverges from sgs/container capabilities. WS-2 (capability parity audit) is the next step.

## Progress 2026-05-30 — D107-D113 architectural cleanup batch

voter tier column (D107), `block_composition` data layer 188 rows (D108), canonical_slot backfill → 33.4% (D110), slot row retirements (D111), inheritance script expansion (D112). XS-3 walker reverted (D109) after regression. Pixel-diff **58.6% → 56.40%** (−2.20pp).
