# FP-E + FP-H Design Gate (2026-06-10) — for Bean sign-off BEFORE build

> **STATUS: SHIPPED 2026-06-10 (same day) — D204.** Commits `eccc3fc7` (base) + `ec084e50` (final-form closures) + `72e973c3` (visual polish) + `8be3366a` (D204), all on main, all live-verified on canary page 1069 + 540 + homepage bridge; axe 0 violations; 2-rater judgement closed. Remaining handover items live in D204: `/sgs-update` when the shared DB is free; converter Stage-2 routing + Mama's clone-verify (cloning thread); option-picker roving-tabindex gated round; widthMode wide/full precedence design-gate.

**Status:** DESIGN-GATE (pre-build). Both upstream dependencies are now GREEN — the Spec27-28 council wave is closed and the cloning converter Stage 1 is complete (`66c1bd5b`). Spec 28 P4 shipped today (`d5592d4b`, D203), so the whole product/pricing layer this rebuild sits on is in place. This doc states the architectural primitive + the per-element decision for Bean's approval. **No code until signed off (R-22-10).**

---

## The key reframe (changes the size of the job)

`sgs/product-card` **already has every built-in typed attribute** the draft card needs — verified live via `/sgs-db block sgs/product-card` (29 attrs):

`productName`, `description`, `image`, `imageAlt`, `priceLarge`, `priceNote`, `ctaText`, `ctaUrl`, `variantStyle` (standard|trial|featured), `trialTag`, `featuredTag`, `packSizes`, plus the value-ladder/configurator attrs (`framingMode`, `decoyEnabled`, `taxDisplayMode`, `indexVariationUrl`, …) and the wrapper attrs (`widthMode`, `maxWidth`, `contentWidth`, …).

**The gap:** in `typed` mode, `render.php` (lines 95–98) IGNORES those attrs and `echo`es `$content` (the InnerBlocks HTML). `edit.js` (288–293) drives the card via `useInnerBlocksProps` with a template of child blocks (`sgs/media`, `core/heading`, `sgs/text`, `sgs/option-picker`, `sgs/multi-button`…). So the converter, matching the draft, routes each draft element into a child block — treating the card like a container. That is the defect.

**So FP-H is NOT a from-scratch rebuild.** It is: (1) make `typed` mode RENDER the built-in attrs directly, (2) give each a friendly inspector control, (3) repoint the converter to route draft elements → these attrs (typed-attr destinations) instead of child blocks, (4) a `deprecated.js` to migrate existing InnerBlocks instances. Smaller and lower-risk than the prompt implied.

---

## The architectural primitive (state it plainly — the FR-22-2 divergence)

> **`sgs/product-card` is a BUILT-IN-ELEMENT card: its core commerce elements render from the block's own typed attributes + inspector controls, NOT as composable child InnerBlocks.** This is a DELIBERATE, RECORDED divergence from the converter's general FR-22-2 rule ("block-equivalent sub-elements become child InnerBlocks"). Justification: a product card is a *curated commerce unit* — cohesive design, on-brand, client-unbreakable, and DB-introspectable so the cloning dispatch routes a drafted product section into typed-attr slots. A composable-children card is fragile (a client deletes/reorders a child and breaks the card) and gives the converter no fixed destinations.

This is the one thing that needs your explicit sign-off, because it changes how FR-22-2 treats this block.

---

## FP-H — per-element decision table (the gate)

For each draft `.sgs-product-card` element (facts from `04b-featured-product-architecture.md` lines 247–268): BUILT-IN (typed attr the block renders + inspector control + converter routes the draft value here) vs CHILD (stays an InnerBlock).

| Draft element | Current (typed mode) | Recommendation | Why |
|---|---|---|---|
| **Product image** | `sgs/media` child | **BUILT-IN** (`image`/`imageAlt` exist) + universal image-controls | Core to every card; the image-controls extension already gives crop/focal/alt. |
| **Product name (h3)** | `core/heading` child | **BUILT-IN** (`productName` exists) + RichText inline + heading-level control | A product name is not a free heading; built-in protects the card's hierarchy. |
| **Description** | `sgs/text` child | **BUILT-IN** (`description` exists) + RichText inline | Core copy; built-in keeps it on-brand. |
| **Price + note** | two `sgs/text` children | **BUILT-IN** (`priceLarge`/`priceNote` exist) | Price is the most important card element; never a free text block. In live modes (`wc-product`) price comes from the manifest — built-in unifies both. |
| **CTA (Add to Cart)** | `sgs/multi-button`→`sgs/button` | **BUILT-IN** (`ctaText`/`ctaUrl` exist) + button-style control | One canonical CTA per card; built-in prevents multi-button sprawl. |
| **Trial / featured badge** | `sgs/label` child | **BUILT-IN** (`trialTag`/`featuredTag` + `variantStyle`) | A variant signifier, not free content. |
| **Pack-size picker (pills)** | `sgs/option-picker` child | **KEEP AS THE LIVE SUBSYSTEM** (not a flat typed attr) | This is the configurator (Spec 27/28) — interactive, variation-aware, value-ladder-driven. In `wc-product`/`sgs-cpt` mode it renders live from the manifest (already built-in to those modes). For a *typed/cloned* card, the pills map to the built-in `packSizes` array (display-only). Do NOT collapse the live configurator into a static attr. |
| **Card wrapper (border/radius/padding/bg)** | `SGS_Container_Wrapper` | **BUILT-IN (already mirrors `sgs/container`)** | The WS-4 composite-mirror already gives the card its wrapper attrs. No change. |

**Net:** 6 elements move from child → built-in (all attrs already exist — the work is render + edit-UI + converter routing, not new schema). The pack-size picker stays the live configurator subsystem. The wrapper is already handled.

**Open sub-decision for Bean:** should typed mode KEEP an optional "extra content" InnerBlocks slot (for a client who wants to add something custom below the CTA), or be fully built-in with zero InnerBlocks? Recommendation: **fully built-in** (zero InnerBlocks in typed mode) — simplest, most unbreakable, cleanest converter target; a client who needs custom content uses a separate block beside the card.

---

## FP-E — `sgs/card-grid` product capability (no architectural gate; needs a scope decision)

Today `sgs/card-grid` has `source: manual|query`; query mode is a plain `WP_Query` with only `queryPostType` (text), `queryPostsPerPage`, `queryCategory` (single ID) — no WooCommerce awareness, no product picker, no sort/filter, no preview (facts: `04b` FP-E). The "Product Cards" inserter variation is a pure visual preset (3 cols + elevated style), no product wiring.

**The scope decision (pending the research agent's bespoke-vs-native finding):**

- **Option A — bespoke product query on card-grid.** Add `source: 'wc-product'`; a product-source panel (category/tag/featured/on-sale/manual-selection), columns-per-breakpoint (exists), sort order, performant query via `wc_product_meta_lookup`. Renders each result as an `sgs/product-card` (the FP-H built-in card). Self-contained; full control of the markup the converter understands.
- **Option B — build on WooCommerce's native Product Collection block.** Reuse WC's query engine; skin the product template with `sgs/product-card`. Less query code, inherits WC's filtering/pagination, but couples us to WC's block + its inner-block "product template" model (which fights the FP-H built-in-card direction) and is harder for the converter to introspect.

**RESEARCH UPDATE (2026-06-10, full brief: `2026-06-10-fp-research-brief` in this session):** WooCommerce's **Product Collection** block (default since WC 9.5) IS the 2026 query gold standard — it routes through the indexed `wc_product_meta_lookup` table, ships category/tag/attribute/featured/on-sale/stock/sort/columns controls + one-click preset collections, and exposes `__experimentalRegisterProductCollection` for custom presets. BUT two findings make hosting our card inside it the WRONG call for SGS: (i) Product Collection's product template is INNER-BLOCKS, and WooCommerce explicitly documents that using a **third-party block as an inner block breaks its fast no-reload AJAX** — our `sgs/product-card` is exactly that third-party block; (ii) the inner-block template gives the cloning converter no fixed typed slots to route into (our hard "DB-describable" requirement). So the refined answer is **Option A done the WooCommerce-native way:**

> **FP-E = a bespoke `sgs/card-grid` product mode that queries via `wc_get_products()` / `WC_Product_Query` (NOT raw `WP_Query` — research Q4: raw meta_query on price/stock breaks at scale + on HPOS; `wc_get_products` routes through the indexed lookup table and stays forward-compatible), exposes a Product-Collection-MODELLED inspector control set (category/tag/featured/on-sale/stock/sort/columns-per-breakpoint/hand-pick/no-results), and renders each result as the FP-H built-in `sgs/product-card`.** This gets WC-native query performance + the familiar control surface + a clean converter target, WITHOUT the experimental-API coupling, the AJAX break, or the inner-block introspection problem.

**5 competitor pitfalls baked into the build (research Q3, each sourced):** (1) ALWAYS render a no-results/empty state (WC silently renders blank without it); (2) CSS-grid subgrid / `align-items:end` on the CTA row from day one (every competitor misaligns cards when titles vary in length); (3) if AJAX filtering is ever added, reconcile pagination state WITH filter state (Bricks/Kadence both break this); (4) the pack-size radio group must be 44px + responsive at 375px (Kadence's variation picker dies on mobile); (5) `wc_get_products()` never raw `meta_query`.

---

## Converter routing (FR-22-5 / FR-22-5.3) — what each built-in slot needs

For the cloning dispatch to route a drafted product section into the built-in card, each built-in slot needs `canonical_slot` + `role` + `attr_type` in `block_attributes` (via `/sgs-update`), so the Stage-1 `slot_has_equivalent_block` predicate routes a draft value to a TYPED-ATTR destination (not an InnerBlock). The pack-size picker keeps its existing live-subsystem routing. This is metadata work after the block.json changes, gated by a live clone-and-verify of the Mama's product section.

---

## Proposed build sequence (fresh session, after sign-off)

1. **Design-gate sign-off** (this doc) + `/brainstorming` to lock the built-in-vs-child table + FP-E A/B.
2. **FP-H:** typed-mode render of built-in attrs + per-element inspector controls + `deprecated.js` migration + the WS-4 wrapper already in place. `/adversarial-council` on the render/edit change (shared block). Visual pass @375/768/1440.
3. **Converter routing:** `canonical_slot`/`role`/`attr_type` on the built-in slots + `/sgs-update`; live clone-and-verify the Mama's section reproduces into the built-in card.
4. **FP-E:** the chosen query approach + inspector controls + renders `sgs/product-card`; performance-gated; live editor + visitor a11y pass.
5. Spec 27 updated with the FR IDs; SIGN-OFF-LEDGER FP-E/FP-H → VERIFIED.

Each is gated (R-22-13 Bean eye + R-22-11 live DOM). FP-H + the converter routing are the shared-architecture pieces; FP-E is additive.

---

## ✅ SIGN-OFF — Bean, 2026-06-10 (recorded verbatim-faithful by the theme-thread session)

**Status: APPROVED, with 4 binding amendments. No further gate needed before build.**

1. **Primitive APPROVED + STRENGTHENED — built-in elements use the ELEMENT-MIRROR pattern (WS-4 extended per element).** Each built-in element MIRRORS its source block's full capability set through shared helpers — CTA mirrors `sgs/button`, image mirrors `sgs/media` (+ universal image-controls), badge mirrors `sgs/label`, name/description mirror the heading/text typography controls — all surfaced in the product-card's own inspector, zero child blocks in the tree. Auto-propagation rule applies: a new capability on the source block is a GAP CANDIDATE on the card's mirror, never a permitted divergence (same docs-are-truth discipline as D166/D167). The card must never become a frozen second-class copy of its element blocks.
2. **Zero InnerBlocks in typed mode — CONFIRMED (Bean: "No" to the extra-content slot).** Custom content goes in a block beside the card, never inside it. `deprecated.js` migrates existing InnerBlocks instances.
3. **FP-E product selection — REQUIREMENT ADDED: smart collections.** Besides hand-picking individual products by name, the grid's product mode ships preset one-click collections: **best selling, highest price, lowest price, top rated** (all four are native `wc_get_products()` orderings — `popularity`/`price`/`price-desc`/`rating` — so they ride the indexed lookup path; no custom ranking code). These join category/tag/featured/on-sale/stock/sort/columns/hand-pick/no-results.
4. **FP-H — REQUIREMENT ADDED: per-instance variation-axis visibility.** The card instance exposes a control listing the bound product's ACTUAL attribute axes (read live from the product, e.g. Size + Flavour) with a per-axis show/hide toggle, so one instance can show only the Size picker while another shows both. Display-level only — never alters the product's variations or the manifest.

**Also approved upstream of this gate (same conversation): FP-DRAFT-FIX rename** — one block prefix (`sgs-product-card`) on both cards + descendants; variants as modifiers (`--featured` / `--trial` → `variantStyle`; `__tag--trial` → `trialTag`; pills → `__pill-group`/`__pill`/`__pill--active` → `packSizes`; price family → `__price-row`/`__price`/`__price-note` → `priceLarge`/`priceNote`). The `<h3>` carries `sgs-product-card__title` → `productName` (Bean's SECOND correction, same day, supersedes the earlier "leave it unclassed": the tag-mapping fallback emits a `core/heading` CHILD block, which contradicts the zero-InnerBlocks built-in card — the explicit class routes it to the typed attr; fallback is legacy-only. Both draft h3s classed 2026-06-10, zero-pixel re-proof passed). CSS renames in lockstep; proof = re-clone + zero-change per-section pixel diff. Rename executes FIRST (step 0 of the build sequence) — converter routing reads these names.

5. **CTA model — APPROVED (Bean, same day):** max 2 text buttons per card (1 primary + 1 secondary, one-primary enforced in the UI); per-button behaviour dropdown: **add-to-basket** (AJAX via cart-proxy, live modes), **buy-now** (add + straight to checkout, one click, same server-side guards), **learn-more** (product page / any URL — the only behaviour in typed mode). A bare "checkout" destination is absorbed into buy-now. **Express pay (Apple/Google Pay/Stripe Link) = phase-2 gateway-rendered toggle** — the active gateway renders its own official button row; we never paint brand buttons ourselves. Defaults: live card = Add to basket + Learn more; trial variant = Buy now primary.
6. **No deprecation path — CONFIRMED (Bean, same day):** the typed product-card is not yet used in any content, so the InnerBlocks→built-in switch ships without `deprecated.js`. Build-sequence step 2 amended accordingly.
7. **Connect + override replaces visible modes — APPROVED (Bean, same day, two messages).** (a) The user-facing concept is "Connect a product" (optional picker, the first control) — `sourceMode` becomes invisible plumbing (FR-24-3's auto-set, completed). (b) Per-element override TOGGLES (`overrideElements` array attr; members name/description/badge/image/cta): toggle OFF = live value renders and the operator's typed text is PRESERVED (never cleared — Bean: experimenting must not force delete-and-retype); toggle ON = typed value renders unless empty (an empty override never blanks a card). (c) PRICE IS NEVER OVERRIDABLE (page↔schema↔feed parity). (d) Image override offers the product's own gallery as a thumbnail picker (choose which product image is this card's default) plus the media library. (e) For add-to-basket/buy-now CTAs only the LABEL is overridable — the action stays the cart form. The same typed attrs serve as unconnected values and connected overrides — no parallel schema.

**Execution note:** ONE session executes this end-to-end (cloning thread, holding this doc + the wave2 sequencing notes) — two theme sessions nearly double-built R4 this morning; do not let FP-E/FP-H repeat that. **UPDATE 2026-06-10 (late): Bean directed the theme-thread session to execute the full rebuild NOW (FP-H + FP-E + routing metadata). Spec 02 + Spec 27 amendments recorded + pushed (`f04e5bc3`). FP-DRAFT-FIX rename is COMPLETE in the working tree (4-edit delta + zero-pixel proof; uncommitted alongside the cloning session's draft edits). Any other session seeing this doc: do NOT start FP work without checking git log + this session's handoff first.**

---

## FINAL-FORM declaration (Bean directive 2026-06-10 late: "no points left for later")

**Base ship: `eccc3fc7` (FP-H + FP-E + page-level ItemList, live-verified canary page 1069).** Final-form closure round in flight: handpick name labels; on-sale refill pass; ProductGroup single-product-focus gate; image-override-keeps-variation-swaps.

**Deliberate FINAL decisions (designed-so, NOT deferrals — do not reopen without a new Bean decision):**
1. **Express pay** = phase-2 gateway-rendered toggle (Bean-approved amendment 5). It is a payment-gateway integration feature, not a card gap; building it requires WooPayments/Stripe express-button surfaces and brand-compliance work that has its own gate.
2. **No transient caching on grid queries.** `wc_get_products` rides indexed lookups at limit ≤24; a cache layer adds invalidation bugs (product saves, stock flips, sale windows) for negligible gain at SGS client scale. The builder is pure/stateless — caching can wrap it later WITHOUT interface change if a real perf measurement ever demands it.
3. **sgs-cpt connected cards get override toggles but no live-value help text or gallery strip** — there is no `/wc/v3` record to read; overrides themselves work (render is source-agnostic). Intended degradation.
4. **product-card render.php at ~1,260 lines** — pre-existing oversized file grown by three cohesive live branches sharing the resolution helpers. A structural split of a just-live-verified file is regression risk with zero operator value; accepted as recorded debt (NOT a todo).
