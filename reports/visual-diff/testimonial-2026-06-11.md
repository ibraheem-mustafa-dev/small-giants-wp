# Visual diff — sgs/testimonial — 2026-06-11

verdict: PASS
first_paint_capture_passed: true

block: sgs/testimonial
change: D8 — typed-attr, variant-driven rebuild (7 variants) + deprecated.js v8 migration
canary: https://sandybrown-nightingale-600381.hostingersite.com (page 8 = mockup homepage, 3 live testimonials)
verified_by: live editor migration round-trip + frontend render + block-renderer per-variant
bean_eyeball: OWED (R-22-13)

## What changed (plain English)
Rebuilt testimonial from an InnerBlocks composite into a typed-attr, variant-driven block
(like hero variants). 7 layout/style variants clients pick by brand/industry/content:
classic-card, pull-quote-editorial, rating-led, avatar-spotlight, corporate-logo,
case-study-media, minimal-quote. Rich optional field set (quote, summary phrase, name,
role, org, avatar, org logo, work image/video, star rating OR /10 scale, date, verified,
source) — every field gated (empty = no node, no empty boxes; rating fully optional).
Visual thumbnail variant picker. Per-element typography controls (legit — block renders its
own text, D192 carve-in). save.js → null (dynamic); deprecated.js v8 migrates legacy posts.

## Migration verification (the high-risk piece — page 8 has 3 live testimonials)
Page 8's testimonials were the FR-22-6 InnerBlocks shape (star-rating + text-quote +
text-name children, no BEM classNames). Deployed the rebuild + v8 deprecation, opened
page 8 in the editor:
- All 3 testimonials migrated **valid: true**; ZERO invalid blocks on the whole page.
- Hoist correct: quote + reviewerName populated from the child text blocks (positional);
  ratingStars=5 + showRating=true from the star-rating child; innerCount=0 (children dropped);
  variant=classic-card.
- Saved the page → frontend renders all 3 with their quotes under .sgs-testimonial--classic-card.
- Full round-trip proven: old InnerBlocks → editor auto-migrate → save → frontend typed render.

## Variant verification (block-renderer REST)
All 7 variants render with the correct `sgs-testimonial--{variant}` wrapper class + the
quote, no errors. (Length varies by variant — rating-bearing variants emit star SVGs;
minimal-quote/case-study are leaner by design.)

## Build gates
0 net-new dead controls (every typed attr consumed in render.php); 0 net-new F3; php -l clean.
/sgs-update: +27 testimonial attr rows registered, block reference regenerated, container-mirror
intact (content kind). first_paint_capture_passed: true.

## Deferred (cloning thread, not blocking the block)
Converter routing of draft __quote/__author/__stars etc. onto the typed attrs + FR-22-20
variant auto-detection (testimonial = 2nd variant block onboarded). Block is fully functional
standalone without it.

## verdict
PASS — typed variant rebuild live-verified; legacy posts migrate cleanly (page 8 round-trip);
7 variants render. Bean R-22-13 eyeball owed.

## Cleanup pass (2026-06-11): render-without-control closed
Wired hoverScale (SelectControl: subtle/small/medium/large) + hoverShadow (SelectControl: sm/md/lg/glow) into the Hover states panel — render.php already consumed them; the control gap is closed. Live editor: both controls present. verdict: PASS.
