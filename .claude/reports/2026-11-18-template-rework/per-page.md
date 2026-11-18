# Custom CSS carried by each Mama's post (local-mamas mirror)

Source: `E:/sgs-tmp/template-rework/overrides/custom-css.json` (exported with `export-posts.php` through `wp eval-file`, parsed by `parse-custom-css.py`). Read-only: nothing on the mirror was changed. Counted: published and draft content of every post type with content, revisions, autosaves, auto-drafts, trash, attachments and menu items skipped (50 posts with content; 789 revisions skipped). Characters are the length of the decoded `sgsCustomCss` string (JSON escapes such as `\u0026` decoded), comments and whitespace included.

| Measure | Value |
|---|---|
| Posts scanned (with content) | 50 |
| Posts carrying Custom CSS | 21 (8 pages, 9 templates, 4 header, footer, drawer or form posts) |
| Blocks carrying Custom CSS (`sgsCustomCss` attributes) | 74 |
| Characters (whole attribute strings) | 72,791 |
| Characters in comments inside those strings | 1,636 |
| Rules (a rule inside an `@media` counts once; `@keyframes` counts as one) | 542 |
| Characters in rule text only (the base for the shares in `by-missing-setting.md`) | 69,289 |
| Global styles (`wp_global_styles`) `styles.css` and per-block `css` | 0 characters (the post holds no `css` key) |
| WordPress Additional CSS (`custom_css` post) | none exists; no `sgsCustomCss` in any post meta or option |

**The account page figure is confirmed:** post 103 (`my-account`) carries one `sgsCustomCss` of 19,154 characters on one `sgs/account` block (`cr-ref-my-account-5`, id `acctlook`): 134 rules, 18,415 characters of rule text, 3 comments.

## Per post, largest first

| Post | Type | Surface | Blocks with Custom CSS | Characters | Rules | Largest block (characters) |
|---|---|---|---|---|---|---|
| my-account (id 103) | page | account | 1 | 19,154 | 134 | `sgs/account` `cr-ref-my-account-5`, 19,154 |
| checkout (id 102) | page | checkout | 1 | 8,849 | 56 | `woocommerce/checkout` id `mmco0002`, 8,849 |
| home (id 154) | page | home | 12 | 8,489 | 64 | `sgs/buybox` `cr-ref-home-41b`, 2,589 |
| single-product-baby-shower-gift-card (id 346) | wp_template | product | 8 | 8,376 | 64 | `sgs/container` `gc-form`, 3,194 |
| single-product (id 202) | wp_template | product | 7 | 6,025 | 53 | `sgs/testimonial-slider` `cr-ref-product-53`, 2,201 |
| cart (id 101) | page | basket | 2 | 5,979 | 34 | `woocommerce/cart` id `mmbk0001`, 5,945 |
| order-confirmation (id 219) | wp_template | order confirmation | 8 | 5,541 | 36 | `sgs/container` `oc-status`, 2,461 |
| header (id 178) | sgs_header | header | 3 | 1,961 | 18 | `sgs/cart` id `hdrbasket1`, 1,645 |
| search (id 216) | wp_template | search | 4 | 1,866 | 15 | `sgs/container` id `plain-result-card`, 1,013 |
| product-search-results (id 217) | wp_template | search | 5 | 1,589 | 17 | `sgs/container` id `plain-search-217`, 685 |
| gifts (id 150) | page | shop | 5 | 1,234 | 11 | `sgs/product-card` `cr-ref-gifts-card`, 343 |
| taxonomy-product_attribute (id 218) | wp_template | search | 4 | 904 | 10 | `sgs/container` id `plain-grid-218`, 356 |
| help (id 152) | page | other | 1 | 755 | 5 | `sgs/accordion` `cr-ref-help-faq-list`, 755 |
| archive-product (id 194) | wp_template | shop | 3 | 716 | 7 | `sgs/product-card` `cr-ref-shop-12`, 343 |
| 404 (id 213) | wp_template | 404 | 1 | 685 | 7 | `sgs/container` id `plain-search-404`, 685 |
| contact (id 148) | page | other | 2 | 341 | 4 | `sgs/accordion` `cr-ref-contact-faq-list`, 188 |
| footer (id 176) | sgs_footer | footer | 2 | 139 | 2 | `sgs/heading` id `footerhandlefit`, 80 |
| sign-in (id 628) | page | sign-in | 1 | 64 | 1 | `sgs/account` `cr-ref-signin-1`, 64 |
| drawer-menu (id 180) | sgs_drawer | drawer | 2 | 54 | 2 | `sgs/media` `cr-ref-drawer-menu-7`, 27 |
| form-send (id 157) | sgs_form | other | 1 | 43 | 1 | `sgs/form` `cr-ref-form-send-0`, 43 |
| cart (id 222) | wp_template | basket | 1 | 27 | 1 | `sgs/hero` `cr-ref-template-cart-1`, 27 |

## Per surface

| Surface | Posts | Blocks | Characters | Rules | Share of characters | Posts |
|---|---|---|---|---|---|---|
| account | 1 | 1 | 19,154 | 134 | 26.3% | my-account |
| product | 2 | 15 | 14,401 | 117 | 19.8% | single-product, single-product-baby-shower-gift-card |
| checkout | 1 | 1 | 8,849 | 56 | 12.2% | checkout |
| home | 1 | 12 | 8,489 | 64 | 11.7% | home |
| basket | 2 | 3 | 6,006 | 35 | 8.3% | cart |
| order confirmation | 1 | 8 | 5,541 | 36 | 7.6% | order-confirmation |
| search | 3 | 13 | 4,359 | 42 | 6.0% | product-search-results, search, taxonomy-product_attribute |
| header | 1 | 3 | 1,961 | 18 | 2.7% | header |
| shop | 2 | 8 | 1,950 | 18 | 2.7% | archive-product, gifts |
| other | 3 | 4 | 1,139 | 10 | 1.6% | contact, form-send, help |
| 404 | 1 | 1 | 685 | 7 | 0.9% | 404 |
| footer | 1 | 2 | 139 | 2 | 0.2% | footer |
| sign-in | 1 | 1 | 64 | 1 | 0.1% | sign-in |
| drawer | 1 | 2 | 54 | 2 | 0.1% | drawer-menu |

## Posts with content but no Custom CSS

hello-world (post, id 1), sample-page (page, id 2), privacy-policy (page, id 3), navigation (wp_navigation, id 4), sgs-framework-menu-drawer-default (sgs_drawer, id 5), anchored-card-stack (sgs_drawer, id 6), centred-statement (sgs_drawer, id 7), editorial-ghost-list (sgs_drawer, id 8), floating-capped-card (sgs_drawer, id 9), offset-column-with-footer-row (sgs_drawer, id 10), solid-brand-panel (sgs_drawer, id 11), split-zone-serif (sgs_drawer, id 12), two-column-editorial (sgs_drawer, id 13), site-footer (sgs_footer, id 19), shop (page, id 100), refund_returns (page, id 104), saved-items (page, id 105), cr-calibration-panel (sgs_mega_menu, id 117), cr-calibration-drawer (sgs_drawer, id 118), choice-flow-build-your-zookie (sgs_choice_flow, id 161), front-page (wp_template, id 214), page (wp_template, id 215), checkout (wp_template, id 223), checkout-header (wp_template_part, id 497), form-gift-note (sgs_form, id 551), Lane A commerce test (blocks) (page, id 582), Lane A commerce test (shortcode cart) (page, id 583), terms (page, id 725).

Duplication: the same rule text recurs across posts (the product card look on 10 blocks, the review slider on 3, the related-products row on 2, the basket and checkout summary block pasted into both). `by-missing-setting.md` counts every copy as a rule and also gives the distinct rule texts per group.
