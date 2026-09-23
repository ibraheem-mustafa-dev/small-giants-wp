# Visual diff — `sgs/google-reviews` — 2026-09-23 (redesign: card, header, reviewer, text, buttons and navigation attributes; eight card looks)

```
verdict: PASS
intent_capture_passed: true
first_paint_capture_passed: true
source_sha: 9f85870a5899fcc1
blocks: google-reviews
target: darkcyan-grouse-898606.hostingersite.com (Eye Care page 11, cloned by the pipeline; probe page 47 "[probe] google-reviews editor")
date:   2026-09-23
```

Intent: the block can reproduce the Eye Care draft's Google-style reviews card from the draft alone, and offers ready-made looks.
The design is `.claude/plans/2026-09-21-google-reviews-block-design.md`. New: card box, header row, divider, logo size and
position, source caption, a second header button ("See all reviews"), avatar size and shape, star sizes, text clamp,
"read the full review" link, footnote, rail padding, scrollbar and arrow controls, 12 typography families, and the looks
`google-card`, `quote-minimal`, `boxed`, `bubble` and `wall-tile` beside `flat`, `bordered` and `elevated`. Defaults:
"Write a review" is an outlined secondary button, review text clamps at 8 lines. Every value is a scoped `<style>` rule;
none is inline.

## Frontend: the live Eye Care card against the draft (real Chromium, fresh page, 1440 and 375)

Pipeline run `pipeline-state/eye-care-ward-end-eye-care-birmingham-2026-09-23-171809`, deployed to page 11. The draft was
served from its own folder and measured the same way; elements were matched by their text (rule 4a).

| Element | Live | Draft | |
|---|---|---|---|
| "See all reviews" button | 137x40, fill `#1A73E8` (pixel-sampled), white text | 137x40, `#1A73E8`, white | match |
| "Write a review" button | 134x40, white fill, `#1A73E8` text, 1px `#DADCE0` border (pixel-sampled) | 134x40, same | match |
| "15 reviews", "Google Reviews", footnote, first author | font, size, weight and colour equal | | match |
| Stars | gold `fill rgb(251,188,4)`, 15x15 | `#FBBC04` | match |
| Card | 12px radius, padding 28/26 (1440) and 20/16 (375), border `#DADCE0`, Roboto | same | match |
| Avatar | 40x40, round | 40x40 | match |
| Review card | 340x350 (1440), 270x371 (375) | 340x344, 270x363 | 6 to 8px taller |
| Reviews | 13 cards | 13 | match |

The "See all reviews" element's own `background-color` reads teal: the button helper paints the fill on a `::after`
layer over it, and the pixels show the blue. Measured by pixel sampling, not by the computed value.

Still reported as not transferred, each with a reason (content-gaps): layout plumbing the block draws itself (display,
flex, zero margins, transitions), the rail's 16px gap, the stars' letter-spacing, and the text's `max-height` (the clamp
covers it). The header divider's `border-bottom-style` has no attribute; the block's own default is `solid`, as in the
draft.

## Editor: probe page 47, logged in, real block editor

- All five reviews blocks select with no error screen and no console error from the block.
- Styles tab: Card, Header, Reviewer, Review text and Buttons panels present; Navigation appears for the slider.
- "Card look" lists all eight looks with labels; each renders in the canvas with its class and the sample reviews.
- Display types slider, grid, list, wall and badge each re-render with no error screen and no failed canvas request
  (the canvas request is a POST, so 13 reviews stay under the request-line limit).
- A cleared border style stores `none` and the canvas request still succeeds.

Captures (PNG, gitignored, kept locally): `google-reviews-live-1440.png`, `google-reviews-draft-1440.png`,
`google-reviews-live-375.png`, `google-reviews-draft-375.png`.

## Tests and gates

PHP 47 tests (GoogleReviews, ReviewsAggregate), jest 77, converter suite 1372 passed; `audit-inline-styling --check`,
`check-hardcoded-render-defaults --check`, `audit-block-file-consistency --check` and the inspector scan all pass.

## Not verified

- Bean's eye on the live card (R-31-13).
- The looks other than the plain three on the frontend (checked in the editor canvas only).
- Dark mode.
