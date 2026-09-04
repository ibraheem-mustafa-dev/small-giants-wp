# Visual diff — sgs/brand-strip — 2026-09-04

verdict: PASS
intent_capture_passed: true
source_sha: 89088c12f67811b7

## What changed

Spec 35 Part 4, fourth and final target block. `logos` gains a per-item `objectFit` control
(Cover/Contain) — no focal-point/crosshair, matching the block's OWN pre-existing `logoFit`
convention (already object-fit-only, no crosshair). The single block-wide `logoFit` control
stays as the default for items without their own override; per-item CSS is keyed by a new
`data-logo-key` attribute, reusing `sgs_media_position_css()`.

## Why intent capture, not before/after

No existing content can set the new per-item field, so before/after shows nothing by
construction. The real question is whether the mechanism produces distinct per-item CSS.

## Live capture — real canary, generated stylesheet

Probe: page `spec35-item3-brandstrip-probe` (created via REST, live-verified, then deleted), two
logos:
- Logo A: `_key: bsprobe-a`, `objectFit: contain`
- Logo B: `_key: bsprobe-b`, `objectFit: cover`

Fetched the generated stylesheet (`<link id="sgs-blocks-collected-css">`, same
P-STYLE-TAG-CONSOLIDATION mechanism documented in the card-grid report):

```
[data-logo-key="bsprobe-a"] img{object-fit:contain;}
[data-logo-key="bsprobe-b"] img{object-fit:cover;}
```

Both rules present, correct, and distinct. **PASS.**

## Risk

Additive only. The pre-existing block-wide `logoFit` mechanism is untouched and still applies as
the default when a logo has no per-item override.

## Gates

`php -l` clean · WPCS clean · `npm run build` 0 · fast-tier gates 88/88 · deployed +
live-verified on the real canary.
