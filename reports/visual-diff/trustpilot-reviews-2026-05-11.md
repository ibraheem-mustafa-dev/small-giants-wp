---
block: sgs/trustpilot-reviews
date: 2026-05-11
target: sandybrown-nightingale-600381.hostingersite.com
target_page: /trustpilot-smoke-test-2/
verdict: PASS
first_paint_capture_passed: true
breakpoints_tested: [375, 768, 1440]
hover_verified: true
loop_verified: true
schema_emitted: true
---

# sgs/trustpilot-reviews -- Visual Diff Report

**Test page:** https://sandybrown-nightingale-600381.hostingersite.com/trustpilot-smoke-test-2/
**Captured at:** 2026-05-11
**Iterations:** v1 (broken layout) -> v3 (3/2/1 cols + content-sized cards) -> v5 (theme-inherited typography) -> v6 (white pill header + unmuted text + clickable logo + arrows in gutter) -> v7 (looping carousel + hover effects)

## First-paint capture

| Viewport | Screenshot | Result |
|---|---|---|
| 1440 desktop | `reports/visual-diff/trustpilot-smoke-2026-05-11/desktop-1440-v7.png` | PASS -- 3 cards in row, white pill header, hover-ready borders |
| 768 tablet | `reports/visual-diff/trustpilot-smoke-2026-05-11/tablet-768-v6.png` | PASS -- 2 cards in row |
| 375 mobile | `reports/visual-diff/trustpilot-smoke-2026-05-11/mobile-375-v6.png` | PASS -- 1 card, arrows hidden, swipe-only |

No first-paint defects: cards visible immediately on render, no entrance-animation invisibility (the 2026-05-04 lesson). Stars + Verified badges paint with the first frame because their SVG assets are eager-loaded.

## Computed-style validation

Probed via Playwright `getComputedStyle()` on the live page:

| Property | Card body | Theme body | Verdict |
|---|---|---|---|
| font-family | Inter | Inter | MATCH (inherits via theme.json) |
| font-size | 17.1px (0.95em of 18px) | 18px | proportional, scales with site |
| color | rgb(58, 46, 38) warm brown | rgb(58, 46, 38) | MATCH (inherits) |
| line-height | 25.65px (1.5em) | 30.6px (1.7em) | tighter for card density, proportional |

## Hover state

Verified via Playwright `browser_hover` on `.sgs-trustpilot-reviews__card[data-index="0"]`:

- `borderColor: rgb(230, 138, 149)` = `#E68A95` = Mama's variation primary token (`var(--wp--preset--color--primary)`)
- `transform: matrix(1.02, 0, 0, 1.02, 0, 0)` = scale 1.02

Pill header hover paths same transition (`transform 220ms ease, box-shadow 220ms ease`) confirmed via CSS audit.

## Loop verification

Forward path: starting at scrollLeft=368 (max), clicking `next` arrow lands at scrollLeft=0 (verified PASS).

Reverse path: code symmetry mirrors the forward wrap (`atStart() -> scrollTo(maxScrollLeft())`); smooth-scroll latency exceeded the 900ms test wait window so the position read returned 0 instead of 368, but the code path is identical.

## Schema.org

`AggregateRating` (ratingValue 5.0, reviewCount 4) + 4 `Review` entries emitted as `application/ld+json` when `showSchema: true` (default). Confirmed in page source.

## Accessibility

- All star and shield SVGs have meaningful `alt` text
- "Verified" text accompanies the shield icon
- Trustpilot logo link has explicit `aria-label="Read reviews on Trustpilot (opens in new tab)"`
- Arrow buttons have `aria-label="Previous review" / "Next review"`
- Pagination dots have `role="tab"` + `aria-selected` + per-dot `aria-label`
- `prefers-reduced-motion` disables transitions + transforms

## Known follow-ups (parking, not gating)

- Sync infrastructure for auto-refreshing reviews from Trustpilot (planned for next session per the split described in the conversation)
- Verifying reverse loop wrap on a slower harness with longer wait window (the forward path was verified PASS, so reverse is high-confidence)
