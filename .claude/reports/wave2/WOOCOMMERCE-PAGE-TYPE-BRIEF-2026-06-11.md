---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline (design) → theme-thread (build)
title: "WooCommerce page-type design brief — PDP / shop / cart / checkout"
created: 2026-06-11
status: DESIGN BRIEF — input for the post-compact /brainstorming + /research-buddies pass. The SOLUTION is designed in the cloning thread (warm, post-compact); the BUILD is delegated to the theme thread. The pipeline/draft work is gated on these decisions (a cloned product page must target the WC page type, not a generic Page).
inputs: 6-persona adversarial-council (2026-06-11) on product-page naming; the gap fact-check (2026-06-11); WC block-ecosystem research (brave, 2026-06-11).
---

# WooCommerce page-type design brief

## The core decision (council-convergent, Bean-approved Option 2 + nuance)

The Mama's product-page draft is **not a homepage re-author** — it is a **WooCommerce page TYPE** (PDP) the framework has not built yet. The council (6 personas) converged: the product page is **~80% existing SGS blocks** (`product-card`, `option-picker`, `gallery`, `star-rating`, `trust-bar`, `notice-banner`, `testimonial`, `feature-grid`) + a small genuinely-new set. The **real gap is the page-type chassis**: no `single-product` template, no `add_theme_support('woocommerce')`, no PDP composition spec.

**Principle: lean on WooCommerce's blocks for the commerce machinery; custom-build only the brand-differentiating UX.** Rebuilding cart/checkout/gallery from scratch is the trap (maintenance + payment-security surface).

## Standard (WooCommerce gives free — just style) vs custom (SGS builds)

| Page | WooCommerce standard | SGS custom |
|---|---|---|
| **PDP (single-product)** | The template chassis (on `add_theme_support('woocommerce')`); Product Image Gallery (main + thumb strip + zoom, **variation-aware in core 2026**); Product Title/Rating/Price/Breadcrumbs; **Add to Cart + Options** block (WC 10.0); Details tabs; Related/Up-sells; Reviews | **Pill variant picker** (`sgs/option-picker`) replacing WC dropdowns, bound to WC variation data; `selected-value` readout, `coming-soon`/pending pills, inline `% off` badges; **per-unit / value-ladder** price; trust strip; ingredients/allergen content sections; brand styling |
| **Shop (archive-product)** | **Product Collection** block (grid/query/pagination/sort); **Product Filters** (price/attribute/stock/rating — incl. a **searchable/text-input** filter, so the type-in filter is WC-standard); **Product Search** block | Style the collection card to brand; archive UX (below) |
| **Cart / Checkout** | Block **Cart** + **Checkout** (Store API, payment gateway blocks Stripe/PayPal/express, Mini-Cart) — essentially everything | Styling; the **cart drawer** (NOT built — block.json is a Phase-2 stub) |
| **Account / login / orders** | Classic template/shortcode (not block-based) | None — style via CSS; deferred + non-block (Bean's call) |

## Bean's added requirements (fold into the brainstorm + the theme-thread build)

1. **Product Search block** — missing in SGS; WC ships one. Decide: use WC's Product Search, or an SGS-styled wrapper.
2. **Typeahead / text-input filter** on shop — WC Product Filters support it; wire + style.
3. **Cart drawer** — build (currently `displayMode` enum has `"drawer"` but it is unimplemented). → theme thread.
4. **Responsive across ALL device types** — every page (PDP/shop/cart/checkout) verified at 375/768/1440.
5. **Shop archive UX:** collapsible/**toggle filters** (never open the page with a filter wall — esp. mobile); optional **top** SEO/description text AND **bottom** text; top text defaults to **N lines + "read more"** expand.
6. **Full optimal schema on every page** — audit + complete. SGS already emits Product/ItemList/BreadcrumbList/review/FAQ (`includes/class-product-*.php`, `review-schema.php`, `product-faq-schema.php`); confirm coverage per page (PDP=Product+Breadcrumb; shop=ItemList+Breadcrumb; Organization sitewide) and fill gaps.

## Verified facts (2026-06-11)
- Cart drawer: **stub only** (`cart/block.json` says "Phase 2 will add a slide-in drawer").
- Product search block: **absent** from `plugins/sgs-blocks/src/blocks/`.
- `add_theme_support('woocommerce')`: **not declared** in `theme/sgs-theme/functions.php`.
- Theme templates: `single.html`/`page.html` exist; **no `single-product.html`/`archive-product.html`**.
- Schema infra: present for product/collection; needs a per-page completeness audit.

## Genuinely-new pieces (council bucket 3 — design, don't re-author)
- The 2-col PDP shell (`product-page`/`product-info`) → the `single-product` template/composition (WC provides the chassis).
- Gallery main + click-to-swap thumbnail strip → WC Product Gallery block covers this (variation-aware) — prefer it over a custom block.
- `sgs/option-picker` gaps: `selected-value` live readout, `optionItems[].pending` (coming-soon), inline pill badge.
- A **price-display** concept (main + per-unit + inline note) — decide: extend product-card vs a small block.
- **Content vs structure rule (hard):** `allergen-*`, `topping-dairy`, `trial-note`, `ingredients-*` are CONTENT-specific — map to GENERIC slots (`notice-banner`/`text`/`feature-grid`); NEVER add food-domain terms to framework vocab (`slots.aliases`/`modifier_suffixes`).

## Open design questions for the brainstorm
1. Does a cloned product page target a WC **single-product template** or a **Page**? (Affects schema/canonical/add-to-cart binding — `is_product()` gating.) Recommended: the WC product template.
2. Keep-vs-delegate the SGS **parallel product layer** (`product-card`-as-grid-item, `sgs/cart`) vs WC's native Product Collection card / Cart block. Keep the differentiated pieces (configurator, value-ladder); delegate the rest to WC styled.
3. Reviews: static `sgs/testimonial` vs the client's **Trustpilot** (`sgs/trustpilot-reviews` synced) — the draft bakes fake reviews; use Trustpilot.

## Plan
- **Design (here, post-compact):** `/brainstorming` + `/research-buddies` → the WC page-type solution answering the open questions + incorporating the requirements.
- **Build (theme thread):** `add_theme_support('woocommerce')` + the four block templates (single-product / archive-product / cart / checkout) composing WC blocks + SGS blocks; cart drawer; product search; archive UX (toggle filters + top/bottom text + read-more); schema completeness. Theme support lands WITH the templates (alone it half-breaks WC's fallback rendering).
- **Pipeline (here):** gated on Q1 (page-vs-template) — a product-page clone needs its target page type decided first; homepage cloning continues independently.
