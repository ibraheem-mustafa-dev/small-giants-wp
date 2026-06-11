---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Step C — routing design stress-test across both drafts (homepage + product page)"
created: 2026-06-10
status: AWAITING BEAN GATE 2.5 (approve layout hierarchies) + 3.5 (QC before architectural changes). 5 parallel agents stress-tested the ROUTING-CATEGORISATION-DESIGN against all body sections of both drafts, DB-grounded.
basis: .claude/reports/wave2/ROUTING-CATEGORISATION-DESIGN.md
---

# Step C — stress-test verdict

## Headline

The design's **core holds**: route by `slot` (via `slots.aliases`) → `role` → typed-attr-vs-child → box-CSS via `property_suffixes`, with grid structure read from the CSS. Across ~70 layers in two drafts, the happy path routes correctly. **No finding requires rearchitecting the design.** Every gap is either a DB-data addition (missing alias / suffix / block attr) or a routing *rule* the design doc does not yet state. The product page (non-`sgs` naming) is the hardest case and confirms the boundary: aliases resolve ~40% of bare names; the rest needs DB additions or a lingua-franca pre-pass.

## What routes cleanly (confirmed across both drafts)

- Section root → `sgs/container` slug-None fallback (by design, D188).
- Single-child inner wrapper (`__inner`/`__card-inner`/`product-reviews-inner`) → fold + `max-width`→`contentWidth`.
- Leaf content with a clean BEM suffix → `slots.aliases` → typed attr (e.g. `__title`→`productName`) or `standalone_block` (e.g. `__description`→`sgs/text`).
- Hero `__media` scalar-media column → media slot (role=scalar-media → scalar lift, not child).
- Arrays via `has_inner_blocks=0` (trust-bar, testimonial-slider): badges/testimonials → array items.
- Grid detection via `display:grid` (when present); `__inner` carrying the grid auto-folds (trust-bar, products).
- Best non-conforming hit: `review-card` → `slots.review.aliases` → `sgs/testimonial`.

---

## Cross-cutting DESIGN-GAPS — routing rules the doc must add (ranked by reach)

| # | Gap | Hit in | Fix (rule to add) |
|---|---|---|---|
| **G1** | **Grids without `grid-template-areas`.** Every grid except the hero uses `grid-template-columns` only — `.sgs-products`, `.sgs-feature-grid`, `.sgs-gift-section__cards`, `.sgs-testimonial-slider`, `.product-page`, `.gallery-thumbs`, `.ingr-grid`, `.reviews-grid`. Principle B leans on area-names. | 8 grids, 4 of 5 agents | **Positional fallback:** when `grid-template-areas` is absent, direct children are positional grid items in DOM order; area-name matching applies only when areas exist (hero). This is the single most prevalent finding. |
| **G2** | **Unclassed tags (`h2`/`h3`/`h4`/`p`) have no slot.** The doc says "if unclassed, its tag" but `slots.aliases` holds no tag entries; the flat `html_tag_to_core_block` sends them to `core/heading`/`core/paragraph`. | both drafts, many layers | **Map tags to the SGS slot, not core:** add `h1–h6`→`heading`, `p`→`text`, `li`→`items` to `slots.aliases` (or a tag-alias layer). Then unclassed `<h3>` → `heading` slot → parent typed-attr or `sgs/heading`. Kills the `core/heading` fallback you flagged. |
| **G3** | **`has_inner_blocks=1` + a matching typed attr is ambiguous.** product-card and hero are InnerBlocks-capable AND expose typed attrs. The doc's element-vs-child gate doesn't state which wins. | hero, product-card | **Priority rule:** a matching `canonical_slot` typed attr takes precedence over `has_inner_blocks`. Typed-attr route fires first; child-block emit is the fallback when no typed attr matches. |
| **G4** | **Multi-child structural wrapper mis-routes to a content slot.** `__body`/`__content` match the `text` slot (aliases `body`/`content`) and would dump the whole subtree into one text attr instead of dissolving. | product-card `__body`, brand `__content` | **Fold-before-content rule:** if an element has >1 child AND its matched slot is content-bearing, dissolve the wrapper and route children individually; only route to a typed attr when the element is a leaf or single-child collapse. |
| **G5** | **Array-item sub-fields have no route.** Pills, badges, trust-items, gallery-thumbs are entries within an `attr_type='array'` attr; the doc's Step 2 handles typed-attr-vs-child but not "array entry." | option-picker pills, trust-bar items, gallery thumbs | **Add Step 2b — array route:** when the parent exposes an `attr_type='array'` attr for the slot, push the element as an array entry (with its sub-fields) rather than a child block. |
| **G6** | **Ambiguous aliases across slots.** `ctas`∈{button, button-group}; `pill`∈{label, badge, option-picker}; `item`∈{card}; `list`∈{items}. No tie-break. | hero `__ctas`, pills, gift `item` | **Parent-context priority:** when a suffix matches multiple slots, prefer the slot consistent with the resolved parent (a child of a resolved `option-picker` → option items); and clean the data (remove `ctas` from the `button` slot — it is a group). |
| **G7** | **Section-root identification is a separate path.** Section roots resolve via `blocks.slug`/tier, not `slots.aliases` (section-scope slots have empty aliases by design). The doc only documents interior routing. | every section | **Add Step 0:** identify the section root via block-name → `blocks.slug` (+ Stage-1 tier / slug-None→`sgs/container` fallback). Interior steps 1–5 then run inside. Document that section aliases are intentionally absent. |
| **G8** | **Compound suffix + modifier discrimination.** `__tag--trial`/`__tag--featured` need split (`tag`+`trial`), then modifier picks between two `label`-slot attrs (`trialTag`/`featuredTag`). | product-card tags, root `--featured`/`--trial` | **Compound-suffix split in Step 1 + modifier→attr discrimination** when ≥2 attrs share a `canonical_slot`. Also set `blocks.variant_attr='variantStyle'` for product-card (currently NULL). |
| **G9** | **CSS not in `property_suffixes`.** `order` (brand image stack), `overflow` (hero), compound `gap: 16px 12px` (trust-bar), `var(--token)` backgrounds. | hero, brand, trust-bar, all bg | Add `Order`→`order`, decide compound-gap (accept string vs split `rowGap`/`columnGap`), and a CSS-custom-property passthrough for `background: var(--token)`. `overflow`→gap-candidate (acceptable). |

## Block-quality gaps (block-side, not converter)

- `sgs/notice-banner` has **no `heading` attr** → the allergen `<h3>` can't be a typed attr (must become a sibling child). Add a `heading`/`title` attr (composite-mirror logic).
- `sgs/testimonial` has **no `date` attr** → `review-date` has no destination. Add `date` (canonical_slot=date).
- `slots.card.standalone_block='sgs/info-box'` but gift/PDP cards carry price + CTA → they're **product-cards**. Add content-signature discrimination (child set includes a `price` element → route to `sgs/product-card`), or a `card-with-price` alias.
- `option-picker`/`badge` slot has `standalone_block=NULL` and pills route to a dead end → ties to G5 (array route) + setting `optionItems.canonical_slot`.

## DB-ADDITIONS consolidated (data, deterministic)

**`slots.aliases` additions** (self-referential + variant gaps, by slot):
- `heading`: `h1`–`h6`, `author`/`byline`/`reviewer`, `review-author`
- `text`: `p`, `note`/`footnote`/`delivery-note`/`trial-note`, `desc`/`short-desc`/`product-description`, `review-text`/`review-body`
- `price`: `price`, `price-note`, `card-price`, `price-block`, `price-main`/`price-display`, `price-per`/`per-unit`
- `label`: `label`, `callout`/`allergen-callout`, `trustpilot-logo`, `rating-count`/`review-count`
- `button`: `sgs-button`, `button`; `button-primary`: `btn-primary`; `buttonSecondary`: `btn-secondary`
- `button-group`: `cta-area`/`action-area`
- `disclaimer`: `allergen-block`/`notice`/`alert`/`callout`/`announcement-bar`/`info-block` (slot currently has EMPTY aliases — unreachable)
- `media`: `gallery-main`; **new `gallery` slot** → `sgs/gallery` (aliases `product-gallery`/`image-gallery`)
- **new `trust-bar` element slot** → `sgs/trust-bar` (aliases `product-trust`/`trust-signals`)
- **new `product-info` section slot** → `sgs/product-card` (aliases `product-info`/`pdp-info`)
- `items`: `li`, `cards`/`card-list`; `split`: (already has `grid`)

**`modifier_suffixes` additions:** `featured`/`trial`→variant, `ghost`→variant, `coming-soon`→state.

**`property_suffixes` additions:** `Order`→`order`; (decision on compound-gap + CSS-var passthrough).

**`blocks.variant_attr`:** set `sgs/product-card` = `variantStyle` (currently NULL).

---

## The non-conforming-draft conclusion (product page)

The product page uses bare semantic names (`product-gallery`, `product-info`, `allergen-vegan`). Two agents concluded independently:

1. **Stage 0 hard-rejects it** on a production run (Spec 15 §8.1). The alias layer is a Step-1 robustness layer *after* BEM recognition, not a Stage-0 bypass.
2. `slots.aliases` resolves ~40% of bare names; **the rest needs DB additions (covered above) OR a lingua-franca pre-pass** for domain-specific names (`allergen-vegan`) that can't be globally aliased without being wrong elsewhere.

So: for SGS-BEM drafts (the homepage), the design + the DB additions above route everything. For scraped/non-conforming drafts (the product page as authored), a pre-pass is required first — OR the draft is re-authored to SGS-BEM (the cleaner path, since these are Bean-controlled drafts).

---

## Decisions needed (your gate 2.5 + 3.5)

1. **Approve the layout hierarchies?** (Gate 2.5 — the stripped trees per section, captured in each agent's section 1; reproduced on request.)
2. **G1 positional grid fallback** — confirm: no `grid-template-areas` → positional ordering. (Highest-reach fix.)
3. **G2 unclassed-tag mapping** — confirm tags map to SGS slots (`h*`→heading→`sgs/heading`), not `core/*`.
4. **Per-block alias layer** (your earlier approved extension) — several gaps (G4/G6 collisions, `__text`→quote, `__author`→name) close cleanest with it. Build it now or rely on global aliases?
5. **Product page** — re-author to SGS-BEM (clean), or build the lingua-franca pre-pass (handles future scrapes)?
6. **Order of operations** — apply the DB additions + Stage-11 uniform-schema fix first, then the converter rule changes (G1–G9), then re-clone? (Recommended.)
