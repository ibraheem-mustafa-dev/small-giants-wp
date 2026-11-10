# T12 group B: effects with no earlier fixture, run on local-sandybrown (2026-11-10)

Run by a Sonnet agent in real Chrome at 375, 768 and 1440, with reduced motion at 375 and 1440 (plus 768 for the header and transitions). Scroll was driven by CDP `Input.synthesizeScrollGesture`. Fixtures were built with `scripts/wp-build-page.js` (all `invalid: []`). Scripts and raw results are in this folder (`results/*.json`).

**Counts:** 17 work, 1 partly, 0 broken, 0 unanswered.

| Effect | Fixture page (local id) | Verdict | Evidence |
|---|---|---|---|
| Carousel loop (gallery, Google, Trustpilot, post grid) | `qa-fx-carousel-loop` 5862, `qa-fx-google-reviews` 5884, `qa-fx-trustpilot-reviews` 5888, `qa-fx-post-grid-carousel` 5892 | Works | `probe-loop-drag.mjs`: 24 children for 8 items. Scrolling to the end lands one loop-width back (gallery 375: 5865 = 8993 − 3128). The no-loop control dead-ends. `probe-wrap-seam.mjs`: the same item before and after the wrap. |
| Draggable | `qa-fx-draggable` 5866 | Works | A 360px drag moves 360px. Momentum adds +1136px (1302 at 1440, 919 at 768). With momentum off it snaps back, and the no-drag control moves 0. |
| Flip | `/shop/` product collection | Partly | `probe-flip.mjs 1440`: 4 of 5 runs show 1 or 2 frames of transform and no tween. The cards swap order between 1796 and 1876ms with no slide (`results/flip-sheet.jpg`). One run showed 57 moving frames, so it is intermittent. Cause unproven; likely `src/shared/effects/gsap/fx-flip.js` (state capture before `Flip.from`). |
| Page transitions | any page | Works | View-transition animations appear after a link click; none under reduced motion. |
| Counter count-up | `qa-fx-counter` 5869 | Works | Counts 460+ to 1,250+; a below-fold counter counts only once scrolled in; reduced motion shows the final value. |
| Countdown flip | `qa-fx-countdown` 5873 | Works | Ticks 24 to 21 in 3.2s with `--flipping`; expired message and evergreen work; reduced motion ticks without flipping. |
| Timeline connector progress | `qa-fx-timeline` 5876 | Works | `--sgs-timeline-fill-progress` 0, 0.08, 0.40, 0.72, 1 with scroll; reduced motion jumps to full. |
| Testimonial slider | `qa-fx-testimonial-slider` 5880 | Works | Autoplay and arrows advance and wrap; autoplay stops under reduced motion. |
| Google review slider | `qa-fx-google-reviews` 5884 | Works | One card per step; stops under reduced motion. Inline reviews, no API key. |
| Trustpilot review slider | `qa-fx-trustpilot-reviews` 5888 | Works | Same; 8 dots for 8 reviews. |
| Post grid carousel | `qa-fx-post-grid-carousel` 5892 | Works | Loop and drag as above; 10 dots. |
| Post grid infinite load and Load more | `qa-fx-post-grid-infinite` 5896 | Works | Infinite goes 6, then 9, then stops at 3 pages. Load more goes 3, 6, 9, and then the button is removed. |
| Header shrink | `qa-fx-header` 5908 (header built as draft `sgs_header` 5903) | Works | Height 76 to 72 to 52 with `is-header-scrolled`, `is-header-shrunk`. |
| Header hide on scroll down | same | Works | Transform `-52.96px` with `is-header-scrolling-down`. |
| Header reveal on scroll up | same | Works | Back to top 0, no transform. |
| Nav indicator | same | Works | The pill follows hover across four links and rests at 0. Not tested at 375: the fixture header has no burger. |
| Label magnet | same | Works | Up to 17.72px translate at the link edge, back to 0 on leave. |
| Anchor smooth scroll | `qa-fx-anchor` 5943 | Works, through the plugin's Lenis | `html.lenis`; the anchor eases 0 to 3327 in about 1s; reduced motion jumps. The theme's `assets/js/smooth-scroll.js` is never enqueued (Spec 38A §17). |

## Findings

1. **Flip partly works**, intermittently. See the Flip row. It belongs to the motion track (Spec 38A).
2. **Gallery carousel on tablet and phone.** In `src/blocks/gallery/style.css`, the tablet and mobile rules for `.sgs-gallery--carousel .sgs-gallery__grid` reset `grid-template-columns` but not `grid-auto-columns`. Every item after the first set therefore keeps the desktop column width (375: `375px 114.328px …`). Checked against the stylesheet by the main thread. This is not part of Spec 49.
3. **Header at rest under reduced motion** is 44px instead of 76px. Not investigated.
