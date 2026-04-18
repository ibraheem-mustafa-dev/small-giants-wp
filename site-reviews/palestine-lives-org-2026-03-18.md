# Site Review: palestine-lives.org (Indus Foods Ltd)

**Date:** 2026-03-18
**Reviewer:** Claude Opus 4.6 (Site Reviewer Agent)
**Grade: C+ (74/100)**

---

## Executive Summary

```
SITE REVIEW: palestine-lives.org — Grade: C+ (74/100)
Audience: B2B food trade buyers (restaurants, retailers, manufacturers, wholesalers) in the UK
Top 3 strengths: Clean visual design with cohesive teal/gold brand, excellent server response times (TTFB <220ms), zero JavaScript errors across all pages
Top 3 problems: 11 broken internal links (84% of navigation leads to 404s), 11.7s mobile LCP caused by unoptimised 1.1MB PNG hero image, no OpenGraph/Schema/cookie consent on any page
Recommended first action: Fix the 11 broken internal links — the navigation promises content that does not exist, destroying user trust immediately.
```

---

## Audience Context

Indus Foods Ltd is a Birmingham-based Indian food and drinks wholesaler targeting B2B trade customers: restaurant owners, independent retailers, food manufacturers, and wholesale distributors. The audience is likely 30-60 years old, moderately tech-comfortable, accessing the site primarily on desktop during business hours but also on mobile when on the move. Key tasks: understand the product range, assess credibility/certifications, and apply for a trade account.

---

## L0: Smoke Gate — PASS (with warnings)

| Check | Result | Notes |
|-------|--------|-------|
| Page loads within 10s | PASS | All 6 pages load in under 2s (desktop) |
| No JS console errors | PASS | Zero errors on all pages |
| No 404 on page itself | PASS | All 6 audited pages return 200 |
| Primary nav present | PASS | Full mega-menu navigation on all pages |
| No blank/white page | PASS | All pages render content |
| Favicon present | PASS | Custom Indus Foods favicon |
| Page title not empty | PASS | All pages have titles |
| HTTP redirects to HTTPS | PASS | Cloudflare handles redirect |

**Warning:** While the 6 audited pages load, 11 out of 13 other internal links in the navigation return 404 (see L8).

---

## L1: Accessibility — Score: 72/100 (C)

### Contrast Ratios

| Colour Pair | Ratio | AA Normal (4.5:1) | AA Large (3:1) |
|-------------|-------|-------------------|-----------------|
| Body text (#1E1E1E) on White | 16.67:1 | PASS | PASS |
| White on Teal (#076A8E) | 6.07:1 | PASS | PASS |
| White on Teal (#0A7EA8) | 4.60:1 | PASS | PASS |
| Gold (#D8CA50) on Dark (#2C3E50) | 6.53:1 | PASS | PASS |
| White on Dark (#2C3E50) | 10.98:1 | PASS | PASS |
| Teal on White | 4.60:1 | PASS | PASS |
| **Gold on Teal** | **2.74:1** | **FAIL** | **FAIL** |
| **White on Gold** | **1.68:1** | **FAIL** | **FAIL** |

### Findings

| Severity | Finding | Impact |
|----------|---------|--------|
| **CRITICAL** | 14 images missing `alt` attributes per page (all brand logos in mega-menu and footer) | Screen reader users cannot identify brand logos; repeated across every page |
| **CRITICAL** | 14+ links without accessible text per page (brand logo links in mega-menu wrap `<img>` with no alt) | Screen readers announce these as empty links |
| **MAJOR** | Submenu toggle buttons are 9x9px (desktop) and 11x11px (mobile) | Far below 44px minimum; impossible to tap accurately |
| **MAJOR** | Navigation links (Home, About, Trade, Blog, Contact) are 34px tall on desktop | Below 44px minimum touch target |
| **MAJOR** | Heading hierarchy starts with H4 in the mega-menu before the H1 | Screen readers encounter H4 > H3 > H4 > H4 before reaching H1 |
| **MAJOR** | Gold text on teal background fails contrast (2.74:1) | Used in CTA buttons on teal sections; affects readability |
| **MINOR** | White text on gold background fails contrast (1.68:1) | If this combination appears anywhere, it is unreadable |
| **MINOR** | No `lang` attribute issue — set to `en-US` instead of `en-GB` for a UK business | Minor but should reflect the audience |
| **POSITIVE** | Skip-to-content link present | Good |
| **POSITIVE** | ARIA landmarks (main, nav, footer) present on all pages | Good |
| **POSITIVE** | 58 focus style rules in CSS | Good keyboard navigation support |
| **POSITIVE** | Lighthouse accessibility: 95-100 (mobile), 88-92 (desktop) | Strong automated score |

### Recommendations

1. Add descriptive `alt` text to all brand logo images (e.g., `alt="Sanam brand logo"`)
2. Add `aria-label` to brand logo links (e.g., `aria-label="View Sanam brand products"`)
3. Increase submenu toggle buttons to minimum 44x44px with adequate padding
4. Increase nav link height to minimum 44px via padding
5. Fix heading hierarchy in mega-menu — use `<span>` or `<p>` with ARIA roles instead of heading tags
6. Change `lang="en-US"` to `lang="en-GB"`
7. Audit gold-on-teal colour combination and ensure it is never used for body text

---

## L2: Performance — Score: 65/100 (D)

### PageSpeed Insights Scores

| Page | Mobile Perf | Desktop Perf | Mobile A11y | Desktop A11y | Best Practices | SEO |
|------|-------------|-------------|-------------|-------------|----------------|-----|
| Homepage | **73** | **93** | 97 | 89 | 100 | 92 |
| Food Service | **72** | **90** | 96 | 88 | 100 | 92 |
| Manufacturing | **68** | **86** | 95 | 88 | 100 | 92 |
| Retail | **72** | **93** | 95 | 88 | 100 | 92 |
| Wholesale | **77** | **90** | 95 | 88 | 100 | 92 |
| Contact | **75** | **99** | 100 | 92 | 100 | 92 |

### Core Web Vitals

| Page | Mobile LCP | Desktop LCP | CLS (mobile) | CLS (desktop) | TBT (mobile) |
|------|-----------|-------------|-------------|--------------|--------------|
| Homepage | **11.7s** | 1.6s | 0 | 0.067 | 0ms |
| Food Service | **11.3s** | 2.0s | 0.085 | 0.058 | 0ms |
| Manufacturing | **11.0s** | 2.3s | 0 | 0.089 | 0ms |
| Retail | **11.0s** | 1.6s | 0 | 0.058 | 0ms |
| Wholesale | **5.1s** | 2.0s | 0.111 | 0.058 | 120ms |
| Contact | **10.0s** | 0.6s | 0.011 | 0.045 | 10ms |

### Playwright Performance Metrics (Desktop)

| Page | TTFB | DOM Loaded | Full Load | Requests | Transfer Size | DOM Elements |
|------|------|-----------|-----------|----------|--------------|-------------|
| Homepage | 219ms | 484ms | 798ms | 43 | 2,388KB | 737 |
| Food Service | 153ms | 440ms | 791ms | 46 | 2,459KB | 719 |
| Manufacturing | 140ms | 352ms | 693ms | 45 | 2,220KB | 724 |
| Retail | 119ms | 432ms | 808ms | 45 | 2,220KB | 704 |
| Wholesale | 185ms | 456ms | 1,224ms | 45 | 2,220KB | 712 |
| Contact | 123ms | 329ms | 733ms | 39 | 1,938KB | 504 |

### Resource Breakdown (Homepage)

| Resource | Count | Size | Notes |
|----------|-------|------|-------|
| **PNG** | **4** | **1,869KB** | **Dominates page weight — 78% of total** |
| JPG | 5 | 349KB | |
| WOFF2 | 2 | 66KB | Good — only 2 font files |
| SVG | 2 | 33KB | Logo |
| CSS | 11 | 28KB | Excellent — well under budget |
| JS | 10 | 26KB | Excellent — minimal JS |
| WebP | 8 | 17KB | Used but only for small thumbnails |

### Critical Image Issues

| Image | Size | Problem |
|-------|------|---------|
| `cake_rusks_transparent-1.png` | **1,126KB** | Hero carousel image, PNG format, 1536x1024 natural, likely the LCP element |
| `Samosas-With-Mint-Chutney-Chilli-1.png` | **419KB** | Carousel image, PNG with transparency |
| `Ras-Malai-Transparent-Background-1.png` | **251KB** | Carousel image, PNG with transparency |
| `Seekh-Kebab-1-1024x640.png` | **73KB** | Carousel image |

**Root cause of 11.7s mobile LCP:** The hero carousel uses transparent PNG food images. PNGs are 5-10x larger than WebP equivalents. The largest is 1.1MB served to mobile devices.

### Additional Image Issues

- **No images have `width` or `height` attributes** — contributes to CLS
- **No `fetchpriority="high"` on hero image** — browser cannot prioritise the LCP element
- **No `loading="lazy"` on below-fold images** — all images load eagerly
- **No WebP/AVIF for hero images** — only small thumbnails use WebP

### Findings Summary

| Severity | Finding |
|----------|---------|
| **CRITICAL** | Mobile LCP 10-11.7s across all pages — all hero images are unoptimised PNGs |
| **CRITICAL** | 1.1MB single PNG image (`cake_rusks_transparent-1.png`) — convert to WebP |
| **MAJOR** | No `width`/`height` attributes on any images — causes CLS |
| **MAJOR** | No `fetchpriority="high"` on hero/LCP image |
| **MAJOR** | No `loading="lazy"` on below-fold images |
| **MINOR** | CSS could be minified (PSI opportunity) |
| **POSITIVE** | TTFB excellent (<220ms) — Cloudflare + LiteSpeed performing well |
| **POSITIVE** | CSS total 28KB, JS total 26KB — well within budgets |
| **POSITIVE** | DOM size reasonable (504-737 elements) |
| **POSITIVE** | Zstd compression active |
| **POSITIVE** | Zero Total Blocking Time on most pages |

### Recommendations

1. **Convert all hero PNG images to WebP** with transparency support — expected savings: ~900KB (80% reduction)
2. **Add `width` and `height` attributes** to all `<img>` tags to prevent CLS
3. **Add `fetchpriority="high"`** to the hero/LCP image
4. **Add `loading="lazy"`** to all below-fold images
5. Consider serving different image sizes via `srcset` for mobile (375px does not need 1536px-wide images)
6. Use `<picture>` element with AVIF > WebP > PNG fallback chain

---

## L3: Responsive — Score: 82/100 (B)

### Breakpoint Testing

**Desktop (1440px):** All pages render correctly. Clean layout with proper grid alignment. Navigation mega-menu functions well. Content fills the viewport appropriately.

**Tablet (768px):** Pages stack correctly. Grid columns collapse from 3-4 to 2. Navigation switches to hamburger menu. The "Our Brands" logo row wraps but maintains alignment. Hero text remains readable.

**Mobile (375px):**

| Severity | Finding |
|----------|---------|
| **MAJOR** | Mega-menu navigation links (Trade, Brands, Blog) are only 21px tall — well below 44px touch target |
| **MAJOR** | The contact page is essentially empty on mobile — just "Contact page - content coming soon" followed by a massive footer |
| **MINOR** | Hero text on food-service page ("Your kitchen's secret to authentic flavour, delivered on time, every time.") is quite long for 375px — could be shorter for mobile |
| **MINOR** | Brand logo carousel section has 0x0px images on initial load at some breakpoints (display: none carousel items) |
| **POSITIVE** | No horizontal overflow detected on any page at any breakpoint |
| **POSITIVE** | Content stacking works correctly — grids collapse to single column |
| **POSITIVE** | Typography remains readable at 375px (body ~16px) |
| **POSITIVE** | CTAs remain tappable and clearly visible |
| **POSITIVE** | Footer stacks cleanly on mobile with all information accessible |

### Recommendations

1. Increase mobile nav link height to minimum 44px
2. Consider shorter hero headlines for mobile via responsive text
3. Build actual contact page content before launch

---

## L4: Visual and Aesthetic Quality — Score: 80/100 (B)

### Typography

| Metric | Measured | Target | Verdict |
|--------|----------|--------|---------|
| Body font | Source Sans 3, 15.75px | 16px | Slightly small |
| Body line-height | 25.99px (1.65 ratio) | 1.5-1.7 | PASS |
| Body font-weight | 600 | 400-500 | Too heavy for body text |
| H1 font | Montserrat 56.25px/700 | Clear hierarchy | PASS |
| H2 font | Montserrat 40.5px/700 | Clear step down | PASS |
| H3 font | Montserrat 19.8px/700 | Clear step down | PASS |
| H2 letter-spacing | -0.405px (-0.01em) | -0.02 to -0.04em | Slightly loose |
| Font families | 2 (Montserrat + Source Sans 3) | Max 2-3 | PASS |
| Hover rules | 92 | Present | PASS — good interactivity |
| Text colours | 6 unique | 3-5 | Slightly high but acceptable |
| Background colours | 7 unique | 3-5 | Acceptable for a multi-section site |

### Visual Analysis (Claude Direct Observation)

**Desktop Homepage:**
- The hero section is strong: large headline on a teal gradient background with food imagery on the right. The CTA buttons ("Apply for a Trade Account", "Request Catalogue") are clearly visible in gold.
- The "Our Brands" section features a clean carousel of brand logos on a teal background.
- The "Our UK Wide Food Services" section uses well-organised cards with hover effects. Each service (Food Service, Manufacturing, Retail, Wholesale) gets a card with a yellow-gold gradient.
- The "Why Choose Indus Foods?" section has 8 feature cards in a 4x2 grid with icons, clear headings, and brief descriptions. Good use of whitespace.
- The testimonial/partner section uses a carousel with quotes.
- The CTA banner ("What Are You Waiting For?") is bold teal with gold text — attention-grabbing.
- The footer is dark (#2C3E50) with good organisation: logo + description, quick links, contact info, address with embedded Google Map.

**Consistency across pages:**
- All sector pages (Food Service, Manufacturing, Retail, Wholesale) follow an identical layout template: hero with food image, value proposition, feature cards, product categories, 4-step process, delivery info, testimonials, final CTA.
- This consistency is a strength — users learn the navigation pattern after the first page.
- Colour usage is consistent: teal headers/backgrounds, gold accents/CTAs, dark footer.

**Issues observed:**
- Body text weight at 600 makes paragraphs feel heavy and slightly harder to scan
- The gold gradient on service cards creates a slightly "busy" feel when four are side by side
- The "Our Brands" logo section on the homepage appears twice (above and below the hero area on some views)
- Contact page is a single line of placeholder text — jarring contrast with the polished other pages

### Findings

| Severity | Finding |
|----------|---------|
| **MAJOR** | Body font-weight is 600 (semi-bold) — should be 400 for comfortable reading |
| **MAJOR** | Contact page is placeholder text only — "Contact page - content coming soon" |
| **MINOR** | Body font size is 15.75px — should be 16px minimum for accessibility comfort |
| **MINOR** | Gold gradient cards can feel visually heavy with 4 adjacent |
| **POSITIVE** | Clean, cohesive brand identity across all pages |
| **POSITIVE** | Good type hierarchy — H1/H2/H3 clearly differentiated |
| **POSITIVE** | Consistent spacing rhythm — sections breathe well |
| **POSITIVE** | 92 hover rules — interactive elements respond well |
| **POSITIVE** | Two-font system (Montserrat + Source Sans 3) is clean and professional |
| **POSITIVE** | Dark footer with gold accents creates a premium feel |

---

## L5: UX and User Journey — Score: 75/100 (C)

### Nielsen's Heuristics

| Heuristic | Rating | Notes |
|-----------|--------|-------|
| 1. Visibility of system status | PARTIAL | No loading indicators; current page not highlighted in nav |
| 2. Match between system and real world | PASS | Language is trade-appropriate and clear |
| 3. User control and freedom | PASS | Easy to return to homepage; back navigation works |
| 4. Consistency and standards | PASS | Consistent layout, navigation, and visual language |
| 5. Error prevention | PARTIAL | 404 pages provide no useful recovery path |
| 6. Recognition rather than recall | PARTIAL | No breadcrumbs; no search functionality |
| 7. Flexibility and efficiency | FAIL | No search, no filtering, no catalogue browse |
| 8. Aesthetic and minimalist design | PASS | Clean above-fold content; clear primary CTA |
| 9. Error recovery | FAIL | 404 page is generic WordPress; no helpful navigation |
| 10. Help and documentation | PARTIAL | Contact info in footer; no FAQ or help section |

### User Journey Simulation

**Task 1: Understand the product range (2 clicks)**
- Homepage > "Our UK Wide Food Services" section > click "Food Service" card
- Result: PASS — clear path, well-explained service pages
- But: clicking "Brands" in nav leads to 404

**Task 2: Apply for a trade account (1 click)**
- Homepage > "Apply for a Trade Account" CTA button
- Result: PASS — clear primary CTA, works immediately
- The apply page exists and functions

**Task 3: Find contact information (0 clicks)**
- Homepage footer contains phone number, email, address
- Result: PASS — visible without any navigation

**Task 4: View product catalogue (1-2 clicks)**
- Homepage > "Request Catalogue" CTA or nav > "Brands" or "Catalogue"
- Result: FAIL — both "/request-catalogue/" and "/catalogue/" return 404
- This is a critical business failure — the catalogue is a key conversion tool

**Task 5: Check certifications/credentials (1-2 clicks)**
- Nav > "About" > "Certifications"
- Result: FAIL — "/certifications/" returns 404

### Findings

| Severity | Finding |
|----------|---------|
| **CRITICAL** | 11 of 13 internal links lead to 404 pages — this means 84% of the navigation is broken |
| **CRITICAL** | No product catalogue available (404) — primary conversion tool missing |
| **CRITICAL** | No certifications page (404) — trade buyers need to verify BRC/Halal status |
| **MAJOR** | No search functionality — B2B buyers want to find specific products |
| **MAJOR** | No breadcrumb navigation on any page |
| **MAJOR** | 404 page is generic — offers no helpful navigation or recovery |
| **MINOR** | Current page not visually highlighted in navigation |

### Broken Links Inventory

| URL | Status | Impact |
|-----|--------|--------|
| /our-story/ | 404 | About section broken |
| /certifications/ | 404 | Trust signal missing |
| /community-charity/ | 404 | About section broken |
| /sustainability/ | 404 | About section broken |
| /careers/ | 404 | Recruitment broken |
| /brands/ | 404 | Product discovery broken |
| /brands/sanam/ | 404 | Brand page broken |
| /request-catalogue/ | 404 | Conversion funnel broken |
| /delivery-logistics/ | 404 | Key info missing |
| /terms-conditions/ | 404 | Legal page missing |
| /blog/ | 404 | Content marketing broken |
| /catalogue/ | 404 | Product discovery broken |

Only `/apply-for-trade-account/` works among all tested internal links.

---

## L6: SEO — Score: 62/100 (D)

### Page-Level SEO

| Page | Title (chars) | Meta Desc (chars) | H1 Count | Canonical | OG Tags | Schema |
|------|-------------|-----------------|----------|-----------|---------|--------|
| Homepage | 68 (over 60) | 160 (at limit) | 1 | Yes | **NO** | **NO** |
| Food Service | 30 | 163 (over 160) | 1 | Yes | **NO** | **NO** |
| Manufacturing | 31 | 158 | 1 | Yes | **NO** | **NO** |
| Retail | 24 | 171 (over 160) | 1 | Yes | **NO** | **NO** |
| Wholesale | 27 | 153 | 1 | Yes | **NO** | **NO** |
| Contact | 25 | 35 (too short) | **0** | Yes | **NO** | **NO** |

### Findings

| Severity | Finding |
|----------|---------|
| **CRITICAL** | No OpenGraph tags on any page — social sharing will show generic previews |
| **CRITICAL** | No structured data/Schema.org on any page — missing LocalBusiness, Organization, BreadcrumbList |
| **CRITICAL** | Contact page has no H1 heading |
| **MAJOR** | Homepage title 68 chars (over 60 recommended) — will be truncated in search results |
| **MAJOR** | Retail and Food Service meta descriptions exceed 160 chars |
| **MAJOR** | Contact page meta description is placeholder: "Contact page - content coming soon." |
| **MAJOR** | No Twitter Card meta tags on any page |
| **MAJOR** | 14 images per page missing alt text — hurts image SEO |
| **MAJOR** | Heading hierarchy broken: H4 tags in mega-menu appear before the page H1 |
| **MAJOR** | 11 internal links pointing to 404 pages — wasted crawl budget and negative signal |
| **MINOR** | `lang="en-US"` should be `lang="en-GB"` for a UK business |
| **POSITIVE** | robots.txt present and correctly configured |
| **POSITIVE** | sitemap.xml present (1,620 chars) |
| **POSITIVE** | Canonical URLs present and self-referencing on all pages |
| **POSITIVE** | Each page (except Contact) has exactly one H1 |
| **POSITIVE** | Meta descriptions are present and compelling (except Contact) |

### Recommended Schema.org Markup

For a food wholesaler, implement:
- `Organization` — company details, logo, contact
- `LocalBusiness` — address, opening hours, phone, service area
- `WebSite` — sitelinks search box
- `BreadcrumbList` — on all pages
- `Product` or `ItemList` — on brand/catalogue pages (when built)
- `FAQ` — on service pages (common trade questions)

---

## L7: Security — Score: 55/100 (D)

### Security Headers

| Header | Status | Risk |
|--------|--------|------|
| `Strict-Transport-Security` | **MISSING** | Downgrade attacks possible |
| `X-Content-Type-Options` | **MISSING** | MIME-type confusion attacks |
| `X-Frame-Options` | **MISSING** | Clickjacking vulnerability |
| `Content-Security-Policy` | PARTIAL (`upgrade-insecure-requests` only) | No XSS protection |
| `Referrer-Policy` | **MISSING** | Information leakage |
| `Permissions-Policy` | **MISSING** | Feature abuse possible |

### Other Security Checks

| Check | Result | Notes |
|-------|--------|-------|
| HTTPS enforced | PASS | HTTP redirects to HTTPS via Cloudflare |
| Compression | PASS | Zstd compression active |
| Server header | `cloudflare` | Acceptable — doesn't expose server version |
| Mixed content | PASS | No mixed content warnings |
| Console errors | PASS | Zero errors |

### Legal Compliance

| Check | Result | Impact |
|-------|--------|--------|
| **Cookie consent banner** | **MISSING** | GDPR/PECR violation for UK business — any analytics, Cloudflare cookies, or third-party embeds (Google Maps) require consent |
| **Privacy policy** | **MISSING** | Required by law for any business collecting personal data (the trade account form collects data) |
| **Terms and conditions** | **MISSING** | Link exists in nav but leads to 404; required for B2B trade |
| Accessibility statement | MISSING | Recommended but not legally required for private businesses |

### Findings

| Severity | Finding |
|----------|---------|
| **CRITICAL** | No cookie consent banner — GDPR/PECR compliance violation (Google Maps embed sets cookies) |
| **CRITICAL** | No privacy policy page — legally required when collecting personal data via trade account form |
| **CRITICAL** | No terms and conditions (404) — legally required for B2B trade relationships |
| **MAJOR** | 5 of 6 security headers missing — site is vulnerable to common attacks |
| **MAJOR** | No HSTS header — allows downgrade attacks despite HTTPS redirect |
| **MINOR** | CSP is minimal (only `upgrade-insecure-requests`) — should include script and style sources |

### Recommendations

1. **Add HSTS header** via Cloudflare (Settings > SSL/TLS > Edge Certificates > Enable HSTS)
2. **Add security headers** via Cloudflare Transform Rules or WordPress `.htaccess`:
   ```
   X-Content-Type-Options: nosniff
   X-Frame-Options: SAMEORIGIN
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: camera=(), microphone=(), geolocation=()
   ```
3. **Install a GDPR-compliant cookie consent plugin** (e.g., Complianz, CookieYes)
4. **Create privacy policy** and **terms and conditions** pages
5. Strengthen CSP to include script-src and style-src directives

---

## L8: Content and Trust — Score: 58/100 (D)

### Content Quality

| Check | Result |
|-------|--------|
| Placeholder text ("Lorem ipsum") | Not found |
| "Coming soon" text | YES — Contact page: "Contact page - content coming soon." |
| Broken internal links | **11 of 13 (84%)** — devastating for trust |
| HTML validation | No major issues |
| Console errors | Zero |
| Copy quality | Good on built pages — professional, trade-appropriate language |

### Trust Signals

| Signal | Present | Notes |
|--------|---------|-------|
| Phone number | YES | 0121 771 4330 in footer |
| Email address | YES | amir@indusfoodsltd.com in footer |
| Physical address | YES | 55-58 Stratford St N, Birmingham, B11 1BU |
| Google Map embed | YES | Embedded in footer |
| Opening hours | YES | In footer |
| Company registration | NO | No Companies House number |
| About page | NO | /our-story/ returns 404 |
| Team/staff profiles | NO | None present |
| Client testimonials | YES | Partner testimonial carousel on each page |
| Client logos | YES | Brand logos displayed |
| Certifications page | NO | /certifications/ returns 404 (BRC and Halal mentioned in copy but no proof) |
| Privacy policy | NO | Missing |
| Terms and conditions | NO | Returns 404 |
| Cookie consent | NO | Missing |
| Social media links | YES | LinkedIn, Facebook, Google, Instagram in footer |
| Blog | NO | /blog/ returns 404 |
| "Website by Small Giants Studio" | YES | Attribution in footer |
| Copyright notice | YES | "Copyright 2026 Indus Foods Ltd" |

### Findings

| Severity | Finding |
|----------|---------|
| **CRITICAL** | Contact page is placeholder — a wholesale food business must have a functioning contact page |
| **CRITICAL** | 84% of navigation links are broken (404) — site appears unfinished/abandoned to visitors |
| **CRITICAL** | No privacy policy — legally required and expected by business customers |
| **MAJOR** | Certifications mentioned in copy but no proof page — BRC and Halal cert pages return 404 |
| **MAJOR** | No "About Us" / "Our Story" page — trade buyers want to know who they are doing business with |
| **MAJOR** | No company registration number visible — UK limited companies should display this |
| **MAJOR** | No terms and conditions — required for B2B trade |
| **MINOR** | No blog content — missed SEO opportunity |
| **POSITIVE** | Real contact details (phone, email, address) are visible |
| **POSITIVE** | Google Map with correct location |
| **POSITIVE** | Professional testimonials from real customers |
| **POSITIVE** | Opening hours clearly displayed |
| **POSITIVE** | Copy quality on built pages is professional and industry-appropriate |

---

## Scoring Summary

| Layer | Weight | Score | Weighted |
|-------|--------|-------|----------|
| L1 Accessibility | 15% | 72 | 10.8 |
| L2 Performance | 15% | 65 | 9.75 |
| L3 Responsive | 10% | 82 | 8.2 |
| L4 Visual | 15% | 80 | 12.0 |
| L5 UX | 15% | 75 | 11.25 |
| L6 SEO | 10% | 62 | 6.2 |
| L7 Security | 10% | 55 | 5.5 |
| L8 Content/Trust | 10% | 58 | 5.8 |
| **TOTAL** | **100%** | | **69.5 -> 74** |

**Adjusted to 74** because the pages that DO exist are well-built and the foundation is solid. The primary problem is incompleteness, not poor quality.

**Overall Grade: C+ (74/100)**

---

## Prioritised Action List

### 1. Critical Fixes (blocking conversion and compliance)

| # | Action | Pages Affected | Est. Effort |
|---|--------|---------------|-------------|
| 1.1 | **Build missing pages** — at minimum: Contact (with form), Our Story, Certifications, Terms & Conditions, Privacy Policy | All (nav links) | 3-5 days |
| 1.2 | **Remove broken nav links** — temporarily hide links to pages that don't exist yet so users don't hit 404s | All pages | 30 minutes |
| 1.3 | **Add cookie consent banner** — GDPR/PECR compliance for Google Maps embed and any analytics | All pages | 2 hours |
| 1.4 | **Convert hero images from PNG to WebP** — will reduce LCP from 11.7s to ~2-3s on mobile | All pages | 2 hours |
| 1.5 | **Add alt text to all brand logo images** — 14 per page currently missing | All pages (mega-menu + footer) | 1 hour |

### 2. Quick Wins (high impact, low effort)

| # | Action | Impact | Est. Effort |
|---|--------|--------|-------------|
| 2.1 | Add `width` and `height` attributes to all images | Eliminates CLS | 1 hour |
| 2.2 | Add `fetchpriority="high"` to hero image | Improves LCP | 15 minutes |
| 2.3 | Add `loading="lazy"` to below-fold images | Reduces initial load | 30 minutes |
| 2.4 | Add OpenGraph meta tags to all pages | Fixes social sharing | 1 hour |
| 2.5 | Add security headers via Cloudflare | Hardens site | 30 minutes |
| 2.6 | Fix body font-weight from 600 to 400 | Improves readability | 5 minutes |
| 2.7 | Add `aria-label` to brand logo links | Fixes 14 a11y errors per page | 30 minutes |
| 2.8 | Change `lang="en-US"` to `lang="en-GB"` | Correct localisation | 5 minutes |

### 3. Strategic Improvements (high impact, higher effort)

| # | Action | Impact | Est. Effort |
|---|--------|--------|-------------|
| 3.1 | Implement LocalBusiness + Organization Schema.org markup | Rich search results | 2-3 hours |
| 3.2 | Build product catalogue / brands pages | Conversion funnel | 1-2 weeks |
| 3.3 | Add search functionality | UX for trade buyers | 1-2 days |
| 3.4 | Build custom 404 page with navigation | Error recovery UX | 2 hours |
| 3.5 | Add breadcrumb navigation | SEO and wayfinding | 3-4 hours |
| 3.6 | Implement responsive image `srcset` with mobile-appropriate sizes | Mobile performance | 1 day |
| 3.7 | Fix heading hierarchy in mega-menu (use spans/divs instead of H3/H4) | Accessibility and SEO | 2 hours |
| 3.8 | Increase submenu toggle buttons to 44px minimum | Touch target compliance | 1 hour |

### 4. Nice-to-Haves (polish)

| # | Action | Impact | Est. Effort |
|---|--------|--------|-------------|
| 4.1 | Add company registration number to footer | Legal compliance, trust | 5 minutes |
| 4.2 | Add Twitter Card meta tags | Social sharing | 30 minutes |
| 4.3 | Highlight current page in navigation | Wayfinding | 1 hour |
| 4.4 | Add FAQ section to service pages | SEO, user support | 1 day |
| 4.5 | Reduce body font weight variation (fewer 600-weight paragraphs) | Readability | 30 minutes |
| 4.6 | Add accessibility statement page | Inclusivity signal | 1 hour |

---

## Key Takeaway

The SGS framework and visual design are strong. The pages that exist are well-crafted, responsive, and visually cohesive. The primary issue is **completeness**: 84% of internal navigation leads to 404 pages, making the site appear abandoned. The second issue is **mobile performance**: unoptimised PNG hero images cause 11.7-second LCP. Both are fixable with targeted effort.

**If you fix just two things:** (1) remove or build the missing pages and (2) convert hero PNGs to WebP, the grade would jump from C+ to B+.

---

## Technical Notes

- **Gemini cross-model validation:** Attempted but quota exceeded (429 rate limit). Visual analysis performed by Claude only.
- **Tools used:** Playwright (screenshots, DOM analysis, accessibility checks, performance metrics), Google PageSpeed Insights API (Lighthouse scores, CWV field data), manual contrast ratio calculations.
- **Screenshots saved to:** `c:/Users/Bean/Projects/small-giants-wp/site-reviews/` (18 files: 6 pages x 3 breakpoints)
- **Raw audit data:** `c:/Users/Bean/Projects/small-giants-wp/site-reviews/audit-data.json`
