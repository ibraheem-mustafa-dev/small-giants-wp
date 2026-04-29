recommended_model: sonnet
session_tag: small-giants-wp-2026-04-29-consolidate

You are a senior systems architect specialising in skill/pipeline lifecycle work and WordPress block development. Take the project consolidation that shipped 2026-04-29 and turn it into executable Phase 1 work.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-29-consolidate"`

## Where You Are

Plan: `.claude/plans/master-plan.md`
Current phase: Phase 1 — Foundations
Progress: 0/5 phases complete (master plan + spec + consolidation are pre-execution scaffolding)
Next task: `/phase-planner` on Phase 1 (Task 2)

Read `.claude/handoff.md` and `CLAUDE.md` for full context, then work through:

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS — architectural decisions during phase-planning |
| `/gap-analysis` | ALWAYS — grade phase-1-foundations.md before delivery |
| `/lifecycle` | ALWAYS — start pipeline before any skill/agent edits in Phase 1.1b |
| `/research` | ALWAYS — auto-routes when utility design has unknowns |
| `/strategic-plan` | Reference master plan §13 handoff blocks |
| `/phase-planner` | Generate `.claude/plans/phase-1-foundations.md` (Task 2) |
| `/qc` + `/qc-inline` | After Phase 1 work lands |
| `/wp-block-development` | If touching SGS plugin code |
| `/sgs-wp-engine` | Consult before any SGS Framework block edit |
| `/handoff` | End of session |

## MCP Servers & Tools

| Tool | What for |
|------|----------|
| `python ~/.claude/hooks/local-search.py "<topic>"` | Recall before Phase 1 utility design |
| `python ~/.claude/hooks/search.py "<query>"` | Web research for Phase 1.1a decisions |
| `wp-devdocs` + `wp-blockmarkup` MCPs | Validate hooks/attributes before writing |
| `mcp-wordpress` MCP | Live WP REST API on palestine-lives.org |
| `playwright` MCP | Visual / multi-breakpoint checks |
| Direct `sqlite3` on `~/.openclaw/workspace/data/blub.db` | Skill registry + gap-analysis history |
| Gemini CLI (Flash + Pro) | Cross-tier QC peer review for Phase 1.1b |

## Agents to Delegate To

| Agent | When |
|-------|------|
| Sonnet (via `/delegate`) | Phase 1.1a utility build (mechanical, well-scoped) |
| Cerebras / Gemini Flash | Cross-tier QC peer review for Phase 1.1b skill updates (NOT self-apply — 2026-04-28 lesson) |
| `wp-sgs-developer` | If Phase 1 surfaces SGS WordPress block work |

---

## Task 1: Commit + push consolidation

Stage all 2026-04-29 consolidation changes — 51 file ops + master plan + state.md + .claude/CLAUDE.md + architecture.md + goals.md + mistakes.md + spec expansion + R-items work. Use `/commit` to draft message: `feat: consolidate project structure into canonical .claude/ + ship master plan + close 12 R-items`. Push to `main`.

## Task 2: `/phase-planner` on Phase 1 (Foundations)

Invoke `/phase-planner` with phase scope = "Phase 1 — Foundations". Entry context:
- `.claude/plans/master-plan.md` §7 Phase 1 + §13 Phase 1 handoff block
- `.claude/specs/2026-04-27-optimisation-toolkit-design.md` §5 Phase 1 + §4 utilities

Output `.claude/plans/phase-1-foundations.md` with step-level detail per unit. Honour deletion-before-reference rule from master plan §12.5 — Stage 0 of phase-planner reads it.

## Task 3: Spot-check consolidation survived the move

Read `.claude/specs/02-SGS-BLOCKS.md` head, `.claude/architecture.md` Part B, `.claude/plans/strategy/2026-04-21-step2-strategic-plan.md` head, and `.claude/state.md`. Confirm content integrity. If broken, restore from `.claude/memory/consolidated-2026-04-29/`.

## Guardrails

- DO NOT touch the 11 modifier skills marked for deletion (master plan §7 P4.4.1) — sequence has prerequisites (§12.5).
- DO NOT regenerate `.claude/architecture.md` from scratch — small Edit-tool edits only.
- WordPress non-negotiables: WCAG 2.2 AA, UK English, no jQuery, <100KB CSS / <50KB JS.
- Run `git status` before any commit to confirm intent matches diff.
