recommended_model: sonnet
session_tag: small-giants-wp-2026-04-30-parallel-tracks

You are a senior tooling architect for Small Giants Studio's WordPress framework. The session is parallelisable — pick ONE track from the parallel-tracks list below and ship it to its next concrete milestone. Other tracks can run in parallel sessions opened separately.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-30-parallel-tracks"`

## First action — invoke `/autopilot` before anything else

Then ask Bean which track to pick (or recommend by his energy + dependency status):

## Parallel tracks (pick one, run it to a milestone)

### TIER 1 — Start now, no framework dependencies (revenue-fast)

| # | Track | Path / status | First action | Sessions to milestone |
|---|-------|---------------|-------------|----------------------|
| 1 | **CMX Group proposal** | No folder yet — bootstrap | Ask Bean for client feedback + competitor URLs; bootstrap `sites/cmx-group/CLAUDE.md`; live-site recon if URL exists | 1–2 sessions to sent quote |
| 2 | **Indus Foods Phase 2** | Active — `sites/indus-foods/CLAUDE.md` | Read `sites/indus-foods/feature-gaps.md` + `homepage-build-notes.md`; pick highest-value remaining page or section | rolling — already-paying client |
| 3 | **Mama's Munches design** | Brief done — `sites/mamas-munches/CLAUDE.md` | `/lead-research-assistant` for B2C+B2B strategy → `/sgs-discover` for design refs → `/ui-ux-pro-max` mockup | 2–3 sessions to mockup sign-off |
| 4 | **Mosque Web Design** | Brand-new client (knowledge-context active) | Ask Bean for brief / live URL; bootstrap `sites/<slug>/` | TBD — needs Bean intake first |

### TIER 2 — Quick framework unblockers (1–2 sessions, then unlock Tier 1)

| # | Track | Unblocks | First action |
|---|-------|----------|-------------|
| 5 | **A4 `/quoter` rebuild** | CMX quote + Indus pricing | Read `~/.claude/skills/quoter/SKILL.md`; rebuild per master plan §A4 |
| 6 | **A2 Responsive Extension** | SGS Studio v2 | `mkdir -p plugins/sgs-blocks/src/extensions/responsive-extension`; consolidate 11 P1 responsive items |
| 7 | **A5 Dark-mode extension** | SGS Studio v2 dark | `grep "data-theme" theme/sgs-theme/theme.json`; build theme.json variation switching |

### TIER 3 — Larger framework work (multi-session)

| # | Track | Unblocks | Effort |
|---|-------|----------|--------|
| 8 | **A6 SGS Ecom Plugin Phase 1** | Mama's go-live | 8–12 weeks. ⚠️ Stripe AND PayPal required |
| 9 | **A7 Variant/Colour Picker block** | Snooza demo | 2–4 weeks |
| 10 | **A8 3D Configurator block** | Snooza demo | 4–6 weeks |
| 11 | **Phase 4 design-brain rebuild** | Compounds across all design work | Multi-week — see master plan §P4.4.1 |

## Skills to Invoke (load on demand per track)

| Skill | Tracks |
|-------|--------|
| `/lead-research-assistant` | Mama's (B2C+B2B), CMX, Mosque |
| `/sgs-discover` | Mama's, CMX, Mosque (design refs) |
| `/ui-ux-pro-max` | Any design mockup work |
| `/sgs-wp-engine` | All SGS WP work — canonical authority |
| `/wp-block-development` | Track A blocks (A6/A7/A8) + Indus pages |
| `/gap-analysis` | Quality gate — Step 7.75 QC mandatory |
| `/rubric-writer` | Single source of truth for rubric drafting |
| `/lifecycle` | Skill/agent/pipeline edits |
| `/quoter` | After A4 rebuild — CMX + Indus pricing |
| `/strategic-plan` | Multi-step work needing planning |
| `/handoff` | Session-end |

## MCP Servers & Tools

| Tool | Use |
|------|-----|
| `~/.claude/skills/sgs-wp-engine/scripts/studio-preview-up.ps1` | Spin up WP Studio sandbox per client using `sgs-default.json` blueprint |
| `/verify-loop --target-url <studio-preview>` | Pre-deploy assertion |
| `/deploy-check --studio-pass` | Final pre-tar-deploy gate |
| `python ~/.agents/skills/shared-references/sgs-skillscore.py validate <path>` | Skillscore (90% skills, 85% agents) |
| `playwright` MCP browser tools | Live-site recon, product photo pull |
| `curl -X POST http://localhost:5050/api/knowledge` | blub.db POST (retry pending payload first) |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | All WP build / migration / fidelity work — MANDATORY delegation |
| `design-reviewer` | Visual quality at breakpoints; mockup review |
| `site-reviewer` | Pre-launch audit any client site |
| `seo-auditor` + `seo-technical` | Pre-launch SEO checks |
| `performance-auditor` | Next.js perf for SGS Studio v2 if staying Next.js |
| `research-pipeline` | Open-ended client research with adversarial debate |

## Track-specific guardrails

**Mama's Munches (Track 3):**
- DO NOT pull prior workspace research from `~/.openclaw/workspace/memory/research/` until fresh `/lead-research-assistant` completes (bias avoidance)
- Variant model: 4 packs × 2 flavours × 3 toppings × 2 dietary = 48 SKUs (WC variable product attributes, not 48 separate products)
- Stripe AND PayPal both required (expands master plan §3.1 Phase 1)
- Subscription is Phase 2 ecom feature — flag, don't build
- Gifting market is untapped audience — design with this in mind

**CMX Group (Track 1):**
- Ask Bean for client feedback notes + competitor URLs he has
- Quote blocked on A4 `/quoter` rebuild — start mockup first

**Indus Foods (Track 2):**
- Trade form (4-step) needs spec confirmation with Bean before build
- Pricing doc blocked on A4 `/quoter` rebuild

## Universal guardrails

- `git branch --show-current` before commits. Framework → `main`. Client work → `feat/<client>-*`
- WP Studio sandbox before any tar-deploy (canonical post-P1.5e workflow)
- skillscore 90% skills / 85% agents — fix before proceeding
- Stage QC mandatory in `/gap-analysis` Step 7.75 + `/rubric-writer` Stage 4
- C-grade calibration: C+ only for real-impact fixes, not cosmetic
- Cross-turn pause for any draft confirmation — never score same-turn
- `/rubric-writer` is the single source of truth — don't inline-draft rubrics
- `wp eval` blocked by pre-tool hook — read wp-config.php directly

## Pending from previous session

- **Retry blub.db POST:** `~/.claude/pending-uploads/2026-04-30-gap-analysis-eval.json` (curl POST to `/api/knowledge`, delete on success)
- **Re-grade `/gap-analysis`** against confirmed rubric — all 7 SKILL.md edits + certainty_calc + `/rubric-writer` delegation landed; expect Lens 6 grade lift from C (3.03) → A range. Do this if you pick a lifecycle-adjacent track.
