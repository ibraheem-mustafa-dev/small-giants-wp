---
doc_type: reference
title: "Visual-diff report — container · Ken-Burns keyframe renamed to avoid a naming collision"
block: container
date: 2026-08-13
property: bgKenBurns (@keyframes identifier only)
verdict: PASS
first_paint_capture_passed: true
source_sha: 3fd422526170c346
---

# container — `@keyframes sgs-ken-burns` renamed to `sgs-container-ken-burns`

**Verdict: PASS**, on a live before/after computed-style measurement against the
sandybrown canary. Pure identifier rename — the animation body (`scale`, timing
function, duration variable) is byte-identical; only the keyframes name and its
one `animation:` reference changed, done to stop the frontend hero rename
(`hero-2026-08-13.md`, D597) colliding with the container's own animation name.

## What was measured, and where

- **Page:** `https://sandybrown-nightingale-600381.hostingersite.com/d597-hero-effect-toggles-visual-diff-probe/`
  (page 2352, created for this measurement)
- **Element:** `sgs/container` with `backgroundImage` + `bgKenBurns:true` set,
  scoped by its own uid class (`sgs-container-87028bb7`) — not an unscoped
  wrapper-class query.
- **Method:** Playwright (chromium) `getComputedStyle()`, before deploying the
  change (canary rolled back to HEAD `b2ffcd40` via `git stash` + rebuild +
  redeploy) and after (staged bytes redeployed via `build-deploy.py --payload`).

## Measurement

| | animation-name | animation-duration | background paints |
|---|---|---|---|
| **before** | `sgs-ken-burns` | `20s` | `url(...)` |
| **after** | `sgs-container-ken-burns` | `20s` | `url(...)` (unchanged) |

The animation binds under its new name exactly as it did under the old one —
same duration, same custom-property source (`--sgs-ken-burns-duration`), same
visible zoom effect. Nothing else on the element moved.

## Why this needed a rename at all

`sgs/hero` gained its own split-media Ken-Burns effect this session
(`mediaKenBurns`, see `hero-2026-08-13.md`), and the two blocks previously
shared one global `@keyframes sgs-ken-burns` identifier. Two independent
`animation:` declarations resolving to the same global keyframes name is a
collision risk the moment either block's keyframes diverge (they already do —
hero's media variant needs its own transform-origin/scale profile). Renaming
container's copy to a block-scoped `sgs-container-ken-burns` (and hero's
section-level copy to `sgs-hero-ken-burns`, its media copy to
`sgs-hero-media-ken-burns`) removes the shared global name entirely.

## Gates

- Console errors: **0**
- PHP diagnostics in served HTML (`Array to string conversion`, `Fatal error`,
  `Warning:`, `Notice:`, `Deprecated:`, `Uncaught`): **none**
- `source_sha` computed by `visual-report-sha.py` over this block's STAGED
  bytes, re-verified after the canary was restored to the staged (after) state.

*Generated for D597 (hero effect toggles + container keyframe rename). Every
figure above is read from a live before/after Playwright capture against the
sandybrown canary; none is hand-written.*
