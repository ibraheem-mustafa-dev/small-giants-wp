---
doc_type: plan
project: small-giants-wp
plan_name: convention-rollout-and-m9-completion
created: 2026-05-10
phase_count: 8
total_estimate_min: 540-720 (9-12 hours focused)
status: draft (not yet executing)
---

# Plan - SGS-BEM Convention Rollout + M9 Completion

## USP

End-state where Bean's drafts are deterministically clone-able by `/sgs-clone` (no convention voting, no passport fallback for drafts, no flaky tests), AND M9 ships with a clean SGS clone of the FULL Mama's homepage live on sandybrown with eyes-on review at 3 breakpoints.

## Phase index

| # | Phase | Status | Est min | File |
|---|---|---|---|---|
| 1 | Foundation - capture lesson + Spec 13 + living docs + uimax flag | complete | 60 | `plans/phase-1-foundation-complete.md` |
| 2 | DB cleanup audit - sgs-framework + uimax-pro-max | complete | 30-45 | `plans/phase-2-db-cleanup-audit-complete.md` |
| 3 | Rename /style-replicator → /bean-voice-replicator | complete | 30 | `plans/phase-3-skill-rename-complete.md` |
| 4 | Bulk convention propagation across ~48 skill surfaces (B2-B9) | complete | 150-180 | `plans/phase-4-bulk-propagation.md` (45 files shipped 2026-05-10; report at `.claude/reports/phase-4-propagation-summary-2026-05-10.md`) |
| 5 | Cross-platform parking entries | complete | 20 | `plans/phase-5-cross-platform-parking-complete.md` |
| 6 | Mama's mockup migration to SGS-BEM | complete | 30-45 | `plans/phase-6-mockup-migration-complete.md` (shipped 2026-05-10; report at `.claude/reports/phase-6-mockup-migration-2026-05-10.md`) |
| 7 | Orchestrator rewire (stages 1-2-9 hardcoded shortcuts) | pending | 90-150 | `plans/phase-7-orchestrator-rewire.md` |
| 8 | Pipeline validation (all 9 Mama's sections + critical fixes) + live deploy + eyes-on review | pending | 180-240 | `plans/phase-8-validation-and-deploy.md` |

## Session boundaries

Recommended split (model per session in brackets):

- **Session A (Opus, ~3.5 hr):** Phases 1, 2, 3, 5 - foundation + audit + rename + parking
- **Session B (Sonnet, ~5.5 hr):** Phase 4 - bulk propagation
- **Session C (Opus, ~5-6 hr):** Phases 6, 7, 8 - migration + orchestrator rewire + validation/deploy

Fresh sessions per boundary OK; Spec 13 + lesson + rule capture mean any session can pick up.

## Cross-cutting guardrails (apply to every phase)

- No em-dashes (Bean preference)
- No `--resume` flags or stage-resume infra (lesson 215)
- No regression to per-block hand-coding in slot-filler.py
- All uimax writes via `uimax_write.py` only - never raw sqlite3 (Hard Rule 7)
- After any uimax DB write: run `update-db.py regenerate-csvs` (architectural invariant 2026-05-10)
- Subagent outputs for skill/agent edits: grep-verify required field references before accepting (lesson from /uimax-* subagent rejection)
- Skillscore v2 CLI after each skill body edit; if <90%, minimal cleanup, no fix loop
- Visual-comparison + "is this a perfect clone" decisions stay with operator (lesson 221)
- For M9 proof step (Phase 8): Bean opens URL with own eyes; no agent fallback

## Aggregate cost estimate

**Inline (Opus + Sonnet main thread):** ~9-12 hours focused
**Subagent dispatches:** Phase 4 batches B2-B9 dispatch in parallel where possible (each batch is ~5-10 skills × ~3-5 min skill = ~25-50 min wall-clock per batch)
**External calls:** 0 paid API calls beyond model usage

## Living docs that update during execution

- `.claude/state.md` - `current_phase` updated at every phase boundary
- `.claude/parking.md` - Phase 5 adds 3 cross-platform entries; Phase 8 marks P-11-M9 RESOLVED
- `.claude/decisions.md` - Phase 1 adds the canonical-convention decision; Phase 2 adds DB cleanup decisions
- `.claude/mistakes.md` - already has the lesson (Phase 1 just confirms POST id)
- Project root `CLAUDE.md` + `.claude/CLAUDE.md` - Phase 1 adds Spec 13 reference
- `.claude/architecture.md` + `.claude/goals.md` - Phase 1 adds convention rollout context

## Deviations from /phase-planner default protocol

- Stage 2 (Research Pre-Gate) skipped - Bean's prior conversation established all context
- Stage 6 (Hidden Decisions peer review) skipped - already happened in conversation iterations
- Stage 7 (Docscore) deferred - context-constrained this session; recommend running on each phase file at session-start of next session before execution

If Bean wants any of these added retroactively, route via `/docscore` per phase file.