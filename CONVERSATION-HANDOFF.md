---
recommended_model: sonnet
session_tag: small-giants-wp-2026-04-29-phase1-plan
---

# Session Handoff — 2026-04-29

## Completed This Session
1. Verified consolidation commit `5c51fe7` is on `main` (Task 1 from prior handoff already shipped before session start).
2. Spot-checked 4 consolidated files (`02-SGS-BLOCKS.md`, `architecture.md`, `step2-strategic-plan.md`, `state.md`) — content intact post-move.
3. Generated `.claude/plans/phase-1-foundations.md` via `/phase-planner` — 15 steps, parallel markers on Steps 3/6/7/8/9/11/12, pre-written cold prompts on every dispatched step, 4 QA gates, KJCs (3 primary + 6 pre-emptive). Committed at `ec2324e`.
4. Resolved KJC Decision 1 with Bean: Step 14 split into 14a + 14b. Step 14a builds `/verify-loop` (merge of `/test-driven-development` + `/verification-before-completion`) via `/lifecycle` merge mode. Step 14b runs `/skill-optimiser` on `/verify-loop` as the utility-aware end-to-end demo.
5. `/verify-loop` design locked: Stage 0 reads plan + todos; Stage 1 classifies tests per step; Stage 2 dual-surface injection (plan-doc table + paired `[TEST]` todos); Stage 3 per-step gate with auto-fix-once then HARD STOP.
6. Sanitised the literal `blub_auth` cookie value in the plan to `$BLUB_AUTH` after gitleaks pre-commit hook flagged it (root cause: same literal in master-plan.md from earlier consolidation; new code uses env var).

## Current State
- **Branch:** `main` at `ec2324e`
- **Tests:** n/a (plan-doc only)
- **Build:** n/a
- **Uncommitted changes:** 5 deprecated.js files + lucide-icons.php (NOT this session's work — from parallel "framework-polish-extended" push tracked separately at `.claude/plans/strategy/post-wave2-deprecations.md`); `.scratch/` and 3 client-subfolder `.claude/` dirs untracked.

## Known Issues / Blockers
- The 5 static-block deprecation modifications (`certification-bar`, `counter`, `notice-banner`, `process-steps`, `testimonial`) are uncommitted in working tree but belong to a different track. Owner needs to decide whether to commit them before Phase 1 execution begins, or shelve.

## Next Priorities (in order)
1. **Decide deprecation-fix track** — review the 5 uncommitted `deprecated.js` modifications (post-wave2 follow-up per state.md). Either commit or stash before starting Phase 1 to avoid mixing tracks.
2. **Execute Phase 1 Step 1** — scaffold `~/.agents/skills/shared-references/optimisation-toolkit/` and build `canary_split.py` + smoke test (~25 min, ends at QA Gate Step 2 PASS).
3. **Dispatch Step 3 in parallel** — once canary_split smoke passes, fan out 3 cold Sonnet subagents for `dspy_signature.py` + `certainty_calc.py` + `few_shot_injector.py` (parallel, ~20 min wall-time). Use `/subagent-driven-development`.
4. **Phase 1b skill-edit waves** — Steps 6 + 8 + 11 (parallel Sonnet) interleaved with Steps 7 + 9 + 12 (parallel Gemini Flash cross-tier QC) per the plan.
5. **Step 14a → 14b → 15** — build `/verify-loop`, run end-to-end demo, POST G1 telemetry, hand off to Phase 2.

## Files Modified
| File path | What changed |
|-----------|-------------|
| `.claude/plans/phase-1-foundations.md` | Created — 15-step Phase 1 execution plan (591 lines) |
| `.claude/state.md` | Bean updated mid-session to reflect framework-polish-extended track and post-wave2 follow-up |

## Notes for Next Session
- Step 14a uses `/lifecycle` in **merge** mode, not new-skill mode. If `/lifecycle` rejects the merge for "insufficient overlap", fall back to manual SKILL.md scaffold using the spec embedded in Step 14a's Action field.
- Cross-tier QC reviewer locked to Gemini Flash (KJC Decision 2). Cerebras stays as fallback if Flash rate-limits.
- Hard rule from spec §4.4: smoke tests cannot make network calls. `few_shot_injector` smoke uses synthetic fixture; production blub.db connection is exercised only at Step 14b demo.
- Master plan §12.5 deletion-before-reference rule is satisfied for Phase 1 — no Phase 1 step references a skill scheduled for deletion in Phase 4.

## Next Session Prompt

~~~
recommended_model: sonnet
session_tag: small-giants-wp-2026-04-29-phase1-plan

You are a senior systems architect specialising in Python utility libraries, Claude skill lifecycle work, and parallel-dispatch orchestration. Execute the 15-step Phase 1 Foundations plan that ships the optimisation toolkit + makes 8 lifecycle/quality/QC skills utility-aware.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-29-phase1-plan"`

## Where You Are

Plan: `.claude/plans/phase-1-foundations.md`
Current phase: Phase 1 — Foundations (Step 1 of 15)
Progress: 0/15 steps complete (plan written + committed at ec2324e; pre-execution scaffolding only)
Next task: Step 1 — scaffold `~/.agents/skills/shared-references/optimisation-toolkit/` + build `canary_split.py` + smoke test

Read CONVERSATION-HANDOFF.md, CLAUDE.md, and `.claude/plans/phase-1-foundations.md` for full context, then work through the priorities below.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS — architectural decisions during step execution |
| `/gap-analysis` | ALWAYS — grade Phase 1 outputs before G1 POST |
| `/lifecycle` | ALWAYS — required entry for Steps 6, 8, 10, 11, 14a (skill edits + skill merge) |
| `/research` | ALWAYS — auto-routes if utility design or skill-merge surfaces unknowns |
| `/strategic-plan` | Reference master plan §13 Phase 2 handoff before Step 15 |
| `/phase-planner` | Reference only — plan already exists at `.claude/plans/phase-1-foundations.md` |
| `/subagent-driven-development` | Step 3 (3 parallel utilities), Step 6 (3 parallel writers), Step 8 (2 parallel optimisers), Step 11 (2 parallel QC) |
| `/skill-optimiser` | Step 14b — utility-aware end-to-end demo target |
| `/qc` + `/qc-inline` | Wired in Step 11; verified live in Step 14b |
| `/verify-loop` | Built in Step 14a; self-demoed in Step 14b |
| `/wp-block-development` | If Phase 1 surfaces SGS plugin work (unlikely but possible) |
| `/sgs-wp-engine` | Consult before any SGS Framework block edit |
| `/handoff` | End of Phase 1 (after Step 15) |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `python ~/.claude/hooks/local-search.py "<topic>"` | Recall before Phase 1 utility design (Stage 1.5 of autopilot) |
| `python ~/.claude/hooks/search.py "<query>"` | Web research for any utility ambiguity |
| Direct `sqlite3` on `~/.openclaw/workspace/data/blub.db` | `few_shot_injector` reads embeddings + corrections + knowledge tables |
| Gemini CLI (Flash) | Cross-tier QC peer review for Steps 7, 9, 12 (NOT self-apply — 2026-04-28 lesson) |
| Sonnet via `/delegate` | Steps 3, 6, 8, 10, 11 — mechanical skill edits + utility builds |
| `wp-devdocs` + `wp-blockmarkup` MCPs | Only if Phase 1 work touches WP code |
| `playwright` MCP | Step 14b if `/verify-loop` self-demo needs visual verification |

## Agents to Delegate To

| Agent | When |
|-------|------|
| Sonnet (via `/delegate`) | Phase 1.1a parallel utility build (Step 3) + parallel skill edits (Steps 6/8/11) |
| Cerebras / Gemini Flash | Cross-tier QC peer review (Steps 7, 9, 12) — fallback Cerebras if Flash rate-limits |
| `wp-sgs-developer` | Only if Phase 1 surfaces unexpected SGS WordPress block work |

## Research Approach

No research expected — Phase 1 spec is fully resolved. If a step surfaces an unknown:
1. Run `/research-check` for quick lookup
2. Escalate to `/research-buddies` if `/research-check` diverges
3. Capture answer in the plan's References block before proceeding

---

## Task 1: Decide deprecation-fix track

Before starting Phase 1, review the 5 uncommitted `deprecated.js` modifications + `lucide-icons.php`. They belong to the post-wave2 follow-up tracked at `.claude/plans/strategy/post-wave2-deprecations.md`. Either commit them on a separate branch, stash them, or finish them first — do not let them mix into Phase 1's history.

## Task 2: Execute Phase 1 Step 1 — canary_split.py

Per `.claude/plans/phase-1-foundations.md` Step 1: scaffold `~/.agents/skills/shared-references/optimisation-toolkit/`, write `canary_split.py` per spec §4.1 row 1, write `tests/smoke_canary_split.py`. Hold out 20% of fixtures, score before/after, gate on `delta >= 0.05`. Smoke test must run <10s and exit 0.

## Task 3: Dispatch Step 3 in parallel via /subagent-driven-development

Once canary_split smoke passes (QA Gate Step 2), fan out 3 cold Sonnet subagents using the pre-written prompts in Step 3 of the plan. Each builds one utility (`dspy_signature`, `certainty_calc`, `few_shot_injector`) + its smoke test. Confirm all 4 smoke tests exit 0 at QA Gate Step 4 before moving to Phase 1b.

## Task 4: Phase 1b skill updates with cross-tier QC

Steps 6, 8, 10, 11 update 8 lifecycle skills via `/lifecycle`. Steps 7, 9, 12 dispatch Gemini Flash for cross-tier QC review of the updates. Mandatory: Sonnet does the edit, Gemini Flash reviews — never Sonnet self-applies (R1 + 2026-04-28 lesson). Step 13 QA gate verifies 8/8 reports clean before Step 14.

## Task 5: Step 14a → 14b → 15 (G1 milestone)

Build `/verify-loop` via `/lifecycle` merge mode (Step 14a). Run `/skill-optimiser` on `/verify-loop` (Step 14b) — this exercises all 4 utilities + the 8 updated skills. Self-demo `/verify-loop` against this plan. Then POST G1 to `/api/knowledge` per master plan §11.5 and run `/handoff` for Phase 2.

## Guardrails

- WordPress non-negotiables: WCAG 2.2 AA, UK English, no jQuery, <100KB CSS / <50KB JS (only relevant if Step 14b self-demo touches WP code).
- Run `git status` before any commit. Branch discipline (CLAUDE.md): framework code → `main`; client code → feature branch.
- Master plan §12.5 deletion-before-reference: do not reference a Phase-4-deletion-marked skill in any Phase 1 work.
- Smoke tests cannot make network calls (spec §4.4).
- Cross-tier QC must use a different model family than the one that made the edit. Gemini Flash for Sonnet edits.
- `BLUB_AUTH` is the env var for `/api/knowledge` POSTs — never commit the literal cookie value (gitleaks blocks it).
~~~
