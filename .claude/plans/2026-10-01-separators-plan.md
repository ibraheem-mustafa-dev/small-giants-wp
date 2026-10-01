# Separators: one shared setting for lines between items

**Status (2026-10-01):** designed, council-verified (grid-line mechanism measured in Chromium, Firefox, WebKit and Chrome 154); build in progress.
**Standards:** Spec 35 + 35A (shared inspector primitives, one control per concept, labels), Spec 32 (no inline
`style=""`; CSS through scoped rules), Spec 41 FR-41-37 (the nav bar's item separator, which this replaces).

## Why

Gaps are spacing only. A line between items is its own feature, with its own style, thickness, colour and
direction, drawn centred in the gap. Today about 20 places draw separators five different ways (inventory below),
and `sgs/container` has a stop-gap `gapColour` (a gap that paints, as thick as the gap) added on 2026-10-01 to fix
the Eye Care home "Why buy" grid. Separators replaces `gapColour` completely.

## The model

- **One attribute object per LIST, `separators` shape.** A block with one list has `separators`; a block with two
  lists (nav bar: top-level items and dropdown rows; drawer: top-level rows and sub-item rows) has one object per
  list, named for the list (`separators`, `submenuSeparators`). Shape:
  `{ row: { style, width: {desktop,tablet,mobile}, colour, colourHover }, column: { …same }, edges: 'between' | 'all',
  hoverTreatment: 'swap' | 'sweep' | 'none', sweepAngle }`. `row` is the line between rows (horizontal line),
  `column` the line between columns (vertical line). Empty `width` on an axis = no line on that axis. `edges`,
  `hoverTreatment` and `sweepAngle` appear only where the opt-in enables them.
- **Opt-in: `supports.sgs.separators`**, keyed by attribute name:
  `{ "<attr>": { "axes": ["row","column"], "edges": bool, "hover": bool, "sweep": bool } }`. The editor control,
  the gate and the colour census read it. Which drawing path a list uses is decided by the block's render call
  (below), not by the manifest.
- **One shared editor control, `SgsSeparatorControl`** (`src/components/`), the same visual language as
  `SgsBorderControl`: per axis, a per-device thickness (`ResponsiveLengthControl`) beside ONE colour swatch whose
  popover holds the Normal/Hover tabs and the line-style picker (`DesignTokenPicker` states + `borderStyle`). Colour
  lives inside the composite, like a border colour (the `SgsColourPanel` exemption), because it pairs with
  thickness and style. The two axes are LINKED by default (editor-only state, like `SgsBoxControl`, derived from
  equal values on mount) and an unlink toggle splits "Between rows" / "Between columns".
- **One shared render helper** (`includes/helpers-separators*.php`) and its editor twin (`src/utils/separators.js`).

## How the line is drawn (council verdict, 2026-10-01, measured)

Three drawing paths behind one helper; the block's render call names the list's layout and the helper picks:

1. **Item-drawn CSS** (all browsers, no JS) for a list whose row starts are known: a single row, a single column,
   or a grid with an exact column count per device (the nav bar's proven method, a pseudo-element on every item
   except the first in its run, offset half a gap outward). Used by the nav bar items, drawer rows, dropdown rows,
   icon-list, and the drawer's `listColumns` grid.
2. **Native gap decorations** (`column-rule` / `row-rule` with `rule-visibility-items: between`, Chrome/Edge 149+)
   for wrapping or auto-fit layouts: `sgs/container` grids and wrapping flex, brand-strip. Measured in Chrome 154:
   lines land in the gap centres, shadows stay intact, and `between` stops the line dangling beside an empty last-row
   cell.
3. **Row-start tagging fallback** for those same layouts in browsers without gap decorations (Safari, Firefox):
   a tiny view module, loaded only when such a list carries separators, exits at once where `CSS.supports(
   'row-rule-style','solid')` is true, and otherwise tags each item `data-sgs-sep-start` / `data-sgs-sep-first-row`
   (ResizeObserver, no layout change) so the same item-drawn CSS applies. No JS = spacing only. Measured in
   Chromium, Firefox and WebKit: identical line positions, shadows intact.

Rejected by measurement or code trace: item-drawn `nth-child` on `sgs/container` (its grids are always "up to N
columns" via `supports.sgs.intrinsicColumns`, so the real count is unknown to CSS); a clipping wrapper with
overshoot lines (clips item shadows, hover scale and entrance motion in every engine, and `overflow-clip-margin` is
absent in WebKit); the gap-wide background fallback (ties thickness to the gap, against the ruling that gaps are
spacing only).

`edges: 'all'` draws the outer lines only on single-line lists (icon-list); wrapping and grid layouts draw between
items only. Nav extras: hover colour, `hoverTreatment` (swap / sweep) and `sweepAngle` ride the same object
(`includes/sweep-css.php::sgs_directional_sweep_css`).

## Build steps

1. Shared helper + editor control + utils twin + the row-start module, with a standalone PHP test (negative
   control) and a gate that fails any block drawing a between-items line outside the helper.
2. Adopt (each list gets its own `separators`-shaped attribute):
   - `sgs/container` (grid, flex, stack): `separators`, native decorations + row-start fallback; **remove
     `gapColour`**, `includes/helpers-gap-rule.php`, `src/components/GapColour.js` (and its `index.js` export),
     `tests/php/run-gap-rule-standalone.php`, the container manifest's `css:column-rule-color` entry; move the five
     Eye Care trees (`sites/eye-care-ward-end/build/` home, about, help, lenses, single-product) from `gapColour`
     to `separators` and rebuild them.
   - `sgs/nav-bar-menu`: `separators` (top-level items, columns axis, item-drawn) and `submenuSeparators` (dropdown
     rows, rows axis, replacing `submenuLinkBorder*`). `sgs/nav-drawer-menu`: `separators` (top-level rows; a grid
     with exact `listColumns` counts when columns are on) and `submenuSeparators` (sub-item rows). `itemSeparator*`
     and the drawer's `itemSeparatorPosition` migrate in; rewrite Spec 41 FR-41-37 and FR-41-36.
   - `sgs/icon-list` (`dividers`, `dividerColour`, `dividerEdges`; rows only, edges supported) and
     `sgs/brand-strip` (`brandTextSeparator*`; wraps and has a marquee mode, so decorations + fallback in static
     mode and no lines in marquee mode).
3. Decide per block on the other gap layouts (see the inventory): accordion, pricing-table features,
   business-info hours, cart items (stacked lists with their own borders), card-grid, feature-grid, post-grid
   (grid layout only), gallery (grid only), multi-button, site-header-row / site-footer-row.
4. Out of scope (they draw something gap lines and item lines cannot): timeline rail, process-steps connectors,
   `sgs/separator` block, buybox hairline, text-glyph separators (breadcrumbs, language-switch, local-time,
   business-info inline dot), mega-panel aside edge and `drawerLinkDivider`, google-reviews header rule,
   carousel/masonry/marquee layouts.
5. Reseed (`/sgs-update`), deploy both test sites, verify at 375/768/1440 in the editor canvas and on the page,
   in Chromium AND WebKit (Playwright `webkit`, plus system Chrome via `channel:'chrome'` for native decorations:
   Playwright's bundled Chromium can be older than 149) so every path is proven.

## Inventory (2026-10-01, read from the code)

| List | Item selector | Directions | Count known to CSS | Current line |
|---|---|---|---|---|
| nav-bar-menu top-level | `.sgs-nav-bar-menu__bar > .__item` | columns (bar wraps) | n/a, one line | `::before` (`itemSeparator*`) |
| nav-bar-menu dropdown | `.sgs-nav-bar-menu__submenu > .__subitem` | rows | n/a | border on `.__sublink` (`submenuLinkBorder*`) |
| nav-drawer-menu top-level | `.sgs-nav-drawer-menu__bar > .__item` | rows, or a grid via `listColumns` | exact (`listColumns` tiers) | `::before` / `below` border (`itemSeparator*`) |
| nav-drawer-menu sub-items | `.__submenu > .__subitem` | rows | n/a | border on `.__sublink` |
| icon-list | `.sgs-icon-list > .__item` | rows only | n/a | `item + item` border (`dividers`) |
| brand-strip | `.sgs-brand-strip__set` (items, or `__tile` when names show) | columns, wraps; marquee mode | no (wrap) | `border-right` (`brandTextSeparator*`, text items only) |
| container | `.UID > .sgs-container__inner > *` (or the root) | grid, flex row/column, stack | no (`intrinsicColumns`) | `gapColour` |
| accordion | `.sgs-accordion > .__item` | column (wrapper layouts reachable) | n/a | hardcoded border, per style |
| pricing-table features | `__features > li` | rows | n/a | hardcoded border |
| business-info hours | `.sgs-business-hours > .__row` | rows (inline mode wraps) | n/a | hardcoded border; inline dot glyph |
| cart items | `.sgs-cart__panel-items > .__item` | rows | n/a | `itemDividerColour` border, also under the last item |
| card-grid, feature-grid, post-grid (grid), gallery (grid) | the grid's items | grid | `columns` tiers (post-grid: auto-fit) | none |
| multi-button | `.sgs-multi-button > *` | row or column per tier | n/a | none |
| site-header-row / site-footer-row | root or `.sgs-container__inner > *` | flex / grid (footer: intrinsic) | footer no | none |
