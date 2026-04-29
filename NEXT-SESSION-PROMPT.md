recommended_model: sonnet
session_tag: small-giants-wp-2026-04-30-phase1.5d-triage-execution

You are a senior systems architect with WordPress framework, sandbox/preview tooling, and lifecycle pipeline expertise. This session closes Phase 1.5 — sandbox-preview gate (P1.5e) plus Phase 2 phase-plan (P1.5f).

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-30-phase1.5d-triage-execution"`

## Where You Are

Plan: `.claude/plans/master-plan.md` §Phase 1.5
Current phase: phase-1.5-tooling-triage (P1.5d complete, P1.5e+f remaining)
Progress: 4/6 deliverables in Phase 1.5 complete (P1.5_0, P1.5a, P1.5b, P1.5c, P1.5d done; P1.5e + P1.5f remaining)
Next task: P1.5e — verify GAP-3 first (`DB_ENGINE=mysql` in PHP-WASM), then build the sandbox blueprint

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through these priorities:

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | P1.5e flag/script architecture decisions; P1.5f phase ordering trade-offs |
| `/gap-analysis` | Grade the sandbox gate end-to-end before declaring P1.5e complete; grade Phase 2 phase-plan |
| `/lifecycle` | Start pipeline before any edits to `/verify-loop` SKILL.md or `/deploy-check` command |
| `/research` | If Studio gotchas surface during P1.5e — auto-routes to right tier |
| `/strategic-plan` | If P1.5e architecture branches (e.g. blueprint approach trade-offs) |
| `/phase-planner` | P1.5f — drafts Phase 2 phase-plan from master plan §Phase 2 + toolkit doc |
| `/sgs-wp-engine` | Studio blueprint construction — needs sgs-blocks + sgs-theme + active style variation |
| `/verify-loop` | Modify Stage 1 to accept `--target-url` flag |
| `/handoff` | Session end |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `studio` CLI | P1.5e — sandbox creation, blueprint validation, preview URLs. AI manual at `.claude/specs/2026-04-29-wp-studio-ai-manual.md` |
| `playwright` MCP | Smoke-test the sandbox preview URL against a real palestine-lives.org page |
| `gh` CLI | If touching any published GitHub repo for the gate |
| `python ~/.agents/skills/shared-references/sgs-skillscore.py validate <path>` | After every skill edit |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | If Studio blueprint construction needs SGS framework knowledge |
| `test-and-explain` | After P1.5e smoke test — verify preview URL renders correctly |
| `design-reviewer` | If sandbox preview shows visual rendering issues — multi-breakpoint check |

---

## Task 1: P1.5e — Sandbox-preview gate

(a) **Verify GAP-3 first** (15 min): boot a Studio site with `defineWpConfigConsts` blueprint setting `DB_ENGINE=mysql`. If unsupported, soften master plan §1.5 Shift 2 wording. If supported, add working example to manual.
(b) **Build the sandbox blueprint** at `~/.claude/skills/sgs-wp-engine/references/studio-blueprints/sgs-default.json`. Parameters: `clientSlug`, `phpVersion`, `dbEngine`.
(c) **Write `studio-preview-up.ps1`** — blueprint + plugin/theme paths in, preview URL on stdout. Idempotent.
(d) **Add `/verify-loop --target-url <url>` flag** at Stage 1. Use `/lifecycle` for the SKILL.md edit.
(e) **Add `/deploy-check --studio-pass <url>` flag** — refuses deploy if Studio gate is missing or red.
(f) **HARD GATE — smoke test end-to-end** on a real palestine-lives.org page snapshot. Save PASS to `.claude/reports/p1.5e-smoke/`.

## Task 2: P1.5f — Phase 2 phase-plan

Run `/phase-planner` against `.claude/plans/master-plan.md` §Phase 2 + `.claude/specs/2026-04-27-optimisation-toolkit-design.md` §5 + Phase 2a structural debt table. Output: `.claude/plans/phase-2-rubrics-universe.md` with per-skill estimates accommodating debt, and a P2 entry condition.

## Task 3: G1.5 phase exit

When P1.5e + P1.5f both done: update state.md `current_phase: phase-2-rubrics-universe`, archive phase-1.5 plan to `-complete.md` if exists, run `/handoff`.

## Guardrails

- WordPress: WCAG 2.2 AA, UK English, no jQuery, <100KB CSS / <50KB JS
- `git branch --show-current` before every commit (framework → main)
- Lifecycle hook fires skillscore warnings on any agent/skill .md edit. Pre-existing structural debt is logged in optimisation-toolkit-design.md §Phase 2a — don't spiral on it. Fix only what your edit introduces.
- ADHD Rule 13: P1.5e ~85 min, P1.5f ~30 min. Fit one session. If P1.5e spirals on Studio gotchas, park it and ship P1.5f first.
- G1 milestone POST is `pending_upload: true` due to blub.db SQLite WAL lock. Pre-existing dashboard issue. Don't retry inline.
