# Header bar, dropdown placement and phone drawer: draft to block settings

Files changed: `build/header.tree.json`, `build/mobile-menu.tree.json`. Both validate against block.json (type and enum) and the extension attribute list; nothing was run against a live site.

Status key: SET (attribute now carries the draft value), DEFAULT (block default already produces it), RESTRUCTURED (different block or layout), GAP (nothing can paint it).

## Root causes found (these explain the measured live errors)

1. Every `sgs/container` defaults to `contentWidth: normal`, so it renders a content band capped at the snapshot's 1336px and gains core's `has-global-padding` (24px gutter each side) (`class-sgs-container-wrapper.php`, search `has-global-padding`). That is why the drawer content was narrower ("Prescription lenses" wrapped) and the wordmark sat off-position. Every container in both trees now sets `contentWidth: {desktop: full}`.
2. `sgs/nav-drawer` had `drawerAlign: left`, which shrinks children to their content (the 132px phone button). Now `stretch`.
3. `sgs/site-header` `headerShrink` hard-wires the padding ends to spacing presets 30 and 10 (`site-header/render.php`, `$sh_shrink_pad_rest`/`$sh_shrink_pad_shrunk`, animated over the padding attribute). In this snapshot that is 1rem (fluid 0.75rem) and 0.25rem, which is why live padding was 16px whatever the attribute said. Shrink now runs on the middle row (`rowShrink`), which halves the row's own vertical padding (`helpers-row-behaviour.php::sgs_row_shrink_css`).
4. In the cart pill the count is an unfilled inline number (`.sgs-cart--trigger-pill .sgs-cart__badge::after{content:none !important}`), and the old tree gave it `badgeTextColour: primary-text` (cream on a cream header), so it was invisible. Now `text`.

## Header at 1440

Paths are relative to `[1]` (the `sgs/site-header`); `mid` = `innerBlocks[1]` (middle row), `navL` = `mid.innerBlocks[0]`, `logoC` = `mid.innerBlocks[1]`, `rightC` = `mid.innerBlocks[2]` (`bi` phone, `navR` = About/Help nav, `cart`).

| Element | Draft | Set | Status |
|---|---|---|---|
| Header fill | rgba(250,248,245,.9) + blur 16 | site-header `backgroundColour=surface`, `surfaceOpacity=90`, `surfaceBlur=16px` (already there) | SET |
| Header border | 1px #E6E1DA bottom | `borderWidth={bottom:1px}`, `borderStyle=solid`, `borderColour=border` (already there) | SET |
| Sticky | position sticky | `headerSticky={desktop:on}` (already there) | SET |
| Scroll threshold | scrolled at 40px | site-header `scrolledOffset=40` | SET |
| Content cap 1440 | inner max-width 1440, centred | `mid.maxWidth={desktop:1440px}`; header `contentWidth` removed (default full), so no band/gutter | SET |
| Grid | 1fr auto 1fr, gap 16, centred (at mobile the draft is unsymmetrical: burger, logo, cart) | `mid.layout=grid`, `gridTemplateColumns` desktop/tablet `1fr auto 1fr`, mobile `auto 1fr auto`, `gap=16px` | SET |
| Row padding | 20px 28px | `mid.padding.desktop=17px 28px` (NOT 20: see Gap 1), tablet 20px 28px, mobile 12px 16px | SET, compensated |
| Header height | 79 | 17+44+17+1 = 79 (nav link and bag pill are 44px min-height in CSS) | SET, compensated |
| Left nav items | padding 6px 0, gap 24, 13.5px, .06em, uppercase | navL `itemPadding.desktop=6px 0`, `gap=24px`, `itemFontSize=13.5px`, `itemLetterSpacing=.06em`, `itemTextTransform=uppercase`, `itemFontWeight=400` | SET |
| First item x | 28 | row padding 28, item left padding 0 | SET |
| Item hover text | no colour change | navL/navR `itemColourHover=text` (the default hover is `accent`) | SET |
| Open dropdown item mark | 1px #141414 bottom, fades | `itemBorderWidth={bottom:1px}`, `itemBorderStyle=solid`, `itemBorderColour=transparent`, `itemBorderColourHover=primary` (FR-41-13 keeps hover paint on the item while its panel is hovered) | SET |
| Current-page mark | none in draft | `itemBorderColourCurrent=transparent`, `itemFontWeightCurrent=400` (defaults are accent underline and 600 weight) | SET |
| Border fade .25s | border-color .25s | GAP 6 | GAP |
| Glasses item | #8B8478, not a link | navL `disabledItemIds=[id:195]` (already), `itemDisabledColour=#8B8478` | SET |
| SOON badge colours | bg #EFEAE2, text #6F6152 | `itemBadgeColour=accent-light`, `itemBadgeTextColour=accent-text` (already; the hexes match the slugs) | SET |
| SOON badge size | 9.5px, .1em, padding 3px 6px, gap 7px, weight 400, no radius | none available (Gap 2) | GAP |
| About / Help | padding 6px 10px, About hover underline | navR `itemPadding.desktop=6px 10px`, same border/colour attributes as navL, `gap=6px` | SET |
| Right cluster | flex-end, gap 6 | rightC `justifyContent=flex-end`, `gap=6px` (already) | SET |
| Logo size | 48x22 (scrolled 40x18) | `responsive-logo` `width=48`, `shrinkWidth=40` (px) | SET |
| Logo hover | none | `responsive-logo` `opacityHover=1` (default fades to .85) | SET |
| Logo to wordmark gap | 12 | logoC `gap=12px` (already), `contentWidth=full` | SET |
| Wordmark line 1 | Playfair 500 18px .14em (scrolled 15px) | heading `fontFamily=heading`, `fontWeight=500`, `fontSize=18px`, `letterSpacing=.14em` (already), `lineHeight=1`, `margin.bottom=0px` (the block's default is 8px) | SET; scrolled size GAP 7 |
| Wordmark line 2 | 9.5px .32em #6B655E, 4px below, line-height 1 | text `textColour=text-subtle` (#6B655E, exact slug; was text-muted #5E584F), `lineHeight=1`, stack `gap=4px` | SET |
| Phone | 12.5px, .04em, no uppercase, #4A453E, hover #141414, padding 6px 10px | `bi` `fontSize=12.5px`, `letterSpacing=.04em`, `textTransform=none`, `textColour=text-soft`, `textColourHover=text`, `padding.desktop={left:10px,right:10px}` (vertical comes from the link's own 44px box less its cancelling margin, about 31px, draft 30.75) | SET |
| Phone icon | 15px, gap 8 | none (icon is 1em, gap .5em: 12.5px and 6.25px) | GAP 4 |
| Phone shown at 1160+ | hidden 1060 to 1159 | `bi` `sgsCollapseVisibility=hide` (hides below the 1060 collapse point only) | SET, band GAP 8 |
| Bag pill border and shape | 1px #141414, radius 999 | cart `pillBorderColour=primary`, `pillBorderWidth=1px`, `pillBorderStyle=solid`, `pillBorderRadius=999px` (already) | SET |
| Bag pill text | 12.5px .08em uppercase | uppercase is default; size, weight and spacing have no attributes (defaults .8rem, 600, .06em) | GAP 3 |
| Bag pill min-height and hover fill | 38px; hover bg #141414, text #FAF8F5 | none (44px in CSS; hover is opacity .8) | GAP 1, GAP 3 |
| Bag count | 20x20 round #9C8B78, white 11px, shown at 0 | `showZero=true`, `badgeTextColour=text` (visible), `countPopAnimation=true` (already). The filled bubble is not painted in pill mode | GAP 3 |
| Mega panel placement | absolute, left 0, right 0, top 100%, full width | see Dropdown placement | SET |

## Header at 768 and 375

| Element | Draft | Set | Status |
|---|---|---|---|
| Height 768 | 85 | `mid.padding.tablet=20px 28px`: 20+44+20+1 = 85 | SET |
| Height 375 | 69 | `mid.padding.mobile=12px 16px`: 12+44+12+1 = 69 | SET |
| Nav to burger | below 1060 | navL `collapsePoint=1060` (already) | DEFAULT |
| Burger bars | 2 bars, 22px wide, 1.5px thick, 5px gap | navL `burgerBarCount=2`, `burgerIconWidth={desktop:22px}`, `burgerBarGap={desktop:5px}`. Thickness is fixed at 2px, so the box is 9px not 8px | SET; thickness GAP 5 |
| Burger button | padding 8, min-height 44, margin-left -8 | `burgerPadding.desktop=8px` all sides, `burgerSize` default 44px, `margin={desktop:{}, tablet:{left:-8px}}` (mobile inherits tablet) | SET; 1024 to 1059 GAP 9 |
| Burger width, phone | icon box 38 wide | `burgerWidth={mobile:38px}` (the 44px hit area is kept by the `::after`) | SET |
| Burger hover | no fill | `burgerHoverColour=transparent` (default is a 12% tint) | SET |
| "Menu" label | 12.5px .1em, tablet only | `triggerMode={desktop:icon-and-text, mobile:icon}`, `burgerFontSize=12.5`, `burgerLetterSpacing=.1`, `burgerTextTransform=none`, `burgerFontWeight=400`, `triggerIconPosition=before` (already) | SET |
| Icon to label gap | 10px | none | GAP 5 |
| Phone, About, Help | hidden below 1060 | nav collapse and `sgsCollapseVisibility=hide` | SET |
| Logo, wordmark, bag | unchanged | tier inheritance | DEFAULT |
| Scrolled padding | 10px 24px | `mid.rowShrink={desktop:on, tablet:on, mobile:off}`: halves the row's own vertical padding (desktop 17 to 8.5, tablet 20 to 10); horizontal stays 28 | SET, partial GAP 7 |

## Dropdown placement

| Item | Draft | Set | Status |
|---|---|---|---|
| Width and left | left 0, right 0 | navL and navR `megaAlign={desktop:full-width}` (already; tiers inherit). `panel-bounds.js::placePanel` returns the viewport box for `full-width`; the panel content is capped by each `sgs/mega-panel` `maxWidth` (other agents' files) | SET |
| Top edge | flush under the header | `submenuTopOffset` default empty; `mega-disclosure.js::panelTopEdge` publishes the header's bottom as `--sgs-mm-panel-top` | DEFAULT |
| Fade .2s | animation fade .2s | `submenuAnimation` default `fade`; navL and navR `submenuAnimationDuration=200` (default 180) | SET |
| Panel fill, border, shadow, padding | white, 1px bottom border, 0 24px 48px | painted by `sgs/mega-panel` (`panelBg`, `borderWidth`, `shadow`), owned by the mega files | not mine |
| Max-height 74vh | max-height 74vh, scroll | none: the height bound is JS-measured (`100dvh - header - 16px`) | GAP 10 |

## Phone drawer (375)

Structure now: `sgs/nav-drawer` > [nav container (Shop): 3 `sgs/button` + Glasses row container] > [nav container (More): `sgs/icon-list`] > [bottom container: phone `sgs/button` + row container of 3 icon `sgs/button`].

| Element | Draft | Set | Status |
|---|---|---|---|
| Panel | bg #FAF8F5, full screen | `drawerBg=surface`, `panelSize={desktop:100%}` (already) | SET |
| Padding | 20px 24px | `chromeRowPadding.desktop=20px 0 0 0` (row) plus `drawerPadding.desktop={top:0,right:24px,bottom:20px,left:24px}` (body) | SET |
| Top row | wordmark left, x close right, one row | RESTRUCTURED: wordmark moved from a body container to the drawer's own chrome row: `chromeSlotType=heading`, `chromeSlotText=EYE CARE`, `chromeSlotHeadingLevel=p`, `chromeSlotPlacement=after-logo`, `chromeSlotFontFamily=heading`, `chromeSlotFontWeight=500`, `chromeSlotLetterSpacing=.14em`, `chromeRowHeight=64px` (20 pad + 44 close) | RESTRUCTURED |
| Close | plain x, 28px, 44x44, no border, bg or shadow | close defaults are 44x44, no border or background, 28px icon; `closeBorderWidth=0px` all sides and `closeBorderStyle=none` added so a theme button rule cannot draw a box | DEFAULT + SET |
| Main links | Playfair 500 34px, padding 14px 0, border-bottom 1px #E6E1DA, margin-top 32 | RESTRUCTURED from `icon-list` to `sgs/button` (`inheritStyle=custom`, `widthType=full`, `contentAlign=flex-start`, `fontFamily=heading`, `fontWeight=500`, `fontSize=34px`, `lineHeight=1.5em`, `padding=14px 0`, `borderWidth={bottom:1px}`, `borderColour=border`, `colourText=text`); nav container `margin.top=32px`, `gap=0px`, `ariaLabel=Shop`. The `<a>` is the padded, bordered box (row 14+51+14+1 = 80, as the draft) | RESTRUCTURED |
| "Prescription lenses" on one line | one line | containers no longer gutter (root cause 1); `widthType=full` | SET |
| Glasses row | grey #A39C90 + "SOON" Outfit 12px .14em | RESTRUCTURED: container row (`flex`, `alignItems=baseline`, `gap=9px`, padding 14px 0, bottom border 1px `border`) with `sgs/text` "Glasses" (heading, 500, 34px, #A39C90) and `sgs/text` "SOON" (`fontFamily=body`, 12px, `.14em`, #A39C90). Hex used: no palette slug matches #A39C90 | RESTRUCTURED |
| Entrance rise .5s, stagger 50ms | rise .5s, +50ms | `itemStagger=50`, `itemStaggerDuration=500`, `itemStaggerDistance={desktop:18}` (drawer CSS staggers each body child). The three body containers stagger, not each row | SET, partial GAP 11 |
| Secondary links | 15px, .04em, gap 14, margin-top 28 | `icon-list` kept: `itemFontSize=15px`, `itemLetterSpacing=.04em` (already), `gap=10` (spacing slug 10 = 4px) plus `itemPaddingBlock=5px` gives text-to-text 14px; container `margin.top=23px` (28 less the 5px first-item padding) | SET |
| Bottom block | margin-top auto, padding-top 28, gap 12 | container `margin.top=auto`, `padding.top=28px`, `gap=12px` | SET |
| Phone button | full width, 1px #E6E1DA, #fff, padding 14px 16px, 15px, 17px icon, gap 12 | RESTRUCTURED from `business-info` in a bordered box to `sgs/button` (`linkSource=phone`, `widthType=full`, `icon=phone`, `iconPosition=before`, `iconSize=17`, `iconGap=12px`, `fontSize=15`, `padding=14px 16px`, `borderWidth=1px`, `borderColour=border`, `colourBackground=surface-alt` (#FFFFFF)). The `<a>` is the box, as in the draft | RESTRUCTURED |
| Three boxes | flex 1, gap 10, min-height 46, 1px #E6E1DA, #fff | RESTRUCTURED from `social-icons` to a flex row container (`gap=10px`, `flexWrap=nowrap`) of three icon-only `sgs/button` (`sgsChildSizing={desktop:fill}` = `flex:1 1 0%`, `minHeight=46px`, `borderWidth=1px`, `borderColour=border`, `colourBackground=surface-alt`, `iconSize=18`, `ariaLabel`) | RESTRUCTURED |
| WhatsApp box | border #B7E5C7, bg #E9F9EF, colour #1B7F43 | `borderColour=whatsapp-line`, `colourBackground=whatsapp-soft`, `colourText`/`iconColour=success` (all exact slugs), `linkSource=whatsapp` (reads Site Info, falls back to the typed wa.me URL) | SET |
| Instagram, Google | draft glyphs | `instagram` and `star` (no Google "G" in the Lucide set) | GAP 12 |

## Gaps (attribute searches)

1. **44px min-height is hard-coded on the nav link and the cart pill.** `nav-bar-menu/style.css::.sgs-nav-bar-menu__link{min-height:44px}` and `cart/style.css::.sgs-cart__trigger{min-height:44px}`; the pill only overrides `min-width`. Searched `block.json` of nav-bar-menu and cart for min-height/height attributes (none) and `includes/nav-menu-*.php` (only the sublink and burger rules). Consequences: the draft's 38px content height cannot be reached, so header padding is 17px not 20px (height 79 matches; padding does not), and the open-item underline sits about 5px lower than the draft's. The 44px floor is also a project rule, so this may be deliberate.
2. **Nav badge size.** `nav-bar-menu` has `itemBadgeColour` and `itemBadgeTextColour` only; `style.css::.sgs-nav-bar-menu__badge` is 0.65em (8.8px), weight 600, .08em, padding .2em .45em, radius 3px, margin-inline-start .5em (about the draft's 7px gap). Draft: 9.5px, weight 400, .1em, padding 3px 6px, radius 0.
3. **Cart pill typography, hover and bubble.** No `pillFontSize`, `pillFontWeight`, `pillLetterSpacing`, `pillBgColourHover`, `pillTextColourHover` or count-bubble attributes (searched `cart/block.json` `pill*` and `badge*`). Pill defaults .8rem (12.8px), 600, .06em, hover `opacity:.8`. The count is an unfilled inline number, and `badgeColour` is not painted in pill mode.
4. **Business-info icon and gap.** `business-info` has `iconColour*` but no icon-size or gap attribute (`style.css::.sgs-business-info__icon svg{1em}`, `.sgs-business-info__link{gap:.5em}`): 12.5px and 6.25px vs draft 15px and 8px.
5. **Burger.** No icon-to-label gap (draft 10px) and no bar-thickness attribute (bars are 2px, draft 1.5px; box 9px vs 8px).
6. **Border fade .25s.** `itemMotionDuration` drives only `background-color` and `color` (`nav-bar-menu/style.css::.sgs-nav-bar-menu__link` transition list, `nav-menu-item-transition-css.php`), so the underline appears instantly.
7. **Scrolled state.** No scrolled font size for the wordmark (heading and text have no scrolled tiers; draft 18 to 15px). The row shrink only halves vertical padding: draft scrolled is 10px 24px at every width (desktop here goes 17 to 8.5, mobile does not shrink, horizontal stays 28 or 16). The draft's .35s padding transition is not settable.
8. **Phone at 1060 to 1159.** Visibility follows the collapse point only (`sgsCollapseVisibility`, `device-visibility.php`); the phone shows from 1060 where the draft shows it from 1160.
9. **Burger margin-left -8px** is a tier value: it applies at tablet and mobile (up to 1023), so the burger at 1024 to 1059 sits 8px right of the draft and its header is 79 tall, not 85.
10. **Panel max-height 74vh.** Searched `nav-bar-menu` block.json for `submenu*` sizing attributes: only `submenuMinWidth`, `submenuTopOffset`, padding/border. The bound comes from `mega-disclosure.js` (`--sgs-mm-panel-max-h`).
11. **Stagger granularity.** Body-child stagger only; the four main rows animate as one group (0, 50, 100ms for the three containers) instead of six delays.
12. **Glyphs.** No Google "G" or WhatsApp logo in the Lucide set `sgs/button` uses (`includes/lucide-icons.php`). `social-icons` has the real brand glyphs but cannot make equal-width boxes or per-platform colours.

## Uncertain (needs a look at the live DOM)

- `sgsChildSizing` is an extension attribute (registered by `child-sizing.js`, in `extension-attributes.generated.php`, enabled on `sgs/button`). It passes my validator; confirm `wp-build-page.js` accepts it.
- The wordmark is not inside the home link (only the logo image is). The draft links both. `sgsBlockLink` on the logo container might do it; I did not test it.
- `margin.top=auto` on the bottom drawer block passes `sgs_css_length_value` (letters are allowed), but I did not confirm the container margin emitter or that the body's `min-height:100%` pins it to the bottom.
- `alignItems=baseline` on the Glasses row is a free string in block.json; check the emitter allows it.
- `itemBorderColour=transparent` and `burgerHoverColour=transparent`: `sgs_colour_value` should pass a CSS keyword, unconfirmed.
- FR-41-13 keeps the item's hover underline while the pointer is inside its panel via `.submenu-root:hover`. If `mega-disclosure.js` reparents the panel to `<body>` for that item, the underline may drop.
- Row shrink and the logo's `shrinkWidth` rely on `view.js` toggling `is-row-shrunk` and `is-header-shrunk` (the comments say it toggles unconditionally).
- `rowShrink` starts at scroll `scrolledOffset` (40); `sgs/site-header` `scrolledOffset` is header-level, I did not check the row's own threshold.
- The drawer: `closeBorderStyle=none` plus zero width is defensive. I found no source for the "bordered box with shadow" on live; if it is a theme `button` style, the shadow is not covered by any close attribute.
- The secondary links are 22px tall plus 5px item padding (the draft's own geometry), not 44px targets.
- `sgs/heading` stays an `h2` (the level enum has no `p`); a heading in the header on every page is an accessibility smell.
- **Walker `header.mjs`:** the live selector for `drawer-whatsapp` is `.sgs-social-icons__item[aria-label*="WhatsApp"]`, which no longer exists. The WhatsApp box is now `.sgs-button[aria-label="WhatsApp"]`. `drawer-phone` and the link pairs find `a` by text and still match; `drawer-close` matches. I did not edit the walker.
