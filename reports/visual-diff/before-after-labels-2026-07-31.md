---
verdict: PASS
first_paint_capture_passed: true
block: before-after
date: 2026-07-31
spec: 38
surface: frontend
canary: https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-wave-c/ (page 2083)
assets: reports/visual-diff/assets/eyecheck-2026-07-31/
---

# sgs/before-after — the labels were describing the wrong image

## The defect, found by LOOKING and proven before fixing

Every numeric probe on this block passed. All of them asked whether the divider **moved**; none
asked **what was on each side of it**.

Measured on the live canary before the fix:

| Reading | Value |
|---|---|
| `__after-wrap` contains | `frame_0048.webp` (orange) |
| its computed `clip-path` | `inset(0px 50% 0px 0px)` — clipped from the RIGHT, so visible on the **LEFT** |
| "Before" label measured to | the **LEFT** half of the block |
| "After" label measured to | the **RIGHT** half |

So the left half showed the AFTER image under a label reading "Before", and vice versa. On the
abstract colour fixtures used for the Wave C captures this reads as merely odd; on a real
physio/renovation before-and-after it is the block stating the opposite of the truth.

## Which half was wrong

Not the clip. `style.css`'s own comment states the intent explicitly — *"reveal the 'after' image
from the left edge up to the divider position; everything to the right stays clipped so the
'before' image shows through"* — and the implementation matches it exactly.

The labels were the mismatch: `__labels` is `justify-content: space-between` and `render.php`
emits the BEFORE label first, so it lands left, over the after image.

## The fix

`order: 0` on `__label--after`, `order: 1` on `__label--before`, with the reasoning recorded at
the site. Done with CSS `order` rather than by swapping the markup so the DOM keeps its logical
before-then-after sequence.

## Verified live after deploy

| Reading | Before fix | After fix |
|---|---|---|
| "After" label side | RIGHT | **LEFT** (over `frame_0048`, the after image) |
| "Before" label side | LEFT | **RIGHT** (over `frame_0001`, the before image) |

Screenshot evidence: `assets/eyecheck-2026-07-31/fx-beforeafter-dragged.png` (defect) and
`fx-beforeafter-FIXED.png` (fixed). Labels now sit over the image they name.

## Open question for the owner — a convention, not a bug

The block now reveals AFTER on the LEFT and BEFORE on the RIGHT, which is coherent but unusual;
most comparison sliders read before-left → after-right, matching reading order. Flipping it is a
one-line change to the clip's inset direction. **Not made unilaterally** — it changes the feel of
the drag, so it is the owner's call.

## What this report does NOT claim

- The VERTICAL orientation is still unmeasured. Its clip reveals AFTER at the TOP, so its label
  order needs the same check — flagged in the CSS comment.
- No human eye has judged this (R-31-13); the fix was verified by measurement + screenshot.
