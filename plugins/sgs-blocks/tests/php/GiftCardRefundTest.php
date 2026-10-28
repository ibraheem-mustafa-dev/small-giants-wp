<?php
/**
 * Gift card refund rule and one-time reissue (Spec 27, FR-27-GC7).
 *
 * Purchaser only, completely unused only, inside the site's window (default 28 days).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\Group;
use SGS\Blocks\Gift_Card\Gift_Card_Exception;
use SGS\Blocks\Gift_Card\Gift_Card_Refund_Policy;
use SGS\Blocks\Tests\Support\Gift_Card_Test_Case;

require_once __DIR__ . '/support/Gift_Card_Test_Case.php';

#[Group( 'sgs_gift_card' )]
final class GiftCardRefundTest extends Gift_Card_Test_Case {

	private const DAY = 86400;

	/**
	 * A purchased, delivered card.
	 *
	 * @return array{id:int,code:string}
	 */
	private function bought( int $pence = 2500 ): array {
		return $this->issued_card(
			$pence,
			array(),
			array(
				'purchaser_order_id' => 55,
				'purchaser_user_id'  => 7,
				'purchaser_email'    => 'Buyer@Example.test',
				'recipient_email'    => 'friend@example.test',
			)
		);
	}

	private function refuse_reason( int $card, array $requester, int $at ): string {
		try {
			$this->ledger()->refund_unused( $card, $requester, 1, $at );
		} catch ( Gift_Card_Exception $e ) {
			$this->assertSame( Gift_Card_Exception::REFUND_REFUSED, $e->reason() );
			return $e->getMessage();
		}
		return 'REFUNDED';
	}

	public function test_the_purchaser_gets_an_unused_card_refunded_inside_the_window(): void {
		$card = $this->bought();
		$this->assertSame(
			2500,
			$this->ledger()->refund_unused(
				$card['id'],
				array(
					'user_id' => 0,
					'email'   => 'buyer@example.test',
				),
				1,
				$this->now + 27 * self::DAY
			)
		);

		$row = $this->store->find( $card['id'] );
		$this->assertSame( 'refunded', $row['status'] );
		$this->assertSame( 0, $row['balance_pence'] );
		$this->assertTrue( $this->ledger()->verify( $card['id'] )['ok'] );
	}

	public function test_a_logged_in_purchaser_is_recognised_by_account_even_with_another_email(): void {
		$card = $this->bought();
		$this->assertSame(
			2500,
			$this->ledger()->refund_unused(
				$card['id'],
				array(
					'user_id' => 7,
					'email'   => 'other@example.test',
				),
				1,
				$this->now + self::DAY
			)
		);
	}

	public function test_the_recipient_is_never_refunded(): void {
		$card = $this->bought();
		$this->assertSame(
			Gift_Card_Refund_Policy::NOT_PURCHASER,
			$this->refuse_reason(
				$card['id'],
				array(
					'user_id' => 0,
					'email'   => 'friend@example.test',
				),
				$this->now + self::DAY
			)
		);
		$this->assertSame(
			Gift_Card_Refund_Policy::NOT_PURCHASER,
			$this->refuse_reason(
				$card['id'],
				array(
					'user_id' => 8,
					'email'   => '',
				),
				$this->now + self::DAY
			)
		);
		$this->assertSame(
			Gift_Card_Refund_Policy::NOT_PURCHASER,
			$this->refuse_reason(
				$card['id'],
				array(
					'user_id' => 0,
					'email'   => '',
				),
				$this->now + self::DAY
			)
		);
		$this->assertSame( 'active', $this->store->find( $card['id'] )['status'] );
		// Control: the same card, asked for by the purchaser, is refunded.
		$this->assertSame(
			'REFUNDED',
			$this->refuse_reason(
				$card['id'],
				array(
					'user_id' => 7,
					'email'   => '',
				),
				$this->now + self::DAY
			)
		);
	}

	public function test_any_use_at_all_ends_the_right_to_a_refund(): void {
		$requester = array(
			'user_id' => 7,
			'email'   => '',
		);

		$spent = $this->bought();
		$this->ledger()->hold( $spent['id'], 1, 100, $this->now );
		$this->ledger()->consume( $spent['id'], 1, $this->now );
		$this->assertSame( Gift_Card_Refund_Policy::USED, $this->refuse_reason( $spent['id'], $requester, $this->now + self::DAY ) );

		$reserved = $this->bought();
		$this->ledger()->hold( $reserved['id'], 2, 100, $this->now );
		$this->assertSame( Gift_Card_Refund_Policy::USED, $this->refuse_reason( $reserved['id'], $requester, $this->now + self::DAY ) );

		$restored = $this->bought();
		$this->ledger()->hold( $restored['id'], 3, 100, $this->now );
		$this->ledger()->consume( $restored['id'], 3, $this->now );
		$this->ledger()->restore( $restored['id'], 3, $this->now );
		$this->assertSame( Gift_Card_Refund_Policy::USED, $this->refuse_reason( $restored['id'], $requester, $this->now + self::DAY ), 'Balance is whole again but it was used.' );

		$adjusted = $this->bought();
		$this->ledger()->adjust( $adjusted['id'], 500, 'goodwill', 1, $this->now );
		$this->assertSame( Gift_Card_Refund_Policy::USED, $this->refuse_reason( $adjusted['id'], $requester, $this->now + self::DAY ) );

		// Control: a card nobody touched is refunded.
		$untouched = $this->bought();
		$this->assertSame( 'REFUNDED', $this->refuse_reason( $untouched['id'], $requester, $this->now + self::DAY ) );
	}

	public function test_the_window_is_28_days_by_default_and_follows_the_setting(): void {
		$requester = array(
			'user_id' => 7,
			'email'   => '',
		);

		$late = $this->bought();
		$this->assertSame( Gift_Card_Refund_Policy::WINDOW_CLOSED, $this->refuse_reason( $late['id'], $requester, $this->now + 28 * self::DAY + 1 ) );

		$edge = $this->bought();
		$this->assertSame( 'REFUNDED', $this->refuse_reason( $edge['id'], $requester, $this->now + 28 * self::DAY ), 'Day 28 is still inside.' );

		$wide = $this->bought();
		$this->assertSame( 2500, $this->ledger( array( 'refund_days' => 60 ) )->refund_unused( $wide['id'], $requester, 1, $this->now + 59 * self::DAY ) );

		$tight = $this->bought();
		try {
			$this->ledger( array( 'refund_days' => 14 ) )->refund_unused( $tight['id'], $requester, 1, $this->now + 15 * self::DAY );
			$this->fail( 'A 14-day window must close after 14 days.' );
		} catch ( Gift_Card_Exception $e ) {
			$this->assertSame( Gift_Card_Exception::REFUND_REFUSED, $e->reason() );
		}
	}

	public function test_the_refund_window_cannot_be_set_below_the_legal_minimum(): void {
		$settings = new SGS\Blocks\Gift_Card\Gift_Card_Settings( array( 'refund_days' => 3 ) );
		$this->assertSame( 14, $settings->refund_days() );
		$this->assertSame( 28, ( new SGS\Blocks\Gift_Card\Gift_Card_Settings() )->refund_days() );
	}

	public function test_a_disabled_or_already_refunded_card_cannot_be_refunded(): void {
		$requester = array(
			'user_id' => 7,
			'email'   => '',
		);

		$disabled = $this->bought();
		$this->ledger()->set_status( $disabled['id'], 'disabled', 'fraud', 1, $this->now );
		$this->assertSame( Gift_Card_Refund_Policy::NOT_ACTIVE, $this->refuse_reason( $disabled['id'], $requester, $this->now + self::DAY ) );

		$twice = $this->bought();
		$this->ledger()->refund_unused( $twice['id'], $requester, 1, $this->now + self::DAY );
		$this->assertSame( Gift_Card_Refund_Policy::NOT_ACTIVE, $this->refuse_reason( $twice['id'], $requester, $this->now + self::DAY ) );
		$this->assertSame( 0, $this->store->find( $twice['id'] )['balance_pence'] );
	}

	public function test_a_refunded_card_cannot_be_spent(): void {
		$card = $this->bought();
		$this->ledger()->refund_unused(
			$card['id'],
			array(
				'user_id' => 7,
				'email'   => '',
			),
			1,
			$this->now + self::DAY
		);
		$this->expectException( Gift_Card_Exception::class );
		$this->ledger()->hold( $card['id'], 9, 100, $this->now + self::DAY );
	}

	public function test_a_lost_code_is_replaced_once_and_the_old_code_stops_working(): void {
		$card   = $this->bought();
		$ledger = $this->ledger();
		$old    = $this->store->find( $card['id'] )['code_hash'];

		$ledger->reissue( $card['id'], str_repeat( 'a', 64 ), 'WXYZ', 1, $this->now );
		$row = $this->store->find( $card['id'] );
		$this->assertNotSame( $old, $row['code_hash'] );
		$this->assertNull( $this->store->find_by_hash( $old ), 'The old hash no longer finds a card.' );
		$this->assertSame( $card['id'], $this->store->find_by_hash( str_repeat( 'a', 64 ) )['id'] );
		$this->assertSame( 1, $row['reissue_count'] );

		try {
			$ledger->reissue( $card['id'], str_repeat( 'b', 64 ), 'ABCD', 1, $this->now );
			$this->fail( 'A second reissue must be refused.' );
		} catch ( Gift_Card_Exception $e ) {
			$this->assertSame( Gift_Card_Exception::REISSUE_REFUSED, $e->reason() );
		}
		$this->assertSame( str_repeat( 'a', 64 ), $this->store->find( $card['id'] )['code_hash'] );
	}

	public function test_a_card_with_no_balance_or_no_code_cannot_be_reissued(): void {
		$ledger = $this->ledger();
		$empty  = $this->bought( 500 );
		$ledger->adjust( $empty['id'], -500, 'drain', 1, $this->now );
		$unsent = $ledger->create( array( 'initial_pence' => 500 ), $this->now );
		foreach ( array( $empty['id'], $unsent ) as $id ) {
			try {
				$ledger->reissue( $id, str_repeat( 'c', 64 ), 'ABCD', 1, $this->now );
				$this->fail( 'Reissue should be refused for card ' . $id );
			} catch ( Gift_Card_Exception $e ) {
				$this->assertSame( Gift_Card_Exception::REISSUE_REFUSED, $e->reason() );
			}
		}
	}
}
