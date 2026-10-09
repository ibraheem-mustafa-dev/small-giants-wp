---
doc_type: spec
spec_id: 27
spec_version: 7
status: active
title: "SGS Product & WooCommerce Layer"
project: small-giants-wp
authors: Bean + Claude (Opus 4.8)
created: 2026-06-03
last_verified: 2026-10-09
absorbs: [24, 25, 28, 30]
absorbed_by: null
related:
  - specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md
  - specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md
  - specs/02-SGS-BLOCKS.md
  - plugins/sgs-blocks/src/blocks/product-card/
  - plugins/sgs-blocks/src/blocks/option-picker/
  - plugins/sgs-blocks/src/blocks/card-grid/
  - plugins/sgs-blocks/src/blocks/cart/
  - plugins/sgs-blocks/includes/class-product-bindings.php
  - plugins/sgs-blocks/includes/class-cart-proxy.php
  - theme/sgs-theme/functions.php
---

# Spec 27 - SGS Product & WooCommerce Layer

This is the single authoritative spec for the SGS product and WooCommerce layer, in three Parts:

- **Part 1 - Cards, binding and the variable-product configurator.** The dual-mode `sgs/product-card` (FR-24-2 to FR-24-3), the `sgs-product/field` Block Bindings source, the `sgs/option-picker` atomic block (FR-24-15) and variation sets (FR-24-11 to FR-24-14), the collection mode of `sgs/card-grid` and its 7 selection rules (FR-24-4 to FR-24-6), the `sgs/cart` mini-cart badge, and the variable-product configurator: live WC read-through, accessible pill swaps, secure add-to-cart, SEO schema, authoring and the AI-builder roadmap (FR-27-A1 onwards).
- **Part 2 - Smart bulk pricing.** The auto-pricing engine and the comparative value ladder (FR-28-n).
- **Part 3 - WooCommerce page types.** Single-product, shop archive, cart, checkout, the customer account area, schema per page type and the go-live gate (FR-30-n).

**FR-24-x IDs** are the card-system requirements. **FR-27-x IDs** are the configurator requirements. **FR-28-x IDs** are the bulk-pricing requirements. **FR-30-x IDs** are the page-type requirements. All four sets are stable: cross-references elsewhere in the codebase remain valid.

---

## Part 1 - Cards, binding and the variable-product configurator

### Problem statement

SGS card blocks (`sgs/product-card`, `sgs/testimonial`, team and case-study patterns) were presentational: a human typed every field into every card instance. There was no way to (a) author a product once and reuse it across pages, or (b) select a set of items by rule. This part defines the stack that fixes this:

1. A card that renders either typed content or live WooCommerce product data (dual mode).
2. A collection mode on `sgs/card-grid` that selects items by taxonomy, hand-pick or named condition.
3. A variable-product configurator that wraps WooCommerce (WC is the single source of truth; SGS adds accessible UI, cross-attribute availability past the 30-variation cliff, and the presentation WC cannot model).

SGS clients sell variable products (Mama's: 48 SKUs). The card reads pills from WooCommerce variations and swaps price, image, sale and stock live from a seeded manifest, knowing which combinations are valid.

---

### Who this is for

- **Bean** - non-coder owner; configures a query card and a product configurator with zero code, via the block editor only. Every control is an inspector control.
- **SGS clients** - tech-illiterate; add a product the way they add a page; drop a card, pick a rule; never touch code or WP-CLI.

---

### Background and research grounding

**Card and query layer:** the reference is WooCommerce's Product Collection block (GA Nov 2024), which queries by condition natively via `WC_Product_Query` but requires WooCommerce and keeps its inner Product Template developer-locked in many contexts. Block Bindings (WP 6.7 UI, mature 6.8, Pattern Overrides in 7.0) bind a heading, image or paragraph to a custom `register_block_bindings_source()`. Sort-by-meta is not in the Query Loop inspector UI (GitHub gutenberg #40170, open since 2022), so a dedicated collection mode owns its own `WP_Query`. Verdict: build ONE card that is the render template, fed two ways (typed attributes or live WooCommerce data).

**Variable-product configurator:** WooCommerce natively exposes, per variation, via `wc_get_product()` and the public Store API: regular/sale price (+schedule), stock qty/status, variation image, SKU, GTIN (`global_unique_id`, WC 9.3+), description, attributes, combination validity, and the inputs for "% off". WC leaves open: (1) the 30-variation cliff (`find_matching_variations` works only at or below `woocommerce_ajax_variation_threshold`, default 30; Mama's 48 already exceed it); (2) brutal authoring (block product editor removed in WC 11.0, 28 July 2026); (3) accessibility (no competitor claims WCAG 2.2 AA); (4) freemium bait-and-switch; (5) no per-unit pricing, cross-attribute availability, multi-image variation gallery, AI setup, or agency templating. Architecture verdict: never mirror WC variation data. Presentation-only metadata on existing WC objects; WC owns all commerce truth; the speed win comes from not loading WC's React bundle.

Full citations are in the Research evidence section.

---

### Design principles

These govern how the SGS layer and WooCommerce relate.

1. **WC is optional at the framework level.** A marketing site that installs no WooCommerce pays zero penalty: no extra CSS, no extra JS, `sgs/cart` renders nothing.
2. **The SGS card is always the authoring wrapper.** Clients design, configure and publish via SGS block inspector controls, never via WooCommerce's block editor or classic meta boxes.
3. **WC is the commerce backing store.** When WooCommerce is present it owns price, image, stock, variants and cart. The SGS layer reads from WC and bridges those values into SGS blocks. Duplicating WC data in custom meta would create two sources of truth.
4. **There is no standalone SGS product store (Bean ruling).** Bean dropped the standalone `sgs_product` CPT and its admin toggle in favour of existing SGS blocks plus a normal WooCommerce install. Product data comes from WooCommerce. `sourceMode` is `typed` or `wc-product`; `sgs-cpt` is a legacy render branch for content that already references an `sgs_product` post and has no authoring UI.
5. **No WC bundle on marketing pages.** The `sgs/*` card blocks never load WooCommerce's React bundle. WP Interactivity API plus the WC Store REST API replace it at approximately 12 KB.
6. **WooCommerce owns commerce data (price, stock, variations).** SGS config that WC does not model (display modes, swatches, the per-unit divisor) lives in term meta, variation postmeta or block attributes. There is no `_sgs_sku_matrix`. (D149/D151 dual-source ruling: the WC-present path reads WC variations, never custom meta.)
7. **R-31-14 clean.** `render.php` branches on the explicit `sourceMode` attribute, never on `empty($content)`.

---

### Feature and status map

| Feature | Status | Primary files | Spec section |
|---------|--------|---------------|--------------|
| `sgs/product-card` Typed mode (built-in-element renderer, ZERO InnerBlocks; the typed card has no deprecation path, Bean 2026-06-10) | built | `plugins/sgs-blocks/src/blocks/product-card/render.php`, `plugins/sgs-blocks/includes/product-card-builtin-render.php` | FR-24-2 |
| `sgs/product-card` Bound mode, `sourceMode: wc-product` | built | `plugins/sgs-blocks/src/blocks/product-card/render.php`, `plugins/sgs-blocks/includes/class-product-bindings.php` | FR-24-2, FR-24-3 |
| `sgs/product-card` Bound mode, `sourceMode: sgs-cpt` | legacy render branch, no authoring UI | `plugins/sgs-blocks/src/blocks/product-card/render.php` | Design principle 4 |
| `sgs-product/field` Block Bindings source | built | `plugins/sgs-blocks/includes/class-product-bindings.php` | Binding source section |
| Editor product picker (WC products) and `sourceMode` auto-set | built | `plugins/sgs-blocks/src/blocks/product-card/edit.js` | FR-24-3 |
| Add-to-cart through the SGS proxy (R-31-14-clean) | built | `plugins/sgs-blocks/includes/class-cart-proxy.php`, `plugins/sgs-blocks/src/blocks/product-card/view.js` | FR-27-G1 |
| `sgs/cart` mini-cart count badge | built; drawer not built | `plugins/sgs-blocks/src/blocks/cart/` | Cart section |
| `sgs/option-picker` atomic block | built | `plugins/sgs-blocks/src/blocks/option-picker/` | FR-24-15 |
| Collection query (own `WP_Query`, selection rules) in `sgs/card-grid` collection mode | built | `plugins/sgs-blocks/src/blocks/card-grid/`, `plugins/sgs-blocks/includes/class-cpt-collection-query.php` | FR-24-4, FR-24-5, FR-24-6 |
| Pill-to-price/image swap via the Interactivity API (0-XHR multi-axis swap from the seeded manifest) | built | `plugins/sgs-blocks/src/blocks/product-card/view.js`, `plugins/sgs-blocks/includes/class-product-manifest.php` | FR-27-A1, FR-27-A2 |
| WC adapter for the collection surface | not built; triggers when a shop client needs it | separate spec when in scope | FR-24-4 |
| `sgs/trust-bar` dual mode (Typed repeater; Bound mode is for the live configurator only) | built | `plugins/sgs-blocks/src/blocks/trust-bar/` | FR-24-10 |
| Configurator Phase 1 (read-through sell loop, hardening, WCAG evidence) | built | `plugins/sgs-blocks/src/blocks/product-card/`, `plugins/sgs-blocks/includes/class-product-manifest.php`, `plugins/sgs-blocks/includes/class-product-bindings.php`, `plugins/sgs-blocks/includes/class-cart-proxy.php`, `plugins/sgs-blocks/includes/class-sgs-configurator-compat.php`, `plugins/sgs-blocks/tests/js/configurator-schema-compat.test.js`, `plugins/sgs-blocks/tests/php/ConfiguratorCompatTest.php`, `.claude/reports/sgs-configurator-moat-evidence.md` | FR-27-A, B, C, G, H, I-MVP |
| Configurator Phase 2 (display, SEO, authoring, go-live gate) | built | `plugins/sgs-blocks/includes/class-configurator-meta.php`, `plugins/sgs-blocks/includes/configurator-head.php`, `plugins/sgs-blocks/includes/configurator-term-fields.php`, `plugins/sgs-blocks/includes/configurator-variation-fields.php`, `plugins/sgs-blocks/includes/class-product-manifest.php`, `plugins/sgs-blocks/includes/class-demand-analytics.php`, `plugins/sgs-blocks/includes/class-product-schema.php`, `plugins/sgs-blocks/includes/class-product-canonical.php`, `plugins/sgs-blocks/includes/class-product-sitemap.php` | Cluster A, B, C |
| FR-27-R1 authoring controller | built | `plugins/sgs-blocks/includes/class-product-authoring.php`, `plugins/sgs-blocks/includes/class-product-authoring-security.php` | FR-27-R1 |
| FR-27-R2 provisioning, cartesian generation, rollback | built | `plugins/sgs-blocks/includes/class-product-provisioning.php` | FR-27-R2 |
| FR-27-R3 presentation authoring and edit safety | built | `plugins/sgs-blocks/includes/configurator-term-fields.php`, `plugins/sgs-blocks/includes/class-configurator-edit-safety.php` | FR-27-R3 |
| FR-27-PREFLIGHT go-live gate | built | `plugins/sgs-blocks/includes/class-product-preflight.php`, `plugins/sgs-blocks/includes/class-cart-proxy.php` | FR-27-PREFLIGHT |
| FR-27-R4 agency slug-templates | built | `plugins/sgs-blocks/includes/class-product-templates.php` and the sibling `class-product-templates-*.php` files | FR-27-R4 |
| FR-27-F2 AI-citation levers and merchant feed | built | `plugins/sgs-blocks/includes/class-product-feed.php`, `plugins/sgs-blocks/includes/class-llms-txt.php`, `plugins/sgs-blocks/src/blocks/product-faq/` | FR-27-F2 |
| FR-27-R5 AI-builder | NOT BUILT, decision-gated (the last unbuilt FR; design via /brainstorming only; does not block a first client shop) | - | FR-27-R5 |
| FR-24-7 popularity counter, FR-24-8 Pattern Overrides | NOT BUILT | - | FR-24-7, FR-24-8 |

---

### Architecture

#### Card and collection layer

```
WooCommerce products (single source of truth)
        |  read by
        v
Block Bindings source (sgs-product/field)  --->  binds field slots of
        |                                        sgs/product-card
        | queried by                              Typed mode -> built-in elements from attributes (no InnerBlocks)
        v                                         Bound mode -> field slots bound to the live product
sgs/card-grid (collection mode)  ---loop---->  dual-mode card (sgs/product-card)
  (own WP_Query; named selection rules)
        |
        v
   designed empty state (server-rendered)
```

- **Data source:** WooCommerce products. No WooCommerce means typed cards only.
- **Query engine:** `sgs/card-grid` collection mode with its own `WP_Query`. Named selection presets resolve to `WP_Query` args in `plugins/sgs-blocks/src/blocks/card-grid/render.php`. The `query_loop_block_query_vars` filter is not needed.
- **Field surfacing:** Block Bindings API (`register_block_bindings_source()` for computed and derived fields such as formatted price).
- **Card:** the presentational card made dual-mode (FR-24-2).
- **Dual-source Bound mode (D149 / D151).** When WooCommerce is present, the card binds to WooCommerce-native product data (price, image, stock, variations via WC's own meta and REST endpoints). The source is auto-detected from the product picker; there is no client-facing source toggle.

#### Variable-product configurator layer

```
WooCommerce (single source of truth, read-through -- never mirrored)
  per-variation: regular/sale price (+schedule), stock, image, SKU, GTIN,
  combination validity, cart/checkout
        |  server: wc_get_product() / wc_get_price_to_display()
        |  client: WC Store API /wc/store/v1 (no React bundle)
        v
SGS thin layer
  +-- sgs/product-card -- owns ONE Interactivity store + the seeded manifest;
  |     child option-pickers read/write the shared context (inter-block state)
  +-- sgs/option-picker -- accessible pill/swatch UI; one per attribute axis
  +-- availability engine -- cross-attribute grey-out (snapshot + add-to-cart re-check)
  +-- /sgs/v1/cart/add-item proxy -- validates (IDOR + attr-match + stock + caps), then adds
  |     IN-PROCESS via WC()->cart->add_to_cart (server-authoritative; the single add-to-cart
  |     path; a woocommerce_add_to_cart_validation filter holds the cap on direct calls too)
  +-- presentation meta -- term_meta (swatch) + variation postmeta (discount label,
  |     per-unit DIVISOR, gallery IDs) + block attributes (display-subset, flags)
  +-- schema emitter -- ProductGroup + hasVariant JSON-LD (Merchant-complete), SSR
  +-- SGS authoring controller (wraps WC data-store classes); AI-builder (FR-27-R5, not built)
```

**Inter-block state (load-bearing).** The `sgs/product-card` is the single Interactivity store and the one shared `data-wp-context` (manifest + selection). Child `sgs/option-picker` blocks (one per axis) read the shared context and write their selection back; the card derives price, image and availability. Option-pickers own no commerce state.

**Manifest payload.** Seeded inline at SSR: (a) a sparse valid-combinations set (list of valid attribute-tuples + per-variation price as display-minor-int + a stock flag + a `pctOff` int, NOT a dense per-variation grid) and (b) the default variation's image/price/copy as concrete literals. The fast path holds to approximately 200-300 variations within the cap. Above the cap, the matrix is prefetched once on first interaction with the card (`pointerenter`/`focusin`), not on a pill `change`, so the first selection is still local (no per-select XHR). Per-variation galleries and long copy are prefetched the same way. Cap: the `data-wp-context` JSON is at most 24 KB AND the JSON-LD `<script>` is at most 16 KB (measured separately); `hasVariant` has at most 50 representative children with `AggregateOffer.offerCount` equal to the true total. Above either cap, the configurator switches to the prefetch path.

**The clean split.** WC-owned (read-through): price/sale (+schedule), stock, variation images, the parent product gallery, combination validity, SKU, GTIN, cart/checkout. SGS presentation/config: swatch colour/image (`term_meta`); discount-type label (cosmetic-only, save-time-rejected if it contains a numeric percentage) (`postmeta`); per-unit pricing (a stored unit DIVISOR `_sgs_unit_divisor`, the displayed per-unit price DERIVED at render from the live WC price divided by the divisor, not a free-text note); gallery IDs (`postmeta`); display-subset and flags (block attributes).

#### Per-site WC-optional architecture

When WooCommerce is not active:

- `plugins/sgs-blocks/includes/class-product-bindings.php` still loads but the WC branch in `get_value()` is unreachable (no WC products exist).
- `sgs/cart` renders nothing (a comment node, no visible output).
- No WooCommerce plugin dependency is declared in `plugins/sgs-blocks/sgs-blocks.php`. The plugin runs clean on non-WC sites.

When WooCommerce is active, the SGS layer detects it via `function_exists('wc_get_product')`. No hard `require` or plugin header dependency.

---

### Data model

#### Per-variation presentation meta (configurator layer)

Stored on WC objects (term meta + variation postmeta):

| Key / location | Type | Purpose |
|----------------|------|---------|
| `_sgs_swatch_color` (term meta) | string | Swatch hex colour |
| `_sgs_swatch_image_id` (term meta) | int | Swatch image attachment ID (validated via `wp_attachment_is_image()`) |
| `_sgs_variation_gallery` (variation postmeta) | JSON array of ints | Per-variation gallery image IDs |
| `_sgs_unit_divisor` (variation postmeta) | number | Divisor for derived per-unit display: per-unit = live WC price divided by this value; derived at render, never stored as a price |
| `_sgs_variation_upsert_key` (variation postmeta) | string | Sorted slug-joined attribute combo for dedup on authoring re-run |
| `_sgs_variesby_value` (term meta) | string | Closed-enum `variesBy` value for JSON-LD (`color`, `size`, `material`, etc.) |
| `_sgs_variation_sets` (legacy post meta) | string (JSON array) | Per-type `display_as` and `content_impact`; presentation/config only, read by `plugins/sgs-blocks/includes/class-product-bindings.php`; no registration or authoring panel |

---

### `sgs-product/field` binding source

**Registered name:** `sgs-product/field`
**File:** `plugins/sgs-blocks/includes/class-product-bindings.php`
**Registered on:** `init` priority 15.

`uses_context: ['postId', 'postType']`

`source_args.source` controls the data backend per instance:
- `'auto'` -- derives from the linked product type (a WC product uses the WC path).
- `'wc'` -- WooCommerce path: `wc_get_product()` for price via `get_price_html()` (yields ranges "£10-£30" for variable products); image via `get_image_id()`; stock via `get_availability()`.
- `'cpt'` -- legacy path for content that already references an `sgs_product` post: `get_post_meta($id, 'sgs_price', true)`, `get_post_meta($id, 'sgs_price_note', true)`. No authoring UI creates such posts.

`_sgs_variation_sets` (`get_post_meta($id, '_sgs_variation_sets', true)`) is SGS-specific config WooCommerce does not model.

---

### Blocks (shipped layer)

The FR-24-x requirements below are the shipped card-system requirements. FR-24-x IDs are the card-system requirements; FR-27-x IDs are the configurator requirements; both are stable.

#### FR-24-2 -- Dual-mode card

The presentational card (`sgs/product-card`) has a per-instance "Source" control in the inspector: **Typed** (fields from the block's own attributes) or **Bound** (each field slot binds to the linked product's data via the `sgs-product/field` binding source). Same card markup, two feed modes. No second block, no second render path beyond the binding resolution.

**Built-in-element renderer in ALL modes (Bean sign-off 2026-06-10, FP-H design gate).** The two modes differ ONLY in each element's data source (typed = operator-entered attributes; bound = the live product/manifest), never in how elements render. Every commerce element (image, name, description, price+note, badge, CTA) renders from the block's own typed attributes via the element-MIRROR pattern (each element mirrors its source block's full control set: CTA mirrors `sgs/button`, image mirrors `sgs/media`, badge mirrors `sgs/label`, through shared helpers, with the WS-4 auto-propagation rule), with ZERO InnerBlocks in typed mode and no deprecation path (the typed card is not used in any content). The pack-size picker stays the live configurator subsystem; per-instance variation-axis visibility is a card control (show or hide each of the bound product's axes; display-level only, never alters variations or the manifest). CTA model (approved): max 2 text buttons (1 primary + 1 secondary; behaviours add-to-basket / buy-now / learn-more; buy-now = add + straight to checkout through the same cart-proxy guards), express-pay as a gateway-rendered toggle (official gateway buttons only, never self-painted).

**Canonical draft BEM vocabulary for the cloned card (locked 2026-06-10):** one prefix `sgs-product-card`; variants as root modifiers `--featured`/`--trial` -> `variantStyle`; elements `__title`/`__image`/`__body`/`__description`/`__pill-group`/`__pill`(+`__pill--active`)/`__price-row`/`__price`/`__price-note`/`__tag--trial`; the `<h3>` carries `sgs-product-card__title` -> `productName` (required: an unclassed h3 falls back to the tag-mapping table and emits a `core/heading` child block, contradicting zero-InnerBlocks); nested CTA = standalone `sgs-button` block. Full table: Spec 02 section "Canonical draft BEM vocabulary"; gate doc: `.claude/reports/wave2/FP-E-FP-H-DESIGN-GATE-2026-06-10.md`.

**`overrideElements` semantic contract (the only place this is specced; `plugins/sgs-blocks/includes/product-card-builtin-render.php::sgs_product_card_resolve_element` enforces it).** An array attribute (enum members `name|description|badge|image|cta`; `plugins/sgs-blocks/src/blocks/product-card/block.json` constrains it via `items.enum`). Per element: toggle OFF -> the LIVE product value renders and the operator's typed value is PRESERVED untouched (so toggling back needs no retyping); toggle ON -> the typed value renders UNLESS it is empty, in which case the LIVE value still renders (an empty override never blanks a card). **PRICE IS NEVER A MEMBER** (page, schema and feed parity / DMCC: deliberately absent from the enum at every layer). `badge` is INERT when `variantStyle='standard'` (no badge field exists for that variant, by design). The `cta` override resolves LABEL and URL independently (same flag, two `resolve_element()` calls with different typed values), so an operator may override the label while leaving the URL pointing at the live product page. Image override = DEFAULT image only: it substitutes the single SSR/seed fallback URL; variation-specific image swaps stay live on the variable branch (the `data-wp-bind--src` binds are INTENTIONALLY unconditional there and INTENTIONALLY absent on the non-variable branch; do NOT "fix" the asymmetry; see the cross-referenced comments in `render.php`). `sgs-cpt` connected cards get the toggles but no live-value help text or gallery strip (no `/wc/v3` record; intended degradation).

**ItemList emission threshold (FR-27-E1).** ONE page-level ItemList per singular front-end page (`Product_Item_List`, the recursive block-tree walker = the single shared API `collect_page_product_ids()`, also consumed by the ProductGroup focus gate). Sources: `wc-product` card-grids and loose `wc-product` product-cards (NOT `sgs-cpt`: those have no canonical WC URL for a `ListItem`/`ProductGroup`). Deduped (first position wins). Emits when the final list has **at least 2 entries OR (at least 1 AND at least one grid contributed)**: a query grid matching one product is still a listing surface; a single loose card is an editorial mention, not a listing. **Every collection and emission boundary gates on `Product_Item_List::is_publicly_listable()` (publish + `is_visible()`) so draft, private and hidden products never leak a URL into public JSON-LD.** SEC-9: defer to Yoast/RankMath. ProductGroup (single-product JSON-LD, `plugins/sgs-blocks/includes/configurator-head.php`): `is_product()` pages always emit; otherwise emit only when exactly ONE distinct connected product is on the page.

#### FR-24-3 -- Item picker

In Bound mode, an inspector control lets the operator pick a specific WooCommerce product (searchable select). The card then displays that product's data live; editing the product updates every card that references it (single source of truth). `sourceMode` is auto-set from the picker: `wc-product` | `typed` (`sgs-cpt` only on legacy content). No client-facing source toggle.

#### FR-24-4 -- Query/collection (sgs/card-grid collection mode)

`sgs/card-grid` in collection mode (own `WP_Query`) iterates a chosen content type and renders each result through the dual-mode card in Bound mode. Inspector controls: source content type, count/limit and selection rule. Decision: a dedicated query over core Query Loop.

#### FR-24-5 -- Named-condition selection

The collection mode exposes selection presets as named inspector controls, resolved via `WP_Query` args in `plugins/sgs-blocks/src/blocks/card-grid/render.php`:

| `selectionRule` value | Query behaviour |
|-----------------------|----------------|
| `newest` | `orderby: date`, `order: DESC` |
| `featured` | `meta_query: sgs_featured = true`, `orderby: date DESC` tiebreak |
| `most-expensive` | `meta_key: sgs_price`, `orderby: meta_value_num`, `order: DESC` |
| `cheapest` | `meta_key: sgs_price`, `orderby: meta_value_num`, `order: ASC` |
| `most-popular` | `meta_key: sgs_views`, `orderby: meta_value_num DESC`, date DESC fallback (no writer exists, FR-24-7) |
| `handpicked` | `post__in: handpickedIds[]`, ordered by the IDs array |
| `category` | `tax_query` on the content type's category taxonomy, `orderby: date DESC` |

Conditions are meta-driven, not hardcoded per content type (R-31-1, R-31-9). `contentType` is whitelisted via the `sgs_content_collection_post_types` filter (applied in `plugins/sgs-blocks/includes/class-cpt-collection-query.php`; default `['sgs_product', 'product']`). Count is capped server-side 1-24.

#### FR-24-6 -- Designed empty state

When a query matches zero items (or a bound entry is deleted), the live site shows the client-written `emptyMessage` (`productEmptyMessage` in WooCommerce mode), server-rendered and no-JS safe. Both default to empty: with no message the live site shows nothing in that spot and the editor canvas shows a notice telling the client to set one (Bean, 2026-10-08; the same rule covers `sgs/gallery` `emptyMessage` and `sgs/post-grid` `emptyMessage`/`errorMessage`). The collection also renders an empty state when the bound product has been deleted (IDOR-guarded: a `get_post_type($id)` check ensures the picked ID is the correct post type before rendering).

#### FR-24-7 -- Popularity counter (optional) -- NOT BUILT

A lightweight, privacy-safe view/interaction counter would write to `sgs_views` meta to power "Most-popular" without analytics coupling. Opt-in; off by default. Nothing writes `sgs_views` today, so `most-popular` falls back to date order. Sales-based popularity requires the WooCommerce adapter. Signal source (simple view counter or a privacy-safe interaction signal) is undecided.

#### FR-24-8 -- Pattern Override integration (WP 7.0) -- NOT BUILT

Each card field slot declares `allowedBindings`; a card registered as a synced pattern exposes its bound fields as overridable slots, so a "product card" pattern is reusable site-wide with per-instance overrides.

#### FR-24-9 -- Cloning

Product cards and option pickers are produced by Spec 47's computed route from the framework DB; this spec adds no converter behaviour. The query-driven layer is additive and is an operator-authoring feature.

#### FR-24-10 -- Curated-content blocks are dual-mode too (Bean-directed, 2026-06-01)

`sgs/trust-bar` keeps its curated **Typed mode** (an `items[]` repeater with the 3 badge variants `icon-circle`/`text-only`/`image-badge`, autoScroll and title) so the client editor is not replaced by raw block nesting. It has no Bound InnerBlocks mode for cloning. `render.php` branches on the explicit `sourceMode` attribute, not on `empty($content)` (R-31-14).

#### FR-24-11 to FR-24-17 -- Variation-sets and `sgs/option-picker`

Design ratified via D144. Full design: `.claude/reports/2026-06-01-product-card-option-picker-design.md`.

**FR-24-11 -- `_sgs_variation_sets` meta.** Per-type `content_impact` map. Each type also carries a `display_as` mode: `pills` | `static-list` | `hidden` (D144.1). For WC products this is presentation/config only; commerce data comes from WC. Read path built (`plugins/sgs-blocks/includes/class-product-bindings.php`); no editor panel exists.

**FR-24-12 -- Content-impact map drives card rendering, not block logic.** R-31-9.

**FR-24-13 -- Per-instance Interactivity API store.** The card owns the store; option-pickers read/write shared context (see the inter-block-state model in the architecture section and FR-27-I-MVP).

**FR-24-14 -- Slot-conflict priority.** First type wins.

**FR-24-15 -- `sgs/option-picker` atomic block.** Radio-group semantics via visually-hidden `<input type=radio>` + `<label>` + pill `<span>`, CSS `:checked` active state, bubbling `sgs:option-selected` event (`detail: { typeKey, selectedKey, contentImpact }`). NOT `sgs/button`. A standalone-use block and the target a cloned pill group maps to.

Source toggle (Typed/Bound) appears in both the block toolbar AND the inspector (one attribute, two controls) (D144.5). Pill style: three CSS states -- resting / hover+focus ("considering") / `:checked` ("selected") (D144.3).

**Pill styling is per-instance, cloneable and preset-driven (D299).** Each pill state is an editor control backed by a liftable attribute, so the cloning route copies a draft's exact pill design (the draft's pill variables are theme-token-aligned, so it is a variable-name-to-token mapping, not arbitrary extraction):
- **Resting:** `pillBgColour`/`pillTextColour`/`pillBorderColour` -> `--sgs-op-bg`/`-text`/`-border`; `pillBorderRadius` -> `--sgs-op-pill-radius`.
- **Selected:** `pillSelectedBgColour`/`pillSelectedTextColour`/`pillSelectedBorderColour` (border decoupled from fill) -> `--sgs-op-sel-bg`/`-sel-text`/`-sel-border`; `pillSelectedBorderRadius`; `showSelectedTick` (the tick is optional and ships OFF: a selected option is already carried by its border, background and text colour, its photo and its price. `sgs/buybox` and `sgs/product-card` each forward their own `pickerShowSelectedTick` to it, and all three default `false`).
- **Named presets** (button-preset pattern, Spec 32/D291: `.sgs-option-picker--{preset}` from `--wp--custom--option-picker-presets--*` tokens): **`soft`** (draft cream/tint) and **`solid`** (pink-fill). A preset SEEDS the pill-state attributes, each then editable.
- `sgs/product-card` forwards the pill-style attributes into `render_block('sgs/option-picker')`. All option-picker attributes pass the no-inline checklist.

**FR-24-16 -- No-JS default state.** Default variation fully rendered server-side; no pill interaction required to see product info.

**FR-24-17 -- `aria-live` on dynamic slots.** Price/stock/image slots that update on pill selection carry `aria-live="polite"`.

**D144 ratified decisions:**
1. Per-type `display_as`: `pills` (interactive) | `static-list` (renders "Available in N flavours: A, B, C", non-interactive selling point) | `hidden`. PLUS a card-level "price only" toggle that sets all pickers hidden so the card shows just "From £x".
2. Pill style and three CSS states as above.
3. Source toggle in both toolbar and inspector.
4. Variation-sets editor UI: Gutenberg panel, not classic meta box (the panel is no longer shipped; see FR-24-11).

#### `sgs/cart` (badge)

| Phase | What | Status |
|-------|------|--------|
| count badge | Store API `GET /wc/store/v1/cart`; SSR count=0; WP Interactivity API re-hydrates on load; no jQuery; `cart-fragments` dequeued | built |
| drawer | Slide-in mini-cart listing items + quantities + subtotal, driven by Store API (the core Mini-Cart drawer is used instead, Part 3 FR-30-4) | not built |
| add-to-cart integration | Badge count increments when `sgs/product-card` fires `wc-blocks_added_to_cart` | built |

Primary files: `plugins/sgs-blocks/src/blocks/cart/`.

---

### Phasing (cards and collection layer)

Built: `sgs/option-picker` (FR-24-15), Bound mode and the item picker (FR-24-2, FR-24-3), the collection mode with named conditions and designed empty state (FR-24-4 to FR-24-6), the live read-through swap (FR-27-A1/A2). Not built: FR-24-7 popularity counter, FR-24-8 Pattern Overrides, aspect-ratio lock and hover controls. Whether a generic content-type mechanism (testimonial, team, case study) returns is open now that the product CPT is gone.

---

### Acceptance criteria (cards and collection layer)

1. A `sgs/product-card` set to Bound mode with a picked WooCommerce product renders that product's live data; editing the product updates the card.
2. A `sgs/card-grid` in collection mode with the "Featured" preset shows only featured items; "Most-expensive" sorts by price descending. Both from inspector controls, no code.
3. An empty query renders the designed placeholder, not a blank region.
4. A marketing site with no WooCommerce ships no product weight.
5. The Typed card shape stays a deprecation-free subset: the schema-compat tests (`plugins/sgs-blocks/tests/js/configurator-schema-compat.test.js`, `plugins/sgs-blocks/tests/php/ConfiguratorCompatTest.php`) pass.

---

### Variable-product configurator (new chapter)

> **Decision (Bean, 2026-06-03):** the SGS card + option-picker become a variable-product configurator that wraps WooCommerce (WC = single source of truth; SGS adds the UI, the availability logic WC breaks above 30 variations, and the presentation WC cannot model). No commerce data is mirrored into custom storage.
>
> **Scope ruling (Bean, 2026-06-04):** the whole spec ships before launch, so authoring and PREFLIGHT are in scope. The brutal qc-council flagged AI-builder-as-headline as the OC-Protector stall trap, so the AI-builder (FR-27-R5) stays decision-gated.
>
> **Moat:** the durable advantage is the end-to-end closed loop (SGS builds the shop AND it renders accessibly with SEO, no plugin-stitching) plus a first-mover WCAG 2.2 AA claim. The "no-React performance" edge is real but expiring (WooCommerce is migrating to the same lean approach), so we ride it, not bank on it. The AI-builder is a roadmap ambition, not a moat we can defend as uncopyable.
>
> **Clean-slate:** the SGS theme is live on no client site. No migration or back-compat obligations; change the existing build where there is tangible benefit.

#### Goals

1. A configurator where pills swap price/image/sale/stock, reading WooCommerce live. Mama's sells.
2. Secure, no-oversell add-to-cart; WC server-authoritative on price and stock.
3. WCAG 2.2 AA whole card; the first-mover accessibility claim, evidenced.
4. Cross-attribute availability past the 30-variation cliff.
5. Best-in-class SEO and AI-discovery, server-rendered, full Merchant-Listings eligibility (Cluster B: E1/E2/E3/F1).
6. Friendly authoring that writes WC variations (R1 controller + R2 provisioning/cartesian/rollback) + edit-safety (R3) + a hard go-live PREFLIGHT gate; R4 (slug-templates) and F2 (AI-citation/feed). Only the AI-builder (R5) remains, decision-gated (does not block a first client shop).
7. Graceful degradation: a WC simple product gives a plain card; a site without WooCommerce renders typed cards only.

#### Non-goals (configurator)

- Rebuilding WC cart/checkout/payments/tax/shipping; mirroring WC commerce data; a combinatorial `_sgs_sku_matrix` in custom meta; per-instance content migration (clean slate).
- B2B/wholesale role pricing (Indus Foods), subscriptions/bundles, configurator analytics, multi-currency. These are sibling specs.

#### Hard constraints (configurator)

- **WC = single source of truth.** Client sends IDs + an attribute object, never prices. Server recomputes and re-validates price AND stock at add-to-cart.
- **WC authoritative; SGS holds a seeded read-through CACHE reconciled server-side.** No DURABLE custom store of WC commerce data (presentation/config only in term meta / variation postmeta / block attributes). The SSR-seeded manifest (per-variation price/sale/stock literals in `data-wp-context`) IS a short-lived read-through cache; the freshness defence is the render-time `get_date_modified()` staleness guard (FR-27-G6), not an assumption that nothing can go stale.
- **All display bindings resolve against server-seeded context whose default equals the SSR literal.** Interactivity directives run server-side; binding to a JS-only getter wipes the SSR value (auto-memory note "Interactivity directive traps"). Per-variation derived values (% off) are seeded as literals, never computed in a client getter.
- **Pages stay fully cacheable.** Oversell protection is a live add-to-cart-click re-check (a single fragment call), NOT page-uncacheable rendering. Price/stock freshness via targeted purge on stock and sale-schedule hooks (FR-27-G6).
- **Tax/currency correctness:** seed display prices from `wc_get_price_to_display()` (never own division); store decimals from `wc_get_price_decimals()` (not assumed 2dp); seed BOTH ex/inc-tax values OR cache-exclude the price fragment and vary on tax context (FR-27-H3).
- **The authoring write path wraps WC's high-level data-store classes** (`WC_Product_Variable`/`WC_Product_Variation` `set_*()` + `save()`) with explicit post-write side-effects (`wc_delete_product_transients()` + attribute-lookup regenerator + `woocommerce_update_product`), NOT raw postmeta and NOT the same-server REST batch as primary. A golden-master diff test vs the native editor runs every WC major.
- WCAG 2.2 AA whole card; mobile-first; 44px targets; `viewScriptModule`; Interactivity API only (no React/jQuery on the product page). Minimum WooCommerce 9.8; WC below 9.8 renders the card read-only with a static price (no configurator JS) + an admin notice (defined degradation, FR-27-A5).

#### Functional requirements (grouped by phase)

Each FR carries a holistic test strategy. Status is a plain word: built, or NOT BUILT.

##### Phase 1 -- MVP (the read-through configurator that makes Mama's sell)

**FR-27-A1 -- Resolver reads WC variations live.** Status: built. `sgs-product/field` resolves the WC variation set (price via `wc_get_price_to_display()`, regular/sale, stock, image, GTIN, attributes) via `wc_get_product()`. No `_sgs_variation_sets` commerce read on the WC path (static test asserts zero such reads in the WC branch). A WC simple product degrades to a plain card.
- Done when: a Bound WC variable product renders real values; a simple product renders a plain card; grep confirms no `_sgs_variation_sets` commerce read on the WC branch. Test: 48-SKU + simple fixtures vs `get_available_variations()`.

**FR-27-A2 -- Manifest seeded into the card's shared context (SSR, no-JS-safe, no per-select XHR).** Status: built. Seed per the payload spec (sparse valid-combos + default literals), minor-int from `wc_get_price_to_display()`, decimals from `wc_get_price_decimals()`, currency `get_woocommerce_currency()` at request time. Default variation price/image/stock are SSR literals; all `data-wp-bind`/`data-wp-text` bind to seeded context (default equals literal). No XHR on a pill `change`; the long-tail prefetch (if any) fires on first card interaction (`pointerenter`/`focusin`), never on `change`.
- Done when: JS off shows the default variation fully rendered and it survives directive processing; JS on: pill change swaps with no XHR on change; context JSON is at most 24 KB. Test: JS-disabled fetch + network panel (no XHR on change) + size assert.

**FR-27-A3 -- No-WooCommerce sites.** Status: built. A site without WooCommerce has no product data source: cards render in Typed mode, `sgs/cart` renders nothing, and no commerce is attempted (there is no product CPT fallback; see Design principle 4). The configurator gate is `plugins/sgs-blocks/includes/class-sgs-configurator-compat.php::is_supported`.
- Done when: with WC deactivated a typed card renders and no PHP notice or fatal appears. Test: toggle WC.

**FR-27-A5 -- Defined degradation below WC 9.8 + WC-activation mode-switch.** Status: built. On WC below 9.8: the card renders read-only (static default price, no configurator JS) + a dismissible admin notice naming the required version. On WC activation on a site that has `sgs-cpt` cards: a detection hook surfaces an admin prompt ("N product cards use the no-shop format -- link them to WooCommerce products?"), never a silent break.
- Done when: WC 9.7 renders the read-only card + notice; activating WC surfaces the migration prompt. Test: version-floor + activation-hook fixtures.

**FR-27-B1 -- WCAG 2.2 AA across the whole card.** Status: built. Option-picker: `<input type=radio>` + `<label>`, always-visible text label (never colour-only), radiogroup keyboard nav, 44px targets, `aria-disabled` + SR status on unavailable/OOS, focus-visible, `prefers-reduced-motion`. Card: `aria-live="polite"` on dynamic price/stock; focus management after add-to-cart. The evidence sheet (FR-27-J1) plants the first-mover claim.
- Done when (objective; axe-core is necessary, not sufficient): (a) axe-core 0 violations; (b) keyboard-only: Tab reaches every pill, arrows navigate the radiogroup, no focus trap; (c) NVDA+Chrome announces label+state+price/stock change; (d) every target is at least 44x44px measured via computed bounding rect in Playwright. Test: the four objective gates.

**FR-27-C1 -- Cross-attribute availability (snapshot + server re-check).** Status: built. From the seeded valid-combos set, the card store greys (visible, `aria-disabled`, announced) options on other axes yielding no valid in-stock variation, both directions, any count (where native WC above 30 fails). Availability is snapshot-time; on a failed add-to-cart with HTTP 409 (stock), fire one `GET /wc/store/v1/products/{id}`, refresh the matrix, re-run grey-out, announce "that combination just sold out" via `aria-live`.
- Done when: the 48-SKU gap fixture greys correctly both directions and announces; a post-load OOS selection is caught and re-synced; native WC (above 30) would fail. Test: the gap fixture + OOS-after-load recovery.

**FR-27-G1 -- Add-to-cart via the SGS proxy; WC server-authoritative.** Status: built (`plugins/sgs-blocks/includes/class-cart-proxy.php`). The client POSTs `/sgs/v1/cart/add-item` (the single add-to-cart path) with the variation `id` + `quantity` + a `variation` array of `{attribute, value}` + an `X-WP-Nonce`, never a price (plus, from a choice flow, optional `addons` `{group, key}` pairs priced server-side, Spec 43 FR-43-18, and `fields` answers, FR-43-21). **Wire format (pinned live, WC 10.8.1):** `attribute` is the WC attribute DISPLAY NAME (e.g. `Size`, `Flavour`) and `value` is the term SLUG (e.g. `12-pack`, `vanilla`), NOT `pa_size`, NOT `attribute_pa_size`. The variation `id` alone resolves the right variation and price server-side; the array is the attribute-match payload. The proxy maps the client's key to the taxonomy internally for the G2 IDOR/attribute-match (the variation object's `get_attributes()` returns taxonomy form; the parent's attributes carry the display-name-to-taxonomy map). **A display name is not a stable key:** the server resolves each client attribute key against forms derived from the attribute slug (`pa_frame-size`, `frame-size`, `frame size`) as well as the display name, because a display name is filterable (`woocommerce_attribute_label`) and cached in the manifest; any lookup keyed on a shopper-facing string must do the same. **Architecture:** the proxy validates (G2 + caps) then adds IN-PROCESS via `WC()->cart->add_to_cart( $parent_id, $qty, $variation_id, $variation_attributes_taxonomy_form )`: the same server-authoritative recompute-price + re-validate-stock guarantee, the same cookie cart session the `sgs/cart` badge reads, WITHOUT an internal HTTP round-trip to the Store API. Any price field is ignored. **Bypass closed:** a `woocommerce_add_to_cart_validation` filter (`enforce_add_to_cart_limits`) enforces the per-SKU cap and global rate-limit on EVERY add-to-cart path (the proxy AND a direct `/wc/store/v1` call), so the proxy is the enforced policy site-wide.
- Done when: a tampered request (fake price / OOS / foreign ID / attribute-mismatch / parent-id / empty-variation / draft) is rejected or server-priced. Test: adversarial fixtures (no-nonce 403 / valid 200 / IDOR 400 / parent-id 400 / OOS 409 / attr-mismatch 400 / empty-variation 400 / quantity-cap clamp; a direct over-cap call is rejected).

**FR-27-G2 -- IDOR + attribute-match + per-object validation.** Status: built. Before acting on any client ID: `get_post_type()` is in {`product`,`product_variation`} and the variation object's `is_purchasable()` (variation-level `enabled`, not just parent). Validate every `{attribute,value}` against the claimed variation's own attributes (mismatch = 400). Authoring/meta writes use per-object `edit_post`/`manage_woocommerce`, never the general cap.
- Done when: draft/foreign ID, disabled variation, unregistered/mismatched attribute all rejected; per-object cap enforced. Test: IDOR + disabled + mismatch fixtures.

**FR-27-G3 -- Store-API auth + rate-limit.** Status: built. Nonce model (seed `wp_create_nonce('wc_store_api')`, send `Nonce`, rotate from response header); the `Cart-Token` header (NOT a cookie; it is a request header stored in `sessionStorage`, mitigated by CSP; an HttpOnly-cookie wrapper is an out-of-scope hardening task) for long-lived-page resilience. Enable WC rate-limiting (at least 9.6; custom fingerprint for 9.8+). Recommend edge WAF.
- Done when: add-to-cart survives nonce rotation; token in sessionStorage + CSP; flooding rate-limited. Test: rotation + token + rate-limit.

**FR-27-G6 -- No oversell + inventory-abuse defence (cacheable).** Status: built. Oversell protection is a single server stock re-check on the explicit add-to-cart click only (page stays fully cacheable). Plus, in the proxy: per-SKU quantity cap = `min(requested, floor(stock * 0.3))`; per-fingerprint (IP + token-hash) 30 s cooldown per SKU; document `woocommerce_hold_stock_minutes` = 15. Cache freshness: `wc_scheduled_sales` is NOT a real WC hook; do not use it. The AUTHORITATIVE, write-path-agnostic mechanism is a **render-time staleness guard**: compare `wc_get_product($id)->get_date_modified()` against the manifest's `generated_at`; if the product changed since the cache was seeded, rebuild the manifest before serving (one indexed read; the page stays cacheable below it). This catches every price/stock/sale change regardless of which hook fired. PLUS best-effort cache-purge hooks (verified names): `woocommerce_variation_set_stock_status`, `woocommerce_product_set_stock`, `woocommerce_product_set_price` (fires on scheduled-sale start/end transitions), `woocommerce_product_set_sale_price`, `woocommerce_update_product`, `save_post_product` (the manual-metabox-edit path). The manifest carries `generated_at`; client-side, if age is over 1 h, the add-to-cart click triggers a manifest refresh before the call.
- Done when: sell-out-after-load is blocked gracefully; a cart-flood is capped and cooled; a sale-end purges the cached page; a manifest older than 1 h refreshes before add-to-cart. Test: oversell + flood + sale-expiry-purge + stale-manifest fixtures.

**FR-27-H1 -- INP at most 200 ms (lab gate, CrUX monitor); no React bundle.** Status: built. Interactivity API (`viewScriptModule`, approximately 12 KB) only; no WC React/jQuery. Pill selection resolves from seeded/prefetched state, no XHR on `change`. Budgets: block JS at most 20 KB parsed; product-page JS at most 150 KB uncompressed; context manifest at most 24 KB; JSON-LD at most 16 KB.
- Done when: lab INP (Chrome DevTools, throttled mid-tier mobile 4G) is at most 200 ms on a 48-SKU pill change (mandatory CI gate); CrUX p75 monitored post-launch when data exists. No React bundle; budgets met. Test: lab INP + bundle/size asserts + "no XHR on change".

**FR-27-H2 -- LCP at most 2.5 s, CLS at most 0.1 on swap.** Status: built. Default variation SSR'd; product image `loading=eager` + `fetchpriority=high`, others `lazy`; price/stock elements reserved-height; swap via `data-wp-bind` (no node insertion).
- Done when: swap is CLS 0; LCP is at most 2.5 s. Test: CWV capture across a swap at 3 viewports.

**FR-27-H3 -- Tax-context-correct caching.** Status: built. Seed BOTH ex- and inc-tax display values into the manifest (so a cached page serves the right one per the customer's tax context) OR render the price as a cache-excluded fragment with vary-on-tax-context. Round via WC semantics (`wc_get_price_to_display()`), never own division; honour `wc_get_price_decimals()`.
- Done when: a tax-exempt (B2B) and a standard customer each see the correct price from the same cached page; the card price matches the cart price (no rounding drift). Test: B2B-exempt + standard customer on a cached page; card-vs-cart price parity.

**FR-27-I-MVP -- Inter-block state + schema compatibility + dev fixture.** Status: built. The card owns the store + shared context; option-pickers read/write it (the inter-block-state model in the architecture section). The Typed shape stays a deprecation-free subset after `sourceMode` + swatch attributes are added (a Jest `block.json` schema-compat test and a PHPUnit deprecation test assert this: `plugins/sgs-blocks/tests/js/configurator-schema-compat.test.js`, `plugins/sgs-blocks/tests/php/ConfiguratorCompatTest.php`). Typed mode has no cross-attribute availability (WC Bound required for C1). A `plugins/sgs-blocks/scripts/seed-48-sku-fixture.php` dev script (WC PHP API, not the authoring path) creates the test product for Phases 1-2.
- Done when: shared-context swap works; schema-compat tests pass; the seed script builds the 48-SKU fixture. Test: schema-compat + fixture-seed.

##### Phase 2 -- Display + SEO + AI-visible

**FR-27-B2 -- Swatch modes via WC attribute term meta.** Status: built. Text/colour/image swatches via `term_meta` (`_sgs_swatch_color`, `_sgs_swatch_image_id`; `absint()` + `wp_attachment_is_image()` validated, `wp_get_attachment_image_src()` with graceful fallback + authoring-time validation feedback), a `{taxonomy}_edit_form_fields` authoring control, and build-time WCAG auto-contrast. Typed mode carries optional swatch fields on `optionItems`. Test: swatch authored + a11y + image-validation + Typed swatch.

**FR-27-B3 -- Per-unit (derived) + discount-label (cosmetic) + server-rendered % off.** Status: built. Per-unit price DERIVED at render from the live WC price divided by `_sgs_unit_divisor` (not a stored note); a cosmetic badge (digit-stripped, SEC-4) reusing `sgs/label`; an on-sale "Sale" badge; WC variation-editor authoring controls. Discount-type label is cosmetic `postmeta`, save-time-rejected if it contains a numeric %. "% off" is computed server-side from the WC regular and sale price, seeded as a `pctOff` literal per variation (guarded against divide-by-zero, capped at 95; `plugins/sgs-blocks/includes/class-product-manifest.php`), with no client getter. Test: sale + divisor + label fixtures; assert derived per-unit, server % off, %-reject. The comparative per-unit ladder across pack sizes is Part 2 (FR-28-7/8/9).

**FR-27-C2 -- OOS vs nonexistent distinct + announced.** Status: built. A 3-state `termAvailability()` gives distinct "(sold out)" vs "(unavailable)" screen-reader text. Test: OOS + nonexistent fixture; axe + SR.

**FR-27-A4 -- Per-variation gallery.** Status: built. The gallery is ONE ordered, de-duplicated attachment-id list: the `_sgs_variation_gallery` variation `postmeta`, the variation's own image, the parent featured image, then the parent's WooCommerce product gallery (`WC_Product::get_gallery_image_ids()`), prefetched per the payload spec. De-duplication is on the integer attachment id with first occurrence winning, so the operator's `_sgs_variation_gallery` keeps position 0 when it is set and the variation-to-parent chain holds it otherwise; either way `gallery[0]` is the main image that `imageUrl`, the SSR `<img>`, the no-image gate and the `view.js` swap all read. A parent-level gallery is shared by every variation; per-variation isolation is an authoring act (populate `_sgs_variation_gallery`), not a framework one. The thumbnail strip is rebuilt imperatively on swap with a delegated click listener; the image box is a fixed-220px object-fit-cover box with an editable `imageHeight`; media-picker authoring is built. **On `sgs/product-card` the thumbnail strip is OPT-IN and ships OFF** (`plugins/sgs-blocks/src/blocks/product-card/block.json::attributes.showGalleryThumbs`, default `false`, with a "Show image thumbnails" inspector toggle): the strip belongs to the product page gallery only (Bean, 2026-10-06). When the toggle is off the strip is not rendered at all (`plugins/sgs-blocks/src/blocks/product-card/view.js::renderThumbStrip` early-returns on a missing strip); when on, the `count >= 2` condition still applies. `sgs/buybox`'s own gallery strip (`plugins/sgs-blocks/src/blocks/buybox/gallery-col.php`) is a separate render and stays on by default. Any change to the combo shape must bump the `Product_Manifest::build()` cache key or cached products keep serving the old shape. Test: gallery swap + fallbacks.

**FR-27-E1 -- ProductGroup + hasVariant JSON-LD, Merchant-complete, SSR.** Status: built (`plugins/sgs-blocks/includes/class-product-schema.php`, reading the manifest only; SEC-1 CI-grep clean). `ProductGroup` (`productGroupID` = parent ID/SKU; `variesBy` via an explicit operator-set `_sgs_variesby_value` term_meta mapped to the closed enum color/size/material/pattern/suggestedAge/suggestedGender; unmapped axes omitted from `variesBy` but kept as free-text child properties; `brand` from WC brand/attribute; `aggregateRating` from `get_average_rating()`/`get_review_count()` when reviews exist; `AggregateOffer` low/high + `offerCount` = true total) + `hasVariant` (at most 50 children) each with `sku`, identifier (`gtin13` from `global_unique_id`; else `mpn` from SKU; else `"identifier_exists": false`), absolute `image` (at least 250px, fallback parent, descriptive `alt`), `isVariantOf`, nested `Offer` (`price`, `priceCurrency` = `get_woocommerce_currency()`, `priceValidUntil` = the scheduled sale-end date if on a scheduled sale, else OMITTED; never a fabricated rolling date; `availability`, canonical `url`, `itemCondition` default `NewCondition`). `shippingDetails` + `hasMerchantReturnPolicy` at ProductGroup level. Emitted via `wp_json_encode()`; all `url` via `esc_url()` + same-origin. Test: Rich Results Test (0 errors; unmapped-axis warnings OK) + Merchant preview + currency-at-request.

**FR-27-E2 -- Canonical (+ optional indexable escape hatch).** Status: built. WP core already strips `?attribute_*` to the clean parent canonical; `plugins/sgs-blocks/includes/class-product-canonical.php` adds the opt-in `indexVariationUrl` override built from the variation's own `get_attributes()` (SEC-7, no `$_GET`), SEC-9 defer. `?attribute_*` redirects to `rel=canonical` to the parent; no indexable thin pages by default; a per-variation `indexVariationUrl` block attribute (default false) promotes a high-intent variation when justified; canonical hreflang-neutral. Test: default canonical + opt-in promotion.

**FR-27-E3 -- Supporting schema + freshness.** Status: built. `BreadcrumbList` (delivered by PLACING the existing `sgs/breadcrumbs` block on the product template); `og:type=product` + price/availability OG tags (always inc-VAT, inside the SEC-9 guard); WP-core sitemap `<lastmod>` accuracy = MAX(parent, all-variation modified) via a `wp_sitemaps_posts_entry` filter (`plugins/sgs-blocks/includes/class-product-sitemap.php`) + cache-purge on the FR-27-G6 hooks so the page never serves a stale price.
- **DESCOPED (Bean):** the per-variation `<image:image>` XML sitemap clause is not built: WP_Sitemaps has no clean image namespace, Google deprecated image sitemaps, and the E1 ProductGroup schema already exposes every variation image. SEC-9 detect-and-defer to Yoast/RankMath stands.

**FR-27-F1 -- All commerce content in SSR HTML.** Status: built. Price/availability/copy/JSON-LD in the initial response (AI crawlers do not run JS). Test: `curl` (no JS) shows price/availability + JSON-LD.

##### Phase R -- authoring and AI-builder

**FR-27-R1 -- SGS authoring controller (wraps WC data-store classes).** Status: built (`plugins/sgs-blocks/includes/class-product-authoring.php`, `plugins/sgs-blocks/includes/class-product-authoring-args.php`; the shared security chain is in `plugins/sgs-blocks/includes/class-product-authoring-security.php`). `/sgs/v1/` controller using `WC_Product_Variable`/`WC_Product_Variation` `set_*()` + `save()` (NOT raw postmeta, NOT same-server REST batch as primary) + explicit post-write `wc_delete_product_transients()` + attribute-lookup regenerator + `woocommerce_update_product`. `permission_callback` = per-object `edit_post`; every write validates `X-WP-Nonce` (CSRF); per-user rate-limit; multisite blog-context guard. A golden-master diff test vs the native editor (dump postmeta + term relationships + lookup rows; diff must be empty) runs every WC major.
- Done when: writes via `/sgs/v1/` produce a product byte-identical (golden-master) to the native editor's; CSRF/cap/multisite enforced. Test: golden-master diff + security fixtures.

**FR-27-R2 -- Attribute/term provisioning + generation + bulk + rollback.** Status: built (`plugins/sgs-blocks/includes/class-product-provisioning.php` and its `-args`/`-helpers` siblings; golden-master byte-identity, injected-failure 0-orphan rollback and shared-taxonomy sibling-safety live-proven). Provision/reuse global `pa_*` taxonomies + terms from plain input (conflict-safe term-merge matrix defined; adding a subset never breaks other products on a shared taxonomy); generate the cartesian product; inline + bulk edit (a `POST .../variations/bulk` endpoint); parent attributes MERGED by union (a re-run with fewer attributes cannot orphan); a 300-combo cap enforced before any write; an upsert key = sorted slug-joined attribute combo stored in `_sgs_variation_upsert_key` postmeta (dedup on re-run). Rollback (WC batch is NOT transactional): track created variation IDs; on any failure, delete them + restore pre-write state; the UI shows created-vs-failed + a retry, never a corrupted product. A triple-gated injected-failure test hook is dead in production. Client-legible progress and error states throughout.
- Done when: 48-SKU provision+generate+bulk+write with no dupes; an injected mid-write failure rolls back cleanly with a recovery UI; a shared-taxonomy subset add does not break siblings. Test: provision/dedup/rollback/shared-taxonomy fixtures.

**FR-27-R3 -- Presentation authoring + edit-safety.** Status: built. The swatch/gallery/divisor/label authoring controls are on the term and variation screens; a Google `variesBy` `<select>` is on the attribute term add/edit screens, saved via `Configurator_Meta::sanitize_variesby`; `plugins/sgs-blocks/includes/class-configurator-edit-safety.php` adds a `pa_*` term SLUG-rename warning, a delete-variation-with-orders warning and orphaned-meta cleanup on variation delete. Author swatch/label/divisor/gallery/subset (sanitised on save: plain text `sanitize_text_field`, FAQ/long-copy `wp_kses_post`, integer IDs `absint()` + media-validated; escape on render; `wp_json_encode` for JSON-LD). Edit-safety: deleting a variation with order history warns + cleans up orphaned term_meta/postmeta + documents the mid-checkout window; renaming an attribute term warns about existing carts. Test: author + delete-with-orders + rename fixtures; zero-raw-meta authoring proven by the QA-AUTHORING end-to-end run.

**FR-27-R4 -- Agency slug-templates.** Status: built (`plugins/sgs-blocks/includes/class-product-templates.php` and its sibling `class-product-templates-*.php` files, plus the WC product-editor panel for save / two-step apply / export / import). Templates store attribute/term slugs + presentation config (never IDs), stored as an `sgs_product_template` CPT; the envelope is slug-only (versioned JSON in the CPT `post_content`; commerce/legal keys deny-listed; swatch attachment IDs not carried), exported/imported via `/sgs/v1/product-templates/{id}/export|import` (`manage_woocommerce`); applying provisions attributes/terms (R2) then links the card, so a fresh client install gets a working configurator. Test: export site A then apply site B (no shared IDs) then working configurator.

**FR-27-R5 -- AI-builder shop setup (roadmap ambition).** Status: NOT BUILT, decision-gated; build last (D168). Brief -> suggested attributes/values/swatches/copy -> operator/agent confirms via a full-variation-list-with-prices diff view (not just attribute names) -> provisions via R1/R2. LLM output is untrusted: attribute keys validated to the `pa_` slug regex (not a vocabulary whitelist); values/labels `sanitize_text_field()` + `wp_strip_all_tags()` + a URL-pattern reject (no `https?://`/`//` in plain-text/copy fields, blocks SEO-poisoning) + max-length caps (name at most 200, desc at most 2000, label at most 80) before storage; per-user/shop AI rate-limit; second-order injection (imported-feed to AI) acknowledged.
- Done when: a brief produces a confirmable full-price diff then a real WC product; a `<script>`/URL-injection brief is neutralised; over-length/over-rate rejected. Test: brief-to-product + injection + URL-inject + rate-limit fixtures.

##### Cross-cutting requirements

**FR-27-PREFLIGHT -- Go-live + setup pre-flight check.** Status: built (`plugins/sgs-blocks/includes/class-product-preflight.php`). `Product_Preflight::evaluate()` runs the blocker checks listed in the class header on variable products only, and surfaces a client-legible "ready / N issues" report. Also built: (a) a `transition_post_status` HARD block (SEC-5) that reverts a blocked publish to draft, writes `_sgs_preflight_issues` meta and shows a dismissible admin notice, with a dual re-entrancy guard; (b) a `GET /sgs/v1/products/{id}/preflight` pre-check endpoint (nonce + per-object edit_post) for the authoring UI/agent; (c) a `no_variesby` check; (d) the cart £0 422 guard layer (`sgs_price_not_set` in `plugins/sgs-blocks/includes/class-cart-proxy.php` + the `woocommerce_add_to_cart_validation` filter for the Store-API path); (e) a weekly `sgs_preflight_health_check` cron (batched, at most 50) that flags degraded products. The `invalid_jsonld` check is publish-gated: the manifest/schema only builds for a published product, so a pre-publish readiness check on a draft does not falsely flag empty JSON-LD; it validates at the publish transition and on every re-save of a published product. Test: a deliberately-misconfigured product surfaces each issue; the QA-AUTHORING end-to-end run proves the author -> publish -> rich-results journey.

**FR-27-I2 -- Theme / Spec 32 Part B alignment.** Status: built. Swatch/pill colours derive from theme tokens (Spec 32 Part B); respect the per-client global-styles layer; auto-contrast (build-time luminance: at render, compute WCAG luminance of the swatch/pill background; text = `#000`/`#fff` whichever passes 4.5:1) applies to pill text. Test: client-palette restyle + contrast.

**FR-27-I3 -- Spec 24/25 reconciliation.** Status: built. The card-system (FR-24-x) and WooCommerce experience layer requirements are folded into this spec. `render.php`: WC variations present means ignore `_sgs_variation_sets` for commerce.

**FR-27-J1 -- Ownable claims, moat-rated, evidenced.** Each claim produces a passing test + an evidence artefact in `.claude/reports/sgs-configurator-moat-evidence.md` + a durability rating: structural (closed-loop AI-built-shop-renders-accessibly-with-SEO, the real moat) | first-mover (WCAG 2.2 AA, claim now before a rival plants it) | expiring (no-React perf, ride WC's own Interactivity migration, do not bank on it) | feature (per-unit, gallery, availability, no-upsell; copyable but ship anyway).

**FR-27-F2 -- AI-citation levers + secure feed.** Status: built (`plugins/sgs-blocks/includes/class-product-feed.php`, `plugins/sgs-blocks/includes/class-llms-txt.php`, `plugins/sgs-blocks/includes/product-faq-schema.php`, `plugins/sgs-blocks/src/blocks/product-faq/`, `plugins/sgs-blocks/src/blocks/product-faq-item/`). Research pack: `.claude/reports/2026-06-09-f2-gold-standard-research.md`. `FAQPage` JSON-LD from the `sgs/product-faq` block (native details/summary, one merged FAQPage JSON-LD via a `wp_footer` collector, HEX-flag encoded) or an existing `core/details`/`sgs/accordion`. **Value framing:** Google fully deprecated FAQ rich results on 2026-05-07 for ALL sites; the markup's value is Bing rich results + AI-citation extraction, so every client-facing surface (block description, editor tooltip, inspector help text, docs) MUST say "improves AI search citation and Bing visibility" and MUST NOT claim Google rich results or expandable answers in Google (enforced by a grep gate). `llms.txt` (product names + categories only, safe) AND `llms-full.txt` (full prices/attrs), both filtered to `post_status='publish'` AND `post_password=''` AND `catalog_visibility NOT IN (hidden,search)`, rate-limited, `X-Robots-Tag: noindex` (confirmed correct), `Content-Type: text/plain`, entity-decoded, 6 h cache + single-flight lock; `llms.txt` is a navigation map to existing pages only (category/policy indexes, never per-product pages, never content absent from the site: anti-cloaking), regenerated on `woocommerce_update_product`. `speakable` is DESCOPED (still beta, news-publishers/US-English/Google-Home only, never applicable to e-commerce). A Merchant feed at `GET /sgs/v1/merchant-feed` (XML RSS 2.0 `g:` namespace; per-variation items with `item_group_id` = `productGroupID` via the shared `Product_Schema::product_group_id()`; variant deep-link URLs per SEC-7; real GTIN per variant or `identifier_exists=false`, never fabricated; price/availability read ONLY from the same manifest the JSON-LD uses per SEC-1, since feed/page/schema mismatch is the #1 GMC rejection cause), catalog-visibility filtered (the search-only exfiltration fix), raw `post_password` guard, 2000-product cap and stampede lock, read only from `wc_get_product()`, descriptions `wp_strip_all_tags()`, image URLs same-origin/allowlist (no SSRF), public but rate-limited.
- Done when: FAQ schema fires (and no client-facing string claims Google rich results); `llms.txt`/`llms-full.txt` leak no draft/hidden products and are rate-limited, noindex and text/plain; the feed agrees with schema and is injection/SSRF-safe with variant deep-links. Test: schema/feed parity + draft-exfil probe + SSRF probe + a grep gate over client-facing strings for "rich result|expandable answer".

---

### Non-functional requirements

- Budgets: less than 100 KB CSS; at most 150 KB JS/page; context manifest at most 24 KB; JSON-LD at most 16 KB; lab INP at most 200 ms; LCP at most 2.5 s; CLS at most 0.1.
- WC-optional; minimum WC 9.8 with defined degradation; single-currency per request (multi-currency is a sibling spec).
- UK English in all code, comments and user-facing text.
- Selection presets resolve server-side; result counts capped (default 12, max configurable).
- Binding resolution adds no measurable TTFB regression vs a typed card.
- Inspector defaults are "safe": a fresh collection block shows newest N of the chosen type, so a client cannot trivially configure an empty grid.

---

### Acceptance criteria (configurator)

1. A Bound WC card renders real WC price/stock/image; pills swap with no XHR on change; no-JS shows the default literal; context is at most 24 KB; card price equals cart price across tax contexts (A1/A2/H1/H3).
2. 48-SKU: selecting an attribute greys unavailable combos both directions and announces it; a post-load OOS selection is caught at add-to-cart, where native WC (above 30) fails (C1/G6).
3. axe-core 0 + keyboard + SR + 44px-measured pass; price/stock announced (B1).
4. A tampered add-to-cart (fake price/OOS/foreign ID/attr-mismatch/disabled) is rejected or server-priced via the proxy; a cart-flood is capped and cooled; a sale-end purges the cached page (G1/G2/G6).
5. Lab INP is at most 200 ms on a pill change; no React bundle; CLS 0 on swap (H).
6. The Typed shape stays a deprecation-free subset; the schema-compat tests pass (I-MVP).
7. Rich Results Test passes ProductGroup + per-variation Offers (brand/identifier/priceValidUntil-or-omitted/shipping/returns); `curl` shows price/availability + JSON-LD (E/F1).
8. `/sgs/v1/` writes are golden-master-identical to the native editor (R1); the AI-builder (R5), when built, is injection-safe with a full-price confirm diff.
9. Each FR-27-J1 claim has a test + evidence + a durability rating.

---

### Monetisation and positioning

Not a plugin for sale. This is the commerce engine of the SGS AI website builder and a client-delivery moat that wins shop clients at SME/charity budgets. SGS does not fight the open plugin market (a funded competitor out-executes a solo agency on distribution, support and trust). The customer never evaluates SGS in a feature grid; they hire an agency and get a great configurator as a side-effect. Revenue: SGS's productised build + retainer + the AI-builder commerce tier.

---

### Open questions (consolidated, de-duplicated)

1. **AI-builder LLM surface (FR-27-R5)** -- model, on-device vs API, per-shop cost guard.
2. **Configurator analytics** -- which combos shoppers try but cannot buy (an inventory and agency-upsell goldmine). Sibling spec; prioritise early.
3. **B2B/wholesale quantity-break and role pricing (Indus Foods)** -- sibling spec.
4. **Subscriptions/bundles (Mama's roadmap)** -- sibling spec; bundles break the no-mirror axiom and need their own architecture decision.
5. **Multi-currency manifest** -- sibling spec.
6. **Bound-mode field resolution (FR-24-2/3)** -- confirm Block Bindings cover image and repeatable pack-options, or fall back to a custom `get_value_callback` source.
7. **Popularity signal source (FR-24-7)** -- simple view counter vs a privacy-safe interaction signal.
8. **Generic content-type mechanism** -- whether testimonial/team/case-study collections need a registered content type now the product CPT is gone.

---

### Research evidence (citations)

- **WC native + Store API:** Store/REST API docs (add-item `variation:[{attribute,value}]`; stable 2022); cart-tokens (header); rate-limiting + card-testing (2024); performance roadmap (Oct 2025); product-editor-beta retiring (2 June 2026); GTIN `global_unique_id` (WC 9.3); `wc_get_product` object cache (Jan 2026); Store-API Last-Modified (Apr 2026); attribute-lookup `DataRegenerator`; HPOS dual-write post-mortem (Sep 2022).
- **Card/query layer:** WooCommerce Product Collection block (GA Nov 2024); ACF "Product Catalog Without WooCommerce" (Sep 2025); Block Bindings (WP 6.7 UI, mature 6.8); GitHub gutenberg #40170 (meta-orderby gap, open since 2022); Reddit r/woocommerce Jun 2025; FacetWP incompatibility docs; GitHub Discussion #44776.
- **Competitor gaps:** WordPress.org support (186-variation 5 s, Feb 2026); WC GitHub #63430/#64278; GetWooPlugins reviews (Trustpilot 2.2 stars); WC feature-request portal (2023-2026); AllAccessible.org (Oct 2025); WC Interactivity-API migration (Oct 2025), the expiring-perf-moat evidence.
- **SEO/AI:** Google product-variants + `variesBy` closed-enum (Feb 2024); Merchant-listing brand/GTIN/priceValidUntil/shipping/returns; canonical docs; AI Overviews shopping (ALM Corp 2026); AI-crawlers-no-JS (seo-kreativ.de, May 2026); FAQPage/llms-full/speakable 2026; INP CWV + CrUX-needs-traffic (web.dev; DebugBear; Adfinite, Mar 2026).
- **Security/CWV:** Store-API nonce/cart-token/rate-limit/card-testing (2022-2026); CVE-2025-26762 (XSS), CVE-2026-32459 (SQLi), Store-API unauth patch (Mar 2026); CVE-2025-47504 (stored XSS to admin); Interactivity API runtime size (Oct 2025); UK Consumer Rights Act 2015 (misleading-price exposure on stale sale display).

---

### Cross-references

- **Aligns with:** Spec 47 (the computed route that clones product cards and option pickers), Spec 32 Part B (global styles / auto-contrast), Spec 11 (button presets).
- **Key decisions:** D144 (option-picker ratification), D148 (cart + option-picker), D149 (dual-source architecture), D151 (wrapper + bridge model, add-to-cart), Option A ratified (WC source of truth; no mirror; clean slate; closed-loop moat; AI-builder = roadmap).
- **Primary files:** `plugins/sgs-blocks/includes/class-product-bindings.php`, `plugins/sgs-blocks/src/blocks/product-card/`, `plugins/sgs-blocks/src/blocks/option-picker/`, `plugins/sgs-blocks/src/blocks/card-grid/`, `plugins/sgs-blocks/src/blocks/cart/`, `/sgs/v1/cart/add-item` (proxy endpoint).

---

## Part 2 - Smart bulk pricing

Two halves of one feature that turn quantity-discount pricing from a mental-energy sink into a one-number decision, and pack selection into a guided value ladder. FR IDs in this part are `FR-28-n`; they are stable and cited from `plugins/sgs-blocks/includes/class-pack-pricing-*.php` and `plugins/sgs-blocks/includes/class-pricing-engine.php`. Status: complete (all four phases built); the phase list is: P1 value ladder (FR-28-7/8/9), P2 engine (FR-28-1/2/3), P3 preview authoring (FR-28-3/4/6/10/11), P4 commit-to-WC (FR-28-5/13/14); the safety FRs (FR-28-12/15/16/17) apply across them.

### USP / why this exists

1. **Auto-pricing engine (the deal-winner).** A non-technical shop owner enters ONE number, the price of a single item (even if a single is never sold), picks a discount strength, and the engine generates every pack price using a psychologically and legally grounded model. No spreadsheet, no guessing. Site-wide, per-category or per-product.
2. **Comparative value ladder (the conversion lift).** The product card shows the per-unit price at EVERY pack size with the saving vs a single item, anchored on the smallest pack and framed as loss ("save 30p each vs buying singly"), so "bigger pack = cheaper per item" becomes an explicit buying cue.

Most WooCommerce shops make the owner hand-set every variation price and never surface the per-unit value ladder. This makes both automatic.

**Moat honesty.** The *engine itself is commodity*: at least five plugins do quantity discounts and the ~12-line power-law formula clones by lunchtime. The defensible asset is the **integrated clone -> theme -> WooCommerce -> value-ladder closed loop**: a standalone discount plugin cannot author prices into the same pipeline that built the site, drive the same `sgs/label` badge system, and read them back through the SSR manifest. The engine is a feature of the loop, not the moat.

**Research basis:** a CRO/UX audit plus a pricing-science report covering UK pricing law (Price Marking Order 2004 amendments effective 2026-04-06, CMA, DMCC Act 2024, ASA 2026). Verdict: ONE model dominates this use case (UK small food/FMCG, a few pack sizes), a power-law per-unit curve with one steepness dial.

### Relationship to the configurator (hard architectural rule)

Design principle 6 in Part 1: **WooCommerce is the single source of truth; SGS never mirrors commerce data.** This part honours it absolutely:

- The engine is an **AUTHORING-TIME price GENERATOR**, not a runtime display override. It computes pack prices and **writes them into the WooCommerce variation `regular_price`** (via the authoring controller, FR-27-R1/R2). The cart, schema and SSR manifest then read the real WC price exactly as today. There is NO display-time price substitution and NO parallel price store.
- The **value ladder is pure DISPLAY** of the already-live WC prices: per-unit = WC display price divided by pack size (the FR-27-B3 mechanism). This part extends B3 from "per-unit of the selected pack" to "comparative per-unit across all packs".
- Therefore no two-sources-of-truth wound is re-opened. The generated price is committed to WC at authoring time; everything downstream is unchanged.

### Principles

1. **One number in, all prices out.** The owner sets a single base unit price (or smallest-pack price); the engine derives the rest. The only other owner-facing dials are a 3-notch discount strength and the pack sizes offered.
2. **Generate to WooCommerce, never override at render.** (See the rule above.)
3. **Legally clean by construction.** Savings are always framed as the pack's per-unit price vs the CURRENT single-unit price, never a "was/now" reference price, so the CMA 30-day / 1:2-volume rules never apply. Per-unit price is always displayed (also the Price Marking Order requirement).
4. **One model, one dial.** Power-law `per_unit(n) = P x n^(-k)`; `k` is the single steepness parameter, surfaced as Gentle / Standard / Aggressive (k = 0.08 / 0.12 / 0.18). No model-selection UI.
5. **Integer pence internally; charm on the shopper-visible price.** All money maths in integer pence; charm-round once on the **inc-VAT display total** (the number the shopper sees), then back-solve the ex-VAT `regular_price` per the variation's tax class; derive per-unit from the charmed total (never charm-round per-unit independently, which breaks per-unit x n = pack-total). Charm-rounding the ex-VAT value is invisible to the shopper, so it is never the charm basis (FR-28-2/5/12).
6. **Sensible defaults hidden, brand-safe caps enforced.** Margin floor, charm algorithm and the formula are not owner-facing. Hard caps: first multi-pack at least 8% saving (else raise k up to 3x, then admin warning / abort), largest pack at most 40% saving (scepticism ceiling; wins on conflict with the 8% floor), per-unit must strictly DECREASE as pack size grows after rounding, per-unit never at or above the single price after rounding.
7. **Authoring is un-gated.** Every control is a friendly editor/settings field, never raw meta.
8. **Writing live prices is a deliberate, reversible, audited act.** Nothing ever auto-writes to WooCommerce. The only write trigger is an explicit two-step "Apply to my live shop" confirmation; every write is logged, snapshotted, one-click revertible, and skips owner-locked variations (FR-28-5/13/14).

### Functional requirements

All engine PHP declares `strict_types=1`. Money is integer pence end-to-end; floats appear only inside the power-law exponent and are cast back to int immediately. Every string that reaches markup is `sanitize_text_field()` on save and `esc_html()` on output (FR-28-8).

#### Engine

- **FR-28-1 -- Power-law price generator.** `sgs_auto_pack_prices( int $base_pence, array $pack_sizes, float $k = 0.12, int $cost_pence = 0, float $margin_floor = 0.40, bool $inc_vat = true, float $vat_rate = 0.20, bool $charm = true ): array` (`plugins/sgs-blocks/includes/class-pricing-engine.php::sgs_auto_pack_prices`). For each pack `n`, apply the **canonical guardrail order (FR-28-4)** and return per-pack `{pack_price_pence, per_unit_pence, saving_pct, saving_pence_each, saving_display, clamped, locked}`. Pure function (no WP calls), unit-tested against the canonical worked example below.
- **FR-28-2 -- Charm rounding (idempotent, on the shopper-visible price).** `sgs_charm_round( int $pence ): int` using the self-consistent rule: **`< £5 -> nearest of {floor(£)+.49, floor(£)+.99}`; `< £100 -> floor(£)+.99`; `>= £100 -> nearest 50p`.** Idempotent (`charm(charm(x)) == charm(x)`), proven in unit tests. Charm is applied to the **inc-VAT display total** (Principle 5), then the ex-VAT `regular_price` is back-solved per the variation's tax class. A site-wide toggle disables it (B2B/wholesale and premium mode give clean £X.00/£X.50).
- **FR-28-3 -- Steepness dial + Custom %.** Owner picks Gentle/Standard/Aggressive (k = 0.08/0.12/0.18). Raw `k` is never exposed as a number. A fourth **"Custom %"** notch lets the owner state the target saving on the largest pack and back-solves k from it (clamped to k at most 0.18 unless premium overrides downward). Premium mode caps k at 0.10 and disables charm rounding.
- **FR-28-4 -- Guardrails (canonical evaluation order).** Applied per generation in EXACTLY this order: **(1)** power-law raw -> **(2)** cost margin floor (`min = cost_pence x n / (1 - margin_floor)`; if `cost_pence = 0` it is *unknown*, so a configurable absolute min-floor applies, never a collapse to 0) -> **(3)** charm-round on the inc-VAT price (FR-28-2) -> **(4)** per-unit at or above the single price -> **clamp the price down** (not merely zero the label) -> **(5)** 8% minimum saving on the smallest multi-pack -> raise k by 0.02 up to 3x -> **(6)** 40% cap on the largest pack -> reduce k. **On a 5/6 conflict the 40% cap WINS.** If the 8% floor is unachievable at k at most 0.18, the engine **ABORTS the write** with a blocking plain-English error; it never writes a sub-floor price. Post-generation, reject any pack priced at 1p or less. Per-unit must strictly decrease as pack size grows (monotonicity guard, FR-28-7).
- **FR-28-5 -- Commit to WooCommerce.** The generator output is written to each variation's `regular_price` via the authoring controller (FR-27-R1/R2): `set_regular_price()` + `save()` + `wc_delete_product_transients()`. Inputs: detect `wc_prices_include_tax()` for the input basis; write the ex-VAT `regular_price` back-solved from the charmed inc-VAT total per the variation's tax class (per WC base rate; each pack size writes to EVERY matching variation). The write path: (a) is gated behind the two-step apply (FR-28-10), never a `save_post` / auto hook; (b) **skips owner-locked variations** (FR-28-13); (c) **snapshots and logs** before writing (FR-28-14); (d) clears or flags any active `sale_price` at or above the new `regular_price` with a warning (FR-28-11); (e) handles the missing-variation path (creates ticked-but-absent variations via FR-27-R2, or blocks with a clear message, owner-configurable). NEVER a render-time substitution. **Multi-currency is an explicit non-goal that DISABLES the engine.** Files: the REST controller `plugins/sgs-blocks/includes/class-pack-pricing-apply.php` (`/sgs/v1/pack-pricing/apply`, `/revert`, `/release-lock`) with `class-pack-pricing-apply-write.php`, `class-pack-pricing-apply-revert.php`, `class-pack-pricing-write-helpers.php` and `class-pack-pricing-meta.php` beside it.

#### Override cascade + performance

- **FR-28-6 -- Layered config (highest wins): site -> category -> product.** Site defaults are ONE option, `sgs_pack_pricing_settings` (`plugins/sgs-blocks/includes/class-pack-pricing-cascade.php::PACK_PRICING_SITE_OPTION`; keys `pack_sizes`, `k`, `charm_round`, `vat_registered`, `margin_floor`, `cost_pence`), edited at WooCommerce > Settings > Products > "SGS Pack Pricing" (`plugins/sgs-blocks/includes/class-pack-pricing-settings-page.php`). Category override via `product_cat` term meta (`sgs_pack_k`, a notch string) capability-gated to `manage_woocommerce` (NOT `edit_product_terms`) + nonce + audit. Product override via post meta (`_sgs_pack_k`, `_sgs_pack_sizes`, `_sgs_base_price_pence`) + an optional per-pack manual override that clears the auto-calc for that one pack only. `sgs_get_pack_pricing_config( int $product_id ): array` resolves the cascade. **Performance: explicit-trigger-only.** A site/category change does NOT auto-reprice the catalogue; it applies on the next per-product "Generate" (or a rate-limited WP-Cron batch). The engine stores a hash of `(base, k, packs, vat, charm)` per product and skips regeneration if unchanged.

#### Value-ladder display (extends FR-27-B3)

- **FR-28-7 -- Comparative per-unit ladder.** On the configurator card, render per-unit price at every pack size with the saving vs a single item. Anchor: smallest pack first (or the owner-set `_sgs_base_price_pence` single-item reference); the largest (or, if enabled, the decoy-target) row gets a visual delta + the "Best value" `sgs/label` badge (FR-27-B3). Per-unit is derived live from the WC manifest (B3 mechanism): display only, no new price store, SSR-only (lean-seed 24 KB cap held). **Reads the ACTIVE WC price** (matches the cart): when a `sale_price` is live, the ladder computes from the sale price and labels savings as "calculated vs sale price". **Monotonicity guard:** if post-rounding per-unit does not strictly decrease across pack sizes, the badge and saving for the offending row are suppressed (a non-decreasing ladder lies; CPUT exposure). Files: `plugins/sgs-blocks/includes/helpers-value-ladder.php` (`sgs_value_ladder`, `sgs_value_ladder_markup`).
- **FR-28-8 -- Framing modes (output-escaped).** A `framingMode` control (enum: savings | loss-aversion | neutral) on the display. Loss-aversion is the default for sub-£ items ("save Xp each vs buying singly"). Rule of 100: show % under £1/item, lead with pence at £1/item or more. Strings are generated by `sgs_saving_display()`, which returns **plain text only**; every input is `sanitize_text_field()` on save and `esc_html()` on output, so saving strings are never echoed raw (XSS).
- **FR-28-9 -- Per-unit always shown (legal).** Per-unit price is always displayed alongside the pack price (Price Marking Order). FR-27-B3 meets this; this part makes it comparative.
- **FR-28-9a -- Decoy pricing (opt-in per product).** Off by default site-wide (Bean, 2026-06-04). A per-product toggle prices the second-largest pack 3-5% worse per unit to nudge toward the largest. When on, the decoy row is the badge target; when off, the largest pack is. Never enabled site-wide (manipulation / CPUT-perception risk) and must still satisfy the monotonicity guard (FR-28-7) and the genuine-saving rule (FR-28-12).

#### Authoring UI

- **FR-28-10 -- One-number authoring with two-step apply.** Product editor "Smart pricing" panel: base single-item price (the one number, FR-28-16) + Gentle/Standard/Aggressive/Custom% radio + pack-sizes checkboxes (6/12/24/48 + custom) + optional per-pack manual override + decoy toggle (FR-28-9a) + a live **preview table** (generated prices + per-unit + saving + a lock icon per owner-locked variation, FR-28-13). Two-step apply is the ONLY write trigger: **"Calculate preview"** (no WC write; REST `plugins/sgs-blocks/includes/class-pack-pricing-preview.php`) then the explicit **"Apply prices to your live shop"** modal showing current -> new per pack + a Cancel. Friendly, no raw meta. A dismissible legal-disclosure notice is shown (FR-28-16).
- **FR-28-11 -- Site + category settings + sale/coupon interaction.** A WooCommerce settings section (site defaults) + a `product_cat` term field (category override). Both expose only the owner-safe controls (FR-28-6); margin floor, cost and VAT-registered are set once at site level. **Sale/coupon rules:** on write, an active `sale_price` at or above the new `regular_price` is cleared or flagged with a warning; coupons stack BELOW the engine; the 40% ceiling is measured **pre-coupon**.

#### Safety machinery

- **FR-28-13 -- Engine-vs-manual-edit lock.** Per variation: store `_sgs_price_engine_value` (the last value the engine wrote) + a `_sgs_price_owner_locked` flag. Before any write, the path DETECTS a current WC price different from the last engine value, auto-locks that variation and surfaces it. The preview shows a lock icon + "you hand-edited this -- the engine won't touch it" + a one-click release. The post-run summary reports "generated N, skipped M locked". (Resolves KJC-3: the engine writes but never clobbers owner edits.)
- **FR-28-14 -- Audit log + one-click undo.** Each run appends to a `sgs_pack_pricing_runs` log (timestamp + resolved config + per-variation before -> after). Before any write, the prior `regular_price` is snapshotted to `_sgs_pack_price_backup`. A one-click **"Revert last generation"** restores every variation from its backup.
- **FR-28-15 -- Input validation gates.** Base price: integer, at least a hard 10p minimum; reject 0 / negative / float / scientific notation (`Pack_Pricing_Resolver` in `plugins/sgs-blocks/includes/class-pack-pricing-resolver.php` and the `InvalidArgumentException` in `sgs_auto_pack_prices`). Pack sizes: each n at least 2 and at most 500, array length at most 10. `cost_pence = 0` means "unknown", giving a configurable min-floor (never a collapse to 0). All validation runs before FR-28-1 and returns plain-English inline errors (FR-28-17).
- **FR-28-16 -- Base-price semantics (resolves KJC-1).** P = the owner-entered single-item price, stored `_sgs_base_price_pence`, labelled "your reference price for discounts". A toggle lets the owner instead enter the smallest-pack price; the engine back-solves P and stores the **raw (unrounded)** derived value. **If no real single is sold and the owner cannot honour that reference price, `sgs_saving_display()` SUPPRESSES the saving claim**; no comparison is ever invented to an unsellable reference (DMCC/CPUT). A dismissible in-editor legal-disclosure panel states the owner is responsible that the single-item price is a genuine selling price.

#### Compliance

- **FR-28-12 -- UK pricing-law guardrails.** No "was/now" claims generated. Per-unit always shown. VAT: compute on the correct basis (`wc_prices_include_tax()`), charm on the inc-VAT display price, store ex-VAT `regular_price`; a site-wide "VAT registered?" toggle; UK food mixes zero-rated and standard-rated, so charm MUST be on the inc-VAT value (FR-28-2). DMCC/CPUT: every displayed saving must be real (per-unit below single price + monotonicity enforced, FR-28-4/7); suppress the claim where no genuine single price exists (FR-28-16). The Price Marking Order 2004 (2026 amendment) and CMA position are in the compliance appendix.
- **FR-28-17 -- Error states + integration fixture.** Every failure has a plain-English inline message: empty base, base below 10p, fewer than 2 pack sizes, no matching variation, margin-floor-impossible (8% unachievable at k at most 0.18), WC write failure, no tax class resolvable, multi-currency active. Acceptance artefact: a round-trip integration fixture, **generate -> write -> read-back -> cart-charges-it**, across a tax-class boundary AND a live-sale boundary. The magic numbers (k = 0.08/0.12/0.18; 8% / 40% caps; 10p floor) live in this spec.

### Done when

- **P1 value ladder:** comparative per-unit + loss-framed saving across packs on the card; anchored smallest-first (or the owner-set single-item reference); "Best value" badge on the target pack; reads the ACTIVE WC price (sale-aware label); the monotonicity guard suppresses any non-decreasing row; UK-legal display (no "was" price, per-unit always shown, saving strings `esc_html`-escaped, Rule-of-100 floored via exact `intdiv`, claim suppressed where no genuine single price exists); WCAG 4.5:1 on the saving text.
- **P2 engine pure functions:** the canonical worked example reproduces exactly; `sgs_auto_pack_prices` and `sgs_charm_round` unit-tested; `charm()` proven idempotent; guardrail order (FR-28-4) exercised; input gates (FR-28-15) reject 0/negative/float/over-cap; `declare(strict_types=1)` (`plugins/sgs-blocks/tests/php/PricingEngineTest.php`, `plugins/sgs-blocks/tests/php/run-pricing-engine-standalone.php`).
- **P3 preview-only authoring:** the owner sets ONE base price and a strength; the preview table shows all pack prices, per-unit and saving live and **writes NOTHING to WC**; the cascade site -> category -> product is proven, highest wins, the per-pack manual override holds, category meta is capability-gated to `manage_woocommerce`; guardrails are proven in preview (under 8% raises k up to 3x then aborts; over 40% clamps, 40% wins on conflict; per-unit at or above single clamps the price); authoring is fully UI-driven (zero raw meta) with the legal-disclosure panel shown.
- **P4 commit to WC:** two-step apply is the only write trigger; the cart charges the generated WC price (single source of truth verified); inc-VAT charm with the ex-VAT `regular_price` back-solved per tax class; owner-locked variations skipped; the per-run audit log and snapshot are written; "Revert last generation" restores prior prices (double-revert safe); the round-trip fixture passes across a tax-class boundary and a live-sale boundary.

### Key judgement calls (resolved)

- **KJC-1 -- base = single-item vs smallest-pack:** FR-28-16.
- **KJC-2 -- decoy pack:** FR-28-9a (Bean, 2026-06-04): opt-in per product, off by default site-wide, never site-wide-on.
- **KJC-3 -- engine owns vs seeds prices:** FR-28-13.
- **KJC-4 -- relationship to the authoring controller:** the pure engine, settings and preview UI stand alone; the WC-write integration (FR-28-5) rides on the FR-27-R1/R2 authoring controller.

### CRO backlog (not in this part's build scope)

Theme/block candidates to schedule separately: social-proof line on the card; configurator above-the-fold + sticky mobile CTA; "your box" live IKEA-effect summary; pack-size "how many do I need?" calculator. Marketing-ops items (abandoned-cart and post-purchase email sequences, exit-intent/post-ATC popups, referral scheme, paid-ads pixels, occasion programmatic-SEO pages) belong in client onboarding and plugins, not the SGS theme.

### Compliance appendix (sources)

Price Marking Order 2004 (amended 2025, effective 2026-04-06; unit-price display) · CMA Groceries Unit Pricing analysis (Jan 2024) · DMCC Act 2024 (CMA fining powers to 10% global turnover, 2025) · ASA/CAP promotional-savings guidance (2026) · Consumer Contracts Regs 2013 (inc-VAT B2C). Pricing science: power-law quantity discount (Monahan 1984; Chen & Krass 2001); decoy/asymmetric-dominance (Huber/Payne/Puto 1982; Ariely/Loewenstein/Prelec 2003); left-digit/charm (Thomas & Morwitz 2005; Manning & Sprott 2009; context-dependence PMC9387778 2022); Rule of 100 (Berger, Contagious 2013); loss aversion (Kahneman & Tversky 1979); mental accounting (Thaler 1985); 25-35% sweet spot (ResearchGate 2026).

### Canonical worked example -- P = £1.00/item, packs [6,12,24,48], k = 0.12 (Standard)

`raw_pack = base_pence x n^(1-k)` -> charm (idempotent rule) -> per-unit derived from the charmed total:

| Pack | raw n^0.88 | raw £ | charmed | per-unit | saving vs £1 |
|---|---|---|---|---|---|
| 6 | 4.83 | £4.83 | **£4.99** | 83p | 17% |
| 12 | 8.89 | £8.89 | **£8.99** | 75p | 25% |
| 24 | 16.36 | £16.36 | **£16.99** | 71p | 29% |
| 48 | 30.16 | £30.16 | **£30.99** | 65p | 35% |

The 48-pack is £30.99 / 35% (what `< £100 -> floor(£)+.99` yields); it is idempotent on re-run and keeps the top pack under the 40% scepticism ceiling. This table is the canonical P2 unit-test fixture.

---

## Part 3 - WooCommerce page types

The WooCommerce page-type chassis: single-product, shop archive, cart, checkout, the customer account area, schema per page type and the go-live gate. FR IDs in this part are `FR-30-n`; they are stable and cited from the theme, the plugin and `.claude/specs/go-live-checklist.md`. Status: built; the framework is a sellable shop. FR-30-11 gates every phase close.

### Problem statement

A product-page draft is a WooCommerce page TYPE, and every shop client needs the same chassis: `add_theme_support('woocommerce')`, single-product and archive templates, product search, a searchable filter, and schema emitters aligned to Google's current merchant guidance. The product-page clone targets this chassis.

### Goals

1. Every WC page type (PDP / shop / cart / checkout) renders Site-Editor-editable block templates on any SGS install, styled via Site Editor global styles (`wp_global_styles`) + per-client `theme-snapshot.json` (Spec 32 mechanism), with no client values hard-coded in template markup.
2. Commerce machinery comes from WooCommerce core blocks AND the shipped machinery in Parts 1 and 2 (see Reuse inventory); SGS builds ONLY the genuinely-new differentiated UX.
3. Schema output matches Google's 2026 merchant guidance exactly.
4. UK-legal by construction (DMCC reviews, CMA pricing, PECR consent on email capture).
5. Every client-changeable value is a block-editor control: "if a setting requires touching code, it is not done."

### Non-goals / out of scope

- **Block-based My Account**: no core block alternative exists; the page stays WooCommerce's classic account output, rendered inside the `sgs/account` block (FR-30-14), which owns its layout and every editor control.
- **Bespoke cart drawer**: the core Mini-Cart drawer is used instead.
- **Multi-image-per-variation galleries** via a plugin route: core swaps one image per variation (the SGS per-variation gallery is FR-27-A4).
- **`FAQPage` schema for rich results**: Google does not show FAQ rich results (FR-27-F2's AI-citation framing is unaffected; this part adds none).
- **Rebuilding cart/checkout/gallery/collection blocks OR the shipped cart-write path**: core blocks + shipped machinery are the chassis, full stop.
- **Food-domain vocabulary in the framework**: `allergen-*`, `topping-dairy`, `trial-note`, `ingredients-*` map to generic slots (`notice-banner`/`text`/`feature-grid`); they NEVER enter `slots.aliases`/`modifier_suffixes`. (The PDP template MUST still provide a generic content slot where a food client places statutory allergen information; see FR-30-2.)
- **Abandoned-cart recovery emails**: out of scope ("later phase / extension territory").
- **Subscriptions / subscribe-and-save / one-click reorder, build-a-box bundles, A/B price-display experiments**: parked as roadmap, not built (subscriptions are the food-DTC deal-winner; see Open questions).

### Hard constraints

- WCAG 2.2 AA; 44px touch targets; mobile-first 375/768/1440.
- All REST/Store-API writes: nonces, capability checks, sanitisation. **No SGS code POSTs directly to `/wc/store/v1/*` write endpoints**: all cart writes go through the shipped `/sgs/v1/cart/*` proxy (`plugins/sgs-blocks/includes/class-cart-proxy.php`), which carries the availability/IDOR/legal guards (a guard on one path is not a guard).
- Performance budget under 100 KB CSS and under 50 KB JS executed per page, measured per page as executed scripts, not prefetch.
- No jQuery; `viewScriptModule` ES modules for interactive blocks.
- Block-quality standard (one control per setting, zero orphans). Any `style.css` change bumps the block's `block.json` version (CDN `?ver` cache).
- All WC-dependent PHP classes lazy-load behind `class_exists('WooCommerce')` + the `woocommerce_loaded` hook: a file-scope `extends` against a WC class fatals the whole site.
- New blocks built under this part carry `"specRef": "30"` in their `block.json` `supports.sgs`, and every new or modified block FR closes only after `/sgs-update` registers it (confirmed via `sgs-db.py` showing the block in `block_attributes` + `block_capabilities`).

### Reuse inventory (shipped machinery: REUSE, never rebuild)

| Asset | Where | Usage here |
|---|---|---|
| Hardened cart-write proxy (`POST /sgs/v1/cart/add-item`, 409 availability re-sync, demand-capture for coming-soon) | `plugins/sgs-blocks/includes/class-cart-proxy.php` + `plugins/sgs-blocks/src/blocks/product-card/view.js` | THE cart write for the PDP configurator (FR-30-7). Direct `/wc/store/v1` writes are forbidden. |
| Variation resolver + SEC-1 lean seeded manifest (variation_id -> attribute map, size-capped) | `plugins/sgs-blocks/src/blocks/product-card/` render and view | THE variation read path. Respect the 24 KB lean-subset cap: manifest growth can trip the capped client seed. |
| `sgs/option-picker` (pills, variants, group labels) + its `sgs:option-selected` CustomEvent | `plugins/sgs-blocks/src/blocks/option-picker/` | The selection UI (FR-30-7). Colon-named events do NOT bind via `data-wp-on--` (silent failure); cross-block wiring uses the captured-context `data-wp-init` bridge. |
| Pricing engine + legal price floor + `'1' === (string)$v` strict guards | Part 2 (`Pack_Pricing_Resolver` etc.) | Reference for FR-30-8's guards. |
| Schema emitters + page-level ItemList walker + ProductGroup gating | `plugins/sgs-blocks/includes/class-product-*.php`, `plugins/sgs-blocks/includes/review-schema.php` | FR-30-9 AUDITS/ALIGNS these; it does not rewrite. |

### Architecture (the standard-vs-custom split)

| Layer | WooCommerce core (compose + style) | SGS shipped (wire) | SGS new (build) |
|---|---|---|---|
| PDP | Single Product template chassis; Product Gallery (variation-aware at WC 9.9 or later, **Beta**; see FR-30-0); Title/Rating/Price/Breadcrumbs; Add-to-Cart+Options as the simple-product/no-JS fallback; Related/Up-sells | option-picker + cart proxy + variation manifest (FR-30-7) | price-display coupling (FR-30-8); template parts (FR-30-2) |
| Shop | Product Collection; Product Filters (price/attribute/rating/stock); Active Filters (the chips, styled not rebuilt) | - | product search (FR-30-5); searchable attribute filter (FR-30-6); archive UX shell (FR-30-3) |
| Cart/Checkout | Cart + Checkout blocks (Store API); Mini-Cart with core slide-out drawer (Blocks 10.1 or later) | - | styling only (FR-30-4) |
| Account | Classic account output (`WC_Shortcode_My_Account`) | two-tier wishlist | `sgs/account` wrapper block, Saved items endpoint and page, saved-item alerts (FR-30-14/15) |

**Key research facts the split rests on:** live product search and a type-to-find attribute filter are NOT core (paid extension only), so FR-30-5/6 build them; the cart drawer IS core, so there is no SGS drawer; WC injects default block templates automatically, and theme files only override composition (verified to win on the canary's WC version per FR-30-0).

### Functional requirements

#### FR-30-0 -- WooCommerce dependency contract -- built

The build rests on two **Beta** core blocks (Product Gallery; Add-to-Cart+Options variation selectors) whose markup/attribute contracts can change between WC minors.
(a) **Version floor**: the tested WooCommerce floor is 9.9 or later (the variation-aware gallery). No runtime version self-check or dashboard notice exists; the WC version is verified manually (`wp plugin get woocommerce --field=version`) before a build touches shop/PDP templates.
(c) **Gateway pre-flight (entry gate)**: verify the client's payment gateway plugins (Stripe/PayPal/express) declare Cart/Checkout BLOCK support at their installed versions BEFORE composing block checkout. Fallback branch if not: classic-checkout template + documented consequences (noindex story unchanged; Mini-Cart drawer unaffected). The go-live checklist records the verified gateway matrix for each client.
(d) **Fallback plans written down**: Beta gallery regression -> core classic gallery via the `wc-product-gallery-*` supports (declared in FR-30-1); rollback escape hatch = remove the theme template overrides so WC's injected defaults render.
**Done when:** the gateway matrix for the first client is verified with a recorded result; the template override is confirmed to win over WC's injected default on the canary's WC version.

#### FR-30-1 -- Theme support + template scaffolding -- built

Declare `add_theme_support('woocommerce')` + `wc-product-gallery-zoom` / `-lightbox` / `-slider` in `theme/sgs-theme/functions.php`, landing in the SAME commit as the first template (declaring alone half-breaks WC fallback rendering). Ship Site-Editor-editable overrides `theme/sgs-theme/templates/single-product.html` and `theme/sgs-theme/templates/archive-product.html`, **decomposed into template parts** (`sgs-pdp-buybox`, `sgs-pdp-content`, `sgs-archive-toolbar`) so a WC upstream change reconciles in one part, not a whole-file diff. Cart/Checkout use core templates unless composition demands an override.
**Done when:** the WC admin "theme does not declare support" notice is gone (verified via Playwright using the `sandybrown.env` credentials, not a manual look) AND both overridden templates render from the theme on the canary (template inspector shows theme source), each composed of the named template parts.

#### FR-30-2 -- PDP composition (single-product.html) -- built

Compose: Product Gallery (thumbnails + zoom) -> Title/Rating/Price (+ FR-30-8 price display) -> **the shipped SGS option-picker wired per FR-30-7** (no interim WC-native selector; core Add-to-Cart+Options remains the rendering path for SIMPLE products and the no-JS fallback) -> trust strip (`sgs/trust-bar`, typed mode) -> content sections (existing `sgs/*` blocks in generic slots; the composition MUST include a generic content slot suitable for statutory allergen information for food clients: content stays client-side, the SLOT is structural) -> reviews (FR-30-10) -> related products. Variant rules: never render a selector when only one variant exists; unavailable options show disabled ("Coming soon"/"Sold out"; labels operator-editable per FR-30-7), never hidden.
**Done when:** a real variable product on the canary renders the full composition; selecting pills updates price + gallery image; add-to-cart puts the CORRECT `variation_id` in the cart (cart response inspected via the proxy); a SIMPLE product renders the core Add-to-Cart path; axe reports 0 violations.

#### FR-30-3 -- Shop archive UX shell -- built

Product Collection + Product Filters composed into:
(a) **toggle filters**: mobile = full-screen/bottom-sheet drawer behind a sticky "Filter" button; desktop = open sidebar permitted; never an open filter wall on first paint at 375px;
(b) **applied-filter chips** = the core **Active Filters block, styled** (NOT a custom chip component; a JS enhancement layer is permitted only if core cannot meet the scrolling-row + removable requirements, with the decision documented in the commit). Chips show selected VALUES, removable, horizontally scrolling on mobile, and reflect URL query state across pagination;
(c) **filter parity**: a filter group for every attribute the product card displays at build time (post-launch attribute additions surface automatically via WC's attribute taxonomy; if any case requires code, FR-30-13's checklist says so explicitly);
(d) **top SEO text**: a RichText block attribute (1-3 sentences) above the grid, fully operator-editable in the block editor;
(e) **bottom SEO text**: a RichText attribute below the grid with the read-more expand: full text server-rendered in the HTML; collapsed via a wrapper with `height:0; overflow:hidden; visibility:hidden` + `aria-hidden="true"` (NOT `display:none` on the text, NOT JS-injected content); the toggle is a `<button>` with `aria-expanded` + `aria-controls`, accessible name flips Read more/less, at least 44px; the collapsed line count N is an inspector integer control. Collapsed text remains ASA-subject: factual claims only;
(f) **settings** (Customizer > Shop Filters, Eye Care shop parity): the result count's wording ("%d frames", with a singular form), the sort menu's options, order and labels ("option|Label" lines; `theme/sgs-theme/inc/shop-toolbar-settings.php`), product row gap, filter column width and the gap beside it, and where the one-switch filter toggle sits and whether it reads an attribute or a product tag (`?tags=`). A filter group's heading block takes classes that set its look: `sgs-filter-open` (starts expanded; with none marked the first group opens), `sgs-filter-count` (option count beside the heading), `sgs-filter-segmented` (one choice at a time, "All" first), `sgs-filter-swatches` (round swatches from each term's `_sgs_swatch_color`, via a generated stylesheet). A search box over a group's options is FR-30-6's `sgs/filter-search` block placed inside that group's filter block. The "plain" panel style draws touching 52px heading rows ruled below their content, on the page surface with the palette's border colour (no brand tint), long option lists scrolling inside 280px, option counts as a right-aligned number, and a drawer with a ruled header and the site's primary and outline button presets on its footer. Further settings (`theme/sgs-theme/inc/shop-filter-look-settings.php`, `theme/sgs-theme/inc/shop-filters-layout-settings.php`, `theme/sgs-theme/inc/shop-filters-settings.php`): a switch hides the "Filter" heading above the desktop column (screen readers keep it), the option text size of chips and segments, how far a colour swatch grows on hover, the gap between products on phones, capitals on the drawer's buttons, the browser's own sort-menu arrow, and the drawer's Clear label. Controls look (`theme/sgs-theme/inc/shop-controls-look-settings.php`, `theme/sgs-theme/inc/shop-chosen-filters.php`): the sort menu's text size; the Filter button outlined in capitals and placed in the toolbar before the sort menu, counting the chosen filters ("FILTER (1)"); the size, weight and row space of checkbox-list options; chosen filters as filled pills, named with or without their group ("Shape: Pilot" or "Pilot", rewriting both WooCommerce's server list and each filter block's label template), and shown either in the panel or in a row under the title at every width (`theme/sgs-theme/assets/js/sgs-shop-filters-chosen.js`: each pill presses WooCommerce's own remove button, since its chips may only sit inside the filter block); a thin price slider (6px round-ended track, 14px handles, prices as plain text via the slider's `showInputFields: false`). Filter groups are rebuilt after every filter choice (`theme/sgs-theme/assets/js/sgs-shop-filters-accordion.js`: the filter block is an Interactivity router region that re-renders from server HTML); segmented groups press WooCommerce's own chips, so choices apply in place. The drawer's live count sends the Store API its own parameters (`attributes[i]`, `brand`, `tag`, `category`, prices in the smallest currency unit), since it ignores `filter_*`. The theme's own `archive-product.html` carries Price, Category and Brand only; a client's attribute groups live in its site copy of the template.
**Done when:** at 375px the archive paints with filters closed + a sticky Filter button opening a drawer; chips render/remove and persist across a paginate-away-and-back; `curl` of the archive HTML contains the FULL bottom text pre-expand; the toggle passes button/aria checks in axe + a manual keyboard run; top text, bottom text and N are all editable in the block editor with zero code.

#### FR-30-4 -- Cart / checkout / Mini-Cart styling -- built

Brand-style core Cart, Checkout and the Mini-Cart slide-out drawer (header placement; drawer width exposed as a Site-Editor global style / CSS custom property, not hard-coded). Gateway compatibility is FR-30-0(c)'s gate, not discovered here. Core controls the drawer markup, so styling targets the most stable selectors available and is re-verified per WC band.
**Done when:** add-to-cart from the PDP opens/updates the styled Mini-Cart drawer; cart -> checkout completes a test order on the canary via the FR-30-0-verified gateway; all three surfaces render with zero horizontal overflow at 375/768/1440 (screenshot set attached) + axe 0 violations per surface. (Brand-styling judgement is Bean's R-22-13 gate, separate from this structural Done-when.)

#### FR-30-5 -- SGS product search block -- built

A live/keyword product-search block (`plugins/sgs-blocks/src/blocks/product-search/`). **This is the part's largest net-new build.**
- **Behaviour:** debounce 300ms client-side; suggestions render product title + thumbnail + permalink ONLY. No-JS fallback = a standard `<form method="get">` submitting `?s={query}&post_type=product` (product-scoped, not site-wide). Empty-result state renders visible "No products found" text (+ ARIA live announcement), never a blank dropdown.
- **Server hardening:** the REST handler enforces server-side rate limiting (at most 30 req/IP/min via transient/object-cache counter; client debounce is UX only, not protection); rejects queries under 2 chars; sanitises the query (`sanitize_text_field` + `wc_clean`) before any query arg; constrains results to `post_status='publish'` AND `catalog_visibility IN ('visible','search')`, never draft/private/password-protected/hidden (this codebase shipped exactly this leak class before, in the merchant feed, fixed with the visibility filter); response schema is fixed at the endpoint (ID, title, permalink, thumbnail; NO price fields, NO meta, NO variation data); responses via `WP_REST_Response`; suggestion titles enter the DOM via `textContent`, never `innerHTML` (XSS via product titles).
- **A11y:** the full combobox pattern: `<form role="search">` landmark -> input `role="combobox"` + `aria-autocomplete="list"` + `aria-controls` -> suggestions `role="listbox"`/`role="option"`; keyboard navigable; 44px targets. (Not a naked `role="searchbox"`.)
- **Quality floor:** prefix + in-title matching minimum, with relevance ordering (exact-prefix before substring); suggestion response under 150ms server-side on a 500-product fixture; executed-JS weight measured and recorded against the budget.
- **Maintenance gate:** a scripted regression check, wired to something that runs, re-runs the search fixture on every WC band bump.
**Done when:** typing 2 or more chars surfaces matching products on the canary ordered prefix-first; a draft product's title NEVER appears in suggestions (live-probed); curl-hammering the endpoint past the rate limit returns 429; Enter with JS disabled lands on a product-scoped results URL; a product titled `<img src=x onerror=alert(1)>` renders inertly in the dropdown; axe 0 violations; registered via `/sgs-update`.

#### FR-30-6 -- SGS searchable attribute filter -- built

A type-to-find input INSIDE a filter group (`plugins/sgs-blocks/src/blocks/filter-search/`), auto-enabled when the attribute has **more than 15 options (16 or more)**: a single threshold (Baymard-derived), an inspector control (`threshold`) per instance; composing with core Product Filters (same query params; filtering stays core). It sits inside a core attribute filter (`attributeId`) or a core taxonomy filter such as brand (`taxonomy`; `?brands=` stays WooCommerce's), chips or checkbox list; a checkbox list's "Show N more" expands on the first keystroke (`plugins/sgs-blocks/src/blocks/filter-search/view.js`; live-proven on eye-care-test: "ray" narrows 14 brands to Ray-Ban, ticking it loads `?brands=ray-ban` with its 3 frames). Matches options client-side; announces the narrowed count via an ARIA live region; narrowing to 0 shows "No matching options". **Term population MUST be visibility-scoped** (terms counted against published/visible products only: an attribute term attached only to a draft product must not appear; no unscoped `get_terms()`).
**Done when:** an attribute fixture with exactly 16 terms renders the input and one with exactly 15 renders none (boundary-tested); typing narrows visibly + announces the count; a term existing only on a draft product is absent (live-probed); applying a narrowed option filters the collection identically to core.

#### FR-30-7 -- option-picker -> cart wiring -- built (`sgs/buybox` wrapper block)

**The cart write, variation resolution, 409 availability re-sync and coming-soon demand-capture are shipped** (Reuse inventory). This FR builds ONLY the genuinely-new piece: **the cross-block bridge** that wires the standalone `sgs/option-picker` (in the PDP template context) to the shipped configurator cart path (`plugins/sgs-blocks/src/blocks/buybox/`).
- **The bridge:** `sgs/option-picker` dispatches `sgs:option-selected` (a colon-named CustomEvent). WP Interactivity's `data-wp-on--` **silently fails to bind colon-named events**, so the bridge MUST use the captured-context `data-wp-init` + plain `addEventListener` pattern, and the Done-when live-asserts the event actually drives the cart write across the block boundary.
- **Validation:** before emitting the add-item call, the client layer verifies the resolved `variation_id` exists in the SEC-1 seeded manifest for THE CURRENT product AND carries `is_purchasable` + `is_in_stock` true; a valid-combination-but-null-variation lookup (deleted variation) renders the FR's error state, never a silent wrong-item add. The server proxy already rejects cross-product IDs; the Done-when proves it (a foreign variation_id POST returns 4xx).
- **Failure path:** on proxy failure (400/409/503) the UI renders a dismissible inline human-readable error (ARIA live), the button re-enables, cart state unchanged. The shipped 409 re-sync handles the paint-vs-stock race.
- **Differentiator coupling (this, not the pills, is the moat):** selection updates the live value-ladder/per-unit price display (FR-30-8) per combination, which core's Add-to-Cart+Options cannot do. %-off badges derive from the live WooCommerce sale price (FR-30-8); no badge appears without a live sale.
- **Operator controls:** unavailable-option label text ("Coming soon"/"Sold out"/custom), notify-me CTA label, per-unit denomination: all inspector controls (framework rule).
- **Notify-me capture (PII):** `sanitize_email()` + `is_email()` before storage; store ONLY email + product_id + timestamp; nonce required; rate-limited (at most 3/IP/hour); un-pre-ticked PECR consent checkbox + privacy-policy link; data stays in WP (`plugins/sgs-blocks/includes/class-stock-notify.php`). If any of this cannot ship, notify-me is explicitly DEFERRED in the commit, not shipped half-guarded.
**Done when:** on a multi-axis variable product, 3 or more distinct pill combinations (including one multi-axis) each add the EXACT matching variation via the `/sgs/v1` proxy (cart inspected); a foreign variation_id POST returns 4xx; a simulated 503 renders the dismissible error + button re-enables; selecting a tier updates the per-unit/value-ladder line live; pills satisfy radiogroup semantics (arrow keys, single tab stop, `aria-checked`); all three label controls editable with zero code; grep shows zero direct `/wc/store/v1/cart` writes.

#### FR-30-8 -- Price display (per-unit + value-ladder) -- built (value ladder, per-unit price, notify-me)

Per-unit display ("£X per cookie/100g") is **table stakes** (UK unit-pricing aligned; free plugins do it); the differentiator is its LIVE coupling to the configurator's selected tier (FR-30-7). **Home:** a sibling output of the configurator/option-picker rendering, NOT a `product-card` attribute, preserving the price-never-overridable invariant. **Computation is server-side** (`render.php`/REST), never client-side arithmetic. **Percent off is derived from the active WooCommerce sale price** (FR-27-B3 `pctOff`, computed from the WC regular and sale price and seeded as a literal per variation). There is no operator reference price, no strikethrough and no "was" price unless a WC sale is live; this keeps the CMA/ASA position in Part 2 Principle 3 (phantom "was" prices and fake urgency are enforcement targets; no countdown timers). **Compliance rule:** no strikethrough or %-off badge renders unless a genuine reference exists (a live WooCommerce sale); it is never derived from `regular_price` alone. Displayed prices follow WC's tax-display setting so headline and per-unit lines always agree (UK inc-VAT default; B2B ex-VAT display is an open question). The per-unit denomination string is an inspector control.
**Done when:** the PDP shows headline + per-unit derived from real product data, both consistent with the WC tax-display setting; with no live sale, no strikethrough/badge renders (grep confirms zero client-side %-off arithmetic + live check); with a live sale, the badge shows the correct %; the denomination string is editable with zero code.

#### FR-30-9 -- Schema completeness per page type -- built

Audit + align the SHIPPED emitters (Reuse inventory); do not rewrite:
- **PDP:** one `Product` node + nested `Offer` (`price`, `priceCurrency`, `availability`, `priceValidUntil` when a sale end-date exists, `url`) + `brand` + `sku`/`gtin`/`mpn` + `offers.shippingDetails` + `offers.hasMerchantReturnPolicy` **including `returnPolicyCountry` (required; sourced from the WC store base-country setting unless overridden)** + `BreadcrumbList`. Variants via the shipped `ProductGroup` gating. No `positiveNotes`/`negativeNotes` (merchant pages ineligible).
- **Shop:** `BreadcrumbList` + URL-only `ItemList` (the page-level walker); NO per-item Product markup.
- **Cart/checkout/account:** no schema + noindex implemented via `is_cart() || is_checkout() || is_account_page() || is_wc_endpoint_url()` (catching ALL dynamic account endpoints), emitted as `noindex,nofollow`.
- **Sitewide:** `Organization` (logo, sameAs, contactPoint, address, org-level `hasMerchantReturnPolicy` + `hasShippingService` as the canonical base) + `WebSite` (name/url/alternateName, NO `SearchAction`).
- **Remove:** rich-result-purposed `FAQPage` + any `SearchAction` (FR-27-F2's AI-citation FAQ blocks keep their non-Google framing).
- **Guards:** emitters gate on `get_post_status()==='publish'` AND `$product->is_visible()` (a draft product must never leak into public JSON-LD); schema output is never cached across auth contexts. `aggregateRating`/`review` nodes emit IF AND ONLY IF FR-30-10's live review source has data; if FR-30-10's source has none, the emitter omits review nodes, never stubs them. Visibility rule: only on-page-visible content is marked up, EXCEPT linked-entity nodes (`shippingDetails`, `hasMerchantReturnPolicy`, `Organization`) which may reference policy pages, per Google's own merchant-listing guidance.
**Done when:** (1) a local JSON-LD validator reports zero errors against the shapes above (environment-independent gate); (2) Google Rich Results Test passes the canary PDP post-deploy (verification, not the primary gate); (3) a scheduled/draft product URL fetched as a guest emits ZERO JSON-LD; (4) curls of `/cart/`, `/checkout/`, `/my-account/orders/`, `/my-account/edit-address/`, `/my-account/view-order/{id}/`, `/checkout/order-received/{id}/` each show noindex; (5) grep: zero `SearchAction`, zero rich-result `FAQPage`; (6) `returnPolicyCountry` present in PDP + org output.

#### FR-30-10 -- Reviews (DMCC-compliant) -- built (empty-state toggle + DMCC guardrails; live Trustpilot sync deferred until the first client with reviews)

PDP reviews come from Trustpilot (`sgs/trustpilot-reviews` synced) or a verified-buyer source. Static/baked review content is BANNED everywhere (UK DMCC Act: fake or undisclosed-incentivised reviews are illegal; the displaying trader is liable; up to £300k or 10% turnover). A draft's review section is built as the live review block (`sgs/trustpilot-reviews`), never static testimonial content. **Empty/failed state (a new shop has ZERO reviews on day one):** when the source is empty, stale or down, the reviews section renders a graceful state (an inspector toggle chooses hidden vs a "Reviews coming soon" placeholder), never a broken layout gap; schema emits nothing (FR-30-9 gate).
**Done when:** the canary PDP renders only synced/verified reviews; with the sync disabled/empty the PDP renders without a layout gap and the toggle switches the empty behaviour with zero code; grep of templates and built trees finds zero hardcoded review text; schema `review`/`aggregateRating` emits only when live data exists.

#### FR-30-11 -- Responsive + budget verification gate -- built (gates every phase close; R-22-13 3-breakpoint sign-off)

Every page type (PDP, shop, cart, checkout) verified at 375/768/1440 via a **named, committed Playwright script** (`scripts/wc-pages-responsive-audit.js`) run at each phase close: touch targets at least 44px, no horizontal scroll, drawer/filters/gallery usable at every width, PLUS an executed-JS weight measurement per page against the under-50KB budget.
**Done when:** each phase-close commit links the script run's screenshot artefacts (3 widths x affected pages) + the executed-JS figures + axe 0 violations per page. A phase does not close without them.

#### FR-30-12 -- Product-page clone target -- built

A cloned product page targets the WC **single-product template on a real `product` post** (`is_product()`), never a WP Page, built by Spec 47's computed route from the FR-30-2 composition (core WC blocks plus the shipped SGS blocks). **Gate:** product-page cloning unblocks when **FR-30-0/1/2/7** ship (the PDP chassis + wiring). FR-30-5/6 (shop search/filter) are NOT dependencies of a single-product clone and do not gate it. **AI-path proof:** the clone is route-produced from the draft with no hand-composed template; a hand-composed page must not masquerade as pipeline output.
**Done when:** the first product-page clone deploys to a product post, the live URL renders via the single-product template (template source verified) and the tree is route-produced with no hand-composed template.

#### FR-30-13 -- Go-live checklist -- built (`.claude/specs/go-live-checklist.md`; Turnstile keys are the only operator action required before first real-money launch)

A documented, repeatable pre-launch gate run before ANY client shop takes real money: (a) payment gateway in LIVE mode verified (test transaction or gateway dashboard confirmation); (b) return-policy fields populated (the FR-30-9 local validator passes: no empty `hasMerchantReturnPolicy`); (c) review source connected with at least 1 genuine review synced OR the empty-state toggle deliberately set; (d) per-unit denomination strings set (no placeholder text); (e) product data completeness sweep: published products missing `sku`/`gtin` listed (Google silently downgrades merchant listings); (f) statutory content present for the vertical (food: allergen information placed in the FR-30-2 content slot); (g) FR-30-11's script run green on the live site; (h) cookie-consent state verified if any capture/analytics is active (PECR).
**Done when:** the checklist exists as a versioned doc in the repo, each item has a named probe or manual step, and the first client launch records a completed pass.

#### FR-30-14 -- Customer account area -- built

Designed as pages, researched (Baymard, CMA209, the WooCommerce account templates and 11.2's core lists) and signed off by Bean on 2026-09-26: `.claude/reports/2026-09-26-fr30-14-account-area-design.md` (mockup linked there).
(a) **My Account**: the `sgs/account` block renders WooCommerce's classic account output (`WC_Shortcode_My_Account::output()`) inside a scoped wrapper. Side menu at the desktop tier, a scrolling row of tabs below it (per-tier `navLayout`), an icon per item, hideable items; a dashboard (`plugins/sgs-blocks/includes/account/templates/dashboard.php`, swapped in only inside the block) that leads with the latest order (status chip and a four-step progress line) then quick cards; log-in and register side by side or stacked, an optional Track an order card and guest line. Every value is an editor control, including menu, active item, content link, card, chip and track colours, card border, and menu / heading / card-title typography.
(b) **Saved items**: a `saved-items` account endpoint (self-healing rewrite) and a Saved items page (WooCommerce setting `woocommerce_saved_items_page_id`, beside Cart and Checkout); `sgs/wishlist-panel` gains `grid` / `list` / `strip` layouts, sort, date saved, the price-drop line, a guest sign-in prompt and every label as an attribute. The header heart defaults to the Saved items page.
(c) **Under the basket**: `theme/sgs-theme/templates/cart.html` uses the strip layout (compact cards, up to 4, then View all), full width below the basket and totals.
New installs get both pages through `woocommerce_create_pages`, each inside an `sgs/container`; an existing page converts with the `core/shortcode` -> `sgs/account` transform.
**Verified by:** `scripts/wc-pages-responsive-audit.js` (guest and a customer account) at 375/768/1440 (zero overflow, axe 0 outside the header on every account and saved-items surface); `plugins/sgs-blocks/tests/php/run-wishlist-standalone.php`, `plugins/sgs-blocks/tests/php/run-account-standalone.php`; `plugins/sgs-blocks/scripts/tests/test-wishlist-panel.mjs`; the budget statement lives in Hard constraints (WooCommerce core's jQuery and selectWoo are not added by the block).

#### FR-30-15 -- Saved-item alerts and share by link -- built

(a) **Price drops**: each saved item records `savedPrice` (minor units, the Store API basis) when saved (account user meta; a parallel browser key for guests; a merge records server prices only). The row shows "Price drop: now {now} ({saved} when you saved it)", never "was" and never a percentage (CMA209: it is the shopper's own history, not a trader reference price; FR-30-8 is unchanged). (b) **Alerts**: two separate unticked opt-ins (price drops; back in stock) with the privacy link, per shopper with a consent timestamp. A 12-hourly Action Scheduler job (`Wishlist_Alerts_Scan`, `plugins/sgs-blocks/includes/wishlist/class-wishlist-alerts-scan.php`) sends at most one saved-items alert email per shopper per run, only while the site switch AND the opt-in are on, and saves new baselines only after a successful send (a price only alerts again below the lowest price already alerted). The Notify me list (`plugins/sgs-blocks/includes/class-stock-notify.php`) is sent: a product or variation moving to in stock sends one back-in-stock email per subscriber and keeps only the subscribers whose send failed. Both are WooCommerce emails (`sgs_saved_items_alert`, `sgs_back_in_stock`, `plugins/sgs-blocks/includes/wishlist/emails/`, templates in `templates/emails/`) listed in WooCommerce > Settings > Emails with on/off, subject, heading and HTML/plain; one switched off counts as handled, so nothing queues forever. They go through `wp_mail()` over the site's SMTP (`.claude/dev-setup.md` section "Site email"). `Sgs_Webhook::send` still fires the `sgs_wishlist_alert` / `sgs_back_in_stock` events to `sgs_n8n_webhook_url` when a site sets one, for automations only. (c) **Share by link**: a revocable 32-hex token (`?sgs-list=` on the Saved items page), read-only view, noindexed, served by a rate-limited public route that returns only published, visible product ids and no personal data. **Client switches**: price alerts, stock alerts and sharing are the site setting `sgs_wishlist_features`, edited from the Saved items panel's inspector through the site entity.
**Verified by:** `plugins/sgs-blocks/tests/php/run-wishlist-standalone.php`, `plugins/sgs-blocks/tests/php/run-wishlist-alerts-standalone.php`, `plugins/sgs-blocks/tests/php/run-account-standalone.php` and `plugins/sgs-blocks/scripts/tests/test-wishlist-panel.mjs`, each with negative controls; the live proof `plugins/sgs-blocks/scripts/qa/fr30-15-alerts-live-proof.php`, capturing mail with `pre_wp_mail` (one email for a drop, none on a second scan, none with the site switch off, a restock emailed once and cleared, a failed send keeps the subscriber queued) and restoring every value it touched.
**Watch item:** WooCommerce 11.2 ships core back-in-stock notifications and experimental, logged-in-only shopper lists (wishlist, save for later). When the lists leave experimental, compare again and decide whether the logged-in tier should sit on them.

### Open questions

1. **B2B price display**: Indus Foods is B2B (trade buyers): ex-VAT display vs the consumer inc-VAT default. Needs a per-client display-context decision before Indus's shop build.
2. **Subscriptions / reorder**: repeat purchase is THE food-DTC metric; WC Subscriptions is compose-not-build territory. Parked pending a scope decision and the extension licence. Sibling parked items: build-a-box bundles (a small FR-30-7 extension), A/B price-display hooks, GA4 funnel events on the configurator.
