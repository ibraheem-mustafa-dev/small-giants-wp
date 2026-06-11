# SGS WooCommerce Dependency Manifest

**Purpose (Spec 30 FR-30-0b):** the written contract every WooCommerce upgrade reconciles against. If a WC update changes anything listed here, the SGS WC page-type chassis needs review before the update ships to a client site. The runtime self-check (`includes/class-wc-compat-check.php`) asserts this contract on every admin load.

**Last verified:** 2026-06-11 against WooCommerce 10.8.1 / WordPress 7.0 (sandybrown canary).

## Tested version band (FR-30-0a)

| | Version |
|---|---|
| WooCommerce floor | **9.9.0** (first variation-aware Product Gallery) |
| WooCommerce ceiling (tested) | **10.8** |
| WordPress | 7.0 |

Outside the band → the self-check surfaces a dashboard notice ("SGS: WooCommerce X is newer/older than tested — product pages may need review"). It never blocks rendering.

## Relied-on WooCommerce core blocks

All verified registered on WC 10.8.1 (2026-06-11 probe). **Beta-status blocks are marked — their markup/attribute contracts can change between WC minors.**

| Block | Status | Used where |
|---|---|---|
| `woocommerce/product-gallery` | **Beta** | PDP template (variation-aware image swap) |
| `woocommerce/product-gallery-large-image` | **Beta** (inner) | PDP gallery part |
| `woocommerce/product-gallery-large-image-next-previous` | **Beta** (inner) | PDP gallery part |
| `woocommerce/product-gallery-thumbnails` | **Beta** (inner) | PDP gallery part |
| `woocommerce/add-to-cart-with-options` | **Beta** | PDP — simple products + no-JS fallback path |
| `woocommerce/mini-cart` | stable | Header (slide-out drawer, Blocks ≥10.1) |
| `woocommerce/product-collection` | stable | Shop archive grid |
| `woocommerce/product-filters` | stable | Shop archive filtering |
| `woocommerce/active-filters` | stable | Shop archive applied-filter chips |
| `woocommerce/cart` | stable | Cart page |
| `woocommerce/checkout` | stable | Checkout page |
| `woocommerce/breadcrumbs` | stable | PDP + archive |
| `woocommerce/product-price` | stable | PDP buybox |
| `woocommerce/product-rating` | stable | PDP buybox |
| `woocommerce/product-image-gallery` | stable | Classic-gallery fallback (see Fallback plans) |

## Relied-on server surfaces

| Surface | Used for | Rule |
|---|---|---|
| `POST /sgs/v1/cart/add-item` (SGS cart proxy, `includes/class-cart-proxy.php`) | THE cart write for the PDP configurator | **No SGS code POSTs directly to `/wc/store/v1/*` write endpoints — ever.** The proxy carries the availability/IDOR/legal guards. |
| Store API READ (`/wc/store/v1/cart`, `/wc/store/v1/products/{id}`) | Cart state reads, Mini-Cart hydration (core blocks' own usage) | Read-only; SGS adds no custom Store-API writes. |
| SEC-1 lean seeded variation manifest (product-card / option-picker render context) | Client-side variation_id resolution + validation | 24KB lean-subset cap applies. |
| WC template hierarchy (`single-product`, `archive-product` theme overrides) | FR-30-1 templates | Theme override must win over WC's injected default (verified per band). |

## Gateway pre-flight record (FR-30-0c)

| Site | Date | Gateways installed | Block-checkout support | Decision |
|---|---|---|---|---|
| sandybrown canary | 2026-06-11 | **none** | n/a | Core **Cash on Delivery** enabled for test orders (native block-checkout support). |
| First client (Mama's Munches) | pending | TBC at launch | TBC | FR-30-13(a) go-live item: verify the chosen gateway (Stripe/PayPal/express) declares Cart/Checkout BLOCK support at its installed version BEFORE composing block checkout. Fallback: classic-checkout template + documented consequences. |

## Fallback plans (FR-30-0d)

1. **Beta Product Gallery regresses** → swap the PDP template part to core classic gallery (`woocommerce/product-image-gallery`) backed by the `wc-product-gallery-zoom/-lightbox/-slider` theme supports (declared in `theme/sgs-theme/functions.php`).
2. **Template-level rollback escape hatch** → delete `theme/sgs-theme/templates/single-product.html` / `archive-product.html`; WooCommerce's injected default block templates resume automatically.
3. **`add-to-cart-with-options` contract change** → the SGS option-picker + cart-proxy path (FR-30-7) is independent of it for variable products; simple products fall back to whatever WC renders by default.
4. **Self-check failure mode** → the compat check is wired by a single `require` line in `sgs-blocks.php`; removing that line removes the check with no other effect.

## Reconciliation procedure on WC upgrade

1. Read this manifest top to bottom.
2. Run the FR-30-11 responsive-audit script + the search fixture regression (P3+) on a staging copy at the new WC version.
3. Verify every block in the table above is still registered (`WP_Block_Type_Registry`) and the two **Beta** blocks still render the PDP correctly.
4. Update the ceiling + **Last verified** line; commit the manifest change with the upgrade.
