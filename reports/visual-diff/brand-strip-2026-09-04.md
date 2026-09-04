# Visual diff — sgs/brand-strip — 2026-09-04

verdict: PASS
intent_capture_passed: true
source_sha: 6660324c3c70a1d2

## Update — second change, same day, same block (D777 tier-migration residual)

`columns` (`columnsDesktop`/`columnsTablet`/`columnsMobile`, 3 flat scalars) migrated to one
tier object `columns: {desktop,tablet,mobile}` — the last of the 3-family blind spot
`migrate-tier-object.py`'s detector couldn't see before today (base declared as
`columnsDesktop`, not bare `columns`). S1 (block.json) + S2 (edit.js — kept the existing
`<ResponsiveControl>` wrapper, not `<ResponsiveOverride>`, since each tier always carries its
own concrete default and a different `RangeControl` max, never inheritance semantics) + S3
(render.php, raw bracket reads → `sgs_responsive_normalise_object()`). `--check` green.

**Live verification (real canary, deployed):** created a temporary probe page (ID 3250,
`sgs/brand-strip` with `columns:{desktop:6,tablet:3,mobile:1}`), loaded it, read the
`--sgs-columns-{desktop,tablet,mobile}` custom properties via `getComputedStyle` —
**`6/3/1`, exact match** — then deleted the probe page. Pre-deploy, the same check against
the not-yet-deployed code correctly showed the OLD defaults (`8/4/2`), confirming the test
was actually exercising the new code path once deployed, not a stale cache.

This section's `source_sha` covers BOTH changes on this block today (the per-item
`objectFit` control below, and this migration) — the file describes today's cumulative
staged state, per the one-report-per-block-per-day convention.

## Original report — per-item objectFit control (first change today)

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
