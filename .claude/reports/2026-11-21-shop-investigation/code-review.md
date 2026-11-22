# Code review: the template-rework session's 19 commits

Read-only review of 7adbd907d, 237c36acc, aae74374b, 3d34fbac7, 92a404f90, 81dbbf527, 2006a6f95, 6b65a3aab, 4d8e70fbb, 43c4f7f30, d8e575830, cdf0afa2c, 7a54b5fd8, 34db75c2f, 75c75bfa6, 2a3f303e7, 109aa6d53, 29f7008f7, 9a7e08fe1, read on origin/main (09545830b) in E:\sgs-tmp\wt-tr-h5. Nothing was edited or run against a site.

Counts: 0 bugs, 3 risks (1 confirmed, 2 plausible), 6 nits (4 confirmed, 2 plausible), and 1 doc contradiction (confirmed). No PHP security hole was found: every new SQL statement goes through `$wpdb->prepare`, the new render output goes through the existing escaping helpers, and the brand-strip query takes only `absint` term ids.

## Findings

### 1. Risk, CONFIRMED: a simple product that sells out after the page loads never re-syncs, so Add to Cart stays on screen

- Where: `plugins/sgs-blocks/includes/class-cart-proxy.php::handle_availability`, together with `src/blocks/product-card/view.js` (the 409 branch of `actions.addToCart`). Exposed by 2006a6f95.
- Failing scenario: a simple product is in stock when the page renders, so the buy box now prints its own form. Another shopper buys the last unit. The visitor clicks Add to Cart, and `handle` returns 409 (`! $obj->is_in_stock()`). view.js then fetches `/sgs/v1/cart/availability/{id}`. That handler's step 2 accepts only a published variable product, and `Product_Manifest::build()` returns null for a simple one, so the response is not ok. The `if ( avRes.ok )` block is skipped, `ctx.inStock` stays true, the form stays visible and the notify form stays hidden. The shopper sees only the generic server message and can retry indefinitely. A variable product in the same situation gets "That combination just sold out.", has its form hidden and is offered the notify form.
- Fix: in `handle_availability`, accept a simple product and fall back to `Product_Manifest::build_simple()`. Its single combo key `product` matches `ctx.combos`, so the existing merge in view.js marks it out of stock unchanged. An alternative is a view.js-only fix: on a 409 with `ctx.axes` empty, set `ctx.inStock = false` and `ctx.stockText` directly.

### 2. Doc contradiction, CONFIRMED: Spec 02 still says the buy box falls back to core WooCommerce for simple products

- Where: `.claude/specs/02-SGS-BLOCKS.md`, the `sgs/buybox` section's "**Render:**" line: "Falls back to core WC blocks for simple products or when WooCommerce is absent."
- Since 2006a6f95, a simple product renders through `Product_Manifest::build_simple`. The core fallback now covers only WooCommerce absent, no product, grouped and external products, a simple product with no price, a null manifest and the context cap. Spec 27 and Spec 43 were updated; Spec 02 was not.
- Fix: replace that line with the fallback list from the render.php header comment.

### 3. Risk, PLAUSIBLE: the brand strip's visibility filter loads every product ID of every candidate brand on each render

- Where: `plugins/sgs-blocks/src/blocks/brand-strip/product-brands-source.php::sgs_brand_strip_brand_ids_with_visible_products` (81dbbf527).
- Failing scenario: a shop with a few thousand products and `brandHideEmpty` on (the default). Each uncached render runs `get_posts( posts_per_page => -1 )` with a two-taxonomy `tax_query`, then `wp_get_object_terms()` with an `IN (…)` list of every ID it found. The term query also drops its `number` limit, so all brands are candidates. Nothing is cached. The result is correct, but the cost grows with catalogue size on every page that holds the strip (often the home page).
- Fix: cache the returned brand-id map in a transient keyed by `WC_Cache_Helper::get_transient_version( 'product' )`, which WooCommerce bumps on product changes. Alternatively, walk the ordered candidates with one `posts_per_page => 1, fields => ids` query per brand and stop at `$max_items` passing brands.

### 4. Risk, PLAUSIBLE: a route-made product whose choice term contains `&` (or another escaped character) is planned "complete" on every run

- Where: `scripts/computed-route/lib/site-build-catalogue-php.mjs` (the read's `$aterms[ $tax ] = … wc_get_product_terms( …, 'names' )`) together with `lib/site-build-catalogue-axes.mjs::axisChanges` (`held[ … ].includes( n )`). Added in 34db75c2f.
- Failing scenario: a catalogue option such as "Black & Gold". WordPress stores the term name through `pre_term_name`'s `_wp_specialchars`, so the read returns `Black &amp; Gold`. The planner compares it with the catalogue's `Black & Gold`, finds no match, and adds a "lacks Black & Gold on its Colour choice" line. The write's `$term()` (`get_term_by( 'name', … )` sanitises the same way) finds the existing term, which is already in the attribute's options, so nothing grows. The fresh read after `--apply` plans the product again, which breaks the "a fresh read after --apply plans nothing" promise. The older facet read (`wp_get_object_terms … 'names'`) has the same pattern, so this is a shared trap rather than one new line.
- Fix: decode the names in the read (`wp_specialchars_decode( $name, ENT_QUOTES )`), or compare by slug (`sanitize_title` of the catalogue term) on both sides.

### 5. Nit, CONFIRMED: `handlerOf`'s regular expression strips the letter `s` instead of whitespace

- Where: `scripts/computed-route/lib/skeleton-filter-rail.mjs::handlerOf`, `/^{{s*|s*}}$/g` (109aa6d53).
- Effect: `{{showFilters}}` becomes `howFilter`. Every handler goes through the same function, so equal handlers still compare equal. The intent (`\s*`) is not what runs, though, and the mutation list cannot tell them apart.
- Fix: `/^\{\{\s*|\s*\}\}$/g`.

### 6. Nit, CONFIRMED: a simple product on a guided buy box, or one whose Add to Cart opens a named popup, no longer prints its linked flow's opener

- Where: `plugins/sgs-blocks/src/blocks/buybox/render.php` → `includes/buybox-linked-flow.php::sgs_buybox_apply_linked_flow` (2006a6f95).
- Before: the simple path called `sgs_buybox_simple_linked_flow_html` whenever keep-both was off. That printed the opener and modal even for a guided layout or an explicit popup, and printed the opener even when the product was out of stock. After: guided and explicit-popup layouts win, as they do on a variable product, and the opener is hidden by `!context.inStock`. This matches Spec 43's stated precedence and no mirror holds a real simple product, but the commit message does not name this rendering change.
- Fix: none needed in code. Record the change in the next render-scope list for any site that gains simple products.

### 7. Nit, CONFIRMED: two stale references to the removed simple-product helpers

- `plugins/sgs-blocks/reports/migrations/builtin-buttons-census.json` still lists `sgs_buybox_simple_linked_flow_html`. This is a generated report, so it should be regenerated or left to the next census.
- The `FLOW_LINKED_PICK_PHP` comment in `scripts/computed-route/lib/template-live-address.mjs` explains its variable-first preference by history ("dates from when a simple product's buy box printed core's own Add to Cart"). That goes against the repo rule that comments state current behaviour. The preference now only reflects that a variable product also carries the option pickers, so the comment should say just that.

### 8. Nit, CONFIRMED: the express-payment screen-reader note tells a simple product's shopper to choose options

- Where: `plugins/sgs-blocks/src/blocks/buybox/extras.php::sgs_buybox_after_cart_form_action`: "Express payment buttons become available once the options above are chosen."
- After 2006a6f95 the note also prints for a simple product. There it shows (to screen readers) only while a compulsory note or pick is incomplete or an add is pending, and in those cases "options" is the wrong word.
- Fix: neutral wording ("…once the choices above are complete"), or pass a flag when the manifest has no axes.

### 9. Nit, PLAUSIBLE: the planner and the PHP write disagree on a variation's value of `"0"`

- Where: `lib/site-build-catalogue-axes.mjs::axisChanges` uses `r.options?.[ tax ]`, a JavaScript truthiness test. The PHP `$covers` uses `'' !== (string) …`.
- A term slug `0` counts as missing in the planner but present in the write, so the plan lists a trash the write never performs and the run never settles.
- Fix: test `'' !== ( r.options?.[ tax ] ?? '' )` in the planner.

### 10. Nit, PLAUSIBLE: `headingOf` builds a regular expression from the binding name without escaping it

- Where: `scripts/computed-route/lib/catalogue-omitted.mjs::headingOf` (4d8e70fbb).
- A binding such as `$cols` (a valid JavaScript identifier) turns `$` into an end-of-input anchor. No heading is found, so the axis is labelled by the binding name rather than "Colour", and it no longer merges with the shop's Colour facet (7a54b5fd8's rail and record rely on that slug match).
- Fix: escape the binding before building the pattern (`binding.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' )`).

## Checked and found sound

- `Product_Manifest::combo` and `build()`: the extraction is line-for-line. `variationId`, `hasOwnImage` (`$vid > 0`) and the per-unit meta id (`$child_id`) are passed through unchanged. `build_simple` gates on WooCommerce, the simple type, published status and a non-empty price. Its gallery goes through `sanitize_id_array`, which drops 0 and non-images and de-duplicates. `generatedAt` 0 is never read by a staleness check.
- `render.php`: `$buybox_can_buy` gates the flow (product 0 resolves no flow), the note, the modal branch, the form branch (and with it the express buttons) and the sticky bar. `sgs_preselect_apply_to_manifest` returns early with no axes. `sgs_buybox_stock_status` accepts any `WC_Product` and still requires `managing_stock()`.
- `view.js::expressUsable`: `axes` is always a list (`$axes[] =`), so a variable product still requires a chosen variation. `expressSyncProduct` returns early for variation 0, so the payment plugin keeps its own simple-product data.
- Removed helpers: no remaining caller in PHP, JavaScript or tests (grep over the repo; only the census report and one dated report mention them).
- `$sgs_ordered`: prepared, `%d`, on `{$wpdb->prefix}woocommerce_order_itemmeta`, which is the same table under HPOS. If the table is missing the call returns null, which reads as false. `$sgs_attachment`: every query is prepared and `LIKE` values go through `esc_like`.
- 75c75bfa6's `clone` of the attribute: the cause is proven and both edit sites are covered, each with its own mutation entry.
- The cart, account and product-card element selectors (aae74374b, 92a404f90): every declared class was found in the printing code (`sgs-cart__item-action` is on the remove, save and add-options buttons; `sgs-account__progress-step--done` is in dashboard.php).
- 3d34fbac7: removing the made-up `.sgs-<block>__<part>` fallback drops only parts the locators never find in the draft. For example, the buy box `wrapper` is in no locator group, so it was never compared before either.
- 29f7008f7: making fixtures hidden leaves pinned-ID rendering alone. Only `product-card-linked-source.php` checks `is_visible()`, and no fixture reaches it.
- 9a7e08fe1: the `chmod 755` on the stage folder is applied at both `mktemp` sites.
- Mutation coverage of the new catalogue PHP (34db75c2f, 75c75bfa6): the entries cover the route gate, the attribute edit, the sweep's private, trash and skip branches, the SKU-clash catch, the order-item SQL and both clones.

## Calls made without asking

- Read the review on a detached checkout of origin/main in E:\sgs-tmp\wt-tr-h5 (`git checkout` succeeded with no restore of `sites/` needed).
- Read framework facts only through the database opened read-only (`?mode=ro`).
- Graded findings 3 and 4 as risks, not bugs: neither fails on a current mirror (no shop is large enough, and no term holds `&`).
- Left out style-only remarks and the 6b65a3aab snapshot refresh, which is whitespace only.
