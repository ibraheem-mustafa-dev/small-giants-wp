---
doc_type: strategic-plan
project: small-giants-wp
plan_name: 2026-05-24-post-architecture-recovery-strategic-plan
generated: 2026-05-23
parent_plan: .claude/plans/2026-05-21-architecture-staging.md (PARTIAL — see fact-check findings)
primary_goal: "Close the structural pixel-diff blockers via Spec 22 (Universal Block-Equivalent Extraction; replaces the 2026-05-23 G1+G3+G5 framing entirely), build a specialised header/footer cloning pipeline, finish remaining parking, then optimise the skill+command surface that depends on all the above."
---

> **⚠ ARCHIVED 2026-06-10 — SUPERSEDED (plans-folder consolidation).** Historical recovery roadmap; Phase 1 superseded by Spec 22, Phases 2-4 carried to parking.md. Live canonical cloning plan: `../2026-06-09-clone-fix-build-plan.md` + `../2026-06-09-clone-fix-sign-off-ledger.md`. Remaining open work tracked in `../../parking.md`. Kept for historical detail (shipped-state, locked decisions, methodology).

# Strategic plan — post-architecture-recovery (4 phases)

> **Progress 2026-05-30 — D107-D113 architectural cleanup batch shipped (Stream A continuation):**
> - **Phase 2 hybrid migration:** Stream A continuation landed — XS-2 voter tier column (D107), `block_composition` table 188 rows (D108, walker consumption deferred), XS-4 canonical_slot backfill 2.5% → 33.4% + role 5.3% → 33.2% (D110), XS-5 retired 12 wrong/dead section-scope slot rows (D111), D6 inheritance script (D112), D113 methodology STOP catalogue extensions. XS-3 walker recursion REVERTED (D109) post-regression — refined trigger deferred. Pixel-diff trajectory **58.6% → 56.40%** (−2.20pp aggregate this session).
> - **Phase 3 parking sweep:** no movement; parking entries net-added (XS-3 trigger refinement, D6 threshold re-tune, 3 XS-4 follow-ups) minus 1 retired (P-UTF8-MOJIBAKE-IN-CONVERTER resolved via announcement-bar block.json fix).
> - **Phase 4 skill optimisation:** 2 new operator scripts shipped — `build-deploy.py` (D3, sandybrown canary fast-cycle complement to `/wp-sgs-deploy`) + `sync-container-wrapping-blocks.py` (D6 expansion); 1 ported (`assign-canonical.py` D99 port). `/wp-sgs-deploy` remains canonical for palestine-lives.org deploys.
> - **Next session:** refined XS-3 walker trigger + D6 threshold re-tune (4 → 20-30 blocks) + block_attributes NULL canonical_slot vocabulary work.

> **Revision 2026-05-26 — Phase 1 superseded by Spec 22.** The "Universal walker + G1+G3+G5 closure" framing below is retired. Phase 1 implementation is now defined by **Spec 22 (Universal Block-Equivalent Extraction)** at `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` and its Phase 1 plan at `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md`. Acceptance gate softened from "G1+G3+G5 closed per Spec 16 §14" to "per-section ≤5% × 3 viewports + Bean visual sign-off" (Phase 1) with ≤1% Phase 1.5 stretch. Phases 2-4 (header/footer cloner, parking sweep, skill optimisation) remain valid scope; sequencing unchanged.

**Revision 2026-05-23 (post-Step-1.1).** Phase 2 inserted: header + footer specialised cloning pipeline. Existing Phase 2 (parking) renumbered to Phase 3. Existing Phase 3 (skill optimisation) renumbered to Phase 4. Phase 1 acceptance criteria narrowed: header + footer pixel-diff still captured by Stage 11 for regression monitoring, but no longer gate Phase 1 closure (they are Phase 2's scope).

## Plain-English summary (Rule 17: Problem → Effect → Solution)

**Problem.** The cloning pipeline's Spec 16 layered architecture (FR1 fast path + FR2/3/4 + lift_subtree + F1 + 9-branch walk + ARRAY_LIFT_PATTERNS + hardcoded ATOMIC_TAG_MAP) accumulated five recognition/consumption paths over time. The 2026-05-26 diagnostic chain proved the layers double-render content slots and that the DB already holds the complete mapping. The 2026-05-23 G1+G3+G5 framing addressed symptoms one slot at a time; the underlying architecture was the fault.

**Effect.** Pixel-diff stayed in the 60-75% mean range across iterations. Per-section investigation cost mounted; every "fix the failing section" wave produced regressions on another section. The system needed an architectural reset, not another patch wave.

**Solution.** Four sequential phases:
- **Phase 1 — Spec 22 universal walker rewrite.** Replace the Spec 16 layered architecture with a single universal walker per Spec 22 §FR-22-3 (exactly 3 permitted exceptions: atomic-tag swap / chrome-skip / top-level container wrap). BEM is the only recognition signal (FR-22-1); block-equivalent attrs become child blocks via `equivalent_block_for()` (FR-22-2); CSS attributes to direct owner per FR-22-5; hybrid blocks get render.php migration per FR-22-6 (61-block roster shipped 2026-05-27 — see `.claude/reports/2026-05-27-hybrid-block-roster.md`). Phase 0 (foundation: DB enrichment + wp-blocks.py FR-22-8 CLI + pixel-diff.py methodology hardening + hybrid-block audit) closed 2026-05-27 in 7 task-commits + handoff. Phase 1 (walker rewrite, 5 commits per R-22-5: 1.1 pre-rewrite snapshot / 1.2 atomic-tag map migration / 1.3 ARRAY_LIFT_PATTERNS retirement / 1.4 universal walker / 1.5 measurement gate) opens next session. Acceptance: per-section ≤5% pixel-diff × 3 viewports + Bean visual sign-off (R-22-13 co-authoritative). G1+G3+G5 framing retired — all three dissolve into the Spec 22 single-path walker.
- **Phase 2 — Header + footer specialised cloning pipeline.** Build a separate one-shot script (runs once per site, not per page) that converts source HTML headers + footers into Spec 17 architecture (`header.html` / `footer.html` template parts + `Sgs_Site_Info` store + Customiser-controlled sticky/transparent/shrink behaviours + `sgs_header` / `sgs_footer` CPTs). Bypasses the generic page-clone pipeline because (a) 1-per-site means N-page sites would clone redundantly N times; (b) header/footer HTML doesn't follow the div→block pattern body content does; (c) custom behaviours (sticky, transparent, shrinking, partial-stick) live in Customiser, not block attributes. Detail in `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md` (generated via `/phase-planner`).
- **Phase 3 — Parking sweep close-out.** Finish the remaining ~22 STILL-OPEN parking entries (the original handoff's Task 4 + new entries from today's investigation). Excludes skills (Phase 4).
- **Phase 4 — Skill + command optimisation.** /skill-optimiser mode 2 (gap analysis + research) on the 14 WP/SGS skills + /batch-gap-analysis. Runs LAST because it grades against tools the previous phases fix.

## Out of scope

Explicit "No-Gos" for this plan — anything not here is implicitly out:

- **Block library expansion** — no new SGS blocks built during this plan (Phase 4 audits existing skills only).
- **Performance optimisation** — pixel-diff measurement only; no Core Web Vitals work.
- **New client onboarding** — Mama's Munches is the canary; no other clients added.
- **Spec rewrites** — Spec 22 is the canonical pipeline spec (Spec 16 retired + archived 2026-05-26). Spec 22 itself may receive amendments via its §16 ratification mechanism; other specs (17 header/footer, 18 floating UI, 19 CLI, 20 log surfacing, 21 pipeline-state, 02 SGS blocks) frozen for the duration unless a Phase touches them directly. Revisions go through new spec_version + status_history.
- **`/sgs-clone` UX overhaul** — orchestrator API + output format stable; only bug fixes.
- **Cross-platform emit paths (M9+)** — deferred per parking entries.

## Phase overview

Same content as Phase summary table below — re-presented here as the canonical "phase / name / timebox / deliverable / depends-on" shape per the strategic-plan template (Shape Up + PMI convention).

| Phase | Name | Timebox | Deliverable | Depends on |
|-------|------|---------|-------------|------------|
| 1 | Spec 22 universal walker rewrite + acceptance gate | 32-40 hrs / 6-10 sessions | Per-section ≤5% × 3 viewports + Bean visual sign-off (R-22-13); see `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md`. G1+G3+G5 framing retired — all three dissolve into the Spec 22 single-path walker. | none |
| 2 | Header + footer specialised cloner | pending phase-planner | Mama's header + footer parity at 375/768/1440 | Phase 1 |
| 3 | Parking sweep close-out | ~3 hrs / 1 session | parking.md open == {P-BATCH-GA-14-SKILLS} only | Phase 2 |
| 4 | Skill + command optimisation | dedicated session | 14 skill evaluations + review report + waiting queue | Phase 3 |

## Phase summary table

| Phase | Scope | Est | Sessions | Critical gate |
|---|---|---|---|---|
| **1** Spec 22 universal walker rewrite + acceptance gate | Spec 22 implementation per `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md`. Phase 0 foundation (DB enrichment Tier B ≤72-row backfill per D84 + wp-blocks.py extension + pixel-diff.py hardening + hybrid-block audit), then Phase 1 walker rewrite (5 commits: snapshot, atomic-tag, ARRAY_LIFT_PATTERNS retirement, universal walker, measurement), then Phase 2 hybrid render.php migrations, Phase 3 legacy cleanup, Phase 4 acceptance, Phase 5 decisions/mistakes pruning. | ~31-38 hrs (D84 scope correction shaved ~1.5h off Phase 0.1) | 6-10 | Per-section ≤5% × 3 viewports for all 7 body sections + Bean visual sign-off (R-22-13). Phase 1.5 stretch ≤1% via measurement-script hardening. Header/footer excluded — Phase 2 scope. |
| **2** Header + footer cloner | Separate one-shot script → Spec 17 architecture (template parts + Site Info + Customiser) | to be set by `/phase-planner` | 1-2 | Mama's Munches header + footer parity ≥ defined per-element thresholds at 375/768/1440 (header sticky behaviour exact match) |
| **3** Parking close-out | ~22 STILL-OPEN entries (no skills) | 6-8 hrs | 2-3 | parking.md "Open" section contains zero entries beyond P-BATCH-GA-14-SKILLS |
| **4** Skill optimisation | /skill-optimiser mode 2 on 14 WP/SGS skills + /batch-gap-analysis | 3-4 hrs | 1 (dedicated) | 14 per-skill JSON evaluations + 1 review report + S-grade confirmations queued |

**Total: ~13 hrs + Phase 2 pending phase-planner detail, across 5-6 sessions** (calibrate after Phase 1 + Phase 2 actuals; quote the smallest plausible figure per `~/.claude/rules/time-estimates.md`, not the upper range).

## Dependency graph

```
Phase 1 (Spec 22 universal walker rewrite — 5 commits per R-22-5)
  ↓ Commit 1.1 pre-rewrite snapshot (git mv convert.py to _retired/) — inline, ~10 min
  ↓ Commit 1.2 atomic-tag map migration (DB-driven per §14 Appendix B) — Sonnet, /qc-inline
  ↓ Commit 1.3 ARRAY_LIFT_PATTERNS retirement (FR-22-2.5 array-of-objects) — Sonnet, /qc-council
  ↓ Commit 1.4 universal walker (THE core: delete lift_subtree + _lift_inner_blocks + F1 + 9-branch walk()) — Sonnet, /qc-council multi-rater, /verify-loop
  ↓ Commit 1.5 measurement + halt/proceed (full-page Stage 11 against Wave B baseline)
  ↓ /qc-council multi-rater between EVERY commit touching converter/pipeline (blub.db row 255)
  ↓ /sgs-clone --debug-trace after EVERY code change (not bundled) — Stage 11 auto-captures, --wait-fonts auto-passed per Phase 0.3.b
  ↓ Phase 1 gate: per-section ≤5% × 3 viewports for all 7 body sections + Bean visual sign-off (R-22-13)
  ↓ (Stage 11 continues capturing header + footer for monitoring; no gate)
Phase 2 (Header + footer specialised cloner)
  ↓ Reads Spec 17 architecture (template parts + Site Info + Customiser)
  ↓ /qc-council on script commits; runs OUTSIDE main /sgs-clone pipeline
  ↓ Phase 2 gate: per-element parity thresholds met (to be set by /phase-planner)
Phase 3 (Parking sweep)
  ↓ /qc-inline per entry + /qc-council per multi-entry commit
  ↓ /sgs-clone after any task touching the pipeline
  ↓ Phase 3 gate: parking.md open section = {P-BATCH-GA-14-SKILLS} only
Phase 4 (Skill optimisation) — dedicated session
  ↓ blub.db row 176: /gap-analysis runs in main conversation, no subagent dispatch
  ↓ Phase 4 gate: 14 evaluations + review report + waiting-queue
```

## Methodology guardrails (apply to ALL phases)

1. **Diagnostic discipline (NEW 2026-05-23):** Before ANY pipeline-related fix-shape proposal, read the artefacts named in `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` first. Do NOT conjecture root cause without trace.jsonl + summary.log + leftover-buckets.json in hand.
2. **blub.db row 254** — `pipeline-state/<run>/leftover-buckets.json` BEFORE converter conjecture
3. **blub.db row 255** — Multi-model `/qc-council` BEFORE every commit touching converter/pipeline/SGS-block logic
4. **blub.db row 256** — Per-section cropped pixel-diff via `--selector .sgs-{section}`; Stage 11 auto-does this
5. **blub.db row 269** — NO per-block legacy fixes; universal extraction primitive only
6. **blub.db row 272** — `python ~/.claude/hooks/wp-blocks.py dump` BEFORE any "missing X" claim
7. **blub.db row 283** — Verify WP API surface via `developer.wordpress.org/reference/functions/<name>/` BEFORE dismissing intelephense warnings
8. **2-attestation rule (NEW 2026-05-23, Bean trust-calibration):** Every load-bearing claim needs 2 independent sources. Subagent prompts MUST demand grep/SQL/file-output evidence inline.
9. **Pipeline test throughout** — `/sgs-clone --deploy-target page:144` after every commit touching converter/pipeline. Stage 11 captures numbers in `stage-11-pixel-diff.json` automatically.
10. **NO underselling** — when a plan decision says "rewrite function X", check the canonical spec (Spec 22 / cloning-pipeline-flow.md / cloning-pipeline-stages.md) for the FULL scope before scoping the work. R-22-10 (read full spec before proposing fix-shape) is the binding rule. Pre-check spec scope FIRST.

## Tooling index (used across all 3 phases)

| Type | Name | Used in |
|---|---|---|
| skill | `/qc-council` | Multi-rater pre-commit gate (every converter/pipeline commit) |
| skill | `/qc-inline` | Single-entry verifications |
| skill | `/verify-loop` | 2-attestation fact-check for diagnostic claims |
| skill | `/systematic-debugging` | Root-cause phase before any fix |
| skill | `/sgs-clone` | Pipeline test + Stage 11 auto pixel-diff |
| skill | `/sgs-update` | DB sync after block.json source changes |
| skill | `/dispatching-parallel-agents` | Independent file-scope work only |
| skill | `/subagent-driven-development` | Per-step implementer + reviewer |
| skill | `/strategic-plan` | This document |
| skill | `/phase-planner` | Per-phase detailed plans (linked below) |
| skill | `/handoff` | Session close |
| skill | `/capture-lesson` | New architectural rules surfaced |
| skill | `/skill-optimiser` (mode 2) | Phase 3 — gap analysis + research per skill |
| skill | `/batch-gap-analysis` | Phase 3 — across 14 WP/SGS skills |
| agent | `wp-sgs-developer` | Phase 1 walker-pre-pass implementation + Phase 2 big-ticket entries |
| mcp | Playwright | Stage 11 auto-uses; manual verification on sandybrown |
| cli | WP-CLI over SSH | Sandybrown introspection |
| python | `~/.claude/hooks/wp-blocks.py dump` | Schema enumeration (row 272) |
| python | `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | DB query CLI |
| python | `scripts/pixel-diff.py` | Standalone diff (also Stage 11 auto-invoked) |

## Reference docs (READ BEFORE STARTING ANY PHASE)

**Mandatory before Phase 1:**
1. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` — canonical spec (§3 FRs, §6 R-22-1 through R-22-13 binding rules, §7 Phase commits, §13 Appendix A walker pseudocode, §14 Appendix B atomic_tag_map algorithm)
2. `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md` — active Phase 1 phase-plan (5-commit cadence + per-commit model routing)
3. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — diagnostic artefact map (read BEFORE conjecturing about pipeline failures)
4. `.claude/cloning-pipeline-flow.md` + `.claude/cloning-pipeline-stages.md` — pipeline flow with Stage 11 + per-stage R/W tables
5. `pipeline-state/mamas-munches-144-2026-05-26-122349/` — pre-walker-rewrite Wave B baseline (**`mean_mismatch_percent: 63.61%`** per file — corrected 2026-05-27 post-handoff audit; the earlier "58.91%" claim was unverifiable drift); also `pipeline-state/mamas-munches-homepage-2026-05-26-012625/` for the pre-chrome-hide reference per D88
6. `.claude/decisions.md` D78-D88 — Spec 22 ratification chain + Phase 0 lessons (D84 scope correction, D85 role-exclusion fix, D86 Tier C delete, D87 pixel-diff divergence, D88 baseline staleness)

**Mandatory before Phase 2:**
1. `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` — full theme-side architecture (template parts + CPTs + Customiser + Site Info store + rules engines)
2. `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md` — Phase 2 detailed plan (generated via `/phase-planner`)
3. `pipeline-state/mamas-munches-homepage-2026-05-23-145045/stage-11-pixel-diff.json` — current header (44.9% mean) + footer (96.3% mean) baseline for delta measurement
4. `sites/mamas-munches/mockups/homepage/index.html` — canonical source mockup header + footer DOM

**Mandatory before Phase 3:**
1. `.claude/parking.md` — live state, all STILL-OPEN entries
2. `.claude/plans/2026-05-24-phase-3-parking-sweep.md` — Phase 3 detailed plan
3. Each entry's individual context (referenced inline in phase 3 plan)

**Mandatory before Phase 4:**
1. `.claude/plans/2026-05-24-phase-4-skill-optimisation.md` — Phase 4 detailed plan
2. blub.db row 176 binding rule — /gap-analysis runs in main conversation, no subagent dispatch
3. `reports/phase-7-skills-audit-2026-05-22.md` + `-extended-` — Phase 7 baseline (input to Phase 4 GA)
4. The 14 WP/SGS skill SKILL.md files at `~/.claude/skills/`

**Reference (read on demand):**
- `.claude/architecture.md` — system overview + DB-first rule + Phase 5a context
- `.claude/decisions.md` D1-D45 — architectural decision log
- `.claude/mistakes.md` — lessons from past sessions (incl. 3 new from 2026-05-23)
- `.claude/specs/archive/16-DETERMINISTIC-CONVERTER-V2-retired-by-spec-22.md` (archived) — pre-Spec-22 converter architecture; retained for git-blame continuity
- `.claude/cloning-pipeline-flow.md` Stage 11 block — pixel-diff orchestrator integration
- `~/.claude/skills/sgs-clone/SKILL.md` — pipeline orchestration + Hard Rules
- `~/.claude/rules/time-estimates.md` — estimates default LOW

## Hidden Decisions (pre-emptive — peer-review pass inline)

These are the decisions a junior executor would pause on mid-phase. Pre-answered here:

1. **"What if the Spec 22 walker rewrite drops sections that the legacy walker handled via essence-match or F1?"** — The pre-rewrite DB snapshot at `pipeline-state/_snapshots/sgs-framework-pre-spec22.db` (SHA256 `d088...0017bc`) + `_retired/convert_pre_spec22.py` enables true rollback per F-RA-2. Stage 11 measurement at Commit 1.4 catches any regression immediately; halt if any section regresses >2pp from Wave B baseline.

2. **"What if the 4 Tier B applied rows + 94 role-detection writes need adjustment post-walker?"** — Per-row reversibility via `pipeline-state/_snapshots/` diff files. If a row routes incorrectly post-walker, UPDATE block_attributes to null the canonical_slot/role and re-think before re-applying.

3. **"What if the `slot_synonyms.role_classification` migration drifts during Phase 1?"** — It's idempotent (re-runs are no-ops on already-classified rows). The external regression test (`_tests/external-derivation-regression.py`) asserts triple-NULL=1090 baseline + 10 canonical triple-NULL rows stay NULL + role classification invariant. Run before every Phase 1 commit.

4. **"Phase 3 parking entries — do we close P-BATCH-GA-14-SKILLS in Phase 3?"** — NO. That entry IS Phase 4's scope. Phase 3 closes everything ELSE.

5. **"Do the 11 slot_synonyms.standalone_block NULL rows block Phase 1.4?"** — NO. Per audit 2026-05-27 (commit b62e1660), 10 of 11 are correctly NULL by design (accessibility props, color attrs, 0-usage, role-excluded). One filled: `role.standalone_block = sgs/label` activates team-member + testimonial routing. Per FR-22-2.4 the walker logs unresolved-equivalent-block.log for any NULL standalone_block hits — that's the operator-fix path, not a hard block.

7. **"Why isn't header/footer cloning part of Phase 1's walker pre-pass?"** — Headers + footers don't fit the generic page-clone pipeline: (a) they're 1-per-site (running the page pipeline N times redundantly clones them); (b) their HTML doesn't follow div→block conversion patterns; (c) custom behaviours (sticky / transparent / shrink / partial-stick) live in Customiser per Spec 17, not block attributes. Building chrome-handling into the walker pre-pass would force the wrong abstraction. Phase 2 builds a dedicated one-shot script instead.

6. **"What if /sgs-clone's Stage 11 breaks during Phase 1 testing?"** — Stage 11 is soft-fail (commit `1331f23a`). If it errors, the rest of the run completes. Diagnostic: read `pipeline-state/<run>/pixel-diff/` for partial output + check Stage 10 link= URL parsing.

## Key Judgement Calls (Bean decides during execution)

1. **Phase 1 acceptance threshold for "good enough":** Spec 22 §FR-22-7 sets per-section ≤5% × 3 viewports for all 7 body sections (21 cells) + Bean visual sign-off (R-22-13 co-authoritative). Lock at ≤5% OR relax to ≤8% if first walker-rewrite iteration shows ≤5% requires Phase 1.5 noise-floor work the spec already parks?
2. **Phase 2 scope decision (handled by `/phase-planner`):** does the new header/footer cloner integrate as an optional stage of `/sgs-clone` OR ship as a standalone `scripts/clone-header-footer.py` invoked separately? Trade-off: integrated = single-command UX; standalone = independent lifecycle + no risk of regressing the body pipeline.
3. **Phase 3 sequencing:** group by file-scope (parallel-safe) OR strict-sequential per blub.db row 254 "leftover-buckets first" discipline?
4. **Phase 4 model:** /skill-optimiser mode 2 inline (main conversation per row 176) OR subset to ~6 most-critical skills first then iterate?

## Cost estimate

Per `~/.agents/skills/delegate/data/routing-table.json` defaults:
- Phase 1 inline: ~150-200K tokens Opus + ~5 wp-sgs-developer dispatches × ~80K tokens Sonnet
- Phase 2: to be set by `/phase-planner` — likely ~100-150K tokens Opus + 2-4 wp-sgs-developer dispatches × ~60K tokens Sonnet
- Phase 3: ~20 /qc-inline runs × ~10K tokens + ~5 /qc-council runs × ~40K tokens
- Phase 4: ~3 hrs inline Opus + 14 skill reads + research

**Rough total: ~$70-110 API across 5-7 sessions.**

---

## See also

- `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md` — current Phase 1 detailed plan (5-commit walker rewrite cadence per R-22-5). Earlier `.claude/plans/archive/2026-05-25-phase-1-universal-extraction-superseded-by-spec-22.md` is archived for git-blame continuity.
- `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md` — Phase 2 detailed plan (generated via `/phase-planner`)
- `.claude/plans/2026-05-24-phase-3-parking-sweep.md` — Phase 3 detailed plan (renamed from `phase-2-parking-sweep.md`)
- `.claude/plans/2026-05-24-phase-4-skill-optimisation.md` — Phase 4 detailed plan (renamed from `phase-3-skill-optimisation.md`)
- `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` — Phase 2 architectural reference
- `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — diagnostic artefact map (NEW)
- `.claude/plans/2026-05-21-architecture-staging.md` — PARENT PLAN (PARTIAL per 2026-05-23 fact-check)
