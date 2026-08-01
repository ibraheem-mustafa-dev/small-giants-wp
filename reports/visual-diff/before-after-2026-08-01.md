---
verdict: PASS
first_paint_capture_passed: true
block: sgs/before-after
date: 2026-08-01
spec: 38
canary: https://sandybrown-nightingale-600381.hostingersite.com/ba-direction-canary-2026-08-01/ (page 2112, this agent's own canary — did not touch page 2111)
supersedes: the "SHIPPED-NOT-DEPLOYED" verdict in this same file's prior revision — `reverseDirection` is now live in the deployed build and has been measured, not just derived by hand
---

# sgs/before-after — all 4 reveal directions, live verification

The build with `reverseDirection` + per-slot `beforeMediaType`/`afterMediaType` was already
deployed to the canary before this dispatch started. This report is the label-vs-image
verification that the prior revision of this file flagged as the required next step — done now,
against real product photography, at 375/768/1440, using the exact discipline the 2026-07-31
defect proved necessary: **"the divider moved" is not the check; "what is under each label" is.**

## Canary built

Page 2112, `ba-direction-canary-2026-08-01`, four instances of `sgs/before-after`, one per
direction, same real imagery as the existing `ba-real-imagery-canary` (page 2111, untouched):
`beforeImageId=1445` (`cookies-on-bun-case-17.jpeg`, raw cookies), `afterImageId=1442`
(`Halimahs-17.jpeg`, styled/packaged product). `startPosition=50`, `height=400` on all four;
only `orientation`/`reverseDirection` vary:

| Instance | orientation | reverseDirection | Claimed reveal |
|---|---|---|---|
| 1 | horizontal | false | after LEFT (default, Bean-locked) |
| 2 | horizontal | true | after RIGHT |
| 3 | vertical | false | after TOP |
| 4 | vertical | true | after BOTTOM |

`wp post get 2112 --field=post_content` confirmed all four attribute pairs saved exactly as
authored before any measurement began.

## Method — three independent checks per direction, all keyed to "what's under the label"

1. **Geometric proof**: read `getComputedStyle(afterWrap).clipPath` (the actual painted
   after-visible region) and the bounding-rect position of each label, on the SAME live DOM
   node, and check the label sits over the region the clip-path says is visible for that image.
2. **Pixel hit-test proof**: with the range/divider overlays temporarily set to
   `pointer-events:none` (reverted immediately after read, non-destructive), call
   `document.elementFromPoint()` at sample points either side of the divider and confirm which
   element (`__after-wrap` vs falling through to `__stage`, since `__img--before` itself is
   `pointer-events:none`) is actually painted there — independent of the clip-path arithmetic.
3. **Eyeball proof**: full-page screenshots at each breakpoint, read back and visually confirmed
   the "After"/"Before" text sits on the half showing the styled/raw image respectively.

All three checks were run on all four directions at 1440, and the geometric + eyeball checks
repeated at 768 and 375 (the pixel hit-test is viewport-independent and was not worth re-running
at every breakpoint once proven at 1440 — same DOM/CSS mechanism, no breakpoint-specific label
logic exists in the CSS).

## Results — 1440px

| Direction | `data-reverse` | `clip-path` (afterWrap) | Label geometry | Pixel hit-test | Verdict |
|---|---|---|---|---|---|
| 1 horiz/false | `0` | `inset(0px 50% 0px 0px)` → after visible LEFT | "After" label x=59.7 (left), "Before" label x=1173.6 (right) | 25%-x point → `__after-wrap`; 75%-x point → falls through to `__stage` (before showing) | **PASS** |
| 2 horiz/true | `1` | `inset(0px 0px 0px 50%)` → after visible RIGHT | "After" label x=1184.5 (right), "Before" label x=59.7 (left) | 75%-x point → `__after-wrap`; 25%-x point → `__stage` | **PASS** |
| 3 vert/false | `0` | `inset(0px 0px 50%)` → after visible TOP | "After" label y=1238.7 (top), "Before" label y=1588.5 (bottom) | 25%-y point (after scroll-align) → `__after-wrap`; 75%-y point → `__stage` | **PASS** |
| 4 vert/true | `1` | `inset(50% 0px 0px)` → after visible BOTTOM | "After" label y=2079.7 (bottom), "Before" label y=1729.8 (top) | 75%-y point → `__after-wrap`; 25%-y point → `__stage` | **PASS** |

All 4 confirmed independently by geometry, pixel hit-test, and eyeball at 1440. Screenshots:
- `reports/visual-diff/assets/ba-direction-2026-08-01/ba-directions-1440-full.png` (resting, startPosition=50)
- `reports/visual-diff/assets/ba-direction-2026-08-01/ba-directions-1440-dragged.png` (all four dragged to 20% via the native range input, confirming the drag mechanism — see below)

## Drag / interaction check — all 4 directions

Drove each instance's native `<input type="range">` (the always-present keyboard/touch control)
from 50 → 20 via the native value setter + `input`/`change` events, and re-read
`getComputedStyle(afterWrap).clipPath`:

| Direction | clip-path @ 50 | clip-path @ 20 | Axis/direction correct? |
|---|---|---|---|
| 1 horiz/false | `inset(0 50% 0 0)` | `inset(0 80% 0 0)` | Yes — right-inset grows as divider moves left, after-revealed area shrinks from the left. Horizontal axis, correct direction. |
| 2 horiz/true | `inset(0 0 0 50%)` | `inset(0 0 0 20%)` | Yes — left-inset tracks the divider position directly (same semantics as #1, just flipped which side is "after"). |
| 3 vert/false | `inset(0 0 50%)` | `inset(0 0 80%)` | Yes — vertical axis, bottom-inset grows as divider moves up. |
| 4 vert/true | `inset(50% 0 0)` | `inset(20% 0 0)` | Yes — vertical axis, top-inset tracks divider position. |

Confirmed on screenshot `ba-directions-1440-dragged.png`: instance 1 shows a thin sliver of after
(packaged product) on the left with most of the frame showing the raw-cookie before image;
instance 2 shows the mirror; instances 3/4 show the equivalent top/bottom split. Read back and
eyeballed — matches the numeric clip-path evidence.

## Bean-locked default preserved

`reverseDirection=false` horizontal produces `clip-path: inset(0px 50% 0px 0px)` — the identical
value recorded in the 2026-07-31 report as the pre-existing (unchanged) behaviour. The default
reveal direction was not touched by this feature; only the three new combinations were added.

## Vertical label layout — the previously-unmeasured fix, now confirmed live

`getComputedStyle(labelsEl).flexDirection` returned `"column"` for both vertical instances at
1440, 768 and 375 (was `"row"` for both horizontal instances at every breakpoint). This is the
fix flagged as "never seen live" in the CLAUDE.md context — confirmed: vertical instances stack
their labels top/bottom, not left/right, at every measured breakpoint.

## 768px and 375px

Repeated the geometric + eyeball check (see full JSON evidence captured during the session) at
both breakpoints. Same pattern held exactly — clip-path values identical to 1440 (clip-path is a
percentage, not viewport-dependent, so this is expected but was still measured, not assumed) and
every label's position matched its image's visible side in all 4 directions at both sizes.

Screenshots:
- `reports/visual-diff/assets/ba-direction-2026-08-01/ba-directions-768-full.png`
- `reports/visual-diff/assets/ba-direction-2026-08-01/ba-directions-375-full.png`

Read back and eyeballed at 375: all four instances show the correct label over the correct
image (After over the styled/packaged photo, Before over the raw-cookie photo) in every
direction, including the two vertical instances stacking correctly top/bottom.

## Console

0 errors, 0 warnings on the canary page at 375px (checked after full interaction/drag testing).

## What this report does NOT claim

- Only the native range-input drag path was exercised programmatically (dispatching `input`/
  `change` events on the real DOM element). GSAP Draggable free-drag-on-image was not physically
  dragged via a simulated pointer gesture this session — the range input drives the same
  underlying state (`--sgs-before-after-position` / clip-path), so this is not a gap in the
  mechanism proven, but a literal mouse-drag gesture on the image itself was not separately
  exercised.
- Keyboard focus/tab-order and screen-reader labelling were not part of this dispatch's scope
  and were not checked.
- Video/SVG media-type slots (Task 1 of the prior session's dispatch) are unrelated to this
  verification and were not touched or re-checked here.
