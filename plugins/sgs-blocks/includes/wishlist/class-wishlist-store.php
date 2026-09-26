<?php
/**
 * SGS Wishlist — storage layer (Spec 30 P5 FR-30-14/15). Every read/write of
 * the wishlist user-meta keys goes through this class — no REST controller
 * touches `get_user_meta()`/`update_user_meta()` for wishlist data directly.
 *
 * Storage shape (`_sgs_wishlist` user meta, JSON list): `{ id:int,
 * addedTs:int, savedPrice:int|null, currency:string, alertPrice:int|null,
 * inStock:bool|null }`. Prices are minor units (the Store API's
 * `prices.price` basis). A legacy row's missing keys normalise to
 * `null`/`''`, never a fabricated value.
 *
 * @package SGS\Blocks
 * @since   1.29.0 (Wave 3C account-area build, FR-30-14/15)
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Storage + normalisation for the account-side saved-items list. */
final class Wishlist_Store {

	/** User-meta key for the saved-items array. */
	const META_KEY = '_sgs_wishlist';
	/** User-meta key for the price/stock alert opt-ins. */
	const ALERTS_META_KEY = '_sgs_wishlist_alerts';
	/** User-meta key for the share token. */
	const SHARE_TOKEN_META_KEY = '_sgs_wishlist_share_token';
	/** User-meta key for the share on/off flag ('1' or ''). */
	const SHARE_ON_META_KEY = '_sgs_wishlist_share_on';
	/** Maximum number of saved items per account (DoS/unbounded-meta guard). */
	const MAX_ITEMS = 200;

	/**
	 * Read a user's saved-items list; a legacy row's missing keys become null/'' rather than a fabricated value.
	 *
	 * @param int $user_id User ID.
	 * @return array<int,array{id:int,addedTs:int,savedPrice:int|null,currency:string,alertPrice:int|null,inStock:bool|null}>
	 */
	public static function read_list( int $user_id ): array {
		if ( $user_id <= 0 ) {
			return array();
		}
		$raw = \get_user_meta( $user_id, self::META_KEY, true );
		if ( ! \is_string( $raw ) || '' === $raw ) {
			return array();
		}
		$decoded = \json_decode( $raw, true );
		if ( ! \is_array( $decoded ) ) {
			return array();
		}
		$list = array();
		foreach ( $decoded as $entry ) {
			if ( ! \is_array( $entry ) || empty( $entry['id'] ) ) {
				continue;
			}
			$list[] = array(
				'id'         => \absint( $entry['id'] ),
				'addedTs'    => isset( $entry['addedTs'] ) ? \absint( $entry['addedTs'] ) : \time(),
				'savedPrice' => isset( $entry['savedPrice'] ) && null !== $entry['savedPrice'] ? (int) $entry['savedPrice'] : null,
				'currency'   => isset( $entry['currency'] ) ? (string) $entry['currency'] : '',
				'alertPrice' => isset( $entry['alertPrice'] ) && null !== $entry['alertPrice'] ? (int) $entry['alertPrice'] : null,
				'inStock'    => isset( $entry['inStock'] ) && null !== $entry['inStock'] ? (bool) $entry['inStock'] : null,
			);
		}
		return $list;
	}

	/**
	 * Write a user's saved-items list.
	 *
	 * @param int   $user_id User ID.
	 * @param array $list    The saved-items list.
	 */
	public static function write_list( int $user_id, array $list ): void {
		if ( $user_id > 0 ) {
			\update_user_meta( $user_id, self::META_KEY, \wp_json_encode( \array_values( $list ) ) );
		}
	}

	/**
	 * Find a product id's index in a saved-items list.
	 *
	 * @param array $list       The saved-items list.
	 * @param int   $product_id The product id to find.
	 * @return int|null
	 */
	public static function find_index( array $list, int $product_id ): ?int {
		foreach ( $list as $index => $entry ) {
			if ( (int) ( $entry['id'] ?? 0 ) === $product_id ) {
				return $index;
			}
		}
		return null;
	}

	/**
	 * Whether a product ID is a real, published, purchasable WooCommerce product.
	 *
	 * @param int $product_id Product ID.
	 * @return bool
	 */
	public static function product_is_valid( int $product_id ): bool {
		if ( $product_id <= 0 || 'product' !== \get_post_type( $product_id ) || 'publish' !== \get_post_status( $product_id ) ) {
			return false;
		}
		if ( \function_exists( 'wc_get_product' ) ) {
			$product = \wc_get_product( $product_id );
			if ( ! $product || ! $product->is_purchasable() ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * The product's current display price in minor units (same basis as the Store API's `prices.price`).
	 *
	 * @param \WC_Product $product A real WooCommerce product.
	 * @return int|null Null when the product has no resolvable price (e.g. `''`).
	 */
	public static function current_price_minor( \WC_Product $product ): ?int {
		$price = \wc_get_price_to_display( $product );
		if ( '' === $price || null === $price || false === $price ) {
			return null;
		}
		$decimals = \function_exists( 'wc_get_price_decimals' ) ? (int) \wc_get_price_decimals() : 2;
		return (int) \round( (float) $price * ( 10 ** $decimals ) );
	}

	/**
	 * Build a fresh entry from the product's CURRENT server-side state — never from a client-sent value.
	 *
	 * @param int $product_id Product ID.
	 * @return array{id:int,addedTs:int,savedPrice:int|null,currency:string,alertPrice:int|null,inStock:bool|null}
	 */
	public static function snapshot_entry( int $product_id ): array {
		$entry = array(
			'id'         => $product_id,
			'addedTs'    => \time(),
			'savedPrice' => null,
			'currency'   => \function_exists( 'get_woocommerce_currency' ) ? (string) \get_woocommerce_currency() : '',
			'alertPrice' => null,
			'inStock'    => null,
		);
		if ( \function_exists( 'wc_get_product' ) ) {
			$product = \wc_get_product( $product_id );
			if ( $product instanceof \WC_Product ) {
				$price_minor         = self::current_price_minor( $product );
				$entry['savedPrice'] = $price_minor;
				$entry['alertPrice'] = $price_minor;
				$entry['inStock']    = $product->is_in_stock();
			}
		}
		return $entry;
	}

	/**
	 * A user's price/stock alert opt-in state (booleans only).
	 *
	 * @param int $user_id User ID.
	 * @return array{price:bool,stock:bool}
	 */
	public static function get_alerts( int $user_id ): array {
		$raw = self::get_alerts_raw( $user_id );
		return array(
			'price' => $raw['price']['on'],
			'stock' => $raw['stock']['on'],
		);
	}

	/**
	 * A user's alert opt-in state WITH the last-changed timestamp (needed by the privacy exporter).
	 *
	 * @param int $user_id User ID.
	 * @return array{price:array{on:bool,ts:int},stock:array{on:bool,ts:int}}
	 */
	public static function get_alerts_raw( int $user_id ): array {
		$decoded = array();
		if ( $user_id > 0 ) {
			$raw     = \get_user_meta( $user_id, self::ALERTS_META_KEY, true );
			$decoded = ( \is_string( $raw ) && '' !== $raw ) ? \json_decode( $raw, true ) : array();
			$decoded = \is_array( $decoded ) ? $decoded : array();
		}
		$result = array();
		foreach ( array( 'price', 'stock' ) as $type ) {
			$entry           = ( isset( $decoded[ $type ] ) && \is_array( $decoded[ $type ] ) ) ? $decoded[ $type ] : array();
			$result[ $type ] = array(
				'on' => ! empty( $entry['on'] ),
				'ts' => isset( $entry['ts'] ) ? \absint( $entry['ts'] ) : 0,
			);
		}
		return $result;
	}

	/**
	 * Set one alert type's opt-in state, stamping the change time.
	 *
	 * @param int    $user_id User ID.
	 * @param string $type    'price' or 'stock'.
	 * @param bool   $on      New opt-in state.
	 * @return array{price:bool,stock:bool} The updated opt-in state.
	 */
	public static function set_alert( int $user_id, string $type, bool $on ): array {
		if ( $user_id <= 0 || ! \in_array( $type, array( 'price', 'stock' ), true ) ) {
			return self::get_alerts( $user_id );
		}
		$raw            = \get_user_meta( $user_id, self::ALERTS_META_KEY, true );
		$decoded        = ( \is_string( $raw ) && '' !== $raw ) ? \json_decode( $raw, true ) : null;
		$state          = \is_array( $decoded ) ? $decoded : array();
		$state[ $type ] = array(
			'on' => $on,
			'ts' => \time(),
		);
		\update_user_meta( $user_id, self::ALERTS_META_KEY, \wp_json_encode( $state ) );
		return self::get_alerts( $user_id );
	}

	/**
	 * A user's share state.
	 *
	 * @param int $user_id User ID.
	 * @return array{enabled:bool,token:string}
	 */
	public static function get_share( int $user_id ): array {
		if ( $user_id <= 0 ) {
			return array(
				'enabled' => false,
				'token'   => '',
			);
		}
		return array(
			'enabled' => '1' === (string) \get_user_meta( $user_id, self::SHARE_ON_META_KEY, true ),
			'token'   => (string) \get_user_meta( $user_id, self::SHARE_TOKEN_META_KEY, true ),
		);
	}

	/**
	 * Enable/disable sharing; creates a token on first enable only.
	 *
	 * @param int  $user_id User ID.
	 * @param bool $enabled New sharing state.
	 * @return array{enabled:bool,token:string} The updated share state.
	 */
	public static function set_share_enabled( int $user_id, bool $enabled ): array {
		if ( $user_id <= 0 ) {
			return array(
				'enabled' => false,
				'token'   => '',
			);
		}
		\update_user_meta( $user_id, self::SHARE_ON_META_KEY, $enabled ? '1' : '' );
		$token = (string) \get_user_meta( $user_id, self::SHARE_TOKEN_META_KEY, true );
		if ( $enabled && '' === $token ) {
			self::regenerate_token( $user_id );
		}
		return self::get_share( $user_id );
	}

	/**
	 * Issue a fresh 32-hex-char share token, invalidating every link built from the old one.
	 *
	 * @param int $user_id User ID.
	 * @return string The new token, or '' when $user_id is invalid.
	 */
	public static function regenerate_token( int $user_id ): string {
		if ( $user_id <= 0 ) {
			return '';
		}
		$token = \bin2hex( \random_bytes( 16 ) );
		\update_user_meta( $user_id, self::SHARE_TOKEN_META_KEY, $token );
		return $token;
	}

	/**
	 * Resolve a share token to its owner's ID — ONLY when sharing is currently switched on for them.
	 *
	 * @param string $token 32 lowercase-hex-char token.
	 * @return int User ID, or 0 when the token is unknown/switched off.
	 */
	public static function user_id_for_token( string $token ): int {
		if ( '' === $token ) {
			return 0;
		}
		$users = \get_users(
			array(
				'meta_key'   => self::SHARE_TOKEN_META_KEY,
				'meta_value' => $token,
				'number'     => 1,
				'fields'     => 'ID',
			)
		);
		if ( empty( $users ) ) {
			return 0;
		}
		$user_id = \absint( $users[0] );
		return '1' === (string) \get_user_meta( $user_id, self::SHARE_ON_META_KEY, true ) ? $user_id : 0;
	}
}
