---
doc_type: spec
spec_id: 24
spec_version: 1
status: active
title: Query-Driven Content Cards (CPT + Query Loop + Block Bindings)
created: 2026-05-31
owner: Bean (Small Giants Studio)
related:
  - specs/02-SGS-BLOCKS.md
  - specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md
research: "blub.db — 'Gold-standard WP product card / product display block (2026) + SGS architecture verdict' (2026-05-31, research-buddies + library-docs)"
---

# Spec 24 — Query-Driven Content Cards

## Problem statement

SGS card blocks today (`sgs/product-card`, `sgs/testimonial`, team/case-study patterns)
are **presentational**: a human types every field into every card instance. There is no
way to (a) author a piece of content once and reuse it across pages, or (b) auto-select
a set of items by rule — "show the 3 featured products", "show 5-star testimonials",
"show the newest case studies". Every grid of "things" is hand-built and hand-maintained.

This spec defines a **query-driven content card system**: a custom-post-type data source,
a query/selection layer, and a card render template that can be fed EITHER by typed content
(presentational, as now) OR by bound CPT data (query-driven). Products are the first
content type; testimonials, team members, and case studies inherit the same engine for free.

## Who this is for

- **Bean** — non-coder owner; must configure a CPT + a query card with zero code, via the
  block editor only. Every control is an inspector control.
- **SGS clients** — tech-illiterate; add a "Product" (or "Testimonial", "Team Member") the
  same way they add a page; drop a query card and pick a rule; never touch code or WP-CLI.

## Background (research-grounded, 2026-05-31)

Gold-standard reference is **WooCommerce's Product Collection block** (GA Nov 2024): it does
query-by-condition natively — `on_sale`, `featured`, `best_selling`, `top_rated`, `newest`,
`handpicked` — via `WC_Product_Query` + the `product_visibility` taxonomy + the `total_sales`
postmeta. But it **requires WooCommerce** (cart/checkout/tax/shipping machinery) and its inner
"Product Template" is developer-locked in many contexts (confirmed: Reddit r/woocommerce
Jun 2025; FacetWP incompatibility docs; GitHub Discussion #44776).

The decoupled path — **custom CPT + core Query Loop + Block Bindings API** — is the consensus
for non-store sites (ACF "Product Catalog Without WooCommerce", Sep 2025). Block Bindings
(WP 6.7 UI, mature 6.8, Pattern Overrides in 7.0) bind a heading/image/paragraph to post meta
via `core/post-meta` or a custom `register_block_bindings_source()` with a `get_value_callback`.
The one hard gap everywhere: **sort-by-meta is not in the Query Loop inspector UI** (GitHub
gutenberg #40170, open since 2022) — it needs the `query_loop_block_query_vars` PHP filter.

Verdict captured in research: **presentational-vs-query is a false fork** — build ONE card that
is the render template, fed two ways. **Custom CPT, NOT WooCommerce, NOT both.** The same engine
is a framework primitive that serves products, testimonials, team, case studies, post grids.

## Goals

1. Author a content item (product, testimonial, etc.) ONCE as a CPT entry; reuse anywhere.
2. A card block that renders EITHER typed content (presentational) OR bound CPT data.
3. A query/collection block that selects items by taxonomy, hand-pick, or **named condition**
   (featured, newest, most-expensive, most-popular) — all from inspector controls.
4. Content-type-agnostic: products first, then testimonials/team/case-studies with no new code.
5. Zero WooCommerce dependency for the framework default.
6. Graceful, designed empty state (no blank grids when a query matches nothing).

## Non-goals

- Cart, checkout, payments, inventory, tax, shipping (that is WooCommerce — opt-in per-site
  adapter only, never the framework default; see Out of scope).
- Front-end faceted filtering UI for visitors (Phase 2+ candidate; not in v1).
- Replacing the existing presentational cards wholesale — they BECOME the render template.

## Hard constraints

- **R-22-1** DB-first / no hardcoded dicts; **R-22-9** universal mechanism, no per-block
  hyperfocus; **R-22-14** no legacy fallback hacks. The card system is one mechanism reused
  across content types — not a bespoke block per type.
- Every selection/query control is an **inspector control** (clients never touch code/WP-CLI).
- WCAG 2.2 AA; mobile-first; 44px targets; vanilla JS; `viewScriptModule` ES modules.
- Performance budget unchanged (<100KB CSS, <50KB JS/page; green CWV). Query cards must paginate
  / cap result counts server-side.
- Per-site opt-in: a marketing site that never uses products must not pay for the CPT.

## Functional Requirements

- **FR-24-1 — Generic content CPT registration.** A framework mechanism registers content CPTs
  (`sgs_product` first) with a declarative field set (title, image, price, description, badges,
  pack-options, plus arbitrary meta). CPTs register only when a site enables that content type
  (per-site capability flag), so marketing sites stay lean. Fields registered with
  `show_in_rest => true` and non-underscore keys so Block Bindings can surface them.
  **Note (2026-06-02):** the `sgs_product` CPT MUST declare `'supports' => [..., 'custom-fields']`
  in `register_post_type()`. This is the REST-exposure flag that causes WordPress to include the
  `meta` field in the CPT's REST schema. Without it, `register_meta( ..., 'show_in_rest' => true )`
  registers the meta globally but the CPT's REST schema omits the `meta` object entirely, and
  Block Bindings / the editor panel cannot surface or persist the meta values.

- **FR-24-2 — Dual-mode card.** The existing presentational card (`sgs/product-card`, etc.)
  gains a per-instance "Source" toggle in the inspector: **Typed** (current behaviour — fields
  via InnerBlocks/typed) or **Bound** (each field slot binds to the linked CPT entry's meta via
  `core/post-meta` or a custom binding source). Same card markup, two feed modes. No second
  block, no second render path beyond the binding resolution.

- **FR-24-3 — Item picker.** In Bound mode, an inspector control lets the operator pick a
  specific CPT entry (searchable select of all items of that type). The card then displays that
  entry's data live; editing the entry updates every card that references it (single source of
  truth).

- **FR-24-4 — Query/collection block. SHIPPED (Phase E, uncommitted, 2026-06-03).** A dedicated
  `sgs/content-collection` block (block.json v1.1.0, own `WP_Query`) iterates a chosen CPT and
  renders each result through the dual-mode card in Bound mode. Inspector controls: source content
  type, count/limit, and selection rule. Decision: dedicated block over core Query Loop (Open
  Question #1 resolved).

- **FR-24-5 — Named-condition selection. SHIPPED (Phase E, uncommitted, 2026-06-03).** The
  collection block exposes selection presets as named inspector controls, resolved via `WP_Query`
  args in render.php (the `query_loop_block_query_vars` filter is not needed — dedicated block owns
  its own query): **Featured** (`meta_query: sgs_featured=true`), **Newest** (`orderby: date DESC`),
  **Most-expensive / Cheapest** (`meta_key: sgs_price`, `orderby: meta_value_num`), **Most-popular**
  (`meta_key: sgs_views`, `orderby: meta_value_num DESC`), **Hand-picked** (`post__in` ID array),
  **By category** (`tax_query` on `sgs_product_cat`). Conditions are meta-driven, not hardcoded per
  content type (R-22-1, R-22-9). `contentType` whitelisted via `sgs_content_collection_post_types`
  filter; count capped server-side 1–24.

- **FR-24-6 — Designed empty state. SHIPPED (Phase E, uncommitted, 2026-06-03).** When a query
  matches zero items (or a bound entry is deleted), the card/collection renders the operator-editable
  `emptyMessage` attribute as a styled placeholder — never blank, always server-rendered (no-JS safe).
  The collection also renders an empty state when the bound product has been deleted (IDOR-guarded:
  `get_post_type($id)` check ensures the picked ID is the correct post type before rendering).

- **FR-24-7 — Popularity counter (optional).** A lightweight, privacy-safe view/interaction
  counter writes to `_sgs_views` meta to power "Most-popular" without analytics coupling. Opt-in;
  off by default. (Sales-based popularity requires the WooCommerce adapter — see Out of scope.)

- **FR-24-8 — Pattern Override integration (WP 7.0).** Each card field slot declares
  `allowedBindings`; a card registered as a synced pattern exposes its bound fields as overridable
  slots, so a "product card" pattern is reusable site-wide with per-instance overrides.

- **FR-24-9 — Clone-pipeline compatibility.** The dual-mode card's Typed mode is exactly the
  FR-22-6 InnerBlocks shape the converter already emits (see Spec 22). The query-driven layer is
  additive — the converter keeps emitting Typed cards; Bound/collection is an operator-authoring
  feature, not a converter output.

- **FR-24-10 — Curated-content blocks are dual-mode too (Bean-directed, 2026-06-01).** The same
  Typed-vs-bound split applies to **curated-content blocks** whose editor is a rich repeater the
  clone pipeline must also feed — `sgs/trust-bar` is the first case (and the generalisation target
  for any block with a per-item curated editor that the converter emits InnerBlocks into). The
  conflict: a naive FR-22-6 InnerBlocks migration of `sgs/trust-bar` would **gut its curated client
  editor** (the icon-circle item repeater + the 3 badge variants `icon-circle`/`text-only`/`image-badge`
  + autoScroll + title) and replace it with raw block nesting — violating "client experience is
  primary". The dual-mode answer: the block keeps its **Typed mode** (the existing curated `items[]`
  repeater + variant inspector — the rich client UX) AND gains a **InnerBlocks/Bound mode** where it
  `echo $content` so the converter's emitted badge children (`sgs/container.sgs-trust-bar__badge` >
  `sgs/icon` + `sgs/text`, per the run-223313 ground truth) render. A per-instance Source toggle
  (mirrors FR-24-2) selects which path drives render.php. R-22-14 clean — the two modes are distinct
  authored states, NOT a server-side scalar fallback hack: render.php branches on the explicit mode
  attr, not on `empty($content)`. The badge children use existing primitives (container + icon +
  text/label + media for image-badge) — no new atomic block. **Build pending** (Bean accepted this
  continues past the hero into a focused session). All 18 trust-bar attrs + 3 variants preserved
  (full schema enumerated 2026-06-01: badgeStyle, items, title, titleColour/FontSize, labelColour/
  FontSize, badgeSize, iconCircle*, iconColour, textColour, columns, gap, showPendingInEditor,
  autoScroll*). deprecated.js keeps the v2 cert-bar + v3 rename entries; a new entry handles the
  mode attr default. **Acceptance:** FR-22-18 structural parity — `.sgs-trust-bar` renders the
  converter's 4 badge children in Bound mode AND the curated repeater still works in Typed mode
  (editor smoke test, no "unexpected content" warning).

- **FR-24-11 .. FR-24-17 — Variation-sets + `sgs/option-picker` (DESIGN ratified 2026-06-01 via D144; Phase A + Phase B BUILT + SHIPPED 2026-06-02).** Full design at `.claude/reports/2026-06-01-product-card-option-picker-design.md` (research-buddies + brainstorming, web-grounded). Bean's 6 decisions are RESOLVED (D144) and encoded below. Headlines: **FR-24-11** `_sgs_variation_sets` CPT meta (per-type `content_impact` map) — each type also carries a **`display_as`** mode of `pills` | `static-list` | `hidden` (D144.1); **FR-24-12** content-impact map drives card rendering not block logic (R-22-9); **FR-24-13** per-instance Interactivity API store; **FR-24-14** Phase-1 slot-conflict priority (first type wins; SKU matrix Phase 2 — D144.2); **FR-24-15** pickers are `sgs/option-picker` blocks (Typed=InnerBlocks / Bound=server-rendered same shape); **FR-24-16** no-JS default state; **FR-24-17** `aria-live` on dynamic slots. New atomic block **`sgs/option-picker`** (radio-group semantics via visually-hidden `<input type=radio>`+`<label>`+pill `<span>`, CSS `:checked` active state, bubbling `sgs:option-selected` event, NOT sgs/button).
  - **D144 ratified decisions (build these):**
    1. **Per-type `display_as`** — `pills` (interactive) | `static-list` (renders "Available in N flavours: A, B, C" — a non-interactive selling point) | `hidden`. PLUS a card-level **"price only"** toggle that sets all pickers hidden so the card shows just "From £x". (FR-24-11/12.)
    2. **SKU matrix deferred** — two price-affecting types → Phase-1 editor warning (first type wins); `_sgs_sku_matrix` is Phase 2. (FR-24-14.)
    3. **Pill style** = filled inside product-card / outlined as global default; PLUS three CSS states on the radio-group: resting / hover+focus ("considering") / `:checked` ("selected"). (FR-24-15.)
    4. **Clone emit** = emit `sgs/option-picker` DIRECTLY from the clone (Bean corrected 2026-06-01 — opposite of the original rec). The converter outputs the picker block for a pill group via TRUTH-SPEC + slot_synonyms/slots updates. Build the option-picker ASAP + battle-ready, THEN wire it into the pipeline — pulls Phase D + pipeline-emit forward. (FR-24-15: the picker must be robust enough to be the converter's emit target.)
    5. **Source toggle** (Typed/Bound) appears in BOTH the block toolbar AND the inspector (one attr, two controls). (FR-24-15.)
    6. **Variation-sets editor UI** = Gutenberg panel, not classic meta box. (FR-24-11.)
  - Build order: A option-picker standalone → B variation-sets data → C card Bound mode → D **clone-emit** (TRUTH-SPEC + slot_synonyms/slots so the converter outputs `sgs/option-picker` for pill groups) → E collection. **Phase A (`sgs/option-picker` atomic block) SHIPPED 2026-06-02. Phase B (`_sgs_variation_sets` CPT meta + Gutenberg editor panel) SHIPPED 2026-06-02 — meta round-trips via REST, live-verified.** Phase C (card Bound mode + WooCommerce dual-source — see D149 below) is the next build target. Per D144.4 (Bean Q4 correction), **Phase D is IN-SCOPE within the same build sequence — NOT split to a still-later phase**: the option-picker is made battle-ready AND wired into the converter's emit path when Phase C runs. Gated on parking P-PRODUCT-CARD-FULL-DUAL-MODE / D129; this spec is the recorded contract the build session inherits.

## Non-functional Requirements

- Selection presets resolve server-side; result counts capped (default 12, max configurable).
- Binding resolution adds no measurable TTFB regression vs a typed card (benchmark in Phase gate).
- Inspector defaults are "safe" — a fresh collection block shows newest N of the chosen type, so
  a client cannot trivially configure an empty grid (pairs with FR-24-6).

## Architecture

```
Content type capability (per-site flag)
        │  registers
        ▼
sgs_product CPT  ──fields (show_in_rest)──►  Block Bindings sources
  (title, _sgs_price, _sgs_featured,             (core/post-meta + custom
   image, description, badges, pack-options)      sgs/content-field source)
        │                                              │
        │ queried by                                   │ binds field slots of
        ▼                                              ▼
sgs/content-collection  ──loop template──►  dual-mode card (sgs/product-card …)
  (dedicated block, own WP_Query —             Typed mode  → InnerBlocks ($content)
   named conditions resolved in render.php)    Bound mode  → field slots bound to CPT meta
        │
        ▼
   designed empty state (server-rendered)
```

- **Data source:** custom CPT, registered per-site. No WooCommerce.
- **Query engine:** dedicated `sgs/content-collection` block with its own `WP_Query`. Named
  selection presets (featured, newest, most-expensive, etc.) are resolved via `WP_Query` args
  in render.php — the `query_loop_block_query_vars` PHP filter is not needed (Open Question #1
  resolved, Phase E 2026-06-03). Core Query Loop's meta-orderby gap (#40170) is avoided entirely.
- **Field surfacing:** Block Bindings API — `register_meta(show_in_rest:true)` +
  `register_block_bindings_source()` for computed/derived fields (e.g. formatted price).
- **Card:** the existing presentational cards, made dual-mode (FR-24-2). Typed mode == the
  FR-22-6 InnerBlocks shape (Spec 22), so the clone pipeline is unaffected.
- **D149 — Phase C dual-source Bound mode (decided 2026-06-02).** The card's Bound-mode data
  source is **dual-source**: when WooCommerce is present on a given site, the card binds to
  WooCommerce-native product data (price / image / stock status / variations via WC's own meta
  and REST endpoints); when WooCommerce is absent, it falls back to the custom `sgs_product` CPT
  meta. The custom CPT meta (`_sgs_variation_sets`, `_sgs_price`, etc.) is reserved for
  SGS-specific config that WooCommerce does not model — it is NOT a storage mirror of WC data.
  `custom-fields` support on the CPT is a REST-exposure flag, not a storage choice (see FR-24-1
  note above). Phase C requires a `/brainstorming` + `/research` design gate on the WC
  Block-Bindings integration pattern before building. Cross-reference: decisions.md D149.

## Data Model

`sgs_product` CPT (first content type) — meta keys (all registered with `show_in_rest: true`).
Non-underscore keys are public display fields surfaced by Block Bindings; underscore keys are
private SGS config. (Authoritative: `includes/content-types/class-product-cpt.php`.)

| Key | Type | Underscore? | Purpose |
|-----|------|-------------|---------|
| `sgs_price` | number | No | Base price (lowest pack or single price) |
| `sgs_price_note` | string | No | Label beside price, e.g. "from" |
| `sgs_featured` | boolean | No | Drives FR-24-5 "Featured" selection rule |
| `sgs_views` | number | No | View counter for "Most-popular" rule (FR-24-7, off by default) |
| `_sgs_variation_sets` | string (JSON) | Yes — private | SGS display config: per-type `display_as` + `content_impact` |
| `_sgs_sku_matrix` | string (JSON) | Yes — private | Phase 2 multi-variant pricing (planned) |

Image: featured image or an image meta field. Taxonomies: `sgs_product_cat`, `sgs_product_tag`.
Later content types (`sgs_testimonial`, `sgs_team`, `sgs_case_study`) follow the same declarative
registration with their own field sets — the mechanism is shared (R-22-9).

**`custom-fields` CPT support is required** (see FR-24-1 note). Without it, WordPress omits the
`meta` field from the CPT REST schema entirely — `register_meta + show_in_rest` registers meta
globally but the schema misses it. This was a pre-existing bug found on first live test (D148).

## Acceptance Criteria

1. With the product content-type enabled, a client can add a Product (CPT entry) and see it in
   the item picker — no code.
2. A `sgs/product-card` set to Bound mode + a picked product renders that product's live data;
   editing the product updates the card.
3. A `sgs/content-collection` with "Featured" preset shows only featured products; "Most-expensive"
   sorts by price desc — both from inspector toggles, no code.
4. An empty query renders the designed placeholder, not a blank region.
5. A marketing site with the product type DISABLED ships no product CPT, no extra weight.
6. The same collection block, pointed at `sgs_testimonial`, works with zero new block code.
7. The clone pipeline still emits Typed cards unchanged (Spec 22 regression check passes).

## Phasing

- **Phase A — `sgs/option-picker` atomic block.** FR-24-15. SHIPPED 2026-06-02: radio-group
  pill chooser (visually-hidden `<input type=radio>` + `<label>` + pill `<span>`, CSS `:checked`
  active state, bubbling `sgs:option-selected` event). Battle-ready for both standalone use and
  converter emit target.
- **Phase B — `_sgs_variation_sets` CPT meta + Gutenberg editor panel.** FR-24-11, FR-24-12.
  SHIPPED 2026-06-02: `_sgs_variation_sets` meta registered with `show_in_rest => true`; editor
  panel built; meta round-trips via REST (live-verified). `sgs_product` CPT has `custom-fields`
  support (required for REST `meta` field — see FR-24-1 note).
- **Phase C — Card Bound mode (wrapper+bridge — D151, refines D149).** FR-24-2, FR-24-3, FR-24-9.
  **DESIGN SIGNED OFF 2026-06-02 (D151), research-gated, ready to build.** The SGS card is the
  ALWAYS-ON unified authoring wrapper; WooCommerce (the PRIMARY backing store — the card's whole
  purpose is wrapping WC with better design/UX) supplies base price/image/stock when present, with
  the `sgs_product` CPT as the graceful-degradation path when WC is absent. **Source = auto from
  the product picker** (lists WC products + `sgs_product` entries; sets the `sourceMode` attr —
  `wc-product`|`sgs-cpt`|`typed` — automatically; no client-facing WC/CPT toggle). **Pills always
  come from the SGS `_sgs_variation_sets` layer + `sgs/option-picker`** even on WC sites (WC-native
  per-variant pricing/stock = deferred advanced opt-in, real multi-SKU shops only). **Add-to-cart IS
  in Phase C** — adds the bound WC product (selected pack-size) via the WC Store API, firing
  `wc-blocks_added_to_cart` so the `sgs/cart` badge updates (reuses the Task-A-verified path).
  Architecture: single binding source `sgs-product/field` (`uses_context:['postId']`, routes WC vs
  CPT via `source_args.source`); `wc_get_product()->get_price_html()` yields variable-product RANGES
  free; front-end pill→price/image swap via the WP Interactivity API seeded server-side (zero
  wc-blocks React bundle; ~12KB). Option-picker event contract (verified): `sgs:option-selected`,
  `detail:{ typeKey, selectedKey, contentImpact }`. See D151 (+ D149 origin).
- **Phase D — Clone-emit.** FR-24-15 pipeline wiring. **SHIPPED (uncommitted, 2026-06-03).**
  `slots` DB row aliases `pill-group`/`pills`/`option-group`/`picker` → `sgs/option-picker`
  (`has_inner_blocks=0`). `convert.py` G3 path calls `_atomic_attrs_for(..., allow_text_fallback=False)`
  for content-blocks with no InnerBlocks. `sgs/option-picker` handler extracts `optionItems`,
  `defaultSelected`, `typeKey` from child pill elements. Live-verified emitting the correct
  self-closing block. See Spec 25 §Clone-emit for full mechanism.
- **Phase E — Collection + conditions.** FR-24-4, FR-24-5, FR-24-6. **SHIPPED (uncommitted, 2026-06-03).**
  Dedicated `sgs/content-collection` block (block.json v1.1.0), own `WP_Query`, 7 named selection
  rules (`newest`/`featured`/`most-expensive`/`cheapest`/`most-popular`/`handpicked`/`category`)
  via `meta_query`/`tax_query`; renders each result as a Bound `sgs/product-card`; designed empty
  state server-rendered. `contentType` whitelisted via filter; count capped 1–24. Decision: dedicated
  block over core Query Loop — simpler inspector, no `query_loop_block_query_vars` filter needed for
  named presets (Open Question #1 resolved — see below).
- **Phase F — Generalise.** Register `sgs_testimonial` / `sgs_team` / `sgs_case_study` via the
  same mechanism; prove FR-24-9 acceptance #6.
- **Phase G — Polish.** FR-24-7 popularity counter, FR-24-8 Pattern Overrides, aspect-ratio lock
  + hover controls (the "beyond gold-standard" gaps the research identified).

## Migration

- Existing presentational cards keep working unchanged (Typed mode is the default; Bound mode is
  opt-in per instance). No forced migration.
- The FR-22-6 InnerBlocks migration of `sgs/product-card` (done 2026-05-31) is the prerequisite —
  Typed mode == that InnerBlocks shape.

## Out of scope

- **WooCommerce adapter.** If a client genuinely needs cart/checkout/payments, add WooCommerce as
  a per-site opt-in adapter that maps `sgs/content-collection` selection presets onto
  `WC_Product_Query` (featured/on-sale/best-selling become native Woo concepts). Never the
  framework default; never carried by marketing sites. Separate spec when a real shop client lands.
- Visitor-facing faceted filtering UI (consider after Phase D).

## Open Questions

1. ~~**Build on core Query Loop or a dedicated `sgs/content-collection`?**~~ **RESOLVED (Phase E,
   2026-06-03).** Dedicated block (`sgs/content-collection`, block.json v1.1.0) with its own
   `WP_Query`. Core Query Loop's meta-orderby gap (#40170) + complex inspector UX for tech-illiterate
   clients made the dedicated path cleaner. The `query_loop_block_query_vars` PHP filter is no longer
   needed for named-preset selection.
2. **Bound-mode field resolution: `core/post-meta` binding vs custom render path?** Bindings are
   the future-proof, low-code route; confirm they cover image + repeatable pack-options, or fall
   back to a custom `get_value_callback` source for those.
3. **Popularity (FR-24-7) signal source** without analytics coupling — simple view counter vs
   a privacy-safe interaction signal. Decide in Phase G.
4. **Per-site capability flag mechanism** — where content-type enablement lives (theme support
   flag, plugin setting, or `wp_options`) so CPTs register only when needed.
