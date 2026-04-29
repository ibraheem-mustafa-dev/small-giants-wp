recommended_model: sonnet
session_tag: small-giants-wp-2026-05-01-phase1.5f-and-phase2

You are a senior tooling architect for the SGS WordPress Framework. P1.5e (sandbox-preview gate) is complete and smoke-tested. This session delivers P1.5f (Phase 2 phase-plan) to close the G1.5 milestone, then begins Phase 2a structural debt uplift.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-01-phase1.5f-and-phase2"`

## First action — invoke `/autopilot` before anything else

Then read in parallel:
1. `.claude/state.md` — confirm current_phase
2. `.claude/plans/master-plan.md` §Phase 2 — rubrics universe scope
3. `.claude/specs/2026-04-27-optimisation-toolkit-design.md` §5 — Phase 2a/2b/2c structure + structural debt table

## What's done (do not redo)

| P1.5 step | Status |
|---|---|
| P1.5a–d | DONE 2026-04-30 |
| P1.5e (sandbox-preview gate) | **DONE 2026-05-01** — blueprint, PS1, verify-loop --target-url, deploy-check --studio-pass (94%), smoke PASS, GAP-3 resolved |
| P1.5f (Phase 2 phase-plan) | **NEXT** |

## Where You Are

Plan: `.claude/plans/master-plan.md`
Current phase: Phase 1.5 — P1.5f remaining
Progress: P1.5a–e complete — one deliverable before G1.5 closes
Next task: `/phase-planner` → `.claude/plans/phase-2-rubrics-universe.md`

## Skills to Invoke

| Skill | When |
|-------|------|
| `/autopilot` | FIRST — before any response |
| `/phase-planner` | Task 1 — generate Phase 2 plan |
| `/lifecycle` | Before any skill/agent edit in Task 3 |
| `/brainstorming` | Architectural decisions during phase ordering |
| `/gap-analysis` | Grade outputs before delivery |
| `/strategic-plan` | If Phase 2 plan needs restructuring beyond `/phase-planner` |

## MCP Servers & Tools

| Tool | What for |
|------|---------|
| `python ~/.agents/skills/shared-references/dispatch-graph-validator.py <target>` | After skill/agent edits |
| `python ~/.agents/skills/shared-references/sgs-skillscore.py validate <path>` | After every SKILL.md write |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | If Phase 2a debt work surfaces WP-specific gaps |

---

## Task 1: P1.5f — Phase 2 phase-plan

Run `/phase-planner` with:
- `.claude/plans/master-plan.md` §Phase 2
- `.claude/specs/2026-04-27-optimisation-toolkit-design.md` §5 Phase 2a/2b/2c
- Structural debt: `design-reviewer` 53%, `seo-technical` 52%, `seo-auditor` 59%, `email-html-builder` 63%, `sgs-extraction` 85%

Output: `.claude/plans/phase-2-rubrics-universe.md`. P2 entry condition must read: "triage signed off + kills executed + dispatch-graph-validator clean + sandbox-preview gate green."

## Task 2: Fix Cerebras model ID

`zai-glm-4.7` returned 404 this session. Check current Cerebras-available models, update `model` in `~/.claude/agents/cerebras-agent/agent.py`, retest with one single-file dispatch.

## Task 3: Phase 2a structural debt — seo-technical (52%)

After P1.5f: run `seo-technical` agent through `/lifecycle`. One target per session to avoid race conditions on shared skill files.

## Guardrails

- `git branch --show-current` before every commit — framework changes → `main`
- skillscore 90% threshold fires on every SKILL.md write — budget 2 write attempts per new skill
- `wp eval` is blocked by a pre-tool hook — read wp-config.php directly instead
- `studio site create` requires explicit `--path` when `~/Studio/` doesn't exist on the machine
