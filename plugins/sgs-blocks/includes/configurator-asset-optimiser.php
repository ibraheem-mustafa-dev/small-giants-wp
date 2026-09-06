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
 * Whether this request genuinely needs WooCommerce's jQuery frontend stack.
 *
 * Added 2026-08-23 (Phase 3 design benchmark, finding X-2). WooCommerce enqueues
 * `jquery` + `jquery-migrate` + `jquery-blockui` + `wc-add-to-cart` + `js-cookie` +
 * `woocommerce` + the order-attribution pair on EVERY front-end request, including
 * pages that have nothing to do with the shop.
 *
 * Measured on the canary, gzipped, as the browser receives it: the 404 page — no
 * content, no interactivity beyond a search box — shipped 89.7 KB of JavaScript
 * across 22 files, of which jQuery alone was 30.2 KB. The framework's own stated
 * non-negotiable is "No jQuery — vanilla JS only frontend", and no SGS front-end
 * code declares a jQuery dependency: the whole stack is WooCommerce's, applied
 * site-wide. The per-page JS budget is 50 KB; the simplest pages were at 1.8x it.
 *
 * This is deliberately CONSERVATIVE. It answers "is this a WooCommerce surface?",
 * not "could this page get away without the scripts?". Any genuine shop view keeps
 * the full stack, so cart, checkout, account and the classic add-to-cart form are
 * untouched. Only pages that are not WooCommerce surfaces at all lose it.
 *
 * Fails SAFE in three places: WooCommerce inactive means there is nothing to strip;
 * a request with no inspectable queried object keeps the scripts; and any
 * `woocommerce/*` block or shop shortcode embedded in the content keeps them too.
 *
 * @return bool True when the WooCommerce frontend stack must stay.
 */
function sgs_page_needs_wc_frontend(): bool {
	// WooCommerce inactive: its conditional tags do not exist and nothing enqueued its stack.
	if ( ! function_exists( 'is_woocommerce' ) ) {
		return false;
	}

	// Any genuine WooCommerce surface keeps the full stack, no questions asked.
	if ( is_woocommerce() || is_cart() || is_checkout() || is_account_page() ) {
		return true;
	}

	$queried = get_queried_object();
	$post    = $queried instanceof \WP_Post ? $queried : null;

	/*
	 * No inspectable post. MEASURED 2026-08-23: this branch used to `return true`
	 * ("err toward keeping the scripts"), which was too blunt and silently defeated the
	 * whole point of the gate.
	 *
	 * `get_queried_object()` returns null on a 404 and on a search, and a WP_Term on a
	 * taxonomy archive — so all three took that early exit and kept the full jQuery +
	 * WooCommerce stack. Live proof: after deploy, jQuery was GONE on a single post and
	 * on a page, and still PRESENT on the 404, the front page, the blog archive and the
	 * search results. The 404 was the very page used as the headline example of the
	 * saving, and the original comment on this branch literally named "404s with no
	 * object" as a keep-case. The fix could never have applied where it was advertised.
	 *
	 * These view types are safe to strip on, and it is worth being explicit about WHY
	 * rather than flipping the return:
	 *   - `is_woocommerce()` / cart / checkout / account have ALREADY returned true
	 *     above, so any genuine shop surface — including product taxonomy archives — is
	 *     long since handled and never reaches here.
	 *   - What remains has no `post_content` of its own that could embed a WooCommerce
	 *     block. A 404 has no post at all; a search or archive renders excerpts from the
	 *     loop, not a single post's full content.
	 *   - `sgs_jquery_still_needed()` below is the real safety net: jQuery survives if
	 *     ANY other enqueued script declares it as a dependency.
	 *
	 * Anything NOT in this list keeps the stack, so an unforeseen view type still fails
	 * safe.
	 */
	if ( ! $post ) {
		$strippable = is_404() || is_search() || is_archive() || is_home() || is_front_page();

		return ! $strippable;
	}

	// A non-shop page that embeds WooCommerce blocks or the classic shortcodes still
	// needs the stack — e.g. a landing page with a product grid or an [add_to_cart] form.
	foreach ( sgs_flatten_blocks_for_optimiser( parse_blocks( $post->post_content ) ) as $block ) {
		if ( 0 === strpos( (string) ( $block['blockName'] ?? '' ), 'woocommerce/' ) ) {
			return true;
		}
	}

	foreach ( array( 'woocommerce_cart', 'woocommerce_checkout', 'woocommerce_my_account', 'product_page', 'add_to_cart' ) as $shortcode ) {
		if ( has_shortcode( $post->post_content, $shortcode ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Dequeue the redundant WooCommerce frontend scripts.
 *
 * Fires on two independent paths:
 *   1. A page carrying a BOUND configurator — the original D-numbered behaviour. Such a
 *      page IS a WooCommerce surface, so path 2 would never reach it; the configurator
 *      talks to the SGS REST proxy and the Store API by vanilla fetch, so the jQuery
 *      stack is redundant there specifically.
 *   2. A page that is not a WooCommerce surface at all (X-2, 2026-08-23) — the 404,
 *      search, blog archive, single post, ordinary pages and the front page.
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

	$has_configurator = sgs_page_has_bound_configurator();

	/**
	 * Filter the non-WooCommerce dequeue path independently of the configurator path,
	 * so a site can keep one and disable the other without a redeploy.
	 *
	 * @param bool $enabled Whether to strip the WC stack from non-WooCommerce pages.
	 */
	$strip_off_wc_pages = (bool) apply_filters( 'sgs_optimise_assets_off_wc_pages', true )
		&& ! sgs_page_needs_wc_frontend();

	if ( ! $has_configurator && ! $strip_off_wc_pages ) {
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
