---
verdict: FAIL
fonts_loaded: true
viewports_tested: [375, 1440]
date: 2026-05-04T23:20:49.732Z
mockup_url: http://localhost:8765/index.html
sgs_url: https://sandybrown-nightingale-600381.hostingersite.com/?page_id=29&fresh=1777936841
---

# Parity validator report

## Summary
- Total fingerprints checked: 7
- Total properties compared: 560
- Deltas exceeding threshold: 58
  - Major: 30
  - Important: 4
  - Minor: 24

## Font loading
### 375px
- Mockup: 4/24 loaded, 0 failed, 20 lazy/unused
- SGS: 2/6 loaded, 0 failed, 4 lazy/unused
### 1440px
- Mockup: 4/24 loaded, 0 failed, 20 lazy/unused
- SGS: 2/6 loaded, 0 failed, 4 lazy/unused

## Deltas by viewport

### 375px

| Selector (SGS) | Property | Mockup | SGS | Δ | Severity |
|---|---|---|---|---|---|
| `section.sgs-hero` | fontSize | 16px | 14.0015px | -2px (12.49%) | Minor |
| `section.sgs-hero` | lineHeight | 25.6px | 23.1024px | -2.5px (9.76%) | Important |
| `section.sgs-hero` | height | 780.344px | 885.312px | 104.97px (13.45%) | Major |
| `section.sgs-hero` | minHeight | 0px | 520px | 520px (52000%) | Major |
| `section.sgs-hero` | paddingTop | 0px | 36px | 36px (3600%) | Major |
| `section.sgs-hero` | paddingRight | 0px | 16px | 16px (1600%) | Major |
| `section.sgs-hero` | paddingBottom | 0px | 36px | 36px (3600%) | Major |
| `section.sgs-hero` | paddingLeft | 0px | 16px | 16px (1600%) | Major |
| `section.sgs-hero` | marginRight | 0px | -24px | -24px (2400%) | Major |
| `section.sgs-hero` | marginLeft | 0px | -24px | -24px (2400%) | Major |
| `section.sgs-hero` | display | block | grid | — | Minor |
| `section.sgs-hero` | gap | normal | 0px | — | Minor |
| `section.sgs-hero` | alignItems | normal | center | — | Minor |
| `section.sgs-hero` | gridTemplateColumns | none | 343px | — | Minor |
| `.sgs-hero__headline` | letterSpacing | -0.5px | -0.748px | -0.25px (24.8%) | Minor |
| `.sgs-hero__headline` | width | 335px | 303px | -32px (9.55%) | Major |
| `.sgs-hero__subheadline` | fontSize | 16px | 18px | 2px (12.5%) | Important |
| `.sgs-hero__subheadline` | lineHeight | 26.4px | 29.7px | 3.3px (12.5%) | Important |
| `.sgs-hero__subheadline` | width | 335px | 303px | -32px (9.55%) | Major |
| `.sgs-hero__subheadline` | height | 105.562px | 148.516px | 42.95px (40.69%) | Major |
| `.sgs-hero__subheadline` | maxWidth | none | 420px | — | Minor |
| `.sgs-hero__label` | width | 335px | 202.969px | -132.03px (39.41%) | Major |
| `.sgs-hero__content` | fontSize | 16px | 14.0015px | -2px (12.49%) | Minor |
| `.sgs-hero__content` | lineHeight | 25.6px | 23.1024px | -2.5px (9.76%) | Important |
| `.sgs-hero__content` | width | 375px | 303px | -72px (19.2%) | Major |
| `.sgs-hero__content` | height | 440.344px | 405.312px | -35.03px (7.96%) | Major |
| `.sgs-hero__content` | backgroundColor | rgb(245,194,200) | rgba(0,0,0,0) | — | Major |
| `.sgs-hero__content` | display | block | flex | — | Minor |
| `.sgs-hero__content` | flexDirection | row | column | — | Minor |
| `.sgs-hero__content` | justifyContent | normal | center | — | Minor |
| `.sgs-hero__content` | alignItems | normal | flex-start | — | Minor |
| `.sgs-button.is-style-primary` | width | 335px | 150.844px | -184.16px (54.97%) | Major |
| `.sgs-button.is-style-primary` | display | flex | inline-flex | — | Minor |
| `.sgs-button.is-style-secondary` | width | 335px | 136.141px | -198.86px (59.36%) | Major |
| `.sgs-button.is-style-secondary` | display | flex | inline-flex | — | Minor |

### 1440px

| Selector (SGS) | Property | Mockup | SGS | Δ | Severity |
|---|---|---|---|---|---|
| `section.sgs-hero` | lineHeight | 25.6px | 26.4px | 0.8px (3.12%) | Minor |
| `section.sgs-hero` | height | 720px | 776px | 56px (7.78%) | Major |
| `section.sgs-hero` | minHeight | 0px | 520px | 520px (52000%) | Major |
| `section.sgs-hero` | paddingTop | 0px | 36px | 36px (3600%) | Major |
| `section.sgs-hero` | paddingRight | 0px | 16px | 16px (1600%) | Major |
| `section.sgs-hero` | paddingBottom | 0px | 36px | 36px (3600%) | Major |
| `section.sgs-hero` | paddingLeft | 0px | 16px | 16px (1600%) | Major |
| `section.sgs-hero` | marginRight | 0px | -24px | -24px (2400%) | Major |
| `section.sgs-hero` | marginLeft | 0px | -24px | -24px (2400%) | Major |
| `section.sgs-hero` | display | block | grid | — | Minor |
| `section.sgs-hero` | gap | normal | 0px | — | Minor |
| `section.sgs-hero` | alignItems | normal | center | — | Minor |
| `section.sgs-hero` | gridTemplateColumns | none | 704px 704px | — | Minor |
| `.sgs-hero__headline` | letterSpacing | -1px | -1.144px | -0.14px (14.4%) | Minor |
| `.sgs-hero__headline` | width | 592px | 576px | -16px (2.7%) | Major |
| `.sgs-hero__label` | width | 592px | 202.969px | -389.03px (65.71%) | Major |
| `.sgs-hero__content` | lineHeight | 25.6px | 26.4px | 0.8px (3.12%) | Minor |
| `.sgs-hero__content` | width | 720px | 576px | -144px (20%) | Major |
| `.sgs-hero__content` | height | 720px | 389.906px | -330.09px (45.85%) | Major |
| `.sgs-hero__content` | backgroundColor | rgb(245,194,200) | rgba(0,0,0,0) | — | Major |
| `.sgs-hero__content` | alignItems | normal | flex-start | — | Minor |
| `.sgs-button.is-style-primary` | display | flex | inline-flex | — | Minor |
| `.sgs-button.is-style-secondary` | display | flex | inline-flex | — | Minor |

verdict: FAIL
