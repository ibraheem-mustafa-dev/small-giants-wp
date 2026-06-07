---
doc_type: spec
spec_id: 25
spec_version: 1
status: superseded
absorbed_by: .claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md
title: SGS WooCommerce Experience Layer
created: 2026-06-03
owner: Bean (Small Giants Studio)
related:
  - specs/24-QUERY-DRIVEN-CONTENT-CARDS.md
  - specs/02-SGS-BLOCKS.md
  - specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md
---

# Spec 25 — SGS WooCommerce Experience Layer

> **SUPERSEDED — read [Spec 27](../27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md) instead.**

## Purpose

This is the authoritative reference for every SGS feature that wraps, extends, or bridges WooCommerce.
Spec 24 owns the card/query/bindings detail; this spec provides the cross-cutting architecture, the
per-feature status table, and the design principles that govern how the SGS layer and WooCommerce
relate to each other.

## Design principles

1. **WC is optional at the framework level.** A marketing site that installs no WooCommerce pays zero
   penalty: no CPT, no extra CSS, no extra JS. Per-site capability flags govern registration.
2. **The SGS card is always the authoring wrapper.** Clients design, configure, and publish via SGS
   block inspector controls — never via WooCommerce's block editor or classic meta boxes.
3. **WC is the primary commerce backing store.** When WooCommerce is present, it owns price/image/stock/
   variants/cart. The SGS layer reads from WC and bridges those values into SGS blocks. Duplicating WC
   data in custom meta would create two sources of truth — always wrong.
4. **Graceful degradation, not feature gating.** When WooCommerce is absent, the same blocks fall back to
   the `sgs_product` CPT. The client UX is identical; only the data source changes.
5. **No WC bundle on marketing pages.** The `sgs/*` card blocks never load WooCommerce's React bundle.
   WP Interactivity API + the WC Store REST API replace it at ~12 KB.
6. **SGS-specific config always lives in custom meta.** Variation-set display modes, content-impact maps,
   SKU matrix (`_sgs_variation_sets`, `_sgs_sku_matrix`) are SGS concepts WC does not model — they live
   in custom meta regardless of whether WC is present. This is NOT a storage mirror; it is
   WC-complementary metadata (D149, D151).
7. **R-22-14 clean.** render.php branches on the explicit `sourceMode` attr — never on `empty($content)`.

---

## Feature map

| Feature | Status | Primary files | D-ref | Spec |
|---------|--------|--------------|-------|------|
| `sgs/product-card` Typed mode (InnerBlocks wrapper shell) | SHIPPED | `src/blocks/product-card/block.json` (v1.3.0), `render.php` | D148 | Spec 24 FR-24-2 |
| `sgs/product-card` Bound mode — `sourceMode: wc-product` | SHIPPED (commit `6bcdf48c`) | `render.php`, `includes/class-product-bindings.php` | D151 | Spec 24 FR-24-2/3 |
| `sgs/product-card` Bound mode — `sourceMode: sgs-cpt` | SHIPPED (commit `6bcdf48c`) | `render.php`, `includes/content-types/class-product-cpt.php` | D151 | Spec 24 FR-24-2/3 |
| `sgs-product/field` Block Bindings source | SHIPPED (commit `6bcdf48c`) | `includes/class-product-bindings.php` | D151 | Spec 24 FR-24-2 |
| Editor product picker (lists WC products + CPT entries) | SHIPPED (commit `6bcdf48c`) | `src/blocks/product-card/edit.js` | D151 | Spec 24 FR-24-3 |
| `sourceMode` auto-set from picker (no client WC/CPT toggle) | SHIPPED (commit `6bcdf48c`) | `edit.js` | D151 | Spec 24 FR-24-3 |
| Add-to-cart via WC Store API (R-22-14-clean) | SHIPPED (commit `6bcdf48c`) | `render.php` (no-JS `<a>` fallback), `view.js` (pending guard) | D151 | Spec 24 FR-24-2 |
| `sgs/cart` WooCommerce mini-cart count badge v1 | SHIPPED (commit `b6369224`) | `src/blocks/cart/` | D148 | — |
| `sgs/cart` drawer Phase 2 | PLANNED | — | — | — |
| `sgs_product` CPT registration | SHIPPED | `includes/content-types/class-product-cpt.php` | D148 | Spec 24 FR-24-1 |
| `custom-fields` CPT support (REST meta exposure gate) | SHIPPED (commit `7115a60d`) | `includes/content-types/class-product-cpt.php` | D148, D149 | Spec 24 FR-24-1 |
| `_sgs_variation_sets` meta + Gutenberg editor panel | SHIPPED (commit `7115a60d`) | `includes/content-types/class-product-cpt.php`, product-card edit.js | D148 | Spec 24 FR-24-11 |
| `sgs/option-picker` atomic block (pill radio-group) | SHIPPED (commit `ee6807d3`) | `src/blocks/option-picker/` | D144, D148 | Spec 24 FR-24-15 |
| Converter emits `sgs/option-picker` for draft pill groups | SHIPPED (uncommitted — Phase D) | `scripts/orchestrator/converter_v2/convert.py`, `seed-slot-synonyms.py` | — | Spec 24 FR-24-15 |
| `sgs/content-collection` block (own WP_Query, selection rules) | SHIPPED (uncommitted — Phase E) | `src/blocks/content-collection/` (block.json v1.1.0, render.php) | — | Spec 24 FR-24-4/5/6 |
| Pill→price/image swap via WP Interactivity API | PARTIAL — wired, dormant (per-option data pending SKU matrix Phase 2) | `src/blocks/product-card/view.js` | D151 | Spec 24 FR-24-13 |
| `_sgs_sku_matrix` (multi-SKU variable pricing) | PLANNED — Phase 2 | — | D144 §2 | Spec 24 FR-24-14 |
| WC variable-product per-variant pricing/stock via WC-native variations | DEFERRED — real multi-SKU shops only | — | D151 §3 | Spec 24 FR-24-14 |
| WC adapter for `sgs/content-collection` (maps selection presets onto `WC_Product_Query`) | PLANNED — triggers when a real shop client lands | Separate spec when in scope | D149 | Spec 24 out-of-scope |

---

## `sgs/cart` (badge v1)

**Status: SHIPPED** (commit `b6369224`, D148). Detailed status and future phases below.

| Phase | What | Status |
|-------|------|--------|
| v1 — count badge | Store API `GET /wc/store/v1/cart`; SSR count=0; WP Interactivity API re-hydrates on load; no jQuery; `cart-fragments` dequeued | SHIPPED |
| v2 — drawer | Slide-in mini-cart listing items + quantities + subtotal, driven by Store API | PLANNED |
| v3 — add-to-cart integration | Badge count increments when `sgs/product-card` fires `wc-blocks_added_to_cart` | SHIPPED (fires via product-card view.js Store API path; badge listens) |

Primary files: `src/blocks/cart/` (block.json, render.php, view.js, style.css).

---

## `sgs-product/field` binding source

**Registered name:** `sgs-product/field`
**File:** `plugins/sgs-blocks/includes/class-product-bindings.php`
**Registered on:** `init` priority 15 (after CPT registration at priority 5).

`uses_context: ['postId', 'postType']`

`source_args.source` controls the data backend per instance:
- `'auto'` — derives from the linked product type (WC product → WC path; `sgs_product` post → CPT path).
- `'wc'` — WooCommerce path: `wc_get_product()` → price via `get_price_html()` (yields ranges "£10–£30" for
  variable products); image via `get_image_id()`; stock via `get_availability()`.
- `'cpt'` — CPT path: `get_post_meta($id, 'sgs_price', true)`, `get_post_meta($id, 'sgs_price_note', true)`.

`_sgs_variation_sets` (`get_post_meta($id, '_sgs_variation_sets', true)`) is always read from CPT meta —
it is SGS-specific config WooCommerce does not model.

---

## `sgs_product` CPT meta keys

All registered via `register_meta()` with `show_in_rest => true` on the `sgs_product` post type.
The CPT MUST declare `'supports' => [..., 'custom-fields']` so WordPress includes the `meta` object
in the CPT's REST schema (without it `register_meta + show_in_rest` registers globally but the schema
omits `meta` entirely — D148 bug found on first live test).

| Meta key | Type | Leading underscore? | Purpose |
|----------|------|---------------------|---------|
| `sgs_price` | number | No | Base price (lowest pack / single price) |
| `sgs_price_note` | string | No | Label beside price, e.g. "from" |
| `sgs_featured` | boolean | No | Drives FR-24-5 "Featured" selection rule |
| `sgs_views` | number | No | View counter for "Most-popular" rule (FR-24-7, off by default) |
| `_sgs_variation_sets` | string (JSON-encoded array) | Yes — private | SGS display config: per-type `display_as` + `content_impact` |
| `_sgs_sku_matrix` | string (JSON-encoded) | Yes — private | Phase 2 multi-variant pricing (planned) |

**Note:** `_sgs_variation_sets` and `_sgs_sku_matrix` use leading underscores because they are
SGS-internal config, not display data. All non-underscore keys are the public display fields that
`sgs-product/field` bindings resolve.

---

## `sgs/option-picker` — converter emit (Phase D)

The cloning converter emits `sgs/option-picker` for any draft pill group. Mechanism:

1. A `slots` DB row aliases `pill-group`, `pills`, `option-group`, `picker` → `sgs/option-picker`
   with `has_inner_blocks=0` (populated via `seed-slot-synonyms.py`).
2. `convert.py` G3 path: when `composition_role='content-block'` and `has_inner_blocks=0`, the walker
   calls `_atomic_attrs_for(node, slug, allow_text_fallback=False)`.
3. The `sgs/option-picker` handler inside `_atomic_attrs_for` extracts `optionItems` (array of
   `{key, label}`), `defaultSelected`, and `typeKey` from child `<li>`/`<label>`/pill elements.
4. Emits: `<!-- wp:sgs/option-picker {"optionItems":[...],"defaultSelected":"...","typeKey":"..."} /-->`.

Live-verified emitting the correct self-closing block markup (Phase D, uncommitted).

---

## `sgs/content-collection` — selection rules

**File:** `src/blocks/content-collection/` (block.json v1.1.0, render.php)
**Status:** SHIPPED (uncommitted — Phase E)

Selection rules, implemented as PHP `WP_Query` args in render.php:

| `selectionRule` value | Query behaviour |
|-----------------------|----------------|
| `newest` | `orderby: date`, `order: DESC` |
| `featured` | `meta_query: sgs_featured = true`, `orderby: date DESC` tiebreak |
| `most-expensive` | `meta_key: sgs_price`, `orderby: meta_value_num`, `order: DESC` |
| `cheapest` | `meta_key: sgs_price`, `orderby: meta_value_num`, `order: ASC` |
| `most-popular` | `meta_key: sgs_views`, `orderby: meta_value_num DESC`, date DESC fallback |
| `handpicked` | `post__in: handpickedIds[]`, ordered by the IDs array |
| `category` | `tax_query` on `sgs_product_cat`, `orderby: date DESC` |

Server-side cap: `count` clamped to 1–24 (performance budget). `contentType` whitelisted via
`sgs_content_collection_post_types` filter (default: `['sgs_product', 'product']`). Empty state
renders the operator-editable `emptyMessage` attribute — never blank, always server-rendered.

---

## Per-site WC-optional architecture

A site enables or disables the WooCommerce layer via a per-site capability flag (mechanism TBD —
`wp_options` or theme support flag; see Spec 24 open question #4). When disabled:

- `sgs_product` CPT does not register.
- `class-product-bindings.php` still loads but the WC branch in `get_value()` is unreachable
  (no WC products exist).
- `sgs/cart` renders nothing (renders a comment node, no visible output) unless WC is active.
- No WooCommerce plugin dependency is declared in `sgs-blocks.php` — the plugin runs clean on
  non-WC sites.

When WooCommerce is active, the SGS layer detects it via `function_exists('wc_get_product')` —
no hard `require` or plugin header dependency.

---

## Cross-references

- **Spec 24** — full card/collection/bindings/option-picker design, phasing, and acceptance criteria.
- **D148** — `sgs/option-picker` + `sgs/cart` v1 + `_sgs_variation_sets` panel + CPT `custom-fields` fix.
- **D149** — dual-source architecture rationale (WC vs CPT, `custom-fields` as REST flag not storage).
- **D151** — "wrapper+bridge" model (Bean's reframe); WC = primary case; add-to-cart in Phase C.
- **`includes/class-product-bindings.php`** — binding source registration + WC/CPT resolver.
- **`includes/content-types/class-product-cpt.php`** — CPT registration, meta registration, REST schema.
- **`src/blocks/product-card/render.php`** — sourceMode branching (typed / wc-product / sgs-cpt).
- **`src/blocks/cart/`** — mini-cart badge v1.
- **`src/blocks/content-collection/`** — query block + selection rules.
- **`src/blocks/option-picker/`** — atomic pill radio-group block.
