# Mama's Munches — Client Site

**Status:** Brand discovery captured from live site + Bean answers (2026-04-30) — ready for design phase
**Track:** B (revenue) — P5.B1 in master plan
**Master-plan blocker:** SGS Ecommerce Plugin Phase 1 (catalogue + product page + Stripe one-off checkout). Brand + design can ship in parallel.
**Live site:** https://mamasmunches.com/
**Owner email:** Zainab@mamasmunches.com
**Instagram:** [@mamasmunches](https://www.instagram.com/mamasmunches/) — high-quality product media here, pull next session
**Tally form (current ordering):** https://tally.so/r/xXMQLk — manual flavour confirmation by Zainab; not sustainable
**Trustpilot:** 4 real 5-star reviews live at https://uk.trustpilot.com/review/mamasmunches.com (TrustScore 4.0, "Great"). SGS Trustpilot Sync infrastructure shipped (commit `06df2807`) — paste the URL into Settings > SGS Trustpilot Sync on the migrated WP site, the `sgs/trustpilot-reviews` block in `synced` mode renders them automatically. Weekly cron keeps fresh.
**Stripe:** account exists — ready for plugin integration
**Brand assets dropped:** `sites/mamas-munches/research/brand/` (PNG + WebP horizontal lockup)

## What they sell

**Lactation cookies** in a range of flavours and milk types — currently the only product live. **Bites planned** as the next category. Bean's full description:

### Current variant attributes (from Bean — actual live options)

| Attribute | Options | Count |
|-----------|---------|-------|
| **Number in Pack** | 8 / 12 / 20 / 40 | 4 |
| **Flavour** | Classic Oat / Chocolate | 2 |
| **Topping** | Chocolate Chip / White Chocolate Chip / No Topping | 3 |
| **Dietary Requirements** | Regular / Vegan | 2 |

Total variant combinations: **4 × 2 × 3 × 2 = 48 SKUs** — manageable as WooCommerce variable product attributes.

### Future expansion (mentioned but not yet live)

- **Fruit flavour add-ins:** strawberry, blueberry, banana, others (likely extends the "Flavour" attribute)
- **Allergy-friendly:** handled as on-request checkout note in Phase 1, not as a separate variant attribute
- **Bites category:** energy balls / no-bake snacks — TBC scope with Zainab
- **Subscription:** preset-length recurring delivery so mums get fresh cookies regularly (high-LTV play; Phase 2 ecom feature, not Phase 1)

**Future product line:** bites (energy balls / no-bake snacks — TBC scope with Zainab).

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
- Trustpilot reviews now visible on Trustpilot itself (4 × 5-star, TrustScore 4.0) — SGS Trustpilot Sync block + WP-cron infrastructure shipped 2026-05-11 commit `06df2807`; will render on the migrated SGS site via the same wp_option the smoke-test page on sandybrown already reads

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
- ✅ Trustpilot has 4 × 5-star reviews live (TrustScore 4.0, "Great") — first-buyer flow should still ask for one to keep volume growing; SGS Trustpilot Sync now renders these on the SGS site automatically

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

**Cuts (Phase 2 — not required for launch):** discount codes, subscription/recurring (Bean wants preset-length subscriptions; promote to Phase 2 priority), abandoned cart, accounts beyond guest, per-variant inventory, shipping zones beyond UK flat-rate, gifting flow (gift messages, send-to-recipient, gift cards) — promote when gifting becomes priority audience.

**⚠️ Phase 1 scope expansion vs master plan §3.1:** master plan specced Stripe only. Mama's needs **both Stripe AND PayPal**. Adds gateway-abstraction work to the SGS Ecom Plugin Phase 1 build — confirm with Bean before plugin scoping session whether to support both at launch or ship Stripe-only and add PayPal post-launch.

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

## Bean's answers (2026-04-30)

| Q | Answer |
|---|--------|
| Founder name | Zainab (Bean's sister, presumed from email) |
| Logo files | PNG + WebP horizontal lockup at `research/brand/`. SVG/vector source TBC |
| Product photography | Mix — some AI, some real product photos. Live site + Instagram have usable assets. Pull next session via Playwright/curl |
| Payments | **Both Stripe AND PayPal** set up ✅ — Phase 1 ecom plugin needs both gateways supported |
| Launch | ASAP but quality-first — "happy to be convinced" on approach |
| Allergens | TBC — needs FSA-compliant labelling for Phase 1 ship |
| Reference sites | None — use `/ui-ux-pro-max` + `/sgs-discover` + research-result-driven design direction |
| Subscription | YES — preset-length recurring delivery. Phase 2 ecom feature |
| Audience | Currently mums (since brand not yet well-known); **gifting market is untapped** and worth designing for (baby showers, new-mum gifts, NHS/midwife-recommended gift baskets) |
| B2B potential | TBC via `/lead-research-assistant` next session — strategy work for B2B + B2C |
| Pricing | Not 100% confirmed — needs validation as part of B2C strategy |
| Geography | UK only, bootstrapped |

## Constraint for next-session research

⚠️ **DO NOT** read prior workspace memory on Bean's sister's business ideas (in `~/.openclaw/workspace/memory/research/`) UNTIL fresh `/lead-research-assistant` run is complete. Reading the old research first biases the new run. The historical research is a reference check AFTER fresh independent research, not before.

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
