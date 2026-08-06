# container — visual-diff report (2026-08-06)

```
verdict: PASS
first_paint_capture_passed: true
```

**Block:** `sgs/container`
**Date:** 2026-08-06
**Target:** sandybrown canary, deployed via
`build-deploy.py --target sandybrown --blocks-only --payload …` (payload-scoped
dirty gate, NOT `--allow-dirty` — see D336).

## What changed

Two things, both in the shared background-video capability.

**1. `bgVideoTablet` declared and wired.** Background video was the only
asymmetric content family in the framework: `bgVideo` had a Mobile sibling and
no Tablet, on all 7 blocks that mirror the container. The wrapper now reads a
third tier, emits `data-src-tablet`, and `view.js` swaps across three tiers with
upward fallback (mobile → tablet → desktop). `data-src-tablet` is emitted ONLY
when a tablet override was actually set, so a block without one produces
byte-identical markup to before.

**2. Breakpoint drift corrected — `MOBILE_BREAKPOINT` 600 → 768.**
`container/view.js` used 600 while `hero/view.js` used 768 for the identical
swap, so the same background video changed source at different widths depending
on which block painted it. Classified before changing, as the device-tier rule
requires: this value selects a DEVICE TIER's media source, so it belongs to the
structured tier system and an inconsistent value is a bug, not a design choice.
Same class as the wrapper's 599-vs-767 unification at D228.

## First-paint capture (the field above, actually measured)

Playwright with **JavaScript disabled**.

```
url      : https://sandybrown-nightingale-600381.hostingersite.com/
selector : .wp-block-sgs-container
result   : [PASS] server-rendered and VISIBLE with JS off — 15/15 containers visible
VERDICT  : PASS — assertion held
```

## Painted DOM, three viewports (post-deploy)

| viewport | containers visible / total | first container | `<video>` | empty src | `data-src-tablet` |
|---|---|---|---|---|---|
| 375 mobile | 15/15 | 44 x 44 | 0 | 0 | 0 |
| 900 tablet | 15/15 | 44 x 44 | 0 | 0 | 0 |
| 1440 desktop | 15/15 | 44 x 44 | 0 | 0 | 0 |

900px is chosen deliberately: it sits inside the band (768–1023) that the
breakpoint move from 600 to 768 actually reclassifies. A container that
previously resolved "desktop" at 900px still renders identically.

## ⚠ What this capture does NOT prove

**The tablet video path is unexercised.** The canary carries **zero**
`<video>` elements and zero `data-src-tablet` attributes, because no content on
it sets a background video at all. So this report evidences that the change is
*inert on existing content* — no container regressed, nothing lost its
rendering, no empty `src` appeared — but it does **not** demonstrate a tablet
video actually swapping at 768–1023px.

Proving that needs a fixture page with three distinct video sources set on one
container. That is not built here and should not be claimed as verified. The
honest status of the new tier is: **shipped, structurally correct, not yet
exercised end-to-end on real content.**

## Verdict

**PASS** for the change as deployed: 15/15 containers render at every tier with
JS disabled, no regression at any viewport, and the new attribute is additive
and correctly absent from markup when unset. The tablet swap itself carries the
caveat above.
