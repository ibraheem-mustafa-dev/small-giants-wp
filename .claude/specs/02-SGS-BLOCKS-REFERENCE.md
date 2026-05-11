# SGS Blocks Reference

> **AUTO-GENERATED.** Do not edit by hand. This file is regenerated from
> `~/.claude/skills/sgs-wp-engine/sgs-framework.db` by
> `plugins/sgs-blocks/scripts/generate-block-reference.py`.
> Refresh: `python plugins/sgs-blocks/scripts/generate-block-reference.py`.

**Last generated:** 2026-05-11T13:12:47

**For architectural patterns, customisation standards, and build status, see [`02-SGS-BLOCKS.md`](02-SGS-BLOCKS.md).** This file is the per-block attribute/supports/selector reference only.

---

## Contents

- [Layout](#layout) (5 blocks)
- [Content](#content) (34 blocks)
- [Forms](#forms) (17 blocks)
- [Interactive](#interactive) (11 blocks)

---

## Layout

### `sgs/container`
_SGS Container_

**Type:** Dynamic

Flexible layout wrapper â€” the fundamental building block for all page sections.

**Attributes** (26):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `backgroundImage` | `object` | `—` | — |
| `backgroundMedia` | `object` | `—` | — |
| `backgroundOverlayColour` | `string` | `—` | — |
| `backgroundOverlayOpacity` | `number` | `50` | — |
| `columns` | `number` | `2` | Yes |
| `columnsMobile` | `number` | `1` | — |
| `columnsTablet` | `number` | `2` | — |
| `gap` | `string` | `"40"` | Yes |
| `gapMobile` | `string` | `""` | — |
| `gapTablet` | `string` | `""` | — |
| `htmlTag` | `string` | `"section"` | — |
| `layout` | `string` | `"stack"` | — |
| `maxWidth` | `string` | `"wide"` | — |
| `minHeight` | `string` | `—` | — |
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

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-container` |

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
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...)

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

**Type:** Static

Horizontal strip of certification badges with optional labels. Trust signals like BRC, Halal, SALSA.

**Attributes** (8):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `badgeSize` | `string` | `"medium"` | — |
| `badgeStyle` | `string` | `"text-only"` | — |
| `items` | `array` | `[]` | — |
| `labelColour` | `string` | `"text-muted"` | — |
| `labelFontSize` | `string` | `—` | — |
| `title` | `string` | `—` | — |
| `titleColour` | `string` | `"text"` | — |
| `titleFontSize` | `string` | `—` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.sgs-certification-bar` |
| `typography` | `.sgs-certification-bar__title` |

---

### `sgs/counter`
_SGS Counter_

**Type:** Static

Animated number counter with prefix, suffix, and label.

**Attributes** (11):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `accentStroke` | `boolean` | `false` | — |
| `duration` | `number` | `2000` | — |
| `icon` | `string` | `""` | — |
| `label` | `string` | `—` | — |
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
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `shadow`, `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-cta-section` |
| `typography` | `.sgs-cta-section__headline` |

---

### `sgs/data-display`
_SGS Data Display_

**Type:** Dynamic

Container for visualisation sub-blocks driven by a shared SGS data source.

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
- `align` (["wide", "full"]), `anchor`, `className`, `color` ({"background": true, "text"...), `html` (false), `interactivity`

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-google-reviews` |

---

### `sgs/heritage-strip`
_SGS Heritage Strip_

**Type:** Static

Full-width story section with images and narrative text. Three layout options.

**Attributes** (24):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `backgroundColor` | `string` | `"primary"` | — |
| `backgroundColour` | `string` | `—` | — |
| `badge` | `string` | `""` | — |
| `bgPattern` | `string (enum)` | `"none"` | — |
| `body` | `string` | `""` | — |
| `bodyColour` | `string` | `"text-inverse"` | — |
| `bodyFontSize` | `string` | `—` | Yes |
| `bodyFontSizeMobile` | `string` | `""` | — |
| `bodyFontSizeTablet` | `string` | `""` | — |
| `headline` | `string` | `""` | — |
| `headlineColour` | `string` | `"text-inverse"` | — |
| `headlineFontSize` | `string` | `—` | Yes |
| `headlineFontSizeMobile` | `string` | `""` | — |
| `headlineFontSizeTablet` | `string` | `""` | — |
| `hoverBackgroundColour` | `string` | `""` | — |
| `hoverBorderColour` | `string` | `""` | — |
| `hoverEffect` | `string` | `"none"` | — |
| `hoverTextColour` | `string` | `""` | — |
| `imageLeft` | `object` | `—` | — |
| `imageRight` | `object` | `—` | — |
| `layout` | `string` | `"image-text-image"` | — |
| `textColor` | `string` | `"text-inverse"` | — |
| `transitionDuration` | `string` | `"300"` | — |
| `transitionEasing` | `string` | `"ease-in-out"` | — |

**Supports:**
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.sgs-heritage-strip` |
| `typography` | `.sgs-heritage-strip__headline` |

---

### `sgs/icon`
_SGS Icon_

**Type:** Dynamic

Standalone SVG icon with size, colour, background, and optional link.

**Attributes** (11):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `backgroundColour` | `string` | `"surface-alt"` | — |
| `backgroundShape` | `string` | `"circle"` | — |
| `hoverColour` | `string` | `"accent-text"` | — |
| `hoverScale` | `number` | `1.1` | — |
| `icon` | `string` | `"star"` | — |
| `iconColour` | `string` | `"primary"` | — |
| `iconValue` | `object` | `—` | — |
| `link` | `string` | `""` | — |
| `linkLabel` | `string` | `""` | — |
| `linkOpensNewTab` | `boolean` | `false` | — |
| `size` | `number` | `48` | — |

**Supports:**
- `align` (["center", "wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...)

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

### `sgs/media`
_SGS Media_

**Type:** Dynamic

Absolute-positioned decorative image or video that floats freely over sections. Used for organic, editorial-style design with optional parallax scroll effects. Accepts images or local/embedded videos.

**Attributes** (43):

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
| `mediaType` | `string` | `"image"` | — |
| `opacity` | `number` | `85` | — |
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
- `anchor`, `html` (false), `sgs` ({"mediaControls": true})

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

**Type:** Static

Inline informational banner for contextual messages like minimum order values, delivery terms, or promotional notices.

**Attributes** (7):

| Name | Type | Default | Responsive |
|------|------|---------|------------|
| `customIcon` | `object` | `{"source": "", "value": "", "label": ""}` | — |
| `dismissible` | `boolean` | `false` | — |
| `icon` | `string` | `"info"` | — |
| `text` | `string` | `—` | — |
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
| `billingToggle` | `boolean` | `true` | — |
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
- `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-pricing-table` |
| `typography` | `.sgs-pricing-table__title` |

---

### `sgs/process-steps`
_SGS Process Steps_

**Type:** Static

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
- `align` (false), `html` (false), `spacing` ({"margin": true, "padding":...)

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
- `__experimentalBorder` ({"radius": true, "width": t...), `align` (["wide", "full"]), `anchor`, `color` ({"background": true, "text"...), `html` (false), `spacing` ({"margin": true, "padding":...), `typography` ({"fontSize": true, "lineHei...)

**Selectors:**

| Element | Selector |
|---------|----------|
| `root` | `.wp-block-sgs-testimonial-slider` |
| `typography` | `.sgs-testimonial-slider__quote` |

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

**Type:** Static

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
- `anchor` (false), `html` (false)

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

**Type:** Static

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

## Stats

- **Total blocks:** 67
- **Dynamic (render.php):** 60
- **Static (save.js):** 7
- **Total attributes:** 1343
