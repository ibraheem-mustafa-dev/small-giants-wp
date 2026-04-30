recommended_model: sonnet
session_tag: small-giants-wp-2026-04-30-mamas-munches-mockup

You are a senior product designer specialising in mobile-first ecommerce UI and brand-led visual design. Your job this session: build the homepage and product page mockups for Mama's Munches at 375/768/1440px, ready for Bean sign-off.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-30-mamas-munches-mockup"

## First action — invoke `/autopilot` before anything else

Then read in parallel:
1. `CONVERSATION-HANDOFF.md` — session context + decisions
2. `sites/mamas-munches/CLAUDE.md` — brand brief
3. `sites/mamas-munches/.claude/plans/phase-3-design-brief.md` — the full design spec to implement

## Where You Are

Plan: `sites/mamas-munches/.claude/plans/track-1-brand-design.md`
Current phase: Phase 3 — Mockup build
Progress: Phases 1 (research) + 2 (photography) complete — Phase 3 active
Next task: Build homepage mockup HTML at 375/768/1440px

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Design decisions — layout hierarchy, CTA copy, section order |
| `/gap-analysis` | Grade mockups before presenting to Bean |
| `/lifecycle` | Before any skill/agent/pipeline edits |
| `/research` | Reference site lookups if needed |
| `/strategic-plan` | Plan build order |
| `/sgs-discover` | Run first — 3-5 reference sites (artisan bakery / postpartum gift / UK food) |
| `/innovative-design` | Visual direction if stuck on layout or colour application |
| `/playground` | Build live-preview HTML mockup (single-file) |
| `/ui-ux-pro-max` | UX rules for variant selectors, mobile nav, trust signals |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright CLI | Screenshot mockups at 375/768/1440px for Bean review |
| `sites/mamas-munches/research/photography/wp-media-library/` | All 78 product photography assets |
| `sites/mamas-munches/research/brand/` | Logo assets |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `design-reviewer` | WCAG 2.2 AA + visual quality review before presenting to Bean |
| `wp-sgs-developer` | If SGS blocks translation surfaces during mockup build |

---

## Task 1: Reference sites (5 min)

Run `/sgs-discover` with brief: "artisan bakery with gifting range, postpartum gift brand, warm domestic UK food brand. Mobile-first. Premium-approachable. Real photography." Capture 3-5 references to inform homepage layout.

## Task 2: Homepage mockup

Build `sites/mamas-munches/mockups/homepage/index.html` using `/playground`. Follow `phase-3-design-brief.md` exactly:
- Palette: coral `#E68A95`, cream `#FBF3DC`, soft pink `#F5C2C8`, yellow `#F5D050`, charcoal `#3A2E26`
- Typography: Fraunces (headings, Google Fonts) + Inter (body)
- Hero photo: `IMG_20260419_173547_107.webp` or `aesthetic-pic.jpeg`
- Tagline: "Real food for real mums" (NOT "Boost your milk, bite by bite" — ASA non-compliant)
- All 8 sections per brief §6
- Screenshot at 375/768/1440px with Playwright CLI before presenting

## Task 3: Product page mockup

Build `sites/mamas-munches/mockups/product/index.html`:
- Pill-style variant selectors (pack size / flavour / topping / dietary)
- Price updates inline on pack size select
- Ingredient education grid (4 galactagogues)
- FSA-compliant allergen block — coral border, bold allergens
- Mum-honest copy — no medical claims

## Guardrails

- Universal-UK brand — no cultural theming on site
- Photography from `wp-media-library/` only — never `ChatGPT-Image-*` files
- WCAG 2.2 AA: run `design-reviewer` agent before marking done
- `git branch --show-current` before commit — stay on `feat/mamas-munches-strategic-brief`
