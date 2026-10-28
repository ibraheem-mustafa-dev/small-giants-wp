<?php
/**
 * Gift card ledger fails closed (Spec 27, FR-27-GC6).
 *
 * consume() never settles a reservation on a card that is no longer active; disabling a card or replacing
 * its code releases every open reservation in the same locked transaction; an expiry that passes AFTER a
 * valid reservation is still honoured.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\Group;
use SGS\Blocks\Gift_Card\Gift_Card_Exception;
use SGS\Blocks\Gift_Card\Gift_Card_Ledger;
use SGS\Blocks\Tests\Support\Gift_Card_Test_Case;

require_once __DIR__ . '/support/Gift_Card_Test_Case.php';

#[Group( 'sgs_gift_card' )]
final class GiftCardFailClosedTest extends Gift_Card_Test_Case {

	public function test_consume_on_a_disabled_card_is_refused_and_releases_the_reservation(): void {
		$card   = $this->issued_card( 2500 );
		$ledger = $this->ledger();
		$ledger->hold( $card['id'], 7, 1000, $this->now );

		// Another path (not set_status) leaves the card disabled while the reservation is open.
		$this->store->cards[ $card['id'] ]['status'] = 'disabled';

		try {
			$ledger->consume( $card['id'], 7, $this->now );
			$this->fail( 'A disabled card must not settle.' );
		} catch ( Gift_Card_Exception $e ) {
			$this->assertSame( Gift_Card_Exception::DISABLED, $e->reason() );
		}

		$after = $this->store->find( $card['id'] );
		$this->assertSame( 2500, $after['balance_pence'], 'Balance unchanged.' );
		$this->assertSame( 0, $after['reserved_pence'], 'The reservation was released.' );
		$this->assertSame( 'commit', end( $this->store->events ), 'The release was committed, not rolled back by the refusal.' );
		$types = array_column( $this->store->ledger_for_order( $card['id'], 7 ), 'type' );
		$this->assertSame( array( 'reserve', 'release' ), $types );
		$this->assertTrue( $ledger->verify( $card['id'] )['ok'] );
		$this->assertTrue( Gift_Card_Ledger::was_revoked( $this->store->ledger_for_order( $card['id'], 7 ) ) );
	}

	public function test_consume_on_an_active_card_settles_negative_control(): void {
		$card   = $this->issued_card( 2500 );
		$ledger = $this->ledger();
		$ledger->hold( $card['id'], 7, 1000, $this->now );
		$this->assertSame( 1000, $ledger->consume( $card['id'], 7, $this->now ) );
		$this->assertSame( 1500, $this->store->find( $card['id'] )['balance_pence'] );
		$this->assertFalse( Gift_Card_Ledger::was_revoked( $this->store->ledger_for_order( $card['id'], 7 ) ) );
	}

	public function test_consume_on_a_refunded_card_is_refused_too(): void {
		$card   = $this->issued_card( 2500, array(), array( 'purchaser_user_id' => 7 ) );
		$ledger = $this->ledger();
		$ledger->hold( $card['id'], 7, 1000, $this->now );
		$this->store->cards[ $card['id'] ]['status'] = 'refunded';
		$this->expectException( Gift_Card_Exception::class );
		$ledger->consume( $card['id'], 7, $this->now );
	}

	public function test_a_card_that_expired_after_the_reservation_is_still_honoured(): void {
		$card   = $this->issued_card( 2500 );
		$ledger = $this->ledger();
		$ledger->hold( $card['id'], 7, 1000, $this->now );

		// The expiry passes between order creation and payment.
		$ledger->set_expiry( $card['id'], gmdate( 'Y-m-d H:i:s', $this->now + 60 ), 'test', 1, $this->now );
		$later = $this->now + 3600;
		$this->assertFalse( $ledger->is_redeemable( $this->store->find( $card['id'] ), $later ), 'The card is expired by then.' );

		$this->assertSame( 1000, $ledger->consume( $card['id'], 7, $later ), 'The customer committed while it was valid.' );
		$this->assertSame( 1500, $this->store->find( $card['id'] )['balance_pence'] );
	}

	public function test_a_new_reservation_on_an_expired_card_is_still_refused_negative_control(): void {
		$card   = $this->issued_card( 2500 );
		$ledger = $this->ledger();
		$ledger->set_expiry( $card['id'], gmdate( 'Y-m-d H:i:s', $this->now + 60 ), 'test', 1, $this->now );
		$this->expectException( Gift_Card_Exception::class );
		$ledger->hold( $card['id'], 7, 100, $this->now + 3600 );
	}

	public function test_disabling_a_card_releases_every_open_reservation(): void {
		$card   = $this->issued_card( 4000 );
		$ledger = $this->ledger();
		$ledger->hold( $card['id'], 1, 1000, $this->now );
		$ledger->hold( $card['id'], 2, 1500, $this->now );
		$this->assertSame( 2500, $this->store->find( $card['id'] )['reserved_pence'] );

		$ledger->set_status( $card['id'], 'disabled', 'fraud', 9, $this->now );

		$after = $this->store->find( $card['id'] );
		$this->assertSame( 0, $after['reserved_pence'] );
		$this->assertSame( 4000, $after['balance_pence'] );
		$this->assertSame( 'disabled', $after['status'] );
		$this->assertSame( 0, Gift_Card_Ledger::open_reserved( $this->store->ledger_for_order( $card['id'], 1 ) ) );
		$this->assertSame( 0, Gift_Card_Ledger::open_reserved( $this->store->ledger_for_order( $card['id'], 2 ) ) );
		$this->assertTrue( Gift_Card_Ledger::was_revoked( $this->store->ledger_for_order( $card['id'], 1 ) ) );
		$this->assertTrue( $ledger->verify( $card['id'] )['ok'] );
		$this->assertTrue( $this->locks_before_writes( $this->store->events ) );
	}

	public function test_re_enabling_or_changing_expiry_does_not_release_anything_negative_control(): void {
		$card   = $this->issued_card( 4000 );
		$ledger = $this->ledger();
		$ledger->hold( $card['id'], 1, 1000, $this->now );

		$ledger->set_expiry( $card['id'], null, 'extend', 9, $this->now );
		$ledger->set_status( $card['id'], 'active', 'noop', 9, $this->now );
		$ledger->adjust( $card['id'], 100, 'goodwill', 9, $this->now );

		$this->assertSame( 1000, $this->store->find( $card['id'] )['reserved_pence'], 'Only disabling or replacing releases.' );
		$this->assertFalse( Gift_Card_Ledger::was_revoked( $this->store->ledger_for_order( $card['id'], 1 ) ) );
	}

	public function test_replacing_the_code_releases_open_reservations(): void {
		$card   = $this->issued_card( 4000 );
		$ledger = $this->ledger();
		$ledger->hold( $card['id'], 1, 1000, $this->now );

		$ledger->reissue( $card['id'], str_repeat( 'd', 64 ), 'WXYZ', 9, $this->now );

		$after = $this->store->find( $card['id'] );
		$this->assertSame( 0, $after['reserved_pence'] );
		$this->assertSame( 4000, $after['balance_pence'] );
		$this->assertTrue( Gift_Card_Ledger::was_revoked( $this->store->ledger_for_order( $card['id'], 1 ) ) );
		$this->assertTrue( $ledger->verify( $card['id'] )['ok'] );
	}

	public function test_a_refused_reissue_leaves_reservations_alone_negative_control(): void {
		$card   = $this->issued_card( 4000 );
		$ledger = $this->ledger();
		$ledger->reissue( $card['id'], str_repeat( 'd', 64 ), 'WXYZ', 9, $this->now );
		$ledger->hold( $card['id'], 2, 1000, $this->now );

		try {
			$ledger->reissue( $card['id'], str_repeat( 'e', 64 ), 'ABCD', 9, $this->now ); // Second reissue is refused.
			$this->fail( 'Second reissue should be refused.' );
		} catch ( Gift_Card_Exception $e ) {
			$this->assertSame( Gift_Card_Exception::REISSUE_REFUSED, $e->reason() );
		}
		$this->assertSame( 1000, $this->store->find( $card['id'] )['reserved_pence'], 'The refusal rolled back; the open reservation survives.' );
	}
}
