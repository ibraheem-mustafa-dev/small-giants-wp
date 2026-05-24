---
doc_type: strategic-plan
project: small-giants-wp
plan_name: 2026-05-24-post-architecture-recovery-strategic-plan
generated: 2026-05-23
parent_plan: .claude/plans/2026-05-21-architecture-staging.md (PARTIAL — see fact-check findings)
primary_goal: "Close the structural pixel-diff blockers (G1+G3+G5), complete the leftover work the 2026-05-21 architecture plan undersold, build a specialised header/footer cloning pipeline, finish remaining parking, then optimise the skill+command surface that depends on all the above."
---

# Strategic plan — post-architecture-recovery (4 phases)

**Revision 2026-05-23 (post-Step-1.1).** Phase 2 inserted: header + footer specialised cloning pipeline. Existing Phase 2 (parking) renumbered to Phase 3. Existing Phase 3 (skill optimisation) renumbered to Phase 4. Phase 1 acceptance criteria narrowed: header + footer pixel-diff still captured by Stage 11 for regression monitoring, but no longer gate Phase 1 closure (they are Phase 2's scope).

## Plain-English summary (Rule 17: Problem → Effect → Solution)

**Problem.** The 2026-05-21 architecture programme was reported as fully shipped, but a 2026-05-23 fact-check (5 parallel investigators + inline 2-attestation) surfaced material gaps:
1. Phase 3 implemented only step 4 of Spec 16 §15's 4-step Wave 2 reshape — steps 1-3 (walker-entry CSS-class pre-pass) were never built
2. Phase 1 imported 5,234 of 7,283 hooks — 2,049 hooks (28%) unimported; legacy `blocks.db` + `hooks.db` still active dependencies
3. Phase 6 changed 87 `role='content'` attrs in source block.json files but DB has only 17 — `/sgs-update` never ran post-Phase-6
4. Several stale doc claims (Spec 17 §6.4 Option A, plan block count 73 vs 69, etc.)

**Effect.** G1+G3+G5 symptoms persist on the live page (5 of 9 sections fall through to fallback at Stage 2). Mean pixel-diff 70.5%. The architecture programme close-out's "all shipped" claim is structurally true (all decisions landed) but functionally insufficient (the decisions were undersold against the spec). Further work has been blocked because the planner trusted close-out claims that didn't match reality.

**Solution.** Four sequential phases:
- **Phase 1 — Universal walker + G1+G3+G5 closure + architecture programme leftovers.** Ship the universal walker (Spec 16 §15 steps 1-3) that powers the NORMAL ROUTE (FR4 + FR2 + FR3 + FR6) — the build-up path that every section takes when not matched by FR1's fast path. Close G1 (OPEN-block emission for FR1-matched composite blocks with InnerBlocks data), G3 (slot_list.py visual-slot extension via property_suffixes), G5 (per-block DOM-shape fixes — tag/class preservation + per-block render.php adjustments). Wire FR1 pattern fast-path branch (Spec 16 §FR1 branch b — section class matches registered pattern slug). Import the missing 2,049 hooks. Re-run /sgs-update for role='content' DB sync. Refresh stale doc claims. **Sections falling through to `sgs/container` is the CORRECT architectural default per FR4 + Decision 3 — NOT a defect.** The gap was that the normal route (sgs/container start + walker build-up) wasn't wired. Empirical acceptance: G1+G3+G5 closed per Spec 16 §14 acceptance criteria; pixel-diff captured as measurement only (downstream side-effect). **Header + footer excluded from acceptance gating** (Phase 2's specialised cloner scope).

  **REVISION 2026-05-24 (second pass) — Phase 1 partially shipped via 5 different changes than originally planned.** Mid-session investigation found the existing `convert.py:walk()` already contains 9 named branches that together deliver the walker outcome — provided the data layer is correct. So instead of building a new "pre-pass class graph", we shipped: (1) slot_synonyms cleanup, (2) section_inner_absorb walker pre-pass (one-section-one-container), (3) quote canonical migration, (4) /sgs-update Stage 4 wiring (assign-canonical.py was orphaned), (5) brand mockup BEM rename. G1/G3/G5 remain TODO. Stage 11 mean pixel-diff 70.5% → 73.9%. Full detail in phase-1-structural-recovery.md "What ACTUALLY shipped" section + follow-on items F1+F2 at the end. **Steps 1.6/1.7/1.8/1.9/1.10/1.11 remain pending in the original plan** — the next Phase 1 session should pick up Step 1.7 G3 (slot_list visual extension) as the highest-leverage move to close the pixel-diff regression on featured-product/ingredients-section.
- **Phase 2 — Header + footer specialised cloning pipeline.** Build a separate one-shot script (runs once per site, not per page) that converts source HTML headers + footers into Spec 17 architecture (`header.html` / `footer.html` template parts + `Sgs_Site_Info` store + Customiser-controlled sticky/transparent/shrink behaviours + `sgs_header` / `sgs_footer` CPTs). Bypasses the generic page-clone pipeline because (a) 1-per-site means N-page sites would clone redundantly N times; (b) header/footer HTML doesn't follow the div→block pattern body content does; (c) custom behaviours (sticky, transparent, shrinking, partial-stick) live in Customiser, not block attributes. Detail in `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md` (generated via `/phase-planner`).
- **Phase 3 — Parking sweep close-out.** Finish the remaining ~22 STILL-OPEN parking entries (the original handoff's Task 4 + new entries from today's investigation). Excludes skills (Phase 4).
- **Phase 4 — Skill + command optimisation.** /skill-optimiser mode 2 (gap analysis + research) on the 14 WP/SGS skills + /batch-gap-analysis. Runs LAST because it grades against tools the previous phases fix.

## Phase summary table

| Phase | Scope | Est | Sessions | Critical gate |
|---|---|---|---|---|
| **1** Universal walker + G1+G3+G5 closure | Universal walker (§15 steps 1-3) + FR1 pattern fast-path + G1 OPEN-block emit + G3 slot_list visual + G5 per-block DOM fixes + hooks completion + role='content' DB sync + doc refresh | 8-12 hrs | 2-3 | G1+G3+G5 closed per Spec 16 §14 acceptance + hero stage_3_slot_list < 30 + no regression on FR1-matched sections (header/footer excluded — Phase 2 scope) |
| **2** Header + footer cloner | Separate one-shot script → Spec 17 architecture (template parts + Site Info + Customiser) | TBD by `/phase-planner` | 1-2 | Mama's Munches header + footer parity ≥ defined per-element thresholds at 375/768/1440 (header sticky behaviour exact match) |
| **3** Parking close-out | ~22 STILL-OPEN entries (no skills) | 6-8 hrs | 2-3 | parking.md "Open" section contains zero entries beyond P-BATCH-GA-14-SKILLS |
| **4** Skill optimisation | /skill-optimiser mode 2 on 14 WP/SGS skills + /batch-gap-analysis | 3-4 hrs | 1 (dedicated) | 14 per-skill JSON evaluations + 1 review report + S-grade confirmations queued |

**Total: ~13 hrs + Phase 2 TBD, across 5-6 sessions** (calibrate after Phase 1 + Phase 2 actuals; quote the smallest plausible figure per `~/.claude/rules/time-estimates.md`, not the upper range).

## Dependency graph

```
Phase 1 (Universal walker + G1+G3+G5 closure)
  ↓ /qc-council between EVERY commit touching converter/pipeline (blub.db row 255)
  ↓ /sgs-clone --deploy-target page:144 after EVERY code change (not bundled) — Stage 11 auto-captures
  ↓ Phase 1 gate: G1 (hero CTAs in DOM) + G3 (hero stage_3_slot_list < 30) + G5 (per-block DOM-shape audit complete) + no regression on FR1-matched sections
  ↓ Per-block G5 work parallelisable across blocks (file-disjoint branches)
  ↓ (Stage 11 continues capturing header + footer for monitoring; no gate)
Phase 2 (Header + footer specialised cloner)
  ↓ Reads Spec 17 architecture (template parts + Site Info + Customiser)
  ↓ /qc-council on script commits; runs OUTSIDE main /sgs-clone pipeline
  ↓ Phase 2 gate: per-element parity thresholds met (TBD by /phase-planner)
Phase 3 (Parking sweep)
  ↓ /qc-inline per entry + /qc-council per multi-entry commit
  ↓ /sgs-clone after any task touching the pipeline
  ↓ Phase 3 gate: parking.md open section = {P-BATCH-GA-14-SKILLS} only
Phase 4 (Skill optimisation) — dedicated session
  ↓ blub.db row 176: /gap-analysis runs in main conversation, no subagent dispatch
  ↓ Phase 4 gate: 14 evaluations + review report + waiting-queue
```

## Methodology guardrails (apply to ALL phases)

1. **Diagnostic discipline (NEW 2026-05-23):** Before ANY pipeline-related fix-shape proposal, read the artefacts named in `.claude/pipeline-state-debug-artefacts-inventory.md` first. Do NOT conjecture root cause without trace.jsonl + summary.log + leftover-buckets.json in hand.
2. **blub.db row 254** — `pipeline-state/<run>/leftover-buckets.json` BEFORE converter conjecture
3. **blub.db row 255** — Multi-model `/qc-council` BEFORE every commit touching converter/pipeline/SGS-block logic
4. **blub.db row 256** — Per-section cropped pixel-diff via `--selector .sgs-{section}`; Stage 11 auto-does this
5. **blub.db row 269** — NO per-block legacy fixes; universal extraction primitive only
6. **blub.db row 272** — `python ~/.claude/hooks/wp-blocks.py dump` BEFORE any "missing X" claim
7. **blub.db row 283** — Verify WP API surface via `developer.wordpress.org/reference/functions/<name>/` BEFORE dismissing intelephense warnings
8. **2-attestation rule (NEW 2026-05-23, Bean trust-calibration):** Every load-bearing claim needs 2 independent sources. Subagent prompts MUST demand grep/SQL/file-output evidence inline.
9. **Pipeline test throughout** — `/sgs-clone --deploy-target page:144` after every commit touching converter/pipeline. Stage 11 captures numbers in `stage-11-pixel-diff.json` automatically.
10. **NO Phase 3-style underselling** — when a plan decision says "rewrite function X", check the canonical spec (Spec 16 / cloning-pipeline-flow.md) for the FULL scope before scoping the work. Spec 16 §15 written same-day as Phase 3 ship caught this — but only retrospectively. Pre-check spec scope FIRST.

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
1. `.claude/pipeline-state-debug-artefacts-inventory.md` — diagnostic artefact map (NEW 2026-05-23)
2. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §15 — Wave 2 reshape full 4-step requirement
3. `.claude/cloning-pipeline-flow.md` — pipeline flow with new Stage 11 + per-stage R/W tables
4. `pipeline-state/mamas-munches-homepage-2026-05-23-145045/` — canonical baseline run + Stage 11 numbers
5. `reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md` — original G1-G5 honest-path council finding
6. `.claude/plans/2026-05-24-phase-1-structural-recovery.md` — Phase 1 detailed plan

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
- `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` (full) — converter v2 architecture
- `.claude/cloning-pipeline-flow.md` Stage 11 block — pixel-diff orchestrator integration
- `~/.claude/skills/sgs-clone/SKILL.md` — pipeline orchestration + Hard Rules
- `~/.claude/rules/time-estimates.md` — estimates default LOW

## Hidden Decisions (pre-emptive — peer-review pass inline)

These are the decisions a junior executor would pause on mid-phase. Pre-answered here:

1. **"When the walker pre-pass conflicts with the existing FR1 fast-path, which wins?"** — The FR1 fast-path is correctly matching hero + trust-bar today. Don't break it. The new pre-pass is for sections that DON'T match FR1 — it should produce structured emit even when no registered block matches.

2. **"What if Phase 1 hooks completion breaks the DB schema?"** — The schema is already correct. The gap is data, not structure. Use `/sgs-update --refresh-upstream` which is already implemented (Phase 4). Verify before commit via `SELECT COUNT(*) FROM hooks` matching legacy hooks.db count.

3. **"What if the role='content' DB sync overwrites other attrs?"** — `/sgs-update` Stage 1 is idempotent (re-runs produce zero diffs per Phase 4 acceptance). Safe to run.

4. **"Phase 3 parking entries — do we close P-BATCH-GA-14-SKILLS in Phase 3?"** — NO. That entry IS Phase 4's scope. Phase 3 closes everything ELSE.

5. **"When Phase 1's walker pre-pass changes Stage 4 attr counts, do we adjust the leftover-buckets classifier?"** — Possibly. The classifier currently bucks `preset_managed` slots as `extraction_failed` (documented today in cloning-pipeline-flow.md). If Phase 1 attr increases reveal more preset_managed slots, the classifier code change is a Phase 3 candidate.

7. **"Why isn't header/footer cloning part of Phase 1's walker pre-pass?"** — Headers + footers don't fit the generic page-clone pipeline: (a) they're 1-per-site (running the page pipeline N times redundantly clones them); (b) their HTML doesn't follow div→block conversion patterns; (c) custom behaviours (sticky / transparent / shrink / partial-stick) live in Customiser per Spec 17, not block attributes. Building chrome-handling into the walker pre-pass would force the wrong abstraction. Phase 2 builds a dedicated one-shot script instead.

6. **"What if /sgs-clone's Stage 11 breaks during Phase 1 testing?"** — Stage 11 is soft-fail (commit `1331f23a`). If it errors, the rest of the run completes. Diagnostic: read `pipeline-state/<run>/pixel-diff/` for partial output + check Stage 10 link= URL parsing.

## Key Judgement Calls (Bean decides during execution)

1. **Phase 1 acceptance threshold for "good enough":** Spec 16 §15 sets hero `stage_3_slot_list` < 30 (from 142) + hero `variation_css_rules` ≥ 8 (from 0) + brand pixel-diff at 1440 < 20% (from 83%). Lock at these numbers OR relax if first walker-pre-pass iteration shows the targets are too aggressive given other constraints?
2. **Phase 2 scope decision (handled by `/phase-planner`):** does the new header/footer cloner integrate as an optional stage of `/sgs-clone` OR ship as a standalone `scripts/clone-header-footer.py` invoked separately? Trade-off: integrated = single-command UX; standalone = independent lifecycle + no risk of regressing the body pipeline.
3. **Phase 3 sequencing:** group by file-scope (parallel-safe) OR strict-sequential per blub.db row 254 "leftover-buckets first" discipline?
4. **Phase 4 model:** /skill-optimiser mode 2 inline (main conversation per row 176) OR subset to ~6 most-critical skills first then iterate?

## Cost estimate

Per `~/.agents/skills/delegate/data/routing-table.json` defaults:
- Phase 1 inline: ~150-200K tokens Opus + ~5 wp-sgs-developer dispatches × ~80K tokens Sonnet
- Phase 2: TBD by `/phase-planner` — likely ~100-150K tokens Opus + 2-4 wp-sgs-developer dispatches × ~60K tokens Sonnet
- Phase 3: ~20 /qc-inline runs × ~10K tokens + ~5 /qc-council runs × ~40K tokens
- Phase 4: ~3 hrs inline Opus + 14 skill reads + research

**Rough total: ~$70-110 API across 5-7 sessions.**

---

## See also

- `.claude/plans/2026-05-24-phase-1-structural-recovery.md` — Phase 1 detailed plan
- `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md` — Phase 2 detailed plan (generated via `/phase-planner`)
- `.claude/plans/2026-05-24-phase-3-parking-sweep.md` — Phase 3 detailed plan (renamed from `phase-2-parking-sweep.md`)
- `.claude/plans/2026-05-24-phase-4-skill-optimisation.md` — Phase 4 detailed plan (renamed from `phase-3-skill-optimisation.md`)
- `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` — Phase 2 architectural reference
- `.claude/pipeline-state-debug-artefacts-inventory.md` — diagnostic artefact map (NEW)
- `.claude/plans/2026-05-21-architecture-staging.md` — PARENT PLAN (PARTIAL per 2026-05-23 fact-check)
