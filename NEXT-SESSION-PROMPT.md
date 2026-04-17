## Where You Are

Plan: `.claude/plans/` (no current_mission — this session continues the skill-system + code-review architecture tracks).
Current phase: post-rewrite follow-up on research-check + Fred-as-pattern audit + deferred verify-setup command.
Progress: research-check merge+rewrite shipped B (4.1) / 91% skillscore; 3 tasks queued below.
Next task: Run Task 1 (research-check fix batch).

## Session Start

Read `CONVERSATION-HANDOFF.md` and `CLAUDE.md` for full context, then work through these priorities.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Design-mode exploration during Fred-as-pattern audit |
| `/gap-analysis` | Grade decision-synthesizer (if extracted) + re-grade research-check after fix batch |
| `/lifecycle` | Start pipeline before SKILL.md edits — lifecycle-gate blocks direct writes |
| `/research` | Auto-routes; `/research-check --tier extended` if Fred audit reveals conflicting signals |
| `/strategic-plan` | If decision-synthesizer extraction grows past 3-file scope |
| `/skill-writer` | research-check fix batch + any new skill creation |
| `/skillscore` | After each SKILL.md edit — target 90%+ |
| `/diagnostics` | Before commit — confirm no regressions |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `mcp__ide__getDiagnostics` | Backing tool for `/diagnostics` |
| `mcp__plugin_context7_context7__get-library-docs` | Library research during Fred audit if needed |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `research-pipeline` | If Fred audit escalates beyond 5 skills |

## Task 1 — Research-check fix batch (~25 min, target 95%+)

Before any SKILL.md edit, create lifecycle-mode marker:
```bash
python -c "
import sys,json; from pathlib import Path
sys.path.insert(0, r'C:\Users\Bean\.claude\hooks')
from session_utils import get_session_id
sid = get_session_id()
(Path.home()/'.claude'/f'.lifecycle-mode-{sid}.json').write_text(json.dumps({'session_id':sid,'mode':'edit'}))
"
```
Apply in order:
- B#1 subagent-failure recovery paths (Stage 2+3: on_empty, on_error, on_refusal)
- B#2 move default-tier agent prompts to `references/default-tier.md` (body < 200 lines)
- B#3 `hooks/mode-declaration.py` + `hooks/persistence.py` PostToolUse stubs
- C#6 `$OPENCLAW_DIR` validation in Stage 4
- D#7 memory-entity `-N` suffix on same-day collision
- Re-run skillscore + /gap-analysis; target 90%+ and B+ (4.0+).

## Task 2 — Fred-as-pattern audit + optional extraction

AUDIT these 5 skills for existing synthesis discipline matching Fred's revenue-model + kill-criterion format: `/strategic-plan`, `/brainstorming`, `/internal-debate`, `/research-couple`, `/research-buddies`.

Grep each SKILL.md for: "revenue", "kill criterion", "exit condition", "cost estimate", "synthesis", "make the call". If 3+ hits → "superior alternative exists" → SKIP extraction. If NO across all → extract `decision-synthesizer` skill. Ship at 90%+ from day one.

Bean's guard: "incredible setup that could level our thinking across the board **if our other skills don't already have a superior or specialised alternative**." Honour the guard.

## Task 3 — Build `/verify-code-review-setup`

Origin: deferred from 2026-04-16. Create `~/.claude/commands/verify-code-review-setup.md`. Runs each CLI against a known-bad file + checks each VSCode extension; reports PASS/FAIL grid:
- `ruff` → `C:/Users/Bean/.local/bin/ruff.exe`
- `stylelint` → `C:/Users/Bean/AppData/Roaming/npm/stylelint.cmd`
- `semgrep` → `C:/Users/Bean/.local/bin/semgrep.exe`
- `phpstan` → per-project `vendor/bin/phpstan`
- SonarLint extension → `code --list-extensions | grep sonarlint`

## Task 4 — Resolve stop-hook firing on reference files

The grading-coverage stop hook has fired 9+ times on `.agents/skills/research-check/references/extended-tier.md` — a reference file covered by its parent skill's evaluation (research-check graded B 4.1 on 2026-04-17). Bean wants this resolved.

Three options; pick one:

**A. Grade the reference file in isolation** — treats it as its own artifact, adds a 4.xx entry to evaluation-history. Noisy but fastest. Risk: if we do this for every reference file in the library, history gets padded with micro-grades that dilute the signal.

**B. Add an allowlist to the stop hook** — skip files under `references/` whose parent skill was graded within 7 days. Implementation:
```python
# In whichever hook runs the coverage check
if path.parent.name == "references":
    parent_skill = path.parent.parent.name
    last_grade = get_last_grade_for(parent_skill)
    if last_grade and (now - last_grade.timestamp).days < 7:
        skip()
```
Lives in the hook source, not prose. Closes the noise; accepts some risk that a drifted reference hides inside a passing parent grade.

**B'.  Other direction — deepen parent grading** — when a skill is graded, the grader also walks every referenced file and checks consistency with the parent. More rigorous; more work per grade. Alternative if Bean wants stricter coverage.

**C. Do both** — allowlist + add a "reference integrity" sub-check in gap-analysis Step 4 for skill-type targets.

Pick based on whether the stricter stance (catch reference drift) or the quieter stance (trust parent grading) matches how Bean wants skillscore to feel. My hunch: B is fine as a near-term fix; add the B' deepening when SSB Phase 7 pattern learning arrives and we have more signal about when references actually drift.

## Task 5 — Commit triage + PR

Branch `feat/diagnostics-lint-commands` has 1,717 uncommitted files across 3 sessions. Separate:
- KEEP: `~/.claude/commands/`, `~/.agents/skills/research-check/`, `.claude/specs/`, `.claude/gap-analysis/reports/`
- REVIEW: `plugins/sgs-blocks/composer.*` (legit PHPStan install)
- EXCLUDE: `plugins/sgs-blocks/vendor/` (verify gitignore)

Open PR against `main` with 3-session summary.

## Guardrails

- Refresh lifecycle-mode marker before each protected-file edit (hook consumes per edit).
- Don't commit `plugins/sgs-blocks/vendor/` without gitignore check.
- Stop hook reminds about `extended-tier.md` grading — DEFER.
- 10 stale git stashes (21-23d old, mobile-nav/mega-menu) — unrelated, leave for Bean to triage.
