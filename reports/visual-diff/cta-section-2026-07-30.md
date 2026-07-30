---
doc_type: reference
title: "Visual-diff report — sgs/cta-section overlay-opacity no-inline migration"
block: sgs/cta-section
date: 2026-07-30
wave: "FR-32-4 (D345) no-inline rollout — remaining sites batch"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/cta-section — `--sgs-cta-overlay-opacity` — VERIFIED LIVE ON A NEW CANARY INSTANCE

**Verdict: PASS.** A new canary page (`sgs-gate-canary-2`, page ID 2071) was built with a
`sgs/cta-section` instance carrying a real `backgroundMedia` attachment, so `$resolved_media`
is truthy and `.sgs-cta-section__overlay` renders. Captured live via Playwright at 1440px and
375px: the element carries no `style` attribute and the custom property resolves correctly
from the block's own lifted external stylesheet.

## What changed
`plugins/sgs-blocks/src/blocks/cta-section/render.php` (around the `$overlay_html` block):
```php
// Before
$overlay_html = sprintf(
    '<span class="sgs-cta-section__overlay" style="--sgs-cta-overlay-opacity:%s" aria-hidden="true"></span>',
    esc_attr( $background_image_opacity / 100 )
);

// After
$responsive_css .= $root_sel . ' .sgs-cta-section__overlay{--sgs-cta-overlay-opacity:' . esc_attr( $background_image_opacity / 100 ) . ';}';
$overlay_html    = '<span class="sgs-cta-section__overlay" aria-hidden="true"></span>';
```
The overlay is a singleton per instance, so it takes the plain root-scoped rule shape (not
`:nth-child(N)`), printed into `$responsive_css` which flows into the block's existing scoped
`<style>` tag.

## Canary instance
`https://sandybrown-nightingale-600381.hostingersite.com/sgs-gate-canary-2/` (page ID 2071),
block markup:
```
<!-- wp:sgs/cta-section {"backgroundMedia":{"id":1446,"url":"…/cookies-stacked-17.jpeg","type":"image","alt":"Cookies stacked"},"backgroundImageOpacity":60,…} -->
```

## Evidence
- **Element found live:** `.sgs-cta-section__overlay` present in the rendered DOM at both
  viewports (Playwright `page.locator(...).count()` === 1).
- **No-inline contract holds:** `element.getAttribute('style')` === `null` at both 1440px and
  375px.
- **Computed value correct:** `getComputedStyle(el).getPropertyValue('--sgs-cta-overlay-opacity')`
  === `"0.6"` at both viewports (60 / 100 = 0.6, matches the `backgroundImageOpacity:60` attr).
- **CSS lands in the LIFTED stylesheet, not inline `<style>` on the page** (SGS lifts block CSS
  to `wp-content/uploads/sgs-css/`, per memory `sgs-block-css-is-lifted-not-inline` — page-HTML
  grep alone proves nothing). Fetched the linked stylesheet
  (`wp-content/uploads/sgs-css/sgs-1003-175717f0a7396f78658cc3d7873ff1fd.css`) and confirmed the
  scoped rule:
  ```css
  .sgs-cta-section-a1d88e89.wp-block-sgs-cta-section .sgs-cta-section__overlay{--sgs-cta-overlay-opacity:0.6;}
  ```
- **Method + tooling:** `plugins/sgs-blocks/scripts/gate-canary-2-capture.mjs` (Playwright,
  run via `node`, chromium headless) — captures all six FR-32-4 batch targets in one pass at
  1440px + 375px; raw JSON output archived below.

```json
{
  "block": "cta-section",
  "selector": ".sgs-cta-section__overlay",
  "prop": "--sgs-cta-overlay-opacity",
  "viewport": "1440",
  "found": true,
  "styleAttr": null,
  "computedValue": "0.6"
}
```
(identical result at `"viewport": "375"`.)
