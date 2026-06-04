---
doc_type: report
block: sgs/product-card
generated: 2026-06-04
verdict: PASS
first_paint_capture_passed: true
canary_page: /sgs-configurator-test-540/ (page 589, fixture product 540)
---

# Visual diff — sgs/product-card (Spec 27 Phase-1 pill-swap U3/U4/U7/U5 + U9 WCAG button)

## verdict: PASS
## first_paint_capture_passed: true
Bound variable card SSRs concrete default price/image/title + two option-pickers (no-JS safe);
`data-wp-*` bindings are enhancement only and resolve to the seeded literals server-side (no wipe).

## Evidence (live, canary page 589, fixture 540 = 48 SKUs)

### U3 — manifest + SSR seed
- `data-wp-context` carries the 48-combo manifest at **8,529 bytes** (≤ 24 KB cap).
- Default variation (541, 12-pack/vanilla) renders **£9.99** as no-JS SSR text (real `£`, not `&pound;`).
- Two pickers render: **Size** (4 pills) + **Flavour** (12 pills). 0 console errors.

### U4 — pill-swap (no XHR on change)
- 48-pack/vanilla (sale 565) → price swaps to **£24.49** with **£34.99** struck through + **"30% off"** badge.
- 48-pack/chocolate → £34.99 (no sale); 12-pack/chocolate → £9.99.
- **0 network requests** on pill change. 0 console errors.
- Screenshot: `product-card-2026-06-04-sale.png` (48-pack + Vanilla selected, sale price shown).

### U7 — secure add-to-cart (proxy)
- Add to Cart → `POST /sgs/v1/cart/add-item` body `{"id":565,"quantity":1,"variation":[{"attribute":"Size","value":"48-pack"},{"attribute":"Flavour","value":"vanilla"}]}` + `X-WP-Nonce`, **no price field**.
- Response 200; **cart readback holds variation 565 at line_total 2449 (£24.49)** — right variation, server-computed price.

### U5 — cross-attribute availability + 4 a11y gates
- **Both directions:** 12-pack selected → "coffee" greys (546 OOS), vanilla stays; coffee selected → "12-pack" greys, 24-pack stays.
- Greyed options: `aria-disabled="true"` + line-through/opacity + `aria-label="… (unavailable)"`; polite live-region announce on change.
- **0 XHR on select** (availability computed client-side from the manifest).
- **axe-core: 0 violations** (wcag2a/2aa/21aa/22aa, scoped to the card).
- **Keyboard:** all 16 pills focusable, no trap.
- **44px targets:** all 16 pills measured **44×44px** (card-scoped `min-height` — shared option-picker + page-144 untouched).

### U9 — add-to-cart `<a role=button>` → real `<button>` + 4 objective a11y gates (FR-27-B1)
- The add-to-cart control is now a native `<button type="submit">` inside a `<form method="post" action="<permalink>">` (both Bound branches). No-JS submit lands on the product page (identical to the previous `<a href>`); JS intercepts `data-wp-on--submit` → preventDefault → secure proxy.
- **Live SSR confirmed (page 589):** `role="button"` count **0**; one `<form class="product-card__cart-form">` + one `<button type="submit" class="btn btn-primary product-card__add-to-cart" aria-busy="false">`.
- **CSS:** `.product-card__cart-form{display:contents}` keeps the `<button>` the direct flex item of `.product-card-body` → it stretches full-width exactly as the `<a>` did (button measured 1158×49 on the full-width page-589 layout — pills + button all ≥44px). `button.product-card__add-to-cart{appearance:none}` strips native chrome. Both **new** selectors; no shared rule modified. Screenshot: `product-card-u9-button-2026-06-04.png`.
- **Gate (a) axe-core: 0 violations** (wcag2a/2aa/21a/21aa/22aa, card-scoped).
- **Gate (b) keyboard:** ArrowRight moves the radiogroup (12-pack → 24-pack, and the price reactively swapped to £18.99); Tab reaches the button and exits the card (no trap); **Space fires add-to-cart** AND **Enter fires add-to-cart** (the exact criterion `<a role=button>` failed — anchors ignore Space).
- **Gate (c) SR structure:** 2 `role="radiogroup"` each `aria-labelledby` its legend (Size/Flavour); button accessible-name "Add to Cart"; 4 `aria-live="polite"` regions (price-row, stock, availability, cart-status).
- **Gate (d) 44px:** every pill (16) + the button measured ≥44px via computed bounding-rect. **0 console errors.**
- Verified by an isolated Playwright + axe-core node script (the shared MCP browser was held by the cloning session); throwaway script removed after the run.

### Bean R-22-13 sign-off fixes (Bound card polish)
Bean's visual review (the co-authoritative gate) caught what the automated gates missed:
- **Card width** — the bound card stretched to the full 1200px content width (placeholder image became a 1198×220 strip). Root cause: WP's constrained-layout `.wp-container-… > :where(:not(.alignfull)){max-width:1200px}` ties the card's own `.product-card{max-width:380px}` (both (0,1,0)) and wins on source order. Fixed with `.product-card.product-card--bound{max-width:380px}` (0,2,0). **Live-verified: card offsetWidth 1200→380, image 1198→378.**
- **Resting pill outline** — unchecked pills had a dark-brown (`#3a2e26`) border; only the selected pill was pink. Fixed: `.product-card--bound .sgs-option-picker{--sgs-op-border: var(--wp--preset--color--primary)}`. **Live-verified: unchecked border now rgb(230,138,149) pink.**
- **Card hover** — none existed. Added a Bound-scoped lift + shadow (`translateY(-4px)` + deeper shadow), reduced-motion-guarded. **Live-verified: transition-property = transform, box-shadow.**
All three are new `.product-card--bound`-scoped selectors — page-144 Typed clones byte-identical. product-card 1.6.3→1.6.4.

### Bean R-22-13 round 2 (product-page links + readability + cart feedback)
Bean's second review pass + a `/research-buddies` study (Heydon Pickering Inclusive Components, Adrian Roselli, Kitty Giraudel, Smashing/Kalcevich, HTML spec, WooCommerce convention):
- **Product-page links** — the card had no link to the product page. Added **image-as-link** (`<a class="product-card__img-link" tabindex="-1" aria-hidden="true">` — clickable for mouse/touch but removed from tab order + a11y tree, so no redundant duplicate link) + **title-as-link** (`<a class="product-card__title-link">` inside the `<h3>` — the one keyboard-focusable link). NO whole-card overlay (the card has nested interactive controls — pills + add-to-cart button — so an overlay would be an axe `nested-interactive`/WCAG failure + steal clicks) and NO redundant "View details" link. href = the product permalink (same URL the no-JS form uses). Both interactive Bound branches; **live-verified** title-link + img-link present, href correct.
- **Description colour** — Bean's call: switched the Bound card description from brand-brown `#3a2e26` to pure near-black `#1a1a1a` (Bound-scoped). The measurement showed `#3a2e26` was already ~12:1 (not grey-muted), but Bean wanted crisper — his decision, recorded.
- **Add-to-cart feedback** — add-to-cart worked but was invisible (success message was screen-reader-only). Removed `sgs-sr-only` from `.product-card__cart-status` + styled it as a visible success note (`#15803d`, 4.8:1). (Header cart badge = separate follow-up.)
- 2-agent research-buddies converged; convention captured: interactive cards use discrete image+title links, navigation-only cards (content-collection results) may use a whole-card overlay. product-card 1.6.4→1.6.5. Bound-scoped; page-144 untouched.

### Bean R-22-13 round 3 (graceful no-image state)
- **No-image placeholder** — a photo-less product showed WooCommerce's default placeholder graphic (reads as broken). Now, when the resolved image URL is empty or contains `woocommerce-placeholder`, the card renders a branded `.product-card__no-image` box instead — same 220px height (no layout shift), brand `surface` background, a soft 50%-opacity framed-photo SVG icon, bottom border matching the card. Real-image products keep the existing linked `<img>` (with reactive swap) unchanged. Both interactive Bound branches; Bound-scoped only. **Live-verified** on the fixture (no photo) — clean intentional empty state, no broken graphic. Closes the no-image half of P-PRODUCT-CARD-COSMETIC-POLISH. product-card 1.6.5→1.6.6.

## Scope safety (page-144 / cloning thread)
- All changes are on the Bound `wc-product` variable branch + `.product-card--bound`-scoped CSS.
- The Typed branch is byte-identical; the shared `sgs/option-picker` block file is NOT edited (the card reaches into its rendered DOM).
- New CSS selectors only; no shared `.price`/`.price-row`/option-picker rule modified → pixel-diff-safe for page-144 Typed clones.

## Review
Opus line-by-line + multi-rater cross-model council per unit (Sonnet + Haiku; Gemini/Cerebras
unavailable — billing/access). Fixes folded: U3 currency-entity decode + mod_ts-0 cache +
pctOff floor + publish gate; U4 colon-event `data-wp-init` bridge (latent Phase-C wiring bug);
U5 409 price-survival merge + absent-combo→OOS + selected-stock refresh + >200-variation
resource guard. `npm run build` green; `php -l` clean; WPCS 0 errors; no save() change → no deprecation.
