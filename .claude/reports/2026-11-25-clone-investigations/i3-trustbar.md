# i3-trustbar: the trust bar's editor faults and the shared panels behind them

Read-only. No repo, DB, site or branch changes. The one browser session read the canary front end (page 2742) and ran throw-away DOM probes in the page; nothing was saved. I did not open the block editor, so the editor-canvas findings below rest on code and are marked as such.

Scratch: `E:\sgs-tmp\general-cloning\investigate\i3-trustbar\` (home.html is the canary homepage HTML; rec.txt is a dump of the setting record).

## Short answers

| # | Fault | Cause | Where | Status |
|---|---|---|---|---|
| 1 | Layout panel | Every control is declared and the wrapper honours it. What breaks the experience: (a) the canvas always previews the running ticker, which overrides the layout; (b) "Columns" is dead behind the always-filled "Custom column template"; (c) a second "Columns" control writes the same attribute; (d) no mechanism trims the panel (the flag that looks like one is read by nothing) | shared panel plus block | (b), (c), (d) PROVEN; (a) PROVEN in code, not seen on screen |
| 2 | Fill colour | The fill variable is set on the SVG root only; a path that carries its own `fill` ignores it. The clone writes custom SVGs with `fill` on every path | block CSS (pattern is shared) | PROVEN in the live page |
| 3 | Custom SVG in editor | The block's editor icon components hard-code `source="lucide"` and never read `iconSvg`; the shared IconPreview already supports custom SVG | block | PROVEN |
| 4 | Separator colour | Not dead in code: one path reads it, but only when style is text-only, a glyph is set, and the layout is not grid (the block default is grid) | block | PROVEN |
| 5 | Shape divider | Editor: preview component is never mounted by this block. Flip/invert: invalid SVG transform syntax, ignored by Chrome. Top shows at bottom: top uses the same unflipped path. Colour: see below | shared | 5a, 5b PROVEN; 5c code-proven; colour partly UNPROVEN |
| 6 | Own spacing panel | No shared "standard spacing panel" exists to use; this panel is the common hand-built pattern | shared pattern | PROVEN |
| 7 | Background panel order | The media panel body is `React.lazy`; on first render it has not loaded, so its fill registers after every other panel | shared | PROVEN in code, order not observed on screen |
| 8 | Ticker | Clone writes marquee on the whole block (root), but never writes the "overflow" condition. The earlier "inner box never rendered" claim is half wrong | clone | PROVEN |

## 1. Layout panel

**Controls, and what the trust bar's render does with each** (shared `LayoutPanel.js`, mounted from `edit.js` inside a "Layout" PanelBody; every attribute below is declared in `block.json`):

| Control | Attribute | Honoured? |
|---|---|---|
| Layout type (Default / Flex / Stack / Grid) | `layout` (default grid) | Yes, through `class-sgs-container-wrapper.php`. But the default `overflowMode` is ticker, so see (a) |
| Columns | `columns` | **No, with default data** (see b) |
| Gap | `gap` | Yes (on the inner box when the band exists, else on the root) |
| Vertical alignment | `alignItems` | Yes |
| Flex direction, Flex wrap | `flexDirection`, `flexWrap` | Yes under flex. `render.php` forces wrap when overflowMode is drop; the ticker row ignores it |
| Justify content | `justifyContent` | Yes under flex/stack |
| Custom column template, Row template, Auto rows, Justify items, Align content | `gridTemplateColumns`, `gridTemplateRows`, `gridAutoRows`, `justifyItems`, `alignContent` | Yes under grid; row template and auto rows mean little for a one-row strip |

**(a) The canvas previews the running ticker.** `edit.js`: `tickerDefault` is true when there is no stored marquee layer and `overflowMode` is not wrap or drop (the block default is ticker). `marqueeLayer` then becomes `DEFAULT_TICKER_LAYER`, whose `belowBreakpoint` is `overflow` (`includes/motion/data/trust-bar-default-ticker.json`). `marqueeAlways` is true because `overflow` is not in `['mobile','tablet']`, so `marqueeActive` is true at every device size. The canvas then sets `data-sgs-marquee="on"`, and `style.css` makes the track one non-wrapping flex row and spans the lane across every grid column. On the front end the same layer only runs when the badges do not fit, so a fitting bar shows its authored layout. The editor cannot know whether the bar fits, so every grid, columns and template choice is hidden behind the one-row strip. This is a strong candidate for "most grid types look broken, settings do nothing". UNPROVEN on screen: open the canary page 2742 in the editor, select the trust bar, and read the root's `data-sgs-marquee` attribute.

**(b) Columns is dead behind the custom template.** `block.json` gives `gridTemplateColumns` a populated default for all three device tiers (`repeat(4, 1fr)`, `repeat(4, 1fr)`, `1fr 1fr`). In the wrapper (`SGS_Container_Wrapper::render`, the `$sgs_gtc_resolved` loop) a non-empty explicit tier string wins over the `columns` count. The canary page confirms it: the printed rule is `repeat(4, 1fr)` with a space (the template string), not the `repeat(4,1fr)` form the count produces. The Columns slider changes nothing until the template is cleared per tier. The edit.js comment on `gridTemplateColumnsPreview` says the same.

**(c) Duplicates.** The block also mounts its own "Badges" panel (icon styles only) holding a "Columns" control that writes the same `columns` attribute as the shared panel's Columns. Two controls, one attribute. Flex wrap overlaps `overflowMode` (wrap, drop, ticker). The shared "Gap" and the block's `itemGap` are different things (between badges, and icon to label), so they are not duplicates, only confusingly named.

**(d) How other blocks choose which wrapper controls to show.** They hand-pick. `ContainerWrapperControls.js` is an aggregator with `kind` ('section', 'layout', 'content') plus `showLayout` and `showContentBand`; `LayoutPanel` takes `showLayout`, `enableIntrinsicColumns`, `enableColumnShapePicker`, `enableFlexWrapTier`. About 17 blocks mount the aggregator and about 20 files mount `LayoutPanel` directly. There is no prop that hides an individual control. The look-alike flag, `supports.sgs.enabledExtensions` with `"width","layout","background","shapeDividers"` in this block's `block.json`, is read by no panel: the JS readers (`isExtensionEnabled`) only test `childSizing`, `blockLink`, `floatPosition`, `timeText`, and `SGS_Container_Wrapper::resolve_kind` states it deliberately does not narrow from it. So for `layout`, `width` and `shapeDividers` the flag gates nothing (91 `block.json` files declare `enabledExtensions`; I did not count how many list those three slugs).

**Test of Bean's view.** Mostly right on direction, with one correction. A lean per-block panel is the right shape, but the controls are not unsupported by the render, so the fix is mostly in the canvas preview (a), the dead Columns (b) and the duplicate (c), not in removing controls the render ignores. Dropping rows is sensible where the strip is one row (row template, auto rows, align content, justify items, custom template next to columns). Doing that needs a new trim mechanism: a prop on `LayoutPanel` or a real use of `enabledExtensions`.

## 2. Label fill colour (item `fillColour`)

Cause: `style.css` sets `.sgs-trust-bar__circle--filled svg { fill: var(--sgs-trust-badge-icon-fill, currentColor) }` (and the `__icon--filled` twin), which targets the `<svg>` root only. `render.php` keeps `fill` and `stroke` attributes on child shapes when it sanitises a custom SVG. A child's own `fill` attribute beats a value inherited from the root.

Proof (canary page, throw-away DOM probe, variable set to red):

| Icon | Shape's computed fill |
|---|---|
| The canary star (fill on the root only) | red (works) |
| Same shape with `fill="currentColor"` on the path | the icon colour, not red |
| Outline path `fill="none" stroke="currentColor"` | none, stroke in the icon colour |
| Bare path, no attributes | red |

The 2026-11-24 proof trees show the clone writes the second and third forms: Mama's home trust bar, footer and checkout header carry `fill="currentColor"` or `fill="none" stroke="currentColor"` on every path (`wt-clone-mm/sites/mamas-munches-redesign/build/trees/`). So the control works for a library icon and for root-only SVGs, and nowhere else. It also needs `fillStyle: filled` on the item. The proof trees contain no `fillStyle` or `fillColour` on any trust bar item.

Shape for a script: a per-item colour variable consumed by a CSS rule that targets the `<svg>` root while the markup carries presentation attributes on children. Same risk wherever `render.php` accepts pasted SVG and a root rule paints it: `sgs/icon`, `sgs/button`, `sgs/cart` also take `iconSvg` (DB: `block_attributes.role='svg'`). Whether they paint through a root-only rule I did not check: UNPROVEN, grep their CSS for `svg {` plus `fill`.

## 3. Custom SVG icons in the editor

Front end (`render.php`): the library slug wins, else `iconSvg` after `style` is stripped and `wp_kses`, else the check tick. Editor (`edit.js::EditorIconCircle`, `edit-panels.js::EditorIconBare`): both render the shared `IconPreview` with `source="lucide"` and `name={ item.icon || 'check' }`. Neither reads `item.iconSvg`. A clone writes `iconSvg` with no `icon`, so the canvas shows the tick.

The shared `components/IconPicker/IconPreview.js` already supports `source="custom"` with an `svg` prop (it sanitises and adds the glyph class). `sgs/button`, `sgs/icon` and `sgs/cart` pass it. Only trust-bar fails: it is the only block whose `render.php` prints a pasted SVG while its editor hard-codes the library source. Nine other files hard-code `source="lucide"` (counter, process-steps, form-field-file, form-field-text, card-grid canvas, post-grid card, accordion filter bar), but those blocks have no raw-SVG attribute, so they do not mismatch.

Minor, UNPROVEN: the item picker is shown as `item.icon || 'check'`, so a client cannot clear the library icon to let the custom SVG win.

Shape for a script: an editor preview component whose `source` is a literal while the PHP render has a second source branch. Count: 1 block (trust-bar) by the DB (`iconSvg` role `svg` on 4 blocks, 3 handled).

## 4. Separator colour and the styles

Styles (`badgeStyle`): `icon-circle` (default), `icon-bare`, `text-only` (label "Text only (pill badge)"), `image-badge`. Git: commit `8b964f0e0` records the text-only badge "always drew a pill"; it added `textBadgeBackground`, `textBadgeBorderColour`, `textBadgeBorderWidth`, `textBadgeRadius` and the separator pair so a strip of plain words is possible. So text-only is a pill by default and becomes plain words only when those four are set (the clone writes `#00000000`, `0px`, `0px` and a zero `itemPadding`). The title is a left-hand heading in the canvas only for text-only and image-badge.

What each style reads (from `render.php`, `helpers-trust-bar-item.php`, `style.css`):
- icon-circle: `iconCircle*`, `iconColour*`, `iconStrokeWidth`, `itemGap`, `itemPadding`, `textColour` for the label.
- icon-bare: `iconBareSize`, `iconColour*`, `iconStrokeWidth`, `itemGap`, `itemPadding`.
- text-only: `textBadge*` (all six, including the separator), `labelColour*`, `titleColour*`, `itemPadding`, `badgeSize`.
- image-badge: `badge*` media settings, `badgeImageShadow*`, `labelColour*`, `titleColour*`, `badgeSize`.

Separator colour: one render path reads it, `sgs_trust_bar_text_badge_css`, and only when `badgeStyle` is text-only and a glyph is set (`sgs_trust_bar_separator_glyph` returns empty for any other style). `style.css` then hides every separator under a grid layout (`.sgs-container--grid > .sgs-trust-bar__separator`), and the block's default layout is grid. So by default a text-only bar shows no separator and the colour does nothing; setting only the colour (the Colour panel row appears before the glyph field, which sits in a different "Word badge" panel) also shows nothing. Per Bean's note, the dependency on the text-only style is the design fault: the glyph and colour are tied to a style by `sgs_trust_bar_separator_glyph`, so moving them to every style means changing that function, the canvas (`edit.js`: `separatorGlyph`), the colour row condition and the grid hiding rule. The pill style should not be restored; nothing here requires it.

Settings no style reads: none are fully dead in code. Two cases are style-bound: `labelColour*` and `titleColour*` paint `.sgs-trust-bar__badge-label` and `.sgs-trust-bar__title`; icon styles print `.sgs-trust-bar__label` instead, so `labelColour` does nothing there (the editor row is shown only for text-only and image-badge, so the control and the render agree). The record's `tested_no_paint` list also names `textBadgeSeparator`, `textBadgeSeparatorColour`, `title`, `tagName`, `ariaLabel`, `items` and every `shapeDivider*Colour/Flip/Invert/Scale` setting, because the record's probe renders the default look.

Possible, UNPROVEN: with a content band and grid layout the grid sits on the inner box, whose parent test `.sgs-container--grid > .sgs-trust-bar__separator` would not match, so separators could appear as extra grid cells. Needs a rendered sample.

## 5. Shape divider (shared)

**5a No canvas render.** `components/ShapeDividerPreview.js` (the editor twin of `sgs_render_shape_divider`) is imported by `blocks/container/edit.js` only. The `ShapeDividersPanel` is mounted by four blocks: container, hero, site-footer and trust-bar. So hero, site-footer and trust-bar show the panel with nothing on the canvas. The trust bar's canvas JSX (`BandWrap` children) has no divider element.

**5b Flip and invert do nothing.** PHP (`includes/shape-dividers.php::sgs_render_shape_divider`) and the preview write `transform="scaleX(-1)"` / `transform="scaleY(-1)"` plus `transform-origin="center"` as SVG attributes on the path. In Chrome 158 (the browser I probed) this is ignored: the path's screen matrix stayed `d = 0.5` (unflipped) and the computed transform was `none`; `transform="scale(1,-1)"` gave `d = -0.5`. The live canary divider carries `transform="scaleY(-1)"` and its matrix `d` is +1, so the invert is not applied. The same applies to the pattern (scaled) route. Shape for a script: `grep -n "scale[XY](-1)"` inside an SVG `transform=` attribute or React `transform` prop; 2 hits in `shape-dividers.php`, `ShapeDividerPreview.js` (the others, `decorative-image/render.php` and `layer-preview.js`, are outside this problem unless they also write an SVG attribute: not checked). It hits every block that renders a divider: container, hero, site-footer, trust-bar.

**5c Top divider shows at the bottom.** Code: `sgs_render_shape_divider( ..., 'top', ... )` and the preview use the same path for top and bottom, with no automatic inversion. Every path in `sgs_get_shape_dividers()` ends `... L1200,120 L0,120 Z`, so the colour mass hugs the lower edge of its 120px box. `.sgs-shape-divider--top` only sets `top:-1px`. So a top divider is a bottom-hugging shape placed at the top, and the "Invert vertically" toggle that would fix it is dead (5b). UNPROVEN on screen: set `shapeDividerTop` to wave on a scratch page and screenshot.

**5d Colour controls.** `GradientOverlayControl` writes `shapeDivider{Top,Bottom}Colour` and the `...ColourGradient` sibling correctly; the wrapper reads them and prints `.uid .sgs-shape-divider--top{color:...}`. In the editor nothing shows (5a), so the colour looks dead there. On the front end I did not observe a colour change (the canary's divider has none set, so it paints in the text colour). UNPROVEN on the front end; what settles it: render one with a colour set.

## 6. Its own padding and margin panel

`block.json` declares no `supports.spacing` (the same is true of container, hero and heading), so the native Dimensions panel is not available, and the comment in `edit.js` ("also visible in Styles > Dimensions") is stale. The panel is `ResponsiveOverride` plus `SgsBoxControl`. There is no shared "standard spacing panel" component in the tree. The only shared panel for this is `components/ResponsiveBoxControls.js` (Spec 37), used by four files: gallery, site-header-row, site-footer-row and `GridItemDefaultsPanel`. The same hand-built panel appears in about 36 blocks (PanelBody titled "Spacing" or "Padding & margin") and `SgsBoxControl` is used in 77 files. So this is the common pattern, not a deviation. Which one Bean calls "standard" I cannot tell from the code (candidates: `ResponsiveBoxControls`, or a new shared `SpacingPanel`): his call. Shape for a script: a PanelBody titled Spacing or Padding & margin wrapping two `ResponsiveOverride` plus `SgsBoxControl` bound to `padding` and `margin`.

## 7. Background panel placement

Mechanism: the Styles tab is a WordPress `InspectorControls group="styles"` slot; fills are concatenated in mount order (`SgsColourPanel.js` header says so; Spec 35 A8 and 35A CO-28 say panel order is authoring order and the canonical order is not yet chosen). `BackgroundPanel` renders `MediaElementPanel`, which lazy-loads its body: `components/MediaElementPanel.js` has `const MediaPanels = lazy(() => import(...))` inside `<Suspense fallback={ null }>`. `MediaPanels` is what mounts the panel's `InspectorControls` fills. On the first selection the chunk has not loaded, so the fill registers after every other fill (Colour, Section, Padding, Layout, Shadow, Shape dividers, ...) and lands at the bottom; the first media panel is `open: true` (`panel-model.js`), which matches "open". After a tab switch the chunk is cached, the lazy resolves immediately, and the fill registers in tree order, under Colour. Observed on screen: no. Two other shared components lazy-load the same way (`CarouselDotsPanel`, 3 users; `BuiltinButtonPanel`, 8 users). `BackgroundPanel` is mounted by 8 blocks (container, hero, multi-button, nav-drawer, physics-canvas, site-footer, site-header, trust-bar). Shape for a script: `lazy(` in a component that renders an `InspectorControls` fill. 3 components.

Side observation: `edit.js` comments say Background is "kept first in the Styles tab", but `SgsColourPanel` is mounted earlier in the JSX, so the approved place under Colour is the tree order, and the comment is stale.

## 8. Ticker and the setting record

What the proof wrote (`wt-clone-mm/sites/mamas-munches-redesign/build/trees/`): `footer.json` has `sgsMotion.elements.root.effects[marquee]` with `belowBreakpoint: "always"`; `sgs_footer/footer.json` has a marquee with no `belowBreakpoint` at all; `home.json` and `sgs_header/header.json` have none. Eye Care's header trust bar has none. The target is `elements.root` (whole block): correct. The condition is never `overflow`: the only writer of `belowBreakpoint` is `lib/motion-loops.mjs::limitedBelow`, which can only write `tablet` or `mobile`, and nothing in `scripts/computed-route` names `overflow` or `overflowMode`. The Effects panel's own field list allows `always`, `tablet`, `mobile`, `overflow` (DB `motion_fields`). The block's default (`overflowMode` ticker) adds the overflow-only layer at render time, so a bar the clone leaves with no marquee still gets a ticker when it overflows. Whether `overflow` should be written when the draft ticker always runs is a design question: the draft runs always, so `always` is faithful.

Does the record point the clone at a different ticker setting? Partly. The setting record (`setting_placements`, `setting_record_blocks`) attributes the marquee state CSS (`[data-sgs-fx~=marquee]`, the pause button, the lane) to `overflowMode`, which is the block-level ticker/wrap/drop switch, and has no row at all for `sgsMotion`. No code path writes `overflowMode` in the proof trees (zero trees contain it). So the record's attribution is odd but nothing used it for the ticker; the actual write goes through the motion pipeline.

The earlier claim ("layout, ticker, label colour and separator colour sit on an inner box the trust bar never renders") is half right and wrong as worded.
- Layout settings (`layout`, `gap`, `gridTemplateColumns`, `alignItems`, `justifyContent`, `flexWrap`, `padding`, `contentWidth` and others): the record has only one placement for them, `.sgs-trust-bar>.sgs-container__inner`. The block does render that box, but only when the band exists (a content width or band padding is set; `class-sgs-container-wrapper.php`, `$has_band_props` and `$grid_on_inner`). The canary homepage trust bar has it (`sgs-container__inner sgs-trust-bar__content-band`, grid rules `.sgs-container-f29d70d8>.sgs-container__inner{...}`). Mama's header trust bar has none (the earlier hunt saw the flex rules on the section itself). So "never" is wrong; "not by default, and the record has no root placement for the case with no band" is right. The record has no root-level placement for `layout`, `gap` and the rest.
- Ticker: placements are on the badge, title, pause button and lane parts, not the inner box (one `sgs-container__inner` row, for `min-width`).
- Label colour: placed on `.sgs-trust-bar__badge-label`, a part drawn only in text-only and image-badge; not an inner box.
- Separator colour: the record has no placement for it (it is in the `tested_no_paint` list). Its `block_attributes` row names the `separator` element with `css:color`. It is a part drawn only in text-only with a glyph and non-grid layout, not an inner box.

## Calls I made

- Used the canary front end plus in-page probes for 2 and 5b; did not log in to the editor, so 1(a), 5c and 7 are code-proven only.
- Treated "standard spacing panel" as unidentifiable and reported the candidates.
- Did not start the local mirrors (not running; starting them writes machine state).
- Removed my two Playwright output files from the (git-ignored) `.playwright-mcp` folder in the repo.
