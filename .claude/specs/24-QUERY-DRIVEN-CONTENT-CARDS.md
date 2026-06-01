---
doc_type: spec
spec_id: 24
spec_version: 1
status: draft
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

- **FR-24-2 — Dual-mode card.** The existing presentational card (`sgs/product-card`, etc.)
  gains a per-instance "Source" toggle in the inspector: **Typed** (current behaviour — fields
  via InnerBlocks/typed) or **Bound** (each field slot binds to the linked CPT entry's meta via
  `core/post-meta` or a custom binding source). Same card markup, two feed modes. No second
  block, no second render path beyond the binding resolution.

- **FR-24-3 — Item picker.** In Bound mode, an inspector control lets the operator pick a
  specific CPT entry (searchable select of all items of that type). The card then displays that
  entry's data live; editing the entry updates every card that references it (single source of
  truth).

- **FR-24-4 — Query/collection block.** A `sgs/content-collection` block (built on or alongside
  core Query Loop) iterates a chosen CPT and renders each item through the dual-mode card as its
  loop template. Inspector controls: source content type, count/limit, and selection rule.

- **FR-24-5 — Named-condition selection.** The collection block exposes selection presets as
  named inspector toggles, mapped to query behaviour via a registered `query_loop_block_query_vars`
  filter (working around gutenberg #40170): **Featured/Starred** (boolean `_sgs_featured` meta or
  a `featured` term), **Newest** (`date` desc), **Most-expensive / Cheapest** (`meta_value_num`
  on `_sgs_price`), **Most-popular** (`meta_value_num` on a `_sgs_views`/`_sgs_sales` counter),
  **Hand-picked** (explicit ID array), **By category/tag** (taxonomy terms). Conditions are DB-/
  meta-driven, not hardcoded per content type (R-22-1, R-22-9).

- **FR-24-6 — Designed empty state.** When a query matches zero items (or a bound entry is
  deleted), the card/collection renders a designed placeholder (operator-editable message), never
  a blank region. Empty state is server-rendered (no-JS safe).

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

- **FR-24-11 .. FR-24-17 — Variation-sets + `sgs/option-picker` (DESIGN ratified 2026-06-01 via D144; BUILD deferred as theme-thread Task 2).** Full design at `.claude/reports/2026-06-01-product-card-option-picker-design.md` (research-buddies + brainstorming, web-grounded). Bean's 6 decisions are RESOLVED (D144) and encoded below. Headlines: **FR-24-11** `_sgs_variation_sets` CPT meta (per-type `content_impact` map) — each type also carries a **`display_as`** mode of `pills` | `static-list` | `hidden` (D144.1); **FR-24-12** content-impact map drives card rendering not block logic (R-22-9); **FR-24-13** per-instance Interactivity API store; **FR-24-14** Phase-1 slot-conflict priority (first type wins; SKU matrix Phase 2 — D144.2); **FR-24-15** pickers are `sgs/option-picker` blocks (Typed=InnerBlocks / Bound=server-rendered same shape); **FR-24-16** no-JS default state; **FR-24-17** `aria-live` on dynamic slots. New atomic block **`sgs/option-picker`** (radio-group semantics via visually-hidden `<input type=radio>`+`<label>`+pill `<span>`, CSS `:checked` active state, bubbling `sgs:option-selected` event, NOT sgs/button).
  - **D144 ratified decisions (build these):**
    1. **Per-type `display_as`** — `pills` (interactive) | `static-list` (renders "Available in N flavours: A, B, C" — a non-interactive selling point) | `hidden`. PLUS a card-level **"price only"** toggle that sets all pickers hidden so the card shows just "From £x". (FR-24-11/12.)
    2. **SKU matrix deferred** — two price-affecting types → Phase-1 editor warning (first type wins); `_sgs_sku_matrix` is Phase 2. (FR-24-14.)
    3. **Pill style** = filled inside product-card / outlined as global default; PLUS three CSS states on the radio-group: resting / hover+focus ("considering") / `:checked` ("selected"). (FR-24-15.)
    4. **Clone emit** = emit `sgs/option-picker` DIRECTLY from the clone (Bean corrected 2026-06-01 — opposite of the original rec). The converter outputs the picker block for a pill group via TRUTH-SPEC + slot_synonyms/slots updates. Build the option-picker ASAP + battle-ready, THEN wire it into the pipeline — pulls Phase D + pipeline-emit forward. (FR-24-15: the picker must be robust enough to be the converter's emit target.)
    5. **Source toggle** (Typed/Bound) appears in BOTH the block toolbar AND the inspector (one attr, two controls). (FR-24-15.)
    6. **Variation-sets editor UI** = Gutenberg panel, not classic meta box. (FR-24-11.)
  - Build order: A option-picker standalone → B variation-sets data → C card Bound mode → D **clone-emit** (TRUTH-SPEC + slot_synonyms/slots so the converter outputs `sgs/option-picker` for pill groups) → E collection. **BUILD is theme-thread Task 2 — NOT yet started (deferred to the next theme session); it is a near-term priority.** Per D144.4 (Bean Q4 correction), **Phase D is IN-SCOPE within Task 2 — NOT split to a still-later phase**: when the build runs, the option-picker is made battle-ready AND wired into the converter's emit path. ("Deferred" = the build session hasn't begun; it does NOT mean Phase D is postponed once building starts.) Gated on parking P-PRODUCT-CARD-FULL-DUAL-MODE / D129; this spec is the recorded contract the build session inherits.

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
  (Query Loop + query_loop_block_query_vars        Typed mode  → InnerBlocks ($content)
   filter for named conditions)                    Bound mode  → field slots bound to CPT meta
        │
        ▼
   designed empty state (server-rendered)
```

- **Data source:** custom CPT, registered per-site. No WooCommerce.
- **Query engine:** core Query Loop block, extended via the `query_loop_block_query_vars` PHP
  filter for meta_value orderby + condition presets (the documented workaround for #40170).
- **Field surfacing:** Block Bindings API — `register_meta(show_in_rest:true)` +
  `register_block_bindings_source()` for computed/derived fields (e.g. formatted price).
- **Card:** the existing presentational cards, made dual-mode (FR-24-2). Typed mode == the
  FR-22-6 InnerBlocks shape (Spec 22), so the clone pipeline is unaffected.

## Data Model

`sgs_product` CPT (first content type) — illustrative meta keys (all `show_in_rest`):
`_sgs_price` (number), `_sgs_price_note` (string), `_sgs_featured` (bool), `_sgs_views`
(number, FR-24-7), `_sgs_pack_options` (array), `_sgs_badge` (string). Image via featured image
or an image meta. Taxonomies: `sgs_product_cat`, `sgs_product_tag`. Later content types
(`sgs_testimonial`, `sgs_team`, `sgs_case_study`) follow the same declarative registration with
their own field sets — the mechanism is shared (R-22-9).

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

- **Phase A — CPT + dual-mode card (products).** FR-24-1, FR-24-2, FR-24-3, FR-24-9. Ship the
  product CPT + Bound mode on the existing card. Validate on a real product set.
- **Phase B — Collection + conditions.** FR-24-4, FR-24-5, FR-24-6. The query block + named
  presets + empty state. The `query_loop_block_query_vars` filter.
- **Phase C — Generalise.** Register `sgs_testimonial` / `sgs_team` / `sgs_case_study` via the
  same mechanism; prove FR-24-9 acceptance #6.
- **Phase D — Polish.** FR-24-7 popularity counter, FR-24-8 Pattern Overrides, aspect-ratio lock
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

1. **Build on core Query Loop or a dedicated `sgs/content-collection`?** Core Query Loop is free
   and future-aligned but its inspector lacks meta-orderby UI (#40170). A thin SGS wrapper that
   adds the preset controls + the PHP filter may be cleaner than asking clients to use raw Query
   Loop. Decide in Phase B planning.
2. **Bound-mode field resolution: `core/post-meta` binding vs custom render path?** Bindings are
   the future-proof, low-code route; confirm they cover image + repeatable pack-options, or fall
   back to a custom `get_value_callback` source for those.
3. **Popularity (FR-24-7) signal source** without analytics coupling — simple view counter vs
   a privacy-safe interaction signal. Decide in Phase D.
4. **Per-site capability flag mechanism** — where content-type enablement lives (theme support
   flag, plugin setting, or `wp_options`) so CPTs register only when needed.
