<?php
/**
 * Shared fixture for the gift-card tests.
 *
 * @package SGS\Blocks\Tests
 */

namespace SGS\Blocks\Tests\Support;

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Gift_Card\Gift_Card_Code;
use SGS\Blocks\Gift_Card\Gift_Card_Ledger;
use SGS\Blocks\Gift_Card\Gift_Card_Settings;

require_once __DIR__ . '/gift-card-domain.php';

// phpcs:disable

abstract class Gift_Card_Test_Case extends TestCase {

	/** Fixed clock: 2023-11-14 22:13:20 UTC. */
	protected int $now = 1700000000;

	protected Memory_Gift_Card_Store $store;

	protected function setUp(): void {
		$this->store = new Memory_Gift_Card_Store();
	}

	/**
	 * @param array<string,mixed> $settings Setting overrides.
	 */
	protected function ledger( array $settings = array() ): Gift_Card_Ledger {
		return new Gift_Card_Ledger( $this->store, new Gift_Card_Settings( $settings ) );
	}

	/**
	 * Create a card and give it a code (the state after delivery).
	 *
	 * @param array<string,mixed> $settings Setting overrides.
	 * @param array<string,mixed> $extra    Card column overrides.
	 * @return array{id:int,code:string}
	 */
	protected function issued_card( int $pence, array $settings = array(), array $extra = array() ): array {
		$ledger = $this->ledger( $settings );
		$id     = $ledger->create( array_merge( array( 'initial_pence' => $pence ), $extra ), $this->now );
		$code   = Gift_Card_Code::generate();
		$norm   = Gift_Card_Code::normalise( $code );
		$this->assertTrue( $ledger->claim_code( $id, Gift_Card_Code::hash( $norm, 'test-key' ), Gift_Card_Code::last4( $norm ), $this->now ) );
		return array(
			'id'   => $id,
			'code' => $code,
		);
	}

	/**
	 * Whether every transaction took its row lock before its first write.
	 *
	 * @param array<int,string> $events Store event log.
	 */
	protected function locks_before_writes( array $events ): bool {
		$in_tx = false;
		$locked = false;
		foreach ( $events as $event ) {
			if ( 'begin' === $event ) {
				$in_tx  = true;
				$locked = false;
			} elseif ( 'commit' === $event || 'rollback' === $event ) {
				$in_tx = false;
			} elseif ( 0 === strpos( $event, 'lock:' ) || 'insert' === $event ) {
				// A freshly inserted row is owned by this transaction until it commits.
				$locked = true;
			} elseif ( $in_tx && ! $locked && ( 0 === strpos( $event, 'ledger:' ) || 0 === strpos( $event, 'update:' ) ) ) {
				return false;
			}
		}
		return true;
	}
}
