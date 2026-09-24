# Design note: showing product fields as text, editable by the client

**Problem:** the Eye Care product page needs to show brand, SKU, and frame details (material,
lens width, bridge, temple length) as plain text, and a non-technical client must be able to
choose which field a text block shows, without a developer.

**Effect if not solved:** without a proper mechanism, each field either gets hard-coded into a
template (client can never change it) or copy-pasted by hand into every product (breaks the
moment stock changes).

## What already exists in the framework

Block Bindings is already partly built here, in three pieces:

1. `plugins/sgs-blocks/includes/class-product-bindings.php::Product_Bindings` — a registered
   Block Bindings source, `sgs-product/field`, that resolves a product field (price, title,
   image_url, image_alt, stock_status, short_description) from either WooCommerce or the old
   `sgs_product` CPT. It has no JavaScript half, so a developer can bind to it by hand-editing
   pattern JSON, but a client cannot see or pick it in the editor.
2. `plugins/sgs-blocks/includes/class-sgs-block-bindings-support.php::Sgs_Block_Bindings_Support`
   — WordPress core only lets bindings target a short hard-coded list of core blocks
   (`core/paragraph`, `core/heading`, etc). This file uses the WP 6.9+ per-block filter
   `block_bindings_supported_attributes_{$block_type}` to add SGS blocks to that list.
   `sgs/text` is already bindable on its `text` attribute; `sgs/heading` on `content`.
3. `plugins/sgs-blocks/src/bindings/index.js` — the JS half for a different source,
   `sgs/site-info` (phone, email, address). It calls `registerBlockBindingsSource()` with a
   `getFieldsList()` function, which is what makes core's own "Attributes" panel in the block
   sidebar show a dropdown of pickable fields. This is the working precedent to copy.

So the mechanism a client would use already ships for site info, just not yet for products.

## Options

**(a) Extend the existing `sgs-product/field` source, add its missing JS half.** Add new keys
to `Product_Bindings::get_value()` (brand, sku, material, plus the frame-measurement meta) and
add a `registerBlockBindingsSource` call for `sgs-product/field` with a `getFieldsList()`,
mirroring `src/bindings/index.js`. On a product page, the client opens the block sidebar's
Attributes panel on an `sgs/text` block, clicks the binding icon, picks "SGS Product Field",
then picks "Brand" (etc) from a dropdown, same gesture as picking a site-info field today. The
editor canvas shows the live value straight away because SGS blocks render via
`<ServerSideRender>`.

**(b) A setting directly on `sgs/text` ("Show product field: …").** Works, but duplicates a
mechanism that already exists for one block only; `sgs/heading` and any future block would need
the same setting rebuilt separately. Breaks the "universal mechanism, no per-block carve-out"
rule (R-31-9).

**(c) A small dedicated block per field or a "product field" block.** More building, and a
client has to learn a new block instead of using the text/heading blocks they already know.

## Recommendation

**(a).** The infrastructure already exists and one other source (`sgs/site-info`) already
proves the exact editor experience needed. This is additive data plus one JS file, not new
mechanism, and it works for `sgs/text` and `sgs/heading` immediately with no per-block code.

## Eye Care fields to add to `Product_Bindings::get_value()`

From `sites/eye-care-ward-end/woo-seed/seed.php` and the draft's product-detail rows
(`Eye Care Birmingham.dc.html` lines ~2412-2413):

| Client-facing label | Data source |
|---|---|
| Brand | `product_brand` taxonomy term (WooCommerce core taxonomy) |
| SKU | `$product->get_sku()` (native WC field) |
| Material | `pa_material` WooCommerce attribute term |
| Frame type | `pa_frame-type` WooCommerce attribute term |
| Style/shape | `pa_shape` WooCommerce attribute term |
| Lens width | post meta `_sgs_frame_eye` |
| Bridge | post meta `_sgs_frame_bridge` |
| Temple length | post meta `_sgs_frame_temple` |

## Not done here

This is a design note only, no code. Building it means: editing
`class-product-bindings.php` (add the 8 keys above, attribute terms via
`$product->get_attribute('material')`, meta via `get_post_meta()`) and adding a
`registerBlockBindingsSource` call in a JS bindings file for `sgs-product/field`
(`getFieldsList()` returning the 8 labels; `getValues()` returning empty strings same as the
site-info source, since the canvas resolves via ServerSideRender). Both are shared framework
files, outside the scope of this note.
