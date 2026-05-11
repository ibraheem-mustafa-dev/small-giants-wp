---
doc_type: next-session-prompt
project: small-giants-wp
last_updated: 2026-05-11
recommended_model_next: opus (P3 starts; P3 step 6 fans out to Sonnet subagents — Opus parent dispatches)
---

# Next Session Prompt — Spec 14 P3 (catalogue build)

You are picking up from the 2026-05-11 session that shipped:
- **Spec 14 v2.1 approved** (autonomous draft-to-WordPress-clone pipeline)
- **P1 executed** (commit `f467bc72`) — doc reconciliation + 9 static-block snapshots + FR18 decisions
- **P2 executed** (commit `15f4d6cf`) — uimax schema migrations + `recursion-guard.py` module
- **All P3-P10 phase plans committed + QC'd** with 12 critical fixes applied

The plans are the script. P3 plan at `.claude/plans/phase-3-catalogue-build.md` is detailed enough to execute cold.

Invoke `/autopilot` before doing anything else.

## Read first (cold-start orientation, ~5 min)

1. `.claude/cloning-pipeline-flow.md` — one-page visual of the whole pipeline (60-sec read)
2. `.claude/specs/14-CLONING-PIPELINE-CATALOGUE.md` Section 2.5 (build-status inventory) + FR1-FR4 + FR26 (P3 scope)
3. `.claude/plans/master-spec14-build-plan.md` — cross-phase view + parallelisation map
4. `.claude/plans/phase-3-catalogue-build.md` — THE EXECUTION SCRIPT for this session

## What you're doing in this session

**Phase 3 — 4-layer catalogue build, ~5-6 hr.** Build the Rosetta Stone SGS column:
- Layer 1 envelopes (one row per pattern wrapper)
- Layer 4 inner-blocks (populate sgs-db `block_compositions` for 38 empty patterns)
- Layer 3 internal-elements (per-block slot list — 67 blocks; embarrassingly parallel via 8-batch fanout)
- Layer 2 role-templates (13-20 role taxonomy; consume existing `ATTR_TO_CSS` dict)
- Hand-author hero entry to match `HERO_FINGERPRINT_SELECTORS` (regression baseline for P4)

Steps 1-9 in `.claude/plans/phase-3-catalogue-build.md`. Each step has Model / Action / Files / Outcome / Time / Cold-Entry / Test layers + dispatch prompts where applicable.

## Key fixes already baked into the P3 plan (don't re-decide)

- Step 3 has file_path pre-flight verification (if >5 patterns NULL → halt)
- Step 6 wraps per-block DOM walk in `RecursionGuard(max_depth=12)` from P2's module
- Step 6 fans out to 8 parallel Sonnet subagents (~8 blocks each)
- Step 7 verifies hero entry against `HERO_FINGERPRINT_SELECTORS` bit-exactly
- Layer 4 cross-platform `equivalent_implementations`: emit `null` + `is_gap_candidate=true` for Bootstrap/Tailwind/shadcn (surface via future `/uimax-sgs-scrape-pattern` runs)

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | First — session routing + ADHD support |
| `/sgs-wp-engine` | Any SGS framework lookups |
| `/sgs-db` | Query `patterns` + `block_compositions` |
| `/uimax` | Query `naming_conventions` for role taxonomy alignment |
| `/dispatching-parallel-agents` | Step 6 fanout (8 subagents, 8-block batches) |
| `/subagent-prompt` | Write the cold prompts for each Step 6 subagent |
| `/qc-inline` | Smoke check on a few subagent outputs before merging all 8 batches |
| `/handoff` | Session close |

## Hard constraints (always)

- No canonical mutation outside FR21 — P3 only writes to `plugins/sgs-blocks/scripts/fingerprint-builder/output/` + sgs-db `block_compositions` updates
- No em-dashes in pipeline output
- No fabrication — grep before claiming code exists (process lesson from 2026-05-11)
- Per-platform Rosetta Stone: every Layer 2/3/4 row carries `equivalent_implementations` (null + is_gap_candidate where not yet mapped)

## Don't

- Don't re-plan P3 — the plan is QC'd and locked. Halt at a step's On-Fail clause if reality diverges; surface to operator
- Don't run /sgs-clone end-to-end yet — P3 unblocks P4-P5; full pipeline doesn't work until P9 ships
- Don't skip the hero baseline check in Step 7 — it's the regression contract that P4 relies on
- Don't trust v1 fingerprints `block_type` field — it's frozen/stale; sgs-db is authoritative (lesson from P1)

## Done-when (this session)

- [ ] P3 plan steps 1-9 executed
- [ ] `plugins/sgs-blocks/scripts/fingerprint-builder/output/` directory contains 5 JSON files
- [ ] sgs-db `block_compositions` has ≥38 rows with non-empty `block_slugs`
- [ ] Hero entry in `layer-3-internal-elements.json` is a superset of `HERO_FINGERPRINT_SELECTORS`
- [ ] QA gate (Step 8) PASS
- [ ] Commit on origin/main: `feat(p3): 4-layer catalogue shipped`

After P3 ships, the next session picks up P4 (extract.py refactor) — plan at `.claude/plans/phase-4-extract-refactor.md`.
