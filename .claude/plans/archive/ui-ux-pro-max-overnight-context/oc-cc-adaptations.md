# OC ↔ CC Adaptations

How `ui-ux-pro-max` differs between Claude Code (CC) and OpenClaw (OC). Paths, invocation patterns, auth, and the real story of cross-platform consumption.

## Current reality (verified 2026-04-14)

| Dimension | Claude Code | OpenClaw |
|-----------|-------------|----------|
| Skill directory | `C:/Users/Bean/.agents/skills/ui-ux-pro-max/` (shared) | `A:/.openclaw/workspace/skills/` — **not present** |
| CLI path | `python C:/Users/Bean/.agents/skills/ui-ux-pro-max/scripts/search.py` | Same (when run via `shell-exec` block) |
| Loaded automatically? | No — `user-invocable: true` (just set this session). Loaded on demand | Not loaded at all — skill not in OC workspace |
| Current consumers | `innovative-design`, `interactive-brief`, `skill-auditor` (3 verified via grep) | **ZERO** — grep on `A:/.openclaw/workspace/` returns no matches |

**Takeaway:** OC has zero integration today. The OC-integration risk flagged in the plan is **forward-looking** — we're not breaking anything, we're adding capability. No migration pain.

## Shared paths (same command, same behaviour)

The shared `~/.agents/skills/` pattern means both platforms can reference the CLI with identical commands:

```bash
python C:/Users/Bean/.agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>
```

Or via tilde (Bash-resolved):
```bash
python ~/.agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>
```

**OC caveat:** OC's shell-exec block can run this command. OC's code-block sandbox cannot (os / pathlib / subprocess blocked).

## Invocation patterns per platform

### Claude Code (CC)

**Direct skill invocation:**
```
User asks: "pick a palette for a fintech dashboard"
→ innovative-design Phase 1 decides to LOAD ui-ux-pro-max inline
→ ui-ux-pro-max SKILL.md body loaded into context
→ Runs CLI for the specific domain
→ Returns recommendations
```

**Sub-skill calling CLI directly (post-Unit 12):**
```
colourise Stage N: queries CLI via Bash tool
python ~/.agents/skills/ui-ux-pro-max/scripts/search.py "<brief>" --domain color --json --limit 5
```

**Parallel invocation (Variant C pattern):**
```
User invokes: Skill(innovative-design) + Skill(ui-ux-pro-max)
Both load in same message turn.
```

### OpenClaw (OC) — forward-looking integration

OC has no current integration. When consumers are added post-Session 3, they'll call via shell-exec block in flow JSON:

```json
{
  "id": "query-design-db",
  "type": "shell-exec",
  "inputs": {
    "command": "python C:/Users/Bean/.agents/skills/ui-ux-pro-max/scripts/search.py \"{{step.brief}}\" --domain color --json --limit 5"
  },
  "outputs": {
    "recommendations": "{{step.stdout}}"
  }
}
```

**OC flow candidates for future integration** (not this run):
- `morning-briefing` flow — could pull daily "design trend of the day" from the DB
- `email-triage` flow — could recommend colour palettes for email templates
- Any SGS client flow that generates design-system recommendations

## Auth differences

| Item | CC | OC |
|------|----|----|
| Shell env | Inherits user environment | NSSM service environment (different PATH) |
| `GEMINI_API_KEY` | Stale in shell; must `source A:/.openclaw/.env` | Loaded at gateway start; accessible via OC env |
| `CEREBRAS_API_KEY` | Same as Gemini — source `.env` first | Loaded at gateway start |
| No auth needed | Local CSV read, local Python CLI | Same |

**Rule for overnight run:** always `source A:/.openclaw/.env` before any Gemini / Cerebras delegation in CC Bash. OC flow delegations load env automatically.

## Search tooling

Per the `default-to-search-py-unified-router` correction: every research step uses `python ~/.claude/hooks/search.py`. This is the SearXNG-first router with automatic fallback to Brave → Firecrawl → SerpAPI → Tavily.

**Never name specific engines** in sub-agent prompts. The router handles engine selection.

```bash
# CORRECT
python ~/.claude/hooks/search.py "refactoring ui palette system"

# WRONG
curl ... api.search.brave.com  # direct engine call wastes quota + makes prompts brittle
```

## Platform-specific runtime gotchas

### CC

- **Lifecycle gate:** Every skill edit triggers `lifecycle-gate.py` (PreToolUse on Edit) + `pending-gap-analysis-writer` (PostToolUse). Stay inside an active pipeline or keep a `.lifecycle-mode-{session_id}.json` file present, otherwise edits are blocked.
- **Session marker confusion:** With multiple CC windows open, the newest `.session-active-*.json` wins. Write mode files for all marker IDs during overnight to avoid mid-run mismatches.
- **Skillscore hook:** Fires after every skill edit. Score must stay ≥ 80% or the skill enters "pending-grade" state, which blocks next tool call until gap-analysis runs.

### OC

- **code-block sandbox restrictions:** `os`, `sys`, `subprocess`, `shutil`, `pathlib`, `socket`, `open()` all raise ImportError. For any filesystem / subprocess need, use `shell-exec` block instead.
- **code-block result wrapper:** Output is at `{{step.result.field}}` not `{{step.field}}`. Silent-empty if wrong template path.
- **log-debug action default:** Defaults to `log` in v1.1.0+. Pre-fix-era flows have missing `action: log` entries.
- **One feature = one automation system:** Never run two automation systems for the same trigger. If OC cron does X, kill the n8n workflow that did X before.

## Post-Session 3 OC integration checklist (deferred to future session)

Not running tonight, but for the next phase:

- [ ] Identify 2-3 OC flows that would benefit from ui-ux-pro-max (morning-briefing, invoice template design, email-triage colour palettes)
- [ ] Add shell-exec steps to those flows calling the CLI
- [ ] Test the flow end-to-end (both OC-runner-side and CC-side triggers)
- [ ] Update this adaptations doc with "actively consumed by OC" list

## Architecture decision (RESOLVED 2026-04-15)

Bundled path committed at 95% confidence. CLI + SQLite mirror compiled (5,598 rows, sub-millisecond queries). MCP path was evaluated and rejected — passive token cost from schema registration would force 25 consumer-prompt rewrites with no clear benefit, repeating the wp-blocks/wp-docs/a11y-audit reversion lesson.

OC integration pattern: shell-exec block calling the CLI. CC integration pattern: Bash tool calling the CLI. Both platforms share the same `~/.agents/skills/ui-ux-pro-max/scripts/search.py` entry point.

## Quick-reference cheat sheet

```bash
# Source env (always first in CC Bash)
source A:/.openclaw/.env

# Query the DB (works identically in CC and OC shell-exec)
python ~/.agents/skills/ui-ux-pro-max/scripts/search.py "dark fintech" --domain color --json --limit 5

# Search the web (unified router, never name engines)
python ~/.claude/hooks/search.py "refactoring ui palette system"

# Delegate to Cerebras (CC main-thread dispatching)
python C:/Users/Bean/.claude/agents/cerebras-agent/agent.py --prompt "<task>" --cwd "<dir>"

# Delegate to Gemini Pro (paid)
gemini -p "<prompt>" -y --model gemini-3.1-pro-preview

# Delegate to Gemini Flash (free)
gemini -p "<prompt>" -y --model gemini-3-flash-preview

# Telegram ping (morning summary or blocker alert)
python C:/Users/Bean/.claude/hooks/tg-cli.py send "<message>"
```
