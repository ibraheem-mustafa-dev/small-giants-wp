---
block: testimonial
date: 2026-07-18
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — `sgs/testimonial` inline-zero (D345, GOTCHA-F fix) — 2026-07-18

Wave-2 of the framework-wide inline-zero rollout (Spec 32 FR-32-4 as amended
2026-07-18 / D345). Block-private conversion — exact mirror of the `sgs/info-box`
exemplar (converted by a `wp-sgs-developer` agent; diff reviewed + live-verified
by the main session).

## What changed (inside `src/blocks/testimonial/`)

- **render.php** — the per-instance `$styles` array (`--sgs-hover-bg/text/border`,
  `--sgs-transition-duration/easing`, `--sgs-hover-scale`, `--sgs-hover-shadow`,
  `--sgs-stagger`) previously written to `$root_attr_args['style']` and rendered
  inline now split: the three hover COLOURS emit as a scoped
  `.{uid}.wp-block-sgs-testimonial:hover{ background-color / color / border-color }`
  rule (only when set; specificity 0,3,0 beats the variant base — variant-safe);
  the transition / scale / shadow / stagger vars fold into a scoped
  `.{uid}.wp-block-sgs-testimonial{ … }` base rule. The `'style'` key was dropped
  from `get_block_wrapper_attributes()`.
- **style.css** — deleted the three `[style*="--sgs-hover-*"]:hover`
  presence-selectors (footprint GOTCHA F) — that inline-attribute-presence gate
  silently stops matching once the var moves scoped. Replaced by the render.php
  scoped `:hover` rule above.

block.json already declared `__experimentalSkipSerialization` per-feature. No
value changed; no version bump; no `deprecated.js` (D270).

## Live verification — palestine-lives.org homepage (4 instances)

| Check | Result |
|---|---|
| testimonial-block elements carrying an inline `style` attr | **0** (was 4) — `getAttribute('style')` null |
| scoped base rule in collected CSS | `.{uid}.wp-block-sgs-testimonial{ … }` present |
| computed `--sgs-transition-duration` | `300ms` → transition `0.3s` (resolves from scoped rule) |
| scoped `:hover` rule | none emitted — none of the 4 live instances have hover colours set (correct: emits only when configured) |

*(The 1 remaining `wp-block-sgs-testimonial-slider` inline on the page is a
different block — `sgs/testimonial-slider`, which is wrapper-based and deferred to
the `SGS_Container_Wrapper` design-gate, not this conversion.)*

## first_paint_capture_passed

Desktop screenshot (`wave2-icon-testimonial-postD345.png`) — the "Our Partners
Love Us!" testimonial card (5-star rating, quote, Sarah Mitchell / Restaurant
Owner) renders correctly at first paint with zero inline styling on the block.
