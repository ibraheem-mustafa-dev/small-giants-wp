<?php
/**
 * Gift card ledger maths, partial redemption, reservation lifecycle and the row lock
 * (Spec 27, FR-27-GC2 and FR-27-GC6).
 *
 * Run: php vendor/bin/phpunit --filter GiftCardLedgerTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\Group;
use SGS\Blocks\Gift_Card\Gift_Card_Exception;
use SGS\Blocks\Gift_Card\Gift_Card_Ledger;
use SGS\Blocks\Gift_Card\Gift_Card_Money;
use SGS\Blocks\Tests\Support\Gift_Card_Test_Case;

require_once __DIR__ . '/support/Gift_Card_Test_Case.php';

#[Group( 'sgs_gift_card' )]
final class GiftCardLedgerTest extends Gift_Card_Test_Case {

	public function test_create_writes_the_card_and_an_issue_row_in_pence(): void {
		$id   = $this->ledger()->create( array( 'initial_pence' => 2500 ), $this->now );
		$card = $this->store->find( $id );

		$this->assertSame( 2500, $card['balance_pence'] );
		$this->assertSame( 0, $card['reserved_pence'] );
		$this->assertSame( 'active', $card['status'] );
		$this->assertNull( $card['code_hash'] );
		$rows = $this->store->ledger_for_card( $id );
		$this->assertCount( 1, $rows );
		$this->assertSame( 'issue', $rows[0]['type'] );
		$this->assertSame( 2500, $rows[0]['delta_pence'] );
	}

	public function test_create_refuses_a_non_positive_or_float_amount(): void {
		foreach ( array( 0, -100, 99.5, '25', null ) as $bad ) {
			try {
				$this->ledger()->create( array( 'initial_pence' => $bad ), $this->now );
				$this->fail( 'Expected a refusal for ' . var_export( $bad, true ) );
			} catch ( Gift_Card_Exception $e ) {
				$this->assertSame( Gift_Card_Exception::INVALID_AMOUNT, $e->reason() );
			}
		}
		$this->assertCount( 0, $this->store->cards );
		// Positive control: a whole positive number of pence is accepted.
		$this->assertGreaterThan( 0, $this->ledger()->create( array( 'initial_pence' => 1 ), $this->now ) );
	}

	public function test_expiry_defaults_to_24_months_and_follows_the_setting(): void {
		$id = $this->ledger()->create( array( 'initial_pence' => 1500 ), $this->now );
		$this->assertSame( '2025-11-14 22:13:20', $this->store->find( $id )['expires_at'] );

		$twelve = $this->ledger( array( 'expiry_months' => 12 ) )->create( array( 'initial_pence' => 1500 ), $this->now );
		$this->assertSame( '2024-11-14 22:13:20', $this->store->find( $twelve )['expires_at'] );

		$never = $this->ledger( array( 'expiry_months' => 0 ) )->create( array( 'initial_pence' => 1500 ), $this->now );
		$this->assertNull( $this->store->find( $never )['expires_at'] );
	}

	public function test_partial_redemption_keeps_the_balance_on_the_card(): void {
		$card   = $this->issued_card( 2500 );
		$ledger = $this->ledger();

		$ledger->hold( $card['id'], 901, 1000, $this->now );
		$this->assertSame( 1000, $this->store->find( $card['id'] )['reserved_pence'] );
		$this->assertSame( 1000, $ledger->consume( $card['id'], 901, $this->now ) );

		$after = $this->store->find( $card['id'] );
		$this->assertSame( 1500, $after['balance_pence'] );
		$this->assertSame( 0, $after['reserved_pence'] );

		// The remaining 15.00 is spent in a second order.
		$ledger->hold( $card['id'], 902, 1500, $this->now );
		$ledger->consume( $card['id'], 902, $this->now );
		$this->assertSame( 0, $this->store->find( $card['id'] )['balance_pence'] );
		$this->assertTrue( $ledger->verify( $card['id'] )['ok'] );
	}

	public function test_a_spent_card_cannot_be_held_again(): void {
		$card   = $this->issued_card( 1500 );
		$ledger = $this->ledger();
		$ledger->hold( $card['id'], 1, 1500, $this->now );
		$ledger->consume( $card['id'], 1, $this->now );

		$this->expectException( Gift_Card_Exception::class );
		$ledger->hold( $card['id'], 2, 1, $this->now );
	}

	public function test_reservation_blocks_overspend_across_orders(): void {
		$card   = $this->issued_card( 4000 );
		$ledger = $this->ledger();

		$ledger->hold( $card['id'], 1, 3000, $this->now );
		$this->assertSame( 1000, $ledger->available( $this->store->find( $card['id'] ), $this->now ) );

		try {
			$ledger->hold( $card['id'], 2, 1001, $this->now );
			$this->fail( 'A second order must not reserve more than is free.' );
		} catch ( Gift_Card_Exception $e ) {
			$this->assertSame( Gift_Card_Exception::INSUFFICIENT, $e->reason() );
		}
		// Positive control: exactly what is free is accepted.
		$ledger->hold( $card['id'], 2, 1000, $this->now );
		$this->assertSame( 4000, $this->store->find( $card['id'] )['reserved_pence'] );
	}

	public function test_a_stale_availability_cannot_double_spend(): void {
		$card   = $this->issued_card( 4000 );
		$ledger = $this->ledger();

		// Two checkouts both read 40.00 as available, then both ask for 30.00.
		$stale_a = $ledger->available( $this->store->find( $card['id'] ), $this->now );
		$stale_b = $ledger->available( $this->store->find( $card['id'] ), $this->now );
		$this->assertSame( 4000, $stale_a );
		$this->assertSame( 4000, $stale_b );

		$ledger->hold( $card['id'], 1, 3000, $this->now );
		$this->expectException( Gift_Card_Exception::class );
		$ledger->hold( $card['id'], 2, 3000, $this->now ); // Decided on the row re-read under the lock.
	}

	public function test_a_failed_hold_leaves_no_trace(): void {
		$card   = $this->issued_card( 1000 );
		$before = $this->store->ledger;
		try {
			$this->ledger()->hold( $card['id'], 1, 5000, $this->now );
		} catch ( Gift_Card_Exception $e ) {
			$this->assertSame( Gift_Card_Exception::INSUFFICIENT, $e->reason() );
		}
		$this->assertSame( $before, $this->store->ledger );
		$this->assertSame( 0, $this->store->find( $card['id'] )['reserved_pence'] );
		$this->assertSame( 'rollback', end( $this->store->events ) );
	}

	public function test_release_frees_the_reservation_and_consume_after_release_does_nothing(): void {
		$card   = $this->issued_card( 2000 );
		$ledger = $this->ledger();
		$ledger->hold( $card['id'], 7, 1200, $this->now );

		$this->assertSame( 1200, $ledger->release( $card['id'], 7, $this->now ) );
		$after = $this->store->find( $card['id'] );
		$this->assertSame( 2000, $after['balance_pence'] );
		$this->assertSame( 0, $after['reserved_pence'] );
		$this->assertSame( 0, $ledger->consume( $card['id'], 7, $this->now ), 'A released order consumes nothing.' );
		$this->assertSame( 0, $ledger->release( $card['id'], 7, $this->now ), 'Releasing twice is harmless.' );
		$this->assertTrue( $ledger->verify( $card['id'] )['ok'] );
	}

	public function test_restore_gives_back_what_a_paid_order_spent_once(): void {
		$card   = $this->issued_card( 2000 );
		$ledger = $this->ledger();
		$ledger->hold( $card['id'], 7, 1200, $this->now );
		$ledger->consume( $card['id'], 7, $this->now );
		$this->assertSame( 800, $this->store->find( $card['id'] )['balance_pence'] );

		$this->assertSame( 1200, $ledger->restore( $card['id'], 7, $this->now ) );
		$this->assertSame( 2000, $this->store->find( $card['id'] )['balance_pence'] );
		$this->assertSame( 0, $ledger->restore( $card['id'], 7, $this->now ), 'A second restore must not mint money.' );
		$this->assertSame( 2000, $this->store->find( $card['id'] )['balance_pence'] );
		$this->assertTrue( $ledger->verify( $card['id'] )['ok'] );
	}

	public function test_restore_of_an_order_that_never_paid_does_nothing(): void {
		$card = $this->issued_card( 2000 );
		$this->assertSame( 0, $this->ledger()->restore( $card['id'], 99, $this->now ) );
		$this->assertSame( 2000, $this->store->find( $card['id'] )['balance_pence'] );
	}

	public function test_hold_is_idempotent_and_resizes_an_orders_reservation(): void {
		$card   = $this->issued_card( 3000 );
		$ledger = $this->ledger();
		$ledger->hold( $card['id'], 5, 1000, $this->now );
		$ledger->hold( $card['id'], 5, 1000, $this->now );
		$this->assertSame( 1000, $this->store->find( $card['id'] )['reserved_pence'] );

		$ledger->hold( $card['id'], 5, 2500, $this->now );
		$this->assertSame( 2500, $this->store->find( $card['id'] )['reserved_pence'] );
		$ledger->hold( $card['id'], 5, 400, $this->now );
		$this->assertSame( 400, $this->store->find( $card['id'] )['reserved_pence'] );
		$ledger->hold( $card['id'], 5, 0, $this->now );
		$this->assertSame( 0, $this->store->find( $card['id'] )['reserved_pence'] );
		$this->assertTrue( $ledger->verify( $card['id'] )['ok'] );
	}

	public function test_single_use_mode_forfeits_the_remainder_and_restore_returns_all_of_it(): void {
		$card   = $this->issued_card( 2500, array( 'partial_use' => false ) );
		$ledger = $this->ledger( array( 'partial_use' => false ) );
		$ledger->hold( $card['id'], 3, 1000, $this->now );
		$ledger->consume( $card['id'], 3, $this->now );
		$this->assertSame( 0, $this->store->find( $card['id'] )['balance_pence'], 'The 15.00 left is forfeited.' );

		$ledger->restore( $card['id'], 3, $this->now );
		$this->assertSame( 2500, $this->store->find( $card['id'] )['balance_pence'] );

		// Control: partial mode (the default) keeps the 15.00.
		$kept = $this->issued_card( 2500 );
		$this->ledger()->hold( $kept['id'], 4, 1000, $this->now );
		$this->ledger()->consume( $kept['id'], 4, $this->now );
		$this->assertSame( 1500, $this->store->find( $kept['id'] )['balance_pence'] );
	}

	public function test_a_card_that_cannot_be_spent_is_refused_and_a_good_one_is_not(): void {
		$ledger = $this->ledger();

		$unsent = $ledger->create( array( 'initial_pence' => 1000 ), $this->now );
		$this->assertRefused( $ledger, $unsent, Gift_Card_Exception::NOT_ISSUED );

		$disabled = $this->issued_card( 1000 );
		$ledger->set_status( $disabled['id'], 'disabled', 'test', 1, $this->now );
		$this->assertRefused( $ledger, $disabled['id'], Gift_Card_Exception::DISABLED );

		$expired = $this->issued_card( 1000 );
		$ledger->set_expiry( $expired['id'], '2023-11-14 22:13:19', 'test', 1, $this->now );
		$this->assertRefused( $ledger, $expired['id'], Gift_Card_Exception::EXPIRED );

		// Positive control: an active, issued, unexpired card is held without complaint.
		$good = $this->issued_card( 1000 );
		$ledger->hold( $good['id'], 1, 1000, $this->now );
		$this->assertSame( 1000, $this->store->find( $good['id'] )['reserved_pence'] );
	}

	public function test_adjustment_needs_a_reason_and_cannot_undercut_a_reservation(): void {
		$card   = $this->issued_card( 2000 );
		$ledger = $this->ledger();

		foreach ( array( array( 500, '' ), array( 500, '   ' ), array( 0, 'why' ) ) as $case ) {
			try {
				$ledger->adjust( $card['id'], $case[0], $case[1], 1, $this->now );
				$this->fail( 'Adjustment should be refused.' );
			} catch ( Gift_Card_Exception $e ) {
				$this->assertSame( Gift_Card_Exception::INVALID_AMOUNT, $e->reason() );
			}
		}
		$ledger->adjust( $card['id'], 500, 'goodwill', 1, $this->now );
		$this->assertSame( 2500, $this->store->find( $card['id'] )['balance_pence'] );

		$ledger->hold( $card['id'], 1, 2000, $this->now );
		$this->expectException( Gift_Card_Exception::class );
		$ledger->adjust( $card['id'], -600, 'too much', 1, $this->now ); // 2500 - 600 < 2000 reserved.
	}

	public function test_ledger_totals_always_equal_the_card_row(): void {
		$card   = $this->issued_card( 5000 );
		$ledger = $this->ledger();
		$ledger->hold( $card['id'], 1, 1234, $this->now );
		$ledger->consume( $card['id'], 1, $this->now );
		$ledger->hold( $card['id'], 2, 999, $this->now );
		$ledger->release( $card['id'], 2, $this->now );
		$ledger->adjust( $card['id'], -1, 'rounding', 1, $this->now );
		$ledger->hold( $card['id'], 3, 100, $this->now );

		$check = $ledger->verify( $card['id'] );
		$this->assertTrue( $check['ok'] );
		$this->assertSame( 5000 - 1234 - 1, $check['balance'] );
		$this->assertSame( 100, $check['reserved'] );

		// Negative control: tamper with the cached balance and the check goes red.
		$this->store->cards[ $card['id'] ]['balance_pence'] += 1;
		$this->assertFalse( $ledger->verify( $card['id'] )['ok'] );
	}

	public function test_every_mutation_takes_the_row_lock_before_its_first_write(): void {
		$ledger = $this->ledger();
		$card   = $this->issued_card( 5000 );
		$ledger->hold( $card['id'], 1, 1000, $this->now );
		$ledger->consume( $card['id'], 1, $this->now );
		$ledger->hold( $card['id'], 2, 500, $this->now );
		$ledger->release( $card['id'], 2, $this->now );
		$ledger->restore( $card['id'], 1, $this->now );
		$ledger->adjust( $card['id'], 100, 'x', 1, $this->now );
		$ledger->set_status( $card['id'], 'disabled', 'x', 1, $this->now );
		$ledger->set_expiry( $card['id'], null, 'x', 1, $this->now );

		$this->assertTrue( $this->locks_before_writes( $this->store->events ), implode( ' ', $this->store->events ) );
		$this->assertGreaterThan( 8, count( array_filter( $this->store->events, fn( $e ) => 0 === strpos( $e, 'lock:' ) ) ) );
	}

	public function test_the_lock_checker_catches_a_naive_unlocked_redemption(): void {
		$card          = $this->issued_card( 5000 );
		$store         = $this->store;
		$store->events = array();

		// What a careless implementation does: read without the lock, then write.
		$store->transaction(
			function () use ( $store, $card ) {
				$row = $store->find( $card['id'] );
				$store->add_ledger(
					array(
						'card_id'              => $card['id'],
						'type'                 => 'consume',
						'amount_pence'         => 1,
						'delta_pence'          => -1,
						'reserved_delta_pence' => 0,
						'balance_after_pence'  => $row['balance_pence'] - 1,
						'order_id'             => 1,
						'actor_id'             => 0,
						'reason'               => '',
						'created_at'           => '',
					)
				);
			}
		);
		$this->assertFalse( $this->locks_before_writes( $store->events ) );
	}

	public function test_a_locked_read_outside_a_transaction_is_refused_by_the_store(): void {
		$this->expectException( LogicException::class );
		$this->store->find( 1, true );
	}

	public function test_money_helpers_are_exact(): void {
		$this->assertSame( 2500, Gift_Card_Money::to_pence( '25' ) );
		$this->assertSame( 1999, Gift_Card_Money::to_pence( '£19.99' ) );
		$this->assertSame( 1050, Gift_Card_Money::to_pence( '10.5' ) );
		foreach ( array( '0', '-5', '1.999', 'abc', '', '10000.01' ) as $bad ) {
			$this->assertNull( Gift_Card_Money::to_pence( $bad ), $bad );
		}
		$this->assertSame( '£25.00', Gift_Card_Money::format( 2500 ) );
		$this->assertSame( '£0.05', Gift_Card_Money::format( 5 ) );
		$this->assertSame(
			array(
				1 => 1000,
				2 => 500,
			),
			Gift_Card_Money::allocate(
				array(
					1 => 1000,
					2 => 9999,
				),
				1500
			)
		);
		$this->assertSame( array(), Gift_Card_Money::allocate( array( 1 => 1000 ), 0 ) );
		$this->assertSame( 1000, Gift_Card_Money::net_for_gross( 1200, 20.0 ) );
	}

	/**
	 * Assert that holding on a card is refused with a reason.
	 */
	private function assertRefused( Gift_Card_Ledger $ledger, int $card_id, string $reason ): void {
		try {
			$ledger->hold( $card_id, 1, 100, $this->now );
			$this->fail( 'Expected ' . $reason );
		} catch ( Gift_Card_Exception $e ) {
			$this->assertSame( $reason, $e->reason() );
		}
	}
}
