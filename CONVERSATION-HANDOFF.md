---
recommended_model: sonnet
session_tag: small-giants-wp-2026-04-30-parallel-tracks
---

# Session Handoff — 2026-04-30 (parallel-tracks pivot)

## Strategic context

Earlier today's session shipped P1.5f close-out + lifecycle DRY refactor (Phase 2 plan v2, `/rubric-writer` skill, `/gap-analysis` improvements, Mama's Munches brand discovery). Mid-session pivot: Phase 2 rubrics universe at scale **PARKED** (over-engineering); revenue-first push activated. **Goal now: ship Track B clients in parallel; framework work runs alongside on a separate track.**

Mama's Munches just bootstrapped from the live site at https://mamasmunches.com/. Brand brief at [`sites/mamas-munches/CLAUDE.md`](sites/mamas-munches/CLAUDE.md).

## Parallel tracks — pick one per session

Each track is **self-contained** and uses different files, so up to 4 fresh sessions can run simultaneously without collision. Sessions pick by current priority + Bean's energy.

### TIER 1 — Start NOW, no framework dependencies

| # | Track | Status | First action | Sessions to first revenue |
|---|-------|--------|-------------|---------------------------|
| 1 | **CMX Group proposal** | No folder yet | Bootstrap `sites/cmx-group/` + ask Bean for client feedback notes + competitor URLs he has | 1–2 sessions to sent quote |
| 2 | **Indus Foods Phase 2** | Active — `sites/indus-foods/CLAUDE.md` | Read `sites/indus-foods/CLAUDE.md` + `feature-gaps.md` + pick the highest-value remaining page or section. Phase 1 close at `bfe0e4e` | rolling — already-paying client |
| 3 | **Mama's Munches design** | Brief done — `sites/mamas-munches/CLAUDE.md` | `/lead-research-assistant` for B2C+B2B strategy → `/sgs-discover` for design refs → `/ui-ux-pro-max` mockup (homepage + product page) | 2–3 sessions to mockup sign-off |
| 4 | **Mosque Web Design** | Brand-new client (knowledge-context this session) | Ask Bean for brief + URL if existing site → bootstrap `sites/<slug>/` | TBD — needs Bean intake first |

### TIER 2 — Quick framework unblockers (1–2 sessions, then unlock Track B)

| # | Track | Unblocks | First action |
|---|-------|----------|-------------|
| 5 | **A4 `/quoter` rebuild** | CMX quote + Indus Phase 2 pricing | Read existing `~/.claude/skills/quoter/SKILL.md` → confirm current state → rebuild per master plan §A4 (4 sub-items: rebuild + 6-lens extract + delete sales-advisor + lead-research-assistant adapter) |
| 6 | **A2 Responsive Extension** | SGS Studio v2 client | `cd plugins/sgs-blocks/src/extensions && mkdir -p responsive-extension && touch responsive-extension/index.js`; consolidate 11 P1 responsive items |
| 7 | **A5 Dark-mode extension** | SGS Studio v2 client | `grep "data-theme" theme/sgs-theme/theme.json` for token baseline; build theme.json variation switching |

### TIER 3 — Larger framework work (multi-session, defer until Tier 1 cash flowing)

| # | Track | Unblocks | Estimated effort |
|---|-------|----------|-----------------|
| 8 | **A6 SGS Ecom Plugin Phase 1** | Mama's Munches go-live | 8–12 weeks. **⚠️ Scope expansion vs master plan §3.1: Mama's needs both Stripe AND PayPal.** Plan accordingly. |
| 9 | **A7 Variant/Colour Picker block** | Snooza demo | 2–4 weeks |
| 10 | **A8 3D Configurator block** | Snooza demo | 4–6 weeks. 3D assets at `sites/snooza-chair/assets/` |
| 11 | **Phase 4 design-brain rebuild** | Compounding gain across all design / build work | Multi-week — see master plan §P4.4.1. Bean wants this; not pure parking, just sequenced after revenue |

## Current State

- **Branch:** `main` at `37ba1ed`
- **Tests:** n/a — lifecycle work + brand discovery this session
- **Build:** n/a
- **Uncommitted changes:** none in tracked paths (untracked: `.scratch/`, `studio/`, sub-project `.claude/` dirs are pre-existing)
- **Pending blub.db POST:** `~/.claude/pending-uploads/2026-04-30-gap-analysis-eval.json` — retry next session

## Known Issues / Blockers

- blub.db locked at session end → recursive `/gap-analysis` evaluation queued for retry
- `pipeline-enforcer.py` not present at `~/.claude/hooks/` — handoff gates ran without it
- CMX Group has no folder; Mosque Web Design has no folder — both need first-session bootstrap

## Files Modified This Session

| File path | What changed |
|-----------|--------------|
| `.claude/state.md` | `current_phase: phase-2-rubrics-universe` (will need updating to track-B once next session picks a track) |
| `.claude/plans/phase-2-rubrics-universe.md` | v2 two-track restructure — now PARKED status; reference only |
| `.claude/parking.md` | P-1 lifecycle edits marked complete; G2.5 catalogue |
| `.claude/gap-analysis/reports/2026-04-30-seo-technical.md` | NEW — Lens 6 grade C |
| `.claude/gap-analysis/reports/2026-04-30-gap-analysis-skill.md` | NEW — recursive grade C pre-edit |
| `sites/mamas-munches/CLAUDE.md` | NEW — full brand brief |
| `sites/mamas-munches/research/` | Desktop + mobile screenshots |
| `sites/mamas-munches/research/brand/` | Logo PNG + WebP horizontal lockup |
| `~/.claude/skills/gap-analysis/SKILL.md` | 8 edits — HARD-GATE rule + 4 A-grade + 3 B-grade + `/rubric-writer` delegation; 92% throughout |
| `~/.claude/skills/gap-analysis/references/end-goal-rubric.md` | NEW — confirmed rubric (10 criteria) |
| `~/.claude/skills/gap-analysis/references/optimisation-toolkit-wiring.md` | NEW — utility wiring decisions |
| `~/.agents/skills/rubric-writer/` | NEW SKILL — single-source rubric drafting |
| `~/.agents/skills/skill-writer/SKILL.md` | Stage 2 → invokes `/rubric-writer` |
| `~/.claude/agents/seo-technical.md` | Structural pass — 52% → 86% |
| `~/.claude/agents/.rubrics/seo-technical.md` | NEW — confirmed rubric |
| `~/.claude/agents/cerebras-agent/agent.py` | Model `qwen-3-235b-a22b-instruct-2507` |

## Notes for Next Session

- **Pick ONE track per session** — parallel sessions across different tracks is fine (different files, no collision). Don't multi-task within a single session.
- **Mama's: do NOT read prior workspace research** on Bean's sister's business ideas (`~/.openclaw/workspace/memory/research/`) until fresh `/lead-research-assistant` run is complete — bias avoidance.
- **WP Studio is the canonical dev sandbox now** (P1.5e shipped the gate). Use `~/.claude/skills/sgs-wp-engine/references/studio-blueprints/sgs-default.json` blueprint to spin up per-client sandboxes. Run `/verify-loop --target-url <studio-preview>` before any tar-deploy. MySQL parity testing on Local-by-Flywheel needed for ecom flows (Mama's, future Mama's-shape clients).
- **/rubric-writer is the single source of truth for rubric drafting** — invoked by `/gap-analysis` Step 4.5 + `/skill-writer` Stage 2 + Phase 2 plan template. Stage 4 Stage QC + Stage 5 cross-turn pause baked in.
- **C-grade calibration rule** embedded in `/gap-analysis` Step 4: C+ requires real-impact fix, NOT cosmetic compliance.
- **Phase 2 rubrics universe at scale = PARKED.** Don't resume bulk rubric drafting until Track B has 2+ clients live. Lifecycle stack (`/gap-analysis`, `/rubric-writer`) used inline only when shipping client work surfaces a tooling gap.
- **CMX + Mosque need first-session bootstrap.** Mirrors what we did for Mama's today: ask Bean for brief, scrape existing site if any, capture into `sites/<slug>/CLAUDE.md`.

## Next Session Prompt

~~~
You are a senior tooling architect for Small Giants Studio's WordPress framework. You ship client websites under a strict quality-gate workflow (skillscore + gap-analysis + Stage QC peer-review) using the SGS Framework. The session is parallelisable — pick ONE track from the parallel-tracks list and ship it. Other tracks run in parallel sessions.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-30-parallel-tracks"`

## First action — invoke `/autopilot`

Then ask Bean which track to pick (or read `CONVERSATION-HANDOFF.md` parallel-tracks list and recommend by Bean's energy + dependency status):

| Track | Path | Why pick this |
|-------|------|---------------|
| 1 — CMX proposal | bootstrap `sites/cmx-group/` | Fastest sent quote (1–2 sessions) |
| 2 — Indus Phase 2 | `sites/indus-foods/CLAUDE.md` | Already-paying client; rolling progress |
| 3 — Mama's design | `sites/mamas-munches/CLAUDE.md` | Brand done, ready for `/lead-research-assistant` → `/ui-ux-pro-max` |
| 4 — Mosque Web Design | bootstrap | Needs Bean intake first |
| 5 — A4 `/quoter` rebuild | `~/.claude/skills/quoter/` | Unblocks CMX quote + Indus pricing in 1 session |
| 6 — A2 Responsive Extension | `plugins/sgs-blocks/src/extensions/` | Unblocks SGS Studio v2 |
| 7 — A5 Dark-mode extension | `theme/sgs-theme/theme.json` | Unblocks SGS Studio v2 dark mode |
| 8 — A6 SGS Ecom Plugin | new `plugins/sgs-ecommerce/` | Long-haul; gates Mama's go-live (Stripe + PayPal) |
| 9–10 — A7/A8 Snooza blocks | `plugins/sgs-blocks/src/blocks/` | Long-haul; gate Snooza demo |
| 11 — Phase 4 design-brain | `~/.agents/skills/ui-ux-pro-max/` + `~/.claude/skills/innovative-design/` | Compounds across all design work; multi-week |

## Skills to Invoke (load on demand per track)

| Skill | Track that uses it |
|-------|---|
| `/lead-research-assistant` | Mama's (B2C+B2B strategy), CMX (client research), Mosque |
| `/sgs-discover` | Mama's (design refs), CMX (mockup inspiration), Mosque |
| `/ui-ux-pro-max` | Any design mockup work |
| `/sgs-wp-engine` | All SGS WP work (canonical authority) |
| `/wp-block-development` | Track A blocks (A6, A7, A8) + Indus pages |
| `/gap-analysis` | Quality gate before delivery — Step 7.75 QC mandatory |
| `/rubric-writer` | Any new rubric drafting (single source of truth) |
| `/lifecycle` | Skill/agent/pipeline edits |
| `/quoter` | After A4 rebuild — CMX + Indus pricing |
| `/strategic-plan` | If a track surfaces multi-step work that needs planning |

## MCP Servers & Tools

| Tool | Use |
|------|-----|
| `~/.claude/skills/sgs-wp-engine/scripts/studio-preview-up.ps1` | Spin up WP Studio sandbox per client using `sgs-default.json` blueprint |
| `~/.claude/skills/verify-loop/SKILL.md` `--target-url` | Pre-deploy assertion against Studio Preview |
| `~/.claude/skills/deploy-check/SKILL.md` `--studio-pass` | Final pre-tar-deploy gate |
| `python ~/.agents/skills/shared-references/sgs-skillscore.py validate <path>` | Skillscore on every skill edit |
| `playwright` MCP browser tools | Live-site recon (Mama's, CMX, Mosque); product photo pull |
| `curl -X POST http://localhost:5050/api/knowledge` | blub.db POST (retry pending payload first) |

## Agents to Delegate To

| Agent | Track that uses it |
|-------|---|
| `wp-sgs-developer` | All WP build / migration / fidelity work — MANDATORY delegation |
| `design-reviewer` | Visual quality checks at breakpoints; mockup review |
| `site-reviewer` | Pre-launch audit on any client site before deploy |
| `seo-auditor` | Pre-launch SEO check (post-content) |
| `seo-technical` | Pre-launch technical SEO check |
| `performance-auditor` | Next.js perf for SGS Studio v2 if staying Next.js side |
| `research-pipeline` | Open-ended client research that needs adversarial debate |

## Track-specific tooling

**For Mama's design (Track 3):**
- `/lead-research-assistant` first — DO NOT read prior workspace research before fresh run completes (bias avoidance)
- Then `/sgs-discover` for ethnic / artisan / mum-targeted reference sites
- Then `/ui-ux-pro-max` for homepage + product page mockup
- Spin up WP Studio sandbox via `sgs-default.json` blueprint

**For CMX proposal (Track 1):**
- Ask Bean for: client feedback notes, competitor URLs, contact name/email
- `/sgs-discover` for B2B reference matches
- `/ui-ux-pro-max` for proposal mockup pages
- `/quoter` (after A4 rebuild) for the quote doc

**For Indus Phase 2 (Track 2):**
- Read `sites/indus-foods/feature-gaps.md` and `sites/indus-foods/homepage-build-notes.md`
- Use existing SGS blocks; no framework changes
- Trade form (4-step) needs spec confirmation with Bean before build

## Guardrails

- `git branch --show-current` before every commit. Framework changes go to `main`. Client-specific work goes to `feat/<client>-*` branches per CLAUDE.md branch discipline rule
- skillscore 90% threshold for skills, 85% for agents
- WP Studio sandbox before any tar-deploy
- C-grade calibration: C+ only for real-impact fixes
- Cross-turn pause for any draft confirmation
- `wp eval` blocked by pre-tool hook — read wp-config.php directly

## Mama's-specific guardrails

- DO NOT pull prior research from `~/.openclaw/workspace/memory/research/` until fresh `/lead-research-assistant` run completes
- Variant model: 4 packs × 2 flavours × 3 toppings × 2 dietary = 48 SKUs (use WC variable product attributes, not 48 separate products)
- Stripe AND PayPal both required (expands master plan §3.1 Phase 1 scope)
- Subscription is Phase 2 ecom feature — flag for plan, don't build now
- Gifting market is untapped audience expansion — design with this in mind even though primary is breastfeeding mums
~~~

---

# Session Handoff — 2026-04-30 (P1.5f close-out + lifecycle DRY refactor)

[Previous handoff content preserved below for history — see git log `37ba1ed` for full details]
