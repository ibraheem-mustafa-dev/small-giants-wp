---
doc_type: master-plan
project: small-giants-wp
last_updated: 2026-06-02
status: closed — see archive
---

# Plan — small-giants-wp

The 2026-05-21 architecture programme closed 2026-05-22. Full content archived at [`plans/archive/2026-05-21-architecture-programme.md`](plans/archive/2026-05-21-architecture-programme.md).

**Active cloning plan:** ⚠️ **there isn't one here — do not trust this file for the live front.** The 2026-06-09 clone-fix build plan + sign-off ledger were archived (now at [`plans/archive/2026-06-09-clone-fix-build-plan.md`](plans/archive/2026-06-09-clone-fix-build-plan.md) + [`plans/archive/2026-06-09-clone-fix-sign-off-ledger.md`](plans/archive/2026-06-09-clone-fix-sign-off-ledger.md)); the converter-completion programme that followed them was EXECUTED IN FULL at D276 and archived too. **Live status is single-sourced to `state.md` + `next-session-prompt.md`** (corrected 2026-07-16 — this line pointed at two live paths that no longer resolve).

**Container/wrapper standardisation programme (2026-06-02, archived):** [`plans/archive/2026-06-02-container-wrapper-standardisation.md`](plans/archive/2026-06-02-container-wrapper-standardisation.md) — 5-workstream container/wrapper standardisation programme (D152). WS-1a (A1 contentWidth) + WS-1b (A2 outer max-width transfer + C1 band-aid removal) SHIPPED commit `2f86d9e6` (D159, 2026-06-03). WS-1c (A3/A4/A5/A6) + WS-2–5 pending. Canonical procedure: Spec 22 §FR-22-21.

**Cloning-fidelity triage + WS-4 build spec (2026-06-03, archived):** [`plans/archive/2026-06-03-cloning-fidelity-triage-and-composite-remodel.md`](plans/archive/2026-06-03-cloning-fidelity-triage-and-composite-remodel.md) — triage register #1–#8 + WS-4 composite-mirror mechanism design (D160: ALL ~28 composites KIND-scoped).

**Cloning pixel-diff thread (archived):** [`plans/archive/2026-05-28-phase-2-hybrid-block-migration.md`](plans/archive/2026-05-28-phase-2-hybrid-block-migration.md) — Streams B/C/D deferred; Stream A continuation feeds into WS-3/WS-4 of the standardisation programme.

**Canonical spec:** [`specs/31-UNIVERSAL-CLONING-PIPELINE.md`](specs/31-UNIVERSAL-CLONING-PIPELINE.md) — **Spec 31** (it absorbed Spec 22 at §13 per D253; Spec 16 retired 2026-05-26). Specs 13/15/21/22 are DEAD — never cite them. Header/footer cloner = Spec 33 Part 2 (not started).

For the doc-op programme (Phases 1-13, shipped 2026-05-24), see `decisions.md` D57-D60 + `handoff.md`.

## Progress 2026-06-03 — D159/D160 WS-1a+WS-1b SHIPPED

A1 (contentWidth attr + render.php `__inner` div + fold lift) + A2 (widthMode-from-own-max-width outer transfer) + C1 (db_lookup.py:2461 band-aid removal) shipped in commit `2f86d9e6`. Live-DOM verified @1440. A7 MOOT (`_lift_core_block_style` dead code). WS-4 scope sharpened (D160): ALL ~28 composites KIND-scoped, not just 4 SECTION blocks. Live triage + WS-4 spec: `plans/archive/2026-06-03-cloning-fidelity-triage-and-composite-remodel.md`.

## Progress 2026-06-02 — D152 container/wrapper standardisation WS-1 DB substrate

`block_composition.container_kind` column added + 28-block container roster populated. `sync-container-wrapping-blocks.py` rewritten to validated "wraps children" detection. trust-bar/modal block.json gained `supports.sgs.containerKind`. seed-composition-roles.py cleaned stale rows. Composite-mirror rule locked: no composite with built-in wrapper diverges from sgs/container capabilities.

## Progress 2026-05-30 — D107-D113 architectural cleanup batch

voter tier column (D107), `block_composition` data layer 188 rows (D108), canonical_slot backfill → 33.4% (D110), slot row retirements (D111), inheritance script expansion (D112). XS-3 walker reverted (D109) after regression. Pixel-diff **58.6% → 56.40%** (−2.20pp).
