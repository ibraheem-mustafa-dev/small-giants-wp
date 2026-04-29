# Session Handoff — 2026-04-15

**From:** Opus 4.6 in `a:/.openclaw/` working session
**To:** Fresh CC session in `C:/Users/Bean/Projects/small-giants-wp/`
**Date:** 2026-04-15

---

## Start this session by answering Bean's question

**Q: Can you utilise VS Code's extensions that I have installed?**

Research this before doing anything else. Specifically: can the Claude Code VS Code extension programmatically invoke or coordinate with other installed VS Code extensions (GitLens, Prettier, ESLint, Better Comments, Error Lens, etc.)? Does the IDE-context CC gets include extension access, or only the basic file/editor state?

How to investigate:
1. Check `C:/Users/Bean/.claude/settings.json` for any VS Code-specific config
2. `python ~/.claude/hooks/search.py "claude code vscode extension integration api"` — find the answer via unified search (SearXNG)
3. Check `claude --help` + the extension README for what it exposes
4. If yes: list which extensions Bean has installed (ask him or check VS Code config) and propose 2-3 productivity unlocks
5. If no: state it clearly so Bean stops waiting on the capability

Give Bean the answer in one clear paragraph before moving to anything else.

---

## Main work streams

This handoff continues three intertwined threads. Priority order:

1. **Continue functional duplicate de-duplication** (merit-based list from this session)
2. **35-item gap-analysis batch pass** (the original Task 4 from earlier NEXT-SESSION-PROMPT)
3. **Skill↔command parity audit** — new finding: 49 HIGH-priority skills missing their commands

**Also awaiting execution:** the ui-ux-pro-max overnight upgrade spec. Bean may have already fired that off in a different window. Check `C:/Users/Bean/.claude/lifecycle-reports/2026-04-15-night.md` first — if it exists, the overnight run happened; if not, it's still pending.

---

## 1. Functional Duplicates — Merit-based List

Produced 2026-04-15 by evaluating each cluster on merit (not by prior decisions, not by docs). Full rationale at the end of the prior session transcript. Summary:

### Drop — add no merit-justified capability

| # | Target | Why | Risk |
|---|--------|-----|------|
| 1 | `context7` MCP (desktop config) | CLI (`context7.py`) + `/library-docs` covers it | Low |
| 2 | `plugin:context7:context7` plugin | Already disconnected this session | None |
| 3 | `wp-blockmarkup` MCP | `wp-blocks.py` CLI covers | Low |
| 4 | `sgs-blockmarkup` MCP | `wp-blocks.py` CLI covers | Low |
| 5 | `wp-devdocs` MCP | `wp-docs.py` CLI covers | Low |
| 6 | `a11y-accessibility` MCP | `a11y-audit.py` CLI covers | Low |
| 7 | `whisper-mcp` MCP | `/whisper` + `/record` commands cover irregular use; binary exists on PATH | Low |
| 8 | `nano-banana:generate` plugin | `nano-banana-pro` skill + `/generate` command cover | Low |
| 9 | `code-review:code-review` plugin | Weaker than `optibot` or `pr-reviewer`; pick one | Medium (evaluate overlap with Optibot first) |
| 10 | `research-duo` skill | Redundant framing vs research-check; router already covers "2 agents collaborating" | Low |
| 11 | `light-research-team` skill | Merge into `research-check` as `--tier extended` mode | Low |
| 12 | `accessibility-scan` skill | Loses on backend: axe-core (used by `/a11y-audit`) beats accessibility-test-scanner | Low |
| 13 | Playwright MCP **or** plugin (whichever is the plugin wrapper over MCP) | Pick one — they wrap same underlying server | Low |
| 14 | `skill-agent` | Subsumed by `lifecycle-manager` / `/lifecycle` | Low (check if it even still exists) |

### Reshape on merit

- **SEO skill↔agent duplication:** `seo-content`, `seo-schema`, `seo-sitemap`, `seo-technical` exist as BOTH skills and agents with the same name. Consolidate to skills unless the agent does genuinely isolated-context work. Same reconciliation pattern as `design-review` skill vs `design-reviewer` agent (already flagged separately in TOOLING-REFERENCE.md).
- **Bolder vs colourise:** colourise is a subset of bolder (hue-only). Either merge (`bolder --dimension hue`) or explicitly differentiate in descriptions so the router picks correctly.

### Keep — distinct merit (NOT duplicates)

- All CLI + command pairs (new rule: skill = implementation, command = user contract — they compose)
- `chrome-devtools-mcp` — distinct from Playwright (Chrome-only debug: LCP traces, Lighthouse, ARIA inspector)
- `superpowers-chrome:browsing` — distinct (authenticated persistent sessions)
- `windowsagent` family — OS automation, not browser
- 5 research tiers (check / buddies / couple / council / deep) — each has distinct shape
- All specialist agents (wp-sgs-developer, design-reviewer, site-reviewer, research-pipeline) — genuine delegation

### New finding — skills missing commands

Audit script created this session: `C:/Users/Bean/.claude/hooks/audit-skill-command-parity.py`

Run:
```bash
python ~/.claude/hooks/audit-skill-command-parity.py                # full report
python ~/.claude/hooks/audit-skill-command-parity.py --high-only    # just the 49 high-priority ones
python ~/.claude/hooks/audit-skill-command-parity.py --json          # machine-readable
```

**Result at time of handoff:** 149 skills scanned, 146 missing name-matched commands, 49 HIGH priority (CLI-wrapping or invokes CLI in body), 34 orphan commands (some are legitimate aliases like `/uimax` → `ui-ux-pro-max`).

**Priority next-session actions:**
1. Run the audit script fresh (output may have changed since handoff)
2. Triage the 49 HIGH list — for each: does it need a `/<name>.md` command, or an alias with a different short name?
3. Batch-create commands for the top 10-15 most-used (per Bean's recall) — Cerebras agent is fine for this, use Write tool (not bash heredocs) per the staged-file correction
4. Update `skill-writer` template so future skills auto-generate their command pair (per the embody-the-rule correction)
5. Add a skillscore check for command-parity so it grades future regressions

---

## 2. The 35-item Gap-Analysis Batch (still pending from start-of-this-session)

Original Task 4 from the NEXT-SESSION-PROMPT that kicked this whole session off. Never executed — should be the second overnight run after ui-ux-pro-max lands.

### The 35 items

**10 WP/SGS skills** — `sgs-wp-engine`, `wp-block-development`, `wp-block-themes`, `wp-interactivity-api`, `wp-plugin-development`, `wp-rest-api`, `wp-wpcli-and-ops`, `wp-site-extraction`, `wp-performance`, `wp-abilities-api`

*Caveat:* `wordpress-router` and `wp-project-triage` also exist. Bean said 10, not 12 — confirm which to swap in.

**17 design sub-skills** (router has 21; pick 17 or grade all 21) — `adapt`, `audit`, `bolder`, `clarify`, `colourise`, `critique`, `delight`, `distill`, `extract`, `harden`, `interactive-design`, `normalize`, `onboard`, `optimise`, `polish`, `quieter`, `teach-impeccable`. Candidates to exclude: `superdesign`, `ui-ux-pro-max`, `tailwind-design-system`, `frontend-design`.

**3 agents** — `wp-sgs-developer`, `design-reviewer`, `site-reviewer`

**2 modified last session** — `~/.claude/skills/skill-writer/references/skill-anatomy.md`, `~/.claude/skills/gap-analysis/SKILL.md`

**2 new this session** — `sgs-discover` (already graded B 3.57), `~/.claude/hooks/validate-pipeline-artifact.py` (custom target_type, code criteria)

**1 pipeline regrade** — `animation-harvest` (already graded C 3.07 this session after bug fixes)

### Batching to reduce 35 → ~25-27 effective evaluations

Per the overlap analysis added to `TOOLING-REFERENCE.md`, grade these pairs together rather than in isolation:

| Batch | Targets |
|-------|---------|
| 1 | `bolder` + `colourise` |
| 2 | `distill` + `quieter` |
| 3 | `audit` + `critique` |
| 4 | `normalize` + `extract` |
| 5 | `design-review` skill + `design-reviewer` agent |
| 6 | `design-reviewer` agent + `site-reviewer` design-layer |

Single reconcile-then-grade pass is always cheaper than grade-then-reconcile. Boundary decisions often close `ecosystem_awareness` gaps in both members of the pair at once.

### Save location for reports

`C:/Users/Bean/.claude/gap-analysis/reports/2026-04-??-batch-*.md` plus system-level patterns to `C:/Users/Bean/.claude/gap-analysis/system-level-findings.md`.

### Guardrails (from original NEXT-SESSION-PROMPT)

- **Research only** — do NOT fix gaps during this pass. Collect only.
- **Run gap-analysis in main conversation** (corrections say subagent output is invisible to Bean)
- Use `gemini-analyser` agent for bulk grading to save Opus tokens, but surface full scores to main thread

---

## 3. Session state — where things stand

### ui-ux-pro-max upgrade
- Spec bundle at `C:/Users/Bean/Projects/small-giants-wp/.claude/plans/specs/ui-ux-pro-max/` (6 files)
- Skill graded this session: B (3.98) post-fix, skillscore 91% (A-)
- Broken symlinks fixed (`data/`, `scripts/`, `templates/` restored from nextlevelbuilder/ui-ux-pro-max-skill GitHub)
- `/uimax` command built as shortcut for raw CLI path
- CSV stats: 14 files, 6,461 rows (colors 161, google-fonts 1924, design 1775, draft 1778, products 162, ui-reasoning 162, icons 105, ux-guidelines 99, styles 85, typography 74, react-performance 45, landing 35, app-interface 30, charts 26)
- **Important correction from this session:** reference DB expansion should NOT use LLM generation (Cerebras/Gemini hallucinate). Use deterministic `scripts/ingest-<source>.py` walkers reading authoritative open-source repos with license + source_url + provenance columns. Example: `terrazzoapp/dtcg-examples` delivered 5,164 verified tokens.

### innovative-design router
- Graded this session: B (4.35) after fix loop (up from 3.85)
- Absorbed frontend-design as Phase 0 (Aesthetic Direction)
- Added Phase 1 Options-Loading Check (B+C pairing with ui-ux-pro-max)
- Added Phase 3 CLI-query suggestions per sub-skill
- Added Failure Handling section
- Added worked Phase 0 example (luxury watch brand)

### sgs-discover skill
- Built this session
- Skillscore C (70%), gap-analysis B (3.57)
- Still has 7 open recommendations — worth revisiting in a future lifecycle pass

### animation-harvest pipeline
- Graded this session: C (3.07) after minor bug fixes
- Stage numbering bug fixed (stage-2-analysis → stage-3-analysis)
- Input/Output labels bolded for skillscore
- 6 open recommendations documented but not implemented

### validate-pipeline-artifact.py
- New CLI built this session
- Validates JSON artifacts between pipeline stages
- Tested with 3 scenarios (valid, kill-gate, failed status)
- Ungraded — Item 34 in the 35-list

### TOOLING-REFERENCE.md
- Location: `C:/Users/Bean/Projects/small-giants-wp/TOOLING-REFERENCE.md`
- 22 sections, 780+ lines, 45KB
- Covers: skills, commands, agents, hooks, CLI tools, MCPs, plugins, reference docs, Custom WP CLI Suite, OC pipelines + flows, workflow for new SGS client builds, functional overlaps to reconcile, known gaps

---

## 4. Reference paths & commands

### Spec bundle for ui-ux-pro-max overnight
```
C:/Users/Bean/Projects/small-giants-wp/.claude/plans/specs/ui-ux-pro-max/
├── README.md
├── SPEC.md                           # Technical brief, per-unit detail
├── gap-register.md                   # 32 gaps with evidence
├── model-delegation-matrix.md        # Which model per unit
├── oc-cc-adaptations.md              # CC vs OC paths & invocation
└── overnight-execution-runbook.md    # T+0 → T+8h step-by-step
```

### Memory files — read these if unfamiliar with context

**CC-side:**
- `C:/Users/Bean/.claude/CLAUDE.md` — global config
- `C:/Users/Bean/.claude/rules/` — all rules (uk-english, code-quality, wp-project-tooling, no-coauthored-by, always-invoke-autopilot)
- `C:/Users/Bean/.claude/projects/a---openclaw/memory/MEMORY.md` — index of all behavioural corrections (this file is auto-loaded every session)

**Today's critical corrections** (loaded from MEMORY.md at session start but worth knowing):
- `feedback_verify_skill_artifacts` — `ls <skill>/` before designing around it
- `feedback_ui_ux_pro_max_cross_cutting` — call the CLI whenever design work needs options
- `feedback_default_to_search_py_unified_router` — every web search goes through `python ~/.claude/hooks/search.py`
- `feedback_cc_oc_parity_check` — classify every rule as CC-only / OC-only / cross-platform before proposing
- `feedback_read_source_before_building` — read actual source, don't assume
- `feedback_dont_jump_to_conclusions` — hold direction in session-insights until explicit decision
- `feedback_spec_first_delegation` — specs first, then parallel agents
- `feedback_inline_by_default_dispatch_consciously` — **NEW** — don't reflexively dispatch agents; default inline
- `feedback_ingest_dont_generate_reference_data` — **NEW** — deterministic ingesters for CSV rows, never LLM generation
- `feedback_ship_skill_and_slash_command` — **NEW** — skill + command is a pair, not a duplicate
- `feedback_stage_files_via_tmp_not_bash_heredoc` — **NEW** — use Write tool or file-staged pattern; bash heredocs break on backticks/regex
- `feedback_runner_uses_full_jinja2` — OC flow templates support full Jinja2 in inputs; only `template-render` block uses lightweight
- `feedback_lifecycle_tool_embodiment` — new rules for skills must update skill-writer + skillscore too, not just CLAUDE.md

### Critical tools for this work

| Tool | Command | Purpose |
|------|---------|---------|
| Skill↔command audit | `python ~/.claude/hooks/audit-skill-command-parity.py --high-only` | Find skills missing commands |
| Unified search | `python ~/.claude/hooks/search.py "<query>"` | SearXNG-first web search |
| Skillscore | `skillscore validate <path> --type skill\|agent\|pipeline` | Deterministic quality grading |
| Local search (SGS DB, WP hooks, corrections) | `python ~/.claude/hooks/local-search.py "<query>"` | Local-first before web |
| Pipeline enforcer | `python ~/.claude/hooks/pipeline-enforcer.py active\|start\|complete\|checkpoint` | Lifecycle state |
| Validate pipeline artifact | `python ~/.claude/hooks/validate-pipeline-artifact.py <path> --pipeline <name> --stage <key>` | Stage JSON validation |
| Telegram | `python ~/.claude/hooks/tg-cli.py send "<msg>"` | Blocker alerts |
| Gemini Flash (free) | `set -a; source A:/.openclaw/.env; set +a; gemini -p "<prompt>" -y --model gemini-3-flash-preview` | Free 1M-context delegation |
| Gemini Pro (paid) | Same, `--model gemini-3.1-pro-preview` | Deep reasoning |
| Cerebras (free) | `python C:/Users/Bean/.claude/agents/cerebras-agent/agent.py --prompt "<X>" --cwd "<dir>"` | File ops, bulk edits |

### Blub dashboard
- URL: `http://localhost:5050`
- Auth header: `Cookie: blub_auth=blub-second-brain-2026`
- Useful endpoints: `/api/corrections` (POST new corrections), `/api/knowledge` (FTS5 search), `/api/settings` (settings + kanban autonomous mode flag)

### Skill pairs already verified healthy this session

Only 3 skills have exact name-matched commands per the audit:
- (run `python ~/.claude/hooks/audit-skill-command-parity.py --json` to see which)

Most skills use alias commands (different names). The strict audit's "missing" list is genuinely missing, not false-positive on aliases — aliases just take a different form.

---

## 5. Gotchas — save yourself time

### Lifecycle gate blocks skill edits

Every skill edit fires `lifecycle-gate.py` (PreToolUse) + `pending-gap-analysis-writer` (PostToolUse). Stay inside an active pipeline or keep a `.lifecycle-mode-{session_id}.json` file present, otherwise edits are blocked.

**With multiple CC windows open:** the newest `.session-active-*.json` wins. Write mode files for ALL marker IDs during batch work to avoid mid-run mismatches:

```bash
python -c "
import json
from pathlib import Path
from datetime import datetime, timezone
claude_dir = Path.home() / '.claude'
now = datetime.now(timezone.utc).isoformat()
for m in claude_dir.glob('.session-active-*.json'):
    sid = m.stem.replace('.session-active-', '')
    (claude_dir / f'.lifecycle-mode-{sid}.json').write_text(json.dumps({'session_id': sid, 'created_at': now}))
print('Mode files written')
"
```

### Skillscore hook reports 30% regardless of content

`skillscore-check.py` PostToolUse hook is broken. The manual `skillscore` command works correctly. Ignore the 30% from the hook; run `skillscore validate <path>` for real scores.

### OC code-block sandbox

`os`, `sys`, `subprocess`, `shutil`, `pathlib`, `socket`, `open()` all blocked in OC's code-block. Use `shell-exec` block for anything needing filesystem/subprocess.

### Cross-platform edit classification

Every rule/template/config edit must be classified: CC-only / OC-only / cross-platform. Cross-platform edits must land on BOTH sides the same turn. CC concrete targets: `~/.claude/CLAUDE.md`, project `.claude/CLAUDE.md`, skill descriptions, subagent prompts, `~/.claude/settings.json`. OC concrete targets: `A:/.openclaw/workspace/AGENTS.md`, `USER.md`, skill prompts under `workspace/skills/`, `openclaw.json`. Never edit `SOUL.md` directly.

### Bash heredoc anti-pattern

When writing Python scripts >30 lines, markdown with backticks, or regex-heavy strings — use the Write tool directly OR stage files via `/tmp/` helper. Bash heredocs break on backticks (executed as commands), apostrophes near delimiters, and nested heredocs. This session burned ~10 cycles learning this.

### Default to inline, dispatch consciously

Before using Agent tool / Gemini / Cerebras / any subagent, check the 5 criteria:
- (a) 3+ similar independent artifacts
- (b) independent research branches (triangulation)
- (c) token-heavy parallelisable batch
- (d) destructive ops needing isolation
- (e) wall-clock time binding

If none apply, go inline. State the criterion when dispatching.

### Reference DB expansion

Never use LLM generation (Cerebras/Gemini) for structured citable rows. Use deterministic `ingest-<source>.py` walkers from authoritative open-source repos. Every row needs `license`, `source_url`, `provenance` columns.

---

## 6. Suggested execution order

1. Answer VS Code extensions question (5-15 min)
2. Check `~/.claude/lifecycle-reports/2026-04-15-night.md` — did the ui-ux-pro-max overnight run?
   - If yes: verify morning report, spot-check DB expansion entries, confirm skillscore held
   - If no: decide whether to trigger it now or finish de-dup first
3. Run the skill↔command parity audit fresh: `python ~/.claude/hooks/audit-skill-command-parity.py --high-only` — see current state
4. Pick which tracks to advance this session:
   - Dedup drops (1-hour work): deprecate the 5 MCPs (if Bean has the MCP config access path), remove research-duo, evaluate Optibot vs code-review plugin
   - Command generation (2-3 hour work): build 10-15 top-priority slash commands from audit HIGH list
   - 35-item gap-analysis (3-5 hours, overnight candidate): grade the 6 batches + 23 individual items
   - SEO skill↔agent consolidation (1-2 hour work): pick skill-or-agent-not-both
5. Handoff at end noting what shipped

---

## 7. What's working well, keep doing

- `/uimax` command pattern — single 70-char CLI call becomes 5-char invocation
- File-staged writes via Write tool instead of bash heredocs
- Episodic-memory checks via `search-conversations` before claiming "no historical data"
- Surfacing full gap-analysis JSON + scores to Bean (never hide in subagents)
- Merit-based evaluation (not "the doc says X so do Y")

---

Closing notes for the fresh session:

- Bean sleeps 23:00-ish, expects morning output ready for his review
- He prefers **no handover checkpoints on scoped work** — don't pause mid-track asking "shall I continue?" unless a genuine decision is needed
- He expects quality bar unchanged whether he's awake or asleep — don't lower the bar for "autonomous mode"
- He's called `sorted` = "done/completed"; and "don't stop" = "no handovers", NOT "skip verification"

Good luck.