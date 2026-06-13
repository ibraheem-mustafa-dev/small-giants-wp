---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline (design) → theme-thread (build)
title: "WooCommerce page-type SOLUTION + theme-thread delegation brief"
created: 2026-06-11
supersedes_input: WOOCOMMERCE-PAGE-TYPE-BRIEF-2026-06-11.md (that was the design INPUT; this is the resolved solution)
status: COMPLETE — Spec 30 fully shipped (D220, 2026-06-12). All phases (P1 PDP+cart / P2 differentiators / P3 shop / P4 schema) merged to main; Bean R-22-13 signed off; SGS is a sellable shop. FR-30-12 product-page clone ungated (cloning thread's call). This doc is the decision NARRATIVE (Part A rationale + research provenance) — superseded as a build spec by Spec 30.
decision_ref: D208
inputs: 3 research agents (WC block ecosystem 2026; shop/PDP UX best-practice; ecommerce schema completeness) + 6-persona adversarial-council (product-page naming) + the gap fact-check.
---

# WooCommerce page-type SOLUTION

## Plain-English summary (what we decided and why)

The Mama's product-page draft is a **WooCommerce product page**, not a homepage to re-author. WooCommerce already ships almost all of the shop machinery as native blocks — we lean on those and only custom-build the parts that make the brand feel different. Research corrected four of our assumptions: the cart drawer is already free, product search is NOT free, fake reviews are now illegal in the UK, and Google killed FAQ snippets. The decisions below reflect all of that.

---

## Part A — The 8 decisions (signed off 2026-06-11)

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| **D-1** | **Page vs product template** | A cloned product page targets WooCommerce's **single-product block template** (rendered via `is_product()` on a real `product` post), NOT a WP Page. | Only the product template gives add-to-cart binding, Product schema, canonical, and variation handling. A Page gives none of these. *This is the pipeline gate — see Part C.* |
| **D-2** | **Search + searchable filter** | **Custom SGS search + searchable-filter blocks.** | Not in WC core (only the paid Product Search extension). Building our own = framework asset, no recurring per-client licence, full brand control, reusable for every client. |
| **D-3** | **Variant configurator** | **Keep the SGS option-picker**, bound to WC variation data, writing the correct variation to cart via the **Store API**. | It's already built, brand-styled, and carries the differentiated UX (value-ladder pricing, coming-soon badges, % off) that WC's native (Beta) pills don't. |
| **D-4** | **Cart drawer** | **Use WooCommerce core's Mini-Cart slide-out drawer** (Blocks 10.1+, adjustable width) — style only. | Core already provides it. Building a bespoke drawer duplicates maintained core behaviour for no gain. *(Reverses the brief's "build the drawer" assumption.)* |
| **D-5** | **Reviews** | **Trustpilot (or verified-buyer) third-party reviews**, synced — never static/baked reviews. | UK DMCC Act (in force 6 Apr 2025) makes fake/incentivised-undisclosed reviews illegal; the trader displaying them is liable (fines up to £300k or 10% turnover). The draft's fake reviews are a legal liability, not a styling choice. |
| **D-6** | **Product gallery** | **Use WC core Product Gallery block** (variation-aware since 9.9; thumbnails + zoom). Accept it's still Beta. | Covers main image + click-to-swap thumbnail strip + variation image swap natively. Multi-image-per-variation still needs a plugin — out of scope for MVP. |
| **D-7** | **Add-to-cart chassis** | **Use WC core Add-to-Cart + Options block** as the cart-write chassis; the SGS option-picker drives selection on top of it (D-3). | Native Store-API cart binding is the safe, maintained path; don't rebuild the cart write. |
| **D-8** | **Schema** | Emit per Part B §Schema. **Drop FAQ schema** (Google retires it this month) and **drop SearchAction** (sitelinks searchbox retired Nov 2024). Product reviews CAN be self-marked (self-serving ban only hits Organization-level). | Google 2026 guidance; matches Merchant Center feed-consistency rule. |

### Hard rule carried from the council (unchanged)
Content-specific draft terms — `allergen-*`, `topping-dairy`, `trial-note`, `ingredients-*` — map to **generic** slots (`notice-banner` / `text` / `feature-grid`). They NEVER enter framework vocabulary (`slots.aliases` / `modifier_suffixes`). This is a content-vs-structure boundary, not a naming gap.

---

## Part B — Theme-thread BUILD brief (delegate this)

> **Scope:** the theme thread builds everything in this part. The cloning thread does NOT build templates. Build on `main` (or a `feat/wc-page-types` branch off main), commit by explicit path (cloning thread is co-active).

### B-1 — Theme support + templates
1. Declare `add_theme_support('woocommerce')` + the gallery supports (`wc-product-gallery-zoom`, `-lightbox`, `-slider`) in `theme/sgs-theme/functions.php`. *(Largely moot for a block theme's rendering, but it's the documented-correct declaration and it enables the classic-gallery fallbacks.)*
2. **Theme support must land WITH the templates**, not before — declaring it alone half-breaks WC's fallback rendering.
3. Provide Site-Editor-editable block templates that **override** WC's auto-injected defaults only where brand composition needs it:
   - `single-product.html` — the PDP composition (gallery + title/rating/price + SGS option-picker + add-to-cart + trust strip + content sections + reviews + related).
   - `archive-product.html` — the shop/category composition (Product Collection + Product Filters + SGS search + top/bottom SEO text).
   - Cart + Checkout — use core block templates; brand-style via the snapshot. Override the template only if composition demands it.
   - **My Account stays classic** (no block alternative exists in core) — style via CSS only, deferred, non-block. Bean-confirmed.

### B-2 — Native WC blocks to compose + style (do NOT rebuild)
- **Product Collection** (shop grid/query/sort/pagination) — style the card to brand.
- **Product Filters** (price / attribute / rating / stock) — compose into a **collapsible/toggle** container (see B-4).
- **Product Gallery** (D-6) — main + thumbnails + zoom; variation-aware.
- **Add to Cart + Options** (D-7) — the cart-write chassis under the SGS option-picker.
- **Cart + Checkout + Mini-Cart drawer** (D-4) — style only.

### B-3 — Custom SGS blocks to build/extend
1. **SGS product search block** (D-2) — live/keyword product search; brand-styled; accessible (`role="searchbox"`, labelled, 44px target).
2. **SGS searchable attribute filter** (D-2) — type-to-find inside a filter when an attribute has **>15–20 options** (Baymard threshold). Pairs with WC Product Filters.
3. **SGS option-picker → WC binding** (D-3) — read available-variations JSON; on selection, write `variation_id` + attribute map via Store API `POST /wc/store/v1/cart/add-item`. **Flag:** confirm the client-side variation-data read path against `@woocommerce/block-data` source before building (research could not verify the exact selector). Keep: value-ladder/per-unit price, coming-soon pills (disabled, not hidden — show "Coming soon" + optional notify), inline % off badge.
4. **Price-display** — main price + per-unit price ("£X per cookie/100g") as a secondary line + optional inline note. Decide at build: extend `product-card` vs a small dedicated block. Per-unit aids comparison AND aligns with UK unit-pricing rules.

### B-4 — Shop archive UX (custom, per Baymard)
- **Toggle/drawer filters** — never open the page with a filter wall, especially mobile. Mobile = full-screen/bottom-sheet drawer behind a sticky "Filter" button. Desktop = open sidebar or toolbar is fine.
- **Applied-filters overview** — show selected VALUES as removable chips (not just a count); mobile = horizontally-scrolling chip row.
- **Filter parity** — a filter for every attribute shown on the product card.
- **Top SEO text** — short intro (1–3 sentences) above the grid; don't push products below the fold.
- **Bottom SEO text** — longer keyword-rich copy below the grid, with the **"N lines + read more"** expand. *Server-render the FULL text in HTML, collapse with CSS* (JS-injected-on-click text isn't indexed). Toggle is a `<button>` (not a link) with `aria-expanded` + `aria-controls`, name flips Read more/less, 44px target.

### B-5 — Schema (D-8) — per page
| Page | Emit | Notes |
|------|------|-------|
| **PDP** | `Product` + nested `Offer` (`price`, `priceCurrency`, `availability`, `priceValidUntil`, `url`) + `aggregateRating`/`review` (genuine only) + `brand` + `sku`/`gtin`/`mpn` + `offers.shippingDetails` + `offers.hasMerchantReturnPolicy` (incl. **`returnPolicyCountry`** — now required) + `BreadcrumbList`. **ONE `Product` node per page.** | Variants of the same product allowed via `ProductGroup`/`hasVariant`. Mark up only on-page-visible content. |
| **Shop/archive** | `BreadcrumbList` + optional **URL-only** `ItemList` of PDP links. | NO per-item `Product` markup; archive isn't eligible for product rich results. |
| **Cart/checkout/account** | None + `noindex`. | Transactional/session content. |
| **Sitewide (home)** | `Organization` (logo, sameAs, contactPoint, address, **org-level `hasMerchantReturnPolicy`/`hasShippingService`** as the canonical base) + `WebSite` (name/url/alternateName, **NO SearchAction**). | Org-level shipping/returns is the 2026 canonical home; Search Console account-level return policy overrides markup. |
| **All** | **Do NOT emit `FAQPage`** — Google drops FAQ appearance 7 May 2026. | One `@graph` per page, `@id`-cross-referenced, consistent with Merchant Center feed. |

Audit the existing emitters (`includes/class-product-*.php`, `review-schema.php`, `product-faq-schema.php`) against this table; retire FAQ + SearchAction; add `returnPolicyCountry`; wire org-level shipping/returns.

### B-6 — Cross-cutting
- **Responsive on every page** (PDP / shop / cart / checkout) verified at **375 / 768 / 1440**.
- **Variant pills** = `role="radiogroup"` + `role="radio"`/`aria-checked`, arrow-key navigation, single tab stop, 44px targets. Out-of-stock = disabled + visible, never hidden. Don't show a selector when only one variant exists.
- **No fake urgency / phantom strikethrough** — any "% off" / "was" price needs a substantiated, recently-charged reference price (CMA/ASA dark-pattern enforcement is active).

---

## Part C — Pipeline gate for THIS (cloning) thread

- **Homepage cloning is unaffected** — continues independently (the `fold_eligible` fix is the live unfix; Step C label correction proceeds).
- **Product-page cloning is gated on D-1:** a cloned product page must deploy to the **WC single-product template / a `product` post**, not `page:144`. Do NOT run a product-page clone until the theme thread has shipped the single-product template + the SGS blocks (B-1…B-3). Until then, the product-page draft stays parked.
- When the templates land, the converter targets the product CPT; the per-element layout map (Step C) for the product draft maps to the native WC blocks + the SGS configurator, NOT bespoke composites.

---

## Research provenance (for audit)
- **WC block ecosystem (2026):** cart drawer IS core (Mini-Cart, Blocks 10.1+); Product Search + searchable filter are NOT core (paid extension); Add-to-Cart+Options (WC 10.0) renders pills; Product Gallery variation-aware since 9.9 (Beta); single-product template auto-injected; My Account stays classic.
- **Shop/PDP UX:** Baymard filter/search thresholds (>15–20 options → searchable); read-more must server-render + `<button>`+`aria-expanded`; pills beat dropdowns (+15–20% ATC); out-of-stock visible-disabled; DMCC fake-review ban.
- **Schema:** Google 2026 — FAQ dropped, SearchAction retired, `returnPolicyCountry` required, org-level shipping/returns canonical, product self-reviews eligible, single-Product-per-page.
