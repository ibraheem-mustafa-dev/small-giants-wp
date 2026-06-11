---
doc_type: spec
spec_id: 30
spec_version: "1.1"
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
  - v1.0 2026-06-11: initial — converted from the D208 solution doc after the post-compact /brainstorming + /research-buddies design pass (3 research agents) + Bean sign-off of the 8 design decisions. Build owner = theme thread.
  - v1.1 2026-06-11: 6-persona adversarial-council applied (Cynic/Spec-Lawyer/Ship-PM/Abuse-Red-Team/Support-Realist/Competitor). HEADLINE convergent fixes — (1) FR-30-7 was re-speccing SHIPPED Spec 27 cart machinery against the WRONG endpoint (direct /wc/store/v1 bypassing the hardened /sgs/v1 cart proxy; grep-verified) → rewritten as a WIRE-NOT-REBUILD FR + a Reuse Inventory + a hard no-direct-Store-API-write rule; (2) new FR-30-0 WC dependency contract (version band, runtime compat self-check, lazy-load guards, gateway pre-flight, template parts); (3) pipeline gate decoupled from shop search (FR-30-12 needs FR-30-0/1/2/7 only — unblocks after P1, not P3); (4) P1 interim-WC-selector throwaway work deleted — the shipped option-picker wires in at P1; (5) security hardening of search/filter/notify-me/badges/schema (9 red-team must-fixes); (6) operator day-two inspector-control inventories (framework rule: "requires touching code = not done"); (7) FR-30-13 go-live checklist; (8) Spec-Lawyer testability pass (single threshold=15, debounce 300ms, binary Done-whens, CSS collapse mechanism, combobox ARIA, /sgs-update registration). Subscriptions/build-a-box/A-B parked as explicit roadmap (Bean decision pending — see Open Questions).
related:
  - specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md
  - specs/28-SGS-SMART-BULK-PRICING.md
  - specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md
  - reports/wave2/WOOCOMMERCE-PAGE-TYPE-BRIEF-2026-06-11.md
  - reports/wave2/WOOCOMMERCE-PAGE-TYPE-SOLUTION-2026-06-11.md
  - plugins/sgs-blocks/src/blocks/option-picker/
  - plugins/sgs-blocks/src/blocks/product-card/
  - plugins/sgs-blocks/includes/class-cart-proxy.php
  - theme/sgs-theme/functions.php
---

# Spec 30 — SGS WooCommerce Page Types

> **Build owner:** theme thread (cloning thread designs only; D208 Part C). Commit by explicit path — threads are co-active.
> **Decision record:** D208 (`.claude/decisions.md`). Research provenance: 3 parallel agents 2026-06-11 + 6-persona adversarial council (v1.1).

## Problem statement

The Mama's Munches product-page draft is a WooCommerce page TYPE (6-persona council, D207), but the framework has no WC page-type chassis: no `add_theme_support('woocommerce')`, no single-product/archive templates, no product search, no searchable filter, and schema emitters that still target retired Google features. The product-page clone is gated on this spec; every future shop client needs it.

## Goals

1. Every WC page type (PDP / shop / cart / checkout) renders Site-Editor-editable block templates on any SGS install, styled via Site Editor global styles (`wp_global_styles`) + per-client `theme-snapshot.json` (Spec 26 mechanism) — no client values hard-coded in template markup.
2. Commerce machinery comes from WooCommerce core blocks AND already-shipped Spec 27 machinery (see §Reuse Inventory); SGS builds ONLY the genuinely-new differentiated UX.
3. Schema output matches Google's 2026 merchant guidance exactly.
4. UK-legal by construction (DMCC reviews, CMA pricing, PECR consent on email capture).
5. Every client-changeable value is a block-editor control — "if a setting requires touching code, it is not done."

## Non-goals / Out of scope

- **Block-based My Account** — no core block alternative exists; stays classic, CSS-styled, deferred (Bean call). The Site-Editor template carries an explanatory note that the different look is intentional.
- **Bespoke cart drawer** — core Mini-Cart drawer is used instead (D208 D-4).
- **Multi-image-per-variation galleries** — core swaps one image per variation; the plugin route is out of MVP scope (D-6).
- **`FAQPage` schema for rich results** — Google dropped FAQ rich results 2026-05 (FR-27-F2's AI-citation framing is unaffected; this spec adds none).
- **Rebuilding cart/checkout/gallery/collection blocks OR the shipped Spec 27 cart-write path** — core blocks + shipped machinery are the chassis, full stop.
- **Food-domain vocabulary in the framework** — `allergen-*`, `topping-dairy`, `trial-note`, `ingredients-*` map to generic slots (`notice-banner`/`text`/`feature-grid`); they NEVER enter `slots.aliases`/`modifier_suffixes`. (The PDP template MUST still provide a generic content slot where a food client places statutory allergen information — see FR-30-2.)
- **Abandoned-cart recovery emails** — explicitly out of scope for this spec (clients will ask; the answer is "later phase / extension territory").
- **Subscriptions / subscribe-and-save / one-click reorder, build-a-box bundles, A/B price-display experiments** — PARKED as roadmap, not built here (council flagged subscriptions as the food-DTC deal-winner; Bean decision pending — Open Question 4).

## Hard constraints

- WCAG 2.2 AA; 44px touch targets; mobile-first 375/768/1440.
- All REST/Store-API writes: nonces, capability checks, sanitisation. **No SGS code POSTs directly to `/wc/store/v1/*` write endpoints — all cart writes go through the shipped `/sgs/v1/cart/*` proxy** (`includes/class-cart-proxy.php`), which carries the availability/IDOR/legal guards (`guard-on-one-path-is-not-a-guard`).
- Performance budget <100KB CSS / <50KB JS executed per page (measured per `feedback_js_budget_measures_executed_not_prefetched` — executed scripts, not prefetch).
- No jQuery; `viewScriptModule` ES modules for interactive blocks.
- Block-quality standard (one control per setting, zero orphans). Any style.css change bumps block.json version (CDN ?ver cache).
- All WC-dependent PHP classes lazy-load behind `class_exists('WooCommerce')` + the `woocommerce_loaded` hook (binding `file-scope-wc-class-extends-must-load-lazily` structurally — a file-scope `extends` against a WC class fatals the whole site).
- New blocks built under this spec carry `"specRef": "30"` in `block.json` `supports.sgs`, and every new/modified block FR closes only after `/sgs-update` registers it (confirmed via `sgs-db.py` showing the block in `block_attributes` + `block_capabilities`).

## Reuse Inventory (SHIPPED Spec 27/28 machinery — REUSE, never rebuild)

| Asset | Where | Status | Spec 30 usage |
|---|---|---|---|
| Hardened cart-write proxy (`POST /sgs/v1/cart/add-item`, 409 availability re-sync, demand-capture for coming-soon) | `includes/class-cart-proxy.php` + `product-card/view.js` | SHIPPED (Spec 27, D203/D204) | THE cart write for the PDP configurator (FR-30-7). Direct `/wc/store/v1` writes are forbidden. |
| Variation resolver + SEC-1 lean seeded manifest (variation_id→attribute map, size-capped) | `product-card` render/view | SHIPPED | THE variation read path (closes v1.0 Open Question 1 — no `@woocommerce/block-data` research needed). Respect the 24KB lean-subset cap (`manifest-growth-can-trip-capped-client-seed`). |
| `sgs/option-picker` (pills, variants, group labels) + its `sgs:option-selected` CustomEvent | `src/blocks/option-picker/` | SHIPPED | The selection UI (FR-30-7). NOTE: colon-named events do NOT bind via `data-wp-on--` (silent failure) — cross-block wiring uses the captured-context `data-wp-init` bridge (`wp-interactivity-data-wp-on-rejects-colon-event-names`). |
| Pricing engine + legal price floor + `'1' === (string)$v` strict guards | Spec 28 (`Pack_Pricing_Resolver` etc.) | SHIPPED | Reference for FR-30-8's meta guards. |
| Schema emitters + page-level ItemList walker + ProductGroup gating | `includes/class-product-*.php`, `review-schema.php` | SHIPPED (D204) | FR-30-9 AUDITS/ALIGNS these — does not rewrite. |

## Architecture (the standard-vs-custom split, D208 + v1.1 corrections)

| Layer | WooCommerce core (compose + style) | SGS shipped (wire) | SGS new (build) |
|---|---|---|---|
| PDP | Single Product template chassis; Product Gallery (variation-aware ≥WC 9.9, **Beta** — see FR-30-0); Title/Rating/Price/Breadcrumbs; Add-to-Cart+Options as the simple-product/no-JS fallback; Related/Up-sells | option-picker + cart proxy + variation manifest (FR-30-7) | price-display coupling (FR-30-8); template parts (FR-30-2) |
| Shop | Product Collection; Product Filters (price/attribute/rating/stock); Active Filters (the chips — styled, not rebuilt) | — | product search (FR-30-5); searchable attribute filter (FR-30-6); archive UX shell (FR-30-3) |
| Cart/Checkout | Cart + Checkout blocks (Store API); Mini-Cart with core slide-out drawer (Blocks ≥10.1) | — | styling only (FR-30-4) |
| Account | Classic shortcode | — | none (CSS only, deferred) |

**Key research facts the split rests on:** live product search + type-to-find attribute filter are NOT core (paid extension only) → FR-30-5/6 build them; the cart drawer IS core → no SGS drawer; WC injects default block templates automatically — theme files only override composition (verified to win on the canary's WC version per FR-30-0).

## Functional Requirements

### FR-30-0 — WooCommerce dependency contract (NEW v1.1 — council convergent)
The build rests on two **Beta** core blocks (Product Gallery; Add-to-Cart+Options variation selectors) whose markup/attribute contracts can change between WC minors. Before P1 build starts:
(a) **Version band** — declare a tested WC floor + ceiling (floor ≥9.9 for the variation-aware gallery); a runtime self-check on admin load asserts the relied-on core blocks are registered AND the installed WC is inside the band, surfacing a dashboard notice ("SGS: WooCommerce X is newer than tested — product pages may need review") when outside it. Silent rot is fatal for a QC-only owner.
(b) **Dependency manifest** — one file lists the EXACT core block names + `/sgs/v1` + Store-API read surfaces relied on, so upgrades reconcile against a written contract.
(c) **Gateway pre-flight (was Open Question 3 — now a P1 entry gate, 5 council voices)** — verify the client's payment gateway plugins (Stripe/PayPal/express) declare Cart/Checkout BLOCK support at their installed versions BEFORE composing block checkout. Fallback branch if not: classic-checkout template + documented consequences (noindex story unchanged; Mini-Cart drawer unaffected).
(d) **Fallback plans written down** — Beta gallery regression → core classic gallery via the `wc-product-gallery-*` supports (declared in FR-30-1); rollback escape hatch = remove the theme template overrides so WC's injected defaults render.
**Model:** opus (contract) + sonnet (self-check code). **Done when:** the self-check renders the notice on a deliberately out-of-band WC version; the dependency manifest file exists and names every relied-on block; the gateway matrix for the first client is verified with a recorded result; template override is confirmed to win over WC's injected default on the canary's WC version.

### FR-30-1 — Theme support + template scaffolding
Declare `add_theme_support('woocommerce')` + `wc-product-gallery-zoom` / `-lightbox` / `-slider` in `theme/sgs-theme/functions.php`, landing in the SAME commit as the first template (declaring alone half-breaks WC fallback rendering). Ship Site-Editor-editable overrides `single-product.html` and `archive-product.html`, **decomposed into template parts** (`sgs-pdp-gallery`, `sgs-pdp-buybox`, `sgs-pdp-content`, `sgs-archive-toolbar` …) so a WC upstream change reconciles in one part, not a whole-file diff. Cart/Checkout use core templates unless composition demands an override.
**Model:** sonnet. **Done when:** the WC admin "theme does not declare support" notice is gone (verified via Playwright using the `sandybrown.env` credentials — not a manual look) AND both overridden templates render from the theme on the canary (template inspector shows theme source), each composed of the named template parts.

### FR-30-2 — PDP composition (single-product.html)
Compose: Product Gallery (thumbnails + zoom) → Title/Rating/Price (+ FR-30-8 price-display) → **the shipped SGS option-picker wired per FR-30-7** (no interim WC-native selector build — that was throwaway work, deleted v1.1; core Add-to-Cart+Options remains the rendering path for SIMPLE products and the no-JS fallback) → trust strip (`sgs/trust-bar`, typed mode) → content sections (existing `sgs/*` blocks in generic slots — the composition MUST include a generic content slot suitable for statutory allergen information for food clients; content stays client-side, the SLOT is structural) → reviews (FR-30-10) → related products. Variant rules: never render a selector when only one variant exists; unavailable options show disabled ("Coming soon"/"Sold out" — labels operator-editable per FR-30-7), never hidden.
**Model:** sonnet (composition) + opus review. **Done when:** a real variable product on the canary renders the full composition; selecting pills updates price + gallery image; add-to-cart puts the CORRECT `variation_id` in the cart (cart response inspected via the proxy); a SIMPLE product renders the core Add-to-Cart path; axe reports 0 violations. (Evaluated at P1 — FR-30-7's wiring is IN P1.)

### FR-30-3 — Shop archive UX shell
Product Collection + Product Filters composed into:
(a) **toggle filters** — mobile = full-screen/bottom-sheet drawer behind a sticky "Filter" button; desktop = open sidebar permitted; never an open filter wall on first paint at 375px;
(b) **applied-filter chips** = the core **Active Filters block, styled** (NOT a custom chip component; a JS enhancement layer is permitted only if core cannot meet the scrolling-row + removable requirements — decision documented in the commit). Chips show selected VALUES, removable, horizontally scrolling on mobile, and reflect URL query state across pagination;
(c) **filter parity** — a filter group for every attribute the product card displays at build time (post-launch attribute additions surface automatically via WC's attribute taxonomy — if any case requires code, FR-30-13's checklist says so explicitly);
(d) **top SEO text** — a RichText block attribute (1–3 sentences) above the grid, fully operator-editable in the block editor;
(e) **bottom SEO text** — RichText attribute below the grid with the read-more expand: full text server-rendered in the HTML; collapsed via a wrapper with `height:0; overflow:hidden; visibility:hidden` + `aria-hidden="true"` (NOT `display:none` on the text, NOT JS-injected content); the toggle is a `<button>` with `aria-expanded` + `aria-controls`, accessible name flips Read more/less, ≥44px; the collapsed line count N is an inspector integer control. Collapsed text remains ASA-subject — factual claims only.
**Model:** sonnet build + opus design review. **Done when:** at 375px the archive paints with filters closed + a sticky Filter button opening a drawer; chips render/remove and persist across a paginate-away-and-back; `curl` of the archive HTML contains the FULL bottom text pre-expand; the toggle passes button/aria checks in axe + a manual keyboard run; top text, bottom text, and N are all editable in the block editor with zero code.

### FR-30-4 — Cart / checkout / Mini-Cart styling
Brand-style core Cart, Checkout, and the Mini-Cart slide-out drawer (header placement; drawer width exposed as a Site-Editor global style / CSS custom property, not hard-coded). Gateway compatibility is FR-30-0(c)'s gate, not discovered here. Core controls the drawer markup — styling targets the most stable selectors available and is re-verified per WC band.
**Model:** sonnet. **Done when:** add-to-cart from the PDP opens/updates the styled Mini-Cart drawer; cart→checkout completes a test order on the canary via the FR-30-0-verified gateway; all three surfaces render with zero horizontal overflow at 375/768/1440 (screenshot set attached) + axe 0 violations per surface. (Brand-styling judgement is Bean's R-22-13 gate, separate from this structural Done-when.)

### FR-30-5 — SGS product search block
A live/keyword product-search block. **This is the spec's largest net-new build — the effort tentpole; sequence it accordingly.**
- **Behaviour:** debounce 300ms client-side; suggestions render product title + thumbnail + permalink ONLY. No-JS fallback = a standard `<form method="get">` submitting `?s={query}&post_type=product` (product-scoped, not site-wide). Empty-result state renders visible "No products found" text (+ ARIA live announcement), never a blank dropdown.
- **Server hardening (red-team must-fixes):** the REST handler enforces server-side rate limiting (≤30 req/IP/min via transient/object-cache counter — client debounce is UX only, not protection); rejects queries <2 chars; sanitises the query (`sanitize_text_field` + `wc_clean`) before any query arg; constrains results to `post_status='publish'` AND `catalog_visibility IN ('visible','search')` — never draft/private/password-protected/hidden (this codebase shipped exactly this leak class before — merchant feed, fixed with the visibility filter); response schema is fixed at the endpoint (ID, title, permalink, thumbnail — NO price fields, NO meta, NO variation data); responses via `WP_REST_Response` (correct headers); suggestion titles enter the DOM via `textContent`, never `innerHTML` (XSS via product titles).
- **A11y:** the full combobox pattern — `<form role="search">` landmark → input `role="combobox"` + `aria-autocomplete="list"` + `aria-controls` → suggestions `role="listbox"`/`role="option"`; keyboard navigable; 44px targets. (Not a naked `role="searchbox"`.)
- **Quality floor:** prefix + in-title matching minimum, with relevance ordering (exact-prefix before substring); suggestion response <150ms server-side on a 500-product fixture; executed-JS weight measured and recorded against the budget.
- **Maintenance gate:** the dependency manifest (FR-30-0b) names the query API this block relies on; a regression check (scripted, wired to something that runs — `dont-claim-a-guard-is-enforced-unless-wired-to-something-that-runs`) re-runs the search fixture on every WC band bump.
**Model:** opus design-gate + sonnet build. **Done when:** typing ≥2 chars surfaces matching products on the canary ordered prefix-first; a draft product's title NEVER appears in suggestions (live-probed); curl-hammering the endpoint past the rate limit returns 429; Enter with JS disabled lands on a product-scoped results URL; a product titled `<img src=x onerror=alert(1)>` renders inertly in the dropdown; axe 0 violations; registered via `/sgs-update`.

### FR-30-6 — SGS searchable attribute filter
A type-to-find input INSIDE a filter group, auto-enabled when the attribute has **more than 15 options (i.e. 16+)** — single threshold, Baymard-derived; composing with core Product Filters (same query params — filtering stays core). Matches options client-side; announces the narrowed count via an ARIA live region; narrowing to 0 shows "No matching options". **Term population MUST be visibility-scoped** (terms counted against published/visible products only — an attribute term attached only to a draft product must not appear; no unscoped `get_terms()`).
**Model:** sonnet. **Done when:** an attribute fixture with exactly 16 terms renders the input and one with exactly 15 renders none (boundary-tested); typing narrows visibly + announces the count; a term existing only on a draft product is absent (live-probed); applying a narrowed option filters the collection identically to core.

### FR-30-7 — option-picker → cart wiring (REWRITTEN v1.1 — wire, don't rebuild)
**The cart write, variation resolution, 409 availability re-sync, and coming-soon demand-capture are SHIPPED** (Reuse Inventory). This FR builds ONLY the genuinely-new piece: **the cross-block bridge** that wires the standalone `sgs/option-picker` (in the PDP template context) to the shipped configurator cart path.
- **The bridge:** `sgs/option-picker` dispatches `sgs:option-selected` (a colon-named CustomEvent). WP Interactivity's `data-wp-on--` **silently fails to bind colon-named events** — the bridge MUST use the captured-context `data-wp-init` + plain `addEventListener` pattern (per the recorded lesson), and the Done-when live-asserts the event actually drives the cart write across the block boundary.
- **Validation:** before emitting the add-item call, the client layer verifies the resolved `variation_id` exists in the SEC-1 seeded manifest for THE CURRENT product AND carries `is_purchasable` + `is_in_stock` true; a valid-combination-but-null-variation lookup (deleted variation) renders the FR's error state, never a silent wrong-item add. The server proxy already rejects cross-product IDs — the Done-when proves it (a foreign variation_id POST returns 4xx).
- **Failure path:** on proxy failure (400/409/503) the UI renders a dismissible inline human-readable error (ARIA live), the button re-enables, cart state unchanged. The shipped 409 re-sync handles the paint-vs-stock race.
- **Differentiator coupling (council: this, not pills, is the moat):** selection updates the live value-ladder/per-unit price display (FR-30-8) per combination — the thing core's Add-to-Cart+Options cannot do. %-off badges use the SAME server-side reference-price field as FR-30-8 — no badge without it.
- **Operator controls:** unavailable-option label text ("Coming soon"/"Sold out"/custom), notify-me CTA label, per-unit denomination — all inspector controls (framework rule).
- **Notify-me capture (PII):** `sanitize_email()` + `is_email()` before storage; store ONLY email + product_id + timestamp; nonce required; rate-limited (≤3/IP/hour); un-pre-ticked PECR consent checkbox + privacy-policy link; data stays in WP. If any of this can't ship at P1, notify-me is explicitly DEFERRED in the commit — not shipped half-guarded.
**Model:** opus (bridge design) + sonnet build. **Done when:** on a multi-axis variable product, ≥3 distinct pill combinations (incl. one multi-axis) each add the EXACT matching variation via the `/sgs/v1` proxy (cart inspected); a foreign variation_id POST returns 4xx; a simulated 503 renders the dismissible error + button re-enables; selecting a tier updates the per-unit/value-ladder line live; pills satisfy radiogroup semantics (arrow keys, single tab stop, `aria-checked`); all three label controls editable with zero code; grep shows zero direct `/wc/store/v1/cart` writes.

### FR-30-8 — Price display (per-unit + value-ladder)
Per-unit display ("£X per cookie/100g") is **table stakes** (UK unit-pricing aligned; free plugins do it) — the differentiator is its LIVE coupling to the configurator's selected tier (FR-30-7). **Home (pre-decided v1.1, was builder's-choice):** a sibling output of the configurator/option-picker rendering, NOT a `product-card` attribute — preserving D204's price-never-overridable invariant. **Computation is server-side** (render.php/REST), never client-side arithmetic. The reference price for strikethrough/%-off is an operator-entered `_sgs_reference_price_pence` meta with Spec 28's strict-guard pattern — never derived from `regular_price`, never auto-computed; no reference price set → no strikethrough/badge renders anywhere (CMA/ASA: phantom "was" prices + fake urgency are enforcement targets; no countdown timers). Displayed prices follow WC's tax-display setting so headline and per-unit lines always agree (UK inc-VAT default; B2B ex-VAT display is Open Question 3). The per-unit denomination string is an inspector control.
**Model:** sonnet. **Done when:** PDP shows headline + per-unit derived from real product data, both consistent with the WC tax-display setting; with no reference price set, no strikethrough/badge renders (grep confirms zero client-side %-off arithmetic + live check); with one set, the badge shows the correct %; the denomination string is editable with zero code.

### FR-30-9 — Schema completeness per page type
Audit + align the SHIPPED emitters (Reuse Inventory) — do not rewrite:
- **PDP:** one `Product` node + nested `Offer` (`price`, `priceCurrency`, `availability`, `priceValidUntil` when a sale end-date exists, `url`) + `brand` + `sku`/`gtin`/`mpn` + `offers.shippingDetails` + `offers.hasMerchantReturnPolicy` **including `returnPolicyCountry` (now required; sourced from the WC store base-country setting unless overridden)** + `BreadcrumbList`. Variants via the shipped `ProductGroup` gating. No `positiveNotes`/`negativeNotes` (merchant pages ineligible).
- **Shop:** `BreadcrumbList` + URL-only `ItemList` (D204's page-level walker) — NO per-item Product markup.
- **Cart/checkout/account:** no schema + noindex implemented via `is_cart() || is_checkout() || is_account_page() || is_wc_endpoint_url()` (catching ALL dynamic account endpoints), emitted as `noindex,nofollow`.
- **Sitewide:** `Organization` (logo, sameAs, contactPoint, address, org-level `hasMerchantReturnPolicy` + `hasShippingService` as the canonical base) + `WebSite` (name/url/alternateName, NO `SearchAction`).
- **Remove:** rich-result-purposed `FAQPage` + any `SearchAction` (FR-27-F2's AI-citation FAQ blocks keep their non-Google framing).
- **Guards:** emitters gate on `get_post_status()==='publish'` AND `$product->is_visible()` (this codebase HAD a draft→public JSON-LD leak — D204); schema output never cached across auth contexts. `aggregateRating`/`review` nodes emit IF AND ONLY IF FR-30-10's live review source has data — at P4 build time, if FR-30-10 isn't deployed, the emitter omits review nodes, never stubs them. Visibility rule: only on-page-visible content is marked up — EXCEPT linked-entity nodes (`shippingDetails`, `hasMerchantReturnPolicy`, `Organization`) which may reference policy pages, per Google's own merchant-listing guidance.
**Model:** sonnet audit + opus adversarial check. **Done when:** (1) a local JSON-LD validator reports zero errors against the shapes above (environment-independent gate); (2) Google Rich Results Test passes the canary PDP post-deploy (verification, not the primary gate); (3) a scheduled/draft product URL fetched as a guest emits ZERO JSON-LD; (4) curls of `/cart/`, `/checkout/`, `/my-account/orders/`, `/my-account/edit-address/`, `/my-account/view-order/{id}/`, `/checkout/order-received/{id}/` each show noindex; (5) grep: zero `SearchAction`, zero rich-result `FAQPage`; (6) `returnPolicyCountry` present in PDP + org output.

### FR-30-10 — Reviews (DMCC-compliant)
PDP reviews come from Trustpilot (`sgs/trustpilot-reviews` synced) or a verified-buyer source. Static/baked review content is BANNED everywhere (UK DMCC Act in force 2026-04-06: fake/undisclosed-incentivised reviews illegal; the displaying trader is liable; ≤£300k or 10% turnover). The cloning pipeline maps draft review sections to the live review block, never to static testimonial content. **Empty/failed state (a new shop has ZERO reviews on day one):** when the source is empty, stale, or down, the reviews section renders a graceful state — an inspector toggle chooses hidden vs a "Reviews coming soon" placeholder — never a broken layout gap; schema emits nothing (FR-30-9 gate).
**Model:** sonnet. **Done when:** the canary PDP renders only synced/verified reviews; with the sync disabled/empty the PDP renders without a layout gap and the toggle switches the empty behaviour with zero code; grep of templates + converter emit finds zero hardcoded review text; schema `review`/`aggregateRating` emits only when live data exists.

### FR-30-11 — Responsive + budget verification gate
Every page type (PDP, shop, cart, checkout) verified at 375/768/1440 via a **named, committed Playwright script** (`scripts/wc-pages-responsive-audit.js` or equivalent) run at each phase close — touch targets ≥44px, no horizontal scroll, drawer/filters/gallery usable at every width — PLUS an executed-JS weight measurement per page against the <50KB budget.
**Model:** sonnet (scripted run). **Done when:** each phase-close commit links the script run's screenshot artefacts (3 widths × affected pages) + the executed-JS figures + axe 0 violations per page. A phase does not close without them.

### FR-30-12 — Pipeline gate (cloning thread)
A cloned product page targets the WC **single-product template on a real `product` post** (`is_product()`), never a WP Page / `page:144`. The converter maps the product draft's layout to the FR-30-2 composition (core WC blocks + shipped SGS blocks). **Gate (narrowed v1.1):** product-page cloning unblocks when **FR-30-0/1/2/7** ship — the PDP chassis + wiring. FR-30-5/6 (shop search/filter) are NOT dependencies of a single-product clone and do not gate it. **AI-path proof:** the clone is produced by the converter from the draft with zero manual template authoring (Rules 1/2) — a hand-composed page must not masquerade as pipeline output.
**Model:** n/a (gate). **Done when:** the first product-page clone run deploys to a product post, the live URL renders via the single-product template (template source verified), zero draft BEM classes in the emit, and the emit is converter-produced end-to-end.

### FR-30-13 — Go-live checklist (NEW v1.1)
A documented, repeatable pre-launch gate run before ANY client shop takes real money: (a) payment gateway in LIVE mode verified (test transaction or gateway dashboard confirmation); (b) return-policy fields populated (the FR-30-9 local validator passes — no empty `hasMerchantReturnPolicy`); (c) review source connected with ≥1 genuine review synced OR the empty-state toggle deliberately set; (d) per-unit denomination strings set (no placeholder text); (e) product data completeness sweep — published products missing `sku`/`gtin` listed (Google silently downgrades merchant listings); (f) statutory content present for the vertical (food: allergen information placed in the FR-30-2 content slot); (g) FR-30-11's script run green on the live site; (h) cookie-consent state verified if any capture/analytics is active (PECR).
**Model:** sonnet (checklist doc + any automatable probes). **Done when:** the checklist exists as a versioned doc in the repo, each item has a named probe or manual step, and the first client launch records a completed pass.

## Phasing (v1.1 — re-cut per council)

1. **P1 — Working PDP + cart loop:** FR-30-0 (entry gate incl. gateway pre-flight) → FR-30-1, FR-30-2, FR-30-7, FR-30-4. No interim WC-selector build — the shipped option-picker wires in directly. **FR-30-12's pipeline gate unblocks at P1 close.**
2. **P2 — Differentiators:** FR-30-8 (price coupling), FR-30-10 (reviews).
3. **P3 — Shop:** FR-30-3, FR-30-6, then FR-30-5 (the effort tentpole — last, with its own design gate).
4. **P4 — Schema:** FR-30-9 (can run parallel to P2/P3). FR-30-13 before the first real launch.
- FR-30-11 gates every phase close.

## Open Questions

1. ~~FR-30-7 read-path~~ — CLOSED v1.1: the shipped SEC-1 manifest + cart proxy IS the path (Reuse Inventory). No `@woocommerce/block-data` research needed.
2. ~~FR-30-8 home~~ — CLOSED v1.1: sibling output of the configurator rendering, not a product-card attribute (preserves the D204 price invariant).
3. **B2B price display** — Indus Foods is B2B (trade buyers): ex-VAT display vs the consumer inc-VAT default. Needs a per-client display-context decision before Indus's shop build (not blocking Mama's).
4. **Subscriptions / reorder (council: the food-DTC deal-winner)** — repeat purchase is THE food-DTC metric; WC Subscriptions is compose-not-build territory. Parked pending Bean's call on scope + the extension licence. Sibling parked items: build-a-box bundles (a small FR-30-7 extension, phase-3 candidate), A/B price-display hooks, GA4 funnel events on the configurator.
5. **Gateway matrix result** — FR-30-0(c) records the verified matrix for the first client at P1 entry.
