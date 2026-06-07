---
block: product-card
date: 2026-06-07
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/product-card parking quick-task fix — 2026-06-07

**Change:** Cosmetic polish (P-PRODUCT-CARD-COSMETIC-POLISH): priceNote 13px→14px; typed cards with no image hide the empty <img> (bound mode already had the SVG placeholder). Editor + frontend render unaffected otherwise; back-compat preserved.

**Verification:** `npm run build` clean; `php -l` clean. Part of the parking staleness-sweep quick-task wave.

first_paint_capture_passed: true


## 2026-06-07 PM — 'Bound mode' renamed to 'live product data'
**Change:** the configurator's live-data modes (sourceMode wc-product/sgs-cpt) were confusingly labelled 'Bound mode' (same word as the purged clone cheat). Renamed the CSS class `product-card--bound` -> `product-card--live` (47 occurrences across style.css + view.js + render.php emit) + prose labels; sourceMode VALUES unchanged. **Live-verified** on the configurator (/sgs-configurator-test-540/): `product-card--live` x36, `product-card--bound` 0, 16 radios render, `price--from` present, 0 PHP errors. Class emit now matches CSS selectors. verdict: PASS.