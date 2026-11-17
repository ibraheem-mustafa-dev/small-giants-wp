<?php
/**
 * sgs/product-card "linked product" source: the card shows the Nth linked product of the product page being viewed.
 *
 * The shop owner chooses the links in WooCommerce's product editor (Linked products: Upsells and Cross-sells; Related
 * products are WooCommerce's own pick). A card stores a kind ('upsells', 'cross-sells' or 'related') and a position
 * (1 = first). render.php resolves the product ID with sgs_product_card_linked_resolve() and then renders the ordinary
 * wc-product card for it, so every look setting and the per-product CTA meta apply unchanged.
 *
 * @package SGS\Blocks
 */

declare( strict_types=1 );

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'sgs_product_card_linked_kind' ) ) {
	/**
	 * The card's link kind, or '' for an ordinary fixed-product card.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @return string '' | 'upsells' | 'cross-sells' | 'related'.
	 */
	function sgs_product_card_linked_kind( array $attributes ): string {
		$kind = $attributes['linkedProductKind'] ?? '';
		return is_string( $kind ) && in_array( $kind, array( 'upsells', 'cross-sells', 'related' ), true ) ? $kind : '';
	}
}

if ( ! function_exists( 'sgs_product_card_linked_shown' ) ) {
	/**
	 * Product IDs already printed by linked cards in this request, in render order. Pass an ID to record it.
	 *
	 * @param int|null $add Product ID to record, or null to only read.
	 * @return int[]
	 */
	function sgs_product_card_linked_shown( ?int $add = null ): array {
		static $shown = array();
		if ( null !== $add ) {
			$shown[] = $add;
		}
		return $shown;
	}
}

if ( ! function_exists( 'sgs_product_card_linked_candidates' ) ) {
	/**
	 * Shoppable linked product IDs of one product and kind, in the owner's order. Resolved once per request.
	 *
	 * Unpublished, hidden and out-of-catalogue products are dropped with WooCommerce's own checks (`get_status()` and
	 * `is_visible()`, which also honours the "hide out of stock" setting); the viewed product never appears.
	 *
	 * @param int    $viewed Product page's product ID.
	 * @param string $kind   'upsells' | 'cross-sells' | 'related'.
	 * @return int[]
	 */
	function sgs_product_card_linked_candidates( int $viewed, string $kind ): array {
		static $cache = array();
		$key          = $viewed . '|' . $kind;
		if ( isset( $cache[ $key ] ) ) {
			return $cache[ $key ];
		}
		$cache[ $key ] = array();
		if ( $viewed <= 0 || ! function_exists( 'wc_get_product' ) ) {
			return $cache[ $key ];
		}
		$product = wc_get_product( $viewed );
		if ( ! $product ) {
			return $cache[ $key ];
		}
		if ( 'upsells' === $kind ) {
			$raw = $product->get_upsell_ids();
		} elseif ( 'cross-sells' === $kind ) {
			$raw = $product->get_cross_sell_ids();
		} else {
			$raw = function_exists( 'wc_get_related_products' ) ? wc_get_related_products( $viewed, 12 ) : array();
		}
		$ids = array();
		foreach ( array_map( 'absint', (array) $raw ) as $id ) {
			if ( $id <= 0 || $id === $viewed || in_array( $id, $ids, true ) ) {
				continue;
			}
			$linked = wc_get_product( $id );
			if ( $linked && 'publish' === $linked->get_status() && $linked->is_visible() ) {
				$ids[] = $id;
			}
		}
		$cache[ $key ] = $ids;
		return $ids;
	}
}

if ( ! function_exists( 'sgs_product_card_linked_resolve' ) ) {
	/**
	 * The product ID a linked card shows: the Nth shoppable product of its kind, else WooCommerce's related products
	 * (skipping any a sibling linked card already shows), else 0 (the card prints nothing).
	 *
	 * @param int    $viewed   Product page's product ID (0 when not on a product page).
	 * @param string $kind     'upsells' | 'cross-sells' | 'related'.
	 * @param int    $position 1 = first.
	 * @return int Product ID, or 0.
	 */
	function sgs_product_card_linked_resolve( int $viewed, string $kind, int $position ): int {
		if ( $viewed <= 0 ) {
			return 0;
		}
		$shown = sgs_product_card_linked_shown();
		$pick  = sgs_product_card_linked_candidates( $viewed, $kind )[ max( 1, $position ) - 1 ] ?? 0;
		if ( 0 === $pick || in_array( $pick, $shown, true ) ) {
			$pick = 0;
			foreach ( sgs_product_card_linked_candidates( $viewed, 'related' ) as $id ) {
				if ( ! in_array( $id, $shown, true ) ) {
					$pick = $id;
					break;
				}
			}
		}
		if ( $pick > 0 ) {
			sgs_product_card_linked_shown( $pick );
		}
		return $pick;
	}
}
