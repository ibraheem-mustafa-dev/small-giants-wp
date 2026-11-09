# K saved usage of media-related blocks (read-only scan, 2026-11-09)

Scan: parse_blocks over every publish/draft/private/pending/future post of every post type (incl. templates, parts, headers, footers, patterns, forms, choice flows) whose content contains an sgs block. Script: k/scan.php, aggregation k/agg.py, raw per-site JSON in k/*.json.

## eye-care-test

Posts scanned with sgs blocks: 38. By type: page 13, sgs_choice_flow 1, sgs_drawer 10, sgs_footer 1, sgs_form 1, sgs_header 1, sgs_mega_menu 4, sgs_modal 1, wp_template 4, wp_template_part 2

| block | blocks | with bg attr | sgsCustomCss with text | motion parts |
|---|---|---|---|---|
| sgs/buybox | 1 | 0 | 1 | v:1, elements:1 |
| sgs/card-grid | 2 | 1 | 0 | v:2, elements:2, stagger:1 |
| sgs/container | 201 | 102 | 1 | v:24, elements:22, stagger:8 |
| sgs/gallery | 1 | 0 | 0 |  |
| sgs/hero | 2 | 2 | 1 | v:1, elements:1 |
| sgs/media | 3 | 0 | 0 | v:1, elements:1 |
| sgs/product-card | 11 | 0 | 0 | v:11, elements:11 |

## indus-test

Posts scanned with sgs blocks: 59. By type: page 24, post 6, sgs_drawer 11, sgs_footer 1, sgs_form 4, sgs_header 1, sgs_mega_menu 5, wp_template 7

| block | blocks | with bg attr | sgsCustomCss with text | motion parts |
|---|---|---|---|---|
| sgs/container | 984 | 257 | 5 | v:179, elements:179 |
| sgs/decorative-image | 86 | 8 | 0 | v:76, elements:76 |
| sgs/gallery | 1 | 0 | 0 | v:1, elements:1, stagger:1 |
| sgs/hero | 25 | 25 | 1 | v:15, elements:15 |
| sgs/media | 70 | 0 | 0 | v:1, elements:1 |

## mamas-test

Posts scanned with sgs blocks: 42. By type: page 12, sgs_choice_flow 1, sgs_drawer 11, sgs_footer 2, sgs_form 2, sgs_header 1, sgs_mega_menu 1, wp_template 11, wp_template_part 1

| block | blocks | with bg attr | sgsCustomCss with text | motion parts |
|---|---|---|---|---|
| sgs/buybox | 2 | 0 | 0 | v:2, elements:2 |
| sgs/container | 244 | 67 | 0 | v:38, elements:38 |
| sgs/decorative-image | 19 | 16 | 0 |  |
| sgs/gallery | 1 | 0 | 0 | v:1, elements:1 |
| sgs/hero | 8 | 8 | 0 | v:1, elements:1 |
| sgs/media | 21 | 0 | 0 | v:1, elements:1 |
| sgs/product-card | 7 | 5 | 0 | v:5, elements:5 |

## eye-care-clone-test

Posts scanned with sgs blocks: 40. By type: page 7, sgs_choice_flow 1, sgs_drawer 11, sgs_footer 1, sgs_form 1, sgs_header 1, sgs_mega_menu 5, sgs_modal 1, wp_template 12

| block | blocks | with bg attr | sgsCustomCss with text | motion parts |
|---|---|---|---|---|
| sgs/card-grid | 4 | 0 | 1 |  |
| sgs/container | 418 | 91 | 15 | v:30, elements:30 |
| sgs/gallery | 1 | 0 | 0 |  |
| sgs/hero | 7 | 6 | 0 | v:3, elements:3 |
| sgs/media | 17 | 0 | 0 | v:1, elements:1 |
| sgs/product-card | 3 | 0 | 0 |  |

## sandybrown

Posts scanned with sgs blocks: 288. By type: page 244, post 1, sgs_choice_flow 3, sgs_drawer 16, sgs_footer 3, sgs_form 1, sgs_header 7, sgs_mega_menu 12, wp_template_part 1

| block | blocks | with bg attr | sgsCustomCss with text | motion parts |
|---|---|---|---|---|
| sgs/buybox | 6 | 0 | 0 |  |
| sgs/card-grid | 20 | 0 | 0 | v:4, elements:4, stagger:4 |
| sgs/container | 395 | 97 | 1 | v:63, elements:63 |
| sgs/decorative-image | 5 | 0 | 0 | v:2, elements:2 |
| sgs/gallery | 10 | 0 | 0 |  |
| sgs/hero | 16 | 5 | 1 | v:1, elements:1 |
| sgs/media | 39 | 0 | 0 | v:2, elements:2 |
| sgs/product-card | 27 | 3 | 0 |  |

## Aggregate (all five sites)

| block | total | per site |
|---|---|---|
| sgs/buybox | 9 | {'eye-care-test': 1, 'mamas-test': 2, 'sandybrown': 6} |
| sgs/card-grid | 26 | {'eye-care-test': 2, 'eye-care-clone-test': 4, 'sandybrown': 20} |
| sgs/container | 2242 | {'eye-care-test': 201, 'indus-test': 984, 'mamas-test': 244, 'eye-care-clone-test': 418, 'sandybrown': 395} |
| sgs/decorative-image | 110 | {'indus-test': 86, 'mamas-test': 19, 'sandybrown': 5} |
| sgs/gallery | 14 | {'eye-care-test': 1, 'indus-test': 1, 'mamas-test': 1, 'eye-care-clone-test': 1, 'sandybrown': 10} |
| sgs/hero | 58 | {'eye-care-test': 2, 'indus-test': 25, 'mamas-test': 8, 'eye-care-clone-test': 7, 'sandybrown': 16} |
| sgs/media | 150 | {'eye-care-test': 3, 'indus-test': 70, 'mamas-test': 21, 'eye-care-clone-test': 17, 'sandybrown': 39} |
| sgs/product-card | 48 | {'eye-care-test': 11, 'mamas-test': 7, 'eye-care-clone-test': 3, 'sandybrown': 27} |

### sgs/buybox: 9 blocks, 0 carry a background* attribute, motion parts {'v': 3, 'elements': 3}

| attribute | blocks carrying it | values (top 8) |
|---|---|---|
| addToCartLabel | 3 | Add to basket:2, Add to bag as they are:1 |
| showLadder | 3 | false:3 |
| showStockStatus | 3 | false:2, true:1 |
| pickerSwatchStyle | 3 | outlined:2, tile:1 |
| pickerStyle | 3 | outlined:3 |
| pickerLabelFontSize | 3 | <array:desktop>:3 |
| pickerLabelLetterSpacing | 3 | <array:desktop>:3 |
| pickerLabelTextTransform | 3 | uppercase:3 |
| pickerLabelColour | 3 | mm-cocoa:2, text:1 |
| addToCartStyle | 3 | primary:2, outline:1 |
| addToCartShowPrice | 3 | true:3 |
| addToCartFontWeight | 3 | 700:2, 400:1 |
| addToCartFontSize | 3 | <array:desktop>:3 |
| addToCartBorderColour | 3 | mm-cocoa:2, text:1 |
| addToCartBackgroundColour | 3 | mm-yellow:2, surface-alt:1 |
| addToCartMinHeight | 3 | 64px:2, 56px:1 |
| addToCartShowIcon | 3 | false:3 |
| sgsMotion | 3 |  |
| className | 3 | cr-ref-product-4:1, cr-ref-home-41b:1, cr-ref-product-18:1 |
| pickerPillBorderWidth | 3 | 2px:2, 1px:1 |
| pickerPillFontSize | 3 | <array:desktop,tablet,mobile>:2, <array:desktop>:1 |
| buyboxLayout | 3 | configurator:2, guided:1 |
| dragToScroll | 3 | true:3 |
| dragMomentum | 3 | true:3 |
| stickyEnabled | 2 | true:2 |
| stickyOffset | 2 | 24px:1, 23px:1 |
| stackBelow | 2 | tablet:1, mobile:1 |
| galleryColumnRatio | 2 | 1.353:1, 1.05:1 |
| galleryColumnGap | 2 | 60px:1, <array:desktop,tablet,mobile>:1 |
| thumbGap | 2 | 2px:1, 10px:1 |
| galleryThumbBorderWidth | 2 | <array:top,right,bottom,left>:2 |
| galleryThumbBorderColour | 2 | border:1, mm-cocoa:1 |
| galleryThumbBorderColourCurrent | 2 | text:1, mm-cocoa:1 |
| galleryThumbBorderRadius | 2 | <array:topLeft,topRight,bottomRight,bottomLeft>:2 |
| extrasBeforeCount | 2 | 3:1, 4:1 |
| extrasBeforeCartCount | 2 | 1:2 |
| mainPhotoBackgroundColour | 2 | surface-stage:1, mm-image-bg:1 |
| mainPhotoBorderWidth | 2 | <array:top,right,bottom,left>:2 |
| mainPhotoBorderStyle | 2 | solid:2 |
| mainPhotoBorderColour | 2 | border:1, mm-cocoa:1 |
| mainPhotoRadius | 2 | 1:1, 28px:1 |
| groupStyles | 2 | <array:pa_pack-size,pa_base,pa_chip,pa_flavour>:2 |
| summaryText | 2 | Your {pack}: {split}:2 |
| pickerShowSelectedTick | 2 | false:2 |
| stickyBar | 2 | <array:mobile,tablet,desktop>:2 |
| stickyBarBackground | 2 | mm-paper:2 |
| stickyBarText | 2 | mm-cocoa:2 |
| stickyBarBorderColour | 2 | mm-cocoa:2 |
| addToCartHoverLift | 2 | false:2 |
| previewLayerAxis | 2 | pa_chip:2 |
| pickHideGallery | 2 | true:1, false:1 |
| previewBackgroundColour | 2 | #FFFAF0:2 |
| previewBorderColour | 2 | mm-cocoa:2 |
| previewBorderWidth | 2 | 2px:2 |
| previewRadius | 2 | 28px:2 |
| previewPadding | 2 | <array:desktop,tablet,mobile>:2 |
| pickSummaryFontFamily | 2 | caveat:1, body:1 |
| pickSummaryFontSize | 2 | <array:desktop,tablet,mobile>:2 |
| pickSummaryColour | 2 | mm-cocoa:2 |
| pickSelectedBackgroundColour | 2 | mm-yellow:2 |
| pickSelectedBorderColour | 2 | mm-cocoa:2 |
| pickOptionRadius | 2 | 999px:2 |
| pickOptionPadding | 2 | <array:desktop,tablet,mobile>:2 |
| pickOptionGap | 2 | 8px:2 |
| pickTilePadding | 2 | <array:desktop,tablet,mobile>:2 |
| pickTileGap | 2 | 10px:2 |
| pickPricedRadius | 2 | 999px:2 |
| pickPricedPadding | 2 | <array:desktop,tablet,mobile>:2 |
| pickPricedGap | 2 | 8px:2 |
| pickPricedFontSize | 2 | <array:desktop,tablet,mobile>:2 |
| pickTileNumberSize | 2 | <array:desktop,tablet,mobile>:2 |
| pickTilePriceSize | 2 | <array:desktop,tablet,mobile>:2 |
| pickTileEachSize | 2 | <array:desktop,tablet,mobile>:2 |
| pickPricedLayout | 2 | auto:2 |
| pickPricedMinHeight | 2 | <array:desktop>:2 |
| pickBadgeBackgroundColour | 2 | mm-pink:2 |
| pickBadgeTextColour | 2 | mm-cocoa:2 |
| pickGroupNumbers | 2 | true:2 |
| pickGroupHeadings | 2 | <array:pa_pack-size,pa_base,pa_chip,pa_flavour>:2 |
| pickerLabelFontWeight | 2 | 700:2 |
| pickerHintColour | 2 | mm-muted:2 |
| pickerPillBackgroundColour | 2 | mm-paper:2 |
| pickerPillBorderColour | 2 | mm-cocoa:2 |
| pickerPillFontWeight | 2 | 700:2 |
| pickerPillSelectedShadow | 2 | 3px 3px 0 0:2 |
| pickerPillSelectedShadowColour | 2 | mm-cocoa:2 |
| pickerPillSelectedOffsetX | 2 | -2px:2 |
| pickerPillSelectedOffsetY | 2 | -2px:2 |
| pickerPillHoverOffsetX | 2 | -2px:2 |
| pickerPillHoverOffsetY | 2 | -2px:2 |
| pickerPillHoverStill | 2 | true:2 |
| pickSelectedTextColour | 2 | mm-cocoa:2 |
| pickerDotShape | 2 | round:2 |
| pickerDotSize | 2 | 22px:1, 20px:1 |
| pickerGroupDotSize | 2 | 22px:2 |
| pickerDotRingThickness | 2 | 2px:2 |
| pickerDotRingColour | 2 | mm-cocoa:2 |
| pickerDotTickInside | 2 | true:2 |
| pickerDotTickColour | 2 | mm-white:2 |
| pickTilePriceLine | 2 | true:2 |
| pickTileColumns | 2 | <array:desktop,tablet,mobile>:2 |
| pickTileNumberWeight | 2 | 400:2 |
| pickTilePriceWeight | 2 | 700:2 |
| addToCartShadow | 2 | 4px 4px 0 0:2 |
| addToCartShadowColour | 2 | mm-cocoa:2 |
| addToCartShadowHover | 2 | 7px 7px 0 0:2 |
| anchor | 2 | bb-1:1, bb-2:1 |
| rrpMetaKey | 1 | _sgs_rrp:1 |
| rrpPillBackgroundColour | 1 | accent-light:1 |
| rrpPillTextColour | 1 | accent-text:1 |
| stockInStockColour | 1 | success:1 |
| thumbsPerRow | 1 | <array:desktop,tablet,mobile>:1 |
| thumbStripOffset | 1 | 2px:1 |
| thumbSelectedScale | 1 | 100:1 |
| pickerSubLabelMetaKey | 1 | _sgs_size_measure:1 |
| priceFontFamily | 1 | heading:1 |
| priceFontSize | 1 | <array:desktop>:1 |
| priceFontWeight | 1 | 500:1 |
| priceLineHeight | 1 | <array:desktop>:1 |
| pickerLabelLetterSpacingUnit | 1 | em:1 |
| pickerShowSelectedValue | 1 | true:1 |
| pickerAlwaysShowAxes | 1 | <array:0>:1 |
| pickerBandAxis | 1 | pa_frame-size:1 |
| pickerBandScale | 1 | S:52,M:57,L:1 |
| pickerLabelLinkAxis | 1 | pa_frame-size:1 |
| pickerLabelLinkText | 1 | Which size am I?:1 |
| pickerLabelLinkUrl | 1 | #size-guide:1 |
| rrpShowPrice | 1 | true:1 |
| rrpSavingPrefix | 1 | You save:1 |
| addToCartTextTransform | 1 | uppercase:1 |
| addToCartLetterSpacing | 1 | <array:desktop>:1 |
| addToCartLetterSpacingUnit | 1 | em:1 |
| stockInStockLabel | 1 | In stock — dispatched next working day:1 |
| stockLinePosition | 1 | above:1 |
| stockLineHairline | 1 | true:1 |
| stockFontWeight | 1 | 400:1 |
| pickerOptionFontSize | 1 | <array:desktop>:1 |
| pickerOptionFontWeight | 1 | 400:1 |
| pickerOptionLetterSpacing | 1 | <array:desktop>:1 |
| pickerOptionLetterSpacingUnit | 1 | em:1 |
| pickerOptionColour | 1 | text-soft:1 |
| pickerValueFontSize | 1 | <array:desktop>:1 |
| pickerValueColour | 1 | text-subtle:1 |
| rrpChipFontSize | 1 | <array:desktop>:1 |
| rrpChipFontSizeUnit | 1 | px:1 |
| rrpChipFontWeight | 1 | 400:1 |
| rrpChipLetterSpacing | 1 | <array:desktop>:1 |
| rrpChipLetterSpacingUnit | 1 | em:1 |
| rrpPillPadding | 1 | <array:top,right,bottom,left>:1 |
| pickerPillFontSizeUnit | 1 | px:1 |
| pickerLabelLinkColour | 1 | #6B655E:1 |
| pickerLabelLinkUnderlineColour | 1 | #C9C2B8:1 |
| pickerLabelLinkPadding | 1 | <array:top,right,bottom,left>:1 |
| sgsCustomCss | 1 |  |
| sgsCustomCssId | 1 | r5bbox:1 |
| sgsCustomCssNote | 1 | <long>:1 |
| stockFontSize | 1 | <array:desktop>:1 |
| rrpPillRadius | 1 | 1:1 |
| priceRowGap | 1 | 14px:1 |
| rrpPriceFontSize | 1 | <array:desktop>:1 |
| rrpPriceFontSizeUnit | 1 | px:1 |
| addToCartPadding | 1 | <array:left,right>:1 |
| stockLineHairlineMargin | 1 | <array:top,bottom>:1 |
| pickerPillSelectedTextColour | 1 | #FAF8F5:1 |
| buyboxProductId | 1 | 257:1 |
| mainPhotoShadow | 1 | 8px 8px 0 0:1 |
| mainPhotoShadowColour | 1 | mm-cocoa:1 |
| galleryThumbSize | 1 | <array:desktop,tablet,mobile>:1 |
| pickHidePreview | 1 | true:1 |
| pickerBoxBackgroundColour | 1 | mm-pink-soft:1 |
| pickerBoxBorderColour | 1 | mm-cocoa:1 |
| pickerBoxBorderWidth | 1 | 2px:1 |
| pickerBoxRadius | 1 | 28px:1 |
| pickerBoxPadding | 1 | <array:desktop,tablet,mobile>:1 |
| pickerBoxGap | 1 | <array:desktop,tablet,mobile>:1 |
| pickSummaryFontWeight | 1 | 700:1 |
| galleryStickerText | 1 | baked with love:1 |
| galleryStickerPosition | 1 | bottom-right:1 |
| galleryStickerOffsetX | 1 | 14px:1 |
| galleryStickerOffsetY | 1 | 14px:1 |
| galleryStickerBackgroundColour | 1 | mm-pink:1 |
| galleryStickerTextColour | 1 | mm-cocoa:1 |
| galleryStickerBorderWidth | 1 | <array:top,right,bottom,left>:1 |
| galleryStickerBorderStyle | 1 | solid:1 |
| galleryStickerBorderColour | 1 | mm-cocoa:1 |
| galleryStickerShape | 1 | tag:1 |
| galleryStickerRotation | 1 | -4:1 |
| galleryStickerPadding | 1 | <array:top,right,bottom,left>:1 |
| galleryStickerFontFamily | 1 | caveat:1 |
| galleryStickerFontSize | 1 | <array:desktop>:1 |
| galleryStickerLineHeight | 1 | <array:desktop>:1 |
| loopCarousel | 1 | true:1 |

### sgs/card-grid: 26 blocks, 1 carry a background* attribute, motion parts {'v': 6, 'elements': 6, 'stagger': 5}

| attribute | blocks carrying it | values (top 8) |
|---|---|---|
| items | 11 | <array:0,1,2,3,4,5,6,7>:6, <array:0,1,2>:2, <array:0,1,2,3,4,5>:1, <array:0,1,2,3,4,5,6>:1, <array:0,1,2,3>:1 |
| className | 8 | cr-ref-home-53:1, cr-ref-mega-brands-5:1, cr-ref-mega-menu-sunglasses-1:1, cr-ref-mega-menu-brands-1:1, cr-ref-mega-menu-lenses-1:1, cr-ref-mega-menu-help-1:1, t1-gridA:1, t1-gridC:1 |
| columns | 6 | <array:desktop,tablet,mobile>:5, <array:desktop>:1 |
| sgsMotion | 6 |  |
| source | 6 | wc-product:3, cpt-collection:3 |
| layout | 5 | grid:5 |
| gap | 4 | <array:desktop>:3, <array:desktop,tablet,mobile>:1 |
| titleColour | 3 | text-inverse:1, text:1, #FFFFFF:1 |
| cardBackground | 3 | surface-stage:1, surface-alt:1, #0A7EA8:1 |
| cardRadius | 3 | 1:1, 8px:1, 18px:1 |
| variant | 2 | overlay:1, card:1 |
| aspectRatio | 2 | 4 / 5:1, 3 / 4:1 |
| titleFontSize | 2 | <array:desktop>:2 |
| cardPadding | 2 | <array:desktop>:2 |
| cardShadowHover | 2 | 0 18px 44px:1, floating:1 |
| titleFontWeight | 2 | 400:1, 500:1 |
| subtitleColour | 2 | text-label:1, rgba(255,255,255,.82):1 |
| productCollection | 2 | top-rated:1, best-selling:1 |
| selectionRule | 2 | handpicked:2 |
| handpickedIds | 2 | <array:0>:2 |
| cardBorderColour | 1 | border:1 |
| cardBorderWidth | 1 | <array:top,right,bottom,left>:1 |
| borderColourHover | 1 | border-hover:1 |
| cardShadowColourHover | 1 | primary 10%:1 |
| glyphSize | 1 | 72px:1 |
| glyphColour | 1 | text-inverse:1 |
| imageFallback | 1 | true:1 |
| imageFallbackColour | 1 | #2B2721:1 |
| overlayGradient | 1 | <long>:1 |
| noImageLabel | 1 | Photo to come:1 |
| noImageLabelFontSize | 1 | <array:desktop>:1 |
| noImageLabelFontWeight | 1 | 400:1 |
| noImageLabelLetterSpacing | 1 | <array:desktop>:1 |
| noImageLabelTextTransform | 1 | uppercase:1 |
| noImageLabelColour | 1 | rgba(250,248,245,0.5):1 |
| style | 1 | <array:typography>:1 |
| shadowLiftOnHover | 1 | false:1 |
| headingLevel | 1 | p:1 |
| imagePadding | 1 | <array:desktop>:1 |
| imageHeight | 1 | <array:desktop>:1 |
| subtitleFontSize | 1 | <array:desktop>:1 |
| cardShadow | 1 | none:1 |
| backgroundColourHover | 1 | #F7F4EF:1 |
| gridTemplateColumns | 1 | <array:desktop,tablet,mobile>:1 |
| titleMarginBottom | 1 | 6px:1 |
| titleFontFamily | 1 | heading:1 |
| titleLetterSpacing | 1 | <array:desktop>:1 |
| titleTextTransform | 1 | uppercase:1 |
| subtitleLetterSpacing | 1 | <array:desktop>:1 |
| subtitleTextTransform | 1 | none:1 |
| sgsCustomCss | 1 |  |
| sgsCustomCssId | 1 | wgate1:1 |
| sgsCustomCssNote | 1 | <long>:1 |
| titleColourHover | 1 | custom-text-3:1 |
| cardShadowColour | 1 | primary:1 |
| productLimit | 1 | 3:1 |
| contentType | 1 | product:1 |
| count | 1 | 4:1 |
| separators | 1 | <array:row,column>:1 |
| emptyMessage | 1 | Nothing here yet:1 |
| scaleHover | 1 | 1:1 |

### sgs/container: 2242 blocks, 614 carry a background* attribute, motion parts {'v': 334, 'elements': 332, 'stagger': 8}

| attribute | blocks carrying it | values (top 8) |
|---|---|---|
| className | 1842 | cr-ref-contact-0:4, cr-ref-home-43:4, cr-ref-home-61:4, sgs-shop-toolbar:4, sgs-site-footer__links:4, cr-ref-help-0:3, cr-ref-help-7:3, cr-ref-about-0:3 |
| tagName | 1712 | div:1584, main:70, section:23, figure:13, nav:9, aside:7, article:5, footer:1 |
| textColourHover | 1516 | ink:786, primary:345, primary-text:252, accent-text:60, #1E2A3C:13, #E6ECF1:10, custom-text-faint:8, text:7 |
| layout | 1291 | flex:556, stack:491, grid:242, :2 |
| padding | 898 | <array:desktop>:460, <array:desktop,tablet,mobile>:207, <array:mobile,tablet,desktop>:166, <array:desktop,mobile>:23, <array:top,bottom>:20, <array:top,bottom,left,right>:17, <array:bottom>:3, <array:left,right,top>:1 |
| contentWidth | 874 | <array:desktop>:872, <array:desktop,tablet,mobile>:1, <array:>:1 |
| gap | 819 | <array:desktop>:676, <array:mobile,tablet,desktop>:70, <array:desktop,tablet,mobile>:37, <array:mobile,desktop>:11, <array:desktop,mobile,tablet>:9, <array:mobile>:6, <array:tablet>:5, <array:desktop,mobile>:4 |
| alignItems | 579 | <array:desktop>:401, center:92, <array:desktop,tablet,mobile>:28, baseline:19, flex-end:18, flex-start:17, start:2, <array:desktop,mobile>:1 |
| backgroundColour | 491 | surface-alt:129, primary-text:81, #EAF4F7:39, #FFFFFF:22, primary:17, surface:17, custom-surface-alt:16, border:13 |
| borderWidth | 456 | <array:right,bottom,left,top>:280, <array:top,right,left,bottom>:82, <array:top,right,bottom,left>:79, <array:bottom>:5, <array:top>:3, <array:bottom,left,right,top>:3, <array:desktop,tablet,mobile>:2, <array:left>:1 |
| borderColour | 411 | border:78, #1E2A3C1C:61, #1E2A3C1F:44, #1E2A3C1A:38, primary-text:20, rgba(30,42,60,0.09):16, #0A7EA847:15, mm-cocoa:15 |
| borderColourHover | 375 | primary-text:63, #0A7EA866:63, #1E2A3C1F:41, border:33, #1E2A3C1A:28, border-hover:17, #0A7EA847:15, border-light:14 |
| sgsMotion | 334 |  |
| backgroundColourHover | 324 | primary-text:81, surface-alt:67, #EAF4F7:38, #0A7EA80B:28, custom-surface-alt:17, #FFFFFF24:12, section:11, primary:10 |
| minHeight | 292 | <array:desktop>:240, <array:desktop,tablet,mobile>:24, <array:mobile,desktop>:17, <array:desktop,mobile>:6, <array:mobile,tablet,desktop>:3, <array:tablet,mobile>:2 |
| borderRadius | 280 | <array:desktop>:270, <array:desktop,tablet,mobile>:9, <array:tablet>:1 |
| justifyContent | 270 | space-between:207, center:49, flex-start:9, flex-end:4, space-evenly:1 |
| overflow | 231 | hidden:155, clip:76 |
| gridTemplateColumns | 223 | <array:mobile,tablet,desktop>:62, <array:tablet,desktop>:57, <array:mobile,desktop>:42, <array:desktop,tablet,mobile>:25, <array:desktop>:15, <array:desktop,mobile,tablet>:10, <array:desktop,mobile>:10, <array:desktop,tablet>:2 |
| margin | 206 | <array:desktop>:138, <array:desktop,tablet,mobile>:27, <array:mobile,tablet,desktop>:11, <array:desktop,tablet>:10, <array:mobile,desktop>:7, <array:desktop,mobile>:6, <array:mobile>:4, <array:tablet,desktop>:3 |
| textColour | 192 | ink:43, primary-text:35, accent-text:23, #1E2A3C:13, text-inverse:12, #E6ECF1:10, text:8, custom-text-faint:8 |
| maxWidth | 179 | <array:desktop>:172, <array:desktop,tablet,mobile>:7 |
| shadowHover | 178 | rgba(7, 60, 80, 0.5) 0px 26px 46px -28px:63, <long>:25, rgb(58, 42, 34) 8px 8px 0px 0px:20, rgba(20, 20, 20, 0.09) 0px 18px 44px 0px:14, rgba(7, 50, 70, 0.6) 0px 30px 50px -26px:12, rgba(0, 0, 0, 0.18) 0px 16px 36px 0px:10, rgb(58, 42, 34) 6px 6px 0px 0px:5, rgb(58, 42, 34) 5px 5px 0px 0px:5 |
| fontSize | 140 | <array:desktop>:138, <array:mobile,tablet,desktop>:2 |
| sgsChildSizing | 136 | <array:desktop>:101, <array:desktop,tablet,mobile>:33, <array:tablet>:2 |
| sgsFocusRests | 131 | true:131 |
| sgsBlockLink | 89 | #:14, /brands/:7, /food-service/:5, #register-interest:4, /manufacturing/:4, /retail/:4, /wholesale/:4, /:3 |
| shadow | 87 | <long>:29, rgba(0, 0, 0, 0.04) 0px 1px 0px 0px:12, lifted:11, md:8, rgb(58, 42, 34) 8px 8px 0px 0px:5, rgba(0, 0, 0, 0.6) 0px 24px 36px -18px:4, none:4, rgb(58, 42, 34) 6px 6px 0px 0px:3 |
| flexWrap | 86 | wrap:70, nowrap:16 |
| flexDirection | 85 | column:63, row:22 |
| fontWeight | 80 | 600:61, 700:13, 500:6 |
| sgsBlockLinkLabel | 74 | :19, <long>:9, Partner brand Distributed brand:5, 02 Manufacturing Bulk spices, pulses, nu:3, 03 Retail Retail-ready packs and white l:3, 04 Wholesale Pallet volumes and reliable:3, 01 Food Service Restaurants, takeaways,:3, Indus Foods home:2 |
| backgroundColourGradient | 71 | <long>:70, linear-gradient(#F3EAB0, #EADD7E):1 |
| anchor | 64 | main:20, sgs-shop-filters:2, reviews:2, sgs-page-about:1, sgs-page-contact:1, register-interest:1, whatsapp:1, results:1 |
| boxAspectRatio | 60 | 1 / 1:36, 4 / 3.2:15, 4 / 5:4, 4 / 3:4, 16 / 10:1 |
| textWrap | 58 | wrap:55, pretty:3 |
| borderStyle | 52 | solid:38, dashed:10, none:4 |
| textAlign | 34 | center:16, <array:desktop>:15, <array:desktop,tablet,mobile>:2, <array:desktop,mobile>:1 |
| sgsChildWidth | 33 | <array:desktop,tablet,mobile>:30, <array:desktop>:3 |
| lineHeight | 29 | <array:desktop>:27, <array:mobile,tablet,desktop>:2 |
| sgsCustomCss | 23 |  |
| sgsCustomCssId | 23 | r12cmap:1, r11dsep:1, hwhy46:1, hwhy51:1, hwhy56:1, e9a41c07:1, a7c1e9b2:1, wgate64:1 |
| lineHeightUnit | 22 | :22 |
| align | 21 | full:21 |
| columns | 20 | <array:desktop,tablet,mobile>:14, <array:desktop>:3, <array:desktop,tablet>:2, <array:desktop,mobile>:1 |
| pinEdge | 19 | <array:mobile,tablet,desktop>:15, <array:desktop,tablet,mobile>:2, <array:desktop,tablet>:1, <array:desktop,mobile>:1 |
| sgsCustomCssNote | 18 | <long>:18 |
| pinBelowHeader | 16 | <array:desktop>:16 |
| pinGap | 16 | <array:desktop>:16 |
| letterSpacing | 16 | <array:desktop>:15, <array:mobile,tablet,desktop>:1 |
| backgroundColor | 16 | surface-alt:10, surface:5, accent-light:1 |
| hoverAsCard | 13 | true:13 |
| style | 13 | <array:spacing>:9, <array:spacing,border>:3, <array:css>:1 |
| metadata | 12 | <array:name>:12 |
| ariaLabel | 12 | Shop:4, More:1, Back to top:1, Instagram:1, Shop by brand:1, 4.7 out of 5:1, WhatsApp:1, Eye Care Birmingham home:1 |
| textTransform | 11 | uppercase:11 |
| separators | 9 | <array:row,column>:7, <array:column>:1, <array:row>:1 |
| sgsBlockLinkSource | 9 | phone:3, email:3, top:2, post:2742:1 |
| backgroundImage | 7 | <array:url,id>:3, <array:id,url,alt>:2, <array:id,url>:2 |
| fontFamily | 6 | heading:4, caveat:1, roboto:1 |
| textDecoration | 6 | underline:6 |
| backgroundOverlayOpacity | 5 | <array:desktop>:4, <array:desktop,mobile>:1 |
| order | 5 | <array:desktop,mobile>:4, <array:tablet>:1 |
| backgroundOverlayColour | 4 | #000000:2, primary:1, #2e7d4f:1 |
| justifyItems | 4 | stretch:4 |
| shadowColour | 4 | primary-text:3, #000000 28%, #000000 8%:1 |
| shadowLiftOnHover | 2 | false:2 |
| headingColour | 2 | text-inverse:1, #2C3E50:1 |
| backgroundPosition | 2 | center 25%:1, top left:1 |
| sgsConditionCollectionQueryId | 2 | 11:1, 12:1 |
| sgsHideOnTablet | 2 | true:2 |
| sgsHideOnMobile | 2 | true:2 |
| backgroundSize | 2 | contain:1, auto:1 |
| surfaceTone | 2 | light:1, dark:1 |
| minColumnWidth | 2 | <array:desktop>:2 |
| surfaceBlur | 1 | 12px:1 |
| surfaceSaturate | 1 | 150:1 |
| overlayGradient | 1 | <long>:1 |
| sgsHideOnDesktop | 1 | true:1 |
| scrollSideways | 1 | <array:mobile>:1 |
| scrollItemWidth | 1 | <array:mobile>:1 |
| scrollRegionLabel | 1 | Gift boxes:1 |
| backgroundOverlayColourHover | 1 | accent-dark:1 |
| backgroundOverlayBlendMode | 1 | multiply:1 |
| backgroundRepeat | 1 | repeat:1 |
| bgSvgContent | 1 | <long>:1 |

### sgs/decorative-image: 110 blocks, 24 carry a background* attribute, motion parts {'v': 78, 'elements': 78}

| attribute | blocks carrying it | values (top 8) |
|---|---|---|
| width | 105 | <array:desktop>:90, <array:desktop,tablet,mobile>:13, <array:tablet>:2 |
| className | 104 | cr-ref-blog-14:3, cr-ref-blog-15:3, cr-ref-blog-2:2, cr-ref-about-12-bar:1, cr-ref-about-14-bar:1, cr-ref-about-17-bar:1, cr-ref-about-20-bar:1, cr-ref-about-108:1 |
| height | 95 | <array:desktop>:84, <array:desktop,tablet,mobile>:8, <array:tablet>:2, <array:mobile,tablet,desktop>:1 |
| zIndex | 91 | 0:71, 2:8, 3:8, 1:2, 4:1, 5:1 |
| borderWidth | 87 | <array:right,bottom,left,top>:77, <array:top,right,bottom,left>:10 |
| borderColour | 87 | #FFFFFF38:23, #D8CA508C:19, #FFFFFF33:19, #FFFFFF47:12, mm-cocoa:10, #D8CA5080:2, #E7D76866:1, #FFFFFF24:1 |
| borderRadius | 85 | <array:topLeft,topRight,bottomRight,bottomLeft>:77, <array:desktop,tablet,mobile>:7, <array:desktop>:1 |
| positionRight | 78 | <array:mobile,tablet,desktop>:53, <array:desktop,tablet,mobile>:22, <array:desktop>:2, <array:mobile,tablet>:1 |
| sgsMotion | 78 |  |
| positionTop | 65 | <array:desktop>:51, <array:desktop,tablet,mobile>:13, <array:tablet>:1 |
| positionBottom | 39 | <array:desktop,tablet,mobile>:22, <array:desktop>:16, <array:tablet>:1 |
| anchorTo | 31 | section:22, parent:9 |
| positionLeft | 26 | <array:desktop,tablet,mobile>:13, <array:desktop>:12, <array:mobile,tablet>:1 |
| backgroundColour | 24 | accent:8, mm-yellow:8, mm-paper:3, mm-pink:3, mm-tape:1, #EE8088BF:1 |
| rotation | 14 | <array:desktop,tablet,mobile>:9, <array:desktop>:5 |
| borderStyle | 10 | solid:10 |
| opacity | 6 | 85:3, 100:2, 70:1 |
| imageDecorative | 5 | true:5 |
| imageUrl | 5 | <long>:5 |
| positionX | 3 | <array:desktop>:3 |
| positionY | 3 | <array:desktop>:3 |
| imageId | 3 | 2888:2, 92:1 |
| boxShadow | 2 | rgb(58, 42, 34) 8px 8px 0px 0px:1, rgb(58, 42, 34) 4px 4px 0px 0px:1 |
| overflow | 2 | hidden:1, visible:1 |
| shape | 1 | circle:1 |

### sgs/gallery: 14 blocks, 0 carry a background* attribute, motion parts {'v': 2, 'elements': 2, 'stagger': 1}

| attribute | blocks carrying it | values (top 8) |
|---|---|---|
| mediaItems | 9 | <array:0,1>:2, <array:>:2, <array:0,1,2,3,4,5,6,7>:1, <array:0,1,2,3,4,5>:1, <array:0,1,2,3>:1, <array:0,1,2>:1, <array:0,1,2,3,4>:1 |
| layout | 6 | <array:desktop,tablet,mobile>:3, <array:>:2, carousel:1 |
| columns | 4 | <array:desktop,tablet,mobile>:4 |
| className | 4 | cr-ref-mega-brands-3:1, cr-ref-footer-6:1, qa-gallery:1, m310-reveal:1 |
| gap | 3 | <array:desktop>:2, <array:desktop,tablet,mobile>:1 |
| tileBorderRadius | 3 | <array:desktop>:3 |
| tileColour | 3 | #FAFAF8:1, mm-pink-soft:1, #F2F4F7:1 |
| shadowHover | 3 | 0 12px 24px -12px:1, 6px 6px 0 0:1, lifted:1 |
| enableLightbox | 3 | false:2, true:1 |
| captionColourHover | 2 | ink:1, primary:1 |
| showCaptions | 2 | false:1, true:1 |
| borderRadius | 2 | <array:topLeft,topRight,bottomRight,bottomLeft>:1, <array:desktop>:1 |
| tileBorderWidth | 2 | <array:top,right,bottom,left>:2 |
| tileBorderColour | 2 | #1E2A3C1A:1, mm-cocoa:1 |
| shadowHoverColour | 2 | rgba(0,0,0,.3):1, #3A2A22:1 |
| sgsMotion | 2 |  |
| tileMinHeight | 2 | <array:desktop,tablet,mobile>:1, <array:desktop>:1 |
| margin | 2 | <array:mobile>:1, <array:desktop>:1 |
| maxWidth | 2 | <array:desktop>:1, <array:desktop,tablet,mobile>:1 |
| aspectRatio | 1 | 174 / 64:1 |
| captionBgColour | 1 | #FFFFFFE6:1 |
| captionColour | 1 | #0B7BA8:1 |
| scaleHover | 1 | :1 |
| tileBorderColourHover | 1 | #D8CA50:1 |
| overlayColourHover | 1 | transparent:1 |
| scrollItemWidth | 1 | <array:mobile>:1 |
| scrollInset | 1 | <array:mobile>:1 |
| padding | 1 | <array:mobile>:1 |
| tileBorderStyle | 1 | solid:1 |
| alignItems | 1 | normal:1 |
| borderWidth | 1 | <array:top,bottom,left,right>:1 |
| borderStyle | 1 | none:1 |
| borderColourGradient | 1 | none:1 |
| tileFitContain | 1 | true:1 |
| carouselAutoplay | 1 | true:1 |
| carouselSpeed | 1 | 3000:1 |
| dragToScroll | 1 | true:1 |
| dragMomentum | 1 | true:1 |
| separators | 1 | <array:row,column>:1 |
| emptyMessage | 1 | Gallery coming soon:1 |
| captionReveal | 1 | true:1 |

### sgs/hero: 58 blocks, 46 carry a background* attribute, motion parts {'v': 21, 'elements': 21}

| attribute | blocks carrying it | values (top 8) |
|---|---|---|
| minHeight | 43 | <array:mobile>:39, <array:desktop,mobile>:2, <array:mobile,tablet,desktop>:1, <array:desktop>:1 |
| className | 42 | cr-ref-home-1:3, cr-ref-contact-1:3, sgs-hero:2, cr-ref-about-1:2, cr-ref-blog-1:2, cr-ref-my-account-1:2, cr-ref-shop-1:2, sgs-hero cr-ref-home-0:1 |
| backgroundColourGradient | 39 | <long>:24, none:15 |
| textColourHover | 39 | accent-text:22, primary-text:9, primary:7, ink:1 |
| flexDirection | 36 | row:36 |
| padding | 34 | <array:desktop,tablet,mobile>:32, <array:desktop,mobile>:1, <array:desktop>:1 |
| contentWidth | 32 | <array:desktop>:29, <array:desktop,tablet,mobile>:2, <array:desktop,tablet>:1 |
| variant | 28 | split:27, standard:1 |
| contentPadding | 25 | <array:desktop,tablet,mobile>:23, <array:desktop>:1, <array:desktop,mobile>:1 |
| splitMediaImageUrl | 24 | <long>:24 |
| textColour | 24 | accent-text:22, primary-text:2 |
| splitMediaImageId | 22 | 275:2, 264:2, 246:2, 70:2, 21:2, 253:1, 250:1, 273:1 |
| gap | 22 | <array:desktop,tablet,mobile>:14, <array:desktop>:4, <array:mobile,tablet,desktop>:2, <array:mobile,tablet>:1, <array:tablet>:1 |
| sgsMotion | 21 |  |
| gridTemplateColumns | 21 | <array:desktop,tablet,mobile>:14, <array:tablet,desktop>:4, <array:mobile,tablet,desktop>:1, <array:desktop>:1, <array:desktop,mobile>:1 |
| alignItems | 21 | <array:desktop>:11, <array:desktop,tablet>:6, start:3, flex-end:1 |
| splitContentOrder | 18 | <array:desktop,tablet,mobile>:15, <array:desktop,mobile>:2, <array:tablet,mobile>:1 |
| splitMediaMediaSizing | 16 | ratio:15, auto:1 |
| splitMediaBorderRadius | 16 | <array:topLeft,topRight,bottomRight,bottomLeft>:15, <array:topLeft,topRight,bottomLeft,bottomRight>:1 |
| splitMediaHeight | 16 | <array:desktop,tablet,mobile>:15, <array:desktop>:1 |
| splitMediaAspectRatio | 15 | 4 / 3:14, 3 / 2:1 |
| splitMediaBorderWidth | 15 | <array:top,right,bottom,left>:15 |
| splitMediaBorderColour | 15 | #FFFFFF:15 |
| splitMediaBoxShadow | 15 | 0 34px 60px -30px:15 |
| splitMediaBoxShadowColour | 15 | #2C3E50 70%:14, rgba(44,62,80,.7):1 |
| mediaPadding | 14 | <array:desktop,tablet,mobile>:8, <array:desktop,tablet>:6 |
| splitMediaWidth | 14 | <array:tablet,mobile>:8, <array:tablet>:6 |
| backgroundColour | 13 | mm-pink-band:7, primary:3, #141414:1, accent-light:1, surface-pink:1 |
| backgroundColourHover | 9 | mm-pink-band:6, accent-light:1, primary:1, accent:1 |
| splitMediaImageAlt | 9 | <long>:2, split:2, Sanam logo:1, Shan logo:1, Green logo:1, Lemontree logo:1, A river valley seen from above:1 |
| justifyContent | 8 | flex-start:7, space-between:1 |
| borderWidth | 7 | <array:top,right,left,bottom>:7 |
| layout | 7 | grid:6, flex:1 |
| borderColourHover | 6 | primary-text:5, border:1 |
| splitMediaObjectFit | 5 | contain:5 |
| align | 4 | full:4 |
| splitMediaBackground | 4 | #FFFFFF:4 |
| backgroundImage | 3 | <array:id,url,alt>:2, <array:url,id>:1 |
| sgsCustomCss | 3 |  |
| textWrap | 2 | wrap:2 |
| verticalAlignment | 2 | bottom:1, top:1 |
| backgroundOverlayOpacity | 2 | <array:desktop>:2 |
| overlayGradient | 2 | <long>:2 |
| sgsCustomCssId | 2 | r12hero:1, 814776f1:1 |
| backgroundPosition | 2 | 78% 45%:1, center bottom:1 |
| splitMediaObjectPosition | 2 | <array:desktop,tablet,mobile>:1, <array:desktop>:1 |
| contentGap | 2 | <array:desktop>:2 |
| backgroundOverlayColour | 2 | accent:1, #8b6f4e:1 |
| sgsCustomCssNote | 1 | <long>:1 |
| backgroundImageTablet | 1 | <array:id,url,alt>:1 |
| backgroundImageMobile | 1 | <array:id,url,alt>:1 |
| backgroundSize | 1 | cover:1 |
| splitMediaMaxWidth | 1 | <array:desktop,tablet,mobile>:1 |
| splitMediaAlign | 1 | <array:mobile>:1 |
| columns | 1 | <array:desktop,tablet,mobile>:1 |
| borderColour | 1 | border:1 |
| alignment | 1 | centre:1 |
| mediaBackground | 1 | #7A6500:1 |
| style | 1 | <array:color>:1 |
| maxWidth | 1 | <array:desktop,tablet,mobile>:1 |
| splitMediaOverlayColour | 1 | primary:1 |
| splitMediaImageUrlMobile | 1 | <long>:1 |
| splitMediaImageAltMobile | 1 | <long>:1 |

### sgs/media: 150 blocks, 0 carry a background* attribute, motion parts {'v': 6, 'elements': 6}

| attribute | blocks carrying it | values (top 8) |
|---|---|---|
| imageUrl | 124 | <long>:124 |
| imageId | 110 | 66:14, 261:7, 265:5, 259:5, 249:5, 253:4, 248:4, 260:3 |
| className | 108 | cr-ref-home-82:2, cr-ref-home-60:1, cr-ref-product-5:1, cr-ref-home-20:1, cr-ref-home-26:1, cr-ref-home-32:1, cr-ref-home-38:1, cr-ref-our-story-29:1 |
| captionColourHover | 97 | ink:50, primary-text:20, primary:15, accent-text:10, custom-wa-ink:1, success:1 |
| mediaSizing | 90 | fill:73, height:11, ratio:5, auto:1 |
| captionLineHeightUnit | 70 | :70 |
| anchor | 70 | sector-manufacturing-photo:3, sector-retail-photo:3, sector-wholesale-photo:3, sector-foodservice-photo:3, home-fs-food:1, home-mf-food:1, home-rt-food:1, home-ws-food:1 |
| imageAlt | 46 | Placeholder partner logo:5, A gift box of Zookies with a heart:3, <long>:3, About us:3, Person wearing sunglasses outdoors:2, A Zookie bun case:2, Zookies with a mug of tea:2, Strategy and planning:2 |
| objectFit | 25 | contain:13, cover:11, scale-down:1 |
| height | 21 | <array:desktop>:14, <array:desktop,tablet,mobile>:7 |
| mediaType | 19 | image:7, svg:6, video:5, lottie:1 |
| maxHeight | 17 | <array:desktop>:16, <array:desktop,mobile>:1 |
| style | 10 | <array:border>:10 |
| maxWidth | 9 | <array:desktop>:6, <array:desktop,tablet,mobile>:3 |
| caption | 8 | A unset objectFit:1, B objectFit contain:1, C objectFit scale-down:1, video default object-fit:1, svg never gets object-fit:1, case A autoplay-on muted-off:1, case B negative control:1, SMIL bypass real-path payload:1 |
| aspectRatio | 7 | 4 / 3:4, 4 / 5:2, 3 / 4:1 |
| sgsMotion | 6 |  |
| displayWidth | 6 | <array:desktop,tablet,mobile>:6 |
| svgContent | 6 | <long>:6 |
| borderRadius | 5 | <array:desktop,tablet,mobile>:3, <array:desktop>:1, <array:bottomLeft,bottomRight,topLeft,topRight>:1 |
| videoSource | 5 | internal:3, external:2 |
| videoUrl | 5 | <long>:5 |
| alignment | 4 | center:4 |
| videoMuted | 4 | false:3, true:1 |
| videoControls | 4 | true:4 |
| videoId | 3 | 2180:3 |
| videoAutoplay | 3 | false:2, true:1 |
| objectPosition | 2 | center 20%:1, 50% 20%:1 |
| svgContentTablet | 2 | <long>:2 |
| svgContentMobile | 2 | <long>:2 |
| minHeight | 1 | <array:desktop>:1 |
| sgsCustomCss | 1 |  |
| sgsCustomCssId | 1 | r12clip:1 |
| sgsCustomCssNote | 1 | <long>:1 |
| metadata | 1 | <array:bindings>:1 |
| imageBlendMode | 1 | multiply:1 |
| imageDecorative | 1 | true:1 |
| borderWidth | 1 | <array:top,right,bottom,left>:1 |
| borderStyle | 1 | solid:1 |
| borderColour | 1 | primary-text:1 |
| overlayOpacity | 1 | 100:1 |
| order | 1 | <array:desktop,mobile>:1 |
| videoCaptionsUrl | 1 | <long>:1 |
| videoCaptionsLabel | 1 | English:1 |
| videoCaptionsSrcLang | 1 | en-GB:1 |
| thumbnailId | 1 | 3459:1 |
| videoLoop | 1 | true:1 |
| imageHeight | 1 | 280:1 |

### sgs/product-card: 48 blocks, 8 carry a background* attribute, motion parts {'v': 16, 'elements': 16}

| attribute | blocks carrying it | values (top 8) |
|---|---|---|
| sourceMode | 37 | wc-product:37 |
| showPickers | 28 | false:26, true:2 |
| productId | 27 | 540:3, 950:3, 1125:3, 897:2, 3990:2, 71:1, 76:1, 81:1 |
| borderColour | 23 | #E6E1DA:9, mm-cocoa:4, #E4DFD6:2, #f5d050:2, primary:2, primary-text:1, #e5e0db:1, border:1 |
| borderWidth | 22 | <array:top,right,bottom,left>:20, <array:bottom,left,right,top>:2 |
| titleFontSize | 21 | <array:desktop>:16, <array:desktop,mobile>:4, <array:mobile,desktop>:1 |
| priceFontSize | 21 | <array:desktop>:18, <array:desktop,mobile>:3 |
| borderStyle | 21 | solid:18, none:2, dashed:1 |
| borderRadius | 19 | <array:desktop>:19 |
| showWishlist | 19 | true:19 |
| cardPadding | 18 | <array:top,right,bottom,left>:13, <array:bottom,left,right,top>:5 |
| titleFontWeight | 18 | 400:13, 500:4, 600:1 |
| priceFontWeight | 18 | 500:11, 700:5, 400:2 |
| titleLineHeight | 16 | 1.25:11, 1.2:4, 1.15:1 |
| imageAspectRatio | 16 | 1 / 1:16 |
| sgsMotion | 16 |  |
| className | 16 | cr-ref-home-16:1, cr-ref-home-17:1, cr-ref-home-18:1, cr-ref-home-19:1, cr-ref-home-20:1, cr-ref-home-21:1, cr-ref-home-22:1, cr-ref-home-23:1 |
| priceFontFamily | 15 | body:11, 'Fraunces', serif:4 |
| showRating | 15 | true:11, false:4 |
| showDescription | 14 | false:11, true:3 |
| showLadder | 14 | false:14 |
| showBrandOverlay | 13 | true:13 |
| showShadow | 13 | false:13 |
| ctaBehaviour | 13 | add-to-basket:8, learn-more:5 |
| mediaBackgroundColour | 12 | surface-stage:11, #F3E6CC:1 |
| titleFontFamily | 11 | body:11 |
| swatchHoverGrow | 11 | 112:11 |
| titleTextWrap | 11 | wrap:11 |
| brandFontSize | 11 | <array:desktop>:11 |
| brandFontFamily | 11 | heading:11 |
| brandFontWeight | 11 | 500:11 |
| brandLetterSpacing | 11 | <array:desktop>:11 |
| showSavingBadge | 11 | true:11 |
| showAttributeTag | 11 | true:11 |
| attributeTagSource | 11 | tag:11 |
| attributeTagTerm | 11 | polarised:11 |
| attributeTagText | 11 | Polarised:11 |
| attributeTagBorderColour | 11 | border-strong:11 |
| attributeTagBorderWidth | 11 | <array:top,right,bottom,left>:11 |
| attributeTagFontWeight | 11 | 400:11 |
| noImageLabel | 11 | Photo to come:11 |
| noImageLabelFontSize | 11 | <array:desktop>:11 |
| noImageLabelFontWeight | 11 | 400:11 |
| noImageLabelLetterSpacing | 11 | <array:desktop>:11 |
| noImageLabelTextTransform | 11 | uppercase:11 |
| priceRowSpaceAbove | 11 | 6px:11 |
| rrpMetaKey | 11 | _sgs_rrp:11 |
| showCta | 11 | false:11 |
| brandLogoMaxWidth | 11 | <array:desktop,mobile>:11 |
| noImageLabelColour | 11 | custom-text-faint:11 |
| priceGroupLayout | 11 | <array:mobile>:11 |
| cardShadowHover | 11 | 0 18px 44px:11 |
| cardShadowColourHover | 11 | primary 10%:11 |
| swatchMoreBorderColour | 11 | border-strong:11 |
| variantStyle | 10 | featured:6, trial:3, standard:1 |
| priceLineHeight | 9 | 27:9 |
| priceLineHeightUnit | 9 | px:9 |
| rrpColour | 9 | text-label:9 |
| borderColourHover | 9 | border-hover:9 |
| swatchSize | 9 | 17:9 |
| swatchBorderColour | 9 | border-strong:9 |
| brandPadding | 9 | <array:top,right,bottom,left>:9 |
| wishlistBorderColour | 9 | #E0DAD1:9 |
| descFontSize | 9 | <array:desktop>:9 |
| descColour | 9 | text-muted:4, mm-body:3, mm-muted:1, #5E4A3D:1 |
| ctaText | 9 | Add to basket:4, Add to Cart — £10:2, Try 3 for £5:2, Learn more:1 |
| priceNote | 9 | 8-pack · Free delivery over £35:2, 3 Classic Zookies · postage included:2, postage included:1, gift-boxed:1, 6 deliveries:1, fdhgdg:1, 12-pack · test:1 |
| backgroundColour | 7 | mm-paper:4, #ffffff:2, #FFFAF0:1 |
| priceLarge | 7 | £10.00:2, £5.00:2, sdfsdf:1, £12.00:1, 12.99:1 |
| productName | 7 | Mama's Munches Zookies:2, The Trial Pack:2, Built-in Typed Test:1, Overridden Live Card Name:1, Lactation Cookies:1 |
| titleColour | 6 | text:4, mm-cocoa:1, #3a2e26:1 |
| priceColour | 6 | text:4, mm-cocoa:1, #2d5016:1 |
| ctaWidthType | 5 | full:5 |
| priceNoteFontSize | 5 | <array:desktop>:5 |
| priceNoteColour | 5 | text-muted:4, mm-muted:1 |
| ctaFontSize | 5 | 15:5 |
| cardContentSource | 5 | product:5 |
| priceFromLowest | 5 | true:5 |
| imageSize | 5 | full:5 |
| imageFill | 5 | true:5 |
| showCtaIcon | 5 | false:5 |
| showSwatches | 5 | false:5 |
| showDescriptionTier | 5 | <array:desktop,mobile>:5 |
| cardPaddingTier | 5 | <array:mobile>:5 |
| overrideElements | 5 | <array:0,1>:3, <array:0>:2 |
| ctaUrl | 5 | /product/zookies/:2, /product/trial-pack/:2, /shop/:1 |
| description | 5 | <long>:5 |
| image | 5 | <long>:4, /products/lactation-cookies.jpg:1 |
| imageAlt | 5 | <long>:4, Lactation Cookies:1 |
| featuredTag | 4 | New? Start here:1, Gift favourite:1, Most thoughtful:1, Most popular:1 |
| tagBackgroundColour | 4 | mm-yellow:3, accent:1 |
| tagTextColour | 4 | mm-cocoa:3, text:1 |
| tagFontSize | 4 | <array:desktop>:4 |
| descLineHeight | 4 | 1.55:4 |
| tagBorderRadius | 3 | 999px:3 |
| tagFontWeight | 3 | 700:3 |
| packSizes | 3 | <array:0,1,2,3>:2, <array:0,1,2>:1 |
| priceFontSizeUnit | 3 | px:3 |
| style | 3 | <array:border>:2, <array:border,color>:1 |
| titleFontSizeUnit | 3 | px:3 |
| ctaStyle | 3 | secondary:2, primary:1 |
| sgsBlockLinkAuto | 3 | true:3 |
| ctaFontWeight | 2 | 700:2 |
| swatchAttribute | 2 | pa_gift-budget:1, pa_flavour:1 |
| cardMaxWidth | 2 | none:2 |
| textColourHover | 2 | primary-text:1, custom-text-faint:1 |
| headingLevel | 2 | h2:1, h3:1 |
| pickerPillBgColour | 2 | surface:2 |
| pickerPillTextColour | 2 | text-muted:2 |
| pickerPillBorderColour | 2 | border:2 |
| pickerPillSelectedBgColour | 2 | rgba(230,138,149,0.1):2 |
| pickerPillSelectedTextColour | 2 | text:2 |
| pickerPillSelectedBorderColour | 2 | primary:2 |
| trialTag | 2 | New? Start here:2 |
| ctaBorderStyle | 2 | solid:1, dashed:1 |
| ctaBorderWidth | 2 | <array:bottom,left,right,top>:2 |
| ctaColourBorder | 2 | border:1, accent:1 |
| descFontSizeUnit | 2 | px:2 |
| descLineHeightUnit | 2 | :2 |
| priceNoteFontSizeUnit | 2 | px:2 |
| titleLineHeightUnit | 2 | :2 |
| brandUseLogo | 2 | true:2 |
| ctaBorderRadius | 1 | <array:topLeft,topRight,bottomLeft,bottomRight>:1 |
| ctaPadding | 1 | <array:top,right,bottom,left>:1 |
| sgsHideOnMobile | 1 | true:1 |
| textColour | 1 | custom-text-faint:1 |
| cta2Text | 1 | Second action:1 |
| cta2Url | 1 | /contact/:1 |
| pillFontSize | 1 | <array:desktop>:1 |
| pillFontWeight | 1 | 600:1 |
| backgroundColourGradient | 1 | <long>:1 |
| tagFontSizeUnit | 1 | px:1 |
| showGalleryThumbs | 1 | true:1 |
| swatchMaxVisible | 1 | 2:1 |

## sgsCustomCss with text on media-related blocks (every instance)

- sgs/buybox [eye-care-test wp_template #423]: `& .buybox__stock { margin-bottom: 13.5px; } & .sgs-buybox__picker-label-row { margin-bottom: 0; } & .sgs-buybox__picker-label-row:has(.sgs-buybox__picker-label-link) { margin-bottom: -4px; } & .sgs-option-picker + .sgs-buybox__picker-label-row { margin-top: 12px; } & .sgs-buybox__extras--before-cart { margin-top: 16px; } & .buybox__cart-form { margin-top: -2px; } & .buybox__rrp-price { color: var(`

- sgs/card-grid [eye-care-clone-test sgs_mega_menu #123]: `@media (max-width: 383px) { & { grid-template-columns: 61px 55.4531px 66.5469px; } } @media (min-width: 384px) and (max-width: 767px) { & { grid-template-columns: 192px 174.531px 209.469px; } } @media (min-width: 768px) { & { grid-template-columns: 416px 378.172px 453.828px; } }`

- sgs/container [eye-care-test sgs_drawer #203]: `& .sgs-button{border-bottom-color:transparent;background-origin:border-box;background-repeat:no-repeat;background-position:0 100%;background-image:linear-gradient(var(--wp--preset--color--primary),var(--wp--preset--color--primary)),linear-gradient(var(--wp--preset--color--border),var(--wp--preset--color--border));background-size:0 1px,100% 1px;transition:background-size .25s ease-out;} & .sgs-butt`

- sgs/container [indus-test page #90]: `& > .sgs-container__inner{flex:1 1 auto}`

- sgs/container [indus-test page #90]: `& > .sgs-container__inner{flex:1 1 auto}`

- sgs/container [indus-test page #90]: `& > .sgs-container__inner{flex:1 1 auto}`

- sgs/container [indus-test wp_template #432]: `& .wp-block-post-excerpt { max-width: 620px; }`

- sgs/container [indus-test wp_template #432]: `& .wp-block-post-content > * + * { margin-top: 22px; } & .wp-block-post-content > :first-child { margin-top: 32px; font-size: clamp(20px, 1.9vw, 23px); line-height: 1.55; font-weight: 500; color: #2C3E50; } & .wp-block-post-content .wp-block-sgs-heading { margin-top: 44px; font-family: var(--wp--preset--font-family--heading); font-weight: 700; font-size: clamp(22px, 2.2vw, 27px); line-height: 1.25`

- sgs/container [eye-care-clone-test page #104]: `@media (max-width: 335px) { & { margin-top: 0px; } } @media (min-width: 384px) and (max-width: 767px) { & { margin-top: 0px; } }`

- sgs/container [eye-care-clone-test page #104]: `@media (min-width: 432px) and (max-width: 447px) { & { margin-top: 27.5px; } }`

- sgs/container [eye-care-clone-test page #104]: `@media (min-width: 416px) and (max-width: 431px) { & { margin-top: 0px; } } @media (min-width: 1024px) and (max-width: 1279px) { & { margin-top: 0.015625px; } }`

- sgs/container [eye-care-clone-test page #104]: `@media (min-width: 1024px) and (max-width: 1279px) { & { margin-top: 0px; } }`

- sgs/container [eye-care-clone-test page #104]: `@media (min-width: 384px) and (max-width: 415px) { & { margin-top: 0px; } } @media (min-width: 416px) and (max-width: 527px) { & { margin-top: 27.5px; } } @media (min-width: 528px) and (max-width: 767px) { & { margin-top: 0px; } } @media (min-width: 1024px) and (max-width: 1279px) { & { margin-top: 0.015625px; } }`

- sgs/container [eye-care-clone-test page #104]: `@media (min-width: 336px) and (max-width: 351px) { & { margin-top: 20px; } } @media (min-width: 416px) and (max-width: 479px) { & { margin-top: 20px; } } @media (min-width: 480px) and (max-width: 767px) { & { margin-top: 4.25px; } }`

- sgs/container [eye-care-clone-test page #104]: `@media (max-width: 351px) { & { margin-top: 0px; } } @media (min-width: 416px) and (max-width: 767px) { & { margin-top: 0px; } }`

- sgs/container [eye-care-clone-test page #107]: `@media (max-width: 1023px) { & .sgs-container__svg-bg { opacity: 0; } } @media (min-width: 1024px) { & .sgs-container__svg-bg { opacity: 1; } }`

- sgs/container [eye-care-clone-test page #107]: `@media (max-width: 1023px) { & .sgs-container__svg-bg { opacity: 0; } } @media (min-width: 1024px) { & .sgs-container__svg-bg { opacity: 1; } }`

- sgs/container [eye-care-clone-test sgs_drawer #141]: `@media (max-width: 351px) { & { margin-top: 118px; } } @media (min-width: 352px) and (max-width: 767px) { & { margin-top: 169px; } }`

- sgs/container [eye-care-clone-test wp_template #160]: `@media (max-width: 351px) { & { margin-top: 0px; } } @media (min-width: 384px) and (max-width: 415px) { & { margin-top: 0px; } } @media (min-width: 416px) and (max-width: 511px) { & { margin-top: 27.5px; } } @media (min-width: 560px) and (max-width: 607px) { & { margin-top: 0px; } } @media (min-width: 608px) and (max-width: 671px) { & { margin-top: 27.4844px; } }`

- sgs/container [eye-care-clone-test wp_template #160]: `@media (min-width: 512px) and (max-width: 591px) { & { margin-top: 20.0156px; } } @media (min-width: 608px) and (max-width: 671px) { & { margin-top: 4.26562px; } } @media (min-width: 672px) and (max-width: 767px) { & { margin-top: 20px; } } @media (min-width: 896px) and (max-width: 1023px) { & { margin-top: 4.25px; } }`

- sgs/container [eye-care-clone-test wp_template #160]: `@media (max-width: 383px) { & { margin-top: 0px; } } @media (min-width: 416px) and (max-width: 511px) { & { margin-top: 0px; } } @media (min-width: 512px) and (max-width: 543px) { & { margin-top: 20px; } } @media (min-width: 544px) and (max-width: 591px) { & { margin-top: 47.5px; } } @media (min-width: 608px) and (max-width: 671px) { & { margin-top: 4.25px; } } @media (min-width: 672px) and (max-w`

- sgs/container [eye-care-clone-test wp_template #160]: `@media (max-width: 351px) { & { margin-top: 0px; } } @media (min-width: 400px) and (max-width: 415px) { & { margin-top: 0px; } } @media (min-width: 416px) and (max-width: 511px) { & { margin-top: 4.25px; } } @media (min-width: 512px) and (max-width: 671px) { & { margin-top: 0px; } } @media (min-width: 896px) and (max-width: 1167px) { & { margin-top: 0px; } }`

- sgs/container [eye-care-clone-test wp_template #164]: `@media (max-width: 1023px) { & { position: static; } } @media (min-width: 1024px) { & { position: sticky; } }`

- sgs/container [sandybrown page #2742]: `/* SGS-CONVERTER-RESIDUAL:start */ @media (min-width: 640px) and (max-width: 767px){&selector .sgs-gift-section__cards{grid-template-columns:1fr 1fr;}} /* SGS-CONVERTER-RESIDUAL:end */`

- sgs/hero [eye-care-test page #208]: `@media (max-width:767px){& .sgs-hero__bg-img{object-position:62% 12%;}} @media (min-width:768px){& .sgs-hero__bg-img{object-position:78% 45%;}} `

- sgs/hero [indus-test page #90]: `& .sgs-hero__media{height:auto}`

- sgs/hero [sandybrown page #2742]: `/* SGS-CONVERTER-RESIDUAL:start */ @media (min-width: 1280px){&selector .sgs-hero__content{padding:72px 64px;}} /* SGS-CONVERTER-RESIDUAL:end */`
