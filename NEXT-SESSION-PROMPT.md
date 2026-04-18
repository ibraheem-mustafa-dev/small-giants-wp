## Where You Are

**Date:** 2026-04-18 (session 14 close)
**Branch:** `feat/diagnostics-lint-commands` (3 commits ahead of main) + PR #6 open + PR #7 open (feature-audit refresh from Sonnet session)
**Current phase:** Phase 0 of the Tooling Audit complete. Phase 1 starts next.

## USP + Motivation (don't skip — this is the WHY)

**The unlock:** The tooling audit turns your skills from "a pile of 70+ tools" into **6 productised, chargeable services with end-to-end orchestrators** — the exact differentiator that lets you out-deliver Kadence/Spectra consultancies. Every missing orchestrator = manual-stitching Bean-time per client = margin leak.

**Today's 6-pipeline status** (verified 2026-04-18):
- **1 of 6 fully implemented:** WP→SGS migration (`/sgs-site-clone` IS the orchestrator)
- **4 of 6 partial:** new build, audit→redesign, QA→deploy, draft→SGS (components exist, no orchestrator)
- **1 of 6 NOT IMPLEMENTED:** **Client Onboarding** — the pipeline every new engagement needs. Biggest revenue-throttle.

**Estimated impact of closing this:** ~60% Bean-time reduction per client engagement. That's the revenue unlock.

## Session Start

Read this prompt, then **autopilot loads `CLAUDE.md` + recent handoff + memory**. Before starting Phase 1:

1. **Grep goal-statement docs first.** Bean flagged *"probs have better descriptions of my intended goals in your docs/memories"*. His 4 stated goals:
   - Full research → design → build via AI
   - Highly bespoke per client
   - Optimal + accurate to client requests
   - Minimal Bean involvement (just provide info)
   Find the canonical version. Grep: `~/.claude/CLAUDE.md`, `~/.claude/rules/`, `~/.claude/memory/`, `~/.claude/strategic-objectives.json`, this project's CLAUDE.md, `A:/.openclaw/CLAUDE.md`. Surface what you find as the **audit acceptance criteria**.

2. **Load Phase 0 outcomes** (so you don't redo checks):
   - skillscore-check.py hook works correctly (tooling-ref was stale, fixed)
   - All 4 deprecated MCPs are DISABLED (empty `mcpServers` in settings.json)
   - `update-pipeline-state.py` deleted (dead passthrough)
   - `/site-clone` renamed → `/clone-patterns` (sgs-site-clone anti-route updated, tooling-ref updated)
   - 13 stale stashes dropped, backup at `docs/stashed-backup-2026-04-18.md`
   - Feature audit refreshed via Sonnet (PR #7) — 45% verified (139/310), 30+ rows updated

## Skills to Invoke

| Skill | When |
|-------|------|
| `/autopilot` | FIRST — live skill router, ADHD support |
| `/gap-analysis` | Per-item grading in Stage 1c (target_type varies: skill, agent, pipeline, custom) |
| `/batch-gap-analysis` | Stage 1c — grade multiple items in one pass (per category, per layer) |
| `/skillscore` | Every SKILL.md edit during Stage 1d (implement) |
| `/project-consolidate` | Stage 1e — at end of Phase 1, collect docs, refocus project |
| `/strategic-plan` | Stage 1f — plan tooling follow-ups + per-client phases |
| `/phase-planner` | Stage 1f — break each phase into executable chunks |
| `/brain-dump` | If Bean sends >30 words of unstructured refinement mid-session |
| `/diagnostics` | Before any commit — read Problems panel |
| `/lifecycle` | For any skill/agent/pipeline edit |

## Phase 1 — Revised Plan (per Bean 2026-04-18)

**Scope is all tool types, NOT just skills.** Apply gap-analysis to: skills, agents, commands, hooks, CLIs, MCPs, plugins, pipelines, reference docs.

**Size-order (bottom-up)** — can't grade a pipeline until every step inside it is graded:

### Stage 1a — Section-by-section inventory sweep (reality check)

For each section of `TOOLING-REFERENCE.md`:
1. List every item in that category from the doc
2. Grep the filesystem for that category (`ls ~/.agents/skills/`, `ls ~/.claude/commands/`, etc.)
3. Produce a delta: `[+missing from doc]` / `[-retired but still in doc]` / `[✓ match]`
4. Write reconciliation report to `docs/tooling-audit/2026-04-XX-inventory-reconciliation.md`

**Output:** Accurate inventory per category, ready for Stage 1b.

### Stage 1b — Sonnet parallel research agents (profile per item)

Dispatch Sonnet agents **in size-order batches**:

**Batch 1 — Simple implementation skills (leaves):** `/polish`, `/distill`, `/bolder`, `/quieter`, `/colourise`, `/delight`, `/harden`, `/clarify`, `/normalize`, `/extract`, `/onboard`, `/adapt`, `/optimise`, `/audit`, `/critique`, simple utility skills, simple commands, simple hooks
**Batch 2 — Composite skills:** `/innovative-design`, `/interactive-design`, `/frontend-design`, `/ui-ux-pro-max`, `/superdesign`, `/design-ref`, `/design-review`, `/visual-qa`
**Batch 3 — Research skills (already done in session 13 — just re-verify):** `/research-check`, `/research-buddies`, `/research-couple`, `/research-council`, `/deep-research`
**Batch 4 — Pipeline skills:** `/sgs-site-clone`, `/animation-harvest`, `/research-pipeline`, `/sgs-extraction`
**Batch 5 — Meta-orchestrators:** `/autopilot`, `/lifecycle`, `/wordpress-router`, `/innovative-design` router, `/seo` router, `/search`, `/research`
**Batch 6 — Non-skill tools:** 10 WP CLIs, 40+ hooks, MCPs, plugins, agents, reference docs, OC pipelines

**Sonnet dispatch prompt (one per batch):**

```
Invoke /autopilot. Working directory: c:/Users/Bean/Projects/small-giants-wp

Task: Research each item in [BATCH] by reading the actual source file (SKILL.md / command.md / hook.py / etc.) and produce a structured profile per item.

For each item produce:
- main_purpose (1-2 sentences)
- practical_applications (3-5 concrete use cases Bean would actually encounter)
- usps (what makes this unique vs alternatives — named alternatives)
- strengths (2-3 things it does well)
- weaknesses (2-3 gaps, stale refs, missing controls)
- synergies (tools it pairs with — specific examples)
- anti_synergies (tools it overlaps or conflicts with — specific examples)
- invocation_cost (tokens / time / Bean-attention / money)
- coverage_of_bean_goals (which of the 4 goals it serves — research/design/build/autonomy — 0-5 per goal)

Write output to docs/tooling-audit/batch-<N>-profiles.md as YAML-per-item (easy to diff + grade later).

Size context: pre-Phase-1 inventory reconciliation is at docs/tooling-audit/2026-04-XX-inventory-reconciliation.md. Read that first to confirm the batch list.

Do NOT grade. Do NOT make keep/merge/delete recommendations. Profile only — Opus will grade in Stage 1c.
```

### Stage 1c — Decision table (4-lens audit on enriched profiles)

Opus (main session) reads the Sonnet-produced profiles and applies:
- **Lens 1: Redundancy** — which items do the same job?
- **Lens 2: Inefficiency** — which items have stale refs, broken ENFORCER-guards, excess hooks, etc.?
- **Lens 3: Gaps** — what's missing that would close a pipeline (especially the 4 missing orchestrators)?
- **Lens 4: Forgotten pieces** — which valuable tools are never invoked?
- **Lens 5 (system effect)** — does it reduce Bean-time or add load?
- **Lens 6 (motivation — per correction 2026-04-18)** — does the item/result carry USP + specific goal-serving next action + % impact?

Output: `docs/tooling-audit/2026-04-XX-decision-table.md` with per-item KEEP / MERGE / SPLIT / DELETE / NEW + rationale.

### Stage 1d — Implement decisions

Execute the decision table. Deletions, merges, scope fixes, new tool stubs. Every SKILL.md edit goes through skillscore → gap-analysis.

### Stage 1e — `/project-consolidate`

At end of Stage 1d, invoke `/project-consolidate` on this project to collect scattered docs, refocus the project around the new tooling structure.

### Stage 1f — `/strategic-plan` + `/phase-planner`

Plan:
- Tooling follow-up work (orchestrators for the 4-5 missing pipelines)
- **One phase per urgent client project** (5 projects — Bean to name them in the session)
- **Structural monitoring plan:**
  - Scheduled efficacy test (cron on the automation engine)
  - Issue log with fix verification
  - Recurrence detection = signal that the fix was wrong/insufficient
  - No "Bean must remember to check" rules — all structural

## Decisions already made

| # | Decision | Source |
|---|----------|--------|
| 1 | Scope = all tool types, not just skills | Bean 2026-04-18 |
| 2 | "35 skills" is not a constraint — drop from plan | Bean 2026-04-18 |
| 3 | Bottom-up size-order processing | Bean 2026-04-18 |
| 4 | End-state is system-level fitness test against 4 goals | Bean 2026-04-18 |
| 5 | After audit: consolidate → strategic-plan + phase-planner | Bean 2026-04-18 |
| 6 | Monitoring must be structural, not rule-based | Bean 2026-04-18 |
| 7 | 6 chargeable pipelines are the productisation target | Bean 2026-04-18 |

## Open threads parked

| Thread | Where | Why parked |
|--------|-------|------------|
| Fred-as-pattern extraction (decision-synthesizer skill) | Noted in session 13 handoff | Park for SSB Phase 7 pattern-learning signal |
| `/project-consolidate` to refocus this project | End of Phase 1 | Sequence — after tooling is clean |
| Structural monitoring loop (cron + issue log + fix-verify) | `/phase-planner` output | Sequence — after consolidation |
| 5 urgent client website projects (names TBD) | `/phase-planner` input | Bean to name them in session |
| Live-test the 11 ○ code-confirmed-only blocks | Post-Phase-1 pre-Phase-3 | Verification against palestine-lives.org |

## Open questions (not blocking Phase 1 start)

1. How do we define "simple" for size-order? (Dependency count recommended — skills with zero `Invokes` entries are leaves.)
2. Monitoring cadence — weekly scheduled cron, per-session gate, or per-commit?
3. 5 urgent client projects — Bean names them at start of `/phase-planner` stage.

## Guardrails

- Auto mode default; still ask before any `git push` to main or any PR open/merge.
- Refresh lifecycle marker before each protected-file edit.
- Every SKILL.md edit must leave skillscore ≥ 80% OR revert.
- Never regrade files under `references/` of recently-graded parent skills (gap-analysis-gate Option B handles this).
- Motivation layer (6th lens) applies: every decision-table row, every phase plan item carries USP + specific action + % impact.

## Not in scope for Phase 1

- Implementing orchestrators for the 4 missing pipelines (that's Phase 2, planned by `/phase-planner`)
- Client site builds (Phase 3+, planned by `/phase-planner`)
- Blub/OC skill audits (separate track)
- Subproject restructure beyond what /project-consolidate needs

## If session opens fresh and auto-loads this

Resume with: **"Starting Phase 1 Stage 1a — inventory reconciliation. Running grep-filesystem against TOOLING-REFERENCE.md sections to produce deltas. ETA: 20 min."**

Then proceed.
