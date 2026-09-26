---
doc_type: plan
spec_id: 30
covers: [FR-30-14, FR-30-15]
status: in progress
created: 2026-09-26
---

# Plan: build the customer account area and saved-item alerts (Spec 30 P5)

Design (signed off 2026-09-26): `.claude/reports/2026-09-26-fr30-14-account-area-design.md`. This plan is the how; the design note is the what.

## Contract shared by every stream

**Saved-items entry** (`_sgs_wishlist` user meta, JSON list): `{ id:int, addedTs:int, savedPrice:int|null, currency:string, alertPrice:int|null, inStock:bool|null }`. Prices are in the store's minor units (`round( wc_get_price_to_display( $product ) * 10 ** wc_get_price_decimals() )`, the same basis as the Store API's `prices.price`). Old entries without the new keys read as `null`.

**Site switches**: option `sgs_wishlist_features` = `{ priceAlerts:bool, stockAlerts:bool, sharing:bool }`, all `false` by default, registered with `register_setting` and `show_in_rest` (object schema) so the panel's inspector edits it through `useEntityProp( 'root', 'site', 'sgs_wishlist_features' )`.

**Shopper opt-ins**: user meta `_sgs_wishlist_alerts` = `{ price:{ on:bool, ts:int }, stock:{ on:bool, ts:int } }`.

**Share**: user meta `_sgs_wishlist_share_token` (32 hex chars from `random_bytes(16)`, its own key so it can be looked up) and `_sgs_wishlist_share_on` ('1' / '').

**REST (`sgs/v1`)**, logged in unless marked public:
- `GET /wishlist` → `{ items:[entry…], alerts:{ price:bool, stock:bool }, share:{ enabled:bool, url:string } }`
- `POST /wishlist/toggle { productId }` → `{ saved, items }` (a new entry records `savedPrice`, `currency`, `alertPrice = savedPrice`, `inStock`)
- `POST /wishlist/merge { ids[] }` → `{ items }` (server-side prices only)
- `POST /wishlist/alerts { price?:bool, stock?:bool }` → `{ alerts }`; 400 for a type whose site switch is off; turning one on stores `ts = time()`
- `POST /wishlist/share { enabled:bool, regenerate?:bool }` → `{ share:{ enabled, url } }`; 403 when the sharing switch is off
- `GET /wishlist/shared/(?P<token>[a-f0-9]{32})` public, rate-limited (30 per minute per hashed IP) → `{ items:[{ id }] }` (published, visible products only; 404 for unknown or switched-off tokens; no personal data)

**Shared-list URL**: the Saved items page permalink + `?sgs-list={token}`.

**Saved items page**: option `woocommerce_saved_items_page_id` (WooCommerce's own `woocommerce_{key}_page_id` naming, so `woocommerce_create_pages` creates it).

**Webhook**: `SGS\Blocks\Sgs_Webhook::send( string $event, array $payload ): bool` posts to `sgs_n8n_webhook_url` (https only, `wp_safe_remote_post`, non-blocking). Events `sgs_wishlist_alert` and `sgs_back_in_stock`.

## Streams

| # | Stream | Files (one writer each) | Status |
|---|---|---|---|
| A1 | Wishlist store, REST, alerts opt-in, share, public shared route, site setting, shared-view noindex | `includes/wishlist/class-wishlist-store.php`, `class-wishlist-rest.php`, `class-wishlist-account-rest.php`, `class-wishlist-shared-rest.php`, `class-wishlist-settings.php`, `class-wishlist-privacy.php`; delete `includes/class-sgs-wishlist-rest.php`; `includes/class-noindex-store-pages.php`; `tests/php/run-wishlist-standalone.php` | |
| A2 | Alerts scan, back-in-stock dispatch, webhook helper | `includes/wishlist/class-wishlist-alerts-scan.php`, `includes/class-stock-notify-dispatch.php`, `includes/class-sgs-webhook.php`, `tests/php/run-wishlist-alerts-standalone.php` | |
| B | `sgs/account` block, account endpoints, dashboard, pages | `src/blocks/account/*`, `includes/account/*`, `tests/php/run-account-standalone.php` | |
| C | Wishlist panel layouts, labels, sort, price drop, alerts and share bars, shared view, store prices, link default, cart template | `src/blocks/wishlist-panel/*`, `src/shared/wishlist-store/*`, `src/blocks/wishlist-link/render.php`, `theme/sgs-theme/templates/cart.html`, `scripts/tests/test-wishlist-panel.mjs` | |
| M | Main thread: loader lines in `sgs-blocks.php`, build, gates, `/sgs-update`, deploy, page content on sandybrown, `scripts/wc-pages-responsive-audit.js` account pages, live check, docs | | |

## Verification

1. Every PHP test and JS test passes, each with its negative control red when the guarded line is removed.
2. `npm run build` clean (fast gates), `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0.
3. Deploy to sandybrown; `scripts/wc-pages-responsive-audit.js` over account (logged out and in: dashboard, orders, addresses, account details, saved items), Saved items page (guest and logged in), cart with saved items: no overflow, axe 0, at 375, 768 and 1440.
4. Live FR-30-15 proof: save a product as an opted-in shopper, lower its price, run the scan: the row shows the drop and one webhook event is sent (captured by a test webhook URL); a second scan sends none. Restock a product with Notify me subscribers: one `sgs_back_in_stock` event, list cleared.
5. Editor round-trip: every new control on `sgs/account` and `sgs/wishlist-panel` saves and reloads.
