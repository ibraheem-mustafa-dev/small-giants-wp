# Handoff: Indus Foods Website Redesign

## Overview
Marketing and trade-onboarding website for Indus Foods Ltd, a family-run Indian/South Asian food wholesaler in Birmingham (since 1962). Goals: promote the business, push visitors to open a **trade account**, and present sectors (Food Service, Manufacturing, Retail, Wholesale), brands, company information, blog and contact.

## About the Design Files
The files in this bundle are **design references created in HTML**: prototypes showing intended look and behaviour, not production code to copy directly. Recreate them in the target codebase's existing environment (React, Vue, etc.) using its established patterns and libraries. If no environment exists, pick a suitable framework (a static-friendly one such as Next.js or Astro fits a content site with a hash/URL router).

Notes on the prototype format: it is a single "Design Component" file (`.dc.html`) with inline styles, `{{ }}` template holes and a logic class. Read it as a spec; do not port its template syntax. Routing is hash-based (`#/about`); use real routes in production.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, copy and interactions. Recreate pixel-accurately. Photos are Unsplash placeholders (see Assets) and brand logos are empty `image-slot` placeholders awaiting real artwork.

## Breakpoints
- Mobile: width < 768
- Tablet: 768 to 1023
- Desktop: >= 1024 (header CTA pill appears at >= 1260; nav padding 10px below 1200, 15px above)

Responsive tokens (mobile / tablet / desktop): page gutter 20 / 32 / 40px; section padding 64 / 88 / 108px; tight section padding 40 / 52 / 64px; header height 72 / 72 / 84px. Max content widths: header and top bar 1320px; sections 1040 to 1120px.

## Global layout (every page)
1. **Top bar** (46px, bg `#0A7EA8`): white pill buttons (padding 6px 14px, 15px/700, radius 999, text `#0A7EA8`; hover: scale 1.05, lift 2px, bg `#D8CA50`, text `#2C3E50`). Order: "Register For A Trade Account" (mobile only), phone `0121 771 4330` (tel:01217714330; label "Call" on mobile), email `amir@indusfoodsltd.com` (hidden on mobile). Right: circular social icons 34px (LinkedIn `#0A66C2`, Facebook `#1877F2`, Google `#EA4335`, Instagram) hidden on mobile; hover scale 1.15, rotate -8deg, lift 3px.
2. **Scroll progress bar**: fixed, 3px, gradient `#D8CA50` to `#2EADE2`, scaleX by scroll.
3. **Sticky header**: white, 3px bottom border `#D8CA50`, shadow `0 10px 30px -18px rgba(20,40,60,.35)` after 8px scroll. Logo (horizontal SVG, height clamp(40px,3.8vw,52px), aspect 3741/848). Desktop nav: Home, About, Sectors, Brands, Trade, Contact (17px/600, 42px tall, radius 11, active item has 2px gold underline). CTA "Register For A Trade Account": bg `#0A7EA8`, white, radius 999, padding 12px 22px, 17px/600. Tablet: CTA + hamburger (46px, radius 12). Mobile: hamburger only.
4. **Mega menu** (desktop, opens on hover/focus, closes 170ms after leave or Esc/backdrop click). Panel: max-width per panel, margin-top 12px, radius 12, white, shadow `0 30px 80px -30px rgba(20,25,35,.28)`. Backdrop: fixed, `rgba(20,25,35,.28)`, blur 2px, 0.3s fade. Panel entrance 340ms `cubic-bezier(.16,.84,.32,1)`; children stagger up to 14px, 460ms, 26ms apart (max 320ms).
   - **About** (simple list + feature card): Our Story, Certifications, Community & Charity, Sustainability, Careers, News & Blog. Feature card (300px, bg dark blue, white text): tag "Since 1962", "Six decades of heritage", CTA "Read our story".
   - **Sectors** (4 cards, grid 4 cols, gap 14px, padding 28px): panel bg `linear-gradient(120deg,#E7D768 0%,#2EADE2 55%,#0A7EA8 100%)`. Cards radius 18, padding 18, border 2px `rgba(255,255,255,.75)`, min-height 270, image 110px tall radius 12, hover lift 6px.
   - **Brands**: 4-col grid of 64px logo tiles (radius 12, bg `#FAFAF8`) + 300px `#0A7EA8` side block "Own Brands" with CTA "View All Brands".
   - **Trade**: Apply for Trade Account, Request Catalogue, Delivery & Logistics, FAQs, Terms & Conditions; feature "Trade with Indus Foods".
   - Reference: the About and Trade panel feature cards use dark blue `#0A7EA8` with white text (an earlier lighter blue was rejected).
5. **Mobile/tablet drawer**: fixed right, bg `#0A7EA8`, accordion items 20px/700 with gold `#D8CA50` 1px dividers, gold pill "Become A Trade Customer", gold circular email and call buttons, social icons. Items stagger in from right (420ms, 55ms apart).
6. **Footer** (bg `#2C3E50`, 5px top rule `linear-gradient(90deg,#D8CA50 0%,#E7D768 30%,#2EADE2 70%,#0A7EA8 100%)`, max-width 1240px), three rows:
   - **Contact band** (3 cards, radius 22, bg `rgba(255,255,255,.05)`, hover lift 4px and gold border): "Call us" 0121 771 4330; "Email us" amir@indusfoodsltd.com (clamp(15px,1.25vw,17px), nowrap, stays on one line); "Opening hours" widget (Europe/London): Mon-Thu 9:30am-5pm, Fri 9:30am-12pm and 2:30-5pm, Sat 10am-3pm, Sun closed; today's row in gold; badge "Open now" with pulsing green dot and "Closes at X today", or "Closed" with amber dot and "Opens ...".
   - **Main row**: square logo centred (240px, 200px on mobile), no white background, company paragraph, 44px social icons; **"Quick links"**, one two-column list (Certifications, Trade, Brands, Delivery & Logistics, Terms & Conditions, Blog; the `footerQuick` value in `homeVals()`) plus gold pill "Apply For A Trade Account"; **"Visit us"**: Google Maps embed (210px tall, grayscale .35) with the address and a "Get Directions" pill.
   - **Bottom bar**: "Copyright © 2026 Indus Foods Ltd | Website by Ibraheem Mustafa | Placeholder photography via Unsplash" and a "Back to top" button (smooth scroll).
   - Not rendered: `renderVals()` still returns `footerGroups` (About/Sectors/Trade/Company) and `accreds` (BRC, Halal, Today's Group, FWD); the template uses neither.
7. **WhatsApp button**: fixed bottom-right (22px), green pill, icon `assets/whatsapp-ink.svg` 22px + "Chat with our team" (text hidden on mobile, becomes icon-only). Link `https://wa.me/441217714330`, new tab.

## Screens / Views
Routes (all via hash): `/` home, `/about`, `/our-story`, `/certifications`, `/community`, `/sustainability`, `/careers`, `/food-service`, `/manufacturing`, `/retail`, `/wholesale`, `/brands`, `/brand-sanam`, `/brand-shan`, `/brand-green-leaf`, `/brand-lemon-tree`, `/apply` (Trade Application), `/catalogue`, `/delivery`, `/faqs`, `/terms`, `/contact`, `/blog`, `/post-*` (articles). Page content is data-driven in the `pages` getter of the logic class; the exact copy lives there and is the source of truth.

### Home
- **Hero**: gradient `135deg #EBDD78, #E3D35F, #D8CA50`. Two columns (copy | photo). H1 "Leading Indian Food & Drinks Wholesaler" (Montserrat 800, clamp(36px,5vw,62px), line-height 1.08, `#2C3E50`). Sub "Proud to be a family-run food wholesaler since 1962!" (clamp(18px,1.7vw,22px)/600). Buttons: black pill "Apply For A Trade Account" (text `#D8CA50`) and blue pill "Request Our Catalogue" (white 2px border). Trust chips: BRC certified, Halal certified, Today's Group member (13px/700 uppercase, bg `rgba(255,255,255,.6)`). Photo 3:2, radius 22, 5px white border, floats up 12px over 4.2s alternate; parallax -0.06 x scrollY.
- **Our Brands**: bg `#0A7EA8`; H2 gold with 2px gold underline; infinite marquee of white 16px-radius logo tiles (38s linear loop, slows to 0.15x on hover, edge fade mask).
- **Our UK Wide Food Services**: 4 sector cards (radius 22, circular photo, 5px white border, title Montserrat 22/700, blue pill button). Pointer tilt (3D rotate up to 16deg plus radial highlight).
- **Why Choose Indus Foods?**: gold gradient `#E3D35F to #D8CA50`, 8 cards (translucent white; hover turns `#2C3E50` with gold text, icon rotates -10deg).
- **Heritage**: "Family-run since 1962." with milestone timeline (circles 56px, 3px gold border), line draws on reveal.
- **Our Partners Love Us!**: `#0A7EA8` bg; gold testimonial card (radius 16), prev/next 42px circular buttons, dot pager, auto-advance every 6.5s with slide-in animation; circular food photo right.
- **How to open a trade account**: 3 numbered steps with dashed gold connector, CTA "Start your application".
- Final CTA band, then footer.

### Inner pages
Shared hero (eyebrow, H1, intro, optional CTAs, optional image, breadcrumb label) followed by a list of typed blocks used by the 29 pages: `stats`, `hscroll` (pinned horizontal timeline, scroll-driven, with counter "01 / 05"; desktop only, static on tablet/mobile), `cards` (variants: `quad` 4-col, min-width columns, image height), `rows`, `split` (text + image, optional flip and tint), `gradients` (other sectors), `logos`, `cta`, `form`, `wizard` (mounts `TradeApplication.dc.html`), `enquiry` (mounts `EnquiryForm.dc.html`), `faq`, `posts`, `article`, `prose`, `contact`. The template also supports `quotes` and `timeline`, but no page uses them; `formOld` on Contact is filtered out and never renders.
- **About**: animated SVG hero (see Animations). Dark text on final gold. 8 linked cards (Our Story, Certifications, Community & Charity, Sustainability, Careers, Trade Account, Sectors, Our Brands): 4 cols desktop, 2 tablet, 1 mobile.
- **Forms**: Careers and Catalogue use the inline `form` block (client-side submit shows a thank-you state with a reset action). Trade Application (`/apply`) is the multi-step `TradeApplication.dc.html`; Contact uses `EnquiryForm.dc.html`. Backend submission is not implemented; wire to the real endpoint. Field types: text, email, tel, select, file, textarea; `req` marks required fields.
- **Blog**: category chips filter posts (active chip bg `#0A7EA8`, white text), post cards link to article pages; articles show estimated read time (words / 200, min 2 min).
- **FAQ**: grouped accordions, toggle icon rotates 45deg and turns `#0A7EA8` when open.
- **Contact details**: Visit 55-58 Stratford Street North, Sparkbrook, Birmingham B11 1BU; Call 0121 771 4330; Email amir@indusfoodsltd.com.

## Animations & Behaviour
- **Entrance (every page load/route change)**: main fades in 380ms; hero children stagger (translateY 28px + blur 8px to none, 900ms, 80ms + 110ms x index, easing `cubic-bezier(.16,.84,.32,1)`); hero image clip-path reveal 1100ms with inner scale 1.18 to 1.
- **Scroll reveal** (IntersectionObserver, threshold 0.12, root margin bottom -4%): headings translateY 22px + blur 6px (850ms); grid/flex-wrap children translateY 40px + scale .96 (800ms, 80ms stagger, index mod 8); images clip-path inset 10% (1000ms); lines scaleX/scaleY draw (1400/1800ms).
- **Magnetic buttons** (`data-mag`): translate up to 5px/4px toward pointer, shine sweep on enter (750ms), ripple on press (650ms).
- **About hero SVG** (files `assets/about-hero-{desktop,tablet,mobile}.svg`, inlined and animated via Web Animations): mountains rise (1.1s), snow fades in (0.7s delay 0.7s), sun rays spin 40s loop, sun grows and then expands to scale 4.2 over 4.2s, gold path draws (1.6s from 1.1s, glow and highlight layers offset 120ms), road fill `#2c3e50` to white (0.9s at 2.4s), background `#2b3f59` to `#E7D768` complete by ~4.4s. Reduced motion: jump to final state.
- **Logo** (`indus-logo.js`, Web Animations on named SVG groups): sun rays spin 60s loop; on first entering the viewport: sun expands (1200ms, delay 150, spring `cubic-bezier(.34,1.56,.64,1)`), mountain rises 120px (1000ms), snow fades (700ms, delay 650), road wipes up (900ms, delay 500), letters rise 60px (650ms, delay 420 + 45ms x index). On hover (max once per 1.4s): rays spin 14x for 900ms, sun pulses to 1.12, mountain bobs 24px, letters bob 40px (28ms stagger).
- **Reduced motion**: all JS-driven motion is skipped when `prefers-reduced-motion` is set.
- **Easings used**: `cubic-bezier(.16,.84,.32,1)` (entrances, reveals, menus), `cubic-bezier(.2,.8,.2,1)` (button and card transitions), `cubic-bezier(.34,1.56,.64,1)` (spring: social icons, tilt reset, logo), `cubic-bezier(.65,0,.35,1)` (About hero path and background).
- Esc closes menus; body scroll locked while drawer open.

## State
`page` (from hash), viewport width `w`, `active` (open mega menu index), `mobileOpen`, `acc` (open accordion), `faqOpen` map, `sent` map (form submitted), `blogCat`, `tIdx` (testimonial index). Opening hours computed from Europe/London time. No data fetching apart from loading the About hero SVG.

## Design Tokens
Colours
- Brand blue `#0A7EA8` (hover `#075E80`, text-on-gold alt `#0A6E93`); light blue `#2EADE2`
- Gold `#D8CA50`; light gold `#E7D768`, `#E3D35F`, `#EBDD78`
- Ink `#1E2A3C`; slate `#2C3E50`; body grey `#4A5563`; muted `#68727C` / `#5E6873`
- Surface `#FFFFFF`, `#FAFAF8`, `#F2F5F7`; light tint text on blue `#E3EFF4`, `#DCEBF1`
- Brand gradient: gold to light blue to dark blue (`120deg,#E7D768 0%,#2EADE2 55%,#0A7EA8 100%`)
- Social: LinkedIn `#0A66C2`, Facebook `#1877F2`, Google `#EA4335`
- Selection: bg `#D8CA50`, text `#1E2A3C`; links `#0A7EA8`, hover `#075E80`
Typography
- Headings: Montserrat 500/600/700/800. Body: Source Sans 3 (400-700), base 19px/1.55. Mono labels: Geist Mono 12px, 0.14em tracking, uppercase.
- H2: clamp(28px,3.4vw,40px)/1.15, -0.01em. Card titles 22px/700. Eyebrow: Montserrat 13px/700, 0.14em tracking, uppercase, `#0A7EA8`.
Radius: 3 (tags), 9-12 (tiles/inputs), 16-22 (cards), 999 (pills/buttons).
Shadows: button `0 8px 18px -8px rgba(0,0,0,.45)`; card `0 20px 34px -20px rgba(44,62,80,.55)`; panel `0 30px 80px -30px rgba(20,25,35,.28)`.
Spacing: gaps 8/10/14/18/22/28/40/64px; see responsive tokens above.

## Assets
- `assets/logo-horizontal-anim.svg`, `logo-square-anim.svg`: the files `indus-logo.js` fetches and inlines as `<indus-logo variant="horizontal|square">`. `logo-horizontal.svg` and `logo-square.svg` are byte-identical copies that nothing references.
- `assets/about-hero-*.svg`: animated About hero backgrounds.
- `assets/whatsapp-ink.svg`: WhatsApp glyph.
- Photos: Unsplash placeholders loaded by id (`https://images.unsplash.com/photo-<id>?w=<2x width>&q=70&auto=format&fit=crop`), each with a credit linking to `https://unsplash.com/photos/<id>`. Replace with owned photography; keep the credit pattern for any remaining Unsplash images. Brand, accreditation and testimonial logos are placeholders (`brand-*`, `acc-*`, `t-avatar*` ids).
- `image-slot.js`: placeholder component for droppable images; replace with normal `<img>` or CMS media.
- Pending: transparent-background tabletop food cut-outs (PNG) are being produced and will be laid out across pages (the scatter/parallax food layer is currently disabled, `density = 'Off'`).

## Open items
- Confirm the Sectors panel gradient.
- Social links currently point to `#/`; supply real URLs.
- Forms need a backend.

## Revision
See `MANIFEST.md` for the date, the runtime version (support.js SHA-256) and the SHA-256 of every file in this bundle.

## Files
- `Indus Foods Website v2.dc.html`: the full site (template + logic: menus, pages data, animations).
- `TradeApplication.dc.html`, `EnquiryForm.dc.html`: form components.
- `indus-logo.js`, `image-slot.js`, `support.js` (prototype runtime).
- `assets/`: SVGs listed above.
- `animations.json`: every animation and interaction effect (183 records), validated against `../handoff-schema/animations.schema.json` and checked against a runtime trace.
- `surfaces.json`: every page, global element, menu, drawer, accordion, form, form step and result with its states (60 records), validated against `../handoff-schema/surfaces.schema.json`.
- `../handoff-schema/trace/trace-harness.html`: re-runs the runtime trace (open it in the preview; it offers `trace.state.json` for download when it finishes).
