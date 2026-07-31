---
verdict: PASS
first_paint_capture_passed: true
block: sgs/image-sequence
date: 2026-07-31
spec: 38
wave: C
surface: frontend + block editor
canary: https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-wave-c/ (page 2075)
harness: plugins/sgs-blocks/scripts/motion-qa/probe-wave-c.mjs + probe-wave-c-editor.mjs
---

# sgs/image-sequence (NET-NEW) — Spec 38 FR-38-9 (Wave C)

## First paint (no JS help required)

Two instances on one page, each rendering a real `<img>` poster at `1200 × 675`,
`opacity: 1` / `visibility: visible`. The poster is the fail-open surface: with JS blocked,
under reduced motion, or before the first frame decodes, it is the only thing a visitor sees,
and it is never a placeholder box. Zero page errors, zero failed requests.

## Per-render fatal class

Two instances on one page, zero PHP fatals — the case the previous session recorded as owed.

## Named observable signal — measured

The fixture frame set was generated so that mean pixel luminance **ramps monotonically with
frame index**. Sampling the canvas's own pixels (`getImageData`) therefore reads out WHICH
FRAME is painted, not merely that something painted.

| scroll position through the block | instance 1 luma | instance 2 luma |
|---|---|---|
| 0.00 | 86.14 | 86.14 |
| 0.25 | 86.14 | 86.14 |
| 0.50 | 86.14 | 86.14 |
| 0.75 | **128.60** | **128.60** |
| 1.00 | **149.39** | **149.39** |

`is-ready` is set on both wrappers; the canvas buffer sizes itself to `1200 × 675` (from the
unstyled `300 × 150` default), which only happens once a frame has actually been drawn.

**Reduced motion — SIMPLIFY, with a discriminating control.** Under `reduce` every sample
returned luma `0` on both instances: the canvas never draws, `is-ready` is never set, and the
poster remains the whole story. Two arms, opposite results, same page and build.

## Asset pipeline (FR-38-9 explicitly scopes this into the block)

`scripts/image-sequence-prep.py` documents the frame convention `frame_0001.webp` (1-based,
underscore, zero-padded). The fixture initially used `frame-0000.webp` and every frame
404'd — **a fixture bug, confirmed against the tool's README before any code was touched**,
not a runtime defect. Renaming to the documented convention made the sequence scrub. That is
also a real (if accidental) test that the runtime honours the documented naming contract.

## Editor surface (D388)

2 instances present, selectable, **13 inspector panels**, zero crash surfaces. Canvas shows
the poster frame, matching §9's editor story for this effect.

## What this report does NOT claim

- No human eye has judged the scrub's smoothness (R-31-13 not yet given).
- Only the DESKTOP tier was exercised; `tabletFramesUrl` / `mobileFramesUrl` were left unset,
  so the resolution-ladder fallback is UNMEASURED.
- Frames were synthetic fixtures, not real video output. The prep script's own
  video→frames path was not run in this session.
