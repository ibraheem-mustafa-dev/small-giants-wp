---
block: sgs/testimonial
date: 2026-08-09
source_sha: 2fcb4e5e579f843f
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: Playwright MCP against the live canary (homepage frontend), fresh navigation, measured from the live DOM + a walk of document.styleSheets
deployed_build: build-deploy.py --target sandybrown --skip-build, 2026-08-09 (second wave), verify HTTP 200 + markers present
change: D540 — contentWidth removed (no inner band exists on this block)
---

## What changed

`contentWidth` deleted — attribute, render emission and editor control. `maxWidth` untouched.

On this block `contentWidth` never described an inner band: it emitted **`width:` on the same root
selector** that `maxWidth` sets `max-width:` on. Two width values on one element, the second under a
name promising a wrapper that does not exist (D540).

## Live measurement — canary homepage (frontend)

9 instances on the canary homepage. ALL NINE render real text (9/9) — an empty or absent block scores a false PASS on any sweep, so text presence was confirmed before measuring. **No root `width:` rule survives** for any testimonial uid. Computed width 300.364px is layout-derived; computed max-width `none`.

## Anti-vacuity

Text presence was confirmed on every instance BEFORE any computed style was read. The absence claim
was made by walking `document.styleSheets` for a root-scoped `width:` rule bound to this block's uid
— not inferred from a computed value, which is layout-derived and would look unremarkable either way.

## Safety established before deleting

Zero instances across theme patterns/parts AND live canary content (posts, pages, sgs_header,
sgs_footer) set the removed attribute on this block. The deletion is render-neutral for every piece
of content that exists today.

## Gates

`npm run build` exit 0 · `php -l` clean · `check-dead-controls` 0 net-new · `check-dead-pattern-attrs`
green (the gate that would catch a pattern still writing the deleted attribute).
