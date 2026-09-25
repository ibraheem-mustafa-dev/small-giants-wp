# Mama's Munches — Client Site

**Status:** Built and live on the SGS framework — the canary (`sandybrown-nightingale-600381.hostingersite.com`) runs the real WooCommerce catalogue through `sgs-theme` + `sgs-blocks`. Current build status and open bugs live in `.claude/LEDGER.md` (Mama's Clone Track section) and `.claude/archive/decisions.md`; this file is brand/product reference.

**Public/marketing site:** https://mamasmunches.com/ (brand facts below were captured from it)
**Owner email:** Zainab@mamasmunches.com
**Instagram:** [@mamasmunches](https://www.instagram.com/mamasmunches/) — high-quality product media
**Tally form (ordering on the public site):** https://tally.so/r/xXMQLk — manual flavour confirmation by Zainab
**Trustpilot:** 4 real 5-star reviews at https://uk.trustpilot.com/review/mamasmunches.com (TrustScore 4.0, "Great"). Paste the URL into Settings > SGS Trustpilot Sync; the `sgs/trustpilot-reviews` block in `synced` mode renders them, and a weekly cron keeps them fresh.
**Payments:** Stripe AND PayPal are both set up; the ecom layer supports both gateways.
**Brand assets:** `sites/mamas-munches/research/brand/` (PNG + WebP horizontal lockup; SVG/vector source outstanding)

## What they sell

**Lactation cookies** in a range of flavours and milk types. **Bites** (energy balls / no-bake snacks) are the planned next category; scope to be confirmed with Zainab.

### Variant attributes

| Attribute | Options | Count |
|-----------|---------|-------|
| **Number in Pack** | 8 / 12 / 20 / 40 | 4 |
| **Flavour** | Classic Oat / Chocolate | 2 |
| **Topping** | Chocolate Chip / White Chocolate Chip / No Topping | 3 |
| **Dietary Requirements** | Regular / Vegan | 2 |

Only the pack size changes the price, so only **Number in Pack** creates WooCommerce variations (4). Flavour, Topping
and Dietary are product attributes that don't create variations: the shopper picks them in a choice flow and they
travel to the bag line as answers (Spec 43 FR-43-7, FR-43-21).

On sandybrown this is product **3990** "Classic Lactation Cookies" (`sites/mamas-munches/build/seed-lactation-cookies.php`).
Its pack prices come from the Classics line in `research/lead-research-2026-04-30.md`: 8 = £6, 12 = £8.50, 20 = £12,
40 = £22. **Zainab still has to confirm these prices.** Product 513 (draft) is the Zookies line, not yet set up.

### Wanted but not built

- **Fruit flavour add-ins:** strawberry, blueberry, banana, others (extends the "Flavour" attribute)
- **Allergy-friendly:** handled as an on-request checkout note, not a separate variant attribute
- **Subscription:** preset-length recurring delivery so mums get fresh cookies regularly (high-LTV)
- **Gifting flow** (gift messages, send-to-recipient, gift cards)

## Audience and market

- Mums (breastfeeding and new mums) browsing on phones, late evening. The **gifting market** (baby showers, new-mum gifts, NHS/midwife-recommended gift baskets) is untapped and worth designing for.
- UK only, bootstrapped. B2B potential to be assessed. Pricing to be validated.
- Founder: Zainab. Founder name is not stated on the About page.
- Allergens: FSA-compliant labelling is required on product pages.

## Brand story (verbatim from About page)

> "My story with lactation cookies started when my friend started struggling with breastfeeding her newborn. At the time, we had no choice but to start making lactation cookies ourselves, praying that it would work for the sake of her baby and amazingly, it did! These cookies helped her milk supply almost immediately and I was so grateful to have been able to make her early motherhood days just a bit easier. Now I hope that I can do the same thing for you. Using natural, wholesome ingredients, everything is made with care and intention for breastfeeding mums and their new beautiful babies."

## Brand identity — captured from logo assets

### Palette (approximate hex extracted from logos; the exact tokens are in `theme-snapshot.json`)

| Role | Approx | Use |
|------|--------|-----|
| Primary coral pink | `#E68A95` (heading text + CTAs) | brand wordmark, taglines, primary buttons |
| Soft pink | `#F5C2C8` | logo circle background, hero band, large surfaces |
| Cream / parchment | `#FBF3DC` | page background, breathing room |
| Warm yellow | `#F5D050` | logo wordmark fill, bow accent, energy/sunshine moments |
| Cookie brown | `#8B6F4E` | product art, food photography supporting |
| Choc-chip charcoal | `#3A2E26` | body text, dark accents |

### Typography
- Theme snapshot: **Inter** (body) + **Fraunces** (headings/display)
- Logo wordmark uses a chunky display script (custom — embedded in logo image)

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
4. **QR-code marketing asset** — "SCAN FOR 10% OFF" handout (physical distribution: markets, mum events, NHS leaflets, baby fairs)

## Trust signals

- "Handmade in Birmingham"
- "Registered Food Business"
- "Free UK Delivery Over £35"
- "Loved by Breastfeeding Mums"
- 20% off first purchase promo
- Trustpilot reviews (4 × 5-star, TrustScore 4.0)

## Site information architecture

| Path | Purpose |
|------|---------|
| `/` | Home — hero + trust signals + 20%-off promo + footer |
| `/about/` | Founder story |
| `/shop/` | All products |
| `/product-category/cookies/` | Cookies |
| `/product-category/bites/` | Bites |
| `/contact/` | Contact form |
| `/cart/` | WooCommerce cart |
| `/product/lactation-cookies-8-pack/` | Single product page |

## Open content gaps on the SGS site

- Real ingredient-education copy (galactagogues — oats, brewer's yeast, flaxseed); mums research before buying
- Allergen labelling on the product page
- Footer "Quick Links" list needs real URLs

## Folder structure

```
sites/mamas-munches/
├── CLAUDE.md (this file)
├── accepted-differences.md
├── theme-snapshot.json            # per-client tokens (Spec 33)
├── .claude/plans/                 # site-specific plans
├── research/                      # brand/, photography/, palette + Trustpilot data, site screenshots
└── mockups/                       # design mockups (homepage, product)
```
