---
block: sgs/product-faq
date: 2026-08-09
source_sha: eb1bd710c57f8462
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: Playwright MCP against the live canary (block editor), fresh navigation, measured from the live DOM + a walk of document.styleSheets
deployed_build: build-deploy.py --target sandybrown --skip-build, 2026-08-09 (second wave), verify HTTP 200 + markers present
change: D540 — contentWidth removed (no inner band exists on this block)
---

## What changed

`contentWidth` deleted — attribute, render emission and editor control. `maxWidth` untouched.

On this block `contentWidth` never described an inner band: it emitted **`width:` on the same root
selector** that `maxWidth` sets `max-width:` on (D540).

## Live measurement — canary block EDITOR

No canary page carries this block, so the frontend could not be captured. The editor IS the surface
the change lives on — the control is what was removed — so it was measured there instead of claiming
a frontend capture that did not happen.

| Check | Result |
|---|---|
| `contentWidth` registered client-side | **false** |
| `maxWidth` still registered | **true** |
| "Content width" control visible in inspector | **false** |
| Block validity after insert | **valid** |
| Renders in the editor canvas | **yes** — 13 matching elements inside the canvas iframe |

⚠ A first pass reported `canvasRendered: false`. That was a MEASUREMENT artefact, not a defect: the
WP editor canvas is iframed, and the query ran against the parent document. Re-querying
`iframe[name="editor-canvas"]`'s document found the block rendering normally. Recorded because the
false negative would have looked like a broken block.

## Not verified here

Frontend first paint. Nothing on the canary carries this block. The deletion is render-neutral for
existing content by construction — zero instances in theme patterns/parts or live canary content
(posts, pages, sgs_header, sgs_footer) ever set `contentWidth` — but that is an argument, not a
capture, and is recorded as such.

## Safety established before deleting

Zero instances across theme patterns/parts AND live canary content (posts, pages, sgs_header,
sgs_footer) set the removed attribute on this block. The deletion is render-neutral for every piece
of content that exists today.

## Gates

`npm run build` exit 0 · `php -l` clean · `check-dead-controls` 0 net-new · `check-dead-pattern-attrs`
green (the gate that would catch a pattern still writing the deleted attribute).
