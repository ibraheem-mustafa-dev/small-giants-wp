<?php
/**
 * Wishlist Alert Mailer — sends the saved-items alert through the
 * `sgs_saved_items_alert` WooCommerce email, and fires the optional N8N
 * automation event alongside it (Spec 30 FR-30-15, unified-email plan
 * phase 3).
 *
 * Extracted out of {@see Wishlist_Alerts_Scan} to keep that file under its
 * 300-line cap.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Sends the saved-items alert email and its optional automation event. */
final class Wishlist_Alert_Mailer {

	/**
	 * Send one shopper's alert.
	 *
	 * The N8N automation event fires regardless of the WooCommerce email's
	 * on/off state — it is an optional side-channel, never the delivery
	 * mechanism. Returns true (so the caller moves the per-item baselines)
	 * either when the email actually sent, OR when the `sgs_saved_items_alert`
	 * email is switched off in WooCommerce > Settings > Emails: a switched-off
	 * alert must not queue forever. Returns false when the send failed or the
	 * email is not registered at all, so the caller retries next scan.
	 *
	 * @param  \WP_User $user  Shopper to alert.
	 * @param  array    $items Changed-item view models (already price-formatted).
	 * @return bool Whether the caller should move the per-item baselines.
	 */
	public static function send( \WP_User $user, array $items ): bool {
		$manage_url = Wishlist_Settings::saved_items_page_url();

		Sgs_Webhook::send(
			'sgs_wishlist_alert',
			array(
				'customer'   => array(
					'email'      => $user->user_email,
					'first_name' => $user->first_name,
				),
				'items'      => $items,
				'manage_url' => $manage_url,
			)
		);

		$email = Sgs_Shop_Emails::get_email( Sgs_Shop_Emails::SAVED_ITEMS_KEY );

		if ( ! $email instanceof \WC_Email ) {
			return false; // Not registered: keep the baselines so the next scan retries.
		}
		if ( ! $email->is_enabled() ) {
			return true;
		}

		return $email->trigger( $user->user_email, $user->first_name, $items, $manage_url );
	}
}
