---
doc_type: plan
project: small-giants-wp
plan_name: architecture-programme-2026-05-21
created: 2026-05-10
last_updated: 2026-05-21
phase_count: 10
total_estimate_min: 1680-1920 (28-32 hours, 8-10 sessions)
status: active — Phase 0 SHIPPED 2026-05-21 (commit aec54882). 8 phases pending. Pixel-diff closure (G1-G5 + F5) is embedded within Phases 1 + 3. Architecture programme is the master plan as of 2026-05-21.
prior_plan_name: convention-rollout-and-m9-completion (archived below)
architecture_staging_doc: .claude/plans/2026-05-21-architecture-staging.md
phase_chain:
  - phase-7-spec-16-converter-rollout — CLOSED 2026-05-13
  - phase-8-section-by-section-closure — CLOSED 2026-05-16 (22 commits across 3 sessions)
  - phase-9-brand-hero-evidence-walkdown — ACTIVE (P-WP-ALIGNMENT-WIDTH-SYSTEM milestone CLOSED 2026-05-18)
---

# Plan — SGS Framework Architecture Programme 2026-05-21

Canonical detail in `.claude/plans/2026-05-21-architecture-staging.md`.

## What this programme does

Five things change in the framework across 8 phases + 30 decisions:

1. **DB consolidation** — Three databases (blocks.db + hooks.db + sgs-framework.db) merged into sgs-framework.db. One source of truth for all WP + SGS knowledge. All skills query one DB.

2. **Style-variation system killed** — Privacy leak closed (per-client overlay JSONs visible to every install). Replaced with: one `theme.json` per site, local snapshots in `sites/<client>/theme-snapshot.json`, new push CLI.

3. **INNER_BLOCK_PATTERNS retired** — Hardcoded two-entry dict in `convert.py` replaced by DB-backed `blocks.parent_block` + `slot_synonyms.standalone_block` lookups.

4. **Button presets migrated to WP 7.0 theme.json** — Native pseudo-element support (`:hover`, `:focus`, etc.) makes the `wp_options.sgs_button_presets` + CSS bridge redundant.

5. **`/sgs-update` rebuilt as 9-stage holistic refresh** — Pulls from 10 canonical sources, per-release verification gate, drift-check-dispatcher integration.

## Phase status

| Phase | Decisions | Status | Wall-clock | Parallelisable? |
|---|---|---|---|---|
| **0** | 3, 4, 5, 6 | SHIPPED `aec54882` | ~85 min | n/a |
| **0.5** | 31 | PENDING | ~20 min | YES — independent |
| **1** | 1, 2, 11 | PENDING | ~1.5 hr | NO — blocks 2, 3, 4 |
| **2** | 7, 8 | PENDING | ~1.5 hr | YES — parallel with 3 |
| **3** | 24 (gate), 12 | PENDING | ~1.5 hr | YES — parallel with 2 |
| **4** | 13, 30 | PENDING | ~5.5 hr | YES — parallel with 5a, 5b, 6, 7 |
| **5a** | 14', 16', 17', 18, 19 | PENDING | ~2 hr | YES — parallel with 4, 5b |
| **5b** | 21, 22, 27 | PENDING | ~6-10 hr | YES — parallel with 4, 5a |
| **6** | 9, 10, 23, 25, 28 | PENDING | ~5 hr | YES — needs Phase 1+2 |
| **7** | 26, 29 | PENDING | ~6 hr | YES — anytime after Phase 1 |

**Parallel dispatch (after Phase 1):**
- Session A: Phase 4 (`/sgs-update` rebuild)
- Session B: Phases 2 + 3 (variations + INNER_BLOCK_PATTERNS)
- Session C: Phases 5a + 5b (variation kill + Customiser)
- Session D: Phases 6 + 7 (audits + WP 7.0)

**Critical path:** 0.5 → 1 → Phase 4. ~8 hr wall-clock total if 4 parallel sessions run.

## Acceptance criteria (whole programme)

- DB: sgs-framework.db is the single source of truth; blocks.db + hooks.db can be deleted
- Style variations: zero per-client variation files in framework; each live site has ONE theme.json
- INNER_BLOCK_PATTERNS: dict deleted; hero CTAs still render; adjacent-button grouping works
- Button presets: `wp_options.sgs_button_presets` row deleted; values in theme.json; primary/secondary/outline render correctly
- Customiser: header/footer/site-info admin pages migrated; live-preview works for colours + typography + spacing
- WP 7.0: all 73 SGS blocks have `apiVersion: 3` + `role: content` + script-module text domains; pseudo-element styles render correctly
- `/sgs-update`: 9-stage version idempotent; `--refresh-upstream` repopulates from 10 canonical sources; drift gate catches mismatches

## Methodology guardrails (carry forward)

- Read `pipeline-state/<run>/leftover-buckets.json` BEFORE conjecturing (blub.db 254)
- Multi-model `/qc` panel BEFORE every converter/pipeline commit (blub.db 255)
- Per-section cropped pixel-diff only (blub.db 256)
- Schema enumeration BEFORE gap claims (blub.db 272)
- Council predictions are hypotheses — empirical gate mandatory (blub.db 276)
- Phase 0.5 structural QC hook ships BEFORE any other phase (Decision 31, blub.db 281)

---

# Plan - SGS-BEM Convention Rollout + M9 Completion (ARCHIVED — historical audit trail)

**2026-05-18 status note (Phase 9 mid-session):** P-WP-ALIGNMENT-WIDTH-SYSTEM shipped today (3 commits on main: c7f42003 + 86172812 + 16721374, HEAD 16721374). cv2 pipeline now targets WP PAGES not POSTS (14.3-point brand pixel-diff drop at 1440 from removing the inherited 800px content-area cap); sgs/container has full per-viewport widthMode system + InspectorControls editor UI; converter detects mockup widths and lifts them into per-client style variations idempotently. Universal-benefit principle held — zero client literals in framework code; one BEM regex correctness bug caught + fixed by `/qc-inline` before commit (now captured as Section T in `.claude/specs/common-wp-styling-errors.md` + a new entry in `.claude/mistakes.md`). Next session pivots to orchestrator pipeline re-run + intra-section closure.

**Prior 2026-05-18 status (early-session, not yet committed at the time — superseded by the above):** Phase 9 pre-work shipped (3 commits referenced 8b69bc0a + 10a93d87 + 397295c3, but those hashes don't appear in the current `main` log — likely worktree-local). Three evidence layers delivered behind `--debug-trace`: per-section trace JSONL (14 walker labels + attr_skipped + db_lookup_miss), per-section expected-rules baseline (parse_css + soupsieve), split-metric pixel-diff (suffix-anchored attribute-coverage% via property_suffixes DB). 4-rater /qc panel ratified post-fix (Cerebras stalled, replaced by Sonnet adversarial-lens).

**2026-05-17 status note:** Three phases closed since this plan was written. Phase 7 (Spec 16 converter rollout) closed 2026-05-13. Phase 8 (section-by-section closure, 22 commits across 3 sessions) closed 2026-05-16. Phase 9 (brand + hero evidence-driven walkdown) is the active phase as of 2026-05-17 — see `.claude/next-session-prompt.md` v3 (validated by 4-rater council review: architecture / adversarial / pragmatist / evidence). Pass condition for Phase 9 splits into attribute-coverage% ≥ 95% (universality, pure converter score) + pixel-diff% ≤ 5% (fidelity, block + theme + render score) per evidence-lens recommendation. The M9 / clone-orchestrator concerns this plan originally sketched were reframed in Spec 16 (2026-05-14) as a slot-aware DOM walker. Spec 15 stays canonical for L0-L3 + Stages 0-2 + 8-9 + /sgs-update; Spec 16 owns Stages 3-7.

**Active plan reference for next session: `.claude/next-session-prompt.md` v8 (orchestrator re-run + intra-section closure, post Spec 17).**

**Spec 17 complete 2026-05-18.** Next framework milestones: (1) Phase 9b intra-section pixel-diff closure (P-INTRA-SECTION-CLOSURE), (2) Spec 18 or next roadmap spec. See `.claude/parking.md` for P-S17-* follow-up items (B-H still open, A DONE).

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

---

## 2026-05-20 — Phase 1 closure plan (G1-G5 + F5) — successor

This master plan was archived 2026-05-18; Phase 7 (Spec 16 converter rollout) and Phase 8 (section-by-section closure) shipped. The Spec 16 architectural rewrite work was tracked in `.claude/plans/phase-1-spec16-rewrite-2026-05-20.md` (executed this session — all of Phase 1 P1.A + P1.B + P1.B.x + Phase 2 wave shipped across 13 commits).

**Active successor plan:** `.claude/next-session-prompt.md` — 4-wave G1-G5 + F5 closure to hit ≤ 1% pixel-diff per section. Council synthesis at `reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md`.

## 2026-05-21 — Wave 2 reshape — single wiring gap, not three problems

G1 + G3 + G5 reframed as ONE wiring gap. Detail in `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §15.

The 2026-05-20 council framing (5 structural gaps + F5 = 4 waves) is superseded by the 2026-05-21 reality check finding: the SGS-framework.db has the complete mapping infrastructure cv2 needs (`property_suffixes` 117 / `slot_synonyms` 89 / `block_compositions` 37 / `block_attributes` 1755 / `modifier_suffixes` 19) but cv2 doesn't query `block_compositions` at all and doesn't query `property_suffixes` for visual / structural slots. Wave 2 is one architectural change wiring the DB tables into the walker's emit shape, not three per-block fixes.

**Status as of 2026-05-21 close:**
- G2 Step 1+2 shipped — enabling infrastructure (commit `affca3f1`)
- G4 discarded — empirically falsified (no-op)
- G1 + G3 + G5 absorbed into single Wave-2 wiring fix — see Spec 16 §15
- FR1 fast-path consistency add — one-line `variation_buf.append()` follow-up parked as `P-FR1-VARIATION-BUF-CONSISTENCY`
- F5 D1 media-field flow — still distinct from the Wave 2 wiring; remains as next-after-Wave-2

Acceptance criterion for the reshaped Wave 2: hero `stage_3_slot_list` failures drop 142 → <30, hero `variation_css_rules` rises 0 → ≥8, brand pixel-diff at 1440 drops 43.7% → <20%. Goal-shaped post-condition per `/qc-council` Stage 5: every mockup CSS declaration either matches a theme.json token (correct elision) OR lands as a block attribute / inline style on emitted markup.

**Methodology added 2026-05-21:** all multi-fix proposals from any council / debate / systematic-debugging exercise now route through `/qc-council` for empirical pre/post measurement gate before subagent dispatch. blub.db row 276 + mistakes.md 2026-05-21 lesson 1.