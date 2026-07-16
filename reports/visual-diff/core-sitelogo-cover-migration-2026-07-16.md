# Visual-diff report — core/site-logo → sgs/responsive-logo, core/cover → sgs/hero, 2026-07-16

verdict: PASS
first_paint_capture_passed: true

## What changed
| pairing | swept | refused | files |
|---|---|---|---|
| core/site-logo → sgs/responsive-logo | 3 | 0 | 3 |
| core/cover → sgs/hero | 1 | 0 | 1 |

Safe-zone replaceable: **190 → 185**. Theme Version → 1.5.30.

Track-A safety check before touching `header-centred/full/minimal.php`: none are
in the prompt's hands-off list (only `header-search-*.php` is), none are dirty in
Track A's tree, and their last commits predate the adaptive-nav rebuild — which
targets the template PARTS + `src/blocks/adaptive-nav`, not these pattern files.

## core/site-logo → sgs/responsive-logo (3)
Clean 1:1: `width` (number→number, no unit parsing — both `type:"number"`),
`isLink`→`linkToHome` (same semantic AND same default), `style.spacing` 1:1.
`shouldSyncIcon` dropped-with-reason: it's a WP Customizer site-icon-sync flag
with no `sgs/responsive-logo` concept (absent from block.json, never referenced
in render.php). `linkTarget` refuses on any non-`_self` value — render.php
hardcodes `rel="home"` and never emits `target=`, so carrying it would be a lie.

## core/cover → sgs/hero (1) — a genuine N→1 structural reshape
Not a swap: the cover's inner content column is rebuilt as typed hero children.
Emitted:
```
<!-- wp:sgs/hero {"backgroundOverlayColour":"primary-dark","backgroundOverlayOpacity":70,
     "minHeight":"600px","style":{"spacing":{...}},"align":"full"} -->
  <!-- wp:sgs/heading {... "className":"sgs-hero__headline"} /-->
  <!-- wp:sgs/text {... "className":"sgs-hero__subheadline"} /-->
  <!-- wp:sgs/multi-button {"justifyContent":"center", ...}> … <!-- /wp:sgs/multi-button -->
<!-- /wp:sgs/hero -->
```
Mapped: `overlayColor`→`backgroundOverlayColour` (via shared `sgs_colour_value()`,
resolves slug or hex), `dimRatio`→`backgroundOverlayOpacity` (both plain 0-100),
`minHeight`+unit→`minHeight` (unit-embedded string), `focalPoint{x,y}`→
`imageObjectPosition` (0-1 → %), `hasParallax`→`bgParallax`, `url`+`id`+`alt`→
`backgroundImage{url,id,alt}`.
Refuses (no verified mapping — never a silent drop): `useFeaturedImage:true`,
`isRepeated:true`, non-image `backgroundType`, `gradient`/`customGradient` (hero
wants discrete from/to/angle, not a preset slug), `contentPosition`.

### The `align` blocker — closed by a driver fix, not a workaround
The pairing agent correctly refused `align:"full"`: `sgs/hero` declares
`supports.align:["wide","full"]` but does NOT list `align` in its static
block.json `attributes`, so the gate saw an undeclared attr. Dropping it would
collapse a full-bleed hero to constrained width — a real regression.
**Root cause was mine:** `load_target_schema()` read only block.json's static
`attributes` and ignored the attrs WP INJECTS at registration from `supports`.
Fixed this session (same fix that unblocked sgs/multi-button's
`backgroundColor`): the schema is now derived from supports, so `align` is
legitimately emittable — and a colour/align attr emitted at a block WITHOUT that
support is still caught as the silent-discard bug it would be.

## Live evidence (canary 1485 vs 1486, caches cleared, content-keyed rule 4a)
**10 of 10 text nodes preserved** — no content lost in the reshape. Headline
identical. One diff:

| node | before (core) | after (sgs/hero) |
|---|---|---|
| subheadline | fontWeight 400, lineHeight 32px | **500 / 30px** |

Cause: the text is now a `sgs/hero__subheadline` child and the hero styles its
own named elements. Same class as the sgs/button restyle — the SGS component
brings its own design. Not a transform defect; flagged for the eye.

No horizontal overflow at 375/768/1440.
Captures: `core-cover-to-hero-2026-07-16-{mobile,tablet,desktop}.png`.

## Flagged
- The cover content-reshape path had never run with `--write` before this (the
  `align` refusal blocked it every time). It is now exercised on the one real
  instance and live-verified above — but it is the only instance, so the path is
  proven by n=1.
- `parts/sidebar.html` (the latest-posts swap, previous commit) is referenced by
  NO template — that swap is correct but currently inert on the live site.
