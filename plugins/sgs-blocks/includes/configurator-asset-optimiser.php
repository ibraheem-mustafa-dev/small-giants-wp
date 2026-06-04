<?php
/**
 * Configurator asset optimiser — conditional WooCommerce-frontend dequeue.
 *
 * On a page that contains a BOUND (WooCommerce) `sgs/product-card` configurator,
 * the WooCommerce jQuery frontend stack is redundant:
 *
 *   - The configurator's add-to-cart goes through the SGS REST proxy
 *     (`/sgs/v1/cart/add-item`) via vanilla `fetch` in product-card/view.js.
 *   - The cart badge (`sgs/cart`) reads the Store API (`/wc/store/v1/cart`),
 *     also vanilla fetch. `wc-cart-fragments` is already dequeued
 *     (see wc-cart-fragments.php).
 *
 * Neither needs `jquery`, `woocommerce.min`, `jquery-blockui`, the legacy
 * `wc-add-to-cart`, or the order-attribution tracking scripts. Removing them
 * is the only way to meet the FR-27-H1 ≤150 KB page-JS budget (the configurator
 * itself is ~20 KB; the overage is WooCommerce-core jQuery).
 *
 * Safety:
 *   1. Fires ONLY when a bound configurator card is detected in post content
 *      (never on arbitrary WooCommerce pages — mini-cart widgets / WC blocks on
 *      other pages keep their scripts).
 *   2. jQuery itself is dequeued ONLY when no *other* enqueued script still
 *      declares a jQuery dependency (defensive — errs toward keeping jQuery).
 *   3. Every step is filterable so a site can opt out without a redeploy.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Flatten a parsed-block tree into a single list (depth-first).
 *
 * @param array $blocks Result of parse_blocks().
 * @return array Flat list of block arrays.
 */
function sgs_flatten_blocks_for_optimiser( array $blocks ): array {
	$out = array();
	foreach ( $blocks as $block ) {
		$out[] = $block;
		if ( ! empty( $block['innerBlocks'] ) ) {
			$out = array_merge( $out, sgs_flatten_blocks_for_optimiser( $block['innerBlocks'] ) );
		}
	}
	return $out;
}

/**
 * Whether the current singular view contains a bound (wc-product) configurator card.
 *
 * Uses the queried post's content. FSE template-part contexts without a post
 * return false (we never want to strip jQuery off a page we cannot inspect).
 *
 * @return bool
 */
function sgs_page_has_bound_configurator(): bool {
	$queried = get_queried_object();
	$post    = $queried instanceof \WP_Post ? $queried : null;

	if ( ! $post || ! has_block( 'sgs/product-card', $post ) ) {
		return false;
	}

	foreach ( sgs_flatten_blocks_for_optimiser( parse_blocks( $post->post_content ) ) as $block ) {
		if ( 'sgs/product-card' === ( $block['blockName'] ?? '' )
			&& 'wc-product' === ( $block['attrs']['sourceMode'] ?? '' ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Whether any *other* enqueued script still depends on jQuery after the given
 * handles are removed. Defensive: anything we are unsure about keeps jQuery.
 *
 * @param array $removed Handles already being dequeued this request.
 * @return bool True if jQuery must stay.
 */
function sgs_jquery_still_needed( array $removed ): bool {
	$scripts = wp_scripts();
	$skip    = array_merge( $removed, array( 'jquery', 'jquery-core', 'jquery-migrate' ) );

	foreach ( (array) $scripts->queue as $handle ) {
		if ( in_array( $handle, $skip, true ) ) {
			continue;
		}
		$registered = $scripts->registered[ $handle ] ?? null;
		if ( $registered && ! empty( $registered->deps )
			&& ( in_array( 'jquery', $registered->deps, true )
				|| in_array( 'jquery-core', $registered->deps, true ) ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Dequeue the redundant WooCommerce frontend scripts on configurator pages.
 *
 * Hooked at priority 99 so it runs after WooCommerce (and everything else)
 * has enqueued on `wp_enqueue_scripts`.
 *
 * @return void
 */
function sgs_configurator_optimise_assets(): void {
	if ( false === apply_filters( 'sgs_configurator_optimise_assets', true ) ) {
		return;
	}

	if ( ! sgs_page_has_bound_configurator() ) {
		return;
	}

	// WooCommerce frontend scripts the configurator does not use.
	$wc_handles = apply_filters(
		'sgs_configurator_dequeue_wc_handles',
		array(
			'woocommerce',
			'wc-add-to-cart',
			'jquery-blockui',
			'sourcebuster-js',
			'wc-order-attribution',
			'js-cookie',
		)
	);

	foreach ( $wc_handles as $handle ) {
		wp_dequeue_script( $handle );
	}

	// jQuery (and migrate) only when nothing else still needs it.
	if ( apply_filters( 'sgs_configurator_dequeue_jquery', true )
		&& ! sgs_jquery_still_needed( $wc_handles ) ) {
		wp_dequeue_script( 'jquery' );
		wp_dequeue_script( 'jquery-core' );
		wp_dequeue_script( 'jquery-migrate' );
	}
}

add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\sgs_configurator_optimise_assets', 99 );
