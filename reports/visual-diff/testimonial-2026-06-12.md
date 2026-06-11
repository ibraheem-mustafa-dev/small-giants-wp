# Visual diff — sgs/testimonial — 2026-06-12

verdict: PASS
first_paint_capture_passed: true

block: sgs/testimonial
change: testimonial-empty cloning fix (universal DB-driven scalar-lift) + security esc_html on identity fields + star/scale clamps + Rule-4 card chrome via :where()
canary: https://sandybrown-nightingale-600381.hostingersite.com/ (page 8 = "Homepage", front page; re-cloned via /sgs-clone --converter-v2 --deploy-target page:8)
verified_by: live chrome-devtools DOM probe on the deployed canary (R-22-11) at 1440 / 768 / ~500px
bean_eyeball: OWED (R-22-13 co-authoritative final sign-off)

## What changed (plain English)
The 3 testimonial cards on the homepage were rendering EMPTY (no quote, name, or stars)
after testimonial was rebuilt into a typed block but the cloning converter kept emitting
the old child-block shape. The converter now lifts quote/name/stars from the draft into the
typed block's attrs (universal, DB-driven, opt-in gated). Plus: identity fields hardened
to esc_html, star rating clamped 0–5, and the card chrome (border/radius/padding/bg) made
faithfully transferable via :where() zero-specificity rules.

## Live evidence (deployed canary, R-22-11)

Server `do_blocks` output (REST content.rendered): 3× `sgs-testimonial__quote` with full
text, 3× `sgs-testimonial__name`, stars present.

Live DOM probe (chrome-devtools `evaluate_script`), all 3 cards, per viewport:

| Viewport | quote visible (chars) | name visible (chars) | stars (SVG, aria) | card chrome |
|---|---|---|---|---|
| 1440px | ✅ 137 / 151 / 142 | ✅ 13 / 20 / 19 | ✅ 5 SVG ea., "5 out of 5 stars" | — |
| 768px | ✅ 137 / 151 / 142 | ✅ 13 / 20 / 19 | ✅ 5 SVG ea. | — |
| ~500px (375 req, browser-clamped) | ✅ 137 / 151 / 142 | ✅ 13 / 20 / 19 | ✅ 5 SVG ea. | border 1px solid / radius 12px / padding 20px / bg #fff |

- Every quote/name element: `display` ≠ none, `visibility` = visible, bounding height > 0 at all 3 widths.
- Stars render as 5 filled SVG icons per card (innerText is 0 because they are SVGs, not glyphs) with `aria-label="5 out of 5 stars"` — `ratingStars=5` lifted correctly.
- Card chrome computed-style matches the draft (border 1px solid, radius 12px, padding 20px, white bg) — the `:where()` fix transfers it faithfully.
- first-paint: content is server-side rendered (SSR `do_blocks`), present in the initial HTML — no first-paint blank/defect.
- Screenshot: `reports/visual-diff/testimonial-live-page8-768-2026-06-12.png`

## Verdict
PASS — the testimonial-empty bug is fixed on the live homepage at all three breakpoints; quote, name, and 5-star rating all render and are visible, card chrome faithful.
