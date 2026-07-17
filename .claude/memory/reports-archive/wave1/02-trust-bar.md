# Wave-1 Fact-Finder Report — Trust Bar
**Client:** Mama's Munches  
**Date:** 2026-06-08  
**Scope:** TB-A (content-width / layout layers), TB-B (responsive facts), TB-C (icon facts)  
**Status:** All three issues fact-complete

---

## TB-A — Content width not passed to clone; 4 badges spread across full screen width

### 1. Issue ID + Verbatim Description

TB-A: "The content width hasn't passed onto the clone so the 4 badges are spread out across the screen width rather than what it should be."

Four layers requested:
1. **Max-width** — taken from `.sgs-trust-bar` (the container top-level equivalent class). Not set → max-width is full = background/external-CSS layer.
2. **Content-width** — taken from `.sgs-trust-bar__inner` (the direct descendant). The `max-width: 1100px` should fold into the `sgs/container` block's `contentWidth` setting.
3. **Column/row template** — the grid column template at each breakpoint.
4. **Per-grid-item CSS** — any per-item CSS that folds into the container.

---

### 2. DRAFT Facts (index.html)

**Layer 1 — Max-width on `.sgs-trust-bar` (section root):**

`index.html` lines 318–321:
```css
.sgs-trust-bar {
  background: var(--surface-pink);
  padding: 22px 20px;
}
```
**No `max-width` is set on `.sgs-trust-bar`.** The section is full-bleed. No `width` property either.

**Layer 2 — Content-width on `.sgs-trust-bar__inner` (direct descendant):**

`index.html` lines 322–328:
```css
.sgs-trust-bar__inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 12px;
  max-width: 1100px;
  margin: 0 auto;
}
```
`max-width: 1100px` is set. `margin: 0 auto` centres it. This is the content-width layer.

**Layer 3 — Column/row template (responsive):**

`index.html` line 324: base (mobile-first): `grid-template-columns: 1fr 1fr` (2 columns).  
`index.html` line 361: `@media (min-width: 600px)` — `.sgs-trust-bar__inner { grid-template-columns: repeat(4, 1fr); }` (4 columns).  
No tablet/desktop `@media (min-width: 1024px)` column override exists (only a font-size override at line 364).

**Layer 4 — Per-grid-item CSS:**

No per-grid-item CSS is set on `.sgs-trust-bar__inner`'s direct children via any class-level rule in the draft. No `grid-column`, `grid-row`, or individual-item `width`/`padding` override is found for `.sgs-trust-bar__badge` that would constitute a "per-grid-item layer" beyond what `display:flex; align-items:center; gap:10px` gives each badge (lines 329–333).

Badge CSS (`index.html` lines 329–333):
```css
.sgs-trust-bar__badge {
  display: flex;
  align-items: center;
  gap: 10px;
}
```
No `width`, `max-width`, `flex`, `grid-column`, or per-item sizing is set on `.sgs-trust-bar__badge` in the draft.

**Draft HTML markup (`index.html` lines 790–822):**
```html
<section class="sgs-trust-bar" aria-label="Why choose Mama's Munches">
  <div class="sgs-trust-bar__inner">
    <div class="sgs-trust-bar__badge">…</div>
    <div class="sgs-trust-bar__badge">…</div>
    <div class="sgs-trust-bar__badge">…</div>
    <div class="sgs-trust-bar__badge">…</div>
  </div>
</section>
```
Nesting structure: `section.sgs-trust-bar` → `div.sgs-trust-bar__inner` (sole direct element child) → 4× `div.sgs-trust-bar__badge`.

---

### 3. CLONE Facts (current-clone-page-source.html)

**Clone rendered block is at line 801.**

The full emitted `<style>` block and `<div>` opening (line 801):

**Per-instance style block (line 801):**
```html
<style id="sgs-container-556ace28">
@media (max-width:1023px){.sgs-container-556ace28{grid-template-columns:repeat(4, 1fr)}}
@media (max-width:599px){.sgs-container-556ace28{grid-template-columns:1fr 1fr}}
</style>
```

**Clone wrapper `<div>` inline style (line 801):**
```
style="padding-top:22px;padding-right:20px;padding-bottom:22px;padding-left:20px;
--sgs-trust-badge-circle-bg: var(--wp--preset--color--surface);
--sgs-trust-badge-icon-colour: var(--wp--preset--color--primary-dark);
--sgs-trust-badge-text-colour: var(--wp--preset--color--text);
gap:var(--wp--preset--spacing--20);
display:grid;
grid-template-columns:repeat(4, 1fr);
align-items:start"
```

**Clone wrapper classes (line 801):**
```
class="sgs-container sgs-trust-bar sgs-trust-bar--icon-circle sgs-trust-bar--medium
sgs-container--grid alignfull sgs-cols-4 sgs-cols-tablet-4 sgs-cols-mobile-2
sgs-container-556ace28 wp-block-sgs-trust-bar has-background has-surface-pink-background-color"
```

**`contentWidth` in clone:** ABSENT. No `sgs-container__inner` div is rendered inside the trust-bar wrapper. No `max-width: 1100px` appears in the inline style or in the `<style id="sgs-container-556ace28">` block. No `contentWidth` attr is emitted in the block comment (the current-clone-page-source.html does not contain block comments — it is rendered PHP output, not raw block markup).

**`widthMode` in clone:** The class `alignfull` is present. The block is full-width. No `widthMode="custom"` or other width-constraining mechanism is visible in the output.

**`gap` in clone:** `gap:var(--wp--preset--spacing--20)` is set inline on the wrapper. Draft uses `gap: 16px 12px`.

---

### 4. DB Facts

**`blocks` table:**
| slug | title | tier | variant_attr |
|------|-------|------|-------------|
| `sgs/trust-bar` | SGS Trust Bar | `class-section` | NULL |
| `sgs/container` | SGS Container | `block` | NULL |

**`block_composition` table:**
| block_slug | wraps_block | composition_role | has_inner_blocks | container_kind |
|-----------|-------------|-----------------|-----------------|---------------|
| `sgs/trust-bar` | `sgs/container` | `content-block` | `0` | `section` |
| `sgs/container` | NULL | `wrapper-shell` | `1` | NULL |

**`block_attributes` table — layout/width attrs (selected attrs for both blocks):**

| block_slug | attr_name | attr_type | default_value |
|-----------|-----------|-----------|--------------|
| `sgs/trust-bar` | `contentWidth` | string | `""` |
| `sgs/trust-bar` | `maxWidth` | string | `""` |
| `sgs/trust-bar` | `widthMode` | string | `"default"` |
| `sgs/trust-bar` | `gridTemplateColumns` | string | `"repeat(4, 1fr)"` |
| `sgs/trust-bar` | `gridTemplateColumnsTablet` | string | `"repeat(4, 1fr)"` |
| `sgs/trust-bar` | `gridTemplateColumnsMobile` | string | `"1fr 1fr"` |
| `sgs/trust-bar` | `columns` | number | `4` |
| `sgs/trust-bar` | `columnsTablet` | number | `4` |
| `sgs/trust-bar` | `columnsMobile` | number | `2` |
| `sgs/container` | `contentWidth` | string | `""` |
| `sgs/container` | `maxWidth` | string | `""` |
| `sgs/container` | `widthMode` | string | `"default"` |
| `sgs/container` | `gridTemplateColumns` | string | `""` |
| `sgs/container` | `gridTemplateColumnsTablet` | string | `""` |
| `sgs/container` | `gridTemplateColumnsMobile` | string | `""` |
| `sgs/container` | `columns` | number | `2` |
| `sgs/container` | `columnsTablet` | number | `2` |
| `sgs/container` | `columnsMobile` | number | `1` |

The `contentWidth` attr EXISTS on `sgs/trust-bar` in the DB (type string, default `""`). Its default is empty — meaning no content-width cap is applied unless a value is explicitly set.

---

### 5. SPEC/DOC Refs

**Spec 22 §FR-22-21** — Universal wrapper-conversion procedure. States:
- "CONTENT WIDTH (inner) — the wrapper's direct-descendant content wrapper, if any (`__inner` / `__card-inner` whose role is cap-and-centre via `max-width` + `margin:auto`). Its max-width → the container's `contentWidth`."
- Worked example at `trust-bar`: "`__inner` (DIRECT descendant, grid) → FOLDS into the section container (#2 grid case): the section container becomes the 4-col grid; the 4 badges become its grid items with per-item CSS."
- Section §FR-22-4.1, rule 2: "A DIRECT descendant of a container FOLDS into that container."
  - "1 direct descendant (or a non-layout shell — e.g. a `__inner` with only `max-width`/padding) → its CSS folds as a single inner-CSS layer on the container."
  - "grid / flex / stack direct descendant → the container ABSORBS the layout: the wrapper's `display:grid|flex` + `grid-template-columns` + `gap` lift onto the container's native grid attributes …"
  - Note: `.sgs-trust-bar__inner` is BOTH a grid AND carries `max-width: 1100px` — the §FR-22-4.1 text says "inner exists (cap-only) → set contentWidth = inner max-width" and "inner is ALSO the grid → contentWidth + grid both on the constrained content."

**Spec 22 §FR-22-4.1 fold path (convert.py comment at line 2950–2968):**
> "resolved composites took the plain walk loop below and never folded — the selective application that caused the trust-bar duplicate-nesting bug."
The code comment at line 2950–2968 states trust-bar is specifically called out as the canonical example of a resolved composite that needed `_process_container_children` wired to fold the `__inner`.

**Spec 29 §2 (container_kind='section'):**
`c:\Users\Bean\Projects\small-giants-wp\.claude\specs\29-CONTAINER-EQUIVALENT-BLOCKS.md` — `sgs/trust-bar` is listed under the `section` KIND (line 115). Section KIND includes: "Width panel: widthMode, customWidth, contentWidth, per-viewport overrides." `contentWidth` is a declared capability of the section KIND.

**`_fold_layout_into_attrs` docstring (convert.py line 3811–3831):**
> "B2/A1 (FR-22-21): lift the folded wrapper's own max-width as contentWidth so the section's inner content cap is preserved (e.g. `__inner` max-width:960px → '960px')."
> "Only fires for the sole-shell fold path (sole element child) — grid/flex item wrappers are NOT sole children so this code is never reached for them."

This final docstring note is the key: `_fold_layout_into_attrs` only fires for a wrapper that is the SOLE element child. `.sgs-trust-bar__inner` has 4 `div.sgs-trust-bar__badge` children — i.e. multiple element children — but `.sgs-trust-bar__inner` itself IS the sole direct element child of `section.sgs-trust-bar`. The fold path fires for `__inner` as a sole-shell (sole child of the section root) and its `max-width` should fold as `contentWidth`.

---

### 6. PIPELINE-LOCATION Refs (location only)

| Location | File:Line | Function | Role |
|----------|-----------|----------|------|
| sgs/trust-bar explicit handler — extracts badge items, `columns`, `badgeStyle`; does NOT set `contentWidth` | `convert.py:2236–2345` | `_atomic_attrs_for()` (trust-bar branch) | Content-extraction handler |
| Resolved composite fold gate — routes trust-bar children through `_process_container_children` | `convert.py:2950–2971` | `walk()` composite fold branch | Grid/fold dispatch |
| `_process_container_children` — sole-shell gate (`fold_eligible = len(element_children) == 1`) | `convert.py:3834–3887` | `_process_container_children()` | Sole-shell fold decision |
| `_fold_layout_into_attrs` — folds `__inner` layout into container attrs; lifts `max-width` → `contentWidth` via `setdefault` | `convert.py:3808–3831` | `_fold_layout_into_attrs()` | contentWidth lift logic |
| `_merge_grid_attrs_into_container` — lifts `display:grid`, `gridTemplateColumns`, `gap` | `convert.py:3548–3578` | `_merge_grid_attrs_into_container()` | Grid-attr merge |
| render.php `$do_wrap` gate — emits `sgs-container__inner` when `contentWidth` is set AND `layout` is empty | `class-sgs-container-wrapper.php:978–981` | `SGS_Container_Wrapper::render()` | `__inner` wrapper emission |
| trust-bar render.php calls `SGS_Container_Wrapper::render()` with `kind='section'` | `render.php:263` | — | Wrapper render entry point |

---

## TB-B — Responsive values: rules/settings must be responsive; no inline or single-device-type emission

### 1. Issue ID + Verbatim Description

TB-B: "All of these rules/settings are responsive so there is no excuse for writing inline or only writing to one device type or getting them mixed up."

---

### 2. DRAFT Facts — Which TB-A Values Are Responsive

**Draft uses MOBILE-FIRST `min-width` breakpoints:**

| Property | Mobile (base) | Tablet/600px | Desktop/1024px | Location |
|----------|--------------|-------------|----------------|----------|
| `grid-template-columns` on `__inner` | `1fr 1fr` (2 cols) | `@media (min-width: 600px) → repeat(4, 1fr)` (4 cols) | No change (stays 4 cols) | `index.html:324`, `index.html:360–362` |
| `max-width` on `__inner` | `1100px` (all breakpoints — no responsive change) | same | same | `index.html:326` |
| `gap` on `__inner` | `16px 12px` (all breakpoints) | same | same | `index.html:325` |
| `padding` on `.sgs-trust-bar` | `22px 20px` (all breakpoints) | same | same | `index.html:320` |
| `.sgs-trust-bar__text` font-size | `13px` (mobile) | same | `@media (min-width: 1024px) → 14px` | `index.html:355`, `index.html:363–365` |

**Draft breakpoint model: mobile-first** (`min-width`).  
Breakpoints used: `min-width: 600px` (grid columns) and `min-width: 1024px` (font-size only).

---

### 3. CLONE Facts — How Values Are Emitted

**Clone breakpoint model: desktop-first** (`max-width`).  
This is confirmed by `convert.py:3309–3312` comments:
```python
# render.php breakpoint thresholds (max-width model):
#   gridTemplateColumnsTablet     → @media (max-width:1023px)
#   gridTemplateColumnsMobile     → @media (max-width:599px)
```

**Clone emissions for trust-bar (line 801):**

| Property | Clone emission method | Value |
|----------|----------------------|-------|
| `grid-template-columns` (desktop/base) | **Inline `style=`** | `grid-template-columns:repeat(4, 1fr)` |
| `grid-template-columns` (tablet, ≤1023px) | `@media (max-width:1023px)` in `<style id="sgs-container-556ace28">` | `repeat(4, 1fr)` |
| `grid-template-columns` (mobile, ≤599px) | `@media (max-width:599px)` in `<style id="sgs-container-556ace28">` | `1fr 1fr` |
| `contentWidth` / `max-width: 1100px` | **ABSENT** — not emitted at all | — |
| `gap` | **Inline `style=`** | `gap:var(--wp--preset--spacing--20)` |
| `padding` | **Inline `style=`** | `padding-top:22px;padding-right:20px;padding-bottom:22px;padding-left:20px` |

**Breakpoint translation from draft → clone:**

| Draft (min-width) | Clone equivalent (max-width) | Correct mapping? |
|-------------------|------------------------------|-----------------|
| base (mobile, no breakpoint) | desktop inline `style=` / no `@media` | **INVERTED**: draft base = mobile, clone base = desktop |
| `@media (min-width: 600px)` | `@media (max-width:599px)` (mobile) | **INVERTED**: draft 600px+ = 4 cols; clone maps 4-col to `max-width:1023px` (tablet), 2-col to `max-width:599px` (mobile) — mapping is functionally correct for columns |
| `@media (min-width: 1024px)` font-size | Not emitted for trust-bar | font-size responsive change not transferred |

**Inline style usage in clone:**
- `grid-template-columns:repeat(4, 1fr)` is written as inline `style=` on the `<div>` (line 801).
- `gap:var(--wp--preset--spacing--20)` is written as inline `style=` on the `<div>` (line 801).
- `padding-top/right/bottom/left` are written as inline `style=` on the `<div>` (line 801).
- The `<style id="sgs-container-556ace28">` contains the responsive `@media` overrides for `grid-template-columns` at tablet and mobile.

The `grid-template-columns` desktop value is inline (not in a `@media` block). The responsive variants (tablet/mobile) are in a per-instance `<style>` block using `max-width` queries.

---

### 4. DB Facts

No additional DB facts beyond TB-A. The `sgs/trust-bar` `gridTemplateColumnsTablet` default is `"repeat(4, 1fr)"` and `gridTemplateColumnsMobile` is `"1fr 1fr"` — these match the clone emission.

---

### 5. SPEC/DOC Refs

**`convert.py` lines 3309–3338** (comment block):
```python
# render.php breakpoint thresholds (max-width model):
#   gridTemplateColumnsTablet     → @media (max-width:1023px)
#   gridTemplateColumnsMobile     → @media (max-width:599px)
# Mockup CSS is mobile-first (min-width). render.php is desktop-first (max-width).
```

**`class-sgs-container-wrapper.php` line 978** (the `$do_wrap` gate):
```php
$do_wrap = null !== $opt_wrap_inner ? (bool) $opt_wrap_inner : ( '' !== $content_width && '' === $layout );
```
When `contentWidth` is empty string AND `layout` is non-empty (grid), `$do_wrap` is FALSE. The `__inner` div is never emitted.

---

### 6. PIPELINE-LOCATION Refs (location only)

| Location | File:Line | Role |
|----------|-----------|------|
| Breakpoint model note (desktop-first `max-width` in render.php vs. mobile-first `min-width` in mockup) | `convert.py:3309–3338` | Comment documenting the deliberate inversion |
| Responsive CSS style tag emission (per-instance `<style id="sgs-container-{uid}">`) | `class-sgs-container-wrapper.php` lines 960–969 (the `$style_tag` assignment) | Responsive grid CSS output |
| `$do_wrap` gate controlling `__inner` emission | `class-sgs-container-wrapper.php:978–981` | contentWidth → `__inner` wrapper |

---

## TB-C — Icon differences: house, check, truck, star

### 1. Issue ID + Verbatim Description

TB-C: "Only other difference in trust bar are the icons. The house icon is different, the star icon from the draft is a flat colour but on the clone it has got a pink outline with a white/transparent inside. The delivery truck icon is different too but the clone icon is actually much better than the draft so in this exception I'd update the draft to match the truck icon."

---

### 2. DRAFT Facts — Icon SVG Markup

**Badge 1 — House ("Handmade in Birmingham")** (`index.html:794–796`):
```html
<span class="sgs-trust-bar__icon" aria-hidden="true">
  <svg viewBox="0 0 24 24">
    <path d="m3 12 9-9 9 9"/>
    <path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10"/>
  </svg>
</span>
```
Draft house: 2-path "classic peaked-roof" home glyph. No `fill`, no `stroke` attributes on the SVG tag. No `xmlns`. viewBox only.

**Badge 2 — Check ("Registered Food Business")** (`index.html:801–803`):
```html
<span class="sgs-trust-bar__icon" aria-hidden="true">
  <svg viewBox="0 0 24 24">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
</span>
```
Draft check: single-path checkmark. No fill/stroke attributes on the SVG tag.

**Badge 3 — Truck ("Free UK Delivery Over £35")** (`index.html:808–810`):
```html
<span class="sgs-trust-bar__icon" aria-hidden="true">
  <svg viewBox="0 0 24 24">
    <rect x="1" y="3" width="15" height="13"/>
    <path d="m16 8 5 2v5h-5z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
</span>
```
Draft truck: `<rect>` body + `<path>` cab section + 2× `<circle>` wheels. Old/classic Lucide truck style. No fill/stroke on SVG tag.

**Badge 4 — Star ("Loved by Breastfeeding Mums")** (`index.html:815–817`):
```html
<span class="sgs-trust-bar__icon" aria-hidden="true">
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style="fill: var(--primary-dark);">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
</span>
```
Draft star: `<polygon>` 5-point star with `fill="currentColor"`, `stroke="none"`, and inline `style="fill: var(--primary-dark);"`. **Flat-filled polygon, no stroke.**

---

### 3. CLONE Facts — Icon Markup

**Clone rendered at line 801.**

**Badge 1 — House (clone):**
```html
<svg class="lucide lucide-home" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round">
  <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
  <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
</svg>
```
Clone house: **Lucide `home` (current/redesigned version)** — 2-path rounded house with door cutout. `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`. Different path data from the draft's classic peaked-roof home.

**Badge 2 — Check (clone):**
```html
<svg class="lucide lucide-check" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 6 9 17l-5-5" />
</svg>
```
Clone check: Lucide `check`. Single-path `M20 6 9 17l-5-5`. **Path data matches the draft exactly** (`M20 6 9 17l-5-5`). Clone has `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`.

**Badge 3 — Truck (clone):**
```html
<svg class="lucide lucide-truck" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
  <path d="M15 18H9" />
  <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
  <circle cx="17" cy="18" r="2" />
  <circle cx="7" cy="18" r="2" />
</svg>
```
Clone truck: **Lucide `truck` (current version)** — 3 paths + 2 circles. Uses path data instead of `<rect>` body. `fill="none"`, `stroke="currentColor"`. Different visual from the draft's `<rect>` + 1 cab path truck.

**Badge 4 — Star (clone):**
```html
<svg class="lucide lucide-star" xmlns="http://www.w3.org/2000/svg" width="24" height="24"
  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round">
  <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
</svg>
```
Clone star: **Lucide `star` (current version, outline)** — single `<path>` star outline. `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`. This is an outlined (hollow) star.

**Draft star: flat-filled `<polygon>` with `fill: var(--primary-dark)` and `stroke="none"`.  
Clone star: Lucide `lucide-star` outlined path with `fill="none"` and `stroke="currentColor"`.  
Visual difference: draft = solid flat-colour star; clone = hollow star with pink outline (because `stroke="currentColor"` picks up the `--sgs-trust-badge-icon-colour: var(--wp--preset--color--primary-dark)` custom property set on the wrapper, which is the teal/teal-dark colour, not pink — the "pink outline" the user sees is likely the `--sgs-trust-badge-circle-bg: var(--wp--preset--color--surface)` or the icon circle background).**

---

### 4. DB Facts — Icon Resolution

**`block_attributes` table for `sgs/trust-bar`:**  
`items` attr (type: array) — default value includes:
```json
[
  {"icon": "home", "label": "Handmade in Birmingham", "pending": false},
  {"icon": "check", "label": "Registered Food Business", "pending": false},
  {"icon": "truck", "label": "Free UK Delivery Over £35", "pending": false},
  {"icon": "star", "label": "Loved by Breastfeeding Mums", "pending": false}
]
```
The icon slugs `home`, `check`, `truck`, `star` are stored in the block's `items` array. These Lucide slug names drive `sgs_get_lucide_icon()` in render.php, which outputs the current Lucide SVG for each slug.

---

### 5. SPEC/DOC Refs

**`icon_resolver.py` structural heuristics** (lines 138–188):

- `_is_old_home()` (lines 166–180): detects the draft's 2-path peaked-roof home (`paths start with 'm3 12'`). Returns slug `"home"`. Confidence: `"medium"`.
- `_has_polygon_star()` (lines 138–150): detects the draft's `<polygon>` star with `fill` active and `stroke="none"`. Returns slug `"star"`. Confidence: `"medium"`.
- `_is_vehicle_truck()` (lines 153–163): detects old truck (`<rect>` body + 1 `<path>` + 2 `<circle>`). Returns slug `"truck"`. Confidence: `"medium"`.
- Check icon: single-path `M20 6 9 17l-5-5` — will be found in the path-data index if the lucide `check` icon has this exact path. Confidence: `"high"` (exact fingerprint match if in the index).

**`resolve_icon()` function** (`icon_resolver.py:195–258`):
- Stage 1: exact path-data fingerprint (`frozenset` of normalised `d=` values) → `"high"` confidence → returns slug.
- Stage 2: structural heuristics (polygon star, rect truck, old home) → `"medium"` confidence → returns slug.
- Stage 3: raw SVG fallback → `"none"` confidence.

**`convert.py` lines 2291–2323** (icon resolution call site):
```python
_resolved = _resolve_icon(_svg_node)
if _resolved["confidence"] in ("high", "medium"):
    item["icon"] = _resolved["slug"] or ""
else:
    item["icon"] = ""
    if _resolved["raw_svg"]:
        item["iconSvg"] = _resolved["raw_svg"]
```
Both `"high"` and `"medium"` confidence produce a slug assignment.

---

### 6. PIPELINE-LOCATION Refs (location only)

| Location | File:Line | Role |
|----------|-----------|------|
| Icon resolution call in trust-bar handler | `convert.py:2291–2323` | Calls `_resolve_icon()`, assigns `item["icon"]` or `item["iconSvg"]` |
| `resolve_icon()` entry point | `icon_resolver.py:195–258` | Three-stage resolver: path fingerprint → structural heuristic → raw fallback |
| `_is_old_home` heuristic | `icon_resolver.py:166–180` | Detects draft's 2-path peaked-roof home → slug `"home"` |
| `_has_polygon_star` heuristic | `icon_resolver.py:138–150` | Detects draft's `<polygon>` star → slug `"star"` |
| `_is_vehicle_truck` heuristic | `icon_resolver.py:153–163` | Detects draft's `<rect>`+1-path+2-circle truck → slug `"truck"` |
| `_build_index()` path-data fingerprint builder | `icon_resolver.py:91–115` | Builds `frozenset(path-d)` → icon slug reverse index from `lucide-icons.json` |
| Lucide icon library | `plugins/sgs-blocks/includes/lucide-icons.php` | PHP: maps slug → current Lucide SVG markup (used by `sgs_get_lucide_icon()` in render.php) |

---

## Coverage Checklist

| Issue | Status | Notes |
|-------|--------|-------|
| **TB-A** — Content-width / 4-layer layout transfer | **fact-complete** | Draft: no max-width on section, `max-width: 1100px` on `__inner`, 2-col base + 4-col @600px grid, no per-item sizing. Clone: no `contentWidth` emitted, no `sgs-container__inner`, no `max-width: 1100px`. DB: `contentWidth` attr EXISTS on `sgs/trust-bar` (default `""`). Pipeline: `_fold_layout_into_attrs` line 3829–3831 is the contentWidth lift point. |
| **TB-B** — Responsive emission (inline vs @media, breakpoints) | **fact-complete** | Draft: mobile-first (`min-width`), 2 breakpoints (600px columns, 1024px font-size). Clone: desktop-first (`max-width`), grid columns correct in `<style>` block, desktop base column value written inline. `contentWidth`/max-width absent entirely. Gap written inline. |
| **TB-C** — Icon differences (house/check/truck/star) | **fact-complete** | House: draft = old 2-path peaked-roof; clone = current Lucide `home` redesign. Check: draft and clone paths match exactly. Truck: draft = `<rect>`+1-path+2-circle old style; clone = current 3-path+2-circle Lucide `truck`. Star: draft = filled `<polygon>` (`fill: var(--primary-dark)`, `stroke=none`); clone = Lucide `star` outline path (`fill="none"`, `stroke="currentColor"`). Bean notes the truck clone is better than draft; the star is visually a hollow outline vs. draft's flat fill. |
