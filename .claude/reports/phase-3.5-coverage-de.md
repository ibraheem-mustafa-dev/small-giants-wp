# Phase 3.5 Coverage — Methods D + E (theme.json + block.json supports)

**Date:** 2026-05-12. **Method:** Live theme.json + 67 block.json parse, deduped against live `property_suffixes` (58 rows post-B4 cleanup).

## Method D — theme.json vocabulary

| Settings path | Suggested suffix | CSS property | Recommended role | Already in vocab? |
|---|---|---|---|---|
| `settings.color.palette` | `Color` | color (preset) | colour-text | yes |
| `settings.color.gradients` | `Gradient` | background-image | colour-gradient | **no** |
| `settings.typography.fontSizes` | `FontSize` | font-size | font-size-preset | yes |
| `settings.typography.fontFamilies` | `FontFamily` | font-family | font-family-preset | yes |
| `settings.spacing.spacingSizes` | `Spacing` | padding/margin/gap (preset) | spacing-token | **no** |
| `settings.spacing.padding` | `Padding` | padding | spacing-token | yes |
| `settings.spacing.margin` | `Margin` | margin | spacing-token | yes |
| `settings.spacing.blockGap` | `BlockGap` | gap | spacing-token | **no** |
| `settings.shadow` | `Shadow` | box-shadow | shadow-preset | yes |
| `settings.layout.contentSize` | `ContentSize` | max-width (content) | number-css-px | **no** |
| `settings.layout.wideSize` | `WideSize` | max-width (wide) | number-css-px | **no** |

## Method E — block.json `supports` usage

Scanned 65 block.json files.

| Supports key | Suffix this maps to | Blocks using it | Already in vocab? |
|---|---|---:|---|
| `color.background` | `BackgroundColor` | 40 | yes |
| `spacing.padding` | `Padding` | 38 | yes |
| `spacing.margin` | `Margin` | 37 | yes |
| `color.text` | `TextColor` | 36 | yes |
| `typography.fontSize` | `FontSize` | 23 | yes |
| `typography.lineHeight` | `LineHeight` | 19 | yes |
| `typography.textAlign` | `TextAlign` | 17 | yes |
| `typography.letterSpacing` | `LetterSpacing` | 10 | yes |
| `typography.textTransform` | `TextTransform` | 10 | yes |
| `typography.fontWeight` | `FontWeight` | 10 | yes |
| `typography.fontStyle` | `FontStyle` | 10 | **no** |
| `color.link` | `LinkColor` | 8 | **no** |
| `shadow` | `Shadow` | 5 | yes |
| `spacing.blockGap` | `BlockGap` | 4 | **no** |
| `typography.fontFamily` | `FontFamily` | 1 | yes |

## Synthesis — new property_suffixes proposed (after dedupe against 58-row live vocab)

| Suffix | Role | CSS property |
|---|---|---|
| `BlockGap` | (needs role) | (see context) |
| `BlockGap` | spacing-token | gap |
| `ContentSize` | number-css-px | max-width (content) |
| `FontStyle` | (needs role) | (see context) |
| `Gradient` | colour-gradient | background-image |
| `LinkColor` | (needs role) | (see context) |
| `Spacing` | spacing-token | padding/margin/gap (preset) |
| `WideSize` | number-css-px | max-width (wide) |

## Notes
- D + E sources are WP-canonical concepts — the lowest-risk vocab additions (no §11 implication).
- Method D paths that already exist as compounds (e.g. `BorderColor`, `BorderRadius`) confirm the existing vocab matches WP-native usage.
- `Spacing`, `Padding`, `Margin`, `BlockGap` standalone forms would canonicalise blocks that use theme.json spacing presets directly (vs. compound TopBottomLeftRight forms).
- `Gradient`, `Duotone` are theme.json features not yet exposed in block-level vocab.