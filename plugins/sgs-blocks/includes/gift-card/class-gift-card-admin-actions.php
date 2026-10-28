<?php
/**
 * Gift card admin actions (Spec 27, FR-27-GC8).
 *
 * Each action is an `admin_post_sgs_gift_card_*` handler that checks the
 * capability, verifies a nonce that names the action and the card, sanitises its
 * input and then calls the ledger service, which does the rule checks under a
 * row lock. A code created here is kept in a 5-minute per-user transient so the
 * next screen can show it once.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Admin-post handlers.
 */
final class Gift_Card_Admin_Actions {

	/** Actions handled (suffix after `sgs_gift_card_`). */
	const ACTIONS = array( 'issue', 'adjust', 'status', 'expiry', 'reissue', 'refund', 'export', 'issue_order' );

	/**
	 * Wire the handlers.
	 *
	 * @return void
	 */
	public static function register(): void {
		foreach ( self::ACTIONS as $action ) {
			\add_action( 'admin_post_sgs_gift_card_' . $action, array( __CLASS__, 'handle_' . $action ) );
		}
	}

	/**
	 * The nonce action name for an action and card.
	 *
	 * @param string $action Action suffix.
	 * @param int    $card   Card id (0 when none).
	 * @return string
	 */
	public static function nonce_action( string $action, int $card = 0 ): string {
		return 'sgs_gift_card_' . $action . '_' . $card;
	}

	/**
	 * Manual issue.
	 *
	 * @return void
	 */
	public static function handle_issue(): void {
		self::guard( 'issue', 0 );
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- guard() verified the nonce.
		$pence = Gift_Card_Money::to_pence( self::post( 'amount' ) );
		$email = \sanitize_email( self::post( 'recipient_email' ) );
		if ( null === $pence || ( '' !== $email && ! \is_email( $email ) ) ) {
			self::back( 0, 'bad_input' );
		}
		$data = array(
			'initial_pence'   => $pence,
			'recipient_name'  => self::post( 'recipient_name' ),
			'recipient_email' => $email,
			'sender_name'     => self::post( 'sender_name' ),
			'message'         => self::post( 'message' ),
		);
		// phpcs:enable
		$result = Gift_Card_Issuer::issue_manual( $data, \get_current_user_id() );
		self::keep_code( $result['code'] );
		self::back( $result['card_id'], 'issued' );
	}

	/**
	 * Issue the cards a paid order bought, for payments WooCommerce did not confirm itself
	 * (a bank transfer or cash on delivery that staff have checked).
	 *
	 * @return void
	 */
	public static function handle_issue_order(): void {
		self::guard( 'issue_order', 0 );
		$order = \wc_get_order( \absint( self::post( 'order_id' ) ) );
		if ( ! $order ) {
			self::back( 0, 'bad_input' );
		}
		self::back( 0, Gift_Card_Issuer::issue_for_paid_order( $order ) ? 'issued' : 'refused' );
	}

	/**
	 * Balance adjustment with a reason.
	 *
	 * @return void
	 */
	public static function handle_adjust(): void {
		$card = self::card_id();
		self::guard( 'adjust', $card );
		$sign  = 'debit' === self::post( 'direction' ) ? -1 : 1;
		$pence = Gift_Card_Money::to_pence( self::post( 'amount' ) );
		if ( null === $pence ) {
			self::back( $card, 'bad_input' );
		}
		try {
			Gift_Card_Services::ledger()->adjust( $card, $sign * $pence, self::post( 'reason' ), \get_current_user_id() );
		} catch ( Gift_Card_Exception $e ) {
			self::back( $card, 'bad_input' );
		}
		self::back( $card, 'adjusted' );
	}

	/**
	 * Disable or enable.
	 *
	 * @return void
	 */
	public static function handle_status(): void {
		$card = self::card_id();
		self::guard( 'status', $card );
		$status = 'disabled' === self::post( 'status' ) ? Gift_Card_Ledger::STATUS_DISABLED : Gift_Card_Ledger::STATUS_ACTIVE;
		try {
			Gift_Card_Services::ledger()->set_status( $card, $status, self::post( 'reason' ), \get_current_user_id() );
		} catch ( Gift_Card_Exception $e ) {
			self::back( $card, 'refused' );
		}
		self::back( $card, 'status' );
	}

	/**
	 * Change expiry (blank means never).
	 *
	 * @return void
	 */
	public static function handle_expiry(): void {
		$card = self::card_id();
		self::guard( 'expiry', $card );
		$date = self::post( 'expires_on' );
		if ( '' !== $date && ! Gift_Card_Purchase_Fields::is_date( $date ) ) {
			self::back( $card, 'bad_input' );
		}
		Gift_Card_Services::ledger()->set_expiry( $card, '' === $date ? null : $date . ' 23:59:59', self::post( 'reason' ), \get_current_user_id() );
		self::back( $card, 'expiry' );
	}

	/**
	 * Replace a lost code, once.
	 *
	 * @return void
	 */
	public static function handle_reissue(): void {
		$card = self::card_id();
		self::guard( 'reissue', $card );
		try {
			$result = Gift_Card_Issuer::reissue( $card, \get_current_user_id() );
		} catch ( Gift_Card_Exception $e ) {
			self::back( $card, 'refused' );
		}
		self::keep_code( $result['code'] );
		self::back( $card, 'reissued' );
	}

	/**
	 * Refund an unused card to its purchaser.
	 *
	 * @return void
	 */
	public static function handle_refund(): void {
		$card_id = self::card_id();
		self::guard( 'refund', $card_id );
		$requester = array(
			'user_id' => 0,
			'email'   => \sanitize_email( self::post( 'requester_email' ) ),
		);
		$card      = Gift_Card_Services::store()->find( $card_id );
		try {
			$pence = Gift_Card_Services::ledger()->refund_unused( $card_id, $requester, \get_current_user_id() );
		} catch ( Gift_Card_Exception $e ) {
			self::back( $card_id, 'refused' );
		}
		self::back( $card_id, null !== $card && self::refund_payment( $card, $pence ) ? 'refunded' : 'refund_manual' );
	}

	/**
	 * CSV download of the cards matching the current search.
	 *
	 * @return void
	 */
	public static function handle_export(): void {
		self::guard( 'export', 0 );
		// Every card matching the filters, 500 at a time (capped at 50,000 rows).
		$cards  = array();
		$offset = 0;
		do {
			$batch   = Gift_Card_Services::store()->search(
				array(
					's'      => self::post( 's' ),
					'status' => self::post( 'status_filter' ),
					'limit'  => 500,
					'offset' => $offset,
				)
			);
			$cards   = \array_merge( $cards, $batch );
			$offset += 500;
			$more    = 500 === \count( $batch ) && $offset < 50000;
		} while ( $more );
		\nocache_headers();
		\header( 'Content-Type: text/csv; charset=utf-8' );
		\header( 'Content-Disposition: attachment; filename="gift-cards-' . \gmdate( 'Y-m-d' ) . '.csv"' );
		echo Gift_Card_Csv::build( $cards ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSV, cells quoted and formula-neutralised.
		exit;
	}

	/**
	 * Take the one-time code saved for the current user, if any.
	 *
	 * @return string
	 */
	public static function take_one_time_code(): string {
		$key  = 'sgs_gc_once_' . \get_current_user_id();
		$code = \get_transient( $key );
		if ( ! \is_string( $code ) ) {
			return '';
		}
		\delete_transient( $key );
		return $code;
	}

	/**
	 * Refund the purchase through WooCommerce (refunds the payment when the gateway supports it).
	 *
	 * @param array<string,mixed> $card  Card row.
	 * @param int                 $pence Pence refunded.
	 * @return bool
	 */
	private static function refund_payment( array $card, int $pence ): bool {
		$order = \wc_get_order( (int) $card['purchaser_order_id'] );
		if ( ! $order || ! \function_exists( 'wc_create_refund' ) ) {
			return false;
		}
		$args = array(
			'order_id'       => $order->get_id(),
			'amount'         => Gift_Card_Money::decimal( $pence ),
			'reason'         => \__( 'Unused gift card refunded to the purchaser', 'sgs-blocks' ),
			'refund_payment' => true,
		);
		if ( (int) $card['order_item_id'] > 0 ) {
			$args['line_items'] = array(
				(int) $card['order_item_id'] => array(
					'qty'          => 1,
					'refund_total' => Gift_Card_Money::decimal( $pence ),
				),
			);
		}
		return ! \is_wp_error( \wc_create_refund( $args ) );
	}

	/**
	 * Capability and nonce gate for every handler.
	 *
	 * @param string $action Action suffix.
	 * @param int    $card   Card id.
	 * @return void
	 */
	private static function guard( string $action, int $card ): void {
		if ( ! \current_user_can( Gift_Card_Admin::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to do that.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		\check_admin_referer( self::nonce_action( $action, $card ) );
	}

	/**
	 * Card id from the request.
	 *
	 * @return int
	 */
	private static function card_id(): int {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- the nonce, which names this card id, is verified by guard() straight after.
		return isset( $_POST['card'] ) ? \absint( $_POST['card'] ) : 0;
	}

	/**
	 * A sanitised single-line POST value.
	 *
	 * @param string $name Field name.
	 * @return string
	 */
	private static function post( string $name ): string {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- callers run guard() first.
		return isset( $_POST[ $name ] ) ? \sanitize_text_field( \wp_unslash( $_POST[ $name ] ) ) : '';
	}

	/**
	 * Keep a freshly created code for one display.
	 *
	 * @param string $code Display-formatted code.
	 * @return void
	 */
	private static function keep_code( string $code ): void {
		\set_transient( 'sgs_gc_once_' . \get_current_user_id(), $code, 300 );
	}

	/**
	 * Redirect back with a notice key and stop.
	 *
	 * @param int    $card   Card id (0 for the list).
	 * @param string $notice Notice key.
	 * @return never
	 */
	private static function back( int $card, string $notice ): void {
		$args = array( 'sgs_gc_notice' => $notice );
		if ( $card > 0 ) {
			$args['card'] = $card;
		}
		\wp_safe_redirect( Gift_Card_Admin::url( $args ) );
		exit;
	}
}
