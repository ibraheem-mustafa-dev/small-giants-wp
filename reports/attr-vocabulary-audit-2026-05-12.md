# SGS block.json attribute vocabulary audit — 2026-05-12

Scanned **1343** attribute rows across **67** SGS blocks. 
Stripped property + breakpoint suffixes to expose base slot words.
**511** distinct base words found.

## 1. Drift findings — synonym clusters in use today

Concepts where 2+ different base words are used across blocks for what is plausibly the same semantic slot. Each row is a candidate for the synonym table.

### text content (paragraph) (5 competing words)

| Base word | Blocks using it | Sample attribute names |
|---|---|---|
| `text` | **10** — announcement-bar, business-info, cta-section, google-reviews, heritage-strip, hero ... (+4 more) | `text`, `textColor`, `textColour`, `textFontSize`, `textShadow` |
| `body` | **2** — cta-section, heritage-strip | `body`, `bodyColour`, `bodyFontSize`, `bodyFontSizeMobile`, `bodyFontSizeTablet` |
| `description` | **3** — info-box, process-steps, product-card | `description`, `descriptionColour` |
| `content` | **1** — hero | `contentMaxWidth`, `contentMaxWidthMobile`, `contentMaxWidthTablet`, `contentPaddingBottom`, `contentPaddingBottomMobile` |
| `caption` | **1** — gallery | `captionColour` |

### primary heading (4 competing words)

| Base word | Blocks using it | Sample attribute names |
|---|---|---|
| `headline` | **3** — cta-section, heritage-strip, hero | `headline`, `headlineColour`, `headlineFontSize`, `headlineFontSizeDesktop`, `headlineFontSizeMobile` |
| `heading` | **2** — form-review, info-box | `heading`, `headingColour`, `headingFontSize`, `headingFontSizeMobile`, `headingFontSizeTablet` |
| `title` | **7** — accordion-item, card-grid, certification-bar, post-grid, pricing-table, process-steps ... (+1 more) | `title`, `titleColour`, `titleFontSize` |
| `name` | **3** — team-member, testimonial, testimonial-slider | `name`, `nameColour`, `nameFontSize`, `nameFontSizeMobile`, `nameFontSizeTablet` |

### list of items (4 competing words)

| Base word | Blocks using it | Sample attribute names |
|---|---|---|
| `items` | **5** — card-grid, certification-bar, icon-list, trust-badges, trust-bar | `items` |
| `badges` | **1** — hero | `badges` |
| `list` | **1** — table-of-contents | `listStyle` |
| `options` | **3** — form-field-checkbox, form-field-radio, form-field-select | `options` |

### card / tile (3 competing words)

| Base word | Blocks using it | Sample attribute names |
|---|---|---|
| `card` | **7** — countdown-timer, google-reviews, info-box, post-grid, team-member, testimonial-slider ... (+1 more) | `cardStyle`, `cardVariant` |
| `tiles` | **1** — form-field-tiles | `tiles` |
| `panel` | **2** — mega-menu, tabs | `panelAlignment`, `panelBorderColour`, `panelMaxWidth`, `panelWidth` |

### link / URL (3 competing words)

| Base word | Blocks using it | Sample attribute names |
|---|---|---|
| `link` | **7** — breadcrumbs, icon, icon-block, info-box, mega-menu, mobile-nav ... (+1 more) | `link`, `linkColour`, `linkFontSize`, `linkFontSizeMobile`, `linkFontWeight` |
| `url` | **2** — button, mega-menu | `url` |
| `anchor` | **1** — button | `anchor` |

### primary CTA (3 competing words)

| Base word | Blocks using it | Sample attribute names |
|---|---|---|
| `cta` | **5** — announcement-bar, hero, mobile-nav, pricing-table, product-card | `ctaBackground`, `ctaBorderColour`, `ctaColour`, `ctaGap`, `ctaGapMobile` |
| `ctaPrimary` | **1** — hero | `ctaPrimaryBackground`, `ctaPrimaryColour`, `ctaPrimaryHoverBackground`, `ctaPrimaryHoverColour`, `ctaPrimaryStyle` |
| `button` | **2** — back-to-top, cta-section | `buttonBackground`, `buttonBorderColour`, `buttonBorderRadius`, `buttonBorderWidth`, `buttonColour` |

### primary image (3 competing words)

| Base word | Blocks using it | Sample attribute names |
|---|---|---|
| `image` | **5** — decorative-image, hero, info-box, media, product-card | `image`, `imageBorderColour`, `imageBorderStyle`, `imageHeight`, `imageHeightMobile` |
| `media` | **1** — hero | `mediaBackgroundColour`, `mediaPaddingBottom`, `mediaPaddingBottomMobile`, `mediaPaddingBottomTablet`, `mediaPaddingLeft` |
| `photo` | **1** — team-member | `photo` |

### secondary heading (2 competing words)

| Base word | Blocks using it | Sample attribute names |
|---|---|---|
| `subHeadline` | **1** — hero | `subHeadline`, `subHeadlineColour`, `subHeadlineFontFamily`, `subHeadlineFontSize`, `subHeadlineFontSizeMobile` |
| `subtitle` | **2** — card-grid, info-box | `subtitle`, `subtitleColour`, `subtitleFontSize`, `subtitleFontSizeMobile`, `subtitleFontSizeTablet` |

### secondary CTA (2 competing words)

| Base word | Blocks using it | Sample attribute names |
|---|---|---|
| `ctaSecondary` | **1** — hero | `ctaSecondaryBackground`, `ctaSecondaryColour`, `ctaSecondaryHoverBackground`, `ctaSecondaryHoverColour`, `ctaSecondaryStyle` |
| `secondaryCta` | **1** — mobile-nav | `secondaryCtaStyle`, `secondaryCtaTextColour`, `secondaryCtaUrl` |

## 2. Top base words by block coverage

Base words used in 3+ blocks. Anything here is a candidate slot identifier.

| Base word | Blocks | Sample attrs |
|---|---|---|
| `label` | 25 | `label`, `labelColour`, `labelFontFamily`, `labelFontSize` |
| `hover` | 15 | `hoverBackgroundColour`, `hoverBorderColour`, `hoverColour`, `hoverShadow` |
| `transitionDuration` | 15 | `transitionDuration` |
| `width` | 15 | `width`, `widthMobile`, `widthTablet` |
| `icon` | 14 | `icon`, `iconBackgroundColour`, `iconColour`, `iconGap` |
| `transitionEasing` | 14 | `transitionEasing` |
| `conditionalField` | 14 | `conditionalField` |
| `conditionalOperator` | 14 | `conditionalOperator` |
| `conditionalValue` | 14 | `conditionalValue` |
| `fieldName` | 14 | `fieldName` |
| `helpText` | 13 | `helpText` |
| `placeholder` | 13 | `placeholder` |
| `required` | 13 | `required` |
| `sgsAnimation` | 11 | `sgsAnimation` |
| `sgsAnimationDuration` | 11 | `sgsAnimationDuration` |
| `sgsAnimationEasing` | 11 | `sgsAnimationEasing` |
| `staggerDelay` | 11 | `staggerDelay` |
| `text` | 10 | `text`, `textColor`, `textColour`, `textFontSize` |
| `columns` | 10 | `columns`, `columnsDesktop`, `columnsMobile`, `columnsTablet` |
| `variant` | 9 | `variant`, `variantStyle` |
| `hoverEffect` | 9 | `hoverEffect` |
| `gap` | 9 | `gap`, `gapMobile`, `gapTablet`, `gapUnit` |
| `background` | 8 | `backgroundColor`, `backgroundColour` |
| `hoverScale` | 8 | `hoverScale` |
| `title` | 7 | `title`, `titleColour`, `titleFontSize` |
| `link` | 7 | `link`, `linkColour`, `linkFontSize`, `linkFontSizeMobile` |
| `layout` | 7 | `layout` |
| `card` | 7 | `cardStyle`, `cardVariant` |
| `iconSize` | 6 | `iconSize`, `iconSizeMobile`, `iconSizeTablet` |
| `style` | 5 | `style` |
| `cta` | 5 | `ctaBackground`, `ctaBorderColour`, `ctaColour`, `ctaGap` |
| `min` | 5 | `min`, `minHeight`, `minHeightMobile`, `minHeightTablet` |
| `hoverImageZoom` | 5 | `hoverImageZoom` |
| `items` | 5 | `items` |
| `image` | 5 | `image`, `imageBorderColour`, `imageBorderStyle`, `imageHeight` |
| `iconPosition` | 4 | `iconPosition` |
| `max` | 4 | `max`, `maxHeight`, `maxWidth` |
| `ariaLabel` | 4 | `ariaLabel` |
| `iconValue` | 4 | `iconValue` |
| `letterSpacing` | 4 | `letterSpacing`, `letterSpacingMobile`, `letterSpacingTablet`, `letterSpacingUnit` |
| `textTransform` | 4 | `textTransform` |
| `hoverGrayscale` | 4 | `hoverGrayscale` |
| `number` | 4 | `number`, `numberBackground`, `numberColour`, `numberStyle` |
| `position` | 3 | `position` |
| `separator` | 3 | `separator`, `separatorColour` |
| `aspectRatio` | 3 | `aspectRatio` |
| `overlay` | 3 | `overlayColour`, `overlayOpacity`, `overlayStyle` |
| `badge` | 3 | `badge`, `badgeColour`, `badgeStyle` |
| `backgroundImage` | 3 | `backgroundImage`, `backgroundImageOpacity` |
| `backgroundMedia` | 3 | `backgroundMedia` |

## 3. Long tail — base words used in only 1 block

These are block-specific custom slots. Most are legitimate (e.g. `splitColumnRatio` is genuinely hero-only). A few might be drift candidates that didn't cluster.

**401** base words used by exactly one block.

