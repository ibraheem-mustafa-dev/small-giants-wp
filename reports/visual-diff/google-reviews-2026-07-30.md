---
doc_type: reference
title: "Visual-diff report — sgs/google-reviews per-row breakdown-percentage no-inline migration"
block: sgs/google-reviews
date: 2026-07-30
wave: "FR-32-4 (D345) no-inline rollout — remaining sites batch"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/google-reviews — `--sgs-gr-pct` — VERIFIED LIVE ON A NEW CANARY INSTANCE

**Verdict: PASS.** A new canary page (`sgs-gate-canary-2`, page ID 2071) was built with a
`sgs/google-reviews` instance carrying `variant:"grid"` (neither `badge` nor
`floating-badge`) and `showBreakdown:true`. With no `placeId` configured the block falls back
to its built-in dummy-review dataset (5 five-star reviews — see render.php's `$dummy_reviews`
fallback), so the breakdown section renders all 5 star-rating rows. Captured live via
Playwright at 1440px and 375px: no `style` attribute, correct computed value.

## What changed
`plugins/sgs-blocks/src/blocks/google-reviews/render.php` (inside the star-count loop):
```php
// Before
<?php $gr_pct = $gr_total > 0 ? round( ( $gr_count / $gr_total ) * 100 ) : 0; ?>
...
<span class="sgs-google-reviews__breakdown-fill" style="--sgs-gr-pct:<?php echo esc_attr( $sgs_css_length( $gr_pct ) ); ?>%"></span>

// After
$gr_pct = $gr_total > 0 ? round( ( $gr_count / $gr_total ) * 100 ) : 0;
++$gr_star_position;
$gr_responsive_css .= $gr_root_sel . ' .sgs-google-reviews__breakdown-row:nth-child(' . $gr_star_position . ') .sgs-google-reviews__breakdown-fill{--sgs-gr-pct:' . $sgs_css_length( $gr_pct ) . '%;}';
...
<span class="sgs-google-reviews__breakdown-fill"></span>
```
`$gr_pct` varies per star-count row (5 rows, one per star rating), so it's routed to a
`:nth-child(N)` scoped rule (same pattern as the other per-item migrations this wave), keyed
off a dedicated `$gr_star_position` counter incremented once per row — every row always
renders (`foreach` over all 5 star tiers unconditionally), so the position is stable.

## Canary instance
`https://sandybrown-nightingale-600381.hostingersite.com/sgs-gate-canary-2/` (page ID 2071),
block markup:
```
<!-- wp:sgs/google-reviews {"variant":"grid","showBreakdown":true,…} /-->
```

## Evidence
- **Element found live:** all 5 `.sgs-google-reviews__breakdown-row` /
  `.sgs-google-reviews__breakdown-fill` pairs render (dummy dataset is 5 five-star reviews, so
  the 5-star row is 100%, the rest 0%).
- **No-inline contract holds:** `element.getAttribute('style')` === `null` on row 1's fill at
  both 1440px and 375px.
- **Computed value correct:** `getComputedStyle(el).getPropertyValue('--sgs-gr-pct')` ===
  `"100%"` (row 1 = 5-star row, 5/5 dummy reviews are 5-star) at both viewports.
- **CSS lands in the LIFTED stylesheet, not inline `<style>` on the page** — fetched
  `wp-content/uploads/sgs-css/sgs-1003-175717f0a7396f78658cc3d7873ff1fd.css` and confirmed:
  ```css
  .sgs-gr-906bd4f8.wp-block-sgs-google-reviews .sgs-google-reviews__breakdown-row:nth-child(1) .sgs-google-reviews__breakdown-fill{--sgs-gr-pct:100%;}
  ```
- **Method + tooling:** `plugins/sgs-blocks/scripts/gate-canary-2-capture.mjs` (Playwright,
  run via `node`, chromium headless).

```json
{
  "block": "google-reviews",
  "selector": ".sgs-google-reviews__breakdown-row:nth-child(1) .sgs-google-reviews__breakdown-fill",
  "prop": "--sgs-gr-pct",
  "viewport": "1440",
  "found": true,
  "styleAttr": null,
  "computedValue": "100%"
}
```
(identical result at `"viewport": "375"`.)
