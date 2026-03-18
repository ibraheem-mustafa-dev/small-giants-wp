# Indus Foods Reference Site — Extraction Summary

**Reference site:** lightsalmon-tarsier-683012.hostingersite.com
**Extracted:** 2026-03-18
**Source:** WP-CLI direct extraction from server

---

## Site Identity

| Property | Value |
|---|---|
| Site name | Indus Foods Ltd |
| Site icon post ID | 1853 |
| Homepage post ID | **597** |
| Homepage post slug | home |
| Builder | Spectra (Ultimate Addons for Gutenberg) v2.19.20 |
| Theme | Astra + Astra Addon (Pro) v4.12.0 |
| Also active | Spectra Pro v1.2.8, SureForms v2.5.1 |

---

## Colour Palette (Astra Global Colours)

All sections use `var(--ast-global-color-N)` — never hardcoded hex.

| Token | Label | Hex | Usage |
|---|---|---|---|
| `--ast-global-color-0` | Theme Color | `#0a7ea8` | Primary blue — brands section bg, testimonials bg, footer CTA bg, link colour, button bg |
| `--ast-global-color-1` | Link Hover Color | `#d8ca50` | Yellow/gold — heading colour, Why Choose section bg |
| `--ast-global-color-2` | Heading Color | `#e7d768` | Light yellow — hero container background tint |
| `--ast-global-color-3` | Text Color | `#2c3e50` | Dark navy — body text, hero h1 colour |
| `--ast-global-color-4` | Background Color | `#2eade2` | Mid blue — unused directly on homepage |
| `--ast-global-color-5` | Extra Color 1 | `#FFFFFF` | White — button text, Retail/Wholesale heading colour |
| `--ast-global-color-6` | Extra Color 2 | `#F2F5F7` | Light grey — background |
| `--ast-global-color-7` | Extra Color 3 | `#424242` | Dark grey |
| `--ast-global-color-8` | Extra Color 4 | `#000000` | Black |

### SGS Mapping

| Astra token | SGS token name | Notes |
|---|---|---|
| `--ast-global-color-0` (#0a7ea8) | `primary` | Main brand blue |
| `--ast-global-color-1` (#d8ca50) | `accent` | Yellow/gold — headings, section backgrounds |
| `--ast-global-color-2` (#e7d768) | `accent-light` | Lighter yellow — hero bg tint |
| `--ast-global-color-3` (#2c3e50) | `text` | Dark navy body text |
| `--ast-global-color-5` (#FFFFFF) | `surface` | White |
| `--ast-global-color-6` (#F2F5F7) | `surface-alt` | Light grey |

**Confirmed:** The `indus-foods.json` style variation is correctly configured:
- `primary`: `#0A7EA8` — matches `--ast-global-color-0`
- `accent`: `#D8CA50` — matches `--ast-global-color-1`
- `accent-light`: `#E7D768` — matches `--ast-global-color-2`
- `text`: `#1E1E1E` — close to `--ast-global-color-3` (#2c3e50, slightly different)
- `border-subtle`: `#2EADE2` — matches `--ast-global-color-4`
- `surface`: `#FFFFFF` — matches `--ast-global-color-5`
- `surface-alt`: `#F8F7F4` — close to `--ast-global-color-6` (#F2F5F7)

**Minor discrepancy:** `text` in SGS is `#1E1E1E` vs reference `#2c3e50`. The reference uses a dark navy for body text; SGS uses near-black. Visually close but not exact — may want to update `text` token to `#2c3e50` in the style variation.

---

## Typography

| Property | Value | SGS equivalent |
|---|---|---|
| Heading font | Montserrat, sans-serif | `headings-font-family` → Montserrat |
| Heading weight | 700 | Bold |
| Body font | Source Sans Pro, sans-serif | `body-font-family` → Source Sans 3 (renamed) |
| Body weight | 400 | Regular |
| Body size | 18px (desktop, tablet, mobile) | `body-font-size` |

**Note:** Astra uses "Source Sans Pro" but the SGS indus-foods variation uses "Source Sans 3" — these are the same font, Google rebranded it.

---

## Header

| Property | Value |
|---|---|
| Layout | Logo left, primary menu centre |
| Logo width | Desktop: 350px, Tablet: 275px, Mobile: 175px |
| Transparent header | No |
| Sticky header | No |
| Logo file | `Indus-Foods-Ltd-Logo-Horizontal.png` (retina) |
| Logo URL | /wp-content/uploads/2025/12/Indus-Foods-Ltd-Logo-Horizontal.png |
| Above-header widget | Contact info widget (desktop + tablet only) |
| Mobile logo | Separate (smaller) |

**Note:** There is a contact info bar above the main header (widget area). Contains phone, email, and opening hours.

---

## Navigation Structure

### Primary Menu (slug: `menu`, locations: primary, mobile_menu)

```
Home
About
  ├── Our Story
  ├── Certifications
  ├── Community & Charity
  ├── Sustainability
  └── Careers
Sectors
  ├── Food Service
  ├── Manufacturing
  ├── Retail
  └── Wholesale
Brands
  └── Brands Mega Menu (#)   ← custom mega menu item
Trade
  ├── Apply for Trade Account
  ├── Request Catalogue
  ├── Delivery & Logistics
  └── Terms & Conditions
Blog
Contact
```

### Footer Quick Links (slug: `quick-links`)
Certifications · Trade · Brands · Delivery & Logistics · Terms & Conditions · Blog

### Contact Info Menu (slug: `contact-info`, 7 items)
- Call: 0121 771 4330 → tel:+441217714330
- Email: amir@indusfoodsltd.com → mailto:amir@indusfoodsltd.com
- Open Hours (#)
- Mon - Thur: 9:30am - 5pm (#)
- Friday - 9:30am–12pm, 2:30–5pm (#)
- Saturday 10am–3pm (#)
- Sunday Closed (#)

---

## Homepage Post ID: 597

**Block count:** 179 lines of block markup
**Block types used:**
- `uagb/container`: 24× — all layout/section wrappers
- `uagb/advanced-heading`: 9× — all headings + subheadings
- `uagb/info-box`: 8× — Why Choose icons
- `uagb/buttons-child`: 6× — CTA buttons
- `uagb/image`: 6× — hero banner, services section product images, testimonials decorative image
- `uagb/buttons`: 5× — button groups
- `uagb/image-gallery`: 1× — brand logos carousel
- `uagb/testimonial`: 1× — testimonials carousel

---

## Homepage Sections (in order)

### Section 1 — Hero
**Block:** `uagb/container` (tag: `<header>`, class: `hero-section`, width: `alignfull`)
**Layout:** Two-column row — left: text + CTAs, right: product image

**Hero container background:**
- Type: `color` + background image (SVG animation)
- Background image: `IndusFoods_Brand_Complete-Animation.svg` (animated brand illustration)
- Background colour: `var(--ast-global-color-2)` (#e7d768 — light yellow)

**H1 heading:** "Leading Indian Food & Drinks Wholesaler"
- Colour: `var(--ast-global-color-3)` (#2c3e50 — dark navy)
- Tag: `h1`
- Subheading toggle: true

**Subheading (paragraph):** "Proud to be a family-run food wholesaler since 1962!"

**CTAs (2 buttons, left-aligned):**
1. "Apply For A Trade Account" → /apply-for-trade-account/
   - Text colour: `var(--ast-global-color-1)` (#d8ca50 — gold)
   - Background: `var(--ast-global-color-8)` (#000000 — black)
2. "Request Our Catalogue" → /apply-for-trade-account/
   - Text colour: `var(--ast-global-color-5)` (#FFFFFF — white)
   - Background: `var(--ast-global-color-0)` (#0a7ea8 — primary blue)
   - Hover: text→blue, bg→white

**Hero right image:**
- File: `Indus-Foods-Banner.jpg` (tablet/mobile) / `Indus-Foods-Banner-1024x683.jpg` (desktop)
- URL: /wp-content/uploads/2025/11/Indus-Foods-Banner.jpg
- Alt: "Assorted colorful spices in metal bowls on rustic wooden table with fresh green chilies and garlic"
- Effect: zoom-in on hover

---

### Section 2 — Our Brands
**Block:** `uagb/container` (tag: `<div>`, width: `alignfull`)
**Background:** `var(--ast-global-color-0)` (#0a7ea8 — primary blue)

**H2 heading:** "Our Brands"
- Has separator/divider below

**Content:** `uagb/image-gallery` — brand logos in a tile/grid layout (tileSize: 183px)

**Brand logos (12 unique full-size images):**
1. `Sanam-Logo.jpg` — /wp-content/uploads/2025/11/Sanam-Logo.jpg
2. `Lemontree-Logo.jpg` — /wp-content/uploads/2025/11/Lemontree-Logo.jpg
3. `Green-Leaf-Logo.jpg` — /wp-content/uploads/2025/11/Green-Leaf-Logo.jpg
4. `Shan-Foods.jpg` — /wp-content/uploads/2025/11/Shan-Foods.jpg
5. `logo-07.webp` — /wp-content/uploads/2025/12/logo-07.webp
6. `logo-01-150x136-1.webp` — /wp-content/uploads/2025/12/logo-01-150x136-1.webp
7. `logo-02-150x136-1.webp` — /wp-content/uploads/2025/12/logo-02-150x136-1.webp
8. `logo-03-150x136-1.webp` — /wp-content/uploads/2025/12/logo-03-150x136-1.webp
9. `logo-04-150x136-1.webp` — /wp-content/uploads/2025/12/logo-04-150x136-1.webp
10. `logo-05-150x136-1.webp` — /wp-content/uploads/2025/12/logo-05-150x136-1.webp
11. `logo-06-150x136-1.webp` — /wp-content/uploads/2025/12/logo-06-150x136-1.webp
12. `Indus-Foods-Ltd-Square-Logo.webp` — /wp-content/uploads/2025/12/Indus-Foods-Ltd-Square-Logo.webp

---

### Section 3 — Our UK Wide Food Services
**Block:** `uagb/container` (tag: `<section>`, bg-type: `image`)
**Background image:** `bg-demo.png` — /wp-content/uploads/2025/11/bg-demo.png
**Background overlay:** present (white with opacity)

**H2 heading:** "Our UK Wide Food Services"

**Layout:** 4-column row (each column is a service card)
Each card contains: product image (zoom-in hover effect) + H3 heading + paragraph + outline button

| Service | Image file | H3 | Paragraph | Button label |
|---|---|---|---|---|
| Food Service | `Ras-Malai-Transparent-Background-1-e1766621574227.png` | Food Service | "Top quality ingredients, drinks and food ready to be served at venues or events" | "Top Ethnic Food Services" |
| Manufacturing | `cake_rusks_transparent-1.png` | Manufacturing | "Manufacturing high-quality, healthy and delicious food products." | "Food Manufacturer" |
| Retail | `Samosas-With-Mint-Chutney-Chilli-Full.webp` | Retail | "Our top-quality in-house brand food comes fast and in retail-ready packaging!" | "Food Retailer" |
| Wholesale | `Seekh-Kebab-1.png` | Wholesale | "Wide variety of quality food and drinks with reliable stock levels with fast delivery times." | "UK Food Wholesaler" |

**Service card styling:**
- Food Service & Manufacturing H3: `var(--ast-global-color-3)` (dark navy)
- Retail & Wholesale H3: `var(--ast-global-color-5)` (white) — cards have darker gradient bg
- Buttons are outline style (not filled), link to `#` (placeholder — need real URLs)
- Retail/Wholesale containers have gradient background type

---

### Section 4 — Why Choose Indus Foods?
**Block:** `uagb/container` (tag: `<div>`, width: `alignfull`)
**Background:** `var(--ast-global-color-1)` (#d8ca50 — gold/yellow)
**Background image overlay:** `ChatGPT-Image-Dec-18-2025-07_59_38-PM.png` (decorative food illustration, z-indexed behind content)

**H2 heading:** "Why Choose Indus Foods?"

**Layout:** 8 info-boxes in a grid (icon above title)
**Content (headings only — descriptions are placeholder lorem ipsum):**
1. Experience
2. Certifications
3. Delivery
4. Quality
5. Family Values
6. Brands
7. Support
8. White Labelling

**Note:** All 8 info-boxes currently use placeholder text "Click here to change this text. Lorem ipsum dolor sit amet..." — actual content not yet written. Icons are SVG icons from UAG.

---

### Section 5 — Testimonials ("Our Partners Love Us!")
**Block:** `uagb/container` (tag: `<div>`, width: `alignfull`)
**Background:** `var(--ast-global-color-0)` (#0a7ea8 — primary blue)

**H2 heading:** "Our Partners Love Us!"
- Has separator/divider below

**Layout:** 70/30 split — testimonials carousel left, decorative image right

**Testimonials (5 items, carousel/slider):**

| # | Author | Company | Quote (excerpt) |
|---|---|---|---|
| 1 | Sarah Mitchell | The Golden Spice Restaurant | "Indus Foods has been our trusted partner for over 5 years. Their consistent quality and reliable service make them stand out..." |
| 2 | John Doe | Company Name | "I have been working with these guys since years now! With lots of hard work and timely communication..." |
| 3 | John Doe | Company Name | Same placeholder text as #2 |
| 4 | John Doe | Company Name | Same placeholder text as #2 |
| 5 | John Doe | Company Name | Same placeholder text as #2 |

**Note:** Only item 1 has real content. Items 2–5 are placeholder. Reviewer images are brand logos.

**Decorative right image:** `ChatGPT-Image-Dec-18-2025-07_59_38-PM.png`
- z-index: -6 (behind text)
- Width: 30% desktop

---

## All Pages

| ID | Title | Slug | Status |
|---|---|---|---|
| 597 | Home | home | publish (HOMEPAGE) |
| 598 | Our Menu | our-menu | publish |
| 599 | About | about | publish |
| 600 | Gallery | gallery | publish |
| 601 | Contact | contact | publish |
| 1505 | Sectors | sectors | publish |
| 1506 | Brands | brands | publish |
| 1507 | Trade | trade | publish |
| 1508 | Blog | blog | publish |
| 1510 | Our Story | our-story | publish |
| 1511 | Certifications | certifications | publish |
| 1512 | Community & Charity | community-charity | publish |
| 1513 | Careers | careers | publish |
| 1514 | Apply for Trade Account | apply-for-trade-account | publish |
| 1515 | Request Catalogue | request-catalogue | publish |
| 1516 | Delivery & Logistics | delivery-logistics | publish |
| 1517 | Terms & Conditions | terms-conditions | publish |
| 1557 | Sanam | sanam | publish (brand page) |
| 1559 | Shan | shan | publish (brand page) |
| 1561 | Green Leaf | green-leaf | publish (brand page) |
| 1563 | Lemon Tree | lemon-tree | publish (brand page) |
| 2533 | Wholesale | wholesale | publish (sector) |
| 2568 | Retail | retail | publish (sector) |
| 2569 | Manufacturing | manufacturing | publish (sector) |
| 2570 | Food Service | food-service | publish (sector) |
| 2624 | Sustainability | sustainability | publish |
| 2781 | Accordion Test | accordion-test | publish (dev) |
| 2782 | Accordion Test | accordion-test-2 | publish (dev) |
| 2790–2794 | Sectors/Wholesale/Retail/Manufacturing/Food Service (v2) | *-2 | publish (v2 rebuild) |
| 3 | Privacy Policy | privacy-policy | draft |

**Key pages for migration (priority order):**
1. Home (597) — this document
2. About (599), Our Story (1510)
3. Sectors (1505) + 4 sector pages (Wholesale 2533, Retail 2568, Manufacturing 2569, Food Service 2570)
4. Brands (1506) + 4 brand pages (Sanam 1557, Shan 1559, Green Leaf 1561, Lemon Tree 1563)
5. Trade (1507) + sub-pages
6. Contact (601)

---

## Images to Download for Migration

All images need downloading from the reference server and uploading to palestine-lives.org media library.

**Critical (homepage):**
- Logo: `Indus-Foods-Ltd-Logo-Horizontal.png`
- Hero animation: `IndusFoods_Brand_Complete-Animation.svg`
- Hero banner: `Indus-Foods-Banner.jpg`
- Services bg: `bg-demo.png`
- Food Service product: `Ras-Malai-Transparent-Background-1-e1766621574227.png` (use original without size suffix)
- Manufacturing product: `cake_rusks_transparent-1.png`
- Retail product: `Samosas-With-Mint-Chutney-Chilli-Full.webp`
- Wholesale product: `Seekh-Kebab-1.png`
- Why Choose bg: `ChatGPT-Image-Dec-18-2025-07_59_38-PM.png`
- Brand logos: Sanam-Logo.jpg, Lemontree-Logo.jpg, Green-Leaf-Logo.jpg, Shan-Foods.jpg + 7× logo-0N-150x136-1.webp

---

## SGS Block Mapping (Homepage)

| Section | Ref block | SGS block | Notes |
|---|---|---|---|
| Hero | `uagb/container` + `uagb/advanced-heading` + `uagb/buttons` + `uagb/image` | `sgs/hero` | Standard 2-col hero. Check if hero has animated SVG bg support |
| Our Brands | `uagb/container` + `uagb/image-gallery` | `sgs/logo-grid` or `sgs/gallery` | Logo ticker/grid. Check `sgs/logo-grid` exists |
| Food Services | `uagb/container` (4-col) + `uagb/image` + `uagb/advanced-heading` + `uagb/buttons` | `sgs/card-grid` | 4 service cards with image, h3, description, CTA button |
| Why Choose | `uagb/container` + 8× `uagb/info-box` | `sgs/icon-grid` or `sgs/feature-grid` | 8 icon+title+desc tiles |
| Testimonials | `uagb/container` + `uagb/testimonial` | `sgs/testimonials` | Carousel + decorative image |

---

## Feature Gaps Observed

1. **Logo grid / brand ticker** — Spectra's `uagb/image-gallery` in tile mode acts as a brand logo gallery. SGS `sgs/gallery` may work but check if it has a logo-grid layout variant (equal-size tiles, greyscale on hover).
2. **Info-box with icon** — Spectra's `uagb/info-box` is an icon + heading + description + optional CTA. SGS may need `sgs/feature-card` or similar. Check DB.
3. **Animated SVG background** — Hero uses an SVG animation as background. This is CSS `background-image: url(.svg)` — SGS hero should support this via the backgroundImage attribute.
4. **Multi-column testimonials with side image** — The 70/30 split layout (testimonials left, decorative image right) is a specific layout pattern.
5. **Why Choose placeholder content** — The info-box descriptions are lorem ipsum. Real content needs to be written before migration.
6. **Service button links** — All 4 service card buttons link to `#`. Real URLs need to be assigned (/food-service/, /manufacturing/, /retail/, /wholesale/).
