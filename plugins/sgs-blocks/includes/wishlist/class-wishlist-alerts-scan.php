<?php
/**
 * Wishlist Alerts Scan — the recurring price-drop / back-in-stock sweep
 * (Spec 30 P5, FR-30-15). A 12-hourly job compares every opted-in
 * shopper's saved list against live WooCommerce data and sends at most
 * one `sgs_wishlist_alert` webhook event per shopper per run.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Schedules and runs the wishlist price-drop / back-in-stock scan. */
final class Wishlist_Alerts_Scan {

	/** Action Scheduler hook name for the recurring scan. */
	const ACTION_HOOK = 'sgs_wishlist_alerts_scan';

	/** Action Scheduler group. */
	const ACTION_GROUP = 'sgs';

	/** Scan interval in seconds (12 hours). */
	const INTERVAL_SECONDS = 12 * HOUR_IN_SECONDS;

	/** Users fetched per page while walking `_sgs_wishlist_alerts`. */
	const USERS_PER_PAGE = 100;

	/** Wire WordPress hooks. Called once from sgs-blocks.php. */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'maybe_schedule' ) );
		\add_action( self::ACTION_HOOK, array( __CLASS__, 'run' ) );
	}

	/** Schedule the recurring scan once WooCommerce has loaded; guarded against double-scheduling. */
	public static function maybe_schedule(): void {
		if ( ! \class_exists( 'WooCommerce' ) ) {
			return;
		}
		if ( ! \function_exists( 'as_has_scheduled_action' ) || ! \function_exists( 'as_schedule_recurring_action' ) ) {
			return;
		}
		if ( \as_has_scheduled_action( self::ACTION_HOOK, array(), self::ACTION_GROUP ) ) {
			return;
		}

		\as_schedule_recurring_action( \time(), self::INTERVAL_SECONDS, self::ACTION_HOOK, array(), self::ACTION_GROUP );
	}

	/**
	 * Compare a shopper's saved-items list against live product data.
	 * Pure/WordPress-free so the standalone test can drive it directly.
	 *
	 * @param array    $list    Saved-items entries (shared contract).
	 * @param callable $lookup  `fn(int $id): ?array` returning
	 *                          `{price:?int, in_stock:bool, name:string, url:string, decimals:int}` or null.
	 * @param array    $enabled `{price:bool, stock:bool}` combined site-feature + opt-in state.
	 * @return array{list:array, items:array}
	 */
	public static function evaluate( array $list, callable $lookup, array $enabled ): array {
		$price_on = ! empty( $enabled['price'] );
		$stock_on = ! empty( $enabled['stock'] );

		$items = array();
		$out   = array();

		foreach ( $list as $entry ) {
			$id   = isset( $entry['id'] ) ? (int) $entry['id'] : 0;
			$data = $id ? $lookup( $id ) : null;

			if ( ! \is_array( $data ) ) {
				$out[] = $entry;
				continue;
			}

			if ( $price_on ) {
				$entry = self::evaluate_price( $entry, $data, $id, $items );
			}

			if ( $stock_on ) {
				$entry = self::evaluate_stock( $entry, $data, $id, $items );
			}

			$out[] = $entry;
		}

		return array(
			'list'  => $out,
			'items' => $items,
		);
	}

	/**
	 * Price half: a drop below `alertPrice` alerts and lowers the baseline (it only ever falls); a null baseline is set with no alert.
	 *
	 * @param array $entry Entry; $data Lookup result; $id Product id; $items Accumulator.
	 */
	private static function evaluate_price( array $entry, array $data, int $id, array &$items ): array {
		$current = isset( $data['price'] ) ? $data['price'] : null;
		if ( null === $current ) {
			return $entry;
		}

		$baseline = isset( $entry['alertPrice'] ) ? $entry['alertPrice'] : null;

		if ( null === $baseline ) {
			$entry['alertPrice'] = $current;
			return $entry;
		}

		if ( $current < $baseline ) {
			$saved               = $entry['savedPrice'] ?? $baseline;
			$items[]             = array(
				'type'        => 'price_drop',
				'product_id'  => $id,
				'name'        => $data['name'] ?? '',
				'url'         => $data['url'] ?? '',
				'price_now'   => $current,
				'price_saved' => $saved,
				'decimals'    => $data['decimals'] ?? 2,
				'currency'    => $entry['currency'] ?? '',
			);
			$entry['alertPrice'] = $current;
		}

		return $entry;
	}

	/**
	 * Stock half: out-of-stock turning in-stock raises one `back_in_stock` item; every other transition just records state.
	 *
	 * @param array $entry Entry; $data Lookup result; $id Product id; $items Accumulator.
	 */
	private static function evaluate_stock( array $entry, array $data, int $id, array &$items ): array {
		$in_stock = ! empty( $data['in_stock'] );
		$was      = isset( $entry['inStock'] ) ? $entry['inStock'] : null;

		if ( false === $was && true === $in_stock ) {
			$items[] = array(
				'type'       => 'back_in_stock',
				'product_id' => $id,
				'name'       => $data['name'] ?? '',
				'url'        => $data['url'] ?? '',
			);
		}

		$entry['inStock'] = $in_stock;

		return $entry;
	}

	/** Action Scheduler handler: page through opted-in shoppers and send at most one webhook event per shopper. */
	public static function run(): void {
		if ( ! \class_exists( __NAMESPACE__ . '\\Wishlist_Settings' ) ) {
			return;
		}
		$features = Wishlist_Settings::features();
		if ( empty( $features['priceAlerts'] ) && empty( $features['stockAlerts'] ) ) {
			return;
		}
		$paged = 1;
		$found = self::USERS_PER_PAGE;

		while ( self::USERS_PER_PAGE === $found ) {
			$user_ids = \get_users(
				array(
					'meta_key' => '_sgs_wishlist_alerts',
					'fields'   => 'ID',
					'number'   => self::USERS_PER_PAGE,
					'paged'    => $paged,
				)
			);

			foreach ( $user_ids as $user_id ) {
				self::run_for_user( (int) $user_id );
			}

			$found = \count( $user_ids );
			++$paged;
		}
	}

	/**
	 * Evaluate one shopper's list, persist any change, and dispatch when there are items.
	 *
	 * @param int $user_id Shopper's user id.
	 */
	private static function run_for_user( int $user_id ): void {
		// A type runs only while the site switch AND the shopper's opt-in are both on.
		$features = Wishlist_Settings::features();
		$opted_in = Wishlist_Store::get_alerts( $user_id );
		$enabled  = array(
			'price' => ! empty( $features['priceAlerts'] ) && ! empty( $opted_in['price'] ),
			'stock' => ! empty( $features['stockAlerts'] ) && ! empty( $opted_in['stock'] ),
		);
		if ( ! $enabled['price'] && ! $enabled['stock'] ) {
			return;
		}
		$list = Wishlist_Store::read_list( $user_id );
		if ( empty( $list ) ) {
			return;
		}
		$result = self::evaluate( $list, array( __CLASS__, 'lookup' ), $enabled );

		// The new baselines are saved only once the alert has gone out, so an
		// unset or failing webhook leaves the change to be sent next run.
		if ( ! empty( $result['items'] ) && ! self::dispatch_alert( $user_id, $result['items'] ) ) {
			return;
		}

		if ( $result['list'] !== $list ) {
			Wishlist_Store::write_list( $user_id, $result['list'] );
		}
	}

	/**
	 * Live `$lookup` for `evaluate()`; null for anything not a published product.
	 *
	 * @param int $id Product id.
	 * @return array{price:?int, in_stock:bool, name:string, url:string, decimals:int}|null
	 */
	private static function lookup( int $id ): ?array {
		if ( 'product' !== \get_post_type( $id ) || 'publish' !== \get_post_status( $id ) ) {
			return null;
		}

		if ( ! \function_exists( 'wc_get_product' ) ) {
			return null;
		}
		$product = \wc_get_product( $id );
		if ( ! $product ) {
			return null;
		}

		return array(
			'price'    => Wishlist_Store::current_price_minor( $product ),
			'in_stock' => $product->is_in_stock(),
			'name'     => $product->get_name(),
			'url'      => (string) \get_permalink( $id ),
			'decimals' => \function_exists( 'wc_get_price_decimals' ) ? \wc_get_price_decimals() : 2,
		);
	}

	/**
	 * Format `$items`' minor-unit prices and send one `sgs_wishlist_alert` event.
	 *
	 * @param int   $user_id Shopper's user id.
	 * @param array $items   Alert items from `evaluate()`.
	 * @return bool Whether the event was sent.
	 */
	private static function dispatch_alert( int $user_id, array $items ): bool {
		$user = \get_userdata( $user_id );
		if ( ! $user ) {
			return false;
		}

		foreach ( $items as &$item ) {
			if ( 'price_drop' !== $item['type'] ) {
				continue;
			}
			$decimals            = $item['decimals'] ?? 2;
			$item['price_now']   = self::format_price( $item['price_now'], $decimals );
			$item['price_saved'] = self::format_price( $item['price_saved'], $decimals );
			unset( $item['decimals'] );
		}
		unset( $item );

		$payload = array(
			'customer'   => array(
				'email'      => $user->user_email,
				'first_name' => $user->first_name,
			),
			'items'      => $items,
			'manage_url' => Wishlist_Settings::saved_items_page_url(),
		);

		return Sgs_Webhook::send( 'sgs_wishlist_alert', $payload );
	}

	/**
	 * Format a minor-unit price to a plain decimal string via wc_price(),
	 * html-stripped; falls back to plain division when WC isn't loaded.
	 *
	 * @param int $minor    Price in minor units (pence, cents, …).
	 * @param int $decimals Currency's decimal places.
	 * @return string
	 */
	private static function format_price( int $minor, int $decimals ): string {
		$major = $minor / ( 10 ** $decimals );

		if ( \function_exists( 'wc_price' ) ) {
			return \html_entity_decode( \wp_strip_all_tags( \wc_price( $major ) ) );
		}

		return \number_format( $major, $decimals );
	}
}
