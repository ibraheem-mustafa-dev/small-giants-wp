# Session Handoff — 2026-06-09 (cloning thread) — wave-2 root-cause diagnosis + design + Spec-22 FRs + ledger + reference-accuracy sweep

> Live handoff. Prior sessions: `.claude/memory/handoff-archive.md`. Next session: `.claude/next-session-prompt.md`. Theme thread co-active — commit by explicit path.

## Completed This Session

1. **Wave-2 root-cause diagnosis** — traced all 7 homepage-section desktop issues → **8 root-cause families** (`.claude/reports/wave2/ROOT-CAUSE-FAMILY-MAP.md`). F1 per-slot CSS routing (~1/3 of issues) + F3 block-render defaults (separate layer, ~15 issues) are the two dominant families.
2. **Two councils gated the build plan.** `/adversarial-council` (design, 6 personas) + `/qc-council` (coverage/end-goal-fit). Caught: consolidation-façade, FR-22-19 gate mis-identification, FATAL cross-node bug (`equivalent_block_for(block,slot)` is attr-keyed → returns None → fork silently never fires). All folded in.
3. **Build plan + design v2 written** — `CLONE-FIX-BUILD-PLAN.md`, `STAGE1-DESIGN.md` (council-hardened v2), `STAGE0-FRS-AND-GATE.md`. Stage 0 (prereqs + Gate A/B) → Stage 1 (1a consolidate / 1b real DB dispatch / 2 cross-node / 3 F6a / 4 carve-out retirement) → Stage 2 parallel families → Stage 3 verify.
4. **3 FRs ratified into Spec 22 (D193):** FR-22-5.1 (inherited/absent resolution), FR-22-5.2 (draft-driven breakpoints), FR-22-5.3 (cross-node box-CSS routing) + FR-22-19 retirement clause.
5. **Reference-accuracy sweep** (4 parallel agents, ~90 citations) — corrected gate identity everywhere (`has_scalar_media_attrs:2940` + `_is_container_mirror_block:2950`, NOT `is_class_section_block`; guard `fold_eligible:3857`); fixed wave-2 drifts; recorded wave-1 line-drift inventory + 4 phantoms.
6. **55-row SIGN-OFF-LEDGER** — every issue → family → workstream → status; 3 SHIPPED (H-C2/D192, FP-F/SP-G-binding/D191); milestone-gated FP-E/FP-H.
7. **Stage-0 prerequisite prompts written:** `CANONICAL-SLOT-BACKFILL-PROMPT.md` (Commit 0a, 41-row data fill, ready to run independently) + `FP-E-FP-H-SPEC27-REBUILD-PROMPT.md` (sequenced after wave plan + converter).
8. **DB scrutiny removed infra:** `block_defaults` table killed (always-emit avoids it; `block_attributes.default_value` already covers attr defaults); canonical_slot downgraded to a 41-row data fill of an existing column.
9. **Spec27-28 wave plan updated** — FP-E/FP-H follow-on phase added (cannot start until wave plan + converter Stage 1 land; file collision + dependency).
10. **Lessons:** blub.db 329 (`rule-critique-is-not-fix-shape-confirmation`); `fidelity-denominator-is-source-not-target`; `deweighting-a-signal-can-hide-the-real-issue`.

## Current State
- **Branch:** `main` at `c89a390a` (+ this handoff's doc commit). Design session only — no converter code changed.
- **Build:** unchanged. No code modified.
- **Gate status:** Stage 1 build is **gate-pending Bean's design-gate decision** (Rule 7). No converter code until approved.
- **Uncommitted pre-existing noise:** reports/phase4-*.txt, theme-snapshot.json, parity artefacts, lucide-icons.php — not this session's work.

## Known Blockers
- Bean design-gate approval on `STAGE1-DESIGN.md` v2 is the one remaining gate before any Stage 1 code.
- Stage-0 prerequisites must land first: canonical_slot backfill (before Commit 2), Gate B (before first F3 fix).
- parity2 containment fallback (Task 1 from 2026-06-07 prompt) still needed for honest measurement before Method-2.

## Next Priorities
1. **Bean design-gate** — read `STAGE1-DESIGN.md` v2; approve / re-scope.
2. **Stage 0:** canonical_slot backfill (prompt ready, independent); Gate A conformance harness; Gate B promoted.
3. **parity2 containment fallback** (Task 1 from 2026-06-07 prompt — still live).
4. **Stage 1 converter** (design-gated, own branch, per-composite verification matrix + Bean sign-off before merge).
