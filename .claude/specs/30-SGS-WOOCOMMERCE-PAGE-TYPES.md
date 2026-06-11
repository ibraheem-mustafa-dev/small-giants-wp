---
doc_type: spec
spec_id: 30
spec_version: "1.0"
status: active
title: "SGS WooCommerce Page Types — single-product / shop archive / cart / checkout"
project: small-giants-wp
authors: Bean + Claude (Opus 4.8)
created: 2026-06-11
last_verified: 2026-06-11
absorbs: []
absorbed_by: null
lock_reason: null
revision_history:
  - v1.0 2026-06-11: initial — converted from the D208 solution doc (`.claude/reports/wave2/WOOCOMMERCE-PAGE-TYPE-SOLUTION-2026-06-11.md`) after the post-compact /brainstorming + /research-buddies design pass (3 research agents) + Bean sign-off of the 8 design decisions. Build owner = theme thread.
related:
  - specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md
  - specs/28-SGS-SMART-BULK-PRICING.md
  - specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md
  - reports/wave2/WOOCOMMERCE-PAGE-TYPE-BRIEF-2026-06-11.md
  - reports/wave2/WOOCOMMERCE-PAGE-TYPE-SOLUTION-2026-06-11.md
  - plugins/sgs-blocks/src/blocks/option-picker/
  - plugins/sgs-blocks/src/blocks/product-card/
  - theme/sgs-theme/functions.php
---

# Spec 30 — SGS WooCommerce Page Types

> **Build owner:** theme thread (cloning thread designs only; D208 Part C). Commit by explicit path — threads are co-active.
> **Decision record:** D208 (`.claude/decisions.md`). Research provenance: 3 parallel agents 2026-06-11 (WC block ecosystem / shop+PDP UX / schema), cited inline.

## Problem statement

The Mama's Munches product-page draft is a WooCommerce page TYPE (6-persona council, D207), but the framework has no WC page-type chassis: no `add_theme_support('woocommerce')`, no single-product/archive templates, no product search, no searchable filter, and schema emitters that still target retired Google features. The product-page clone is gated on this spec; every future shop client needs it.

## Goals

1. Every WC page type (PDP / shop / cart / checkout) renders brand-composable, Site-Editor-editable block templates on any SGS install.
2. Commerce machinery comes from WooCommerce core blocks; SGS builds ONLY the differentiated UX (search, searchable filter, configurator binding, price display, archive UX).
3. Schema output matches Google's 2026 merchant guidance exactly.
4. UK-legal by construction (DMCC reviews, CMA pricing claims).

## Non-goals / Out of scope

- **Block-based My Account** — no core block alternative exists; stays classic, CSS-styled, deferred (Bean call).
- **Bespoke cart drawer** — core Mini-Cart drawer is used instead (D208 D-4).
- **Multi-image-per-variation galleries** — core swaps one image per variation; the plugin route is out of MVP scope (D-6).
- **`FAQPage` schema** — Google drops FAQ rich results 2026-05 (FR-27-F2's AI-citation framing is unaffected; this spec adds none).
- **Rebuilding cart/checkout/gallery/collection blocks** — core blocks are the chassis, full stop.
- **Food-domain vocabulary in the framework** — `allergen-*`, `topping-dairy`, `trial-note`, `ingredients-*` map to generic slots (`notice-banner`/`text`/`feature-grid`); they NEVER enter `slots.aliases`/`modifier_suffixes`.

## Hard constraints

- WCAG 2.2 AA; 44px touch targets; mobile-first 375/768/1440.
- All REST/Store-API writes: nonces, capability checks, sanitisation.
- Performance budget <100KB CSS / <50KB JS per page.
- No jQuery; `viewScriptModule` ES modules for interactive blocks.
- Block-quality standard applies (one control per setting, zero orphans — `feedback_clean_up_superseded_controls_on_block_changes`).
- Any style.css change bumps block.json version (CDN ?ver cache).

## Architecture (the standard-vs-custom split, D208)

| Layer | WooCommerce core (compose + style) | SGS custom (build) |
|---|---|---|
| PDP | Single Product template chassis; Product Gallery (variation-aware ≥WC 9.9, Beta); Title/Rating/Price/Breadcrumbs; Add-to-Cart+Options (≥WC 10.0) as the cart-write chassis; Related/Up-sells | option-picker→WC binding (FR-30-7); price-display (FR-30-8); trust strip + content sections (existing blocks) |
| Shop | Product Collection (grid/query/sort/pagination); Product Filters (price/attribute/rating/stock) | product search (FR-30-5); searchable attribute filter (FR-30-6); archive UX shell (FR-30-3) |
| Cart/Checkout | Cart + Checkout blocks (Store API); Mini-Cart with core slide-out drawer (Blocks ≥10.1, adjustable width); gateway blocks (verify per-gateway block compat) | styling only |
| Account | Classic shortcode | none (CSS only, deferred) |

**Key research facts the split rests on:** live product search + type-to-find attribute filter are NOT core (paid Product Search extension only) → FR-30-5/6 build them; the cart drawer IS core → no SGS drawer; WC injects default block templates automatically — theme files only override composition.

## Functional Requirements

### FR-30-1 — Theme support + template scaffolding
Declare `add_theme_support('woocommerce')` + `wc-product-gallery-zoom` / `-lightbox` / `-slider` in `theme/sgs-theme/functions.php`, landing in the SAME commit as the first template (declaring alone half-breaks WC fallback rendering). Ship Site-Editor-editable overrides `single-product.html` and `archive-product.html`; Cart/Checkout use core templates unless composition demands an override.
**Model:** sonnet (mechanical scaffolding, verified live). **Done when:** the WC admin "theme does not declare support" notice is gone AND `wp_is_block_theme()` install renders both overridden templates from the theme (template inspector shows theme source, not plugin), live-verified on the canary.

### FR-30-2 — PDP composition (single-product.html)
Compose: Product Gallery (thumbnails + zoom) → Title/Rating/Price (+ FR-30-8 price-display) → SGS option-picker (FR-30-7) over the Add-to-Cart+Options chassis → trust strip → content sections (generic slots) → reviews (FR-30-10) → related products. One variant-selector rule: never render a selector when only one variant exists; unavailable options show disabled ("Coming soon"/"Sold out"), never hidden.
**Model:** sonnet (composition) + opus review. **Done when:** a real variable product on the canary renders the full composition; selecting size/flavour pills updates price + gallery image; add-to-cart puts the CORRECT `variation_id` in the cart (Store API cart response inspected); axe reports 0 violations.

### FR-30-3 — Shop archive UX shell
Product Collection + Product Filters composed into: (a) **toggle filters** — mobile = full-screen/bottom-sheet drawer behind a sticky "Filter" button, desktop = open sidebar permitted; never an open filter wall on first paint at 375px; (b) **applied-filter chips** showing selected VALUES (removable; horizontally scrolling row on mobile); (c) filter parity — a filter for every attribute the product card displays; (d) **top SEO text** 1–3 sentences above the grid; (e) **bottom SEO text** below the grid with the N-lines + read-more expand — full text server-rendered in HTML and collapsed by CSS only; the toggle is a `<button>` with `aria-expanded` + `aria-controls`, accessible name flips, ≥44px.
**Model:** sonnet build + opus design review. **Done when:** at 375px the archive paints with filters closed + a sticky Filter button opening a drawer; chips render and remove; `curl` of the archive HTML contains the FULL bottom text pre-expand; toggle passes the button/aria checks in axe + manual keyboard run.

### FR-30-4 — Cart / checkout / Mini-Cart styling
Brand-style core Cart, Checkout, and the Mini-Cart slide-out drawer (header placement; drawer width set; express-pay buttons verified per gateway plugin's block compatibility). No SGS drawer build.
**Model:** sonnet. **Done when:** add-to-cart from the PDP opens/updates the styled Mini-Cart drawer; cart→checkout completes a test order on the canary; all three surfaces match brand styling at 375/768/1440.

### FR-30-5 — SGS product search block
A live/keyword product-search block (results scoped to products; debounced suggestions; graceful no-JS fallback to the standard product search query). Accessible: labelled `role="searchbox"`, listbox/option semantics for suggestions, keyboard navigable, 44px target. Framework asset — zero per-client licence (replaces the paid Product Search extension).
**Model:** opus design-gate + sonnet build. **Done when:** typing ≥2 chars surfaces matching products on the canary; Enter with JS disabled still lands on a correct product-search results URL; axe 0 violations; registered in `/sgs-db` via `/sgs-update`.

### FR-30-6 — SGS searchable attribute filter
A type-to-find input INSIDE a filter group, auto-enabled when the attribute has >15–20 options (Baymard threshold), composing with core Product Filters (same query params — filtering stays core). Matches filter options client-side; announces result count to screen readers.
**Model:** sonnet. **Done when:** an attribute with 20+ terms renders the search input and typing narrows the visible options; an attribute with 5 terms renders none; applying a narrowed option filters the collection identically to core.

### FR-30-7 — option-picker → WooCommerce binding
`sgs/option-picker` reads the product's available-variations data and on confirm writes the resolved variation via Store API `POST /wc/store/v1/cart/add-item` (`id` = variation_id + attribute map), keeping value-ladder/per-unit pricing, coming-soon (disabled, optional notify-me capture), and inline %-off badges. **Pre-build verification (flagged unverified in research):** confirm the client-side variation-data read path against `@woocommerce/block-data` source before building; if absent, seed variations server-side as the existing configurator does (Spec 27's SEC-1 manifest pattern is the precedent).
**Model:** opus (design + the read-path verification) + sonnet build. **Done when:** on a multi-axis variable product, every pill combination adds the exact matching variation (cart line items inspected via Store API for ≥3 distinct combinations incl. one multi-axis); an unavailable combination is disabled and un-addable; pills satisfy radiogroup semantics (arrow keys, single tab stop, `aria-checked`).

### FR-30-8 — Price display (per-unit + value-ladder)
Headline price + secondary per-unit line ("£X per cookie/100g" — UK unit-pricing aligned) + optional inline note. Strikethrough/%-off renders ONLY when a substantiated reference price exists (CMA/ASA: phantom "was" prices and fake urgency are enforcement targets — no countdown timers, no unverifiable savings claims). Implementation choice (extend `product-card` vs small block) is the builder's, justified in the commit.
**Model:** sonnet. **Done when:** PDP shows headline + per-unit price derived from real product data; with no reference price set, no strikethrough/badge renders (grep + live check); with one set, the badge shows the correct %.

### FR-30-9 — Schema completeness per page type
Audit + align the existing emitters (`includes/class-product-*.php`, `review-schema.php`, `product-faq-schema.php`):
- **PDP:** one `Product` node + nested `Offer` (`price`, `priceCurrency`, `availability`, `priceValidUntil`, `url`) + `brand` + `sku`/`gtin`/`mpn` + `offers.shippingDetails` + `offers.hasMerchantReturnPolicy` **including `returnPolicyCountry` (now required)** + `aggregateRating`/`review` when genuine reviews exist + `BreadcrumbList`. Variants via `ProductGroup`/`hasVariant` (existing FR-27 gating preserved). No `positiveNotes`/`negativeNotes` (merchant pages ineligible).
- **Shop:** `BreadcrumbList` + URL-only `ItemList` (D204's page-level ItemList is the precedent) — NO per-item Product markup.
- **Cart/checkout/account:** no schema + `noindex`.
- **Sitewide:** `Organization` (logo, sameAs, contactPoint, address, **org-level `hasMerchantReturnPolicy` + `hasShippingService`** as the canonical base) + `WebSite` (name/url/alternateName, **no `SearchAction`** — retired 2024-11).
- **Remove:** any `FAQPage` emission for rich-result purposes and any `SearchAction` (FR-27-F2's AI-citation FAQ blocks keep their existing non-Google framing).
Only on-page-visible content is marked up; output stays consistent with the FR-27-F2 merchant feed.
**Model:** sonnet audit + opus adversarial check. **Done when:** Google Rich Results Test passes the canary PDP with zero errors; the shop page emits Breadcrumb + URL-only ItemList; cart/checkout respond `noindex`; grep shows zero `SearchAction` and zero rich-result-purposed `FAQPage` emission; `returnPolicyCountry` present in PDP + org-level output.

### FR-30-10 — Reviews (DMCC-compliant)
PDP reviews come from Trustpilot (`sgs/trustpilot-reviews` synced) or a verified-buyer source. Static/baked review content is BANNED everywhere (UK DMCC Act in force 2026-04-06: fake/undisclosed-incentivised reviews illegal; the displaying trader is liable; ≤£300k or 10% turnover). The cloning pipeline maps draft review sections to the live review block, never to static testimonial content.
**Model:** sonnet. **Done when:** the canary PDP renders only synced/verified reviews; grep of templates + converter emit finds zero hardcoded review text; schema `review`/`aggregateRating` emits only when the live source has data.

### FR-30-11 — Responsive verification gate
Every page type (PDP, shop, cart, checkout) verified at 375/768/1440 via Playwright before its FR closes — touch targets ≥44px, no horizontal scroll, drawer/filters/gallery usable at every width.
**Model:** sonnet (scripted run). **Done when:** a per-page screenshot set at all three widths is attached to each shipping commit + axe runs report 0 violations per page.

### FR-30-12 — Pipeline gate (cloning thread)
A cloned product page targets the WC **single-product template on a real `product` post** (`is_product()`), never a WP Page / `page:144`. The converter maps the product draft's layout to the FR-30-2 composition (core WC blocks + SGS blocks). Product-page cloning stays parked until FR-30-1/2/5/6/7 ship.
**Model:** n/a (gate). **Done when:** the first product-page clone run deploys to a product post and the live URL renders via the single-product template (template source verified), with zero draft BEM classes in the emit (Rule 1).

## Phasing

1. **P1 — Chassis:** FR-30-1, FR-30-2 (with WC-native selectors as interim), FR-30-4. Smallest path to a working PDP + cart loop.
2. **P2 — Differentiators:** FR-30-7 (binding), FR-30-8 (price display), FR-30-10 (reviews).
3. **P3 — Shop:** FR-30-3, FR-30-5, FR-30-6.
4. **P4 — Schema:** FR-30-9 (can run parallel to P2/P3).
- FR-30-11 gates every phase close; FR-30-12 unlocks after P1+P2.

## Open Questions

1. FR-30-7 read-path: `@woocommerce/block-data` selector vs server-side seeding — resolve by reading WC source before P2 (flagged unverified by research).
2. FR-30-8 home: extend `product-card` vs a dedicated block — builder decides at P2 with a one-paragraph justification.
3. Gateway block-compat matrix (Stripe/PayPal/express) for the first shop client — verify the specific plugin versions at P1.
