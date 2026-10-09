<?php
/**
 * SGS Shop Emails — registers the saved-items-alert and back-in-stock
 * `WC_Email` subclasses with WooCommerce (Spec 27 Part 3 FR-30-15, unified-email
 * plan phase 3), so a client sees and switches them on WooCommerce > Settings
 * > Emails beside the sales emails.
 *
 * `WC_Email` only exists once WooCommerce has loaded, so the subclass files
 * are `require_once`'d INSIDE the `woocommerce_email_classes` filter
 * callback — never at plugin load, where a top-level `class X extends
 * WC_Email` would fatal on a site with WooCommerce inactive.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Registers the SGS shop-alert emails with WooCommerce. */
final class Sgs_Shop_Emails {

	/** Key `Email_Saved_Items_Alert` is registered under in `WC_Emails::$emails`. */
	const SAVED_ITEMS_KEY = 'SGS_Saved_Items_Alert';

	/** Key `Email_Back_In_Stock` is registered under in `WC_Emails::$emails`. */
	const BACK_IN_STOCK_KEY = 'SGS_Back_In_Stock';

	/** Wire the registration hook. Called once from sgs-blocks.php. */
	public static function register(): void {
		\add_filter( 'woocommerce_email_classes', array( __CLASS__, 'add_email_classes' ) );
	}

	/**
	 * Add the two SGS shop-alert emails to WooCommerce's registered emails.
	 *
	 * @param  array $email_classes Existing registered email instances, keyed by class name.
	 * @return array
	 */
	public static function add_email_classes( array $email_classes ): array {
		require_once __DIR__ . '/class-email-saved-items-alert.php';
		require_once __DIR__ . '/class-email-back-in-stock.php';

		$email_classes[ self::SAVED_ITEMS_KEY ]   = new Email_Saved_Items_Alert();
		$email_classes[ self::BACK_IN_STOCK_KEY ] = new Email_Back_In_Stock();

		return $email_classes;
	}

	/**
	 * Fetch a registered SGS email instance from WooCommerce's mailer.
	 *
	 * @param  string $key One of self::SAVED_ITEMS_KEY / self::BACK_IN_STOCK_KEY.
	 * @return \WC_Email|null Null when WooCommerce isn't active or hasn't registered it yet.
	 */
	public static function get_email( string $key ): ?\WC_Email {
		if ( ! \function_exists( 'WC' ) ) {
			return null;
		}
		$mailer = \WC()->mailer();
		if ( ! $mailer ) {
			return null;
		}
		$emails = $mailer->get_emails();
		return isset( $emails[ $key ] ) && $emails[ $key ] instanceof \WC_Email ? $emails[ $key ] : null;
	}
}
