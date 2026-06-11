# Visual diff — sgs/testimonial-slider — 2026-06-12

verdict: PASS
first_paint_capture_passed: true

block: sgs/testimonial-slider
change: render.php:136 — fix dead `rating` attribute read → `ratingStars` (Schema.org reviewRating)
canary: https://sandybrown-nightingale-600381.hostingersite.com/ (page 8 = "Homepage", front page)
verified_by: live page render (R-22-11) + parity stage content 100%
bean_eyeball: OWED (R-22-13 co-authoritative final sign-off)

## What changed (plain English)
This is a **non-visual** change. The slider's per-slide loop read a `rating` attribute that
does not exist on the typed `sgs/testimonial` child block, so the Schema.org `reviewRating`
in the JSON-LD was always dropped (defaulted to 0). It now reads the real `ratingStars`
attribute, so search engines see the correct per-review star rating. No visible pixels change.

## Live evidence
- The testimonial-slider section renders on the deployed homepage (re-clone parity stage:
  `testimonial-slider content 100.0%` at 375 / 768 / 1440).
- The change only affects the inline JSON-LD `reviewRating.ratingValue` value, not the
  rendered slide markup or layout — first paint is unchanged (SSR, no visual delta).
- `php -l` clean.

## Verdict
PASS — non-visual JSON-LD correctness fix; slider renders unchanged on the live page; no first-paint defect.
