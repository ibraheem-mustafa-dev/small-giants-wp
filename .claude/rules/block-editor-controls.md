---
paths:
  - "plugins/sgs-blocks/src/blocks/**/edit.js"
  - "plugins/sgs-blocks/src/components/**"
---

# Block editor controls

## Border controls — `SgsBorderControl` is the one shape

`<SgsBorderControl>` (`src/components/SgsBorderControl.js`) is the one border control every block mounts. Do not cache a mount count (it goes stale): `git grep -l "<SgsBorderControl" -- "src/blocks/*/edit.js"` (X, so grep on `edit.js` alone under-counts). Unmigrated blocks still declare native `__experimentalBorder`: `git grep -l __experimentalBorder -- "src/blocks/*/block.json"`. Census and ratcheted gate: `scripts/survey-border-control-migration.py`; codemods: `scripts/migrate-border-control.js` (edit.js swap) and `scripts/migrate-border-shape-b.js` (storage).

The control is a PAIR: border width (box object) + colour, with border STYLE inside the colour popover, plus the SGS-wrapped native radius as a second control when the caller wires `onRadiusChange`.

**`showColour` prop (Spec 36 FR-41-33/FR-41-2b).** `true` (default) renders the colour swatch. `showColour={false}` omits it (not a disabled picker) and re-parents `BorderStyleControl` as `SgsBorderControl`'s sibling, for when border colour lives in `SgsColourPanel`. Every colour-side prop (`colour*`, `clearable`, `enableAlpha`, `contrast*`) then becomes inert, and a wired WCAG contrast check silently never runs; `borderStyle` stays live. Example: `src/shared/nav-menu-panels/DropdownStylePanel.js`.

`linked` is load-bearing; keep it when wiring a colour row. `GradientCapableColourControl` reads it to decide whether a picked colour is stored as the palette token slug or a baked hex; without it the client's colour is frozen against every future re-skin.

Per-device border width is Bean-locked OFF (a decision, not a missing feature): do not build it.

**A width paints solid.** The style picker writes '' when nothing is picked or the active option is deselected (as WP core's does); a width with '' paints `solid`, an explicit style (dashed, dotted, `none` …) wins, and no width paints nothing. Resolve the style through `includes/helpers-border-style.php::sgs_border_style_keyword` / `::sgs_border_box_decls` in PHP and `src/utils/border-style.js::resolveBorderStyle` / `::borderBoxPreview` in the canvas — never a hand-rolled `in_array(…) ? $raw : 'none'` or `borderStyle && borderStyle !== 'none'`, which disagree with the solid default on one surface. Gate: `scripts/check-border-width-without-style.py` (the inverse of `check-border-style-without-width.py`).

**Border defaults (Bean):** a border-style attribute defaults to `solid` (never '' or `none`), so the panel shows Solid selected; the one exception is a group-default attribute where '' means "no override" (`multi-button::childBtnBorderStyle`). A border-width attribute defaults to 0 (unset) except on an exceptional type whose border is part of what it is: an outline or ghost button (`choice-flow::backBorderWidth`, `product-card::ctaBorderWidth`), a form input, a selectable pill or swatch state, a divider drawn as a border. A stylesheet never gives an element that has a border control a width the client did not choose.

**The canvas previews the panel through its twin.** Every block that mounts `SgsBorderControl` previews that element's border with `src/utils/border-preview.js::sgsBorderPreview`, passing the same values the panel receives (`widthValues`, `styleValue`, `colourValue`, `colourGradientValue`, `radiusValues`; options `defaultBorder`, `fallbackColour`). Gate: `scripts/check-border-preview-twin.js`.

**A radius prints only the corners a client set.** render.php prints a tier's corners through `includes/helpers-box.php::sgs_corner_object_longhands` (one `border-*-radius` per set corner), and the canvas through `src/utils/radius-preview.js::borderRadiusLonghands`, which `sgsBorderPreview` uses; an unset corner keeps the stylesheet's radius. `sgs_corner_object_shorthand` (unset corners `0`) has no live caller; a custom property holding corners prints through `sgs_corner_object_property_list`. Gate: `python plugins/sgs-blocks/scripts/migrate-box-longhands.py --check` (fails a new zero-filling corner site). Blocks read only their own border attributes, never WordPress's native `style.border`.

A palette slug fed raw to CSS paints nothing: `sgs_border_states_css()` needs `sgs_colour_value()` resolution first (it feeds a masked `::before` ring that also sets `border-color:transparent`, so an unresolved slug paints nothing rather than degrading visibly).

Live check: `node scripts/qa/check-border-roundtrip.js --blocks sgs/x,sgs/y` (positive instance + a `borderStyle:"none"` negative control, frontend computed styles). It measures the outermost `.wp-block-sgs-<name>`, so it cannot target `sgs/container` on a page with a header.

## Colour controls — `SgsColourPanel` is the standard

Every fill/text/link colour on a block lives in one `<SgsColourPanel>` (`src/components/SgsColourPanel.js`) via `rows` built with `fillRow`/`textRow` (`src/components/colour-variants/`) — never a bespoke colour `PanelBody` or a raw `<DesignTokenPicker>`, which skip the shared states, contrast and gradient handling (gate: inspector-scan rule 24). Verify with `git grep -l "<SgsColourPanel"` / `"<DesignTokenPicker"`; counts go stale, so do not cache one. `sgs/product-card` is the fully-standardised reference.

Only exemptions: border colour, media/overlay colour, shadow colour — each pairs with a non-colour sibling control `SgsColourPanel` has no slot for.

Every colour control, exempt or not, is the thin swatch row whose palette pops out; an inline palette in the sidebar, a panel, a fine-tune panel or a repeater item is never rendered. `DesignTokenPicker` has one shape (`SgsColourStateControl`): without `states` it builds one state from `value`/`onChange`/`linked` (`tests/js/design-token-picker-shape.test.js`). A gradient goes in a `gradientCapable` row's Solid/Gradient popover, never an inline `SgsGradientPicker`. Gate: inspector-scan rule `24-raw-canonical-component` walks every file under `src/` and fails a raw palette, picker or gradient import (aliases included), an SGS colour-picker fork used outside the helpers' internals, or `<input type="color">`.

- A row that doesn't apply is OMITTED, not disabled — `rows.filter(Boolean)`; `SgsColourPanel` returns `null` if every row is falsy.
- Mount `SgsColourPanel` at the top of `edit()` (or inside a Styles-group fill), never inside a Settings-tab `<InspectorControls>`, at any depth: the editor mounts only the active tab's slots, so a Styles fill nested in a Settings fill renders on neither tab. A component on a Settings panel that owns colours exports a rows builder (`nav-drawer/chrome-colour-rows.js`, `mega-panel/section-colour-rows.js`, `choice-flow/colour-rows.js`, `buybox/GuidedPanel.js::guidedColourRows`) and `edit.js` spreads it into the block's one panel. Gate: inspector-scan rule `46-inspector-fill-crosses-tab` (any fill nested in a fill on another tab).
- There is no `borderRow` helper — only `fillRow.js` and `textRow.js` exist. Border colour is owned by `SgsBorderControl`.
- Third state `attrs.current`/`attrs.currentGradient` (Spec 36 FR-41-3/FR-41-2) requires `attrs.hover` first (both helpers throw otherwise) — Current is never a substitute for Hover. Every state entry is a literal array element, never `.map()`-generated, because `describeRow()` in `scripts/inspector-scan/core/golden.js` resolves a row's state count statically.
- Row `heading` (a label before the row) and `after` (an arbitrary node after the row, e.g. a hover-treatment toggle) group and append controls (Spec 36 §14.9.6/FR-41-23/24). Both omitted when absent.
- `contrastLargeText` reaches only the `gradientCapable` branch (FR-41-33) — a plain `DesignTokenPicker` row carries no contrast check at all.

## `supports.sgs.colourExemptions`

A manifest escape hatch telling `inspector-scan` rule 31 that a colour row is deliberately short of the full Normal/Hover/Current family for a real structural reason (e.g. `pointer-events:none`), never to paper over an unbuilt row. Shape: `{"<element-or-row-key>": {"rule":"states","reason":"…"}}`. Example: `nav-bar-menu/block.json::supports.sgs.colourExemptions`.

## Editor-canvas mirrors — the shared-wrapper pattern + 3 traps

A shared thing is mirrorable ONCE only if it owns the selector:

| Kind | Example | Owns selector? | Mirror once? |
| --- | --- | --- | --- |
| Shared **renderer** | `SGS_Container_Wrapper` | yes — markup + uid class + rule | yes |
| Shared **atom** | `includes/media/atoms/*` | yes — one property on a scoped class | yes |
| Shared **control panel** | `BackgroundPanel`, `GridItemDefaultsPanel` | no — only writes the attr | no |
| Shared **value helper** | `sgs_colour_value`, `sgs_text_decls` | no — caller places the value | no |

A shared control creates the illusion of a shared mechanism: `BackgroundPanel` is mounted by several blocks, but the sharing that matters is the wrapper underneath, not the panel. Shared-on-the-way-in is not shared-on-the-way-out.

Reference implementation: `svgBackgroundPreview()` in `src/utils/background-preview.js` — it renders the SAME element with the SAME class names as the frontend, so `style.css` (loaded into the canvas by `block.json`'s `style` field) does all the painting, with zero new CSS.

**Three traps, each has shipped or nearly shipped a defect:**

1. Enumerate attributes explicitly at the call site. `check-editor-render-parity.js` CHECK A resolves an attribute as canvas-reflected only when its NAME appears outside `InspectorControls`/`BlockControls`. Handing a preview helper `attributes` wholesale (e.g. `attributes={ omitNullAttributes( attributes ) }`) flags every attribute as desynced even when the canvas shows real `render.php` output.
2. A gate's scope is not the defect's scope — read the emitted CSS, never close on green. A helper returning a className ARRAY where a sibling returns a STRING silently joins into one unusable comma-joined token; the gate can pass throughout.
3. Block CSS is lifted to `wp-content/uploads/sgs-css/*.css`, so grepping page HTML for a rule proves nothing: follow the linked stylesheet.

Before wiring a canvas mirror, confirm the frontend actually paints it — a control can be offered while `render.php` nulls its value on the array passed to the wrapper. Check for a back door (a helper, atom or `render_block` injector) rather than trusting a grep of the block's own files.

## Grid-item defaults — which blocks qualify

`gridItem*` attrs (padding, ground, radius, border, shadow and text colour defaults for a grid's cells) are set as `--sgs-gi-*` variables on a `sgs/container` grid and consumed by one rule in `src/blocks/container/style.css` that styles **every direct cell, whatever its block**, directly under the grid or under its `__inner` band (Spec 32 §6.3 FR-32-12). Only `sgs/container` declares them. Another block qualifies only if its own render puts the variables on the element whose direct children are its grid cells; check its markup, never `block_composition.container_kind`.

## Separators — `SgsSeparatorControl` is the one control for lines between items

A line between a list's items is the shared Separators setting, never a border on one item: one object attribute per list (`separators`, `submenuSeparators`), declared under `supports.sgs.separators.<attr>` (`axes`, `edges`, `hover`, `sweep`), edited with `<SgsSeparatorControl>` (`src/components/`), rendered by `includes/helpers-separators-css.php::sgs_separators_css` and mirrored in the editor by `src/utils/separators.js` (grid and flex lists) or `src/utils/separators-line.js` (single rows and columns). `layout: 'line'` is for a single row or column of items the block owns (the item draws the line, every browser, no script); `layout: 'flow'` is for anything that wraps, auto-fits, or whose items it does not own (native `column-rule` / `row-rule`, plus the overlay in `src/shared/separators/` where the browser lacks them). Never select a flow list's items by position (wrapping and auto-fit change which item sits where). Gate: `scripts/check-separators-through-helper.py` fails a between-item line drawn outside the helper (ratcheted baseline `scripts/check-separators-through-helper-baseline.json`; adopting a block deletes its entry). A composite mirroring `sgs/container` (Spec 02 "Composite wrapper rule") declares `separators` and mounts `SeparatorsPanel`; a block's OTHER list takes its own name (`featureSeparators`), and a block whose grid is a child element (post-grid, gallery) calls the helper itself and passes the wrapper no `separators`.

## Box alignment — `LogicalAlignControl` is the one control

A block's horizontal alignment is stored as `start | center | end` (plus `stretch` where the block allows it), never `left | right`, so a right-to-left site flips with no second setting. Mount `<LogicalAlignControl>` (`src/components/LogicalAlignControl.js`, `withStretch` for the fourth option) in the inspector, or `<LogicalAlignToolbar>` for a toolbar. Render with logical margins (`margin-inline-start|end:auto`) or flex `justify-content`/`align-items`, which already follow the direction. Detector and gate: `scripts/migrate-box-alignment.py` (`--survey`/`--fix`/`--check`/`--self-test`, registered in `scripts/gates.json`), which enumerates the covered attributes.

## Spacing — `SgsBoxControl` is the one padding/margin control

Every block's padding and margin (and any other four-side or four-corner box) mounts `<SgsBoxControl>` (`src/components/SgsBoxControl.js`), inside `<ResponsiveOverride>` for a per-device value, never core's `BoxControl` directly, which lacks SGS presets, inheritance and declared defaults (inspector-scan rule `30-raw-box-control`). Its contract, matching core's spacing control:

- **Header line:** the label and core's small link button sit on one line; linked shows one row, unlinked one row per side or corner, each with its icon from `@wordpress/icons`.
- **Paired Vertical / Horizontal mode (opt-in):** a block declares `block.json::supports.sgs.spacingAxes: { "<attr>": true }` and the mount passes `splitOnAxis={ spacingAxesFor( name, '<attr>' ) }` (`src/utils/spacing-axes.js`). Linked then shows a Vertical row (writes top and bottom) and a Horizontal row (left and right) with no all-sides row; unlinked shows each side. A radius (corners) never pairs, and without the prop the control never shows Vertical or Horizontal. Behaviour contract (open-linked rule, re-link collapse, `Custom…` carry-over): `src/components/SgsBoxControl.js` and `tests/js/sgs-box-control.test.js`.
- **Preset select + value box:** with `presets`, each row is a select listing the theme spacing presets by NAME only (no measurements, no slider) plus `Custom…`, and a 104px value box (`SgsBoxControl.js::VALUE_BOX_STYLE`) showing the picked preset's size. Picking a preset stores `var(--wp--preset--spacing--<slug>)`; typing in the box stores a length and flips the select to Custom. Choosing `Custom…` from Default stays on Custom until a value is typed (per-row state, `customRows`).
- **Untouched sides:** show the value inherited from a wider device tier as the placeholder (`inherited`, or the surrounding `ResponsiveOverride`); the stored attribute stays empty. A side no wider tier sets shows the block's declared default the same way ("Default (M)", "Default (20px)"). Declare defaults under `block.json::supports.sgs.spacingDefaults` and mount with `defaults={ spacingDefaultsFor( name, '<attr>', { attributes, tier } ) }`, passing the tier from the `ResponsiveOverride` (or `usePreviewTier()`); google-reviews' `TierBox` takes `blockName` for this. The declaration shape (base, `tablet`/`mobile` overrides, `when` variant entries, preset-versus-literal rule) is documented in the `src/utils/spacing-defaults.js` docblock. Never store the default in the attribute default: the stylesheet already paints it, and a stored copy would freeze it. Gate: `scripts/survey-spacing-defaults.py --check --strict` (every repaint covered by an entry that equals what its rule paints; a `when` naming an attribute, enum value or class the block lacks fails).
- **Gaps and single lengths:** a gap, row gap, width, height, radius or other single length mounts `<SgsLengthControl>` (`ResponsiveLengthControl` per device), never a `RangeControl` or `UnitControl`, which have no preset scale. `scale="spacing"` (default) is core's spacing-sizes row (names-only preset select, value box, slider; a preset stores its slug such as `"20"`, a typed value a length such as `"12px"`; read through `sgs_css_length_value()`, previewed with `gapVar()`). `scale="font-size"` is core's `FontSizePicker` for glyph, icon, dot, caret, number and star sizes (a preset stores `var(--wp--preset--font-size--{slug})`). The scale follows the role the attribute drives: `python scripts/survey-length-control-scale.py --check` fails a mount that disagrees. Inside a `ResponsiveControl` that already shows the label, pass `hideLabelFromVision` (inspector-scan rule 29). A gap that can differ by axis (container, multi-button, header and footer rows) mounts `<SgsGapControl>` instead: the same link button as the box control, one row linked, a Row gap and a Column gap unlinked, stored as `"row column"`. Detector: `scripts/check-raw-spacing-controls.py --check`.
- **Inspector spacing:** separate SGS controls stack 16px apart (`assets/css/inspector-controls.css`), because SGS controls pass `__nextHasNoMarginBottom` and a plain `PanelBody` adds no gap. Test: `tests/js/sgs-box-control.test.js`.

## Authored text — `SgsFreeTextField type="rich"`

A setting whose words the author types and the page prints mounts `<SgsFreeTextField type="rich" />` (`src/components/SgsFreeTextField.js`), never a raw `TextControl` or `TextareaControl`: bold, italic, strikethrough, link and line break. Pass `noLink` where the text prints inside a link, button or summary, and `multiline` for a paragraph. The canvas preview renders the value through `src/components/AuthoredText.js`, so the formats show while editing. The PHP print uses `sgs_rich_text_kses()` and an attribute or JS string uses `sgs_authored_text_plain()` (Spec 02 §11). A setting that cannot hold markup is listed with a cited proof in `scripts/data/authored-text-rich.json::unconvertible`; gate: `python scripts/check-authored-text-rich.py --check`.

## Typography text-align tiers and the device toggle

A `{prefix}TextAlign` (and the bare `textAlign`) is a `{desktop, tablet, mobile}` object. The caller of `sgs_typography_css_rule()` passes `sgs_object_attr_keys( $block )` (or the block name from a helper function) as the helper's seventh argument, so the schema, never the stored value's shape, decides which keys print per breakpoint. The control is the same `TypographyControls` row (`TextAlignTierControl`), and `find-scalar-tier-attrs.py --check` keeps saved content in the object shape. The device tier is chosen once, in the global `<ResponsiveControl>` toggle (`src/blocks/extensions/responsive-device-toggle.js`); never add a per-control switcher (inspector-scan rule 25), because two switchers disagree about which tier is being edited.
