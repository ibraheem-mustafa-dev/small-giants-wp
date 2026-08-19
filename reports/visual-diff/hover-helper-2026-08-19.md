# Hover helper — live canary verification (8 blocks)

```
verdict: PASS
intent_capture_passed: true
blocks: info-box, hero, process-steps, cta-section, post-grid, card-grid, testimonial, testimonial-slider
target: sandybrown-nightingale-600381.hostingersite.com
date:   2026-08-19
```

Discharges the eight scoped visual-gate skips logged in `manual-skips.log` for the
`sgs_emit_state_colour_css` rollout. Single capture after all eight landed, rather
than eight deploys.

## Assertion under test

Every converted block emits its hover colour as a **real scoped declaration**
paired with `:focus-visible`, and no block still routes hover colour through a
`--sgs-hover-*` custom property read back by a static `style.css` rule.

## Method

⚠ **Page HTML is the wrong instrument here.** This plugin LIFTS block CSS into
`wp-content/uploads/sgs-css/sgs-{postid}-{hash}.css`; grepping the page proves
nothing. Two probe pages were published with all three hover-colour attributes
set, their lifted stylesheets fetched over HTTPS, and the rules read from there.
Probe pages deleted afterwards.

⚠ A first pass reported "no hover rules" and was WRONG — the grep was piped
through `head -6` and truncated before reaching them. Recorded because it is the
repo's own standing rule ("never pipe a population-defining survey through
`head -N`") failing in the hands of the person quoting it.

## Result — root-hover blocks

All five emit the identical shape, `{uid}{block}:hover,{uid}{block}:focus-visible`
carrying `background-color` + `color` + `border-color` as real declarations:

- `sgs/info-box` — `.sgs-info-box-a7b1500c.sgs-info-box`
- `sgs/cta-section` — `.sgs-cta-section-7b5110d1.wp-block-sgs-cta-section`
- `sgs/process-steps` — `.sgs-proc-af700c14.sgs-process-steps`
- `sgs/testimonial` — `.sgs-testimonial-9b38b769.wp-block-sgs-testimonial`
- `sgs/hero` — `.sgs-hero-1f021926.wp-block-sgs-hero`
- `sgs/testimonial-slider` — `.sgs-testimonial-slider-0b6b4976.wp-block-sgs-testimonial-slider`

## Result — child-selector blocks

`sgs/card-grid` scopes to the repeated child, proving the helper's `$selector`
argument works:

```
.sgs-cg-36c43fc5.wp-block-sgs-card-grid .sgs-card-grid__item:hover,
.sgs-cg-36c43fc5.wp-block-sgs-card-grid .sgs-card-grid__item:focus-visible
  {background-color:…primary;color:…text-inverse;border-color:…accent}
```

`sgs/post-grid` renders exactly the three-way structure its commit reasoned to:

- background — **one** rule on `.sgs-post-grid__card`; the old per-variant split
  existed only to carry different `var()` fallbacks, and collapsed once those went;
- border — genuinely does **not** collapse: `:not(--minimal)` sets `border-color`,
  `--minimal` sets `border-top-color` (it has no side border at rest, only a 2px
  top accent). A structural difference, not a fallback difference;
- text — four descendant rules pairing **`:focus-within`**, not `:focus-visible`,
  because the element receiving focus is a descendant, not the card.

## Not covered

- **No before/after pixel diff.** These are additive CSS changes on a state no
  stored canary content exercised — a live query for any published post setting
  `backgroundColourHover`/`textColourHover`/`borderColourHover` returned nothing,
  which is why probe pages were needed at all. Nothing visible changed for
  existing content by construction.
- **The one intended behavioural change is not visible here:** `sgs/cta-section`
  and `sgs/post-grid` previously painted a hardcoded hover colour when the
  operator had set none (`primary-dark`, `--sgs-card-bg`). Those fallbacks were
  deleted per Bean's ruling, so unset now means no hover. Verified by absence:
  neither block emits a hover rule when the attributes are empty.
- **`sgs/button` is exempt** (D677b) and was not touched.
