# Container "Scroll sideways" design (away's 375 two-up tile scroller)

Wave 3C lane A, the last owed item in plan §4's U-6 + U-7 paragraph. Bean chose this route (option a1, 2026-09-25):
reuse the native scroller the GSAP "Horizontal scroll section" effect already falls back to on phones, as a plain
per-device container setting, with no GSAP and no pin.

## Problem

away / drawer / 375 / zone_model: an expanded panel shows "two image callouts side by side (236 x 338.8)" in a 375px
drawer, so the row scrolls sideways. `sgs/container` has no overflow or scroll setting. The only sideways scroller is
the `horizontal-panel` effect (`assets/css/fx-horizontal-panel.css`): below 768px it is a native
`overflow-x:auto; scroll-snap-type:x mandatory` flex row, but at 768px and up it pins the section and scrubs, which is
wrong inside a menu panel, and its item width (`--sgs-fx-panel-width`) has no editor control. Today the
`sgs/mega-links-with-tiles` tiles grid collapses to one column at 375 (its auto-fit 16rem floor).

## Exit cell

| Ref / surface / tier / column | Measured | Expressed by |
|---|---|---|
| away / drawer / 375 / zone_model | two tiles side by side, 236 x 338.8, the row wider than the drawer | tiles container `scrollSideways: {mobile: on}`, `scrollItemWidth: {mobile: 236px}` |

## Design

`sgs/container` gains:
- `scrollSideways`: tier tri-state object (`on`/`off`/inherit), `ResponsiveTriStateControl`, label "Scroll sideways",
  help "Items sit in one row that scrolls sideways and snaps into place."
- `scrollItemWidth`: tier object of CSS lengths (`SgsLengthControl` under `ResponsiveOverride`), label "Item width",
  default 80% when unset. Shown only when scrolling is on somewhere.

Render: `SGS_Container_Wrapper::render()` appends, last in `$responsive_css` (so it wins over the grid rules at equal
specificity), `includes/container-scroll-row-css.php::sgs_container_scroll_row_css( $grid_sel, $attributes,
$container_queries )`. For each tier resolved ON, inside that tier's EXACT range (desktop >= 1024, tablet 768 to
1023, mobile <= 767; also as `@container` when the wrapper uses container queries), so a tier that is off needs no
reset:

    ROW{display:flex;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;
        scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
    ROW>*{flex:0 0 <width>;min-width:0;scroll-snap-align:start}

`ROW` is `$grid_sel` (`.{uid}>.sgs-container__inner`, or `.{uid}` when the wrapper puts the grid on the root), the
element whose direct children are the items; the existing `gap` applies to the flex row unchanged. The tier range
helpers (`sgs_tier_media_queries`, `sgs_tier_exact_media_css`) move from `includes/sgs-header-pass-through.php` to a
shared `includes/helpers-tier-queries.php`.

Accessibility: a native scroll container; keyboard users reach off-screen items by tabbing (the browser scrolls the
focused item into view), and pointer and touch users scroll natively. Static, so reduced motion needs nothing. Every
item carrying a link or button keeps the region keyboard-reachable; a row of purely static items is the operator's
content choice (noted in the help text is not needed; axe's scrollable-region-focusable covers it in the batched pass).

Editor: the canvas preview applies the same row at the previewed tier (`display:flex`, `flex-wrap:nowrap`,
`overflow-x:auto`) through the existing layout-preview style object.

## Tests

`tests/php/run-container-scroll-row-standalone.php`: mobile-only ON emits the rules inside `(max-width:767px)` only;
the item width is used (and 80% when unset); an unsafe width is dropped to the default; off everywhere emits nothing;
container queries add the `@container` twin. Negative control against the parent commit. Live: the tiles pattern on a
draft page at 375 with `{mobile:on}` and 236px: two tiles 236px wide, the row's `scrollWidth` > `clientWidth`, snap
type `x mandatory`; at 1440 the grid is unchanged.

## Risks

1. The container is the framework's most used block: off by default and empty `{}` emits nothing, so every existing
   container's CSS is byte-identical (asserted by the test).
2. A grid with `grid-template-rows` or `gridAutoRows` set is overridden to a flex row at an ON tier; intended.
3. A nested container inside the row keeps its own layout; only direct children become scroll items.

## Council (2026-09-25, one Fable reviewer as census and adversary): NO-GO as first written, GO WITH FIXES

| # | Finding | Fix taken |
|---|---|---|
| 1 | The shared helper was written over the EXISTING `includes/helpers-tier-media.php` (hero/timeline media functions), uncommitted | Restored from HEAD; helpers in the new `helpers-tier-queries.php` |
| 2 | A container with only this setting might mint no uid | `$sgs_scroll_row_on` joins `$needs_uid` |
| 3 | `$grid_sel` follows `$grid_on_inner` while the `__inner` DOM follows `$do_wrap`; they diverge | Scroll ON forces `$grid_on_inner`, `$band_will_render` and `$do_wrap`, so the row is always `.{uid}>.sgs-container__inner` |
| 4 | A stack/column or centred container would stay a column or clip its first items | Row rule adds `flex-direction:row; justify-content:flex-start; align-items:stretch` |
| 5 | Mandatory snap scrolls band side padding away | `scroll-padding-inline-start/end` from `contentBandPadding` per tier (presets resolved) |
| 6 | Lenis cancels trackpad sideways swipes outside a dialog | `allowNestedScroll: true` in `smooth-scroll.js` |
| 7 | The canvas preview could not show the row at the previewed tier | Preview on the band (or root) at `previewTier`, marker class `sgs-container--scroll-row`, editor.css item width, no snap in the canvas |
| 8 | Gate census | `css:overflow` on the wrapper element's attrMap; override rows (role `layout`); full local build green |
| 10 | With the horizontal-panel effect, two scrollers stack | The setting emits nothing and hides under that effect |
| 9, 11 | `@container` twin unused by sgs/container; `overflow-y:hidden` can clip focus rings | Documented; focus rings checked in the batched axe/focus pass |

Tests: `run-container-scroll-row-standalone.php` 9 of 9; `wp-eval-container-scroll-row.php` on sandybrown before the
deploy: checks 3 to 5 (the row rules) FAIL, as the negative control.
