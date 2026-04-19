# Session Handoff — 2026-04-19

## Completed This Session

1. **Phase 0 tooling-audit fixes (4 items)** — (a) `skillscore-check.py` "BROKEN" claim removed from 3 doc locations (hook has been returning accurate scores all session — proven by 10+ correct skillscore events); (b) MCP deprecation verified — 4 deprecated MCPs (`wp-blockmarkup`, `sgs-blockmarkup`, `wp-devdocs`, `a11y-accessibility`) confirmed DISABLED, ~6000 tokens/session savings real; (c) `update-pipeline-state.py` deleted (pure passthrough to missing `pipeline-enforcer.py`); (d) `/site-clone` command renamed to `/clone-patterns`, sgs-site-clone anti-route + TOOLING-REFERENCE.md updated, 85% skillscore.
2. **Merged PR #7 to main** (squash) — session 13-14-15 tooling work + feature-audit reality pass (45% verified / 139 of 310). Branch `refresh/feature-audit-2026-04-18` deleted.
3. **Closed PR #6** — superseded by #7 (same commits). Branch `feat/diagnostics-lint-commands` deleted.
4. **Closed PR #4** — mega-menu templates superseded by direct commits on main (2-3 days newer: `mega-menu-panels.css` on main via `20d978c` on 2026-03-27 vs PR #4's 2026-03-25). Branch `feat/mega-menu-templates` deleted.
5. **11-repo sweep** — committed 362 uncommitted files across all active repos. Pushed 10; `helpingdoctors.org` blocked because GitHub repo is archived.
6. **Created `open-icd11` GitHub repo** (private) at github.com/ibraheem-mustafa-dev/open-icd11. Previously had no remote.
7. **Answered 6-pipeline coverage question (revenue-critical)** — only **1 of 6** chargeable service pipelines is fully orchestrated (`/sgs-site-clone`). Others: new-build partial, draft→SGS reference-only, audit→redesign partial, **client-onboarding MISSING** (biggest revenue gap), QA→deploy partial (fix loop missing).

## Current State

- **Branch:** `main` at `61e4964`
- **Tests:** no test suite for this framework
- **Build:** n/a (no source changes this session; `cd plugins/sgs-blocks && npm run build` if needed)
- **Uncommitted changes:** none on `small-giants-wp`
- **Open PRs:** zero on this repo
- **Other repos swept:** all 10 pushed; `helpingdoctors.org` has 1 local commit (`b55193a`) blocked by GitHub archive flag

## Known Issues / Blockers

- **`helpingdoctors.org` GitHub repo is archived** — push fails read-only. Unarchive via `gh repo edit ibraheem-mustafa-dev/helpingdoctors.org --archived=false` if the client is still active, or `git reset --hard HEAD~1` locally if dead.
- **Only 1 of 6 chargeable pipelines has an end-to-end orchestrator** — 5 require manual stitching per client engagement. Client-onboarding has zero implementation.
- **Phase 1 tooling audit deferred** — Bean requested next-session scope.

## Next Priorities (in order)

1. **Phase 1 tooling audit — bottom-up, all-tool-types** (revised per Bean 2026-04-18). Stage 1a section-by-section inventory sweep of `TOOLING-REFERENCE.md` → 1b Sonnet parallel research agents (size-ordered batches) → 1c 4-lens + 6-lens decision table → 1d implement → 1e `/project-consolidate` → 1f `/strategic-plan` + `/phase-planner`.
2. **Decide on `helpingdoctors.org` archive state** — 5-second GitHub toggle, unblocks that local commit.
3. **Plan orchestrators for the 4 missing/partial chargeable pipelines** — `/phase-planner` output should explicitly budget one orchestrator per pipeline (new-build, draft→SGS, audit→redesign, client-onboarding, QA→deploy fix loop).
4. **Start one of the 5 urgent client websites** once tooling is clean (names TBD in `/phase-planner` stage).

## Files Modified

| File path | What changed |
|---|---|
| `C:/Users/Bean/Projects/small-giants-wp/TOOLING-REFERENCE.md` | Skillscore "BROKEN" claim removed (3 spots); MCP deprecation verified + re-check command; `pipeline-enforcer.py` row updated to "intentionally absent, fails-open"; `/site-clone` row replaced with `/clone-patterns`; sgs-site-clone path corrected (`.claude/skills/` not `.agents/skills/`) |
| `C:/Users/Bean/.claude/commands/clone-patterns.md` | Renamed from `site-clone.md` |
| `C:/Users/Bean/.claude/skills/sgs-site-clone/SKILL.md` | Anti-route updated + added `## When NOT to use` body section (pre-existing FATAL gap); skillscore 85% |
| `C:/Users/Bean/.claude/hooks/update-pipeline-state.py` | Deleted — pure passthrough to missing `pipeline-enforcer.py` |
| `C:/Users/Bean/Projects/small-giants-wp/NEXT-SESSION-PROMPT.md` | Rewritten: revised Phase 1 plan + USP/motivation layer + 6-pipeline coverage verdict + Sonnet batch dispatch template |
| (Plus 11-repo sweep — 362 files across Openclaw Password Protector, booking-system, helpingdoctors.org, insight-graph, medinova, mosque-timetable, open-icd11, sgs-qr-generator, small-giants-studio, small-giants-wp, windowsagent) | Canonical `.claude/` scaffolding + session WIP committed per repo, one commit each |

## Notes for Next Session

- **"35 skills" is not a scope constraint** — it was a legacy count. Phase 1 scope is all tool types: skills, agents, commands, hooks, CLIs, MCPs, plugins, pipelines, reference docs.
- **Size-ordered audit** is mandatory — simple implementation skills first (leaves), then pipelines that invoke them, then meta-orchestrators. Can't grade a pipeline until its steps are graded.
- **Bean's 4 stated goals are the audit acceptance criteria** — grep `~/.claude/CLAUDE.md`, rules/, memory/, `strategic-objectives.json` for canonical versions before starting. Don't paraphrase.
- **Monitoring plan must be structural** (cron + issue log + fix-verify + recurrence-detection), never "Bean must remember to check."
- **Motivation layer is a 6th lens** — every decision-table row carries USP + specific goal-serving next action + % impact.

## Next Session Prompt

~~~
Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context. Then work through these priorities.

## USP (read first — motivation layer)

Tooling audit turns the skill library into **6 productised chargeable services with end-to-end orchestrators**. Only 1 of 6 exists today. Closing the 5 missing orchestrators is ~60% Bean-time reduction per client engagement. Revenue unlock.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural decisions, pair-grading boundary calls, design-mode exploration (absorbs retired internal-debate) |
| `/gap-analysis` | Grade every tool item — target_type varies (skill/agent/pipeline/custom) |
| `/lifecycle` | Start pipeline before any SKILL.md/agent edit — refresh lifecycle-mode marker |
| `/research` | Auto-routes; use `/research-check --tier extended` if conflicting signals emerge |
| `/strategic-plan` | Stage 1f — plan tooling follow-ups + per-client phases |
| `/sgs-wp-engine` | SGS-specific context lookup (block inventory, tokens, patterns) |
| `/batch-gap-analysis` | Stage 1c — grade per-category in one pass |
| `/project-consolidate` | Stage 1e — end of Phase 1, refocus project docs |
| `/phase-planner` | Stage 1f — break tooling + client phases into executable chunks |
| `/diagnostics` | Before any commit — read Problems panel |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `mcp__ide__getDiagnostics` | Backing `/diagnostics` — real LSP state |
| `playwright` MCP | Verify any UI claims made in tooling profiles |
| `chrome-devtools` MCP | LCP/CWV checks if performance items are in a batch |
| `github` MCP | PR/issue state checks during the audit |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | ALL SGS WP build/QA work — delegate per project CLAUDE.md mandate |
| `Explore` (Haiku) | Fast codebase search when size-ordering batches |
| `gemini-analyser` | Zero-cost structured analysis for per-item profile generation |
| `research-pipeline` | If any audit question escalates beyond 5 skills |

## WP Tooling Reference

See `C:/Users/Bean/Projects/small-giants-wp/TOOLING-REFERENCE.md` for the full skill/agent/MCP/CLI/hook table. `sgs-dev.local` app-password credentials at `A:/.openclaw/.secrets/wp-app-passwords.env`. Run `python C:/Users/Bean/.agents/skills/sgs-wp-engine/scripts/sgs-db.py stats` for SGS framework stats.

## Research Approach

Phase 1 research is **per-item profile generation**, not external research. Each Sonnet batch reads actual source files (SKILL.md / command.md / hook.py) and produces: main_purpose, practical_applications, USPs, strengths, weaknesses, synergies, anti-synergies, invocation_cost, coverage_of_bean_goals (0-5 per goal).

---

## Task 1 — Stage 1a inventory reconciliation

For each section of TOOLING-REFERENCE.md, glob the filesystem for the category and produce a reconciliation report at `docs/tooling-audit/2026-04-19-inventory-reconciliation.md`. Flag: `[+missing from doc]`, `[-retired but still in doc]`, `[✓ match]`. Goal: accurate inventory before any grading.

## Task 2 — Stage 1b Sonnet batch dispatch (size-ordered)

Dispatch size-ordered Sonnet batches (simple implementation skills → composite skills → pipeline skills → meta-orchestrators → non-skill tools). Output per batch: `docs/tooling-audit/batch-<N>-profiles.md` (YAML per item). Opus main thread waits for all batches to return, then Stage 1c.

## Task 3 — Stage 1c 4-lens + 6-lens decision table

Opus reads profiles, applies: Redundancy / Inefficiency / Gap / Forgotten (4 lenses) + System-effect + Motivation (6th lens). Output: `docs/tooling-audit/2026-04-19-decision-table.md` with KEEP / MERGE / SPLIT / DELETE / NEW per item + one-line rationale + motivation text (USP + action + % impact).

## Task 4 — Resolve helpingdoctors.org archive

One local commit `b55193a` blocked because the GitHub repo is archived. Ask Bean: unarchive (`gh repo edit ibraheem-mustafa-dev/helpingdoctors.org --archived=false`) or `git reset --hard HEAD~1` locally. 10-second decision, unblocks forever.

## Guardrails

- Refresh lifecycle-mode marker before each SKILL.md edit (hook consumes per edit).
- Every SKILL.md edit must leave skillscore ≥ 80% OR revert immediately.
- Never regrade files under `references/` of recently-graded parents (gap-analysis-gate Option B).
- Phase seams are collaborative — surface findings priority-ordered with one-line remediations; ask accept/reject/counter-propose. No auto-advance.
- Motivation layer applies — every decision row gets USP + specific action + % impact.
- Do NOT commit `plugins/sgs-blocks/vendor/` (gitignored from session 14).
~~~
