<?php
/**
 * Add-on price list helpers — Spec 43 FR-43-17/FR-43-18 (v1.4.0).
 *
 * Pure, side-effect-free lookups over the site-wide add-on price list
 * (WooCommerce > Add-on prices, includes/addon-price-list/). This file is in
 * the global namespace and the list's API is in SGS\Blocks, so every call and
 * `function_exists()` check uses the fully qualified name; a bare name finds
 * nothing and every price silently disappears:
 *
 *   - `\SGS\Blocks\sgs_addon_group( string $key ): ?array` — one group by key.
 *
 * Contract (owner spec, not invented here): a group is
 * `{key, label, options: [{key, label, price}]}`, `price` a decimal string.
 * The list is the ONLY price authority (FR-43-18) — nothing in this file
 * accepts a client-sent price; it only ever reads the list.
 *
 * No WordPress hooks are registered here — every function is a plain,
 * stateless read, safe to `require_once` from any of this spec's three
 * blocks' render.php without double-registering anything.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_choice_flow_addon_group_options' ) ) {
	/**
	 * Resolve one add-on group's options list.
	 *
	 * @param string $group_key Group key (choice-flow-question's `priceGroup`).
	 * @return array<int, array{key: string, label: string, price: string}> Empty
	 *         when the group key is blank, the price-list API doesn't exist yet,
	 *         or the group itself isn't found.
	 */
	function sgs_choice_flow_addon_group_options( string $group_key ): array {
		if ( '' === $group_key || ! function_exists( '\SGS\Blocks\sgs_addon_group' ) ) {
			return array();
		}

		$group = \SGS\Blocks\sgs_addon_group( $group_key );
		if ( ! is_array( $group ) || empty( $group['options'] ) || ! is_array( $group['options'] ) ) {
			return array();
		}

		return $group['options'];
	}
}

if ( ! function_exists( 'sgs_choice_flow_addon_group_label' ) ) {
	/**
	 * Resolve one add-on group's own label (for "group label → option label"
	 * price-panel rows — FR-43-19).
	 *
	 * @param string $group_key Group key.
	 * @return string Group label, or '' when unresolvable.
	 */
	function sgs_choice_flow_addon_group_label( string $group_key ): string {
		if ( '' === $group_key || ! function_exists( '\SGS\Blocks\sgs_addon_group' ) ) {
			return '';
		}

		$group = \SGS\Blocks\sgs_addon_group( $group_key );
		return is_array( $group ) && isset( $group['label'] ) ? (string) $group['label'] : '';
	}
}

if ( ! function_exists( 'sgs_choice_flow_addon_option_by_key' ) ) {
	/**
	 * Find one option row within an already-resolved group options list.
	 *
	 * @param array  $group_options Result of `sgs_choice_flow_addon_group_options()`.
	 * @param string $option_key    The option's `key` to find (matches a
	 *                               choice-flow-question option's `value`).
	 * @return array{key: string, label: string, price: string}|null The
	 *         matching row, or null when the key isn't in this group (an
	 *         editor-time-flagged, frontend-price-less state — FR-43-1).
	 */
	function sgs_choice_flow_addon_option_by_key( array $group_options, string $option_key ) {
		foreach ( $group_options as $option ) {
			if ( isset( $option['key'] ) && (string) $option['key'] === $option_key ) {
				return $option;
			}
		}
		return null;
	}
}

if ( ! function_exists( 'sgs_choice_flow_format_addon_price' ) ) {
	/**
	 * Format an add-on price for display: "included" at zero, otherwise a
	 * "+"-prefixed formatted amount. Uses `wc_price()` (stripped of markup)
	 * when WooCommerce is active, per the build brief; a plain decimal
	 * fallback keeps this block non-fatal without WooCommerce, though the
	 * add-on price list itself is a WooCommerce-settings-page feature and
	 * this path is not expected to be reached in practice.
	 *
	 * @param string $price Decimal price string from the price list.
	 * @return string Display string, e.g. "included" or "+ £4.00".
	 */
	function sgs_choice_flow_format_addon_price( string $price ): string {
		$amount = (float) $price;

		if ( $amount <= 0.0 ) {
			return __( 'included', 'sgs-blocks' );
		}

		if ( function_exists( 'wc_price' ) ) {
			return '+ ' . wp_strip_all_tags( wc_price( $amount ) );
		}

		return '+ ' . number_format( $amount, 2 );
	}
}

if ( ! function_exists( 'sgs_choice_flow_resolve_product_price_minor' ) ) {
	/**
	 * Resolve a product's current display price in MINOR units (e.g. pence),
	 * for the FR-43-19 price panel's base-price row. For a variable product,
	 * reads its default variation (or the lowest-priced variation when no
	 * default attributes are set) — "its default variation price" per
	 * FR-43-20.
	 *
	 * @param int $product_id WooCommerce product ID.
	 * @return array{minor: int, decimals: int}|null Null when WooCommerce is
	 *         inactive or the product can't be resolved/priced.
	 */
	function sgs_choice_flow_resolve_product_price_minor( int $product_id ) {
		if ( $product_id <= 0 || ! function_exists( 'wc_get_product' ) ) {
			return null;
		}

		$product = wc_get_product( $product_id );
		if ( ! $product ) {
			return null;
		}

		$decimals = function_exists( 'wc_get_price_decimals' ) ? (int) wc_get_price_decimals() : 2;
		$price    = null;

		if ( is_a( $product, 'WC_Product_Variable' ) ) {
			$default_attributes = $product->get_default_attributes();
			$variation_id       = ! empty( $default_attributes )
				? $product->get_matching_variation( $default_attributes )
				: 0;

			if ( $variation_id ) {
				$variation = wc_get_product( $variation_id );
				if ( $variation ) {
					$price = function_exists( 'wc_get_price_to_display' )
						? wc_get_price_to_display( $variation )
						: $variation->get_price();
				}
			}

			if ( null === $price ) {
				// No default attributes / no matching variation — fall back to
				// the lowest-priced variation, same "a real, live price" floor
				// the block must always show something meaningful.
				$price = $product->get_variation_price( 'min', true );
			}
		} else {
			$price = function_exists( 'wc_get_price_to_display' )
				? wc_get_price_to_display( $product )
				: $product->get_price();
		}

		if ( null === $price || '' === $price ) {
			return null;
		}

		return array(
			'minor'    => (int) round( ( (float) $price ) * ( 10 ** $decimals ) ),
			'decimals' => $decimals,
		);
	}
}
