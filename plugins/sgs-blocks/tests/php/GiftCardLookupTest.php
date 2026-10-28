<?php
/**
 * Gift card lookup: uniform error, rate limit and constant-time compare (Spec 27, FR-27-GC10).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\Group;
use SGS\Blocks\Gift_Card\Gift_Card_Exception;
use SGS\Blocks\Gift_Card\Gift_Card_Ledger;
use SGS\Blocks\Gift_Card\Gift_Card_Lookup;
use SGS\Blocks\Gift_Card\Gift_Card_Rate_Limiter;
use SGS\Blocks\Gift_Card\Gift_Card_Settings;
use SGS\Blocks\Tests\Support\Gift_Card_Test_Case;

require_once __DIR__ . '/support/Gift_Card_Test_Case.php';

#[Group( 'sgs_gift_card' )]
final class GiftCardLookupTest extends Gift_Card_Test_Case {

	/** @var array<string,array<string,int>> */
	private array $buckets = array();

	private int $clock;

	protected function setUp(): void {
		parent::setUp();
		$this->buckets = array();
		$this->clock   = $this->now;
	}

	private function lookup( int $max = 5, int $window = 900 ): Gift_Card_Lookup {
		$limiter = new Gift_Card_Rate_Limiter(
			fn( string $key ) => $this->buckets[ $key ] ?? null,
			function ( string $key, array $state ) {
				$this->buckets[ $key ] = $state;
			},
			$max,
			$window,
			fn() => $this->clock
		);
		return new Gift_Card_Lookup( $this->store, new Gift_Card_Ledger( $this->store, new Gift_Card_Settings() ), $limiter, 'test-key' );
	}

	private function message_for( Gift_Card_Lookup $lookup, string $typed, string $client = 'c1' ): string {
		try {
			$lookup->find_redeemable( $typed, $client, $this->clock );
		} catch ( Gift_Card_Exception $e ) {
			return $e->getMessage();
		}
		return 'NO-ERROR';
	}

	public function test_a_valid_code_is_found_in_any_case_and_with_any_separators(): void {
		$card = $this->issued_card( 2500 );
		$row  = $this->lookup()->find_redeemable( strtolower( str_replace( '-', ' ', $card['code'] ) ), 'c1', $this->now );
		$this->assertSame( $card['id'], $row['id'] );
	}

	public function test_every_failure_gives_the_same_message(): void {
		$good = $this->issued_card( 2500 );

		$expired = $this->issued_card( 1000 );
		$this->ledger()->set_expiry( $expired['id'], '2020-01-01 00:00:00', 'test', 1, $this->now );

		$disabled = $this->issued_card( 1000 );
		$this->ledger()->set_status( $disabled['id'], 'disabled', 'test', 1, $this->now );

		$empty = $this->issued_card( 1000 );
		$this->ledger()->adjust( $empty['id'], -1000, 'drain', 1, $this->now );

		$unsent_id = $this->ledger()->create( array( 'initial_pence' => 1000 ), $this->now );
		$this->assertNotNull( $this->store->find( $unsent_id ) );

		$cases    = array(
			'unknown but well formed' => '0000-0000-0000-0000',
			'malformed'               => 'hello',
			'blank'                   => '',
			'expired'                 => $expired['code'],
			'disabled'                => $disabled['code'],
			'zero balance'            => $empty['code'],
		);
		$messages = array();
		foreach ( $cases as $name => $typed ) {
			$messages[ $name ] = $this->message_for( $this->lookup( 100 ), $typed, 'client-' . $name );
		}
		$this->assertSame( array( Gift_Card_Lookup::MESSAGE ), array_values( array_unique( $messages ) ), (string) json_encode( $messages ) );

		// Positive control: a good code does not produce the message.
		$this->assertSame( 'NO-ERROR', $this->message_for( $this->lookup( 100 ), $good['code'], 'client-ok' ) );
	}

	public function test_the_rate_limited_answer_is_the_same_message(): void {
		$good   = $this->issued_card( 2500 );
		$lookup = $this->lookup( 3 );
		for ( $i = 0; $i < 3; $i++ ) {
			$this->assertSame( Gift_Card_Lookup::MESSAGE, $this->message_for( $lookup, '0000-0000-0000-000' . $i ) );
		}
		// Now blocked: even the correct code gets the same words, with the RATE_LIMITED reason.
		try {
			$lookup->find_redeemable( $good['code'], 'c1', $this->clock );
			$this->fail( 'A blocked client must not get a card.' );
		} catch ( Gift_Card_Exception $e ) {
			$this->assertSame( Gift_Card_Exception::RATE_LIMITED, $e->reason() );
			$this->assertSame( Gift_Card_Lookup::MESSAGE, $e->getMessage() );
		}
	}

	public function test_the_limit_is_per_client_and_expires_with_the_window(): void {
		$good   = $this->issued_card( 2500 );
		$lookup = $this->lookup( 2, 900 );
		$this->message_for( $lookup, 'bad-1', 'attacker' );
		$this->message_for( $lookup, 'bad-2', 'attacker' );

		$this->assertSame( Gift_Card_Lookup::MESSAGE, $this->message_for( $lookup, $good['code'], 'attacker' ), 'Blocked.' );
		$this->assertSame( 'NO-ERROR', $this->message_for( $lookup, $good['code'], 'someone-else' ), 'Another visitor is unaffected.' );

		$this->clock += 901;
		$this->assertSame( 'NO-ERROR', $this->message_for( $lookup, $good['code'], 'attacker' ), 'The window has passed.' );
	}

	public function test_a_generous_limit_does_not_block_negative_control(): void {
		$good   = $this->issued_card( 2500 );
		$lookup = $this->lookup( 100 );
		for ( $i = 0; $i < 20; $i++ ) {
			$this->message_for( $lookup, 'wrong-' . $i );
		}
		$this->assertSame( 'NO-ERROR', $this->message_for( $lookup, $good['code'] ), 'Twenty failures under a limit of 100 do not block.' );
	}

	public function test_the_stored_hash_is_compared_with_hash_equals(): void {
		$source = file_get_contents( dirname( __DIR__, 2 ) . '/includes/gift-card/class-gift-card-lookup.php' );
		$this->assertStringContainsString( 'hash_equals(', $source );
		$this->assertDoesNotMatchRegularExpression( '/\$stored\s*===?\s*\$hash|\$hash\s*===?\s*\$stored/', $source, 'No plain string comparison of the hashes.' );
	}

	public function test_balance_reports_what_is_available_and_the_expiry(): void {
		$card = $this->issued_card( 2500 );
		$this->ledger()->hold( $card['id'], 1, 1000, $this->now );
		$result = $this->lookup()->balance( $card['code'], 'c1', $this->now );
		$this->assertSame( 1500, $result['available'] );
		$this->assertSame( 2500, $result['balance'] );
		$this->assertSame( substr( str_replace( '-', '', $card['code'] ), -4 ), $result['last4'] );
		$this->assertSame( '2025-11-14 22:13:20', $result['expires_at'] );
	}
}
