# Wave-1 Fact-Finding: Featured Product — Architecture / Spec Items

**Report type:** WAVE-1 FACTS ONLY — no root-cause, no solutions, no clustering, no recommendations.
**Date:** 2026-06-08
**Sources verified:** index.html (draft), current-clone-page-source.html (clone), block.json files, render.php files, edit.js files, sgs-framework.db, Spec 02, Spec 27, Spec 29, block-defaults.php, class-product-authoring.php, class-product-provisioning-args.php, sgs-card-grid-variations.php.

---

## FP-D — Purpose of `sgs/card-grid` vs `sgs/container` for `.product-cards`

### Issue (verbatim)
"There is a wrapper (container type) div class called .product-cards in the html which I believe we planned for the sgs/card grid block to have functionality suited to fit this need specifically. It even has some sort of variant called 'product cards' in the block inserter sidebar. But, the converter has picked sgs/container instead. I want you to dig into the true purposes of card-grid block. What unique needs was it made to fulfill, that makes it something to use instead of sgs/container or the other wrapper equivalents in my theme?"

### DRAFT facts

The wrapper div holding the two product cards is at `sites/mamas-munches/mockups/homepage/index.html`, line **834** (class `.sgs-products`; "product cards" in the issue = its two `sgs-product-card` children — the class name is not the point of FP-D):
```html
<div class="sgs-products">
```
CSS for `.sgs-products` at line 697 in `current-clone-page-source.html` (page-id-8 scoped rule, also present in the draft inline `<style>` block):
```css
.page-id-8 .sgs-products{ display: grid; grid-template-columns: 1fr; gap: 16px }
@media (min-width: 768px) { .page-id-8 .sgs-products { grid-template-columns: 5fr 3fr } }
```

The `.sgs-products` div contains two children: `.sgs-product-card` (main card, lines 837–861) and `.sgs-product-card.sgs-gift-section__card--trial` (trial card, lines 864–880).

### CLONE facts

Clone line **812** (`current-clone-page-source.html`):
```html
<div style="gap:16px;display:grid;grid-template-columns:5fr 3fr;align-items:start"
     class="sgs-container sgs-container--grid sgs-cols-2 sgs-cols-tablet-2
            sgs-cols-mobile-1 sgs-container-e08c27fb sgs-products wp-block-sgs-container">
```
Block type emitted: `sgs/container` (class `wp-block-sgs-container`). The class `sgs-products` is carried as a BEM class on the container. No `wp-block-sgs-card-grid` class appears in the clone output for this wrapper.

### BLOCK.JSON facts — `sgs/card-grid`

File: `plugins/sgs-blocks/src/blocks/card-grid/block.json`

- **`"name"`:** `"sgs/card-grid"` (line 4)
- **`"title"`:** `"SGS Card Grid"` (line 6)
- **`"description"`:** `"Flexible image and content grid with overlay and card variants."` (line 8)
- **`"source"` attribute** (line 154–161): `enum: ["manual", "query"]`, default `"manual"`. There is no `"wc-product"`, `"sgs-cpt"`, or `"bound"` source option.
- **`"queryPostType"` attribute** (line 163–165): `type: "string"`, default `"post"`. This is the only post-type control. There is no enum restricting it — it accepts any string — but it is a plain text input, not a post-type picker.
- **`"queryPostsPerPage"` attribute** (line 166–169): `number`, default `6`.
- **`"queryCategory"` attribute** (line 170–173): `number`, default `0`. This is a single category ID, not a taxonomy picker.
- **`"items"` attribute** (line 64–67): `array`, default `[]`. Manual mode data stored here.
- **`"variant"` attribute** (line 59–62): `string`, default `"card"`. No enum defined in block.json — free string.
- **`"supports"`** (lines 19–53): Declares `color`, `typography`, `spacing`, `shadow`, `__experimentalBorder`, `sgs.imageControls`. Does NOT declare `interactivity`. Does NOT declare any InnerBlocks capability (`allowedBlocks`, `parent`, `template`).
- **`"render"`:** `"file:./render.php"` (line 284). Fully dynamic — no `save.js` output.
- No `"allowedBlocks"`, no `"parent"`, no `"template"` field at all in block.json.

### BLOCK.JSON facts — `sgs/card-grid` variation "Product Cards"

File: `plugins/sgs-blocks/includes/variations/sgs-card-grid-variations.php`

The "Product Cards" inserter variation is registered via the `get_block_type_variations` filter at line 76. Verbatim entry (lines 82–92):
```php
array(
    'name'        => 'cardgrid-product',
    'title'       => __( 'Product Cards', 'sgs-blocks' ),
    'description' => __( 'Image, title, price, and buy button — for product or service showcases.', 'sgs-blocks' ),
    'icon'        => 'cart',
    'scope'       => array( 'inserter' ),
    'attributes'  => array(
        'className' => 'is-style-elevated',
        'columns'   => 3,
    ),
),
```
The variation sets `className: 'is-style-elevated'` and `columns: 3`. It does NOT set `source: 'query'`, does NOT set any WooCommerce or product-type parameter. It is a pure visual preset — "elevated" style at 3 columns.

### DB facts

`blocks` table (via `sgs-db.py sql`):
- `sgs/card-grid`: `variant_attr = None` (column null — no variant-selector attr registered to DB)
- `block_composition` table: `sgs/card-grid` → `wraps_block = sgs/container`, `container_kind = layout`

### SPEC-DOC refs

**Spec 02 (`02-SGS-BLOCKS-REFERENCE.md`)**, line 748–824:
- Lists `sgs/card-grid` as type: Dynamic, description: "Flexible image and content grid with overlay and card variants."
- Attributes table matches block.json exactly (55 attrs). No mention of WooCommerce, product binding, or InnerBlocks.

**Spec 29 (`29-CONTAINER-EQUIVALENT-BLOCKS.md`)**, line 124:
```
| `sgs/card-grid` | Responsive image+content tile grid (overlay or card variants). |
```
Line 66 (KIND=layout description):
> "**When to use:** A block whose primary job is arranging its children in a responsive grid or flex layout. The block lives inside a section (which already provides the background), not at the page root."

**Spec 27 (`27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md`)**, line 37:
```
- The dual-mode card (`sgs/product-card`, FR-24-2 to FR-24-3)
```
Spec 27 does not mention `sgs/card-grid` as an ecommerce target. The spec's product-grid role belongs to `sgs/content-collection`, not `sgs/card-grid`.

### PIPELINE / BLOCK LOCATION refs

- `plugins/sgs-blocks/src/blocks/card-grid/block.json` — full block schema
- `plugins/sgs-blocks/src/blocks/card-grid/render.php` — reads `$attributes['source']` (manual vs query); manual mode renders `$items` array; query mode calls `new WP_Query( ['post_type' => $query_post_type, ...] )` with no product-type awareness
- `plugins/sgs-blocks/includes/variations/sgs-card-grid-variations.php` — defines the "Product Cards" variation as a visual preset only (lines 82–92)

---

## FP-E — Actual capabilities of `sgs/card-grid`: modes, post-type options, filtering/sorting, preview, drag-in

### Issue (verbatim)
"The actual functionality of the card grid block seems really limited, I can't drag any blocks into it... set it to manual and add card entries... or set its source to query from posts but... only allows you to pick post-type and... only 2 post types pickable are page and post. So, we can't get anything from the product pages, there are no options to specifically pick certain products/pages... no sorting or filtering ability... it doesn't even show any sort of preview... Just seems like a completely useless block."

### DRAFT facts
Not applicable — this issue concerns the block's editor capabilities, not a draft element.

### CLONE facts
Not applicable — same as above.

### BLOCK.JSON facts (verified)

**Modes (source attribute):**
- `source` enum: `["manual", "query"]` only (block.json lines 154–161). No `"bound"`, `"wc-product"`, `"sgs-cpt"` options.
- Manual mode: items entered as an array stored in `$attributes['items']` (block.json line 64–67). No InnerBlocks drag-in — the block has NO `allowedBlocks`, NO `template`, NO `parent` fields in block.json. There is no `useInnerBlocksProps` in edit.js (confirmed: grep returned no InnerBlocks usage in card-grid edit.js).
- Query mode: uses `$attributes['queryPostType']` (string, default `"post"`), `$attributes['queryPostsPerPage']` (number, default `6`), `$attributes['queryCategory']` (number, default `0` — single category ID).

**Post-type filtering:**
- `queryPostType` is a plain `"type": "string"` with no `enum` restriction in block.json (line 163–165). However, the UI implementation that drives it (from edit.js) determines what the editor actually presents. The block.json does not constrain it to `"post"` and `"page"` specifically. No spec reference identifies the actual UI control type used.

**Sorting:**
- No `queryOrderBy`, `queryOrder`, or sorting attribute exists in block.json (confirmed — full attribute list in Spec 02, lines 755–813, no sort attributes).

**Filtering beyond category:**
- Only `queryCategory` (single integer ID) exists. No taxonomy picker, no tag filter, no `product_cat` or WooCommerce-specific query parameter in block.json.

**Preview:**
- block.json includes an `"example"` field (lines 288–307) with 3 static items. This provides an editor block-inserter preview. The example does NOT reference WooCommerce data.

**InnerBlocks / drag-in:**
- No `allowedBlocks`, no `template`, no `parent` in block.json. The block does NOT declare InnerBlocks in its spec. render.php does not call `$content` echo (manual mode renders from `$items` array; query mode renders from `WP_Query`). Confirmed: no InnerBlocks capability exists in the block's schema.

### DB facts

`block_composition` table: `sgs/card-grid` → `container_kind = layout`, `wraps_block = sgs/container`. No has_inner_blocks column queried (column name unknown without schema dump).

### SPEC-DOC refs

**Spec 02**, lines 748–824: describes sgs/card-grid with 55 attributes. No InnerBlocks in the attribute list. `source` enum is `["manual", "query"]`. No WooCommerce-specific query attrs.

**Spec 29**, lines 116 and 124: classifies `sgs/card-grid` as a KIND=layout block ("Responsive image+content tile grid (overlay or card variants)"). Does not attribute WooCommerce or product-query capability to it.

**Spec 27**: does not list `sgs/card-grid` as a product display target anywhere. The product grid role is assigned to `sgs/content-collection` (see Spec 27 line 147, Spec 29 line 116).

### PIPELINE / BLOCK LOCATION refs

- `plugins/sgs-blocks/src/blocks/card-grid/render.php` lines 46–79: full query-mode implementation. `WP_Query` args: `post_type = $query_post_type`, `posts_per_page = $query_per_page`, `post_status = 'publish'`, optional `cat = $query_category`. No `product_cat`, no `meta_query`, no WooCommerce query args.
- `plugins/sgs-blocks/src/blocks/card-grid/block.json` lines 154–173: all query-related attributes.

---

## FP-F — Error origin for "Invalid parameter(s): attributes"

### Issue (verbatim)
"tried binding the [product-card] block to both of the product pages... got 'Error loading block: Invalid parameter(s): attributes'. This happened for both posts... and... all 3 variant styles."

### DRAFT facts
Not applicable — this issue concerns an editor REST error, not a draft element.

### CLONE facts
Not applicable.

### BLOCK.JSON / PHP facts (verified)

The string "Invalid parameter(s): attributes" is the standard WordPress REST API error message emitted when a request parameter fails its `validate_callback`. The WP core REST framework emits `"Invalid parameter(s): attributes"` as the error message when the `validate_callback` for an arg named `"attributes"` returns a `WP_Error` or `false`.

**Three locations in `plugins/sgs-blocks/includes/` declare an `"attributes"` param that can fail:**

**Location 1** — `includes/block-defaults.php`, lines 139–147:
```php
function save_block_defaults( \WP_REST_Request $request ) {
    $attributes = $request->get_param( 'attributes' );
    if ( ! is_array( $attributes ) ) {
        return new \WP_Error(
            'invalid_attributes',
            __( 'Attributes must be an object.', 'sgs-blocks' ),
            [ 'status' => 400 ]
        );
    }
```
This is the block-defaults REST handler. Error code `'invalid_attributes'`.

**Location 2** — `includes/class-product-authoring.php`, lines 316–323:
```php
$incoming = (array) $request['attributes'];
if ( empty( $incoming ) ) {
    return new \WP_Error(
        'sgs_invalid_attributes',
        \__( 'At least one attribute is required.', 'sgs-blocks' ),
        array( 'status' => 400 )
    );
}
```
This is the product-authoring REST handler (product-attribute write endpoint). Error code `'sgs_invalid_attributes'`.

**Location 3** — `includes/class-product-provisioning-args.php`, lines 218–225 (`validate_attributes_array()` static method):
```php
public static function validate_attributes_array( $value ) {
    if ( ! \is_array( $value ) || empty( $value ) ) {
        return new \WP_Error(
            'sgs_invalid_attributes',
            \__( 'At least one attribute is required.', 'sgs-blocks' ),
            array( 'status' => 400 )
        );
    }
```
This is a `validate_callback` for the `attributes` param in the product-provisioning REST route args. When this `validate_callback` returns `WP_Error`, WP core wraps it: the error message surfaces as `"Invalid parameter(s): attributes"`.

**Binding path in edit.js:**
When the editor binds a product-card to a post, `edit.js` calls:
1. WC REST `apiFetch({ path: '/wc/v3/products?...' })` (line 107–108) to list WooCommerce products.
2. WP entity store `getEntityRecords('postType', 'sgs_product', query)` (line 89–91) for SGS CPT products.
Neither of these would trigger an `"attributes"` parameter error.

The "bind to product pages" path (Bean's description — picking regular WordPress pages as the product source) would hit the CPT entity-store path (`wp/v2/sgs_product` or `wp/v2/pages`), but selecting pages via the block's product-source ComboBox does not POST to an attributes-validating endpoint directly.

**What DOES trigger "Invalid parameter(s): attributes":** The WP REST framework fires this when a request is sent to any registered route that has an `"attributes"` arg with a `validate_callback`, and the callback returns false/WP_Error. The most likely route here is the product-provisioning or product-authoring endpoint being called with either: (a) no `attributes` array, or (b) an `attributes` param that is not an array. The block-defaults route (location 1) is also a candidate if the editor attempts to save defaults for the product-card and sends a non-array payload.

**Exact file:line locations:**
- `plugins/sgs-blocks/includes/block-defaults.php`:144 — `'invalid_attributes'` error
- `plugins/sgs-blocks/includes/class-product-authoring.php`:319 — `'sgs_invalid_attributes'` error
- `plugins/sgs-blocks/includes/class-product-provisioning-args.php`:221 — `'sgs_invalid_attributes'` via validate_callback

### DB facts
Not applicable to this issue.

### SPEC-DOC refs
Not applicable — this is an implementation error path, not a spec-defined behaviour.

---

## FP-H — Product-card architecture: InnerBlocks vs built-in elements; variants; draft card structure

### Issue (verbatim)
"The product card block's design/capability and variants don't actually match the [draft] product card's format so the cloned version is basically using it as an alternative sgs/container and inserting whatever blocks it's matching to inside it... From observation of the manual version of the product-card, we need build most of the elements into the block itself as elements rather than child blocks."

### DRAFT facts

Draft `.sgs-product-card` (main card) structure — `index.html` lines 837–861:
```html
<div class="sgs-product-card">
  <img class="sgs-product-card__image" ...>         <!-- built-in image -->
  <div class="sgs-product-card__body">
    <h3>Mama's Munches Zookies</h3>                 <!-- built-in heading -->
    <p class="sgs-product-card__description">...</p> <!-- built-in description -->
    <div class="sgs-featured-product__pill-group" role="group" aria-label="Choose pack size">
      <button class="sgs-featured-product__pill" ...>8-pack</button>
      <button class="sgs-featured-product__pill active" ...>12-pack</button>
      <button class="sgs-featured-product__pill" ...>20-pack</button>
      <button class="sgs-featured-product__pill" ...>40-pack</button>
    </div>
    <div class="sgs-featured-product__price-row">
      <span class="sgs-featured-product__price">£10.00</span>
      <span class="sgs-featured-product__price-note">8-pack · Free delivery over £35</span>
    </div>
    <a href="/product/zookies/" class="sgs-button sgs-button--primary">Add to Cart — £10</a>
  </div>
</div>
```
Elements that are direct structural children (not generic child blocks): image (`sgs-product-card__image`), heading (h3), description paragraph (`sgs-product-card__description`), pill-group with buttons (`sgs-featured-product__pill-group`/`sgs-featured-product__pill`), price row with price + note (`sgs-featured-product__price-row`, `sgs-featured-product__price`, `sgs-featured-product__price-note`), and a CTA anchor button.

### CLONE facts

Clone line 813 — main card:
```html
<div style="border-radius:16px;border-style:solid;border-width:1px"
     class="sgs-container product-card wp-block-sgs-product-card
            has-border-color has-border-border-color">
```
Block type: `wp-block-sgs-product-card`. The clone wrapper carries the class `sgs-container` in addition to `wp-block-sgs-product-card` — this is the SGS_Container_Wrapper::render() output adding the container class.

Inside the main card (lines 814–830): the converter inserted child blocks:
- `sgs-media` (line 814 — the product image)
- A flex `sgs-container` (line 815 — body wrapper, class `sgs-product-card__body`)
- Inside body: `sgs-heading` (h3, line 816), `sgs-text` (description, line 821), `sgs-option-picker` (pill group, line 822), flex `sgs-container` (price row, line 823), `sgs-text` (price, line 824), `sgs-text` (price note, line 825), `sgs-multi-button` → `sgs-button` (CTA, lines 827–829)

Clone line 832 — trial card:
```html
<div style="border-radius:16px;border-style:dashed;border-width:2px"
     class="sgs-container product-card trial-card sgs-gift-section__card--trial
            wp-block-sgs-product-card has-border-color has-accent-border-color">
```
`variantStyle` resolved to `"trial"` (class `trial-card` present). Inside (lines 833–848): `sgs-media` image, flex body container, `sgs-label` (trial tag, line 835), `sgs-heading`, `sgs-text` description, flex price row container, `sgs-text` price, `sgs-text` price note, `sgs-multi-button` → `sgs-button`.

**The clone is using `sourceMode='typed'` (InnerBlocks mode) for both cards.** Every content element is a separate child block, not a built-in element of `sgs/product-card`.

### BLOCK.JSON facts — `sgs/product-card` architecture

File: `plugins/sgs-blocks/src/blocks/product-card/block.json`

**InnerBlocks (typed mode):**
- `"allowedBlocks"` at root level (lines 181–188): `["sgs/media", "core/heading", "sgs/text", "sgs/label", "sgs/multi-button", "sgs/button"]`. These are the permitted InnerBlocks types.
- `"render": "file:./render.php"` — dynamic.
- render.php line 95–98 (typed mode): `echo SGS_Container_Wrapper::render(...)` — echoes `$content` (InnerBlocks HTML).
- edit.js lines 288–293: `useInnerBlocksProps(blockProps, { template: CARD_TEMPLATE, templateLock: false, allowedBlocks: ALLOWED_BLOCKS })` — InnerBlocks with a template and `templateLock: false`.

**Built-in typed attrs (NOT InnerBlocks — these render in the block itself):**
Attributes that are block-level (not child block content):
- `productName` (string) — present but edit.js uses InnerBlocks for heading
- `description` (string) — same
- `image` (string), `imageAlt` (string) — present
- `packSizes` (array) — pill-group data
- `priceLarge` (string), `priceNote` (string)
- `ctaText` (string), `ctaUrl` (string)
- `variantStyle` (enum: `"standard"`, `"trial"`, `"featured"`)
- `trialTag` (string), `featuredTag` (string)

However, in `typed` mode, render.php at line 95–98 echoes `$content` (InnerBlocks) without rendering these attrs as built-in elements. The block.json description states: "Typed mode = author content directly (InnerBlocks)."

**Typed mode = InnerBlocks only.** The typed-mode card is a shell wrapper (`product-card` div) + whatever child blocks are placed inside it.

**Variants (variantStyle):**
block.json lines 79–87: enum `["standard", "trial", "featured"]`, default `"standard"`.
edit.js lines 307–332: inspector SelectControl with labels "Standard", "Trial (dashed border + gradient)", "Featured".
render.php lines 60–66: maps `variantStyle` to CSS shell classes:
- `standard` → `["product-card"]`
- `trial` → `["product-card", "trial-card"]`
- `featured` → `["product-card", "featured-card"]`

**`sourceMode` enum** (lines 39–47): `["typed", "wc-product", "sgs-cpt"]`.
- `typed` = InnerBlocks
- `wc-product` / `sgs-cpt` = live data mode (renders from WooCommerce product or SGS CPT; does NOT use InnerBlocks in that path)

**DB facts:**
`blocks` table: `sgs/product-card` → `variant_attr = None`.
`block_composition`: `sgs/product-card` → `wraps_block = sgs/container`, `container_kind = content`.

### SPEC-DOC refs

**Spec 27** (`27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md`), line 268:
> "The existing presentational card (`sgs/product-card`, etc.) has a per-instance 'Source' toggle in the inspector: **Typed** (current behaviour -- fields via InnerBlocks/typed) or **Bound** (each field slot binds to the linked CPT entry's meta via `core/post-meta` or the `sgs-product/field` custom binding source). Same card markup, two feed modes."

Spec 27 line 103:
> `sgs/product-card` Typed mode (InnerBlocks wrapper shell) | SHIPPED | `src/blocks/product-card/block.json` (v1.3.0), `render.php`

Spec 27 line 573:
> "The FR-22-6 InnerBlocks migration of `sgs/product-card` (done 2026-05-31) is the prerequisite. Typed mode equals that InnerBlocks shape."

**Spec 29** (`29-CONTAINER-EQUIVALENT-BLOCKS.md`), line 74–77:
> `content` KIND: "A block that is a self-contained content unit with its own visual design. It may appear inside a grid (a card-grid cell, a pricing column) and needs to control its own inner width and spacing, but the outer grid/layout is managed by its parent."
> Line 147: `| sgs/product-card | Dual-mode product card — Typed (InnerBlocks) or Bound (live WooCommerce/CPT). Includes variable-product configurator. |`

**plugins/sgs-blocks/CLAUDE.md** (Block Build Status table):
> "Product Card | Deployed (dual-mode: Typed = InnerBlocks; Bound = live WooCommerce/CPT. Spec 27 Phase-1 CONFIGURATOR SHIPPED D164...)"

### PIPELINE / BLOCK LOCATION refs

- `plugins/sgs-blocks/src/blocks/product-card/block.json` — all attrs + allowedBlocks
- `plugins/sgs-blocks/src/blocks/product-card/render.php` lines 95–98 (typed branch), lines 55–66 (variantStyle shell classes)
- `plugins/sgs-blocks/src/blocks/product-card/edit.js` lines 57–64 (ALLOWED_BLOCKS const), lines 288–293 (InnerBlocks template setup), lines 307–332 (variantStyle inspector control)

---

## FP-DRAFT-FIX — Current draft naming: all classes on both cards and descendants

### Issue (verbatim)
"the draft's product-card naming is inconsistent (trial card class `sgs-product-card sgs-gift-section__card--trial`; featured card `.sgs-product-card` omits the variant; nested classes mix `sgs-product-card__*`, `sgs-gift-section__card-tag--trial`, `sgs-featured-product__price*`, etc.). Gather the FACTS of the CURRENT draft naming (every class on both cards + descendants, with line numbers). Do NOT rename anything — that's a later action."

### DRAFT facts — Main card (`.sgs-product-card`), `index.html` lines 837–861

| Line | Element | Class(es) |
|------|---------|-----------|
| 837 | `<div>` (card root) | `sgs-product-card` |
| 838 | `<img>` | `sgs-product-card__image` |
| 843 | `<div>` (body) | `sgs-product-card__body` |
| 844 | `<h3>` | *(no class)* |
| 845 | `<p>` | `sgs-product-card__description` |
| 847 | `<div>` (pill group) | `sgs-featured-product__pill-group` |
| 848 | `<button>` (8-pack) | `sgs-featured-product__pill` |
| 849 | `<button>` (12-pack) | `sgs-featured-product__pill active` |
| 850 | `<button>` (20-pack) | `sgs-featured-product__pill` |
| 851 | `<button>` (40-pack) | `sgs-featured-product__pill` |
| 854 | `<div>` (price row) | `sgs-featured-product__price-row` |
| 855 | `<span>` (price amount) | `sgs-featured-product__price` |
| 856 | `<span>` (price note) | `sgs-featured-product__price-note` |
| 859 | `<a>` (CTA) | `sgs-button sgs-button--primary` |

**Block prefix on card root:** `sgs-product-card` (uses `sgs-product-card` not `sgs-featured-product`).
**Elements inside the card body:** mixed prefix — `sgs-product-card__*` for image/body/description, but `sgs-featured-product__*` for pill-group, price-row, price, price-note.

### DRAFT facts — Trial card, `index.html` lines 864–880

| Line | Element | Class(es) |
|------|---------|-----------|
| 864 | `<div>` (card root) | `sgs-product-card sgs-gift-section__card--trial` |
| 865 | `<img>` | `sgs-product-card__image` |
| 870 | `<div>` (body) | `sgs-product-card__body` |
| 871 | `<div>` (tag badge) | `sgs-gift-section__card-tag--trial` |
| 872 | `<h3>` | *(no class)* |
| 873 | `<p>` | `sgs-product-card__description` |
| 874 | `<div>` (price row) | `sgs-featured-product__price-row` |
| 875 | `<span>` (price amount) | `sgs-featured-product__price` |
| 876 | `<span>` (price note) | `sgs-featured-product__price-note` |
| 878 | `<a>` (CTA) | `sgs-button sgs-button--secondary` |

**Observed naming inconsistencies (facts only):**

1. Trial card root (line 864): has two classes — `sgs-product-card` (product block prefix) and `sgs-gift-section__card--trial` (gift-section block prefix as a modifier). The main card root (line 837) has only `sgs-product-card` — the variant modifier is absent from the main card.

2. Pill buttons (lines 848–851): class prefix `sgs-featured-product__pill` and `sgs-featured-product__pill-group` — uses `sgs-featured-product` prefix, not `sgs-product-card`.

3. Price row, price amount, price note (lines 854–856 and 874–876 — present in BOTH cards): class prefix `sgs-featured-product__price-row`, `sgs-featured-product__price`, `sgs-featured-product__price-note` — uses `sgs-featured-product` prefix.

4. Trial tag badge (line 871): class `sgs-gift-section__card-tag--trial` — uses `sgs-gift-section` prefix.

5. Image and body wrapper (lines 838–843 and 865–870): both use `sgs-product-card__image` and `sgs-product-card__body` — consistent `sgs-product-card` prefix.

6. Description paragraph (lines 845, 873): both use `sgs-product-card__description` — consistent.

7. CTA anchor (lines 859, 878): both use `sgs-button` with modifier variant — `sgs-button--primary` (main) and `sgs-button--secondary` (trial). No `sgs-product-card` prefix on the CTA.

### CLONE facts (for cross-reference)

Clone line 832 — trial card root carries: `sgs-container product-card trial-card sgs-gift-section__card--trial wp-block-sgs-product-card has-border-color has-accent-border-color`.

The class `sgs-gift-section__card--trial` is carried through from the draft onto the clone's card root.

### DB facts
Not applicable to class-naming audit.

### SPEC-DOC refs

**Spec 00 (`00-naming-conventions.md`)**: BEM rule is `.sgs-<block>__<element>--<modifier>`. The draft mixes three distinct block prefixes (`sgs-product-card`, `sgs-featured-product`, `sgs-gift-section`) on elements within a single card component. This is a fact — the spec's BEM rule permits only one block prefix per component.

### PIPELINE / BLOCK LOCATION refs

- `sites/mamas-munches/mockups/homepage/index.html` lines 834–882 — the complete `.sgs-products` wrapper and both cards with all class names

---

## Coverage Checklist

| Issue | Status |
|-------|--------|
| FP-D — card-grid true purpose vs sgs/container | fact-complete |
| FP-E — card-grid actual capabilities: modes, post-type, filtering, sorting, preview, drag-in | fact-complete |
| FP-F — "Invalid parameter(s): attributes" error origin | fact-complete — 3 file:line locations identified; the exact call-path from the block editor when "binding to product pages" to determine which of the 3 fires is **partially blocked**: the block's editor REST call path for the product-source picker (edit.js lines 84–136) calls `wc/v3/products` and `wp/v2/sgs_product` entity store — neither of those routes is defined in the located PHP files. The 3 located errors are from product-authoring/provisioning/block-defaults endpoints. The exact REST route that fires when binding to a plain WordPress page is not confirmed from static analysis alone. |
| FP-H — product-card architecture: InnerBlocks vs built-in; variants; draft structure | fact-complete |
| FP-DRAFT-FIX — every class on both cards + descendants with line numbers | fact-complete |
