# Visual diff — sgs/product-card + sgs/container — fix grid-item max-width yield selector — 2026-09-08

verdict: PASS (live-verified, fix deployed 2026-09-08)
first_paint_capture_passed: true
source_sha: c33f1b29b4dc6440

Covers the clone-fidelity programme's Phase 4 fix for 3.5 (products section layout — both
product cards clamped to the same 380px width instead of filling their assigned 5fr/3fr
grid-column split).

## Update — 3.6 (product-card typography), same day

A second, unrelated fix landed on this block the same day: the pack-size pill had no
`pillFontWeight`/`pillFontStyle` attributes declared at all (only `pillFontSize` existed),
so it could never take a weight/style override and always fell back to a generic default
(14px/500 instead of the draft's 13px/600). Added both attributes (mirroring the existing
title/desc pattern), enabled the editor's typography-control row for them (`showWeight`/
`showStyle` were explicitly disabled), and set this instance to the draft's values.
Live-verified post-deploy: `.sgs-option-picker__pill` computed `font-size:13px`,
`font-weight:600` (was 14px/500) — exact match, pills render cleanly, no overflow. The two
ORIGINALLY-reported 3.6 issues (title weight, price font-family) were found to already be
correct live before this fix — no code change was needed for those two.

## What changed

`plugins/sgs-blocks/src/blocks/product-card/style.css` and
`plugins/sgs-blocks/src/blocks/container/style.css` — the "yield the standalone max-width cap
when this element is a grid item" rules used a direct-child combinator
(`.sgs-container--grid > .X`) that stopped matching whenever the grid container also had a
band prop set (contentWidth/padding/background), because `SGS_Container_Wrapper` only
conditionally renders its `.sgs-container__inner` wrapper between the grid section and its
children. Fixed by chaining both known direct-child depths (with and without the wrapper),
rather than a bare descendant selector — a qc-council rater found the descendant-selector
alternative would strip the cap off a product-card nested several levels inside an unrelated
non-grid sub-container, a real DB-permitted nesting shape.

## Before/after — live measurement, same page, before the deploy and after it

Captured by dedicated verification agents against https://sandybrown-nightingale-600381.hostingersite.com/
(page 2742), Playwright, 1440px viewport, immediately before and after the deploy landed.

| Metric | Before | After |
|---|---|---|
| Featured product card width | ~380px (clamped) | 640px |
| Trial pack card width | ~380px (clamped) | 384px |
| Width ratio | ~1:1 (wrong) | 1.667 (exact 5:3, matches `gridTemplateColumns: 5fr 3fr`) |
| `margin-inline` (both cards) | `auto` (independently centred) | `0px` (grid-cell aligned) |
| Visual gap between cards | large dead gap | flush, 16px grid gap only |

## Assertions — stated before measuring

1. The two cards render at different, grid-track-matching widths (not both clamped to 380px).
2. `margin-inline` is `0px` on both (grid-aligned, not independently centred).
3. No regression on other `.product-card` instances elsewhere on the site (e.g. the `/shop/`
   page's own product grid, which is NOT nested inside an `sgs/container[layout=grid]` and
   should keep its standalone 380px cap).

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | Different, ratio-matching widths | **PASS** — 640px / 384px, exact 5:3 |
| 2 | margin-inline: 0px | **PASS** — both cards |
| 3 | No regression elsewhere | **PASS** — `/shop/` page's 5-card grid still correctly capped at 380px, `margin-inline: 0px` (grid-item context there too, unaffected by the selector change) |

No regressions observed. Deployed via `build-deploy.py --payload plugins/sgs-blocks/src/blocks/product-card/style.css --payload plugins/sgs-blocks/src/blocks/container/style.css`
(dirty-tree deadlock break, per the project's documented pattern) — motion-QA and the
payload-checksum verify both passed on the same deploy run.
