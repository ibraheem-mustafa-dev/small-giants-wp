recommended_model: sonnet
session_tag: small-giants-wp-2026-05-01-phase1.5-sandbox-and-phase2

You are a senior systems architect. **Phase 1.5d (kills + merges) is complete.** Open this session for the final two Phase 1.5 deliverables: **P1.5e (sandbox-preview gate)** and **P1.5f (Phase 2 phase-plan)**.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-01-phase1.5-sandbox-and-phase2"`

## First action — invoke `/autopilot` before anything else

Then run these in parallel (read-only):

1. Read `.claude/state.md` — confirm current_phase + blockers
2. Read `.claude/plans/strategy/2026-04-29-tooling-triage.md` — final signed-off + executed triage
3. Read `.claude/specs/2026-04-29-wp-studio-ai-manual.md` — Studio operating manual for P1.5e
4. Read `.claude/specs/2026-04-27-optimisation-toolkit-design.md` §Phase 2 — known structural debt rolling into Phase 2a

## What's done (do not redo)

| P1.5 step | Status | Output |
|----|----|----|
| P1.5_0 (WP Studio QC patches) | DONE | 10 gaps closed in manual |
| P1.5a (skill+agent auditors) | DONE | `.claude/reports/2026-04-30-{skill,agent}-audit.md` |
| P1.5b (triage table) | DONE | `.claude/plans/strategy/2026-04-29-tooling-triage.md` |
| P1.5c (Bean sign-off) | DONE | Status: SIGNED-OFF-2026-04-30 |
| P1.5d (kills + merges) | **DONE 2026-04-30** | See "Roster after P1.5d" below |
| G1 milestone POST | **DONE 2026-04-30** | knowledge id 13284 (after SQLite WAL checkpoint) |
| CC memory sync to knowledge API | **DONE 2026-04-30** | 22/22 files posted |


### Roster after P1.5d

**Skills:** 13 → 9 surviving (4 kills/parks, 2 merges, sgs-extraction errors fixed). Killed/parked: nano-banana-pro, mcp-cli, cloudflare-vps-webhook, sgs-email-branding, seo-hreflang, seo-sitemap. Merged: sgs-email-branding → email-html-builder. sgs-extraction kept (4 factual errors fixed in body).

**Agents:** 14 → 9 surviving. Kills: gemini-analyser, seo-performance. Merges: seo-visual → design-reviewer · seo-content → seo-auditor · seo-sitemap + seo-hreflang → seo-technical. SEO cluster: 7 → 4 (auditor, technical, schema standalone, geo).

**Bean overrides during P1.5d:** seo-schema stays solo (big, powerful, justifies standalone). seo-hreflang merges into seo-technical (hreflang is core technical SEO).

**Autopilot domain table** — sgs-wp-engine row added with override note (overrides wp-block-development + wp-plugin-development for SGS-prefixed work).

**CLAUDE.md** — agent table cleaned (seo-content, seo-visual, seo-sitemap, seo-performance removed; nano-banana-pro corrected to nano-banana). `mcp` CLI tool note added under "CLI Tools" before parking the mcp-cli skill.

### Known structural debt (logged in toolkit doc Phase 2a)

These were surfaced when the lifecycle hook fired during P1.5d edits. Pre-existing — not session-introduced. Logged in `specs/2026-04-27-optimisation-toolkit-design.md` §Phase 2a "Known structural debt":

| Target | Score | Phase 2a estimate |
|---|---|---|
| `design-reviewer` agent | 53% | ~45 min (585 lines, missing HARD GATEs, correction ledger, shared-references) |
| `email-html-builder` skill | 63% | ~30 min (missing When NOT to use, Goal, system effect) |
| `seo-auditor` agent | 59% | ~30 min |
| `sgs-extraction` skill | 85% | ~15 min (just System Effect section + references/) |
| `seo-technical` agent | 52% | ~30 min |

## Active blockers

None. G1 milestone POST shipped 2026-04-30 (knowledge id 13284) after dashboard SQLite WAL was checkpointed. CC memory sync to knowledge API also complete (22/22 files posted).

## Phase 1.5 deliverables remaining

| ID | Unit | Time | Deps |
|----|------|------|------|
| **P1.5e** | Sandbox-preview gate: blueprint + `/verify-loop --target-url` flag + `studio-preview-up.ps1` script + `/deploy-check --studio-pass` flag | 85 min | DONE prereqs |
| **P1.5f** | `/phase-planner` Phase 2 plan against the post-triage roster (likely 12-15 rubrics, not 22) | 30 min | P1.5e |

**Phase exit (G1.5):** sandbox-preview gate working end-to-end + Phase 2 phase-plan drafted.

## P1.5e — Sandbox-preview gate (in detail)

The objective: any plan executed by `/verify-loop` should be able to verify its claims against a live preview URL produced by WP Studio (PHP-WASM sandbox), not only against the production site. This decouples verification from deploy.

**Sub-tasks:**
1. **Studio blueprint template** — `~/.claude/skills/sgs-wp-engine/references/studio-blueprints/sgs-default.json`. Boots a fresh Studio site with sgs-blocks + sgs-theme + the active style variation. Parameters: `clientSlug`, `phpVersion`, `dbEngine` (sqlite default; set mysql per master plan §1.5 Shift 2 — verify the `defineWpConfigConsts` step actually works, GAP-3 from QC reconciliation).
2. **`studio-preview-up.ps1`** — Windows script that takes a blueprint path + plugin/theme paths, calls `studio create`, returns the preview URL on stdout. Idempotent; reuses existing preview if name matches.
3. **`/verify-loop --target-url <url>`** — flag accepted at Stage 1. When set, every `[TEST]` step runs against the URL instead of the default production URL. Update Stage 1 classification accordingly.
4. **`/deploy-check --studio-pass <url>`** — pre-deploy gate that requires a preview URL whose `/verify-loop` run is green. Refuses deploy if Studio gate is missing or red.

**HARD GATE:** Before P1.5e closes, run a smoke test end-to-end on a real palestine-lives.org page snapshot booted into Studio. Manual verification PASS recorded in `.claude/reports/p1.5e-smoke/`.

## P1.5f — Phase 2 phase-plan

Use `/phase-planner` to convert master plan §Phase 2 into a phased plan against the **surviving** roster.

Inputs:
- `.claude/plans/master-plan.md` §Phase 2 (Rubrics universe)
- `.claude/specs/2026-04-27-optimisation-toolkit-design.md` §5 Phase 2 (Phase 2a/2b/2c)
- The structural debt table inside §Phase 2a (5 targets needing extra time)

Output: `.claude/plans/phase-2-rubrics-universe.md` with per-skill estimates that account for the debt, and a P2 entry condition that lists "triage table signed off + kills executed + dispatch-graph-validator clean".

## Skills to invoke

| Skill | When |
|-------|------|
| `/autopilot` | FIRST — every session |
| `/lifecycle` | If creating new sub-skills inside `/verify-loop` for the URL flag |
| `/phase-planner` | P1.5f |
| `/handoff` | session end |

## Tools

| Tool | What for |
|------|----------|
| `studio` CLI | P1.5e — sandbox creation, blueprint validation, preview URLs |
| `gh` CLI | If touching any published GitHub repo |
| `python ~/.agents/skills/shared-references/dispatch-graph-validator.py <target>` | Per-target validation after edits |
| `python ~/.agents/skills/shared-references/sgs-skillscore.py validate <path>` | After every skill/agent edit |

## Guardrails

- Lifecycle hook is firing skillscore 85-90% thresholds on every edit. Pre-existing structural debt is logged for Phase 2a — don't spiral on it during P1.5e/f. Fix only what's introduced; log pre-existing.
- Bean override in effect: any agent/skill description must include `Do NOT invoke for:` negative routing if added or substantially edited.
- WordPress non-negotiables: WCAG 2.2 AA, UK English, no jQuery, <100KB CSS / <50KB JS.
- `git branch --show-current` before every commit (framework → main).

## Session sprawl prevention (ADHD Rule 13)

P1.5e is ~85 min — sized for a single session. P1.5f is ~30 min. Together they fit in one session if focused. If P1.5e starts spiralling on Studio gotchas (likely on first sandbox boot), park it and ship P1.5f first (the phase-plan doesn't depend on the sandbox actually working — only on the design being agreed).