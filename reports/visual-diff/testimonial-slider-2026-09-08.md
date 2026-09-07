# Visual diff — sgs/testimonial-slider — 2026-09-08

verdict: PASS
intent_capture_passed: true
source_sha: ae8bef7b88d482ad

Captured with the payload-scoped dirty-tree route (`--payload plugins/sgs-blocks/src/blocks/testimonial-slider/`),
which exists precisely to break the deploy↔commit deadlock: the change had to be live on the
canary before it could be measured, and this report is that measurement.

## What changed

`.sgs-testimonial-slider` gained `width: 100%` alongside its existing `contain: inline-size`.

`contain: inline-size` (added 2026-07-18 to stop this block's min-content contribution forcing
an ancestor grid track wider on mobile) forces the element's own intrinsic inline size to 0.
That is harmless in block flow and in a grid track, where the used width comes from the
container. As a **flex item of a row container** — which `sgs/container` renders for its
default `layout:"flex"` — the initial `flex: 0 1 auto` resolves `flex-basis:auto` against the
element's own max-content contribution, which containment has just zeroed, and `flex-grow: 0`
never grows it back. The block and every descendant laid out at 0px wide.

The containment is retained (deleting it reintroduces the July mobile-overflow bug). `width`
was chosen over `flex: 1` / `flex-basis: 100%` deliberately: those act on the MAIN axis, so in
a `layout:"stack"` (column) container they would change this block's HEIGHT instead.

## Assertions — stated before measuring

1. The block root measures a real, non-zero width filling its container, at all three viewports.
2. An individual slide also measures non-zero width (the collapse propagated to descendants).
3. The nav arrows sit at the slider's own edges rather than floating detached outside it.
4. Review text is present and legible.

## Live results — measured on the canary (page 2742)

Measured via Playwright `getBoundingClientRect()` / `getComputedStyle()` on the live DOM.

```
.sgs-testimonial-slider
  1440px : 960   x 326    (was 0 x 879.6)
   768px : 712.8 x 394    (was 0 x ~771)
   375px : 320   x 370.5  (was 0 x ~771)

.sgs-testimonial-slider__slide
  1440px : 274.7 wide     (was 0)

nav arrows @1440px
  prev x=232.4  == slider left edge
  next right=1192.4 == slider right edge   (flush, not detached)

review text : rgb(107,92,80) on light card, 14px — legible
```

All four assertions hold. The previously reported symptom — a ~745-880px tall empty white box
showing only the "Trustpilot" header, with arrows floating outside it, and one-character-per-line
text in the editor canvas — is gone.

## Scope note

The fix is in the block's own stylesheet and is not page-specific: any instance of this block
placed inside a row-flex container was affected identically.
