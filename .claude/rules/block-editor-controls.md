---
paths:
  - "plugins/sgs-blocks/src/blocks/**/edit.js"
  - "plugins/sgs-blocks/src/blocks/**/*.control.js"
  - "plugins/sgs-blocks/src/components/**"
---

# Block editor controls

## Border controls — `SgsBorderControl` is the one shape

`<SgsBorderControl>` (`src/components/SgsBorderControl.js`) is the border control every block
mounts. Never cache a mount count — run `git grep -l "<SgsBorderControl" -- "src/blocks/*/edit.js"`;
grep alone under-counts, since `sgs/media` mounts it only via the shared `box-shape` atom's
composition chain (`box-shape.control.js` → `MediaPanelLayout` → `MediaBoxShapeControls.js`), fed
the atom's own `borderWidthValue`/`borderStyleValue`/`borderColourValue`/`borderRadiusValues` props.
A block declaring no `borderWidth`/`borderStyle`/`borderColour` (radius-private-only, e.g.
`sgs/media`) correctly does not mount it. Blocks still declaring native `__experimentalBorder` are
the unmigrated set (`git grep -l __experimentalBorder -- "src/blocks/*/block.json"`).

Census + ratcheted gate: `scripts/survey-border-control-migration.py` (ceilings live in `CEILING`
in the script). Codemod for the edit.js swap: `scripts/migrate-border-control.js`
(`--survey`/`--fix`/`--check`/`--self-test`). Codemod for the Shape-B storage migration
(radius+width+colour off WP-native, per-block): `scripts/migrate-border-shape-b.js`.

The control is a PAIR: border width (box object) + colour, with border STYLE inside the colour
popover, plus the SGS-wrapped native radius as a second control when the caller wires
`onRadiusChange`.

**`showColour` prop (Spec 41 FR-41-33/FR-41-2b).** `true` (default) renders the colour swatch as
part of the control. Pass `showColour={false}` when border colour should live in `SgsColourPanel`
instead — this omits the swatch entirely (not a disabled picker) and re-parents
`BorderStyleControl` as `SgsBorderControl`'s own sibling. Twelve props become inert under
`showColour={false}`: `colourStates`, `colourValue`, `onColourChange`, `colourGradientValue`,
`onColourGradientChange`, `colourLinked`, `colourLabel`, `clearable`, `enableAlpha`,
`contrastAgainst`, `contrastLabel`, `contrastLargeText` — the contrast trio is the dangerous one,
since a caller can wire a full WCAG contrast check that then silently never runs. `borderStyle` is
NOT on this list; it is re-parented, not dropped. Live example: `src/shared/nav-menu-panels/DropdownStylePanel.js`.

`linked` is load-bearing — never drop it when wiring a colour row. `GradientCapableColourControl`
reads it to decide whether a picked colour is stored as the palette token slug or a baked hex;
without it the client's colour is frozen against every future re-skin.

Per-device border width is Bean-locked OFF — do not build it.

**A width paints solid.** The style picker writes '' when nothing is picked or the active option
is deselected (as WP core's does); a width with '' paints `solid`, an explicit style (dashed,
dotted, `none` …) wins, and no width paints nothing. Resolve the style through
`includes/helpers-border-style.php::sgs_border_style_keyword` / `::sgs_border_box_decls` in PHP and
`src/utils/border-style.js::resolveBorderStyle` / `::borderBoxPreview` in the canvas — never a
hand-rolled `in_array(…) ? $raw : 'none'` or `borderStyle && borderStyle !== 'none'`. Gate:
`scripts/check-border-width-without-style.py` (the inverse of `check-border-style-without-width.py`).

**Border defaults (Bean, 2026-10-05):** a border-style attribute defaults to `solid` (never '' or
`none`), so the panel shows Solid selected; the one exception is a group-default attribute where ''
means "no override" (`multi-button::childBtnBorderStyle`). A border-width attribute defaults to 0
(unset) except on an exceptional type whose border is part of what it is: an outline or ghost button
(`choice-flow::backBorderWidth`, `product-card::ctaBorderWidth`), a form input, a selectable pill or
swatch state, a divider drawn as a border. A stylesheet never gives an element that has a border
control a width the client did not choose.

**The canvas previews the panel through its twin.** Every block that mounts `SgsBorderControl`
previews that element's border with `src/utils/border-preview.js::sgsBorderPreview`, passing the same
values the panel receives (`widthValues`, `styleValue`, `colourValue`, `colourGradientValue`,
`radiusValues`; options `defaultBorder`, `fallbackColour`). Gate:
`scripts/check-border-preview-twin.js`.

**A radius prints only the corners a client set.** render.php prints a tier's corners through
`includes/helpers-box.php::sgs_corner_object_longhands` (one `border-*-radius` per set corner), and the
canvas through `src/utils/radius-preview.js::borderRadiusLonghands`, which `sgsBorderPreview` uses; an
unset corner keeps the stylesheet's radius. `sgs_corner_object_shorthand` (unset corners `0`) has no live caller;
a custom property holding corners prints through `sgs_corner_object_property_list`. Gate: `python plugins/sgs-blocks/scripts/migrate-box-longhands.py --check`
(fails a new zero-filling corner site). Blocks read only their own border attributes, never WordPress's
native `style.border`.

A palette slug fed raw to CSS paints nothing: `sgs_border_states_css()` needs `sgs_colour_value()`
resolution first (it feeds a masked `::before` ring that also sets `border-color:transparent`, so
an unresolved slug paints nothing rather than degrading visibly).

Live check: `node scripts/qa/check-border-roundtrip.js --blocks sgs/x,sgs/y` (positive instance +
a `borderStyle:"none"` negative control, frontend computed styles). It measures the outermost
`.wp-block-sgs-<name>`, so it cannot target `sgs/container` on a page with a header.

## Colour controls — `SgsColourPanel` is the standard

Every fill/text/link colour on a block lives in one `<SgsColourPanel>`
(`src/components/SgsColourPanel.js`) via `rows` built with `fillRow`/`textRow`
(`src/components/colour-variants/`) — never a bespoke colour `PanelBody`, never a raw
`<DesignTokenPicker>`. Verify with `git grep -l "<SgsColourPanel"` / `"<DesignTokenPicker"` — never
cache the count. `sgs/product-card` is the fully-standardised reference.

Only exemptions: border colour, media/overlay colour, shadow colour — each pairs with a
non-colour sibling control `SgsColourPanel` has no slot for.

- A row that doesn't apply is OMITTED, not disabled — `rows.filter(Boolean)`; `SgsColourPanel`
  returns `null` if every row is falsy.
- There is no `borderRow` helper — only `fillRow.js` and `textRow.js` exist. Border colour is
  owned by `SgsBorderControl`.
- Third state `attrs.current`/`attrs.currentGradient` (Spec 41 FR-41-3/FR-41-2) requires
  `attrs.hover` first (both helpers throw otherwise) — Current is never a substitute for Hover.
  Every state entry is a literal array element, never `.map()`-generated, because
  `describeRow()` in `scripts/inspector-scan/core/golden.js` resolves a row's state count
  statically.
- Row `heading` (a label before the row) and `after` (an arbitrary node after the row, e.g. a
  hover-treatment toggle) group and append controls (Spec 41 §9.6/FR-41-23/24). Both omitted when
  absent.
- `contrastLargeText` reaches only the `gradientCapable` branch (FR-41-33) — a plain
  `DesignTokenPicker` row carries no contrast check at all.

## `supports.sgs.colourExemptions`

A manifest escape hatch telling `inspector-scan` rule 31 that a colour row is deliberately short
of the full Normal/Hover/Current family for a real structural reason (e.g. `pointer-events:none`),
never to paper over an unbuilt row. Shape: `{"<element-or-row-key>": {"rule":"states","reason":"…"}}`.
Example: `nav-bar-menu/block.json::supports.sgs.colourExemptions`.

## Editor-canvas mirrors — the shared-wrapper pattern + 4 traps

A shared thing is mirrorable ONCE only if it owns the selector:

| Kind | Example | Owns selector? | Mirror once? |
|---|---|---|---|
| Shared **renderer** | `SGS_Container_Wrapper` | yes — markup + uid class + rule | yes |
| Shared **atom** | `includes/media/atoms/*` | yes — one property on a scoped class | yes |
| Shared **control panel** | `BackgroundPanel`, `GridItemDefaultsPanel` | no — only writes the attr | no |
| Shared **value helper** | `sgs_colour_value`, `sgs_text_decls` | no — caller places the value | no |

A shared control creates the illusion of a shared mechanism: `BackgroundPanel` is mounted by
several blocks, but the sharing that matters is the wrapper underneath, not the panel.
Shared-on-the-way-in is not shared-on-the-way-out.

Reference implementation: `svgBackgroundPreview()` in `src/utils/background-preview.js` — it
renders the SAME element with the SAME class names as the frontend, so `style.css` (loaded into
the canvas by `block.json`'s `style` field) does all the painting, with zero new CSS.

**Four traps, each has shipped or nearly shipped a defect:**

1. Enumerate attributes explicitly at the call site. `check-editor-render-parity.js` CHECK A
   resolves an attribute as canvas-reflected only when its NAME appears outside
   `InspectorControls`/`BlockControls`. Handing a preview helper `attributes` wholesale (e.g.
   `attributes={ omitNullAttributes( attributes ) }`) flags every attribute as desynced even when
   the canvas shows real `render.php` output.
2. A gate's scope is not the defect's scope — read the emitted CSS, never close on green. A
   helper returning a className ARRAY where a sibling returns a STRING silently joins into one
   unusable comma-joined token; the gate can pass throughout.
3. Block CSS is LIFTED, not inline (`wp-content/uploads/sgs-css/*.css`) — grepping page HTML for a
   rule proves nothing. Follow the linked stylesheet.
4. `curl` the canary with `-L` — pages 301-redirect; without it you get an empty body and wrongly
   conclude the block did not render.

Before wiring a canvas mirror, confirm the frontend actually paints it — a control can be offered
while `render.php` nulls its value on the array passed to the wrapper. Check for a back door
(a helper, atom or `render_block` injector) rather than trusting a grep of the block's own files.

## Grid-item defaults — which blocks qualify

`gridItem*` attrs (padding, ground, radius, border, shadow and text colour defaults for a grid's cells) are set as
`--sgs-gi-*` variables on a `sgs/container` grid and consumed by one rule in `src/blocks/container/style.css` that
styles **every direct cell, whatever its block**, directly under the grid or under its `__inner` band (Spec 32
§6.3 FR-32-12). Only `sgs/container` declares them. Another block qualifies only if its own render puts the
variables on the element whose direct children are its grid cells; check its markup, never
`block_composition.container_kind`.

## Separators — `SgsSeparatorControl` is the one control for lines between items

A line between a list's items is the shared Separators setting, never a border on one item: one object
attribute per list (`separators`, `submenuSeparators`), declared under `supports.sgs.separators.<attr>`
(`axes`, `edges`, `hover`, `sweep`), edited with `<SgsSeparatorControl>` (`src/components/`), rendered by
`includes/helpers-separators-css.php::sgs_separators_css` and mirrored in the editor by `src/utils/separators.js`
(grid and flex lists) or `src/utils/separators-line.js` (single rows and columns). `layout: 'line'` is for a single row
or column of items the block owns (the item draws the line, every browser, no script); `layout: 'flow'` is for anything
that wraps, auto-fits, or whose items it does not own (native `column-rule` / `row-rule`, plus the overlay in
`src/shared/separators/` where the browser lacks them). Never select a flow list's items by position. Gate:
`scripts/check-separators-through-helper.py` fails a between-item line drawn outside the helper (ratcheted baseline in
`scripts/check-separators-through-helper-baseline.json`; adopting a block deletes its entry). A composite that mirrors
`sgs/container` (Spec 31 §13.6) declares `separators` and mounts `SeparatorsPanel`; the wrapper reads `separators` for the
block's own grid, so a block's OTHER list takes its own name (`featureSeparators`), and a block whose grid is a child element
(post-grid, gallery) calls the helper itself and hands the wrapper no `separators`. Design and measurements:
`.claude/plans/archive/2026-10-01-separators-plan.md`.

## Box alignment — `LogicalAlignControl` is the one control

A block's horizontal alignment is stored as `start | center | end` (plus `stretch` where the block allows it), never
`left | right`, so a right-to-left site flips with no second setting. Mount `<LogicalAlignControl>`
(`src/components/LogicalAlignControl.js`, `withStretch` for the fourth option) in the inspector, or
`<LogicalAlignToolbar>` for a toolbar. Render with logical margins (`margin-inline-start|end:auto`) or flex
`justify-content`/`align-items`, which already follow the direction. Detector and gate: `scripts/migrate-box-alignment.py`
(`--survey`/`--fix`/`--check`/`--self-test`, registered in `scripts/gates.json`); it covers `icon.iconAlign`,
`media.alignment`, `separator.alignment`, `nav-drawer.drawerAlign` and `tabs.tabAlignment`.
