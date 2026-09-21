# Visual diff — `sgs/google-reviews` — 2026-09-21 (written reviews, placeholder gating, real editor canvas, slider default)

```
verdict: PASS
intent_capture_passed: true
source_sha: 480e4757ea01a205
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

## Real block editor, slider default and empty state (deploy of this change, Eye Care test site, probe page 47)

Intent: selecting any variant in the block editor shows the real block (not a stand-in); the slider variant no longer crashes; the default display type is
slider; a rating of 0.0 is never printed; a block with nothing to show says so in the editor and emits nothing on the front end.

Measured in a real Chromium editor session (WordPress 7.1, logged in, block selected via the block-editor store), console errors captured:

| Block on the probe page | Canvas result |
|---|---|
| sample reviews, grid | one short notice ("Sample reviews: these are invented examples. Replace them with real reviews before the page goes live."), then the real cards (Aisha Khan, James Wright, Sarah Patel), aggregate "5.0 3 reviews", Google mark; no console errors |
| sample reviews, slider | same, as a slider with arrows and dots; no `React error #130` (it crashed before) |
| written reviews, slider | real cards, "4.5 2 reviews" (mean of the two rated reviews, derived, no schema); no errors |
| no data (auto, no reviews, no place ID) | editor-only information notice listing the ways to add reviews; front end emits 0 bytes (before: a stray 222-byte `<style>` from the shared hover filter, which is why the notice never showed) |
| `sgs/gallery` (same crash class, unprefixed `ToolsPanel`) | selects cleanly, no errors |

Cause of the crash: `ToolsPanel` imported by its unprefixed name is undefined in this WordPress (only `__experimentalToolsPanel` exists), so the Slider Settings panel threw as soon as the block was selected. Both `sgs/google-reviews` and `sgs/gallery` did this; the build gate now fails on any direct import of an aliased primitive.

Front end (page 11, real homepage, cache cleared): the reviews block carries `sgs-google-reviews--slider` (the new default), the header reads "13 reviews" with no "0.0", 13 real cards, 0 broken images.

Captures for the eye (R-31-13; PNGs gitignored, kept locally): `v8_selected-1.png` (sample slider in the editor), `v8_selected-3.png`.

Not verified: the editor with a real Google place ID (live fetch was tested through a stub only).

## Reviews card converted as ONE block (deploy of this change, Eye Care test site page 11, real browser)

This change is converter and metadata only: `block.json` gains `scalarContentLift`, an item-role declaration for `avatarColour` and a comment; no attribute, default or render path
changed. Front end measured after the change on the real homepage (cache cleared): the whole bordered card is one `sgs/google-reviews` block (slider variant) carrying `averageRating` 4.7,
`reviewCount` 15, `reviewRequestUrl`, the card's own border and 12px radius, and 13 reviews each with `rating` 5 and a coloured initial (11 distinct colours); 0 broken images; no "0.0"
aggregate. The editor cases measured earlier the same day are unaffected (no editor code changed).

Not faithful yet, stated plainly: the draft's gold stars (#FBBC04) render taupe, the "Write a review" pill renders black, the card is flush to its border with truncated text, and
"See all reviews", the "Google Reviews" caption, the footnote and the scrollbar are absent. Each dropped declaration is now a reported skip row (13 on this card) instead of silent; carrying them needs the
converter to route inline styles by the attribute's `derived_selector` (a shared-mechanism change awaiting approval) plus new block attributes for the review-card box, avatar size, star size and pill radius.
