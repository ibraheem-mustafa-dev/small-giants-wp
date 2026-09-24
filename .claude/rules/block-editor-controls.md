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

`gridItem*` attrs (padding/gap/border/shadow/colour defaults for a grid's children) are consumed
by exactly one CSS rule: `.sgs-container--grid > .sgs-container` in `src/blocks/container/style.css`.
That selector paints only a direct child that itself carries `.sgs-container` — `sgs/container` is
the only qualifying block. A block whose children sit inside its own content wrapper or badge divs
(`sgs/cta-section`, `sgs/trust-bar`) matches none of it; declaring `gridItem*` attrs there ships
controls that paint nothing. `block_composition.container_kind` is irrelevant to this
qualification — check the selector, not the draft-layer model.
