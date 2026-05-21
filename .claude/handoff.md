# Session Handoff — 2026-05-21 (architecture programme staging)

## Completed This Session

1. **Wave 2 wiring fix shipped** (commit `ad706d0d`) — hero CTAs now emit as InnerBlocks via the multi-button → button composition. Hero `variation_css_rules` rose 0 → 19. Trust-bar variation_css_rules +11 (Change 1 bonus). 4 changes landed via Sonnet implementer.
2. **/qc retroactive on Phase 0** — `aec54882` (Phase 0 data seeding) shipped without `/qc` panel (binding rule 255 violation). Retroactive 8-scenario pass: ALL GREEN. Lesson captured (blub.db 281): QC gate must be structural, not remembered.
3. **Architecture staging doc** — `.claude/plans/2026-05-21-architecture-staging.md`. 31 decisions across 8 phases (Phase 0 shipped + 7 pending). 5 rounds of pushback, /qc-council 3-rater panel validated (9 findings fixed). WP 7.0 audit covers field-guide + canonical reference page (caught 6 additional items: AI Connectors framework, Script Module translations, View Transitions, Icons REST, Sync Post Meta Storage, Abilities API confirmation).
4. **/qc-council validated the staging doc** — Rater A (completeness), Rater B (contradiction, Spec 17 §3 architecture rewrite scope expansion caught), Rater C (Haiku fact-check, 9/10 WP 7.0 API claims VERIFIED). Decision 5 double-assignment caught + fixed. Saved 1+ wave of subagent + commit-merge cycles.
5. **3 strategic-plan reports** at `.claude/reports/strategic-plan-2026-05-21/`: risk-assessment.md, effort-pert.md, hidden-decisions.md. Per-phase pre-mortem + PERT estimates + cold-reviewer pause-points.
6. **Decision 24 research subagent** — Pattern Overrides investigated; verdict KEEP DB-backed approach (Pattern Overrides is operator UX, not converter logic). Report at `.claude/reports/2026-05-21-pattern-overrides-research.md`.
7. **Phase C spec revisions APPLIED IN-SESSION via parallel subagents** (Tracks B1 + B2): Specs 16, 17, 11, 01, 18, 19, 02, common-wp-styling-errors.md all revised per §6 plan. Phase C originally scoped as 4 future sessions — collapsed to in-session work.
8. **Living docs walk via Track C subagent** — architecture.md, decisions.md (D27-D36 appended), mistakes.md (row 281), parking.md (18 P-ARCH-* items), plan.md (master plan revised), state.md (architecture_programme block + phase statuses), goals.md, cloning-pipeline-flow.md, CLAUDE.md root.
9. **4 phase plans created via Track D subagent** — phase-0.5, phase-1, phase-3, phase-5a (the live-correctness critical path). Each with per-step Action/Files/Time/Tooling/On-Fail/Cold-Entry/Pre-written-prompt/QC-gate.
10. **Time estimates re-calibrated** per `~/.claude/rules/time-estimates.md` DEFAULT-LOW rule. Critical path: ~3-6 hrs sequential (was 11 hrs — double-counted ADHD tax on conservative PERT). QC inter-phase gate budgets added.

## Current State

- **Branch:** main at `07180cea` (pushed)
- **Tests:** Wave 1 G2 unit tests still passing (7 tests). Phase 0 self-tests passed. No new automated tests this session.
- **Build:** n/a (no JS/CSS rebuild needed; all doc + DB work)
- **Uncommitted changes:** 4 pre-existing untouched (deleted spec 15 stub, `plugins/sgs-blocks/includes/lucide-icons.php` modified, `theme/sgs-theme/styles/mamas-munches.css` modified, `plugins/sgs-blocks/sgs-framework.db` untracked)
- **Lessons captured:** blub.db rows 281 (structural QC enforcement) + 282 (fix-what-QC-surfaces regardless of provenance)

## Known Issues / Blockers

- **Pre-session blockers from 2026-05-20 still open** but subsumed by architecture programme: Hero 375 mobile +13.3pt (closes when Phase 4 F5 D1 media-field flow lands); Social-proof 768 +5.1pt (same).
- **Decision 24 Customiser-context view-transitions** UNCONFIRMABLE per Rater C — Phase 5b implementer verifies on live test; fallback to manual `customize_controls_enqueue_scripts` documented.
- **Phase 5b is the bottleneck** at ~6-10 hr (Customiser migration with WP 7.0 button preset coverage uncertainty). May need to descope or split.

## Next Priorities (in order)

1. **Phase 0.5** — Structural QC enforcement hook (Decision 31). ~25 min. Pre-written cold prompt in `.claude/plans/phase-0.5-structural-qc-hook.md`. Independent of all other phases.
2. **Phase 1** — DB merge (Decisions 1, 2, 11). ~45-75 min. Foundation for Phases 2, 3, 4. Cold prompt in `.claude/plans/phase-1-db-merge.md`.
3. **Phase 3** — INNER_BLOCK_PATTERNS retirement (Decisions 24, 12). ~60-105 min. Depends on Phase 1. Cold prompt in `.claude/plans/phase-3-inner-block-patterns-retirement.md`.
4. **Phase 5a** — Variation system kill + per-site theme.json + push CLI (Decisions 14′, 16′, 17′, 18, 19). ~60-105 min. Depends on Phase 1. Cold prompt in `.claude/plans/phase-5a-variation-system-kill.md`.
5. **Parallel sessions for remaining phases** — Phase 2 (variations indexing), Phase 4 (/sgs-update rebuild + Option B), Phase 5b (Customiser migration), Phase 6 (audits), Phase 7 (WP 7.0 alignment). Can run in 3 parallel sessions after critical path.

## Files Modified

| File path | What changed |
|---|---|
| `.claude/plans/2026-05-21-architecture-staging.md` (NEW) | Canonical 31-decision architecture record |
| `.claude/plans/phase-0.5-structural-qc-hook.md` (NEW) | Phase 0.5 detailed plan + cold prompt |
| `.claude/plans/phase-1-db-merge.md` (NEW) | Phase 1 detailed plan + cold prompt |
| `.claude/plans/phase-3-inner-block-patterns-retirement.md` (NEW) | Phase 3 detailed plan + cold prompt |
| `.claude/plans/phase-5a-variation-system-kill.md` (NEW) | Phase 5a detailed plan + cold prompt |
| `.claude/plans/phase-wave-2-wiring-fix.md` (NEW) | Wave 2 plan (already shipped at `ad706d0d`) |
| `.claude/reports/2026-05-21-pattern-overrides-research.md` (NEW) | Decision 24 research finding |
| `.claude/reports/strategic-plan-2026-05-21/*.md` (NEW × 3) | Risk + effort + hidden-decisions |
| `.claude/verify/architecture-programme-2026-05-21.md` (NEW) | Per-phase verification criteria |
| `.claude/specs/01-SGS-THEME.md` | Per-site theme.json model + retirements |
| `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` | WP 7.0 alignment notes section |
| `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md` | Site Editor surface + verification gate |
| `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` | §16-§21 added (DB merge through audits) |
| `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` | §3 rewrite + §S5-2/§S6-1/§S7-*/§S8 retired + Customiser migration |
| `.claude/specs/18-SGS-FLOATING-UI.md` | §8b canonical Customiser pattern reference |
| `.claude/specs/19-SGS-CLI-COMMANDS.md` | Variation sub-commands tombstoned + §7 Adjacent CLI scripts |
| `.claude/specs/common-wp-styling-errors.md` | role:content + pseudo-elements sections |
| `.claude/architecture.md`, `goals.md`, `decisions.md`, `mistakes.md`, `parking.md`, `plan.md`, `state.md`, `cloning-pipeline-flow.md`, `next-session-prompt.md`, `docs-registry.yaml`, `CLAUDE.md` | Living doc walk (Track C) |

## Notes for Next Session

- **Time-estimates.md DEFAULT-LOW rule applies** — critical path is ~3-6 hrs realistic with QC gates, NOT 11 hrs. Don't re-inflate.
- **Phase 0.5 must ship FIRST** — it's the structural QC enforcement hook that gates subsequent commits. Without it, the QC-skipped pattern that violated binding rule 255 three times this session continues.
- **Decision 24 RESOLVED** — Pattern Overrides is operator-UX, not converter logic. Do NOT re-investigate in Phase 3.
- **Phase 5b CSS bridge** — before deleting the wp_options button-preset bridge, run property-coverage audit script confirming WP 7.0 native CSS generation covers EVERY property. If gaps, keep slim PHP shim. Critical detail per Spec 11 §6.3 + Phase 5b risk 1.
- **Two-commit pattern for Phase 5a** — Commit A archives files to `_retired/`, Commit B (next session after 1hr soak) deletes. Single-commit deletion is non-negotiable risk.

## Next Session Prompt

See `.claude/next-session-prompt.md` (canonical lowercase) — fully written orchestration plan with pre-written cold prompts for Phases 0.5 → 1 → 3 → 5a sequentially, with /qc-council gates between each.
