---
verdict: PASS
first_paint_capture_passed: true
block: sgs/responsive-logo
date: 2026-07-31
spec: 38
wave: C
surface: frontend + block editor
canary: https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-wave-c/ (page 2075)
harness: plugins/sgs-blocks/scripts/motion-qa/probe-wave-c.mjs + probe-wave-c-editor.mjs
---

# sgs/responsive-logo — Spec 38 FR-38-15 DrawSVG, Vivus retired (Wave C)

## First paint (no JS help required)

Two instances on one page, each inlining a 4-shape SVG at `240 × 80`, `opacity: 1`,
`visibility: visible`. `view.js` is DELETED (the Vivus runtime); the block now carries
`data-sgs-fx="draw"` + `data-sgs-fx-trigger` on its own wrapper span and the shared
`fx-draw.js` module does the work.

## Named observable signal — measured

An untouched SVG has `stroke-dasharray: none`. Any dash pair is therefore DrawSVG's own
fingerprint, and the resting state alone would not distinguish "drawn" from "never touched"
without that fact.

**Instance 1 — `animationStyle: draw-on-load` → trigger `load`.** Settled fully drawn, all
four shapes carrying DrawSVG's signature:
`100px, 0.1px | off 0px` · `75px, 0.1px | off 0px` · `138.23px, 0.1px | off 0px` ·
`44px, 0.1px | off 0px`.

**Instance 2 — `animationStyle: scroll-trigger` → trigger `scroll`, SCRUBBED.** At load,
before being scrolled to, all four shapes read `0px, 999999px | off 0.001px` — 0% drawn,
correctly waiting. Swept through the full trigger range in 80px steps:
**8 distinct dash states**, e.g.
`0px, 999999px` → `20.16px, 79.94px` → `91.01px, 9.09px` → `99.65px, 0.45px` →
`99.98px, 0.12px` → `100px, 0.1px`. That is a continuous scrub, not a one-shot reveal.

**Reduced motion — SIMPLIFY, with a discriminating control.** Under `reduce` the same sweep
produced **1** distinct dash state versus **8** under `no-preference`: the logo renders fully
drawn and never animates. This is an upgrade on Vivus's non-canonical 1ms-draw arm.

## A false alarm I recorded against myself

An earlier probe reported the scroll arm's dash state as "identical before and after scrolling
to it" and I nearly logged it as a defect. The probe was using `scrollIntoViewIfNeeded`, which
scrolls the MINIMUM distance and left the element sitting below the trigger's `top 85%` start —
so progress was legitimately 0 and the effect was correctly waiting. **A probe that never
scrolls THROUGH a scrubbed range is measuring the probe, not the effect.** The harness now
sweeps the full range.

## Registry correctness

`fx_effects.draw.plugin_set` corrected `["DrawSVG"]` → `["DrawSVG","ScrollTrigger"]`.
`fx-draw.js` imports ScrollTrigger and its scroll arm builds a real `scrollTrigger` config.
The 2026-07-30 deploy report stated this row had already been corrected; **it had not** — the
correction never reached `seed-motion-fx-registry.py`, so the row still read `["DrawSVG"]`.
Undeclared it does not crash (the import map still resolves the specifier) but WP emits no
dependency and no modulepreload, so the plugin arrives late.

## Editor surface (D388)

4 wrappers present (2 in content + the theme header's own logo), selectable, **14 inspector
panels**, zero crash surfaces.

## What this report does NOT claim

- No human eye has judged the draw's timing or easing (R-31-13 not yet given).
- The `hover-redraw` arm is UNMEASURED — only `draw-on-load` and `scroll-trigger` were
  exercised on this canary.
- `animationStyle`'s enum is byte-identical to the Vivus era and there is no `deprecated.js`
  (D270), so stored instances are expected to render identically — expected by construction,
  not verified against a pre-migration snapshot.
