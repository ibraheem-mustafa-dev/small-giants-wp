<?php
/**
 * Child-process harness for GiftCardLifecycleTest (Spec 27, FR-27-GC6 and FR-27-GC9).
 *
 * Runs the REAL Gift_Card_Issuer, Gift_Card_Order, Gift_Card_Emails and Gift_Card_Services with the
 * in-memory store, fake order objects and a recording stand-in for Sgs_Mailer, and prints one JSON
 * object of scenario results.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

namespace SGS\Blocks\Mail {
	final class Sgs_Mailer {
		public static array $sent = array();
		public static bool $ok = true;
		public static function send( string $to, string $subject, string $heading, string $html, string $text, array $args = array() ): bool {
			if ( ! self::$ok ) {
				return false;
			}
			self::$sent[] = array( 'to' => $to, 'subject' => $subject, 'html' => $html, 'text' => $text );
			return true;
		}
	}
}

namespace {

	define( 'ABSPATH', dirname( __DIR__, 3 ) . '/' );
	$GLOBALS['t_options'] = array();
	$GLOBALS['t_today']   = '2026-10-28';

	function get_option( $k, $d = false ) { return $GLOBALS['t_options'][ $k ] ?? $d; }
	function wp_salt( $s = '' ) { return 'harness-salt-' . $s; }
	function __( $s ) { return $s; }
	function _n( $a, $b, $n ) { return 1 === $n ? $a : $b; }
	function get_bloginfo( $k = '' ) { return 'Example Shop'; }
	function wp_date( $f, $ts = null ) { return null === $ts ? $GLOBALS['t_today'] : gmdate( $f, $ts ); }
	function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
	function wp_next_scheduled() { return true; }
	function add_action() {}
	function add_filter() {}

	class T_Item {
		public function __construct( public int $id, public array $meta, public int $qty = 1 ) {}
		public function get_id() { return $this->id; }
		public function get_meta( $k ) { return $this->meta[ $k ] ?? ''; }
		public function get_quantity() { return $this->qty; }
	}

	class T_Order {
		public array $meta = array();
		public function __construct( public int $id, public array $items = array(), public array $fees = array(), public string $email = 'buyer@example.test' ) {}
		public function get_id() { return $this->id; }
		public function get_items() { return $this->items; }
		public function get_fees() { return $this->fees; }
		public function get_currency() { return 'GBP'; }
		public function get_customer_id() { return 7; }
		public function get_billing_email() { return $this->email; }
		public function get_meta( $k ) { return $this->meta[ $k ] ?? ''; }
		public function update_meta_data( $k, $v ) { $this->meta[ $k ] = $v; }
		public function save_meta_data() {}
	}

	require_once __DIR__ . '/gift-card-domain.php';
	$dir = dirname( __DIR__, 3 ) . '/includes/gift-card/';
	foreach ( array( 'class-gift-card-product-type.php', 'class-gift-card-tables.php', 'class-gift-card-wpdb-store.php', 'class-gift-card-services.php', 'class-gift-card-form-view.php', 'class-gift-card-purchase.php', 'class-gift-card-redemption.php', 'class-gift-card-emails.php', 'class-gift-card-issuer.php', 'class-gift-card-order.php' ) as $f ) {
		require_once $dir . $f;
	}

	use SGS\Blocks\Gift_Card\Gift_Card_Code;
	use SGS\Blocks\Gift_Card\Gift_Card_Emails;
	use SGS\Blocks\Gift_Card\Gift_Card_Issuer;
	use SGS\Blocks\Gift_Card\Gift_Card_Order;
	use SGS\Blocks\Gift_Card\Gift_Card_Services;
	use SGS\Blocks\Mail\Sgs_Mailer;
	use SGS\Blocks\Tests\Support\Memory_Gift_Card_Store;

	$store = new Memory_Gift_Card_Store();
	Gift_Card_Services::use_store( $store );
	$_SERVER['REMOTE_ADDR'] = '203.0.113.9';

	function purchase( int $order_id, int $item_id, string $send_on = null, int $pence = 2500 ): T_Order {
		return new T_Order( $order_id, array( new T_Item( $item_id, array( '_sgs_gift_card' => array(
			'amount_pence' => $pence, 'recipient_name' => 'Aisha', 'recipient_email' => 'aisha@example.test',
			'sender_name' => 'Bean', 'message' => 'Congratulations', 'send_on' => $send_on,
		) ) ) ) );
	}

	function code_in( string $text ): ?string {
		return 1 === preg_match( '/([0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){3})/', $text, $m ) ? $m[1] : null;
	}

	function lookup_finds( string $code ): ?int {
		$norm = Gift_Card_Code::normalise( $code );
		$row  = Gift_Card_Services::store()->find_by_hash( Gift_Card_Code::hash( $norm, Gift_Card_Code::default_key() ) );
		return $row ? (int) $row['id'] : null;
	}

	$r = array();

	// A. Immediate delivery.
	$order = purchase( 100, 1000 );
	Gift_Card_Issuer::issue_for_order( $order );
	$r['a_cards']        = count( $store->cards_for_order( 100 ) );
	$r['a_mail_to']      = array_column( Sgs_Mailer::$sent, 'to' );
	$confirmation        = Sgs_Mailer::$sent[0] ?? array( 'html' => '', 'text' => '' );
	$delivery            = Sgs_Mailer::$sent[1] ?? array( 'html' => '', 'text' => '' );
	$r['a_confirmation_has_code'] = null !== code_in( $confirmation['html'] . $confirmation['text'] );
	$r['a_delivery_code']         = code_in( $delivery['text'] );
	$r['a_delivery_html_has_same'] = null !== $r['a_delivery_code'] && str_contains( $delivery['html'], $r['a_delivery_code'] );
	$r['a_code_finds_card']       = $r['a_delivery_code'] ? lookup_finds( $r['a_delivery_code'] ) : null;
	$card1                        = $store->find( 1 );
	$r['a_stored_last4']          = $card1['code_last4'];
	$r['a_delivered']             = null !== $card1['delivered_at'];
	$r['a_store_has_plain']       = $r['a_delivery_code'] ? ( str_contains( json_encode( array( $store->cards, $store->ledger ) ), str_replace( '-', '', $r['a_delivery_code'] ) ) || str_contains( json_encode( array( $store->cards, $store->ledger ) ), $r['a_delivery_code'] ) ) : null;
	$r['a_expires']               = $card1['expires_at'] !== null;

	// B. Idempotent.
	$before = count( Sgs_Mailer::$sent );
	Gift_Card_Issuer::issue_for_order( $order );
	$r['b_cards_after_repeat'] = count( $store->cards_for_order( 100 ) );
	$r['b_extra_mail']         = count( Sgs_Mailer::$sent ) - $before;

	// C. Scheduled delivery.
	Sgs_Mailer::$sent = array();
	$sched = purchase( 101, 1001, '2026-11-05' );
	Gift_Card_Issuer::issue_for_order( $sched );
	$sched_card = $store->cards_for_order( 101 )[0];
	$r['c_code_before']      = $sched_card['code_hash'];
	$r['c_mail_to_at_purchase'] = array_column( Sgs_Mailer::$sent, 'to' );
	$r['c_confirmation_mentions_date'] = isset( Sgs_Mailer::$sent[0] ) && str_contains( Sgs_Mailer::$sent[0]['text'], '5 November 2026' );
	$r['c_sweep_early']      = Gift_Card_Issuer::sweep();
	$GLOBALS['t_today']      = '2026-11-05';
	Sgs_Mailer::$sent        = array();
	$r['c_sweep_on_day']     = Gift_Card_Issuer::sweep();
	$r['c_delivery_to']      = array_column( Sgs_Mailer::$sent, 'to' );
	$r['c_sweep_again']      = Gift_Card_Issuer::sweep();
	$r['c_code_after']       = null !== $store->cards_for_order( 101 )[0]['code_hash'];
	$GLOBALS['t_today']      = '2026-10-28';

	// D. Mail failure rolls the code back and the next sweep retries.
	$failing = purchase( 102, 1002 );
	Sgs_Mailer::$ok = false;
	Gift_Card_Issuer::issue_for_order( $failing );
	$d_card = $store->cards_for_order( 102 )[0];
	$r['d_code_after_failure'] = $d_card['code_hash'];
	$r['d_delivered_after_failure'] = $d_card['delivered_at'];
	Sgs_Mailer::$ok = true;
	Sgs_Mailer::$sent = array();
	$r['d_retry_sweep'] = Gift_Card_Issuer::sweep();
	$r['d_retry_has_code'] = null !== code_in( Sgs_Mailer::$sent[0]['text'] ?? '' );

	// E. Redemption lifecycle through the order hooks.
	$card_id = (int) $store->cards_for_order( 100 )[0]['id'];
	$fee = fn( int $id, int $pence ) => new T_Item( 0, array( '_sgs_gift_card_id' => $id, '_sgs_gift_card_pence' => $pence ) );
	$ledger = Gift_Card_Services::ledger();

	$redeem = new T_Order( 200, array(), array( $fee( $card_id, 1000 ) ) );
	Gift_Card_Order::reserve( $redeem );
	$r['e_reserved']   = $store->find( $card_id )['reserved_pence'];
	$r['e_holds_meta'] = $redeem->meta['_sgs_gift_card_holds'];
	Gift_Card_Order::on_status_changed( 200, 'pending', 'on-hold', $redeem );
	$r['e_after_on_hold'] = array( $store->find( $card_id )['balance_pence'], $store->find( $card_id )['reserved_pence'] );
	Sgs_Mailer::$sent = array();
	Gift_Card_Order::on_status_changed( 200, 'on-hold', 'processing', $redeem );
	$r['e_after_paid']  = array( $store->find( $card_id )['balance_pence'], $store->find( $card_id )['reserved_pence'] );
	$r['e_balance_mail'] = array_column( Sgs_Mailer::$sent, 'to' );
	$r['e_balance_mail_text'] = Sgs_Mailer::$sent[0]['text'] ?? '';
	Gift_Card_Order::on_status_changed( 200, 'processing', 'completed', $redeem );
	$r['e_after_completed'] = $store->find( $card_id )['balance_pence'];
	Gift_Card_Order::on_status_changed( 200, 'completed', 'refunded', $redeem );
	$r['e_after_refund'] = $store->find( $card_id )['balance_pence'];

	$cancelled = new T_Order( 201, array(), array( $fee( $card_id, 700 ) ) );
	Gift_Card_Order::reserve( $cancelled );
	$r['e_reserved_second'] = $store->find( $card_id )['reserved_pence'];
	Gift_Card_Order::on_status_changed( 201, 'pending', 'cancelled', $cancelled );
	$r['e_after_cancel'] = array( $store->find( $card_id )['balance_pence'], $store->find( $card_id )['reserved_pence'] );

	$too_much = new T_Order( 202, array(), array( $fee( $card_id, 999999 ) ) );
	try {
		Gift_Card_Order::reserve( $too_much );
		$r['e_overspend'] = 'RESERVED';
	} catch ( \Exception $e ) {
		$r['e_overspend'] = 'REFUSED';
	}
	$r['e_reserved_after_refusal'] = $store->find( $card_id )['reserved_pence'];
	$r['e_ledger_ok'] = $ledger->verify( $card_id )['ok'];

	// F. Cancelling the purchase order disables the card it bought.
	$cancel_purchase = purchase( 103, 1003 );
	Gift_Card_Issuer::issue_for_order( $cancel_purchase );
	$bought_id = (int) $store->cards_for_order( 103 )[0]['id'];
	Gift_Card_Order::on_status_changed( 103, 'processing', 'cancelled', $cancel_purchase );
	$r['f_status_after_cancel'] = $store->find( $bought_id )['status'];

	// G. Reissue.
	Sgs_Mailer::$sent = array();
	$g_card = $store->cards_for_order( 100 )[0];
	$old_code = $r['a_delivery_code'];
	$reissued = Gift_Card_Issuer::reissue( (int) $g_card['id'], 1 );
	$r['g_new_differs']  = $reissued['code'] !== $old_code;
	$r['g_emailed']      = $reissued['emailed'];
	$r['g_mail_to']      = array_column( Sgs_Mailer::$sent, 'to' );
	$r['g_old_finds']    = lookup_finds( $old_code );
	$r['g_new_finds']    = lookup_finds( $reissued['code'] );
	try {
		Gift_Card_Issuer::reissue( (int) $g_card['id'], 1 );
		$r['g_second'] = 'REISSUED';
	} catch ( \SGS\Blocks\Gift_Card\Gift_Card_Exception $e ) {
		$r['g_second'] = $e->reason();
	}

	echo json_encode( $r );
}
