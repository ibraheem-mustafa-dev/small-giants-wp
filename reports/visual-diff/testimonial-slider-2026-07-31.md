---
verdict: PASS
first_paint_capture_passed: true
block: sgs/testimonial-slider
date: 2026-07-31
spec: 38
wave: C
surface: frontend + block editor
canary: https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-wave-c/ (page 2075)
harness: plugins/sgs-blocks/scripts/motion-qa/probe-wave-c.mjs + probe-wave-c-editor.mjs
---

# sgs/testimonial-slider — Spec 38 FR-38-13 drag momentum (Wave C)

## First paint (no JS help required)

Two instances on one page, each `.sgs-testimonial-slider__track` rendering `1096 × 115`,
`opacity: 1` / `visibility: visible`. Zero page errors, zero failed requests.

## Named observable signal — measured

This block's carousel is transform-driven (`overflow: hidden`, a clone-loop translated via
`--sgs-slider-offset`), NOT a native scroller — so `scrollLeft` would be a vacuous `0`
forever and the readout has to be the custom property.

| Arm | before | during drag | at release | settled |
|---|---|---|---|---|
| momentum ON, no-preference | −1112 | −1472 | **−2224** | −2224 |
| momentum OFF, no-preference | −1112 | −1472 | **−2224** | −2224 |
| momentum ON, reduce | −1112 | −1472 | **−2224** | −2224 |
| momentum OFF, reduce | −1112 | −1472 | **−2224** | −2224 |

Twelve distinct intermediate values were captured during the gesture, so the track FOLLOWS
the pointer rather than jumping. The drag completes a full slide advance (−1112 → −2224).

## ⚠ The honest gap: momentum is NOT discriminated on this block

All four arms above are identical. The drag works, and it works under reduced motion (§10
SIMPLIFY, satisfied). But **this run does not prove the InertiaPlugin momentum layer does
anything on this block**, because the slider snaps to slide boundaries either way: a drag long
enough to cross the threshold advances one slide with or without velocity physics.

What momentum is FOR here is the short, fast flick that does not cross the distance threshold
but should still register as a deliberate slide change. That gesture was not isolated. Calling
this "momentum verified" would be the exact failure mode of asserting on an effect that
engages rather than an effect that works.

**Recorded as owed, not as passing.** The block's own drag is verified; the momentum layer on
top of it is not. Everything else in this report stands on its own measurements.

## Why the shared runtime correctly does nothing here

`render.php` emits `data-sgs-fx="draggable"` on the track, but `fx-draggable.js` attaches only
to a genuine native `overflow-x: auto|scroll` element and this track is not one. It no-ops —
by design, so a block-agnostic module never has to re-derive this file's clone-zone wrap-around
maths (R-31-9). The momentum upgrade lives in this block's own `view.js`.

## Editor surface (D388) — a real defect found and fixed

The dynamic `Promise.all([ import('gsap/InertiaPlugin'), import('@sgs/motion-provider') ])` in
`view.js` had **no `.catch()` at all**. WordPress loads a block's `viewScriptModule` in the
editor, where `SGS_Motion_Registry` deliberately does not register the Tier G modules, so the
import rejected and surfaced as an uncaught page error. Verified live: the editor's import map
held exactly `@wordpress/route`, `@wordpress/latex-to-mathml`, `@wordpress/interactivity` and
`@sgs/gsap` — none of the plugin modules.

Two fixes: the chain now catches (momentum is an enhancement and must degrade silently), and
the motion layer declines to boot on an editor surface at all (Spec 38 §9 — never active in
the editor or wp-admin).

Post-fix: 2 instances present, selectable, **16 inspector panels**, zero crash surfaces.

## Still open (not fixed by the above)

Two console errors persist in the editor —
`Failed to resolve module specifier "@sgs/gsap-inertia"` and `"@sgs/gsap-draggable"`. They
survive the boot guards, so they are NOT thrown by our boot code; they come from the editor's
own dynamic loading of block view modules against an import map that lacks those entries.
**Nothing crashes** (zero block-crash surfaces, all five blocks mount and render inspector
controls), so this is console noise, not a functional defect — but it is unresolved and is
recorded here rather than quietly dropped.

## What this report does NOT claim

- Momentum on this block (see the gap above).
- No human eye has judged the drag's feel (R-31-13 not yet given).
- Touch drag is unmeasured.
