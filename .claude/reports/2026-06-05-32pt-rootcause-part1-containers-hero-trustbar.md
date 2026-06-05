# Root-Cause Report — Part 1: Points 1, 2, 3, 4, 5, 31
## Run: mamas-munches-homepage-2026-06-05-103529 · Date: 2026-06-05

---

## Point 1 — Composite blocks still getting nested inside a redundant `sgs/container`

**Symptom:** Both `sgs/hero` and `sgs/trust-bar` in the emitted markup are wrapped in an outer `sgs/container` even though these blocks already have a built-in container (they are class-section composites with `containerKind='section'`). Confirmed by `extract.patched.json` positions 47406/47485 (outer container then hero) and 50030/50114 (outer container then trust-bar).

**Root cause — file:line + mechanism:**
`converter_v2/convert.py:2901`:
```python
if is_top_level and slug != "sgs/container":
    return db.emit_sgs_container_wrapping(slug, attrs, children_markup, css)
```
This condition fires for **every** top-level non-container slug, with no exemption for composites that are already in the container-mirror roster (`wraps_block='sgs/container'` in `block_composition`). The function `emit_sgs_container_wrapping` (`db_lookup.py:2389–2461`) unconditionally wraps the inner block in `sgs/container {widthMode:'full'}`.

There is an `_is_container_mirror_block()` function (`convert.py:874`) that correctly identifies these blocks via the DB — but it is only called in the A2 lift path (line 2669), NOT checked before the exception-3 wrap at line 2901. The guard needed is:
```python
if is_top_level and slug != "sgs/container" and not _is_container_mirror_block(slug):
```

**Evidence:**
- `extract.patched.json`: `<!-- wp:sgs/container {"widthMode":"full","className":"sgs-hero"} --> <!-- wp:sgs/hero ...` (pos 47406/47485)
- `extract.patched.json`: `<!-- wp:sgs/container {"widthMode":"full","className":"sgs-trust-bar"} --> <!-- wp:sgs/trust-bar ...` (pos 50030/50114)
- `stage-2.json` matches: `sgs/hero` conf=1.0, `sgs/trust-bar` conf=1.0 — the stage-2 voter correctly identifies these as composites. The wrap happens AFTER that, in `convert.py:2901`.
- `block_composition` DB: `sgs/hero` and `sgs/trust-bar` both have `wraps_block='sgs/container'`, `container_kind='section'` — they ARE in the mirror roster.
- `_is_container_mirror_block` is called at `convert.py:2669` (A2 lift path) but NOT at line 2901 (exception-3 wrap).

**Same-cause-as:** Points 2 and 4 are downstream effects of this single root cause.

**DOC-fault vs IMPL-fault:** IMPLEMENTATION-fault. Spec 22 §FR-22-4 documents exception-3 as the wrap for non-container top-level slugs, but the implementation fails to honour the WS-4 intent that container-mirror composites carry their own wrapper. No spec text explicitly says "skip the wrap for mirror composites" — this is an unspecified interaction between FR-22-4 (wrap rule) and the WS-4 composite-mirror system. The spec is silent; the implementation applies the wrap unconditionally.

**Fix-shape:** In `convert.py:2901`, add `and not _is_container_mirror_block(slug)` to the guard condition. When slug is a mirror-roster composite, fall through to `emit_wp_block(slug, attrs, children_markup)` (line 2904) directly — the block's own render.php handles the wrapper.

---

## Point 2 — Hero image doesn't fully fill the right side; background wraps around it

**Symptom:** The hero split image has gaps/background colour showing around it (top/bottom/sides on the right column). In the draft, `sgs-hero__media` has `height: 100%` and the image is `height: 100%; object-fit: cover` at tablet+.

**Root cause:** Same as Point 1 (shared root cause). The redundant outer `sgs/container {widthMode:'full'}` wrapping the `sgs/hero` block renders an additional block container in the DOM. This extra layer disrupts the CSS grid layout that `sgs/hero`'s render.php creates — the hero's `.sgs-hero { display: grid; grid-template-columns: 1fr 1fr }` is applied to the hero's own wrapper element, but the outer container adds another block between the page and the hero, breaking the height inheritance chain (`height: 100%` on the media column requires an explicit height on the grid parent, which is now the outer container, not the page section).

**Evidence:**
- `extract.patched.json`: outer container wraps the whole `sgs/hero` block (confirmed Point 1 evidence)
- Draft `sites/mamas-munches/mockups/homepage/index.html`: `.sgs-hero__media { height: 100%; overflow: hidden }`, `.sgs-hero__split-image--desktop { display: block; height: 100%; }` — relies on the section grid being the direct parent of the media column
- `variation-d0-d2.css`: D2 CSS includes `.page-id-144 .sgs-hero__media{ grid-area: media; overflow: hidden }` but the outer `sgs/container` wrapper disrupts the grid stacking
- `plugins/sgs-blocks/src/blocks/hero/render.php`: the hero's render.php generates the CSS grid layout internally; the outer `sgs/container` has no knowledge of this and its rendered element inserts an extra layer

**Same-cause-as:** Point 1. Fix Point 1 and this resolves automatically.

**DOC-fault vs IMPL-fault:** IMPLEMENTATION-fault (same as Point 1 — the double-wrap is the cause).

**Fix-shape:** Same fix as Point 1 (no additional fix required for Point 2).

---

## Point 3 — No max-width applied to `hero__sub` content on the clone

**Symptom:** The `.sgs-hero__sub` paragraph (subheadline) fills the full width of the content column instead of being constrained to `max-width: 420px` as in the draft.

**Root cause — distinct from Point 1.** This is a slot-extraction gap, independent of the double-wrap issue.

The draft mockup has:
```css
@media (min-width: 768px) {
  .sgs-hero__sub { font-size: 18px; margin-bottom: 28px; max-width: 420px; }
}
```

The `sgs/hero` block has a `subHeadlineMaxWidth` attribute (type: number, `render.php:94,336`) that is specifically designed to set `max-width` via `$responsive_css`. The slot is registered in `slot-list.json` with `canonical_slot='subheading'`, `attr_role='layout'`.

The gap is that the pipeline never extracted this value. Evidence from `leftover-buckets.json`:
```json
{"section_id": "hero", "slot": "subHeadlineMaxWidth", "reason": "no value extracted"}
```

The CSS rule `.sgs-hero__sub { max-width: 420px }` is a **child-element-scoped** CSS rule. `_collect_css_decls_for_element()` (`convert.py:541`) only collects CSS for the element it is called on — i.e. it collects `max-width` when walking the `<p class="sgs-hero__sub">` node. However, `_route_composite_interior` processes the hero's content column as a **content-column** (not a scalar-media column), so it walks each child element and emits them as `sgs/text` / `sgs/heading` InnerBlocks. The child element's CSS (`max-width: 420px`) goes into `style.*` of the `sgs/text` block (as content-block CSS), NOT into `subHeadlineMaxWidth` on the parent `sgs/hero` block.

There is no mechanism in the converter to bridge from "CSS property on `__sub` child element" → "block-parent attr `subHeadlineMaxWidth`". Stage-3 slot extraction (`slot-list.json` confirms the slot exists) relies on direct CSS-property-to-attr mappings; it does not do element-to-parent-attr promotion. The `max-width` on `__sub` never surfaces as a numeric value at the block level.

Additionally, the mockup uses BEM element class `.sgs-hero__sub` whereas the block attr is named for `.sgs-hero__subheadline`. Even if the CSS were seen at the block level, the mapping would require knowing that `__sub` → `subHeadlineMaxWidth` on the parent block.

**Evidence:**
- `leftover-buckets.json`: `subHeadlineMaxWidth` failure confirmed, `"reason": "no value extracted"`
- `slot-list.json` (b2): `subHeadlineMaxWidth` slot registered with `attr_role='layout'`
- `variation-d0-d2.css`: `sgs-hero__sub` does NOT appear in the D2 CSS (the rule was scoped D1 for element-level, but the numeric value was never lifted)
- `extract.patched.json`: `subHeadlineMaxWidth` does NOT appear in `sgs/hero` block attrs
- `sites/mamas-munches/mockups/homepage/index.html`: `@media (min-width: 768px) { .sgs-hero__sub { max-width: 420px; } }` — this is in a media query, applied to the child `<p>` element
- `hero/render.php:335–336`: `if ( $sub_headline_max_width ) { $responsive_css .= '...' }` — attr exists and has a render path; it just isn't being set

**Same-cause-as:** Distinct from Points 1/2/4. This is a separate extraction gap: child-element CSS on composite interior children cannot be promoted to parent-block layout attrs by the current converter.

**DOC-fault vs IMPL-fault:** IMPLEMENTATION-fault with a documentation gap. The slot `subHeadlineMaxWidth` is registered in the slot-list (IMPL knows about it) but no converter code performs the cross-level lift from child element CSS → parent composite block attr. A spec gap also exists: Spec 22 FR-22-21 does not specify how to bridge composite block-level attrs from interior-element CSS in the content-column path.

**Fix-shape:** Add a post-processing pass inside `_route_composite_interior` (or as a dedicated A2-extension step) that, after routing the content column, inspects direct child elements for CSS rules that map to known composite block attrs (`subHeadlineMaxWidth`, `contentMaxWidth`, `contentPaddingTop/Right/Bottom/Left`, etc.). These attrs exist on the block (`slot-list.json` confirms) but need explicit element-CSS-to-block-attr bridging logic. A lookup table keyed by (block_slug, bem_element, css_property) → block_attr_name would cover the gap.

---

## Point 4 — Double-container causes 4-columns-inside-4-columns in trust-bar

**Symptom:** The redundant outer `sgs/container` wrapping trust-bar happens to receive `className="sgs-trust-bar"` and no `layout` or `columns` attr, so WP renders it as a neutral container. The actual `sgs/trust-bar` (in bound mode) emits an inner `sgs/container` with `layout:"grid"`, `gridTemplateColumns:"repeat(4,1fr)"`. The outer container has no layout — but because WP block layout reads the trust-bar's outer `sgs/container`, the trust-bar itself becomes one cell in an unconfigured parent, making the grid appear broken/stacked incorrectly and losing the full-width 4-column appearance.

More precisely: the outer `sgs/container` has `widthMode:"full"` but no columns. The trust-bar inside it then tries to render a 4-column grid, but is constrained by the outer container's block rendering. On tablet (default `grid-template-columns: 1fr 1fr` as seen in `variation-d0-d2.css`), the outer container drives the grid template, so the trust-bar items end up in a 2-col layout (the outer container's CSS) rather than a 4-col layout.

**Evidence:**
- `extract.patched.json` pos 50030: `<!-- wp:sgs/container {"widthMode":"full","className":"sgs-trust-bar"} --> <!-- wp:sgs/trust-bar ... sourceMode:bound --> <!-- wp:sgs/container {"className":"sgs-trust-bar__inner","layout":"grid","gridTemplateColumns":"repeat(4, 1fr)","gridTemplateColumnsMobile":"1fr 1fr","gap":"16px 12px","columns":4} -->` — two containers stacked
- `variation-d0-d2.css`: `.page-id-144 .sgs-trust-bar__inner { display: grid; margin: 0 auto }` — the D2 CSS drives the inner, but the outer container intercepts layout
- `block_composition` DB: `sgs/trust-bar` has `container_kind='section'` — it is a section-level composite that should NOT be double-wrapped

**Same-cause-as:** Point 1 (same root cause). Fix Point 1 and this resolves automatically.

**DOC-fault vs IMPL-fault:** IMPLEMENTATION-fault (same as Point 1).

**Fix-shape:** Same as Point 1.

---

## Point 5 — All trust-bar icons are default stars; missing white circle background

**Symptom:** All 4 trust-bar badges show a star icon (Lucide `star`) instead of the correct icons (house, check, truck, star polygon), and the icons lack the white circular background (`background: white; border-radius: 50%`) seen in the draft.

**Root cause — TWO distinct sub-causes:**

**Sub-cause A (icon identity — star default):** The converter emits `<!-- wp:sgs/icon /-->` (self-closing, no attrs) for each badge. `block.json` defaults: `iconName: "star"`, `iconSource: "lucide"`. Since no `iconName` attr was set, all icons default to `star`.

The draft markup uses raw `<svg>` elements inside `<span class="sgs-trust-bar__icon">`. The converter traces show `bem_resolve_slot_fallback` routing these `<span>` elements to `sgs/icon` via the `icon` slot alias (`sgs-trust-bar__icon`). However, the SVG path data inside each `<span>` was never extracted and there is no mechanism to reverse-engineer SVG path data into Lucide icon names. Stage-3 slot extraction (`leftover-buckets.json`) confirms: `{"slot": "iconColour", "reason": "no value extracted"}` for trust-bar. The icon name lookup (draft SVG → Lucide named icon) does not exist in the pipeline.

**Sub-cause B (white circle background):** The `sgs/icon` block has `backgroundShape: "none"` (default) and `backgroundColour: "surface-alt"` (default). In the draft, the white circle is styled via the `__icon` span CSS:
```css
.sgs-trust-bar__icon {
  width: 44px; height: 44px; border-radius: 50%;
  background: white;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 1px 2px rgba(58,46,38,0.06);
}
```
This CSS targets the container span, not the icon block's `backgroundShape`/`backgroundColour` attrs. The converter does not attempt to map `border-radius: 50%` on a parent span to `backgroundShape: "circle"` on `sgs/icon`. The `leftover-buckets.json` confirms `iconColour` was not extracted; `backgroundShape` was also not extracted.

In `sourceMode='bound'` (which the converter correctly sets), the trust-bar render.php echoes `$content` directly. The `sgs/icon` blocks in the InnerBlocks receive no `backgroundShape` or `backgroundColour` attrs, so they render with the `none` default shape (no circle).

**Evidence:**
- `extract.patched.json` pos 50668: `<!-- wp:sgs/icon /-->` — no attrs at all (confirmed self-closing, no iconName, no backgroundShape)
- `plugins/sgs-blocks/src/blocks/icon/block.json`: `iconName.default: "star"`, `backgroundShape.default: "none"`
- `leftover-buckets.json`: `{"slot": "iconColour", "reason": "no value extracted"}` for trust-bar section
- Draft `index.html`: SVG paths are custom (house, check, truck, star polygon) with no Lucide name mapping possible from raw path data alone. The `sgs-trust-bar__icon` span has `background: white; border-radius: 50%` CSS
- `trust-bar/render.php:147–156` (bound mode): `echo SGS_Container_Wrapper::render(...)` with `$title_html . $badges_html` — the InnerBlocks (`$content`) are echoed; individual icon attrs come from the block, not from trust-bar render.php

**Same-cause-as:** Sub-cause A (icon name) and Sub-cause B (white circle) are related — both are extraction gaps for the trust-bar icon slot — but different in nature. The circle-background gap could potentially be fixed via CSS (the D2 variation CSS already styles `.sgs-trust-bar__icon`; if trust-bar render.php in bound mode wraps the InnerBlocks in the `.sgs-trust-bar__badge` → `.sgs-trust-bar__icon` structure, the CSS would apply). Sub-cause A requires either manual post-processing or an icon-name recognition mechanism.

**Additional interaction:** Sub-cause B is also affected by Point 4 (double-container). If trust-bar is double-wrapped, the trust-bar render.php's wrapper output is nested, which may affect whether `.sgs-trust-bar__icon` CSS selectors in D2 correctly target the icon spans.

**DOC-fault vs IMPL-fault:**
- Sub-cause A: IMPLEMENTATION-fault (pipeline gap — no SVG-to-Lucide-name resolver exists). Also a DOC-fault: no spec clause covers icon-name derivation from raw SVG.
- Sub-cause B: IMPLEMENTATION-fault — the pipeline should map `border-radius: 50%; background: white` on an icon container span to `backgroundShape: "circle"`, `backgroundColour: "white"` on `sgs/icon`. This mapping is missing from the slot extraction.

**Fix-shape:**
- Sub-cause A: Add a post-processing pass that looks up common SVG path fingerprints against the Lucide icon set (or prompts operator for icon selection after clone). Short term: set `iconName` to the closest semantic Lucide match based on the trust-bar item text (e.g. "Handmade in Birmingham" → `house`, "Registered Food Business" → `check`, "Free UK Delivery" → `truck`, "Loved by Breastfeeding Mums" → `star`).
- Sub-cause B: In the `sgs/icon` walker path, when the parent element has `border-radius: 50%; background: <colour>` CSS, lift `backgroundShape: "circle"` and `backgroundColour: <colour>` onto the icon block attrs. This should be a post-walk CSS-to-attr mapping for the icon block.

---

## Point 31 — Grid/container block routing for products/gift sections

**Symptom:** Bean observed the ingredients section correctly routed to `sgs/feature-grid` (good), but asked whether products (`sgs-products` grid) and gift section (`sgs-gift-section__cards` grid) also correctly chose the right grid equivalent.

**Root cause — three distinct findings:**

**Finding A — Ingredients section correctly routed to `sgs/feature-grid`:**
The class `.sgs-feature-grid` is used in the draft HTML. BEM resolution (`db_lookup.py:2086–2143`, Path 1): `sgs-feature-grid` → strip `sgs-` prefix → `feature-grid` → check if `sgs/feature-grid` is a registered block → YES → resolve to `sgs/feature-grid`. The block exists and is registered.

Evidence: `convert-trace-b6.jsonl`: `db_lookup_hit: get_block_composition_role, block_slug: sgs/feature-grid` confirms the block was found and walked.

**Finding B — Featured-product section uses `sgs-products` inner grid as `sgs/container`:**
The featured-product section has two nested elements:
1. `sgs-featured-product` (section root) → outer container (no block `sgs/featured-product` exists)
2. `sgs-products` (inner grid) → BEM Path 1: `sgs/products` is NOT a registered block → path 2: no slot alias → falls back to `sgs/container` with grid attrs lifted (`gridTemplateColumns: "5fr 3fr"`)

`sgs/card-grid` has NO slot synonyms and NO BEM class `sgs-card-grid` in the mockup. The mockup uses `sgs-products` which has no DB mapping to `sgs/card-grid`. The `sgs/card-grid` block (`block_composition`: `has_inner_blocks: 0`) would not accept InnerBlocks anyway (its `has_inner_blocks=0` means the converter would skip walking its children — so even if it were routed there, the card content would be lost).

Evidence: `convert-trace-b4.jsonl`: `responsive_grid_lifted: classes: ["sgs-products"], attrs: {"gridTemplateColumns": "5fr 3fr", ...}` then `walker_branch_taken: wrapper_container, node_classes: ["sgs-products"]` — it became a generic container. `extract.patched.json`: `<!-- wp:sgs/container {"className":"sgs-products","layout":"grid","gridTemplateColumns":"5fr 3fr","gridTemplateColumnsMobile":"1fr"} -->` — correct grid attrs were lifted, block type is container not card-grid.

Evaluation: `sgs/container` with grid attrs is **the correct choice** here. `sgs/card-grid` has `has_inner_blocks=0` and is a static repeater — it cannot host the cloned InnerBlock children. The `sgs/container` with lifted grid attrs faithfully transfers the 5fr:3fr layout.

**Finding C — Gift section uses `sgs-gift-section__cards` grid as `sgs/container`:**
Same mechanism as Finding B. `sgs-gift-section__cards` → BEM element suffix `__cards` → Path 2: `cards` not in slot aliases → no standalone_block → walker emits `sgs/container` with grid attrs lifted (`gridTemplateColumns: "1fr 1fr"`). The gift cards (`.sgs-gift-section__card`) resolve to `sgs/info-box` via slot alias `card`. This is correct routing.

Evidence: `convert-trace-b7.jsonl`: `responsive_grid_lifted: classes: ["sgs-gift-section__cards"], attrs: {"gridTemplateColumns": "1fr 1fr", ...}` → `walker_branch_taken: wrapper_container`. `extract.patched.json` confirms `sgs/container` with `gridTemplateColumns: "1fr 1fr"` and `sgs/info-box` children.

**Evaluation — is `sgs/card-grid` the "right" choice here?**
`sgs/card-grid` in the DB: `has_inner_blocks: 0`, `composition_role: 'content-block'`, `container_kind: 'layout'`. This block is a **static typed repeater** (renders from its own `items[]` attr, no InnerBlocks). Using it for converter-generated InnerBlock children would require the `sourceMode='bound'` pattern (similar to trust-bar), which `sgs/card-grid` does NOT currently support. Therefore `sgs/container` with grid attrs is the correct container for dynamic/converted card content.

The converter choosing `sgs/container` for both `sgs-products` and `sgs-gift-section__cards` grids is **architecturally correct** given the current block capabilities. If `sgs/card-grid` later gains a `sourceMode='bound'` dual-mode like trust-bar (Spec 28 §FR-28-*?), the routing could be updated.

**Evidence for all three findings:**
- `stage-2.json`: `featured-product` → `sgs/container` conf=0.0, `gift-section` → `sgs/container` conf=0.0, `ingredients-section` → `sgs/container` conf=0.0 (all via `deferred-no-match` — no section-level composite found)
- `convert-trace-b4.jsonl`, `convert-trace-b6.jsonl`, `convert-trace-b7.jsonl`: trace confirms routing paths
- `sgs-framework.db` `blocks` table: `sgs/card-grid` exists but has `has_inner_blocks=0`
- `db_lookup.py:2086–2143`: BEM resolution logic — Path 1 requires a registered block slug

**DOC-fault vs IMPL-fault:**
- Ingredients/feature-grid: Correctly routed. No fault.
- Products/gift grids using `sgs/container`: CORRECTLY handled given `sgs/card-grid` cannot accept InnerBlocks. Not a fault. If `sgs/card-grid` should have been used here, the block needs a `sourceMode='bound'` upgrade first (block-level gap, not converter gap).
- Documentation gap: Spec 22 does not document the expected mapping for `sgs-products`/`sgs-gift-section__cards` → `sgs/card-grid` as a forward-looking TODO. This should be noted in Spec 28 or the issue register.

**Fix-shape:** No converter fix needed. If sgs/card-grid gets `sourceMode='bound'` support in future, add a DB slot synonym mapping `sgs-products` → `sgs/card-grid` and `sgs-gift-section__cards` → `sgs/card-grid`. For now, `sgs/container` with lifted grid attrs is correct and faithful.

---

## Summary

| Point | Root-cause layer | Confidence | Shared with |
|-------|-----------------|------------|-------------|
| 1 | `converter_v2/convert.py:2901` — missing `_is_container_mirror_block()` guard on exception-3 wrap | HIGH (code + artefact confirmed) | 2, 4 |
| 2 | Same as Point 1 (downstream DOM effect) | HIGH | 1, 4 |
| 3 | Stage-3 extraction gap — child-element `max-width` CSS not bridged to parent composite block attr `subHeadlineMaxWidth` | HIGH (leftover-buckets + slot-list + render.php confirmed) | Distinct |
| 4 | Same as Point 1 (downstream layout effect) | HIGH | 1, 2 |
| 5 | Two sub-causes: (A) no SVG→Lucide-name resolver, (B) no `border-radius:50%`→`backgroundShape:"circle"` mapping on icon walk | HIGH | Distinct (A, B independent) |
| 31 | Feature-grid: correctly routed. Products/gift: `sgs/container` is correct given `sgs/card-grid` has no InnerBlock support. Not a fault. | HIGH | N/A |

**Dominant shared cause:** Points 1/2/4 (3 of 6 points) share ONE root: `convert.py:2901` applies exception-3 wrap without checking `_is_container_mirror_block()`. Single-line guard fix resolves all three.

**Highest-value fix:** Add the `_is_container_mirror_block()` check at `convert.py:2901`. Resolves 3 visible defects (double-wrap, hero image bleed, trust-bar 4-in-4 nesting) in one change.
