---
doc_type: reference
title: "Visual-diff summary (unchanged blocks) — gridTemplateRows"
date: 2026-08-11
property: gridTemplateRows
verdict: PASS
blocks: 19
---

# Unchanged blocks — Spec 35 pass 3b — gridTemplateRows migrated to the tier-object shape

**19 block(s)** measured no rendering change for `gridTemplateRows`
(`grid-template-rows`) and needed no human explanation (or Change 2 auto-derived one).
Each has its own gate-satisfying stub at `<block>-2026-08-11.md`; this file is
where the per-block figures those stubs point to actually live, so the
evidence stays per-block even though the boilerplate does not repeat.

- **Page:** https://sandybrown-nightingale-600381.hostingersite.com/tier-fixture-gridtemplaterows/
- **Probe values set on the block:** `{"desktop": "64px", "tablet": "32px", "mobile": "8px"}`
- **Method:** Playwright (chromium), computed styles at three viewports, before
  and after deploying the change to the sandybrown canary.
- **Console errors:** 3
- **PHP diagnostics in served HTML:** none

⛔ Every selector below is scoped to that block's own anchor — see the sibling
full reports' note on why an unscoped wrapper-class query is unsafe.

### accordion

- **Selector:** `#tierfx-default-accordion > .wp-block-sgs-accordion`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `58px` | `58px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `58px` | `58px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `54px 53px` | `54px 53px` | `—` | `—` | `grid` |

### card-grid

- **Selector:** `#tierfx-default-card-grid > .wp-block-sgs-card-grid`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `326.328px` | `326.328px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `342.297px` | `342.297px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `291.469px 291.469px` | `291.469px 291.469px` | `—` | `—` | `grid` |

### container

- **Selector:** `#tierfx-default-container > .wp-block-sgs-container`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `25.5938px` | `25.5938px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `24.4219px` | `24.4219px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `22.4375px 22.4375px` | `22.4375px 22.4375px` | `—` | `—` | `grid` |

### cta-section

- **Selector:** `#tierfx-default-cta-section > .wp-block-sgs-cta-section`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `51.1875px` | `51.1875px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `48.8438px` | `48.8438px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `44.875px` | `44.875px` | `—` | `—` | `grid` |

### feature-grid

- **Selector:** `#tierfx-default-feature-grid > .wp-block-sgs-feature-grid`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `48px` | `48px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `48px` | `48px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `48px 48px` | `48px 48px` | `—` | `—` | `grid` |

### form

- **Selector:** `#tierfx-default-form > .wp-block-sgs-form`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `100.594px` | `100.594px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `99.3281px` | `99.3281px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `97.6719px` | `97.6719px` | `—` | `—` | `grid` |

### form-field-tiles

- **Selector:** `#tierfx-default-form .wp-block-sgs-form-field-tiles`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `none` | `none` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `none` | `none` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `none` | `none` | `—` | `—` | `grid` |

### gallery

- **Selector:** `#tierfx-default-gallery > .wp-block-sgs-gallery`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `none` | `none` | `387px` | `387px` | `block` |
| tablet (900px) | `tablet` | `none` | `none` | `252.062px` | `252.062px` | `block` |
| mobile (390px) | `mobile` | `none` | `none` | `227.562px` | `227.562px` | `block` |

### google-reviews

- **Selector:** `#tierfx-default-google-reviews > .wp-block-sgs-google-reviews`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `250.391px` | `250.391px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `503.984px` | `503.984px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `114px 749.391px` | `114px 749.391px` | `—` | `—` | `grid` |

### hero

- **Selector:** `#tierfx-default-hero > .wp-block-sgs-hero`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `51.1875px` | `51.1875px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `48.8438px` | `48.8438px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `296px` | `296px` | `—` | `—` | `grid` |

### multi-button

- **Selector:** `#tierfx-default-multi-button > .wp-block-sgs-multi-button`

**Auto-derived finding:** auto-derived: measured `display` is `flex` at every element and viewport captured — never `grid` or `inline-grid` — and `grid-template-rows` only takes effect under grid layout, so it cannot apply here by construction. desktop: set `64px` → outer `none`  ⚠ does NOT bind | mobile: set `8px` → outer `none`  ⚠ does NOT bind | tablet: set `32px` → outer `none`  ⚠ does NOT bind

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `none` | `none` | `—` | `—` | `flex` |
| tablet (900px) | `tablet` | `none` | `none` | `—` | `—` | `flex` |
| mobile (390px) | `mobile` | `none` | `none` | `—` | `—` | `flex` |

### post-grid

- **Selector:** `#tierfx-default-post-grid > .wp-block-sgs-post-grid`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `none` | `none` | `—` | `—` | `block` |
| tablet (900px) | `tablet` | `none` | `none` | `—` | `—` | `block` |
| mobile (390px) | `mobile` | `none` | `none` | `—` | `—` | `block` |

### pricing-table

- **Selector:** `#tierfx-default-pricing-table > .wp-block-sgs-pricing-table`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `874.703px` | `874.703px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `854.781px` | `854.781px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `68.7969px 1641.75px` | `68.7969px 1641.75px` | `—` | `—` | `grid` |

### site-footer-row

- **Selector:** `#tierfx-default-site-footer .wp-block-sgs-site-footer-row`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `none` | `none` | `25.5938px` | `25.5938px` | `block` |
| tablet (900px) | `tablet` | `none` | `none` | `24.4219px` | `24.4219px` | `block` |
| mobile (390px) | `mobile` | `none` | `none` | `22.4375px 22.4375px` | `22.4375px 22.4375px` | `block` |

### site-header-row

- **Selector:** `#tierfx-default-site-header .wp-block-sgs-site-header-row`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `none` | `none` | `25.5938px` | `25.5938px` | `block` |
| tablet (900px) | `tablet` | `none` | `none` | `24.4219px` | `24.4219px` | `block` |
| mobile (390px) | `mobile` | `none` | `none` | `22.4375px 22.4375px` | `22.4375px 22.4375px` | `block` |

### tabs

- **Selector:** `#tierfx-default-tabs > .wp-block-sgs-tabs`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `48.3906px` | `48.3906px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `48px` | `48px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `103.281px 46px` | `103.281px 46px` | `—` | `—` | `grid` |

### testimonial-slider

- **Selector:** `#tierfx-default-testimonial-slider > .wp-block-sgs-testimonial-slider`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `none` | `none` | `—` | `—` | `block` |
| tablet (900px) | `tablet` | `none` | `none` | `—` | `—` | `block` |
| mobile (390px) | `mobile` | `none` | `none` | `—` | `—` | `block` |

### trust-bar

- **Selector:** `#tierfx-default-trust-bar > .wp-block-sgs-trust-bar`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `44px` | `44px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `44px` | `44px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `44px 44px` | `44px 44px` | `—` | `—` | `grid` |

### trustpilot-reviews

- **Selector:** `#tierfx-default-trustpilot-reviews > .wp-block-sgs-trustpilot-reviews`

| Viewport | Tier that binds | before (outer) | after (outer) | before (inner band) | after (inner band) | display |
|---|---|---|---|---|---|---|
| desktop (1440px) | `desktop` | `91.5px` | `91.5px` | `—` | `—` | `grid` |
| tablet (900px) | `tablet` | `91.5px` | `91.5px` | `—` | `—` | `grid` |
| mobile (390px) | `mobile` | `117.5px 8px` | `117.5px 8px` | `—` | `—` | `grid` |

*Generated by `plugins/sgs-blocks/scripts/make-visual-diff-reports.py`. Every
figure above is read from the before/after captures, per block; none is
hand-written or copied between sections.*
