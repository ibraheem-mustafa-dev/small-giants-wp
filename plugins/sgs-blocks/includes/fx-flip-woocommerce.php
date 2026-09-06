<?php
/**
 * Flip on WooCommerce Product Collection re-filtering.
 *
 * Spec 38 FR-38-12, redirected 2026-08-20 from the dead `sgs/filter-search` ↔
 * `sgs/card-grid` pairing (D426) to WooCommerce's native Product Collection
 * block. Design gate:
 * `.claude/plans/2026-08-20-flip-woocommerce-product-collection-design-gate.md`.
 *
 * SGS does not own `woocommerce/product-collection`'s block.json, so this
 * cannot be a per-block inspector control like the other fx effects — the
 * opt-in is the site-level "Animate WooCommerce product re-filtering" setting
 * (`Sgs_Motion_Settings`, `SGS_Motion_Registry::settings()`). When it is ON,
 * this filter stamps `data-sgs-fx="flip"` onto the block's root wrapper — the
 * SAME grammar every other Tier G effect uses, so `SGS_Motion_Registry`'s
 * existing `render_block` p99 markup sniff (`sniff_block()`) picks it up with
 * no special case, and `src/shared/effects/gsap/fx-flip.js` finds it via the
 * ordinary `[data-sgs-fx="flip"]` boot selector.
 *
 * Runs at `render_block_woocommerce/product-collection` priority 10 — the
 * same priority `includes/fx-attributes.php` uses for the equivalent dynamic-
 * block injection, and, load-bearingly, BEFORE the registry's p99 sniff.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Add `data-sgs-fx="flip"` to a rendered Product Collection block's root
 * wrapper, when the site-level setting is on.
 *
 * @param string $block_content The rendered block HTML.
 * @param array  $block         Parsed block data (unused — the opt-in is a
 *                               site setting, not a block attribute).
 * @return string Block HTML, with the attribute added when eligible.
 */
function sgs_inject_flip_on_product_collection( string $block_content, array $block ): string {
	if ( '' === $block_content ) {
		return $block_content;
	}

	// Editor parity, same predicate the motion registry itself gates on
	// (Spec 38 §9 — Flip has no editor-canvas story; filter interaction does
	// not exist in-canvas, so a ServerSideRender preview must never carry the
	// attribute).
	if ( \function_exists( __NAMESPACE__ . '\\sgs_is_frontend_render' )
		&& ! sgs_is_frontend_render() ) {
		return $block_content;
	}

	if ( empty( SGS_Motion_Registry::settings()['animate_product_filtering'] ) ) {
		return $block_content;
	}

	if ( ! \class_exists( '\WP_HTML_Tag_Processor' ) ) {
		return $block_content;
	}

	$processor = new \WP_HTML_Tag_Processor( $block_content );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	// Idempotency guard — a re-run (e.g. this filter firing twice on the same
	// content, or the block already carrying a different fx effect for some
	// other reason) must never clobber an existing value.
	if ( null !== $processor->get_attribute( 'data-sgs-fx' ) ) {
		return $processor->get_updated_html();
	}

	$processor->set_attribute( 'data-sgs-fx', 'flip' );

	return $processor->get_updated_html();
}
\add_filter(
	'render_block_woocommerce/product-collection',
	__NAMESPACE__ . '\\sgs_inject_flip_on_product_collection',
	10,
	2
);
