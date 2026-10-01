# Separators: one shared setting for lines between items

**Status (2026-10-01):** complete and live on the sandybrown canary and the Eye Care test site.
**Standards:** Spec 35 + 35A (shared inspector primitives, one control per concept, labels), Spec 32 (no inline
`style=""`; CSS through scoped rules), Spec 41 FR-41-37 (the nav bar's item separator, which this replaces).

## Why

Gaps are spacing only. A line between items is its own feature, with its own style, thickness, colour and
direction, drawn centred in the gap. Before this work about 20 places drew separators five different ways
(inventory below); `sgs/container`, both nav blocks, `sgs/icon-list` and `sgs/brand-strip` now share one setting, and
`scripts/check-separators-through-helper.py` stops a new block drawing its own.

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

Two layouts behind one helper (`includes/helpers-separators-css.php::sgs_separators_css`); the block's render call names
the list's layout:

1. **`line`: item-drawn CSS** (all browsers, no JS) for a single row or a single column of items the block owns: a
   pseudo-element on every item except the first, offset half a gap plus half the line outward (the nav bar's proven
   method). Used by the nav bar's top-level items, the drawer's rows, both nav blocks' submenu rows, `sgs/icon-list`, and a
   scrolling `sgs/brand-strip` (one line after every brand, so the clones and the seam between sets stay continuous).
2. **`flow`: native gap decorations plus a runtime overlay** for anything that wraps, auto-fits, or whose items the block
   does not own (`sgs/container` grids, flex and stack, a static brand strip, the drawer's multi-column list). Browsers with
   gap decorations (Chrome and Edge 149+) draw `column-rule` / `row-rule` with `rule-visibility-items: between`, which
   stops a line dangling beside an empty last-row cell. Elsewhere (Safari, Firefox) `src/shared/separators/` measures
   the item boxes and paints the same lines as absolutely positioned elements in one overlay child per list
   (`geometry.js` is the pure, tested line maths; `overlay.js` the DOM layer; it exits where decorations exist). No
   JavaScript means spacing only. Measured on a live page in Chromium, Firefox, WebKit and Chrome 154: line positions
   identical to the native result, item shadows intact. In the editor the same overlay runs in non-supporting browsers
   for the container's canvas (`useSeparatorOverlay.js`).

Rejected by measurement or code trace: item-drawn `nth-child` on `sgs/container` (its grids are always "up to N
columns" via `supports.sgs.intrinsicColumns`, so the real count is unknown to CSS, and its children may use their own
pseudo-elements); a clipping wrapper with overshoot lines (clips item shadows, hover scale and entrance motion in every
engine, and `overflow-clip-margin` is absent in WebKit); the gap-wide background fallback (ties thickness to the gap,
against the ruling that gaps are spacing only).

`edges` ('all' above the first and below the last, 'end' below the last) applies to `line` lists only. Nav extras: hover
colour, `hoverTreatment` (swap / sweep) and `sweepAngle` ride the same object
(`includes/sweep-css.php::sgs_directional_sweep_css`). The runtime overlay sets each line's position through the CSS
object model on elements it creates (never in markup), so Spec 32's no-inline-style contract holds.

## Outcome (2026-10-01, closed)

- **Hardcoded row lists adopted:** pricing-table features (`featureSeparators`), business-info hours (`separators`; the
  one-line condensed layout keeps its " · " glyph and shows no control) and the mini-cart's item rows (`separators`
  replaced `itemDividerColour`) draw through the helper, `layout: 'line'`. Verified at 375 / 768 / 1440 in Chromium and
  WebKit on the canary. `sgs/account` keeps its orders-table cell borders: they are `td` borders inside a
  WooCommerce-rendered table (no gap, markup the block does not own), the same case as the accordion; its baseline entry stays.
- **Composites fanned out:** card-grid, feature-grid, multi-button, gallery, post-grid, site-header-row and site-footer-row
  declare `separators` and draw the flow path. The wrapper draws it where its element is the grid; post-grid and gallery
  put the grid on a child (`.sgs-post-grid__inner`, `.sgs-gallery__grid`), so those two call the helper themselves and hand
  the wrapper no `separators`. The shared editor panel is `src/blocks/container/components/SeparatorsPanel.js` (shown only
  for a block that declares `separators` with a grid, flex or stack layout). A block with its OWN list as well as a wrapper
  grid names that list's attribute for the list (`featureSeparators`), because the wrapper reads `separators` as the
  block's own grid. The header and footer rows are checked by their rendered markup (root marker and CSS), not on a live page.
- **Container-sync roster:** the failure was a hand-kept expected roster that had drifted, plus card-grid reading as a
  section (its image-overlay attributes match the section pattern; it now declares `containerKind: "layout"`). Hand-rolled
  blocks (choice-flow, choice-flow-question, notice-banner, notice-message, buybox, process-steps, wishlist-panel,
  nav-drawer-menu) declare `containerMirror: false`. `--write-block-json` now dry-runs; applying it would add 348 attributes
  across 19 blocks (existing drift), so it stays report-only.
- **Deployed:** sandybrown and eye-care-test run the same build (checked by the deploy's own gates; browser checks were on
  sandybrown only).
- **Left open (recorded in `LEDGER.md`):** the composites' editor canvases and the cart panel show spacing only in the
  editor (the lines draw on the page).

## Progress and decisions (2026-10-01)

**Built and verified on the sandybrown canary** (page `[QA] Separators`, 375 / 768 / 1440, native Chrome 154 plus
the overlay in Chromium, Firefox and WebKit): the shared helper, editor control, runtime overlay and gate;
adopted by `sgs/container`, both nav blocks (top-level and submenu rows), `sgs/icon-list`
and `sgs/brand-strip`. The Eye Care trees moved from `gapColour` to `separators`.

**Per-block decisions for the other gap layouts:**

| Block | Decision | Why |
|---|---|---|
| pricing-table features, business-info hours, cart items | adopted (item-drawn rows list, `layout: 'line'`) | each drew a hardcoded or ad-hoc border on every item; the cart's rows are JS-filled but the list is server-rendered, so the helper's PHP rule on the panel's item list reaches them |
| accordion | keep its own borders | three styles (`bordered`, `flush`, `card`) draw boxes and joins that are part of the design, not a line between items |
| card-grid, feature-grid, post-grid (grid layout), gallery (grid layout), multi-button, site-header-row, site-footer-row | adopted: `separators` declared per block, flow path (the wrapper where its element is the grid; the block's own helper call for post-grid and gallery, whose grid is a child) | the wrapper already owns their grid / flex; carousel, masonry and marquee layouts draw none |
| process-steps, timeline, `sgs/separator`, breadcrumbs, mega-panel aside and drawer link divider, google-reviews header | out of scope | they draw connectors, glyphs or edges that gap lines cannot |

**Known limits, accepted:** a wrapping `sgs/nav-bar-menu` draws a stray line at the start of a wrapped line (the
bar collapses to the burger before it wraps in practice); carousel and masonry layouts draw no
lines; with JavaScript off, Safari and Firefox show spacing only on flow lists.

## Inventory: what each list drew before this work (2026-10-01, read from the code)

Every list in the table except the accordion, the account orders table and the blocks decided out now uses `separators`.

| List | Item selector | Directions | Count known to CSS | Current line |
|---|---|---|---|---|
| nav-bar-menu top-level | `.sgs-nav-bar-menu__bar > .__item` | columns (bar wraps) | n/a, one line | `::before` (`itemSeparator*`) |
| nav-bar-menu dropdown | `.sgs-nav-bar-menu__submenu > .__subitem` | rows | n/a | border on `.__sublink` (`submenuLinkBorder*`) |
| nav-drawer-menu top-level | `.sgs-nav-drawer-menu__bar > .__item` | rows, or a grid via `listColumns` | exact (`listColumns` tiers) | `::before` / `below` border (`itemSeparator*`) |
| nav-drawer-menu sub-items | `.__submenu > .__subitem` | rows | n/a | border on `.__sublink` |
| icon-list | `.sgs-icon-list > .__item` | rows only | n/a | `item + item` border (`dividers`) |
| brand-strip | `.sgs-brand-strip__set` (items, or `__tile` when names show) | columns, wraps; marquee mode | no (wrap) | `border-right` (`brandTextSeparator*`, text items only) |
| container | `.UID > .sgs-container__inner > *` (or the root) | grid, flex row/column, stack | no (`intrinsicColumns`) | `separators` |
| accordion | `.sgs-accordion > .__item` | column (wrapper layouts reachable) | n/a | hardcoded border, per style |
| pricing-table features | `__features > li` | rows | n/a | `featureSeparators` |
| business-info hours | `.sgs-business-hours > .__row` | rows (inline mode wraps) | n/a | `separators`; inline dot glyph stays |
| cart items | `.sgs-cart__panel-items > .__item` | rows | n/a | `separators` |
| card-grid, feature-grid, post-grid (grid), gallery (grid) | the grid's items | grid | `columns` tiers (post-grid: auto-fit) | `separators` |
| multi-button | `.sgs-multi-button > *` | row or column per tier | n/a | `separators` |
| site-header-row / site-footer-row | root or `.sgs-container__inner > *` | flex / grid (footer: intrinsic) | footer no | `separators` |
