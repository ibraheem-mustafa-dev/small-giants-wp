recommended_model: sonnet
session_tag: small-giants-wp-2026-04-30-toolset-continuation

You are a senior tooling architect for the SGS lifecycle stack. The client side (Mama's Munches) is running in a separate parallel session — your job is to complete the toolset/framework so client sessions ship faster and more reliably. Pick ONE track and ship it to its next milestone.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-30-toolset-continuation"`

## First action — invoke `/autopilot` before anything else

Then read in parallel:
1. `CONVERSATION-HANDOFF.md` — full session record
2. `~/.claude/skills/gap-analysis/SKILL.md` — see what landed this session (8 edits, all 92% skillscore)
3. `~/.agents/skills/rubric-writer/SKILL.md` — single-source rubric drafting (built this session)
4. `.claude/parking.md` — what's parked vs active
5. `.claude/specs/2026-04-27-optimisation-toolkit-design.md §5 Phase 4` — design-brain rebuild scope

## Toolset tracks (pick one, run it to a milestone)

### TIER 0 — Pending from this session (small, fast, finish first)

| # | Track | Path | First action | Effort |
|---|-------|------|-------------|--------|
| 1 | **Retry blub.db POST** | `~/.claude/pending-uploads/2026-04-30-gap-analysis-eval.json` | Read file → curl POST `/api/knowledge` → delete on success | 5 min |
| 2 | **Re-grade `/gap-analysis`** | `~/.claude/skills/gap-analysis/SKILL.md` | Run full `/gap-analysis` against confirmed rubric. New Step 7.75 QC stage runs (dogfooding). Expect Lens 6 lift C (3.03) → A range. Update evaluation-history. | 30–45 min |
| 3 | **Apply `/rubric-writer` delegation to `/pipeline-writer`** | `~/.agents/skills/pipeline-writer/SKILL.md` | Mirror the `/skill-writer` Stage 2 pattern: replace inline rubric generation with `Invoke /rubric-writer with target = ...` | 10 min |
| 4 | **Apply `/rubric-writer` delegation to `/command-writer`** | `~/.agents/skills/command-writer/SKILL.md` | Same surgical edit | 10 min |

**Recommendation:** ship all four of Tier 0 in one session — they're each tiny + closely related. Closes the lifecycle DRY work to completion.

### TIER 1 — Lifecycle infrastructure completion (1–2 sessions each)

| # | Track | Why | First action |
|---|-------|-----|-------------|
| 5 | **Wire C-grade calibration rule into `/skill-optimiser` + `/agent-optimiser` + `/pipeline-optimiser`** | Calibration discipline (this session's `/gap-analysis` Step 4 rule) needs to live in the optimiser skills too — they read rubrics and must reject cosmetic-only C+ awards | Read each optimiser's grading section, add the same paragraph from `/gap-analysis` Step 4 |
| 6 | **Wire `certainty_calc` into `/qc` + `/qc-inline` Stage 3 evidence pass** | `/qc` has a 5-response certainty pass spec'd but not always wired. Same Stage QC pattern from `/gap-analysis` Step 7.75 should apply | Read `/qc` SKILL.md Stage 3; ensure `certainty_calc.score()` actually runs on the response batch |
| 7 | **A4 `/quoter` rebuild** | Unblocks CMX quote + Indus pricing. Tooling skill, not a client deliverable. | Read `~/.claude/skills/quoter/SKILL.md`; rebuild per master plan §A4 (4 sub-items: rebuild + 6-lens extract from `/sales-intelligence-advisor` + delete sales-advisor + lead-research-assistant adapter) |
| 8 | **Build `canary_split.py` fixture set for `/gap-analysis`** | Currently `canary_split` utility is wired but has no held-out fixtures for `/gap-analysis` — adoption gate blocked. Create fixture set from existing 5+ confirmed gap-analysis runs in evaluation-history | Read `~/.agents/skills/shared-references/optimisation-toolkit/canary_split.py`; collect fixtures from `~/.claude/gap-analysis/reports/`; write `~/.claude/skills/gap-analysis/fixtures/canary-set.json` |

### TIER 2 — Phase 4 Design-Brain rebuild (Bean's orchestration spine)

Master plan §P4.4.1. **18 deliverables** to ship the design-brain. Estimated 26–38h focused work per design-brain spec §7. Multi-week. Compounds across all client design work — every Track B client ships faster once this lands.

**Sub-tasks (sequenced — each is its own session):**

| # | Sub-task | What | Effort |
|---|----------|------|--------|
| 9 | 4.1.1 | `archetype_token_matrix` SQLite table seeded with Jung 12 × 4 pricing tiers (48 rows) | DB schema + seed |
| 10 | 4.1.2 | `brand_pillars` table (~36+ rows across archetypes) | DB schema + seed |
| 11 | 4.1.3 | `top_task_templates` table (~20 templates × 5 SGS industries) | DB schema + seed |
| 12 | 4.1.4 | `council_personas` table (4 personas) | DB schema + seed |
| 13 | 4.1.5 | `philosophy_rules` table seeded from `/superdesign` + `/delight` + `/harden` migration content | DB schema + seed |
| 14 | 4.1.6 | `scripts/modify.py` CLI — `uimax modify --mode <X>` (replaces 8 modifier sub-skills) | Python |
| 15 | 4.1.7 | `scripts/designer.py` — Mode A interactive + Mode B autonomous | Python |
| 16 | 4.1.8 | `scripts/council.py` — 4-Task dispatcher + synthesiser (Sonnet + Gemini-Pro + Cerebras + gemini-vision) | Python |
| 17 | 4.1.9 | `references/blueprint-schema.json` — strict JSON contract Designer outputs | Schema |
| 18 | 4.1.10 | `~/.claude/hooks/philosophy-autoload.py` PreToolUse hook on Skill matcher `ui-ux-pro-max` | Hook |
| 19 | 4.1.11 | `~/.claude/pipelines/blueprint-validator.json` registered with `pipeline-stage-gate` | Pipeline registration |
| 20 | 4.1.12 | Delete 8 deprecated modifier skills (colourise, bolder, quieter, normalize, polish, distill, delight, adapt) — content migrated per design-brain §3.5.1 | Removal |
| 21 | 4.1.13 | `/innovative-design` rewrite as ~50-line thin classifier router | Skill rewrite |
| 22 | 4.1.14 | Merge `/superdesign` → `ui-ux-pro-max/references/superdesign-philosophy.md` + `philosophy_rules` rows | Merge |
| 23 | 4.1.15 | Delete `/frontend-design` (orphan; surviving uniques → `aesthetic-reference.md`) | Removal |
| 24 | 4.1.16 | Merge `/audit` → `/site-reviewer`; delete `/critique`; repurpose `/tailwind-design-system` → `/library-docs tailwind v4` | Merge/repurpose |
| 25 | 4.1.17 | `/uimax ingest --mark-validated` flag (self-improvement loop) | CLI flag |
| 26 | 4.1.18 | `scripts/diversity-audit.py` (quarterly variance check) | Python |

**Sequencing:** 4.1.1–4.1.5 (DB schemas) first, in parallel — independent tables. Then 4.1.6–4.1.8 (CLI scripts) which read those tables. Then 4.1.9 (schema) + 4.1.10 (hook) + 4.1.11 (pipeline registration). Then 4.1.12–4.1.16 (skill rewrites/deletions/merges) — these depend on the new infrastructure. Then 4.1.17–4.1.18 (self-improvement scripts).

**Recommended start:** sub-task 4.1.1 (archetype_token_matrix). Smallest, foundational, tests the DB pattern that all of 4.1.2–4.1.5 follow.

## Skills to invoke (load on demand per track)

| Skill | Tracks |
|-------|--------|
| `/gap-analysis` | Tier 0 #2 re-grade; quality gate before any toolset edit |
| `/rubric-writer` | Tier 0 #3, #4 — single source of truth for rubric drafting |
| `/lifecycle` | All toolset edits — start pipeline before any skill/agent/pipeline change |
| `/skill-writer`, `/skill-optimiser` | Tier 1 #5 |
| `/research-check`, `/research-buddies` | Tier 2 design-brain — if a sub-task surfaces an unresolved question (e.g. "what's the Jung 12 archetype canonical seed data?") |
| `/strategic-plan` | If a Tier 2 sub-task chain needs sequencing beyond what's here |
| `/handoff` | Session-end |

## MCP Servers & Tools

| Tool | Use |
|------|-----|
| `python ~/.agents/skills/shared-references/sgs-skillscore.py validate <path>` | Skillscore on every SKILL.md edit (90% threshold, 85% for agents) |
| `python ~/.agents/skills/shared-references/dispatch-graph-validator.py` | After any skill/agent edit |
| `python ~/.claude/hooks/search.py "<query>"` | Research at gap-analysis Step 1.5 |
| `~/.agents/skills/shared-references/optimisation-toolkit/certainty_calc.py` | Reviewer agreement quantification |
| `~/.agents/skills/shared-references/optimisation-toolkit/canary_split.py` | Tier 1 #8 fixture work |
| `sqlite3` | Tier 2 design-brain DB schemas at `~/.agents/skills/ui-ux-pro-max/data/ui-ux-pro-max.db` (or wherever the canonical SQLite lives — check spec §3.8) |
| `curl -X POST http://localhost:5050/api/knowledge` | Toolset milestone POSTs + Tier 0 #1 retry |

## Agents to delegate to (read-only research only)

| Agent | When |
|-------|------|
| `research-pipeline` | Open-ended toolset architecture research with adversarial debate (e.g. "best practice for Jung archetype seed data 2026") |

## Track-specific guardrails

**Tier 0 #2 — `/gap-analysis` re-grade:**
- The new Step 7.75 QC stage runs (3 reviewers + `certainty_calc`) — dogfooding
- Cross-turn pause is HARD GATE — if Lens 6 fallback step 3 fires, END THE TURN after presenting draft
- Re-grade is recursive — same skill grading itself. Self-preference counteract applies (criterion 2 of the confirmed rubric)

**Tier 0 #3, #4 — sister-caller updates:**
- Mirror the `/skill-writer` Stage 2 edit pattern verbatim
- Test skillscore after each edit (90% threshold)
- Bean's lifecycle gate system was disabled this session for surgical edits — confirm re-enabled or stay disabled per Bean's preference

**Tier 1 #5 — calibration rule wiring:**
- The C-grade calibration rule is in `/gap-analysis` Step 4 — copy verbatim into the optimiser sister skills
- Don't drift the wording — same rule, same rationale, same HARD GATE marker

**Tier 2 — Design-brain DB schemas:**
- Use versioned migrations at `~/.agents/skills/ui-ux-pro-max/scripts/migrations/`
- Each table gets its own migration file; never edit applied migrations
- Seed data lives in `references/seeds/<table>.sql` for inspectability
- DB file path: confirm at spec §3.8 — likely `ui-ux-pro-max.db`

## Universal guardrails

- skillscore 90% threshold for skills, 85% for agents — fix before proceeding
- Stage QC mandatory in `/gap-analysis` Step 7.75 + `/rubric-writer` Stage 4
- C-grade calibration: C+ only for real-impact fixes
- Cross-turn pause for any draft confirmation — never score same-turn
- `/rubric-writer` is single source of truth — don't inline-draft rubrics
- `git branch --show-current` before every commit. Framework toolset → `main`. Phase 4 design-brain may warrant a `feat/design-brain-phase-4-1` branch given the size

## What's PARKED (do NOT pull into this session)

- Phase 2 Rubrics Universe at scale — over-engineered, parked until Track B has 2+ clients live
- Email cluster (`/email-html-builder`, `/sgs-email-branding`) — Bean directive
- SEO cluster (14 skills + 3 agents + 1 pipeline) — Bean directive
- 9 deletion-bound migrators (will be deleted in Tier 2 #20 anyway)

## What's RUNNING IN PARALLEL (don't touch — different stream)

- **Mama's Munches client work** — brand discovery → mockup → ecom build. Different files (`sites/mamas-munches/`). If you need to test design-brain output against a real client, Mama's is the natural validation client — but coordinate with Bean before touching `sites/mamas-munches/`.
