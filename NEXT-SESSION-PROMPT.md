recommended_model: sonnet
session_tag: small-giants-wp-2026-04-30-phase1.5-tooling-triage

You are a senior systems architect. Phase 1c (Foundations final wrap) is complete. Open this session in **Phase 1.5 — Tooling Triage + Sandbox-Preview Gate**.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-30-phase1.5-tooling-triage"`

## Where you are

- Plan: `.claude/plans/master-plan.md` §Phase 1.5 (NEW — added 2026-04-29)
- State: `.claude/state.md` `current_phase: phase-1.5-tooling-triage`
- Last completed: Phase 1c — `/verify-loop` shipped at A grade, end-to-end demo PASS, Verification Plan injected into `phase-1-foundations.md`, `/skill-optimiser` Stage 7 folded into Stage 6
- Active blocker: G1 milestone POST pending (`BLUB_AUTH` env var not set when curl ran). Payload archived at `.claude/reports/phase-1-end-to-end/phase-1-end-to-end-2026-04-29-001/g1-payload.json`. **First action of this session: re-attempt the G1 POST.**

## What's already done (read for context, do not redo)

| Output | Path |
|---|---|
| `/verify-loop` skill | `~/.claude/skills/verify-loop/SKILL.md` (skillscore 90%) |
| `/verify-loop` rubric (signed off) | `~/.claude/skills/verify-loop/references/end-goal-rubric.md` (12 criteria, 9 Never Do) |
| `/verify-loop` slash command | `~/.claude/commands/verify-loop.md` |
| Phase 1c gap-analysis | `.claude/reports/phase-1-end-to-end/phase-1-end-to-end-2026-04-29-001/gap-analysis.md` (A grade 78.5/78.5) |
| Phase 1c verdict | `.claude/reports/phase-1-end-to-end/phase-1-end-to-end-2026-04-29-001/verdict.md` (PASS) |
| Backlog of Phase 2 candidates | `~/.claude/skills/verify-loop/references/backlog.md` |
| AI-WP community research | `.claude/reports/2026-04-29-ai-wp-community-research.md` |
| WP Studio vs Local Flywheel | `.claude/reports/2026-04-29-wp-studio-vs-local-flywheel.md` |
| WP Studio AI Operating Manual | `.claude/specs/2026-04-29-wp-studio-ai-manual.md` |
| WP Studio cross-tier QC reviews | `.claude/reports/phase-1c-wp-studio-qc/{cerebras,gemini-flash}-review.md` (read these BEFORE patching the manual) |
| `/skill-optimiser` Stage 6 fold | `~/.claude/skills/skill-optimiser/SKILL.md` (Stage 7 collapsed into Stage 6 with cross-tier peer review HARD GATE folded inline; override path documented for "do not delegate" sessions) |

## Phase 1.5 deliverables (master plan §Phase 1.5)

Two interleaved tracks — triage (sequential) + sandbox-preview gate (parallel). **Patches to WP Studio docs come BEFORE P1.5a — see P1.5_0 below.**

| ID | Unit | Time | Deps |
|----|------|-----|------|
| **P1.5_0** | **Patch WP Studio QC findings (3 S-grade + 4 A-grade)** — see `.claude/reports/phase-1c-wp-studio-qc/reconciliation.md`. Includes verifying `DB_ENGINE=mysql` actually works in Studio's PHP-WASM runtime (the master-plan claim could be unimplementable if not). | 60-75 min | none |
| **P1.5a** | `/skill-auditor` + `/agent-auditor` for overlap / duplicate / abandonment surface | 20 min | P1.5_0 |
| **P1.5b** | Cross-reference deferred-pipelines doc + parking lots; produce triage table at `.claude/plans/strategy/2026-04-29-tooling-triage.md` | 30 min | P1.5a |
| **P1.5c** | Bean sign-off on triage table (HARD GATE) | 15 min | P1.5b |
| **P1.5d** | Execute kills + merges in parallel | 30-45 min | P1.5c |
| **P1.5e** | Sandbox-preview gate: blueprint + `/verify-loop --target-url` flag + `studio-preview-up.ps1` + `deploy-check --studio-pass` flag | 85 min | P1.5_0 + runs PARALLEL to P1.5d |
| **P1.5f** | `/phase-planner` to draft Phase 2 phase-plan against the surviving roster | 30 min | P1.5d |

**Phase exit (G1.5):** triage decisions logged + kills/merges executed + sandbox-preview gate working + Phase 2 phase-plan drafted.

## Skills to invoke

| Skill | When |
|-------|------|
| `/autopilot` | FIRST — every session |
| `/skill-auditor` | P1.5a |
| `/agent-auditor` | P1.5a (parallel with skill-auditor) |
| `/lifecycle` | P1.5d (any kill/merge that touches a SKILL.md) |
| `/verify-loop` | P1.5e — modify Stage 1 / classification to accept `--target-url` flag |
| `/phase-planner` | P1.5f — input is the post-triage tool list |
| `/handoff` | session end |

## Tools

| Tool | What for |
|------|----------|
| `studio` CLI | P1.5e — sandbox creation, blueprint validation, preview URLs. AI manual at `.claude/specs/2026-04-29-wp-studio-ai-manual.md` |
| `gh` CLI | If any tool kills end up touching a published GitHub repo |
| `python ~/.agents/skills/shared-references/dispatch-graph-validator.py` | After every kill/merge to confirm no dead refs |
| `python ~/.agents/skills/shared-references/sgs-skillscore.py validate <path>` | After every skill edit |
| `curl` | G1 POST re-attempt at session start (`BLUB_AUTH` env var must be set) |

## First action (≤5 min, zero deps)

1. Re-attempt G1 POST:
   ```bash
   curl -sf -X POST http://localhost:5050/api/knowledge \
     -H "Cookie: blub_auth=$BLUB_AUTH" \
     -H "Content-Type: application/json" \
     -d @c:/Users/Bean/Projects/small-giants-wp/.claude/reports/phase-1-end-to-end/phase-1-end-to-end-2026-04-29-001/g1-payload.json
   ```
   If 2xx: clear the blocker in `.claude/state.md`. If still failing: keep `pending_upload: true` and proceed.

2. Read the two cross-tier QC reports written at end of last session:
   - `.claude/reports/phase-1c-wp-studio-qc/cerebras-review.md`
   - `.claude/reports/phase-1c-wp-studio-qc/gemini-flash-review.md`

   Reconcile any S/A-grade findings against the WP Studio AI manual + master plan §Phase 1.5 Shift 2 narrative. Patch as needed before P1.5e starts.

3. Then proceed to P1.5a (`/skill-auditor` + `/agent-auditor` in parallel).

## Guardrails

- WordPress non-negotiables: WCAG 2.2 AA, UK English, no jQuery, <100KB CSS / <50KB JS budget
- `git branch --show-current` before every commit (framework → main; client → feature branch)
- Master plan §12.5 deletion-before-reference rule still applies — archive (not delete) any tools the triage marks for kill until all references are removed
- `/skill-optimiser` Stage 6 now folds peer-review inline — when running optimisers in P1.5d, the HARD GATE is satisfied by the subagent return + main-thread reconciliation. Override path documented for "do not delegate" sessions

## Phase 2 handoff hint

Phase 1.5 ends by drafting the Phase 2 phase-plan (P1.5f). Phase 2 = "Rubrics universe" but sized against the surviving roster (likely 12-15 rubrics, not 22). Phase 2 entry condition: triage table signed off + kills executed + dispatch-graph-validator clean.

## Known issues from last session

1. **`few_shot_injector` API friction** — `inject(prompt, task_embedding)` requires pre-computed embedding. Phase 1.5 should add `inject_by_query()` wrapper to the toolkit. Logged in `~/.claude/skills/verify-loop/references/backlog.md` (G2).
2. **blub.db dashboard** was unreachable during last session — `curl /api/knowledge?q=...` returned empty. blub.db file itself is at `~/.openclaw/workspace/tools/blub-dashboard-v2/data/blub.db`, NOT the default path the few_shot_injector hardcodes. Check dashboard service before running anything that depends on it.
3. **Subagent Bash permissions blocked** — both Cerebras and Gemini Flash QC dispatches via subagent failed with "Bash denied". Cross-tier QC was run from main thread instead. Going forward: dispatch model-CLI work from main thread, not from subagents.
4. **Gemini Pro 503s** were unreliable yesterday. Cerebras + Gemini Flash both worked from main thread.

## Decisions captured during last session (already applied)

- Phase 1.5 inserted between Phase 1 and Phase 2 (master plan §7 + state.md)
- WP Studio sandbox-preview gate elevated from sub-step to strategic shift in master plan §2 + Phase 1.5 §Shift 2 narrative
- `/skill-optimiser` Stage 7 folded into Stage 6 with override path for "do not delegate" sessions (Bean's design observation 2026-04-29)
- Source skills `/test-driven-development` and `/verification-before-completion` marked for archival (NOT deleted) per master plan §12.5