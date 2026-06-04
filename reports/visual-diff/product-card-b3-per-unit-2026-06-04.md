---
block: sgs/product-card
date: 2026-06-04
unit: Spec 27 Phase 2 — B3 per-unit pricing + unit label + cosmetic discount badge + I2 auto-contrast (theme thread)
verdict: PASS
first_paint_capture_passed: true
canary: https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/ (fixture 540)
note: Bound (wc-product) branch only; .product-card--bound-scoped CSS only. Typed page-144 clones untouched (scope guardrail blub.db 304). Built on top of the cloning WS-4 wrapper-mirror.
---

# product-card B3 per-unit + discount badge — visual-diff PASS

## What changed
- `class-product-manifest.php`: each combo now carries `unitDivisor` / `unitLabel` / `discountLabel` (read from the registered variation postmeta, re-sanitised). Cache key bumped `v2`→`v3` so stale combos rebuild.
- `render-helpers.php`: `sgs_configurator_per_unit_display()` (price ÷ divisor → "£x per <label>", derived live, never stored) + `sgs_resolve_palette_hex()` (resolve a theme.json palette slug to hex from the MERGED global settings — honours the live `wp_global_styles` post).
- `product-card/render.php`: SSR per-unit `.price-note--per-unit` + discount badge (`wp-block-sgs-label is-style-pill-wrap product-card__discount-label`) with build-time WCAG auto-contrast text against the resolved primary (FR-27-I2). Bound branch only; SSR literals seeded into `data-wp-context` (SSR-wipe-safe).
- `product-card/view.js`: `perUnitDisplay()` mirrors the PHP exactly (SSR==swap parity); per-unit + badge recompute on pill-swap; invalid-combo branch resets both. `split('%s').join()` matches PHP sprintf replace-all.
- `product-card/style.css`: new `.product-card--bound .price-note--per-unit` + `.product-card--bound .product-card__discount-label` (ports the sgs/label pill-wrap look, since the label block's own CSS only enqueues with a real label block). version 1.8.0→1.9.1.
- `configurator-variation-fields.php` (new): friendly WC variation-editor fields for divisor / unit-label / discount-label (per-object `edit_post` cap + WC's own save nonce + registered sanitisers; SEC-4 digit-strip on the discount label).

## Live verification (canary 540, isolated Chrome via chrome-devtools)
- **Per-unit derived live**: default 12-pack → "£0.83 per bar" (9.99 ÷ 12); select vanilla + 48-pack → "£0.51 per bar" (24.49 ÷ 48), recomputed with **0 XHR**. SSR span text == seeded `perUnitDisplay` literal (parity holds).
- **Discount badge**: hidden on the default combo (empty `discountLabel`); appears as "Best value" on the sale variation (48-pack/vanilla). Hidden via `data-wp-bind--hidden` mirroring the `hideSale` pattern.
- **I2 auto-contrast (universal)**: badge bg = brand primary `rgb(230,138,149)` (pale pink) → helper resolved the primary hex and emitted inline `color:#000` → measured **8.43:1** (was 2.25:1 with the design-system surface default). Passes WCAG AA. A dark/saturated client primary would receive `#fff` automatically.
- **Per-unit note contrast**: `#6b5c50` on `#fff` = 4.55:1 ✓ (13px normal).
- **Headline swap intact**: 48-pack/vanilla shows £24.49 / ~~£34.99~~ / "30% off" alongside the new lines (no regression to TAX-UI / pctDisplay).
- **D168 `?ver` parity**: served `product-card/view.js?ver=f41290f08031ad2bc4f4` == deployed `view.asset.php` (the new ES module is executing, not a cached stale one).
- **Console**: no new errors (pre-existing favicon 404 only).

## Additive-safety (page-144 Typed clones)
All B3 CSS is `.product-card--bound`-scoped; all B3 render code is inside the `wc-product` + `is_variable` branch (Typed branch returns earlier, untouched). No existing shared CSS rule modified.

## Gates
- `php -l` clean + WPCS 0 errors on all touched PHP.
- Sonnet security/correctness review: **SAFE-TO-COMMIT** (no blockers; capability + nonce + sanitise + escape all confirmed; SSR==swap parity confirmed; scope-safe). Two hygiene notes applied (locale-divergence JSDoc + sprintf-parity split/join).
- Formal cross-family ESCAPE-AUDIT qc-council + axe-0 + 3-breakpoint + Bean R-22-13 = the QA-VIS / ESCAPE-AUDIT gates after Cluster A (per plan).
