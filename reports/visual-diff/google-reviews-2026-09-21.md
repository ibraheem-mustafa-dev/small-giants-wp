# Visual diff — `sgs/google-reviews` — 2026-09-21 (written reviews / typed mode)

```
verdict: PASS
intent_capture_passed: true
source_sha: 6d2d1984e
blocks: google-reviews
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

## Not caused by this change, observed while measuring
- `assets/google-logo.svg` does not exist in the repo (`git log -- plugins/sgs-blocks/assets/google-logo.svg` is empty) and returns 404 on the canary, so every `sgs/google-reviews` block shows a broken logo image at top right (blocks 1, 2 and 3 alike). A Google logo is a brand asset; adding one needs the brand guidelines read first.
- In the synced path with no place ID or API key the block still shows three invented reviews and emits `LocalBusiness` / `AggregateRating` schema (4.9, 47 reviews) from them: visible as block 3 and its `ld+json`. Written mode does not touch this path. Gating the demo reviews behind an explicit placeholder mode is the open follow-up from the QC council.
