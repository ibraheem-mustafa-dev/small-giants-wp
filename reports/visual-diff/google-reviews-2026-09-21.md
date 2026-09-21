# Visual diff — `sgs/google-reviews` — 2026-09-21 (written reviews / typed mode)

```
verdict: PASS
intent_capture_passed: true
source_sha: f14814895
blocks: google-reviews trustpilot-reviews
target: sandybrown-nightingale-600381.hostingersite.com (probe page 3775, "[probe] google reviews written mode")
date:   2026-09-21
```

Intent: a `sgs/google-reviews` block holding written reviews (`reviews[]`, `dataSource` default `auto`) renders every
review, in the order written, through the existing variants; unrated reviews draw no stars; the free-text date and the
reviewer detail line show as typed; each initial takes its own colour; the aggregate comes from the block; and
written mode sends no review schema and no demo reviews. Data: the Eye Care draft's own 13 reviews (4 without a rating).

## What was measured (real DOM at 1440 and 375, cache-busted, after the deploy of 6d2d1984e)

| Check | Result |
|---|---|
| Cards, grid variant / slider variant | 13 and 13 at 1440 and at 375 (the first deploy showed 10: the default `maxReviews` cap dropped 3; fixed in 6d2d1984e and re-measured) |
| Order | first three authors Anonymous M., Neelum Mushtaq, Hanif Ur-Rehman (the order written) |
| Date | "2 years ago" shown as typed, not a computed relative time |
| Reviewer detail line | on all 13 cards ("Local Guide · 11 reviews · 8 photos") |
| Stars | 9 of 13 cards draw stars; the 4 unrated reviews draw none |
| Initial colours | 6 distinct computed backgrounds (rgb(26, 115, 232), rgb(232, 113, 10), rgb(161, 66, 244), rgb(52, 168, 83), rgb(217, 48, 37), rgb(0, 137, 123)), one scoped rule per card, no inline style |
| Aggregate | "4.9  15 reviews" from `averageRating` and `reviewCount` |
| Demo reviews in written blocks | none (Sarah Patel / James Wright / Aisha Khan absent) |
| Review schema | none from the written blocks: the only `ld+json` on the page is block 3's (below) |
| Existing behaviour | block 3 (`variant: list`, no reviews, no place ID) unchanged: 3 demo reviews, as before |

Captures for the eye (R-31-13; PNGs are gitignored, kept beside this file locally): `google-reviews-written-grid-1440.png`, `google-reviews-written-slider-1440.png`,
`google-reviews-written-grid-375.png`. Read by the author: grid shows 13 cards in 3 columns, coloured initials, detail line,
date, stars where rated, "4.9 15 reviews", "Write a Review"; slider shows arrows and 13 dots.

## Placeholder gating (commit f14814895), measured live on the canary after deploy

Intent: invented reviews are shown only when the author explicitly picks `dataSource: placeholder`; with no real data the front end renders nothing and no schema; review schema is printed only for live Google data.

Probe page 3775 now holds four `sgs/google-reviews` blocks (grid written, slider written, list with no reviews or place ID, list `placeholder`).

| Check | Result |
|---|---|
| Blocks in the served HTML | 3 of the 4: the no-data block renders nothing at all (no wrapper) |
| Card counts at 1440 and 375 | 13, 13 and 3 (the sample block) |
| Sample names (Sarah Patel, James Wright, Aisha Khan) | each appears once, in the explicit sample block only |
| `application/ld+json` on the page | 0 (was 1 with a 4.9 / 47 aggregate before this change) |
| Logo | the Google "G" loads in every rendered block (commit 992913c1d) |
| Sample block aggregate | "5.0, 3 reviews", its own numbers rather than an invented 4.9 / 47 |

Capture for the eye (PNG gitignored, kept locally): `google-reviews-sample-list-1440.png` shows the three sample cards with coloured initials, stars, relative dates and the Google mark. `sgs/trustpilot-reviews` changed only its schema gate (a `placeholder` source no longer prints Review schema); its markup is untouched.

Not verified: the editor canvas notices (built, not opened in a browser); the live Google path against the real API (tested through a stubbed fetch).
