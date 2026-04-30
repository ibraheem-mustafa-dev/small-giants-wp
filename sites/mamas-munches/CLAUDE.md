# Mama's Munches — Client Site

**Status:** Brand discovery captured from live site (2026-04-30) — ready for design phase
**Track:** B (revenue) — P5.B1 in master plan
**Master-plan blocker:** SGS Ecommerce Plugin Phase 1 (catalogue + product page + Stripe one-off checkout). Brand + design can ship in parallel.
**Live site:** https://mamasmunches.com/
**Owner email:** Zainab@mamasmunches.com
**Instagram:** [@mamasmunches](https://www.instagram.com/mamasmunches/)
**Trustpilot:** widget present (no reviews yet)

## What they sell

**Lactation cookies + bites** for breastfeeding mothers. Soft-baked oat cookies "crafted with wholesome ingredients" to support milk supply. Currently one product live: **Lactation Cookies (8-pack) at £9.50**, with packs of 20 and 40 mentioned in copy but not yet listed. Two product categories planned: **Cookies** and **Bites** (Bites category empty at scrape time).

## Brand story (verbatim from About page)

> "My story with lactation cookies started when my friend started struggling with breastfeeding her newborn. At the time, we had no choice but to start making lactation cookies ourselves, praying that it would work for the sake of her baby and amazingly, it did! These cookies helped her milk supply almost immediately and I was so grateful to have been able to make her early motherhood days just a bit easier. Now I hope that I can do the same thing for you. Using natural, wholesome ingredients, everything is made with care and intention for breastfeeding mums and their new beautiful babies."

Founder name not stated on About page — Bean to confirm (likely Zainab from email).

## Brand identity — captured from logo assets

### Palette (extracted from logos — confirm exact hex with Bean)

| Role | Approx | Use |
|------|--------|-----|
| Primary coral pink | `#E68A95` (heading text + CTAs) | brand wordmark, taglines, primary buttons |
| Soft pink | `#F5C2C8` | logo circle background, hero band, large surfaces |
| Cream / parchment | `#FBF3DC` | page background, breathing room |
| Warm yellow | `#F5D050` | logo wordmark fill, bow accent, energy/sunshine moments |
| Cookie brown | `#8B6F4E` | product art, food photography supporting |
| Choc-chip charcoal | `#3A2E26` | body text, dark accents |

### Typography (current site)
- Astra theme + Google Fonts: **Inter** (body) + **Work Sans** (headings)
- Logo wordmark uses a chunky display script (custom — embedded in logo image)
- SGS rebuild can keep Inter (body) + propose a warm display face for headings (Fraunces, Recoleta, or DM Serif Display) for the "domestic warmth" feel

### Voice
- Warm, personal, mum-to-mum
- "Crafted with love", "made with care", "for new beautiful babies"
- Heart emojis used genuinely (not corporate)
- Tagline: **"Boost your milk, bite by bite"**
- Hero copy variant: **"Baked with Love for Breastfeeding Mums"**

### Logo variants in use
1. **Primary circular emblem** — wordmark + cookies-in-bag illustration + tagline ring
2. **Square pink-background tile** — same emblem on filled pink, good for social
3. **Horizontal lockup** — small cookie + wordmark + tagline, used in site header
4. **QR-code marketing asset** — "SCAN FOR 10% OFF" handout (implies physical distribution: markets, mum events, NHS leaflets, baby fairs)

Bean to drop logo source files into `sites/mamas-munches/research/brand/`.

## Trust signals already on the site

- "Handmade in Birmingham" 🏡
- "Registered Food Business" ✅
- "Free UK Delivery Over £35" 🚚
- "Loved by Breastfeeding Mums" ⭐
- 20% off first purchase promo
- Trustpilot widget (empty — could become a discovery quick-win)

## Current site stack (what they're rebuilding away from)

- WordPress 6.9.4 + **Astra theme** (`/wp-content/themes/astra/assets/css/minified/main.min.css?ver=4.13.0`)
- WooCommerce 10.7.0
- Likely Astra Pro / Spectra blocks (account login link goes to `websitedemos.net/organic-shop-02/wp-login.php` — suggests starter template deployed unfinished)
- Inter + Work Sans Google fonts (keep these for SGS rebuild)

## Mobile is broken — confirmed visually

Master plan said "decent on desktop, awful on mobile". Confirmed at 375px:
- Hero heading "Welcome to Mama's Munches!" wraps into single-letter columns
- Shop Now button rotated / squashed against right edge
- Trust badges overflow grid columns
- Hero image keeps proportions but right column copy is unreadable

Screenshots saved at:
- `sites/mamas-munches/research/current-site-desktop-1440.png`
- `sites/mamas-munches/research/current-site-mobile-375.png`

This is a real revenue blocker — target users (mums) browse on phones late evening after settling babies.

## Site information architecture (current)

| Path | Purpose |
|------|---------|
| `/` | Home — hero + 4 trust signals + 20%-off promo + footer |
| `/about/` | Founder story (3 paragraphs) |
| `/shop/` | All products (1 live) |
| `/product-category/cookies/` | Cookies (1 live) |
| `/product-category/bites/` | Bites (empty) |
| `/contact/` | Contact form |
| `/cart/` | WooCommerce cart |
| `/product/lactation-cookies-8-pack/` | Single product page |

## What's missing on the current site (for SGS rebuild)

- ❌ Privacy Policy / T&Cs / Shipping pages (linked but `href="#"` placeholders)
- ❌ Quick Links footer ("Know More About Us", "Visit Store", "Let's Connect" all `href="#"`)
- ❌ More products (only 8-pack live; copy mentions 20 + 40 packs and bites)
- ❌ Real testimonials / reviews
- ❌ Lactation cookie ingredient education (galactagogues — oats, brewer's yeast, flaxseed) — content gap; mums research before buying
- ❌ Subscription option (high-LTV play for repeat lactation supplements)
- ❌ Allergen labelling visible on product page
- ❌ Trustpilot has no reviews — first-buyer flow should ask for one

## MVP scope for SGS rebuild (Phase 1 — minimum to ship)

Per master plan §3.1 SGS Ecom Plugin Phase 1 + Mama's-specific needs:

| Page | What it does |
|------|--------------|
| Home | Hero (story-led, mobile-first), trust signals, featured product, brand story snippet, social proof slot |
| About | Expanded founder story + ingredients-we-use + production standards |
| Shop / All Products | Product grid (Cookies + Bites filterable) |
| Product page | Photos, description, allergens, pack-size variants (8/20/40), add-to-cart, ingredient education |
| Cart | WooCommerce-backed; SGS cart block |
| Checkout | Stripe one-off; guest checkout default |
| Order confirmation | "Thanks Mama" page + Trustpilot ask |
| Contact | Form + Instagram + email |
| Privacy / Shipping / T&Cs | Placeholder fills (real legal copy later) |

**Cuts (Phase 2 — not required for launch):** discount codes, subscription/recurring, abandoned cart, accounts beyond guest, per-variant inventory, shipping zones beyond UK flat-rate.

## Sign-off touchpoints (zero-QC promise)

1. **Mockup sign-off** — Bean reviews homepage + product page mockup once. Brand + layout direction approved.
2. **Pre-launch sign-off** — Bean reviews live test site once. Approves checkout flow + content.

Between those: zero human QC. Orders flow WP → Stripe → email confirmation → admin order list. No manual data entry.

## Path to first revenue (parallel tracks)

| Track | Independent of | Effort | Output |
|-------|----------------|--------|--------|
| **Track 1 — Brand + mockup design** | SGS Ecom Plugin | 1–2 sessions | Homepage + product page mockup signed off by Bean |
| **Track 2 — SGS Ecom Plugin Phase 1 build** | Brand work | 4–8 sessions | Plugin shippable; gates Mama's go-live |
| **Track 3 — Content + photography** | Both | parallel | Founder photo, product photography, ingredient stories, Trustpilot seed |

Track 1 can start next session — no blockers.

## Open questions for Bean

1. **Founder name on the About page?** (Zainab presumed from email)
2. **Logo source files?** (vector — SVG / AI / Figma)
3. **Product photography?** Existing or to commission
4. **Stripe account** — set up?
5. **Launch deadline** — soft / hard / event-driven?
6. **Allergen list** — confirm (oats, dairy, eggs, gluten, nuts)
7. **Pack sizes coming next** — copy mentions 20 + 40 packs; confirm + price
8. **Bites** — what are they? Energy balls / no-bake bites / etc?
9. **Subscription interest** — Phase 2 candidate?

## Folder structure

```
sites/mamas-munches/
├── CLAUDE.md (this file)
├── .claude/
│   └── plans/         # site-specific plans
├── research/
│   ├── current-site-desktop-1440.png   ✅ captured
│   ├── current-site-mobile-375.png     ✅ captured
│   └── brand/         # logo source files (TBD — Bean to drop)
└── mockups/           # design mockups for sign-off
```
