# Wave 4: the canvas-settable claims, grouped into families

Built offline on 2026-10-06 from `sites/eye-care-ward-end/build/qa/triage/*.json`, so the host
window is spent measuring rather than organising. Regenerate by re-running the grouping over the
same triage verdicts: a claim is a verdict whose `decidedBy` is `canvas-settable`, and its family is
(the cited block, the cited setting, the row property).

## What the grouping says

| Measure | Value |
|---|---|
| Claims decided by `canvas-settable` | **209** |
| Distinct families | **69** |
| Families spanning more than one surface | **28** |
| Live reads at 2 per family | **138**, against 209 one-per-claim |

The claim count of 209 matches the figure the plan carried. **The family count does not: the plan says
68, and the grouping gives 69.** Use 69.

**28 of the 69 families span more than one surface**, which is the evidence for the plan's
instruction to sample by family and never by surface: a per-surface sweep would read the same family
repeatedly and still leave others untouched.

## R1 closes a named sub-set of these

**20 claims across 3 families cite a `bgHoverZoom*` setting.** R1 makes `canvasSettable` respect the
emission selector, and `container-bg-hover-zoom.php::sgs_container_bg_hover_zoom_css` emits only to
`.<uid> > .sgs-container__image-bg` and `.<uid>::before`. These families are the positive control for
R1 on real data: after R1 they should no longer be classed `W/canvas-settable`.

- `sgs/container::bgHoverZoomDuration` on `transition-duration` - 13 claims
- `sgs/container::bgHoverZoomEasing` on `transition-timing-function` - 5 claims
- `sgs/container::bgHoverZoomScale` on `transform` - 2 claims

## Every family, largest first

Two reads per family: one on the cited control, one on a row element the control is claimed to reach.

| # | Cited block | Setting | Row property | Claims | Surfaces | A ref to read |
|---|---|---|---|---|---|---|
| 1 | `sgs/container` | `lineHeight` | `line-height` | 20 | 5 (contact-form, footer, header...) | `cr-ref-contact-form-0` |
| 2 | `sgs/container` | `bgHoverZoomDuration` | `transition-duration` | 13 | 4 (contact-form, footer, product...) | `cr-ref-contact-form-1` |
| 3 | `sgs/container` | `fontSize` | `font-size` | 11 | 4 (footer, mega-brands, mobile-menu...) | `cr-ref-footer-10` |
| 4 | `sgs/container` | `gridItemPadding` | `padding-bottom` | 6 | 4 (footer, mobile-menu, product...) | `cr-ref-footer-6` |
| 5 | `sgs/container` | `gridItemPadding` | `padding-top` | 6 | 4 (footer, mobile-menu, product...) | `cr-ref-footer-6` |
| 6 | `sgs/container` | `shadow` | `box-shadow` | 6 | 3 (contact-form, mobile-menu, shop) | `cr-ref-contact-form-1` |
| 7 | `sgs/container` | `textWrap` | `text-wrap` | 6 | 2 (product, shop) | `cr-ref-product-12` |
| 8 | `sgs/container` | `bgHoverZoomEasing` | `transition-timing-function` | 5 | 2 (product, shop) | `cr-ref-product-12` |
| 9 | `sgs/container` | `boxAspectRatio` | `aspect-ratio` | 5 | 4 (header, mega-brands, product...) | `cr-ref-header-6` |
| 10 | `sgs/container` | `gridItemPadding` | `padding-left` | 5 | 3 (footer, mobile-menu, product) | `cr-ref-footer-6` |
| 11 | `sgs/container` | `gridItemPadding` | `padding-right` | 5 | 3 (footer, mobile-menu, product) | `cr-ref-footer-6` |
| 12 | `sgs/container` | `sgsHideOnDesktop` | `display` | 5 | 3 (mega-brands, mobile-menu, shop) | `cr-ref-mega-brands-41` |
| 13 | `sgs/container` | `contentWidth` | `width` | 4 | 2 (footer, shop) | `cr-ref-footer-6` |
| 14 | `sgs/container` | `gap` | `gap` | 4 | 2 (product, shop) | `cr-ref-product-4` |
| 15 | `sgs/container` | `sgsHoverLift` | `transform` | 4 | 2 (footer, product) | `cr-ref-footer-6` |
| 16 | `sgs/form` | `prevColourBackgroundGradient` | `background-image` | 4 | 1 (contact-form) | `cr-ref-contact-form-1` |
| 17 | `sgs/form` | `sgsHideOnDesktop` | `display` | 4 | 1 (contact-form) | `cr-ref-contact-form-1` |
| 18 | `sgs/mega-panel` | `panelPadding` | `padding-bottom` | 4 | 1 (mega-lenses) | `cr-ref-mega-lenses-1` |
| 19 | `sgs/mega-panel` | `panelPadding` | `padding-left` | 4 | 1 (mega-lenses) | `cr-ref-mega-lenses-1` |
| 20 | `sgs/mega-panel` | `panelPadding` | `padding-right` | 4 | 1 (mega-lenses) | `cr-ref-mega-lenses-1` |
| 21 | `sgs/mega-panel` | `panelPadding` | `padding-top` | 4 | 1 (mega-lenses) | `cr-ref-mega-lenses-1` |
| 22 | `sgs/nav-bar-menu` | `burgerMorphDuration` | `transition-duration` | 4 | 1 (mega-lenses) | `cr-ref-mega-lenses-1` |
| 23 | `sgs/container` | `alignItems` | `align-items` | 3 | 2 (footer, product) | `cr-ref-footer-6` |
| 24 | `sgs/container` | `backgroundOverlayColour` | `painted-ground` | 3 | 2 (mega-brands, product) | `cr-ref-mega-brands-5` |
| 25 | `sgs/container` | `fontWeight` | `font-weight` | 3 | 2 (mega-brands, product) | `cr-ref-mega-brands-4` |
| 26 | `sgs/container` | `gap` | `column-gap` | 3 | 2 (product, shop) | `cr-ref-product-4` |
| 27 | `sgs/container` | `gap` | `row-gap` | 3 | 2 (product, shop) | `cr-ref-product-4` |
| 28 | `sgs/container` | `gridItemBorder` | `border-bottom-width` | 3 | 2 (header, product) | `cr-ref-header-13` |
| 29 | `sgs/container` | `gridItemBorder` | `border-left-width` | 3 | 2 (header, product) | `cr-ref-header-13` |
| 30 | `sgs/container` | `gridItemBorder` | `border-right-width` | 3 | 2 (header, product) | `cr-ref-header-13` |
| 31 | `sgs/container` | `gridItemBorder` | `border-top-width` | 3 | 2 (header, product) | `cr-ref-header-13` |
| 32 | `sgs/container` | `margin` | `margin-bottom` | 3 | 2 (mega-brands, shop) | `cr-ref-mega-brands-5` |
| 33 | `sgs/container` | `maxWidth` | `max-width` | 3 | 2 (mobile-menu, shop) | `cr-ref-mobile-menu-0` |
| 34 | `sgs/heading` | `boxShadowHover` | `box-shadow` | 3 | 1 (footer) | `cr-ref-footer-6` |
| 35 | `sgs/choice-flow-question` | `questionFontWeight` | `font-weight` | 2 | 1 (lens) | `cr-ref-lens-0` |
| 36 | `sgs/container` | `backgroundSize` | `object-fit` | 2 | 2 (mega-brands, shop) | `cr-ref-mega-brands-41` |
| 37 | `sgs/container` | `bgHoverZoomScale` | `transform` | 2 | 1 (product) | `cr-ref-product-4` |
| 38 | `sgs/container` | `borderColourHover` | `border-top-color` | 2 | 1 (footer) | `cr-ref-footer-9` |
| 39 | `sgs/container` | `letterSpacing` | `letter-spacing` | 2 | 2 (mega-brands, product) | `cr-ref-mega-brands-4` |
| 40 | `sgs/buybox` | `galleryColumnGap` | `column-gap` | 1 | 1 (product) | `cr-ref-product-10` |
| 41 | `sgs/buybox` | `galleryColumnGap` | `gap` | 1 | 1 (product) | `cr-ref-product-10` |
| 42 | `sgs/buybox` | `galleryColumnGap` | `row-gap` | 1 | 1 (product) | `cr-ref-product-10` |
| 43 | `sgs/buybox` | `priceLineHeight` | `line-height` | 1 | 1 (product) | `cr-ref-product-10` |
| 44 | `sgs/buybox` | `sgsHideOnDesktop` | `display` | 1 | 1 (product) | `cr-ref-product-5` |
| 45 | `sgs/container` | `backgroundImage` | `background-image` | 1 | 1 (shop) | `cr-ref-shop-5` |
| 46 | `sgs/container` | `bgSvgOpacity` | `opacity` | 1 | 1 (shop) | `cr-ref-shop-5` |
| 47 | `sgs/container` | `flexDirection` | `flex-direction` | 1 | 1 (mega-brands) | `cr-ref-mega-brands-8` |
| 48 | `sgs/container` | `flexWrap` | `flex-wrap` | 1 | 1 (footer) | `cr-ref-footer-6` |
| 49 | `sgs/container` | `fontFamily` | `font-family` | 1 | 1 (mega-brands) | `cr-ref-mega-brands-4` |
| 50 | `sgs/container` | `fontStyle` | `font-style` | 1 | 1 (mobile-menu) | `cr-ref-mobile-menu-0` |
| 51 | `sgs/container` | `gridItemBorder` | `border-top-style` | 1 | 1 (header) | `cr-ref-header-13` |
| 52 | `sgs/container` | `gridItemBorderRadius` | `border-radius` | 1 | 1 (shop) | `cr-ref-shop-22` |
| 53 | `sgs/container` | `justifyContent` | `justify-content` | 1 | 1 (header) | `cr-ref-header-13` |
| 54 | `sgs/container` | `margin` | `margin-top` | 1 | 1 (shop) | `cr-ref-shop-2` |
| 55 | `sgs/container` | `minHeight` | `min-height` | 1 | 1 (shop) | `cr-ref-shop-22` |
| 56 | `sgs/container` | `textDecoration` | `text-decoration-line` | 1 | 1 (shop) | `cr-ref-shop-2` |
| 57 | `sgs/container` | `textTransform` | `text-transform` | 1 | 1 (mega-brands) | `cr-ref-mega-brands-4` |
| 58 | `sgs/form` | `margin` | `margin-top` | 1 | 1 (contact-form) | `cr-ref-contact-form-5` |
| 59 | `sgs/form-step` | `borderRadius` | `border-radius` | 1 | 1 (lens) | `cr-ref-lens-0` |
| 60 | `sgs/form-step` | `textColour` | `color` | 1 | 1 (lens) | `cr-ref-lens-8` |
| 61 | `sgs/heading` | `fontSize` | `font-size` | 1 | 1 (size-guide) | `cr-ref-size-guide-2` |
| 62 | `sgs/mega-panel` | `groupBorderColourHover` | `border-top-color` | 1 | 1 (mega-sunglasses) | `cr-ref-mega-sunglasses-27` |
| 63 | `sgs/modal` | `borderWidth` | `border-bottom-width` | 1 | 1 (lens) | `cr-ref-lens-0` |
| 64 | `sgs/modal` | `borderWidth` | `border-right-width` | 1 | 1 (lens) | `cr-ref-lens-0` |
| 65 | `sgs/modal` | `dialogShadow` | `box-shadow` | 1 | 1 (lens) | `cr-ref-lens-0` |
| 66 | `sgs/nav-bar-menu` | `scrimBlur` | `backdrop-filter` | 1 | 1 (mega-brands) | `cr-ref-mega-brands-41` |
| 67 | `sgs/site-header-row` | `alignItems` | `align-items` | 1 | 1 (header) | `cr-ref-header-0` |
| 68 | `sgs/tabs` | `tabFontSize` | `font-size` | 1 | 1 (product) | `cr-ref-product-13` |
| 69 | `sgs/trust-bar` | `labelTextTransform` | `text-transform` | 1 | 1 (header) | `cr-ref-header-3` |
