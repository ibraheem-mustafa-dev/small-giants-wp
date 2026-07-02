---
doc_type: spec
spec_id: 27
spec_version: 6
status: active
title: "SGS Product & WooCommerce Layer"
project: small-giants-wp
authors: Bean + Claude (Opus 4.8)
created: 2026-06-03
last_verified: 2026-06-09
absorbs: [24, 25]
absorbed_by: null
revision_history:
  - v1 2026-06-03: initial - Option A architecture.
  - v2 2026-06-03: round-1 qc-council (5 personas) applied; AI-builder elevated to headline.
  - v3 2026-06-03: round-2 brutal qc-council (6 harsh personas) applied. RE-SCOPED to MVP-first (Bean call): a small read-through configurator ships first; authoring + AI-builder demoted to an explicit roadmap behind a 2nd shop client. Moat re-aimed from "AI button" to the end-to-end closed loop + a sprinted WCAG-AA claim. ~30 technical/security/ops defects fixed. Live product-meta IDOR patched in code.
  - v4 2026-06-03: consolidated - absorbed Spec 24 (query-driven content cards) + Spec 25 (WooCommerce experience layer) into one master. Supersedes Spec 25 §design-principle 6 + the _sgs_sku_matrix/WC-native-deferred feature-map rows.
  - v5 2026-06-05: RECONCILED TO REAL IMPLEMENTATION after Phase 2 completed. COURSE-CHANGE (Bean, 2026-06-04): "complete the whole spec before launch" — so the authoring layer (FR-27-R1/R2/R3) + FR-27-PREFLIGHT, which v3 had demoted to "Phase R roadmap, build when a 2nd shop client lands", were PULLED FORWARD into Phase 2 as "Cluster C" and SHIPPED (R1 f747e58a, R2 e62f337f, R3 dd9d0d7d, PREFLIGHT dd9d0d7d+27e54132). Phase 2 (Cluster A display D171 + Cluster B SEO D173 + Cluster C authoring/go-live) is COMPLETE + Bean R-31-13 signed. Image-sitemap clause of FR-27-E3 DESCOPED (Bean, 53b85d7c). Documented the extras built beyond the original FR text (shared Product_Authoring_Security, bulk_update endpoint, merge-by-union, 300-combo cap, injected-failure test hook, cart £0 422 guard, weekly health cron, GET /preflight endpoint, publish-gated invalid_jsonld, no_variesby check, golden-master + acceptance test harnesses). ONLY FR-27-R4/R5/F2 (the "Cluster D" capstone) remain unbuilt.
  - v6 2026-06-09: FR-27-F2 research-corrected pre-build (D197, gold-standard research pack .claude/reports/2026-06-09-f2-gold-standard-research.md): (1) speakable DESCOPED (dead for e-commerce — still BETA, news/US-English/Google-Home only); (2) FAQPage value framing corrected — Google fully deprecated FAQ rich results 2026-05-07 for all sites; client-facing copy must claim AI-citation + Bing visibility, never Google rich results, enforced by a grep gate in the F2 done-when; (3) hardened feed/llms.txt clauses with the researched conventions (text/plain, anti-cloaking navigation-map rule, variant deep-links, identifier_exists=false, feed price from the SEC-1 manifest).
supersedes_notes: "Supersedes Spec 24 FR-24-13/14 + Spec 25 §design-principle-6 + feature-map rows. D149/D151 dual-source refined: WC-present path reads WC variations, never custom meta. _sgs_sku_matrix PLANNED row and WC-native-variations DEFERRED row both superseded by the variable-product configurator chapter."
related:
  - specs/31-UNIVERSAL-CLONING-PIPELINE.md
  - specs/26-SGS-GLOBAL-STYLES.md
  - specs/02-SGS-BLOCKS.md
  - plugins/sgs-blocks/src/blocks/product-card/
  - plugins/sgs-blocks/src/blocks/option-picker/
  - plugins/sgs-blocks/src/blocks/content-collection/
  - plugins/sgs-blocks/src/blocks/cart/
  - plugins/sgs-blocks/includes/class-product-bindings.php
  - plugins/sgs-blocks/includes/content-types/class-product-cpt.php
---

# Spec 27 - SGS Product & WooCommerce Layer

This is the single authoritative spec for the SGS product and WooCommerce layer. It covers:

- The `sgs_product` CPT and its meta schema (FR-24-1, FR-24-7)
- The dual-mode card (`sgs/product-card`, FR-24-2 to FR-24-3)
- The `sgs-product/field` Block Bindings source (Spec 25)
- The `sgs/option-picker` atomic block (FR-24-15)
- Variation-sets and the `_sgs_variation_sets` meta (FR-24-11 to FR-24-14)
- The `sgs/content-collection` query block and its 7 selection rules (FR-24-4 to FR-24-6)
- The `sgs/cart` WooCommerce mini-cart badge (Spec 25)
- The variable-product configurator: live WC read-through, accessible pill swaps, secure add-to-cart, SEO schema, and the Phase-R authoring + AI-builder roadmap (FR-27-A1 onwards)

**FR-24-x IDs** are the inherited/shipped card-system requirements (absorbed from Spec 24).
**FR-27-x IDs** are the variable-product configurator requirements (originally Spec 27).
Both sets are stable: cross-references elsewhere in the codebase remain valid.

Specs 24 and 25 are superseded by this document. Do not edit them.

---

## Problem statement

SGS card blocks (`sgs/product-card`, `sgs/testimonial`, team/case-study patterns) were historically presentational: a human typed every field into every card instance. There was no way to (a) author a piece of content once and reuse it across pages, or (b) auto-select a set of items by rule. This spec defines the full stack that fixes this:

1. A custom-post-type data source (authoring layer).
2. A card that renders either typed content or bound CPT/WC data (dual mode).
3. A query/collection block that selects items by taxonomy, hand-pick, or named condition.
4. A variable-product configurator that wraps WooCommerce (WC = single source of truth; SGS adds accessible UI, cross-attribute availability past the 30-variation cliff, and the presentation WC cannot model).

SGS clients sell variable products (Mama's: 48 SKUs). The current card shows pills from `_sgs_variation_sets` meta, but the pill-to-price/image swap was dormant and knew nothing of stock, sale pricing, or which combinations are valid. This spec closes that gap, shipped MVP-first.

---

## Who this is for

- **Bean** - non-coder owner; must configure a CPT, a query card, and a product configurator with zero code, via the block editor only. Every control is an inspector control.
- **SGS clients** - tech-illiterate; add a "Product" (or "Testimonial", "Team Member") the way they add a page; drop a query card and pick a rule; never touch code or WP-CLI.

---

## Background and research grounding

**Card/query layer (2026-05-31):** The gold-standard reference is WooCommerce's Product Collection block (GA Nov 2024) - it does query-by-condition natively via `WC_Product_Query`. But it requires WooCommerce and its inner "Product Template" is developer-locked in many contexts. The decoupled path (custom CPT + Block Bindings API) is the consensus for non-store sites. Block Bindings (WP 6.7 UI, mature 6.8, Pattern Overrides in 7.0) bind a heading/image/paragraph to post meta via `core/post-meta` or a custom `register_block_bindings_source()`. Sort-by-meta is not in the Query Loop inspector UI (GitHub gutenberg #40170, open since 2022) so a dedicated collection block owns its own `WP_Query`. Verdict: build ONE card that is the render template, fed two ways. Custom CPT, not WooCommerce, not both.

**Variable-product configurator (2026-06-03):** WooCommerce natively exposes, per variation, via `wc_get_product()` and the public Store API: regular/sale price (+schedule), stock qty/status, variation image, SKU, GTIN (`global_unique_id`, WC 9.3+), description, attributes, combination validity, and the inputs for "% off". WC leaves open: (1) the 30-variation cliff (`find_matching_variations` works only at or below `woocommerce_ajax_variation_threshold`, default 30; Mama's 48 already exceed it); (2) brutal authoring (block product editor removed in WC 11.0, 28 July 2026); (3) accessibility (no competitor claims WCAG 2.2 AA); (4) freemium bait-and-switch; (5) no per-unit pricing, cross-attribute availability, multi-image variation gallery, AI setup, or agency templating. Architecture verdict: never mirror WC variation data. Presentation-only metadata on existing WC objects; WC owns all commerce truth; the speed win comes from not loading WC's React bundle.

Provenance: five research agents + two qc-council rounds (5 + 6 personas), 2026-06-03. Full citations in the Research evidence section.

---

## Design principles

These govern how the SGS layer and WooCommerce relate to each other. Ported from Spec 25 verbatim-in-substance.

1. **WC is optional at the framework level.** A marketing site that installs no WooCommerce pays zero penalty: no CPT, no extra CSS, no extra JS. Per-site capability flags govern registration.
2. **The SGS card is always the authoring wrapper.** Clients design, configure, and publish via SGS block inspector controls, never via WooCommerce's block editor or classic meta boxes.
3. **WC is the primary commerce backing store.** When WooCommerce is present, it owns price/image/stock/variants/cart. The SGS layer reads from WC and bridges those values into SGS blocks. Duplicating WC data in custom meta would create two sources of truth.
4. **Graceful degradation, not feature gating.** When WooCommerce is absent, the same blocks fall back to the `sgs_product` CPT. The client UX is identical; only the data source changes.
5. **No WC bundle on marketing pages.** The `sgs/*` card blocks never load WooCommerce's React bundle. WP Interactivity API + the WC Store REST API replace it at approximately 12 KB.
6. **SGS-specific config always lives in custom meta (updated - supersedes Spec 25 §principle-6).** `_sgs_variation_sets` (display modes, content-impact maps) lives in custom meta as SGS-specific config WC does not model. HOWEVER, `_sgs_sku_matrix` is dropped: for WC products, variation commerce data comes from WC (read-through); WC variations ARE the matrix. `_sgs_variation_sets` is retired for WC products for all commerce purposes (stock, pricing, availability) and is presentation/config only (display mode, `display_as`, swatch config). This supersedes the original Spec 25 principle-6 position that said `_sgs_sku_matrix` lives in custom meta "regardless of WC". See D149/D151 and the configurator chapter below.
7. **R-31-14 clean.** `render.php` branches on the explicit `sourceMode` attr, never on `empty($content)`.

---

## Feature and status map

Merged from Spec 25's feature-map table and the configurator's phasing. Rows superseded by the configurator chapter are marked.

| Feature | Status | Primary files | D-ref | Spec section |
|---------|--------|---------------|-------|--------------|
| `sgs/product-card` Typed mode (**BUILT-IN-ELEMENT renderer, ZERO InnerBlocks** — superseded the v1.3.0 InnerBlocks-shell) | SHIPPED | `src/blocks/product-card/block.json` (v1.16.3), `render.php`, `includes/product-card-builtin-render.php` | **D204** (was D148) | FR-24-2 amended |
| `sgs/product-card` Typed-mode TRANSITION BRIDGE (echo `$content` path for pre-FP-H page-144 clones only) | ACTIVE-TEMPORARY | `render.php` (typed branch, gated on empty `productName` attr) | D204 | retirement checklist in §"Transition bridge retirement" below |
| `sgs/product-card` Bound mode - `sourceMode: wc-product` | SHIPPED (commit `6bcdf48c`) | `render.php`, `includes/class-product-bindings.php` | D151 | FR-24-2/3 |
| `sgs/product-card` Bound mode - `sourceMode: sgs-cpt` | SHIPPED (commit `6bcdf48c`) | `render.php`, `includes/content-types/class-product-cpt.php` | D151 | FR-24-2/3 |
| `sgs-product/field` Block Bindings source | SHIPPED (commit `6bcdf48c`) | `includes/class-product-bindings.php` | D151 | Binding source section |
| Editor product picker (lists WC products + CPT entries) | SHIPPED (commit `6bcdf48c`) | `src/blocks/product-card/edit.js` | D151 | FR-24-3 |
| `sourceMode` auto-set from picker (no client WC/CPT toggle) | SHIPPED (commit `6bcdf48c`) | `edit.js` | D151 | FR-24-3 |
| Add-to-cart via WC Store API (R-31-14-clean) | SHIPPED (commit `6bcdf48c`) | `render.php` (no-JS `<a>` fallback), `view.js` (pending guard) | D151 | FR-24-2 |
| `sgs/cart` WooCommerce mini-cart count badge v1 | SHIPPED (commit `b6369224`) | `src/blocks/cart/` | D148 | Cart section |
| `sgs/cart` drawer Phase 2 | PLANNED | - | - | Cart section |
| `sgs_product` CPT registration | SHIPPED | `includes/content-types/class-product-cpt.php` | D148 | FR-24-1 |
| `custom-fields` CPT support (REST meta exposure gate) | SHIPPED (commit `7115a60d`) | `includes/content-types/class-product-cpt.php` | D148, D149 | FR-24-1 |
| `_sgs_variation_sets` meta + Gutenberg editor panel | SHIPPED (commit `7115a60d`) | `includes/content-types/class-product-cpt.php`, `product-card/edit.js` | D148 | FR-24-11 |
| `sgs/option-picker` atomic block (pill radio-group) | SHIPPED (commit `ee6807d3`) | `src/blocks/option-picker/` | D144, D148 | FR-24-15 |
| Converter emits `sgs/option-picker` for draft pill groups | SHIPPED (commit `c68b8cb6`, Phase D) | `scripts/orchestrator/converter_v2/convert.py`, `seed-slot-synonyms.py` | - | FR-24-15 |
| `sgs/content-collection` block (own WP_Query, selection rules) | SHIPPED (commit `c68b8cb6`, Phase E) | `src/blocks/content-collection/` (block.json v1.1.0, render.php) | - | FR-24-4/5/6 |
| Pill-to-price/image swap via WP Interactivity API (full live read) | **SHIPPED** (live: 0-XHR multi-axis swap of price/sale/stock/image from the seeded manifest; FR-27-A1/A2 D164/D165) | `src/blocks/product-card/view.js`, `includes/class-product-manifest.php` | D164, D165 | FR-27-A1/A2 |
| `_sgs_sku_matrix` (multi-SKU variable pricing) | SUPERSEDED - dropped; WC variations are the matrix; see principle 6 above | - | D144 (superseded) | FR-24-14, superseded by FR-27 |
| WC variable-product per-variant pricing/stock via WC-native variations | SUPERSEDED - this is now the primary path (FR-27-A1); the DEFERRED label is retired | - | D151 | FR-27-A1 |
| WC adapter for `sgs/content-collection` | PLANNED - triggers when a real shop client lands | Separate spec when in scope | D149 | FR-24 out-of-scope |
| `sgs/trust-bar` dual-mode (Typed repeater + Bound InnerBlocks) | **SHIPPED (commit `d6358f32`, 2026-06-01 — FR-24-10; render.php branches on `sourceMode` typed/bound)** | `src/blocks/trust-bar/` | D123 | FR-24-10 |
| Variable-product configurator Phase 1 — **SHIPPED** (Bean R-31-13 sign-off 2026-06-04). Sell-loop (U0/U6/U3/U4/U7/U5) + all 6 hardening units (U9 a11y+evidence/U10 perf INP152ms/U8 cache M-C1-staleness-fix/U11 WC<9.8 degradation/U1 capability-flag/U12 cloning+schema-compat tests) + 7 ship-gate UX fixes (width/pills/hover/product-page-links/near-black-desc/header-cart+feedback/no-image-placeholder). Acceptance 1-6 met. | SHIPPED (D165) | `src/blocks/product-card/`, `includes/class-product-manifest.php`, `class-product-bindings.php`, `class-cart-proxy.php`, `class-sgs-configurator-compat.php`, `class-sgs-content-types-settings.php`, `content-types/class-product-cpt.php`, `theme/sgs-theme/parts/header.html`, `scripts/seed-48-sku-fixture.php`, `tests/js/configurator-schema-compat.test.js`, `tests/php/ConfiguratorCompatTest.php`, `.claude/reports/sgs-configurator-moat-evidence.md` | D162, D164, D165 | FR-27-A/B/C/G/H/I-MVP |
| Variable-product configurator Phase 2 — **COMPLETE** (Cluster A D171 + Cluster B SEO D173 + Cluster C authoring/go-live 2026-06-05); Bean R-31-13 sign-off granted on each cluster. **Cluster A** (display, live-verified on canary 540): Step 0 foundations; B2 swatches + I2 build-time WCAG auto-contrast (6cdff8d0); TAX-UI (FR-27-H3, 9e26de74); B3 per-unit "£x/bar" derived live + cosmetic badge reusing `sgs/label` + on-sale "Sale" badge + WC variation-editor authoring (ceb4e04a/5fe7cfd5); A4 per-variation gallery + thumbnail strip + prefetch + editable `imageHeight` + media-picker authoring (77dccc9f/48fc54b7); C2 3-state sold-out-vs-unavailable SR text; Step-7 demand analytics privacy-safe REST (`/sgs/v1/demand/attempt`, SHA-256, ZERO PII) + admin (771f43ad); ESCAPE-AUDIT + QA-VIS(axe-0) gates passed (28607ac4). **Cluster B** (SEO, live-verified): E1 ProductGroup+hasVariant JSON-LD (6ef7e7c6, Rich Results 0 errors); E2 canonical escape-hatch (ba96a4ff); E3 OG + sitemap-lastmod + breadcrumb-block-placement (325b521f) — image-sitemap clause DESCOPED (53b85d7c); F1 SSR no-JS audit passed; manifest context-cap regression self-caught + fixed (3a1e95df). **Cluster C** (authoring + go-live) — see the Phase-R rows below, all SHIPPED. | COMPLETE | `includes/{class-configurator-meta,configurator-head,configurator-term-fields,configurator-variation-fields,render-helpers,class-product-manifest,class-product-bindings,class-demand-analytics,demand-analytics-admin,class-product-schema,class-product-canonical,class-product-sitemap}.php`, `src/blocks/{option-picker,product-card}/`, `scripts/seed-48-sku-fixture-v2.php` | D171, D173 | Cluster A + B + C all done |
| FR-27-R1 authoring controller (WC data-store set_*()+save(), nonce, per-object edit_post, lookup regen) | **SHIPPED** (pulled forward from Phase R into Cluster C per D-2026-06-04 "complete whole spec before launch") | `includes/class-product-authoring.php` + `-args.php` + shared `class-product-authoring-security.php` | f747e58a | FR-27-R1 |
| FR-27-R2 attribute/term provisioning + cartesian generate + upsert dedup + transactional rollback | **SHIPPED** + golden-master byte-identity + 0-orphan rollback + sibling-safety live-proven. EXTRAS: `bulk_update` endpoint, merge-by-union parent attrs, 300-combo cap, triple-gated injected-failure test hook | `includes/class-product-provisioning.php` + `-args.php` + `-helpers.php` | e62f337f | FR-27-R2 |
| FR-27-R3 presentation-authoring UI (variesBy term-screen select; swatch/gallery/divisor/label already in Cluster A) + edit-safety (slug-rename + delete-with-orders warnings + orphan-meta cleanup) | **SHIPPED** | `includes/configurator-term-fields.php`, `class-configurator-edit-safety.php` | dd9d0d7d | FR-27-R3 |
| FR-27-PREFLIGHT hard go-live gate (transition_post_status revert-to-draft on £0/no-image/draft/over-cap/no-variesby/invalid-jsonld) + cart £0 422 guard + GET /preflight pre-check + weekly health cron | **SHIPPED**; invalid_jsonld publish-gated (27e54132); QA-AUTHORING e2e PASS (live: bad→draft, valid→publish, full author→publish→rich-results) | `includes/class-product-preflight.php`, `class-cart-proxy.php` (£0 layer) | dd9d0d7d, 27e54132 | FR-27-PREFLIGHT |
| FR-27-R4 agency slug-templates (template CPT + export/import/apply REST + WC product-editor panel) | **SHIPPED 2026-06-10** (D202); live round-trip proven (export 540 → import → apply → fresh product publishes + renders 16 pills); visual pass `0d7badb8`+`f5f3449b`+report `db89ebae` | `includes/class-product-templates*.php` (7), `product-template-fields*.php` | 0d7badb8, f5f3449b | FR-27-R4 |
| FR-27-F2 AI-citation+feed: GET /sgs/v1/merchant-feed + /llms.txt + /llms-full.txt + sgs/product-faq block (FAQPage JSON-LD) | **SHIPPED 2026-06-10** (D202, built from the D197 research pack); red-team BLOCK (search-only exfil) fixed pre-commit; exfil + feed↔schema parity probes PASS on canary | `includes/class-product-feed*.php` (4), `class-llms-txt*.php` (3), `product-faq-schema.php`, `src/blocks/product-faq{,-item}/` | 95754224 | FR-27-F2 |
| FR-27-R5 AI-builder | **NOT BUILT — DECISION-GATED** (the last unbuilt FR; the OC-Protector stall trap — design via /brainstorming only; does NOT block a first client shop) | - | D168 | FR-27-R5 |

---

## Architecture

### Card and collection layer

```
Content type capability (per-site flag)
        |  registers
        v
sgs_product CPT  ---fields (show_in_rest)---->  Block Bindings sources
  (title, sgs_price, sgs_featured,                (core/post-meta + custom
   image, description, _sgs_variation_sets)        sgs-product/field source)
        |                                               |
        | queried by                                    | binds field slots of
        v                                               v
sgs/content-collection  ---loop template---->  dual-mode card (sgs/product-card)
  (dedicated block, own WP_Query;               Typed mode  -> InnerBlocks ($content)
   named conditions in render.php)              Bound mode  -> field slots bound to CPT/WC
        |
        v
   designed empty state (server-rendered)
```

- **Data source:** custom CPT, registered per-site. No WooCommerce required for the base layer.
- **Query engine:** dedicated `sgs/content-collection` block with its own `WP_Query`. Named selection presets are resolved via `WP_Query` args in `render.php`. The `query_loop_block_query_vars` PHP filter is not needed (Open Question FR-24 #1 resolved, Phase E 2026-06-03).
- **Field surfacing:** Block Bindings API (`register_meta(show_in_rest:true)` + `register_block_bindings_source()` for computed/derived fields such as formatted price).
- **Card:** the existing presentational cards, made dual-mode (FR-24-2). Typed mode equals the FR-31-6 InnerBlocks shape (Spec 22), so the clone pipeline is unaffected.
- **D149 / D151 dual-source Bound mode (decided 2026-06-02, refined 2026-06-03).** The card's Bound-mode data source is dual-source: when WooCommerce is present, the card binds to WooCommerce-native product data (price/image/stock/variations via WC's own meta and REST endpoints); when WooCommerce is absent, it falls back to the `sgs_product` CPT meta. The source is auto-detected from the product picker (no client-facing WC/CPT toggle). `custom-fields` CPT support is a REST-exposure flag, not a storage choice.

### Variable-product configurator layer

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
  +-- /sgs/v1/cart/add-item proxy -- validates (IDOR + attr-match + stock + caps) then
  |     validates then adds IN-PROCESS via WC()->cart->add_to_cart (server-authoritative; the single add-to-cart path; a woocommerce_add_to_cart_validation filter holds the cap on direct calls too)
  +-- presentation meta -- term_meta (swatch) + variation postmeta (discount label,
  |     per-unit DIVISOR, gallery IDs) + block attributes (display-subset, flags)
  +-- schema emitter -- ProductGroup + hasVariant JSON-LD (Merchant-complete), SSR
  +-- [Phase R] SGS authoring controller (wraps WC data-store classes) + AI-builder
  +-- sgs_product CPT -- no-WooCommerce fallback ONLY
```

**Inter-block state (load-bearing).** The `sgs/product-card` is the single Interactivity store and the one shared `data-wp-context` (manifest + selection). Child `sgs/option-pickers` (one per axis) read the shared context and write their selection back; the card derives price/image/availability. Option-pickers own no commerce state.

**Manifest payload.** Seeded inline at SSR: (a) a sparse valid-combinations set (list of valid attribute-tuples + per-variation price as display-minor-int + a stock flag + a `pctOff` int, NOT a dense per-variation grid) and (b) the default variation's image/price/copy as concrete literals. The fast path holds to approximately 200-300 variations within the cap. Above the cap, the matrix is prefetched once on first interaction with the card (`pointerenter`/`focusin`), not on a pill `change`, so the first selection is still local (no per-select XHR). Per-variation galleries/long-copy are prefetched the same way. Cap: the `data-wp-context` JSON is at most 24 KB AND the JSON-LD `<script>` is at most 16 KB (measured separately); `hasVariant` has at most 50 representative children with `AggregateOffer.offerCount` equal to the true total. Above either cap, the configurator switches to the prefetch path.

**The clean split.** WC-owned (read-through): price/sale (+schedule), stock, variation images, combination validity, SKU, GTIN, cart/checkout. SGS presentation/config: swatch colour/image (`term_meta`); discount-type label (cosmetic-only, save-time-rejected if it contains a numeric percentage) (`postmeta`); per-unit pricing (a stored unit DIVISOR `_sgs_unit_divisor`, the displayed £/unit DERIVED at render from the live WC price divided by the divisor, NOT a free-text note); gallery IDs (`postmeta`); display-subset + flags (block attributes).

### Per-site WC-optional architecture

A site enables or disables the WooCommerce layer via a per-site capability flag (mechanism TBD: `wp_options` or theme support flag; see open question FR-24 #4). When disabled:

- `sgs_product` CPT does not register.
- `class-product-bindings.php` still loads but the WC branch in `get_value()` is unreachable (no WC products exist).
- `sgs/cart` renders nothing (a comment node, no visible output) unless WC is active.
- No WooCommerce plugin dependency is declared in `sgs-blocks.php`. The plugin runs clean on non-WC sites.

When WooCommerce is active, the SGS layer detects it via `function_exists('wc_get_product')`. No hard `require` or plugin header dependency.

---

## Data model

### `sgs_product` CPT

First content type in the framework. Registered via `includes/content-types/class-product-cpt.php`. The CPT MUST declare `'supports' => [..., 'custom-fields']` in `register_post_type()`. This is the REST-exposure flag that causes WordPress to include the `meta` field in the CPT's REST schema. Without it, `register_meta( ..., 'show_in_rest' => true )` registers meta globally but the CPT's REST schema omits the `meta` object entirely, and Block Bindings/the editor panel cannot surface or persist meta values (D148 bug found on first live test).

All meta keys registered via `register_meta()` with `show_in_rest => true`.

| Meta key | Type | Leading underscore? | Purpose |
|----------|------|---------------------|---------|
| `sgs_price` | number | No | Base price (lowest pack / single price) |
| `sgs_price_note` | string | No | Label beside price, e.g. "from" |
| `sgs_featured` | boolean | No | Drives FR-24-5 "Featured" selection rule |
| `sgs_views` | number | No | View counter for "Most-popular" rule (FR-24-7, off by default) |
| `_sgs_variation_sets` | string (JSON-encoded array) | Yes, private | SGS display config: per-type `display_as` + `content_impact`. PRESENTATION/CONFIG ONLY for WC products (not commerce data). |
| `_sgs_unit_divisor` | number | Yes, private | Per-unit price divisor: £/unit = live WC price divided by this value. Derived at render, never stored as a price. |

**`_sgs_sku_matrix` is dropped (superseded).** For WC products, WC variations are the matrix. The `_sgs_sku_matrix` key was planned (Spec 24 FR-24-14) but is not built and will not be built. See principle 6 above.

Image: featured image or an image meta field. Taxonomies: `sgs_product_cat`, `sgs_product_tag`.

Later content types (`sgs_testimonial`, `sgs_team`, `sgs_case_study`) follow the same declarative registration with their own field sets. The mechanism is shared (R-31-9).

### Per-variation presentation meta (configurator layer)

Stored on WC objects (term meta + variation postmeta), not on the `sgs_product` CPT:

| Key / location | Type | Purpose |
|----------------|------|---------|
| `_sgs_swatch_color` (term meta) | string | Swatch hex colour |
| `_sgs_swatch_image_id` (term meta) | int | Swatch image attachment ID (validated via `wp_attachment_is_image()`) |
| `_sgs_variation_gallery` (variation postmeta) | JSON array of ints | Per-variation gallery image IDs |
| `_sgs_unit_divisor` (variation postmeta or CPT meta) | number | Divisor for derived £/unit display |
| `_sgs_variation_upsert_key` (variation postmeta, Phase R) | string | Sorted slug-joined attribute combo for dedup on authoring re-run |
| `_sgs_variesby_value` (term meta, Phase 2) | string | Closed-enum `variesBy` value for JSON-LD (`color`, `size`, `material`, etc.) |

---

## `sgs-product/field` binding source

**Registered name:** `sgs-product/field`
**File:** `plugins/sgs-blocks/includes/class-product-bindings.php`
**Registered on:** `init` priority 15 (after CPT registration at priority 5).

`uses_context: ['postId', 'postType']`

`source_args.source` controls the data backend per instance:
- `'auto'` -- derives from the linked product type (WC product uses the WC path; `sgs_product` post uses the CPT path).
- `'wc'` -- WooCommerce path: `wc_get_product()` for price via `get_price_html()` (yields ranges "£10-£30" for variable products); image via `get_image_id()`; stock via `get_availability()`.
- `'cpt'` -- CPT path: `get_post_meta($id, 'sgs_price', true)`, `get_post_meta($id, 'sgs_price_note', true)`.

`_sgs_variation_sets` (`get_post_meta($id, '_sgs_variation_sets', true)`) is always read from CPT meta. It is SGS-specific config WooCommerce does not model.

---

## Blocks (shipped layer) -- inherited from Spec 24

The FR-24-x requirements below are the shipped card-system requirements. They are stable; cross-references elsewhere remain valid.

### FR-24-1 -- Generic content CPT registration

A framework mechanism registers content CPTs (`sgs_product` first) with a declarative field set (title, image, price, description, badges, pack-options, plus arbitrary meta). CPTs register only when a site enables that content type (per-site capability flag), so marketing sites stay lean. Fields registered with `show_in_rest => true` and non-underscore keys so Block Bindings can surface them. The `sgs_product` CPT MUST declare `'supports' => [..., 'custom-fields']` in `register_post_type()` (see data model above).

### FR-24-2 -- Dual-mode card

The existing presentational card (`sgs/product-card`, etc.) has a per-instance "Source" toggle in the inspector: **Typed** (current behaviour -- fields via InnerBlocks/typed) or **Bound** (each field slot binds to the linked CPT entry's meta via `core/post-meta` or the `sgs-product/field` custom binding source). Same card markup, two feed modes. No second block, no second render path beyond the binding resolution.

**AMENDED (Bean sign-off 2026-06-10, FP-H design gate — APPROVED):** the card is a BUILT-IN-ELEMENT block in ALL modes — the two modes differ ONLY in each element's data source (typed = operator-entered attributes; bound = the live product/manifest), never in how elements render. Bound mode was already built-in by construction; this amendment completes the architecture by removing typed mode's InnerBlocks: every commerce element (image, name, description, price+note, badge, CTA) renders from the block's own typed attributes via the element-MIRROR pattern (each element mirrors its source block's full control set — CTA↔`sgs/button`, image↔`sgs/media`, badge↔`sgs/label` — through shared helpers, with the WS-4 auto-propagation rule), ZERO InnerBlocks in typed mode. No deprecation path (Bean 2026-06-10: the typed card is not yet used in any content). The pack-size picker stays the live configurator subsystem; per-instance variation-axis visibility is a card control (show/hide each of the bound product's axes; display-level only — never alters variations or the manifest). CTA model (approved): max 2 text buttons (1 primary + 1 secondary; behaviours add-to-basket / buy-now / learn-more — buy-now = add + straight to checkout through the same cart-proxy guards), express-pay as a phase-2 gateway-rendered toggle (official gateway buttons only, never self-painted). **Canonical draft BEM vocabulary for the cloned card (FP-DRAFT-FIX, locked 2026-06-10):** one prefix `sgs-product-card`; variants as root modifiers `--featured`/`--trial` → `variantStyle`; elements `__title`/`__image`/`__body`/`__description`/`__pill-group`/`__pill`(+`__pill--active`)/`__price-row`/`__price`/`__price-note`/`__tag--trial`; the `<h3>` carries `sgs-product-card__title` → `productName` (REQUIRED — Bean correction 2026-06-10: an unclassed h3 falls back to the tag-mapping table and emits a `core/heading` child block, contradicting zero-InnerBlocks; the fallback is legacy-only); nested CTA = standalone `sgs-button` block. Full table: Spec 02 §"Canonical draft BEM vocabulary"; gate doc: `.claude/reports/wave2/FP-E-FP-H-DESIGN-GATE-2026-06-10.md`.

**`overrideElements` semantic contract (D204 — the only place this is specced; render.php `sgs_product_card_resolve_element()` enforces it).** An array attr (enum members `name|description|badge|image|cta`; `block.json` constrains it via `items.enum`). Per element: toggle OFF → the LIVE product value renders and the operator's typed attr value is PRESERVED untouched (so toggling back needs no retyping); toggle ON → the typed value renders UNLESS it is empty, in which case the LIVE value still renders (an empty override never blanks a card). **PRICE IS NEVER A MEMBER** (page↔schema↔feed parity / DMCC — deliberately absent from the enum at every layer). `badge` is INERT when `variantStyle='standard'` (no badge field exists for that variant — by design, not a bug). `cta` override resolves LABEL and URL independently (same flag, two `resolve_element()` calls with different typed values), so an operator may override the label while leaving the URL pointing at the live product page. Image override = DEFAULT image only: it substitutes the single SSR/seed fallback URL; variation-specific image swaps stay live on the variable branch (the `data-wp-bind--src` binds are INTENTIONALLY unconditional there and INTENTIONALLY absent on the non-variable branch — do NOT "fix" the asymmetry; see `render.php` cross-referenced comments). `sgs-cpt` connected cards get the toggles but no live-value help text or gallery strip (no `/wc/v3` record — intended degradation).

**Transition bridge retirement (D204 — actionable checklist; the bridge is ACTIVE-TEMPORARY).** The typed branch echoes the legacy InnerBlocks `$content` only when `sourceMode='typed'` AND `productName` is empty (NEVER `empty($content)` — R-31-14). To retire it safely: (1) re-run `/sgs-clone` on page-144 and confirm no emitted `wp:sgs/product-card` carries `"productName":""`; (2) grep ALL post_content for `<!-- wp:sgs/product-card` with `"sourceMode":"typed"` AND `"productName":""` → must return zero; (3) only then remove the `else` branch in `render.php` (the `echo SGS_Container_Wrapper::render(... $content ...)` path). Tracked OPEN in `parking.md` (`P-FP-H-BRIDGE-RETIRE`) until done.

**ItemList emission threshold (FR-27-E1, D204).** ONE page-level ItemList per singular front-end page (`Product_Item_List`, the recursive block-tree walker = the single shared API `collect_page_product_ids()`, also consumed by the ProductGroup focus gate). Sources: `wc-product` card-grids + loose `wc-product` product-cards (NOT `sgs-cpt` — CPT products have no canonical WC URL for a `ListItem`/`ProductGroup`; documented exclusion). Deduped (first position wins). Emits when the final list has **≥2 entries OR (≥1 AND at least one grid contributed)** — a query grid matching one product is still a listing surface; a single loose card is an editorial mention, not a listing. **Every collection/emission boundary gates on `Product_Item_List::is_publicly_listable()` (publish + `is_visible()`) so draft/private/hidden products never leak a URL into public JSON-LD (council-confirmed leak, closed D204).** SEC-9 defer to Yoast/RankMath. ProductGroup (single-product JSON-LD, `configurator-head.php`): `is_product()` pages always emit; otherwise emit only when exactly ONE distinct connected product is on the page.

### FR-24-3 -- Item picker

In Bound mode, an inspector control lets the operator pick a specific CPT entry (searchable select of all items of that type, plus WC products when WC is active). The card then displays that entry's data live; editing the entry updates every card that references it (single source of truth). `sourceMode` is auto-set from the picker: `wc-product` | `sgs-cpt` | `typed`. No client-facing WC/CPT toggle.

### FR-24-4 -- Query/collection block (SHIPPED Phase E, uncommitted, 2026-06-03)

A dedicated `sgs/content-collection` block (block.json v1.1.0, own `WP_Query`) iterates a chosen CPT and renders each result through the dual-mode card in Bound mode. Inspector controls: source content type, count/limit, and selection rule. Decision: dedicated block over core Query Loop (Open Question FR-24 #1 resolved).

### FR-24-5 -- Named-condition selection (SHIPPED Phase E, uncommitted, 2026-06-03)

The collection block exposes selection presets as named inspector controls, resolved via `WP_Query` args in `render.php`:

| `selectionRule` value | Query behaviour |
|-----------------------|----------------|
| `newest` | `orderby: date`, `order: DESC` |
| `featured` | `meta_query: sgs_featured = true`, `orderby: date DESC` tiebreak |
| `most-expensive` | `meta_key: sgs_price`, `orderby: meta_value_num`, `order: DESC` |
| `cheapest` | `meta_key: sgs_price`, `orderby: meta_value_num`, `order: ASC` |
| `most-popular` | `meta_key: sgs_views`, `orderby: meta_value_num DESC`, date DESC fallback |
| `handpicked` | `post__in: handpickedIds[]`, ordered by the IDs array |
| `category` | `tax_query` on `sgs_product_cat`, `orderby: date DESC` |

Conditions are meta-driven, not hardcoded per content type (R-31-1, R-31-9). `contentType` whitelisted via `sgs_content_collection_post_types` filter (default: `['sgs_product', 'product']`). Count capped server-side 1-24.

### FR-24-6 -- Designed empty state (SHIPPED Phase E, uncommitted, 2026-06-03)

When a query matches zero items (or a bound entry is deleted), the card/collection renders the operator-editable `emptyMessage` attribute as a styled placeholder. Never blank, always server-rendered (no-JS safe). The collection also renders an empty state when the bound product has been deleted (IDOR-guarded: `get_post_type($id)` check ensures the picked ID is the correct post type before rendering).

### FR-24-7 -- Popularity counter (optional)

A lightweight, privacy-safe view/interaction counter writes to `sgs_views` meta to power "Most-popular" without analytics coupling. Opt-in; off by default. Sales-based popularity requires the WooCommerce adapter.

### FR-24-8 -- Pattern Override integration (WP 7.0)

Each card field slot declares `allowedBindings`; a card registered as a synced pattern exposes its bound fields as overridable slots, so a "product card" pattern is reusable site-wide with per-instance overrides.

### FR-24-9 -- Clone-pipeline compatibility

The dual-mode card's Typed mode is exactly the FR-31-6 InnerBlocks shape the converter already emits (see Spec 22). The query-driven layer is additive. The converter keeps emitting Typed cards; Bound/collection is an operator-authoring feature, not a converter output.

### FR-24-10 -- Curated-content blocks are dual-mode too (Bean-directed, 2026-06-01)

> **⚠ SUPERSEDED FOR CLONING (2026-06-06):** The `sourceMode='bound'` converter path described below is a **TEST CHEAT** — the converter mirrors the draft DOM by echoing badge InnerBlocks into `$content`, instead of converting to native `items[]` attributes. This violates the convert-not-mirror rule and is being purged per `.claude/reports/2026-06-06-bound-mode-purge-plan.md`. **ONLY the live WC configurator modes (`sourceMode='wc-product'` / `'sgs-cpt'`) are legitimate bound modes.** For cloning, `sgs/trust-bar` MUST be converted to **Typed mode** with a populated `items[]` array. The factual record below is preserved for historical context.

The same Typed-vs-Bound split applies to curated-content blocks whose editor is a rich repeater the clone pipeline must also feed. `sgs/trust-bar` is the first case.

The conflict: a naive FR-31-6 InnerBlocks migration of `sgs/trust-bar` would gut its curated client editor (the icon-circle item repeater + the 3 badge variants `icon-circle`/`text-only`/`image-badge` + autoScroll + title) and replace it with raw block nesting, violating "client experience is primary". The dual-mode answer: the block keeps its **Typed mode** (the existing curated `items[]` repeater + variant inspector) AND gains a **Bound mode** where it renders `$content` so the converter's emitted badge children render. A per-instance Source toggle (mirrors FR-24-2) selects which path drives `render.php`. R-31-14 clean: `render.php` branches on the explicit mode attr, not on `empty($content)`. The two modes are distinct authored states, not a server-side scalar fallback hack.

The badge children use existing primitives (container + icon + text/label + media for image-badge). No new atomic block. All 18 trust-bar attrs + 3 variants are preserved (full schema enumerated 2026-06-01: badgeStyle, items, title, titleColour/FontSize, labelColour/FontSize, badgeSize, iconCircle*, iconColour, textColour, columns, gap, showPendingInEditor, autoScroll*). `deprecated.js` keeps the v2 cert-bar + v3 rename entries; a new entry handles the mode attr default.

Acceptance: FR-31-18 structural parity. `.sgs-trust-bar` renders the converter's 4 badge children in Bound mode AND the curated repeater still works in Typed mode (editor smoke test, no "unexpected content" warning).

Status: SHIPPED (commit `d6358f32`, 2026-06-01). `render.php` branches on the explicit `sourceMode` (typed = curated repeater / bound = converter's badge InnerBlocks); ~~converter sets `sourceMode='bound'` on cloned trust-bars~~ — **the bound-emit converter path is a cheat; see superseding note above.**

### FR-24-11 to FR-24-17 -- Variation-sets and `sgs/option-picker`

Design ratified 2026-06-01 via D144. Phase A + Phase B BUILT + SHIPPED 2026-06-02. Full design at `.claude/reports/2026-06-01-product-card-option-picker-design.md`.

**FR-24-11 -- `_sgs_variation_sets` CPT meta.** Per-type `content_impact` map. Each type also carries a `display_as` mode: `pills` | `static-list` | `hidden` (D144.1). For WC products this is presentation/config only; commerce data comes from WC.

**FR-24-12 -- Content-impact map drives card rendering, not block logic.** R-31-9.

**FR-24-13 -- Per-instance Interactivity API store.** The card owns the store; option-pickers read/write shared context. (For the full configurator: see the inter-block-state model in the architecture section and FR-27-I-MVP.)

**FR-24-14 -- Phase-1 slot-conflict priority.** First type wins; SKU matrix deferred. `_sgs_sku_matrix` is superseded entirely for WC products (see principle 6). For CPT-only (no-WC) products, multi-variant pricing remains a Phase-2 candidate but the `_sgs_sku_matrix` key is removed from the data model.

**FR-24-15 -- `sgs/option-picker` atomic block.** Radio-group semantics via visually-hidden `<input type=radio>` + `<label>` + pill `<span>`, CSS `:checked` active state, bubbling `sgs:option-selected` event. NOT `sgs/button`. SHIPPED 2026-06-02 (commit `ee6807d3`). Battle-ready for standalone use and converter emit target.

Source toggle (Typed/Bound) appears in both the block toolbar AND the inspector (one attr, two controls) (D144.5). Pill style: filled inside product-card / outlined as global default; three CSS states: resting / hover+focus ("considering") / `:checked` ("selected") (D144.3).

**FR-24-16 -- No-JS default state.** Default variation fully rendered server-side; no pill interaction required to see product info.

**FR-24-17 -- `aria-live` on dynamic slots.** Price/stock/image slots that update on pill selection carry `aria-live="polite"`.

**D144 ratified decisions:**
1. Per-type `display_as`: `pills` (interactive) | `static-list` (renders "Available in N flavours: A, B, C", non-interactive selling point) | `hidden`. PLUS a card-level "price only" toggle that sets all pickers hidden so the card shows just "From £x".
2. SKU matrix deferred and now superseded for WC products.
3. Pill style and three CSS states as above.
4. Clone emit: emit `sgs/option-picker` directly from the clone. The converter outputs the picker block for a pill group via TRUTH-SPEC + slot_synonyms/slots updates.
5. Source toggle in both toolbar and inspector.
6. Variation-sets editor UI: Gutenberg panel, not classic meta box.

### `sgs/option-picker` -- converter emit (Phase D, SHIPPED uncommitted 2026-06-03)

Mechanism:

1. A `slots` DB row aliases `pill-group`, `pills`, `option-group`, `picker` to `sgs/option-picker` with `has_inner_blocks=0` (populated via `seed-slot-synonyms.py`).
2. `convert.py` G3 path: when `composition_role='content-block'` and `has_inner_blocks=0`, the walker calls `_atomic_attrs_for(node, slug, allow_text_fallback=False)`.
3. The `sgs/option-picker` handler inside `_atomic_attrs_for` extracts `optionItems` (array of `{key, label}`), `defaultSelected`, and `typeKey` from child `<li>`/`<label>`/pill elements.
4. Emits: `<!-- wp:sgs/option-picker {"optionItems":[...],"defaultSelected":"...","typeKey":"..."} /-->`.

Live-verified emitting the correct self-closing block markup.

### `sgs/cart` (badge v1)

Status: SHIPPED (commit `b6369224`, D148).

| Phase | What | Status |
|-------|------|--------|
| v1 -- count badge | Store API `GET /wc/store/v1/cart`; SSR count=0; WP Interactivity API re-hydrates on load; no jQuery; `cart-fragments` dequeued | SHIPPED |
| v2 -- drawer | Slide-in mini-cart listing items + quantities + subtotal, driven by Store API | PLANNED |
| v3 -- add-to-cart integration | Badge count increments when `sgs/product-card` fires `wc-blocks_added_to_cart` | SHIPPED (fires via product-card view.js Store API path; badge listens) |

Primary files: `src/blocks/cart/` (block.json, render.php, view.js, style.css).

---

## Phasing (cards and collection layer)

- **Phase A -- `sgs/option-picker` atomic block.** FR-24-15. SHIPPED 2026-06-02.
- **Phase B -- `_sgs_variation_sets` CPT meta + Gutenberg editor panel.** FR-24-11, FR-24-12. SHIPPED 2026-06-02: `_sgs_variation_sets` meta registered with `show_in_rest => true`; editor panel built; meta round-trips via REST (live-verified). `sgs_product` CPT has `custom-fields` support.
- **Phase C -- Card Bound mode (wrapper+bridge, D151, refines D149).** FR-24-2, FR-24-3, FR-24-9. DESIGN SIGNED OFF 2026-06-02 (D151), research-gated, ready to build. The SGS card is the always-on unified authoring wrapper; WooCommerce (the primary backing store) supplies base price/image/stock when present, with the `sgs_product` CPT as the graceful-degradation path when WC is absent. Source is auto from the product picker (lists WC products + `sgs_product` entries; sets `sourceMode` attr automatically; no client-facing WC/CPT toggle). Pills always come from the SGS `_sgs_variation_sets` layer + `sgs/option-picker` even on WC sites (WC-native per-variant pricing/stock is deferred advanced opt-in for real multi-SKU shops). Add-to-cart is in Phase C: adds the bound WC product via the WC Store API, firing `wc-blocks_added_to_cart` so the `sgs/cart` badge updates (reuses the Task-A-verified path). Architecture: single binding source `sgs-product/field` (`uses_context:['postId']`, routes WC vs CPT via `source_args.source`); `wc_get_product()->get_price_html()` yields variable-product ranges free; front-end pill-to-price/image swap via the WP Interactivity API seeded server-side (zero wc-blocks React bundle, approximately 12 KB). Option-picker event contract (verified): `sgs:option-selected`, `detail:{ typeKey, selectedKey, contentImpact }`. See D151 (+ D149 origin). NOTE: the full live read-through swap (using live WC variation data) is the MVP of the variable-product configurator: FR-27-A1/A2. Phase C delivers the structural wiring; FR-27-A1/A2 delivers the populated data.
- **Phase D -- Clone-emit.** FR-24-15 pipeline wiring. SHIPPED (commit `c68b8cb6`, 2026-06-03). See FR-24-15 above.
- **Phase E -- Collection + conditions.** FR-24-4, FR-24-5, FR-24-6. SHIPPED (commit `c68b8cb6`, 2026-06-03).
- **Phase F -- Generalise.** Register `sgs_testimonial` / `sgs_team` / `sgs_case_study` via the same mechanism; prove FR-24-9 acceptance criterion 6.
- **Phase G -- Polish.** FR-24-7 popularity counter, FR-24-8 Pattern Overrides, aspect-ratio lock + hover controls.

---

## Acceptance criteria (cards and collection layer)

1. With the product content-type enabled, a client can add a Product (CPT entry) and see it in the item picker. No code.
2. A `sgs/product-card` set to Bound mode + a picked product renders that product's live data; editing the product updates the card.
3. A `sgs/content-collection` with "Featured" preset shows only featured products; "Most-expensive" sorts by price desc. Both from inspector toggles, no code.
4. An empty query renders the designed placeholder, not a blank region.
5. A marketing site with the product type DISABLED ships no product CPT, no extra weight.
6. The same collection block, pointed at `sgs_testimonial`, works with zero new block code.
7. The clone pipeline still emits Typed cards unchanged (Spec 22 regression check passes).

---

## Variable-product configurator (new chapter)

> **Decision (Bean, 2026-06-03, D-pending):** the SGS card + option-picker become a variable-product configurator that wraps WooCommerce (WC = single source of truth; SGS adds the UI, the availability logic WC breaks above 30 variations, and the presentation WC cannot model). No commerce data is mirrored into custom storage.
>
> **Scope (Bean call, round-2 re-scope):** ship a small, real read-through configurator first (Phase 1, makes Mama's sell, approximately 1-2 weeks). Friendly authoring + the AI-builder are an explicit roadmap (Phase R), built when a 2nd shop client lands. The brutal qc-council flagged AI-builder-as-headline as the OC-Protector stall trap.
>
> **Moat (re-aimed):** the durable advantage is the end-to-end closed loop (SGS builds the shop AND it renders accessibly with SEO, no plugin-stitching) plus a first-mover WCAG 2.2 AA claim shipped loud now. The "no-React performance" edge is real but expiring (WooCommerce is migrating to the same lean approach), so we ride it, not bank on it. The AI-builder is a roadmap ambition, not a moat we can defend as uncopyable.
>
> **Clean-slate:** the SGS theme is live on no client site. No migration/back-compat obligations; change the existing build where there is tangible benefit.

### Goals (MVP-first order)

1. **(MVP)** A configurator where pills swap price/image/sale/stock, reading WooCommerce live. Mama's sells.
2. **(MVP)** Secure, no-oversell add-to-cart; WC server-authoritative on price + stock.
3. **(MVP)** WCAG 2.2 AA whole card; the first-mover accessibility claim, shipped + evidenced now.
4. **(MVP)** Cross-attribute availability past the 30-variation cliff.
5. **(Phase 2 — SHIPPED)** Best-in-class SEO + AI-discovery, server-rendered, full Merchant-Listings eligibility (Cluster B: E1/E2/E3/F1).
6. **(Friendly authoring — SHIPPED in Phase 2 Cluster C, not deferred.)** Friendly authoring that writes WC variations (R1 controller + R2 provisioning/cartesian/rollback) + edit-safety (R3) + a hard go-live PREFLIGHT gate. **COURSE-CHANGE (Bean, 2026-06-04):** v3 demoted authoring to "Phase R roadmap, build when a 2nd shop client lands"; Bean then decided to complete the WHOLE spec before launch, so authoring + PREFLIGHT were pulled forward and shipped. R4 (slug-templates) + F2 (AI-citation/feed) SHIPPED 2026-06-10 (D202). ONLY the AI-builder (R5) remains — decision-gated (does not block a first client shop).
7. Graceful degradation: WC simple product gives a plain card; no-WooCommerce site gives the `sgs_product` CPT.

### Non-goals (configurator)

- Rebuilding WC cart/checkout/payments/tax/shipping; mirroring WC commerce data; a combinatorial `_sgs_sku_matrix` in custom meta (superseded); per-instance content migration (clean slate).
- B2B/wholesale role pricing (Indus Foods), subscriptions/bundles, configurator analytics, multi-currency. These are sibling specs.

### Hard constraints (configurator)

- **WC = single source of truth.** Client sends IDs + an attribute object, never prices. Server recomputes + re-validates price AND stock at add-to-cart.
- **WC authoritative; SGS holds a seeded read-through CACHE reconciled server-side (reframed 2026-06-03 per the adversarial-council).** No DURABLE custom store of WC commerce data (presentation/config only in term meta / variation postmeta / block attributes). BUT be honest that the SSR-seeded manifest (per-variation price/sale/stock literals in `data-wp-context`) IS a short-lived read-through cache — so the freshness defence is the render-time `get_date_modified()` staleness guard (FR-27-G6), NOT a "we never mirror so nothing can go stale" assumption. The old slogan "never mirrored" made maintainers under-build freshness; the correct framing is "WC is authoritative; SGS reconciles its seeded cache against WC on every render + at add-to-cart".
- **All display bindings resolve against server-seeded context whose default equals the SSR literal** (Interactivity directives run server-side; binding to a JS-only getter wipes the SSR value; memory key `wp-interactivity-directives-wipe-ssr-when-bound-to-js-getters`). Per-variation derived values (% off) are seeded as literals, never computed in a client getter.
- **Pages stay fully cacheable.** Oversell protection is a live add-to-cart-click re-check (a single fragment call), NOT page-uncacheable rendering. Price/stock freshness via targeted purge on stock + sale-schedule hooks (see FR-27-G6).
- **Tax/currency correctness:** seed display prices from `wc_get_price_to_display()` (never own division); store decimals from `wc_get_price_decimals()` (not assumed 2dp); seed BOTH ex/inc-tax values OR cache-exclude the price fragment + vary on tax context (FR-27-H3).
- **The authoring write path (Phase R) wraps WC's high-level data-store classes** (`WC_Product_Variable`/`WC_Product_Variation` `set_*()`+`save()`) with explicit post-write side-effects (`wc_delete_product_transients()` + attribute-lookup regenerator + `woocommerce_update_product`), NOT raw postmeta and NOT the same-server REST batch as primary. A golden-master diff test vs the native editor runs every WC major.
- WCAG 2.2 AA whole card; mobile-first; 44px targets; `viewScriptModule`; Interactivity API only (no React/jQuery on the product page). Minimum WooCommerce 9.8; WC below 9.8 renders the card read-only with a static price (no configurator JS) + an admin notice (defined degradation, FR-27-A5).

### Functional requirements (grouped by phase)

Each FR carries a build-model recommendation and a holistic test strategy.

#### Phase 1 -- MVP (the read-through configurator that makes Mama's sell)

**FR-27-A1 -- Resolver reads WC variations live.** `sgs-product/field` resolves the WC variation set (price via `wc_get_price_to_display()`, regular/sale, stock, image, GTIN, attributes) via `wc_get_product()`. No `_sgs_variation_sets` commerce read on the WC path (static test asserts zero such reads in the WC branch). A WC simple product degrades to a plain card.
- Done when: a Bound WC variable product renders real values; a simple product renders a plain card; grep confirms no `_sgs_variation_sets` commerce read on the WC branch. Model: sonnet. Test: 48-SKU + simple fixtures vs `get_available_variations()`.

**FR-27-A2 -- Manifest seeded into the card's shared context (SSR, no-JS-safe, no per-select XHR).** Seed per the payload spec (sparse valid-combos + default literals), minor-int from `wc_get_price_to_display()`, decimals from `wc_get_price_decimals()`, currency `get_woocommerce_currency()` at request time. Default variation price/image/stock are SSR literals; all `data-wp-bind`/`data-wp-text` bind to seeded context (default equals literal). No XHR on a pill `change`; the long-tail prefetch (if any) fires on first card interaction (`pointerenter`/`focusin`), never on `change`.
- Done when: JS off shows default variation fully rendered + survives directive processing; JS on: pill change swaps with no XHR on change; context JSON is at most 24 KB. Model: opus (state + SSR guard) then sonnet. Test: JS-disabled fetch + network panel (no XHR on change) + size assert.

**FR-27-A3 -- `sgs_product` CPT = no-WooCommerce fallback, secured.** WC-absent sites use the CPT (`{key,label,price?,image?,description?}`; no stock/sale/availability). CPT REST writes require per-object `edit_post`; CPT prices display-only, never a checkout path; CPT not WC-purchasable; CPT REST not publicly writable. (Live IDOR on existing product meta: `auth_callback` `edit_posts`->`edit_post` patched in `class-product-cpt.php` (commit `d07a7e05`); **DEPLOYED + PROVEN LIVE 2026-06-03** — a contributor REST write of `sgs_price` on another author's product returns 403; admin write 200.)
- Done when: WC-absent CPT swap works; WC-present ignores CPT commerce meta; per-object capability enforced. Model: sonnet. Test: toggle WC; capability + IDOR fixtures.

**FR-27-A5 -- Defined degradation below WC 9.8 + WC-activation mode-switch.** On WC below 9.8: the card renders read-only (static default price, no configurator JS) + a dismissible admin notice naming the required version. On WC activation on a site that has `sgs-cpt` cards: a detection hook surfaces an admin prompt ("N product cards use the no-shop format -- link them to WooCommerce products?"), never a silent break.
- Done when: WC 9.7 renders the read-only card + notice; activating WC surfaces the migration prompt. Model: sonnet. Test: version-floor + activation-hook fixtures.

**FR-27-B1 -- WCAG 2.2 AA across the whole card (sprint + evidence now).** Option-picker: `<input type=radio>` + `<label>`, always-visible text label (never colour-only), radiogroup keyboard nav, 44px targets, `aria-disabled` + SR status on unavailable/OOS, focus-visible, `prefers-reduced-motion`. Card: `aria-live="polite"` on dynamic price/stock; focus management after add-to-cart. Publish the evidence sheet (FR-27-J1) on first ship to plant the first-mover claim.
- Done when (objective, axe-core is necessary-not-sufficient): (a) axe-core 0 violations; (b) keyboard-only: Tab reaches every pill, arrows navigate the radiogroup, no focus trap; (c) NVDA+Chrome announces label+state+price/stock change; (d) every target is at least 44x44px measured via computed bounding rect in Playwright. Model: sonnet + design-reviewer. Test: the four objective gates.

**FR-27-C1 -- Cross-attribute availability (snapshot + server re-check).** From the seeded valid-combos set, the card store greys (visible, `aria-disabled`, announced) options on other axes yielding no valid in-stock variation, both directions, any count (where native WC above 30 fails). Availability is snapshot-time; on a failed add-to-cart with HTTP 409 (stock), fire one `GET /wc/store/v1/products/{id}`, refresh the matrix, re-run grey-out, announce "that combination just sold out" via `aria-live`.
- Done when: 48-SKU gap fixture greys correctly both directions + announces; a post-load OOS selection is caught + re-synced; native WC (above 30) would fail. Model: opus (store) then sonnet. Test: the gap fixture + OOS-after-load recovery.

**FR-27-G1 -- Add-to-cart via the SGS proxy; WC server-authoritative. [BUILT + LIVE-VERIFIED 2026-06-03 — `includes/class-cart-proxy.php`.]** The client POSTs `/sgs/v1/cart/add-item` (the single add-to-cart path) with the variation `id` + `quantity` + a `variation` array of `{attribute, value}` + an `X-WP-Nonce`, never a price. **WIRE FORMAT PINNED LIVE (WC 10.8.1 — corrects the earlier `pa_`-slug guess):** `attribute` is the WC attribute DISPLAY NAME (e.g. `Size`, `Flavour`) and `value` is the term SLUG (e.g. `12-pack`, `vanilla`) — NOT `pa_size`, NOT `attribute_pa_size`. The variation `id` alone resolves the right variation + price server-side; the array is the attribute-match payload. The proxy maps the display-name key -> taxonomy internally for the G2 IDOR/attribute-match (the variation object's `get_attributes()` returns taxonomy form; the parent's attributes carry the display-name<->taxonomy map). **ARCHITECTURE (orchestrator decision 2026-06-03):** the proxy validates (G2 + caps) then adds IN-PROCESS via `WC()->cart->add_to_cart( $parent_id, $qty, $variation_id, $variation_attributes_taxonomy_form )` — same server-authoritative recompute-price + re-validate-stock guarantee, same cookie cart session the `sgs/cart` badge reads, WITHOUT an internal HTTP round-trip to the Store API (simpler, avoids Cart-Token session juggling for the same-origin case). Any price field is ignored. **Bypass closed (FR-MISSING-3):** a `woocommerce_add_to_cart_validation` filter (`enforce_add_to_cart_limits`) enforces the per-SKU cap + global rate-limit on EVERY add-to-cart path (the proxy AND a direct `/wc/store/v1` call), so the proxy is the enforced policy site-wide.
- Done when: a tampered request (fake price / OOS / foreign ID / attribute-mismatch / parent-id / empty-variation / draft) is rejected or server-priced. Model: sonnet. Test: adversarial fixtures. **STATUS: DONE — full live adversarial suite passes (no-nonce 403 / valid 200 / IDOR 400 / parent-id 400 / OOS 409 / attr-mismatch 400 / empty-variation 400 / qty-cap clamp 50->30); direct over-cap bypass 50->400.**

**FR-27-G2 -- IDOR + attribute-match + per-object validation.** Before acting on any client ID: `get_post_type()` is in {`product`,`product_variation`} and the variation object's `is_purchasable()` (variation-level `enabled`, not just parent). Validate every `{attribute,value}` against the claimed variation's own attributes (mismatch = 400). Authoring/meta writes use per-object `edit_post`/`manage_woocommerce`, never the general cap.
- Done when: draft/foreign ID, disabled variation, unregistered/mismatched attribute all rejected; per-object cap enforced. Model: sonnet. Test: IDOR + disabled + mismatch fixtures.

**FR-27-G3 -- Store-API auth + rate-limit.** Nonce model (seed `wp_create_nonce('wc_store_api')`, send `Nonce`, rotate from response header); the `Cart-Token` header (NOT a cookie; it is a request header stored in `sessionStorage`, mitigated by CSP; an HttpOnly-cookie wrapper is an out-of-scope hardening task) for long-lived-page resilience. Enable WC rate-limiting (at least 9.6; custom fingerprint for 9.8+). Recommend edge WAF.
- Done when: add-to-cart survives nonce rotation; token in sessionStorage + CSP; flooding rate-limited. Model: sonnet. Test: rotation + token + rate-limit.

**FR-27-G6 -- No oversell + inventory-abuse defence (cacheable).** Oversell protection is a single server stock re-check on the explicit add-to-cart click only (page stays fully cacheable). Plus, in the proxy: per-SKU quantity cap = `min(requested, floor(stock * 0.3))`; per-fingerprint (IP+token-hash) 30 s cooldown per SKU; document `woocommerce_hold_stock_minutes` = 15. Cache freshness (CORRECTED 2026-06-03 — `wc_scheduled_sales` is NOT a real WC hook; do not use it): the AUTHORITATIVE, write-path-agnostic mechanism is a **render-time staleness guard** — compare `wc_get_product($id)->get_date_modified()` against the manifest's `generated_at`; if the product changed since the cache was seeded, rebuild the manifest before serving (one indexed read; the page stays cacheable below it). This catches every price/stock/sale change regardless of which hook fired. PLUS best-effort cache-purge hooks (U6 wired these, with VERIFIED names): `woocommerce_variation_set_stock_status`, `woocommerce_product_set_stock`, `woocommerce_product_set_price` (fires on scheduled-sale start/end transitions), `woocommerce_product_set_sale_price`, `woocommerce_update_product`, `save_post_product` (the manual-metabox-edit path). The manifest carries `generated_at`; client-side, if age is over 1 h, the add-to-cart click triggers a manifest refresh before the call. (See plan M-C1; the spec-slogan reframe in §"Hard constraints".)
- Done when: sell-out-after-load is blocked gracefully; a cart-flood is capped+cooled; a sale-end purges the cached page; a manifest older than 1 h refreshes before add-to-cart. Model: sonnet. Test: oversell + flood + sale-expiry-purge + stale-manifest fixtures.

**FR-27-H1 -- INP at most 200 ms (LAB gate, CrUX monitor); no React bundle.** Interactivity API (`viewScriptModule`, approximately 12 KB) only; no WC React/jQuery. Pill selection resolves from seeded/prefetched state, no XHR on `change`. Budgets: block JS at most 20 KB parsed; product-page JS at most 150 KB uncompressed; context manifest at most 24 KB; JSON-LD at most 16 KB.
- Done when (testable): lab INP (Chrome DevTools, throttled mid-tier mobile 4G) is at most 200 ms on a 48-SKU pill change (mandatory CI gate); CrUX p75 monitored post-launch when data exists. No React bundle; budgets met. Model: sonnet + performance-auditor. Test: lab INP + bundle/size asserts + "no XHR on change".

**FR-27-H2 -- LCP at most 2.5 s, CLS at most 0.1 on swap.** Default variation SSR'd; product image `loading=eager` + `fetchpriority=high`, others `lazy`; price/stock elements reserved-height; swap via `data-wp-bind` (no node insertion).
- Done when: swap is CLS 0; LCP is at most 2.5 s. Model: sonnet. Test: CWV capture across a swap at 3 viewports.

**FR-27-H3 -- Tax-context-correct caching.** Seed BOTH ex- and inc-tax display values into the manifest (so a cached page serves the right one per the customer's tax context) OR render the price as a cache-excluded fragment with vary-on-tax-context. Round via WC semantics (`wc_get_price_to_display()`), never own division; honour `wc_get_price_decimals()`.
- Done when: a tax-exempt (B2B) and a standard customer each see the correct price from the same cached page; the card price matches the cart price (no rounding drift). Model: sonnet. Test: B2B-exempt + standard customer on a cached page; card-vs-cart price parity.

**FR-27-I-MVP -- Inter-block state + cloning compatibility + dev fixture.** The card owns the store + shared context; option-pickers read/write it (the inter-block-state model in the architecture section). The converter keeps emitting Typed option-pickers unchanged (Spec 22/D153); the Typed shape stays a deprecation-free subset after `sourceMode` + swatch attrs are added (a Jest block.json schema-compat test + a PHPUnit deprecation test assert this). Typed mode has no cross-attribute availability (WC Bound required for C1); this is stated. A `seed-48-sku-fixture.php` dev script (WC PHP API, not the authoring path) creates the test product for Phases 1-2.
- Done when: shared-context swap works; a clone run emits Typed pickers unchanged + schema-compat tests pass; the seed script builds the 48-SKU fixture. Model: sonnet. Test: clone + schema-compat + fixture-seed.

#### Phase 2 -- Display + SEO + AI-visible (after the MVP sells)

**FR-27-B2 -- Swatch modes via WC attribute term meta. [SHIPPED 6cdff8d0 — colour/image swatches via term_meta + a `{taxonomy}_edit_form_fields` authoring control + I2 build-time WCAG auto-contrast; axe-0.]** Text/colour/image swatches via `term_meta` (`_sgs_swatch_color`, `_sgs_swatch_image_id`; `absint()` + `wp_attachment_is_image()` validated, `wp_get_attachment_image_src()` with graceful fallback + authoring-time validation feedback). Typed mode carries optional swatch fields on `optionItems`. Model: sonnet. Test: swatch authored + a11y + image-validation + Typed swatch.

**FR-27-B3 -- Per-unit (derived) + discount-label (cosmetic) + server-rendered % off. [SHIPPED ceb4e04a/5fe7cfd5 — "£x per bar" derived live from price ÷ `_sgs_unit_divisor`; cosmetic badge (digit-stripped SEC-4) reusing `sgs/label`; on-sale "Sale" badge; WC variation-editor authoring controls.]** Per-unit £/unit DERIVED at render from live WC price divided by `_sgs_unit_divisor` (not a stored note). Discount-type label is cosmetic `postmeta`, save-time-rejected if it contains a numeric %. "% off" computed server-side from WC regular/sale, seeded as a `pctOff` literal per variation (no client getter). Model: sonnet. Test: sale + divisor + label fixtures; assert derived-per-unit, server % off, %-reject.

**FR-27-C2 -- OOS vs nonexistent distinct + announced. [SHIPPED 771f43ad — 3-state `termAvailability()` → "(sold out)" vs "(unavailable)" distinct SR text.]** Model: sonnet. Test: OOS + nonexistent fixture; axe + SR.

**FR-27-A4 -- Per-variation gallery. [SHIPPED 77dccc9f/48fc54b7 — per-combo gallery in the manifest; thumbnail strip rebuilt imperatively on swap with a DELEGATED click listener; prefetch-once; fixed-220px object-fit-cover box + editable `imageHeight`; media-picker authoring; variation→parent fallback.]** Gallery IDs in variation `postmeta` (`_sgs_variation_gallery`), prefetched per payload spec; fallback variation image then parent image. Model: sonnet. Test: gallery swap + fallbacks.

**FR-27-E1 -- ProductGroup + hasVariant JSON-LD, Merchant-complete, SSR. [SHIPPED 6ef7e7c6 — seo-schema Rich Results 0 errors; live-verified on canary 540: ProductGroup + AggregateOffer (48 offers £9.99–£59.99) + variesBy=size + per-variant Offers incl. OOS. Implemented in `class-product-schema.php` reading the manifest only (SEC-1 CI-grep clean).]** `ProductGroup` (`productGroupID` = parent ID/SKU; `variesBy` via an explicit operator-set `_sgs_variesby_value` term_meta mapped to the closed enum color/size/material/pattern/suggestedAge/suggestedGender; unmapped axes omitted from `variesBy` but kept as free-text child properties; `brand` from WC brand/attribute; `aggregateRating` from `get_average_rating()`/`get_review_count()` when reviews exist; `AggregateOffer` low/high + `offerCount` = true total) + `hasVariant` (at most 50 children) each with `sku`, identifier (`gtin13` from `global_unique_id`; else `mpn` from SKU; else `"identifier_exists": false`), absolute `image` (at least 250px, fallback parent, descriptive `alt`), `isVariantOf`, nested `Offer` (`price`, `priceCurrency` = `get_woocommerce_currency()`, `priceValidUntil` = the scheduled sale-end date if on a scheduled sale, else OMITTED; never a fabricated rolling date; `availability`, canonical `url`, `itemCondition` default `NewCondition`). `shippingDetails` + `hasMerchantReturnPolicy` at ProductGroup level. Emitted via `wp_json_encode()`; all `url` via `esc_url()` + same-origin. Model: sonnet. Test: Rich Results Test (0 errors; unmapped-axis warnings OK) + Merchant preview + currency-at-request.

**FR-27-E2 -- Canonical (+ optional indexable escape hatch). [SHIPPED ba96a4ff — WP core already strips `?attribute_*` to the clean parent canonical (verified live); `class-product-canonical.php` adds the opt-in `indexVariationUrl` override built from the variation's own `get_attributes()` (SEC-7, no `$_GET`), SEC-9 defer.]** `?attribute_*` redirects to `rel=canonical` to parent; no indexable thin pages by default; a per-variation `indexVariationUrl` block attribute (default false) promotes a high-intent variation when justified; canonical hreflang-neutral. Model: haiku. Test: default canonical + opt-in promotion.

**FR-27-E3 -- Supporting schema + freshness. [SHIPPED 325b521f.]** `BreadcrumbList` (delivered by PLACING the existing `sgs/breadcrumbs` block on the product template — live-verified emitting a valid BreadcrumbList; not a configurator-include build); `og:type=product` + price/availability OG tags (always inc-VAT, inside the SEC-9 guard); WP-core sitemap `<lastmod>` accuracy = MAX(parent, all-variation modified) via a `wp_sitemaps_posts_entry` filter (`class-product-sitemap.php`) + cache-purge on the FR-27-G6 hooks so the page never serves a stale price.
- **DESCOPED (Bean, 53b85d7c 2026-06-05):** the per-variation `<image:image>` XML sitemap clause is RETIRED — WP_Sitemaps has no clean image namespace, Google deprecated image sitemaps, and the E1 ProductGroup schema already exposes every variation image. SEC-9 detect-and-defer to Yoast/RankMath stands. Model: sonnet. Test (done): breadcrumb valid + OG inc-VAT + lastmod=MAX + purge-on-price-change.

**FR-27-F1 -- All commerce content in SSR HTML. [SHIPPED — no-JS curl audit passed: price + availability + ProductGroup JSON-LD + OG all present in the initial response.]** Price/availability/copy/JSON-LD in the initial response (AI crawlers do not run JS). Model: sonnet. Test: `curl` (no JS) shows price/availability + JSON-LD.

#### Phase R -- authoring + AI-builder

**STATUS (2026-06-05): R1/R2/R3 + PREFLIGHT were PULLED FORWARD into Phase 2 (as "Cluster C") and are SHIPPED** — see the per-FR markers below + the feature-map rows. The original framing ("build when a 2nd shop client lands") was superseded by Bean's 2026-06-04 decision to complete the whole spec before launch. **R4 + F2 SHIPPED 2026-06-10 (D202; R4 `0d7badb8`+`f5f3449b`, F2 `95754224`). Only R5 (AI-builder) remains** — decision-gated (does NOT block a first client shop).

**FR-27-R1 -- SGS authoring controller (wraps WC data-store classes). [SHIPPED f747e58a — `class-product-authoring.php`+`-args.php`; golden-master byte-identity verified; cookie-nonce auth; shared security chain extracted to `class-product-authoring-security.php`.]** `/sgs/v1/` controller using `WC_Product_Variable`/`WC_Product_Variation` `set_*()`+`save()` (NOT raw postmeta, NOT same-server REST batch as primary) + explicit post-write `wc_delete_product_transients()` + attribute-lookup regenerator + `woocommerce_update_product`. `permission_callback` = per-object `edit_post`; every write validates `X-WP-Nonce` (CSRF); per-user rate-limit; multisite blog-context guard. A golden-master diff test vs the native editor (dump postmeta + term relationships + lookup rows; diff must be empty) runs every WC major.
- Done when: writes via `/sgs/v1/` produce a product byte-identical (golden-master) to the native editor's; CSRF/cap/multisite enforced. Model: opus then sonnet. Test: golden-master diff + security fixtures.

**FR-27-R2 -- Attribute/term provisioning + generation + bulk + rollback. [SHIPPED e62f337f — `class-product-provisioning.php`+`-args`+`-helpers`; golden-master byte-identity + injected-failure 0-orphan rollback + shared-taxonomy sibling-safety all LIVE-PROVEN. EXTRAS beyond this FR: a `POST .../variations/bulk` endpoint; parent attributes MERGED by union (a re-run with fewer attrs can't orphan); a 300-combo cap enforced before any write; a triple-gated injected-failure test hook (dead in production).]** Provision/reuse global `pa_*` taxonomies + terms from plain input (conflict-safe term-merge matrix defined; adding a subset never breaks other products on a shared taxonomy); generate the cartesian product; inline + bulk edit; an upsert key = sorted slug-joined attribute combo stored in `_sgs_variation_upsert_key` postmeta (dedup on re-run). Rollback (WC batch is NOT transactional): track created variation IDs; on any failure, delete them + restore pre-write state; the UI shows created-vs-failed + a retry, never a corrupted product. Client-legible progress + error states throughout.
- Done when: 48-SKU provision+generate+bulk+write with no dupes; an injected mid-write failure rolls back cleanly with a recovery UI; a shared-taxonomy subset add does not break siblings. Model: sonnet. Test: provision/dedup/rollback/shared-taxonomy fixtures.

**FR-27-R3 -- Presentation authoring + edit-safety. [SHIPPED dd9d0d7d — the swatch/gallery/divisor/label authoring controls landed in Cluster A (term + variation screens); R3 filled the one gap (a Google `variesBy` `<select>` on the attribute term add/edit screens, saved via `Configurator_Meta::sanitize_variesby`) + added `class-configurator-edit-safety.php`: a pa_* term SLUG-rename warning, a delete-variation-with-orders warning, and orphaned-meta cleanup on variation delete. Zero-raw-meta authoring proven by the QA-AUTHORING e2e.]** Author swatch/label/divisor/gallery/subset (sanitised on save: plain text `sanitize_text_field`, FAQ/long-copy `wp_kses_post`, integer IDs `absint()` + media-validated; escape on render; `wp_json_encode` for JSON-LD). Edit-safety: deleting a variation with order history warns + cleans up orphaned term_meta/postmeta + documents the mid-checkout window; renaming an attribute term warns about existing carts. Model: sonnet. Test: author + delete-with-orders + rename fixtures.

**FR-27-R4 -- Agency slug-templates. [SHIPPED 2026-06-10, commits `0d7badb8` + `f5f3449b` (operator-language pass), D202. Live acceptance: export product 540's template → import → apply to a fresh variable product → 48 variations provisioned via R2 → PREFLIGHT publish pass → page renders a working 16-pill configurator. Envelope is slug-only (versioned JSON in the CPT post_content; commerce/legal keys deny-listed; swatch attachment IDs not carried). Plus a WC product-editor panel (save/two-step-apply/export/import) that went through the mandatory admin visual pass.]** Templates store attribute/term slugs + presentation config (never IDs), stored as an `sgs_product_template` CPT, exported/imported via `/sgs/v1/product-templates/{id}/export|import` (`manage_woocommerce`); applying provisions attributes/terms (R2) then links the card, so a fresh client install gets a working configurator. Model: sonnet. Test: export site A then apply site B (no shared IDs) then working configurator.

**FR-27-R5 -- AI-builder shop setup (roadmap ambition). [NOT BUILT — Cluster D capstone, decision-gated; build last per D168.]** Brief -> suggested attributes/values/swatches/copy -> operator/agent confirms via a full-variation-list-with-prices diff view (not just attribute names) -> provisions via R1/R2. LLM output is untrusted: attribute keys validated to the `pa_` slug regex (not a vocabulary whitelist); values/labels `sanitize_text_field()` + `wp_strip_all_tags()` + a URL-pattern reject (no `https?://`/`//` in plain-text/copy fields, blocks SEO-poisoning) + max-length caps (name at most 200, desc at most 2000, label at most 80) before storage; per-user/shop AI rate-limit; second-order injection (imported-feed to AI) acknowledged.
- Done when: a brief produces a confirmable full-price diff then a real WC product; a `<script>`/URL-injection brief is neutralised; over-length/over-rate rejected. Model: opus (safety) then sonnet. Test: brief-to-product + injection + URL-inject + rate-limit fixtures.

#### Cross-cutting requirements

**FR-27-PREFLIGHT -- Go-live + setup pre-flight check. [SHIPPED dd9d0d7d + 27e54132 — `class-product-preflight.php`; live-proven: a £0/no-image product reverts to draft on publish, a valid one publishes.]** `Product_Preflight::evaluate()` runs 7 blocker checks (WC≥9.8; every variation price>0; each has an image; published; manifest under the 24KB cap; a valid `variesBy` mapping; JSON-LD non-empty/valid) on variable products only, and surfaces a client-legible "ready / N issues" report. **EXTRAS beyond the original one-line FR:** (a) a `transition_post_status` HARD block (SEC-5) that reverts a blocked publish to draft + writes `_sgs_preflight_issues` meta + a dismissible admin notice, with a dual re-entrancy guard; (b) a `GET /sgs/v1/products/{id}/preflight` pre-check endpoint (nonce + per-object edit_post) for the authoring UI/agent; (c) a `no_variesby` check; (d) the cart £0 422 guard layer (`sgs_price_not_set` in `class-cart-proxy.php` + the `woocommerce_add_to_cart_validation` filter for the Store-API path); (e) a weekly `sgs_preflight_health_check` cron (batched ≤50) that flags degraded products. **NOTE (27e54132):** the `invalid_jsonld` check is publish-gated — the manifest/schema only builds for a published product, so a pre-publish readiness check on a still-draft product does not falsely flag empty JSON-LD; it still validates at the publish transition + on every re-save of a published product. Model: sonnet. Test (done): a deliberately-misconfigured product surfaces each issue; QA-AUTHORING e2e proved the full author→publish→rich-results journey.

**FR-27-I2 -- Theme / Spec 26 alignment.** Swatch/pill colours derive from theme tokens (Spec 26); respect the per-client global-styles layer; auto-contrast (build-time luminance, defined inline here pending the Spec 26 decision: at render, compute WCAG luminance of the swatch/pill background; text = `#000`/`#fff` whichever passes 4.5:1) applies to pill text. Model: sonnet. Test: client-palette restyle + contrast.

**FR-27-I3 -- Spec 24/25 reconciliation (completed in this document).** Spec 24 + Spec 25 are folded into this spec (Spec 27 v4). They are retired. `render.php`: WC variations present means ignore `_sgs_variation_sets` for commerce. Model: haiku. Test: doc-fold + grep (done).

**FR-27-J1 -- Ownable claims, moat-rated, evidenced.** Each claim produces a passing test + an evidence artefact in `.claude/reports/sgs-configurator-moat-evidence.md` + a durability rating: structural (closed-loop AI-built-shop-renders-accessibly-with-SEO, the real moat) | first-mover (WCAG 2.2 AA, sprint + claim now before a rival plants it) | expiring (no-React perf, ride WC's own Interactivity migration, do not bank on it) | feature (per-unit, gallery, availability, no-upsell, copyable but ship anyway).

**FR-27-F2 -- AI-citation levers + secure feed (Phase R). [SHIPPED 2026-06-10, commit `95754224`, D202 — built from the D197 research pack. Live on canary: /llms.txt + /llms-full.txt (text/plain, noindex, entity-decoded, 6h cache + single-flight lock), GET /sgs/v1/merchant-feed (catalog-visibility filter — the red-team BLOCK fix — + raw post_password guard + 2000-product cap + stampede lock; g:item_group_id via the shared Product_Schema::product_group_id()), sgs/product-faq + product-faq-item blocks (native details/summary, one merged FAQPage JSON-LD via wp_footer collector, HEX-flag encoded; copy grep-gated). Probes PASSED: search-only exfil (0 leaks), feed↔schema price parity (48 items byte-identical), FAQ front+editor render zero console errors.]** `FAQPage` JSON-LD from an `sgs/product-faq` block (NEW, defined here) or an existing `core/details`/`sgs/accordion` — **value framing (research-corrected 2026-06-09): Google fully deprecated FAQ rich results on 2026-05-07 for ALL sites (superseding the 2023 health/govt narrowing); the markup's 2026 value is Bing rich results + AI-citation extraction, and every client-facing surface (block description, editor tooltip, inspector help text, docs) MUST say "improves AI search citation and Bing visibility" and MUST NOT claim Google rich results/expandable answers in Google.** `llms.txt` (product names + categories only, safe) AND `llms-full.txt` (full prices/attrs), both filtered to `post_status='publish'` AND `post_password=''` AND `catalog_visibility NOT IN (hidden,search)`, rate-limited, `X-Robots-Tag: noindex` (confirmed correct — Mueller 2025-07), `Content-Type: text/plain`, llms.txt = navigation map to existing pages only (category/policy indexes, never per-product pages, never content absent from the site — anti-cloaking), regenerated on `woocommerce_update_product`; ~~`speakable`~~ **(DESCOPED 2026-06-09, D197 — still "(BETA)", news-publishers/US-English/Google-Home only, never applicable to e-commerce; zero ROI)**; a Merchant feed (XML RSS 2.0 `g:` namespace; per-variation items with `item_group_id` = `productGroupID`; variant deep-link URLs per SEC-7; real GTIN per variant or `identifier_exists=false`, never fabricated; price/availability read ONLY from the same manifest the JSON-LD uses per SEC-1 — feed↔page↔schema mismatch is the #1 GMC rejection cause) agreeing with on-page schema, read only from `wc_get_product()`, descriptions `wp_strip_all_tags()`, image URLs same-origin/allowlist (no SSRF), public-but-rate-limited. Research pack: `.claude/reports/2026-06-09-f2-gold-standard-research.md`.
- Done when: FAQ schema fires (and no client-facing string claims Google rich results); `llms.txt`/`llms-full.txt` leak no draft/hidden products + are rate-limited + noindex + text/plain; feed agrees with schema + injection/SSRF-safe + variant deep-links. Model: sonnet. Test: schema/feed parity + draft-exfil probe + SSRF probe + a grep gate over client-facing strings for "rich result|expandable answer".

---

## Non-functional requirements

- Budgets: less than 100 KB CSS; at most 150 KB JS/page; context manifest at most 24 KB; JSON-LD at most 16 KB; lab INP at most 200 ms; LCP at most 2.5 s; CLS at most 0.1.
- WC-optional; minimum WC 9.8 with defined degradation; single-currency per request (multi-currency is a sibling spec).
- UK English in all code, comments, and user-facing text.
- Selection presets resolve server-side; result counts capped (default 12, max configurable).
- Binding resolution adds no measurable TTFB regression vs a typed card (benchmark in Phase gate).
- Inspector defaults are "safe": a fresh collection block shows newest N of the chosen type, so a client cannot trivially configure an empty grid.

---

## Phasing + honest effort (configurator; smallest-plausible, AI-built + Bean QC)

- **Phase 1 -- MVP — SHIPPED (D165, Bean R-31-13 signed).** FR-27-A1, A2, A3, A5, B1, C1, G1, G2, G3, G6, H1, H2, H3, I-MVP. Mama's sells: live WC swap, secure no-oversell add-to-cart, accessible card, availability past the cliff, cacheable + tax-correct, lab-INP budget.
- **Phase 2 -- Display + SEO + authoring + go-live — COMPLETE (2026-06-05, Bean R-31-13 signed each cluster).** Cluster A (D171): FR-27-B2, B3, C2, A4, I2, H3, Step-7. Cluster B SEO (D173): FR-27-E1, E2, E3, F1. Cluster C authoring/go-live (pulled forward from Phase R): FR-27-R1, R2, R3, PREFLIGHT. (FR-27-I3 = Spec 24/25 doc-fold, done.) Image-sitemap clause of E3 descoped.
- **Cluster D — R4 + F2 SHIPPED 2026-06-10 (D202); only FR-27-R5 (AI-builder) remains DECISION-GATED.** Does NOT block a first client shop; R5 designs via /brainstorming only (the OC-Protector stall trap).
- Each phase: /qc-council per configurator/converter commit; design-reviewer + performance-auditor + a11y pass; Bean visual sign-off. (All Phase 1 + 2 gates passed.)

---

## Acceptance criteria (configurator -- Phase 1 = ship gate)

1. A Bound WC card renders real WC price/stock/image; pills swap with no XHR on change; no-JS shows the default literal; context is at most 24 KB; card price equals cart price across tax contexts (A1/A2/H1/H3).
2. 48-SKU: selecting an attribute greys unavailable combos both directions + announced; a post-load OOS selection is caught at add-to-cart, where native WC (above 30) fails (C1/G6).
3. axe-core 0 + keyboard + SR + 44px-measured pass; price/stock announced (B1).
4. A tampered add-to-cart (fake price/OOS/foreign ID/attr-mismatch/disabled) is rejected or server-priced via the proxy; a cart-flood is capped+cooled; a sale-end purges the cached page (G1/G2/G6).
5. Lab INP is at most 200 ms on a pill change; no React bundle; CLS 0 on swap (H).
6. The cloning pipeline emits Typed pickers unchanged + schema-compat tests pass (I-MVP).
7. *(Phase 2)* Rich Results Test passes ProductGroup + per-variation Offers (brand/identifier/priceValidUntil-or-omitted/shipping/returns); `curl` shows price/availability + JSON-LD (E/F1).
8. *(Phase 2)* Spec 24 + 25 folded into this spec; principle-6 superseded (I3, completed in v4).
9. *(Phase R)* `/sgs/v1/` writes are golden-master-identical to the native editor; AI-builder is injection-safe with a full-price confirm diff (R1/R5).
10. Each FR-27-J1 claim has a test + evidence + a durability rating.

---

## Migration

- Existing presentational cards keep working unchanged (Typed mode is the default; Bound mode is opt-in per instance). No forced migration.
- The FR-31-6 InnerBlocks migration of `sgs/product-card` (done 2026-05-31) is the prerequisite. Typed mode equals that InnerBlocks shape.

---

## Monetisation and positioning

Not a plugin for sale. This is the commerce engine of the SGS AI website builder and a client-delivery moat that wins shop clients at SME/charity budgets. SGS does not fight the open plugin market (a funded competitor out-executes a solo agency on distribution/support/trust; the competitor red-team was explicit). The customer never evaluates SGS in a feature grid; they hire an agency and get a great configurator as a side-effect. Revenue: SGS's productised build + retainer + the AI-builder commerce tier.

---

## Open questions (consolidated, de-duplicated)

1. **AI-builder LLM surface (FR-27-R5)** -- model + on-device-vs-API + per-shop cost guard. Phase-R planning.
2. **Merchant feed (FR-27-F2)** -- SGS-generated vs align to a plugin. Phase-R planning.
3. **Configurator analytics** -- which combos shoppers try-but-can't-buy (an inventory + agency-upsell goldmine the competitor red-team flagged as a deal-winner). Sibling spec; prioritise early.
4. **B2B/wholesale quantity-break + role pricing (Indus Foods)** -- sibling spec.
5. **Subscriptions/bundles (Mama's roadmap)** -- sibling spec; note bundles break the no-mirror axiom and need their own architecture decision.
6. **Multi-currency manifest** -- sibling spec.
7. **Bound-mode field resolution (FR-24-2/3)** -- confirm Block Bindings cover image + repeatable pack-options, or fall back to a custom `get_value_callback` source for those.
8. **Popularity signal source (FR-24-7)** -- simple view counter vs a privacy-safe interaction signal. Decide in Phase G.
9. **Per-site capability flag mechanism (FR-24-1)** -- where content-type enablement lives (`wp_options`, theme support flag, or plugin setting) so CPTs register only when needed.

---

## Research evidence (citations)

- **WC native + Store API:** Store/REST API docs (add-item `variation:[{attribute,value}]`; stable 2022); cart-tokens (header); rate-limiting + card-testing (2024); performance roadmap (Oct 2025); product-editor-beta retiring (2 June 2026); GTIN `global_unique_id` (WC 9.3); `wc_get_product` object cache (Jan 2026); Store-API Last-Modified (Apr 2026); attribute-lookup `DataRegenerator`; HPOS dual-write post-mortem (Sep 2022).
- **Card/query layer:** Gold-standard reference WooCommerce Product Collection block (GA Nov 2024); ACF "Product Catalog Without WooCommerce" (Sep 2025); Block Bindings (WP 6.7 UI, mature 6.8); GitHub gutenberg #40170 (meta-orderby gap, open since 2022); Reddit r/woocommerce Jun 2025; FacetWP incompatibility docs; GitHub Discussion #44776.
- **Competitor gaps:** WordPress.org support (186-variation 5 s, Feb 2026); WC GitHub #63430/#64278; GetWooPlugins reviews (Trustpilot 2.2 stars); WC feature-request portal (2023-2026); AllAccessible.org (Oct 2025); WC Interactivity-API migration (Oct 2025), the expiring-perf-moat evidence.
- **SEO/AI:** Google product-variants + `variesBy` closed-enum (Feb 2024); Merchant-listing brand/GTIN/priceValidUntil/shipping/returns; canonical docs; AI Overviews shopping (ALM Corp 2026); AI-crawlers-no-JS (seo-kreativ.de, May 2026); FAQPage/llms-full/speakable 2026; INP CWV + CrUX-needs-traffic (web.dev; DebugBear; Adfinite, Mar 2026).
- **Security/CWV:** Store-API nonce/cart-token/rate-limit/card-testing (2022-2026); CVE-2025-26762 (XSS), CVE-2026-32459 (SQLi), Store-API unauth patch (Mar 2026); CVE-2025-47504 (stored XSS to admin); Interactivity API runtime size (Oct 2025); UK Consumer Rights Act 2015 (misleading-price exposure on stale sale display).
- **qc-council:** round-1 (5 personas) + round-2 (6 harsh personas: cynic / competitor / spec-lawyer / ship-PM / abuse-red-team / support-realist), 2026-06-03. All must-fixes applied; re-scope adopted.

---

## Cross-references

- **Absorbs (retired):** Spec 24 (query-driven content cards), Spec 25 (WooCommerce experience layer). Do not edit those files.
- **Aligns with:** Spec 22 (cloning pipeline, option-picker emit unchanged), Spec 26 (global styles / auto-contrast, pending decision), Spec 11 (button presets).
- **Key decisions:** D144 (option-picker ratification), D148 (CPT + cart + option-picker ships), D149 (dual-source architecture), D151 (wrapper+bridge model, add-to-cart in Phase C), D-pending (Option A ratified; WC source of truth; no mirror; clean-slate; MVP-first re-scope; closed-loop moat; AI-builder = roadmap).
- **Primary files:** `includes/class-product-bindings.php`, `includes/content-types/class-product-cpt.php`, `src/blocks/product-card/`, `src/blocks/option-picker/`, `src/blocks/content-collection/`, `src/blocks/cart/`, `/sgs/v1/cart/add-item` (proxy endpoint).
