Invoke /autopilot before anything else.

**First action before any work:** Answer this research question for Bean and put the answer in the conversation:

> Can Claude Code utilise the VS Code extensions Bean has installed? (e.g., GitLens, Prettier, ESLint, Better Comments, Error Lens, Tailwind IntelliSense). Does the VS Code extension CC runs in expose extension APIs, or only basic file/editor state? If yes — which productivity unlocks matter most?

How to answer:
1. `python ~/.claude/hooks/search.py "claude code vscode extension integration api"`
2. Check `~/.claude/settings.json` (Bean has it open) for VS Code-specific config
3. Read the Claude Code VS Code extension README / changelog
4. Give Bean a direct answer in one paragraph. Recommend 2-3 productivity unlocks if yes, say "not available" clearly if no

---

**Then read the full handoff:** `C:/Users/Bean/Projects/small-giants-wp/.claude/HANDOFF-2026-04-15.md` — it has everything you need for context, including all paths, critical tools, gotchas, and working patterns to preserve.

## The three work tracks

1. **Functional duplicate de-duplication** — merit-based list of 14 deprecation candidates in the handoff. Start with the 6 MCPs with CLI replacements (low-risk, high-value). Don't touch mega-menu NEXT-SESSION-PROMPT in this project root — that's a parallel track.
2. **35-item gap-analysis batch pass** — research-only (collect gaps, don't fix). Use the 6 batches to reduce to ~25-27 effective evaluations. Save reports to `C:/Users/Bean/.claude/gap-analysis/reports/`. Grade in main conversation, delegate bulk to `gemini-analyser` agent to save Opus tokens but surface all scores.
3. **Skill↔command parity fixes** — run `python ~/.claude/hooks/audit-skill-command-parity.py --high-only` for the 49 HIGH-priority list. Triage: does each need a `/<name>.md` command, or an alias (different short name like `/uimax` → `ui-ux-pro-max`)? Batch-create top 10-15 most-used.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/autopilot` | FIRST — establishes live skill routing + ADHD support |
| `/library-docs` | Quick library/framework docs — replaces Context7 MCP |
| `/search` | Any web research — auto-routes via SearXNG |
| `/gap-analysis` | Grade items from the 35-list (one at a time, main thread) |
| `/uimax` | Query ui-ux-pro-max CLI when design work needs options |
| `/lifecycle` | Any skill/agent/command edit — routes to skill-writer / agent-writer / command-writer |
| `/skill-auditor` | Run the skill↔command parity audit + look at cross-skill overlaps |
| `/remembering-conversations` | Check past sessions for decisions before guessing |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `github` MCP | PR / issue / code search — for Optibot vs code-review plugin comparison, the 35-list skills may have GitHub references to check |
| `playwright` MCP | Visual testing only; prefer Playwright CLI for batch work |
| `chrome-devtools` MCP | Chrome-specific debug (LCP, ARIA, Lighthouse) — kept per merit analysis, don't deprecate |

Do not use: `context7` MCP, `wp-blockmarkup` MCP, `sgs-blockmarkup` MCP, `wp-devdocs` MCP, `a11y-accessibility` MCP, `whisper-mcp` — per the dedup list, these should be disabled (save ~6,000 tokens per session).

## Agents to Delegate To

| Agent | When |
|-------|------|
| `gemini-analyser` | Batch-grading the 35-item list — delegate 17 design sub-skills + 10 WP skills, keep 3 agents + 5 overlap batches main-thread |
| `wp-sgs-developer` | Any SGS WordPress work that surfaces during the gap analysis |
| `search-conversations` | Recovering past context on any skill before grading it |

## Critical CLIs

```bash
# Run the audit fresh (output may differ from handoff)
python ~/.claude/hooks/audit-skill-command-parity.py --high-only

# Skillscore any skill
skillscore validate <path> --type skill

# Unified search (SearXNG default)
python ~/.claude/hooks/search.py "<query>"

# Validate pipeline artifact (if overnight run produced any)
python ~/.claude/hooks/validate-pipeline-artifact.py <artifact-path> --pipeline <name> --stage <stage-key>

# Delegate grading to Gemini Flash (free, 1M context)
set -a; source A:/.openclaw/.env; set +a
gemini -p "<prompt>" -y --model gemini-3-flash-preview

# Delegate bulk to Cerebras (free)
python C:/Users/Bean/.claude/agents/cerebras-agent/agent.py --prompt "<prompt>" --cwd "<dir>"

# Telegram ping Bean if blocked
python C:/Users/Bean/.claude/hooks/tg-cli.py send "<message>"
```

## Guardrails (non-negotiable)

- **Inline by default** — dispatch agents only when one of the 5 criteria applies (3+ artifacts, independent branches, token-heavy parallel, destructive isolation, wall-clock binding). State which criterion when dispatching.
- **Read source before building** — `ls <skill>/` + `--help` on any CLI before planning around it. Catches ghost skills.
- **Skill + command = pair, not duplicate** — when building anything new with a CLI, ship both.
- **Never LLM-generate structured reference rows** — use deterministic `ingest-<source>.py` walkers from authoritative repos with license + source_url + provenance.
- **Cross-platform classification** — every rule / config / template edit classified as CC-only / OC-only / cross-platform before applying. Cross-platform lands on both sides same turn.
- **Don't use bash heredocs for code content >30 lines** — use Write tool or file-staged `/tmp/` helper with bytes literals. Backticks, regex, apostrophes all break heredocs.
- **Surface all gap-analysis scores to Bean** — never hide in subagent output.

## Files to pick up

```
C:/Users/Bean/Projects/small-giants-wp/.claude/HANDOFF-2026-04-15.md   ← read first after VS Code question
C:/Users/Bean/Projects/small-giants-wp/TOOLING-REFERENCE.md            ← stack reference
C:/Users/Bean/Projects/small-giants-wp/.claude/plans/specs/ui-ux-pro-max/  ← overnight spec (check if ran)
C:/Users/Bean/.claude/lifecycle-reports/2026-04-15-night.md            ← if overnight ran, this exists
C:/Users/Bean/.claude/hooks/audit-skill-command-parity.py              ← skill↔command audit
```

## Bean's working rules

- Prefers no mid-track checkpoints — don't pause asking "shall I continue?"
- Quality bar unchanged whether he's awake or asleep
- "sorted" = done/completed; "don't stop" = no handovers, NOT skip verification
- UK English everywhere (colour, behaviour, organise, optimise)
- No em dashes in client-facing content
- Will answer questions when he's back — don't block on them if a reasonable default exists

---

Start with the VS Code question, then pick one of the three work tracks. If the overnight ui-ux-pro-max run happened (check report file), review its output before anything else.
