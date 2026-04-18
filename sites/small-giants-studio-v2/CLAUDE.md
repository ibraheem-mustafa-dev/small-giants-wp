# CLAUDE.md — Small Giants Studio Website

## Project Overview
Website for Small Giants Studio — a Birmingham-based digital transformation consultancy founded by Ibraheem Mustafa. Serves UK SMEs, charities, and social enterprises.

**Domain:** smallgiantsstudio.co.uk
**Stack:** Next.js (deployed to Vercel)
**Status:** Pre-launch (Phase 4.5 visual overhaul complete)

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

| Page | Route | Status |
|------|-------|--------|
| Homepage | `/` | ⬜ Review needed |
| About | `/about` | ⬜ Review needed |
| Services | `/services` | ⬜ Review needed |
| Case Studies / Work | `/work` | ⬜ Review needed |
| Blog / Insights | `/insights` | ⬜ Review needed |
| Contact | `/contact` | ⬜ Review needed |
| Privacy Policy | `/privacy` | ⬜ Review needed |
| Terms | `/terms` | ⬜ Review needed |

---

## Partnerships (Display on Homepage + Footer)

1. **Evertreen** — https://evertreen.com — Tree planting partner. Logo in `/docs/screenshots/Evertreen-logo.svg`
2. **Muslims in Construction** — https://muslimsincontruction.co.uk — Built their website. Logo in `/docs/screenshots/Muslims-In-Construction-logo-4-1-green-V2.png`
3. **Association of Muslim Engineers (AME)** — https://ame.org.uk — Help with events. Logo in `/docs/screenshots/cropped-AME_logo_final-01-e1741955008221.png`

---

## Commands to Use

### During Build
- `/frontend-design` — For building polished UI components and pages
- `/writing-plans` — Before starting any major page or feature
- `/brainstorming` — Explore design direction and layout options
- `/commit` — Commit with clear messages as you go

### Review & QA
- `/ui-ux-pro-max` — Visual design and UX critique
- `/writing-clearly-and-concisely` — Tighten website copy
- `/vercel-react-best-practices` — Next.js code quality and performance
- `/verification-before-completion` — Confirm everything works
- `/deploy-check` — Pre-launch checks
- `/requesting-code-review` — After completing each major feature

### If Things Break
- `/systematic-debugging` — Structured debugging, not guesswork

### Session Management
- `/handoff` — End of session summary
- Update this CLAUDE.md after every major milestone

---

## What's Done
- [x] Project scaffolded with Next.js
- [x] Page routes created (home, about, services, work, insights, contact, privacy, terms)
- [x] Component structure set up (layout, sections, ui)
- [x] Reference docs and screenshots added to `/docs/`
- [x] Full-site review completed (9 Feb 2026) — code quality, SEO, and copy/voice audit
- [x] Screenshots taken at 375px, 768px, 1440px for all 8 pages (in `/review-screenshots/`)
- [x] Contact form connected to Formspree (ID: xeeloran), console.log removed
- [x] Fabricated case studies replaced with honest "coming soon" page on /work
- [x] Broken Calendly link removed from /contact
- [x] OG image auto-generates via `app/opengraph-image.tsx` (no static file needed)
- [x] Services page CSS bug fixed (removed `lg:flex-row-reverse` from grid)
- [x] /work hidden from Header and Footer navigation
- [x] Honeypot field accessibility fixed on contact form
- [x] Phase 2 voice & identity pass completed (9 Feb 2026) — 7 files updated
- [x] Phase 3 compliance, UX, infrastructure completed (9 Feb 2026) — cookie consent, error/loading states, touch targets, dark mode toggle
- [x] Phase 4.5 visual & content overhaul completed (9 Feb 2026) — dark mode fixes, horizontal logo, animated hero/fish tank, GEO service, contact form interests, both LinkedIn profiles
- [x] Phase 5 SEO infrastructure completed (10 Feb 2026) — sitemap, robots, JSON-LD schemas (LocalBusiness/Person/Service/FAQ/Breadcrumb), keyword meta titles, canonical URLs, pricing signals, geo coordinates, internal cross-links, image alt text, preload hints, React 19 lint fixes

## What's Broken

**Resolved in Phase 1:** Items 1-5, 9, 26 (manifest.json exists)
**Resolved in Phase 2:** Items 10-15, 31
**Resolved in Phase 3:** Items 18-20 (touch targets), 21 (cookie consent), 23 (error boundary), 24 (loading states), 25 (dark mode toggle), 27 (insights simplified), 33 (removed `sm` button size)
**Resolved in Phase 4.5:** Dark mode legibility across all pages, hero animation, fish tank animation, Evertreen logo colour, 6th value card, GEO/AI service description, contact form multi-choice interests
**Resolved in Phase 5 (SEO):** Items 6 (sitemap), 7 (robots), 8 (JSON-LD), 16 (meta titles), 17 (canonical URLs), 28 (local SEO + geo coordinates), 29 (internal linking + breadcrumbs), 30 (FAQ section + schema), 32 (pricing signals), 36 (image alt text), 37 (breadcrumb schema), 39 (preload hints)

### Critical (Must fix before launch)
1. **Contact form is fake** — simulates submission, logs to console, nobody receives messages. Connect to Formspree/Resend. Remove `console.log` (security: leaks personal data). `components/sections/ContactForm.tsx:36-39`
2. **Work page case studies are fabricated** — placeholder data with generic clients ("Service Business", "UK Charity", "SME") and made-up testimonials. Publishing these would violate advertising standards and destroy credibility. Either replace with real case studies or remove the page until genuine ones are ready. `app/work/page.tsx:13-74`
3. **Calendly "Book a Discovery Call" button is broken** — `href="#"` dead link on contact page. Fix or remove. `app/contact/page.tsx:168`
4. **Missing og-image.jpg** — referenced in layout.tsx but doesn't exist. Social shares display no preview image. Create 1200x630px branded image. `app/layout.tsx:51`
5. **Missing favicon files** — layout.tsx references favicon.ico, icon.svg, apple-touch-icon.png that don't exist. Browser tabs show generic icon. `app/layout.tsx:90-91`
6. **Missing sitemap.ts** — no sitemap for search engines. Create `app/sitemap.ts` using Next.js Metadata API.
7. **Missing robots.ts** — no robots.txt. Create `app/robots.ts`.
8. **No JSON-LD schema markup** — zero structured data. Google can't identify the business type, services, or location. Add LocalBusiness + Service schemas.
9. **Services page CSS bug** — `lg:flex-row-reverse` on a grid element does nothing. The class is silently ignored. Remove it (the `lg:order-2`/`lg:order-1` on children already handles alternating layout). `app/services/page.tsx:134`

### High (Fix within first week)
10. **Website voice doesn't sound like Ibraheem** — copy is too polished/corporate. Missing: playful parenthetical asides, vulnerability, self-deprecating humour, warmth. Compare website ("I build connected marketing and operations systems") vs how he actually talks ("I'm a nerd for this stuff — my family can confirm"). Needs a copy pass with the voice guides.
11. **Zero Islamic identity on the website** — brand guide says "Muslim professional with naturally integrated Islamic values." Voice analysis shows Islamic phrases in 6+ of 18 posts. The website has none. The Muslim entrepreneur audience segment will notice this gap. Add naturally where appropriate (about page, community section).
12. **Missing the BFG framing** — "The world doesn't need more Goliaths. It needs more BFGs" is one of the most distinctive parts of the brand. Completely absent from the website. Add to homepage or about page.
13. **Missing "Small Giants" name explanation** — what the name means and why it matters isn't on the site. Brand guide has it: "Small businesses with giant capabilities. You don't need to become a soulless corporation to compete with one."
14. **Hero says "worldwide" but brand says "UK"** — "Working with ambitious founders worldwide" contradicts the consistent UK positioning. Change to "Working across the UK" per brand docs. `components/sections/Hero.tsx:76`
15. **Missing USP #7: Work-life balance** — 6 of 7 USPs are on the homepage but "Work-life balance as core value" is missing. The docs say this differentiates from "hustle culture" consultants. `components/sections/USPs.tsx`
16. **Weak meta titles** — "About | Small Giants Studio" is too generic. Each page needs keyword-rich titles. E.g. "About Ibraheem Mustafa | Digital Transformation Consultant for UK SMEs". All page metadata exports need updating.
17. **Missing canonical URLs** — no explicit canonical tags on individual pages. Add `alternates.canonical` to each page's metadata export.
18. **Testimonial carousel dots fail 44px touch target** — dots are 8px tall, WCAG 2.2 AA requires 44px minimum. Add padding wrapper. `components/sections/Testimonials.tsx:149`
19. **Mobile menu button below 44px** — p-2.5 on h-6/w-6 icon = ~39px. Increase to p-3. `components/layout/Header.tsx:35`
20. **Insights category filter buttons below 44px** — py-2 is too small. Increase to py-3. `app/insights/page.tsx:86`

### Medium (Fix within 2 weeks)
21. **Cookie consent banner missing** — GDPR compliance required. Implement before adding any analytics.
22. **No Google Analytics** — can't track visitors, conversions, or marketing effectiveness.
23. **No error boundary** — if a component crashes, entire app goes blank. Create `app/error.tsx`.
24. **No loading states** — no `loading.tsx` files. Users see blank screen while pages load.
25. **Dark mode toggle not implemented** — CSS variables respond to system preference, but no manual toggle exists. CLAUDE.md specifies dark mode support.
26. **Missing manifest.json** — referenced in layout.tsx but doesn't exist. Create `public/manifest.json` for PWA support.
27. **Insights page is entirely placeholder** — all posts say "Coming soon", category filters don't work, posts don't link anywhere. Either write real content or simplify to a "Coming soon" landing page.
28. **No local SEO signals** — no Google Business Profile, no geo coordinates in schema, "Birmingham" only mentioned twice. Add to more pages and set up GBP.
29. **Weak internal linking** — no breadcrumbs, no "related services" suggestions, work page doesn't link to relevant services.
30. **No FAQ section or schema** — missing featured snippet opportunity. Add FAQ to services or about page.
31. **Budget-conscious messaging missing from services page** — "resourceful with your budget" and "connecting affordable tools with automation" from About The Company doc would resonate with target audience. `app/services/page.tsx`
32. **No pricing signals** — market research says "50% of UK SMEs avoid consultants due to perceived over-inflated costs." Even a general indicator would help.
33. **Remove unused Button `sm` size** — 36px height violates WCAG. It's never used. `components/ui/Button.tsx:24`
34. **Search Console verification codes empty** — `app/layout.tsx:76-78` has placeholder comment.

### Low (Nice to have)
35. **Fish tank SVG text labels may be unreadable on mobile** — check mobile screenshots.
36. **Image alt text could be more keyword-rich** — e.g. hero headshot alt could include "digital transformation consultant".
37. **Breadcrumb schema not implemented** — would improve SERP appearance.
38. **Blog article schema not prepared** — when real posts are added, Article schema will be needed.
39. **No preload hints for critical resources** — hero image and fonts could benefit.
40. **No company registration number** in privacy/terms pages.

---

## What's Next (Prioritised — work top to bottom)

### Phase 1: Launch-blockers — DONE (9 Feb 2026)
- [x] Connect contact form to Formspree (ID: xeeloran), remove console.log
- [x] Fix or remove fabricated case studies on /work — replaced with coming soon
- [x] Fix or remove broken Calendly link on /contact — removed booking section
- [x] Create OG image — auto-generates via `app/opengraph-image.tsx`
- [x] Favicons — using sgs-logo.jpg (functional, not ideal)
- [x] Fix services page CSS grid bug (removed `lg:flex-row-reverse`)

### Phase 2: Voice and identity — DONE (9 Feb 2026)
- [x] Copy pass on all pages — add warmth, vulnerability, playful asides per voice guides
- [x] Add Islamic phrases naturally to about page and community section
- [x] Add BFG framing to homepage CTA and about page story
- [x] Add "Small Giants" name explanation to about page
- [x] Fix hero "worldwide" to "across the UK"
- [x] Add work-life balance USP to homepage (7th USP card)
- [x] Add budget-conscious messaging to services page

### Phase 3: Compliance, UX, and infrastructure — DONE (9 Feb 2026)
- [x] Implement cookie consent banner (GDPR) — `components/ui/CookieConsent.tsx`
- [x] Create `app/error.tsx` error boundary
- [x] Create `app/loading.tsx` loading state
- [x] `public/manifest.json` exists and is valid
- [x] Fix all 44px touch target violations (carousel dots, mobile menu, removed `sm` button size)
- [x] Implement dark mode toggle — `components/ui/ThemeToggle.tsx` in Header, inline script prevents flash
- [x] /insights already simplified to "coming soon" page (done in Phase 1)

### Phase 4.5: Visual & Content Overhaul — DONE (9 Feb 2026)
- [x] Dark mode colour fixes in globals.css (bg-primary-50/100 overrides, text-muted)
- [x] Horizontal logo (sgs-horizontal-logo.png) in Logo.tsx with light variant inversion
- [x] Button "white" variant added, all CTA buttons updated
- [x] WCAG dark: text overrides across 15+ files (text-primary-700 → dark:text-primary-300)
- [x] Header nav text bumped to text-base (was text-sm)
- [x] Evertreen SVG fill changed from white to #008636
- [x] 6th "What I Believe" value added ("Your business, your way")
- [x] Community: replaced "Birmingham Muslims in Tech" with Evertreen partnership
- [x] /work page simplified to cleaner "coming soon" card
- [x] SEO service updated to "SEO, GEO & Digital Marketing" with AI discoverability
- [x] Both LinkedIn profiles on contact page, footer, and insights page
- [x] Contact form: "AI/Chatbot" source option + interest multi-choice checkboxes
- [x] Fish tank SVG animation (swimming fish, bubbles, seaweed, shimmer)
- [x] Hero replaced headshot with coded SVG animation (small figure + giant silhouette)

### Phase 5: SEO Infrastructure — DONE (10 Feb 2026)
- [x] `app/sitemap.ts` — all pages with priorities, /work deprioritised to 0.3
- [x] `app/robots.ts` — allows all, blocks /api/, links to sitemap
- [x] JSON-LD: LocalBusiness (with geo + priceRange), Person, Service, FAQPage, BreadcrumbList
- [x] Keyword-rich meta titles on all pages (contact, work, insights, about, services)
- [x] Canonical URLs on all pages via `alternates.canonical`
- [x] Breadcrumbs with BreadcrumbList schema on all sub-pages
- [x] FAQ section + FAQPage schema on services page (6 questions)
- [x] Pricing signals section on services page (fixed-price, budget-scaled, no inflated licences)
- [x] Geo coordinates (52.4862, -1.8904) + priceRange in LocalBusiness schema
- [x] Birmingham/West Midlands strengthened across services meta description + schema
- [x] Internal cross-links: contact → services/about, insights → services/contact
- [x] Image alt text keyword-rich (headshot, logo, partner logos)
- [x] Logo preload hint in layout head
- [x] /work removed from Header and Footer navigation
- [x] React 19 lint fixes: useSyncExternalStore for CookieConsent + ThemeToggle, removed useEffect from Header
- [x] ESLint passes clean (0 errors, 0 warnings)

### Phase 5b: Design & UX Improvements — DONE (10 Feb 2026)
- [x] Mid-page CTA after Fish Tank section (`components/sections/MidCTA.tsx`) — catches visitors at emotional peak
- [x] Services section redesign — featured full-width Digital Transformation card + compact 5-col grid below
- [x] SVG labels hidden on mobile (<640px) for hero node labels and fish tank labels — prevents unreadable text
- [x] UI/UX audit completed: storytelling, animation, colour, typography, dark mode, mobile, conversion flow

### Phase 4: Content and polish
- [ ] Replace /work with real case studies (needs client permission) or remove page
- [ ] Write real blog posts for /insights
- [ ] Add company registration number to privacy/terms (needs number)
- [ ] LinkedIn feed integration on /work page (embed personal posts)
- [ ] Run `/ui-ux-pro-max` for visual design critique
- [ ] Run `/writing-clearly-and-concisely` to tighten copy
- [ ] Run `/verification-before-completion` before deploying
- [ ] Deploy to Vercel

### Post-launch: Remaining SEO
- [ ] Set up Google Search Console + add verification code (needs account)
- [ ] Set up Google Business Profile — Birmingham (needs account)
- [ ] Add Google Analytics 4 (needs tracking ID)

### Post-launch: LinkedIn API feed
- [ ] LinkedIn API app created at developers.linkedin.com (needs Community Management API approval)
- [ ] Build OAuth flow + token refresh for reading company page posts
- [ ] n8n automation alternative once API access confirmed
- [ ] For now: using oEmbed with curated post URLs on /insights page

### Separate project
- [ ] Custom booking system (prompt in CONVERSATION-HANDOFF.md)

---

## Assets Still Needed
- [x] Professional photo of Ibraheem (in `/docs/screenshots/`)
- [x] OG image — auto-generated via `app/opengraph-image.tsx`
- [x] Favicons — using sgs-logo.jpg
- [ ] Custom booking system (separate project — prompt in CONVERSATION-HANDOFF.md)
- [ ] Real case studies with client permission (for /work page)
- [ ] Real blog posts (for /insights page)
- [ ] Google Analytics 4 tracking ID (post-launch)
- [ ] Google Business Profile setup (post-launch)
- [x] Company registration number — 16959564 (added to privacy, terms, footer)
