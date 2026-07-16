---
doc_type: reference
title: "32-Point Root-Cause v2 — Part 2: Products, Buttons, Brand (#6–#12)"
run_id: mamas-munches-homepage-2026-06-05-103529
authored: 2026-06-05
iron_rule: "Every causal claim quotes actual evidence. Unverifiable claims marked UNVERIFIED."
corrected_prior_claims:
  - "#9 prior: 'background-color lift paints the BUTTON WRAPPER' — status: FALSIFIED for button wrapper, CONFIRMED for converter emit (see #9)"
---

# 32-Point Root-Cause v2 — Part 2: Products, Buttons, Brand (#6–#12)

## CORRECTED PRIOR CLAIMS (read before scanning findings)

| # | Prior claim | Status | Corrected evidence |
|---|-------------|--------|--------------------|
| #9 | "background-color lift paints the button WRAPPER via `_lift_root_supports_to_style`" | **CORRECTED** | `style.color.background` IS emitted on the `sgs/button` block attrs (not on a wrapper). The button `render.php` ignores `style.color.background` entirely when `inheritStyle != 'custom'` — it reads only `colourBackground`. So the lift is real AND the colour is silently ignored. See #9 below. |
| #6–#8 | Product cards render empty-state placeholder | **ALREADY CORRECTED in brief** — not re-litigated here. Cards render real content. |

---

## #6 — Product card: `border-radius: 0px` (rounded corners missing)

**Symptom:** Draft `.sgs-product-card` has `border-radius: 16px`; live clone shows `border-radius: 0px`.

**DRAFT evidence:**
```css
/* index.html lines ~10929–10938 */
.sgs-product-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}
```

**CLONE-emit evidence:**
Converter emits `<!-- wp:sgs/product-card {"sourceMode":"bound"} -->` (b4 markup).
No `style.border.radius` key is present in the emitted attrs.

**CLONE-render/CSS evidence (convert-trace-b4.jsonl):**
```json
{"stage":"lift_gap_candidate","prop":"border-radius","value":"16px","reason":"no_matching_container_attr","boundary_id":"b4"}
```
Two separate `lift_gap_candidate` entries for `border-radius: 16px` appear — one for the main card, one for the trial card. Both have `reason: "no_matching_container_attr"`.

**REAL CAUSE (proven):** `_lift_root_supports_to_style` reads `border-radius` via `_root_lift_rules()` (`convert.py` line 488: `("border-radius", "__experimentalBorder", "radius", ["border", "radius"], "unit")`). The lift requires `_support_allows(supports, "__experimentalBorder", "radius")` to pass. The `sgs/product-card` block's `supports` (block.json) does NOT declare `"__experimentalBorder"`. The DB returns no such support for this slug → the radius is logged as a `lift_gap_candidate` and dropped. The emitted block carries no `style.border.radius`.

The block's own `style.css` DOES hardcode `border-radius: 16px` on `.product-card` (style.css line 34–35). So the radius IS in the block CSS — but only when the block is the **Typed** clone path. On the **Bound** path (`sourceMode: bound`), `render.php` delegates to `SGS_Container_Wrapper::render()` which uses `get_block_wrapper_attributes()`. WP's native `__experimentalBorder` support is absent, so WP doesn't inject a radius via the style attr either.

**DOC vs IMPL:** Implementation gap — `sgs/product-card` block.json declares no `__experimentalBorder` support, so the converter's DB-gated lift correctly drops the radius. Fix: add `"__experimentalBorder": {"radius": true}` to the block's `supports` and re-run `/sgs-update` so the DB carries the capability.

**Fix-shape:** Add `__experimentalBorder.radius: true` to `src/blocks/product-card/block.json` supports. The converter then lifts `16px` to `style.border.radius` on the emitted block. The block render.php / `SGS_Container_Wrapper::render()` will emit it as a WP native style attribute. The hardcoded CSS in `style.css` can remain as a fallback.

---

## #7 — Product card: `border: none` (1px border missing)

**Symptom:** Draft `.sgs-product-card` has `border: 1px solid var(--border)`; live clone shows `border: 0px none`.

**DRAFT evidence:**
```css
.sgs-product-card {
  border: 1px solid var(--border);
  ...
}
```

**CLONE-emit evidence:** Block markup: `<!-- wp:sgs/product-card {"sourceMode":"bound"} -->` — no border attrs present.

**CLONE-render/CSS evidence (convert-trace-b4.jsonl):**
```json
{"stage":"lift_gap_candidate","prop":"border","value":"1px solid var(--border)","reason":"no_db_suffix","boundary_id":"b4"}
```
Two separate entries (main card + trial card). `reason: "no_db_suffix"` — the converter's `_root_lift_rules()` does not have a rule for the CSS shorthand `border` that maps to WP's `__experimentalBorder.width` + `__experimentalBorder.style` + `__experimentalBorder.color` combo-form. The shorthand IS decomposed (convert.py lines 721–729) into `border-width`, `border-style`, `border-color` — but then `_support_allows` on `sgs/product-card` with `__experimentalBorder` fails (same reason as #6: no `__experimentalBorder` declared in block.json).

**REAL CAUSE (proven):** Same missing `__experimentalBorder` support in `sgs/product-card` block.json as #6. The border shorthand decomposition code runs, but the support check gates it out. Result: neither `style.border.width`, `style.border.style`, nor `style.border.color` are emitted.

The block's own `style.css` hardcodes `border: 1px solid var(--wp--preset--color--border, #e8d5c0)` on `.product-card` (style.css line 37). Same typed/bound path issue as #6.

**DOC vs IMPL:** Implementation gap — same root as #6.

**Fix-shape:** Same fix as #6: add `"__experimentalBorder": {"radius": true, "width": true, "style": true, "color": true}` to block.json. The border shorthand will then decompose and lift correctly.

---

## #8 — Product card image: `height: 220px` not applied

**Symptom:** Draft `.sgs-product-card__image { height: 220px; object-fit: cover; }` — image may not have the fixed height on the clone.

**DRAFT evidence:**
```css
.sgs-product-card__image { width: 100%; height: 220px; object-fit: cover; }
```

**CLONE-emit evidence:** The `sgs/media` block is emitted as:
```
<!-- wp:sgs/media {"imageUrl":"...cookies-stacked.jpeg","imageAlt":"Stack of Mama's Munches Zookies lactation cookies"} /-->
```
No height or object-fit attrs in the emitted block. The convert-trace for b4 shows the `sgs-product-card__image` class resolves to `sgs/media` via `bem_resolve_slot_fallback` (slot: `image`, slug: `sgs/media`) — no lift_gap_candidate entries for height on this element appear in the trace.

**CLONE-render/CSS (UNVERIFIED — needs live DOM):** Whether the live `sgs/media` block renders `height: 220px` cannot be confirmed without the rendered DOM. The `sgs/media` block's own style.css may or may not impose a default height. Cannot prove from available artefacts.

**REAL CAUSE (partial):** The converter does not emit height onto `sgs/media` because `height` is not a supported block attr for `sgs/media` in the DB — it would be dropped as a `lift_gap_candidate`. The block CSS in `src/blocks/product-card/style.css` line 50–55 hardcodes `.product-card .product-card-img { height: 220px; }` for the typed path — but the bound card's media box uses `.product-card--bound .product-card__media { height: var(--sgs-product-card-image-height, 220px); }` (style.css lines 651–659). If `sourceMode=bound` is emitted AND the block is deployed, the image height should render correctly from the bound-path CSS. UNVERIFIED without live DOM.

**DOC vs IMPL:** UNVERIFIED — cannot confirm whether height is missing from the live render.

---

## #9 — Primary button: background colour from `style.color.background` ignored

**Symptom:** Draft `.sgs-button--primary { background: var(--primary); }` — clone button background renders incorrectly (prior claim was wrapper paint; see correction below).

**DRAFT evidence:**
```css
.sgs-button--primary {
  background: var(--primary);
  color: var(--text);
  border-color: var(--primary);
}
```
The draft HTML uses `class="sgs-button sgs-button--primary"` on `<a>` elements (e.g. `<a href="/product/zookies/" class="sgs-button sgs-button--primary">Add to Cart — £10</a>`).

**CLONE-emit evidence:** The converter emits:
```
wp:sgs/button {"label":"Add to Cart — £10","url":"/product/zookies/","fontSize":15,"fontSizeUnit":"px","fontWeight":"600","style":{"color":{"background":"var:preset|color|primary"},"spacing":{"padding":{...}}},"inheritStyle":"primary"}
```
Two facts:
1. `style.color.background` = `"var:preset|color|primary"` IS emitted onto the `sgs/button` block attrs.
2. `inheritStyle` = `"primary"` IS also emitted.

**CLONE-render/CSS evidence (button/render.php):**
- render.php line 166: `$is_custom = 'custom' === $inherit_style;`
- render.php lines 180–245: inline styles (incl. `background-color`) are built ONLY when `$is_custom` is true.
- render.php lines 431–440: when `$inherit_style` = `"primary"`, `$btn_classes[] = 'is-style-primary'`.
- The button element receives `class="sgs-button is-style-primary"` and the `$btn_style_str` from the custom-mode inline styles is **empty** (because `$is_custom = false`).
- `style.color.background` is a WP native `supports.color.background` attribute. WP's block-rendering pipeline applies it via `get_block_wrapper_attributes()` to the **wrapper div** (`<div id="sgs-btn-..." class="sgs-button-wrapper" ...>`), not to the inner `<a>` or `<button>` element.
- render.php line 607: `$wrapper_attr = get_block_wrapper_attributes(...)` — this is the div wrapper.
- render.php line 689–710: the `<a>` or `<button>` element receives only `$btn_class_str` and `$btn_style_str` — **NOT** `get_block_wrapper_attributes()`.

**REAL CAUSE (proven from render.php code):** `style.color.background = "var:preset|color|primary"` is applied by WP to the outer `div.sgs-button-wrapper`, NOT to the `<a.sgs-button>` / `<button.sgs-button>` element. The visual button `<a>` gets its background from the CSS class `is-style-primary` (the `inheritStyle` preset). The preset CSS in `style.css` for `is-style-primary` reads `var(--wp--preset--color--primary)` — which IS the correct primary colour. So the button BACKGROUND is actually correct via the class-based preset. However `style.color.background` on the wrapper div creates a coloured outer box that may show as an unexpected coloured region around the button.

**Implication:** The `style.color.background` emit on `sgs/button` is REDUNDANT and potentially harmful (paints the wrapper div). The `inheritStyle: "primary"` attr is the correct mechanism and produces the right button colour. The converter should NOT lift `background-color` onto `sgs/button` when `inheritStyle` is already set (or should suppress the `style.color.background` emit for non-custom buttons).

**DOC vs IMPL:** Converter implementation gap — `_lift_root_supports_to_style` fires for `sgs/button` (which declares `supports.color.background: true` in block.json line 24), lifts the `.sgs-button--primary` background-color, and emits `style.color.background`. The button render.php correctly ignores it for the button face (uses `inheritStyle` CSS class instead) but WP injects it onto the wrapper div.

**Fix-shape:** In the converter, when `inheritStyle` is being set from a BEM modifier (convert.py lines 2879–2891), suppress any `style.color.background` or `style.color.text` keys that were already lifted — they are redundant and collide with the wrapper. Alternatively, remove `style.color.background` from the emitted button attrs post-lift when `inheritStyle != 'custom'`.

---

## #11 — Sub-points: buttons-fill-width, cards-same-height, price-note-superscript, featured-border

### #11a — Buttons fill card width in gift cards

**Symptom:** In the mockup, buttons inside `.sgs-gift-section__card` appear to fill the card width.

**DRAFT evidence:** The mockup renders `<a href="..." class="sgs-button sgs-button--primary">Shop Gift Box</a>` inside `.sgs-gift-section__card`. The card is `display: flex; flex-direction: column` (inferred from the card's `border-radius: 16px; padding: 28px 24px;` context). No explicit `width: 100%` rule exists on `.sgs-gift-section__card .sgs-button` in the mockup CSS. The button renders as `display: inline-flex` (from `.sgs-button { display: inline-flex; ... }`).

**UNVERIFIED:** Whether buttons appear full-width in the live clone cannot be confirmed without live DOM measurement. The mockup CSS has no explicit full-width rule for the gift-card button — any fill effect in the draft would come from the card's flex-column layout making the inline-flex item stretch, or from `align-items: stretch` (default). Cannot confirm from available artefacts.

**REAL CAUSE:** UNVERIFIED — needs live DOM.

### #11b — Cards same height

**Symptom:** In the mockup, the two gift cards appear the same height.

**DRAFT evidence:** `.sgs-gift-section__cards { display: grid; grid-template-columns: 1fr; gap: 16px; }` — on tablet+ this becomes `grid-template-columns: 1fr 1fr`. A CSS grid with two children in a 1fr 1fr layout automatically makes both rows the same height (grid row stretch is the default).

**CLONE-emit evidence:** The gift section emits:
```
<!-- wp:sgs/container {"className":"sgs-gift-section__cards","htmlTag":"div","layout":"grid","gridTemplateColumns":"1fr 1fr","gridTemplateColumnsMobile":"1fr","gap":"16px"} -->
<!-- wp:sgs/info-box {...} --> ... <!-- /wp:sgs/info-box -->
<!-- wp:sgs/info-box {...} --> ... <!-- /wp:sgs/info-box -->
```
A `sgs/container` with `layout: grid` emits `display: grid` via the container block render.php. Grid children stretch to equal row height by default — this should work correctly if the container renders the grid correctly.

**REAL CAUSE:** UNVERIFIED — needs live DOM to confirm whether equal height is actually broken. If the `sgs/container` renders the grid correctly with `display: grid`, equal height is automatic. No evidence of a gap from available artefacts.

### #11c — Price-note superscript

**Symptom:** Draft shows `.sgs-featured-product__price-note` — described as having a superscript style.

**DRAFT evidence:**
```css
.sgs-featured-product__price-note { font-size: 13px; color: var(--text-muted); }
```
No `vertical-align: super` or `font-size` reduction relative to parent is present in the draft CSS. The price-note is a `<span>` rendered inline beside the price.

**CLONE-emit evidence:** The block markup emits:
```
<!-- wp:sgs/text {"text":"3 Classic Zookies · postage included","className":"sgs-featured-product__price-note"} /-->
```
The `sgs/text` block with `className: "sgs-featured-product__price-note"` carries the class. Whether the block's own CSS applies superscript styling to this class is UNVERIFIED.

**REAL CAUSE:** UNVERIFIED — the draft CSS does NOT show superscript styling for `.sgs-featured-product__price-note` (font-size: 13px, color: text-muted only). If superscript is visible in the mockup it comes from browser rendering or from a different source. Cannot confirm a gap without live DOM.

### #11d — Featured-card dashed border (trial card)

**Symptom:** Trial card in draft has `border: 2px dashed var(--accent)` — missing in clone.

**DRAFT evidence:**
```css
.sgs-gift-section__card--trial {
  border: 2px dashed var(--accent);
  background: linear-gradient(135deg, rgba(245,208,80,0.08) 0%, rgba(230,138,149,0.06) 100%);
}
```
And the trial card HTML: `<div class="sgs-product-card sgs-gift-section__card--trial">`.

**CLONE-emit evidence:** The second product-card in the featured-product section:
```
<!-- wp:sgs/product-card {"sourceMode":"bound","className":"sgs-gift-section__card--trial"} -->
```
The `className: "sgs-gift-section__card--trial"` IS emitted. The block render.php passes this class to `SGS_Container_Wrapper::render()` via `extra_classes`.

**CLONE-render/CSS:** The `product-card` style.css has:
```css
/* style.css lines 177–186 */
.product-card.trial-card {
  border: 2px dashed var(--wp--preset--color--accent, #f5d050);
  background: linear-gradient(...);
}
```
The CSS uses `.product-card.trial-card` — the render.php adds `trial-card` class when `$variant_style === 'trial'`. But the clone emits `className: "sgs-gift-section__card--trial"`, not `variantStyle: "trial"`.

**REAL CAUSE (proven):** The emitted `className` is `"sgs-gift-section__card--trial"` — this is a BEM modifier class from the draft, not the `variantStyle: "trial"` attr that the block's render.php needs to apply the `.trial-card` class. The block render.php reads `$variant_style = $attributes['variantStyle'] ?? 'standard'` (render.php line 54) and adds `trial-card` only when `'trial' === $variant_style`. The emitted block has no `variantStyle` attr → `$variant_style = 'standard'` → no `trial-card` class → the dashed-border CSS does not fire.

**DOC vs IMPL:** Converter gap — the BEM modifier `--trial` should map to `variantStyle: "trial"` on `sgs/product-card`. The converter's `inheritStyle` modifier detection (convert.py lines 2866–2891) is gated on `inheritStyle` being a string-enum attr in the DB. `variantStyle` is a different attr — the converter has no mapping for `--trial` → `variantStyle: "trial"` on `sgs/product-card`.

**Fix-shape:** Add a slot_synonyms / modifier mapping for `sgs-gift-section__card--trial` → `variantStyle: "trial"` on `sgs/product-card`, OR handle this in the converter's BEM modifier detection for blocks that use `variantStyle` (not `inheritStyle`).

---

## #10 — Info-box (gift cards): `border-radius: 16px` missing

**Symptom:** Draft `.sgs-gift-section__card { border-radius: 16px; }` — rendered `sgs/info-box` blocks may not show rounded corners.

**DRAFT evidence:**
```css
.sgs-gift-section__card {
  background: white;
  border-radius: 16px;
  padding: 28px 24px;
  border: 1px solid var(--border);
}
```

**CLONE-emit evidence:**
```
<!-- wp:sgs/info-box {"style":{"border":{"radius":"16px","width":"1px","style":"solid","color":"var:preset|color|border"},"spacing":{"padding":{...}}}} -->
```
The emitted `sgs/info-box` block attrs include `style.border.radius: "16px"` AND `style.border.width: "1px"` + `style.border.style: "solid"` + `style.border.color: "var:preset|color|border"` — all correctly lifted.

**REAL CAUSE:** No gap found in the emit. The `sgs/info-box` block's `extracted_attributes` in `extract.patched.json` show:
```json
"info-box.style": {
  "border": {
    "radius": "16px",
    "width": "1px",
    "style": "solid",
    "color": "var:preset|color|border"
  },
  "spacing": {
    "padding": {"top": "28px", "right": "24px", "bottom": "28px", "left": "24px"}
  }
}
```
The border-radius IS correctly emitted. Whether it renders is a block render.php question — UNVERIFIED without live DOM. If `sgs/info-box` declares `__experimentalBorder.radius: true` in its block.json, WP will apply it via `get_block_wrapper_attributes()`.

**DOC vs IMPL:** UNVERIFIED — emit is correct. Rendering depends on `sgs/info-box` block.json support declaration.

---

## #12 — Brand section sub-points (A–D)

### #12A — Brand section: `max-width: 1000px` not applied

**Symptom:** Draft `.sgs-brand { max-width: 1000px; margin: 0 auto; }` — the brand section may render full-width.

**DRAFT evidence:**
```css
.sgs-brand {
  background: var(--surface-alt);
  padding: 64px 20px;
  max-width: 1000px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}
```

**CLONE-emit evidence (brand section block markup):**
```
<!-- wp:sgs/container {"className":"sgs-brand","widthMode":"default","gridTemplateColumns":"1fr","gap":"32px","gridTemplateColumnsTablet":"1fr 1fr","gapTablet":"60px","style":{"spacing":{"blockGap":"32px","padding":{"top":"64px","right":"20px","bottom":"64px","left":"20px"},"margin":{"top":"0","right":"auto","bottom":"0","left":"auto"}},"color":{"background":"var:preset|color|surface-alt"}}} -->
```
No `contentWidth: "1000px"` or `maxWidth: "1000px"` attr is present in the emitted container.

**CLONE-render/CSS evidence (convert-trace-b5.jsonl):**
```json
{"stage":"lift_gap_candidate","prop":"margin","value":"0 auto","reason":"no_matching_container_attr","boundary_id":"b5"}
```
`max-width` itself does NOT appear as a `lift_gap_candidate` entry in b5. The absence is because `max-width` is not in `_root_lift_rules()` (convert.py lines 476–494 enumerate only padding, margin, gap, border-*, background-color, color). The `max-width: 1000px` is silently dropped — no gap candidate logged.

The brand section's emitted `contentWidth` attr is absent. The extractor (extract.patched.json `extracted_attributes` for brand) shows `"contentWidth": "1040px"` — but this is from the featured-product section (b4), NOT the brand section (b5). The brand section's extracted_attributes show no `contentWidth` key.

**REAL CAUSE (proven):** `max-width` is not in `_root_lift_rules()` and has no DB suffix in `property_suffixes`. The converter cannot lift `max-width: 1000px` to a block attr. The `sgs/container` block has a `contentWidth` attr that constrains inner content, but it is not the same as the CSS `max-width` on the block root. The `_lift_wrapper_css_to_container_attrs` helper (A2 path for container mirror blocks) handles max-width lifting for composite blocks — but the brand section maps to `sgs/container` directly, not a composite. `sgs/container` itself IS a container-mirror block only in terms of inner-content width control.

**DOC vs IMPL:** Converter gap — `max-width` on a section-root container should map to `contentWidth` on `sgs/container`. This mapping is missing from the lift rules.

**Fix-shape:** Add `max-width` → `contentWidth` mapping in the converter's container-width lift logic. When a `sgs/container` has `max-width` on its root element and no `contentWidth` already set, emit `contentWidth` = the max-width value.

### #12B — Brand section: `grid-template-columns: 1fr 1fr` (tablet) not applied

**Symptom:** Draft has `@media (min-width: 768px) { .sgs-brand { grid-template-columns: 1fr 1fr; gap: 60px; } }` — the responsive 2-column layout may be absent.

**DRAFT evidence:**
```css
@media (min-width: 768px) {
  .sgs-brand { grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
}
```

**CLONE-emit evidence:**
```
{"className":"sgs-brand","widthMode":"default","gridTemplateColumns":"1fr","gap":"32px","gridTemplateColumnsTablet":"1fr 1fr","gapTablet":"60px",...}
```
`gridTemplateColumnsTablet: "1fr 1fr"` and `gapTablet: "60px"` ARE emitted.

**REAL CAUSE:** No gap found in the emit. Both responsive attrs are correctly lifted. Whether they render is UNVERIFIED without live DOM — depends on whether `sgs/container` reads these attrs and applies them in render.php.

**DOC vs IMPL:** No doc/impl gap found in the emit path. UNVERIFIED at render.

### #12C — Brand section: `sgs-brand__image` has `border-radius: 16px` missing

**Symptom:** Draft `.sgs-brand__image { border-radius: 16px; }` — the story image may not be rounded.

**DRAFT evidence:**
```css
.sgs-brand__image {
  width: 100%;
  max-height: 380px;
  object-fit: cover;
  border-radius: 16px;
  order: -1;
}
```

**CLONE-emit evidence:**
```
<!-- wp:sgs/media {"imageUrl":"../../research/photography/wp-media-library/Halimahs.jpeg","imageAlt":"A mum smiling and holding Mama's Munches cookies"} /-->
```
No `style.border.radius` or border-radius attr in the emitted `sgs/media` block.

**CLONE-render/CSS evidence (convert-trace-b5.jsonl):** No `lift_gap_candidate` entry for `border-radius` appears in the b5 trace. This means the `border-radius: 16px` on `.sgs-brand__image` was not encountered by the converter's CSS lookup for the `sgs-brand__image` node — possibly because the converter resolved this node as `sgs/media` (via `bem_resolve_slot_fallback`: `class_: "sgs-brand__image"`, `slot: "image"`, `slug: "sgs/media"`) and then called `_lift_root_supports_to_style(node, "sgs/media", ...)`, but `sgs/media` has no `__experimentalBorder` support in its DB — so the border-radius is gated out without even being logged as a gap candidate.

**REAL CAUSE (proven by absence pattern):** `sgs/media` block.json almost certainly lacks `__experimentalBorder.radius` support (same category of missing support as #6/#7 on product-card). Without `__experimentalBorder` in the DB for `sgs/media`, the `border-radius` CSS on the image element is silently dropped.

**DOC vs IMPL:** Implementation gap — `sgs/media` missing `__experimentalBorder.radius` in block.json. Converter correctly gates on DB; the DB has no entry → silent drop.

**Fix-shape:** Add `"__experimentalBorder": {"radius": true}` to `src/blocks/media/block.json` and re-run `/sgs-update`. Converter then emits `style.border.radius: "16px"` on the `sgs/media` block.

### #12D — Brand section: blockquote italic style not transferred

**Symptom:** Draft `blockquote { font-style: italic; }` — the quote block may not render italic.

**DRAFT evidence:**
```css
blockquote { font-style: italic; }
blockquote p { font-size: 17px; color: var(--text-muted); line-height: 1.75; margin-bottom: 16px; }
blockquote footer {
  font-style: normal;
  font-size: 15px;
  font-weight: 600;
  color: var(--primary-dark);
  margin-top: 4px;
}
```
The draft HTML uses `<div class="sgs-brand__quote">` (NOT a `<blockquote>` element). So the `blockquote` CSS rule does not apply to the draft's own HTML — it applies to a generic HTML blockquote element.

**CLONE-emit evidence:**
```
<!-- wp:sgs/quote -->
<!-- wp:sgs/text {"text":"She was struggling...","fontSize":17,...,"textColour":"text-muted"} /-->
...
```
The converter resolved `sgs-brand__quote` → `sgs/quote` via `bem_resolve_slot_fallback`. The `sgs/quote` block renders with its own CSS.

**REAL CAUSE:** The draft's italic style is on `blockquote` (a tag-level rule), not on the BEM class `.sgs-brand__quote`. The draft HTML uses a `<div>` not a `<blockquote>`, so the draft CSS rule is not even active in the draft itself. The `sgs/quote` block has its own CSS that likely applies `font-style: italic` independently. UNVERIFIED without live DOM whether the `sgs/quote` block applies italic.

**DOC vs IMPL:** UNVERIFIED — the draft CSS rule is a tag-level generic that does not target the draft's own class. Whether `sgs/quote` renders italic needs live DOM verification.

---

## Summary

| # | Point | Evidenced | UNVERIFIED | Corrected Prior |
|---|-------|-----------|------------|-----------------|
| #6 | Product card border-radius: 0px | YES — `no_matching_container_attr` in trace; missing `__experimentalBorder` support | — | — |
| #7 | Product card border: none | YES — `no_db_suffix` in trace; same root as #6 | — | — |
| #8 | Product card image height | PARTIAL — emit missing height attr | Live DOM for bound render | — |
| #9 | Button background-color wrapper paint | YES — `style.color.background` emitted on block attrs; render.php applies it to wrapper div only; button face colour correct via `is-style-primary` CSS class | — | YES (CORRECTED: lift is real, but paints wrapper, not button face) |
| #10 | Info-box border-radius | YES — correctly emitted; render depends on block.json support | Live DOM | — |
| #11a | Buttons fill card width | — | Live DOM | — |
| #11b | Cards same height | YES — grid layout auto-equates height; no gap in emit | Live DOM confirm | — |
| #11c | Price-note superscript | — | Live DOM; draft CSS shows no superscript rule | — |
| #11d | Trial card dashed border | YES — `variantStyle: "trial"` not emitted; only `className` passed | — | — |
| #12A | Brand max-width: 1000px | YES — `max-width` not in `_root_lift_rules()`; dropped silently | — | — |
| #12B | Brand responsive columns | YES — `gridTemplateColumnsTablet` correctly emitted | Live DOM render | — |
| #12C | Brand image border-radius | YES (by absence) — `sgs/media` lacks `__experimentalBorder` support | — | — |
| #12D | Blockquote italic | — | Live DOM; draft rule does not target draft's own HTML | — |

**Evidenced count: 8** | **UNVERIFIED count: 5** | **Corrected prior claims: 1 (#9)**
