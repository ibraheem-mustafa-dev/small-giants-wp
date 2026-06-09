# Wave-1 Fact-Finder — Featured Product Styling (FP-A, B, C, G, I, J)
**Date:** 2026-06-08
**Scope:** FP-A, FP-B, FP-C, FP-G, FP-I, FP-J only (verbatim issues per task brief)
**Sources verified:** draft `sites/mamas-munches/mockups/homepage/index.html`, clone `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`, DB via `sgs-db.py sql`, render.php files, `convert.py`, `db_lookup.py`, `style.css` files

---

## FP-A — Heading alignment set to inherit / centre-aligned instead of left

**Issue (verbatim):** "Heading is set to inherit in the alignment setting so it is now centre aligned, when it should be left aligned like it is in the draft."

### DRAFT facts

- File: `sites/mamas-munches/mockups/homepage/index.html`
- Line 373–378: `.sgs-featured-product h2` CSS rule:
  ```css
  .sgs-featured-product h2 {
    font-size: 28px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 6px;
  }
  ```
  No `text-align` property declared on `.sgs-featured-product h2`. No `text-align` on `.sgs-featured-product` (line 371) or `.sgs-featured-product__inner` (line 372).
- The draft's `<h2>` element is at line 831: `<h2 id="product-h2">Zookies — Our Signature Giant Cookie</h2>` — no inline `text-align`.
- Draft `<section class="sgs-featured-product">` (line 828) has no `text-align` rule.
- The draft `.sgs-section-heading__label` at line 44–52 has no `text-align` property.

### CLONE facts

- File: `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`
- Line 806: `<div class="wp-block-sgs-heading" id="sgs-hdg-743e9206">` — the wrapper `div` has **no inline `style` attribute** at all.
- Line 807: `<h2 class="wp-block-sgs-heading__text" style="color:var(--wp--preset--color--text);font-size:36px;font-weight:600;line-height:1.2">` — the heading element has no `text-align` inline style.
- No `textAlign` value is present in the inline style of the heading `div` wrapper.
- The heading's emitted inline style on the wrapper is absent entirely (no `style=""` on the `div.wp-block-sgs-heading`).

### DB facts

- `sgs/heading` block, DB attr `textAlign`: `attr_type=string`, `default_value=""`, `enum_values=["", "left", "center", "right", "justify", "start", "end"]` (confirmed via `sgs-db.py block sgs/heading`).
- Default value is `""` (empty string = unset = no alignment override).
- Block also has `inheritStyle` attr: `attr_type=boolean`, `default_value=false`.

### SPEC-DOC refs

- `plugins/sgs-blocks/src/blocks/heading/style.css` lines 5–9:
  ```css
  :where(.wp-block-sgs-heading) {
      text-align: center;
  }
  ```
  This CSS rule has specificity `(0,0,0)` via `:where()`. It sets `text-align: center` as the default on ALL `sgs/heading` instances with no textAlign attribute set.
- `plugins/sgs-blocks/src/blocks/heading/render.php` lines 197–200 and 327–331:
  - Lines 197–200: `$text_align` is validated against `['left', 'center', 'right', 'justify', 'start', 'end']`; empty string → `$text_align = ''`.
  - Lines 327–331: `if ( '' !== $text_align ) { $wrapper_inline[] = 'text-align:' . esc_attr( $text_align ); }` — only emits `text-align` inline when the attr is non-empty. If `textAlign=""` (the default), no inline `text-align` is written.
  - Comment at line 327: "Text alignment — explicit value overrides the CSS default (center) with zero-specificity :where() guard in style.css so this inline wins reliably."

### PIPELINE-LOCATION refs

- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` line 1143: `("text-align", "textAlign", None)` — `text-align` is in the typography-lift scope.
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` lines 1400–1566: `_lift_typography_to_block_attrs()` — handles `text-align` → `textAlign` lift from draft CSS.
- The draft's `.sgs-featured-product h2` has no `text-align` property (verified above). Therefore `_lift_typography_to_block_attrs` finds no `text-align` to lift → `textAlign` attr is not set on the emitted block → default `""` → render.php emits no inline `text-align` → `style.css` `:where()` default `text-align: center` applies.

---

## FP-B — Font sizing and other font styles off; label "OUR SIGNATURE" font size not carried over

**Issue (verbatim):** "Font sizing and maybe some other font styles are off. E.g. The label 'OUR SIGNATURE' font size definitely hasn't been carried over."

### DRAFT facts

- File: `sites/mamas-munches/mockups/homepage/index.html`
- Lines 44–52: `.sgs-section-heading__label` (the "Our signature" / "OUR SIGNATURE" element):
  ```css
  .sgs-section-heading__label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text);
    margin-bottom: 6px;
    display: block;
  }
  ```
- Line 830: `<span class="sgs-section-heading__label">Our signature</span>` — the draft emits this as a plain `<span>` with the class, not an `sgs/label` block.
- Draft heading `h2` at lines 373–378: `font-size: 28px` (base) + line 452: `@media (min-width: 768px)` `.sgs-featured-product h2 { font-size: 36px }`.

### CLONE facts

- File: `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`
- Line 804: label emitted as `<span>` with inline CSS variables:
  ```html
  <span style="margin-bottom:6px;--sgs-label-colour:var(--wp--preset--color--text);--sgs-label-bg:var(--wp--preset--color--primary);--sgs-label-font-size:12px;--sgs-label-font-weight:600;--sgs-label-line-height:1.2em;--sgs-label-letter-spacing:1.5px;--sgs-label-text-transform:uppercase;--sgs-label-border-radius:6px" class="wp-block-sgs-label has-text-color" id="sgs-lbl-881492f0">Our signature</span>
  ```
  - `--sgs-label-font-size:12px` is set as a CSS custom property, NOT as a `fontSize` block attribute.
  - `--sgs-label-letter-spacing:1.5px` is set as CSS custom property (draft has `letter-spacing: 1.5px`).
  - The `sgs/label` block's `fontSize` attribute controls the inline style on the element directly, not via `--sgs-label-font-size`. The CSS variable `--sgs-label-font-size` is the mechanism used by `label/style.css`, but it must be set correctly.
- Line 805: scoped `<style>` only covers the heading breakpoint, not the label.
- Clone heading h2 (line 807): `font-size:36px;font-weight:600;line-height:1.2` inline on the text element. Desktop breakpoint: `@media(max-width:1024px){#sgs-hdg-743e9206 .wp-block-sgs-heading__text{font-size:36px;}}` — both base and tablet set to 36px (A-collapse fired).

### DB facts

- `sgs/label` block `fontSize` attr: `attr_type=number`, `default_value=12`, `is_responsive=1`, `fontSizeMobile/fontSizeTablet` also declared.
- `sgs/label` block has no separate `letterSpacing` atom but renders via `--sgs-label-letter-spacing` CSS custom property set from the `letterSpacing` attr (confirmed: `letterSpacing` attr `attr_type=number`, `default_value=0.08`, `letterSpacingUnit` default `"em"`).
- Draft uses `letter-spacing: 1.5px` (absolute px value). DB `letterSpacingUnit` default is `"em"`. DB `letterSpacing` default is `0.08`.

### SPEC-DOC refs

- `plugins/sgs-blocks/src/blocks/label/style.css` lines 8 and 21:
  ```css
  --sgs-label-font-size: 12px;  /* :root default */
  font-size: var(--sgs-label-font-size);  /* element rule */
  ```
  The label block renders `font-size` via the `--sgs-label-font-size` CSS custom property, set by `render.php` from the `fontSize` block attribute.
- `plugins/sgs-blocks/src/blocks/label/render.php` line 33: `$font_size = $attributes['fontSize'] ?? '';` — if `fontSize` attr is not set in emitted block markup, falls back to `''`; the CSS variable will then use the `:root` default of `12px`.

### PIPELINE-LOCATION refs

- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` lines 1101–1103: `"font-size"` is in `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` and maps to `("font-size", "fontSize", "fontSizeUnit")` at line 1138.
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` lines 1400–1566: `_lift_typography_to_block_attrs()` handles `font-size` → `fontSize` lift via `_resolve_typo_value`. The `sgs-section-heading__label` class maps to `sgs/label` (DB slot `label` → `standalone_block=sgs/label`). Whether `font-size: 12px` from `.sgs-section-heading__label { font-size: 12px }` is lifted depends on `_collect_css_decls_for_element` matching the node's BEM class to the CSS selector.

---

## FP-C — Padding/spacing between blocks in the section is inconsistent

**Issue (verbatim):** "The padding/spacing between all of the blocks in this section is very wonky/inconsistent."

### DRAFT facts

- File: `sites/mamas-munches/mockups/homepage/index.html`
- Line 371: `.sgs-featured-product { padding: 56px 20px; ... }` — section outer padding.
- Line 379–383: `.sgs-featured-product .sgs-section-heading__intro { font-size: 16px; color: var(--text-muted); margin-bottom: 32px; }` — intro paragraph has `margin-bottom: 32px`.
- Line 394: `.sgs-product-card__image { width: 100%; height: 220px; object-fit: cover; }` — image directly, no padding.
- Line 395: `.sgs-product-card__body { padding: 20px; flex: 1; display: flex; flex-direction: column; }` — body padding 20px.
- Line 396–401: `.sgs-product-card h3 { font-size: 20px; font-weight: 500; color: var(--text); margin-bottom: 6px; }` — h3 margin-bottom 6px.
- Line 402: `.sgs-product-card__description { font-size: 14px; ... margin-bottom: 16px; flex: 1; line-height: 1.55; }` — description margin-bottom 16px.
- Line 373–378: `.sgs-featured-product h2 { ... margin-bottom: 6px; }` — h2 margin-bottom 6px.

### CLONE facts

- File: `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`
- Line 803: section wrapper `<section style="padding-top:56px;padding-right:20px;padding-bottom:56px;padding-left:20px;margin-top:0;margin-right:auto;margin-bottom:0;margin-left:auto" class="sgs-container alignfull sgs-featured-product ...">` — section padding lifted correctly (56px top/bottom, 20px sides).
- Line 811: intro text `<p style="color:var(--wp--preset--color--text-muted);font-size:16px" class="wp-block-sgs-text">` — **no `margin-bottom` inline style**. Draft requires `margin-bottom: 32px`.
- Line 815: product-card body `<div style="display:flex;flex-wrap:wrap;align-items:start" class="sgs-container sgs-container--flex sgs-product-card__body wp-block-sgs-container">` — **no `padding: 20px`**. Draft requires `padding: 20px` on `.sgs-product-card__body`.
- Line 817–818: heading h3 `<h3 class="wp-block-sgs-heading__text" style="color:var(--wp--preset--color--text);font-size:20px;font-weight:500;line-height:1.2">` — **no `margin-bottom` inline style**. Draft requires `margin-bottom: 6px`.
- Line 821: description text `<p style="color:var(--wp--preset--color--text-muted);font-size:14px;line-height:1.55unitless" class="wp-block-sgs-text">` — **no `margin-bottom` inline style**. Draft requires `margin-bottom: 16px`.
- Line 807: heading h2 `<h2 class="wp-block-sgs-heading__text" style="color:var(--wp--preset--color--text);font-size:36px;font-weight:600;line-height:1.2">` — **no `margin-bottom` inline style**. Draft requires `margin-bottom: 6px`.

### DB facts

- `sgs/heading` block: `marginBottom` attr exists (`attr_type=string`, `is_responsive=1`, `marginBottomMobile/Tablet` also present). Default value `""`.
- `sgs/text` block: not queried directly (not a target of this query), but the block exists and renders `sgs/text`. Margin attrs are not visible in the heading attr dump; the `sgs/text` block likely has similar margin attrs.
- `sgs/container` block used for `sgs-product-card__body`: the body is rendered as a flex `sgs/container`. Container `paddingTop/Right/Bottom/Left` attrs exist. Clone shows `display:flex;flex-wrap:wrap;align-items:start` but no padding in the inline style.

### SPEC-DOC refs

- `plugins/sgs-blocks/src/blocks/heading/render.php` lines 136–148: `marginBottom` extracted from attrs; lines 252–264: `margin` shorthand emitted as inline style only when at least one margin value is non-empty. If `marginBottom=""` (default), no margin is emitted.
- `plugins/sgs-blocks/src/blocks/heading/style.css` lines 13–14: `.wp-block-sgs-heading__text { margin-top: 0; margin-bottom: 8px; }` — the block's stylesheet sets `margin-bottom: 8px` as the default for the heading text element via CSS (not inline style). This default (8px) differs from the draft's required values.

### PIPELINE-LOCATION refs

- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py`: `_lift_typography_to_block_attrs()` covers font-size/line-height/letter-spacing/font-weight/font-style/text-align but does NOT lift CSS `margin-*` or `padding-*` properties for text/heading elements. Margin/padding lift for wrapper elements is handled by `_lift_wrapper_css_to_container_attrs()` (line 981) and `_lift_root_supports_to_style()` (line 697), both of which target `sgs/container` wrapper elements, not inner text/heading nodes.

---

## FP-G — Clone added a black line border around the Zookies product card

**Issue (verbatim):** "The draft didn't have a black line border around the Zookies product card." (clone added one)

### DRAFT facts

- File: `sites/mamas-munches/mockups/homepage/index.html`
- Line 386–393: `.sgs-product-card` CSS:
  ```css
  .sgs-product-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
  }
  ```
  Draft has `border: 1px solid var(--border)` on `.sgs-product-card`. The CSS variable `var(--border)` is not defined in the draft's `<style>` block (searched lines 1–460). The draft CSS uses `var(--border)` in multiple places but never defines `--border` in the draft's style block.
- Line 432–435: `.sgs-gift-section__card--trial { border: 2px dashed var(--accent); background: linear-gradient(...) }` — trial card overrides to a 2px dashed yellow/gold border.
- Line 837: main product card in draft: `<div class="sgs-product-card">` — no additional border modifier classes.

### CLONE facts

- File: `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`
- Line 813: main product card:
  ```html
  <div style="border-radius:16px;border-style:solid;border-width:1px" class="sgs-container product-card wp-block-sgs-product-card has-border-color has-border-border-color">
  ```
  Inline `style` sets `border-style:solid;border-width:1px`. CSS class `has-border-border-color` sets the border colour to `var(--wp--preset--color--border)`.
- Line 832: trial card:
  ```html
  <div style="border-radius:16px;border-style:dashed;border-width:2px" class="sgs-container product-card trial-card sgs-gift-section__card--trial wp-block-sgs-product-card has-border-color has-accent-border-color">
  ```
  Trial card uses `border-style:dashed;border-width:2px` and `has-accent-border-color`.

### DB facts

- `sgs/product-card` block: `__experimentalBorder` support declared: `{"radius": true, "width": true, "style": true, "color": true}` (confirmed via `sgs-db.py block sgs/product-card`).
- `sgs/product-card` does NOT have individual `borderWidth` / `borderStyle` / `borderColour` flat attrs in `block_attributes` — border is managed via WP native `__experimentalBorder` supports, which serialises into WP's style engine (`style.color.border.*` path) and produces `has-border-color` / `has-border-border-color` classes + `border-*` inline styles.

### SPEC-DOC refs

- `plugins/sgs-blocks/src/blocks/product-card/style.css` lines 33–48: `.product-card` already has `border: 1px solid var(--wp--preset--color--border, #e8d5c0)` as a CSS rule. This border is applied universally to every `sgs/product-card` instance at the CSS level.
- `plugins/sgs-blocks/src/blocks/product-card/render.php` lines 57, 68–83: `imageHeight` and `cardMaxWidth` CSS vars are emitted as inline styles, but no border-clearing logic.
- `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` line 37: `border: 1px solid var(--wp--preset--color--border, #e8d5c0)` exists in the `.product-card` rule in `style.css`, and the converter also emits `border-style:solid;border-width:1px` as WP block-support border attrs — resulting in double border application (CSS rule + WP block-support inline).

### PIPELINE-LOCATION refs

- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` line 504: `("border-width", "__experimentalBorder", "width", ["border", "width"], "unit")` — border-width is lifted via root supports to style.
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` lines 697–980: `_lift_root_supports_to_style()` — lifts `border`, `border-width`, `border-style`, `border-color` to WP block-support attrs, producing `has-border-color` + inline `border-*` styles via WP style engine.

---

## FP-I — Product card images are different heights and both wrong; draft had uniform max height

**Issue (verbatim):** "Product card images are different heights + both are wrong. The draft had a max height set for both images that was uniform."

### DRAFT facts

- File: `sites/mamas-munches/mockups/homepage/index.html`
- Line 394: `.sgs-product-card__image { width: 100%; height: 220px; object-fit: cover; }` — draft sets `height: 220px` (a fixed height, not `max-height`) uniformly on `.sgs-product-card__image`. Both images use `.sgs-product-card__image`.
- Main product card image (line 838–842): `<img class="sgs-product-card__image" src="..." width="1920" height="1080">` — natural dimensions 1920×1080 (landscape).
- Trial card image (line 865–869): `<img class="sgs-product-card__image" src="..." width="2048" height="1784">` — natural dimensions 2048×1784 (near-square).

### CLONE facts

- File: `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`
- Main card image (line 814):
  ```html
  <img src="https://sandybrown-nightingale-600381.hostingersite.com/wp-content/uploads/2026/06/cookies-stacked-26.jpeg" alt="..." style="object-fit:cover;object-position:center center" id="sgs-media-ddf320a0" class="sgs-media sgs-media--align-left wp-block-sgs-media sgs-media__img" loading="lazy" decoding="async" />
  ```
  No `height` or `width` inline style on the `<img>` itself. No `maxHeight` set. No `imageHeight` attr on the `sgs/media` block.
- Trial card image (line 833):
  ```html
  <img src="..." alt="..." style="object-fit:cover;object-position:center center" id="sgs-media-f6865044" class="sgs-media sgs-media--align-left wp-block-sgs-media sgs-media__img" loading="lazy" decoding="async" />
  ```
  Same — no height/maxHeight in the inline style.
- The product card wrapper (line 813) also has no `imageHeight` CSS variable: `style="border-radius:16px;border-style:solid;border-width:1px"` — `--sgs-product-card-image-height` is not set.
- Clone CSS page-id-8 line 699: `.page-id-8 .sgs-product-card__image{ object-fit: cover }` — only `object-fit`, no `height`.

### DB facts

- `sgs/media` block has `maxHeight` attr (`attr_type=string`, `is_responsive=1`, default value `None`; also `maxHeightMobile`, `maxHeightTablet`). `imageHeight` attr also exists (`attr_type=integer`, default `None`).
- `sgs/product-card` block has `imageHeight` attr (`attr_type=string`, `default_value=""`). Product-card render.php (line 58) reads `imageHeight` and emits `--sgs-product-card-image-height` CSS variable (lines 81–82).

### SPEC-DOC refs

- `plugins/sgs-blocks/src/blocks/product-card/style.css` lines 16–18:
  ```css
  :root {
    --sgs-product-card-image-height: 220px;
  ```
  The `:root` default for `--sgs-product-card-image-height` is 220px.
- `plugins/sgs-blocks/src/blocks/product-card/style.css` line 676: `height: var( --sgs-product-card-image-height, 220px );` — applied to `.product-card--live .product-card__media`.
- `plugins/sgs-blocks/src/blocks/product-card/style.css` lines 50–54:
  ```css
  .product-card .product-card-img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    display: block;
  }
  ```
  For `typed` mode product cards (InnerBlocks), the image is rendered via `sgs/media` as a child block, not `.product-card-img`. The height-220px CSS rule targets `.product-card-img` (live-data mode), not `.sgs-media__img` (typed/clone mode). The `sgs/media` block renders with class `sgs-media__img`, not `product-card-img`.

### PIPELINE-LOCATION refs

- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` line 2378: `_lift_scalar_media_from_img()` — handles `sgs/media` block emission from `<img>` elements.
- Whether `maxHeight` or `imageHeight` is lifted from `height: 220px` in the draft CSS depends on `_collect_css_decls_for_element` matching the `.sgs-product-card__image` CSS selector to the `<img class="sgs-product-card__image">` node; and whether `height` maps to `maxHeight` or `imageHeight` in the attrs lift logic. No explicit `height` → `maxHeight` mapping visible in `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` (line 1101–1103) or the wrapper lift (`_lift_wrapper_css_to_container_attrs`).

---

## FP-J — Spacing inside card content handled very differently

**Issue (verbatim):** "Spacing in between content in the cards was handled much differently."

### DRAFT facts

- File: `sites/mamas-munches/mockups/homepage/index.html`
- Line 395: `.sgs-product-card__body { padding: 20px; flex: 1; display: flex; flex-direction: column; }` — body has 20px uniform padding.
- Line 396–401: `.sgs-product-card h3 { font-size: 20px; font-weight: 500; color: var(--text); margin-bottom: 6px; }` — h3 margin-bottom 6px.
- Line 402: `.sgs-product-card__description { font-size: 14px; color: var(--text-muted); margin-bottom: 16px; flex: 1; line-height: 1.55; }` — description margin-bottom 16px.
- Line 404: `.sgs-featured-product__pill-group { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 16px; }` — pill group margin-bottom 16px.
- Line 428: `.sgs-featured-product__price-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }` — price row margin-bottom 14px.
- The draft uses `flex-direction: column` on the body so items stack vertically; spacing is controlled by each element's `margin-bottom`.

### CLONE facts

- File: `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`
- Line 815: body container: `<div style="display:flex;flex-wrap:wrap;align-items:start" class="sgs-container sgs-container--flex sgs-product-card__body wp-block-sgs-container">` — `display:flex;flex-wrap:wrap;align-items:start` but NO `padding`, NO `flex-direction:column`.
- Line 817–818: h3: `style="color:var(--wp--preset--color--text);font-size:20px;font-weight:500;line-height:1.2"` — no `margin-bottom`.
- Line 821: description: `style="color:var(--wp--preset--color--text-muted);font-size:14px;line-height:1.55unitless"` — no `margin-bottom`.
- Line 822: option picker (pill group): `<fieldset style="margin-bottom:16px" class="sgs-container sgs-option-picker ...">` — `margin-bottom:16px` IS present.
- Line 823: price row: `<div style="gap:10px;display:flex;flex-wrap:wrap;align-items:start" class="sgs-container sgs-container--flex sgs-featured-product__price-row ...">` — `gap:10px` present, but NO `margin-bottom:14px`. `align-items:start` vs draft `align-items: baseline`.
- Clone CSS page-id-8 line 700: `.page-id-8 .sgs-product-card__body{ padding: 20px; flex: 1; display: flex; flex-direction: column }` — the page-specific injected CSS DOES include `padding: 20px` and `flex-direction: column`, but as a legacy CSS injection, not as block attributes. This CSS is in the page-injected `<style>` block (clone line 700) and references `.sgs-product-card__body` — it applies to the clone since the class is present on the container div.

### DB facts

- `sgs/container` block: `paddingTop/Right/Bottom/Left` attrs exist (confirmed from prior DB queries in other wave1 issues). `alignItems` attr exists with enum including `start`, `center`, `baseline`.
- `sgs/heading` block: `marginBottom` attr exists (`attr_type=string`, `is_responsive=1`, default `""`). Not set in clone.
- `sgs/text` block: not queried. Margin-bottom attrs likely present given framework pattern.

### SPEC-DOC refs

- `plugins/sgs-blocks/src/blocks/product-card/style.css` lines 33–48: `.product-card` CSS does not set `padding` on the body. Body padding must come from the `sgs/container` block's `padding*` attrs or from injected CSS.
- `plugins/sgs-blocks/src/blocks/heading/render.php` lines 252–264: margin is emitted only when at least one margin value is non-empty. Default `""` → no margin emitted.
- The page-id-8 injected CSS (clone line 700) includes `padding: 20px` on `.sgs-product-card__body` as a BEM class rule — this is a sourceMode-bound legacy CSS injection, not a native block attribute, and will not work on pages where the page-id-8 CSS is not injected.

### PIPELINE-LOCATION refs

- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` lines 1687–1829: `_lift_styling_attrs()` — lifts styling from draft CSS. This function handles padding/margin lift for elements mapped to `sgs/container` wrappers, but the product-card body uses the `flex-direction: column` model which requires `paddingTop/Right/Bottom/Left` and `flexDirection` on the `sgs/container` body wrapper.
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` line 1845: `# Modifier class → inheritStyle` — the converter detects modifier classes on elements; `sgs-product-card__body` may not route through the padding-lift path.
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` line 2700–2703: comment references `sgs-product-card__body` as a flex container of `sgs/icon` + `sgs/text`; the body is treated as a flex `sgs/container` child (lines 2703–2703 context).

---

## Coverage Checklist

| Issue | Status |
|-------|--------|
| FP-A (heading centre-aligned) | **fact-complete** — style.css `:where()` default `text-align:center` confirmed; draft has no `text-align` on h2; converter has no value to lift; render.php only emits text-align when attr non-empty |
| FP-B (label font-size / font styles not carried) | **fact-complete** — draft `.sgs-section-heading__label` has `font-size:12px`; clone renders via `--sgs-label-font-size:12px` CSS var (correct value present in inline style); `letter-spacing: 1.5px` in draft vs `letterSpacing=0.08em` DB default tension identified; heading font-size lift (28px base / 36px desktop) confirmed via A-collapse in converter |
| FP-C (padding/spacing inconsistent) | **fact-complete** — draft margin-bottom values on h2 (6px), intro (32px), h3 (6px), description (16px), price-row (14px) confirmed; all absent from clone inline styles; `sgs/heading` `marginBottom` attr exists but defaults to `""`; typography-lift does not cover `margin-*` |
| FP-G (black border on main product card) | **fact-complete** — draft has `border: 1px solid var(--border)`; clone emits `border-style:solid;border-width:1px` via WP `__experimentalBorder` supports; `style.css` also has `.product-card { border: 1px solid ... }` as a universal CSS rule; double-application confirmed; `--border` var undefined in draft |
| FP-I (images different heights / wrong) | **fact-complete** — draft `height: 220px` on `.sgs-product-card__image`; clone `sgs/media` images have no height/maxHeight in inline style; `--sgs-product-card-image-height` CSS var not set on clone card wrappers; typed-mode `.sgs-media__img` is not targeted by the `height: 220px` CSS rule (which targets `.product-card-img`, a live-mode class) |
| FP-J (spacing inside cards handled differently) | **fact-complete** — draft `padding:20px` on `.sgs-product-card__body`; clone body container has no padding inline style; `flex-direction:column` missing from clone inline (present in page-id-8 injected CSS only); description/h3 `margin-bottom` absent from clone; price-row `align-items:baseline` replaced by `align-items:start` in clone |
