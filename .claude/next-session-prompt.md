---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-24-recovery-phase-1
generated: 2026-05-23
parent_session: small-giants-wp-2026-05-23-architecture-cleanup-and-factcheck
primary_goal: "Execute Phase 1 of the post-recovery strategic plan. Phase 1 closes the G1+G3+G5 structural pixel-diff blockers (Spec 16 §15 steps 1-3 — walker-entry CSS-class pre-pass) + completes the data gaps left by the 2026-05-21 architecture programme."
---

# Next session — Phase 1 of the post-recovery strategic plan

**Invoke `/autopilot` before anything else.**

This handoff is intentionally short. The detailed work is in the linked phase plans + reference docs. Read in the order below.

## Step 0 — Tooling you'll use (read which fits your task; don't read all)

| Tool | When you'll reach for it |
|---|---|
| `/sgs-clone` | Pipeline test after every commit touching converter/pipeline. Stage 11 auto-captures per-section pixel-diff. |
| `/sgs-update` | Re-sync sgs-framework.db after block.json / source changes |
| `/qc-council` | Multi-rater pre-commit gate — MANDATORY before every commit touching converter / pipeline / SGS-block (blub.db row 255) |
| `/qc-inline` | Single-file or single-entry verification |
| `/verify-loop` | 2-attestation fact-check before trusting any load-bearing claim |
| `/systematic-debugging` | Root-cause investigation BEFORE proposing any fix |
| `/dispatching-parallel-agents` | Parallel work on file-independent tasks |
| `/subagent-driven-development` | Per-step implementer + reviewer |
| `/capture-lesson` | New architectural rules surfaced |
| `/handoff` | Session close |
| `wp-sgs-developer` agent | Phase 1 walker-pre-pass implementation + big-ticket parking |
| Playwright MCP | Stage 11 auto-uses; manual checks on sandybrown |
| `~/.claude/hooks/wp-blocks.py dump` | Schema enumeration BEFORE any "missing X" claim (blub.db row 272) |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | DB query CLI |
| `scripts/pixel-diff.py` | Standalone pixel-diff (also Stage 11 auto-invoked) |

## Step 1 — Read THESE docs BEFORE starting any work (do NOT skip)

**Phase-agnostic context (read once, applies to every session):**
1. `.claude/pipeline-state-debug-artefacts-inventory.md` — the diagnostic artefact map. Use BEFORE conjecturing about any pipeline failure (blub.db row 254). **This doc is the most important new artefact from 2026-05-23 — gives you a holistic picture of every JSON/log file the pipeline writes and how to use each for diagnosis.**
2. `.claude/plans/2026-05-24-strategic-plan.md` — the 3-phase recovery strategic plan
3. `.claude/architecture.md` — system overview, DB-first rule, Phase 5a context
4. `.claude/decisions.md` D1-D45 — full decision log
5. `.claude/mistakes.md` — lessons (including 3 new from 2026-05-23)

**Phase 1 specific (this session):**
6. `.claude/plans/2026-05-24-phase-1-structural-recovery.md` — **THE Phase 1 plan with step-by-step execution + cold prompts + KJC + Hidden Decisions**
7. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §15 — Wave 2 reshape 4-step requirement (the spec Phase 3 only half-implemented)
8. `.claude/cloning-pipeline-flow.md` — current pipeline state with Stage 11 block

**Baseline artefacts (read for empirical state):**
9. `pipeline-state/mamas-munches-homepage-2026-05-23-145045/summary.log` — last clean baseline
10. `pipeline-state/mamas-munches-homepage-2026-05-23-145045/trace.jsonl` — filter by `stage` field; read `stage_2_confidence_matrix` events for the 5 fall-through boundaries (b1 header, b4 featured-product, b7 gift-section, b8 social-proof, b9 footer) + `stage_4_converter_v2` events for the same to see emit shape. Useful one-liner: `grep -E '"stage": "(stage_2_confidence_matrix|stage_4_converter_v2)"' pipeline-state/<run>/trace.jsonl`
11. `pipeline-state/mamas-munches-homepage-2026-05-23-145045/stage-11-pixel-diff.json` — canonical pixel-diff baseline (mean 70.5%, per-section breakdown)
12. `pipeline-state/mamas-munches-homepage-2026-05-23-145045/leftover-buckets.json` — gap classification
13. `reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md` — original G1-G5 honest-path council

**Read only as needed (not every session):**
- `.claude/plans/2026-05-24-phase-2-parking-sweep.md` — Phase 2 plan (don't read until Phase 1 closes)
- `.claude/plans/2026-05-24-phase-3-skill-optimisation.md` — Phase 3 plan (don't read until Phases 1+2 close)
- `.claude/plans/2026-05-21-architecture-staging.md` — PARENT plan (PARTIAL — see 2026-05-23 fact-check amendments inline)
- `~/.claude/rules/time-estimates.md` — quote estimates LOW
- `~/.claude/rules/adhd-collaboration.md` — Rules 1-17

## Step 2 — Execute Phase 1 per its plan

Open `.claude/plans/2026-05-24-phase-1-structural-recovery.md` and follow the step-by-step (Steps 1.1 through 1.11). Each step has:
- Model assignment (inline / sonnet / wp-sgs-developer)
- Pre-written cold prompts for delegated steps
- Per-step QA gate
- Empirical acceptance criteria

**Phase 1 SHOULD NOT close until ALL of:**
- Hero `stage_3_slot_list` failures < 30 (from 142)
- Hero `variation_css_rules` ≥ 8 (from 0)
- Brand pixel-diff at 1440 < 20% (from 83.4%)
- Hook count matches legacy hooks.db ±2%
- DB `role='content'` matches source (87/40)
- Spec 17 + plan 73→69 + Decision 12 footnote landed

## Step 3 — When Phase 1 closes

Invoke `/handoff` per Step 1.11 of the phase plan. The handoff writes the next-session-prompt scoped to Phase 2.

---

## State recap (1 sentence)

The 2026-05-21 architecture programme was reported as shipped but a 2026-05-23 fact-check (5 parallel investigators + 2-attestation per claim) surfaced material gaps; this session executes Phase 1 of the 3-phase recovery plan to close them.

## Methodology guardrails (always-on)

1. **Diagnostic discipline:** Read `.claude/pipeline-state-debug-artefacts-inventory.md` artefacts BEFORE conjecturing about pipeline failures
2. **blub.db row 254** — leftover-buckets BEFORE converter conjecture
3. **blub.db row 255** — /qc-council BEFORE every converter/pipeline commit
4. **blub.db row 256** — per-section pixel-diff via Stage 11 auto-capture
5. **blub.db row 269** — universal extraction only; NO per-block legacy fixes
6. **blub.db row 272** — schema enumeration BEFORE "missing X" claims
7. **blub.db row 283** — verify WP API surface before dismissing intelephense
8. **2-attestation rule (NEW 2026-05-23)** — every load-bearing claim needs 2 independent sources; subagent prompts demand grep/SQL/file-output evidence inline
9. **Pipeline test throughout** — Stage 11 auto-captures after every `--deploy-target` /sgs-clone run

## Where to look when something feels off (escalation tree)

| Symptom | First read | Then |
|---|---|---|
| /sgs-clone reports "OK" but page didn't update | `pipeline-state/<run>/stage-10.json` exit code | If 4/5/6 → known halt path; if 0 → check trace.jsonl Stage 10 event |
| Stage 11 pixel-diff numbers worse | `stage-11-pixel-diff.json` per-section + `trace.jsonl` stage_4 events | If a section regressed, diff convert.py changes since last commit |
| A section emits with 0 attrs / 0 css | `match.json` for the boundary + `slot-list.json` + `extract.json` per_section_results | Stage 2 fall-through? Slot count 0? Compare to baseline run |
| /sgs-update breaks | `summary.log` + Stage 1-9 outputs | Stage 9 drift gate catches schema mismatches |
| A skill /qc fails | the skill's SKILL.md + `~/.agents/skills/gap-analysis/SKILL.md` 8-step protocol | Phase 3 will catch broad skill issues; one-off failure → /lifecycle |

## Last session's empirical state (anchor for delta measurement)

| Section | Mean pixel-diff (2026-05-23 baseline) |
|---|---|
| ingredients-section | 31.9% |
| featured-product | 43.7% |
| header | 44.9% |
| hero | 73.3% |
| gift-section | 83.0% |
| brand | 84.0% |
| trust-bar | 84.1% |
| social-proof | 93.4% |
| footer | 96.3% |
| **mean** | **70.5%** |

After Phase 1 ships, these should drop. Compare via `stage-11-pixel-diff.json` of the new run vs run `mamas-munches-homepage-2026-05-23-145045`.

---

**Start by reading `.claude/pipeline-state-debug-artefacts-inventory.md` + `.claude/plans/2026-05-24-strategic-plan.md` + `.claude/plans/2026-05-24-phase-1-structural-recovery.md` in that order. Then execute Phase 1 Step 1.1.**
