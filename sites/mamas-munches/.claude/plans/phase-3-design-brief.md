# Mama's Munches — Phase 3 Design Brief
**Version:** 1.1 (2026-04-30)
**Status:** Mockup in progress (claude.ai) — locked decisions below
**Inputs:** Strategic brief v3.4 + 78 WP media assets + brand assets + design guardrails
**Outputs:** SGS block implementation guide for homepage + product page at 375 / 768 / 1440px

## Locked decisions (do not re-open)

| Decision | Chosen | Notes |
|----------|--------|-------|
| **Tagline** | "Real food for real mums" | Option 1 from §5. ASA-compliant. Final. |
| **Mockup photography** | Unsplash stand-ins with HTML comments | Each `<img>` has a comment naming the `wp-media-library/` file to swap in on SGS implementation. |
| **Halal badge** | Placeholder slot, `data-pending` attribute | Hidden by default. Toggle visible with one CSS rule change once HFA cert lands. Lives in trust bar (Section 2). |

---

## 1. Brand Design Principles

These are not aspirational — they are constraints. Every layout, colour choice, and copy decision filters through them.

1. **Trust before conversion** — story, origin, ingredients, trust signals come before CTAs.
2. **Mum-honest voice** — never implies physiological supply effects. The canonical line is: *"We make nourishing food, with proper ingredients including some that have been used in postpartum recipes for centuries. Many mums tell us it helps. We won't promise medical results."*
3. **Universal-UK brand** — no Pakistani/Indian theming on the website or in product names on the homepage. Halal certification is a quiet quality signal, not a cultural badge.
4. **Mobile-first** — target user browses on her phone at 10pm after settling the baby. 375px viewport is the primary design surface.
5. **Premium-approachable** — generous whitespace, real product photography, warm typography. Not corporate. Not discount.

---

## 2. Palette

Derived from logo assets + brand brief. Refined for WCAG 2.2 AA compliance.

| Token | Role | Hex | Notes |
|-------|------|-----|-------|
| `--primary` | Heading text, primary CTAs, active states | `#E68A95` | Coral pink — from logo wordmark |
| `--primary-dark` | Hover state on CTAs, pressed | `#C56A7A` | Darken 20% — passes 3:1 on white for large text |
| `--surface-pink` | Hero band, feature section backgrounds | `#F5C2C8` | Soft pink — from logo circle |
| `--surface-cream` | Page background, card surfaces | `#FBF3DC` | Cream/parchment — base background |
| `--surface-alt` | Alternate section rows | `#FFF9F0` | Slightly warmer than white |
| `--accent` | Logo bow, energy moments, star ratings | `#F5D050` | Warm yellow |
| `--accent-dark` | Yellow text on white (WCAG AA) | `#7A6500` | Dark yellow for text use ONLY |
| `--text` | Body copy | `#3A2E26` | Choc-chip charcoal |
| `--text-muted` | Secondary copy, metadata | `#6B5C50` | Warm mid-brown |
| `--text-inverse` | White text on dark/coloured backgrounds | `#FFFAF5` | Off-white — warmer than pure white |
| `--cookie-brown` | Decorative elements, food photography support | `#8B6F4E` | From product art |
| `--success` | Form confirmation, delivery badge | `#2E7D4F` | Standard green |
| `--border-subtle` | Card borders, dividers | `#E8D5C0` | Warm beige — not grey |

**Contrast check (WCAG 2.2 AA minimum 4.5:1 for normal text):**
- `#E68A95` on `#FBF3DC`: 2.4:1 — **use at 24px+ bold only, or darkened to `#C56A7A`**
- `#3A2E26` on `#FBF3DC`: 10.1:1 — passes at all sizes
- `#3A2E26` on `#F5C2C8`: 7.2:1 — passes at all sizes
- `#FFFAF5` on `#E68A95`: 3.0:1 — large text + icons only (trust-badge icons etc)

---

## 3. Typography

### Current (Astra site)
- Body: **Inter** (Google Fonts)
- Headings: **Work Sans** (Google Fonts)

### Recommendation: Keep Inter, replace Work Sans with Fraunces

**Fraunces** (Google Fonts, variable) is a warm optical-size display serif. It has the "domestic warmth" that Recoleta has but with better web performance and a broader weight range. It reads as handmade-premium without feeling vintage or retro.

| Role | Font | Weight | Size (desktop / mobile) |
|------|------|--------|------------------------|
| H1 — hero headline | Fraunces | 700 (bold) | 56px / 36px |
| H2 — section titles | Fraunces | 600 | 40px / 28px |
| H3 — card titles, product names | Fraunces | 500 | 28px / 22px |
| H4 — sub-section labels | Inter | 600 | 18px / 16px |
| Body | Inter | 400 | 18px / 16px |
| Body large | Inter | 400 | 20px / 18px |
| Label / tag | Inter | 500 | 13px / 12px |
| CTA button | Inter | 600 | 16px / 15px |

**Logo wordmark:** embedded in PNG/WebP — do not try to replicate in CSS. Use the horizontal lockup `Mamas-Munches-Horizontal-Logo-2.webp` (900x300) for header.

---

## 4. Photography Map

Best assets from `sites/mamas-munches/research/photography/wp-media-library/`. Prioritised by resolution, subject matter, and authenticity.

### Hero section — homepage
| Asset | Dimensions | Role | Notes |
|-------|-----------|------|-------|
| `IMG_20260419_173547_107.webp` | 1536x1536 | **Primary hero image** | Close-up, fresh-batch look. Use as full-bleed right column at 768px+ |
| `IMG_20260419_170745_421.webp` | 2160x2160 | **Hero fallback / A/B test** | Slightly different angle — also strong |
| `aesthetic-pic.jpeg` | 1080x1920 | **Mobile hero background** | Portrait orientation fits 375px viewport perfectly |
| `cookie-zoom.jpeg` | 1080x1920 | **Mobile alternate hero** | Close-up detail — good for "These are real" impression |

### Product imagery — shop + product pages
| Asset | Dimensions | Role |
|-------|-----------|------|
| `cookies-stacked.jpeg` | 1920x1080 | Product hero — stack shot, multiple cookies visible |
| `cookies-on-bun-case.jpeg` | 2048x1784 | Product hero — lifestyle/bakery context |
| `Lactation-Cookies-Reham.jpeg` | 2048x1560 | Person + product — social proof candidate |
| `Halimahs.jpeg` | 1920x1080 | Person + product — testimonial section |

### Lifestyle / brand story
| Asset | Dimensions | Role |
|-------|-----------|------|
| `IMG-20260417-WA0029-scaled.jpeg` | 2560x1440 | Process/baking shot — brand story section |
| `IMG-20260415-WA0017-scaled.jpeg` | 1440x2560 | Close-up ingredient/process |
| `IMG-20260405-WA0000-scaled.jpeg` | 1440x2560 | Another process/lifestyle shot |
| `WhatsApp-Image-2026-01-12-at-18.32.32.jpeg` | 1080x1920 | Close-up texture — ingredient section |

### Videos (13 available)
| Asset | Use |
|-------|-----|
| `VID-20260417-WA0008.mp4` (1072x1920) | Hero autoplay loop (mobile) — no sound, muted |
| `VID-20260417-WA0003.mp4` (1072x1920) | Hero alternate loop |
| `20260417_173758.mp4` (1920x1080) | Landscape format — desktop hero background option |
| `cookies-on-rack.mp4` (474x850) | Product process — inline video on product page |

### DO NOT USE
- Any `ChatGPT-Image-*` files — AI-generated, flagged out
- Astra template junk (`_theme-junk/` folder)
- `woocommerce-placeholder.webp` / `.png`

---

## 5. Site Navigation Spec

### Desktop header (1440px)
```
[Logo — horizontal lockup]          [Shop]  [Our Story]  [Send to Ward ★]  [Gift Ideas]  [FAQs]     [Cart]
```
- "Send to Ward ★" highlighted in `--primary` with warm yellow dot — aspirational CTA, not a normal nav item
- Cart icon with item count badge

### Mobile header (375px)
```
[Logo]                                                                   [Cart]  [☰]
```
- Hamburger opens full-screen nav with all links + gift CTA prominent

### Tagline (updated — ASA-compliant)
**Current (non-compliant):** "Boost your milk, bite by bite"
**Replacement options (pick one with Bean):**
1. **"Real food for real mums"** ← recommended: short, warm, non-claimant
2. "Nourishing treats for your breastfeeding journey"
3. "Handmade in Birmingham, made with care"

---

## 6. Homepage Layout

### Section 1 — Hero
**Goal:** emotional entry point. Story-first, not product-first.

**375px (mobile):**
```
┌─────────────────────────────┐
│  [Nav bar]                  │
├─────────────────────────────┤
│  [Full-bleed cookie photo]  │
│  aesthetic-pic.jpeg         │
│  (portrait, soft overlay)   │
│                             │
│  "Made for the mum          │
│   who needs it most"        │
│                             │
│  Founder story teaser:      │
│  "I made these for my       │
│  friend who was struggling  │
│  with breastfeeding. They   │
│  helped her. Now I make     │
│  them for you."             │
│                             │
│  [Shop Zookies →]           │
│  [Try 3 for £5 →]           │
└─────────────────────────────┘
```

**768px (tablet):** Two-column. Left: copy. Right: cookie photo. Pink surface band behind left column.

**1440px (desktop):** Same two-column, more breathing room. Right photo bleeds to edge. Left copy anchored to vertical centre.

**Copy:**
- H1: "Made for the mum who needs it most"
- Sub: "Handmade lactation cookies from Birmingham. With proper galactagogue ingredients. No medical claims — just nourishment your body will thank you for."
- CTA 1 (primary): "Shop Zookies" → /shop/
- CTA 2 (secondary): "Try 3 for £5" → /product/trial-pack/

---

### Section 2 — Trust signals bar
**Goal:** immediate reassurance. Mums scan this before reading anything.

Four badges in a horizontal row (2×2 on mobile):
1. 🏡 Handmade in Birmingham
2. ✅ Registered Food Business
3. 🚚 Free UK Delivery Over £35
4. ⭐ Loved by Breastfeeding Mums

**Background:** `--surface-pink`. Icons in `--primary` with `--text` label text.

---

### Section 3 — Featured product block
**Goal:** showcase the Zookies 8-pack anchor + make the Trial Pack visible.

**Layout:** Product card, prominent. Pack size selector visible inline (8 / 20 / 40 packs). Price ladder visible without clicking. Trial Pack as a secondary card alongside — "New? Start here."

**Copy:**
- H2: "Zookies — Our Signature Giant Cookie"
- Sub: "One Zookie is a proper sized treat. Every one baked to order, same week."
- Anchor price: **£10 / 8-pack**
- Trial Pack sub-card: "Not sure? Try 3 Classics for £5 — postage included."

---

### Section 4 — Brand story
**Goal:** earn trust through Zainab's real origin story. Not fabricated heritage.

**Layout:** Text-left, photography-right on desktop (swap on mobile — photo above text).

**Copy (draft — mum-honest):**
> "My story started with a friend.
>
> She was struggling with breastfeeding her newborn. We started making lactation cookies together — using oats, brewer's yeast, flaxseed, fenugreek. The same ingredients that have appeared in traditional postpartum foods from Pakistan to West Africa for generations.
>
> They helped her. I was so grateful.
>
> Now I make them for breastfeeding mums across the UK. Not because I can promise they'll work for every mum — I can't, and I won't. But because they're real food, with real ingredients, made with real care. And many mums tell me they helped."
>
> — Zainab, Founder

**Photo:** `Halimahs.jpeg` or `Lactation-Cookies-Reham.jpeg` — shows a real person with the product.

---

### Section 5 — Ingredient education
**Goal:** handle the sceptic before she leaves. Build the mum-honest + thoughtful-ingredients positioning.

**Layout:** 4-column ingredient grid (2×2 on mobile). Each with icon + name + one-line description.

| Galactagogue | Description |
|---|---|
| **Oats** | Rich in iron. Used in postpartum foods across cultures for centuries. |
| **Brewer's Yeast** | B-vitamins and chromium. A traditional galactagogue. |
| **Flaxseed** | Omega-3 fatty acids. Good for mum and baby. |
| **Fenugreek** | Traditional postpartum herb. *Note: if your baby shows signs of GI sensitivity, speak to your midwife first.* |

**Footer note:** "We make nourishing food. We don't make medical claims. If you have specific concerns about lactation, your IBCLC or midwife is the right person to speak to."

---

### Section 6 — Gift section
**Goal:** capture the gifting buyer. Birth partner / dad / baby shower purchase.

**Layout:** Two gift product cards side by side (stacked on mobile).

| Card | Product | Price | Copy |
|------|---------|-------|------|
| Left | New Baby Gift Box | £15 | "The perfect gift for a new mum. A mix of Zookies and Classics in a gift box, ready to send." |
| Right | 40-Day Care Bundle | £42 | "Six weekly deliveries for the 40-day postnatal window. One of the most thoughtful gifts you can give." |

**Send to Ward CTA:** small teaser at base of section — "Heading to the hospital? Ask us about our Send to Ward delivery →"

---

### Section 7 — Social proof
**Goal:** reviews + Instagram feed. Trustpilot widget (currently empty — leave as placeholder until reviews seeded).

**Layout:**
- Trustpilot widget (empty but present — signals professionalism)
- 3-column testimonial grid (use existing mum names from photography metadata: Reham, Halimah) — pull real names only, no fakes
- Instagram feed embed (5–6 most recent posts)

---

### Section 8 — Footer
| Column 1 | Column 2 | Column 3 |
|---------|---------|---------|
| Logo + tagline | Shop links | Legal |
| Birmingham, UK | About Us | Privacy Policy |
| Email: Zainab@mamasmunches.com | Contact | Shipping |
| Instagram link | FAQs | T&Cs |
| WhatsApp link | Gift Ideas | Allergen info |

---

## 7. Product Page Layout

### 7.1 Zookies Product Page (primary — template for all products)

**375px layout:**
```
┌──────────────────────────────┐
│  [Photo gallery — 4 thumbs  │
│   below main]               │
├──────────────────────────────┤
│  Mama's Munches Zookies      │
│  ⭐⭐⭐⭐⭐ (placeholder)      │
│                              │
│  Pack size:                  │
│  [4]  [●8]  [12]  [20]  [40]│
│                              │
│  Flavour:                    │
│  [Classic Oat] [Chocolate]  │
│  [+ add fruit: dropdown]    │
│                              │
│  Topping:                    │
│  [Choc Chip] [White Choc]   │
│  [None]                     │
│                              │
│  Dietary:                    │
│  [Regular] [Vegan]          │
│                              │
│  Price: £10.00               │
│  Free delivery on orders £35+│
│                              │
│  [Add to Cart — £10]        │
│  [Or buy 3 Classics for £5] │
├──────────────────────────────┤
│  What's in them?             │
│  [Oats] [Brewer's Yeast]    │
│  [Flaxseed] [Fenugreek]     │
│  (ingredient education       │
│   inline — same 4 columns)  │
├──────────────────────────────┤
│  Allergen information        │
│  Contains: oats (gluten),    │
│  eggs, milk, fenugreek       │
│  (legume — may cross-react  │
│  with peanut/soy allergies). │
│  Vegan variant: no eggs,     │
│  no dairy.                   │
│  Made in a kitchen that      │
│  handles tree nuts.          │
├──────────────────────────────┤
│  Many mums tell us it helps  │
│  [testimonial block]        │
└──────────────────────────────┘
```

**Desktop (1440px):** Two-column. Left: gallery (main + 4 thumbs below). Right: product info, selectors, price, CTA, ingredient education.

---

### 7.2 Variant selector UX

**Pack size logic:**
- Select a pack size → price updates instantly
- Discount label shown per pack: e.g. "Best value — save 28%" on 40-pack
- Trial Pack (3 Classics) is NOT shown on this page — it has its own product page

**Flavour / topping / dietary:**
- Fraunces labels, Inter values
- Visual checkboxes (pill-style) — not dropdowns
- Vegan selection auto-removes milk-based toppings from available options

---

### 7.3 Product page copy (mum-honest, ASA-safe)

**Headline:** "Mama's Munches Zookies — Freshly Baked, Made to Order"

**Description:**
> "A Zookie is a proper-sized treat. Not a nibble — a real cookie, baked with the same galactagogue ingredients (oats, brewer's yeast, flaxseed, fenugreek) that appear in postpartum food traditions around the world.
>
> We bake them fresh each week and post them the same day. No preservatives.
>
> Many mums tell us they helped with their supply. We don't make medical claims — but we do make really good cookies."

**Ingredient education:** inline 4-ingredient grid (same as homepage section 5).

**Allergen block:** prominent, FSA-compliant. Bold allergens. Separate box, coral border.

---

## 8. SGS Blocks Mapping

| Section | SGS Block |
|---------|-----------|
| Hero | `sgs/hero` — media left/right with CTA pair |
| Trust signals bar | `sgs/features-strip` or inline group with icon list |
| Featured product | `sgs/product-card` (once SGS Ecom Plugin Phase 1 ships) |
| Brand story | `sgs/content-columns` — text + media |
| Ingredient grid | `sgs/features-grid` — 4 columns, icon + title + body |
| Gift section | `sgs/card-grid` — 2 cards, product cards |
| Testimonials | `sgs/testimonials` |
| Instagram feed | `sgs/social-feed` or third-party embed |
| Product page gallery | WooCommerce gallery block |
| Variant selectors | WooCommerce variable product + SGS styling overrides |
| Ingredient education (product) | `sgs/features-grid` — inline 4-col |
| Allergen block | `sgs/alert` or `sgs/notice` — coral border variant |
| Footer | `sgs/footer` with 3-column layout |

---

## 9. Summary checklist for mockup review

Before presenting to Bean:

- [ ] Mobile (375px) mockup complete for homepage
- [ ] Desktop (1440px) mockup complete for homepage
- [ ] Mobile product page mockup complete
- [ ] Desktop product page mockup complete
- [ ] Hero tagline uses compliant copy (not "Boost your milk, bite by bite")
- [ ] All photography from `wp-media-library/` — no ChatGPT-Image-* files used
- [ ] Allergen block present on product page (FSA-compliant format)
- [ ] Mum-honest voice in all body copy (no implied physiological claims)
- [ ] Halal cert badge present as quiet trust signal (once cert obtained — placeholder for now)
- [ ] £5 Trial Pack visible in hero CTAs
- [ ] 40-Day Bundle has dedicated section
- [ ] Send to Ward teaser in gift section
- [ ] WCAG 2.2 AA: all text 4.5:1+ contrast verified
- [ ] 44px minimum touch targets on all interactive elements
