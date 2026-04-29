recommended_model: sonnet
session_tag: small-giants-wp-2026-04-30-phase1.5d

You are a senior tooling architect for a Claude Code AI skill framework. Phase 1.5 triage is signed off — this session executes the decisions and wires up the sandbox-preview gate.

## Where You Are

Plan: `.claude/plans/master-plan.md` §Phase 1.5
Current phase: phase-1.5-tooling-triage (P1.5d + P1.5e + P1.5f remaining)
Progress: P1.5_0 + P1.5a + P1.5b + P1.5c complete — 4/7 units done
Next task: P1.5d Step 0 — autopilot domain-table patch (5 skills invisible to router)

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-30-phase1.5d"`

## Context

- Signed-off triage table: `.claude/plans/strategy/2026-04-29-tooling-triage.md` — read this first
- Skill audit: `.claude/reports/2026-04-30-skill-audit.md`
- Agent audit: `.claude/reports/2026-04-30-agent-audit.md`
- WP Studio manual (patched): `.claude/specs/2026-04-29-wp-studio-ai-manual.md`

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural decisions during P1.5e gate design |
| `/gap-analysis` | Grade each merge result before marking complete |
| `/lifecycle` | EVERY skill/agent kill, merge, or park — enforced by lifecycle gate |
| `/research` | If Studio CLI or blueprint format needs verifying |
| `/strategic-plan` | Before P1.5e if blueprint + verify-loop integration needs planning |
| `/verify-loop` | P1.5e — modify Stage 1 to accept `--target-url` flag |
| `/phase-planner` | P1.5f — draft Phase 2 phase-plan against surviving roster |
| `/handoff` | Session end |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `studio` CLI | P1.5e — `studio site create --blueprint`, `studio preview create` |
| `python ~/.agents/skills/shared-references/dispatch-graph-validator.py` | After every kill/merge — confirm no dead refs |
| `python ~/.agents/skills/shared-references/sgs-skillscore.py validate <path>` | After every skill edit |

## Agents to Delegate To

| Agent | When |
|-------|------|
| Gemini Flash (`/gemini-flash`) | Zero-cost peer review of merge results — reliable |
| Sonnet subagent (`Agent` tool, model: sonnet) | Second opinion on any merge touching routing logic |

## Task 1: P1.5d — Execute triage decisions

Read `.claude/plans/strategy/2026-04-29-tooling-triage.md` Section 5 (Execution order) and follow exactly:
- **Step 0 first:** patch autopilot domain-classification table — add `playwright`, `animation-harvest`, `sgs-discover`, `sgs-extraction`, `sgs-wp-engine` with trigger keywords. `sgs-wp-engine` override note: supersedes `wp-block-development` / `wp-plugin-development` for all SGS-prefixed work.
- **Quick assess first:** read SKILL.md for `seo-geo`, `seo-hreflang`, `gemini-vision-audit` — 2 min each. Decide keep/merge/park in-session.
- **Run `/lifecycle` before any SKILL.md edit** — never bypass.
- **Run `dispatch-graph-validator.py` after each step** — not in batch at the end.
- **`sgs-extraction` stays standalone** — fix its 4 factual errors but do NOT merge into `build-website`.

## Task 2: P1.5e — Sandbox-preview gate (parallel with P1.5d)

Deliverables:
1. `theme/sgs-theme/sgs-base.blueprint.json` — minimal SGS sandbox blueprint (SQLite only — no DB_ENGINE=mysql)
2. `/verify-loop --target-url <url>` flag — Stage 1 URL-mode for Playwright assertions against Preview URLs
3. `studio-preview-up.ps1` — helper: create site, import `.wpress`, start, create preview, print URL
4. `deploy-check --studio-pass` flag — Studio preview as mandatory gate step

## Task 3: P1.5f — Draft Phase 2 phase-plan

Run `/phase-planner` with surviving post-P1.5d roster + master plan §Phase 2. Write to `.claude/plans/phase-2-rubrics-universe.md`. Target: 12–15 rubrics. Phase exit = G1.5.

## Guardrails

- `git branch --show-current` before every commit — all work stays on `main`
- `dispatch-graph-validator.py` after every kill/merge — not in batch
- Do NOT merge `sgs-extraction` into `build-website`
- Do NOT add `DB_ENGINE=mysql` to Studio blueprints (PHP-WASM is SQLite-only)
- UK English, no jQuery, WCAG 2.2 AA
