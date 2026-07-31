---
verdict: PASS
first_paint_capture_passed: true
block: sgs/before-after
date: 2026-07-31
spec: 38
wave: C
surface: frontend + block editor
canary: https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-wave-c/ (page 2075)
harness: plugins/sgs-blocks/scripts/motion-qa/probe-wave-c.mjs + probe-wave-c-editor.mjs
---

# sgs/before-after (NET-NEW) — Spec 38 FR-38-13 (Wave C)

## First paint (no JS help required)

Two instances on one page. Instance 1 `912 × 360`, instance 2 `1200 × 360`, both
`opacity: 1` / `visibility: visible`. **4 `<img>` elements across the two blocks** — both the
before and the after image are always in the markup, so a visitor with JS blocked still gets a
real comparison. Zero page errors, zero failed requests.

## Per-render fatal class — the thing a single-instance page cannot test

A top-level `function` declared in a `render.php` fatals on the SECOND instance. This block's
image helper was written as a closure specifically to avoid that, and the previous session
recorded the case as **owed and unproven**. It is now proven: **two instances render on one
page with zero PHP fatals** (page HTML contains no `Fatal error`, HTTP 200, 169 KB).

## Named observable signal — measured

The divider position lives in `--sgs-before-after-position` on the block root.

| Layer | Arm | before | during | settled |
|---|---|---|---|---|
| GSAP drag on the image area | no-preference | 50 | **40** | 40 |
| GSAP drag on the image area | reduce | 50 | **40** | 40 |
| Native range input | no-preference | 40% | — | **17%** |
| Native range input | reduce | 40% | — | **17%** |

A full pointer trail was captured to confirm it TRACKS rather than jumps:
`50% → 78 → 75 → 71 → 68 → 64 → 61 → 57 → 54 → 50 → 47 → 44 → 40%` — twelve distinct
intermediate values following the pointer across the stage.

**Reduced motion is deliberately IDENTICAL here, and that is the pass condition, not a
missing control.** §10 classifies drag as SIMPLIFY: it is user-driven input, so it must keep
working under `reduce`. This block has no momentum to drop in the first place (a comparison
divider must stop exactly where released, so InertiaPlugin is deliberately unused), so
"unchanged under reduce" IS the contract. The discriminating control for the whole run lives
on `sgs/gallery` and `sgs/image-sequence`, where the two arms genuinely diverge — proving the
emulation was live during these readings rather than inert.

## A false alarm I recorded against myself

An earlier run reported instance 2's divider as "never moved" (50 → 50). It had moved through
twelve values and landed back on 50 by arithmetic coincidence: the drag started at 80% of a
1200px stage (960px) and travelled 360px, and 600/1200 is exactly 50%. Reading only the
endpoints made a working block look broken. The trail capture above exists because of that.

## Editor surface (D388) — a REAL defect found and fixed

The editor probe found `sgs/before-after` returning **HTTP 400** from
`/wp/v2/block-renderer/sgs/before-after`, so the block showed "Preview failed to load" for
every instance while the frontend rendered perfectly.

Cause: `<ServerSideRender>` serialises an unset attribute as an EMPTY STRING, and eight
attributes were declared as plain `integer`/`number` with a `null` default
(`beforeImageId`, `afterImageId`, `labelFontSize`, `labelFontSizeTablet`,
`labelFontSizeMobile`, `labelLineHeight`, `heightTablet`, `heightMobile`). The REST schema
rejects `""` for those types. Fixed to the house convention `[ <numeric>, "string" ]`
(`sgs/heading`, `sgs/text` already do this). `render.php` already coerces with `(int)` or a
null check, so no rendered output changes.

**No frontend check could ever have caught this** — that is precisely why D388 requires opening
the real editor.

Post-fix: 2 instances present, selectable, **13 inspector panels**, zero crash surfaces.

## What this report does NOT claim

- No human eye has judged the drag's feel (R-31-13 not yet given).
- Vertical orientation is unmeasured; only `orientation: horizontal` was exercised.
- Touch drag is unmeasured — the range input carries native touch by construction, but that is
  a reading of the markup, not a device measurement.
