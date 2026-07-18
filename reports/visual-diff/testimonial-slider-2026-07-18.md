---
block: testimonial-slider
date: 2026-07-18
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — `sgs/testimonial-slider` inline-zero Facet B — 2026-07-18

Framework inline-zero rollout (Spec 32 FR-32-4 as amended D345), Facet B.
Converted by a `wp-sgs-developer` agent; reviewed + live-verified.

## What changed (`src/blocks/testimonial-slider/`)

- **style.css** — the 3 `.sgs-testimonial-slider[style*="--sgs-hover-*"]:hover`
  presence-selectors deleted; hover colours now emit as a scoped
  `{root_sel}:hover{…}` rule from render.php (current info-box pattern, only when
  set). The old `:has(--sgs-hover-bg)` gate — which was invalid CSS that never
  matched — was replaced by an unconditional base `transition-property` rule.
- **render.php** — the block-private `--sgs-slides-visible` value that was printed
  inline as `style="--sgs-slides-visible:N"` on `.sgs-testimonial-slider__track`
  now emits into the block's existing scoped-CSS mechanism (`$slider_scoped_css` →
  `{root_sel} .sgs-testimonial-slider__track{--sgs-slides-visible:N}`);
  `$track_style_attr` is now always empty.

No value/var-name changes; no block.json change; no version bump.

## Live verification — palestine-lives.org homepage ("Our Partners Love Us!" slider)

| Check | Result |
|---|---|
| testimonial-slider inline `style` on the block/track | **0** (was 1 on `__track`) |
| render.php `style="--` literal | 0 (`php -l` clean) |
| 0 live `[style*="--sgs"]` presence-selectors in style.css | yes (1 hit is a comment) |
| slider renders (rating, quote, attribution, controls) | yes (screenshot `wave2-icon-testimonial-postD345.png` earlier + facetB re-verify) |

## first_paint_capture_passed

The "Our Partners Love Us!" testimonial slider renders correctly at first paint
with zero inline styling on the block/track; no regression.
