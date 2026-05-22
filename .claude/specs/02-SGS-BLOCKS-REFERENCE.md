# SGS Blocks Reference

> **AUTO-GENERATED.** Do not edit by hand. This file is regenerated from
> `~/.claude/skills/sgs-wp-engine/sgs-framework.db` by
> `plugins/sgs-blocks/scripts/generate-block-reference.py`.
> Refresh: `python plugins/sgs-blocks/scripts/generate-block-reference.py`.

**Last generated:** 2026-05-22T18:40:37

**For architectural patterns, customisation standards, and build status, see [`02-SGS-BLOCKS.md`](02-SGS-BLOCKS.md).** This file is the per-block attribute/supports/selector reference only.

---

## Contents

- [Layout](#layout) (6 blocks)
- [Content](#content) (39 blocks)
- [Forms](#forms) (17 blocks)
- [Interactive](#interactive) (11 blocks)
- [common](#common) (4 blocks)
- [design](#design) (25 blocks)
- [embed](#embed) (1 blocks)
- [media](#media) (10 blocks)
- [reusable](#reusable) (1 blocks)
- [text](#text) (15 blocks)
- [theme](#theme) (51 blocks)
- [widgets](#widgets) (14 blocks)

---

## Layout

### `sgs/container`
_SGS Container_

**Type:** Dynamic

Flexible layout wrapper â€” the fundamental building block for all page sections. Supports default/wide/full/custom widthMode per viewport — composes with WP-native alignfull/alignwide.

**Attributes** (50):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `backgroundAttachment` | `string (enum)` | `"scroll"` | — |
| `backgroundImage` | `object` | `—` | Yes |
| `backgroundImageMobile` | `object` | `—` | — |
| `backgroundImageTablet` | `object` | `—` | — |
| `backgroundMedia` | `object` | `—` | — |
| `backgroundOverlayColour` | `string` | `—` | — |
| `backgroundOverlayOpacity` | `number` | `50` | — |
| `backgroundPosition` | `string` | `"center center"` | — |
| `backgroundRepeat` | `string (enum)` | `"no-repeat"` | — |
| `backgroundSize` | `string (enum)` | `"cover"` | — |
| `bgAnimationDuration` | `number` | `20` | — |
| `bgKenBurns` | `boolean` | `false` | — |
| `bgParallax` | `boolean` | `false` | — |
| `bgVideo` | `object` | `—` | Yes |
| `bgVideoMobile` | `object` | `—` | — |
| `columns` | `number` | `2` | Yes |
| `columnsMobile` | `number` | `1` | — |
| `columnsTablet` | `number` | `2` | — |
| `customWidth` | `number` | `0` | — |
| `customWidthUnit` | `string` | `"px"` | — |
| `gap` | `string` | `"40"` | Yes |
| `gapMobile` | `string` | `""` | — |
| `gapTablet` | `string` | `""` | — |
| `gridTemplateColumns` | `string` | `""` | Yes |
| `gridTemplateColumnsMobile` | `string` | `""` | — |
| `gridTemplateColumnsTablet` | `string` | `""` | — |
| `htmlTag` | `string` | `"section"` | — |
| `layout` | `string` | `"stack"` | — |
| `maxWidth` | `string` | `"wide"` | — |
| `minHeight` | `string` | `—` | — |
| `overlayGradient` | `boolean` | `false` | — |
| `overlayGradientAngle` | `number` | `180` | — |
| `overlayGradientFrom` | `string` | `""` | — |
| `overlayGradientTo` | `string` | `""` | — |
| `shadow` | `string` | `—` | — |
| `shapeDividerBottom` | `string` | `""` | — |
| `shapeDividerBottomColour` | `string` | `""` | — |
| `shapeDividerBottomFlip` | `boolean` | `false` | — |
| `shapeDividerBottomHeight` | `number` | `80` | — |
| `shapeDividerBottomInvert` | `boolean` | `false` | — |
| `shapeDividerTop` | `string` | `""` | — |
| `shapeDividerTopColour` | `string` | `""` | — |
| `shapeDividerTopFlip` | `boolean` | `false` | — |
| `shapeDividerTopHeight` | `number` | `80` | — |
| `shapeDividerTopInvert` | `boolean` | `false` | — |
| `verticalAlign` | `string` | `"start"` | — |
| `widthMode` | `string (enum)` | `"default"` | Yes |
| `widthModeDesktop` | `string` | `""` | — |
| `widthModeMobile` | `string` | `""` | — |
| `widthModeTablet` | `string` | `""` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-container` |

---

### `sgs/divider`
_Divider_

**Type:** Dynamic

Section separator with four visual variants: simple line, dot row, SVG wave, or centred shape. Used to mark transitions between page sections.

**Attributes** (12):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `colour` | `string` | `"primary"` | — |
| `dividerAlign` | `string (enum)` | `"center"` | — |
| `dotCount` | `number` | `3` | — |
| `marginBottom` | `number` | `32` | — |
| `marginTop` | `number` | `32` | — |
| `marginUnit` | `string` | `"px"` | — |
| `shape` | `string (enum)` | `"circle"` | — |
| `shapeSize` | `number` | `12` | — |
| `thickness` | `number` | `1` | — |
| `variant` | `string (enum)` | `"line"` | — |
| `width` | `number` | `100` | — |
| `widthUnit` | `string` | `"%"` | — |

**Supports:**
- `align` (["wide", "full", "center"]), `color` ({"text": false, "background...), `html` (false), `spacing` ({"margin": true, "padding":...)

---

### `sgs/feature-grid`
_SGS Feature Grid_

**Type:** Dynamic

A responsive grid container for SGS Info Boxes. Default: auto-fill flexbox wrap, 4-up on desktop, stacked on mobile.

**Attributes** (12):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `alignItems` | `string` | `"stretch"` | — |
| `columnsDesktop` | `number` | `4` | — |
| `columnsMobile` | `number` | `1` | — |
| `columnsTablet` | `number` | `2` | — |
| `gap` | `number` | `24` | Yes |
| `gapMobile` | `number` | `16` | — |
| `gapTablet` | `number` | `—` | — |
| `gapUnit` | `string` | `"px"` | — |
| `justifyItems` | `string` | `"stretch"` | — |
| `layoutMode` | `string` | `"auto-flex"` | — |
| `minItemWidth` | `number` | `240` | — |
| `minItemWidthUnit` | `string` | `"px"` | — |

**Supports:**
- `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `customClassName`, `html` (false), `spacing` ({"margin": true, "padding":...)

---

### `sgs/hero`
_SGS Hero_

**Type:** Dynamic

Page hero section with headline, sub-headline, CTAs, and background image.

**Attributes** (174):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `alignment` | `string` | `"left"` | — |
| `backgroundColor` | `string` | `"primary-dark"` | — |
| `backgroundImage` | `object` | `—` | — |
| `backgroundMedia` | `object` | `—` | — |
| `backgroundVideo` | `object` | `—` | — |
| `badges` | `array` | `[]` | — |
| `bgKenBurns` | `boolean` | `false` | — |
| `bgParallax` | `boolean` | `false` | — |
| `bgVideo` | `object` | `—` | Yes |
| `bgVideoMobile` | `object` | `—` | — |
| `contentMaxWidth` | `number` | `—` | Yes |
| `contentMaxWidthMobile` | `number` | `—` | — |
| `contentMaxWidthTablet` | `number` | `—` | — |
| `contentMaxWidthUnit` | `string` | `"px"` | — |
| `contentPaddingBottom` | `number` | `—` | Yes |
| `contentPaddingBottomMobile` | `number` | `—` | — |
| `contentPaddingBottomTablet` | `number` | `—` | — |
| `contentPaddingLeft` | `number` | `—` | Yes |
| `contentPaddingLeftMobile` | `number` | `—` | — |
| `contentPaddingLeftTablet` | `number` | `—` | — |
| `contentPaddingRight` | `number` | `—` | Yes |
| `contentPaddingRightMobile` | `number` | `—` | — |
| `contentPaddingRightTablet` | `number` | `—` | — |
| `contentPaddingTop` | `number` | `—` | Yes |
| `contentPaddingTopMobile` | `number` | `—` | — |
| `contentPaddingTopTablet` | `number` | `—` | — |
| `contentPaddingUnit` | `string` | `"px"` | — |
| `ctaGap` | `integer` | `12` | Yes |
| `ctaGapMobile` | `integer` | `10` | — |
| `ctaGapTablet` | `integer` | `—` | — |
| `ctaGapUnit` | `string` | `"px"` | — |
| `ctaPrimaryBackground` | `string` | `—` | — |
| `ctaPrimaryColour` | `string` | `—` | — |
| `ctaPrimaryHoverBackground` | `string` | `""` | — |
| `ctaPrimaryHoverColour` | `string` | `""` | — |
| `ctaPrimaryStyle` | `string` | `"accent"` | — |
| `ctaPrimaryText` | `string` | `—` | — |
| `ctaPrimaryUrl` | `string` | `—` | — |
| `ctaSecondaryBackground` | `string` | `—` | — |
| `ctaSecondaryColour` | `string` | `—` | — |
| `ctaSecondaryHoverBackground` | `string` | `""` | — |
| `ctaSecondaryHoverColour` | `string` | `""` | — |
| `ctaSecondaryStyle` | `string` | `"outline"` | — |
| `ctaSecondaryText` | `string` | `—` | — |
| `ctaSecondaryUrl` | `string` | `—` | — |
| `headline` | `string` | `""` | — |
| `headlineColour` | `string` | `"text-inverse"` | — |
| `headlineFontSizeDesktop` | `number` | `—` | — |
| `headlineFontSizeMobile` | `number` | `—` | — |
| `headlineFontSizeTablet` | `number` | `—` | — |
| `headlineMarginBottom` | `number` | `—` | Yes |
| `headlineMarginBottomMobile` | `number` | `—` | — |
| `hoverBackgroundColour` | `string` | `""` | — |
| `hoverBorderColour` | `string` | `""` | — |
| `hoverTextColour` | `string` | `""` | — |
| `imageBorderColour` | `string` | `""` | — |
| `imageBorderRadiusBL` | `number` | `0` | — |
| `imageBorderRadiusBR` | `number` | `0` | — |
| `imageBorderRadiusMobileBL` | `number` | `—` | — |
| `imageBorderRadiusMobileBR` | `number` | `—` | — |
| `imageBorderRadiusMobileTL` | `number` | `—` | — |
| `imageBorderRadiusMobileTR` | `number` | `—` | — |
| `imageBorderRadiusTL` | `number` | `0` | — |
| `imageBorderRadiusTR` | `number` | `0` | — |
| `imageBorderRadiusTabletBL` | `number` | `—` | — |
| `imageBorderRadiusTabletBR` | `number` | `—` | — |
| `imageBorderRadiusTabletTL` | `number` | `—` | — |
| `imageBorderRadiusTabletTR` | `number` | `—` | — |
| `imageBorderRadiusUnit` | `string` | `"px"` | — |
| `imageBorderStyle` | `string` | `"none"` | — |
| `imageBorderWidthBottom` | `number` | `0` | — |
| `imageBorderWidthLeft` | `number` | `0` | — |
| `imageBorderWidthRight` | `number` | `0` | — |
| `imageBorderWidthTop` | `number` | `0` | — |
| `imageBorderWidthUnit` | `string` | `"px"` | — |
| `imageHeight` | `number` | `—` | Yes |
| `imageHeightMobile` | `number` | `—` | — |
| `imageHeightTablet` | `number` | `—` | — |
| `imageHeightUnit` | `string` | `"px"` | — |
| `imageObjectFit` | `string` | `"cover"` | — |
| `imageObjectPosition` | `string` | `"center center"` | — |
| `imagePaddingBottom` | `number` | `0` | Yes |
| `imagePaddingBottomMobile` | `number` | `—` | — |
| `imagePaddingBottomTablet` | `number` | `—` | — |
| `imagePaddingLeft` | `number` | `0` | Yes |
| `imagePaddingLeftMobile` | `number` | `—` | — |
| `imagePaddingLeftTablet` | `number` | `—` | — |
| `imagePaddingRight` | `number` | `0` | Yes |
| `imagePaddingRightMobile` | `number` | `—` | — |
| `imagePaddingRightTablet` | `number` | `—` | — |
| `imagePaddingTop` | `number` | `0` | Yes |
| `imagePaddingTopMobile` | `number` | `—` | — |
| `imagePaddingTopTablet` | `number` | `—` | — |
| `imagePaddingUnit` | `string` | `"px"` | — |
| `imageWidth` | `number` | `—` | Yes |
| `imageWidthMobile` | `number` | `—` | — |
| `imageWidthTablet` | `number` | `—` | — |
| `imageWidthUnit` | `string` | `"%"` | — |
| `label` | `string` | `""` | — |
| `labelColour` | `string` | `""` | — |
| `labelFontFamily` | `string` | `""` | — |
| `labelFontSize` | `number` | `—` | Yes |
| `labelFontSizeMobile` | `number` | `—` | — |
| `labelFontSizeTablet` | `number` | `—` | — |
| `labelFontSizeUnit` | `string` | `"px"` | — |
| `labelFontWeight` | `string` | `"600"` | — |
| `labelLetterSpacing` | `number` | `—` | — |
| `labelLetterSpacingUnit` | `string` | `"em"` | — |
| `labelLineHeight` | `number` | `1.2` | — |
| `labelLineHeightUnit` | `string` | `"em"` | — |
| `labelMarginBottom` | `number` | `8` | — |
| `labelMarginBottomUnit` | `string` | `"px"` | — |
| `labelTextDecoration` | `string` | `""` | — |
| `labelTextTransform` | `string` | `"uppercase"` | — |
| `letterSpacing` | `string` | `""` | — |
| `mediaBackgroundColour` | `string` | `""` | — |
| `mediaPaddingBottom` | `number` | `—` | Yes |
| `mediaPaddingBottomMobile` | `number` | `—` | — |
| `mediaPaddingBottomTablet` | `number` | `—` | — |
| `mediaPaddingLeft` | `number` | `—` | Yes |
| `mediaPaddingLeftMobile` | `number` | `—` | — |
| `mediaPaddingLeftTablet` | `number` | `—` | — |
| `mediaPaddingRight` | `number` | `—` | Yes |
| `mediaPaddingRightMobile` | `number` | `—` | — |
| `mediaPaddingRightTablet` | `number` | `—` | — |
| `mediaPaddingTop` | `number` | `—` | Yes |
| `mediaPaddingTopMobile` | `number` | `—` | — |
| `mediaPaddingTopTablet` | `number` | `—` | — |
| `mediaPaddingUnit` | `string` | `"px"` | — |
| `minHeight` | `string` | `""` | Yes |
| `minHeightMobile` | `string` | `"360px"` | — |
| `minHeightTablet` | `string` | `""` | — |
| `overlayColour` | `string` | `"text"` | — |
| `overlayOpacity` | `number` | `50` | — |
| `splitColumnRatio` | `string` | `"1fr 1fr"` | Yes |
| `splitColumnRatioMobile` | `string` | `""` | — |
| `splitColumnRatioTablet` | `string` | `""` | — |
| `splitContentOrderMobile` | `string` | `"media-first"` | — |
| `splitGap` | `number` | `0` | Yes |
| `splitGapMobile` | `number` | `—` | — |
| `splitGapTablet` | `number` | `—` | — |
| `splitGapUnit` | `string` | `"px"` | — |
| `splitImage` | `object` | `—` | Yes |
| `splitImageBleed` | `boolean` | `false` | — |
| `splitImageMobile` | `object` | `—` | — |
| `splitImageMobileHeight` | `number` | `—` | — |
| `splitImageMobileObjectPosition` | `string` | `"center 20%"` | — |
| `splitMedia` | `object` | `—` | — |
| `subHeadline` | `string` | `""` | — |
| `subHeadlineColour` | `string` | `"text-inverse"` | — |
| `subHeadlineFontFamily` | `string` | `""` | — |
| `subHeadlineFontSize` | `string` | `—` | Yes |
| `subHeadlineFontSizeMobile` | `string` | `""` | — |
| `subHeadlineFontSizeTablet` | `string` | `""` | — |
| `subHeadlineFontWeight` | `string` | `""` | — |
| `subHeadlineLetterSpacing` | `number` | `—` | — |
| `subHeadlineLetterSpacingUnit` | `string` | `"px"` | — |
| `subHeadlineLineHeight` | `number` | `—` | — |
| `subHeadlineLineHeightUnit` | `string` | `"em"` | — |
| `subHeadlineMarginBottom` | `number` | `—` | Yes |
| `subHeadlineMarginBottomMobile` | `number` | `—` | — |
| `subHeadlineMaxWidth` | `number` | `—` | — |
| `subHeadlineTextDecoration` | `string` | `""` | — |
| `subHeadlineTextTransform` | `string` | `""` | — |
| `svgContent` | `string` | `—` | — |
| `textAlignDesktop` | `string` | `""` | — |
| `textAlignMobile` | `string` | `""` | — |
| `textAlignTablet` | `string` | `""` | — |
| `textColor` | `string` | `"text-inverse"` | — |
| `textTransform` | `string` | `""` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease-in-out"` | — |
| `variant` | `string (enum)` | `"standard"` | — |
| `verticalAlignment` | `string` | `"center"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `sgs` ({"imageControls": true}), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `border` | `.wp-block-sgs-hero` |
| `color.background` | `.wp-block-sgs-hero` |
| `color.text` | `.wp-block-sgs-hero` |
| `root` | `.wp-block-sgs-hero` |
| `spacing.margin` | `.wp-block-sgs-hero` |
| `spacing.padding` | `.wp-block-sgs-hero` |
| `typography.fontFamily` | `.sgs-hero__headline` |
| `typography.fontSize` | `.sgs-hero__headline` |
| `typography.fontWeight` | `.sgs-hero__headline` |
| `typography.letterSpacing` | `.sgs-hero__headline` |
| `typography.lineHeight` | `.sgs-hero__headline` |
| `typography.root` | `.sgs-hero__headline` |
| `typography.textDecoration` | `.sgs-hero__headline` |
| `typography.textTransform` | `.sgs-hero__headline` |

---

### `sgs/mobile-nav-toggle`
_Mobile Nav Toggle_

**Type:** Dynamic

Hamburger button that opens the mobile navigation drawer.

**Attributes** (3):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `ariaLabel` | `string` | `"Open navigation menu"` | — |
| `iconSize` | `number` | `24` | — |
| `popoverTarget` | `string` | `"sgs-mobile-nav"` | — |

**Supports:**
- `color` ({"text": true, "background"...), `html` (false), `spacing` ({"padding": true, "margin":...)

---

### `sgs/svg-background`
_SGS SVG Background_

**Type:** Dynamic

Container that renders an SVG animation behind its inner blocks, with responsive sizing.

**Attributes** (7):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `animationSpeed` | `string (enum)` | `"medium"` | — |
| `animationType` | `string (enum)` | `"none"` | — |
| `minHeight` | `string` | `""` | — |
| `opacity` | `number` | `100` | — |
| `svgContent` | `string` | `""` | — |
| `svgPosition` | `string (enum)` | `"background"` | — |
| `textShadow` | `boolean` | `false` | — |

**Supports:**
- `align` (["wide", "full"]), `anchor`, `className`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-svg-background` |

---

## Content

### `sgs/brand-strip`
_SGS Brand Strip_

**Type:** Dynamic

Horizontal logo strip with infinite marquee scroll, fade edges, direction control, and greyscale effect.

**Attributes** (14):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `fadeEdges` | `boolean` | `false` | — |
| `fadeWidth` | `number` | `60` | — |
| `greyscale` | `boolean` | `false` | — |
| `hoverBackgroundColour` | `string` | `""` | — |
| `hoverBorderColour` | `string` | `""` | — |
| `hoverEffect` | `string` | `"none"` | — |
| `hoverTextColour` | `string` | `""` | — |
| `logos` | `array` | `[]` | — |
| `maxHeight` | `number` | `80` | — |
| `scrollDirection` | `string` | `"left"` | — |
| `scrollSpeed` | `string` | `"medium"` | — |
| `scrolling` | `boolean` | `false` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease-in-out"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `sgs` ({"imageControls": true}), `spacing` ({"margin": true, "padding":...)

---

### `sgs/breadcrumbs`
_SGS Breadcrumbs_

**Type:** Dynamic

Auto-generated breadcrumb navigation from page hierarchy.

**Attributes** (6):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `currentColour` | `string` | `"text"` | — |
| `homeLabel` | `string` | `"Home"` | — |
| `linkColour` | `string` | `"text-muted"` | — |
| `separator` | `string` | `"/"` | — |
| `separatorColour` | `string` | `"text-muted"` | — |
| `showHome` | `boolean` | `true` | — |

**Supports:**
- `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true})

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-breadcrumbs` |

---

### `sgs/business-info`
_Business Info_

**Type:** Dynamic

Display business details from Settings > Business Details.

**Attributes** (7):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `iconColour` | `string` | `"primary"` | — |
| `labelColour` | `string` | `"text-muted"` | — |
| `linkEmail` | `boolean` | `true` | — |
| `linkPhone` | `boolean` | `true` | — |
| `showIcon` | `boolean` | `true` | — |
| `textColour` | `string` | `"text"` | — |
| `type` | `string (enum)` | `"phone"` | — |

**Supports:**
- `anchor`, `color` ({"text": true, "background"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "fontFam...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-business-info` |

---

### `sgs/button`
_SGS Button_

**Type:** Dynamic

A highly-configurable button with preset binding, icon support, hover states, and per-breakpoint controls.

**Attributes** (103):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `anchor` | `string` | `""` | — |
| `ariaLabel` | `string` | `""` | — |
| `borderRadiusBL` | `number` | `—` | — |
| `borderRadiusBR` | `number` | `—` | — |
| `borderRadiusMobileBL` | `number` | `—` | — |
| `borderRadiusMobileBR` | `number` | `—` | — |
| `borderRadiusMobileTL` | `number` | `—` | — |
| `borderRadiusMobileTR` | `number` | `—` | — |
| `borderRadiusTL` | `number` | `—` | — |
| `borderRadiusTR` | `number` | `—` | — |
| `borderRadiusTabletBL` | `number` | `—` | — |
| `borderRadiusTabletBR` | `number` | `—` | — |
| `borderRadiusTabletTL` | `number` | `—` | — |
| `borderRadiusTabletTR` | `number` | `—` | — |
| `borderRadiusUnit` | `string` | `"px"` | — |
| `borderStyle` | `string` | `"solid"` | — |
| `borderWidthBottom` | `number` | `—` | — |
| `borderWidthLeft` | `number` | `—` | — |
| `borderWidthRight` | `number` | `—` | — |
| `borderWidthTop` | `number` | `—` | — |
| `borderWidthUnit` | `string` | `"px"` | — |
| `boxShadow` | `object` | `{"colour": "", "hOffset": 0, "vOffset...` | — |
| `boxShadowHover` | `object` | `{"colour": "", "hOffset": 0, "vOffset...` | — |
| `className` | `string` | `""` | — |
| `colourBackground` | `string` | `""` | — |
| `colourBackgroundHover` | `string` | `""` | — |
| `colourBorder` | `string` | `""` | — |
| `colourBorderHover` | `string` | `""` | — |
| `colourText` | `string` | `""` | — |
| `colourTextHover` | `string` | `""` | — |
| `customWidth` | `number` | `—` | — |
| `customWidthUnit` | `string` | `"px"` | — |
| `download` | `boolean` | `false` | — |
| `fontFamily` | `string` | `""` | — |
| `fontSize` | `number` | `—` | Yes |
| `fontSizeMobile` | `number` | `—` | — |
| `fontSizeTablet` | `number` | `—` | — |
| `fontSizeUnit` | `string` | `"px"` | — |
| `fontStyle` | `string` | `"normal"` | — |
| `fontWeight` | `string` | `""` | — |
| `hoverScale` | `number` | `1.0` | — |
| `icon` | `string` | `""` | — |
| `iconColour` | `string` | `""` | — |
| `iconColourHover` | `string` | `""` | — |
| `iconGap` | `number` | `8` | — |
| `iconPosition` | `string` | `"after"` | — |
| `iconSize` | `number` | `—` | Yes |
| `iconSizeMobile` | `number` | `—` | — |
| `iconSizeTablet` | `number` | `—` | — |
| `iconTitle` | `string` | `""` | — |
| `iconValue` | `object` | `{"source": "", "value": "", "label": ""}` | — |
| `inheritStyle` | `string` | `"primary"` | — |
| `isSubmit` | `boolean` | `false` | — |
| `label` | `string` | `"Click Here"` | — |
| `letterSpacing` | `number` | `—` | Yes |
| `letterSpacingMobile` | `number` | `—` | — |
| `letterSpacingTablet` | `number` | `—` | — |
| `letterSpacingUnit` | `string` | `"px"` | — |
| `lineHeight` | `number` | `—` | Yes |
| `lineHeightMobile` | `number` | `—` | — |
| `lineHeightTablet` | `number` | `—` | — |
| `lineHeightUnit` | `string` | `"em"` | — |
| `linkTarget` | `string` | `"_self"` | — |
| `marginBottom` | `number` | `—` | Yes |
| `marginBottomMobile` | `number` | `—` | — |
| `marginBottomTablet` | `number` | `—` | — |
| `marginLeft` | `number` | `—` | Yes |
| `marginLeftMobile` | `number` | `—` | — |
| `marginLeftTablet` | `number` | `—` | — |
| `marginRight` | `number` | `—` | Yes |
| `marginRightMobile` | `number` | `—` | — |
| `marginRightTablet` | `number` | `—` | — |
| `marginTop` | `number` | `—` | Yes |
| `marginTopMobile` | `number` | `—` | — |
| `marginTopTablet` | `number` | `—` | — |
| `marginUnit` | `string` | `"px"` | — |
| `minHeight` | `number` | `—` | Yes |
| `minHeightMobile` | `number` | `—` | — |
| `minHeightMobileUnit` | `string` | `"px"` | — |
| `minHeightTablet` | `number` | `—` | — |
| `minHeightTabletUnit` | `string` | `"px"` | — |
| `minHeightUnit` | `string` | `"px"` | — |
| `paddingBottom` | `number` | `—` | Yes |
| `paddingBottomMobile` | `number` | `—` | — |
| `paddingBottomTablet` | `number` | `—` | — |
| `paddingLeft` | `number` | `—` | Yes |
| `paddingLeftMobile` | `number` | `—` | — |
| `paddingLeftTablet` | `number` | `—` | — |
| `paddingRight` | `number` | `—` | Yes |
| `paddingRightMobile` | `number` | `—` | — |
| `paddingRightTablet` | `number` | `—` | — |
| `paddingTop` | `number` | `—` | Yes |
| `paddingTopMobile` | `number` | `—` | — |
| `paddingTopTablet` | `number` | `—` | — |
| `paddingUnit` | `string` | `"px"` | — |
| `rel` | `string` | `""` | — |
| `tagName` | `string` | `"a"` | — |
| `textDecoration` | `string` | `""` | — |
| `textTransform` | `string` | `""` | — |
| `transitionDuration` | `number` | `300` | — |
| `transitionEasing` | `string` | `"ease"` | — |
| `url` | `string` | `""` | — |
| `widthType` | `string` | `"fit"` | — |

**Supports:**
- `anchor`, `color` ({"background": true, "text"...), `customClassName`, `html` (false), `spacing` ({"margin": true, "padding":...)

---

### `sgs/card-grid`
_SGS Card Grid_

**Type:** Dynamic

Flexible image and content grid with overlay and card variants.

**Attributes** (28):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `aspectRatio` | `string` | `"16/10"` | — |
| `columns` | `number` | `3` | Yes |
| `columnsMobile` | `number` | `1` | — |
| `columnsTablet` | `number` | `2` | — |
| `gap` | `string` | `"30"` | — |
| `hoverBackgroundColour` | `string` | `—` | — |
| `hoverBorderColour` | `string` | `"primary"` | — |
| `hoverEffect` | `string` | `"zoom"` | — |
| `hoverGrayscale` | `boolean` | `false` | — |
| `hoverImageZoom` | `boolean` | `false` | — |
| `hoverScale` | `string` | `""` | — |
| `hoverShadow` | `string` | `""` | — |
| `hoverTextColour` | `string` | `—` | — |
| `items` | `array` | `[]` | — |
| `overlayStyle` | `string` | `"gradient"` | — |
| `queryCategory` | `number` | `0` | — |
| `queryPostType` | `string` | `"post"` | — |
| `queryPostsPerPage` | `number` | `6` | — |
| `sgsAnimation` | `string` | `"fade-up"` | — |
| `sgsAnimationDuration` | `string` | `"medium"` | — |
| `sgsAnimationEasing` | `string` | `"default"` | — |
| `source` | `string (enum)` | `"manual"` | — |
| `staggerDelay` | `number` | `80` | — |
| `subtitleColour` | `string` | `"text"` | — |
| `titleColour` | `string` | `"primary"` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease-in-out"` | — |
| `variant` | `string` | `"card"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `sgs` ({"imageControls": true}), `shadow`, `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-card-grid` |
| `typography` | `.sgs-card-grid__title` |

---

### `sgs/certification-bar`
_SGS Certification Bar_

**Type:** Dynamic

Horizontal strip of certification badges with optional labels. Trust signals like BRC, Halal, SALSA.

**Attributes** (8):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `badgeSize` | `string` | `"medium"` | — |
| `badgeStyle` | `string` | `"text-only"` | — |
| `items` | `array` | `[]` | — |
| `labelColour` | `string` | `"text-muted"` | — |
| `labelFontSize` | `string` | `—` | — |
| `title` | `string` | `""` | — |
| `titleColour` | `string` | `"text"` | — |
| `titleFontSize` | `string` | `—` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `sgs` ({"imageControls": true}), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.sgs-certification-bar` |
| `typography` | `.sgs-certification-bar__title` |

---

### `sgs/counter`
_SGS Counter_

**Type:** Dynamic

Animated number counter with prefix, suffix, and label.

**Attributes** (11):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `accentStroke` | `boolean` | `false` | — |
| `duration` | `number` | `2000` | — |
| `icon` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `labelColour` | `string` | `"text-muted"` | — |
| `labelFontSize` | `string` | `—` | — |
| `number` | `number` | `0` | — |
| `numberColour` | `string` | `"primary"` | — |
| `prefix` | `string` | `""` | — |
| `separator` | `boolean` | `true` | — |
| `suffix` | `string` | `""` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (false), `anchor`, `color` ({"background": true, "text"...), `html` (false), `interactivity`, `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.sgs-counter` |
| `typography` | `.sgs-counter__number` |

---

### `sgs/cta-section`
_SGS CTA Section_

**Type:** Dynamic

Call-to-action section with headline, supporting text, and buttons.

**Attributes** (34):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `backgroundColor` | `string` | `"accent"` | — |
| `backgroundImage` | `object` | `—` | — |
| `backgroundImageOpacity` | `number` | `30` | — |
| `backgroundMedia` | `object` | `—` | — |
| `body` | `string` | `""` | — |
| `bodyColour` | `string` | `"text"` | — |
| `bodyFontSize` | `string` | `—` | Yes |
| `bodyFontSizeMobile` | `string` | `""` | — |
| `bodyFontSizeTablet` | `string` | `""` | — |
| `buttonBackground` | `string` | `"primary-dark"` | — |
| `buttonBorderColour` | `string` | `—` | — |
| `buttonBorderRadius` | `number` | `—` | — |
| `buttonBorderWidth` | `number` | `—` | — |
| `buttonColour` | `string` | `"text-inverse"` | — |
| `buttonSize` | `string (enum)` | `"md"` | — |
| `buttonStyle` | `string (enum)` | `"solid"` | — |
| `buttons` | `array` | `[]` | — |
| `gradientPreset` | `string` | `""` | — |
| `headline` | `string` | `""` | — |
| `headlineColour` | `string` | `"text"` | — |
| `hoverBackgroundColour` | `string` | `""` | — |
| `hoverBorderColour` | `string` | `""` | — |
| `hoverTextColour` | `string` | `""` | — |
| `layout` | `string` | `"centred"` | — |
| `letterSpacing` | `string` | `""` | — |
| `ribbon` | `string` | `""` | — |
| `stats` | `array` | `[]` | — |
| `textAlignDesktop` | `string` | `""` | — |
| `textAlignMobile` | `string` | `""` | — |
| `textAlignTablet` | `string` | `""` | — |
| `textColor` | `string` | `"text"` | — |
| `textTransform` | `string` | `""` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease-in-out"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `sgs` ({"imageControls": false}), `shadow`, `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-cta-section` |
| `typography` | `.sgs-cta-section__headline` |

---

### `sgs/data-display`
_SGS Data Display_

**Type:** Dynamic

Parent container block for data visualisation sub-blocks (charts + tables). Data source assignment lives on the parent (internal WP source OR external URL/API); per-sub-block controls choose which subset of data to render + visual styling. Same parent/child pattern as core/buttons -> core/button. Sub-blocks to follow: sgs/data-table-* (several table types) + sgs/chart-* (20+ chart types, likely Vega-Lite-backed given the 626 chart templates already in uimax).

**Attributes** (5):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `defaultDataSourceId` | `number` | `0` | — |
| `displayDescription` | `string` | `""` | — |
| `displayTitle` | `string` | `""` | — |
| `layout` | `string (enum)` | `"single"` | — |
| `refreshOverride` | `string (enum)` | `"inherit"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

---

### `sgs/decorative-image`
_SGS Decorative Image_

**Type:** Dynamic

Absolute-positioned decorative image that floats freely over sections. Used for organic, editorial-style design with optional parallax scroll effects.

**Attributes** (29):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `decorMedia` | `object` | `—` | — |
| `fadeOnScroll` | `boolean` | `false` | — |
| `flipX` | `boolean` | `false` | — |
| `hideOnMobile` | `boolean` | `false` | — |
| `hideOnTablet` | `boolean` | `false` | — |
| `imageAlt` | `string` | `""` | — |
| `imageId` | `number` | `—` | — |
| `imageUrl` | `string` | `—` | — |
| `maxWidthPercent` | `number` | `20` | — |
| `opacity` | `number` | `85` | — |
| `overflow` | `string` | `"visible"` | — |
| `parallaxStrength` | `number` | `0` | — |
| `pathDrawDurationMs` | `number` | `1500` | — |
| `pathDrawEasing` | `string` | `"ease-out"` | — |
| `pathDrawOnScroll` | `boolean` | `false` | — |
| `pathDrawTriggerOffset` | `number` | `20` | — |
| `positionX` | `number` | `50` | Yes |
| `positionXMobile` | `number` | `—` | — |
| `positionXTablet` | `number` | `—` | — |
| `positionY` | `number` | `50` | Yes |
| `positionYMobile` | `number` | `—` | — |
| `positionYTablet` | `number` | `—` | — |
| `rotation` | `number` | `0` | Yes |
| `rotationMobile` | `number` | `—` | — |
| `rotationTablet` | `number` | `—` | — |
| `width` | `number` | `200` | Yes |
| `widthMobile` | `number` | `—` | — |
| `widthTablet` | `number` | `—` | — |
| `zIndex` | `number` | `1` | — |

**Supports:**
- `anchor`, `html` (false), `sgs` ({"imageControls": true})

---

### `sgs/gallery`
_SGS Image Gallery_

**Type:** Dynamic

Image gallery with grid, masonry, and carousel layouts plus lightbox viewing.

**Attributes** (30):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `aspectRatio` | `string` | `"1/1"` | — |
| `captionBgColour` | `string` | `"primary-dark"` | — |
| `captionColour` | `string` | `"text-inverse"` | — |
| `captionReveal` | `boolean` | `false` | — |
| `carouselAutoplay` | `boolean` | `false` | — |
| `carouselShowArrows` | `boolean` | `true` | — |
| `carouselShowDots` | `boolean` | `true` | — |
| `carouselSpeed` | `number` | `5000` | — |
| `columns` | `number` | `3` | Yes |
| `columnsMobile` | `number` | `1` | — |
| `columnsTablet` | `number` | `2` | — |
| `enableLightbox` | `boolean` | `true` | — |
| `gap` | `string` | `"16"` | — |
| `hoverEffect` | `string` | `"zoom"` | — |
| `hoverGrayscale` | `boolean` | `false` | — |
| `hoverImageZoom` | `boolean` | `true` | — |
| `hoverOverlayColour` | `string` | `"primary-dark"` | — |
| `hoverScale` | `string` | `""` | — |
| `hoverShadow` | `string` | `""` | — |
| `imageSize` | `string` | `"large"` | — |
| `images` | `array` | `[]` | — |
| `layout` | `string (enum)` | `"grid"` | — |
| `mediaItems` | `array` | `[]` | — |
| `sgsAnimation` | `string` | `"fade-in"` | — |
| `sgsAnimationDuration` | `string` | `"medium"` | — |
| `sgsAnimationEasing` | `string` | `"ease-out"` | — |
| `showCaptions` | `boolean` | `false` | — |
| `staggerDelay` | `number` | `60` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `interactivity`, `sgs` ({"imageControls": true}), `spacing` ({"margin": true, "padding":...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-gallery` |

---

### `sgs/google-reviews`
_SGS Google Reviews_

**Type:** Dynamic

Display Google Business Profile reviews with aggregate ratings and schema.org markup.

**Attributes** (30):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `autoplay` | `boolean` | `false` | — |
| `autoplaySpeed` | `number` | `5000` | — |
| `backgroundColour` | `string` | `"surface"` | — |
| `cardStyle` | `string (enum)` | `"bordered"` | — |
| `cardVariant` | `string (enum)` | `"default"` | — |
| `columns` | `number` | `3` | Yes |
| `columnsMobile` | `number` | `1` | — |
| `columnsTablet` | `number` | `2` | — |
| `excludeKeywords` | `string` | `""` | — |
| `maxReviews` | `number` | `10` | — |
| `minRating` | `number` | `1` | — |
| `placeId` | `string` | `""` | — |
| `reviewRequestUrl` | `string` | `""` | — |
| `sgsAnimation` | `string` | `"fade-up"` | — |
| `sgsAnimationDuration` | `string` | `"medium"` | — |
| `sgsAnimationEasing` | `string` | `"ease-out"` | — |
| `showAggregate` | `boolean` | `true` | — |
| `showArrows` | `boolean` | `true` | — |
| `showAvatar` | `boolean` | `true` | — |
| `showBreakdown` | `boolean` | `false` | — |
| `showDate` | `boolean` | `true` | — |
| `showDots` | `boolean` | `true` | — |
| `showGoogleLogo` | `boolean` | `true` | — |
| `sortBy` | `string (enum)` | `"newest"` | — |
| `staggerDelay` | `number` | `60` | — |
| `starColour` | `string` | `"accent"` | — |
| `textColour` | `string` | `"text"` | — |
| `textOnly` | `boolean` | `false` | — |
| `theme` | `string (enum)` | `"light"` | — |
| `variant` | `string (enum)` | `"grid"` | — |

**Supports:**
- `align` (["wide", "full"]), `anchor`, `className`, `color` ({"background": true, "text"...), `html` (false), `interactivity`, `sgs` ({"imageControls": false})

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-google-reviews` |

---

### `sgs/heading`
_Section Heading_

**Type:** Dynamic

Composite section-heading cluster: optional eyebrow label, primary headline (h1–h4), and optional subheading paragraph. Mirrors sgs/hero label-family as a standalone reusable heading unit.

**Attributes** (144):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `backgroundColour` | `string` | `""` | — |
| `borderColour` | `string` | `""` | — |
| `borderRadius` | `string` | `""` | — |
| `borderRadiusBL` | `string` | `""` | — |
| `borderRadiusBR` | `string` | `""` | — |
| `borderRadiusTL` | `string` | `""` | — |
| `borderRadiusTR` | `string` | `""` | — |
| `borderRadiusUnit` | `string` | `"px"` | — |
| `borderStyle` | `string (enum)` | `"none"` | — |
| `borderWidthBottom` | `string` | `""` | — |
| `borderWidthLeft` | `string` | `""` | — |
| `borderWidthRight` | `string` | `""` | — |
| `borderWidthTop` | `string` | `""` | — |
| `borderWidthUnit` | `string` | `"px"` | — |
| `boxShadow` | `string` | `""` | — |
| `boxShadowHover` | `string` | `""` | — |
| `customWidth` | `string` | `""` | — |
| `customWidthUnit` | `string` | `"px"` | — |
| `emoji` | `string` | `""` | — |
| `headline` | `string` | `""` | — |
| `headlineColour` | `string` | `"text"` | — |
| `headlineFontFamily` | `string` | `""` | — |
| `headlineFontSize` | `number` | `28` | Yes |
| `headlineFontSizeMobile` | `number` | `—` | — |
| `headlineFontSizeTablet` | `number` | `—` | — |
| `headlineFontSizeUnit` | `string` | `"px"` | — |
| `headlineFontStyle` | `string (enum)` | `""` | — |
| `headlineFontWeight` | `string` | `"700"` | — |
| `headlineId` | `string` | `""` | — |
| `headlineLetterSpacing` | `number` | `—` | — |
| `headlineLetterSpacingUnit` | `string` | `"em"` | — |
| `headlineLevel` | `string (enum)` | `"h2"` | — |
| `headlineLineHeight` | `number` | `—` | — |
| `headlineLineHeightUnit` | `string` | `"em"` | — |
| `headlineMarginBottom` | `string` | `""` | Yes |
| `headlineMarginBottomMobile` | `string` | `""` | — |
| `headlineMarginBottomTablet` | `string` | `""` | — |
| `headlineMarginLeft` | `string` | `""` | Yes |
| `headlineMarginLeftMobile` | `string` | `""` | — |
| `headlineMarginLeftTablet` | `string` | `""` | — |
| `headlineMarginRight` | `string` | `""` | Yes |
| `headlineMarginRightMobile` | `string` | `""` | — |
| `headlineMarginRightTablet` | `string` | `""` | — |
| `headlineMarginTop` | `string` | `""` | Yes |
| `headlineMarginTopMobile` | `string` | `""` | — |
| `headlineMarginTopTablet` | `string` | `""` | — |
| `headlineMarginUnit` | `string` | `"px"` | — |
| `headlineTextDecoration` | `string (enum)` | `""` | — |
| `headlineTextTransform` | `string` | `""` | — |
| `hoverBackground` | `string` | `""` | — |
| `hoverColour` | `string` | `""` | — |
| `hoverScale` | `number` | `—` | — |
| `icon` | `string` | `""` | — |
| `iconPosition` | `string (enum)` | `"none"` | — |
| `inheritStyle` | `boolean` | `false` | — |
| `label` | `string` | `""` | — |
| `labelColour` | `string` | `"primary"` | — |
| `labelEnabled` | `boolean` | `true` | — |
| `labelFontFamily` | `string` | `""` | — |
| `labelFontSize` | `number` | `12` | Yes |
| `labelFontSizeMobile` | `number` | `—` | — |
| `labelFontSizeTablet` | `number` | `—` | — |
| `labelFontSizeUnit` | `string` | `"px"` | — |
| `labelFontStyle` | `string (enum)` | `""` | — |
| `labelFontWeight` | `string` | `"600"` | — |
| `labelLetterSpacing` | `number` | `0.08` | — |
| `labelLetterSpacingUnit` | `string` | `"em"` | — |
| `labelLineHeight` | `number` | `1.2` | — |
| `labelLineHeightUnit` | `string` | `"em"` | — |
| `labelMarginBottom` | `string` | `""` | Yes |
| `labelMarginBottomMobile` | `string` | `""` | — |
| `labelMarginBottomTablet` | `string` | `""` | — |
| `labelMarginLeft` | `string` | `""` | Yes |
| `labelMarginLeftMobile` | `string` | `""` | — |
| `labelMarginLeftTablet` | `string` | `""` | — |
| `labelMarginRight` | `string` | `""` | Yes |
| `labelMarginRightMobile` | `string` | `""` | — |
| `labelMarginRightTablet` | `string` | `""` | — |
| `labelMarginTop` | `string` | `""` | Yes |
| `labelMarginTopMobile` | `string` | `""` | — |
| `labelMarginTopTablet` | `string` | `""` | — |
| `labelMarginUnit` | `string` | `"px"` | — |
| `labelTag` | `string (enum)` | `"span"` | — |
| `labelTextDecoration` | `string (enum)` | `""` | — |
| `labelTextTransform` | `string` | `"uppercase"` | — |
| `marginBottom` | `string` | `""` | Yes |
| `marginBottomMobile` | `string` | `""` | — |
| `marginBottomTablet` | `string` | `""` | — |
| `marginLeft` | `string` | `""` | Yes |
| `marginLeftMobile` | `string` | `""` | — |
| `marginLeftTablet` | `string` | `""` | — |
| `marginRight` | `string` | `""` | Yes |
| `marginRightMobile` | `string` | `""` | — |
| `marginRightTablet` | `string` | `""` | — |
| `marginTop` | `string` | `""` | Yes |
| `marginTopMobile` | `string` | `""` | — |
| `marginTopTablet` | `string` | `""` | — |
| `marginUnit` | `string` | `"px"` | — |
| `paddingBottom` | `string` | `""` | Yes |
| `paddingBottomMobile` | `string` | `""` | — |
| `paddingBottomTablet` | `string` | `""` | — |
| `paddingLeft` | `string` | `""` | Yes |
| `paddingLeftMobile` | `string` | `""` | — |
| `paddingLeftTablet` | `string` | `""` | — |
| `paddingRight` | `string` | `""` | Yes |
| `paddingRightMobile` | `string` | `""` | — |
| `paddingRightTablet` | `string` | `""` | — |
| `paddingTop` | `string` | `""` | Yes |
| `paddingTopMobile` | `string` | `""` | — |
| `paddingTopTablet` | `string` | `""` | — |
| `paddingUnit` | `string` | `"px"` | — |
| `sub` | `string` | `""` | — |
| `subColour` | `string` | `"text-muted"` | — |
| `subEnabled` | `boolean` | `true` | — |
| `subFontFamily` | `string` | `""` | — |
| `subFontSize` | `number` | `16` | Yes |
| `subFontSizeMobile` | `number` | `—` | — |
| `subFontSizeTablet` | `number` | `—` | — |
| `subFontSizeUnit` | `string` | `"px"` | — |
| `subFontStyle` | `string (enum)` | `""` | — |
| `subFontWeight` | `string` | `"400"` | — |
| `subLetterSpacing` | `number` | `—` | — |
| `subLetterSpacingUnit` | `string` | `"em"` | — |
| `subLineHeight` | `number` | `—` | — |
| `subLineHeightUnit` | `string` | `"em"` | — |
| `subMarginBottom` | `string` | `""` | Yes |
| `subMarginBottomMobile` | `string` | `""` | — |
| `subMarginBottomTablet` | `string` | `""` | — |
| `subMarginLeft` | `string` | `""` | Yes |
| `subMarginLeftMobile` | `string` | `""` | — |
| `subMarginLeftTablet` | `string` | `""` | — |
| `subMarginRight` | `string` | `""` | Yes |
| `subMarginRightMobile` | `string` | `""` | — |
| `subMarginRightTablet` | `string` | `""` | — |
| `subMarginTop` | `string` | `""` | Yes |
| `subMarginTopMobile` | `string` | `""` | — |
| `subMarginTopTablet` | `string` | `""` | — |
| `subMarginUnit` | `string` | `"px"` | — |
| `subTag` | `string (enum)` | `"p"` | — |
| `subTextDecoration` | `string (enum)` | `""` | — |
| `subTextTransform` | `string` | `""` | — |
| `transitionDuration` | `number` | `300` | — |
| `transitionEasing` | `string (enum)` | `"ease"` | — |
| `variantStyle` | `string (enum)` | `"default"` | — |

**Supports:**
- `align`, `color` ({"text": true, "background"...), `html` (false), `spacing` ({"margin": true, "padding":...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-heading` |
| `typography` | `.wp-block-sgs-heading__headline` |

---

### `sgs/icon`
_SGS Icon_

**Type:** Dynamic

Icon from multiple sources — Lucide SVG, WordPress icons, Dashicons, or emoji — with size, colour, optional background shape, and optional link.

**Attributes** (21):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `ariaLabel` | `string` | `""` | — |
| `backgroundColour` | `string` | `"surface-alt"` | — |
| `backgroundShape` | `string` | `"none"` | — |
| `dashiconName` | `string` | `""` | — |
| `emojiChar` | `string` | `""` | — |
| `hoverColour` | `string` | `"accent-text"` | — |
| `hoverScale` | `number` | `1.1` | — |
| `icon` | `string` | `"star"` | — |
| `iconColour` | `string` | `"primary"` | — |
| `iconName` | `string` | `"star"` | — |
| `iconSize` | `number` | `32` | — |
| `iconSource` | `string (enum)` | `"lucide"` | — |
| `iconValue` | `object` | `—` | — |
| `link` | `string` | `""` | — |
| `linkLabel` | `string` | `""` | — |
| `linkOpensNewTab` | `boolean` | `false` | — |
| `linkRel` | `string` | `""` | — |
| `linkTarget` | `string (enum)` | `"_self"` | — |
| `linkUrl` | `string` | `""` | — |
| `size` | `number` | `48` | — |
| `wpIconName` | `string` | `""` | — |

**Supports:**
- `align` (["left", "center", "right"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `sgs` ({"imageControls": false}), `spacing` ({"margin": true, "padding":...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-icon` |

---

### `sgs/icon-block`
_SGS Icon Block_

**Type:** Dynamic

DEPRECATED — use sgs/icon instead. Kept registered so existing posts continue to parse. Hidden from the block inserter.

**Attributes** (12):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `backgroundColour` | `string` | `""` | — |
| `icon` | `string` | `"star"` | — |
| `iconColour` | `string` | `"primary"` | — |
| `iconSize` | `number` | `48` | — |
| `iconValue` | `object` | `—` | — |
| `link` | `string` | `""` | — |
| `linkLabel` | `string` | `""` | — |
| `linkOpensNewTab` | `boolean` | `false` | — |
| `sgsAnimation` | `string` | `"fade-up"` | — |
| `sgsAnimationDuration` | `string` | `"medium"` | — |
| `sgsAnimationEasing` | `string` | `"default"` | — |
| `shape` | `string` | `"none"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (false), `anchor`, `color` ({"background": true}), `html` (false), `inserter` (false), `spacing` ({"margin": true, "padding":...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-icon-block` |

---

### `sgs/icon-list`
_SGS Icon List_

**Type:** Dynamic

List with custom icons or checkmarks per item.

**Attributes** (23):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `bulletChar` | `string` | `"\u2022"` | — |
| `dividers` | `boolean` | `false` | — |
| `emojiChar` | `string` | `"\ud83d\udd25"` | — |
| `gap` | `string` | `"20"` | — |
| `icon` | `string` | `"check"` | — |
| `iconColour` | `string` | `"primary"` | — |
| `iconSize` | `string` | `"medium"` | — |
| `items` | `array` | `[{"icon": "check", "text": "First lis...` | — |
| `letterCase` | `string` | `"upper"` | — |
| `markerPattern` | `array` | `[{"type": "icon", "value": "check"}]` | — |
| `markerType` | `string` | `"icon"` | — |
| `mode` | `string` | `"normal"` | — |
| `numberStyle` | `string` | `"arabic"` | — |
| `subBulletChar` | `string` | `"\u25e6"` | — |
| `subEmojiChar` | `string` | `"\ud83d\udd38"` | — |
| `subIcon` | `string` | `"dot"` | — |
| `subIndent` | `number` | `24` | — |
| `subLetterCase` | `string` | `"lower"` | — |
| `subMarkerPattern` | `array` | `[{"type": "icon", "value": "dot"}]` | — |
| `subMarkerType` | `string` | `"inherit"` | — |
| `subMode` | `string` | `"inherit"` | — |
| `subNumberStyle` | `string` | `"arabic"` | — |
| `textColour` | `string` | `"text"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (false), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-icon-list` |
| `typography` | `.sgs-icon-list__text` |

---

### `sgs/info-box`
_SGS Info Box_

**Type:** Dynamic

Feature or benefit card with 5 toggleable, reorderable elements: media, title, subtitle, text, and button.

**Attributes** (54):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `blockLink` | `string` | `""` | — |
| `blockLinkTarget` | `boolean` | `false` | — |
| `boxMedia` | `object` | `—` | — |
| `cardStyle` | `string` | `"elevated"` | — |
| `description` | `string` | `""` | — |
| `descriptionColour` | `string` | `"text"` | — |
| `elementOrder` | `array` | `["media", "title", "subtitle", "text"...` | — |
| `heading` | `string` | `""` | — |
| `headingColour` | `string` | `"primary"` | — |
| `headingFontSize` | `string` | `—` | Yes |
| `headingFontSizeMobile` | `string` | `""` | — |
| `headingFontSizeTablet` | `string` | `""` | — |
| `hoverBackgroundColour` | `string` | `""` | — |
| `hoverBorderColour` | `string` | `""` | — |
| `hoverEffect` | `string` | `"lift"` | — |
| `hoverGrayscale` | `boolean` | `false` | — |
| `hoverImageZoom` | `boolean` | `false` | — |
| `hoverScale` | `string` | `""` | — |
| `hoverShadow` | `string` | `""` | — |
| `hoverTextColour` | `string` | `""` | — |
| `icon` | `string` | `"star-filled"` | — |
| `iconBackgroundColour` | `string` | `"accent-light"` | — |
| `iconColour` | `string` | `"primary"` | — |
| `iconPosition` | `string (enum)` | `"top"` | — |
| `iconSize` | `string` | `"medium"` | Yes |
| `iconSizeMobile` | `string` | `""` | — |
| `iconSizeTablet` | `string` | `""` | — |
| `iconValue` | `object` | `—` | — |
| `image` | `object` | `—` | — |
| `letterSpacing` | `string` | `""` | — |
| `link` | `string` | `—` | — |
| `linkOpensNewTab` | `boolean` | `false` | — |
| `mediaEmoji` | `string` | `""` | — |
| `mediaType` | `string (enum)` | `"icon"` | — |
| `sgsAnimation` | `string` | `"fade-up"` | — |
| `sgsAnimationDuration` | `string` | `"medium"` | — |
| `sgsAnimationEasing` | `string` | `"default"` | — |
| `showButton` | `boolean` | `false` | — |
| `showMedia` | `boolean` | `true` | — |
| `showSubtitle` | `boolean` | `false` | — |
| `showText` | `boolean` | `true` | — |
| `showTitle` | `boolean` | `true` | — |
| `staggerDelay` | `number` | `0` | — |
| `subtitle` | `string` | `""` | — |
| `subtitleColour` | `string` | `""` | — |
| `subtitleFontSize` | `string` | `""` | Yes |
| `subtitleFontSizeMobile` | `string` | `""` | — |
| `subtitleFontSizeTablet` | `string` | `""` | — |
| `textAlignDesktop` | `string` | `""` | — |
| `textAlignMobile` | `string` | `""` | — |
| `textAlignTablet` | `string` | `""` | — |
| `textTransform` | `string` | `""` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease-in-out"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (false), `anchor`, `color` ({"background": true, "text"...), `html` (false), `sgs` ({"imageControls": true}), `shadow`, `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-info-box` |
| `typography` | `.sgs-info-box__heading` |

---

### `sgs/label`
_Label_

**Type:** Dynamic

Atomic eyebrow / kicker / badge text block. Three style variants: plain text, full-width pill fill, content-width pill wrap. Reusable for section eyebrows, card-tag badges, and intro labels.

**Attributes** (22):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `backgroundColour` | `string` | `"primary"` | — |
| `borderRadius` | `number` | `6` | — |
| `fontFamily` | `string` | `""` | — |
| `fontSize` | `number` | `12` | Yes |
| `fontSizeMobile` | `number` | `—` | — |
| `fontSizeTablet` | `number` | `—` | — |
| `fontSizeUnit` | `string` | `"px"` | — |
| `fontWeight` | `string` | `"600"` | — |
| `letterSpacing` | `number` | `0.08` | — |
| `letterSpacingUnit` | `string` | `"em"` | — |
| `lineHeight` | `number` | `1.2` | — |
| `lineHeightUnit` | `string` | `"em"` | — |
| `paddingBottom` | `number` | `4` | — |
| `paddingLeft` | `number` | `12` | — |
| `paddingRight` | `number` | `12` | — |
| `paddingTop` | `number` | `4` | — |
| `tag` | `string (enum)` | `"span"` | — |
| `text` | `string` | `""` | — |
| `textColour` | `string` | `"primary"` | — |
| `textDecoration` | `string` | `""` | — |
| `textTransform` | `string` | `"uppercase"` | — |
| `variantStyle` | `string (enum)` | `"plain"` | — |

**Supports:**
- `align`, `color` ({"text": true, "background"...), `html` (false), `spacing` ({"margin": true, "padding":...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-label` |
| `typography` | `.wp-block-sgs-label` |

---

### `sgs/media`
_SGS Media_

**Type:** Dynamic

Content image block. Replaces core/image in the SGS clone-pipeline converter so styling attributes lift correctly to the frontend via server-side render.

**Attributes** (75):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `alignment` | `string (enum)` | `"left"` | — |
| `aspectRatio` | `string` | `""` | — |
| `borderRadius` | `string` | `""` | — |
| `borderRadiusBL` | `string` | `""` | — |
| `borderRadiusBR` | `string` | `""` | — |
| `borderRadiusTL` | `string` | `""` | — |
| `borderRadiusTR` | `string` | `""` | — |
| `borderRadiusUnit` | `string` | `"px"` | — |
| `boxShadow` | `string` | `""` | — |
| `caption` | `string` | `""` | — |
| `captionColour` | `string` | `""` | — |
| `captionFontSize` | `integer` | `—` | — |
| `captionFontSizeUnit` | `string` | `"px"` | — |
| `captionTag` | `string (enum)` | `"figcaption"` | — |
| `decorMedia` | `object` | `—` | — |
| `fadeOnScroll` | `boolean` | `false` | — |
| `flipX` | `boolean` | `false` | — |
| `hideOnMobile` | `boolean` | `false` | — |
| `hideOnTablet` | `boolean` | `false` | — |
| `imageAlt` | `string` | `""` | — |
| `imageHeight` | `integer` | `—` | — |
| `imageId` | `integer` | `—` | — |
| `imageUrl` | `string` | `""` | — |
| `imageWidth` | `integer` | `—` | — |
| `linkOpensNewTab` | `boolean` | `false` | — |
| `linkRel` | `string` | `""` | — |
| `linkUrl` | `string` | `""` | — |
| `maxHeight` | `string` | `—` | Yes |
| `maxHeightMobile` | `string` | `—` | — |
| `maxHeightTablet` | `string` | `—` | — |
| `maxHeightUnit` | `string` | `"px"` | — |
| `maxWidth` | `string` | `—` | Yes |
| `maxWidthMobile` | `string` | `—` | — |
| `maxWidthPercent` | `number` | `20` | — |
| `maxWidthTablet` | `string` | `—` | — |
| `maxWidthUnit` | `string` | `"px"` | — |
| `mediaType` | `string` | `"image"` | — |
| `objectFit` | `string (enum)` | `"cover"` | — |
| `objectPosition` | `string` | `"center center"` | — |
| `opacity` | `number` | `1` | — |
| `order` | `integer` | `—` | Yes |
| `orderMobile` | `integer` | `—` | — |
| `orderTablet` | `integer` | `—` | — |
| `overflow` | `string` | `"visible"` | — |
| `parallaxStrength` | `number` | `0` | — |
| `pathDrawDurationMs` | `number` | `1500` | — |
| `pathDrawEasing` | `string` | `"ease-out"` | — |
| `pathDrawOnScroll` | `boolean` | `false` | — |
| `pathDrawTriggerOffset` | `number` | `20` | — |
| `playbackMode` | `string` | `"autoplay-no-ui"` | — |
| `positionX` | `number` | `50` | Yes |
| `positionXMobile` | `number` | `—` | — |
| `positionXTablet` | `number` | `—` | — |
| `positionY` | `number` | `50` | Yes |
| `positionYMobile` | `number` | `—` | — |
| `positionYTablet` | `number` | `—` | — |
| `rotation` | `number` | `0` | Yes |
| `rotationMobile` | `number` | `—` | — |
| `rotationTablet` | `number` | `—` | — |
| `videoAlt` | `string` | `""` | — |
| `videoAttachmentId` | `number` | `0` | — |
| `videoAutoplay` | `boolean` | `true` | — |
| `videoControls` | `boolean` | `false` | — |
| `videoLazyLoad` | `boolean` | `true` | — |
| `videoLoop` | `boolean` | `true` | — |
| `videoMuted` | `boolean` | `true` | — |
| `videoPosterAttachmentId` | `number` | `0` | — |
| `videoPosterUrl` | `string` | `""` | — |
| `videoSchema` | `boolean` | `true` | — |
| `videoSource` | `string` | `"local"` | — |
| `videoUrl` | `string` | `""` | — |
| `width` | `number` | `200` | Yes |
| `widthMobile` | `number` | `—` | — |
| `widthTablet` | `number` | `—` | — |
| `zIndex` | `number` | `1` | — |

**Supports:**
- `anchor`, `className`, `color` (false), `html` (false), `sgs` ({"imageControls": true})

---

### `sgs/multi-button`
_SGS Button Group_

**Type:** Dynamic

A flexible container for one or more SGS Buttons. Provides per-breakpoint layout, gap, alignment, and wrap controls.

**Attributes** (14):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `alignItems` | `string` | `"center"` | — |
| `direction` | `string` | `"row"` | Yes |
| `directionMobile` | `string` | `"column"` | — |
| `directionTablet` | `string` | `""` | — |
| `gap` | `number` | `12` | Yes |
| `gapMobile` | `number` | `8` | — |
| `gapTablet` | `number` | `—` | — |
| `gapUnit` | `string` | `"px"` | — |
| `justifyContent` | `string` | `"flex-start"` | Yes |
| `justifyContentMobile` | `string` | `""` | — |
| `justifyContentTablet` | `string` | `""` | — |
| `wrap` | `string` | `"wrap"` | Yes |
| `wrapMobile` | `string` | `"wrap"` | — |
| `wrapTablet` | `string` | `""` | — |

**Supports:**
- `anchor`, `customClassName`, `html` (false)

---

### `sgs/notice-banner`
_SGS Notice Banner_

**Type:** Dynamic

Inline informational banner for contextual messages like minimum order values, delivery terms, or promotional notices.

**Attributes** (7):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `customIcon` | `object` | `{"source": "", "value": "", "label": ""}` | — |
| `dismissible` | `boolean` | `false` | — |
| `icon` | `string` | `"info"` | — |
| `text` | `string` | `""` | — |
| `textColour` | `string` | `"text"` | — |
| `textFontSize` | `string` | `—` | — |
| `variant` | `string` | `"info"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": false, "text...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.sgs-notice-banner` |
| `typography` | `.sgs-notice-banner__text` |

---

### `sgs/post-grid`
_SGS Post Grid_

**Type:** Dynamic

Display posts in grid, list, masonry, or carousel layouts with AJAX filtering and pagination.

**Attributes** (58):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `aspectRatio` | `string` | `"16/10"` | — |
| `author` | `number` | `0` | — |
| `cardBgColour` | `string` | `"surface"` | — |
| `cardStyle` | `string (enum)` | `"card"` | — |
| `carouselAutoplay` | `boolean` | `false` | — |
| `carouselShowArrows` | `boolean` | `true` | — |
| `carouselShowDots` | `boolean` | `true` | — |
| `carouselSpeed` | `number` | `5000` | — |
| `categories` | `array` | `[]` | — |
| `categoryBadgeBgColour` | `string` | `"primary"` | — |
| `categoryBadgeColour` | `string` | `"text-inverse"` | — |
| `columns` | `number` | `3` | Yes |
| `columnsMobile` | `number` | `1` | — |
| `columnsTablet` | `number` | `2` | — |
| `excerptColour` | `string` | `"text"` | — |
| `excerptLength` | `number` | `20` | — |
| `exclude` | `array` | `[]` | — |
| `excludeCurrent` | `boolean` | `true` | — |
| `filterTaxonomy` | `string` | `"category"` | — |
| `gap` | `string` | `"30"` | — |
| `hoverBackgroundColour` | `string` | `—` | — |
| `hoverBorderColour` | `string` | `—` | — |
| `hoverImageZoom` | `boolean` | `true` | — |
| `hoverScale` | `string` | `""` | — |
| `hoverShadow` | `string` | `""` | — |
| `hoverTextColour` | `string` | `—` | — |
| `imageSize` | `string` | `"medium_large"` | — |
| `inherit` | `boolean` | `false` | — |
| `layout` | `string (enum)` | `"grid"` | — |
| `metaColour` | `string` | `"text-muted"` | — |
| `namespace` | `string` | `""` | — |
| `offset` | `number` | `0` | — |
| `order` | `string` | `"desc"` | — |
| `orderBy` | `string` | `"date"` | — |
| `pagination` | `string (enum)` | `"none"` | — |
| `postType` | `string` | `"post"` | — |
| `postsPerPage` | `number` | `6` | — |
| `readMoreColour` | `string` | `"primary"` | — |
| `readMoreText` | `string` | `"Read more"` | — |
| `search` | `string` | `""` | — |
| `sgsAnimation` | `string` | `"fade-up"` | — |
| `sgsAnimationDuration` | `string` | `"medium"` | — |
| `sgsAnimationEasing` | `string` | `"ease-out"` | — |
| `showAuthor` | `boolean` | `false` | — |
| `showCategory` | `boolean` | `true` | — |
| `showDate` | `boolean` | `true` | — |
| `showExcerpt` | `boolean` | `true` | — |
| `showFilters` | `boolean` | `false` | — |
| `showImage` | `boolean` | `true` | — |
| `showReadMore` | `boolean` | `true` | — |
| `showTitle` | `boolean` | `true` | — |
| `staggerDelay` | `number` | `60` | — |
| `tags` | `array` | `[]` | — |
| `taxQuery` | `object` | `{}` | — |
| `titleColour` | `string` | `"primary"` | — |
| `titleFontSize` | `string` | `—` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-post-grid` |
| `typography` | `.sgs-post-grid__title` |

---

### `sgs/pricing-table`
_SGS Pricing Table_

**Type:** Dynamic

Pricing plans displayed in responsive columns with features, CTAs, monthly/yearly toggle, and optional badges.

**Attributes** (20):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `billingToggle` | `string (enum)` | `"monthly-yearly"` | — |
| `billingToggleMonthlyLabel` | `string` | `"Monthly"` | — |
| `billingToggleYearlyLabel` | `string` | `"Yearly"` | — |
| `columns` | `number` | `3` | — |
| `ctaBackground` | `string` | `—` | — |
| `ctaColour` | `string` | `—` | — |
| `ctaStyle` | `string` | `"accent"` | — |
| `featureColour` | `string` | `"text"` | — |
| `plans` | `array` | `[{"name": "Starter", "price": "\u00a3...` | — |
| `popularBadgeBackground` | `string` | `"accent"` | — |
| `popularBadgeColour` | `string` | `"text"` | — |
| `popularBadgeText` | `string` | `"Popular"` | — |
| `priceColour` | `string` | `"text"` | — |
| `sgsAnimation` | `string` | `"slide-up"` | — |
| `sgsAnimationDuration` | `string` | `"medium"` | — |
| `sgsAnimationEasing` | `string` | `"default"` | — |
| `staggerDelay` | `number` | `100` | — |
| `style` | `string` | `"card"` | — |
| `titleColour` | `string` | `"text"` | — |
| `toggleStyle` | `string (enum)` | `"text"` | — |

**Supports:**
- `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `sgs` ({"imageControls": false}), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-pricing-table` |
| `typography` | `.sgs-pricing-table__title` |

---

### `sgs/process-steps`
_SGS Process Steps_

**Type:** Dynamic

Horizontal timeline showing a multi-step process.

**Attributes** (17):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `connectorStyle` | `string` | `"line"` | — |
| `descriptionColour` | `string` | `"text-muted"` | — |
| `hoverBackgroundColour` | `string` | `""` | — |
| `hoverBorderColour` | `string` | `""` | — |
| `hoverEffect` | `string` | `"none"` | — |
| `hoverTextColour` | `string` | `""` | — |
| `numberBackground` | `string` | `"primary"` | — |
| `numberColour` | `string` | `"text-inverse"` | — |
| `numberStyle` | `string` | `"circle"` | — |
| `sgsAnimation` | `string` | `"fade-up"` | — |
| `sgsAnimationDuration` | `string` | `"medium"` | — |
| `sgsAnimationEasing` | `string` | `"ease-out"` | — |
| `staggerDelay` | `number` | `80` | — |
| `steps` | `array` | `[{"number": "1", "title": "First Step...` | — |
| `titleColour` | `string` | `"text"` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease-in-out"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `shadow`, `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.sgs-process-steps` |
| `typography` | `.sgs-process-steps__title` |

---

### `sgs/product-card`
_Product Card_

**Type:** Dynamic

Static product card with pack-size variant pills, price and CTA. Pure visual block — does not yet wire to cart. Pair the standard variant with the trial variant for the canonical 'main + trial' two-up layout.

**Attributes** (11):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `ctaText` | `string` | `""` | — |
| `ctaUrl` | `string` | `""` | — |
| `description` | `string` | `""` | — |
| `image` | `string` | `""` | — |
| `imageAlt` | `string` | `""` | — |
| `packSizes` | `array` | `[]` | — |
| `priceLarge` | `string` | `""` | — |
| `priceNote` | `string` | `""` | — |
| `productName` | `string` | `""` | — |
| `trialTag` | `string` | `""` | — |
| `variantStyle` | `string (enum)` | `"standard"` | — |

**Supports:**
- `align` (false), `html` (false), `sgs` ({"imageControls": true}), `spacing` ({"margin": true, "padding":...)

---

### `sgs/quote`
_Quote_

**Type:** Dynamic

Attributed blockquote with body paragraphs and an optional footer attribution. Emits semantic <blockquote> + <footer> so converter-pipeline outputs preserve the correct HTML5 structure and inheritable italic styling.

**Attributes** (92):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `attribution` | `string` | `""` | — |
| `attributionColour` | `string` | `""` | — |
| `attributionEnabled` | `boolean` | `true` | — |
| `attributionFontFamily` | `string` | `""` | — |
| `attributionFontSize` | `number` | `—` | Yes |
| `attributionFontSizeMobile` | `number` | `—` | — |
| `attributionFontSizeTablet` | `number` | `—` | — |
| `attributionFontSizeUnit` | `string` | `"px"` | — |
| `attributionFontStyle` | `string (enum)` | `""` | — |
| `attributionFontWeight` | `string` | `""` | — |
| `attributionLineHeight` | `number` | `—` | — |
| `attributionLineHeightUnit` | `string` | `"em"` | — |
| `attributionMarginTop` | `number` | `—` | Yes |
| `attributionMarginTopMobile` | `number` | `—` | — |
| `attributionMarginTopTablet` | `number` | `—` | — |
| `attributionMarginUnit` | `string` | `"px"` | — |
| `attributionTag` | `string (enum)` | `"footer"` | — |
| `attributionTextDecoration` | `string (enum)` | `""` | — |
| `attributionTextTransform` | `string (enum)` | `""` | — |
| `backgroundColour` | `string` | `""` | — |
| `body` | `array` | `[]` | — |
| `bodyColour` | `string` | `""` | — |
| `bodyFontFamily` | `string` | `""` | — |
| `bodyFontSize` | `number` | `—` | Yes |
| `bodyFontSizeMobile` | `number` | `—` | — |
| `bodyFontSizeTablet` | `number` | `—` | — |
| `bodyFontSizeUnit` | `string` | `"px"` | — |
| `bodyFontStyle` | `string (enum)` | `"italic"` | — |
| `bodyFontWeight` | `string` | `""` | — |
| `bodyLetterSpacing` | `number` | `—` | — |
| `bodyLetterSpacingUnit` | `string` | `"em"` | — |
| `bodyLineHeight` | `number` | `—` | Yes |
| `bodyLineHeightMobile` | `number` | `—` | — |
| `bodyLineHeightTablet` | `number` | `—` | — |
| `bodyLineHeightUnit` | `string` | `"em"` | — |
| `bodyMarginBottom` | `number` | `—` | Yes |
| `bodyMarginBottomMobile` | `number` | `—` | — |
| `bodyMarginBottomTablet` | `number` | `—` | — |
| `bodyMarginUnit` | `string` | `"px"` | — |
| `bodyTag` | `string (enum)` | `"p"` | — |
| `bodyTextDecoration` | `string (enum)` | `""` | — |
| `bodyTextTransform` | `string (enum)` | `""` | — |
| `borderColour` | `string` | `""` | — |
| `borderRadius` | `string` | `""` | — |
| `borderRadiusBL` | `string` | `""` | — |
| `borderRadiusBR` | `string` | `""` | — |
| `borderRadiusTL` | `string` | `""` | — |
| `borderRadiusTR` | `string` | `""` | — |
| `borderRadiusUnit` | `string` | `"px"` | — |
| `borderStyle` | `string (enum)` | `"none"` | — |
| `borderWidthBottom` | `string` | `""` | — |
| `borderWidthLeft` | `string` | `""` | — |
| `borderWidthRight` | `string` | `""` | — |
| `borderWidthTop` | `string` | `""` | — |
| `borderWidthUnit` | `string` | `"px"` | — |
| `boxShadow` | `string` | `""` | — |
| `boxShadowHover` | `string` | `""` | — |
| `customWidth` | `string` | `""` | — |
| `customWidthUnit` | `string` | `"px"` | — |
| `hoverBackground` | `string` | `""` | — |
| `hoverColour` | `string` | `""` | — |
| `hoverScale` | `number` | `—` | — |
| `inheritStyle` | `boolean` | `false` | — |
| `marginBottom` | `string` | `""` | Yes |
| `marginBottomMobile` | `string` | `""` | — |
| `marginBottomTablet` | `string` | `""` | — |
| `marginLeft` | `string` | `""` | Yes |
| `marginLeftMobile` | `string` | `""` | — |
| `marginLeftTablet` | `string` | `""` | — |
| `marginRight` | `string` | `""` | Yes |
| `marginRightMobile` | `string` | `""` | — |
| `marginRightTablet` | `string` | `""` | — |
| `marginTop` | `string` | `""` | Yes |
| `marginTopMobile` | `string` | `""` | — |
| `marginTopTablet` | `string` | `""` | — |
| `marginUnit` | `string` | `"px"` | — |
| `paddingBottom` | `string` | `""` | Yes |
| `paddingBottomMobile` | `string` | `""` | — |
| `paddingBottomTablet` | `string` | `""` | — |
| `paddingLeft` | `string` | `""` | Yes |
| `paddingLeftMobile` | `string` | `""` | — |
| `paddingLeftTablet` | `string` | `""` | — |
| `paddingRight` | `string` | `""` | Yes |
| `paddingRightMobile` | `string` | `""` | — |
| `paddingRightTablet` | `string` | `""` | — |
| `paddingTop` | `string` | `""` | Yes |
| `paddingTopMobile` | `string` | `""` | — |
| `paddingTopTablet` | `string` | `""` | — |
| `paddingUnit` | `string` | `"px"` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease-in-out"` | — |
| `variantStyle` | `string (enum)` | `"default"` | — |

**Supports:**
- `anchor`, `className`, `color` (false), `html` (false)

---

### `sgs/responsive-logo`
_SGS Responsive Logo_

**Type:** Dynamic

Three-slot logo block (desktop / tablet / mobile) with optional SVG animation. Replaces core/site-logo in SGS header patterns. Competitive moat: H/Square/Mark aspect-ratio variants per breakpoint.

**Attributes** (8):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `alt` | `string` | `""` | — |
| `animationStyle` | `string (enum)` | `"none"` | — |
| `desktopLogoId` | `number` | `—` | — |
| `linkToHome` | `boolean` | `true` | — |
| `mobileLogoId` | `number` | `—` | — |
| `svgAnimationSource` | `number` | `—` | — |
| `tabletLogoId` | `number` | `—` | — |
| `width` | `number` | `240` | — |

**Supports:**
- `_comment_parallax` ("Parallax deliberately excl...), `align` (["left", "center", "right",...), `anchor`, `html` (false), `sgs` ({"imageControls": true}), `spacing` ({"margin": true, "padding":...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-responsive-logo` |

---

### `sgs/social-icons`
_SGS Social Icons_

**Type:** Dynamic

Row of social media platform icons with links. Supports Facebook, Instagram, LinkedIn, X, YouTube, TikTok, and more. Configurable size, style, and hover colour.

**Attributes** (6):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `gap` | `string` | `"20"` | — |
| `hoverColour` | `string` | `"primary"` | — |
| `iconColour` | `string` | `"text-muted"` | — |
| `iconSize` | `number` | `24` | — |
| `icons` | `array` | `[]` | — |
| `style` | `string` | `"plain"` | — |

**Supports:**
- `align` (false), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"textAlign": true})

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-social-icons` |

---

### `sgs/star-rating`
_SGS Star Rating_

**Type:** Dynamic

Star rating display with half-star support and schema.org markup.

**Attributes** (11):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `displayMode` | `string (enum)` | `"stars-only"` | — |
| `emptyColour` | `string` | `"border-subtle"` | — |
| `label` | `string` | `""` | — |
| `maxRating` | `number` | `5` | — |
| `rating` | `number` | `5` | — |
| `schemaEnabled` | `boolean` | `true` | — |
| `schemaItemName` | `string` | `""` | — |
| `schemaReviewCount` | `number` | `1` | — |
| `showNumeric` | `boolean` | `false` | — |
| `starColour` | `string` | `"accent"` | — |
| `starSize` | `number` | `24` | — |

**Supports:**
- `align` (false), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-star-rating` |

---

### `sgs/table-of-contents`
_SGS Table of Contents_

**Type:** Dynamic

Auto-generated table of contents from heading blocks. Smooth scroll, scroll spy, collapsible.

**Attributes** (12):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `activeLinkColour` | `string` | `"primary"` | — |
| `collapsible` | `boolean` | `true` | — |
| `defaultCollapsed` | `boolean` | `false` | — |
| `headingLevels` | `array` | `[2, 3, 4]` | — |
| `linkColour` | `string` | `"text-muted"` | — |
| `listStyle` | `string` | `"numbered"` | — |
| `scrollOffset` | `number` | `0` | — |
| `scrollSpy` | `boolean` | `true` | — |
| `smoothScroll` | `boolean` | `true` | — |
| `style` | `string` | `"card"` | — |
| `title` | `string` | `"Table of Contents"` | — |
| `titleColour` | `string` | `"text"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-table-of-contents` |
| `typography` | `.sgs-toc__title` |

---

### `sgs/team-member`
_SGS Team Member_

**Type:** Dynamic

Team member card with photo, name, role, bio, and social links.

**Attributes** (33):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `bio` | `string` | `""` | — |
| `blockLink` | `string` | `""` | — |
| `blockLinkTarget` | `boolean` | `false` | — |
| `cardStyle` | `string` | `"elevated"` | — |
| `hoverGrayscale` | `boolean` | `false` | — |
| `hoverImageZoom` | `boolean` | `false` | — |
| `hoverOverlay` | `boolean` | `false` | — |
| `hoverScale` | `string` | `""` | — |
| `hoverShadow` | `string` | `""` | — |
| `memberMedia` | `object` | `—` | — |
| `name` | `string` | `""` | — |
| `nameColour` | `string` | `"primary"` | — |
| `photo` | `object` | `—` | — |
| `photoShape` | `string` | `"circle"` | — |
| `role` | `string` | `""` | — |
| `roleColour` | `string` | `"text-muted"` | — |
| `sgsAnimation` | `string` | `"fade-up"` | — |
| `sgsAnimationDuration` | `string` | `"medium"` | — |
| `sgsAnimationEasing` | `string` | `"default"` | — |
| `sgsBlockLink` | `string` | `""` | — |
| `sgsBlockLinkTarget` | `boolean` | `false` | — |
| `sgsHoverBgColour` | `string` | `""` | — |
| `sgsHoverBorderColour` | `string` | `""` | — |
| `sgsHoverDuration` | `string` | `"medium"` | — |
| `sgsHoverGrayscale` | `boolean` | `false` | — |
| `sgsHoverImageZoom` | `boolean` | `false` | — |
| `sgsHoverScale` | `number` | `0` | — |
| `sgsHoverShadow` | `string` | `""` | — |
| `sgsHoverTextColour` | `string` | `""` | — |
| `socialLinks` | `array` | `[]` | — |
| `staggerDelay` | `number` | `80` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease-in-out"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (false), `anchor`, `color` ({"background": true, "text"...), `html` (false), `sgs` ({"imageControls": true}), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "textAli...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-team-member` |
| `typography` | `.sgs-team-member__name` |

---

### `sgs/testimonial`
_SGS Testimonial_

**Type:** Dynamic

Single testimonial card with quote, name, role, optional avatar, and star rating.

**Attributes** (29):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `authorMedia` | `object` | `—` | — |
| `avatar` | `object` | `—` | — |
| `hoverBackgroundColour` | `string` | `""` | — |
| `hoverBorderColour` | `string` | `""` | — |
| `hoverEffect` | `string` | `"none"` | — |
| `hoverScale` | `string` | `""` | — |
| `hoverShadow` | `string` | `""` | — |
| `hoverTextColour` | `string` | `""` | — |
| `name` | `string` | `""` | — |
| `nameColour` | `string` | `"primary"` | — |
| `nameFontSize` | `string` | `—` | Yes |
| `nameFontSizeMobile` | `string` | `""` | — |
| `nameFontSizeTablet` | `string` | `""` | — |
| `quote` | `string` | `""` | — |
| `quoteColour` | `string` | `"text"` | — |
| `rating` | `number` | `0` | — |
| `ratingColour` | `string` | `"accent"` | — |
| `reviewDate` | `string` | `""` | — |
| `reviewSource` | `string` | `""` | — |
| `role` | `string` | `""` | — |
| `roleColour` | `string` | `"text-muted"` | — |
| `schemaEnabled` | `boolean` | `false` | — |
| `sgsAnimation` | `string` | `"fade-up"` | — |
| `sgsAnimationDuration` | `string` | `"medium"` | — |
| `sgsAnimationEasing` | `string` | `"default"` | — |
| `staggerDelay` | `number` | `0` | — |
| `style` | `string` | `"card"` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease-in-out"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (false), `anchor`, `color` ({"background": true, "text"...), `html` (false), `sgs` ({"imageControls": true}), `shadow`, `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.sgs-testimonial` |
| `typography` | `.sgs-testimonial__quote` |

---

### `sgs/testimonial-slider`
_SGS Testimonial Slider_

**Type:** Dynamic

Carousel of testimonials with CSS scroll-snap and optional autoplay.

**Attributes** (20):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `autoplay` | `boolean` | `true` | — |
| `autoplaySpeed` | `number` | `5000` | — |
| `cardStyle` | `string` | `"card"` | — |
| `hoverBackgroundColour` | `string` | `""` | — |
| `hoverBorderColour` | `string` | `""` | — |
| `hoverEffect` | `string` | `"none"` | — |
| `hoverTextColour` | `string` | `""` | — |
| `layout` | `string (enum)` | `"full"` | — |
| `nameColour` | `string` | `"primary"` | — |
| `nameFontSize` | `string` | `—` | — |
| `quoteColour` | `string` | `"text"` | — |
| `ratingColour` | `string` | `"accent"` | — |
| `roleColour` | `string` | `"text-muted"` | — |
| `showArrows` | `boolean` | `true` | — |
| `showDots` | `boolean` | `true` | — |
| `sideImage` | `object` | `—` | — |
| `slidesVisible` | `number` | `1` | — |
| `testimonials` | `array` | `[]` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease-in-out"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `sgs` ({"imageControls": true}), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-testimonial-slider` |
| `typography` | `.sgs-testimonial-slider__quote` |

---

### `sgs/text`
_Text_

**Type:** Dynamic

Single-element body text block. Emits one configurable HTML tag with full SGS typography, spacing, colour, border, shadow, and hover controls. Replaces core/paragraph in the converter pipeline so inline-style attributes reach the rendered DOM.

**Attributes** (79):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `backgroundColour` | `string` | `""` | — |
| `borderColour` | `string` | `""` | — |
| `borderRadius` | `string` | `""` | — |
| `borderRadiusBL` | `string` | `""` | — |
| `borderRadiusBR` | `string` | `""` | — |
| `borderRadiusTL` | `string` | `""` | — |
| `borderRadiusTR` | `string` | `""` | — |
| `borderRadiusUnit` | `string` | `"px"` | — |
| `borderStyle` | `string (enum)` | `"none"` | — |
| `borderWidthBottom` | `string` | `""` | — |
| `borderWidthLeft` | `string` | `""` | — |
| `borderWidthRight` | `string` | `""` | — |
| `borderWidthTop` | `string` | `""` | — |
| `borderWidthUnit` | `string` | `"px"` | — |
| `boxShadow` | `string` | `""` | — |
| `boxShadowHover` | `string` | `""` | — |
| `customWidth` | `string` | `""` | — |
| `customWidthUnit` | `string` | `"px"` | — |
| `dropCap` | `boolean` | `false` | — |
| `firstLetterColour` | `string` | `""` | — |
| `firstLetterFontSize` | `number` | `—` | — |
| `firstLetterFontSizeUnit` | `string` | `"em"` | — |
| `firstLetterFontWeight` | `string` | `""` | — |
| `fontFamily` | `string` | `""` | — |
| `fontSize` | `number` | `—` | Yes |
| `fontSizeMobile` | `number` | `—` | — |
| `fontSizeTablet` | `number` | `—` | — |
| `fontSizeUnit` | `string` | `"px"` | — |
| `fontStyle` | `string (enum)` | `""` | — |
| `fontWeight` | `string` | `""` | — |
| `hoverBackground` | `string` | `""` | — |
| `hoverColour` | `string` | `""` | — |
| `hoverScale` | `number` | `—` | — |
| `inheritStyle` | `boolean` | `false` | — |
| `letterSpacing` | `number` | `—` | Yes |
| `letterSpacingMobile` | `string` | `""` | — |
| `letterSpacingTablet` | `string` | `""` | — |
| `letterSpacingUnit` | `string` | `"em"` | — |
| `lineHeight` | `number` | `—` | Yes |
| `lineHeightMobile` | `number` | `—` | — |
| `lineHeightTablet` | `number` | `—` | — |
| `lineHeightUnit` | `string` | `"em"` | — |
| `marginBottom` | `number` | `—` | Yes |
| `marginBottomMobile` | `number` | `—` | — |
| `marginBottomTablet` | `number` | `—` | — |
| `marginLeft` | `number` | `—` | Yes |
| `marginLeftMobile` | `number` | `—` | — |
| `marginLeftTablet` | `number` | `—` | — |
| `marginRight` | `number` | `—` | Yes |
| `marginRightMobile` | `number` | `—` | — |
| `marginRightTablet` | `number` | `—` | — |
| `marginTop` | `number` | `—` | Yes |
| `marginTopMobile` | `number` | `—` | — |
| `marginTopTablet` | `number` | `—` | — |
| `marginUnit` | `string` | `"px"` | — |
| `maxWidth` | `number` | `—` | — |
| `maxWidthUnit` | `string` | `"px"` | — |
| `paddingBottom` | `number` | `—` | Yes |
| `paddingBottomMobile` | `number` | `—` | — |
| `paddingBottomTablet` | `number` | `—` | — |
| `paddingLeft` | `number` | `—` | Yes |
| `paddingLeftMobile` | `number` | `—` | — |
| `paddingLeftTablet` | `number` | `—` | — |
| `paddingRight` | `number` | `—` | Yes |
| `paddingRightMobile` | `number` | `—` | — |
| `paddingRightTablet` | `number` | `—` | — |
| `paddingTop` | `number` | `—` | Yes |
| `paddingTopMobile` | `number` | `—` | — |
| `paddingTopTablet` | `number` | `—` | — |
| `paddingUnit` | `string` | `"px"` | — |
| `tag` | `string (enum)` | `"p"` | — |
| `text` | `string` | `""` | — |
| `textAlign` | `string (enum)` | `""` | — |
| `textColour` | `string` | `""` | — |
| `textDecoration` | `string (enum)` | `""` | — |
| `textTransform` | `string (enum)` | `""` | — |
| `transitionDuration` | `number` | `300` | — |
| `transitionEasing` | `string (enum)` | `"ease"` | — |
| `variantStyle` | `string (enum)` | `"default"` | — |

**Supports:**
- `anchor`, `className`, `color` (false), `html` (false)

---

### `sgs/timeline`
_SGS Timeline_

**Type:** Dynamic

Date-based timeline with vertical or horizontal orientation and scroll-reveal animation.

**Attributes** (8):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `alignment` | `string` | `"alternating"` | — |
| `connectorColour` | `string` | `"border-subtle"` | — |
| `connectorStyle` | `string` | `"line"` | — |
| `dateColour` | `string` | `"accent"` | — |
| `entries` | `array` | `[{"date": "2020-01-01", "title": "Fir...` | — |
| `orientation` | `string` | `"vertical"` | — |
| `revealOnScroll` | `boolean` | `true` | — |
| `revealStagger` | `number` | `100` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `sgs` ({"imageControls": true}), `shadow`, `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.sgs-timeline` |
| `typography` | `.sgs-timeline__title` |

---

### `sgs/trust-badges`
_SGS Trust Badges_

**Type:** Dynamic

Icon-in-circle badge row for trust signals. Supports a per-badge pending flag to hide placeholder items until they are ready to display.

**Attributes** (8):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `columns` | `number` | `4` | — |
| `gap` | `string` | `"20"` | — |
| `iconCircleBackground` | `string` | `"surface"` | — |
| `iconCircleSize` | `number` | `44` | — |
| `iconColour` | `string` | `"primary-dark"` | — |
| `items` | `array` | `[{"icon": "home", "label": "Handmade ...` | — |
| `showPendingInEditor` | `boolean` | `true` | — |
| `textColour` | `string` | `"text"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": f...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-trust-badges` |
| `typography` | `.sgs-trust-badges__label` |

---

### `sgs/trust-bar`
_SGS Trust Bar_

**Type:** Dynamic

Horizontal strip of key stats and trust signals with animated number counters. Great for showcasing years of experience, customers served, or certifications.

**Attributes** (15):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `animated` | `boolean` | `true` | — |
| `dividers` | `boolean` | `false` | — |
| `hoverBackgroundColour` | `string` | `""` | — |
| `hoverBorderColour` | `string` | `""` | — |
| `hoverEffect` | `string` | `"none"` | — |
| `hoverTextColour` | `string` | `""` | — |
| `items` | `array` | `[{"value": "5,000", "suffix": "+", "l...` | — |
| `labelColour` | `string` | `"text"` | — |
| `labelFontSize` | `string` | `—` | Yes |
| `labelFontSizeMobile` | `string` | `""` | — |
| `labelFontSizeTablet` | `string` | `""` | — |
| `showItemIcons` | `boolean` | `false` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease-in-out"` | — |
| `valueColour` | `string` | `"primary"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.sgs-trust-bar` |
| `typography` | `.sgs-trust-bar__value` |

---

### `sgs/trustpilot-reviews`
_SGS Trustpilot Reviews_

**Type:** Dynamic

Display Trustpilot reviews in the official Trustpilot visual style. Reviews can be entered manually or synced from a Trustpilot business profile (sync available in next-session build).

**Attributes** (29):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `autoplay` | `boolean` | `false` | — |
| `autoplaySpeed` | `number` | `5000` | — |
| `businessUnitUrl` | `string` | `""` | — |
| `cardStyle` | `string (enum)` | `"elevated"` | — |
| `columns` | `number` | `3` | Yes |
| `columnsMobile` | `number` | `1` | — |
| `columnsTablet` | `number` | `2` | — |
| `dataSource` | `string (enum)` | `"inline"` | — |
| `reviews` | `array` | `[]` | — |
| `reviewsAverage` | `number` | `0` | — |
| `sgsAnimation` | `string` | `"fade-up"` | — |
| `sgsAnimationDuration` | `string` | `"medium"` | — |
| `sgsAnimationEasing` | `string` | `"ease-out"` | — |
| `showArrows` | `boolean` | `true` | — |
| `showAuthor` | `boolean` | `true` | — |
| `showDate` | `boolean` | `true` | — |
| `showDots` | `boolean` | `false` | — |
| `showSchema` | `boolean` | `true` | — |
| `showSourceHeader` | `boolean` | `true` | — |
| `showSubtitle` | `boolean` | `false` | — |
| `showTrustpilotLogo` | `boolean` | `true` | — |
| `showVerifiedBadge` | `boolean` | `true` | — |
| `staggerDelay` | `number` | `60` | — |
| `subtitleText` | `string` | `"Showing our latest reviews"` | — |
| `theme` | `string (enum)` | `"light"` | — |
| `totalReviews` | `number` | `0` | — |
| `trustScore` | `number` | `0` | — |
| `trustScoreLabel` | `string` | `""` | — |
| `variant` | `string (enum)` | `"carousel"` | — |

**Supports:**
- `align` (["wide", "full"]), `anchor`, `className`, `color` ({"background": true, "text"...), `html` (false), `interactivity`, `sgs` ({"imageControls": false})

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-trustpilot-reviews` |

---

### `sgs/whatsapp-cta`
_SGS WhatsApp CTA_

**Type:** Dynamic

WhatsApp integration with floating button, inline CTA, or banner variants.

**Attributes** (10):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `backgroundColour` | `string` | `"whatsapp"` | — |
| `iconOverride` | `object` | `{"source": "", "value": "", "label": ""}` | — |
| `label` | `string` | `""` | — |
| `labelColour` | `string` | `"text"` | — |
| `labelFontSize` | `string` | `—` | — |
| `message` | `string` | `"Hi, I'd like to know more about your...` | — |
| `phoneNumber` | `string` | `—` | — |
| `showOnDesktop` | `boolean` | `true` | — |
| `showOnMobile` | `boolean` | `true` | — |
| `variant` | `string` | `"floating"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true}), `align` (false), `anchor`, `color` ({"background": false, "text...), `html` (false), `spacing` ({"margin": true, "padding":...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.sgs-whatsapp-cta` |
| `typography` | `.sgs-whatsapp-cta__label` |

---

## Forms

### `sgs/form`
_SGS Form_

**Type:** Dynamic

Form wrapper with multi-step support, validation, and N8N webhook notifications.

**Attributes** (20):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `formFocusRingColour` | `string` | `"primary"` | — |
| `formFocusRingOffset` | `number` | `2` | — |
| `formFocusRingOpacity` | `number` | `40` | — |
| `formFocusRingWidth` | `number` | `2` | — |
| `formId` | `string` | `""` | — |
| `formName` | `string` | `""` | — |
| `honeypot` | `boolean` | `true` | — |
| `paymentAmount` | `string` | `""` | — |
| `paymentDescription` | `string` | `""` | — |
| `paymentEnabled` | `boolean` | `false` | — |
| `progressBarColour` | `string` | `"primary"` | — |
| `rateLimit` | `integer` | `5` | — |
| `requireLogin` | `boolean` | `false` | — |
| `storeSubmissions` | `boolean` | `true` | — |
| `submitBackground` | `string` | `"primary"` | — |
| `submitColour` | `string` | `"text-inverse"` | — |
| `submitLabel` | `string` | `"Submit"` | — |
| `submitStyle` | `string` | `"primary"` | — |
| `successMessage` | `string` | `"Thank you! Your submission has been ...` | — |
| `successRedirect` | `string` | `""` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `interactivity`, `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

---

### `sgs/form-field-address`
_SGS Address Field_

**Type:** Dynamic

An address field with optional postcode lookup.

**Attributes** (12):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `enableLookup` | `boolean` | `false` | — |
| `fieldName` | `string` | `""` | — |
| `fields` | `array` | `["line1", "line2", "city", "county", ...` | — |
| `helpText` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `lookupProvider` | `string` | `"getaddress.io"` | — |
| `placeholder` | `string` | `""` | — |
| `required` | `boolean` | `false` | — |
| `width` | `string` | `"full"` | — |

**Supports:**
- `anchor` (false), `html` (false)

---

### `sgs/form-field-checkbox`
_SGS Checkbox Field_

**Type:** Dynamic

A checkbox group for multiple selections.

**Attributes** (10):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `fieldName` | `string` | `""` | — |
| `helpText` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `options` | `array` | `[{"value": "option-1", "label": "Opti...` | — |
| `placeholder` | `string` | `""` | — |
| `required` | `boolean` | `false` | — |
| `width` | `string` | `"full"` | — |

**Supports:**
- `anchor` (false), `html` (false)

---

### `sgs/form-field-consent`
_SGS Consent Field_

**Type:** Dynamic

Consent checkbox for GDPR, terms, and marketing.

**Attributes** (11):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `consentText` | `string` | `"I agree to the Terms & Conditions"` | — |
| `consentType` | `string` | `"terms"` | — |
| `fieldName` | `string` | `"consent"` | — |
| `helpText` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `placeholder` | `string` | `""` | — |
| `required` | `boolean` | `false` | — |
| `width` | `string` | `"full"` | — |

**Supports:**
- `anchor` (false), `html` (false)

---

### `sgs/form-field-date`
_SGS Date Field_

**Type:** Dynamic

A date picker input field with min/max date constraints.

**Attributes** (11):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `fieldName` | `string` | `""` | — |
| `helpText` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `maxDate` | `string` | `""` | — |
| `minDate` | `string` | `""` | — |
| `placeholder` | `string` | `""` | — |
| `required` | `boolean` | `false` | — |
| `width` | `string` | `"full"` | — |

**Supports:**
- `anchor` (false), `html` (false)

---

### `sgs/form-field-email`
_SGS Email Field_

**Type:** Dynamic

An email address input field with validation.

**Attributes** (9):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `fieldName` | `string` | `""` | — |
| `helpText` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `placeholder` | `string` | `""` | — |
| `required` | `boolean` | `false` | — |
| `width` | `string` | `"full"` | — |

**Supports:**
- `anchor` (false), `html` (false)

---

### `sgs/form-field-file`
_SGS File Upload Field_

**Type:** Dynamic

File upload field with drag-and-drop support.

**Attributes** (13):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `allowedTypes` | `array` | `["image/*", "application/pdf"]` | — |
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `fieldName` | `string` | `""` | — |
| `helpText` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `maxFiles` | `number` | `1` | — |
| `maxSize` | `number` | `10` | — |
| `placeholder` | `string` | `""` | — |
| `required` | `boolean` | `false` | — |
| `uploadText` | `string` | `""` | — |
| `width` | `string` | `"full"` | — |

**Supports:**
- `anchor` (false), `html` (false), `interactivity`

---

### `sgs/form-field-hidden`
_SGS Hidden Field_

**Type:** Dynamic

A hidden field for storing values not visible to users.

**Attributes** (5):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `defaultValue` | `string` | `""` | — |
| `fieldName` | `string` | `""` | — |

**Supports:**
- `anchor` (false), `html` (false)

---

### `sgs/form-field-number`
_SGS Number Field_

**Type:** Dynamic

A number input field with min/max/step controls.

**Attributes** (12):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `fieldName` | `string` | `""` | — |
| `helpText` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `max` | `string` | `""` | — |
| `min` | `string` | `""` | — |
| `placeholder` | `string` | `""` | — |
| `required` | `boolean` | `false` | — |
| `step` | `string` | `"1"` | — |
| `width` | `string` | `"full"` | — |

**Supports:**
- `anchor` (false), `html` (false)

---

### `sgs/form-field-phone`
_SGS Phone Field_

**Type:** Dynamic

A telephone number input field.

**Attributes** (9):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `fieldName` | `string` | `""` | — |
| `helpText` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `placeholder` | `string` | `""` | — |
| `required` | `boolean` | `false` | — |
| `width` | `string` | `"full"` | — |

**Supports:**
- `anchor` (false), `html` (false)

---

### `sgs/form-field-radio`
_SGS Radio Field_

**Type:** Dynamic

A radio button group for single selection.

**Attributes** (10):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `fieldName` | `string` | `""` | — |
| `helpText` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `options` | `array` | `[{"value": "option-1", "label": "Opti...` | — |
| `placeholder` | `string` | `""` | — |
| `required` | `boolean` | `false` | — |
| `width` | `string` | `"full"` | — |

**Supports:**
- `anchor` (false), `html` (false)

---

### `sgs/form-field-select`
_SGS Select Field_

**Type:** Dynamic

A dropdown select field with custom options.

**Attributes** (10):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `fieldName` | `string` | `""` | — |
| `helpText` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `options` | `array` | `[{"value": "option-1", "label": "Opti...` | — |
| `placeholder` | `string` | `""` | — |
| `required` | `boolean` | `false` | — |
| `width` | `string` | `"full"` | — |

**Supports:**
- `anchor` (false), `html` (false)

---

### `sgs/form-field-text`
_SGS Text Field_

**Type:** Dynamic

A single-line text input field.

**Attributes** (9):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `fieldName` | `string` | `""` | — |
| `helpText` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `placeholder` | `string` | `""` | — |
| `required` | `boolean` | `false` | — |
| `width` | `string` | `"full"` | — |

**Supports:**
- `anchor` (false), `html` (false)

---

### `sgs/form-field-textarea`
_SGS Textarea Field_

**Type:** Dynamic

A multi-line text input field.

**Attributes** (10):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `fieldName` | `string` | `""` | — |
| `helpText` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `placeholder` | `string` | `""` | — |
| `required` | `boolean` | `false` | — |
| `rows` | `number` | `4` | — |
| `width` | `string` | `"full"` | — |

**Supports:**
- `anchor` (false), `html` (false)

---

### `sgs/form-field-tiles`
_SGS Tiles Field_

**Type:** Dynamic

Visual tile selection with icons.

**Attributes** (13):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `columns` | `number` | `3` | — |
| `conditionalField` | `string` | `""` | — |
| `conditionalOperator` | `string` | `"equals"` | — |
| `conditionalValue` | `string` | `""` | — |
| `fieldName` | `string` | `""` | — |
| `helpText` | `string` | `""` | — |
| `label` | `string` | `""` | — |
| `multiSelect` | `boolean` | `false` | — |
| `placeholder` | `string` | `""` | — |
| `required` | `boolean` | `false` | — |
| `selectedStyle` | `string` | `"checkmark"` | — |
| `tiles` | `array` | `[]` | — |
| `width` | `string` | `"full"` | — |

**Supports:**
- `anchor` (false), `html` (false), `sgs` ({"imageControls": false})

---

### `sgs/form-review`
_SGS Form Review_

**Type:** Dynamic

Displays a summary of form fields for review before submission.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `heading` | `string` | `"Review your information"` | — |

**Supports:**
- `anchor` (false), `html` (false)

---

### `sgs/form-step`
_SGS Form Step_

**Type:** Dynamic

Groups form fields into a step for multi-step forms.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `label` | `string` | `"Step"` | — |

**Supports:**
- `html` (false), `spacing` ({"padding": true, "blockGap...)

---

## Interactive

### `sgs/accordion`
_SGS Accordion_

**Type:** Dynamic

Expandable content sections â€” ideal for FAQs, product details, and policies. Optional FAQ Schema for SEO.

**Attributes** (10):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `allowMultiple` | `boolean` | `false` | — |
| `closeIcon` | `string` | `"chevron-up"` | — |
| `defaultOpen` | `number` | `-1` | — |
| `faqSchema` | `boolean` | `false` | — |
| `headerBackground` | `string` | `—` | — |
| `headerColour` | `string` | `—` | — |
| `iconColour` | `string` | `—` | — |
| `iconPosition` | `string` | `"right"` | — |
| `openIcon` | `string` | `"chevron-down"` | — |
| `style` | `string` | `"bordered"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-accordion` |

---

### `sgs/accordion-item`
_SGS Accordion Item_

**Type:** Dynamic

A single expandable panel within an accordion. Enter a title for the header and add any content blocks inside the panel body.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `isOpen` | `boolean` | `false` | — |
| `title` | `string` | `""` | — |

**Supports:**
- `html` (false), `reusable` (false)

---

### `sgs/announcement-bar`
_SGS Announcement Bar_

**Type:** Dynamic

Dismissible top-of-page banner for announcements, promotions, and time-sensitive messages with countdown timer and message rotation.

**Attributes** (26):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `backgroundColor` | `string` | `—` | — |
| `backgroundColour` | `string` | `"primary-dark"` | — |
| `closeBehaviour` | `string (enum)` | `"session"` | — |
| `cookieDays` | `number` | `7` | — |
| `countdownEndAction` | `string (enum)` | `"hide"` | — |
| `countdownEndMessage` | `string` | `"This offer has ended."` | — |
| `ctaColour` | `string` | `"accent"` | — |
| `ctaStyle` | `string (enum)` | `"outline"` | — |
| `dismissible` | `boolean` | `false` | — |
| `endDate` | `string` | `""` | — |
| `fontSize` | `string` | `"small"` | — |
| `icon` | `string` | `""` | — |
| `messages` | `array` | `[{"text": "\u00ad\u0192\u00c4\u00eb N...` | — |
| `position` | `string (enum)` | `"top"` | — |
| `rotationInterval` | `number` | `5000` | — |
| `rotationType` | `string (enum)` | `"fade"` | — |
| `showDays` | `boolean` | `true` | — |
| `showHours` | `boolean` | `true` | — |
| `showMinutes` | `boolean` | `true` | — |
| `showSeconds` | `boolean` | `true` | — |
| `startDate` | `string` | `""` | — |
| `sticky` | `boolean` | `true` | — |
| `targetDate` | `string` | `""` | — |
| `textColor` | `string` | `—` | — |
| `textColour` | `string` | `"text-inverse"` | — |
| `variant` | `string (enum)` | `"standard"` | — |

**Supports:**
- `align` (false), `anchor`, `className`, `color` ({"background": true, "text"...), `customClassName` (false), `html` (false)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-announcement-bar` |
| `typography` | `.sgs-announcement-bar__text` |

---

### `sgs/back-to-top`
_SGS Back to Top_

**Type:** Dynamic

Deprecated — use Customiser → Floating UI → Back to Top instead.

**Attributes** (6):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `buttonColour` | `string` | `"primary-dark"` | — |
| `iconColour` | `string` | `"text-inverse"` | — |
| `position` | `string` | `"bottom-right"` | — |
| `scrollThreshold` | `number` | `300` | — |
| `shape` | `string` | `"circle"` | — |
| `size` | `number` | `48` | — |

**Supports:**
- `align` (false), `anchor`, `color` ({"background": true, "text"...), `html` (false), `inserter` (false), `multiple` (false)

---

### `sgs/countdown-timer`
_SGS Countdown Timer_

**Type:** Dynamic

Countdown to a target date or an evergreen timer with customisable styling.

**Attributes** (14):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `cardStyle` | `string` | `"elevated"` | — |
| `digitStyle` | `string` | `"simple"` | — |
| `evergreenHours` | `number` | `24` | — |
| `evergreenMinutes` | `number` | `0` | — |
| `evergreenMode` | `boolean` | `false` | — |
| `expiredMessage` | `string` | `"This offer has expired."` | — |
| `labelColour` | `string` | `"text-muted"` | — |
| `numberColour` | `string` | `"primary"` | — |
| `separatorColour` | `string` | `"border-subtle"` | — |
| `showDays` | `boolean` | `true` | — |
| `showHours` | `boolean` | `true` | — |
| `showMinutes` | `boolean` | `true` | — |
| `showSeconds` | `boolean` | `true` | — |
| `targetDate` | `string` | `""` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `interactivity`, `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "textAli...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-countdown-timer` |

---

### `sgs/mega-menu`
_SGS Mega Menu_

**Type:** Dynamic

Block-based mega menu with template part dropdowns. Works inside Navigation block.

**Attributes** (18):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `ariaLabel` | `string` | `""` | — |
| `badge` | `string` | `—` | — |
| `badgeColour` | `string` | `"accent"` | — |
| `highlight` | `boolean` | `false` | — |
| `icon` | `string` | `"chevron-down"` | — |
| `iconPosition` | `string` | `"after"` | — |
| `label` | `string` | `""` | — |
| `linkColour` | `string` | `"text"` | — |
| `linkHoverBgColour` | `string` | `"surface-alt"` | — |
| `linkHoverColour` | `string` | `"primary"` | — |
| `menuTemplatePart` | `string` | `""` | — |
| `openOn` | `string` | `"hover"` | — |
| `opensInNewTab` | `boolean` | `false` | — |
| `panelAlignment` | `string` | `"left"` | — |
| `panelBgColour` | `string` | `"surface"` | — |
| `panelMaxWidth` | `string` | `"1200px"` | — |
| `panelWidth` | `string` | `"full"` | — |
| `url` | `string` | `—` | — |

**Supports:**
- `align` (false), `anchor` (false), `color` ({"background": true, "text"...), `html` (false), `interactivity`, `reusable` (false)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-mega-menu` |

---

### `sgs/mobile-nav`
_Mobile Navigation_

**Type:** Dynamic

Full-screen mobile navigation drawer with accordion submenus, spring-physics animation, and swipe-to-close. Reads menu items from the header navigation block automatically.

**Attributes** (77):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `accentColour` | `string` | `"accent"` | — |
| `animationDuration` | `number` | `400` | — |
| `animationEasing` | `string (enum)` | `"spring"` | — |
| `animationPreset` | `string (enum)` | `"spring"` | — |
| `ariaLabel` | `string` | `""` | — |
| `backdropBlur` | `boolean` | `false` | — |
| `backdropBlurAmount` | `number` | `8` | — |
| `backdropColour` | `string` | `""` | — |
| `backdropOpacity` | `number` | `60` | — |
| `breakpoint` | `number` | `1024` | — |
| `closeButtonBg` | `string` | `""` | — |
| `closeButtonColour` | `string` | `""` | — |
| `closeButtonSize` | `number` | `48` | Yes |
| `closeButtonSizeMobile` | `string` | `""` | — |
| `closeButtonSizeTablet` | `string` | `""` | — |
| `closeButtonStyle` | `string (enum)` | `"circle"` | — |
| `contactDisplayMode` | `string (enum)` | `"icon-only"` | — |
| `ctaBg` | `string` | `""` | — |
| `ctaBorderColour` | `string` | `""` | — |
| `ctaIcon` | `string` | `"arrow-right"` | — |
| `ctaStyle` | `string (enum)` | `"filled"` | — |
| `ctaText` | `string` | `""` | — |
| `ctaTextColour` | `string` | `""` | — |
| `ctaUrl` | `string` | `""` | — |
| `desktopHamburger` | `boolean` | `false` | — |
| `dividerColour` | `string` | `"surface-alt"` | — |
| `drawerBg` | `string` | `"surface"` | — |
| `drawerGradient` | `string` | `""` | — |
| `drawerMaxWidth` | `number` | `400` | — |
| `drawerPosition` | `string (enum)` | `"top"` | — |
| `drawerText` | `string` | `"text"` | — |
| `drawerWidth` | `number` | `85` | Yes |
| `drawerWidthMobile` | `string` | `""` | — |
| `drawerWidthTablet` | `string` | `""` | — |
| `enableSwipe` | `boolean` | `true` | — |
| `exitDuration` | `number` | `280` | — |
| `focusColour` | `string` | `""` | — |
| `linkActiveColour` | `string` | `"primary"` | — |
| `linkColour` | `string` | `"text"` | — |
| `linkFontSize` | `string` | `"medium"` | Yes |
| `linkFontSizeMobile` | `string` | `""` | — |
| `linkFontWeight` | `string (enum)` | `"600"` | — |
| `linkHoverColour` | `string` | `"primary"` | — |
| `logoMaxWidth` | `number` | `120` | Yes |
| `logoMaxWidthMobile` | `string` | `""` | — |
| `logoMaxWidthTablet` | `string` | `""` | — |
| `secondaryCtaBg` | `string` | `""` | — |
| `secondaryCtaIcon` | `string` | `"phone"` | — |
| `secondaryCtaStyle` | `string (enum)` | `"outline"` | — |
| `secondaryCtaText` | `string` | `""` | — |
| `secondaryCtaTextColour` | `string` | `""` | — |
| `secondaryCtaUrl` | `string` | `""` | — |
| `showAccountTray` | `boolean` | `false` | — |
| `showContactIcons` | `boolean` | `true` | — |
| `showContactShortcuts` | `boolean` | `true` | — |
| `showCta` | `boolean` | `true` | — |
| `showDividers` | `boolean` | `true` | — |
| `showLogo` | `boolean` | `true` | — |
| `showSearch` | `boolean` | `false` | — |
| `showSecondaryCta` | `boolean` | `false` | — |
| `showSocials` | `boolean` | `true` | — |
| `showTagline` | `boolean` | `false` | — |
| `showWhatsApp` | `boolean` | `false` | — |
| `socialIconSize` | `number` | `44` | Yes |
| `socialIconSizeMobile` | `string` | `""` | — |
| `socialIconSizeTablet` | `string` | `""` | — |
| `socialStyle` | `string (enum)` | `"coloured"` | — |
| `staggerDelay` | `number` | `25` | — |
| `sublinkColour` | `string` | `""` | — |
| `sublinkFontSize` | `string` | `"small"` | Yes |
| `sublinkFontSizeMobile` | `string` | `""` | — |
| `sublinkHoverColour` | `string` | `""` | — |
| `submenuIndent` | `number` | `24` | Yes |
| `submenuIndentMobile` | `string` | `""` | — |
| `submenuIndentTablet` | `string` | `""` | — |
| `taglineText` | `string` | `""` | — |
| `variant` | `string (enum)` | `"overlay"` | — |

**Supports:**
- `anchor`, `color` ({"background": true, "text"...), `html` (false), `multiple` (false), `spacing` ({"padding": true})

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-mobile-nav` |

---

### `sgs/modal`
_SGS Modal_

**Type:** Dynamic

Trigger button that opens a modal overlay with any content inside. Fully accessible with focus trap and keyboard navigation.

**Attributes** (9):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `closeOnOverlay` | `boolean` | `true` | — |
| `maxWidth` | `string (enum)` | `"medium"` | — |
| `modalBackground` | `string` | `"white"` | — |
| `overlayColour` | `string` | `"text"` | — |
| `overlayOpacity` | `number` | `50` | — |
| `triggerBackground` | `string` | `—` | — |
| `triggerColour` | `string` | `—` | — |
| `triggerStyle` | `string (enum)` | `"primary"` | — |
| `triggerText` | `string` | `"Open Modal"` | — |

**Supports:**
- `align` (false), `anchor`, `color` ({"background": false, "text...), `html` (false)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-modal` |

---

### `sgs/reading-progress`
_SGS Reading Progress_

**Type:** Dynamic

Displays a reading-progress bar and/or countdown at the top or bottom of the viewport, automatically calculating estimated reading time from the article content. Place once in your article or single-post template — not per page.

**Attributes** (9):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `barColour` | `string` | `"accent"` | — |
| `barHeight` | `number` | `4` | — |
| `countdownPosition` | `string (enum)` | `"separate-pill"` | — |
| `displayMode` | `string (enum)` | `"both"` | — |
| `hideOnPages` | `array` | `[]` | — |
| `position` | `string (enum)` | `"top"` | — |
| `showWhenFinished` | `boolean` | `false` | — |
| `targetSelector` | `string` | `"main, article, .entry-content"` | — |
| `wpm` | `number` | `225` | — |

**Supports:**
- `align` (false), `anchor`, `color` ({"background": true, "text"...), `customClassName` (false), `html` (false), `multiple` (false)

---

### `sgs/tab`
_SGS Tab_

**Type:** Dynamic

Individual tab panel — add any content blocks inside.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `label` | `string` | `"Tab"` | — |

**Supports:**
- `html` (false), `reusable` (false)

---

### `sgs/tabs`
_SGS Tabs_

**Type:** Dynamic

Tabbed content with horizontal or vertical layout, full ARIA support, and deep linking via URL hash.

**Attributes** (11):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `orientation` | `string (enum)` | `"horizontal"` | — |
| `panelBgColour` | `string` | `—` | — |
| `panelBorderColour` | `string` | `"border-subtle"` | — |
| `tabActiveBgColour` | `string` | `—` | — |
| `tabActiveIndicatorColour` | `string` | `"primary"` | — |
| `tabActiveTextColour` | `string` | `"primary"` | — |
| `tabAlignment` | `string (enum)` | `"left"` | — |
| `tabHoverBgColour` | `string` | `—` | — |
| `tabStyle` | `string (enum)` | `"underline"` | — |
| `tabTextColour` | `string` | `"text-muted"` | — |
| `transitionDuration` | `number` | `200` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-tabs` |

---

## common

### `core/form`
_Form_

**Type:** Static

A form.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `action` | `string` | `—` | — |
| `email` | `string` | `—` | — |
| `method` | `string` | `"post"` | — |
| `submissionMethod` | `string` | `"email"` | — |

**Supports:**
- `anchor`, `color` ({"enabled":true,"background...), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/form-input`
_Input Field_

**Type:** Static

The basic building block for forms.

**Attributes** (8):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `inlineLabel` | `boolean` | `false` | — |
| `label` | `rich-text` | `"Label"` | — |
| `name` | `string` | `—` | — |
| `placeholder` | `string` | `—` | — |
| `required` | `boolean` | `false` | — |
| `type` | `string` | `"text"` | — |
| `value` | `string` | `""` | — |
| `visibilityPermissions` | `string` | `"all"` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":nul...), `reusable` (false), `spacing` ({"enabled":true,"margin":["...)

---

### `core/form-submission-notification`
_Form Submission Notification_

**Type:** Static

Provide a notification message after the form has been submitted.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `type` | `string` | `"success"` | — |

**Supports:**
_(none declared)_

---

### `core/form-submit-button`
_Form Submit Button_

**Type:** Static

A submission button for forms.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
_(none declared)_

---

## design

### `core/accordion`
_Accordion_

**Type:** Static

Displays a foldable layout that groups content in collapsible sections.

**Attributes** (5):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `autoclose` | `boolean` | `false` | — |
| `headingLevel` | `number` | `3` | — |
| `iconPosition` | `string` | `"right"` | — |
| `levelOptions` | `array` | `—` | — |
| `showIcon` | `boolean` | `true` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `ariaLabel`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity`, `layout`, `spacing` ({"enabled":true,"margin":["...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/accordion-heading`
_Accordion Heading_

**Type:** Static

Displays a heading that toggles the accordion panel.

**Attributes** (5):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `iconPosition` | `string` | `"right"` | — |
| `level` | `number` | `—` | — |
| `openByDefault` | `boolean` | `false` | — |
| `showIcon` | `boolean` | `true` | — |
| `title` | `rich-text` | `—` | — |

**Supports:**
- `align` (false), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `interactivity`, `lock` (false), `spacing` ({"enabled":true,"margin":nu...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/accordion-item`
_Accordion Item_

**Type:** Static

Wraps the heading and panel in one unit.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `openByDefault` | `boolean` | `false` | — |

**Supports:**
- `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity`, `layout` ({"allowEditing":false}), `spacing` ({"enabled":true,"margin":["...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/accordion-panel`
_Accordion Panel_

**Type:** Static

Contains the hidden or revealed content beneath the heading.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `templateLock` | `string|boolean` | `false` | — |

**Supports:**
- `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity`, `layout` ({"allowEditing":false}), `lock` (false), `spacing` ({"enabled":true,"margin":nu...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/button`
_Button_

**Type:** Static

Prompt visitors to take action with a button-style link.

**Attributes** (11):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `backgroundColor` | `string` | `—` | — |
| `gradient` | `string` | `—` | — |
| `linkTarget` | `string` | `—` | — |
| `placeholder` | `string` | `—` | — |
| `rel` | `string` | `—` | — |
| `tagName` | `string` | `"a"` | — |
| `text` | `rich-text` | `—` | — |
| `textColor` | `string` | `—` | — |
| `title` | `string` | `—` | — |
| `type` | `string` | `"button"` | — |
| `url` | `string` | `—` | — |

**Supports:**
- `align` (false), `alignWide` (false), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `dimensions` ({"enabled":true,"minHeight"...), `interactivity` ({"clientNavigation":true}), `reusable` (false), `spacing` ({"enabled":true,"margin":nu...), `splitting`, `typography` ({"enabled":true,"fontSize":...)

---

### `core/buttons`
_Buttons_

**Type:** Static

Prompt visitors to take action with a group of button-style links.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout` ({"allowSwitching":false,"al...), `spacing` ({"enabled":true,"margin":["...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/column`
_Column_

**Type:** Static

A single column within a columns block.

**Attributes** (3):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `templateLock` | `string|boolean` | `—` | — |
| `verticalAlignment` | `string` | `—` | — |
| `width` | `string` | `—` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout`, `reusable` (false), `spacing` ({"enabled":true,"margin":nu...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/columns`
_Columns_

**Type:** Static

Display content in multiple columns, with blocks added to each column.

**Attributes** (3):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `isStackedOnMobile` | `boolean` | `true` | — |
| `templateLock` | `string|boolean` | `—` | — |
| `verticalAlignment` | `string` | `—` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout` ({"allowSwitching":false,"al...), `spacing` ({"enabled":true,"margin":["...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/comment-template`
_Comment Template_

**Type:** Static

Contains the block elements used to display a comment, like the title, date, author, avatar and more.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/group`
_Group_

**Type:** Static

Gather blocks in a layout container.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `tagName` | `string` | `"div"` | — |
| `templateLock` | `string|boolean` | `—` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `ariaLabel`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `dimensions` ({"enabled":true,"minHeight"...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout` ({"allowSizingOnChildren":true}), `position` ({"enabled":true,"sticky":true}), `spacing` ({"enabled":true,"margin":["...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/home-link`
_Home Link_

**Type:** Static

Create a link that always points to the homepage of the site. Usually not necessary if there is already a site title link present in the header.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `label` | `string` | `—` | — |

**Supports:**
- `anchor`, `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false), `typography` ({"enabled":true,"fontSize":...)

---

### `core/more`
_More_

**Type:** Static

Content before this block will be shown in the excerpt on your archives page.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `customText` | `string` | `""` | — |
| `noTeaser` | `boolean` | `false` | — |

**Supports:**
- `className` (false), `customClassName` (false), `html` (false), `interactivity` ({"clientNavigation":true}), `multiple` (false)

---

### `core/navigation-link`
_Custom Link_

**Type:** Static

Add a page, link, or another item to your navigation.

**Attributes** (10):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `description` | `string` | `—` | — |
| `id` | `number` | `—` | — |
| `isTopLevelLink` | `boolean` | `—` | — |
| `kind` | `string` | `—` | — |
| `label` | `string` | `—` | — |
| `opensInNewTab` | `boolean` | `false` | — |
| `rel` | `string` | `—` | — |
| `title` | `string` | `—` | — |
| `type` | `string` | `—` | — |
| `url` | `string` | `—` | — |

**Supports:**
- `anchor`, `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false), `typography` ({"enabled":true,"fontSize":...)

---

### `core/navigation-overlay-close`
_Navigation Overlay Close_

**Type:** Static

A customizable button to close overlays.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `displayMode` | `string` | `"icon"` | — |
| `text` | `string` | `—` | — |

**Supports:**
- `color` ({"enabled":true,"background...), `spacing` ({"enabled":true,"margin":nu...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/navigation-submenu`
_Submenu_

**Type:** Static

Add a submenu to your navigation.

**Attributes** (10):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `description` | `string` | `—` | — |
| `id` | `number` | `—` | — |
| `isTopLevelItem` | `boolean` | `—` | — |
| `kind` | `string` | `—` | — |
| `label` | `string` | `—` | — |
| `opensInNewTab` | `boolean` | `false` | — |
| `rel` | `string` | `—` | — |
| `title` | `string` | `—` | — |
| `type` | `string` | `—` | — |
| `url` | `string` | `—` | — |

**Supports:**
- `anchor`, `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false), `typography` ({"enabled":true,"fontSize":...)

---

### `core/nextpage`
_Page Break_

**Type:** Static

Separate your content into a multi-page experience.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `className` (false), `customClassName` (false), `html` (false), `interactivity` ({"clientNavigation":true})

---

### `core/separator`
_Separator_

**Type:** Static

Create a break between ideas or sections with a horizontal separator.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `opacity` | `string` | `"alpha-channel"` | — |
| `tagName` | `string` | `"hr"` | — |

**Supports:**
- `align` (["center","wide","full"]), `anchor`, `color` ({"enabled":true,"background...), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":["...)

---

### `core/spacer`
_Spacer_

**Type:** Static

Add white space between blocks and customize its height.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `height` | `string` | `"100px"` | — |
| `width` | `string` | `—` | — |

**Supports:**
- `anchor`, `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":["...)

---

### `core/tab`
_Tab_

**Type:** Static

Content for a tab in a tabbed interface.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `label` | `string` | `""` | — |

**Supports:**
- `anchor`, `color` ({"enabled":true,"background...), `html` (false), `layout`, `reusable` (false), `spacing` ({"enabled":true,"margin":fa...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/tab-panel`
_Tab Panel_

**Type:** Static

Container for tab panel content in a tabbed interface.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `anchor` (false), `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `dimensions` ({"enabled":true,"minHeight"...), `html` (false), `layout` ({"default":{"type":"flex","...), `lock` (false), `reusable` (false), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/table-of-contents`
_Table of Contents_

**Type:** Static

Summarize your post with a list of headings. Add HTML anchors to Heading blocks to link them here.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `headings` | `array` | `[]` | — |
| `maxLevel` | `number` | `—` | — |
| `onlyIncludeCurrentPage` | `boolean` | `false` | — |
| `ordered` | `boolean` | `true` | — |

**Supports:**
- `anchor`, `ariaLabel`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/tabs`
_Tabs_

**Type:** Static

Display content in a tabbed interface to help users navigate detailed content with ease.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `activeTabIndex` | `number` | `0` | — |
| `editorActiveTabIndex` | `number` | `—` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity`, `layout` ({"default":{"type":"flex","...), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/tabs-menu`
_Tabs Menu_

**Type:** Static

Display the tab buttons for a tabbed interface.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `dimensions` ({"enabled":true,"minHeight"...), `html` (false), `layout` ({"default":{"type":"flex","...), `lock` (false), `reusable` (false), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/tabs-menu-item`
_Tab Menu Item_

**Type:** Static

A single tab button in the tabs menu.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `anchor` | `string` | `""` | — |

**Supports:**
- `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `layout` ({"allowEditing":false}), `lock` (false), `reusable` (false), `spacing` ({"enabled":true,"margin":nu...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/text-columns`
_Text Columns (deprecated)_

**Type:** Static

This block is deprecated. Please use the Columns block instead.

**Attributes** (3):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `columns` | `number` | `2` | — |
| `content` | `array` | `[{},{}]` | — |
| `width` | `string` | `—` | — |

**Supports:**
- `inserter` (false), `interactivity` ({"clientNavigation":true})

---

## embed

### `core/embed`
_Embed_

**Type:** Static

Add a block that displays content pulled from other sites, like Twitter or YouTube.

**Attributes** (7):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `allowResponsive` | `boolean` | `true` | — |
| `caption` | `rich-text` | `—` | — |
| `previewable` | `boolean` | `true` | — |
| `providerNameSlug` | `string` | `—` | — |
| `responsive` | `boolean` | `false` | — |
| `type` | `string` | `—` | — |
| `url` | `string` | `—` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...)

---

## media

### `core/audio`
_Audio_

**Type:** Static

Embed a simple audio player.

**Attributes** (7):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `autoplay` | `boolean` | `—` | — |
| `blob` | `string` | `—` | — |
| `caption` | `rich-text` | `—` | — |
| `id` | `number` | `—` | — |
| `loop` | `boolean` | `—` | — |
| `preload` | `string` | `—` | — |
| `src` | `string` | `—` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...)

---

### `core/cover`
_Cover_

**Type:** Static

Add an image or video with a text overlay.

**Attributes** (22):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `alt` | `string` | `""` | — |
| `backgroundType` | `string` | `"image"` | — |
| `contentPosition` | `string` | `—` | — |
| `customGradient` | `string` | `—` | — |
| `customOverlayColor` | `string` | `—` | — |
| `dimRatio` | `number` | `100` | — |
| `focalPoint` | `object` | `—` | — |
| `gradient` | `string` | `—` | — |
| `hasParallax` | `boolean` | `false` | — |
| `id` | `number` | `—` | — |
| `isDark` | `boolean` | `true` | — |
| `isRepeated` | `boolean` | `false` | — |
| `isUserOverlayColor` | `boolean` | `—` | — |
| `minHeight` | `number` | `—` | — |
| `minHeightUnit` | `string` | `—` | — |
| `overlayColor` | `string` | `—` | — |
| `poster` | `string` | `—` | — |
| `sizeSlug` | `string` | `—` | — |
| `tagName` | `string` | `"div"` | — |
| `templateLock` | `string|boolean` | `—` | — |
| `url` | `string` | `—` | — |
| `useFeaturedImage` | `boolean` | `false` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `dimensions` ({"enabled":true,"minHeight"...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout` ({"allowJustification":false}), `spacing` ({"enabled":true,"margin":["...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/file`
_File_

**Type:** Static

Add a link to a downloadable file.

**Attributes** (11):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `blob` | `string` | `—` | — |
| `displayPreview` | `boolean` | `—` | — |
| `downloadButtonText` | `rich-text` | `—` | — |
| `fileId` | `string` | `—` | — |
| `fileName` | `rich-text` | `—` | — |
| `href` | `string` | `—` | — |
| `id` | `number` | `—` | — |
| `previewHeight` | `number` | `600` | — |
| `showDownloadButton` | `boolean` | `true` | — |
| `textLinkHref` | `string` | `—` | — |
| `textLinkTarget` | `string` | `—` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `interactivity`, `spacing` ({"enabled":true,"margin":tr...)

---

### `core/gallery`
_Gallery_

**Type:** Static

Display multiple images in a rich gallery.

**Attributes** (14):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `allowResize` | `boolean` | `false` | — |
| `aspectRatio` | `string` | `"auto"` | — |
| `caption` | `rich-text` | `—` | — |
| `columns` | `number` | `—` | — |
| `fixedHeight` | `boolean` | `true` | — |
| `ids` | `array` | `[]` | — |
| `imageCrop` | `boolean` | `true` | — |
| `images` | `array` | `[]` | — |
| `linkTarget` | `string` | `—` | — |
| `linkTo` | `string` | `—` | — |
| `navigationButtonType` | `string` | `"icon"` | — |
| `randomOrder` | `boolean` | `false` | — |
| `shortCodeTransforms` | `array` | `[]` | — |
| `sizeSlug` | `string` | `"large"` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout` ({"allowSwitching":false,"al...), `spacing` ({"enabled":true,"margin":tr...)

---

### `core/icon`
_Icon_

**Type:** Static

Insert an SVG icon.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `icon` | `string` | `—` | — |

**Supports:**
- `align` (["left","center","right"]), `anchor`, `ariaLabel` ({"__experimentalSkipSeriali...), `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `dimensions` ({"enabled":true,"minHeight"...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...)

---

### `core/image`
_Image_

**Type:** Static

Insert an image to make a visual statement.

**Attributes** (18):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `alt` | `string` | `""` | — |
| `aspectRatio` | `string` | `—` | — |
| `blob` | `string` | `—` | — |
| `caption` | `rich-text` | `—` | — |
| `focalPoint` | `object` | `—` | — |
| `height` | `string` | `—` | — |
| `href` | `string` | `—` | — |
| `id` | `number` | `—` | — |
| `lightbox` | `object` | `—` | — |
| `linkClass` | `string` | `—` | — |
| `linkDestination` | `string` | `—` | — |
| `linkTarget` | `string` | `—` | — |
| `rel` | `string` | `—` | — |
| `scale` | `string` | `—` | — |
| `sizeSlug` | `string` | `—` | — |
| `title` | `string` | `—` | — |
| `url` | `string` | `—` | — |
| `width` | `string` | `—` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `interactivity`, `spacing` ({"enabled":true,"margin":tr...)

---

### `core/media-text`
_Media & Text_

**Type:** Static

Set media and words side-by-side for a richer layout.

**Attributes** (19):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `align` | `string` | `"none"` | — |
| `focalPoint` | `object` | `—` | — |
| `href` | `string` | `—` | — |
| `imageFill` | `boolean` | `—` | — |
| `isStackedOnMobile` | `boolean` | `true` | — |
| `linkClass` | `string` | `—` | — |
| `linkDestination` | `string` | `—` | — |
| `linkTarget` | `string` | `—` | — |
| `mediaAlt` | `string` | `""` | — |
| `mediaId` | `number` | `—` | — |
| `mediaLink` | `string` | `—` | — |
| `mediaPosition` | `string` | `"left"` | — |
| `mediaSizeSlug` | `string` | `—` | — |
| `mediaType` | `string` | `—` | — |
| `mediaUrl` | `string` | `—` | — |
| `mediaWidth` | `number` | `50` | — |
| `rel` | `string` | `—` | — |
| `useFeaturedImage` | `boolean` | `false` | — |
| `verticalAlignment` | `string` | `—` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/playlist`
_Playlist_

**Type:** Static

Embed a simple playlist.

**Attributes** (8):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `caption` | `string` | `—` | — |
| `currentTrack` | `string` | `—` | — |
| `order` | `string` | `"asc"` | — |
| `showArtists` | `boolean` | `true` | — |
| `showImages` | `boolean` | `true` | — |
| `showNumbers` | `boolean` | `true` | — |
| `showTracklist` | `boolean` | `true` | — |
| `type` | `string` | `"audio"` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `interactivity`, `spacing` ({"enabled":true,"margin":tr...)

---

### `core/playlist-track`
_Playlist track_

**Type:** Static

Playlist track.

**Attributes** (10):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `album` | `string` | `—` | — |
| `artist` | `string` | `—` | — |
| `blob` | `string` | `—` | — |
| `id` | `number` | `—` | — |
| `image` | `string` | `—` | — |
| `length` | `string` | `—` | — |
| `src` | `string` | `—` | — |
| `title` | `string` | `—` | — |
| `type` | `string` | `"audio"` | — |
| `uniqueId` | `string` | `—` | — |

**Supports:**
- `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false)

---

### `core/video`
_Video_

**Type:** Static

Embed a video from your media library or upload a new one.

**Attributes** (12):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `autoplay` | `boolean` | `—` | — |
| `blob` | `string` | `—` | — |
| `caption` | `rich-text` | `—` | — |
| `controls` | `boolean` | `true` | — |
| `id` | `number` | `—` | — |
| `loop` | `boolean` | `—` | — |
| `muted` | `boolean` | `—` | — |
| `playsInline` | `boolean` | `—` | — |
| `poster` | `string` | `—` | — |
| `preload` | `string` | `"metadata"` | — |
| `src` | `string` | `—` | — |
| `tracks` | `array` | `[]` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...)

---

## reusable

### `core/block`
_Pattern_

**Type:** Static

Reuse this design across your site.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `content` | `object` | `{}` | — |
| `ref` | `number` | `—` | — |

**Supports:**
- `customClassName` (false), `html` (false), `inserter` (false), `interactivity` ({"clientNavigation":true})

---

## text

### `core/code`
_Code_

**Type:** Static

Display code snippets that respect your spacing and tabs.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `content` | `rich-text` | `—` | — |

**Supports:**
- `align` (["wide"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":["...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/details`
_Details_

**Type:** Static

Hide and show additional content.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `name` | `string` | `—` | — |
| `placeholder` | `string` | `—` | — |
| `showContent` | `boolean` | `false` | — |
| `summary` | `rich-text` | `—` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout` ({"allowEditing":false}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/footnotes`
_Footnotes_

**Type:** Static

Display footnotes added to the page.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `inserter` (false), `interactivity` ({"clientNavigation":true}), `multiple` (false), `reusable` (false), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/freeform`
_Classic_

**Type:** Static

Use the classic WordPress editor.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `content` | `string` | `—` | — |

**Supports:**
- `className` (false), `customClassName` (false), `lock` (false), `reusable` (false)

---

### `core/heading`
_Heading_

**Type:** Static

Introduce new sections and organize content to help visitors (and search engines) understand the structure of your content.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `content` | `rich-text` | `—` | — |
| `level` | `number` | `2` | — |
| `levelOptions` | `array` | `—` | — |
| `placeholder` | `string` | `—` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `className`, `color` ({"enabled":true,"background...), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `splitting`, `typography` ({"enabled":true,"fontSize":...)

---

### `core/list`
_List_

**Type:** Static

An organized collection of items displayed in a specific order.

**Attributes** (6):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `ordered` | `boolean` | `false` | — |
| `placeholder` | `string` | `—` | — |
| `reversed` | `boolean` | `—` | — |
| `start` | `number` | `—` | — |
| `type` | `string` | `—` | — |
| `values` | `string` | `""` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/list-item`
_List Item_

**Type:** Static

An individual item within a list.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `content` | `rich-text` | `—` | — |
| `placeholder` | `string` | `—` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `className` (false), `color` ({"enabled":true,"background...), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `splitting`, `typography` ({"enabled":true,"fontSize":...)

---

### `core/math`
_Math_

**Type:** Static

Display mathematical notation using LaTeX.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `latex` | `string` | `—` | — |
| `mathML` | `string` | `—` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/missing`
_Unsupported_

**Type:** Static

Your site doesn’t include support for this block.

**Attributes** (3):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `originalContent` | `string` | `—` | — |
| `originalName` | `string` | `—` | — |
| `originalUndelimitedContent` | `string` | `—` | — |

**Supports:**
- `className` (false), `customClassName` (false), `html` (false), `inserter` (false), `interactivity` ({"clientNavigation":true}), `lock` (false), `reusable` (false)

---

### `core/paragraph`
_Paragraph_

**Type:** Static

Start with the basic building block of all narrative.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `content` | `rich-text` | `—` | — |
| `direction` | `string` | `—` | — |
| `dropCap` | `boolean` | `false` | — |
| `placeholder` | `string` | `—` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `className` (false), `color` ({"enabled":true,"background...), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `splitting`, `typography` ({"enabled":true,"fontSize":...)

---

### `core/preformatted`
_Preformatted_

**Type:** Static

Add text that respects your spacing and tabs, and also allows styling.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `content` | `rich-text` | `—` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/pullquote`
_Pullquote_

**Type:** Static

Give special visual emphasis to a quote from your text.

**Attributes** (3):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `citation` | `rich-text` | `—` | — |
| `textAlign` | `string` | `—` | — |
| `value` | `rich-text` | `—` | — |

**Supports:**
- `align` (["left","right","wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `dimensions` ({"enabled":true,"minHeight"...), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/quote`
_Quote_

**Type:** Static

Give quoted text visual emphasis. "In quoting others, we cite ourselves." — Julio Cortázar

**Attributes** (3):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `citation` | `rich-text` | `—` | — |
| `textAlign` | `string` | `—` | — |
| `value` | `string` | `""` | — |

**Supports:**
- `align` (["left","right","wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `dimensions` ({"enabled":true,"minHeight"...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout` ({"allowEditing":false}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/table`
_Table_

**Type:** Static

Create structured content in rows and columns to display information.

**Attributes** (5):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `body` | `array` | `[]` | — |
| `caption` | `rich-text` | `—` | — |
| `foot` | `array` | `[]` | — |
| `hasFixedLayout` | `boolean` | `true` | — |
| `head` | `array` | `[]` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/verse`
_Poetry_

**Type:** Static

Insert poetry. Use special spacing formats. Or quote song lyrics.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `content` | `rich-text` | `—` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `dimensions` ({"enabled":true,"minHeight"...), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

## theme

### `core/avatar`
_Avatar_

**Type:** Static

Add a user’s avatar.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `isLink` | `boolean` | `false` | — |
| `linkTarget` | `string` | `"_self"` | — |
| `size` | `number` | `96` | — |
| `userId` | `number` | `—` | — |

**Supports:**
- `align` (["left","center","right","w...), `alignWide` (false), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...)

---

### `core/breadcrumbs`
_Breadcrumbs_

**Type:** Static

Display a breadcrumb trail showing the path to the current page.

**Attributes** (5):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `prefersTaxonomy` | `boolean` | `false` | — |
| `separator` | `string` | `"/"` | — |
| `showCurrentItem` | `boolean` | `true` | — |
| `showHomeItem` | `boolean` | `true` | — |
| `showOnHomePage` | `boolean` | `false` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/comment-author-avatar`
_Comment Author Avatar (deprecated)_

**Type:** Static

This block is deprecated. Please use the Avatar block instead.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `height` | `number` | `96` | — |
| `width` | `number` | `96` | — |

**Supports:**
- `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `inserter` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...)

---

### `core/comment-author-name`
_Comment Author Name_

**Type:** Static

Displays the name of the author of the comment.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `isLink` | `boolean` | `true` | — |
| `linkTarget` | `string` | `"_self"` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/comment-content`
_Comment Content_

**Type:** Static

Displays the contents of a comment.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `spacing` ({"enabled":true,"margin":nu...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/comment-date`
_Comment Date_

**Type:** Static

Displays the date on which the comment was posted.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `format` | `string` | `—` | — |
| `isLink` | `boolean` | `true` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/comment-edit-link`
_Comment Edit Link_

**Type:** Static

Displays a link to edit the comment in the WordPress Dashboard. This link is only visible to users with the edit comment capability.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `linkTarget` | `string` | `"_self"` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/comment-reply-link`
_Comment Reply Link_

**Type:** Static

Displays a link to reply to a comment.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/comments`
_Comments_

**Type:** Static

An advanced block that allows displaying post comments using different visual configurations.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `legacy` | `boolean` | `false` | — |
| `tagName` | `string` | `"div"` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/comments-pagination`
_Comments Pagination_

**Type:** Static

Displays a paginated navigation to next/previous set of comments, when applicable.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `paginationArrow` | `string` | `"none"` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout` ({"allowSwitching":false,"al...), `reusable` (false), `typography` ({"enabled":true,"fontSize":...)

---

### `core/comments-pagination-next`
_Comments Next Page_

**Type:** Static

Displays the next comment's page link.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `label` | `string` | `—` | — |

**Supports:**
- `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false), `typography` ({"enabled":true,"fontSize":...)

---

### `core/comments-pagination-numbers`
_Comments Page Numbers_

**Type:** Static

Displays a list of page numbers for comments pagination.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/comments-pagination-previous`
_Comments Previous Page_

**Type:** Static

Displays the previous comment's page link.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `label` | `string` | `—` | — |

**Supports:**
- `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false), `typography` ({"enabled":true,"fontSize":...)

---

### `core/comments-title`
_Comments Title_

**Type:** Static

Displays a title with the number of comments.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `level` | `number` | `2` | — |
| `levelOptions` | `array` | `—` | — |
| `showCommentsCount` | `boolean` | `true` | — |
| `showPostTitle` | `boolean` | `true` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/loginout`
_Login/out_

**Type:** Static

Show login & logout links.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `displayLoginAsForm` | `boolean` | `false` | — |
| `redirectToCurrent` | `boolean` | `true` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `className`, `color` ({"enabled":true,"background...), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/navigation`
_Navigation_

**Type:** Static

A collection of blocks that allow visitors to get around your site.

**Attributes** (20):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `__unstableLocation` | `string` | `—` | — |
| `backgroundColor` | `string` | `—` | — |
| `customBackgroundColor` | `string` | `—` | — |
| `customOverlayBackgroundColor` | `string` | `—` | — |
| `customOverlayTextColor` | `string` | `—` | — |
| `customTextColor` | `string` | `—` | — |
| `hasIcon` | `boolean` | `true` | — |
| `icon` | `string` | `"handle"` | — |
| `maxNestingLevel` | `number` | `5` | — |
| `overlay` | `string` | `—` | — |
| `overlayBackgroundColor` | `string` | `—` | — |
| `overlayMenu` | `string` | `"mobile"` | — |
| `overlayTextColor` | `string` | `—` | — |
| `ref` | `number` | `—` | — |
| `rgbBackgroundColor` | `string` | `—` | — |
| `rgbTextColor` | `string` | `—` | — |
| `showSubmenuIcon` | `boolean` | `true` | — |
| `submenuVisibility` | `string` | `"hover"` | — |
| `templateLock` | `string|boolean` | `—` | — |
| `textColor` | `string` | `—` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `ariaLabel`, `html` (false), `inserter`, `interactivity`, `layout` ({"allowSwitching":false,"al...), `spacing` ({"enabled":true,"margin":nu...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/pattern`
_Pattern Placeholder_

**Type:** Static

Show a block pattern.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `slug` | `string` | `—` | — |

**Supports:**
- `html` (false), `inserter` (false), `interactivity` ({"clientNavigation":true})

---

### `core/post-author`
_Author (deprecated)_

**Type:** Static

This block is deprecated. Please use the Avatar block, the Author Name block, and the Author Biography block instead.

**Attributes** (7):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `avatarSize` | `number` | `48` | — |
| `byline` | `string` | `—` | — |
| `isLink` | `boolean` | `false` | — |
| `linkTarget` | `string` | `"_self"` | — |
| `showAvatar` | `boolean` | `true` | — |
| `showBio` | `boolean` | `—` | — |
| `textAlign` | `string` | `—` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `inserter` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/post-author-biography`
_Author Biography_

**Type:** Static

The author biography.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/post-author-name`
_Author Name_

**Type:** Static

The author name.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `isLink` | `boolean` | `false` | — |
| `linkTarget` | `string` | `"_self"` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/post-comment`
_Comment (deprecated)_

**Type:** Static

This block is deprecated. Please use the Comments block instead.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `commentId` | `number` | `—` | — |

**Supports:**
- `html` (false), `inserter` (false), `interactivity` ({"clientNavigation":true})

---

### `core/post-comments-count`
_Comments Count_

**Type:** Static

Display a post's comments count.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/post-comments-form`
_Comments Form_

**Type:** Static

Display a post's comments form.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/post-comments-link`
_Comments Link_

**Type:** Static

Displays the link to the current post comments.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/post-content`
_Content_

**Type:** Static

Displays the contents of a post or page.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `tagName` | `string` | `"div"` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `dimensions` ({"enabled":true,"minHeight"...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout`, `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/post-date`
_Date_

**Type:** Static

Display a custom date.

**Attributes** (3):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `datetime` | `string` | `—` | — |
| `format` | `string` | `—` | — |
| `isLink` | `boolean` | `false` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/post-excerpt`
_Excerpt_

**Type:** Static

Display the excerpt.

**Attributes** (3):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `excerptLength` | `number` | `55` | — |
| `moreText` | `string` | `—` | — |
| `showMoreOnNewLine` | `boolean` | `true` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/post-featured-image`
_Featured Image_

**Type:** Static

Display a post's featured image.

**Attributes** (14):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `aspectRatio` | `string` | `—` | — |
| `customGradient` | `string` | `—` | — |
| `customOverlayColor` | `string` | `—` | — |
| `dimRatio` | `number` | `0` | — |
| `gradient` | `string` | `—` | — |
| `height` | `string` | `—` | — |
| `isLink` | `boolean` | `false` | — |
| `linkTarget` | `string` | `"_self"` | — |
| `overlayColor` | `string` | `—` | — |
| `rel` | `string` | `""` | — |
| `scale` | `string` | `"cover"` | — |
| `sizeSlug` | `string` | `—` | — |
| `useFirstImageFromPost` | `boolean` | `false` | — |
| `width` | `string` | `—` | — |

**Supports:**
- `align` (["left","right","center","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...)

---

### `core/post-navigation-link`
_Post Navigation Link_

**Type:** Static

Displays the next or previous post link that is adjacent to the current post.

**Attributes** (6):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `arrow` | `string` | `"none"` | — |
| `label` | `string` | `—` | — |
| `linkLabel` | `boolean` | `false` | — |
| `showTitle` | `boolean` | `false` | — |
| `taxonomy` | `string` | `""` | — |
| `type` | `string` | `"next"` | — |

**Supports:**
- `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false), `typography` ({"enabled":true,"fontSize":...)

---

### `core/post-template`
_Post Template_

**Type:** Static

Contains the block elements used to render a post, like the title, date, featured image, content or excerpt, and more.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout`, `reusable` (false), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/post-terms`
_Post Terms_

**Type:** Static

Post terms.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `prefix` | `string` | `""` | — |
| `separator` | `string` | `", "` | — |
| `suffix` | `string` | `""` | — |
| `term` | `string` | `—` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/post-time-to-read`
_Time to Read_

**Type:** Static

Show minutes required to finish reading the post. Can also show a word count.

**Attributes** (3):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `averageReadingSpeed` | `number` | `189` | — |
| `displayAsRange` | `boolean` | `true` | — |
| `displayMode` | `string` | `"time"` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/post-title`
_Title_

**Type:** Static

Displays the title of a post, page, or any other content-type.

**Attributes** (6):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `isLink` | `boolean` | `false` | — |
| `level` | `number` | `2` | — |
| `levelOptions` | `array` | `—` | — |
| `linkTarget` | `string` | `"_self"` | — |
| `placeholder` | `string` | `—` | — |
| `rel` | `string` | `""` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/query`
_Query Loop_

**Type:** Static

An advanced block that allows displaying post types based on different query parameters and visual configurations.

**Attributes** (5):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `enhancedPagination` | `boolean` | `false` | — |
| `namespace` | `string` | `—` | — |
| `query` | `object` | `{"perPage":null,"pages":0,"offset":0,...` | — |
| `queryId` | `number` | `—` | — |
| `tagName` | `string` | `"div"` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `html` (false), `interactivity`, `layout`

---

### `core/query-no-results`
_No Results_

**Type:** Static

Contains the block elements used to render content when no query results are found.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false), `typography` ({"enabled":true,"fontSize":...)

---

### `core/query-pagination`
_Pagination_

**Type:** Static

Displays a paginated navigation to next/previous set of posts, when applicable.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `paginationArrow` | `string` | `"none"` | — |
| `showLabel` | `boolean` | `true` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout` ({"allowSwitching":false,"al...), `reusable` (false), `typography` ({"enabled":true,"fontSize":...)

---

### `core/query-pagination-next`
_Next Page_

**Type:** Static

Displays the next posts page link.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `label` | `string` | `—` | — |

**Supports:**
- `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false), `typography` ({"enabled":true,"fontSize":...)

---

### `core/query-pagination-numbers`
_Page Numbers_

**Type:** Static

Displays a list of page numbers for pagination.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `midSize` | `number` | `2` | — |

**Supports:**
- `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false), `typography` ({"enabled":true,"fontSize":...)

---

### `core/query-pagination-previous`
_Previous Page_

**Type:** Static

Displays the previous posts page link.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `label` | `string` | `—` | — |

**Supports:**
- `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false), `typography` ({"enabled":true,"fontSize":...)

---

### `core/query-title`
_Query Title_

**Type:** Static

Display the query title.

**Attributes** (5):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `level` | `number` | `1` | — |
| `levelOptions` | `array` | `—` | — |
| `showPrefix` | `boolean` | `true` | — |
| `showSearchTerm` | `boolean` | `true` | — |
| `type` | `string` | `—` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/query-total`
_Query Total_

**Type:** Static

Display the total number of results in a query.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `displayType` | `string` | `"total-results"` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/read-more`
_Read More_

**Type:** Static

Displays the link of a post, page, or any other content-type.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `content` | `string` | `—` | — |
| `linkTarget` | `string` | `"_self"` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":["...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/site-logo`
_Site Logo_

**Type:** Static

Display an image to represent this site. Update this block and the changes apply everywhere.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `isLink` | `boolean` | `true` | — |
| `linkTarget` | `string` | `"_self"` | — |
| `shouldSyncIcon` | `boolean` | `—` | — |
| `width` | `number` | `—` | — |

**Supports:**
- `align` (["left","center","right","w...), `alignWide` (false), `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...)

---

### `core/site-tagline`
_Site Tagline_

**Type:** Static

Describe in a few words what this site is about. This is important for search results, sharing on social media, and gives overall clarity to visitors.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `level` | `number` | `0` | — |
| `levelOptions` | `array` | `[0,1,2,3,4,5,6]` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/site-title`
_Site Title_

**Type:** Static

Displays the name of this site. Update the block, and the changes apply everywhere it’s used. This will also appear in the browser title bar and in search results.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `isLink` | `boolean` | `true` | — |
| `level` | `number` | `1` | — |
| `levelOptions` | `array` | `[0,1,2,3,4,5,6]` | — |
| `linkTarget` | `string` | `"_self"` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/template-part`
_Template Part_

**Type:** Static

Edit the different global regions of your site, like the header, footer, sidebar, or create your own.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `area` | `string` | `—` | — |
| `slug` | `string` | `—` | — |
| `tagName` | `string` | `—` | — |
| `theme` | `string` | `—` | — |

**Supports:**
- `align` (["left","center","right","w...), `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false)

---

### `core/term-count`
_Term Count_

**Type:** Static

Displays the post count of a taxonomy term.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `bracketType` | `string` | `"round"` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":nu...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/term-description`
_Term Description_

**Type:** Static

Display the description of categories, tags and custom taxonomies when viewing an archive.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/term-name`
_Term Name_

**Type:** Static

Displays the name of a taxonomy term.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `isLink` | `boolean` | `false` | — |
| `level` | `number` | `0` | — |
| `levelOptions` | `array` | `—` | — |
| `textAlign` | `string` | `—` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":nu...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/term-template`
_Term Template_

**Type:** Static

Contains the block elements used to render a taxonomy term, like the name, description, and more.

**Attributes** (0):

_(no attributes declared)_

**Supports:**
- `align` (["wide","full"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout`, `reusable` (false), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/terms-query`
_Terms Query_

**Type:** Static

An advanced block that allows displaying taxonomy terms based on different query parameters and visual configurations.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `tagName` | `string` | `"div"` | — |
| `termQuery` | `object` | `{"perPage":10,"taxonomy":"category","...` | — |

**Supports:**
- `align` (["wide","full"]), `anchor`, `html` (false), `interactivity`, `layout`

---

## widgets

### `core/archives`
_Archives_

**Type:** Static

Display a date archive of your posts.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `displayAsDropdown` | `boolean` | `false` | — |
| `showLabel` | `boolean` | `true` | — |
| `showPostCounts` | `boolean` | `false` | — |
| `type` | `string` | `"monthly"` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/calendar`
_Calendar_

**Type:** Static

A calendar of your site’s posts.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `month` | `integer` | `—` | — |
| `year` | `integer` | `—` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `typography` ({"enabled":true,"fontSize":...)

---

### `core/categories`
_Terms List_

**Type:** Static

Display a list of all terms of a given taxonomy.

**Attributes** (8):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `displayAsDropdown` | `boolean` | `false` | — |
| `label` | `string` | `—` | — |
| `showEmpty` | `boolean` | `false` | — |
| `showHierarchy` | `boolean` | `false` | — |
| `showLabel` | `boolean` | `true` | — |
| `showOnlyTopLevel` | `boolean` | `false` | — |
| `showPostCounts` | `boolean` | `false` | — |
| `taxonomy` | `string` | `"category"` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/html`
_Custom HTML_

**Type:** Static

Add custom HTML code and preview it as you edit.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `content` | `string` | `—` | — |

**Supports:**
- `className` (false), `customClassName` (false), `html` (false), `interactivity` ({"clientNavigation":true})

---

### `core/latest-comments`
_Latest Comments_

**Type:** Static

Display a list of your most recent comments.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `commentsToShow` | `number` | `5` | — |
| `displayAvatar` | `boolean` | `true` | — |
| `displayContent` | `string` | `"excerpt"` | — |
| `displayDate` | `boolean` | `true` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/latest-posts`
_Latest Posts_

**Type:** Static

Display a list of your most recent posts.

**Attributes** (18):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `addLinkToFeaturedImage` | `boolean` | `false` | — |
| `categories` | `array` | `—` | — |
| `columns` | `number` | `3` | — |
| `displayAuthor` | `boolean` | `false` | — |
| `displayFeaturedImage` | `boolean` | `false` | — |
| `displayPostContent` | `boolean` | `false` | — |
| `displayPostContentRadio` | `string` | `"excerpt"` | — |
| `displayPostDate` | `boolean` | `false` | — |
| `excerptLength` | `number` | `55` | — |
| `featuredImageAlign` | `string` | `—` | — |
| `featuredImageSizeHeight` | `number` | `—` | — |
| `featuredImageSizeSlug` | `string` | `"thumbnail"` | — |
| `featuredImageSizeWidth` | `number` | `—` | — |
| `order` | `string` | `"desc"` | — |
| `orderBy` | `string` | `"date"` | — |
| `postLayout` | `string` | `"list"` | — |
| `postsToShow` | `number` | `5` | — |
| `selectedAuthor` | `number` | `—` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/page-list`
_Page List_

**Type:** Static

Display a list of all pages.

**Attributes** (2):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `isNested` | `boolean` | `false` | — |
| `parentPageID` | `integer` | `0` | — |

**Supports:**
- `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/page-list-item`
_Page List Item_

**Type:** Static

Displays a page inside a list of all pages.

**Attributes** (5):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `hasChildren` | `boolean` | `—` | — |
| `id` | `number` | `—` | — |
| `label` | `string` | `—` | — |
| `link` | `string` | `—` | — |
| `title` | `string` | `—` | — |

**Supports:**
- `anchor`, `html` (false), `inserter` (false), `interactivity` ({"clientNavigation":true}), `lock` (false), `reusable` (false)

---

### `core/rss`
_RSS_

**Type:** Static

Display entries from any RSS or Atom feed.

**Attributes** (10):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `blockLayout` | `string` | `"list"` | — |
| `columns` | `number` | `2` | — |
| `displayAuthor` | `boolean` | `false` | — |
| `displayDate` | `boolean` | `false` | — |
| `displayExcerpt` | `boolean` | `false` | — |
| `excerptLength` | `number` | `55` | — |
| `feedURL` | `string` | `""` | — |
| `itemsToShow` | `number` | `5` | — |
| `openInNewTab` | `boolean` | `false` | — |
| `rel` | `string` | `—` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...)

---

### `core/search`
_Search_

**Type:** Static

Help visitors find your content.

**Attributes** (10):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `buttonPosition` | `string` | `"button-outside"` | — |
| `buttonText` | `string` | `—` | — |
| `buttonUseIcon` | `boolean` | `false` | — |
| `isSearchFieldHidden` | `boolean` | `false` | — |
| `label` | `string` | `—` | — |
| `placeholder` | `string` | `""` | — |
| `query` | `object` | `{}` | — |
| `showLabel` | `boolean` | `true` | — |
| `width` | `number` | `—` | — |
| `widthUnit` | `string` | `—` | — |

**Supports:**
- `align` (["left","center","right"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity`, `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

### `core/shortcode`
_Shortcode_

**Type:** Static

Insert additional custom elements with a WordPress shortcode.

**Attributes** (1):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `text` | `string` | `—` | — |

**Supports:**
- `className` (false), `customClassName` (false), `html` (false)

---

### `core/social-link`
_Social Icon_

**Type:** Static

Display an icon linking to a social profile or site.

**Attributes** (4):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `label` | `string` | `—` | — |
| `rel` | `string` | `—` | — |
| `service` | `string` | `—` | — |
| `url` | `string` | `—` | — |

**Supports:**
- `anchor`, `html` (false), `interactivity` ({"clientNavigation":true}), `reusable` (false)

---

### `core/social-links`
_Social Icons_

**Type:** Static

Display icons linking to your social profiles or sites.

**Attributes** (9):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `customIconBackgroundColor` | `string` | `—` | — |
| `customIconColor` | `string` | `—` | — |
| `iconBackgroundColor` | `string` | `—` | — |
| `iconBackgroundColorValue` | `string` | `—` | — |
| `iconColor` | `string` | `—` | — |
| `iconColorValue` | `string` | `—` | — |
| `openInNewTab` | `boolean` | `false` | — |
| `showLabels` | `boolean` | `false` | — |
| `size` | `string` | `—` | — |

**Supports:**
- `align` (["left","center","right"]), `anchor`, `border` ({"enabled":true,"color":tru...), `color` ({"enabled":true,"background...), `html` (false), `interactivity` ({"clientNavigation":true}), `layout` ({"allowSwitching":false,"al...), `spacing` ({"enabled":true,"margin":tr...)

---

### `core/tag-cloud`
_Tag Cloud_

**Type:** Static

A cloud of popular keywords, each sized by how often it appears.

**Attributes** (5):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `largestFontSize` | `string` | `"22pt"` | — |
| `numberOfTags` | `number` | `45` | — |
| `showTagCounts` | `boolean` | `false` | — |
| `smallestFontSize` | `string` | `"8pt"` | — |
| `taxonomy` | `string` | `"post_tag"` | — |

**Supports:**
- `align` (["left","center","right","w...), `anchor`, `border` ({"enabled":true,"color":tru...), `html` (false), `interactivity` ({"clientNavigation":true}), `spacing` ({"enabled":true,"margin":tr...), `typography` ({"enabled":true,"fontSize":...)

---

## Canonical Vocabulary

Source of truth for SGS attribute decomposition (Spec 15 §3.3). Regenerated from `slot_synonyms`, `property_suffixes`, and `modifier_suffixes` in `sgs-framework.db`. Used by `/sgs-update` Stage 4 (canonical assignment) and Stage 9 (drift validator).

### Slot Synonyms

| Canonical slot | Aliases | HTML tag | Description |
|---|---|---|---|
| `__form_instance__` | [] | — | Per-instance form field content (fieldName, placeholder, helpText, required, conditional*). Not a designable visual slot — content lives on each form instance, not in the block-attribute design vocabulary. |
| `accent` | [] | — | Accent colour for interactive states (link underline, focus, hover) |
| `alt` | [] | — | Image alt text |
| `animation` | ["motion", "sgsAnimation", "stagger", "staggerDelay"] | — | Animation motion concept (incl. sgsAnimation) |
| `ariaLabel` | [] | — | ARIA label slot (a11y) |
| `aspectRatio` | ["aspect"] | — | Aspect-ratio slot |
| `autoplay` | [] | — | Autoplay boolean slot |
| `autoplaySpeed` | [] | — | Autoplay-speed slot |
| `avatar` | ["authorImage", "avatar-img", "avatar-initials", "portrait", "profile"] | img | Person portrait |
| `backdrop` | [] | — | Backdrop / scrim — modal / popup / drawer overlay |
| `backgroundMedia` | ["background", "backgroundImage", "backgroundVideo", "bg-img", "bg-media", "bg-video", "bgColor", "bgColour", "bgImage", "bgVideo", "heroImage", "svg-bg", "video-bg"] | — | Background polymorphic |
| `badge` | ["pill"] | span | Decorative badge / pill |
| `bar` | ["barColour", "progress", "progress-bar", "progress-step", "progress-step-label", "progress-step-number", "progress-steps", "progress-wrapper", "progressBar", "track"] | div | progress bar visual element |
| `border` | ["borderRadius", "borderColor", "borderColour", "borderWidth", "borderStyle"] | — | Border-properties container slot |
| `breakpoint` | [] | — | Responsive breakpoint threshold (px) |
| `button` | ["btn", "buttons", "cta", "cta-inputs", "ctaPrimary", "ctas", "load-more", "primaryButton", "primaryCta", "readmore"] | a | Primary CTA / button |
| `buttonSecondary` | ["ctaSecondary", "secondaryCta", "secondaryButton"] | a | Secondary CTA / button |
| `caption` | ["lightbox-caption"] | figcaption | Image caption |
| `card` | ["card-body", "card-header", "cardStyle", "entry", "item", "item-btn", "item-link", "node", "plan", "plan-meta", "review", "review-row", "slide", "slot", "stage", "stat", "step"] | — | Card-container slot |
| `column` | ["columns"] | — | Grid/flex column slot |
| `date` | ["card-date", "datetime", "day", "period", "time", "timestamp"] | time | Date |
| `drawer` | [] | — | Drawer-container slot |
| `feature` | ["featureColour"] | li | pricing tier feature list item |
| `flip` | [] | — | Mirror / scaleX(-1) transform toggle |
| `focusRing` | [] | — | Focus-ring outline (a11y) — width / colour / offset / opacity |
| `gap` | ["blockGap"] | — | Gap layout primitive slot |
| `header` | ["headerBackground", "headerColour"] | header | accordion item header (distinct from page heading) |
| `heading` | ["aggregate-text", "card-title", "headline", "name", "review-header", "title"] | h1 | Primary heading |
| `hideOn` | ["hideOnMobile", "hideOnTablet", "hideOnDesktop"] | — | Responsive-hide control slot |
| `hover` | ["hoverState"] | — | Hover-state slot (state modifier acting as slot) |
| `htmlTag` | [] | — | HTML tag selector (section / div / article) |
| `icon` | ["badge-number", "check", "feature-icon", "feature-icon--check", "feature-icon--cross", "glyph", "iconPosition", "iconSize", "iconValue", "symbol", "verified-icon"] | svg | Iconography |
| `imageAlt` | ["imageAltText"] | — | Image alt-text slot (a11y) |
| `items` | ["arrow", "arrows", "badges", "dot", "dots", "features", "filter", "filters", "list", "menu", "nav", "option", "set", "social", "social-link", "thumbs"] | ul | Repeating list of items |
| `label` | ["badge-label", "badge-text", "eyebrow", "inner-label", "kicker", "node-icon", "slot-label", "tag"] | span | Pre-heading label |
| `layout` | ["layoutType"] | — | Layout-mode slot |
| `lazyLoad` | [] | — | Defer asset load until viewport intersection |
| `letterSpacing` | [] | — | Letter-spacing slot |
| `link` | ["anchor", "count-link", "href", "image-link", "social-link", "url"] | a | Link target URL |
| `linkOpensNewTab` | ["openInNewTab", "target"] | — | Link-target control slot |
| `logo` | ["google-logo", "header-logo", "header-logo-link", "logoImage", "logoMaxWidth"] | — | Logo container slot |
| `loop` | [] | — | Media loop boolean |
| `margin` | ["margin"] | — | Margin layout primitive slot |
| `max` | ["maxHeight", "maxWidth"] | — | Max-dimension slot |
| `media` | ["badge-img", "bg-img", "embed", "image", "image-wrap", "img", "img-wrap", "photo", "picture", "side-image", "side-img", "slot-img", "split-image", "split-image--bleed", "split-image--desktop", "split-image--mobile", "thumb", "thumb-img", "video"] | img | Polymorphic image/video slot |
| `mediaSource` | [] | — | Source discriminator: upload / youtube / vimeo / url |
| `mediaType` | [] | — | Discriminator: image / video / svg / lottie |
| `min` | ["minHeight", "minWidth"] | — | Min-dimension slot (peeled stem) |
| `muted` | [] | — | Video / audio mute boolean |
| `nav` | ["navigation", "menu-nav"] | nav | Navigation container slot |
| `number` | ["aggregate", "badge-number", "count", "count-link", "numeric", "stat", "stats"] | — | Numeric-display slot |
| `opacity` | [] | — | Opacity slot |
| `options` | [] | select | Form-field selection options |
| `overflow` | [] | — | CSS overflow control |
| `overlay` | ["dialog", "lightbox", "lightbox-body", "lightbox-caption", "lightbox-close", "lightbox-counter", "lightbox-img", "lightbox-next", "lightbox-prev", "overlay-bio"] | — | Overlay-properties slot |
| `padding` | ["padding"] | — | Padding layout primitive slot |
| `panel` | ["panel-hint", "panel-note", "panels", "preview", "preview-container"] | — | Panel-container slot |
| `parallax` | [] | — | Scroll-parallax intensity / behaviour |
| `position` | [] | — | Position slot — CSS position keyword or coordinate object |
| `positionX` | [] | — | X-axis position slot |
| `positionY` | [] | — | Y-axis position slot |
| `price` | ["amount", "cost", "price-wrapper", "ribbon", "savings-badge"] | span | Price |
| `progress` | ["progress-bar", "progressBar", "progress-fill"] | div | Progress indicator — fill level or step tracker |
| `query` | ["queryArgs", "wpQuery"] | — | WP_Query / Query Loop descriptor |
| `quote` | ["quoteText", "quoteBody"] | blockquote | testimonial quote body |
| `rating` | ["aggregate", "card-stars", "header-stars", "score", "stars"] | span | Star rating |
| `review` | ["review-row", "review-item", "review-card"] | article | Single review entry (distinct from review-content body text) |
| `ribbon` | ["price-ribbon", "plan-ribbon"] | span | Decorative ribbon overlay on a card/panel |
| `role` | ["authorRole", "card-meta", "category", "jobTitle", "speakerRole"] | span | testimonial speaker role / job title |
| `rotation` | ["rotate"] | — | Rotation transform slot |
| `separator` | ["card-sep", "divider", "line", "rule", "shape", "wave"] | hr | Visual divider |
| `shadow` | [] | — | Shadow-properties slot |
| `showArrows` | [] | — | Show-arrows boolean slot |
| `showDate` | [] | — | Show-date boolean slot |
| `showDots` | [] | — | Show-dots boolean slot |
| `size` | [] | — | Square dimension (button size, icon size, close size) |
| `slot` | ["slot-placeholder", "slot-upload", "slot-preview", "slot-actions", "slot-label", "slot-img"] | div | Media-manager slot container (admin UI) |
| `social` | ["social-link", "social-icon", "social-item"] | a | Social media link / icon container |
| `split` | ["body-row", "grid", "group", "row"] | — | Split-layout slot |
| `star` | ["starColour", "emptyStar"] | svg | star rating visual element (filled or empty variant) |
| `step` | ["progress-step", "wizard-step", "stage-item"] | li | Individual step in a multi-step sequence |
| `subheading` | ["sub", "subHeadline", "subTitle", "subheadline", "subtitle"] | h2 | Sub-heading |
| `tab` | ["billing-toggle", "filter", "tabActive", "tabActiveIndicator", "tabBg", "tabText", "toggle-input", "toggle-label", "toggle-track"] | button | tab UI primitive (label + active + indicator variants) |
| `text` | ["attribution", "author", "bio", "body", "body-row", "caption", "consent-text", "content", "content-preview", "copy", "custom-content", "description", "excerpt", "inner", "inner-label", "intro", "label-control", "quote", "review-content", "textAlign", "textTransform", "verified", "verified-text"] | p | Paragraph body |
| `transition` | ["motion", "css-transition"] | — | CSS transition motion concept |
| `variant` | ["style"] | — | Variant/style enum slot |
| `verticalAlign` | [] | — | Vertical alignment within container |
| `width` | [] | — | Width layout primitive slot |
| `zIndex` | [] | — | z-index stacking order |

_Total: 89 canonical slots._

### Property Suffixes

| Suffix | Role | CSS property | Token-matched | Token source |
|---|---|---|---|---|
| `Alignment` | behaviour | — | no | — |
| `Animation` | motion | — | no | — |
| `AspectRatio` | layout | aspect-ratio | yes | — |
| `Attachment` | enum-class-probe | — | no | — |
| `Background` | color | background-color | yes | palette |
| `BackgroundColor` | color | background-color | yes | palette |
| `BackgroundColour` | color | background-color | yes | palette |
| `Bg` | color | background-color | no | — |
| `BlockGap` | spacing-token | gap | no | — |
| `Blur` | number-css-px | filter: blur() | no | — |
| `BorderBottomLeftRadius` | visual | border-bottom-left-radius | yes | spacing |
| `BorderBottomRightRadius` | visual | border-bottom-right-radius | yes | spacing |
| `BorderBottomWidth` | visual | border-bottom-width | yes | spacing |
| `BorderColor` | color | border-color | yes | palette |
| `BorderColour` | color | border-color | yes | palette |
| `BorderLeftWidth` | visual | border-left-width | yes | spacing |
| `BorderRadius` | visual | border-radius | yes | — |
| `BorderRightWidth` | visual | border-right-width | yes | spacing |
| `BorderStyle` | visual | border-style | yes | — |
| `BorderTopLeftRadius` | visual | border-top-left-radius | yes | spacing |
| `BorderTopRightRadius` | visual | border-top-right-radius | yes | spacing |
| `BorderTopWidth` | visual | border-top-width | yes | spacing |
| `BorderWidth` | visual | border-width | yes | — |
| `BoxShadow` | visual | box-shadow | yes | shadow.presets |
| `Circle` | select-from-enum | — | no | — |
| `Color` | color | color | yes | palette |
| `Colour` | color | color | yes | palette |
| `ColumnGap` | layout | column-gap | yes | spacing |
| `Columns` | layout | grid-template-columns | no | — |
| `ContentSize` | number-css-px | max-width | no | — |
| `Date` | text-content | — | no | — |
| `Delay` | motion | transition-delay | no | — |
| `Duration` | motion | transition-duration | no | — |
| `Easing` | motion | transition-timing-function | no | — |
| `Effect` | select-from-enum | — | no | — |
| `Email` | text-content | — | no | — |
| `Emoji` | text-content | — | no | — |
| `ErrorMessage` | behaviour | — | no | — |
| `Files` | enum-class-probe | — | no | — |
| `FontFamily` | typography | font-family | yes | fontFamilies |
| `FontSize` | typography | font-size | yes | fontSizes |
| `FontStyle` | select-from-enum | font-style | no | — |
| `FontWeight` | typography | font-weight | yes | — |
| `Foreground` | color | color | yes | palette |
| `Gap` | layout | gap | yes | spacingSizes |
| `Gradient` | colour-gradient | background-image | no | — |
| `Grayscale` | select-from-enum | — | no | — |
| `Height` | layout | height | yes | — |
| `HelpText` | behaviour | — | no | — |
| `Href` | content | — | no | — |
| `Icon` | enum-class-probe | — | no | — |
| `Id` | enum-class-probe | — | no | — |
| `Image` | image-object | — | no | — |
| `ImageZoom` | select-from-enum | — | no | — |
| `Item` | select-from-enum | — | no | — |
| `Large` | select-from-enum | — | no | — |
| `Layout` | layout | — | yes | — |
| `LetterSpacing` | typography | letter-spacing | yes | — |
| `LineHeight` | typography | line-height | yes | — |
| `Link` | content | — | no | — |
| `LinkColor` | colour-text | color (on a) | no | — |
| `Margin` | layout | margin | yes | spacingSizes |
| `MarginBottom` | layout | margin-bottom | yes | spacing |
| `MarginLeft` | layout | margin-left | yes | spacing |
| `MarginRight` | layout | margin-right | yes | spacing |
| `MarginTop` | layout | margin-top | yes | spacing |
| `Max` | layout | — | no | — |
| `MaxHeight` | layout | max-height | yes | — |
| `MaxWidth` | layout | max-width | yes | — |
| `Min` | layout | — | no | — |
| `MinHeight` | layout | min-height | yes | — |
| `MinWidth` | layout | min-width | yes | — |
| `Mode` | select-from-enum | — | no | — |
| `Note` | text-content | — | no | — |
| `ObjectFit` | visual | object-fit | yes | — |
| `ObjectPosition` | visual | object-position | yes | — |
| `Opacity` | visual | opacity | yes | — |
| `Overlay` | boolean-visibility | — | no | — |
| `Override` | select-from-enum | — | no | — |
| `Padding` | layout | padding | yes | spacingSizes |
| `PaddingBottom` | layout | padding-bottom | yes | spacing |
| `PaddingLeft` | layout | padding-left | yes | spacing |
| `PaddingRight` | layout | padding-right | yes | spacing |
| `PaddingTop` | layout | padding-top | yes | spacing |
| `Pages` | enum-class-probe | — | no | — |
| `Percent` | number-css-percent | percentage | no | — |
| `Phone` | text-content | — | no | — |
| `Placeholder` | behaviour | — | no | — |
| `Position` | select-from-enum | — | no | — |
| `Poster` | image-object | — | no | — |
| `Preset` | select-from-enum | — | no | — |
| `Radius` | visual | border-radius | no | — |
| `Rating` | number-css-px | — | no | — |
| `Required` | behaviour | — | no | — |
| `RowGap` | layout | row-gap | yes | spacing |
| `Scale` | select-from-enum | — | no | — |
| `Schema` | text-content | — | no | — |
| `Shadow` | color | box-shadow | yes | shadow.presets |
| `Size` | select-from-enum | — | no | — |
| `Spacing` | spacing-token | padding/margin (preset) | no | — |
| `Speed` | number-css-px | — | no | — |
| `StaggerDelay` | motion | — | no | — |
| `Stroke` | color | stroke | yes | palette |
| `Style` | behaviour | — | no | — |
| `Text` | text-content | — | no | — |
| `TextAlign` | typography | text-align | yes | — |
| `TextColor` | color | color | yes | palette |
| `TextColour` | color | color | yes | palette |
| `TextDecoration` | typography | text-decoration | yes | — |
| `TextTransform` | typography | text-transform | yes | — |
| `Title` | text-content | — | no | — |
| `Type` | select-from-enum | — | no | — |
| `Url` | content | — | no | — |
| `Variant` | behaviour | — | no | — |
| `Video` | image-object | — | no | — |
| `WideSize` | number-css-px | max-width | no | — |
| `Width` | layout | width | yes | — |

_Total: 117 property suffixes._

### Modifier Suffixes

| Suffix | Kind | Notes |
|---|---|---|
| `Desktop` | breakpoint |  |
| `Mobile` | breakpoint |  |
| `Tablet` | breakpoint |  |
| `BL` | corner |  |
| `BR` | corner |  |
| `TL` | corner |  |
| `TR` | corner |  |
| `Bottom` | side |  |
| `Left` | side |  |
| `Right` | side |  |
| `Top` | side |  |
| `Active` | state |  |
| `Disabled` | state |  |
| `Focus` | state |  |
| `Hover` | state |  |
| `Unit` | unit |  |
| `Primary` | variant |  |
| `Secondary` | variant |  |
| `Tertiary` | variant |  |

_Total: 19 modifier suffixes._

## Stats

- **Total blocks:** 194
- **Dynamic (render.php):** 73
- **Static (save.js):** 121
- **Total attributes:** 2230
