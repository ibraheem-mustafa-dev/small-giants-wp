<?php
/**
 * Conditional visibility — server-side block suppression.
 *
 * Evaluates conditional visibility rules stored as block attributes and
 * returns an empty string when any condition fails, effectively hiding
 * the block from the front end without touching the DOM.
 *
 * Conditions are AND-logic: ALL active conditions must pass for the block
 * to render. A condition is "active" when it differs from its default value.
 *
 * Priority 9 — runs before device-visibility.php (priority 10) so that a
 * hidden block never reaches the class-injection filter.
 *
 * Supported conditions
 * --------------------
 * - sgsConditionLoggedIn   : 'none' | 'logged-in' | 'logged-out'
 * - sgsConditionUserRole   : string[] — restrict to specific WP roles
 * - sgsConditionDateStart  : YYYY-MM-DD — hide before this date
 * - sgsConditionDateEnd    : YYYY-MM-DD — hide after this date
 * - sgsConditionDays       : int[] (0=Sun … 6=Sat) — only show on these days
 * - sgsConditionUrlParam   : "key=value" — only show when GET param matches
 * - sgsConditionReferrer   : substring matched against HTTP_REFERER
 * - sgsConditionProductReviews : 'none' | 'has' | 'none-yet' — WooCommerce
 *   current-product review state (Spec-agnostic: ignored when WooCommerce is
 *   inactive or no product can be resolved for the current request).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\check_conditional_visibility', 9, 3 );
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_product_reviews_editor_flag' );

/**
 * Tell the editor whether WooCommerce is active, so the "Product reviews"
 * visibility control can hide itself on sites without WooCommerce.
 *
 * Attached to the always-present 'wp-blocks' handle (same pattern as
 * class-sgs-blocks.php's icon-asset flag) so it is available regardless of
 * bundle load order.
 */
function enqueue_product_reviews_editor_flag(): void {
	wp_add_inline_script(
		'wp-blocks',
		'window.sgsBlocksData = window.sgsBlocksData || {};' .
		'window.sgsBlocksData.wooCommerceActive = ' . ( class_exists( 'WooCommerce' ) ? 'true' : 'false' ) . ';',
		'before'
	);
}

/**
 * Resolve the WooCommerce product being viewed for the current render.
 *
 * Resolution order: block context postId (product query-loop items) →
 * global $product (set by WooCommerce on singular product templates) →
 * the queried object (singular product page, fallback).
 *
 * @param \WP_Block|null $instance The block instance, when available (carries context).
 * @return \WC_Product|null Resolved product, or null when WooCommerce is
 *                           inactive or no product can be resolved.
 */
function resolve_current_product( $instance = null ) {
	if ( ! function_exists( 'wc_get_product' ) ) {
		return null;
	}

	if ( $instance instanceof \WP_Block && ! empty( $instance->context['postId'] ) ) {
		$from_context = wc_get_product( absint( $instance->context['postId'] ) );
		if ( $from_context instanceof \WC_Product ) {
			return $from_context;
		}
	}

	global $product;
	if ( $product instanceof \WC_Product ) {
		return $product;
	}

	$queried = get_queried_object();
	if ( $queried instanceof \WP_Post && 'product' === $queried->post_type ) {
		$from_queried = wc_get_product( $queried->ID );
		if ( $from_queried instanceof \WC_Product ) {
			return $from_queried;
		}
	}

	return null;
}

/**
 * Suppress block output when any conditional visibility rule fails.
 *
 * @param string         $block_content The rendered block HTML.
 * @param array          $block         Parsed block data including name and attrs.
 * @param \WP_Block|null $instance      The block instance (carries context), when available.
 * @return string Original HTML when all conditions pass; empty string otherwise.
 */
function check_conditional_visibility( string $block_content, array $block, $instance = null ): string {

	// Skip empty blocks (spacers, separators, comment-only blocks, etc.).
	if ( empty( $block_content ) || empty( $block['blockName'] ) ) {
		return $block_content;
	}

	// Never suppress blocks in the admin / editor context.
	// The JS extension renders a Notice and an opacity overlay instead.
	if ( is_admin() ) {
		return $block_content;
	}

	$attrs = $block['attrs'] ?? array();

	// ── Condition 1: Login status ────────────────────────────────────────────
	$login_rule = isset( $attrs['sgsConditionLoggedIn'] )
		? (string) $attrs['sgsConditionLoggedIn']
		: 'none';

	if ( 'logged-in' === $login_rule && ! is_user_logged_in() ) {
		return '';
	}

	if ( 'logged-out' === $login_rule && is_user_logged_in() ) {
		return '';
	}

	// ── Condition 2: User role ───────────────────────────────────────────────
	// Only evaluated when the login rule is 'logged-in' AND a non-empty role
	// list is provided. An empty array means "all logged-in users" — no restriction.
	if ( 'logged-in' === $login_rule && ! empty( $attrs['sgsConditionUserRole'] ) ) {
		$required_roles = array_map( 'sanitize_key', (array) $attrs['sgsConditionUserRole'] );
		$current_user   = wp_get_current_user();

		if ( empty( array_intersect( $required_roles, (array) $current_user->roles ) ) ) {
			return '';
		}
	}

	// ── Condition 3: Date start ──────────────────────────────────────────────
	if ( ! empty( $attrs['sgsConditionDateStart'] ) ) {
		$start = sanitize_text_field( (string) $attrs['sgsConditionDateStart'] );

		if ( '' !== $start && wp_date( 'Y-m-d' ) < $start ) {
			return '';
		}
	}

	// ── Condition 4: Date end ────────────────────────────────────────────────
	if ( ! empty( $attrs['sgsConditionDateEnd'] ) ) {
		$end = sanitize_text_field( (string) $attrs['sgsConditionDateEnd'] );

		if ( '' !== $end && wp_date( 'Y-m-d' ) > $end ) {
			return '';
		}
	}

	// ── Condition 5: Days of week ────────────────────────────────────────────
	if ( ! empty( $attrs['sgsConditionDays'] ) ) {
		$allowed_days = array_map( 'intval', (array) $attrs['sgsConditionDays'] );
		$current_day  = (int) wp_date( 'w' ); // 0 (Sunday) through 6 (Saturday).

		if ( ! in_array( $current_day, $allowed_days, true ) ) {
			return '';
		}
	}

	// ── Condition 6: URL parameter ───────────────────────────────────────────
	if ( ! empty( $attrs['sgsConditionUrlParam'] ) ) {
		$param_string = sanitize_text_field( (string) $attrs['sgsConditionUrlParam'] );

		if ( '' !== $param_string ) {
			// Prevent LiteSpeed caching the wrong variant of this page.
			nocache_headers();

			$pair = array();
			parse_str( $param_string, $pair );

			if ( ! empty( $pair ) ) {
				$key   = (string) key( $pair );
				$value = (string) current( $pair );

				// URL parameter matching is read-only — nonce not applicable here.
				// phpcs:disable WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput
				$get_val = isset( $_GET[ $key ] )
					? sanitize_text_field( wp_unslash( $_GET[ $key ] ) )
					: null;
				// phpcs:enable WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput
				$raw_get = $get_val;

				if ( null === $raw_get || $raw_get !== $value ) {
					return '';
				}
			}
		}
	}

	// ── Condition 7: Referrer ────────────────────────────────────────────────
	if ( ! empty( $attrs['sgsConditionReferrer'] ) ) {
		$needle = sanitize_text_field( (string) $attrs['sgsConditionReferrer'] );

		if ( '' !== $needle ) {
			// Prevent LiteSpeed caching the wrong variant of this page.
			nocache_headers();

			// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotValidated
			$referrer = isset( $_SERVER['HTTP_REFERER'] )
				? sanitize_text_field( wp_unslash( $_SERVER['HTTP_REFERER'] ) )
				: '';

			if ( false === strpos( $referrer, $needle ) ) {
				return '';
			}
		}
	}

	// ── Condition 8: WooCommerce current-product reviews ────────────────────
	$reviews_rule = isset( $attrs['sgsConditionProductReviews'] )
		? (string) $attrs['sgsConditionProductReviews']
		: 'none';

	if ( 'none' !== $reviews_rule ) {
		$current_product = resolve_current_product( $instance );

		// WooCommerce inactive or no product resolved — ignore this
		// condition (the block shows), per the extension's design.
		if ( $current_product instanceof \WC_Product ) {
			$has_reviews = $current_product->get_review_count() > 0;

			if ( 'has' === $reviews_rule && ! $has_reviews ) {
				return '';
			}

			if ( 'none-yet' === $reviews_rule && $has_reviews ) {
				return '';
			}
		}
	}

	// All conditions passed — render the block normally.
	return $block_content;
}
