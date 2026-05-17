---
doc_type: plan
project: small-giants-wp
plan_name: convention-rollout-and-m9-completion
created: 2026-05-10
last_updated: 2026-05-18
phase_count: 8
total_estimate_min: 540-720 (9-12 hours focused)
status: archived — phases 7+8 closed since original write; active work is Phase 9. P-WP-ALIGNMENT-WIDTH-SYSTEM milestone CLOSED 2026-05-18 (3 commits — c7f42003 Task 0 pages-not-posts, 86172812 Tasks 2-3 widthMode infra, 16721374 docs walk; HEAD 16721374). Active execution doc is .claude/next-session-prompt.md (v8 — orchestrator re-run + intra-section pivot). This file kept as historical audit trail.
successor_plan: .claude/next-session-prompt.md (v8 — orchestrator re-run + intra-section pivot, 2026-05-19 onwards)
phase_chain:
  - phase-7-spec-16-converter-rollout — CLOSED 2026-05-13
  - phase-8-section-by-section-closure — CLOSED 2026-05-16 (22 commits across 3 sessions)
  - phase-9-brand-hero-evidence-walkdown — ACTIVE (P-WP-ALIGNMENT-WIDTH-SYSTEM milestone CLOSED 2026-05-18)
---

# Plan - SGS-BEM Convention Rollout + M9 Completion (ARCHIVED — historical audit trail)

**2026-05-18 status note (Phase 9 mid-session):** P-WP-ALIGNMENT-WIDTH-SYSTEM shipped today (3 commits on main: c7f42003 + 86172812 + 16721374, HEAD 16721374). cv2 pipeline now targets WP PAGES not POSTS (14.3-point brand pixel-diff drop at 1440 from removing the inherited 800px content-area cap); sgs/container has full per-viewport widthMode system + InspectorControls editor UI; converter detects mockup widths and lifts them into per-client style variations idempotently. Universal-benefit principle held — zero client literals in framework code; one BEM regex correctness bug caught + fixed by `/qc-inline` before commit (now captured as Section T in `.claude/specs/common-wp-styling-errors.md` + a new entry in `.claude/mistakes.md`). Next session pivots to orchestrator pipeline re-run + intra-section closure.

**Prior 2026-05-18 status (early-session, not yet committed at the time — superseded by the above):** Phase 9 pre-work shipped (3 commits referenced 8b69bc0a + 10a93d87 + 397295c3, but those hashes don't appear in the current `main` log — likely worktree-local). Three evidence layers delivered behind `--debug-trace`: per-section trace JSONL (14 walker labels + attr_skipped + db_lookup_miss), per-section expected-rules baseline (parse_css + soupsieve), split-metric pixel-diff (suffix-anchored attribute-coverage% via property_suffixes DB). 4-rater /qc panel ratified post-fix (Cerebras stalled, replaced by Sonnet adversarial-lens).

**2026-05-17 status note:** Three phases closed since this plan was written. Phase 7 (Spec 16 converter rollout) closed 2026-05-13. Phase 8 (section-by-section closure, 22 commits across 3 sessions) closed 2026-05-16. Phase 9 (brand + hero evidence-driven walkdown) is the active phase as of 2026-05-17 — see `.claude/next-session-prompt.md` v3 (validated by 4-rater council review: architecture / adversarial / pragmatist / evidence). Pass condition for Phase 9 splits into attribute-coverage% ≥ 95% (universality, pure converter score) + pixel-diff% ≤ 5% (fidelity, block + theme + render score) per evidence-lens recommendation. The M9 / clone-orchestrator concerns this plan originally sketched were reframed in Spec 16 (2026-05-14) as a slot-aware DOM walker. Spec 15 stays canonical for L0-L3 + Stages 0-2 + 8-9 + /sgs-update; Spec 16 owns Stages 3-7.

**Active plan reference for next session: `.claude/next-session-prompt.md` v4.**

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
| 7 | Orchestrator rewire (stages 1-2-9 hardcoded shortcuts) | complete | 90-150 | `plans/phase-7-orchestrator-rewire-complete.md` (shipped 2026-05-11; report at `.claude/reports/phase-7-orchestrator-rewire-2026-05-11.md`) |
| 8 | Pipeline validation (all 9 Mama's sections + critical fixes) + live deploy + eyes-on review | in progress | 240-360 | `plans/phase-8-validation-and-deploy.md` (rewritten 2026-05-11 against actual disk state; original referenced 6 fictional dependencies. Capture step DONE: sgs/trustpilot-reviews block shipped commit `c6bd4980`; orchestrator multi-section run verified end-to-end on Mama's (9 boundaries, 212 slots, 213 leftover entries persisted to recognition_log). **Critical-path blocker discovered 2026-05-11:** `tools/recogniser-v2/extract.py` works for sgs/hero only -- 8 of 9 Mama sections produce empty attributes. extract.py generalisation IS Phase 8 work (was misframed as Phase 9). See P-EXTRACT-GENERALISE. Remaining after that: visual parity validation, live deploy, Bean eyes-on review at 3 breakpoints.) |

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