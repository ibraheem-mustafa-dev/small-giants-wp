---
verdict: FAIL
fonts_loaded: true
viewports_tested: [375, 1440]
date: 2026-05-05T21:33:28.488Z
mockup_url: http://localhost:8765/index.html
sgs_url: https://sandybrown-nightingale-600381.hostingersite.com/?page_id=29
---

# Parity validator report

## Summary
- Total fingerprints checked: 7
- Total properties compared: 658
- Deltas exceeding threshold: 36
  - Major: 6
  - Important: 10
  - Minor: 20

> ⚠ 5 deltas flagged `requires_screenshot_review`. Per Section Q, classifier MUST attach a side-by-side screenshot via `node scripts/screenshot-diff-helper.js` before reducing severity. No screenshot, severity stays.

## Font loading
### 375px
- Mockup: 4/24 loaded, 0 failed, 20 lazy/unused
- SGS: 2/6 loaded, 0 failed, 4 lazy/unused
### 1440px
- Mockup: 4/24 loaded, 0 failed, 20 lazy/unused
- SGS: 2/6 loaded, 0 failed, 4 lazy/unused

## Deltas by viewport

### 375px

| Selector (SGS) | Property | Mockup | SGS | Δ | Severity | Screenshot review required |
|---|---|---|---|---|---|---|
| `section.sgs-hero` | fontSize | 16px | 18px | 2px (12.5%) | Important | no |
| `section.sgs-hero` | lineHeight | 25.6px | 30.6px | 5px (19.53%) | Important | no |
| `section.sgs-hero` | display | block | grid | — | Minor | yes |
| `section.sgs-hero` | gap | normal | 0px | — | Minor | no |
| `section.sgs-hero` | alignItems | normal | center | — | Minor | no |
| `section.sgs-hero` | gridTemplateColumns | none | 375px | — | Minor | no |
| `.sgs-hero__headline` | letterSpacing | -0.5px | normal | — | Minor | no |
| `.sgs-hero__subheadline` | maxWidth | none | 420px | — | Minor | no |
| `.sgs-hero__label` | width | 335px | 202.969px | -132.03px (39.41%) | Major | no |
| `.sgs-hero__content` | fontSize | 16px | 18px | 2px (12.5%) | Important | no |
| `.sgs-hero__content` | lineHeight | 25.6px | 30.6px | 5px (19.53%) | Important | no |
| `.sgs-hero__content` | backgroundColor | rgb(245,194,200) | rgba(0,0,0,0) | — | Major | yes |
| `.sgs-hero__content` | display | block | flex | — | Minor | yes |
| `.sgs-hero__content` | flexDirection | row | column | — | Minor | no |
| `.sgs-hero__content` | justifyContent | normal | center | — | Minor | no |
| `.sgs-hero__content` | alignItems | normal | flex-start | — | Minor | no |
| `.sgs-button.is-style-primary` | display | flex | inline-flex | — | Minor | no |
| `.sgs-button.is-style-secondary` | display | flex | inline-flex | — | Minor | no |

### 1440px

| Selector (SGS) | Property | Mockup | SGS | Δ | Severity | Screenshot review required |
|---|---|---|---|---|---|---|
| `section.sgs-hero` | fontSize | 16px | 18px | 2px (12.5%) | Important | no |
| `section.sgs-hero` | lineHeight | 25.6px | 30.6px | 5px (19.53%) | Important | no |
| `section.sgs-hero` | display | block | grid | — | Minor | yes |
| `section.sgs-hero` | gap | normal | 0px | — | Minor | no |
| `section.sgs-hero` | alignItems | normal | center | — | Minor | no |
| `section.sgs-hero` | gridTemplateColumns | none | 720px 720px | — | Minor | no |
| `.sgs-hero__headline` | lineHeight | 59.8px | 62.4px | 2.6px (4.35%) | Important | no |
| `.sgs-hero__headline` | letterSpacing | -1px | normal | — | Minor | no |
| `.sgs-hero__headline` | height | 119.594px | 124.781px | 5.19px (4.34%) | Important | no |
| `.sgs-hero__label` | width | 592px | 202.969px | -389.03px (65.71%) | Major | no |
| `.sgs-hero__content` | fontSize | 16px | 18px | 2px (12.5%) | Important | no |
| `.sgs-hero__content` | lineHeight | 25.6px | 30.6px | 5px (19.53%) | Important | no |
| `.sgs-hero__content` | width | 720px | 592px | -128px (17.78%) | Major | no |
| `.sgs-hero__content` | height | 720px | 339.094px | -380.91px (52.9%) | Major | no |
| `.sgs-hero__content` | backgroundColor | rgb(245,194,200) | rgba(0,0,0,0) | — | Major | yes |
| `.sgs-hero__content` | alignItems | normal | flex-start | — | Minor | no |
| `.sgs-button.is-style-primary` | display | flex | inline-flex | — | Minor | no |
| `.sgs-button.is-style-secondary` | display | flex | inline-flex | — | Minor | no |

verdict: FAIL
