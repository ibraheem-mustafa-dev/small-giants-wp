# Content Blocks Batch 2 — Counter, Trust Bar, Icon List

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build 3 content blocks (Counter, Trust Bar, Icon List) following the established SGS block pattern with full per-element customisation.

**Architecture:** Static save.js blocks with `viewScriptModule` for Counter and Trust Bar animations (IntersectionObserver count-up). Icon List is CSS-only. All follow the block customisation standard: native supports, Block Selectors API, custom attributes + DesignTokenPicker, CSS `:not([style*="color"])` fallbacks.

**Tech Stack:** @wordpress/scripts, @wordpress/block-editor, @wordpress/components, vanilla JS (viewScriptModule), CSS custom properties from theme.json.

---

## Task 1: Counter Block — block.json + index.js

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/counter/block.json`
- Create: `plugins/sgs-blocks/src/blocks/counter/index.js`

### block.json

- Category: `sgs-content`
- Static block with `viewScriptModule: "file:./view.js"` for animation
- Block Selectors API: `typography` targets `.sgs-counter__number`
- Native supports: colour, typography, spacing, border (standard set)
- Custom attributes:
  - `number` (integer, default 0) — target number
  - `prefix` (string) — e.g. "£"
  - `suffix` (string) — e.g. "+", "M", "%"
  - `label` (string, source:html, selector `.sgs-counter__label`) — RichText
  - `duration` (number, default 2000) — animation ms
  - `separator` (boolean, default true) — thousand separator
  - `numberColour` (string) — design token for number colour
  - `labelColour` (string) — design token for label colour
  - `labelFontSize` (string) — font size preset for label

### index.js

Standard registration: `registerBlockType(metadata.name, { edit: Edit, save: Save })`

---

## Task 2: Counter Block — edit.js

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/counter/edit.js`

### Inspector Panels

1. **Counter Settings** — NumberControl for target number, TextControl for prefix/suffix, RangeControl for duration (500-5000ms step 100), ToggleControl for separator
2. **Text Styling** (initialOpen: false) — DesignTokenPicker for numberColour, DesignTokenPicker for labelColour, SelectControl for labelFontSize

### Block Content

```
<div class="sgs-counter">
  <span class="sgs-counter__number" style={numberStyle}>
    {prefix}{formattedNumber}{suffix}
  </span>
  <RichText tagName="p" class="sgs-counter__label" style={labelStyle} />
</div>
```

The editor shows the final number (no animation in editor). Format the display number using `Intl.NumberFormat('en-GB')` when separator is true.

---

## Task 3: Counter Block — save.js

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/counter/save.js`

Output data attributes on the number span for the view.js to read:
- `data-target` — the integer target
- `data-duration` — animation duration
- `data-separator` — "true"/"false"
- `data-prefix` — prefix string
- `data-suffix` — suffix string

Text content shows the formatted final number (progressive enhancement — works without JS).

---

## Task 4: Counter Block — view.js (viewScriptModule)

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/counter/view.js`

ES module loaded on the frontend only. Logic:

1. Query all `.sgs-counter` elements
2. Check `prefers-reduced-motion` — if reduced, do nothing (numbers already show final values)
3. Set up IntersectionObserver (threshold 0.15)
4. When element enters viewport:
   a. Read data attributes from `.sgs-counter__number`
   b. Set text to `prefix + "0" + suffix`
   c. Animate with `requestAnimationFrame` using ease-out cubic easing
   d. Format with `toLocaleString('en-GB')` when separator is true
   e. Unobserve after animation completes
5. Fallback: if no IntersectionObserver, do nothing (final numbers shown)

~40 lines of vanilla JS.

---

## Task 5: Counter Block — style.css + editor.css

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/counter/style.css`
- Create: `plugins/sgs-blocks/src/blocks/counter/editor.css`

### style.css

- `.sgs-counter` — text-align centre, padding
- `.sgs-counter__number` — large bold font, display block. Fallback: `:not([style*="color"])` → `var(--wp--preset--color--primary)`
- `.sgs-counter__label` — smaller muted text. Fallback: `:not([style*="color"])` → `var(--wp--preset--color--text-muted)`
- Reduced motion: no-op (counter animation is JS-driven, view.js handles this)

### editor.css

- Dashed border (matches info-box pattern)

---

## Task 6: Counter Block — Build + Verify

**Commands:**
```bash
cd plugins/sgs-blocks && npm run build
```

Check: `build/blocks/counter/` directory created with block.json, index.js, view.js, style-index.css.

---

## Task 7: Trust Bar Block — block.json + index.js

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/trust-bar/block.json`
- Create: `plugins/sgs-blocks/src/blocks/trust-bar/index.js`

### block.json

- Category: `sgs-content`
- Supports `align: ["wide", "full"]` (full-width strip)
- `viewScriptModule: "file:./view.js"` for optional counter animation
- Block Selectors API: `typography` targets `.sgs-trust-bar__value`
- Custom attributes:
  - `items` (array, default: 3 starter items) — `{ value, suffix, label, animated }`
  - `animated` (boolean, default true) — global animation toggle
  - `valueColour` (string) — number/value colour
  - `labelColour` (string) — label colour
  - `labelFontSize` (string) — label font size preset

---

## Task 8: Trust Bar Block — edit.js

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/trust-bar/edit.js`

### Inspector Panels

1. **Items** — Repeater following Hero badges pattern. Each item: TextControl for value, TextControl for suffix, TextControl for label, ToggleControl for animated (per-item)
2. **Settings** — ToggleControl for global animated
3. **Text Styling** — DesignTokenPicker for valueColour, DesignTokenPicker for labelColour, SelectControl for labelFontSize

### Block Content

Renders a preview of the trust bar with all items in a flex row:
```
<div class="sgs-trust-bar">
  {items.map(item => (
    <div class="sgs-trust-bar__item">
      <span class="sgs-trust-bar__value">{item.value}{item.suffix}</span>
      <span class="sgs-trust-bar__label">{item.label}</span>
    </div>
  ))}
</div>
```

---

## Task 9: Trust Bar Block — save.js

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/trust-bar/save.js`

Each item's value span gets data attributes when `animated` is true AND the value is numeric:
- `data-target`, `data-suffix`, `data-separator="true"`

Non-numeric values (like "Next-Day") render as plain text with no animation data attributes.

---

## Task 10: Trust Bar Block — view.js + style.css + editor.css

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/trust-bar/view.js`
- Create: `plugins/sgs-blocks/src/blocks/trust-bar/style.css`
- Create: `plugins/sgs-blocks/src/blocks/trust-bar/editor.css`

### view.js

Same IntersectionObserver count-up logic as Counter, but targets `.sgs-trust-bar__value[data-target]` elements. ~40 lines.

### style.css

- `.sgs-trust-bar` — display flex, justify-content space-evenly, flex-wrap wrap, padding, background colour fallback
- `.sgs-trust-bar__item` — text-align centre, flex item
- `.sgs-trust-bar__value` — large bold font. Fallback colour: text-inverse or primary
- `.sgs-trust-bar__label` — smaller text. Fallback colour: text-inverse or text-muted
- Responsive: flex-wrap with min-width per item so they stack 2x2 on mobile
- Background fallback: `:not([style*="background"])` → `var(--wp--preset--color--primary-dark)`
- Reduced motion: handled in view.js

### editor.css

- Dashed border, min-height

---

## Task 11: Trust Bar Block — Build + Verify

```bash
cd plugins/sgs-blocks && npm run build
```

Check: `build/blocks/trust-bar/` directory.

---

## Task 12: Icon List Block — block.json + index.js

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/icon-list/block.json`
- Create: `plugins/sgs-blocks/src/blocks/icon-list/index.js`

### block.json

- Category: `sgs-content`
- Static save, no viewScriptModule (CSS-only)
- Block Selectors API: `typography` targets `.sgs-icon-list__text`
- Custom attributes:
  - `items` (array, default: 3 starter items) — `{ icon, text }`
  - `icon` (string, default "check") — global default icon for all items
  - `iconColour` (string) — token slug
  - `iconSize` (string, default "medium") — small/medium/large
  - `textColour` (string) — token slug
  - `gap` (string, default "20") — spacing preset slug between items

---

## Task 13: Icon List Block — edit.js

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/icon-list/edit.js`

### Inspector Panels

1. **Items** — Repeater. Each item: SelectControl for icon (reuse ICON_OPTIONS from info-box), TextControl for text. Add/remove buttons.
2. **Appearance** — SelectControl for default icon, SelectControl for iconSize, SelectControl for gap
3. **Text Styling** — DesignTokenPicker for iconColour, DesignTokenPicker for textColour

### Block Content

Renders as a `<ul>` with icon + text per item, styled inline with colour tokens.

---

## Task 14: Icon List Block — save.js + style.css + editor.css

**Files:**
- Create: `plugins/sgs-blocks/src/blocks/icon-list/save.js`
- Create: `plugins/sgs-blocks/src/blocks/icon-list/style.css`
- Create: `plugins/sgs-blocks/src/blocks/icon-list/editor.css`

### save.js

Renders `<ul>` with `<li>` items. Each `<li>` has `<span class="sgs-icon-list__icon" data-icon="check">` + `<span class="sgs-icon-list__text">`. Icon rendered via `data-icon` attribute + CSS `::before` content.

### style.css

- `.sgs-icon-list` — list-style none, padding 0
- `.sgs-icon-list__item` — display flex, align-items flex-start, gap
- `.sgs-icon-list__icon` — flex-shrink 0, display inline-flex, align/justify centre, border-radius
- Icon rendering: CSS `::before` with content for common icons (check = checkmark entity, star, arrow-right, etc.)
- `.sgs-icon-list__text` — fallback colour `:not([style*="color"])` → text
- Responsive: gap scales down on mobile
- Reduced motion: n/a (no animations)

### editor.css

- Dashed border

---

## Task 15: Icon List Block — Build + Verify

```bash
cd plugins/sgs-blocks && npm run build
```

---

## Task 16: Final Build + Commit

Build all blocks, verify no errors. Commit with message describing all 3 blocks.

---

## Task 17: Deploy + Flush Cache

```bash
scp -r plugins/sgs-blocks/sgs-blocks.php plugins/sgs-blocks/includes plugins/sgs-blocks/build plugins/sgs-blocks/assets hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp litespeed-purge all"
```

---

## Task 18: Test on Live Site

Run `test-and-explain` agent against palestine-lives.org to verify blocks register and render.
