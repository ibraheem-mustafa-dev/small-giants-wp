# Phase 3.5 Coverage — Methods A + B (Frequency + Cross-block)

**Date:** 2026-05-12. **Method:** Live DB query (post-B5 drift remediation).

Live vocab baseline: 20 slot_synonyms, 58 property_suffixes, 19 modifier_suffixes.

## Method A — Top recurring gap stems

71 stems appear ≥3 times in the gap queue.

| Count | Stem | Proposed bucket | Rationale |
|---:|---|---|---|
| 41 | `hover` | modifier_suffix or slot-prefix | state — needs decision |
| 24 | `columns` | slot_synonym or property_suffix | layout — needs §11 decision |
| 19 | `width` | slot_synonym or property_suffix | layout — needs §11 decision |
| 17 | `gap` | slot_synonym or property_suffix | layout — needs §11 decision |
| 15 | `transitionDuration` | review | no clear bucket |
| 14 | `transitionEasing` | review | no clear bucket |
| 13 | `padding` | slot_synonym or property_suffix | layout — needs §11 decision |
| 13 | `margin` | slot_synonym or property_suffix | layout — needs §11 decision |
| 13 | `borderRadius` | slot_synonym | visual primitive |
| 12 | `min` | slot_synonym or property_suffix | layout — needs §11 decision |
| 11 | `staggerDelay` | slot_synonym | motion-concept (extends §11) |
| 11 | `sgsAnimationEasing` | review | no clear bucket |
| 11 | `sgsAnimationDuration` | review | no clear bucket |
| 11 | `sgsAnimation` | slot_synonym | motion-concept (extends §11) |
| 10 | `text` | slot_synonym | extend content-identity vocab |
| 10 | `iconSize` | slot_synonym or property_suffix | layout — needs §11 decision |
| 10 | `background` | slot_synonym | visual primitive |
| 9 | `variant` | select-from-enum role | variant attr |
| 9 | `textAlign` | slot_synonym or property_suffix | layout — needs §11 decision |
| 9 | `hoverEffect` | select-from-enum role | variant attr |
| 8 | `hoverScale` | select-from-enum role | variant attr |
| 8 | `card` | slot_synonym | extend content-identity vocab |
| 7 | `number` | slot_synonym | extend content-identity vocab |
| 7 | `letterSpacing` | slot_synonym or property_suffix | layout — needs §11 decision |
| 7 | `layout` | select-from-enum role | variant attr |
| 6 | `rotation` | slot_synonym or property_suffix | layout — needs §11 decision |
| 6 | `positionY` | slot_synonym or property_suffix | layout — needs §11 decision |
| 6 | `positionX` | slot_synonym or property_suffix | layout — needs §11 decision |
| 6 | `border` | slot_synonym | visual primitive |
| 5 | `style` | select-from-enum role | variant attr |
| 5 | `role` | review | no clear bucket |
| 5 | `overlay` | review | no clear bucket |
| 5 | `hoverImageZoom` | select-from-enum role | variant attr |
| 5 | `fontSize` | review | no clear bucket |
| 4 | `textTransform` | review | no clear bucket |
| 4 | `split` | review | no clear bucket |
| 4 | `panel` | review | no clear bucket |
| 4 | `max` | slot_synonym or property_suffix | layout — needs §11 decision |
| 4 | `line` | review | no clear bucket |
| 4 | `iconValue` | review | no clear bucket |
| 4 | `iconPosition` | review | no clear bucket |
| 4 | `hoverGrayscale` | review | no clear bucket |
| 4 | `hideOn` | review | no clear bucket |
| 4 | `drawer` | review | no clear bucket |
| 4 | `ariaLabel` | review | no clear bucket |
| 3 | `wrap` | review | no clear bucket |
| 3 | `trigger` | review | no clear bucket |
| 3 | `tab` | review | no clear bucket |
| 3 | `submit` | review | no clear bucket |
| 3 | `submenuIndent` | review | no clear bucket |
| 3 | `sublink` | review | no clear bucket |
| 3 | `splitColumnRatio` | review | no clear bucket |
| 3 | `socialIconSize` | review | no clear bucket |
| 3 | `showDots` | review | no clear bucket |
| 3 | `showDate` | review | no clear bucket |
| 3 | `showArrows` | review | no clear bucket |
| 3 | `sgsHover` | review | no clear bucket |
| 3 | `quote` | review | no clear bucket |
| 3 | `position` | review | no clear bucket |
| 3 | `opacity` | review | no clear bucket |
| 3 | `logo` | slot_synonym | extend content-identity vocab |
| 3 | `linkOpensNewTab` | review | no clear bucket |
| 3 | `link` | slot_synonym | extend content-identity vocab |
| 3 | `justifyContent` | review | no clear bucket |
| 3 | `imageAlt` | review | no clear bucket |
| 3 | `formFocusRing` | review | no clear bucket |
| 3 | `direction` | review | no clear bucket |
| 3 | `closeButtonSize` | review | no clear bucket |
| 3 | `autoplaySpeed` | review | no clear bucket |
| 3 | `autoplay` | review | no clear bucket |
| 3 | `aspectRatio` | review | no clear bucket |

## Method B — Cross-block attr_names (≥3 blocks, some/all un-canonicalised)

59 cross-block attrs have at least one un-canonicalised instance.

| attr_name | Blocks | Canonical / Total |
|---|---:|---:|
| `width` | 15 | 0/15 |
| `transitionDuration` | 15 | 0/15 |
| `transitionEasing` | 14 | 0/14 |
| `fieldName` | 14 | 0/14 |
| `conditionalValue` | 14 | 0/14 |
| `conditionalOperator` | 14 | 0/14 |
| `conditionalField` | 14 | 0/14 |
| `required` | 13 | 0/13 |
| `placeholder` | 13 | 0/13 |
| `helpText` | 13 | 0/13 |
| `staggerDelay` | 11 | 0/11 |
| `sgsAnimationEasing` | 11 | 0/11 |
| `sgsAnimationDuration` | 11 | 0/11 |
| `sgsAnimation` | 11 | 0/11 |
| `hoverTextColour` | 11 | 0/11 |
| `hoverBorderColour` | 11 | 0/11 |
| `hoverBackgroundColour` | 11 | 0/11 |
| `hoverEffect` | 9 | 0/9 |
| `gap` | 9 | 0/9 |
| `columns` | 9 | 0/9 |
| `variant` | 8 | 0/8 |
| `hoverScale` | 8 | 0/8 |
| `layout` | 7 | 0/7 |
| `columnsTablet` | 7 | 0/7 |
| `columnsMobile` | 7 | 0/7 |
| `cardStyle` | 7 | 0/7 |
| `textColour` | 6 | 2/6 |
| `iconSize` | 6 | 0/6 |
| `hoverShadow` | 6 | 0/6 |
| `backgroundColour` | 6 | 0/6 |
| `style` | 5 | 0/5 |
| `hoverImageZoom` | 5 | 0/5 |
| `textTransform` | 4 | 0/4 |
| `textColor` | 4 | 0/4 |
| `minHeight` | 4 | 0/4 |
| `letterSpacing` | 4 | 0/4 |
| `iconValue` | 4 | 0/4 |
| `iconPosition` | 4 | 0/4 |
| `hoverGrayscale` | 4 | 0/4 |
| `backgroundColor` | 4 | 0/4 |
| `ariaLabel` | 4 | 0/4 |
| `textAlignTablet` | 3 | 0/3 |
| `textAlignMobile` | 3 | 0/3 |
| `textAlignDesktop` | 3 | 0/3 |
| `showDots` | 3 | 0/3 |
| `showDate` | 3 | 0/3 |
| `showArrows` | 3 | 0/3 |
| `roleColour` | 3 | 0/3 |
| `position` | 3 | 0/3 |
| `opacity` | 3 | 0/3 |
| `numberColour` | 3 | 0/3 |
| `linkOpensNewTab` | 3 | 0/3 |
| `link` | 3 | 0/3 |
| `imageAlt` | 3 | 0/3 |
| `gapTablet` | 3 | 0/3 |
| `gapMobile` | 3 | 0/3 |
| `autoplaySpeed` | 3 | 0/3 |
| `autoplay` | 3 | 0/3 |
| `aspectRatio` | 3 | 0/3 |

## Synthesis — proposed vocab additions

### To slot_synonyms (extends §11 — needs Bean approval)
| Proposed slot | Pattern matched | Approx canonicalisation gain |
|---|---|---:|
| `hover` (state slot) | hoverBg / hoverText / hoverBorder / hoverEffect | ~50 |
| `transition` | transitionDuration / transitionEasing / transitionDelay | ~30 |
| `animation` | sgsAnimation / sgsAnimationDuration / sgsAnimationEasing / staggerDelay | ~35 |
| `subHeadline` (alias of `subheading`) | subHeadline + variants in sgs/hero | 15 |
| `secondaryCta` | mobile-nav secondary CTA attrs | ~5 |
| `column` (alias `columns`) | layout primitive | ~33 |
| `padding` / `margin` / `gap` / `width` | layout primitives | ~70 |

### To property_suffixes (safe additions, no §11 impact)
| Suffix | Role | Reasoning |
|---|---|---|
| `Image` | image-object | backgroundImage / backgroundImageOpacity (~6 rows, B5 flagged) |
| `Video` | image-object | backgroundVideo / bgVideo (~3 rows, B5 flagged) |
| `Effect` / `Scale` / `Shadow` / `ImageZoom` / `Grayscale` | select-from-enum | hoverEffect/hoverScale/hoverShadow/hoverImageZoom/hoverGrayscale (~30 rows) |

### To modifier_suffixes
| Suffix | Kind | Reasoning |
|---|---|---|
| `Effect` | variant | Used in hoverEffect, transitionEffect patterns |

## Expected impact (estimate)
- Gap queue: ~942 → ~720 (−220 if all applied)
- Canonicalised: 309 → ~520 (+210)

## What was NOT proposed
- Form-field instance-data (fieldName/conditionalValue/etc.) — already flagged in Phase 3.8 (96 rows)
- `min` / `max` standalone stems — left in B5 Bucket 3 for operator review