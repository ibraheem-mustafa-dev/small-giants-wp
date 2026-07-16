# Wave-1 Fact-Finder — Featured Product Styling Batch 2
**Issues:** FP-K, FP-L1, FP-M, FP-N, FP-O, FP-P
**Date:** 2026-06-08
**Sources verified:** index.html (draft), current-clone-page-source.html (clone), sgs-framework.db (via sgs-db.py), render.php files, convert.py, db_lookup.py, class-sgs-container-wrapper.php

---

## FP-K — "Draft didn't have choose pack size message above the pill buttons to pick pack sizes." (clone ADDED a message not in the draft)

### Issue (verbatim)
Draft didn't have choose pack size message above the pill buttons to pick pack sizes.

### DRAFT facts
- `sites/mamas-munches/mockups/homepage/index.html` line 847–852: The pill group uses `role="group" aria-label="Choose pack size"` with NO visible label text element above the buttons. The `aria-label` is an ARIA attribute on the `<div>`, not rendered text.
  ```html
  <div class="sgs-featured-product__pill-group" role="group" aria-label="Choose pack size">
    <button class="sgs-featured-product__pill" type="button" aria-pressed="false">8-pack</button>
    ...
  ```
- No `<label>`, `<p>`, `<span>`, or other visible text node saying "Choose pack size" exists above the pill group in the draft markup.

### CLONE facts
- `current-clone-page-source.html` line 822: The `sgs/option-picker` renders a visible `<legend>` element with text "Choose pack size":
  ```html
  <fieldset style="margin-bottom:16px" class="sgs-container sgs-option-picker sgs-option-picker--filled sgs-option-picker--medium wp-block-sgs-option-picker">
    <legend id="sgs-op-5-legend" class="sgs-option-picker__label">Choose pack size</legend>
    <div class="sgs-option-picker__options" role="radiogroup" ...>
  ```
- The `<legend>` is a VISIBLE element rendered by `render.php` when `showLabel=true` (the default).

### DB facts
- `sgs/option-picker` attribute `showLabel` (type: `boolean`, default: `true`) — DB query confirmed: row present in `block_attributes`.
- `sgs/option-picker` attribute `label` (type: `string`, default: `"Choose an option"`) — DB confirmed.

### SPEC-DOC refs
- `plugins/sgs-blocks/src/blocks/option-picker/render.php` lines 55, 243–252: `$show_label = $attributes['showLabel'] ?? true;` and `if ( $show_label ) { $legend_html = '<legend ...>...</legend>' }`. When `showLabel=true` (the default), the legend renders visibly with CSS class `sgs-option-picker__label`.

### PIPELINE-LOCATION refs
- `convert.py` lines 2206–2213: The converter reads `aria-label="Choose pack size"` from the draft group container and sets `result["label"] = aria_label` (verbatim: `"Choose pack size"`). No logic sets `showLabel=false`.
- `convert.py` line 2164: Comment states `slot_default_attrs_for injects pillStyle/typeKey defaults AFTER this returns` — `showLabel` is not injected off by any default path.
- `render.php` line 55: `$show_label = $attributes['showLabel'] ?? true;` — the PHP fallback is `true`.

---

## FP-L1 — "Pack size pills styles are basically copied from the primary button style in the clone. Which is completely wrong."

### Issue (verbatim)
Pack size pills styles are basically copied from the primary button style in the clone. Which is completely wrong.

### DRAFT facts
- `index.html` lines 405–420 (`.sgs-featured-product__pill` CSS):
  ```css
  .sgs-featured-product__pill {
    background: var(--surface-cream);         /* #FBF3DC */
    border: 2px solid var(--border);          /* #E8D5C0 */
    border-radius: 8px;
    padding: 7px 13px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);                 /* #6B5C50 */
    min-height: 44px;
  }
  .sgs-featured-product__pill.active {
    border-color: var(--primary);             /* #E68A95 */
    background: rgba(230,138,149,0.1);
    color: var(--text);                       /* #3A2E26 */
  }
  ```
  Key characteristics: cream background, muted-text colour, light border, 8px radius, small font (13px).

### CLONE facts
- `current-clone-page-source.html` line 822: The option-picker block emits class `sgs-option-picker--filled sgs-option-picker--medium`:
  ```html
  class="sgs-container sgs-option-picker sgs-option-picker--filled sgs-option-picker--medium wp-block-sgs-option-picker"
  ```
- `sgs-option-picker--filled` pill CSS (`style.css` lines 192–209):
  ```css
  .sgs-option-picker--filled .sgs-option-picker__pill {
    background-color: var(--sgs-op-bg, var(--wp--preset--color--secondary, #e5e7eb));
    color: var(--sgs-op-text, var(--wp--preset--color--foreground, currentColor));
    border: 2px solid transparent;
  }
  .sgs-option-picker--filled .sgs-option-picker__option input[type="radio"]:checked ~ .sgs-option-picker__pill {
    background-color: var(--sgs-op-sel-bg, var(--wp--preset--color--primary, #1F7A7A));
    color: var(--sgs-op-sel-text, #ffffff);
    border-color: transparent;
    font-weight: 700;
  }
  ```
- The `--sgs-op-sel-bg` override is set in the global style block (`current-clone-page-source.html` line 387): `:root { --sgs-product-card-btn-text: #3A2E26; --sgs-op-sel-text: #3A2E26; ... }` but **no `--sgs-op-bg`** override is set.
- The primary button CSS (clone line 387 inline style block): `--wp--custom--button-presets--primary--background: var(--wp--preset--color--primary)` (coral pink `#E68A95`), `border-radius: 24px`, `padding: 14px 28px`.
- Clone pill button has NO `border-radius: 24px`, NO `padding: 14px 28px`, NO `background: coral`. Visual similarity claim would need pixel verification, but the `filled` style uses `background-color: var(--wp--preset--color--secondary, #e5e7eb)` as default fallback (grey), not the draft's cream+muted-text+visible-border design.

### DB facts
- `sgs/option-picker` attribute `pillStyle` (type: `string`, default: `"outlined"`, enum: `["outlined", "filled", "ghost"]`) — DB confirmed.
- `sgs/option-picker` attributes `pillBgColour`, `pillBorderColour`, `pillTextColour`, `pillSelectedBgColour`, `pillSelectedTextColour` — all present in DB, all default `""` (empty).
- `sgs/option-picker` attribute `pillSize` (type: `string`, default: `"medium"`) — DB confirmed.

### SPEC-DOC refs
- `plugins/sgs-blocks/src/blocks/option-picker/style.css` lines 152–215: `.sgs-option-picker--outlined` and `.sgs-option-picker--filled` define distinct appearances. The draft's visual matches the `outlined` style (visible border, cream/transparent background) not `filled` (solid grey background, no border).

### PIPELINE-LOCATION refs
- `convert.py` line 2164: comment — `slot_default_attrs_for injects pillStyle/typeKey defaults AFTER this returns`. The injected default value of `pillStyle` is not overridden by the converter's explicit handler.
- `convert.py` lines 2166–2216: The `sgs/option-picker` handler returns only `optionItems`, `defaultSelected`, `typeKey`, and `label`. It does NOT set `pillStyle`.
- `render.php` line 60: `$pill_style = $attributes['pillStyle'] ?? 'outlined';` — the PHP fallback is `'outlined'`, but the converter-emitted block in the clone has `pillStyle='filled'` (inferred from rendered class `sgs-option-picker--filled`). The `slot_default_attrs_for` inject (referenced in convert.py comment line 2164) is the mechanism that sets `filled` on this block.

---

## FP-M — "Price font is wrong."

### Issue (verbatim)
Price font is wrong.

### DRAFT facts
- `index.html` line 429:
  ```css
  .sgs-featured-product__price { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 700; color: var(--text); }
  ```
  The price element explicitly uses `font-family: 'Fraunces', serif` — a display serif typeface.

- `index.html` lines 854–857 (HTML structure):
  ```html
  <div class="sgs-featured-product__price-row">
    <span class="sgs-featured-product__price">£10.00</span>
    ...
  ```
  The price element is a `<span>` with class `sgs-featured-product__price`.

### CLONE facts
- `current-clone-page-source.html` line 824:
  ```html
  <p style="color:var(--wp--preset--color--text);font-size:28px;font-weight:700;, serif" class="wp-block-sgs-text">£10.00</p>
  ```
  The inline style is `color:var(--wp--preset--color--text);font-size:28px;font-weight:700;, serif`. The `font-family` value is malformed — the string `, serif` appears after a semicolon (i.e. `font-weight:700;, serif`) which is invalid CSS. No valid `font-family` declaration is present on the element.
  Note: the `--wp--preset--font-family--heading` token (which resolves to `Fraunces, 'DM Serif Display', Georgia, serif` per line 387 CSS) is NOT referenced on the price element.

### DB facts
- `sgs/text` block has attribute `fontFamily` (type: `string`) — DB query confirmed.
- `typography_css_to_attrs()` function in `db_lookup.py` lines 1101–1103: `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` tuple is `("font-size", "line-height", "letter-spacing", "font-weight", "font-style", "text-align")`. The property `font-family` is **DELIBERATELY EXCLUDED** from the lift scope.
- `db_lookup.py` line 1096–1098 (comment):
  ```python
  # The DB classifies more properties as role='typography' (font-family,
  # text-decoration, text-transform) but those are deliberately OUT of the typed
  # flat-attr lift scope here (they have separate handling / no faithful-default
  # need on the cloning path).
  ```

### SPEC-DOC refs
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` lines 1096–1103: `font-family` is not in `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS`; it is never passed to `typography_css_to_attrs()`.
- `plugins/sgs-blocks/src/blocks/text/` (fontFamily attr exists in DB but receives no value from the converter).

### PIPELINE-LOCATION refs
- `db_lookup.py` lines 1096–1103: constant `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` — explicit exclusion of `font-family`.
- `convert.py` lines 2840–2847: `_lift_typography_to_block_attrs` is called for text/heading nodes — but it only processes the 6 props in `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS`; `font-family` never enters the lift.
- `convert.py` line 1324–1330: inline `_TYPOGRAPHY_CSS_TO_ATTRS` local constant (used in `_lift_styling_attrs`) also does not include `font-family`.

---

## FP-N — "Price note is floating like it's an exponent." Origin = the `__price-row` wrapper. Draft `.sgs-featured-product__price-row { display:flex; align-items:baseline; gap:10px; margin-bottom:14px }`. Clone sgs/container has `align-items:start` (changed from baseline) + `flex-wrap:wrap` + an htmlTag setting.

### Issue (verbatim)
Price note is floating like it's an exponent. Origin = the `__price-row` wrapper. Draft `.sgs-featured-product__price-row { display:flex; align-items:baseline; gap:10px; margin-bottom:14px }`. Clone sgs/container has `align-items:start` (changed from baseline) + `flex-wrap:wrap` + an htmlTag setting.

### DRAFT facts
- `index.html` line 428:
  ```css
  .sgs-featured-product__price-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
  ```
  Three key layout properties: `align-items: baseline`, `gap: 10px`, `margin-bottom: 14px`.
- `index.html` lines 854–857 (HTML):
  ```html
  <div class="sgs-featured-product__price-row">
    <span class="sgs-featured-product__price">£10.00</span>
    <span class="sgs-featured-product__price-note">8-pack · Free delivery over £35</span>
  </div>
  ```
  The price-row is a `<div>` with two `<span>` children.

### CLONE facts
- `current-clone-page-source.html` line 823 (main product card price-row):
  ```html
  <div style="gap:10px;display:flex;flex-wrap:wrap;align-items:start" class="sgs-container sgs-container--flex sgs-featured-product__price-row wp-block-sgs-container">
  ```
  - `align-items:start` (DRAFT had `baseline`)
  - `flex-wrap:wrap` (DRAFT had NO flex-wrap — no `flex-wrap` property in the `.sgs-featured-product__price-row` CSS rule)
  - `gap:10px` — matches draft
  - `margin-bottom:14px` — ABSENT from the clone inline style
  - `htmlTag` not shown in the inline style but the element renders as `<div>` (sgs/container default `htmlTag` is `"section"`, but the rendered tag is `<div>` — confirmed by element tag in clone line 823)

- `current-clone-page-source.html` line 842 (trial card price-row — same pattern):
  ```html
  <div style="gap:10px;display:flex;flex-wrap:wrap;align-items:start" class="sgs-container sgs-container--flex sgs-featured-product__price-row wp-block-sgs-container">
  ```

### DB facts
- `sgs/container` attribute `verticalAlign` (type: `string`, default: `"start"`) — DB confirmed. This is the attr that controls `align-items` in `class-sgs-container-wrapper.php`.
- `sgs/container` attribute `flexWrap` (type: `string`, default: `""`, enum: `["", "wrap", "nowrap"]`) — DB confirmed.
- `sgs/container` attribute `htmlTag` (type: `string`, default: `"section"`) — DB confirmed.
- DB `property_suffixes` table: `align-items` maps to suffix `VerticalAlign`, role `layout` — query confirmed.
- DB `property_suffixes` table: `flex-wrap` maps to suffix `FlexWrap`, role `layout` — query confirmed.

### SPEC-DOC refs
- `class-sgs-container-wrapper.php` line 200: `$vertical_align = $attributes['verticalAlign'] ?? 'start';`
- `class-sgs-container-wrapper.php` lines 407–410: flex layout path:
  ```php
  $styles[] = 'display:flex';
  $styles[] = 'flex-wrap:' . esc_attr( '' !== $flex_wrap ? $flex_wrap : 'wrap' );
  $styles[] = 'align-items:' . esc_attr( $vertical_align );
  ```
  The flex path ALWAYS outputs `flex-wrap:wrap` as the fallback when `$flex_wrap` is empty string (the default). The draft had no `flex-wrap` at all.

### PIPELINE-LOCATION refs
- `convert.py` lines 875–879: `_SUFFIX_ATTR_OVERRIDES` — contains only one entry: `("grid-template-columns", "Columns") → "gridTemplateColumns"`. No override for `align-items → verticalAlign`.
- `db_lookup.py` (property_suffixes): `align-items` → suffix `VerticalAlign` → attr name `verticalAlign` (lower-first-char of suffix). The value `baseline` would need to be present in the CSS and lifted via `_lift_wrapper_css_to_container_attrs`, but `baseline` is NOT in the `verticalAlign` attr's defined enum — no enum values recorded in DB for `verticalAlign` (default `"start"`). The `_try_lift_prop` function would attempt to write `baseline` if the prop is in scope, but the DB `kind` for `align-items` (via `VerticalAlign` suffix) governs whether it is treated as a colour, number, or string.
- `convert.py` lines 981–1020: `_lift_wrapper_css_to_container_attrs` — calls `_try_lift_prop` for each CSS property found in the draft element's CSS. The `align-items:baseline` value from `.sgs-featured-product__price-row` rule would be processed through this path IF the selector matching collects it.
- `class-sgs-container-wrapper.php` lines 407–410: When `flexWrap` attr is empty string (default), the render outputs `flex-wrap:wrap` as hardcoded fallback — this differs from the draft which had no `flex-wrap` declaration.

---

## FP-O — "The product cards are 2 different lengths/heights. The draft has all of the product cards in the wrapper match height/length and the smaller card just has the inner elements more spread out across the full length."

### Issue (verbatim)
The product cards are 2 different lengths/heights. The draft has all of the product cards in the wrapper match height/length and the smaller card just has the inner elements more spread out across the full length.

### DRAFT facts
- `index.html` lines 384–393 (`.sgs-products` and `.sgs-product-card` CSS):
  ```css
  .sgs-products { display: grid; grid-template-columns: 1fr; gap: 16px; }
  /* @media (min-width: 768px): */
  .sgs-products { grid-template-columns: 5fr 3fr; }

  .sgs-product-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
  }
  .sgs-product-card__body { padding: 20px; flex: 1; display: flex; flex-direction: column; }
  ```
  The `.sgs-products` grid has NO explicit `align-items` — grid default is `stretch`. Both cards stretch to fill the row height. `.sgs-product-card__body` uses `flex: 1` so the body grows to fill the card's height, spreading inner elements.

### CLONE facts
- `current-clone-page-source.html` line 812 (`.sgs-products` grid container):
  ```html
  <div style="gap:16px;display:grid;grid-template-columns:5fr 3fr;align-items:start" class="sgs-container sgs-container--grid sgs-cols-2 sgs-cols-tablet-2 sgs-cols-mobile-1 sgs-container-e08c27fb sgs-products wp-block-sgs-container">
  ```
  `align-items:start` is set on the grid container. CSS grid default is `stretch`; `start` overrides this and causes each card to shrink to its content height rather than stretching to the tallest card's height.

- Individual product card containers (lines 813, 832) render as `sgs-container product-card wp-block-sgs-product-card` — no explicit `min-height` or `height: 100%` on either card.

### DB facts
- `sgs/container` attribute `verticalAlign` (type: `string`, default: `"start"`) — DB confirmed. This is what produces `align-items:start` in the rendered style.
- `sgs/container` attribute `gridAutoRows` (type: `string`, default: `""`) — DB confirmed. Setting `gridAutoRows: "1fr"` on the parent grid would force equal row heights, but no such value is set.
- `sgs/product-card` attribute `cardMaxWidth` (type: `string`, default: `""`) — DB confirmed. No height/equal-height attr exists on `sgs/product-card`.

### SPEC-DOC refs
- `class-sgs-container-wrapper.php` line 200: `$vertical_align = $attributes['verticalAlign'] ?? 'start';`
- `class-sgs-container-wrapper.php` line 400: For grid layout: `$styles[] = 'align-items:' . esc_attr( $vertical_align );` — outputs `align-items:start` when attr is default `"start"`.
- `class-sgs-container-wrapper.php` lines 448–456: `gridAutoRows` is only output when `$is_section || $is_layout` — if the `.sgs-products` container is classified as `content` kind, `gridAutoRows` is not emitted even if set.

### PIPELINE-LOCATION refs
- `convert.py` lines 981–1020: `_lift_wrapper_css_to_container_attrs` — `align-items` → `verticalAlign`. The draft's `.sgs-products` CSS has NO `align-items` property (grid default `stretch` is the implicit value). With no `align-items` declaration in the CSS, the lift would not write any `verticalAlign` attr, leaving the default `"start"`.
- `class-sgs-container-wrapper.php` line 400: `align-items:start` is the rendered output because `verticalAlign` default is `"start"`, not the grid default `stretch`.

---

## FP-P — "CTA button in each product card should fill the max-width available to it but the buttons in the clone just have standard padding control their size."

### Issue (verbatim)
CTA button in each product card should fill the max-width available to it but the buttons in the clone just have standard padding control their size.

### DRAFT facts
- `index.html` lines 858–861 (main product card CTA):
  ```html
  <a href="/product/zookies/" class="sgs-button sgs-button--primary">Add to Cart — £10</a>
  ```
- `index.html` line 863–878 (trial card CTA):
  ```html
  <a href="/product/trial-pack/" class="sgs-button sgs-button--secondary">Try 3 for £5</a>
  ```
- No additional width CSS on the button elements in the draft. The draft's `.sgs-button` CSS (`index.html` lines 55–68) is `display: inline-flex` — no `width: 100%`.
- However, the parent `.sgs-product-card__body` is `flex-direction: column`, and the button element sits as the last flex-column child. The draft has no explicit `width: 100%` on the CTA — but Bean's report says it should fill the max-width.
  Note: the draft button has NO `width: 100%` CSS rule. The draft's `sgs-button--primary` class uses `display: inline-flex` which auto-sizes to content. Fact: no width CSS override on buttons in the draft.

### CLONE facts
- `current-clone-page-source.html` line 828 (main card CTA):
  ```html
  <div style="padding-top:14px;padding-right:24px;padding-bottom:14px;padding-left:24px" class="sgs-button-wrapper wp-block-sgs-button has-text-color" id="sgs-btn-6">
    <a href="/product/zookies/" class="sgs-button is-style-primary" style="--sgs-btn-icon-gap:8px;">
      <span class="sgs-button__label">Add to Cart — £10</span>
    </a>
  </div>
  ```
  No `sgs-button-wrapper--full` class. No `width: 100%` applied. `widthType` attr is absent from the inline style — default `"fit"` is used.

- `current-clone-page-source.html` line 847 (trial card CTA):
  ```html
  <div style="padding-top:14px;padding-right:24px;padding-bottom:14px;padding-left:24px" class="sgs-button-wrapper wp-block-sgs-button has-text-color" id="sgs-btn-8">
    <a href="/product/trial-pack/" class="sgs-button is-style-secondary" style="--sgs-btn-icon-gap:8px;">
      <span class="sgs-button__label">Try 3 for £5</span>
    </a>
  </div>
  ```
  Same pattern — no `sgs-button-wrapper--full`, no width attr.

### DB facts
- `sgs/button` attribute `widthType` (type: `string`, default: `"fit"`) — DB confirmed. No `fullWidth` boolean attr exists. The `"full"` value of `widthType` triggers `width: 100%`.
- No `fullWidth`, `fill`, `stretch`, or `width` attrs found in DB for `sgs/button` beyond `widthType`, `customWidth`, `customWidthUnit`.

### SPEC-DOC refs
- `plugins/sgs-blocks/src/blocks/button/render.php` line 43: `$width_type = isset( $attributes['widthType'] ) ? sanitize_text_field( $attributes['widthType'] ) : 'fit';`
- `render.php` line 442: `if ( 'full' === $width_type ) { $btn_classes[] = 'sgs-button--full'; }`
- `render.php` line 610: `'class' => 'sgs-button-wrapper' . ( 'full' === $width_type ? ' sgs-button-wrapper--full' : '' )`
- `plugins/sgs-blocks/src/blocks/button/style.css` lines 34–38:
  ```css
  .sgs-button-wrapper--full,
  .sgs-button-wrapper--full .sgs-button { width: 100%; }
  ```
  Full-width is only achieved when `widthType='full'` is set.

### PIPELINE-LOCATION refs
- `convert.py` lines 1845–1852: The button handler sets `inheritStyle` from the BEM modifier class (e.g. `sgs-button--primary` → `inheritStyle: "primary"`). No path in the button handler sets `widthType`.
- `convert.py` lines 3096–3130: The `inheritStyle` detection block handles button preset detection but does NOT write `widthType`.
- No path in `convert.py` sets `widthType = "full"` for any button context; the converter emits buttons with default `widthType` (`"fit"`).

---

## Coverage Checklist

| Issue | Status |
|-------|--------|
| FP-K — "Choose pack size" label added by clone | **fact-complete** — Draft has `aria-label` attribute only (no visible text). Clone renders visible `<legend>` via `render.php` `showLabel=true` default. Converter sets `label` attr from aria-label but does not set `showLabel=false`. |
| FP-L1 — Pill styles match primary button | **fact-complete** — Clone emits `sgs-option-picker--filled` class; draft CSS shows cream background / muted border / outlined style. `pillStyle` default in DB is `"outlined"`. Converter does not set `pillStyle`; the `slot_default_attrs_for` inject (referenced in convert.py line 2164) sets `"filled"`. |
| FP-M — Price font wrong | **fact-complete** — Draft: `font-family: 'Fraunces', serif`. Clone inline style: `font-weight:700;, serif` (malformed; no valid `font-family`). `font-family` is deliberately excluded from `_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS` in `db_lookup.py` lines 1096–1103. |
| FP-N — Price note floating (exponent appearance) | **fact-complete** — Draft: `align-items: baseline`. Clone: `align-items:start` (DB default for `verticalAlign`). Also `flex-wrap:wrap` added by `class-sgs-container-wrapper.php` line 409 as hardcoded fallback when `flexWrap` is empty; draft had no `flex-wrap`. `htmlTag` default is `"section"` but clone renders as `<div>` — the converter sets `htmlTag:"div"` (convert.py line 3789). `margin-bottom:14px` absent from clone inline style. |
| FP-O — Product cards different heights | **fact-complete** — Draft: `.sgs-products` has no `align-items` (grid default `stretch`). Clone: `align-items:start` on grid container (from `verticalAlign` default `"start"` in DB, rendered by `class-sgs-container-wrapper.php` line 400). Cards don't stretch to equal height. |
| FP-P — CTA button not full width | **fact-complete** — Draft buttons use `inline-flex` (content-sized). Clone buttons: `widthType` is absent from emitted attrs (defaults to `"fit"`). `sgs/button` `widthType="full"` would trigger `sgs-button-wrapper--full` + `width:100%`. No path in `convert.py` sets `widthType="full"`. |
