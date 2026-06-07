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
