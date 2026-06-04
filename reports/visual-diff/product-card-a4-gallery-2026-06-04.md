---
block: sgs/product-card
date: 2026-06-04
unit: Spec 27 Phase 2 — A4 per-variation image gallery (theme thread)
verdict: PASS
first_paint_capture_passed: true
canary: https://sandybrown-nightingale-600381.hostingersite.com/sgs-configurator-test-540/ (fixture 540)
note: Bound (wc-product) branch only; .product-card--bound-scoped CSS only; Typed page-144 clones untouched (blub.db 304).
---

# product-card A4 per-variation gallery — visual-diff PASS

## What changed
- `class-product-manifest.php`: each combo carries a `gallery` array (`{url,w,h,alt}` from `_sgs_variation_gallery`, fallback chain gallery→variation→parent→[]); `imageUrl` made authoritative = `gallery[0]` when a gallery exists (A4 fix — a variation with a gallery but no featured image was rendering the no-image placeholder). Cache key v3→v5.
- `product-card/render.php`: CLS-0 `.product-card__media` aspect-ratio box (from default image w/h) + seeded `width`/`height` on the main `<img>`; SSR thumbnail strip `.product-card__thumbs` (no-JS-safe, hidden <2 imgs); `data-wp-on--pointerenter/focusin` prefetch hook (no colon — binds correctly). Context: `gallery`/`thumbsHidden`/`selectedThumb` seeded (SSR-wipe-safe).
- `product-card/view.js`: gallery swap on pill-select (set + main image + reset thumb); **`renderThumbStrip()` rebuilds the strip imperatively on swap** (createElement, never innerHTML); **delegated click listener in `initPillBridge`** handles SSR + rebuilt thumbs (the Interactivity API does NOT bind `data-wp-on` on imperatively-injected nodes — orchestrator caught + fixed this); `prefetchGallery` fires once per card on first interaction (WeakSet-guarded).
- `product-card/style.css`: new `.product-card--bound` `.product-card__media`/`__thumbs`/`__thumb` rules (48×48 ≥44px tap target, aria-current ring). No existing rule modified.
- `configurator-variation-fields.php`: media-gallery picker field for `_sgs_variation_gallery` (multi-select wp.media, saved via the registered `sanitize_id_array`).
- block.json 1.9.1→1.10.0.

## Live verification (canary 540, chrome-devtools, isolated)
- **Main image renders gallery[0]** (was the no-image placeholder pre-fix): default vanilla|12 → `cookies-stacked` (gallery[0]); `mainHasDims=true`.
- **CLS 0**: `.product-card__media` computed `aspect-ratio: 300/300`; main img width/height seeded.
- **Thumbnail click swaps main image**: click thumb[2] → main → `aesthetic-pic` (gallery[2]); `aria-current` moves to 2. Delegation works.
- **Strip rebuilds on swap** (the orchestrator-caught bug): vanilla|12 (3 thumbs) → vanilla|48 (no gallery → strip rebuilt empty + hidden) → chocolate|12 (strip rebuilt with 3 thumbs, aria-current reset to 0).
- **Fallback chain**: vanilla|48 (no `_sgs_variation_gallery`) → main shows the parent image (not placeholder); thumbs hidden.
- **44px**: thumbs render 48×48.
- **Prefetch**: `data-wp-on--pointerenter/focusin` → once-per-card `prefetchGallery` (WeakSet-guarded); never on select.
- **D168 ?ver parity**: served `view.js?ver=eb1dbf42b6d3045d76c5` == deployed view.asset.php.
- **Console**: 0 errors / 0 warnings.

## Additive-safety (page-144 Typed clones)
All A4 CSS `.product-card--bound`-scoped; all A4 render code inside the `wc-product`+`is_variable` branch (Typed branch returns earlier, untouched). No existing shared CSS rule modified.

## Gates
- `php -l` + WPCS 0-errors on all touched PHP. Orchestrator caught + fixed 2 real bugs the agent missed: (1) thumb strip didn't rebuild on swap + injected-node directive non-binding → delegation + imperative rebuild; (2) gallery-without-featured-image rendered the placeholder → imageUrl=gallery[0] authoritative.
- Formal axe-0 + 3-breakpoint + Bean R-22-13 = the QA-VIS gate after Cluster A.
