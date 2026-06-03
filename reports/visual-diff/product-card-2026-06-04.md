---
doc_type: report
block: sgs/product-card
generated: 2026-06-04
verdict: PASS
first_paint_capture_passed: true
canary_page: /sgs-configurator-test-540/ (page 589, fixture product 540)
---

# Visual diff — sgs/product-card (Spec 27 Phase-1 pill-swap U3/U4/U7/U5)

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
