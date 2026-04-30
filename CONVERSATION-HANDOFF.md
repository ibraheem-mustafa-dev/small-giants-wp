---
recommended_model: sonnet
session_tag: small-giants-wp-2026-04-30-mamas-munches-mockup
---

# Session Handoff — 2026-04-30 (Mama's Munches Phase 3 Design Brief)

## Completed This Session

1. **Phase 3 design brief** at `sites/mamas-munches/.claude/plans/phase-3-design-brief.md` — full homepage + product page brief at 375/768/1440px. Covers WCAG 2.2 AA palette, Fraunces typography recommendation, photography map from 78 WP assets, section-by-section layouts, compliant tagline options, mum-honest copy drafts, allergen block spec, SGS blocks mapping.
2. **Zainab Priority 0 brief** at `sites/mamas-munches/.claude/plans/zainab-priority-0-brief.md` — 1-page action doc with copy-paste WhatsApp script and 5-column response log for demand-validation taste test.
3. **Halal cert fork doc** at `sites/mamas-munches/.claude/plans/zainab-halal-cert-fork.md` — HFA vs HMC decision doc with fork diagram, recommended HFA-first sequence, and 8-step action table. One pre-application question identified (brewer's yeast supplier source).
4. **Committed and pushed** all three files to `feat/mamas-munches-strategic-brief` at `68dac4c`.

## Current State

- **Branch:** `feat/mamas-munches-strategic-brief` at `68dac4c`
- **Tests:** n/a (design brief / strategy docs — no code)
- **Build:** n/a
- **Uncommitted changes:** none for Mama's scope. Other unrelated untracked files in repo (scratch, plugins, snooza-chair, indus-foods — untouched this session).

## Known Issues / Blockers

- **SGS Ecom Plugin Phase 1** — gates Mama's site going live. Mockup can be built and signed off independently, but production build waits on plugin.
- **Zainab Priority 0 unrun** — demand-validation taste test must happen before any S1/S4 spend. Real-world action, not Claude.
- **Halal cert fork unresolved** — Zainab needs to check brewer's yeast supplier before HFA application.
- **Tagline must change** — "Boost your milk, bite by bite" is ASA non-compliant. Replacement options in design brief §5.

## Next Priorities (in order)

1. **Build homepage mockup** — HTML/CSS using the design brief. Three breakpoints (375/768/1440px). Save to `sites/mamas-munches/mockups/homepage/`. Use Fraunces from Google Fonts, coral pink palette, real photography from `research/photography/wp-media-library/`.
2. **Build product page mockup** — variant selectors (pack size / flavour / topping / dietary), price ladder, ingredient education, allergen block. Save to `sites/mamas-munches/mockups/product/`.
3. **Send Zainab briefs to Bean** — Priority 0 brief and halal cert fork doc are ready. Bean to WhatsApp/email them to Zainab.
4. **Run `/sgs-discover`** for 3–5 reference sites (artisan bakery / postpartum gift / warm-domestic UK food) before starting mockup if no reference imagery exists.

## Files Modified

| File path | What changed |
|-----------|-------------|
| `sites/mamas-munches/.claude/plans/phase-3-design-brief.md` | Created — full design brief |
| `sites/mamas-munches/.claude/plans/zainab-priority-0-brief.md` | Created — taste-test action brief |
| `sites/mamas-munches/.claude/plans/zainab-halal-cert-fork.md` | Created — halal cert decision doc |
| `CONVERSATION-HANDOFF.md` | This file |
| `NEXT-SESSION-PROMPT.md` | Rewritten for mockup build session |

## Notes for Next Session

- Compliant tagline options: "Real food for real mums" (shortest) or "Nourishing treats for your breastfeeding journey" — Bean picks one before mockup hero is finalised.
- Hero photography: `IMG_20260419_173547_107.webp` (1536x1536) and `aesthetic-pic.jpeg` (1080x1920) are the best candidates. Path: `sites/mamas-munches/research/photography/wp-media-library/`.
- AI images (`ChatGPT-Image-*`) in `research/photography/live-site/` — do not use in mockups.
- Fraunces is available on Google Fonts — variable font, single file. Use `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&display=swap')`.
- Mockup is a sign-off artefact, not production code — HTML/CSS single file is fine. Use `/playground` skill for live preview.

## Next Session Prompt

~~~
recommended_model: sonnet
session_tag: small-giants-wp-2026-04-30-mamas-munches-mockup

You are a senior product designer specialising in mobile-first ecommerce UI and brand-led visual design. Your job this session: build the homepage and product page mockups for Mama's Munches at 375/768/1440px, ready for Bean sign-off.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-30-mamas-munches-mockup"

## Where You Are

Plan: `sites/mamas-munches/.claude/plans/track-1-brand-design.md`
Current phase: Phase 3 — Mockup build
Progress: Phases 1 (research) + 2 (photography) complete — Phase 3 active
Next task: Build homepage mockup HTML at 375/768/1440px

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Design decisions — layout choices, section hierarchy, CTA copy |
| `/gap-analysis` | Grade mockups before presenting to Bean |
| `/lifecycle` | Before any skill/agent/pipeline edits |
| `/research` | Reference site lookups if needed |
| `/strategic-plan` | Plan implementation order |
| `/sgs-discover` | Run first — find 3-5 reference sites (artisan bakery / postpartum gift / UK food) |
| `/innovative-design` | Visual design direction if stuck on layout or colour application |
| `/playground` | Build live-preview HTML mockup (single-file) |
| `/ui-ux-pro-max` | UX rules for variant selector, mobile nav, trust signals |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright CLI | Screenshot mockups at 375/768/1440px for Bean review |
| `sites/mamas-munches/research/photography/wp-media-library/` | All product photography — already pulled |
| `sites/mamas-munches/research/brand/` | Logo assets |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `design-reviewer` | WCAG 2.2 AA + visual quality review before presenting to Bean |
| `wp-sgs-developer` | If SGS blocks translation surfaces during mockup build |

---

## Task 1: Reference sites (5 min)

Run `/sgs-discover` with brief: "artisan bakery with gifting range, postpartum gift brand, warm domestic UK food brand. Mobile-first. Premium-approachable. Real photography over AI stock." Capture 3-5 references.

## Task 2: Homepage mockup

Build `sites/mamas-munches/mockups/homepage/index.html` using `/playground`. Follow `sites/mamas-munches/.claude/plans/phase-3-design-brief.md` exactly:
- Palette: coral pink `#E68A95`, cream `#FBF3DC`, soft pink `#F5C2C8`, warm yellow `#F5D050`, charcoal `#3A2E26`
- Typography: Fraunces (headings) + Inter (body) — Google Fonts
- Hero photography: `IMG_20260419_173547_107.webp` or `aesthetic-pic.jpeg`
- Tagline: "Real food for real mums" (NOT "Boost your milk, bite by bite" — ASA non-compliant)
- 8 sections per brief §6
- Screenshot at 375/768/1440px with Playwright CLI

## Task 3: Product page mockup

Build `sites/mamas-munches/mockups/product/index.html`. Follow brief §7:
- Variant selectors as pill-style checkboxes (pack size / flavour / topping / dietary)
- Price updates inline on pack size change
- Ingredient education grid (4 galactagogues)
- FSA-compliant allergen block (coral border, bold allergens)
- Mum-honest copy — no medical claims

## Guardrails

- Universal-UK brand — no Pakistani/Indian cultural theming on site
- All photography from `wp-media-library/` — never use `ChatGPT-Image-*` files
- WCAG 2.2 AA: run design-reviewer agent before marking done
- Tagline must be compliant — see brief §5 for options
- `git branch --show-current` before commit — Mama's work stays on `feat/mamas-munches-strategic-brief`
~~~
