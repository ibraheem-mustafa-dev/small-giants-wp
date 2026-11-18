# Template rework inventory (2026-11-18)

What the theme and plugin ship as templates, template parts and custom post type surfaces at `b14b92d67`, what each fixes in code, and what Mama's Munches had to override. Read-only survey for `.claude/plans/2026-11-18-template-rework.md`. The Custom CSS figures were recounted independently on `local-mamas` (`E:\sgs-tmp\template-rework\overrides\verify-count.php`: 21 posts, 74 blocks, 72,794 characters; the account page's one block 19,154). Beside this file: `by-missing-setting.md` (every rule classified, ranked), `per-page.md`, `template-overrides.md`, `debt-lines.md`.

## Headline

- Mama's carries 72,794 characters of Custom CSS in 542 rules. By what each rule stands in for: an SGS block lacks the setting 55.2%; a wrapped WooCommerce or core block lacks it 28.3%; the setting exists and was not used 9.9%; a real one-off 3.6%; a rule fighting a hard-coded default 1.7%; a workaround for a block bug 1.3%.
- So the hand-written CSS is a settings problem far more than a template-default problem. The templates' cost shows elsewhere: eight of Mama's twelve template overrides were rebuilt by hand (the order confirmation is 91 blocks against the theme's 25), because the theme files carry fixed structure and copy and the route does not build those surfaces.
- The Cart and Checkout blocks already take 689 look settings each from one table (`plugins/sgs-blocks/includes/woocommerce/commerce-look/selectors.json`: 108 part rows by 20 setting columns; adding a setting is adding a column name to a row). The table has no fill or state column and reaches no other block. `sgs/account` has 924 hand-built attributes.

## Templates and parts (`theme/sgs-theme/templates/`, `parts/`)

No template is registered in PHP; all are files. Mama's column: the `wp_template` post that overrides it on `local-mamas`.

| File | Wraps | Fixed in the file | Mama's override |
|---|---|---|---|
| `front-page.html`, `page.html` | `core/post-content` in a full-width `main` | nothing | 214, 215: identical blocks, do nothing |
| `home.html`, `archive.html`, `index.html` | `core/query` and its post, title, total and pagination blocks | heading "Blogs", empty-state copy, card shadow class, 12 or 10 per page | none (no blog) |
| `single.html` | post title, content, byline, comments | 800px column, `40px 1fr` comment grid, "Comments" heading | none |
| `search.html` | `core/search`, `core/query` | empty-state copy and 500px column, 8px button radius | 216: rebuilt as a hero band, 1,866 characters of Custom CSS |
| `404.html` | `core/search`, `sgs/button` | "404" at 120/80/56px, copy, 600px column, 8px radius | 213: rebuilt as a hero band |
| `archive-product.html` | `sgs/product-search`, WooCommerce product filters (price, category, brand as checkbox lists), results count, sorting, product collection with `sgs/product-card` | group headings "Price", "Category", "Brand", the two taxonomies, 3 columns, the sidebar layout classes that 277 stylesheet rules lean on | 194: rebuilt (hero, filter chips, no sidebar) |
| `product-search-results.html`, `taxonomy-product_attribute.html` | breadcrumbs, title, notices, sorting, product collection | empty-state copy | 217, 218: rebuilt as a hero band |
| `single-product.html` with `sgs-pdp-buybox.html`, `sgs-pdp-content.html` | breadcrumbs, title, rating, `sgs/buybox`, tabs, trust bar, Trustpilot, related collection | delivery and returns copy and icons, the tab set (Description, Ingredients, Nutritional information, Allergens), "You might also like", 4 cards | 202: rebuilt (49 blocks); 346: a second product template, database only |
| `cart.html` with `sgs-cart-content.html` | notices, post title, the whole `woocommerce/cart` tree, `sgs/wishlist-panel` strip | "Saved for later", "You may be interested in…", the empty-basket copy and stock product row | 222: a shell around `post-content`; the cart block lives in page 101 |
| `checkout.html` with `sgs-checkout-content.html` | post title, notices, the whole `woocommerce/checkout` tree | the tree's order | 223: a shell around `post-content` with its own header part (497) and no footer |
| `order-confirmation.html` with `sgs-order-confirmation-content.html` | nine `woocommerce/order-confirmation-*` blocks, five WooCommerce heading patterns | four blocks locked against removal, a fixed two-column address grid | 219: rebuilt (91 blocks, 5,541 characters of Custom CSS) |
| `header.html`, `footer.html`, `sgs-archive-toolbar.html` | a pattern reference; breadcrumbs | nothing | the site's `sgs_header` 178 and `sgs_footer` 176 |

`eye-care-test` serves the theme's own cart, checkout and order confirmation files, because they were never cloned (Spec 48 FR-48-87), so a change to those files changes a signed-off site.

## Custom post type surfaces (`plugins/sgs-blocks/includes/class-sgs-block-cpts.php::register_post_types` unless named)

| Surface | Locked template | Starters | New site gets |
|---|---|---|---|
| `sgs_header` | `sgs/site-header`, lock all | 9 patterns | `sgs/framework-header-default` seeded |
| `sgs_footer` | `sgs/site-footer`, lock all | 8 patterns | `sgs/framework-footer-default` seeded |
| `sgs_drawer` | `sgs/nav-drawer`, lock all | 10 patterns | `sgs/framework-drawer-default` and the drawer library |
| `sgs_mega_menu` (`class-sgs-mega-menu-cpt.php`) | none | 8 patterns | nothing |
| `sgs_modal`, `sgs_form`, `sgs_choice_flow` | none, on purpose | none | nothing |
| `sgs_product_template` (`class-product-templates-cpt.php`) | none, no editor screen | none | nothing |

These are already blank canvases: one container block and whatever the site puts in it. The rework's subject is the theme's page templates and the blocks they wrap.

## Which wrapped blocks take SGS look settings

| Block | SGS look settings |
|---|---|
| `woocommerce/cart`, `woocommerce/checkout` | 689 each (the commerce look table) |
| `woocommerce/product-filter-chips`, `woocommerce/catalog-sorting` | 23 (filter look) |
| `woocommerce/product-collection` | 2 |
| `core/post-content` | 3 |
| `woocommerce/order-confirmation-*`, `woocommerce/store-notices`, `woocommerce/product-template`, `product-results-count`, `product-filters` and its price, taxonomy, checkbox-list, active and clear blocks, `woocommerce/breadcrumbs`, `product-rating` | none |
| `core/search`, `core/query` and its children, `core/read-more`, `core/post-title`, comments | none |
| Every block | Custom CSS, Show-to rules, hide per device |

SGS blocks that stand in for WooCommerce surfaces, by attribute count: `sgs/account` 924, `sgs/buybox` 518, `sgs/product-card` 471, `sgs/cart` 254, `sgs/gift-order` 67, `sgs/wishlist-panel` 64, `sgs/order-items` 52, `sgs/product-search` 33.

## Stylesheets that style these surfaces from outside the blocks

| File | Bytes | Rules | What it fixes |
|---|---|---|---|
| `theme/sgs-theme/assets/css/woocommerce.css` | 162,927 | 351 | 277 rules for the shop layout, filters and toolbar; 41 product cards; 25 checkout; 21 cart; 11 mini-cart. 61% of its sized or coloured declarations read a token; 211 are pixel literals. 32 `display:none`, 8 `!important`. Hides the collapsed order summary below WooCommerce's 920px container break. Loaded on every page of a site with WooCommerce |
| `theme/sgs-theme/assets/css/core-blocks.css` | 35,968 | 130 | core blocks; 60 `!important` |
| `theme/sgs-theme/assets/css/woocommerce-notices.css` | 5,798 | 18 | the notice banners |
| `theme/sgs-theme/assets/css/choice-controls.css` | 3,139 | 6 | the one tick box look (Spec 32 FR-32-31) |
| `plugins/sgs-blocks/src/blocks/account/style.css` | 40,647 | not counted | WooCommerce's account output inside `sgs/account` |
| `plugins/sgs-blocks/src/blocks/cart/style.css` | 35,420 | not counted | the basket drawer |

## How the route fills templates today

`scripts/computed-route/lib/template-copies.mjs` sorts the 15 templates into `WHOLE_TREE` (archive-product, single-product, cart, checkout: the whole draft page with WooCommerce's piece placed in it), `PAGE_CONTENT` (front-page, page: the shell only) and `DERIVED` (404, search, archive, product-search-results, taxonomy-product_attribute: the site's page shell around the theme file's own content). `lib/intake-skeletons.mjs::SURFACE_KINDS` has no kind for the order confirmation. Spec 48: FR-48-56 built; FR-48-87 partly built (Fill does not write the shop look settings); FR-48-96 and FR-48-99 not built; FR-48-109 (what no setting holds goes to Custom CSS, with a gap row) not built.
