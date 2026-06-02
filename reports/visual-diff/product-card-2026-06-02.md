---
doc_type: report
block: sgs/product-card
generated: 2026-06-02
verdict: PASS
first_paint_capture_passed: true
session_tag: small-giants-wp-2026-06-02-theme-phase-c
canary_page: /cart-increment-test/ (page 514)
---

# Visual diff — sgs/product-card Phase C Bound mode

Phase C adds a Bound mode to `sgs/product-card` (D151 / Spec 24 §FR-24-2/3/9).
This is a NEW functional mode, not a mockup-parity task — there is no mockup to
pixel-diff against. "Visual verification" here = the rendered card is correct,
first paint is meaningful (SSR concrete values, no FOUC), and there are zero
console errors. All verified live on the sandybrown canary (logged-in admin).

## verdict: PASS

## first_paint_capture_passed: true
The bound card server-renders concrete initial values (no JS required for first
paint): real image `src`, real price HTML, product title. The `data-wp-*`
directives are progressive enhancement only. No flash-of-unstyled / empty state.

## Evidence (live, canary page 514 + REST block-renderer context=edit)

### WooCommerce-bound (product 513, simple product)
- Renders: title "Mamas Munches Zookies", price `£10.00` (WC `get_price_html()`
  rich markup), image (WC placeholder — product has no image), add-to-cart button.
- Add-to-cart E2E: click → `POST /wc/store/v1/cart/add-item` → 201 → `sgs/cart`
  badge incremented 1 → 2, **no full reload** (loadId survived), **no `wc-ajax`
  / `get_refreshed_fragments`**, `wc-blocks_added_to_cart` dispatched, aria-live
  status "Added to your basket."

### SGS-CPT-bound (sgs_product 522, with `_sgs_variation_sets`)
- Renders: title "Zookies (CPT test)", price `10.00 from` (SGS meta), and the
  option-picker pills `8-pack / 12-pack / 20-pack` (`data-type-key="pack-size"`).
- Add-to-cart correctly ABSENT (non-WC product — nothing to add to the WC cart).

### Empty / security
- Missing/unresolvable product → designed empty state ("No product selected"),
  never blank.
- IDOR guard: binding `sourceMode=sgs-cpt` to a non-`sgs_product` id (Sample Page,
  id 2) returns the empty state — no foreign post content leaked.

### Console
- 0 errors, 0 warnings attributable to the card (only a WC info notice +
  jQuery-migrate log, neither from `sgs/product-card`).

## Known dormant (not a regression)
Pill → price/image swap is wired (Interactivity API, context-seeded) but visually
dormant: Phase-B `_sgs_variation_sets` stores only `{key,label}` per option (no
per-option price/image). Visible swap lands with the per-option data model
(Phase 2 SKU matrix).

## Review
2-rater cross-model code review (Sonnet code-reviewer + Haiku security/correctness)
before commit; all findings fixed (IDOR post_type guard, single-fetch
variation-sets helper, view.js nonce `.ok` check, JSDoc, no-double-wrapper editor
preview). `php -l` clean; `npm run build` green.
