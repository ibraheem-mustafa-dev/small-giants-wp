---
doc_type: visual-diff
block: sgs/physics-canvas
date: 2026-08-03
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_command: "node scripts/motion-qa/probe-first-paint.mjs https://sandybrown-nightingale-600381.hostingersite.com/physics-canvas-canary/ .sgs-icon --not-a-loop"
decision: FR-38-27 / D447 — new block, renamed sandbox → canvas per Bean 2026-08-03
site: sandybrown-nightingale-600381.hostingersite.com
fixture: /physics-canvas-canary/ (page 2138, created this session)
---

# sgs/physics-canvas — first-paint capture

## What this block is

A niche ARTISTIC canvas whose direct children become throwable, gravity-driven decorative bodies
(GSAP Draggable + Inertia + Physics2D). **Bean ruled 2026-08-03 that this surface is deliberately NOT
built for accessibility, structure, or cloning** — it is operator-discretion decoration. That ruling
is recorded in Spec 38 FR-38-27 and is why the QC council's WCAG finding is not treated as a blocker
here.

## The capture — genuinely run, not reasoned

```
[PASS] content is server-rendered and VISIBLE with JS disabled — 3/3 items visible
[PASS] NO clones in server markup (cloning is a JS-time construct only) — 0 clones
[N/A ] loop-marker assertion skipped — caller passed --not-a-loop
VERDICT: PASS — 2/2 assertions held
```

**`first_paint_capture_passed: true` is claimed on a capture that actually ran.** This matters
because nine reports on 2026-08-02 carried that field with no capture behind it and had to be
corrected; the field names a measurement, so it gets one or it does not get set.

## Why one assertion is N/A, and why that is not a dodge

`probe-first-paint.mjs` asserted that `data-sgs-loop` is server-emitted. That is a **looping-carousel**
concern. `sgs/physics-canvas` is not a carousel and must never emit that marker, so the probe failed
the block for lacking something it was never meant to have — dragging the whole verdict to FAIL for a
reason unrelated to first paint.

The probe was fixed rather than the field fudged. `--not-a-loop` is an **explicit caller opt-out**,
deliberately NOT auto-detected: a looping block that FORGOT its marker is exactly the bug that
assertion exists to catch, and auto-detection would hand it a silent pass.

**Negative control, run this session:** `/loop-fixture-post-grid/` **without** the flag is still
judged on its marker and reports 3/3. The assertion keeps its power for the blocks it is for.

## Additional checks on the live fixture

| Check | Result |
|---|---|
| Block renders server-side | ✅ 2 markers in page HTML |
| Children present before any JS | ✅ 3 icons SSR'd |
| Inline `style` attribute on block root (Spec 32) | ✅ **0** |
| Stale `build/blocks/physics-sandbox/` from the rename | ✅ removed — it would have registered a phantom block on every deploy |

## What this report does NOT claim

- **No live physics gesture test.** Nobody has dragged a body and watched it fall and bounce on a
  real machine. The maths is correct by construction and unobserved in use.
- **No visual regression comparison.** This is a brand-new block; there is no prior render to diff
  against. "First paint is sound" is the claim, not "it looks right".
- **Known ceiling, from the QC council:** Physics2DPlugin has NO collision detection — bodies bounce
  off arena edges only and pass through each other. No rotation (`type: 'x,y'`), no resize handling
  (bodies take fixed pixel geometry at init). It is a throwable layer, not a physics engine.
