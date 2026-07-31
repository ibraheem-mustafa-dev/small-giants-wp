---
verdict: PASS
first_paint_capture_passed: true
block: sgs/trustpilot-reviews
date: 2026-07-31
spec: 38
wave: C
surface: frontend
canary: https://sandybrown-nightingale-600381.hostingersite.com/motion-roster-canary/ (page 2085)
harness: C:/tmp/roster.mjs (ad-hoc; readings transcribed below)
---

# sgs/trustpilot-reviews — joined the derived draggable roster (FR-38-13)

## What changed

`supports.sgs.fx.providesNatively: ["draggable"]` + a `dragToScroll`/`dragMomentum`
inspector toggle + a `data-sgs-fx="draggable"` emit on `.sgs-trustpilot-reviews__track`.
It joined the roster because its OWN stylesheet declares `overflow-x: auto`
(`style.css:179`, `--mini-carousel` track) — the same structural fact `fx-draggable.js`
measures at runtime — not because a roster list was hand-edited.

## First paint

Two instances, `mini-carousel` variant, momentum ON then OFF. Both render
**1200 × 245**, `opacity: 1`, `visibility: visible`, **457 characters of real text**.
Zero page errors.

## The capability is PROVEN, not merely wired

| Reading | Value |
|---|---|
| fx marker lands on | `.sgs-trustpilot-reviews__track` (the scroller, not the root) |
| `overflow-x` | `auto` |
| `scrollWidth` vs `clientWidth` | **1456 vs 1088** — a genuine overflow |
| `cursor` | **`grab`** — the module attached |
| momentum attr, instance 1 / 2 | `null` (default on) / `"false"` |

`cursor: grab` is the discriminating signal: `fx-draggable.js` only writes it after
`isNativeHorizontalScroller()` returns true, which requires BOTH `overflow-x: auto|scroll`
AND real overflow. A block that merely emitted the marker would show `cursor: auto`.

## What this report does NOT claim

- The drag GESTURE was not exercised on this block (the gallery block's gesture test
  covers the shared module; this capture proves attachment and structural fitness here).
- Touch is unmeasured — the module gates itself behind `(pointer: fine)`.
- No human eye has judged the feel (R-31-13 not yet given).
