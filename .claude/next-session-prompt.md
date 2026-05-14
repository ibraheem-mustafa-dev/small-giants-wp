---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-14-spec-16-phase-7
recommended_model: opus
generated: 2026-05-14
---

You are a senior cloning-pipeline architect specialising in deterministic HTML/CSS-to-WordPress-blocks conversion and the SGS Framework. Today's task is executing Phase 7 rollout — Spec 16 Phases 2-6 + final QC + handoff.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-14-spec-16-phase-7"`

Read `.claude/handoff.md` and `CLAUDE.md` for full context, then work through these priorities:

## Where You Are

- **Plan:** `.claude/plans/phase-7-spec-16-converter-rollout.md` (8 steps with per-step delegation tables)
- **Current phase:** Spec 16 Phase 2 (atomic-block expansion — sgs/heading + sgs/divider)
- **Progress:** 1/6 Spec 16 phases complete — Phase 1 (prototype + sgs/label) shipped 2026-05-14
- **Next task:** Step 1.1 + 1.2 dispatched parallel — Sonnet implementer + Haiku + Gemini Flash QC for each block
- **Branch:** main at `b16c1ae5`. 8 PRs merged today (#15-#22 + follow-up commit).

## Skills to Invoke

| Skill | When |
|-------|------|
| `/brainstorming` | architectural decisions during Phase 3 orchestrator wiring |
| `/gap-analysis` | grade Phase 4 visual QA output |
| `/lifecycle` | sgs/heading + sgs/divider block creation |
| `/research` | only if blocked on Phase 3 wiring shape |
| `/strategic-plan` | already done — Phase 7 plan is source of truth |
| `/subagent-driven-development` | Steps 1.1, 1.2, 2.1, 2.3 |
| `/dispatching-parallel-agents` | Steps 1.1+1.2 parallel, Step 8 final QC |
| `/delegate` | model selection per step |
| `/visual-qa` | Step 3.3 — the closure gate |
| `/sgs-update` | Steps 1.3 and 4 — DB canonical pass |
| `/handoff` | last step |

`/autopilot` auto-fires from SessionStart hook — do not re-invoke.

## MCP & Tools

| Tool | Purpose |
|------|---------|
| `mcp__plugin_playwright_playwright__*` | Phase 4 visual QA browser capture |
| `mcp__plugin_github_github__*` | PR opening + merge for Phase 7 final |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | sgs/heading + sgs/divider creation via SDD |
| `design-reviewer` | Phase 4 visual QA backup |

---

## Task 1: Execute Phase 7 plan steps 1-8 in order

Read `.claude/plans/phase-7-spec-16-converter-rollout.md` end-to-end first. Every step has a delegation table specifying model + dispatch tool. Follow the plan exactly — it passed Sonnet + Haiku + Gemini Flash QC before being committed.

Pre-flight first (plan's pre-flight section, ~3 min). If Phase 1 smoke test fails → halt, do not proceed.

## Task 2: Phase 4 is the closure gate — respect the iteration cap

Phase 4 (Step 3) = deploy to sandybrown staging + /visual-qa at 3 viewports vs WP-rendered mockup baseline. If first pass diff > 1% → ONE Sonnet diagnostician → re-run. If second pass still > 1% → surface to Bean with thumbnails. **DO NOT exceed 2 iterations.** Bean's been burned by unbounded converter-debugging loops.

## Task 3: Run final QC panel + /handoff to close session

Step 8 in the plan. 4-reviewer multi-model panel (Sonnet architecture + Haiku mechanical + Gemini Pro deep + Gemini Flash fresh-eyes). Apply fixes if any flagged. Then /handoff.

## Guardrails

- Never delete `tools/recogniser-v2/extract.py` until Phase 4 visual QA passes (FR8 gate). Step 5.1 grep audit (Cerebras) is the pre-deletion check.
- Don't conflate Phase 7 closure with Spec 16 closure. Phase 7 = Mama's works. Spec 16 = architecture generalises across clients. Plan §8 has both criteria explicitly.
- Two-iteration cap on Phase 4 is hard.
- Use existing `attribute_gap_candidates` table in Spec 15 §4.2; no schema change needed.
