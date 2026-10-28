<?php
/**
 * Gift card admin screens (Spec 27, FR-27-GC8).
 *
 * WooCommerce > Gift cards: list with search, liability total, CSV export, one
 * card's detail with its ledger, manual issue, balance adjustment with a reason,
 * disable or enable, change expiry, lost-code reissue and purchaser refund, plus
 * the settings tab. Every screen needs `manage_woocommerce`; every action posts
 * to admin-post with a nonce.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Menu, routing and notices.
 */
final class Gift_Card_Admin {

	/** Capability for every gift-card screen and action. */
	const CAP = 'manage_woocommerce';

	/** Menu and page slug. */
	const PAGE = 'sgs-gift-cards';

	/** Rows per page. */
	const PER_PAGE = 25;

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
		Gift_Card_Admin_Actions::register();
		Gift_Card_Settings_Page::register();
	}

	/**
	 * Add the submenu under WooCommerce.
	 *
	 * @return void
	 */
	public static function add_menu(): void {
		\add_submenu_page( 'woocommerce', \__( 'Gift cards', 'sgs-blocks' ), \__( 'Gift cards', 'sgs-blocks' ), self::CAP, self::PAGE, array( __CLASS__, 'render' ) );
	}

	/**
	 * Admin URL for this screen.
	 *
	 * @param array<string,scalar> $args Query arguments.
	 * @return string
	 */
	public static function url( array $args = array() ): string {
		return \add_query_arg( \array_merge( array( 'page' => self::PAGE ), $args ), \admin_url( 'admin.php' ) );
	}

	/**
	 * Route to the list, a card, or the settings tab.
	 *
	 * @return void
	 */
	public static function render(): void {
		if ( ! \current_user_can( self::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to view gift cards.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		echo '<div class="wrap sgs-gift-card-admin"><h1 class="wp-heading-inline">' . \esc_html__( 'Gift cards', 'sgs-blocks' ) . '</h1>';
		self::notices();

		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- read-only routing of an admin screen behind a capability check.
		$tab  = isset( $_GET['tab'] ) ? \sanitize_key( \wp_unslash( $_GET['tab'] ) ) : '';
		$card = isset( $_GET['card'] ) ? \absint( $_GET['card'] ) : 0;
		// phpcs:enable

		if ( 'settings' === $tab ) {
			Gift_Card_Settings_Page::render();
		} elseif ( $card > 0 ) {
			Gift_Card_Admin_Views::card( $card );
		} else {
			Gift_Card_Admin_Views::list();
		}
		echo '</div>';
	}

	/**
	 * Print the one-off notice for the last action, and any one-time code.
	 *
	 * @return void
	 */
	private static function notices(): void {
		$messages = array(
			'settings_saved' => array( 'success', \__( 'Settings saved.', 'sgs-blocks' ) ),
			'issued'         => array( 'success', \__( 'Gift card issued.', 'sgs-blocks' ) ),
			'adjusted'       => array( 'success', \__( 'Balance adjusted.', 'sgs-blocks' ) ),
			'status'         => array( 'success', \__( 'Status updated.', 'sgs-blocks' ) ),
			'expiry'         => array( 'success', \__( 'Expiry updated.', 'sgs-blocks' ) ),
			'reissued'       => array( 'success', \__( 'A replacement code was created and the old code no longer works.', 'sgs-blocks' ) ),
			'refunded'       => array( 'success', \__( 'The unused card was refunded to the purchaser.', 'sgs-blocks' ) ),
			'refund_manual'  => array( 'warning', \__( 'The card was cancelled, but the payment refund could not be made automatically. Refund the order line in WooCommerce.', 'sgs-blocks' ) ),
			'refused'        => array( 'error', \__( 'That action was refused. Check the details and the refund rules, then try again.', 'sgs-blocks' ) ),
			'bad_input'      => array( 'error', \__( 'Check the amount, reason and dates you entered.', 'sgs-blocks' ) ),
		);
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- selects a fixed message by key.
		$key = isset( $_GET['sgs_gc_notice'] ) ? \sanitize_key( \wp_unslash( $_GET['sgs_gc_notice'] ) ) : '';
		if ( isset( $messages[ $key ] ) ) {
			\printf( '<div class="notice notice-%1$s is-dismissible"><p>%2$s</p></div>', \esc_attr( $messages[ $key ][0] ), \esc_html( $messages[ $key ][1] ) );
		}

		$once = Gift_Card_Admin_Actions::take_one_time_code();
		if ( '' !== $once ) {
			\printf(
				'<div class="notice notice-info"><p>%1$s <strong class="sgs-gift-card-admin__code">%2$s</strong></p><p>%3$s</p></div>',
				\esc_html__( 'Gift card code (shown once, it is stored only as a hash):', 'sgs-blocks' ),
				\esc_html( $once ),
				\esc_html__( 'Copy it now if the email did not reach the customer.', 'sgs-blocks' )
			);
		}
	}
}
