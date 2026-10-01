# Separators: one shared setting for lines between items

**Status (2026-10-01):** designed and approved by Bean; not built. Build in the next framework session.
**Standards:** Spec 35 + 35A (shared inspector primitives, one control per concept, labels), Spec 32 (no inline
`style=""`; CSS through scoped rules), Spec 41 FR-41-37 (the nav bar's item separator, which this replaces).

## Why

Gaps are spacing only. A line between items is its own feature, with its own style, thickness, colour and
direction, drawn centred in the gap. Today about 20 places draw separators five different ways (inventory below),
and `sgs/container` has a stop-gap `gapColour` (a gap that paints, as thick as the gap) added on 2026-10-01 to fix
the Eye Care home "Why buy" grid. Separators replaces `gapColour` completely.

## The model

- **One attribute object per block, `separators`**, the same shape everywhere:
  `{ row: { style, width: {desktop,tablet,mobile}, colour, colourHover }, column: { …same }, edges: 'between' | 'all' }`.
  `row` is the line between rows (horizontal line), `column` the line between columns (vertical line). Empty
  `width` on an axis = no line on that axis. Style defaults to `solid`; width defaults to empty (0) unless a block's
  design says otherwise.
- **One shared editor control, `SgsSeparatorControl`** (`src/components/`), shaped like `SgsBoxControl`: the two
  axes are LINKED by default (one style, per-device thickness and colour drives both); an unlink toggle splits
  them into "Between rows" and "Between columns". A block whose items only ever run one way (nav bar = columns
  only, drawer = rows only) shows just that axis via `supports.sgs.separators.axes`. Colour rows go through the
  shared `fillRow` in the block's `SgsColourPanel`; thickness through `ResponsiveLengthControl`.
- **One shared render helper** (`includes/helpers-separators.php`) and its editor twin (`src/utils/separators.js`).

## How the line is drawn (works in every browser)

1. **Items draw it** (primary, all browsers; the nav bar's proven method, `includes/nav-menu-item-border-featured-css.php::sgs_nav_shared_item_border_css`):
   a pseudo-element on each item except the first in its run, offset half a gap outward, so the line sits centred
   in the gap at any thickness. Covers single rows, single columns, and grids with an explicit column count per
   device (row starts known from `nth-child` per tier).
2. **Gap decorations** (`column-rule` / `row-rule`, Chrome/Edge 149+) for auto-fit grids, where no item knows
   where its row starts. Without support those grids show spacing only. Reuse the per-tier width emission proven
   in `includes/helpers-gap-rule.php::sgs_gap_rule_props` before deleting that file.
3. `edges: 'all'` adds the outer lines (first/last), matching icon-list's `dividerEdges`.
4. Nav extras stay opt-in fields read by the same helper: hover colour, `itemSeparatorHoverTreatment` (swap /
   sweep) and `itemSeparatorSweepAngle` (carried as `hoverTreatment` / `sweepAngle` inside the `separators` object) (`includes/sweep-css.php::sgs_directional_sweep_css`).

## Build steps

1. Shared helper + editor control + utils twin, with a standalone PHP test (negative control) and a gate that
   fails any block drawing a between-items line outside the helper.
2. Adopt on the five blocks that have separators today:
   - `sgs/container` (grid and flex): add `separators`; **remove `gapColour`**, `includes/helpers-gap-rule.php`,
     `src/components/GapColour.js` (and its `index.js` export), `tests/php/run-gap-rule-standalone.php`, the
     container manifest's `css:column-rule-color` entry; move the five Eye Care trees (`sites/eye-care-ward-end/build/`
     home, about, help, lenses, single-product) from `gapColour` to `separators` and rebuild them.
   - `sgs/nav-bar-menu` (columns axis) and `sgs/nav-drawer-menu` (rows axis) share ONE mechanism: the drawer list
     becomes a vertical flex column with a gap so its rows separate exactly like the bar's items; `itemSeparator*`
     (FR-41-37) and the drawer's `itemSeparatorPosition` migrate into `separators` (update Spec 41).
   - `sgs/icon-list` (`dividers`, `dividerColour`, `dividerEdges`) and `sgs/brand-strip` (`brandTextSeparator*`).
3. Offer it on the other gap layouts where a line between items is a real design need (decide per block in the
   build): card-grid, feature-grid, post-grid, gallery, team/pricing columns, site-header-row / site-footer-row,
   multi-button. Lists that draw their own borders today and could move once laid out with a gap: accordion,
   pricing-table features, business-info hours, cart items.
4. Out of scope (they draw something gap lines and item lines cannot): timeline rail, process-steps connectors,
   `sgs/separator` block, buybox hairline, text-glyph separators (breadcrumbs, language-switch, local-time),
   mega-panel aside edge, google-reviews header rule.
5. Reseed (`/sgs-update`), deploy both test sites, verify at 375/768/1440 in the editor canvas and on the page,
   in Chromium AND WebKit (Playwright `webkit`) so the item-drawn path is proven where gap decorations are absent.

## Inventory (2026-10-01, read-only sweep)

| Mechanism | Count | Where |
|---|---|---|
| Border on each item | 9 | icon-list, accordion, pricing-table features, business-info hours, cart items, brand-strip, nav-drawer "below", mega-panel aside, mega-panel drawer links |
| Pseudo-element line | 4 | nav-bar-menu items, nav-drawer "between", process-steps, timeline |
| `<hr>` / separator block | 2 | `sgs/separator`, buybox stock hairline |
| Text glyph | 4 | breadcrumbs, language-switch, local-time, business-info condensed |
| Gap lines | 1 | container `gapColour` |
