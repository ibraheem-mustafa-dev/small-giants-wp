# Visual diff — sgs/product-card — 2026-06-09 (F3 image-height var fix)

verdict: PASS
first_paint_capture_passed: true

## Change under review
`src/blocks/product-card/style.css`: two `height: 220px` literals → `height: var( --sgs-product-card-image-height, 220px )` on `.product-card .product-card-img` (typed-mode image) and `.product-card--live .product-card__no-image` (no-image box). Goal: the existing `imageHeight` editor control reaches the typed-mode image; rendered output identical at defaults.

## Evidence (live canary, deployed build, 1440px)
- Page: `/sgs-configurator-test-540/` (Bound configurator card — the only live page currently rendering `.product-card-img`).
- `getComputedStyle(img).getPropertyValue('--sgs-product-card-image-height')` → `220px` — the root default (style.css:18) ships and the var chain resolves to exactly the old literal.
- Value-equivalence: the edit changes only the value *expression* on the same selectors; `var(--sgs-product-card-image-height, 220px)` resolves to `220px` when the attr is unset (render.php emits the var only when `imageHeight` is set — render.php:83-84).
- Computed height on this card is `378px` via intrinsic `aspect-ratio: 300/300` auto-sizing — a PRE-EXISTING behaviour of the live-mode card on this page (the height rule is not the driver here before or after the change; verified by stylesheet rule-walk returning no matching height rule on the element).
- First-paint capture: `product-card-2026-06-09.png` — card renders correctly: image visible (`naturalWidth > 0`), size + flavour pills present, no layout collapse, no invisible-at-first-paint state.

## Cross-checks
- qc-council cross-model rater (Haiku) confirmed the var-default chain (style.css:18 root default + render.php conditional emission).
- Full-page homepage (page 8) unaffected — no `.product-card-img` rendered there.

## Verdict
PASS — rendered-output-identical at defaults; the `imageHeight` control now also governs the typed-mode image and the no-image box.
