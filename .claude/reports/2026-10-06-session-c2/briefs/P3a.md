---
task: P3a
lane: W2-D
wave: 2
plan: .claude/plans/2026-10-06-spec47-route-cleanup.md
---

# P3a - Clamp the hover point to rect-intersect-viewport and return unreached - this fixes a FALSE GREEN

## Diagnosis

This is **not** a forced-hover limitation. `scripts/parity/lib/chrome-walk.mjs::hoverChrome` already uses a
real pointer (`page.mouse.move`). The defect is where it aims.

`scripts/parity/lib/collect.mjs::centreOf` returns the centre of the element's **raw rect**.
`sgs/brand-strip`'s marquee track is far wider than the viewport and is mid-translate, so its centre is
off-screen. Recorded pointer positions:

| Width | live `at.x` | draft `at.x` |
|---|---|---|
| 768 | **-1786** | 1301 |
| 1440 | **-1452** | 1301 |
| 1920 | **-1228** | 1298 |

A negative `x` means `mouseenter` never fires, so the JS pause class is never added and the hover read is of
an unhovered element.

**And 768 is a FALSE GREEN.** A draft `at.x` of 1301 against a 768px viewport is also off-screen, so
*neither* side pauses and the row **matches by accident**. A test that passes for the wrong reason is worse
than one that fails, and nothing in the suite would have surfaced it.

## The fix

1. Clamp the hover point to the **intersection of the element's rect and the viewport**.
2. **Verify with `document.elementFromPoint`** that the clamped point actually lands on the intended element.
3. Return **`unreached: true`** rather than reading "no change" as a pass.

Point 3 is mandatory: without it, an unhoverable element still produces a silent green.

## Owned files

`scripts/parity/lib/collect.mjs`, `scripts/parity/lib/chrome-walk.mjs`,
`scripts/parity/lib/state-passes.mjs`.

## Negative control

- **Red on revert:** a case with an element whose raw-rect centre is outside the viewport, asserting the
  clamped point is inside and `elementFromPoint` resolves to that element. Reverting must turn it red.
- **Not over-suppressing:** an ordinary on-screen element must get **exactly its previous hover point** - no
  drift from the clamp. And an element genuinely unreachable at any point must report `unreached`, not a
  pass. Assert `unreached` is distinguishable from "hovered and unchanged"; collapsing those two is the
  false green returning in a new costume.
