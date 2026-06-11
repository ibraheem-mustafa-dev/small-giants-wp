# Step 5 design — FR-30-7 option-picker → cart bridge (opus design half, 2026-06-11)

**Decision: (b) thin buybox wrapper block — `sgs/buybox` — mounting the EXISTING `sgs/product-card` Interactivity store. NOT self-seeding option-picker.**

## Ground truth read (mandated by plan pre-emptive decision)

| Fact | Source |
|---|---|
| option-picker is purely presentational: operator-typed `optionItems`, single axis, no product awareness, no cart button. view.js only dispatches `sgs:option-selected` (bubbling CustomEvent). | `src/blocks/option-picker/render.php` + `view.js` |
| product-card owns the WHOLE configurator engine: `Product_Manifest::build()` + lean seed (`sgs_lean_seed_combos`, 24KB cap) + `wp_interactivity_data_wp_context` + `data-wp-init="callbacks.initPillBridge"` bridge + `actions.addToCart` (proxy POST, 409 re-sync) + `applyAvailability` greying. Store namespace `sgs/product-card`. | `product-card/render.php` L357–532, `view.js` L182–860 |
| product-card already composes one option-picker PER AXIS via `render_block()` — the wrapper pattern is shipped + proven. | `product-card/render.php` L776–804 |
| The engine is mount-safe outside a card: `applyPillSelection` is ctx-pure except thumb-strip + value-ladder, both null-guarded (`if (cardRef)`, `if (strip)` — no-op when absent); `applyAvailability` queries generic `.sgs-option-picker__options[data-type-key]`. | `view.js` L505–544, 579, 832 |
| Cart proxy validates server-side: cross-product/foreign variation rejection, purchasable+stock, attribute matching, rate limits. Client validation is UX, server is authority. | `includes/class-cart-proxy.php` |
| Demand-analytics is a PII-FREE aggregate counter (nonce + hashed-IP rate-limit; explicitly "no PII is ever persisted"). There is NO shipped guarded email-capture path. | `includes/class-demand-analytics.php` header + L172–267 |

## The design

1. **New block `sgs/buybox`** (dynamic, render.php, category sgs-content). In a product context (`$block->context['postId']` → fallback `get_queried_object_id()`, `wc_get_product()`):
   - **Variable product + manifest builds + ≤24KB cap:** render per-axis option-pickers (copy product-card L776–804 pattern; **skip axes with <2 terms** — single-variant suppression, QA Gate B), an SGS price row (ctx-bound spans, SSR-seeded — replaces core product-price for variable products; FR-30-8 "sibling output" pre-decision), stock line, add-to-cart `<form action=permalink>` + submit button (card markup parity: `data-wp-on--submit="actions.addToCart"`, `data-wp-bind--disabled="context.pending"`, aria-busy), cartStatus ARIA-live error region **with a dismiss button**, availabilityNote live region. Wrapper carries `data-wp-interactive="sgs/product-card"` + `data-wp-init="callbacks.initPillBridge"` + `wp_interactivity_data_wp_context( $context )` with the SAME context key shape as the card (gallery keys seeded neutral: `gallery: []`, `thumbsHidden: true`).
   - **Simple product / WC absent / manifest null / cap tripped:** fall back to `do_blocks()` of core `woocommerce/add-to-cart-with-options` + `woocommerce/product-price` — core path per FR-30-2.
2. **Engine reuse, zero duplication** (lesson `duplicated-calculation-drifts`): buybox loads product-card's view module — preferred `wp_enqueue_script_module()` of the card's registered module ID from buybox render.php; fallback a thin buybox view.js that `import`s the card module source. Small BACKWARDS-COMPATIBLE engine additions only:
   - `actions.dismissCartStatus` (sets `ctx.cartStatus = ''`) — FR-30-7 dismissible error.
   - `applyAvailability` reads `ctx.soldOutLabel` / `ctx.unavailableLabel` with current literals as defaults — operator-editable labels (buybox inspector controls, seeded into ctx). Benefits card too (R-22-9 universal).
3. **Template part:** `parts/sgs-pdp-buybox.html` swaps core `product-price` + `add-to-cart-with-options` for `<!-- wp:sgs/buybox /-->` (breadcrumbs/title/rating stay core).
4. **Gallery swap (riskiest unknown — probe FIRST on canary):** core `woocommerce/product-gallery` is Interactivity-based in WC 10.x. Probe its store/context on the live PDP; if drivable from the bridge (store action or context write), wire it; if not, document the fallback (gallery static at P1, flagged to Bean at R-22-13) — price+cart correctness are the hard acceptance.
5. **Notify-me: DEFERRED at P1** (explicit, per FR-30-7 rule). No shipped guarded email-capture exists; building PECR-compliant capture (consent UI + storage + rate limits) is its own unit. Commit message carries the DEFER note. The notify-me CTA label control ships with the deferral.

## Why not (a) self-seeding option-picker
- One picker = ONE axis; a multi-axis product needs N pickers but ONE manifest, ONE price line, ONE button — that's a wrapper's job. Self-seeding would duplicate the manifest context per axis and leave the button homeless.
- Keeps option-picker presentational (used in typed/non-WC contexts unchanged).

## Store-namespace note
`sgs/buybox` mounting `data-wp-interactive="sgs/product-card"` is INTENTIONAL: that store IS the shipped configurator engine (proxy wire format M-C2, 409 re-sync, availability). Renaming/extracting it at P1 = churn on a shipped block with zero behaviour gain. Revisit only if a third consumer appears.
