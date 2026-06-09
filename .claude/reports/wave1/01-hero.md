# Hero — Wave-1 Fact-Finder Report

**Scope:** Three Hero issues (H-A, H-B, H-C) for the Mama's Munches clone.
**Sources verified:** index.html · current-clone-page-source.html · DB queries · render.php · convert.py · db_lookup.py · class-sgs-container-wrapper.php · heading/render.php · block.json

---

## H-A — "Content doesn't stack over image, it still has the split variant recognised so they are 2 separate columns however the image column does take up the majority of the width, leaving the content column squashed on the left side."

### 1. Issue ID + verbatim description

H-A: "Content doesn't stack over image, it still has the split variant recognised so they are 2 separate columns however the image column does take up the majority of the width, leaving the content column squashed on the left side."

### 2. DRAFT facts

**File:** `sites/mamas-munches/mockups/homepage/index.html`

**Mobile base (no breakpoint)** — lines 249–255:
```css
.sgs-hero {
  background: var(--surface-pink);
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas: "media" "content";
}
```
(Line 253: `grid-template-columns: 1fr;` — one column, media stacks above content.)

**Tablet/desktop `@media (min-width: 768px)`** — lines 280–285:
```css
.sgs-hero {
  grid-template-columns: 1fr 1fr;
  grid-template-areas: "content media";
  min-height: 520px;
}
```
(Line 282: `grid-template-columns: 1fr 1fr;` — equal-width two-column split, content left, media right.)

**Large desktop `@media (min-width: 1280px)`** — line 310: `.sgs-hero__content { padding: 72px 64px; }` (no change to grid columns).

**Draft markup** — lines 762–784:
```html
<section class="sgs-hero" aria-labelledby="hero-h1">
  <div class="sgs-hero__content">...</div>
  <div class="sgs-hero__media">...</div>
</section>
```
No `style` attribute on the `<section>` element. No `columns` class or inline grid-template-columns.

### 3. CLONE facts

**File:** `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`

**Inline `<style id="sgs-hero-085d8675">` block** (line 784, immediately before `<section>`):
```css
@media (max-width:1023px){.sgs-hero-085d8675{min-height:520px}}
@media (max-width:767px){.sgs-hero-085d8675{min-height:360px}}
@media (max-width:767px){.sgs-hero-085d8675{grid-template-columns:1fr !important}}
@media (max-width:767px){.sgs-hero-085d8675 .sgs-hero__media{order:1}.sgs-hero-085d8675 .sgs-hero__content{order:2}}
@media (max-width:767px){.sgs-hero-085d8675 .sgs-hero__split-image--desktop{display:none}}
@media (min-width:768px){.sgs-hero-085d8675 .sgs-hero__split-image--mobile{display:none}}
```

**Inline `<style id="sgs-container-f4e2d526">` block** (line 784, same position):
```css
@media (max-width:1023px){.sgs-container-f4e2d526{padding-top:56px;padding-right:48px;padding-bottom:56px;padding-left:48px}}
@media (max-width:1023px){.sgs-container-f4e2d526{grid-template-columns:1fr 1fr}}
```

**`<section>` opening tag inline `style=`** (line 784 — verbatim):
```
style="padding-top:28px;padding-right:20px;padding-bottom:40px;padding-left:20px;min-height:520px;--sgs-transition-duration:300ms;--sgs-transition-easing:ease-in-out;display:grid;grid-template-columns:1fr 1fr;gap:0px;display:grid;grid-template-columns:1fr;align-items:start"
```

Observation: `display:grid;grid-template-columns:1fr 1fr` appears at position 1 in the inline style, then `display:grid;grid-template-columns:1fr` appears again at position 2. The browser's cascade applies the **last** declaration of a duplicated property in an inline style, so `grid-template-columns:1fr` (from the second declaration) overrides `grid-template-columns:1fr 1fr` (from the first). The effective layout at desktop/tablet viewport is `grid-template-columns:1fr` — a single-column grid — even though the `sgs-container-f4e2d526` responsive rule correctly sets `1fr 1fr` at `max-width:1023px`.

The responsive override `@media (max-width:1023px){ .sgs-container-f4e2d526 { grid-template-columns:1fr 1fr } }` (external CSS, specificity class) is beaten by the inline `style=` (specificity !important equivalent). The inline `grid-template-columns:1fr` wins at all breakpoints wider than 767px.

**`<section>` classes** (line 784):
```
sgs-container sgs-hero sgs-hero--split sgs-hero--align-left sgs-hero-085d8675 sgs-container--grid alignfull sgs-cols-2 sgs-cols-tablet-2 sgs-cols-mobile-1 sgs-container-f4e2d526 wp-block-sgs-hero has-background has-surface-pink-background-color
```

The class `sgs-hero--split` is present, confirming `variant='split'` was correctly detected. `sgs-cols-2` and `sgs-cols-tablet-2` are present, indicating `columns=2` and `columnsTablet=2` attrs were set.

### 4. DB facts

**Table `block_attributes`, block `sgs/hero`:**

| attr_name | attr_type | default_value | is_responsive |
|---|---|---|---|
| `splitColumnRatio` | string | (none) | 1 |
| `splitColumnRatioTablet` | string | (none) | 0 |
| `splitColumnRatioMobile` | string | (none) | 0 |
| `columns` | number | 2 | 1 |
| `columnsMobile` | number | 1 | 0 |
| `columnsTablet` | number | 2 | 0 |
| `layout` | string | (none) | 0 |
| `verticalAlign` | string | (none) | 0 |
| `verticalAlignment` | string | `"center"` | 0 |
| `gridTemplateColumns` | string | `""` | 1 |
| `gridTemplateColumnsMobile` | string | `""` | 0 |
| `gridTemplateColumnsTablet` | string | `""` | 0 |

`splitColumnRatio` default_value: DB query returned no explicit default — the block.json `block.json:222` line in the DB tool output shows `splitColumnRatio` with `default_value` of (none/null), meaning render.php defaults it to `'1fr 1fr'` at line 214 (`$split_col_ratio = $attributes['splitColumnRatio'] ?? '1fr 1fr';`).

**DB-confirmed existence:** `splitColumnRatio` attr EXISTS on `sgs/hero`. `gridTemplateColumns` attr EXISTS on `sgs/hero`.

**Note on `layout` attr:** `layout` exists in `block_attributes` for `sgs/hero` with `default_value` = (none) / empty string. The `class-sgs-container-wrapper.php` emits `display:grid; grid-template-columns:repeat(columns,1fr)` only when `layout='grid'`. If `layout` is empty string, the wrapper still emits a grid when `is_section` is true and `layout='grid'` — per line 393 of class-sgs-container-wrapper.php.

### 5. SPEC/DOC refs

- **Spec 22 §FR-22-21** (`.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`, line near "FR-22-21"): Universal wrapper-conversion procedure — states `splitColumnRatio` / `gridTemplateColumns` / responsive variants are the canonical target attrs for grid-layout transfer. Converter-side gaps remain after WS-4 block-side complete.
- **`.claude/cloning-pipeline-flow.md` line 40**: "Fidelity = transferring the draft's CSS onto the chosen block's EDITABLE attributes ... `gridTemplateColumns`". Also line 126: "Grid + per-item — `grid-template-columns` (+responsive) → `gridTemplateColumns` (+Tablet/Mobile)".
- **`.claude/cloning-pipeline-flow.md` line 132**: "WS-4 composite-mirror — BLOCK-SIDE COMPLETE (2026-06-04, D167)" and "SEPARATE from page-clone fidelity: the converter still routes wrapper classes to `sgs/container` (fallback, conf 0.10)".
- **`.claude/decisions.md`**: D167 (WS-4 block-side complete), D159 (WS-1 A1+A2 SHIPPED).

### 6. PIPELINE-LOCATION refs

**Hero render.php** (`plugins/sgs-blocks/src/blocks/hero/render.php`):
- Line 214: `$split_col_ratio = $attributes['splitColumnRatio'] ?? '1fr 1fr';`
- Lines 275–282: split variant `$is_split` emits `display:grid; grid-template-columns:{$safe_ratio}; gap:{$gap_val}` into `$styles[]` array.
- Lines 828–855: hero attrs are passed to `SGS_Container_Wrapper::render()` with `extra_styles => $styles`. The null-attrs guard (lines 828–842) nulls out `backgroundImage`, `minHeight`, etc., but does NOT null out `gridTemplateColumns`, `columns`, or `layout`.

**class-sgs-container-wrapper.php** (`plugins/sgs-blocks/includes/class-sgs-container-wrapper.php`):
- Lines 393–400: when `layout='grid'`, the wrapper emits ANOTHER `display:grid; grid-template-columns:` into the inline style — this is the second `display:grid` seen in the clone's inline style string. The wrapper reads `columns` (default fallback `repeat(2,1fr)`) and emits `grid-template-columns:repeat(2,1fr)` if `gridTemplateColumns` is empty, OR `grid-template-columns:{gridTemplateColumns}` if set.

The inline style contains two competing `display:grid;grid-template-columns:` declarations because hero's own `$styles[]` (split path, lines 278–281) adds one set, then `SGS_Container_Wrapper::render()` appends its own set (lines 393–400) via the `extra_styles` merge at line 356. The browser applies the last declaration (`grid-template-columns:1fr` from the wrapper's `repeat(1,1fr)` default) over the hero's `1fr 1fr`.

**convert.py** (`plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py`):
- Lines 3006–3027: FR-22-20 variant detection fires for `sgs/hero` — `detect_variant(slug, attrs)` returns `'split'` when `splitImage` slots are present, setting `variant='split'` correctly.
- Lines 2900–2912: GAP-3 note at lines 2905–2912 records that `layout` attr is NOT lifted from mockup CSS for composites (intentional, to avoid colliding with hero's own render.php grid logic).

---

## H-B — "Also, the image still has padding on the top, bottom and sides when it should have none."

### 1. Issue ID + verbatim description

H-B: "Also, the image still has padding on the top, bottom and sides when it should have none."

### 2. DRAFT facts

**File:** `sites/mamas-munches/mockups/homepage/index.html`

**CSS for `.sgs-hero__media`** (line 256):
```css
.sgs-hero__media { grid-area: media; overflow: hidden; }
```
No `padding` declared on `.sgs-hero__media`.

**CSS for `.sgs-hero__split-image`** (line 260):
```css
.sgs-hero__split-image { width: 100%; object-fit: cover; display: block; }
```
No `padding` declared on `.sgs-hero__split-image`.

**CSS for `.sgs-hero__content`** (line 257):
```css
.sgs-hero__content { grid-area: content; padding: 28px 20px 40px; background: var(--surface-pink); }
```
Padding is on `__content`, NOT on `__media` or the image.

**Tablet/desktop `@media (min-width: 768px)`**, line 293–297: `.sgs-hero__content { display:flex; flex-direction:column; justify-content:center; padding: 56px 48px; }`. Still only on `__content`.

**Large desktop `@media (min-width: 1280px)`**, line 310: `.sgs-hero__content { padding: 72px 64px; }`. Still only `__content`.

No draft CSS rule sets padding on `.sgs-hero__media` or `.sgs-hero__split-image` at any breakpoint.

### 3. CLONE facts

**File:** `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`

**`<section>` inline style** (line 784):
```
padding-top:28px;padding-right:20px;padding-bottom:40px;padding-left:20px
```
This padding (`28px 20px 40px 20px`) is on the **outer `<section>` element** (the hero block wrapper), not on the `__media` wrapper or the image.

**`sgs-container-f4e2d526` responsive CSS** (line 784):
```css
@media (max-width:1023px){.sgs-container-f4e2d526{padding-top:56px;padding-right:48px;padding-bottom:56px;padding-left:48px}}
```
Again, this is on the outer `<section>` (both classes `sgs-hero-085d8675` and `sgs-container-f4e2d526` apply to the same `<section>`).

**`<div class="sgs-hero__media">` markup** (line 799):
```html
<div class="sgs-hero__media">
  <img ... class="sgs-hero__split-image sgs-hero__split-image--mobile" ... style="object-position:center 20%;" .../>
  <img ... class="sgs-hero__split-image sgs-hero__split-image--desktop" ... style="object-fit:cover;object-position:center center;border-radius:0px 0px 0px 0px;" .../>
</div>
```
The `<div class="sgs-hero__media">` has no `style=` attribute. The `<img>` elements have no `padding` in their inline styles.

No inline padding on `sgs-hero__media` div or the split images is present in the clone source. The `sgs-hero-085d8675` scoped CSS (line 784) has no padding rule for `.sgs-hero__media`.

**Observation:** The outer `<section>` carries `padding-top:28px;padding-right:20px;padding-bottom:40px;padding-left:20px` as its base inline style. In the draft, the `<section class="sgs-hero">` has no padding — padding is only on `.sgs-hero__content`. In the clone, the converter has transferred the draft's `.sgs-hero__content` mobile padding (`28px 20px 40px`) onto the OUTER section element's native `paddingTop/Right/Bottom/Left` attrs. This places the padding on the whole grid (both columns), visually adding space around the image column too.

The `sgs-container-f4e2d526` responsive rule sets `padding: 56px 48px` on the outer section at `max-width:1023px`, corresponding to the draft's tablet `.sgs-hero__content` padding (`56px 48px`). Again applied to the outer wrapper, not just the content column.

### 4. DB facts

**Table `block_attributes`, block `sgs/hero`:**

| attr_name | attr_type | default_value |
|---|---|---|
| `imagePaddingTop` | number | 0 |
| `imagePaddingRight` | number | 0 |
| `imagePaddingBottom` | number | 0 |
| `imagePaddingLeft` | number | 0 |
| `imagePaddingTopTablet` | number | null |
| `imagePaddingRightTablet` | number | null |
| `imagePaddingBottomTablet` | number | null |
| `imagePaddingLeftTablet` | number | null |
| `imagePaddingTopMobile` | number | null |
| `imagePaddingRightMobile` | number | null |
| `imagePaddingBottomMobile` | number | null |
| `imagePaddingLeftMobile` | number | null |
| `mediaPaddingTop` | number | null |
| `mediaPaddingRight` | number | null |
| `mediaPaddingBottom` | number | null |
| `mediaPaddingLeft` | number | null |
| `mediaPaddingTopTablet` | number | null |
| `mediaPaddingRightTablet` | number | null |
| `mediaPaddingBottomTablet` | number | null |
| `mediaPaddingLeftTablet` | number | null |
| `contentPaddingTop` | number | null |
| `contentPaddingRight` | number | null |
| `contentPaddingBottom` | number | null |
| `contentPaddingLeft` | number | null |
| `contentPaddingTopTablet` | number | null |
| `contentPaddingRightTablet` | number | null |
| `contentPaddingBottomTablet` | number | null |
| `contentPaddingLeftTablet` | number | null |

**All `imagePadding*` defaults are 0** (not null) — so `imagePaddingTop` = 0, etc. exist and default to 0.
**All `mediaPadding*` defaults are null** — meaning `null` = absent/unset, rendering no padding.
**All `contentPadding*` defaults are null** — same.

The `contentPadding*` attrs are the per-column-content padding controls. The `mediaPadding*` attrs are the per-column-media padding controls. The outer block's native padding (`paddingTop` etc.) applies to the full-width section wrapper.

### 5. SPEC/DOC refs

- **Spec 22 §FR-22-21** (`.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`): Universal wrapper-conversion procedure lists `padding` as a target transfer attr. Does not distinguish between outer-section padding and inner-column padding.
- **`.claude/cloning-pipeline-flow.md` line 40**: "`padding`" listed as a wrapper attr to transfer. No explicit distinction between outer/content-column/media-column padding transfer.
- **`plugins/sgs-blocks/src/blocks/hero/render.php` comment at line 193**: `// contentPadding — padding on the .sgs-hero__content wrapper.` and line 177: `// mediaPadding — outer padding on the .sgs-hero__media wrapper.` The dedicated per-column attrs (`contentPadding*` and `mediaPadding*`) exist specifically for this pattern.

### 6. PIPELINE-LOCATION refs

**convert.py** (`plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py`):
- Lines 494–497: `("padding-top", "spacing", "padding", ["spacing","padding","top"], "unit")` — maps CSS `padding-top` to the WP block's native `style.spacing.padding.top` path (outer block padding), not to `contentPaddingTop`.
- Lines 771–848: `_lift_wrapper_css_to_container_attrs()` — handles shorthand padding expansion and responsive `@media` lifting. This function lifts to the OUTER block attrs (native padding), not to `contentPadding*` or `mediaPadding*`.
- Lines 2786–2872 (A2/A3 paths): `_lift_wrapper_css_to_container_attrs` is called for container/composite nodes. No separate path for lifting `.sgs-hero__content`-scoped CSS into `contentPadding*` attrs vs outer padding attrs.

**hero/render.php** (`plugins/sgs-blocks/src/blocks/hero/render.php`):
- Lines 162–191: `imagePadding*` and `mediaPadding*` attrs are read from `$attributes` (defaults: `imagePaddingTop=0`, `mediaPaddingTop=null`).
- Lines 193–206: `contentPadding*` attrs are read from `$attributes` (defaults: `contentPaddingTop=null`).
- Lines 384–398: `imagePadding` responsive CSS emitted on `.sgs-hero__split-image` (only when tablet/mobile overrides set).
- Lines 435–448: `mediaPadding` responsive CSS emitted on `.sgs-hero__media` (only when tablet/mobile overrides set).
- Lines 451–467 (visible via code structure): `contentPadding` responsive CSS emitted on `.sgs-hero__content`.

**class-sgs-container-wrapper.php** (`plugins/sgs-blocks/includes/class-sgs-container-wrapper.php`):
- Lines 218–237: reads `paddingTopTablet`, `paddingRightTablet`, etc. from `$attributes`. These are the OUTER block's native spacing support attrs. The `contentPaddingTop` attr is NOT read by the container wrapper — it is only read by hero's own render.php.

---

## H-C — "I think the heading still is centre-aligned. In the block settings under layout, the text align settings are set to inherit and don't actually take the settings from the draft."

### 1. Issue ID + verbatim description

H-C: "I think the heading still is centre-aligned. In the block settings under layout, the text align settings are set to inherit and don't actually take the settings from the draft."

### 2. DRAFT facts

**File:** `sites/mamas-munches/mockups/homepage/index.html`

**CSS for `.sgs-hero__content h1`** (lines 264–270):
```css
.sgs-hero__content h1 {
  font-size: 34px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 14px;
  letter-spacing: -0.5px;
}
```
No `text-align` declared on `.sgs-hero__content h1` at base (mobile) breakpoint.

**Tablet/desktop `@media (min-width: 768px)` for `.sgs-hero__content h1`** (lines 299–305):
```css
.sgs-hero__content h1 {
  font-family: 'Fraunces', serif;
  font-size: 52px;
  line-height: 1.15;
  margin-bottom: 16px;
  letter-spacing: -1px;
}
```
No `text-align` in this block either.

**Large desktop `@media (min-width: 1280px)` for `.sgs-hero__content h1`** (line 311):
```css
.sgs-hero__content h1 { font-size: 58px; }
```
No `text-align`.

**No `text-align` property appears anywhere in the draft CSS for the hero heading at any breakpoint.** The draft relies on the browser default (left-aligned for LTR text) and the content div's left-align layout.

### 3. CLONE facts

**File:** `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`

**`sgs/heading` block rendered output** (lines 786–790):
```html
<style>@media(max-width:1024px){#sgs-hdg-d1cbc233 .wp-block-sgs-heading__text{font-size:52px;}}</style>
<div class="wp-block-sgs-heading" id="sgs-hdg-d1cbc233">
  <h1 class="wp-block-sgs-heading__text" style="color:var(--wp--preset--color--text);font-size:58px;font-weight:700;line-height:1.15;letter-spacing:-1px">
    Made for the mum<br>who needs it most
  </h1>
</div>
```

The `<div class="wp-block-sgs-heading">` wrapper has NO `style=` attribute at all — no `text-align` in either the wrapper div's inline style or the `<h1>`'s inline style.

No `text-align` is written anywhere in the `sgs-hero-085d8675` scoped CSS block (line 784) targeting the heading.

**`sgs-hero-style-inline-css`** (lines 216–230): only contains `.wp-block-sgs-hero.is-style-boxed` and `.wp-block-sgs-hero.is-style-borderless` rules. No `text-align` rules.

The user reports the heading appears centre-aligned in the block editor ("text align settings are set to inherit"). The clone page source shows no `text-align` inline style on the heading.

**Global styles** (line 387 — the large inline `:root{...}` block): Does not include a `text-align: center` targeting `.wp-block-sgs-heading` or hero children.

The `sgs-hero--align-left` class is on the `<section>` (line 784, confirmed in classes list). No CSS rule for `.sgs-hero--align-left .wp-block-sgs-heading` setting `text-align` is present in the inline styles in the clone source.

### 4. DB facts

**Table `block_attributes`, block `sgs/hero`:**

| attr_name | attr_type | default_value | enum_values |
|---|---|---|---|
| `textAlignDesktop` | string | `""` | (none) |
| `textAlignMobile` | string | `""` | (none) |
| `textAlignTablet` | string | `""` | (none) |
| `alignment` | string | `"left"` | (none) |

**Table `block_attributes`, block `sgs/heading`:**

| attr_name | attr_type | default_value | enum_values |
|---|---|---|---|
| `textAlign` | string | `""` | `["", "left", "center", "right", "justify", "start", "end"]` |

**Block `sgs/hero` supports (from DB):**
```
typography: {"fontSize": true, "lineHeight": true, "textAlign": true, "letterSpacing": true, "textTransform": true, "fontWeight": true, "fontStyle": true}
```
The `sgs/hero` block declares `"textAlign": true` in its `typography` supports — this is the WP native text-align control, which appears in the block editor's Layout panel as "Text alignment".

**Existence check — `textAlignDesktop/Mobile/Tablet` in `sgs/hero` block.json:**
These 3 attrs exist in `block_attributes` for `sgs/hero` with default `""`. They are ALSO confirmed in `plugins/sgs-blocks/src/blocks/hero/block.json` (grep result line `249–257`).

**Absence:** `textAlignDesktop/Mobile/Tablet` are NOT read anywhere in `plugins/sgs-blocks/src/blocks/hero/render.php` (grep returned no output for these attr names in that file). They are declared in `block.json` and exist in the DB, but are inert in render.php.

### 5. SPEC/DOC refs

- **DB-lookup.py line 1143** (`plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py`): `("text-align", "textAlign", None)` — maps CSS `text-align` to `textAlign` attr. This is in the `_FALLBACK` list used by the typography-lift function.
- **heading/render.php lines 198–200**: `$text_align_raw = isset($attributes['textAlign']) ? sanitize_text_field($attributes['textAlign']) : '';` — the `sgs/heading` block DOES read and apply its own `textAlign` attr. Lines 329–331: `if ('' !== $text_align) { $wrapper_inline[] = 'text-align:' . esc_attr($text_align); }` — emits `text-align` as inline style on the wrapper div.
- **heading/render.php lines 253–332**: the text-align emit at line 329–331 is inside the `if (!$inherit_style)` block (line 253). If `inheritStyle=true`, text-align is NOT emitted even if set.
- **Spec 22 §FR-22-21** (`.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`): Does not contain an explicit rule about `text-align` transfer from parent element context (`.sgs-hero__content h1`) to child InnerBlock (`sgs/heading`).
- **`.claude/cloning-pipeline-flow.md` line 40**: Does not mention `text-align` as a wrapper attr; it is listed in db_lookup.py's fallback typography map.

### 6. PIPELINE-LOCATION refs

**db_lookup.py** (`plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py`):
- Line 1143: `("text-align", "textAlign", None)` — `text-align` maps to `textAlign` with `kind_override=None`.
- Lines 1147–1200: the typography-lift function reads from `property_suffixes` table. `text-align` maps to `textAlign` only. No responsive variants for text-align (no `textAlignTablet`, `textAlignMobile` mapping in this table).

**convert.py** (`plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py`):
- Lines 2083–2084: `sgs/heading` atomic handler: `return {"content": _rich_text_content(node), "level": tag}` — only `content` and `level` are set by the atomic handler. No `textAlign` is populated here.
- The draft's CSS rule for `.sgs-hero__content h1` has no `text-align` property (verified in DRAFT facts above), so the converter would not have a `text-align` to lift even if a path existed.

**hero/render.php** (`plugins/sgs-blocks/src/blocks/hero/render.php`):
- `textAlignDesktop/Mobile/Tablet` attrs are declared in block.json (lines 249–257 of block.json, per grep output), exist in the DB, but produce NO output in render.php (grep for these attr names in render.php returned zero matches). These attrs are inert — declared but not consumed.
- The block editor's "Text alignment: inherit" state that the user reports comes from WP's native typography `textAlign` support (`"textAlign": true` in the `supports.typography` JSON) — when set to "inherit" (empty string `""`), render.php does not emit `text-align`. The WP block editor's Layout panel shows "inherit" for an unset/empty `textAlign` support value.

---

## Coverage Checklist

| Issue | Status |
|---|---|
| **H-A** — Split variant recognised but image takes majority of width, content squashed | **fact-complete** |
| **H-B** — Image has padding on all sides when it should have none | **fact-complete** |
| **H-C** — Heading centre-aligned; block settings text-align set to inherit, doesn't take draft settings | **fact-complete** |
