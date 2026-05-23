---
doc_type: strategic-plan
project: small-giants-wp
plan_name: 2026-05-24-post-architecture-recovery-strategic-plan
generated: 2026-05-23
parent_plan: .claude/plans/2026-05-21-architecture-staging.md (PARTIAL — see fact-check findings)
primary_goal: "Close the structural pixel-diff blockers (G1+G3+G5), complete the leftover work the 2026-05-21 architecture plan undersold, finish remaining parking, then optimise the skill+command surface that depends on all the above."
---

# Strategic plan — post-architecture-recovery (3 phases)

## Plain-English summary (Rule 17: Problem → Effect → Solution)

**Problem.** The 2026-05-21 architecture programme was reported as fully shipped, but a 2026-05-23 fact-check (5 parallel investigators + inline 2-attestation) surfaced material gaps:
1. Phase 3 implemented only step 4 of Spec 16 §15's 4-step Wave 2 reshape — steps 1-3 (walker-entry CSS-class pre-pass) were never built
2. Phase 1 imported 5,234 of 7,283 hooks — 2,049 hooks (28%) unimported; legacy `blocks.db` + `hooks.db` still active dependencies
3. Phase 6 changed 87 `role='content'` attrs in source block.json files but DB has only 17 — `/sgs-update` never ran post-Phase-6
4. Several stale doc claims (Spec 17 §6.4 Option A, plan block count 73 vs 69, etc.)

**Effect.** G1+G3+G5 symptoms persist on the live page (5 of 9 sections fall through to fallback at Stage 2). Mean pixel-diff 70.5%. The architecture programme close-out's "all shipped" claim is structurally true (all decisions landed) but functionally insufficient (the decisions were undersold against the spec). Further work has been blocked because the planner trusted close-out claims that didn't match reality.

**Solution.** Three sequential phases:
- **Phase 1 — Structural pipeline recovery.** Close the walker-entry pre-pass (Spec 16 §15 steps 1-3), import the missing 2,049 hooks, re-run /sgs-update to sync role='content' DB rows, refresh stale doc claims. Empirical acceptance: hero `stage_3_slot_list` failures < 30 + brand pixel-diff at 1440 < 20% + Phase 1 hooks count matches legacy hooks.db.
- **Phase 2 — Parking sweep close-out.** Finish the remaining ~22 STILL-OPEN parking entries (the original handoff's Task 4 + new entries from today's investigation). Excludes skills (Phase 3).
- **Phase 3 — Skill + command optimisation.** /skill-optimiser mode 2 (gap analysis + research) on the 14 WP/SGS skills + /batch-gap-analysis. Runs LAST because it grades against tools the previous phases fix.

## Phase summary table

| Phase | Scope | Est | Sessions | Critical gate |
|---|---|---|---|---|
| **1** Structural recovery | Walker pre-pass + hooks completion + DB sync + doc refresh | 4-6 hrs | 1-2 | Hero `stage_3_slot_list` failures < 30 AND brand pixel-diff at 1440 < 20% |
| **2** Parking close-out | ~22 STILL-OPEN entries (no skills) | 6-8 hrs | 2-3 | parking.md "Open" section contains zero entries beyond P-BATCH-GA-14-SKILLS |
| **3** Skill optimisation | /skill-optimiser mode 2 on 14 WP/SGS skills + /batch-gap-analysis | 3-4 hrs | 1 (dedicated) | 14 per-skill JSON evaluations + 1 review report + S-grade confirmations queued |

**Total: ~13-18 hrs across 4-6 sessions.** Honest estimate calibrated LOW per `~/.claude/rules/time-estimates.md`.

## Dependency graph

```
Phase 1 (Structural recovery)
  ↓ /qc-council between EVERY commit touching converter/pipeline
  ↓ /sgs-clone --deploy-target page:144 between tasks (Stage 11 auto-captures)
  ↓ Phase 1 gate: hero stage_3_slot_list failures < 30 + brand 1440 < 20%
Phase 2 (Parking sweep)
  ↓ /qc-inline per entry + /qc-council per multi-entry commit
  ↓ /sgs-clone after any task touching the pipeline
  ↓ Phase 2 gate: parking.md open section = {P-BATCH-GA-14-SKILLS} only
Phase 3 (Skill optimisation) — dedicated session
  ↓ blub.db row 176: /gap-analysis runs in main conversation, no subagent dispatch
  ↓ Phase 3 gate: 14 evaluations + review report + waiting-queue
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
1. `.claude/parking.md` — live state, all STILL-OPEN entries
2. `.claude/plans/2026-05-24-phase-2-parking-sweep.md` — Phase 2 detailed plan
3. Each entry's individual context (referenced inline in phase 2 plan)

**Mandatory before Phase 3:**
1. `.claude/plans/2026-05-24-phase-3-skill-optimisation.md` — Phase 3 detailed plan
2. blub.db row 176 binding rule — /gap-analysis runs in main conversation, no subagent dispatch
3. `reports/phase-7-skills-audit-2026-05-22.md` + `-extended-` — Phase 7 baseline (input to Phase 3 GA)
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

4. **"Phase 2 parking entries — do we close P-BATCH-GA-14-SKILLS in Phase 2?"** — NO. That entry IS Phase 3's scope. Phase 2 closes everything ELSE.

5. **"When Phase 1's walker pre-pass changes Stage 4 attr counts, do we adjust the leftover-buckets classifier?"** — Possibly. The classifier currently bucks `preset_managed` slots as `extraction_failed` (documented today in cloning-pipeline-flow.md). If Phase 1 attr increases reveal more preset_managed slots, the classifier code change is a Phase 2 candidate.

6. **"What if /sgs-clone's Stage 11 breaks during Phase 1 testing?"** — Stage 11 is soft-fail (commit `1331f23a`). If it errors, the rest of the run completes. Diagnostic: read `pipeline-state/<run>/pixel-diff/` for partial output + check Stage 10 link= URL parsing.

## Key Judgement Calls (Bean decides during execution)

1. **Phase 1 acceptance threshold for "good enough":** Spec 16 §15 sets hero `stage_3_slot_list` < 30 (from 142) + hero `variation_css_rules` ≥ 8 (from 0) + brand pixel-diff at 1440 < 20% (from 83%). Lock at these numbers OR relax if first walker-pre-pass iteration shows the targets are too aggressive given other constraints?
2. **Phase 2 sequencing:** group by file-scope (parallel-safe) OR strict-sequential per blub.db row 254 "leftover-buckets first" discipline?
3. **Phase 3 model:** /skill-optimiser mode 2 inline (main conversation per row 176) OR subset to ~6 most-critical skills first then iterate?

## Cost estimate

Per `~/.agents/skills/delegate/data/routing-table.json` defaults:
- Phase 1 inline: ~150-200K tokens Opus + ~5 wp-sgs-developer dispatches × ~80K tokens Sonnet
- Phase 2: ~20 /qc-inline runs × ~10K tokens + ~5 /qc-council runs × ~40K tokens
- Phase 3: ~3 hrs inline Opus + 14 skill reads + research

**Rough total: ~$50-80 API across 4-6 sessions.**

---

## See also

- `.claude/plans/2026-05-24-phase-1-structural-recovery.md` — Phase 1 detailed plan
- `.claude/plans/2026-05-24-phase-2-parking-sweep.md` — Phase 2 detailed plan
- `.claude/plans/2026-05-24-phase-3-skill-optimisation.md` — Phase 3 detailed plan
- `.claude/pipeline-state-debug-artefacts-inventory.md` — diagnostic artefact map (NEW)
- `.claude/plans/2026-05-21-architecture-staging.md` — PARENT PLAN (PARTIAL per 2026-05-23 fact-check)
