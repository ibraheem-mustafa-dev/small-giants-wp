# CLAUDE.md — Small Giants Studio Website

## Project Overview
Website for Small Giants Studio — a Birmingham-based digital transformation consultancy founded by Ibraheem Mustafa. Serves UK SMEs, charities, and social enterprises.

**Domain:** smallgiantsstudio.co.uk
**Stack:** Next.js (deployed to Vercel)
**Status and plans:** `.claude/state.md`, `.claude/handoff.md`, `.claude/plans/current_mission.md`

---

## Critical Rules

- **UK English everywhere** — colour, behaviour, analyse, organisation. Never American spellings.
- **Never use personal phone number** — work number only: 07424 449555
- **Contact email:** hello@smallgiantsstudio.co.uk
- **Other emails:** ibraheem@smallgiantsstudio.co.uk (client comms), admin@smallgiantsstudio.co.uk (backend)
- **Old business name was MA Growth Digital Ltd** — replace with Small Giants Studio Ltd if seen anywhere
- **WCAG 2.2 AA accessible** — 44px minimum touch targets, accessible contrast ratios throughout
- **Mobile-first responsive** — test at mobile (375px), tablet (768px), desktop (1440px)
- **Dark mode support**
- **No corporate jargon** — never use "leverage", "synergy", "game-changer", "solutions"

---

## Reference Documents

All brand, voice, and positioning docs live in `/docs/`. **Read these before any content or design work:**

- `docs/Small_Giants_Studio_Brand_Positioning_Guide.md` — Brand bible: USPs, messaging, target audiences, elevator pitches
- `docs/LinkedIn_Writing_Style_Guide_Ibraheem_Mustafa.md` — Voice, tone, language patterns
- `docs/LinkedIn_Voice_Analysis_Ibraheem_Mustafa.md` — Evidence from actual posts
- `docs/About_The_Company.txt` — Full company description
- `docs/UK_Digital_Transformation_Consultant_Positioning.md` — Market research, competitor gaps, website must-haves

### Screenshots & Logos in `/docs/screenshots/`
- LinkedIn launch post, company page, Evertreen partnership post
- LinkedIn recommendations screenshot — use these as social proof/testimonials on the site
- Partner logos: Evertreen, Muslims in Construction, AME
- Small Giants Studio logo
- Ibraheem's profile photo — use for hero section and about page

---

## Site Structure

| Page | Route |
|------|-------|
| Homepage | `/` |
| About | `/about` |
| Services | `/services` |
| Case Studies / Work | `/work` |
| Blog / Insights | `/insights` |
| Contact | `/contact` |
| Privacy Policy | `/privacy` |
| Terms | `/terms` |

---

## Partnerships (Display on Homepage + Footer)

1. **Evertreen** — https://evertreen.com — Tree planting partner. Logo in `/docs/screenshots/Evertreen-logo.svg`
2. **Muslims in Construction** — https://muslimsincontruction.co.uk — Built their website. Logo in `/docs/screenshots/Muslims-In-Construction-logo-4-1-green-V2.png`
3. **Association of Muslim Engineers (AME)** — https://ame.org.uk — Help with events. Logo in `/docs/screenshots/cropped-AME_logo_final-01-e1741955008221.png`

---

## Commands to Use

### During Build
- `/frontend-design` — For building polished UI components and pages
- `/brainstorming` — Explore design direction and layout options

### Review & QA
- `/ui-ux-pro-max` — Visual design and UX critique
- `/writing-clearly-and-concisely` — Tighten website copy
- `/vercel-react-best-practices` — Next.js code quality and performance
- `/deploy-check` — Pre-launch checks
- `/requesting-code-review` — After completing each major feature

### If Things Break
- `/systematic-debugging` — Structured debugging, not guesswork

### Session Management
- `/handoff` — End of session summary
