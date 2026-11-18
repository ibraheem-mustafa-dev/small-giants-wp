# Template overrides on Mama's (local-mamas mirror)

Source: `template-overrides.py` (parses every `wp_template` and `wp_template_part` post in `posts-raw.json` with the same block parser as the Custom CSS export and compares it with the theme file in `theme/sgs-theme/templates/` or `parts/`; the theme file is expanded, i.e. each `template-part` reference is replaced by the part's own blocks, so both sides compare like for like). Per-template data: `template-overrides.json`.

The mirror holds **12** overridden templates and **1** overridden template part (the `header` and `footer` the site uses are `sgs_header` and `sgs_footer` posts 178 and 176, not template parts). The theme ships 15 template files (404, archive, archive-product, cart, checkout, front-page, home, index, order-confirmation, page, product-search-results, search, single, single-product, taxonomy-product_attribute) and 8 parts (footer, header, sgs-archive-toolbar, sgs-cart-content, sgs-checkout-content, sgs-order-confirmation-content, sgs-pdp-buybox, sgs-pdp-content); `archive`, `home`, `index`, `single` and the header, footer and `sgs-*` parts are not overridden.

| Post id | Type | Slug | DB size (chars) | Theme file size (chars) | Blocks: override vs theme (expanded) | Custom CSS blocks / chars in it |
|---|---|---|---|---|---|---|
| 219 | wp_template | `order-confirmation` | 44,545 | 811 | 91 vs 25 | 8 / 5,541 |
| 202 | wp_template | `single-product` | 42,007 | 3,142 | 49 vs 32 | 7 / 6,025 |
| 346 | wp_template | `single-product-baby-shower-gift-card` | 38,306 | no file | 56 (none) | 8 / 8,376 |
| 194 | wp_template | `archive-product` | 22,428 | 9,855 | 42 vs 43 | 3 / 716 |
| 217 | wp_template | `product-search-results` | 11,669 | 4,110 | 26 vs 20 | 5 / 1,589 |
| 216 | wp_template | `search` | 10,466 | 4,157 | 28 vs 26 | 4 / 1,866 |
| 218 | wp_template | `taxonomy-product_attribute` | 10,296 | 4,362 | 25 vs 21 | 4 / 904 |
| 213 | wp_template | `404` | 5,394 | 4,327 | 13 vs 10 | 1 / 685 |
| 222 | wp_template | `cart` | 3,035 | 880 | 9 vs 32 | 1 / 27 |
| 497 | wp_template_part | `checkout-header` | 1,528 | no file | 7 (none) | 0 / 0 |
| 223 | wp_template | `checkout` | 932 | 1,398 | 11 vs 29 | 0 / 0 |
| 214 | wp_template | `front-page` | 392 | 1,628 | 4 vs 4 | 0 / 0 |
| 215 | wp_template | `page` | 317 | 1,836 | 4 vs 4 | 0 / 0 |

## How each override differs from the theme file

### `order-confirmation` (wp_template, id 219)

Theme file (811 characters): header, main > container > the `sgs-order-confirmation-content` part (WooCommerce status, summary, totals, shipping, billing, downloads and additional-information blocks), footer. Override (44,545 characters, 91 blocks): main `oc-main` > a hero band `oc-hero` (flex, 900px) and a body band `oc-body` (1000px flex stack) holding 28 containers, 26 texts, 8 icons, 3 headings, 3 buttons and an `sgs/order-items` block. The WooCommerce status, summary, shipping, billing, downloads and additional-fields blocks are kept inside cards; the WooCommerce totals wrapper and totals blocks are removed (replaced by `sgs/order-items`). The biggest override: the whole page design lives in the template.

Machine diff (block name counts, theme expanded minus override): removed pattern x1, wc/order-confirmation-totals x1, wc/order-confirmation-totals-wrapper x1; added s/button x3, s/container x28, s/heading x3, s/icon x8, s/order-items x1, s/text x26.

### `single-product` (wp_template, id 202)

Theme file: main with three containers that place the `sgs-pdp-buybox` part (breadcrumbs, title, rating, buy box), the `sgs-pdp-content` part (tabs, trust bar, Trustpilot) and a related-products rail (heading plus product collection). Override: main (`cr-ref-product-0`) > one 1240px container > breadcrumbs, a gallery-plus-`sgs/buybox` row (with a gift-order block and a decorative image), a reviews container (heading and a testimonial slider with 3 testimonials) and a related container (heading and 3 product cards in a grid). Removed: WooCommerce breadcrumbs, post title, rating, icon list, tabs and 4 tab blocks, post content, trust bar, Trustpilot reviews, the product collection and template. Added: 4 containers, an accordion of 4 items, the slider, 3 testimonials, 2 product cards, 11 texts.

Machine diff (block name counts, theme expanded minus override): removed post-content x1, post-title x1, s/icon-list x1, s/tab x4, s/tabs x1, s/trust-bar x1, s/trustpilot-reviews x1, wc/breadcrumbs x1, wc/product-collection x1, wc/product-rating x1, wc/product-template x1; added s/accordion x1, s/accordion-item x4, s/breadcrumbs x1, s/button x1, s/container x4, s/decorative-image x1, s/gift-order x1, s/heading x1, s/product-card x2, s/testimonial x3, s/testimonial-slider x1, s/text x11.

### `single-product-baby-shower-gift-card` (wp_template, id 346)

No theme file: a custom template that exists only in the database (name "Single Product: Baby Shower Gift Card"). 56 blocks: the same frame as the single-product override (main `cr-ref-product-0` > 1240px container > breadcrumbs), store notices, a `gc-grid` (a sticky gallery column and a form column holding `woocommerce/add-to-cart-form`), a reviews container (testimonial slider, 3 testimonials) and a related row (3 product cards). 8 Custom CSS blocks, 8,376 characters.

### `archive-product` (wp_template, id 194)

Theme file: main > container (title block from the `sgs-archive-toolbar` part, core query title, product search) > collapsible text > container (inline `html` style block, a `sgs-shop-layout` filter sidebar `aside` and the product collection) > collapsible text. Override: main (`cr-ref-shop-0`) > an `sgs/hero` band (title block plus the sort container) > a filter container holding `woocommerce/product-filters` with one `product-filter-chips` > the product container (a text line, the product collection and two grid containers, the second ending in a media block). Removed: breadcrumbs, query title, product search, 2 collapsible texts, the 2 `html` blocks, the sidebar `aside`, the price, price-slider, taxonomy, checkbox-list and active-filter blocks, results count, pagination and the no-results block. Added: 6 containers, a hero, 12 texts, a button and a media block.

Machine diff (block name counts, theme expanded minus override): removed html x2, query-pagination x1, query-pagination-next x1, query-pagination-numbers x1, query-pagination-previous x1, query-title x1, s/breadcrumbs x1, s/collapsible-text x2, s/filter-search x2, s/product-search x1, wc/product-collection-no-results x1, wc/product-filter-active x1, wc/product-filter-checkbox-list x2, wc/product-filter-clear-button x1, wc/product-filter-price x1, wc/product-filter-price-slider x1, wc/product-filter-removable-chips x1, wc/product-filter-taxonomy x1, wc/product-results-count x1; added s/button x1, s/container x6, s/hero x1, s/media x1, s/text x12, wc/product-filter-chips x1.

### `product-search-results` (wp_template, id 217)

Theme file: main > container (breadcrumbs, query title) > store notices > container (product collection with catalog sorting). Override: main (full) > hero band (label text, query title, a 640px container with the core search) > a 1320px container (store notices, product collection). Removed: WooCommerce breadcrumbs and catalog sorting. Added: hero, container, text, core search, heading, media (empty-state logo), 2 buttons.

Machine diff (block name counts, theme expanded minus override): removed wc/breadcrumbs x1, wc/catalog-sorting x1; added s/button x2, s/container x1, s/heading x1, s/hero x1, s/media x1, s/text x1, search x1.

### `search` (wp_template, id 216)

Theme file: main > container (the `sgs-archive-toolbar` part with breadcrumbs, core query title, core search) > container (query). Override: main (full) > `sgs/hero` band (label text, core query title, a 640px container with the core search) > a 980px container (query with a core Read more per result, no post date). Removed: breadcrumbs, post date, multi-button. Added: hero, container, Read more, an empty-state logo (media) and button.

Machine diff (block name counts, theme expanded minus override): removed post-date x1, s/breadcrumbs x1, s/multi-button x1; added read-more x1, s/button x1, s/container x1, s/hero x1, s/media x1.

### `taxonomy-product_attribute` (wp_template, id 218)

Theme file: main > container (breadcrumbs, title) > container (product collection with catalog sorting). Override: main (full) > hero band (label, title and description) > the product container, plus an empty-state card (logo, heading, 2 buttons). Removed: breadcrumbs and catalog sorting. Added: hero, text, media, heading, 2 buttons.

Machine diff (block name counts, theme expanded minus override): removed wc/breadcrumbs x1, wc/catalog-sorting x1; added s/button x2, s/heading x1, s/hero x1, s/media x1, s/text x1.

### `404` (wp_template, id 213)

Theme file: main (600px) > text, heading, text, core search, multi-button, text. Override: main (full) > an `sgs/hero` band (label text, heading, a 640px container holding the search) > a 720px flex container (text and a button row). Removed: one text and the multi-button. Added: 3 containers, a hero and a button.

Machine diff (block name counts, theme expanded minus override): removed s/multi-button x1, s/text x1; added s/button x1, s/container x3, s/hero x1.

### `cart` (wp_template, id 222)

Theme file: main > container (normal width, spacing padding) > the `sgs-cart-content` part (store notices, post title, the full `woocommerce/cart` tree with filled and empty cart, a "new in store" product collection, 2 headings, separator) plus a `sgs/wishlist-panel` strip "Saved for later". Override (3,035 characters, 9 blocks): main (1320px cap, per-device padding) > `sgs/hero` (cart header, with `cr-ref-template-cart-1`, 27 characters of Custom CSS) > text "nearly there", a heading container ("Your basket" and a count pill) and `post-content`. The cart block itself lives in page 101, so the template is a page shell. Removed: the whole cart tree, store notices, post title, new-products collection and the wishlist strip. Added: hero, 2 texts, `post-content`.

Machine diff (block name counts, theme expanded minus override): removed post-title x1, s/heading x2, s/product-card x1, s/separator x1, s/wishlist-panel x1, wc/cart x1, wc/cart-accepted-payment-methods-block x1, wc/cart-express-payment-block x1, wc/cart-items-block x1, wc/cart-line-items-block x1, wc/cart-order-summary-block x1, wc/cart-order-summary-coupon-form-block x1, wc/cart-order-summary-discount-block x1, wc/cart-order-summary-fee-block x1, wc/cart-order-summary-heading-block x1, wc/cart-order-summary-shipping-block x1, wc/cart-order-summary-subtotal-block x1, wc/cart-order-summary-taxes-block x1, wc/cart-totals-block x1, wc/empty-cart-block x1, wc/filled-cart-block x1, wc/proceed-to-checkout-block x1, wc/product-collection x1, wc/product-new x1, wc/product-template x1, wc/store-notices x1; added post-content x1, s/hero x1, s/text x2.

### `checkout-header` (wp_template_part, id 497)

No theme file: a template part that exists only in the database (id 497, "Checkout header"). A 1160px grid container (`1fr auto 1fr`, pink band, bottom border): a "← Basket" link, the responsive logo, and a lock icon with "Secure checkout" (hidden on mobile) and "Secure" (mobile) texts. Used by the checkout template instead of the theme `header` part.

### `checkout` (wp_template, id 223)

Theme file: header part, main > container > the `sgs-checkout-content` part (the full `woocommerce/checkout` tree: fields, express payment, contact, shipping, billing, payment, order note, terms, actions, totals and order summary blocks), footer part. Override (932 characters): header swapped for the DB-only `checkout-header` part (post 497), no footer part, main (1240px cap, per-device padding) > text "last bit, promise", heading "Checkout" and `post-content`. The checkout block lives in page 102, so the template is a page shell with a different header and no footer. Removed: the whole checkout tree and post title. Added: 4 texts, a heading, `post-content`, the logo and lock icon (in the part).

Machine diff (block name counts, theme expanded minus override): removed pattern x2, post-title x1, wc/checkout x1, wc/checkout-actions-block x1, wc/checkout-additional-information-block x1, wc/checkout-billing-address-block x1, wc/checkout-contact-information-block x1, wc/checkout-express-payment-block x1, wc/checkout-fields-block x1, wc/checkout-order-note-block x1, wc/checkout-order-summary-block x1, wc/checkout-order-summary-cart-items-block x1, wc/checkout-order-summary-coupon-form-block x1, wc/checkout-order-summary-discount-block x1, wc/checkout-order-summary-fee-block x1, wc/checkout-order-summary-shipping-block x1, wc/checkout-order-summary-subtotal-block x1, wc/checkout-order-summary-taxes-block x1, wc/checkout-payment-block x1, wc/checkout-pickup-options-block x1, wc/checkout-shipping-address-block x1, wc/checkout-shipping-method-block x1, wc/checkout-shipping-methods-block x1, wc/checkout-terms-block x1, wc/checkout-totals-block x1, wc/store-notices x1; added post-content x1, s/container x1, s/heading x1, s/icon x1, s/responsive-logo x1, s/text x4.

### `front-page` (wp_template, id 214)

Structurally identical to the theme file: header part, `sgs/container` main (contentWidth full) around `post-content`, footer part. The override only adds `className` `cr-ref-home-0` and `theme` on the parts; the theme file is longer only because of its comments. A blank template would save nothing here.

Machine diff (block name counts, theme expanded minus override): removed none; added none.

### `page` (wp_template, id 215)

Structurally identical to the theme file (header part, main container around `post-content`, footer part). The override differs only in serialisation (no comments, `theme` on the parts). A blank template would save nothing here.

Machine diff (block name counts, theme expanded minus override): removed none; added none.

## What a blank template would have saved

- **Custom CSS carried inside overridden templates: 25,729 characters in 41 blocks** (35.3% of the 72,791 total).
- **Two overrides do nothing** (`front-page` 214 and `page` 215): the same four blocks as the theme file. They can be deleted with no visible change.
- **Two are page shells** (`cart` 222 and `checkout` 223, 3,035 and 932 characters): they exist to replace the theme's `sgs-cart-content` and `sgs-checkout-content` parts with `post-content` so the cart and checkout blocks live in the page, which is where the settings and the Custom CSS (posts 101 and 102, 5,979 and 8,849 characters) sit. With a blank template (header, main around `post-content`, footer) the shells would not exist; the checkout also needs its own header part and no footer, which a template default could offer as one setting.
- **Five are content templates built from an `sgs/hero` band** (`404`, `search`, `product-search-results`, `taxonomy-product_attribute`, `archive-product`): the theme's title, breadcrumbs, toolbar and filter sidebar are removed and the hero band, empty-state card and search field are added. Their Custom CSS (685 + 1,866 + 1,589 + 904 + 716 = 5,760 characters) is mostly the core search look, the product grid columns and the product card badge, which are settings gaps, not template content. A blank template with a hero band and a core search that carried its own settings would remove most of it.
- **Three are whole page designs** (`order-confirmation` 219, `single-product` 202, the DB-only `single-product-baby-shower-gift-card` 346): the theme file is a shell around a part; the override holds 49 to 91 blocks. A blank template (post-content only) would move all of that into page content; the Custom CSS in them (5,541 + 6,025 + 8,376 = 19,942 characters) would travel with it and is the WooCommerce wrapper, review slider, scroll-nav and product card groups in `by-missing-setting.md`.
- The cart and checkout shells mean a client's cart and checkout are page content, not template content: a template-level default (blank WooCommerce margins, notice look, field focus colour) would act on every page that uses the block, which is what the B groups ask for.
