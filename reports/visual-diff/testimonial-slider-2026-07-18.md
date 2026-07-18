---
block: testimonial-slider
date: 2026-07-18
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — `sgs/testimonial-slider` mobile responsiveness fix — 2026-07-18

Intrinsic-responsiveness fix (Spec 35 "blocks must shrink to fit their container"
standard). Root-caused + fixed by a `wp-sgs-developer` agent (`/systematic-debugging`),
independently re-verified live by the orchestrator + a `design-reviewer` agent.

## Problem

At 360px the "Our Partners Love Us!" testimonial-slider section forced the page to
~894px (whole-page horizontal scroll on mobile).

## Proven root cause (empirical, not inferred)

The carousel's flex chain (`__stage` → `__track` [flex:1; overflow:hidden] →
`__list` → `__slide` [`flex: 0 0 calc(100%/N)`, flex-shrink:0]) uses a **percentage
flex-basis**. When an ancestor `.sgs-container--grid` computes its mobile
`grid-template-columns: 1fr` (= `minmax(auto, 1fr)`) `auto` floor, it reads the grid
item's **min-content contribution**. A percentage flex-basis against an indefinite
container falls back to each slide's own content min-content (~792px per card), which
bubbles up UNDAMPED — proven that `__track`'s `overflow:hidden` does NOT zero a
min-content *contribution* — becoming the block's min-content and flooring the grid
track at 894px, overriding the `1fr` column. (Content-width cannot contain this;
`min-width:0` on the block itself has no effect because the grid *item* is the block's
parent SECTION.)

## The fix (`src/blocks/testimonial-slider/style.css`)

Added `contain: inline-size;` to `.sgs-testimonial-slider`. CSS containment severs
the block's inline min-content contribution to any ancestor's intrinsic-size calc, so
it never floors an ancestor grid/flex track — the block is now **intrinsically
responsive** regardless of the container it's dropped into. No container/wrapper file
touched. `contain: inline-size` affects sizing only, not paint, so hover pop-outs are
unaffected. No block.json change, no version bump.

## Live verification — palestine-lives.org page 13, post-deploy

| Viewport | Result |
|---|---|
| 360px | `scrollWidth 360 === clientWidth 360` — overflow gone. Grid item `min-width` still `auto` (container UNTOUCHED — fix is purely the slider). 0 real unclipped overflow drivers. |
| 375px | `scrollWidth 360 === clientWidth 360` — card, 5 stars, quote, name/role, arrows, dots, pause button all legible + correctly placed (orchestrator screenshot). |
| 768px | split card+image layout clean; the residual 20px is an unrelated `.sgs-brand-strip` marquee (proven by disabling the slider — number unchanged), not the slider. |
| 1440px | full split layout intact, no regression. |

Build: `npm run build` PASS incl. `check-no-inline` (0 inline styles) + all gates; no
version bump. Deployed blocks-only to palestine-lives.

## first_paint_capture_passed

The slider renders correctly at first paint at 360/375/768/1440 with zero overflow and
no squashing/clipping; `design-reviewer` verdict: PASS at all three breakpoints.
