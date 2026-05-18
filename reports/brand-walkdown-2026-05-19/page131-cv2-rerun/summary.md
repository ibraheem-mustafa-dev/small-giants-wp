# Per-section pixel-diff summary — page 131 CV2 rerun (2026-05-19)

- Mockup: file:///C:/.../mockups/homepage/index.html
- SGS: https://sandybrown-nightingale-600381.hostingersite.com/cv2-output-mamas-munches/

| section | 1440x900 | 768x1024 | 375x812 | worst |
|---|---|---|---|---|
| sgs-footer | 98.56% | 98.73% | 96.18% | 98.73% (768x1024) |
| sgs-hero | 66.85% | 83.50% | 74.70% | 83.50% (768x1024) |
| sgs-social-proof | 56.77% | 74.49% | 82.33% | 82.33% (375x812) |
| sgs-featured-product | 68.28% | 58.56% | 77.59% | 77.59% (375x812) |
| sgs-brand | 43.73% | 47.52% | 56.32% | 56.32% (375x812) |
| sgs-header | 30.95% | 46.62% | 55.04% | 55.04% (375x812) |
| sgs-gift-section | 47.32% | 45.28% | 51.55% | 51.55% (375x812) |
| sgs-ingredients-section | 51.23% | 43.94% | 49.51% | 51.23% (1440x900) |
| sgs-trust-bar | 32.47% | 24.21% | 32.52% | 32.52% (375x812) |

## Top-5 hypotheses (worst-viewport)

1. **sgs-footer — 98.73% (768)**: `.sgs-footer` selector on the live page is matching the wrong element — the SGS capture shows the WP admin/PHP-Notice banner (`Function WP_Font_Collection::sanitize_and_validate_data was called incorrectly...`) at top + page header chrome, not the footer. Cause class: **Section-content missing / wrong selector match (likely PHP fatal/notice pushing the footer below viewport, or footer block not rendered)**.
2. **sgs-hero — 83.50% (768)**: Headline content bug (`the mumwho needs it most`, missing space); eyebrow weight + tracking different; CTA buttons absent on SGS; pink card width wider. Cause class: **Section-content missing / extra (CTAs) + Typography**.
3. **sgs-social-proof — 82.33% (375)**: SGS renders as carousel (single card + nav arrows + dots + scroll-to-top FAB intruding); mockup is stacked card list with section heading. Cause class: **Layout (variant: carousel vs stacked list) + Section-content missing (heading)**.
4. **sgs-featured-product — 77.59% (375)**: Mockup has product image + variant selector + price + CTA inside card; SGS shows two cards stacked vertically with images on top instead of the side-by-side product layout. Cause class: **Layout (grid template / card variant)**.
5. **sgs-brand — 56.32% (375)**: SGS has a large stacked image-pair + dark CTA button; mockup has a softer single-image card layout with quote attribution; image positioning and CTA styling differ. Cause class: **Image positioning / object-fit + Layout**.

Honourable mentions (also high):

- **sgs-header — 55.04% (375)**: Live header is replaced by a giant PHP Notice banner spanning the full width. **All other section diffs are inflated by the resulting vertical shift.** Cause class: **Section-content extra (PHP debug output) — fix this first**.
- **sgs-gift-section — 51.55% (375)**: SGS gift cards missing badge, description, price and CTA — only star icon + title rendered. Plus a misencoded promo bar (`ƒÄë New product launch ÖÇö...`) showing UTF-8 mojibake. Cause class: **Section-content missing + Encoding bug**.
- **sgs-ingredients-section — 51.23% (1440)**: SGS missing eyebrow + headline + intro paragraph; SGS lays cards as 2x2, mockup is 1x4; card heading colours pink (SGS) vs dark (mockup). Cause class: **Section-content missing + Layout (grid columns) + Typography (colour)**.

## Passing / near-passing sections

None below 10%. Lowest is **sgs-trust-bar 24.21% (768)** — still a FAIL but the closest. Its issues are doubled labels (icon caption + duplicate text) and missing icon SVGs; structurally aligned.

## Notes

- **Blocking environmental defect:** the live page has a WordPress PHP `Notice` ("Function WP_Font_Collection::sanitize_and_validate_data was called incorrectly... font collection sgs-google-fonts has missing or empty property: font_families") rendered above `<header>`. The notice banner is ~50-80px tall at desktop, full-width, and shifts every section below it. This single defect inflates every diff in this run. Fix the `WP_DEBUG_DISPLAY` / font-collection registration before re-running — expect 15-40 pct-point reductions on most sections once the chrome is clean.
- **UTF-8 encoding bug** visible in gift-section promo bar (`ƒÄë ... ÖÇö`) — looks like CP-1252-as-UTF-8 mojibake of an em-dash + emoji. Likely in a localised string fed to the block via the converter.
- **Selector caveat:** `.sgs-footer` apparently matched but the cropped capture shows top-of-page chrome on the SGS side. Worth re-checking whether the footer block actually emits `.sgs-footer` on the rendered DOM, or if Playwright is grabbing the first element with that class (which could be a `<body class="...">` ancestor or a stray utility class).
- **Yesterday's deltas not available in this session** — no prior run-dir to compare against numerically. Subjectively, the footer 98% looks like a new regression (selector match failure) rather than a real layout drift.
- All 27 captures completed inside wall-time cap (≈6 minutes). Raw artefacts in `reports/brand-walkdown-2026-05-19/page131-cv2-rerun/<section>-<viewport>/` (mockup.png, sgs.png, composite.png, heatmap.png, diff.json).

## Sample diff.json (sgs-hero @ 1440x900) keys

```
{
  "mockup_url": "file:///C:/Users/Bean/Projects/small-giants-wp/sites/mamas-munches/mockups/homepage/index.html",
  "sgs_url": "https://sandybrown-nightingale-600381.hostingersite.com/cv2-output-mamas-munches/",
  "viewport": "1440x900",
  "mockup_dimensions": [
    1440,
    720
  ],
  "sgs_dimensions": [
    1408,
    761
  ],
  "aligned_dimensions": [
    1440,
    631
  ],
  "mismatched_pixels": 607395,
  "total_pixels": 908640,
  "mismatch_percent": 66.8466,
  "threshold_percent": 1.0,
  "verdict": "FAIL",
  "captured_at": "2026-05-17T10:52:00.836617+00:00"
}
```