## New incoming work (2026-04-21)

**Read `HANDOFF-FROM-SGS-STUDIO-2026-04-21.md` FIRST** — bundles 5 tasks (dual-mode optimisers, slim `/gap-analysis`, `/lifecycle` cascade, new `/qc` + `/qc-inline` skills) plus 3 low-effort fixes (autopilot patch, sgs-extraction 4 errors, frontend-design merge). Master spec at `docs/plans/2026-04-21-toolset-spec-from-sgs-studio-session.md`. Pre-existing Phase 1 Stage 1a content below is compatible — the tooling-audit framing still holds and the incoming work slots into Stage 1d onwards.

---

## Where You Are

Plan: `.claude/plans/sgs-skill-system-upgrade.md` (tooling-audit Phase 1 deferred from session 15).
Current phase: Phase 1 — tooling audit (all tool types, bottom-up, size-ordered).
Progress: Phase 0 complete (4 fixes shipped on main via PR #7). Phase 1 not yet started.
Next task: Stage 1a inventory reconciliation against TOOLING-REFERENCE.md.

## Session Start

Read `CONVERSATION-HANDOFF.md` first, then `CLAUDE.md`. Resume with "Starting Phase 1 Stage 1a — running filesystem-vs-doc reconciliation across 17 sections of TOOLING-REFERENCE.md. ETA ~20 min."

## USP (motivation — read first)

Tooling audit turns the skill library into **6 productised chargeable services with end-to-end orchestrators**. Today: 1 of 6 exists (`/build-website`). Closing the other 5 = ~60% Bean-time reduction per client engagement. **This is the revenue unlock.**

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Decisions on tool boundaries (KEEP/MERGE/SPLIT/DELETE/NEW) — absorbs retired internal-debate |
| `/gap-analysis` | Grade every tool item — target_type varies (skill/agent/pipeline/custom) |
| `/lifecycle` | Start pipeline before any SKILL.md/agent edit; refresh lifecycle-mode marker |
| `/research` | Auto-routes; `/research-check --tier extended` for conflicting signals |
| `/strategic-plan` | Stage 1f — plan tooling follow-ups + per-client phases |
| `/sgs-wp-engine` | SGS context lookup (block inventory, tokens, patterns) |
| `/batch-gap-analysis` | Stage 1c — grade per-category in one pass |
| `/project-consolidate` | Stage 1e — end of Phase 1, refocus project docs |
| `/phase-planner` | Stage 1f — break tooling + client phases into executable chunks |
| `/diagnostics` | Before every commit — read Problems panel |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `mcp__ide__getDiagnostics` | Backing `/diagnostics` — real LSP state |
| `playwright` MCP | Verify UI claims in tooling profiles |
| `chrome-devtools` MCP | LCP/CWV checks when performance items are in a batch |
| `github` MCP | PR/issue state checks during the audit |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | ALL SGS WP build/QA work (per project CLAUDE.md mandate) |
| `Explore` (Haiku) | Fast codebase search when size-ordering batches |
| `gemini-analyser` | Zero-cost structured per-item profile generation |
| `research-pipeline` | If any audit question escalates beyond 5 skills |

## Research Approach

Phase 1 research is **per-item profile generation**, not external research. Each Sonnet batch reads actual source files (SKILL.md / command.md / hook.py) and produces: main_purpose, practical_applications, USPs, strengths, weaknesses, synergies, anti-synergies, invocation_cost, coverage_of_bean_goals (0-5 per goal). External research only if a specific gap emerges in Stage 1c.

---

## Task 1 — Stage 1a inventory reconciliation (~20 min)

Glob filesystem per category in TOOLING-REFERENCE.md. Produce `docs/tooling-audit/2026-04-19-inventory-reconciliation.md` with:
- `[+missing from doc]` — exists on disk, not in doc
- `[-retired but still in doc]` — in doc, not on disk
- `[✓ match]` — both agree

Goal: accurate inventory before any grading.

## Task 2 — Stage 1b Sonnet batch dispatch (size-ordered)

Dispatch Sonnet batches in this order (bottom-up):
1. Simple implementation skills (leaves) — `/polish`, `/distill`, `/bolder`, `/quieter`, `/colourise`, `/delight`, `/harden`, `/clarify`, `/normalize`, `/extract`, `/onboard`, `/adapt`, `/optimise`, `/audit`, `/critique`
2. Composite skills — `/innovative-design`, `/interactive-design`, `/frontend-design`, `/ui-ux-pro-max`, `/superdesign`, `/design-ref`, `/design-review`, `/visual-qa`
3. Research skills (re-verify - very brief) — `/research-check`, `/research-buddies`, `/research-couple`, `/research-council`, `/deep-research`
4. Pipeline skills — `/build-website`, `/animation-harvest`, `/research-pipeline`, `/sgs-extraction`
5. Meta-orchestrators — `/autopilot`, `/lifecycle`, `/wordpress-router`, `/innovative-design` router, `/seo` router, `/search`, `/research`
6. Non-skill tools — 10 WP CLIs, ~40 hooks, MCPs, plugins, agents, reference docs, OC pipelines

Output per batch: `docs/tooling-audit/batch-<N>-profiles.md` (YAML per item). Main thread waits for each batch, discusses with Bean inline at each seam before next batch.

## Task 3 — Stage 1c 4-lens + 6-lens decision table

Opus reads profiles, applies: **Redundancy / Inefficiency / Gap / Forgotten** (4 lenses) + **System-effect** + **Motivation** (6th lens — USP + specific action + % impact per row). Output: `docs/tooling-audit/2026-04-19-decision-table.md` with KEEP / MERGE / SPLIT / DELETE / NEW per item.

## Task 4 — Stage 1d implement, 1e `/project-consolidate`, 1f `/strategic-plan` + `/phase-planner`

Execute the decision table. End Phase 1 with consolidation + strategic plan covering: tooling follow-ups (orchestrators for 4-5 missing chargeable pipelines) + one phase per urgent client site (5 sites — Bean names them in session) + structural monitoring plan (cron + issue log + fix-verify + recurrence-detection).

## Open Threads

- `sgs-dev.local` credentials: `A:/.openclaw/.secrets/wp-app-passwords.env`
- 5 urgent client website projects — names TBD when `/phase-planner` runs
- `/project-consolidate` skill — runs at end of Phase 1, not before
- SGS framework stats: `python C:/Users/Bean/.agents/skills/sgs-wp-engine/scripts/sgs-db.py stats`

## Guardrails

- Refresh lifecycle-mode marker before each protected-file edit.
- Every SKILL.md edit leaves skillscore ≥ 80% OR revert immediately.
- Never regrade files under `references/` of recently-graded parents (gap-analysis-gate Option B).
- **Phase seams are collaborative** — at each stage boundary, surface findings priority-ordered with one-line remediations; ask accept/reject/counter-propose. No auto-advance on multi-phase handoffs.
- Motivation layer applies — every decision row gets USP + specific action + % impact.
- Do NOT commit `plugins/sgs-blocks/vendor/` (gitignored).
- Pre-work verification — state success criteria before starting any task that writes files.
