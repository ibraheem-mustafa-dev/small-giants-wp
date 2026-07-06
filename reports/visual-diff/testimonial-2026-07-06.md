# Visual diff — sgs/testimonial — 2026-07-06

verdict: PASS
first_paint_capture_passed: true

## Change under review

Part of the testimonial-slider layer-model reframe: the inner `sgs/testimonial` card is now
the single owner of card chrome, and it can inherit a default variant from a parent slider.

- **block.json:** added `usesContext: [ "sgs/testimonialVariant" ]`; `variant` default
  `classic-card` → `""` (empty = inherit); `""` added to the `variant` enum; version bumped
  → **0.3.4**.
- **render.php:** effective-variant resolution — `own variant` if set, else the parent
  slider's context value (`$block->context['sgs/testimonialVariant']`), else the historical
  `classic-card` fallback. The `sgs-testimonial--{variant}` class uses the resolved value.
- **edit.js:** variant picker gains a leading "Inherit from slider" option (value `''`); the
  editor preview + gated controls use the effective variant (own || context || classic-card).

No card CHROME changed on this block — the 7 variants' `:where()`-scoped looks are untouched;
this change only affects WHICH variant is selected when the block's own value is empty.

## Evidence (live homepage / page 8, sandybrown, deployed 2026-07-06)

Playwright computed-style on the live inner card (`.sgs-testimonial--classic-card`): chrome
intact + correct — `boxShadow 0 4px 12px`, `background rgb(255,255,255)`, `borderRadius 12px`,
`padding 20px`. Page 8's cards carry an explicit `variant` (`classic-card`), so the render
fallback resolves to the own value — rendering unchanged vs before, confirming the default
change is non-breaking for existing content (empty→context→classic-card only fires when
nothing is set).

## Not exercised on page 8 (code-verified)
The inherit-from-context path (empty own variant → slider default) is not present on page 8
(explicit variants). Context keys + render fallback verified in source (standard WP block
context); a server-side render test was blocked by the wp-content guard. To confirm at editor use.
