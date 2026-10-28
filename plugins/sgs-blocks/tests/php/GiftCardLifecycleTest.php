<?php
/**
 * Gift card order lifecycle, issuing and email delivery (Spec 27, FR-27-GC6 and FR-27-GC9).
 *
 * Reserve at order creation, consume on payment, release on cancel, restore on refund; a paid
 * purchase creates the card; the code is emailed once, on the send date; a mail failure retries.
 * The scenarios run in a child process (tests/php/support/gift-card-lifecycle-harness.php).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\TestCase;

#[Group( 'sgs_gift_card' )]
final class GiftCardLifecycleTest extends TestCase {

	/** @var array<string,mixed> */
	private static array $r = array();

	public static function setUpBeforeClass(): void {
		$script = __DIR__ . '/support/gift-card-lifecycle-harness.php';
		$out    = array();
		$code   = 0;
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1', $out, $code );
		$json = json_decode( implode( "\n", $out ), true );
		if ( 0 !== $code || ! is_array( $json ) ) {
			self::fail( 'Harness failed: ' . implode( "\n", $out ) );
		}
		self::$r = $json;
	}

	public function test_a_paid_purchase_creates_one_card_and_sends_two_emails(): void {
		$this->assertSame( 1, self::$r['a_cards'] );
		$this->assertSame( array( 'buyer@example.test', 'aisha@example.test' ), self::$r['a_mail_to'], 'Purchaser confirmation, then recipient delivery.' );
		$this->assertTrue( self::$r['a_expires'], 'The card carries the site expiry.' );
		$this->assertTrue( self::$r['a_delivered'] );
	}

	public function test_the_plain_code_is_in_the_recipients_email_only(): void {
		$this->assertFalse( self::$r['a_confirmation_has_code'], 'The purchaser confirmation must not carry the code.' );
		$this->assertMatchesRegularExpression( '/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/', self::$r['a_delivery_code'] );
		$this->assertTrue( self::$r['a_delivery_html_has_same'], 'HTML and text parts of the delivery carry the same code.' );
		$this->assertFalse( self::$r['a_store_has_plain'], 'The database holds only a hash and the last four.' );
		$this->assertSame( substr( str_replace( '-', '', self::$r['a_delivery_code'] ), -4 ), self::$r['a_stored_last4'] );
		$this->assertSame( 1, self::$r['a_code_finds_card'], 'The emailed code finds the card through the HMAC hash.' );
	}

	public function test_issuing_twice_does_not_duplicate_the_card_or_the_emails(): void {
		$this->assertSame( 1, self::$r['b_cards_after_repeat'] );
		$this->assertSame( 0, self::$r['b_extra_mail'] );
	}

	public function test_a_future_send_date_holds_the_code_back_until_that_day(): void {
		$this->assertNull( self::$r['c_code_before'], 'No code exists before delivery.' );
		$this->assertSame( array( 'buyer@example.test' ), self::$r['c_mail_to_at_purchase'], 'Only the purchaser is emailed at purchase.' );
		$this->assertTrue( self::$r['c_confirmation_mentions_date'] );
		$this->assertSame( 0, self::$r['c_sweep_early'], 'The sweep before the date delivers nothing.' );
		$this->assertSame( 1, self::$r['c_sweep_on_day'] );
		$this->assertSame( array( 'aisha@example.test' ), self::$r['c_delivery_to'] );
		$this->assertSame( 0, self::$r['c_sweep_again'], 'A delivered card is not sent twice.' );
		$this->assertTrue( self::$r['c_code_after'] );
	}

	public function test_a_failed_email_undoes_the_code_and_the_next_sweep_retries(): void {
		$this->assertNull( self::$r['d_code_after_failure'] );
		$this->assertNull( self::$r['d_delivered_after_failure'] );
		$this->assertSame( 1, self::$r['d_retry_sweep'] );
		$this->assertTrue( self::$r['d_retry_has_code'] );
	}

	public function test_reservation_consumption_and_balance_notice(): void {
		$this->assertSame( 1000, self::$r['e_reserved'] );
		$this->assertSame( array( '1' => 1000 ), self::$r['e_holds_meta'] );
		$this->assertSame( array( 2500, 1000 ), self::$r['e_after_on_hold'], 'On hold (awaiting payment) keeps it reserved, not spent.' );
		$this->assertSame( array( 1500, 0 ), self::$r['e_after_paid'], 'Paid: the reservation becomes spent balance.' );
		$this->assertSame( array( 'buyer@example.test' ), self::$r['e_balance_mail'] );
		$this->assertStringContainsString( '£15.00 left', self::$r['e_balance_mail_text'] );
		$this->assertSame( 1500, self::$r['e_after_completed'], 'Completing a paid order does not spend twice.' );
	}

	public function test_refund_restores_and_cancel_releases(): void {
		$this->assertSame( 2500, self::$r['e_after_refund'], 'Refunded: the spent amount returns to the card.' );
		$this->assertSame( 700, self::$r['e_reserved_second'] );
		$this->assertSame( array( 2500, 0 ), self::$r['e_after_cancel'], 'Cancelled before payment: released, nothing spent.' );
	}

	public function test_an_order_the_card_can_no_longer_cover_is_refused_with_no_reservation(): void {
		$this->assertSame( 'REFUSED', self::$r['e_overspend'] );
		$this->assertSame( 0, self::$r['e_reserved_after_refusal'] );
		$this->assertTrue( self::$r['e_ledger_ok'], 'After all of the above the ledger still equals the card row.' );
	}

	public function test_cancelling_the_purchase_order_disables_the_card_it_bought(): void {
		$this->assertSame( 'disabled', self::$r['f_status_after_cancel'] );
	}

	public function test_a_lost_code_is_reissued_once_to_the_purchaser_and_the_old_code_dies(): void {
		$this->assertTrue( self::$r['g_new_differs'] );
		$this->assertTrue( self::$r['g_emailed'] );
		$this->assertSame( array( 'buyer@example.test' ), self::$r['g_mail_to'], 'The replacement goes to the purchaser, not the recipient.' );
		$this->assertNull( self::$r['g_old_finds'] );
		$this->assertSame( 1, self::$r['g_new_finds'] );
		$this->assertSame( 'reissue_refused', self::$r['g_second'] );
	}
}
