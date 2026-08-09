---
block: sgs/physics-canvas
date: 2026-08-09
source_sha: e2f5fbe4a817f91f
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: Playwright (chromium, 1500x1000) against the live canary block EDITOR at wp-admin/post-new.php, logged in as the sandybrown admin user; block inserted and selected via wp.data, every collapsed inspector panel expanded programmatically, then the panel contents read from the live DOM
deployed_build: build-deploy.py --target sandybrown --blocks-only --skip-build, 2026-08-10, verify HTTP 200 + markers present
change: tagName given a real editor control (9 options), clearing the block's last render-without-control finding
---

## What changed

`sgs/physics-canvas` declared a `tagName` attribute and `render.php:96` rendered it
(`sanitize_key( $attributes['tagName'] )`, defaulting to `section`), but **no control existed**.
The semantic wrapper tag was therefore frozen at `section` forever from a client's point of view —
the operator could never reach it. This adds the control, mirroring how `sgs/container` exposes the
same attribute.

This was the single remaining `render-without-control` (inspector-scan rule 21) finding on this
block, deliberately left outside D539's authorised scope at the time.

## Why the EDITOR is the correct surface

This is a control-surface change. The frontend output for an untouched instance is **unchanged** —
the attribute already rendered, and its default is unchanged — so a frontend capture would prove
nothing about this diff. The change exists only in the inspector, which is where non-technical
clients live.

## Live measurement — canary editor

| Check | Result |
|---|---|
| Block registers client-side | true |
| `tagName` registered with its enum | `{"type":"string","enum":["div","section","article","aside","main","nav","header","footer","figure"],"default":"section"}` |
| Control present in the inspector | **true** — found by its option set, not by its label |
| Control label | `HTML tag` |
| Control value on a fresh block | `section` (matches the block.json default) |
| Control options | `section, div, main, article, aside, nav, header, footer, figure` — **9, exactly the 9-value enum** |
| Console errors on insert + select + panel expand | **0** |
| Panels rendered | Physics · Section (outer) · Padding & margin · Content band · Shadow · Block Link · Visibility conditions · Advanced |

Screenshot: `physics-canvas-tagname-2026-08-09.png` (same directory).

## A measurement trap this run walked into, and how it was caught

The first capture reported **zero** select elements in the inspector and would have read as "the
control is missing". It was not missing — every inspector panel was **collapsed**, and a collapsed
`components-panel__body` keeps its children out of the DOM entirely. The first read was measuring
the accordion, not the control.

The fix is in the capture script, not the block: it now walks every panel button and clicks any
with `aria-expanded="false"`, repeating three times so panels revealed by expanding a parent are
also opened, before reading anything. Recorded because the failure mode is silent and
indistinguishable from a real absence — the same class as
`a-probe-that-never-reaches-the-effect-measures-the-probe`.

The control is also identified by **what it offers** (an option set containing `figure` and
`section`) rather than by its label text, so a future label change cannot make this check silently
pass on the wrong element.

## Scope discipline

Untouched, deliberately: the physics runtime (`view.js`), `aria-hidden`, and `ALLOWED_BLOCKS`.
`ALLOWED_BLOCKS` is the subject of a separate, Bean-approved change (open the canvas to any block +
a physics-participation toggle) that carries its own design gate — it is not part of this diff.

## Gate result

`inspector-scan` rule 21 findings for `sgs/physics-canvas`: **0** (verified by
`node scripts/inspector-scan/run.js --json`). `npm run build` exit 0.
