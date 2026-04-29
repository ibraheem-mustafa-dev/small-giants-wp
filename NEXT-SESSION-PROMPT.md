recommended_model: sonnet
session_tag: small-giants-wp-2026-04-29-phase1-plan

You are a senior systems architect specialising in Python utility libraries, Claude skill lifecycle work, and parallel-dispatch orchestration. Execute the 15-step Phase 1 Foundations plan that ships the optimisation toolkit + makes 8 lifecycle/quality/QC skills utility-aware.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-29-phase1-plan"`

## Where You Are

Plan: `.claude/plans/phase-1-foundations.md`
Current phase: Phase 1 — Foundations (Step 1 of 15)
Progress: 0/15 steps complete (plan committed at ec2324e; pre-execution scaffolding only)
Next task: Step 1 — scaffold `~/.agents/skills/shared-references/optimisation-toolkit/` + build `canary_split.py` + smoke test

Read CONVERSATION-HANDOFF.md, CLAUDE.md, and `.claude/plans/phase-1-foundations.md` for full context.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS — architectural decisions during step execution |
| `/gap-analysis` | ALWAYS — grade Phase 1 outputs before G1 POST |
| `/lifecycle` | ALWAYS — required entry for Steps 6, 8, 10, 11, 14a |
| `/research` | ALWAYS — auto-routes if utility design surfaces unknowns |
| `/strategic-plan` | Reference master plan §13 Phase 2 handoff before Step 15 |
| `/subagent-driven-development` | Steps 3, 6, 8, 11 (parallel dispatches) |
| `/skill-optimiser` | Step 14b — utility-aware end-to-end demo |
| `/qc` + `/qc-inline` | Wired in Step 11; verified live in Step 14b |
| `/verify-loop` | Built in Step 14a; self-demoed in Step 14b |
| `/wp-block-development` + `/sgs-wp-engine` | Only if Phase 1 surfaces SGS plugin work |
| `/handoff` | End of Phase 1 (after Step 15) |

## MCP Servers & Tools

| Tool | What for |
|------|----------|
| `python ~/.claude/hooks/local-search.py "<topic>"` | Recall before utility design |
| Direct `sqlite3` on `~/.openclaw/workspace/data/blub.db` | `few_shot_injector` queries embeddings + corrections |
| Gemini CLI (Flash) | Cross-tier QC peer review for Steps 7, 9, 12 |
| Sonnet via `/delegate` | Mechanical skill edits + parallel utility builds |
| `wp-devdocs` + `wp-blockmarkup` MCPs | If Phase 1 work touches WP code |
| `playwright` MCP | If `/verify-loop` self-demo needs visual verification |

## Agents to Delegate To

| Agent | When |
|-------|------|
| Sonnet (via `/delegate`) | Steps 3, 6, 8, 10, 11 — parallel utility build + skill edits |
| Cerebras / Gemini Flash | Steps 7, 9, 12 — cross-tier QC peer review (NOT self-apply) |
| `wp-sgs-developer` | Only if Phase 1 surfaces SGS WordPress block work |

## Research Approach

No research expected — Phase 1 spec is fully resolved. If a step surfaces an unknown: `/research-check` first, escalate to `/research-buddies` if it diverges, capture in the plan's References block before proceeding.

---

## Task 1: Decide deprecation-fix track

5 uncommitted `deprecated.js` modifications + `lucide-icons.php` from the post-wave2 follow-up (`.claude/plans/strategy/post-wave2-deprecations.md`). Commit on separate branch, stash, or finish first — don't mix into Phase 1.

## Task 2: Execute Phase 1 Step 1 — canary_split.py

Per plan Step 1: scaffold `~/.agents/skills/shared-references/optimisation-toolkit/`, write `canary_split.py` per spec §4.1 row 1, write `tests/smoke_canary_split.py`. Smoke test runs <10s, exits 0, no network.

## Task 3: Dispatch Step 3 in parallel

Once canary_split smoke passes (QA Gate Step 2), fan out 3 cold Sonnet subagents using Step 3's pre-written prompts. Each builds one utility (`dspy_signature`, `certainty_calc`, `few_shot_injector`) + smoke test. All 4 smoke tests must pass at QA Gate Step 4.

## Task 4: Phase 1b skill updates + cross-tier QC

Steps 6/8/10/11 update 8 lifecycle skills. Steps 7/9/12 dispatch Gemini Flash for cross-tier QC. Sonnet edits, Gemini reviews — never self-apply. Step 13 QA gate clears 8/8 reports clean.

## Task 5: Step 14a → 14b → 15 (G1 milestone)

Build `/verify-loop` via `/lifecycle` merge mode (14a). Run `/skill-optimiser` on `/verify-loop` (14b) — exercises all 4 utilities + 8 updated skills. POST G1 to `/api/knowledge` per master plan §11.5. `/handoff` for Phase 2.

## Guardrails

- WordPress non-negotiables: WCAG 2.2 AA, UK English, no jQuery, <100KB CSS / <50KB JS.
- `git branch --show-current` before every commit (framework → main; client → feature branch).
- Master plan §12.5 deletion-before-reference rule applies.
- Smoke tests cannot make network calls (spec §4.4).
- Cross-tier QC = different model family than the editor (Gemini Flash for Sonnet edits).
- `BLUB_AUTH` is the env var for `/api/knowledge` POSTs — never commit the literal cookie (gitleaks blocks).
