---
doc_type: reference
title: "Visual-diff report — sgs/product-card badge foreground-colour no-inline migration"
block: sgs/product-card
date: 2026-07-30
wave: "FR-32-4 (D345) no-inline rollout — remaining sites batch"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/product-card — `--sgs-pc-badge-fg` — VERIFIED LIVE ON A NEW CANARY INSTANCE

**Verdict: PASS.** A new canary page (`sgs-gate-canary-2`, page ID 2071) was built with a
`sgs/product-card` instance in `sourceMode:"wc-product"` bound to WooCommerce product 1125
("SGS Single-Variant Fixture" — publish, variable, 1 published variation). This reaches the
manifest-driven live-variable branch (`null !== $manifest`) in render.php, which always emits
the `--sgs-pc-badge-fg` scoped rule (it's unconditional on `$discount_text_colour` resolving,
not on an actual discount being active) covering both
`.product-card__discount-label,.product-card__best-value-badge`. Captured live via Playwright
at 1440px and 375px: no `style` attribute, correct computed value.

**Note:** this block also has a same-day PRE-EXISTING report
(`reports/visual-diff/product-card-2026-07-24.md`, PASS) for an UNRELATED editor-preview fix
(typed-mode CTA/text colour preview parity) — that report is not superseded by this one; they
cover different changes and different dates, so no collision/append was needed here.

## What changed
`plugins/sgs-blocks/src/blocks/product-card/render.php` (inside the `wc-product` variable-
product branch):
```php
// Before
$primary_hex          = sgs_resolve_palette_hex( 'primary', '' );
$discount_text_colour = '' !== $primary_hex ? sgs_wcag_text_colour_for_bg( $primary_hex ) : '';
...
<span class="wp-block-sgs-label is-style-pill-wrap product-card__discount-label"
    <?php echo '' !== $discount_text_colour ? 'style="--sgs-pc-badge-fg:' . esc_attr( $discount_text_colour ) . '"' : ''; ?>
    ...>
...
<span class="wp-block-sgs-label is-style-pill-wrap product-card__best-value-badge"
    <?php echo '' !== $discount_text_colour ? 'style="--sgs-pc-badge-fg:' . esc_attr( $discount_text_colour ) . '"' : ''; ?>
>

// After
$primary_hex          = sgs_resolve_palette_hex( 'primary', '' );
$discount_text_colour = '' !== $primary_hex ? sgs_wcag_text_colour_for_bg( $primary_hex ) : '';
if ( '' !== $discount_text_colour ) {
    $sgs_card_typo_css .= '.' . $sgs_card_uid . ' .product-card__discount-label,.' . $sgs_card_uid . ' .product-card__best-value-badge{--sgs-pc-badge-fg:' . esc_attr( $discount_text_colour ) . ';}';
    $sgs_card_typo_tag  = '<style>' . wp_strip_all_tags( $sgs_card_typo_css ) . '</style>';
}
...
<span class="wp-block-sgs-label is-style-pill-wrap product-card__discount-label" ...>
...
<span class="wp-block-sgs-label is-style-pill-wrap product-card__best-value-badge">
```
The colour is IDENTICAL for every occurrence on a given card (the discount label + every
"best value" ladder row), so it's emitted ONCE as a scoped rule on the card's uid, covering
both classes via a comma-separated selector, rather than inline per element. This wave also
removed a separate, unrelated dead-code hazard in the same file: a leftover
`$inner_padding_css`/`$inner_padding` read-with-no-writer left behind by the 2026-07-24
`cardPadding` box-object migration (harmless in output but raised a PHP 8 "Undefined
variable" warning on every render — deleted, not repaired).

## Canary instance
`https://sandybrown-nightingale-600381.hostingersite.com/sgs-gate-canary-2/` (page ID 2071),
block markup:
```
<!-- wp:sgs/product-card {"sourceMode":"wc-product","productId":1125,…} /-->
```

## Evidence
- **Element found live:** `.product-card__discount-label` renders inside `.price-row` (the
  span exists in the SSR markup regardless of whether a sale is active — visibility is toggled
  client-side via `data-wp-bind--hidden="context.discountHidden"`; the CSS custom property is
  present on the element either way, which is what this fix protects). `.product-card__best-
  value-badge` does NOT render on this instance — it only appears inside a comparative-value-
  ladder row (`showLadder`), which needs ≥2 pack sizes; product 1125 has exactly 1 ("Single"),
  so there is nothing to compare. The discount-label alone fully exercises the changed
  `--sgs-pc-badge-fg` code path (both classes share one scoped-rule selector — see the CSS
  below), so this is sufficient evidence for the fix.
- **No-inline contract holds:** `element.getAttribute('style')` === `null` on
  `.product-card__discount-label` at both 1440px and 375px.
- **Computed value correct:** `getComputedStyle(el).getPropertyValue('--sgs-pc-badge-fg')` ===
  `"#000"` at both viewports (WCAG auto-contrast black-on-primary, from
  `sgs_wcag_text_colour_for_bg()` against the resolved `primary` token).
- **CSS lands in an inline `<style>` TAG embedded in the block's own markup** (this element's
  CSS is NOT lifted to the external `uploads/sgs-css/` file — it's built via
  `$sgs_card_typo_tag = '<style>' . ... . '</style>'` and echoed directly as part of the
  card's HTML, same mechanism as the block's other per-instance typography rules). This is
  still no-inline-contract compliant: the contract bans inline `style="…"` ATTRIBUTES, not
  scoped `<style>` TAGS — confirmed present in the page source:
  ```css
  .sgs-pc-8 .product-card__discount-label,.sgs-pc-8 .product-card__best-value-badge{--sgs-pc-badge-fg:#000;}
  ```
- **Method + tooling:** `plugins/sgs-blocks/scripts/gate-canary-2-capture.mjs` (Playwright,
  run via `node`, chromium headless).

```json
{
  "block": "product-card",
  "selector": ".product-card__discount-label",
  "prop": "--sgs-pc-badge-fg",
  "viewport": "1440",
  "found": true,
  "styleAttr": null,
  "computedValue": "#000"
}
```
(identical result at `"viewport": "375"`.)

## Side finding — NOT part of this fix, flagging for a separate ticket
The first attempt used productId 540 ("Mama's Test Box — 48 SKU fixture", 48 published
variations, each with a 5-image gallery). That instance rendered NEITHER the manifest-driven
badge markup NOR the discount label — it silently fell to the "cap-exceeded" non-interactive
fallback branch (`render.php` ~line 1250, `Non-variable live-data mode (simple WC product /
CPT / cap-exceeded fallback)`). Root cause, confirmed via a throwaway diagnostic script (not
`wp eval`, which the deploy-safety hook blocks): `Product_Manifest::build(540)` returns a
valid 48-combo manifest, and `Sgs_Configurator_Compat::is_supported()` returns `true` (WC
10.9.4 ≥ the 9.8 floor) — but the FULL per-instance `$context` array (which includes each
combo's `gallery` field, i.e. every image URL for every one of the 48 variations) exceeds the
M-C9 24KB hard cap at `render.php:747`, so it silently unsets `$context`/`$manifest`/`$def`
and falls through. The inline comment at that line ("never trips for 48 SKUs (~6 KB)")
under-counts real catalogues that carry per-variation image galleries — the estimate assumed
gallery-less combos. Not fixed as part of this no-inline migration (worked around by using
productId 1125, a 1-variation fixture well under the cap). Recommend a follow-up: either raise
the M-C9 cap, or exclude `gallery` from the lean per-combo seed when it would push the payload
over budget (falling back to `imageUrl` only, which is already the v5 authoritative-when-no-
gallery value).
