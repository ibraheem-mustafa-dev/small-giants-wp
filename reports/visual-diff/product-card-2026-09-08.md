# Visual diff — sgs/product-card + sgs/container — fix grid-item max-width yield selector — 2026-09-08

verdict: PASS (live-verified, fix deployed 2026-09-08)
first_paint_capture_passed: true
source_sha: e4b520673997a2a6

Covers the clone-fidelity programme's Phase 4 fix for 3.5 (products section layout — both
product cards clamped to the same 380px width instead of filling their assigned 5fr/3fr
grid-column split).

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
