# Next Session Prompt -- 2026-04-15

Invoke /autopilot before doing anything else.

## Where You Are

Plan: .claude/plans/current_mission.md (SGS pipeline architecture Task 3a/4/5)
Current phase: Plan divergence -- this session worked on ui-ux-pro-max upgrade outside the mission. Mission still at Task 3a (4 Bean decisions pending).
Progress: ui-ux-pro-max upgrade SHIPPED (separate spec). SGS mission: not advanced this session.
Next task: Decide direction (Task 1 below) before doing any work.

---

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through these priorities.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| /brainstorming | ALWAYS INCLUDE -- decide direction (resume SGS mission vs continue ui-ux-pro-max vs both) |
| /gap-analysis | ALWAYS INCLUDE -- grade any new ingester or skill edit before declaring done |
| /lifecycle | ALWAYS INCLUDE -- start pipeline before any skill/agent/pipeline edit |
| /research | ALWAYS INCLUDE -- auto-routes to research tier |
| /strategic-plan | ALWAYS INCLUDE -- if continuing ui-ux-pro-max, plan the next 3-5 source ingests |
| /uimax | NEW this session -- design intelligence CLI shortcut |
| /sgs-wp-engine | If resuming SGS mission |
| /capture-lesson | If Bean flags any rule worth saving |
| /research-buddies | Source discovery (Nerd + Practical pair) |

## MCP Servers and Tools

| Tool | What to use it for |
|------|-------------------|
| wp-devdocs | If resuming SGS mission -- verified WP hook database |
| wp-blockmarkup | If resuming SGS mission -- block markup schemas |
| playwright | Visual checks on any deploy |
| github MCP | Cloning more authoritative source repos for further ingesters |

## Agents to Delegate To

| Agent | When |
|-------|------|
| wp-sgs-developer | If resuming SGS mission -- all SGS WordPress build work |
| research-pipeline | Source discovery for further ingesters (auto-selects tier) |
| design-reviewer | Visual quality review of any SGS work |

## Research Approach

If continuing ui-ux-pro-max ingestion, source discovery is largely done -- see the morning report Next-session candidates list and A:/.openclaw/workspace/memory/research/2026-04-15-ui-ux-pro-max-db-expansion-sources.md. For new questions, use /research-buddies.

---

## Task 1: Decide direction

Use /brainstorming to choose between three paths: (a) resume SGS pipeline architecture mission per .claude/plans/current_mission.md, (b) continue ui-ux-pro-max ingestion (Mozilla Protocol / Atlassian ADG / USWDS rich docs / FT PDF extraction), (c) both as parallel tracks. Update current_mission.md per the choice.

## Task 2: Set up OC parity for ui-ux-pro-max (5 min)

Run from a Windows shell as Administrator: mklink /D A:\.openclaw\workspace\skills\ui-ux-pro-max C:\Users\Bean\.agents\skills\ui-ux-pro-max. Verify OC can see the skill by listing A:/.openclaw/workspace/skills/. Optional follow-up: write scripts/sync-to-blub.py that pushes design-tokens.csv + icon-libraries.csv + ux-guidelines.csv rows into blub.db.knowledge for dashboard search.

## Task 3: Audit CLI-backed skills for slash-command parity

Per the captured lesson ship-skill-and-slash-command-for-cli-skills, list every skill in ~/.agents/skills/ with scripts/*.py that has no matching ~/.claude/commands/<name>.md. Flag the list to Bean before creating commands.

## Task 4: Review uncommitted state

Run git status in ~/.agents/skills/, ~/.claude/, and the SGS project root. Decide what to commit, what to discard. Use /commit-commands:commit for clean batches.

## Task 5 (optional, only if Task 1 chose ui-ux-pro-max continuation)

Build the next 2 ingesters per the morning report candidate list. Pattern is well-established. Use the file-staged Python pattern (no bash heredoc traps).

## Guardrails

- Do NOT mass-commit ~/.agents/skills/ or ~/.claude/ -- both have pre-existing WIP from other sessions.
- Do NOT touch plugins/sgs-blocks/includes/lucide-icons.php -- pre-existing WIP.
- ui-ux-pro-max skillscore is at 92 percent A-. Any edit must keep it >= 90.
- Use /uimax instead of typing the long CLI path.
- For multi-line code content via Bash, use the file-staged Python pattern.
