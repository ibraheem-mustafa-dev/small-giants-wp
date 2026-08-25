---
block: container
date: 2026-08-25
verdict: PASS
intent_capture_passed: true
source_sha: b0ab381027bf4182
capture_type: intent
url: https://sandybrown-nightingale-600381.hostingersite.com/gate-do-not-delete-flowing-gradient-fr-38-31/
---

# `sgs/container` — child-lift exclusion for the wave-gradient canvas

## The change

One selector. `.sgs-container > *:not(…)` gained an eighth exclusion,
`:not(.sgs-wave-gradient__canvas)`, joining the two overlay classes, the three
fx route/shape helpers and the LCP image fast path already there.

## Why an INTENT capture rather than a before/after diff

There is no meaningful "before" image for existing containers, because this
change **cannot affect any of them**. The added `:not()` only alters matching
for elements carrying `.sgs-wave-gradient__canvas`, and that class is created at
runtime by `fx-wave-gradient.js`, which only runs on a block carrying
`data-sgs-fx="wave-gradient"`. No such block existed before today. Every other
container child matches exactly as it did.

The assertion under test is therefore about the NEW case, and it is measured
rather than eyeballed.

## Stated assertion

> With the exclusion in place, the wave-gradient canvas resolves to
> `position: absolute` and covers its block exactly, and the block returns to
> its authored height.

## Measured, live, on the URL above

| Measure | Before the exclusion | After | Assertion |
|---|---|---|---|
| Canvas `position` | `relative` | **`absolute`** | met |
| Canvas offset from block (dx, dy, dw, dh) | `24, 146, -48, -146` | **`0, 0, 0, 0`** | met |
| Section height (authored `minHeight: 70vh`) | `5170px` | **`595px`** | met |
| Drawing buffer, pixels per frame | `11,032,215` | **`1,247,775`** | 8.8× reduction |
| `data-sgs-wave-active` | `1` | `1` | unchanged |

## Why the failure was so large

The container rule forced the canvas into normal flow. An in-flow child with
`height: 100%` feeds its own height back into the parent that sizes it, so the
section grew to 5170px against an authored 70vh — and the renderer then sized
its drawing buffer to that runaway height, reaching ~11 million pixels every
frame for a decorative background.

## How the real cause was found

By asking the browser which rules matched the canvas and set `position`, rather
than by reasoning about specificity. The effect's OWN stylesheet had already
been fixed and was innocent; the winning rule belonged to `sgs/container` and
was never in the file being edited.

## Regression risk

None identified for existing containers, by the argument above (the selector
cannot match anything that existed before). The residual risk is the general one
this rule has now taught five separate features: **any absolutely positioned
BACKGROUND layer added inside a container must join this list**, or it will be
silently lifted into flow. That is recorded in the rule's own comment.
