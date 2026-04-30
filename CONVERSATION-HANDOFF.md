---
recommended_model: sonnet
session_tag: small-giants-wp-2026-04-30-mamas-munches-design-brief
---

# Session Handoff — 2026-04-30 (Mama's Munches strategic brief + media pull)

**Project:** small-giants-wp / **Track B client:** Mama's Munches (Zainab — Bean's sister)
**Session focus:** lead research → opportunity audit → strategic brief v3.4 + WP media library pull. The earlier same-day handoff (Phase 2 rubrics-universe / SGS lifecycle stack) is preserved in git history at HEAD~1; that work is **deferred** until Mama's mockup ships.

## Completed This Session

1. **Lead research v1 → v3.4** at [sites/mamas-munches/research/lead-research-2026-04-30.md](sites/mamas-munches/research/lead-research-2026-04-30.md) — 576 lines, full UK lactation cookie market intelligence + opportunity audit + strategic direction. Competitor pricing verified (Boobbix £12.49/10, TheMilkBooster £7.20–£40, Milk It Bakehouse £44/£88/£132 tiered, LactoMomma).
2. **Brand thesis triangulated** across 3 independent sources (current research + Sonnet/Gemini opportunity audit + 2026-03-17 prior workspace research at `~/.openclaw/workspace/memory/research/2026-03-17-DEEP-mamas-munches.md`). Locked thesis: **halal-certified + thoughtful ingredients + Birmingham-handmade + mum-honest framing**. Brand stays universal-UK; Muslim community is a sales channel, not a brand identity.
3. **Product architecture defined:** dual-range cookies — **Zookies** (Zainab's signature giant cookies, anchor £10 / 8-pack) + **Classics** (NEW regular-sized accessibility tier). Plus **£5 Trial Pack** (3 Classics, postage-incl), £15 Gift Box, £42 40-Day Care Bundle. Variant matrix: 7 fruits × 4 chocolates × 2 dietary, any combination (Model A).
4. **Phase 2 product line scoped:** Traditional Postpartum Foods (Mama's Panjiri, Sonth Bites, Methi Ladoo) — actual traditional foods, nutritionally tuned (jaggery instead of refined sugar, controlled ghee, added flax). Sold under authentic names. NOT Phase 1 — Zainab hasn't made them yet.
5. **Pricing ladder** with sensible volume-discount slopes (small-pack +20%, anchor 0%, mid −6%, volume −20%, max-volume −28%) — corrected from earlier linear extrapolation.
6. **WP media library pulled:** 78 real assets (65 photos + 13 videos) at full resolution from `mamasmunches.com/wp-json/wp/v2/media` to [sites/mamas-munches/research/photography/wp-media-library/](sites/mamas-munches/research/photography/wp-media-library/). 81 Astra organic-shop-02 starter-template assets filtered to `_theme-junk/`.
7. **Earlier IG photography pull** (low-res 311×311 thumbs) superseded by the WP media pull — full-res originals now available for mockup work.

## Current State

- **Branch:** main at 2ffa02b
- **Tests:** n/a (research / strategic brief, no code)
- **Build:** n/a
- **Uncommitted changes:** sites/mamas-munches/.claude/, sites/mamas-munches/research/, NEXT-SESSION-PROMPT.md (rewritten), CONVERSATION-HANDOFF.md (this file)

## Known Issues / Blockers

- **Priority 0 unrun:** £5 demand-validation taste-test (Zainab DMs 5 mum-friends, 15 min). Single biggest unverified assumption — should run before any S1/S4 spend. Real-world action, not a Claude task.
- **HFA vs HMC halal-cert fork:** brewer's yeast may need recipe reformulation for HMC. Decision required before applying.
- **Zookie pack prices:** only 8-pack confirmed (£9.50 live, rebuild anchor £10). 4/12/20/40 prices extrapolated by discount logic — Zainab to confirm against her Tally form.

## Next Priorities (in order)

1. **Generate the design brief** — homepage + product page mockup direction at 3 breakpoints (375 / 768 / 1440px). Inputs: v3.4 strategic brief + 78 product photos + brand assets at `sites/mamas-munches/research/brand/`.
2. **Brief Zainab on the Priority 0 taste-test** — produce a one-pager she can act on in 15 min (WhatsApp script, questions, response log format).
3. **Brief Zainab on the brewer's yeast halal-cert fork** — HFA-only-current-recipe vs HMC-compatible-reformulation. Recommend HFA-first sequence.
4. **Apply visual / design Skills** — `/innovative-design`, `/sgs-discover`, `/ui-ux-pro-max` anchored to existing brand assets.
5. **Phase 2 rubrics-universe work resumes** after Mama's mockup signs off. Restore prior context from git history (HEAD~1 NEXT-SESSION-PROMPT.md) or `.claude/state.md` (still flags `current_phase: phase-2-rubrics-universe`).

## Files Modified

| File path | What changed |
|-----------|--------------|
| `sites/mamas-munches/research/lead-research-2026-04-30.md` | Full strategic brief — created v1 → patched v3.4 (576 lines) |
| `sites/mamas-munches/.claude/plans/track-1-brand-design.md` | Track 1 phased plan (research → photography → mockup) |
| `sites/mamas-munches/research/photography/wp-media-library/` | 78 real Mama's photos + videos from WP REST API |
| `sites/mamas-munches/research/photography/wp-media-library/_theme-junk/` | 81 Astra starter-template assets moved out |
| `sites/mamas-munches/research/photography/wp-media-library/INVENTORY.md` | Full media inventory by date / dimensions / alt text |
| `sites/mamas-munches/research/photography/instagram/` + `live-site/` + `INVENTORY.md` | Earlier IG/live-site pull (low-res, superseded) |
| `CONVERSATION-HANDOFF.md` | This file — rewritten for Mama's session |
| `NEXT-SESSION-PROMPT.md` | Rewritten — Mama's design-brief prompt |

## Notes for Next Session

- **Brand framing rule:** universal-UK brand. NO Pakistani/Indian theming on website or brand identity. Halal cert is a quality signal, not a cultural badge. Phase 2 products like Mama's Panjiri sell under their authentic names without theming the brand around them — deli-selling-hummus logic.
- **Mum-honest, not science-debunking:** the cookies DO help anecdotally (Bean's wife is one example). The 2023 RCT didn't measure population-level effect, but individual mums benefit. Position: *"many mums tell us it helps; we don't make medical claims"* — ASA-safe AND truthful.
- **Family-recipe heritage is fabrication** — Zainab uses the Healthline lactation cookie recipe, not a passed-down family recipe. Honest framing is *inspired by*, never *inherited from*.
- **Photography highlights:** `IMG_20260419_173547_107.webp` (1.1MB), `IMG_20260419_170745_421.webp` (880KB), `cookies-stacked.jpeg`, `cookies-on-bun-case.jpeg`, `Halimahs.jpeg`, `Lactation-Cookies-Reham.jpeg`, `aesthetic-pic.jpeg`. Plus 13 videos. AI-generated images at `live-site/ChatGPT-Image-*` flagged DO NOT SHIP.
- **Phase 2 rubrics work not lost** — deferred. Resume context lives in git history (HEAD~1 NEXT-SESSION-PROMPT.md) and `.claude/state.md`.

## Next Session Prompt

~~~
You are a senior product designer specialising in WordPress block-based ecommerce sites and brand-led visual design. Your job this session: produce a concrete design brief for Mama's Munches' homepage and product page, ready for SGS block implementation.

Read CONVERSATION-HANDOFF.md, sites/mamas-munches/CLAUDE.md, and sites/mamas-munches/research/lead-research-2026-04-30.md for full context, then work through these priorities.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural / design strategy decisions during the brief |
| `/gap-analysis` | Grade the design brief before delivery |
| `/lifecycle` | Start pipeline before any skill/agent edits |
| `/research` | Auto-routes for design-reference research |
| `/strategic-plan` | Plan implementation order |
| `/innovative-design` | Design direction — palette, typography, UX rules |
| `/sgs-discover` | 3–5 reference sites in lactation / mum-care / artisan-bakery / gifting space |
| `/ui-ux-pro-max` | Palette + typography + UX rules anchored to existing brand assets |
| `/design-review` | Review the mockup direction once drafted |
| `/handoff` | Session-end handoff |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright (CLI preferred) | Multi-breakpoint screenshots (375/768/1440) of reference + competitor sites |
| `python ~/.claude/hooks/search.py` | Reference site discovery + competitor visual analysis |
| WP REST API | Already pulled — use `sites/mamas-munches/research/photography/wp-media-library/` |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `design-reviewer` | Visual quality + WCAG 2.2 AA review of the design brief |
| `wp-sgs-developer` | If translation to SGS blocks surfaces during brief writing |
| `research-pipeline` | If reference site research needs structured findings |

## Research Approach
Reference sites for the brief: search via `/sgs-discover` for handmade artisan bakery brands, postpartum / new-mum gift brands, warm-domestic UK food brands. NOT Pakistani/Indian-themed (universal-UK brand). Pull 5–8 reference URLs, capture homepage screenshots at 3 breakpoints via Playwright.

---

## Task 1: Generate the design brief

Build `sites/mamas-munches/.claude/plans/phase-3-design-brief.md`. Cover:
- **Homepage** structure at 375/768/1440 — hero, trust signals, featured product, brand story, gift section, 40-Day Bundle CTA, trial-pack prominence, Send-to-Ward CTA in nav
- **Product page** structure — variant selectors (fruit × chocolate × dietary × pack size), price ladder display, ingredient education, mum-honest framing copy, allergen disclaimer placement
- **Palette** — derived from existing brand assets (`sites/mamas-munches/research/brand/`)
- **Typography** — current site uses Inter + Work Sans; recommend keep or swap
- **Photography direction** — which of the 78 full-res assets at `wp-media-library/` go where
- **Voice draft** — *"We make nourishing food, with proper ingredients including some that have been used in postpartum recipes for centuries. Many mums tell us it helps. We won't promise medical results."*

## Task 2: One-page Zainab brief — Priority 0 taste-test

Produce `sites/mamas-munches/.claude/plans/zainab-priority-0-brief.md` — a 1-page brief Zainab can act on in 15 min. Include: WhatsApp script for the 5 mum-friends, list of questions to ask, simple format for logging responses.

## Task 3: One-page Zainab brief — halal certification fork

Produce `sites/mamas-munches/.claude/plans/zainab-halal-cert-fork.md` — explain HFA-only-current-recipe vs HMC-compatible-reformulation. Recommend HFA-first with HMC as parallel R&D. ~1 page.

## Guardrails
- Universal-UK brand identity — NO Pakistani/Indian theming on website, brand, or product names
- Mum-honest framing — never *"they don't work"*, never medical claims; *"many mums tell us it helps"*
- Halal cert is a quality signal, not cultural identity
- Zookies = Mama's signature giant cookies (£10 / 8-pack anchor); Classics = new regular-size accessibility tier
- 7 fruits × 4 chocolates × 2 dietary, any combination (Model A)
- Phase 2 Traditional Foods (Panjiri, Sonth Bites, Methi Ladoo) = future product line, not Phase 1 mockup focus
- £5 Trial Pack must be prominent on homepage — addresses real "too expensive" feedback
- Photography: use `wp-media-library/` originals; AI-generated images at `live-site/ChatGPT-Image-*` flagged DO NOT SHIP
- `git branch --show-current` before every commit — Mama's work goes to a feature branch, framework changes to main
~~~
