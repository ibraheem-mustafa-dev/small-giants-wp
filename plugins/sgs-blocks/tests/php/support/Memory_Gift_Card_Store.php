<?php
/**
 * In-memory Gift_Card_Store for the gift-card tests.
 *
 * Behaves like the MySQL store where the rules depend on it: a locked read is
 * only legal inside a transaction, a transaction that throws rolls every write
 * back, and every call is appended to `$events` so tests can prove the order
 * "begin, lock, ledger write, commit".
 *
 * @package SGS\Blocks\Tests
 */

namespace SGS\Blocks\Tests\Support;

use SGS\Blocks\Gift_Card\Gift_Card_Store;

// phpcs:disable

final class Memory_Gift_Card_Store implements Gift_Card_Store {

	/** @var array<int,array<string,mixed>> */
	public array $cards = array();

	/** @var array<int,array<string,mixed>> */
	public array $ledger = array();

	/** @var array<int,string> */
	public array $events = array();

	/** Called with ( $card_id ) just after a locked read, to interleave a rival writer. */
	public $after_lock = null;

	private int $depth = 0;
	private int $next_card = 1;
	private int $next_ledger = 1;

	public function transaction( callable $work ) {
		$snapshot = array( $this->cards, $this->ledger );
		if ( 0 === $this->depth ) {
			$this->events[] = 'begin';
		}
		++$this->depth;
		try {
			$result = $work();
		} catch ( \Throwable $e ) {
			--$this->depth;
			if ( 0 === $this->depth ) {
				list( $this->cards, $this->ledger ) = $snapshot;
				$this->events[]                      = 'rollback';
			}
			throw $e;
		}
		--$this->depth;
		if ( 0 === $this->depth ) {
			$this->events[] = 'commit';
		}
		return $result;
	}

	public function find( int $id, bool $lock = false ): ?array {
		if ( $lock ) {
			if ( 0 === $this->depth ) {
				throw new \LogicException( 'A row lock (FOR UPDATE) outside a transaction.' );
			}
			$this->events[] = 'lock:' . $id;
		}
		$card = $this->cards[ $id ] ?? null;
		if ( $lock && null !== $this->after_lock ) {
			( $this->after_lock )( $id );
			$card = $this->cards[ $id ] ?? null;
		}
		return $card;
	}

	public function find_by_hash( string $hash, bool $lock = false ): ?array {
		foreach ( $this->cards as $card ) {
			if ( null !== $card['code_hash'] && $card['code_hash'] === $hash ) {
				return $card;
			}
		}
		return null;
	}

	public function find_by_order_unit( int $order_item_id, int $unit ): ?array {
		foreach ( $this->cards as $card ) {
			if ( $card['order_item_id'] === $order_item_id && $card['unit'] === $unit && $order_item_id > 0 ) {
				return $card;
			}
		}
		return null;
	}

	public function insert( array $row ): int {
		$id          = $this->next_card++;
		$row['id']   = $id;
		$this->cards[ $id ] = $row;
		$this->events[]     = 'insert';
		return $id;
	}

	public function update( int $id, array $fields ): void {
		$this->cards[ $id ] = array_merge( $this->cards[ $id ], $fields );
		$this->events[]     = 'update:' . $id;
	}

	public function add_ledger( array $entry ): int {
		$id          = $this->next_ledger++;
		$entry['id'] = $id;
		$this->ledger[ $id ] = $entry;
		$this->events[]      = 'ledger:' . $entry['type'];
		return $id;
	}

	public function ledger_for_card( int $card_id ): array {
		return array_values( array_filter( $this->ledger, fn( $r ) => $r['card_id'] === $card_id ) );
	}

	public function ledger_for_order( int $card_id, int $order_id ): array {
		return array_values( array_filter( $this->ledger, fn( $r ) => $r['card_id'] === $card_id && $r['order_id'] === $order_id ) );
	}

	public function cards_for_order( int $order_id ): array {
		return array_values( array_filter( $this->cards, fn( $c ) => $c['purchaser_order_id'] === $order_id ) );
	}

	public function due_for_delivery( string $today, int $limit ): array {
		return array_slice(
			array_values(
				array_filter(
					$this->cards,
					fn( $c ) => null === $c['code_hash'] && 'active' === $c['status'] && null === $c['delivered_at'] && ( null === $c['send_on'] || $c['send_on'] <= $today )
				)
			),
			0,
			$limit
		);
	}

	public function search( array $filters ): array {
		return array_values( $this->cards );
	}

	public function count( array $filters ): int {
		return count( $this->cards );
	}

	public function liability( string $now ): array {
		$out = array( 'live' => 0, 'expired' => 0, 'disabled' => 0, 'reserved' => 0 );
		foreach ( $this->cards as $c ) {
			if ( 'active' === $c['status'] ) {
				$expired = null !== $c['expires_at'] && $c['expires_at'] <= $now;
				$out[ $expired ? 'expired' : 'live' ] += $c['balance_pence'];
				$out['reserved']                      += $c['reserved_pence'];
			} elseif ( 'disabled' === $c['status'] ) {
				$out['disabled'] += $c['balance_pence'];
			}
		}
		return $out;
	}
}
