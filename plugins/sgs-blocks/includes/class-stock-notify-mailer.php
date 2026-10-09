<?php
/**
 * Stock Notify Mailer — sends the back-in-stock notice through the
 * `sgs_back_in_stock` WooCommerce email, one per subscriber (Spec 27 Part 3
 * FR-30-15, unified-email plan phase 3).
 *
 * Extracted out of {@see Stock_Notify_Dispatch} to keep that file's dispatch
 * handler small and testable.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Sends the back-in-stock email to each subscriber on a product's notify-me list. */
final class Stock_Notify_Mailer {

	/**
	 * Send the back-in-stock notice to every subscriber, one email each.
	 *
	 * When the `sgs_back_in_stock` email is not registered, the whole list is
	 * kept for the next restock. When it is switched off in WooCommerce >
	 * Settings > Emails, the whole list is treated as delivered — a switched-off alert must not
	 * queue forever. Otherwise each subscriber is sent to individually; a
	 * failed send keeps that subscriber's original entry in the returned
	 * list so the next stock-status change retries only the failures.
	 *
	 * @param  int   $product_id  Restocked product's post ID.
	 * @param  array $subscribers `{email, ts}` entries read from the product's meta.
	 * @return array Subscriber entries to keep (failed sends only, deduplicated originals dropped).
	 */
	public static function send( int $product_id, array $subscribers ): array {
		$email = Sgs_Shop_Emails::get_email( Sgs_Shop_Emails::BACK_IN_STOCK_KEY );

		if ( ! $email instanceof \WC_Email ) {
			return $subscribers; // Not registered: keep everyone for the next restock.
		}
		if ( ! $email->is_enabled() ) {
			return array();
		}

		$name       = (string) \get_the_title( $product_id );
		$url        = (string) \get_permalink( $product_id );
		$manage_url = Wishlist_Settings::saved_items_page_url();

		$remaining = array();
		$seen      = array();

		foreach ( $subscribers as $entry ) {
			$to = ( isset( $entry['email'] ) && \is_string( $entry['email'] ) ) ? $entry['email'] : '';
			if ( '' === $to ) {
				continue; // Malformed entry; drop it rather than retry forever.
			}

			$key = \strtolower( $to );
			if ( isset( $seen[ $key ] ) ) {
				continue; // One email per address per run.
			}
			$seen[ $key ] = true;

			if ( ! $email->trigger( $to, $name, $url, $manage_url ) ) {
				$remaining[] = $entry;
			}
		}

		return $remaining;
	}
}
