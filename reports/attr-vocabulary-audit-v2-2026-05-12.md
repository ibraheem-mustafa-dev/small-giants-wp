# Attribute vocabulary audit v2 — multi-suffix decomposition

Scanned **1343** attribute rows across **67** SGS blocks. 
Skipped: 0 placeholders + 70 structural booleans (is*/has*/show*/hide* etc.).
After full multi-suffix decomposition: **434** distinct base slot words.

## Decomposition vocabulary in use

### Property suffixes (controlled vocabulary)

| Suffix | Usage count |
|---|---|
| `Colour` | 123 |
| `FontSize` | 42 |
| `Padding` | 39 |
| `Style` | 33 |
| `Height` | 24 |
| `Width` | 21 |
| `BorderColour` | 16 |
| `TextColour` | 16 |
| `Background` | 15 |
| `BorderRadius` | 14 |
| `BackgroundColour` | 13 |
| `Url` | 11 |
| `Shadow` | 10 |
| `MaxWidth` | 10 |
| `Gap` | 9 |
| `Color` | 8 |
| `Opacity` | 6 |
| `BorderWidth` | 6 |
| `Margin` | 6 |
| `LetterSpacing` | 4 |
| `LineHeight` | 4 |
| `Link` | 4 |
| `FontWeight` | 3 |
| `Alignment` | 3 |
| `ObjectPosition` | 2 |
| `FontFamily` | 2 |
| `TextDecoration` | 2 |
| `TextTransform` | 2 |
| `Stroke` | 1 |
| `Variant` | 1 |

### Modifier suffixes (corners/sides/states/variants/breakpoints)

| Suffix | Usage count |
|---|---|
| `breakpoint:Mobile` | 90 |
| `breakpoint:Tablet` | 81 |
| `unit:Unit` | 31 |
| `side:Bottom` | 26 |
| `side:Top` | 20 |
| `side:Left` | 18 |
| `side:Right` | 18 |
| `state:Hover` | 15 |
| `corner:BL` | 6 |
| `corner:BR` | 6 |
| `corner:TL` | 6 |
| `corner:TR` | 6 |
| `variant:Primary` | 6 |
| `variant:Secondary` | 6 |
| `breakpoint:Desktop` | 5 |
| `state:Active` | 2 |

## Top slot bases by block coverage

| Base slot | Blocks | Sample attrs |
|---|---|---|
| `label` | **25** | `label`, `labelColour`, `labelFontFamily`, `labelFontSize` |
| `hover` | **15** | `hoverBackgroundColour`, `hoverBorderColour`, `hoverColour`, `hoverShadow` |
| `transitionDuration` | **15** | `transitionDuration` |
| `width` | **15** | `width`, `widthMobile`, `widthTablet` |
| `icon` | **14** | `icon`, `iconBackgroundColour`, `iconColour`, `iconColourHover` |
| `transitionEasing` | **14** | `transitionEasing` |
| `conditionalField` | **14** | `conditionalField` |
| `conditionalOperator` | **14** | `conditionalOperator` |
| `conditionalValue` | **14** | `conditionalValue` |
| `fieldName` | **14** | `fieldName` |
| `helpText` | **13** | `helpText` |
| `placeholder` | **13** | `placeholder` |
| `required` | **13** | `required` |
| `sgsAnimation` | **11** | `sgsAnimation` |
| `sgsAnimationDuration` | **11** | `sgsAnimationDuration` |
| `sgsAnimationEasing` | **11** | `sgsAnimationEasing` |
| `staggerDelay` | **11** | `staggerDelay` |
| `text` | **10** | `text`, `textColor`, `textColour`, `textFontSize` |
| `columns` | **10** | `columns`, `columnsDesktop`, `columnsMobile`, `columnsTablet` |
| `variant` | **9** | `variant`, `variantStyle` |
| `hoverEffect` | **9** | `hoverEffect` |
| `gap` | **9** | `gap`, `gapMobile`, `gapTablet`, `gapUnit` |
| `background` | **8** | `backgroundColor`, `backgroundColour` |
| `hoverScale` | **8** | `hoverScale` |
| `title` | **7** | `title`, `titleColour`, `titleFontSize` |
| `link` | **7** | `link`, `linkActiveColour`, `linkColour`, `linkFontSize` |
| `layout` | **7** | `layout` |
| `card` | **7** | `cardStyle`, `cardVariant` |
| `iconSize` | **6** | `iconSize`, `iconSizeMobile`, `iconSizeTablet` |
| `image` | **6** | `image`, `imageBorderColour`, `imageBorderRadiusBL`, `imageBorderRadiusBR` |

## Genuine block-specific bases (long tail per block)

| Block | Unique bases after v2 decomposition |
|---|---|
| `sgs/mobile-nav` | 32 |
| `sgs/post-grid` | 23 |
| `sgs/button` | 22 |
| `sgs/hero` | 17 |
| `sgs/form` | 16 |
| `sgs/icon-list` | 15 |
| `sgs/media` | 13 |
| `sgs/team-member` | 13 |
| `sgs/announcement-bar` | 10 |
| `sgs/container` | 9 |
| `sgs/pricing-table` | 9 |
| `sgs/table-of-contents` | 8 |
| `sgs/trustpilot-reviews` | 8 |
| `sgs/brand-strip` | 7 |
| `sgs/google-reviews` | 7 |
| `sgs/accordion` | 5 |
| `sgs/countdown-timer` | 5 |
| `sgs/cta-section` | 5 |
| `sgs/gallery` | 5 |
| `sgs/mega-menu` | 5 |

Total single-block-only bases after v2 decomposition: **324** (was 401 in v1).

