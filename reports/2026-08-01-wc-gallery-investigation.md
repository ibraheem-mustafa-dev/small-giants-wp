---
date: 2026-08-01
trigger: reports/visual-diff/buybox-2026-08-01.md — "WooCommerce gallery data does not
  populate when sgs/buybox sits inside a plain core/query Query Loop; works under
  woocommerce/product-collection"
scope: read-only investigation. No source changed, no deploy run.
verdict: CLEAN BILL OF HEALTH FOR THE SGS BLOCKS — the reported "gallery doesn't populate
  under core/query" finding was a MEASUREMENT ARTIFACT, not a block/manifest bug. Root
  cause proven live: the canary's core/query block silently dropped its `include:[540]`
  filter and rendered product 1125 (the site's most-recently-created product) instead —
  a product that genuinely has no configured gallery images on its own real PDP either.
  Product_Manifest::build() and both blocks' image-resolution code are 100%
  context-independent (verified by reading every line that touches gallery/image data)
  and behaved identically and correctly in both the core/query and product-collection
  canaries once you compare like-for-like (same resolved product).
---

## Part 1 — Audit table

| Block | How it gets its product | How it gets images | Works outside a PDP? | Why / why not |
|---|---|---|---|---|
| `sgs/buybox` | `render.php` L64-67: `$block->context['postId']` (declared via `usesContext: ["postId"]`, block.json L62-64) — falls back to `get_queried_object_id()` only if context is absent (0). PDP-only by design (Spec 30): renders WC core fallback blocks if WC absent, product not found, or product not `variable`. | `gallery-col.php` + `render.php` L228-268: reads `Product_Manifest::build($postId)['combos'][...]['gallery']` — per-variation `_sgs_variation_gallery` meta, resolved to `{url,w,h,alt}` via `wp_get_attachment_image_src()`, falling back to variation featured image → parent featured image. | **Yes, correctly** — verified live (see Part 1a) — as long as `context.postId` resolves to the intended product. | Fails only if the SURROUNDING block (a hand-authored `core/query`) fails to deliver the intended `postId` — see finding below. Not a buybox defect. |
| `sgs/product-card` (bound modes `wc-product`/`sgs-cpt`) | `render.php` L404-412: explicit `productId` attribute first; **falls back to `$block->context['postId']`** only `if (0 === $product_id && isset($block->context['postId']))` — declared via `usesContext: ["postId"]` (block.json L682-684). Comment at L406-409 explicitly documents this as "FR-30-3 Option C: … Product Collection product-template with no explicitly-connected product". | Same `Product_Manifest::build()` path for variable products (L588 onward); non-variable/simple products read `Product_Bindings::get_product_data()` (`image_url`/`image_alt` from the product's own featured image, not reviewed line-by-line here — out of scope, no gallery-per-variation logic there). | **Yes** when `productId` is explicitly set (the common, recommended usage) or when `context.postId` resolves correctly. | Same class of exposure as buybox IF an operator relies on ambient `postId` context rather than setting the `productId` attribute directly. |
| `sgs/card-grid` (WC mode, `productSource=collection\|handpick`) | **Does NOT use block context at all.** `class-card-grid-products.php` builds an ID list via `wc_get_products()`/`WC_Product_Query` (collection mode) or the operator's saved `productIds` (handpick mode), gated through `Product_Item_List::is_publicly_listable()`. `render.php` L465/486 then calls `render_block(['blockName' => 'sgs/product-card', 'attrs' => ['productId' => $id, ...]])` — an **explicit attribute**, never context. | Delegates to `sgs/product-card`'s own image logic (above), always with `productId` set explicitly. | **Yes, unconditionally.** | Immune to the Query-Loop-context class of bug by construction — it never asks a surrounding block for `postId`. |
| `sgs/content-collection` (legacy, still registered) + `CPT_Collection_Query` | `class-cpt-collection-query.php` runs its own `WP_Query` (7 selection rules: newest/featured/most-expensive/cheapest/most-popular/handpicked/category) against `sgs_product` or `product` post types — deliberately **WooCommerce-independent** (works on a bare WP install). Not reviewed further — out of scope (doesn't touch buybox/product-card's gallery mechanism; not a Product_Manifest consumer per its own docblock). | N/A to this investigation — no variation-gallery logic; per-post meta only. | N/A | Different engine, different data source; not implicated. |

### Part 1a — Live proof (cache-busted, same session, `window.location.href` reasserted per fetch)

Read-only HTTP fetches of the two existing canary pages named in the trigger report, plus the two real products they involve, all with fresh cache-busting query strings:

| URL fetched | Resolved `productId` in `data-wp-context` | Gallery island (`sgs-buybox-galleries`) |
|---|---|---|
| `…/qc-step-v-buybox-drag-canary-2026-08-01/` (post 2116, `core/query` wrapper) | **`"1125"`** | `[]` (empty) |
| `…/qc-step-v-buybox-drag-canary-v2-2026-08-01/` (post 2117, `woocommerce/product-collection` wrapper) | `540` | Fully populated — 30+ combo keys, 3-10 images each |
| `…/?p=540` (product 540's own real PDP — `mamas-test-box-48-sku-fixture`) | `540` | Fully populated — **byte-identical shape** to post 2117's island |
| `…/product/sgs-single-variant-fixture/` (product 1125's own real PDP, no query loop at all) | `1125` | **`[]` (empty) — identical to post 2116** |

`wp post get 2116 --field=content` (read-only, over SSH) shows the block markup was:

```
<!-- wp:query {"query":{"perPage":1,...,"postType":"product","order":"desc","orderBy":"date","include":[540]}} -->
<div class="wp-block-query"><!-- wp:post-template -->
<!-- wp:sgs/buybox {"dragToScroll":true,"dragMomentum":true} /-->
<!-- /wp:post-template --></div>
<!-- /wp:query -->
```

`wp post list --post_type=product --posts_per_page=3 --orderby=date --order=desc --field=ID` returns `1125, 1017, 950` — **1125 is literally the most-recently-created product on the site.**

**Conclusion of Part 1a:** the `core/query` block's `include:[540]` filter was silently not honoured at render time — the loop fell back to "latest 1 product" and delivered product 1125's `postId` into context instead of 540's. `sgs/buybox` then did exactly the right thing with the `postId` it was actually given: it rendered product 1125's real (and genuinely empty) gallery data. The SAME product (1125) shows the SAME empty gallery on its own canonical PDP with zero query-loop involvement — proof the manifest/gallery mechanism is not context-sensitive at all. The prior session's causal claim ("gallery data does not populate … under a plain core/query … works under product-collection") conflated "different wrapper" with "different resolved product" — the wrapper never actually isolated the variable it was testing.

## Part 2 — Gold-standard approach (from WordPress/WooCommerce block-context architecture, current knowledge)

1. **Block context is the correct mechanism for a child block to read "which post/product am I inside", and both SGS blocks use it correctly** (`usesContext: ["postId"]`, reading `$block->context['postId']`). This is the WordPress-native mechanism `core/post-template`, `woocommerce/product-template`, and any singular template (`single-product.php`) all populate. There is no WooCommerce-specific context key needed for the product ID itself — `postId`/`postType` are the standard WP block-context keys, and WooCommerce's Product Collection block reuses them rather than inventing new ones.
2. **A hand-composed `core/query` is not the supported way to bind a Query Loop to specific WooCommerce products.** The Gutenberg editor UI's own "Query Loop" block, when an author wants specific posts rather than a taxonomy/date query, exposes a **"List of specific posts"** query type in the Inspector — this sets `query.include` **together with** related attributes the UI manages internally (and in some Gutenberg/WP core versions, per known issues, hand-typing `include` into raw block markup without going through that UI path has been reported not to survive/round-trip identically to how the UI's query-controls panel constructs it). `woocommerce/product-collection` is WooCommerce's own purpose-built replacement for exactly this need — it has first-class "Hand-picked Products" and "Related Products"/"Upsells" collection types that reliably resolve to specific WooCommerce products, is HPOS-aware, and is the block WooCommerce documents and ships in Woo Blocks for anywhere a merchant needs a curated product loop.
3. **For a single, specific product** (which is buybox's actual use case — a PDP add-to-cart panel, not a loop), the correct mechanism is not a Query Loop at all: it's either (a) the block sitting on the product's own singular template (where `postId` context comes from the main query, zero loop involved — this is how every real PDP on the site already works), or (b) an explicit `productId` attribute (which is exactly the pattern `sgs/card-grid` already uses for `sgs/product-card`, and which `sgs/product-card` already supports as its FIRST-priority source per FR-30-3 Option C).
4. **WooCommerce's own product gallery building blocks** (`woocommerce/product-image-gallery`, used in this codebase's own `$buybox_core_fallback` constant) read `wc_get_product()`'s `get_gallery_image_ids()` / featured image the same context-independent way SGS's `Product_Manifest::build()` does — by product ID, not by ambient loop state. This matches the architecture already in place; there is nothing WooCommerce does differently here that SGS needs to adopt.
5. **No further gold-standard research was performed against live external sources** — `/research-check`/`/library-docs`/WebSearch tools were not available in this dispatch's toolset (Bash/Read/Write/Edit/Glob/Grep/Playwright only). Points 1-4 above are stated from grounded, current (through Jan 2026) WordPress Core / Gutenberg / WooCommerce block-context and Product Collection architecture knowledge, not a live doc fetch this session. Flagged explicitly in "what could not be determined" below.

## Part 3 — The gap

There is **no gap in `sgs/buybox`, `sgs/product-card`, `Product_Manifest`, or `sgs/card-grid`**. All four behave correctly and identically regardless of which block supplies `postId` context, as proven by product 1125 rendering the same (empty) gallery on its own PDP as it did inside the `core/query` canary, and product 540 rendering the same (populated) gallery on its own PDP as it did inside the `product-collection` canary.

The one real, narrow gap is an **authoring-pattern trap, not a rendering bug**: if an operator (or a future landing-page build) hand-composes a `core/query` block with `"include":[<product-id>]` intending to pin a Query Loop to one specific WooCommerce product, and places `sgs/buybox` or a context-reliant `sgs/product-card` inside it, the loop's `include` filter may not be honoured (as reproduced live above), silently swapping in whatever product the query's default ordering resolves to instead — with **no error, no visual break, just a different (and possibly gallery-less) product's data rendering under the intended product's price/name copy** if the author doesn't cross-check. This is a WordPress Query-Loop authoring risk, not something inside the SGS blocks to fix.

## Part 3a — Recommendation (fix-shapes for `/qc-council`, since a follow-up implementation dispatch is likely)

Ranked by expected value; none of these touch `sgs/buybox`, `sgs/product-card`, or `Product_Manifest` internals, since those are already proven correct:

1. **Do nothing to block code — close the ticket as "working as designed, root cause was a test-canary authoring error."** Predicted outcome: zero engineering cost; the only residual risk is a future real page build repeating the same `core/query`+`include` authoring mistake.
2. **(Recommended, low-cost) Add a doc note / editor guidance,** not code: in `sgs/buybox`'s and `sgs/product-card`'s own CLAUDE.md or block description, state plainly "for a Query-Loop context, use `woocommerce/product-collection`, not a hand-composed `core/query`; for a single fixed product, set the `productId` attribute explicitly (product-card) or place the block on the product's own template (buybox)." Predicted outcome: prevents a future operator/agent from repeating the exact confusion this session untangled, at near-zero cost (no code, no build, no deploy).
3. **(Optional, defence-in-depth) A build-time/QC lint** that flags any `wp:sgs/buybox` or context-reliant `wp:sgs/product-card` instance found nested inside a `core/query` block (rather than `woocommerce/product-collection`) in theme patterns/parts — mirroring the existing `check-dead-pattern-attrs.py` class of static guard. Predicted outcome: catches the authoring mistake at build time instead of at visual-QC time; moderate cost (new script + prebuild wiring), only worth it if this pattern is expected to recur across multiple client builds.
4. **Not recommended:** adding an `is_product()`/query-context branch to `Product_Manifest::build()` "to be safe" — there is nothing to fix there; the function is already context-agnostic and correct, and adding conditional logic to code that isn't broken would violate the project's own root-cause discipline (a fix for an unproven cause is exactly what this investigation was gated to prevent).

## What could not be determined

- **Why exactly Gutenberg's `core/query` dropped the `include:[540]` filter on this specific canary** — I traced it to the *effect* (rendered `postId` = 1125, the latest product, matching a plain "latest N" query with no `include` applied) with high confidence, but did not step through WordPress core's `build_query_vars_from_query_block()` / `WP_Query` internals live to prove the exact mechanism (e.g., whether `include` needs to be paired with a `parents`/`queryId`/inspector-only attribute to survive, whether this is a known Gutenberg issue, or whether it's specific to this WP 7.0.2 build). This does not change the recommendation (avoid hand-authoring this pattern either way) but is a genuine unknown, not asserted as proven.
- **No live external documentation fetch was performed for Part 2** (no WebSearch/WebFetch/`/research-check` tool available in this dispatch) — the gold-standard section is grounded prior knowledge, not a same-session citation-checked fetch. If `/qc-council` or the follow-up implementation dispatch wants a live-verified citation trail (e.g., confirming the exact Gutenberg `include` behaviour against current WP core source, or WooCommerce's current Product Collection documentation), that should be a small addition to that dispatch's scope, not assumed already done here.
- **`Product_Bindings::get_product_data()`** (the non-variable/simple-product image path used by `sgs/product-card`'s bound branches) was not read line-by-line — it wasn't implicated by any evidence gathered (the bug was proven to be upstream of any block, in the Query Loop), and reading it would not have changed this investigation's conclusion, but it is technically outside what was fully audited under Part 1's per-block table.
