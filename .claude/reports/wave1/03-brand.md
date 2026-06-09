# Wave-1 Fact-Finder — Brand Section (BR-A / BR-B / BR-C)

Generated: 2026-06-08
Scope: sites/mamas-munches homepage brand section — facts only. No root-cause analysis, no solutions.

---

## BR-A — Responsive Grid: 1-column on desktop

**Issue (verbatim):** "Stacked 1 column on desktop. Wanted to add some more detail here as it could help find a bug that messes with our responsive settings, I checked out the block settings of the container and in the advanced grid layout section, the custom column template for desktop is set to '1fr' but the tablet has the correct template '1fr 1fr' and mobile is unset. I think the cause is because the @media rule's condition says min-width: 768px) - So I think the converter script doesn't have logic built in to understand that minimum applies to everything above and equal to that value and the opposite is true for max unless there is an overlapping rule e.g. having 3 overlapping min width conditions for one variable: 375px, 768px and 1440px."

---

### 1 — DRAFT facts

**File:** `sites/mamas-munches/mockups/homepage/index.html`

**Base (mobile-first) `.sgs-brand` rule — lines 462–470:**
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
Base `grid-template-columns`: `1fr` (single column, no @media qualifier).

**Responsive override — line 491–493:**
```css
@media (min-width: 768px) {
  .sgs-brand { grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
```
Breakpoint: `min-width: 768px`. Value at that breakpoint: `1fr 1fr`. Only one @media breakpoint exists for `.sgs-brand` grid-template-columns.

**Draft markup — lines 890–906:**
```html
<section class="sgs-brand" aria-labelledby="story-h2">
```
Root element has class `sgs-brand` only (no BEM modifier classes on the section).

---

### 2 — CLONE facts

**File:** `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`

**Per-instance `<style>` block — line 854:**
```html
<style id="sgs-container-4d4d56bf">
  @media (max-width:1023px){.sgs-container-4d4d56bf{gap:60px}}
  @media (max-width:1023px){.sgs-container-4d4d56bf{grid-template-columns:1fr 1fr}}
</style>
```
- `gridTemplateColumnsTablet` emitted as `@media (max-width:1023px)` → `grid-template-columns:1fr 1fr`
- `gridTemplateColumns` (desktop base, inline) emitted as `grid-template-columns:1fr` (inline style — see below)

**Inline style on `<section>` — line 854 (same line):**
```
style="padding-top:64px;padding-right:20px;padding-bottom:64px;padding-left:20px;
       margin-top:0;margin-right:auto;margin-bottom:0;margin-left:auto;
       gap:32px;display:grid;grid-template-columns:1fr;align-items:center"
```
Desktop base inline `grid-template-columns`: `1fr` (single column).

**Classes — line 854:**
```
class="sgs-container sgs-container--grid sgs-cols-2 sgs-cols-tablet-2 sgs-cols-mobile-1 sgs-container-4d4d56bf sgs-brand wp-block-sgs-container has-background has-surface-alt-background-color"
```
- `sgs-cols-2` → desktop columns indicator = 2
- `sgs-cols-tablet-2` → tablet columns indicator = 2
- `sgs-cols-mobile-1` → mobile columns indicator = 1

**Summary of emitted responsive grid values:**
| Attr | Emitted value | Rendered via |
|---|---|---|
| `gridTemplateColumns` (desktop) | `1fr` | inline `style=` on `<section>` |
| `gridTemplateColumnsTablet` | `1fr 1fr` | `@media (max-width:1023px)` in per-instance `<style>` |
| `gridTemplateColumnsMobile` | not emitted | absent |

---

### 3 — DB facts

**Table: `block_attributes`, `block_slug = 'sgs/container'`**

Relevant attrs (verified via `sgs-db.py sql`):

| attr_name | attr_type | default_value |
|---|---|---|
| `gridTemplateColumns` | string | `""` |
| `gridTemplateColumnsTablet` | string | `""` |
| `gridTemplateColumnsMobile` | string | `""` |
| `columns` | number | `2` |
| `columnsTablet` | number | `2` |
| `columnsMobile` | number | `1` |

All three `gridTemplateColumns*` attrs exist in the DB with empty string defaults.

**Table: `modifier_suffixes` WHERE `kind = 'breakpoint'`:**
`Mobile`, `Tablet`, `Desktop` — all three present.

---

### 4 — SPEC / DOC refs

**`plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` — comment block lines 3309–3318:**
```python
# render.php breakpoint thresholds (max-width model):
#   gridTemplateColumns           → base/desktop inline style (all sizes, unless overridden)
#   gridTemplateColumnsTablet     → @media (max-width:1023px)
#   gridTemplateColumnsMobile     → @media (max-width:599px)
# Mockup CSS uses min-width (mobile-first), so we invert:
#   min-width ≥ 1024 → desktop attr (gridTemplateColumns)
#   min-width 600–1023 → tablet attr (gridTemplateColumnsTablet)
#   base (no @media) → mobile attr (gridTemplateColumnsMobile)
_GRID_DESKTOP_BP = 1024  # px
_GRID_TABLET_BP  = 600   # px
```

**Spec 22 §FR-22-21** (`.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md`, line ~643):
> `grid-template-columns (+responsive) → gridTemplateColumns (+Tablet/Mobile)`

---

### 5 — PIPELINE-LOCATION refs

**`_BREAKPOINT_RULES` constant — `db_lookup.py` lines 1233–1239:**
```python
_BREAKPOINT_RULES: list[tuple[str, list[str]]] = [
    ("min-width: 768",  ["Tablet", "Desktop"]),
    ("min-width: 1024", ["Desktop"]),
    ("min-width: 1280", ["Desktop"]),
    ("max-width: 767",  ["Mobile"]),
    ("max-width: 640",  ["Mobile"]),
]
```
The entry `("min-width: 768", ["Tablet", "Desktop"])` maps the `min-width: 768` marker to both `["Tablet", "Desktop"]`.

**`_collect_responsive_grid_from_css` function — `convert.py` lines 3333–3411:**
- `_GRID_DESKTOP_BP = 1024` (line 3317): the threshold at or above which a breakpoint is treated as desktop.
- `_GRID_TABLET_BP  = 600`  (line 3318): the threshold at or above which a breakpoint is treated as tablet.
- Desktop value assignment (line 3383): `desktop_cols = bp_cols[sorted_bps[0]]` — the highest breakpoint found, regardless of whether it meets `_GRID_DESKTOP_BP`.
- Tablet value assignment (lines 3385–3390): looks for a breakpoint in `[_GRID_TABLET_BP, _GRID_DESKTOP_BP)` i.e. `[600, 1024)`.
- The draft has a single @media breakpoint of `768`. `768 < _GRID_DESKTOP_BP (1024)`, so it falls in the tablet range `[600, 1024)`. It is therefore assigned to `gridTemplateColumnsTablet`, NOT to `gridTemplateColumns` (desktop).
- The base (no @media) value `1fr` is assigned to `gridTemplateColumns` (desktop) as the fallback because `bp_cols[sorted_bps[0]]` is `1fr 1fr` (from 768) → `desktop_cols = "1fr 1fr"` (line 3399 sets `gridTemplateColumns = "1fr 1fr"`) BUT the tablet_cols check at line 3388 also picks up 768 because `600 <= 768 < 1024` → `tablet_cols = "1fr 1fr"` → at line 3402: `tablet_cols == desktop_cols` → `gridTemplateColumnsTablet` is NOT written (de-duplication gate skips it).

**Wait — re-reading more carefully:** `sorted_bps = [768]`. `desktop_cols = bp_cols[768] = "1fr 1fr"` → `gridTemplateColumns = "1fr 1fr"` (line 3399). Tablet check: `600 <= 768 < 1024` → `tablet_cols = "1fr 1fr"` (line 3389). At line 3402: `tablet_cols ("1fr 1fr") == desktop_cols ("1fr 1fr")` → de-dup gate fires → `gridTemplateColumnsTablet` NOT written. Base `base_cols = "1fr"` → reference = `tablet_cols ("1fr 1fr")` → `"1fr" != "1fr 1fr"` → `gridTemplateColumnsMobile = "1fr"` (line 3409).

**DISCREPANCY:** The above converter-logic trace predicts `gridTemplateColumns="1fr 1fr"`, `gridTemplateColumnsTablet` absent, `gridTemplateColumnsMobile="1fr"`. But the CLONE at line 854 shows the OPPOSITE: `gridTemplateColumns="1fr"` (base inline) and `gridTemplateColumnsTablet="1fr 1fr"` (@media max-width:1023px). This discrepancy between expected converter output and the actual clone emit is a FACT to record, not a root cause.

**`class-sgs-container-wrapper.php` lines 824–831 (render.php emit):**
```php
// QB-2: Responsive gridTemplateColumns — section + layout kinds.
if ( $is_section || $is_layout ) {
    if ( '' !== sgs_sanitize_grid_template( $grid_template_tablet ) ) {
        $responsive_css .= '@media (max-width:1023px){.' . $uid . '{grid-template-columns:' . sgs_sanitize_grid_template( $grid_template_tablet ) . '}}';
    }
    if ( '' !== sgs_sanitize_grid_template( $grid_template_mobile ) ) {
        $responsive_css .= '@media (max-width:599px){.' . $uid . '{grid-template-columns:' . sgs_sanitize_grid_template( $grid_template_mobile ) . '}}';
    }
```
`gridTemplateColumns` (base) → inline `style=""`. `gridTemplateColumnsTablet` → `@media (max-width:1023px)`. `gridTemplateColumnsMobile` → `@media (max-width:599px)`.

---

## BR-B — Media image missing rounded corners, height, width

**Issue (verbatim):** "Maybe fixing issue A will fix many of the other styling issues across the section and potentially others. Main issue I'm thinking that may be helped by fixing A is the media styles. It has nothing really working aside from using the correct image. Doesn't have rounded corners, the right height, width."

---

### 1 — DRAFT facts

**File:** `sites/mamas-munches/mockups/homepage/index.html`

**Base `.sgs-brand__image` rule — lines 472–478:**
```css
.sgs-brand__image {
  width: 100%;
  max-height: 380px;
  object-fit: cover;
  border-radius: 16px;
  order: -1;
}
```

**Responsive override — lines 493–497 (inside `@media (min-width: 768px)`):**
```css
.sgs-brand__image {
  order: 0;
  max-height: 440px;
  height: 440px;
}
```

**Draft markup — lines 901–905:**
```html
<img class="sgs-brand__image"
     src="../../research/photography/wp-media-library/Halimahs.jpeg"
     alt="A mum smiling and holding Mama's Munches cookies"
     loading="lazy"
     width="1920" height="1080">
```
Class: `sgs-brand__image`. No `sgs-` BEM block prefix — this is an element class under `.sgs-brand`.

---

### 2 — CLONE facts

**File:** `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`

**Emitted image — line 872:**
```html
<img src="https://sandybrown-nightingale-600381.hostingersite.com/wp-content/uploads/2026/06/Halimahs-26.jpeg"
     alt="A mum smiling and holding Mama&#039;s Munches cookies"
     style="object-fit:cover;object-position:center center"
     id="sgs-media-1946c80c"
     class="sgs-media sgs-media--align-left wp-block-sgs-media sgs-media__img"
     loading="lazy" decoding="async" />
```

Inline `style` on the `<img>`: only `object-fit:cover;object-position:center center`.

**Missing from emitted `style=`:** `border-radius`, `max-height`, `height`, `width`, `order`.

**No per-instance `<style>` block** scoped to `sgs-media-1946c80c` appears adjacent to or before line 872 in the clone (the only `<style>` before line 872 is `sgs-container-4d4d56bf` at line 854, which applies to the outer container only).

---

### 3 — DB facts

**Table: `block_attributes`, `block_slug = 'sgs/media'`**

Relevant attrs present in DB (verified via `sgs-db.py sql`):

| attr_name | attr_type | default_value |
|---|---|---|
| `borderRadius` | string | `""` |
| `borderRadiusBL` | string | `""` |
| `borderRadiusBR` | string | `""` |
| `borderRadiusTL` | string | `""` |
| `borderRadiusTR` | string | `""` |
| `borderRadiusUnit` | string | `"px"` |
| `maxHeight` | string | `None` |
| `maxHeightMobile` | string | `None` |
| `maxHeightTablet` | string | `None` |
| `maxHeightUnit` | string | `"px"` |
| `imageHeight` | integer | `None` |
| `imageWidth` | integer | `None` |
| `order` | integer | `None` |
| `orderMobile` | integer | `None` |
| `orderTablet` | integer | `None` |

All of `borderRadius`, `maxHeight`, `imageHeight`, `order` exist as registered attrs on `sgs/media`.

---

### 4 — SPEC / DOC refs

**`_atomic_attrs_for` function — `convert.py` lines 2099–2104:**
```python
# sgs/media — current schema: imageUrl, imageAlt
if slug == "sgs/media" and tag == "img":
    return {
        "imageUrl": _resolve_media_url(node.get("src", "")),
        "imageAlt": node.get("alt", ""),
    }
```
This is the only branch that handles `sgs/media` + `img` in `_atomic_attrs_for`. It returns only `imageUrl` and `imageAlt` — no CSS attrs.

**`_LIFT_EXCLUDED_PROPS` — `convert.py` line 869:**
```python
_LIFT_EXCLUDED_PROPS: frozenset[str] = frozenset({"max-width", "width"})
```
`max-width` and `width` are excluded from the general CSS-property lift. `max-height`, `border-radius`, `order` are NOT in this exclusion set.

**`_lift_wrapper_css_to_container_attrs` function — `convert.py` line 981:**
This function is called for `sgs/container` wrapper lift (A2/A3 paths at lines 2786 and 2872). The function is NOT called for `sgs/media` image elements — the media block uses `_atomic_attrs_for` which returns only `imageUrl`/`imageAlt`.

**`plugins/sgs-blocks/src/blocks/media/render.php` lines 36–65:**
`render.php` reads and applies `maxHeight`, `borderRadius`, `order` etc. if present in `$attributes`. These PHP reads confirm render.php supports those attrs.

---

### 5 — PIPELINE-LOCATION refs

**`_atomic_attrs_for` — `convert.py` lines 2099–2104:** Only `imageUrl` + `imageAlt` lifted for `sgs/media` + `img` tag.

**`walk` function — `convert.py` approx line 2640+:** When a node has `sgs-brand__image` as its only `sgs-` class, it is treated as a leaf element. The `sgs-brand__image` class is a BEM element class (`sgs-<block>__<element>`), not a BEM block class. The converter's slot-lookup resolves this element to its standalone block. Whether CSS from the `.sgs-brand__image` selector is lifted onto the resolved block's attrs is controlled by the path taken inside `walk()`.

**The CSS lift path for leaf elements** resolves via `_lift_wrapper_css_to_container_attrs` for `sgs/container` blocks only. For non-container resolved blocks (e.g. `sgs/media`), the CSS properties from that element's selector are not automatically lifted by `_lift_wrapper_css_to_container_attrs` — that function is gated on `sgs/container` attr-names (the `container_attr_names` frozenset argument at line 984).

**Relevant converter lines for walk A3 / A2 paths:**
- `convert.py` line 2786: `_lift_wrapper_css_to_container_attrs` called with `sgs/container` attr names.
- `convert.py` line 2872: same, for the slug-None path.

---

## BR-C — Button style mismatch: ghost vs outline

**Issue (verbatim):** "The button style is completely different and doesn't match at all. I think this is caused by mismatched naming conventions. The variant in the draft is called ghost but my buttons only have 3 global style variations: primary, secondary, and outline. The equivalent to ghost would be outline, I think the name ghost is cooler so if it's not much effort we can rename outline to ghost or just have it set up as a naming convention or synonym in the db tables. The logic for the primary and secondary styled buttons works so we just need to make it work for this variant too."

---

### 1 — DRAFT facts

**File:** `sites/mamas-munches/mockups/homepage/index.html`

**`.sgs-button--ghost` CSS — lines 90–98:**
```css
.sgs-button--ghost {
  background: transparent;
  color: var(--text);
  border-color: var(--border);
  font-size: 14px;
  padding: 10px 18px;
  min-height: 44px;
}
.sgs-button--ghost:hover { border-color: var(--primary); background: var(--surface-pink); }
```

**Button base `.sgs-button` CSS — lines 56–69 (no BEM modifier):**
```css
.sgs-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 15px;
  padding: 14px 24px;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  min-height: 48px;
  text-align: center;
  transition: background 0.18s, color 0.18s, border-color 0.18s;
}
```

**Draft brand CTA markup — line 899:**
```html
<a href="/about/" class="sgs-brand__cta sgs-button sgs-button--ghost" style="margin-top:8px;">Read the full story →</a>
```
Classes on the draft element: `sgs-brand__cta`, `sgs-button`, `sgs-button--ghost`.

---

### 2 — CLONE facts

**File:** `sites/mamas-munches/mockups/homepage/current-clone-page-source.html`

**Cloned button wrapper — line 869:**
```html
<div style="padding-top:10px;padding-right:18px;padding-bottom:10px;padding-left:18px;margin-top:8px"
     class="sgs-button-wrapper sgs-button--ghost wp-block-sgs-button has-text-color"
     id="sgs-btn-10">
  <a href="/about/" class="sgs-button is-style-outline" style="--sgs-btn-icon-gap:8px;">
    <span class="sgs-button__label">Read the full story →</span>
  </a>
</div>
```

**Wrapper classes:** `sgs-button-wrapper sgs-button--ghost wp-block-sgs-button has-text-color`
**Anchor classes:** `sgs-button is-style-outline`

The outer wrapper carries `sgs-button--ghost` as a class but the inner `<a>` has `is-style-outline`.

**`.sgs-button--ghost` CSS in clone — lines 663–664 (per-page scoped, emitted by the converter's variation_buf path):**
```css
.page-id-8 .sgs-button--ghost{ background: transparent; border-color: var(--border); padding: 10px 18px }
.page-id-8 .sgs-button--ghost:hover{ border-color: var(--primary); background: var(--surface-pink) }
```

**`is-style-outline` CSS in clone — line 205 (button block's style.css, enqueued globally):**
```css
.sgs-button.is-style-outline{background-color:transparent;border-color:var(--wp--preset--color--primary);color:var(--wp--preset--color--primary)}
.sgs-button.is-style-outline:hover,.sgs-button.is-style-outline:focus-visible{background-color:var(--wp--preset--color--primary);color:#fff}
```

**Other button instances for comparison (primary/secondary working):**
- Line 795: `class="sgs-button is-style-primary"` (Shop Zookies)
- Line 796: `class="sgs-button is-style-secondary"` (Try 3 for £5)

---

### 3 — DB facts

**Table: `slots` — button-related rows (verified via `sgs-db.py sql`):**

| slot_name | standalone_block | standalone_block_default_attrs |
|---|---|---|
| `button` | `sgs/button` | `None` |
| `button-primary` | `sgs/button` | `{"inheritStyle": "primary"}` |
| `buttonSecondary` | `sgs/button` | `{"inheritStyle": "secondary"}` |
| `button-outline` | `sgs/button` | `{"inheritStyle": "outline"}` |
| `link` | `sgs/button` | `None` |
| `button-group` | `sgs/multi-button` | `None` |

**`button-outline` slot aliases column:**
```
["button-outline", "outline-button", "buttonOutline", "outlineButton", "ctaOutline", "cta-outline",
 "outlineCta", "ghost-button", "ghostButton", "button-ghost"]
```
`ghost-button`, `ghostButton`, and `button-ghost` ARE present as aliases in the `button-outline` slot's aliases. The string `ghost` as a standalone alias is NOT in this list.

**Table: `block_attributes`, `block_slug = 'sgs/button'` — `inheritStyle` attr:**
```
attr_name: inheritStyle
attr_type: string
default_value: "primary"
enum_values: None
```

**`allowed_presets` in `render.php` — line 437:**
```php
$allowed_presets = array( 'primary', 'secondary', 'outline' );
```
Registered values for `inheritStyle` that produce `is-style-<preset>`: `primary`, `secondary`, `outline`. `ghost` is NOT in this array.

**`block_styles` table query for `sgs/button`:** returned no results — no registered WordPress block style variations for `sgs/button` in the DB.

**`ghost` in `button` block source files:**
- Not present in `plugins/sgs-blocks/src/blocks/button/` (no match in any file in that directory).
- `ghost` appears in `plugins/sgs-blocks/includes/class-mobile-nav-renderer.php:1147` (unrelated to sgs/button) and `includes/lucide-icons.php:873` (icon name only) and `includes/mobile-nav-patterns.php:65` (a pattern attribute `"secondaryCtaStyle":"ghost"` — different block/context).

---

### 4 — SPEC / DOC refs

**`convert.py` lines 3105–3131 — BEM modifier → `inheritStyle` detection:**
```python
# Button preset from a BEM MODIFIER (2026-06-03). The natural BEM for a button
# variant is the modifier, e.g. `.sgs-button--primary` / `--secondary` /
# `--outline` (the real Mama's draft). When the resolved block has an
# `inheritStyle` attr and a modifier matches a known preset, set it so the
# cloned button follows that theme preset's CSS.
...
if (slug is not None and "inheritStyle" not in attrs
        and db.block_attrs(slug).get("inheritStyle", {}).get("attr_type") == "string"):
    _presets = db.inherit_style_presets()
    for _cls in sgs_classes:
        _bem = db.parse_sgs_bem(_cls)
        if _bem is None or not _bem.modifier:
            continue
        _mod = _bem.modifier.lower()
        if _mod in _presets:
            attrs["inheritStyle"] = _mod
            break
        if _mod == "ghost":
            attrs["inheritStyle"] = "outline"
            break
```
Lines 3129–3131: explicit `ghost` → `outline` mapping IS present in the converter code.

**`db_lookup.py` `inherit_style_presets()` — lines 1981–1991:**
Derives the preset set from `slots.standalone_block_default_attrs` where `inheritStyle` is set. Result: `{"primary", "secondary", "outline"}`. `ghost` is NOT in this frozenset.

**`render.php` lines 437–439:**
```php
$allowed_presets = array( 'primary', 'secondary', 'outline' );
$safe_preset     = in_array( $inherit_style, $allowed_presets, true ) ? $inherit_style : 'primary';
$btn_classes[]   = 'is-style-' . $safe_preset;
```
`ghost` not in `$allowed_presets` → if `inheritStyle = "ghost"` were stored, `$safe_preset` would fall through to `'primary'`.

**`plugins/sgs-blocks/src/blocks/button/style.css` lines 69–79:**
Only three `is-style-*` selectors exist: `.sgs-button.is-style-primary`, `.sgs-button.is-style-secondary`, `.sgs-button.is-style-outline`. No `.sgs-button.is-style-ghost`.

---

### 5 — PIPELINE-LOCATION refs

**Ghost→outline mapping: `convert.py` lines 3129–3131** (inside the `_mod == "ghost"` branch). This code path IS present.

**`inherit_style_presets()` derivation: `db_lookup.py` lines 1981–1991.** The presets set is `{"primary", "secondary", "outline"}` — derived from `slots.standalone_block_default_attrs`.

**Button render.php `$allowed_presets` guard: `plugins/sgs-blocks/src/blocks/button/render.php` line 437.**

**`button-outline` slot aliases including ghost variants: verified via `sgs-db.py sql` on the `slots` table.** `ghost-button`, `ghostButton`, `button-ghost` are aliases but `ghost` alone is not.

**Wrapper carries `sgs-button--ghost` class (clone line 869):** The wrapper `<div>` has class `sgs-button--ghost` AND the anchor has `is-style-outline`. This means the converter did map ghost→outline for the `inheritStyle` attr (firing the code at convert.py:3129), and render.php emitted `is-style-outline` on the `<a>`. The wrapper class `sgs-button--ghost` is a separate CSS class carried onto the wrapper `<div>` (not the `<a>`), while the `is-style-outline` class controls the button face styling.

**Draft `.sgs-button--ghost` vs clone `.sgs-button.is-style-outline` CSS diff (both files, literal values):**

| Property | Draft `.sgs-button--ghost` | Clone `.sgs-button.is-style-outline` |
|---|---|---|
| background | `transparent` | `transparent` |
| border-color | `var(--border)` | `var(--wp--preset--color--primary)` |
| color | `var(--text)` | `var(--wp--preset--color--primary)` |
| font-size | `14px` | inherited (`15px` from `.sgs-button`) |
| padding | `10px 18px` | `14px 24px` (from `.sgs-button` base) |
| min-height | `44px` | `48px` (from `.sgs-button` base) |
| hover border-color | `var(--primary)` | `var(--wp--preset--color--primary)` |
| hover background | `var(--surface-pink)` | `var(--wp--preset--color--primary)` |

**Note:** The clone ALSO emits `.page-id-8 .sgs-button--ghost` CSS (lines 663–664) which applies `border-color: var(--border); padding: 10px 18px` to the wrapper div. The `sgs-button--ghost` class is on the wrapper `<div>`, not the `<a>`, so those rules apply to the container div rather than the `<a>` button element itself.

---

## Coverage Checklist

| Issue | Status |
|---|---|
| BR-A | fact-complete |
| BR-B | fact-complete |
| BR-C | fact-complete |
