# Wave-1 Fact-Finding — Social Proof (Batch 1)

**Date:** 2026-06-08
**Section:** Social Proof — `section.sgs-social-proof` (draft lines 983–1012; clone lines 987–1024)
**Scope:** Verifiable facts only. No root causes, no solutions, no interpretation.

---

## SP-A — "Heading font size is too small"

### Issue (verbatim)
"As you mentioned the heading font size is too small."

### DRAFT facts

**Style rule — base (index.html lines 611–617):**
```css
.sgs-social-proof h2 {
  font-size: 28px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
  text-align: center;
}
```

**Style rule — responsive (index.html lines 651–654):**
```css
@media (min-width: 640px) {
  .sgs-testimonial-slider { grid-template-columns: repeat(3, 1fr); }
  .sgs-social-proof h2 { font-size: 36px; }
}
```
The `font-size: 36px` for the `h2` is declared inside `@media (min-width: 640px)` — a `min-width` breakpoint.

**Draft HTML (index.html line 985):**
```html
<h2 id="reviews-h2">What mums are saying</h2>
```
No inline style on the element.

### CLONE facts

**Clone heading block (current-clone-page-source.html lines 988–991):**
```html
<div style="text-align:center" class="wp-block-sgs-heading" id="sgs-hdg-99e3e3f9">
  <h2 class="wp-block-sgs-heading__text" style="color:var(--wp--preset--color--text);font-size:28px;font-weight:600;line-height:1.2">
    What mums are saying
  </h2>
</div>
```
Inline `style` on the `<h2>`: `font-size:28px`. The responsive value `36px` is NOT present in any inline style or block attribute on this heading element.

**Clone per-page CSS (current-clone-page-source.html line 760):**
```css
@media (min-width: 640px) { .page-id-8 .sgs-social-proof h2 { font-size: 36px } }
```
The CSS mirror includes the `36px` responsive rule, but it targets the BEM class `.sgs-social-proof h2` — not the native block element `.wp-block-sgs-heading__text`.

### DB facts

**`sgs/heading` block attrs relevant to font size (DB query via `sgs-db.py block sgs/heading`):**
- `fontSize` — `attr_type: number`, `default_value: 28`, `is_responsive: 1`
- `fontSizeMobile` — `attr_type: number`, `default_value: None`
- `fontSizeTablet` — `attr_type: number`, `default_value: None`
- `fontSizeUnit` — `attr_type: string`, `default_value: "px"`
- No `fontSizeDesktop` attr exists in the DB for `sgs/heading`.

**`property_suffixes` for `font-size` (DB query):**
- `css_property: font-size`, `suffix: FontSize`, `kind_override: None`

**`_BREAKPOINT_RULES` constant (db_lookup.py lines 1233–1239):**
```python
_BREAKPOINT_RULES: list[tuple[str, list[str]]] = [
    ("min-width: 768",  ["Tablet", "Desktop"]),
    ("min-width: 1024", ["Desktop"]),
    ("min-width: 1280", ["Desktop"]),
    ("max-width: 767",  ["Mobile"]),
    ("max-width: 640",  ["Mobile"]),
]
```
The string `"min-width: 640"` is **absent** from `_BREAKPOINT_RULES`. Only `"max-width: 640"` appears (maps to `["Mobile"]`).

### SPEC-DOC refs

- Spec 22 `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`: responsive lift described in `_lift_typography_to_block_attrs` comment (convert.py lines 1420–1432).
- Spec 22 R-22-1: DB-driven breakpoint suffix vocabulary via `modifier_suffixes`.

### PIPELINE-LOCATION refs

- **`db_lookup.py` lines 1233–1239:** `_BREAKPOINT_RULES` constant — `"min-width: 640"` absent. Only `"max-width: 640"` present.
- **`db_lookup.py` line 1243:** `breakpoint_suffix_rules()` — returns `_BREAKPOINT_RULES` after DB suffix verification.
- **`convert.py` lines 671–679:** `_collect_css_decls_for_element` — iterates `bp_rules`, tests `bp_substr in media_part` (substring match). A `@media (min-width: 640px)` condition does NOT match any `bp_substr` → CSS declarations not bucketed into any `bp_decls` suffix.
- **`convert.py` lines 1523–1551:** `_lift_typography_to_block_attrs` — processes `bp_decls` for keys `"Desktop"`, `"Tablet"`, `"Mobile"`. No entry for any key → no responsive font-size lifted.

---

## SP-B — "Padding between sub-heading text and block below is missing"

### Issue (verbatim)
"Just like other sections, the padding that originally existed between the text that sits under the heading and the block below it is missing."

### DRAFT facts

**Style rule (index.html lines 618–623):**
```css
.sgs-social-proof .sgs-section-heading__sub {
  font-size: 16px;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 32px;
}
```

**Draft HTML (index.html line 986):**
```html
<p class="sgs-section-heading__sub">Real feedback from real mums — nothing fabricated.</p>
```
No inline style. The next sibling element is `<div class="sgs-social-proof__trustpilot-bar">` (line 988).

### CLONE facts

**Clone sub-heading paragraph (current-clone-page-source.html line 993):**
```html
<p style="color:var(--wp--preset--color--text-muted);font-size:16px;text-align:center" class="wp-block-sgs-text">Real feedback from real mums — nothing fabricated.</p>
```
Inline style: `color`, `font-size`, `text-align`. **`margin-bottom` is absent.**

The next sibling in the clone (line 994) is the trustpilot-bar `sgs/container`.

**Clone per-page CSS (current-clone-page-source.html line 751):**
```css
.page-id-8 .sgs-social-proof .sgs-section-heading__sub{ font-size: 16px; color: var(--text-muted); text-align: center; margin-bottom: 32px }
```
The CSS mirror includes `margin-bottom: 32px` targeting the draft BEM class `.sgs-section-heading__sub`. This does NOT apply to the `.wp-block-sgs-text` element in the clone.

### DB facts

**`sgs/text` block supports (DB query via `sgs-db.py block sgs/text`):**
```
Supports (4):
anchor    true
className true
color     false
html      false
```
`spacing` support is **absent** from `sgs/text`'s `block_supports` DB record.

**`sgs/text` block attrs — margin (DB query):**
- `marginBottom` — `attr_type: number`, `default_value: None`, `is_responsive: 1`
- `marginUnit` — `attr_type: string`, `default_value: "px"`

**`property_suffixes` for `margin-bottom` (DB query):**
- `css_property: margin-bottom`, `suffix: MarginBottom`, `role: layout`, `kind_override: None`

### SPEC-DOC refs

- `_root_lift_rules()` list: `convert.py` line 500 — `("margin-bottom", "spacing", "margin", ["spacing","margin","bottom"], "unit")`, gated by `_support_allows(supports, "spacing", "margin")`.
- `_lift_wrapper_css_to_container_attrs`: `convert.py` line 981 — universal DB-driven flat-attr lift for every resolved block.

### PIPELINE-LOCATION refs

- **`convert.py` line 500:** `_root_lift_rules()` — `margin-bottom` maps to `style.spacing.margin.bottom`, gated by `_support_allows(supports, "spacing", "margin")`. `sgs/text` has no `spacing` support in DB → this gate evaluates to `False` → NOT lifted via this path.
- **`convert.py` lines 2870–2876:** Universal `_lift_wrapper_css_to_container_attrs` pass — calls `_collect_css_decls_for_element(node, css_rules)` for the `<p class="sgs-section-heading__sub">` node. The selector `.sgs-social-proof .sgs-section-heading__sub` has `last_part = ".sgs-section-heading__sub"` which matches the class `sgs-section-heading__sub` on the node (line 611 of `_collect_css_decls_for_element`). If matched, `margin-bottom: 32px` would be in `base_decls`. Then `_lift_wrapper_css_to_container_attrs` would look up suffix `MarginBottom` → candidate attr `marginBottom` → checked against `_block_attr_names("sgs/text")`. `marginBottom` IS in `sgs/text`'s attr schema. If lifted, `marginBottom = 32` should be in the emitted block attrs.
- **`plugins/sgs-blocks/src/blocks/text/render.php` lines 58 and 266–267:** `$margin_bottom = $attributes['marginBottom'] ?? null`; if not null, emits `margin-bottom:<val><unit>` in inline style. Clone shows no `margin-bottom` → `marginBottom` attr was either not set or was zero.

---

## SP-C — "Trustpilot bar align-items:start instead of center"

### Issue (verbatim)
"Trustpilot bar inner elements are aligned vertically, but clone has the stars sitting at a different height than the [c]ontent on the left and right of it. Think it's just because the wrapper CSS just didn't properly pass over to the SGS/container that represents it in the clone. Draft has css like 'align-items: center; justify-content: center;' this is what keeps them aligned rather than the clone which has align-items set to start instead of the correct setting which is center."

### DRAFT facts

**Style rule (index.html lines 624–635):**
```css
.sgs-social-proof__trustpilot-bar {
  background: white;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
```

**Draft HTML (index.html lines 988–992):**
```html
<div class="sgs-social-proof__trustpilot-bar" aria-label="Trustpilot rating">
  <span class="sgs-social-proof__trustpilot-logo">★ Trustpilot</span>
  <span class="sgs-social-proof__trustpilot-stars" aria-label="5 stars">★★★★★</span>
  <span class="sgs-social-proof__trustpilot-text">Leave us a review — help other mums find us</span>
</div>
```

### CLONE facts

**Clone trustpilot-bar container (current-clone-page-source.html line 994):**
```html
<div style="gap:14px;display:flex;flex-wrap:wrap;align-items:start" class="sgs-container sgs-container--flex sgs-social-proof__trustpilot-bar wp-block-sgs-container">
```
Inline style: `gap:14px`, `display:flex`, `flex-wrap:wrap`, **`align-items:start`**.
- `align-items:center` (draft value) is **not present**.
- `justify-content:center` (draft value) is **absent entirely**.

**Clone per-page CSS (current-clone-page-source.html line 752):**
```css
.page-id-8 .sgs-social-proof__trustpilot-bar{ background: white; border: 1px solid var(--border); border-radius: 10px; padding: 18px 24px; display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 28px; flex-wrap: wrap }
```
CSS mirror includes both `align-items: center` and `justify-content: center`. These target the draft BEM class, not the native block.

### DB facts

**`sgs/container` block attrs (DB query via `sgs-db.py block sgs/container`):**
- `verticalAlign` — `attr_type: string`, `default_value: "start"`, `is_responsive: 0`
- `justifyContent` — `attr_type: string`, `default_value: ""`, `enum_values: ["", "flex-start", "center", "flex-end", "space-between", "space-around"]`, `is_responsive: 0`

**`property_suffixes` for flex/align CSS (DB query):**
- `align-items` → `suffix: VerticalAlign`, `role: layout`, `kind_override: None`
- `justify-content` → `suffix: JustifyContent`, `role: layout`, `kind_override: None`
- `flex-direction` → `suffix: FlexDirection`, `role: layout`, `kind_override: None`
- `flex-wrap` → `suffix: FlexWrap`, `role: layout`, `kind_override: None`

**`_SUFFIX_ATTR_OVERRIDES` (convert.py lines 875–879):**
```python
_SUFFIX_ATTR_OVERRIDES: dict[tuple[str, str], str] = {
    ("grid-template-columns", "Columns"): "gridTemplateColumns",
}
```
No entry for `("align-items", "VerticalAlign")`. Standard derivation: `base_attr = "verticalAlign"` (lower-first of `"VerticalAlign"`).

**`_LIFT_EXCLUDED_PROPS` (convert.py line 869):**
```python
_LIFT_EXCLUDED_PROPS: frozenset[str] = frozenset({"max-width", "width"})
```
`align-items` and `justify-content` are **NOT** in `_LIFT_EXCLUDED_PROPS`.

### SPEC-DOC refs

- `class-sgs-container-wrapper.php` line 200: `$vertical_align = $attributes['verticalAlign'] ?? 'start'` — default is `"start"`.
- `class-sgs-container-wrapper.php` lines 407–416: In `flex` layout mode (`'flex' === $layout`), emits `align-items:<$vertical_align>` and `justify-content:<$justify_content>` (the latter only if `'' !== $justify_content`).
- `class-sgs-container-wrapper.php` line 127: `$layout = $attributes['layout'] ?? ''`.

### PIPELINE-LOCATION refs

- **`convert.py` line 869:** `_LIFT_EXCLUDED_PROPS = frozenset({"max-width", "width"})` — `align-items` and `justify-content` are not excluded.
- **`convert.py` lines 1031–1097:** `_try_lift_prop` inside `_lift_wrapper_css_to_container_attrs` — for `align-items` with suffix `VerticalAlign`, standard derivation gives `base_attr = "verticalAlign"`. Candidate attr `"verticalAlign"` checked against `container_attr_names`. `sgs/container` has `verticalAlign` → should match. For `justify-content` with suffix `JustifyContent`, derivation gives `base_attr = "justifyContent"`. `sgs/container` has `justifyContent` → should match.
- **`convert.py` lines 2870–2876:** Universal `_lift_wrapper_css_to_container_attrs` pass — fires for this `sgs/container` block. If `_collect_css_decls_for_element` returns `align-items: center` and `justify-content: center` in `base_decls`, then `verticalAlign = "center"` and `justifyContent = "center"` should be set via `attrs.setdefault`. The clone emits `align-items:start` (block default), indicating either (a) `base_decls` did not contain these properties, or (b) `attrs.setdefault` was pre-empted by an earlier pass that already set `verticalAlign`.
- **`class-sgs-container-wrapper.php` lines 297–315:** `justifyContent`, `flexDirection`, `flexWrap` are read from attrs. Allowed `justifyContent` values: `["", "flex-start", "center", "flex-end", "space-between", "space-around"]` — `"center"` IS in the allow-list.

---

## SP-D — "Reviews inner elements/child blocks styles are inconsistent"

### Issue (verbatim)
"The reviews inner elements/child blocks styles are inconsistent e.g. size of stars, font size, vertical gap/padding between each."

### DRAFT facts

**Style rules (index.html lines 640–649):**
```css
.sgs-testimonial-slider { display: grid; grid-template-columns: 1fr; gap: 12px; }
.sgs-testimonial {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border);
}
.sgs-testimonial__stars { color: var(--accent); font-size: 15px; margin-bottom: 8px; }
.sgs-testimonial__text { font-size: 14px; color: var(--text-muted); line-height: 1.65; font-style: italic; margin-bottom: 12px; }
.sgs-testimonial__author { font-size: 13px; font-weight: 600; color: var(--text); }
```
Also at line 652: `@media (min-width: 640px) { .sgs-testimonial-slider { grid-template-columns: repeat(3, 1fr); } }`

**Draft HTML (index.html lines 994–1009):**
- Testimonial stars: `<div class="sgs-testimonial__stars">★★★★★</div>` — text characters (star emoji), styled by `font-size: 15px`.
- Testimonial text: `<p class="sgs-testimonial__text">...</p>` — `font-size: 14px`.
- Testimonial author: `<p class="sgs-testimonial__author">...</p>` — `font-size: 13px`.
- Gap between cards: `gap: 12px` on `.sgs-testimonial-slider`.
- Gap between star row and text: `margin-bottom: 8px` on `.sgs-testimonial__stars`.
- Gap between text and author: `margin-bottom: 12px` on `.sgs-testimonial__text`.

### CLONE facts

**Clone testimonial slider outer (current-clone-page-source.html line 999):**
```html
<div style="--sgs-transition-duration:300ms;--sgs-transition-easing:ease-in-out;gap:12px" class="sgs-container sgs-testimonial-slider sgs-testimonial-slider--card sgs-container--full wp-block-sgs-testimonial-slider" ...>
```
Gap between slides: `gap:12px` — matches draft.

**Clone testimonial card 1 (line 999 — slide section element):**
```html
<section style="border-radius:12px;border-style:solid;border-width:1px;padding-top:20px;padding-right:20px;padding-bottom:20px;padding-left:20px;--sgs-transition-duration:300ms;--sgs-transition-easing:ease-in-out" class="sgs-container sgs-testimonial sgs-testimonial--Array wp-block-sgs-testimonial has-border-color has-border-border-color">
```

**Clone star-rating block (line 1000):**
```html
<div style="margin-bottom:8px" class="sgs-star-rating sgs-star-rating--stars-only wp-block-sgs-star-rating has-text-color has-accent-color">
  <div class="sgs-star-rating__stars" role="img" aria-label="5 out of 5 stars">
    <svg width="24" height="24" ...>...</svg>  [× 5 SVGs]
  </div>
</div>
```
Stars rendered as SVG icons, each `width="24" height="24"`. `margin-bottom:8px` present.

**Clone testimonial text paragraph (line 1005):**
```html
<p style="color:var(--wp--preset--color--text-muted);font-size:14px;line-height:1.65unitless;font-style:italic" class="wp-block-sgs-text">...</p>
```
`font-size:14px` — matches draft. `line-height:1.65unitless` — value has `"unitless"` sentinel suffix (not plain CSS, artifact of the converter unit handling).

**Clone testimonial author paragraph (line 1006):**
```html
<p style="color:var(--wp--preset--color--text);font-size:13px;font-weight:600" class="wp-block-sgs-text">Reham, London</p>
```
`font-size:13px` — matches draft.

**Clone per-page CSS (current-clone-page-source.html lines 757–759):**
```css
.page-id-8 .sgs-testimonial__stars{ margin-bottom: 8px }
.page-id-8 .sgs-testimonial__text{ line-height: 1.65; font-style: italic; margin-bottom: 12px }
.page-id-8 .sgs-testimonial__author{ font-weight: 600 }
```
Note: per-page CSS for `.sgs-testimonial__stars` has only `margin-bottom: 8px` — NO `font-size: 15px`. Per-page CSS for `.sgs-testimonial__text` has no `font-size: 14px`. Per-page CSS for `.sgs-testimonial__author` has no `font-size: 13px`.

**Missing in clone star-rating vs draft:**
- Draft: `font-size: 15px` on `.__stars` text characters.
- Clone: SVG stars fixed at `width="24" height="24"` — controlled by `starSize` attr (default `24`).

**Missing in clone (margin-bottom on text paragraph):**
- Draft: `.sgs-testimonial__text { margin-bottom: 12px }`.
- Clone line 1005: no `margin-bottom` in inline style for the text paragraph.

**Missing in clone (margin-bottom on author paragraph):**
- Draft: no margin-bottom on `.sgs-testimonial__author` (author is the last element; `.sgs-testimonial__text` carries the gap).
- Clone line 1006: no `margin-bottom` in inline style for the author — consistent with draft.

### DB facts

**`sgs/star-rating` block attrs (DB query via `sgs-db.py block sgs/star-rating`):**
- `starSize` — `attr_type: number`, `default_value: 24`, `is_responsive: 0`
- `starColour` — `attr_type: string`, `default_value: "accent"`, `is_responsive: 0`
- `displayMode` — `attr_type: string`, `default_value: "stars-only"`, enum: `["stars-only", "stars-with-value", "stars-with-value-and-count"]`
- No `fontSize` attr on `sgs/star-rating`.

**`sgs/testimonial` block attrs — name/quote font-size (DB query via `sgs-db.py block sgs/testimonial`):**
- `nameFontSize` — `attr_type: string`, `default_value: None`, `is_responsive: 1`
- `nameFontSizeMobile` — `attr_type: string`, `default_value: ""`
- `nameFontSizeTablet` — `attr_type: string`, `default_value: ""`
- No `quoteFontSize` attr exists in the `sgs/testimonial` block schema (DB query returned no such attr).

**`sgs/testimonial-slider` block attrs — gap (DB query via `sgs-db.py block sgs/testimonial-slider`):**
- `gap` — `attr_type: string`, `default_value: ""`, `is_responsive: 1`
- `slidesVisible` — `attr_type: number`, `default_value: 3`

### SPEC-DOC refs

- Spec 22 §FR-22-16 content-leaf exception (`.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` line 258): "a text-only sgs-classed node... `.__trustpilot-stars` therefore route to `sgs/text`, NOT `sgs/star-rating`... whose payload is a rating."
- `star-rating/render.php` line 18: `$star_size = (int)($attributes['starSize'] ?? 24)` — default 24.

### PIPELINE-LOCATION refs

- **`plugins/sgs-blocks/src/blocks/star-rating/render.php` line 18:** `$star_size = (int)($attributes['starSize'] ?? 24)` — if converter does not set `starSize`, default `24` is used → SVG stars `width="24" height="24"`.
- **`plugins/sgs-blocks/src/blocks/testimonial/render.php` lines 115–124:** `nameFontSizeTablet`/`nameFontSizeMobile` are read but only stored as `data-` attributes — not emitted as inline `font-size`.
- **`convert.py` lines 2847–2849:** `_lift_typography_to_block_attrs` — lifts `font-size` onto block attrs declared as `fontSize`. `sgs/testimonial` has no `quoteFontSize` attr (DB-confirmed) and no `fontSize` attr; `sgs/star-rating` has no `fontSize` attr. `sgs/text` (for quote/author paragraphs) has `fontSize` attr, and the clone lines 1005–1006 show `font-size:14px` and `font-size:13px` — these WERE lifted successfully.
- **`convert.py` lines 2870–2876:** Universal `_lift_wrapper_css_to_container_attrs` pass — for the testimonial text `<p>`, suffix `MarginBottom` → attr `marginBottom`. Clone line 1005 shows no `margin-bottom` in inline style → `marginBottom` was not lifted for the text paragraph (or not emitted). Same issue as SP-B for sub-heading `margin-bottom`.

---

## Coverage Checklist

| Issue | Status |
|-------|--------|
| **SP-A** — Heading font size too small (28px vs 36px responsive) | **fact-complete** — draft CSS lines 611–617 + 651–654; clone line 989 (`28px` only); DB `fontSizeTablet` exists; `_BREAKPOINT_RULES` missing `"min-width: 640"` confirmed at `db_lookup.py` line 1233; `_collect_css_decls_for_element` at `convert.py` line 674. |
| **SP-B** — Sub-heading padding (margin-bottom:32px) missing below it | **fact-complete** — draft CSS lines 618–623; clone line 993 (no margin-bottom in style); DB `sgs/text` has `marginBottom` attr + no `spacing` support; `_root_lift_rules` gating confirmed at `convert.py` line 500; universal `_lift_wrapper_css_to_container_attrs` path at `convert.py` lines 2870–2876; `text/render.php` lines 58 + 266–267. |
| **SP-C** — Trustpilot bar align-items:start instead of center | **fact-complete** — draft CSS lines 624–635; clone line 994 (`align-items:start`; `justify-content` absent); DB `verticalAlign` default `"start"`, `justifyContent` default `""`; `property_suffixes` entries confirmed; `_LIFT_EXCLUDED_PROPS` at `convert.py` line 869 does not exclude `align-items`; `_SUFFIX_ATTR_OVERRIDES` no override for `align-items`; render path at `class-sgs-container-wrapper.php` lines 200 + 297–315 + 407–416. |
| **SP-D** — Testimonial child block styles inconsistent (star size, font size, gap) | **fact-complete** — draft CSS lines 640–649; clone lines 999–1022; DB `sgs/star-rating.starSize` default 24, no `fontSize` on star-rating; `sgs/testimonial` no `quoteFontSize`; quote/author `font-size` WERE lifted (`14px`/`13px` present); `margin-bottom:12px` on text paragraph NOT emitted (same mechanism as SP-B); `starSize:24` vs draft `font-size:15px` different rendering type. |
