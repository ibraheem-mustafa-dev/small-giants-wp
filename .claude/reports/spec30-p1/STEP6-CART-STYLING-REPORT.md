# Step 6 — FR-30-4 Cart / Checkout / Mini-Cart Styling Report

**Date:** 2026-06-11
**Spec:** Spec 30 FR-30-4
**Branch:** feat/spec30-wc-chassis
**Canary:** sandybrown-nightingale-600381.hostingersite.com (WC 10.8.1)

---

## Files Changed

| File | Change |
|------|--------|
| `theme/sgs-theme/style.css` | Version bumped 1.3.9 → 1.4.0 (CDN cache-bust per `bump-block-version-with-any-style-css-change` lesson) |
| `theme/sgs-theme/assets/css/woocommerce.css` | NEW — Brand styles for cart, checkout, mini-cart drawer (FR-30-4) |
| `theme/sgs-theme/functions.php` | WC CSS enqueue added (lazy-loaded behind `class_exists('WooCommerce')`); `woocommerce-block-theme-has-button-styles` body class added (WC button override signal) |
| `theme/sgs-theme/parts/header.html` | Replaced `<!-- wp:sgs/cart /-->` with `<!-- wp:woocommerce/mini-cart {...} /-->` |
| `.claude/reports/spec30-p1/STEP6-GLOBAL-STYLES-PAYLOAD.json` | Global styles JSON fragment for orchestrator to POST to `/wp/v2/global-styles/7` |

---

## Header Mini-Cart: Conflict Found and Resolved

**Conflict:** The live canary homepage was already rendering BOTH `woocommerce/mini-cart` (core WC block) AND `sgs/cart` (SGS custom block). The header.html template file only contained `sgs/cart`. The canary was showing both because the Site Editor (wp_global_styles / block theme template data in the DB) had diverged from the file.

**Resolution:** Replaced `sgs/cart` with `woocommerce/mini-cart` in `theme/sgs-theme/parts/header.html`. This is the FR-30-4 spec requirement (core WC mini-cart with drawer).

**Recommendation for orchestrator:** After deploying the updated `parts/header.html`, navigate to the Site Editor on canary, verify the header template shows only the WC Mini-Cart block (not both). The `sgs/cart` block may still appear if the DB template override is active — run: `wp post delete $(wp post list --post_type=wp_template_part --field=ID --name=header --format=ids) --force` (WP-CLI) to clear the DB override and force the file to win. Confirm visually.

---

## Selectors: Verified vs Unverified

### VERIFIED (from live canary HTML, curl 2026-06-11)

| Selector | Source | Notes |
|----------|--------|-------|
| `.wc-block-mini-cart__button` | homepage line 457 | Trigger button |
| `.wc-block-mini-cart__badge` | homepage line 460, mini-cart.css | Count badge |
| `.wc-block-mini-cart__icon` | homepage line 460 | Cart icon SVG |
| `.wc-block-mini-cart__quantity-badge` | homepage line 459 | Badge wrapper |
| `.wc-block-components-drawer__screen-overlay` | homepage line 1002 | Overlay backdrop |
| `.wc-block-mini-cart__drawer` | homepage line 1016 | Drawer panel |
| `.wc-block-components-drawer` | WC mini-cart.css + homepage | Panel element |
| `.wc-block-components-drawer__content` | homepage line 1018 | Content wrapper |
| `.wc-block-components-drawer__close` | homepage line 1022 | Close button |
| `.wp-block-woocommerce-mini-cart-contents` | homepage line 1020 | Contents root |
| `h2.wc-block-mini-cart__title` | homepage line ~1068 | Drawer heading |
| `.wc-block-mini-cart__items` | WC mini-cart.css | Items scroll area |
| `.wc-block-mini-cart__products-table` | homepage line 1067 | Products table |
| `.wc-block-mini-cart__footer` | homepage line 1249 | Footer area |
| `.wc-block-mini-cart__footer-actions` | homepage line 1257 | Button group |
| `.wc-block-mini-cart__footer-cart` | homepage line 1258 | View cart button |
| `.wc-block-mini-cart__footer-checkout` | homepage line 1262 | Checkout button |
| `.wp-block-woocommerce-cart` | cart page line 316 | Cart page root |
| `.wp-block-woocommerce-filled-cart-block` | cart page line 317 | Filled cart |
| `.wp-block-woocommerce-cart-items-block` | cart page line 318 | Items wrapper |
| `.wp-block-woocommerce-cart-line-items-block` | cart page line 319 | Line items |
| `.wp-block-woocommerce-cart-totals-block` | cart page line 327 | Totals column |
| `.wp-block-woocommerce-cart-order-summary-block` | cart page line 328 | Order summary |
| `.wp-block-woocommerce-proceed-to-checkout-block` | cart page line 343 | Checkout CTA |
| `.wp-block-woocommerce-empty-cart-block` | cart page line 353 | Empty state |

### UNVERIFIED (need live Playwright run with items in cart)

These selectors come from WC 10.8.1 source CSS / block source. The checkout page redirects to cart when empty, so no static HTML was available. Verify after a test order is placed in QA Gate B.

1. `.wp-block-woocommerce-checkout` — checkout page root
2. `.wp-block-woocommerce-checkout-fields-block` — billing/shipping fields wrapper
3. `.wc-block-components-text-input input` / `.wc-block-components-text-input select` — form field styling
4. `.wc-block-components-select select` — dropdown styling
5. `.wc-block-components-checkout-step` — step container (contact, shipping, payment)
6. `.wc-block-components-checkout-step__heading` — step headings
7. `.wc-block-components-checkout-place-order-button` — Place Order CTA (primary action)
8. `.wp-block-woocommerce-checkout-actions-block` — actions wrapper
9. `.wc-block-components-quantity-selector` / `.wc-block-components-quantity-selector__button` — cart quantity stepper (JS-hydrated)
10. `.wc-block-cart-item__remove-link` — remove item link (JS-hydrated)

---

## COD Enable Snippet

Enable Cash-on-Delivery on the canary for test orders. Two methods:

**wp-admin path:** WP Admin → WooCommerce → Settings → Payments → "Cash on delivery" → Enable → Save.

**One-shot PHP snippet** (use the webroot one-shot runner pattern — `webroot-oneshot-runner-for-guard-blocked-wp-ops` lesson):

```php
<?php
require_once dirname(__FILE__) . '/wp-load.php';

if ( $_GET['token'] !== 'REPLACE_WITH_SECRET_TOKEN' ) { exit; }

// Enable Cash on Delivery
$gateways = WC()->payment_gateways()->payment_gateways();
if ( isset( $gateways['cod'] ) ) {
    $gateways['cod']->enabled = 'yes';
    update_option( 'woocommerce_cod_settings', array_merge(
        (array) get_option( 'woocommerce_cod_settings', array() ),
        array( 'enabled' => 'yes' )
    ) );
    echo 'COD enabled';
} else {
    echo 'COD gateway not found';
}
```

Or via WP-CLI (if accessible):
```bash
wp option update woocommerce_cod_settings '{"enabled":"yes","title":"Cash on delivery","description":"Pay with cash upon delivery.","instructions":"Pay with cash upon delivery.","enable_for_methods":[],"enable_for_virtual":"yes"}' --format=json
```

After enabling, verify at WP Admin → WooCommerce → Settings → Payments.

---

## Global Styles Payload — How to Merge

File: `.claude/reports/spec30-p1/STEP6-GLOBAL-STYLES-PAYLOAD.json`

The canary's live styles are served from the `wp_global_styles` DB post (ID 7 — not theme.json on disk, which is inert). To apply the drawer-width custom property and WC block element colours:

1. GET the current post:
   ```
   GET /wp/v2/global-styles/7
   Authorization: Basic {WP_USER}:{WP_APP_PWD}
   ```
2. Deep-merge the JSON from `STEP6-GLOBAL-STYLES-PAYLOAD.json` into the response's `settings` and `styles` fields.
3. POST the merged body back:
   ```
   POST /wp/v2/global-styles/7
   Content-Type: application/json
   Authorization: Basic {WP_USER}:{WP_APP_PWD}

   { "settings": { ... merged ... }, "styles": { ... merged ... } }
   ```
4. Verify by curling the homepage and checking for `--sgs-mini-cart-drawer-width` in the inline global styles `<style>` block.

Credentials from `.claude/secrets/sandybrown.env` (`WP_APP_PWD_SANDYBROWN`).

---

## Recommended Live Checks (QA Gate B)

Run these after deploying theme + enabling COD + Step 5 bridge is live:

1. **Header conflict:** Site Editor → Templates → Parts → Header — confirm only WC Mini-Cart block is present (not `sgs/cart` as well).
2. **Mini-Cart trigger:** At 375px viewport, click the cart icon — confirm drawer slides out from the right, width ≈ 100vw on mobile (≤480px) and 420px on desktop.
3. **Mini-Cart drawer styling:** Drawer background uses surface token, heading matches theme font, footer border, "View cart" outline / "Go to checkout" primary-branded buttons — 44px height confirmed.
4. **Cart page:** Add a product, navigate to /cart/ — check zero horizontal overflow at 375px, order summary has surface-alt background, "Proceed to checkout" button is primary-coloured.
5. **Checkout page:** Navigate to /checkout/ with items in cart — check form fields (44px min-height, border, focus ring), step headings, "Place order" primary button. Verify UNVERIFIED selectors are present in live DOM.
6. **COD test order:** Complete a test order via COD — confirm email receipt + order in WP Admin → WooCommerce → Orders.
7. **Axe:** Run axe on cart + checkout + PDP (with mini-cart open if Playwright can trigger it) — 0 violations.
8. **woocommerce-block-theme-has-button-styles:** Confirm the body class is present on cart/checkout pages (devtools → Elements → body).
9. **CSS version:** Confirm `woocommerce.css?ver=1.4.0` in the page source (version-bump verified).

---

## Notes

- `woocommerce.css` loads conditionally (`class_exists('WooCommerce')`) — zero weight on non-WC installs.
- All colour values use `var(--wp--preset--color--*)` tokens. No client hex values in framework CSS. Client-specific overrides go to `sites/mamas-munches/theme-overrides.css` or the theme-snapshot.json customCSS field.
- The `--sgs-mini-cart-drawer-width` custom property is in `:root` (framework default 420px). The global-styles payload exposes it for Site Editor override per client.
- WC's `woocommerce-block-theme-has-button-styles` body class prevents WC from double-styling buttons with its `body:not(...)` fallback rules. Added via `body_class` filter in functions.php — this is the correct mechanism (not a CSS rule itself).
