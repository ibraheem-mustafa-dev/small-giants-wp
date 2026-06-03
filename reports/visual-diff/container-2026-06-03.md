---
doc_type: report
block: sgs/container
generated: 2026-06-03
verdict: PASS
first_paint_capture_passed: true
---

# Visual diff — sgs/container (WS-1 A1+A2: contentWidth + faithful section width transfer)

## verdict: PASS
## first_paint_capture_passed: true

Server-rendered dynamic block (no animation/first-paint JS). The new `__inner` content-cap div is emitted by render.php at request time and is present in the first server response — no client-side reflow, no FOUC. Verified on canary page 144 (full-page screenshots at 1440; no flash/jump on load).

## Change
- **A1 (block):** new `contentWidth` attr on sgs/container. render.php wraps `$content` in `<div class="sgs-container__inner" style="max-width:<contentWidth>;margin-inline:auto">`, guarded to `'' === $layout` (never wraps a direct grid/flex container — would collapse the layout). + `.sgs-container__inner { box-sizing:border-box; width:100% }` in style.css + editor.css; + a "Content width" TextControl in edit.js. block.json version 0.1.0 → 0.2.0. Additive attr on a dynamic block (save = `<InnerBlocks.Content/>`) → no deprecated.js needed.
- **A2 (converter):** slug-None section path transfers the section's OWN max-width → widthMode (absent → `full`/alignfull → escapes WP's per-container `:not(.alignfull)` 1200 cap; present → `custom`+customWidth). The fold lifts the folded `__inner`'s max-width → `contentWidth` (was dropped).

## Evidence (live-DOM, R-22-11, draft localhost :8137 vs canary page 144 @1440)

| Section | Draft (target) | Clone BEFORE | Clone AFTER | Verdict |
|---|---|---|---|---|
| featured-product | full-bleed 1425 / inner 1040 | 1200 / inner DROPPED | **1425 alignfull / `__inner` 1040** | PASS |
| ingredients-section | full-bleed 1425 / inner 960 | 1200 / DROPPED | **1425 / 960** | PASS |
| gift-section | full-bleed 1425 / inner 960 | 1200 / DROPPED | **1425 / 960** | PASS |
| social-proof | full-bleed 1425 / inner 960 | 1200 / DROPPED | **1425 / 960** | PASS |
| brand | 1000 (own section max-width) | 1000 | **1000 (widthMode:custom, NOT full)** | PASS |
| hero / trust-bar | 1425 full-bleed | 1425 | 1425 (unchanged — composites, out of A1/A2 scope) | PASS |

- All sections textLen healthy (104–647) — no empty-section false win (memory `empty-section-false-pixel-diff-win`).
- 768/375 regression guard: all sections fill the viewport, content readable, no breakage. The one horizontal overflow is `sgs-testimonial-slider__track` (the carousel's own scroll track — pre-existing, not this change).
- Cap source pinned: WP `.wp-container-…-is-layout > :where(:not(.alignfull)) { max-width:1200px }` (spec (0,2,0)); `alignfull` is the native escape (proven by hero/trust-bar).

## Design-gate + regression check
- 3-rater `/qc-council` validated the fix-shape pre-build: inner-wrapper model (not `:where` cap-each-child), `layout!=''` guard, `_match_theme_width` custom case, A1+A2 atomic; refuted the `style.dimensions.maxWidth` shortcut (would cap the box and fight alignfull).
- Featured-product regression check (it is one of the 4 target sections): #3 heading-centre originates on `.wp-block-sgs-heading` (the `__inner` wrapper computes `text-align:start`); #4 product-card width is on the card (grid stays 640/384). Both PRE-EXISTING, not caused by A1/A2.

## Review
Build PASS (`npm run build`), render.php copied to build/, deployed to canary, re-cloned page 144, live-DOM measured. Structural parity per FR-22-18 (R-22-4/9/11/13/18). Bean visual review in progress; separate page-level issues (composites #1/#2, content-routing #3–#8, image sideload) tracked for the WS-4 + triage workstream — out of A1/A2 scope.
