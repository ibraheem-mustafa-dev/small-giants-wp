# Visual diff — `sgs/google-reviews` — 2026-09-23 (Google design as the baseline; shared slider navigation with five placements)

```
verdict: PASS
intent_capture_passed: true
first_paint_capture_passed: true
source_sha: e567c31354266756
blocks: google-reviews
target: darkcyan-grouse-898606.hostingersite.com (Eye Care page 11, pipeline run 2026-09-23 19:17)
date:   2026-09-23
```

Supersedes the earlier same-day report on this file, which said the card "matched" from style values alone; Bean
then found six failures by eye (heading, font, logo, per-card logo, arrows over the cards, dots). Design:
`.claude/plans/2026-09-23-google-reviews-baseline-and-slider-nav-design.md`.

Intent of THIS change: a new block looks like the Google widget with no settings touched; arrows can be placed five
ways (below-end default, below-center, below-split, sides, overlay-inset) and never cover a card; one progress setting
(scrollbar default, dots, none); the logo leads at 30px; each card shows its Google mark.

## Measured on the live page against the draft (real Chromium, fresh page, all three widths)

Elements located inside the reviews section, positions and presence compared, then the two captures put side by side
and looked at.

| Check | 1440 | 768 | 375 |
|---|---|---|---|
| Header G: size, side of caption | 30x30, left (= draft) | 30x30, left (= draft) | **on its own row above the caption** (draft: left) |
| Per-card G | 13 of 13 (= draft) | 13 (= draft) | 13 (= draft) |
| Arrows | below the rail, right, 0 px² over any card; positions equal to the draft | below, 0 px² | below, 0 px², equal to the draft |
| Dots / scrollbar | none / visible (= draft) | none / visible | none / visible |
| Review card | 340x346 (draft 340x344) | **340 wide (draft 270)** | 270x367 (draft 270x363) |
| Card left, width | 52, 1321 (= draft) | **52, 649 (draft 20, 713)** | 20, 320 (= draft) |
| Heading left | **113 (draft 52)** | **52 (draft 20)** | 20 (= draft) |
| Fonts loaded | **Inter only (draft: Roboto, Playfair, Outfit)** | same | same |

Block-local no-overlap proof for every placement (real render.php + built CSS, 1440/768/375, scroll start/middle/end):
0 px² for all five; forcing the old overlay gives 1600 px² (the measure can fail).

## Still not faithful, and why

- Heading left edge, section padding at 768, fonts: site-level (a nested container with no drafted width falls back to
  the theme's 1200px; the tablet spacing tier is not transferred; the Eye Care theme snapshot is not on the site and a
  widget-only font is never captured). Diagnosed, awaiting Bean's decisions; not this block.
- 375 header: the logo wraps above the caption. Block CSS, next change.
- 768 review card width: the draft's 270px applies below its own breakpoint; ours only below 768. Next change.
- Header stars draw a half star for 4.7; the draft shows a near-full fifth star. "Read the full review" is teal and
  underlined; the draft's is blue with no underline. Next change.

## Editor

Styles tab: the Navigation panel offers the five placements and the progress setting (scrollbar width and colour only
with scrollbar, dot colours only with dots); Card look lists all eight looks. Checked with jest (82) and PHP (72
including SliderNavTest with a negative control per placement).

## Not verified

Bean's eye on this state (R-31-13); the editor click-through after this deploy; dark mode.


## Follow-up (same day): phone header, partial star, review link (live page 11, run 2026-09-23 19:44)

- 375: the header G stays to the left of the caption and score (the text group starts from zero width and grows, so only
  the buttons wrap). Measured: G x=37 left of caption, as the draft.
- The partial header star is filled to the exact fraction (4.7 fills the fifth star to 70%) instead of rounding to a half.
- "Read the full review": no underline by default (it returns on hover and focus); the pipeline now marks the draft's
  link, so its #1A73E8 routes. Seen side by side at 1440 and 375: blue, no underline, as the draft.
- 768 note: the draft chooses its layout from its content width (viewport minus the browser's 15px scrollbar), so at a
  768 viewport it shows its PHONE layout while the site shows tablet. At 790 the two match exactly (heading and card at
  x=52, card 671 wide, review cards 340). Not a clone defect.
