<?php
/**
 * Cart wiring for the buy box "Pick a set" mode: picks are validated and turned into a cart row server-side, in
 * `woocommerce_add_cart_item_data`, so every add route (the cart proxy, the Store API add-item route, re-orders) is covered.
 *
 * Why not `woocommerce_add_to_cart_validation`: WooCommerce fires it after the cart item data is built and passes it no
 * item data, so the picks are not visible there. A refusal here throws, which WC_Cart::add_to_cart() turns into a notice
 * and a failed add (the way Flow_Fields_Cart refuses).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Configurator_Picks
 */
final class Configurator_Picks {

	/** Cart-item-data key the proxy fills with the browser's raw picks. */
	const RAW_KEY = 'sgs_picks_raw';

	/** Cart-item-data key holding the accepted picks: {attrKey: {slug: count}}. */
	const KEY = 'sgs_picks';

	/** Wire WooCommerce hooks. */
	public static function register(): void {
		// After Flow_Fields_Cart::add_cart_item_data (11), whose accepted rows this replaces for the pick groups' labels.
		\add_filter( 'woocommerce_add_cart_item_data', array( __CLASS__, 'add_cart_item_data' ), 12, 3 );
		\add_filter( 'woocommerce_get_cart_item_from_session', array( __CLASS__, 'restore_from_session' ), 11, 2 );
		\add_action( 'woocommerce_check_cart_items', array( __CLASS__, 'block_stale_lines' ) );
	}

	/**
	 * The pack size a variation was added with.
	 *
	 * @param int                 $product_id   Product ID.
	 * @param int                 $variation_id Variation ID (0 for a simple add).
	 * @param array<string,mixed> $variations   Posted variation attributes (`attribute_pa_x` => slug).
	 * @param array<int,array>    $groups       Resolver output.
	 * @return int|null Null when the product has no pack axis or the chosen pack has no number.
	 */
	public static function pack_for( int $product_id, int $variation_id, array $variations, array $groups ): ?int {
		$pack = Configurator_Groups::pack( $product_id, $groups );
		if ( '' === $pack['key'] ) {
			return null;
		}
		$slug = (string) ( $variations[ 'attribute_' . $pack['key'] ] ?? '' );
		if ( '' === $slug && $variation_id > 0 && \function_exists( 'wc_get_product' ) ) {
			$variation = \wc_get_product( $variation_id );
			$attrs     = $variation instanceof \WC_Product ? (array) $variation->get_attributes() : array();
			$slug      = (string) ( $attrs[ $pack['key'] ] ?? '' );
		}
		return $pack['units'][ $slug ] ?? null;
	}

	/**
	 * Accept or refuse the picks, and carry them as one server-built row.
	 *
	 * @param array<string,mixed> $cart_item_data Cart item data.
	 * @param int                 $product_id     Product ID.
	 * @param int                 $variation_id   Variation ID.
	 * @return array<string,mixed>
	 * @throws \Exception When the picks are refused; WC_Cart::add_to_cart() turns it into a notice and a failed add.
	 */
	public static function add_cart_item_data( array $cart_item_data, int $product_id, int $variation_id ): array {
		$raw = $cart_item_data[ self::RAW_KEY ] ?? array();
		unset( $cart_item_data[ self::RAW_KEY ] );

		$groups = Configurator_Groups::for_product( $product_id );
		if ( array() === sgs_picks_active_groups( $groups ) && array() === (array) $raw ) {
			return $cart_item_data;
		}
		$variations = isset( $cart_item_data['variation'] ) && \is_array( $cart_item_data['variation'] ) ? $cart_item_data['variation'] : array();
		$result     = sgs_picks_check( $groups, $raw, self::pack_for( $product_id, $variation_id, $variations, $groups ) );
		if ( '' !== $result['error'] ) {
			throw new \Exception( \esc_html( $result['error'] ) );
		}
		if ( array() === $result['picks'] ) {
			return $cart_item_data;
		}

		// The server row is the only row stored under a pick group's label: a client row with that label is dropped.
		$labels = \array_map( static fn( array $row ): string => \mb_strtolower( $row['label'] ), $result['rows'] );
		$rows   = array();
		foreach ( (array) ( $cart_item_data[ Flow_Fields_Cart::KEY ] ?? array() ) as $existing ) {
			if ( \is_array( $existing ) && ! \in_array( \mb_strtolower( \trim( (string) ( $existing['label'] ?? '' ) ) ), $labels, true ) ) {
				$rows[] = $existing;
			}
		}
		foreach ( $result['rows'] as $row ) {
			$rows[] = $row;
		}
		if ( \count( $rows ) > SGS_FLOW_FIELDS_MAX ) {
			throw new \Exception( \esc_html__( 'Too many answers were sent with this item.', 'sgs-blocks' ) );
		}
		$cart_item_data[ Flow_Fields_Cart::KEY ] = $rows;
		// The picks sit in the cart item data, so the same variation with different picks hashes to a different cart line.
		$cart_item_data[ self::KEY ] = $result['picks'];
		return $cart_item_data;
	}

	/**
	 * Keep the picks when the cart is rebuilt from the session, and re-check them against the product as it is now.
	 *
	 * @param array<string,mixed> $cart_item Cart item being restored.
	 * @param array<string,mixed> $values    Raw session values.
	 * @return array<string,mixed>
	 */
	public static function restore_from_session( array $cart_item, array $values ): array {
		if ( ! isset( $values[ self::KEY ] ) || ! \is_array( $values[ self::KEY ] ) ) {
			return $cart_item;
		}
		$cart_item[ self::KEY ] = $values[ self::KEY ];
		$stale                  = self::stale_labels( (int) ( $cart_item['product_id'] ?? 0 ), $cart_item );
		if ( array() !== $stale ) {
			$cart_item['sgs_picks_stale'] = $stale;
		}
		return $cart_item;
	}

	/**
	 * Labels of the groups whose stored picks no longer satisfy the product's flags and options.
	 *
	 * @param int                 $product_id Product ID.
	 * @param array<string,mixed> $cart_item  Cart item.
	 * @return string[]
	 */
	public static function stale_labels( int $product_id, array $cart_item ): array {
		$groups = Configurator_Groups::for_product( $product_id );
		$active = sgs_picks_active_groups( $groups );
		$stored = (array) ( $cart_item[ self::KEY ] ?? array() );
		$stale  = array();
		foreach ( $stored as $key => $counts ) {
			if ( ! isset( $active[ (string) $key ] ) ) {
				$stale[] = (string) $key;
			}
		}
		foreach ( $active as $key => $group ) {
			$list = array();
			foreach ( (array) ( $stored[ $key ] ?? array() ) as $slug => $count ) {
				$list[] = array(
					'slug'  => (string) $slug,
					'count' => 0,
				);
			}
			$check = sgs_picks_check( array( $group ), array( $key => $list ), null );
			if ( '' !== $check['error'] ) {
				$stale[] = \wp_strip_all_tags( (string) $group['label'] );
			}
		}
		return \array_values( \array_unique( $stale ) );
	}

	/**
	 * Block the cart and checkout while a line's picks no longer fit its product.
	 */
	public static function block_stale_lines(): void {
		if ( ! \function_exists( 'WC' ) || ! \WC()->cart ) {
			return;
		}
		foreach ( \WC()->cart->get_cart() as $item ) {
			if ( empty( $item['sgs_picks_stale'] ) ) {
				continue;
			}
			\wc_add_notice(
				\sprintf(
					/* translators: %s: the option group names, e.g. Flavour. */
					\__( 'Your %s need choosing again. Remove the item and add it again.', 'sgs-blocks' ),
					\implode( ', ', \array_map( '\\strtolower', (array) $item['sgs_picks_stale'] ) )
				),
				'error'
			);
		}
	}
}
