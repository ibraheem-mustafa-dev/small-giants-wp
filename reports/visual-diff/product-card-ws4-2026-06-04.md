# Visual-diff — sgs/product-card WS-4 composite-mirror (content KIND) — 2026-06-04

verdict: PASS
first_paint_capture_passed: true

**Change:** WS-4 — product-card's outer element is now rendered by the shared `SGS_Container_Wrapper::render( …, 'content', opts )` across all 5 source-mode branches (typed / null-data / wc read-only / wc-product variable [the configurator] / wc-product non-variable). Each branch buffers ONLY its interior (`ob_start` after the wrapper point, `ob_get_clean` before the helper echo, no `return` in between); the block's own classes ride via `extra_classes`/`block_class`; the two Bound branches carry the configurator's `data-wp-interactive` + `data-wp-init` + `data-wp-context` (= `wp_json_encode($context)`) via `extra_attrs` so they land on the SAME wrapper element `get_block_wrapper_attributes()` controls. block.json v1.6.6 → 1.7.0 (+8 content-KIND width attrs); edit.js gains `ContainerWrapperControls kind="content"`.

**Validation:** rendered the REAL configurator surface — page 589 (`sourceMode='wc'`, productId 540, the 48-SKU fixture) via `do_blocks()` in full page context (`setup_postdata`) on the sandybrown canary, post-deploy + opcache reset. (The bare synthetic `do_blocks` of a `sourceMode='bound'` markup is NOT a valid surface — it renders empty for BOTH the migrated and the committed versions because the configurator mode is `'wc'` and needs page context. A prior session-internal attempt mis-read that invalid probe as a regression; corrected here by validating on the real surface.)

## Result — PASS (live-DOM, R-22-11)
- **0 PHP errors/warnings** in the rendered page.
- **Mirror applied:** the product-card outer element now carries `sgs-container` — `<div class="sgs-container product-card product-card--bound wp-block-sgs-product-card" data-wp-interactive="sgs/product-card" data-wp-context="{…48-combo manifest…}">`. `sgs-container` total on the page 2 → 3 (the +1 is product-card).
- **Configurator fully intact:** `data-wp-interactive` ×1, `data-wp-context` ×1 (NOT doubled — no double-render), `data-wp-init` ×1, **44 `sgs-option-picker`** occurrences (the Size+Flavour pickers), the add-to-cart `<form>` + `data-wp-on--submit` + add-to-cart button all present. All three `data-wp-*` attrs land on the single outer wrapper element (verified in the opening tag).
- **No structural regression:** exactly 1 product-card instance, no nested/double `sgs-container` wrap, interior content preserved.

The content-KIND mirror wraps product-card in the shared `sgs/container` element (uniform with every other composite — §FR-22-21) without disturbing the live WooCommerce variable-product configurator.

**Perf follow-up — RESOLVED (same session):** the `data-wp-context` JSON is now emitted via a new additive helper opt `extra_attr_html` + `wp_interactivity_data_wp_context($context)` (the WP-canonical compact single-quoted attribute), instead of routing it through `extra_attrs`/`esc_attr` (which `&quot;`-expanded every quote). Re-verified on page 589: payload back to **15,433 bytes** (was 20,868 with the bloat; ~15,318 committed baseline), `context style: single-quoted=Y, quot-bloat=N`, configurator still fully intact (interactive + context×1 + init + 44 pickers + sgs-container, 0 fatals). The `extra_attr_html` opt is additive — byte-identical for every composite that doesn't pass it.
