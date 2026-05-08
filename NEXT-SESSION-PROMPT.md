recommended_model: opus

You are a senior cloning-pipeline architect specialising in deterministic HTML→WordPress block translation, multi-platform design tokenisation, and parallel-subagent orchestration. The next session executes parking entry P-11 — the comprehensive `/sgs-clone` build via 10-milestone subagent orchestration.

## Where You Are

Plan: `.claude/next-session-prompt-cloning-skill-build.md` (10 milestones, ~6-7 hr wall-time)
Current phase: cloning-skill-build (P-11)
Progress: 0/10 milestones complete — foundation locked from 2026-05-07/08 session
Next task: Milestone 1 — Schema sync extensions (uimax sync gap close + block_compositions seed)

Read `CONVERSATION-HANDOFF.md` and `CLAUDE.md` for full context, then `.claude/next-session-prompt-cloning-skill-build.md` for the milestone-by-milestone plan with subagent dispatch specs.

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Architectural decisions during Top-5 gap closures (Milestone 6) |
| `/gap-analysis` | Grade `/sgs-clone` skill body before delivery (Milestone 7 — folded into /lifecycle Stage 3) |
| `/lifecycle` | Milestone 7 — build /sgs-clone + 5 sibling commands (Mode A) |
| `/research` | Auto-routes if any gap surfaces unexpected complexity |
| `/strategic-plan` | Already done; invoke only if scope drift mid-session |
| `/sgs-wp-engine` | Throughout — central authority for SGS WordPress |
| `/qc-inline` | After every milestone return — Bean's standing rule |
| `/dispatching-parallel-agents` | Milestones 1-6 |
| `/subagent-prompt` + `/delegate` | Each subagent dispatch needs a tight cold prompt + model pick |
| `/visual-qa` | Milestones 8-9 — full 9-layer QA pipeline |

## MCP Servers & Tools

| Tool | What to use it for |
|---|---|
| Playwright MCP | Milestones 8-9 — Mama's hero + full homepage smoke runs |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py <command>` | Query SGS DB (fingerprint subcommands shipped 2026-05-07) |
| `python ~/.agents/skills/ui-ux-pro-max/scripts/search.py "<query>"` | Query uimax DB |
| `node tools/multi-frame-qa/capture.js` | First-paint capture (Milestones 8-9) |
| `node scripts/mockup-parity-validator.js` | Computed-style diff with Q1-Q4 + Section R measurement |
| `node scripts/screenshot-diff-helper.js` | **Mandatory before reducing classifier severity (Hard Rule 10)** |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | Throughout — all SGS WordPress build work |
| `design-reviewer` | Milestones 8-9 — visual quality of Mama's clone vs mockup |
| `research-pipeline` | If a milestone surfaces an unexpected question |

---

## Task 1: Milestones 1-3 — Foundation (~3 hrs parallel-subagent)

Schema sync extensions + Layer 1+2 fingerprint catalogue + 8 base role templates + Layer 3+4 + 5 missing roles. Heavy parallel Cerebras + Sonnet × 3-5 dispatch per milestone. /qc-inline after each return.

## Task 2: Milestones 4-6 — Critical fixes + Top-5 gap closures (~4 hrs parallel)

5 critical fixes from peer review + 4 important fixes + Top-5 gap closures (computed-style passport, pairing index, per-section convention voting, recognition_log + operator UI, 5 missing roles).

## Task 3: Milestones 7-10 — Skill build + smoke + handoff (~3 hrs)

Build `/sgs-clone` + 5 sibling commands via `/lifecycle` Mode A (≥B grade required). Mama's hero smoke. Full Mama's homepage smoke deployed to sandybrown post 30. Final `/handoff`.

## Guardrails

- Use Opus for orchestration; Sonnet/Cerebras subagents for mechanical work
- Cerebras free tier rate-limits on concurrent calls — sequence Cerebras work, parallelise across DIFFERENT model branches
- Hard Rule 6 — patterns are per CLASS, not per CLONE
- Hard Rule 7 — every uimax write carries cross-platform equivalents or flags the gap (Rosetta Stone discipline, blub.db row 213)
- Hard Rule 10 — never reduce classifier severity without screenshot-diff evidence
- blub.db row 211 — no licensing language in cloning context (source taxonomy is `idea` / `draft` / `<URL>`)
- Pre-commit STOP GATE catches block-src commits without passing visual-diff
- wp_global_styles reset+reapply mandatory after any variation change

Success criteria: Mama's homepage cloned to sandybrown post 30 with ≥85% pattern fidelity; `/sgs-clone` skill at ≥B grade; recognition_log capturing leftovers for review; uimax sync gap closed.
