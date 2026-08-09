---
block: sgs/physics-canvas
date: 2026-08-09
source_sha: 86d617f80db18ade
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: Playwright MCP against the live canary block EDITOR (wp-admin/post-new.php, logged in as Claude) — block inserted via wp.data, selected, inspector opened and panel contents read from the live DOM
deployed_build: build-deploy.py --target sandybrown --skip-build, 2026-08-09, verify HTTP 200 + markers present
change: D539 — 61 unreachable/colliding container attributes deleted; 18 box+width attributes given real editor controls
---

## Why the EDITOR is the correct surface for this change

Every change here is a control-surface change. Half A deletes attributes that rendered
nothing; Half B adds inspector controls for attributes the framework already painted. The
frontend is expected to be UNCHANGED for an untouched instance — so a frontend capture
would prove nothing about this diff. The editor is where the change exists, and it is
where non-technical clients live.

## Live measurement — canary editor

| Check | Result |
|---|---|
| Block registers client-side | true |
| Deleted attrs still registered client-side | **none** (checked gridTemplateColumns, justifyContent, bgSvgContent, flexWrap, layout, columns, gap) |
| Deleted attrs still registered server-side (REST `block-types`) | **none** |
| Kept attrs present | maxWidth, minHeight, contentBandBackground, shadow, paddingTablet |
| Console errors on insert + select | **0** |
| Physics controls intact | Gravity, Bounce, Drag resistance still render |

## The new panels render, and are not empty

Inspector panels on a freshly inserted block:

```
Physics · Section (outer) · Padding & margin · Content band · Shadow
  · Block Link · Visibility conditions · Advanced
```

`Section (outer)`, `Padding & margin`, `Content band` and `Shadow` are new.

**Anti-vacuity:** a panel TITLE proves nothing — an empty panel still renders its header.
`Section (outer)` was opened and its contents read: labels `Outer max-width` and
`Content band width`, **7 interactive controls**, 617 characters of panel text. The panel
has real contents, not just a heading.

## The product gap this closes

`minHeight` shipped defaults of 480px desktop / 320px mobile and appeared **zero times**
in `edit.js`. A client could not resize the physics arena at all. `block.json`'s own
comment states the `__inner` band IS the arena whose rendered box `view.js` reads as the
Draggable bounds — so this was a real, reachable capability with no way to reach it.

## Deletions are safe — evidence, not assertion

Every deleted attribute name was searched with word-boundary matching across the block's
own `render.php`, `edit.js`, `view.js`, `style.css`, `save.js` and the theme's
patterns/parts. The only hits were COMMENTS and the CSS `gap:` property — **zero
attribute reads**. `check-dead-pattern-attrs.py` (which parses per-block-instance rather
than by name) is green, so no theme pattern writes a deleted attribute.

## Consequence recorded: physics-canvas lost the `draw` FX

`generated-fx-qualifying-blocks.{json,php}` regenerated: `sgs/physics-canvas` no longer
qualifies for `draw`. Cause: `draw` qualifies on the `svg-subtree` set, whose route beyond
the base 3-name set is `bgSvgContent` — now deleted. It qualified on a DECLARATION that
had no control and could therefore never be populated through the UI, so the capability
was never reachable.

⚠ Recorded as an open modelling question, not fixed here: physics-canvas allows
`sgs/icon` and `sgs/decorative-image` children, which DO render inline SVG, so its
rendered subtree can genuinely contain drawable geometry. The generator derives
qualification from `bgSvgContent` and not from `allowedBlocks` — a pre-existing limit of
its model that this change surfaces rather than causes.

## Not verified here

The frontend rendering of a physics-canvas instance with the NEW controls actually set.
No canary page carries this block, and the arena is `aria-hidden` decorative content. The
untouched-instance frontend is unchanged by construction (Half A removed only attributes
that emitted nothing), but a populated-control frontend capture has NOT been taken.

`tagName` remains declared, consumed by the wrapper, and without a control — a real
remaining gap, deliberately left as it was outside the authorised scope. It is the single
`21-render-without-control` finding still open on this block.
