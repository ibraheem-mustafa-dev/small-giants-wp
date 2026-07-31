---
verdict: PASS
first_paint_capture_passed: true
block: sgs/google-reviews
date: 2026-07-31
spec: 38
wave: C
surface: frontend
canary: https://sandybrown-nightingale-600381.hostingersite.com/motion-roster-canary/ (page 2085)
harness: C:/tmp/roster.mjs (ad-hoc; readings transcribed below)
---

# sgs/google-reviews — joined the derived draggable roster (FR-38-13)

## What changed

`supports.sgs.fx.providesNatively: ["draggable"]` + a `dragToScroll`/`dragMomentum`
inspector toggle + a `data-sgs-fx="draggable"` emit on `.sgs-google-reviews__list`. It
joined the roster because its own `style.css:454` declares `overflow-x: auto` on the
`--slider` variant's list — the same structural fact `fx-draggable.js` measures at
runtime, not a hand-edited roster entry.

## First paint — PASS

Two instances, `slider` variant, momentum ON then OFF. Both render **1200 × 316**,
`opacity: 1`, `visibility: visible`, **479 characters of real text**. Zero page errors.
The render is unchanged by this session's edits, which add an inspector control and a data
attribute and touch no markup a visitor sees.

## ⚠ The DRAG CAPABILITY is UNPROVEN on this block — stated, not buried

| Reading | Value |
|---|---|
| fx marker lands on | `.sgs-google-reviews__list` (correct — the scroller, not the root) |
| `overflow-x` | `auto` (correct) |
| `scrollWidth` vs `clientWidth` | **1200 vs 1200 — NO overflow** |
| `cursor` | `auto` — **the module did NOT attach** |

This is the runtime's structural guard behaving CORRECTLY. The fixture supplied review data
via a `reviews` attribute the block did not consume in this configuration, so the list held
too little content to overflow at 1440px; with nothing to drag, `fx-draggable.js` declines
by design. That is neither evidence the capability works nor evidence it is broken — it is
untested.

**Owed:** a fixture whose review source the block genuinely consumes (the `dataSource`
enum and its live Google-API/synced path were not exercised here), sized to overflow the
list, then the two-arm gesture capture already used for `sgs/gallery` — `scrollLeft`
following the pointer, coasting with momentum on and stopping with it off.

The `verdict: PASS` above is specifically a FIRST-PAINT verdict, which is what this gate
asks of a src change. It is not a claim that drag works here.

## Unrelated pre-existing defect found while capturing

`assets/images/google-logo.svg` returns **HTTP 404** on the canary — the only failed
request on the page. Not caused by this change (no asset path was touched), but it is a
real missing asset on a client-facing block and is recorded here rather than dropped.
