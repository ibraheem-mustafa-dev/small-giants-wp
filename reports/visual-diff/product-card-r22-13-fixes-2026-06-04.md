---
block: sgs/product-card
date: 2026-06-04
unit: Spec 27 Phase 2 — R-22-13 sign-off fixes (image box, Sale badge, editable image height) + escape-audit imageAlt
verdict: PASS
first_paint_capture_passed: true
canary: https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/ (fixture 540)
note: Bound branch only; .product-card--bound-scoped. From Bean's R-22-13 review of Cluster A.
---

# product-card R-22-13 fixes — visual-diff PASS

## What changed (Bean's R-22-13 feedback)
1. **Image box sizing** — replaced the A4 aspect-ratio media box (which rendered a 378px square → over-zoomed, cropped to bottom-middle) with the mockup draft's fixed-height box: `.product-card__media { height: var(--sgs-product-card-image-height, 220px) }` + image `object-fit:cover; object-position:center`. Removed the per-render aspect-ratio inline style. Image now fills 100% width at a fixed 220px height, centred. Fixed height = CLS 0.
2. **Editable image height** (Bean: must be a block attr like everything else) — NEW `imageHeight` block attribute + inspector "Image height" TextControl (edit.js) + overridable `--sgs-product-card-image-height` var (render.php emits it inline on the wrapper via the same anchored CSS-length allowlist as cardMaxWidth; :root default 220px). Editable per-instance (block editor) AND site-wide (theme/global styles).
3. **Sale badge** — an on-sale variation now shows a **"Sale"** badge (limited-time urgency) instead of the cosmetic "Best value"; non-sale variations still show the author's `_sgs_discount_label`. `saleLabel` literal seeded for SSR==swap parity; view.js branches on `combo.saleMinor`.
4. **imageAlt double-encode (escape-audit P-IMAGEALT-DOUBLE-ENCODE)** — `class-product-bindings.php` now `sanitize_text_field()`s `image_alt` at storage (was `esc_attr()` → double-encode on the JS swap); every output consumer still `esc_attr()`s at the output layer (verified render.php 152/351/637 + JSON-encoded context seeds). Resolved.

## Live verification (canary 540, chrome-devtools)
- **Image box height = 220px** (was 378 square); `object-fit:cover`. Image centred, fills width, no over-zoom.
- **Editable height**: default 220px; setting `--sgs-product-card-image-height:160px` on the wrapper → media box = 160px (`varRespected:true`) — proves the inspector-control/theme-default plumbing.
- **Sale badge**: select vanilla|48-pack (on sale) → badge text = **"Sale"**, not hidden.
- **axe-core**: 0 violations on `.product-card--bound` (re-run after the fixes).
- **D168 ?ver parity** held on each deploy.
- **Console**: 0 errors.

## Additive-safety
All `.product-card--bound`-scoped; Bound branch only; Typed page-144 clones untouched. CSS injection guarded by the anchored CSS-length regex (shared with cardMaxWidth, D156) + esc_attr.

## Gates
- `php -l` + WPCS 0-errors on all touched PHP. axe-0. Bean R-22-13: points 1–3 sign-off addressed; image-zoom + Sale-badge fixes confirmed by Bean's exact prescription.
