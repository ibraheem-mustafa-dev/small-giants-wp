<?php
/**
 * Gift card storage on $wpdb (Spec 27, FR-27-GC2).
 *
 * Tables `{prefix}sgs_gift_cards` and `{prefix}sgs_gift_card_ledger`. Every
 * query with a variable goes through `$wpdb->prepare()`. Transactions use
 * START TRANSACTION / COMMIT / ROLLBACK and `find( $id, true )` appends
 * FOR UPDATE, so a redemption holds the card's row lock from its balance read
 * to its write. The ledger table is append-only: this class has no update or
 * delete for it.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

// phpcs:disable WordPress.Security.EscapeOutput.ExceptionNotEscaped -- the message is a developer diagnostic caught by the caller, never printed to a visitor.

defined( 'ABSPATH' ) || exit;

/**
 * MySQL-backed {@see Gift_Card_Store}.
 */
final class Gift_Card_Wpdb_Store implements Gift_Card_Store {

	/**
	 * Open transaction depth (nested calls join the outer transaction).
	 *
	 * @var int
	 */
	private int $depth = 0;

	/**
	 * The cards table name.
	 *
	 * @return string
	 */
	public static function cards_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'sgs_gift_cards';
	}

	/**
	 * The ledger table name.
	 *
	 * @return string
	 */
	public static function ledger_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'sgs_gift_card_ledger';
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param callable $work The work.
	 * @return mixed
	 * @throws \Throwable Whatever the work throws, after rolling back.
	 */
	public function transaction( callable $work ) {
		global $wpdb;
		if ( 0 === $this->depth ) {
			$wpdb->query( 'START TRANSACTION' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- explicit transaction.
		}
		++$this->depth;
		try {
			$result = $work();
		} catch ( \Throwable $e ) {
			--$this->depth;
			if ( 0 === $this->depth ) {
				$wpdb->query( 'ROLLBACK' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- explicit transaction.
			}
			throw $e;
		}
		--$this->depth;
		if ( 0 === $this->depth ) {
			$wpdb->query( 'COMMIT' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- explicit transaction.
		}
		return $result;
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param int  $id   Card id.
	 * @param bool $lock Row lock.
	 * @return array<string,mixed>|null
	 */
	public function find( int $id, bool $lock = false ): ?array {
		global $wpdb;
		$table = self::cards_table();
		$sql   = $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $id ) . ( $lock ? ' FOR UPDATE' : '' ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix; FOR UPDATE is a constant.
		return $this->card( $wpdb->get_row( $sql, ARRAY_A ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- prepared above.
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param string $hash Code hash.
	 * @param bool   $lock Row lock.
	 * @return array<string,mixed>|null
	 */
	public function find_by_hash( string $hash, bool $lock = false ): ?array {
		global $wpdb;
		$table = self::cards_table();
		$sql   = $wpdb->prepare( "SELECT * FROM {$table} WHERE code_hash = %s", $hash ) . ( $lock ? ' FOR UPDATE' : '' ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix; FOR UPDATE is a constant.
		return $this->card( $wpdb->get_row( $sql, ARRAY_A ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- prepared above.
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param int $order_item_id Order line item id.
	 * @param int $unit          Unit number.
	 * @return array<string,mixed>|null
	 */
	public function find_by_order_unit( int $order_item_id, int $unit ): ?array {
		global $wpdb;
		$table = self::cards_table();
		return $this->card( $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE order_item_id = %d AND unit = %d", $order_item_id, $unit ), ARRAY_A ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- table name from $wpdb->prefix.
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param array<string,mixed> $row Card columns.
	 * @return int
	 * @throws \RuntimeException When the insert fails.
	 */
	public function insert( array $row ): int {
		global $wpdb;
		unset( $row['id'] );
		$row = $this->to_db( $row );
		if ( false === $wpdb->insert( self::cards_table(), $row ) ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- own table.
			throw new \RuntimeException( 'Gift card insert failed: ' . $wpdb->last_error );
		}
		return (int) $wpdb->insert_id;
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param int                 $id     Card id.
	 * @param array<string,mixed> $fields Columns.
	 * @return void
	 * @throws \RuntimeException When the update fails.
	 */
	public function update( int $id, array $fields ): void {
		global $wpdb;
		if ( false === $wpdb->update( self::cards_table(), $this->to_db( $fields ), array( 'id' => $id ) ) ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- own table.
			throw new \RuntimeException( 'Gift card update failed: ' . $wpdb->last_error );
		}
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param array<string,mixed> $entry Ledger columns.
	 * @return int
	 * @throws \RuntimeException When the insert fails.
	 */
	public function add_ledger( array $entry ): int {
		global $wpdb;
		unset( $entry['id'] );
		if ( false === $wpdb->insert( self::ledger_table(), $entry ) ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery -- own table, append-only.
			throw new \RuntimeException( 'Gift card ledger insert failed: ' . $wpdb->last_error );
		}
		return (int) $wpdb->insert_id;
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param int $card_id Card id.
	 * @return array<int,array<string,mixed>>
	 */
	public function ledger_for_card( int $card_id ): array {
		global $wpdb;
		$table = self::ledger_table();
		return $this->ledger_rows( $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE card_id = %d ORDER BY id ASC", $card_id ), ARRAY_A ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- table name from $wpdb->prefix.
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param int $card_id  Card id.
	 * @param int $order_id Order id.
	 * @return array<int,array<string,mixed>>
	 */
	public function ledger_for_order( int $card_id, int $order_id ): array {
		global $wpdb;
		$table = self::ledger_table();
		return $this->ledger_rows( $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE card_id = %d AND order_id = %d ORDER BY id ASC", $card_id, $order_id ), ARRAY_A ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- table name from $wpdb->prefix.
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param int $order_id Purchasing order id.
	 * @return array<int,array<string,mixed>>
	 */
	public function cards_for_order( int $order_id ): array {
		global $wpdb;
		$table = self::cards_table();
		return $this->cards( $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE purchaser_order_id = %d ORDER BY id ASC", $order_id ), ARRAY_A ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- table name from $wpdb->prefix.
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param string $today Y-m-d.
	 * @param int    $limit Most rows.
	 * @return array<int,array<string,mixed>>
	 */
	public function due_for_delivery( string $today, int $limit ): array {
		global $wpdb;
		$table = self::cards_table();
		return $this->cards( $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE code_hash IS NULL AND status = 'active' AND delivered_at IS NULL AND (send_on IS NULL OR send_on <= %s) ORDER BY id ASC LIMIT %d", $today, $limit ), ARRAY_A ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- table name from $wpdb->prefix.
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param array<string,mixed> $filters Filters.
	 * @return array<int,array<string,mixed>>
	 */
	public function search( array $filters ): array {
		global $wpdb;
		$table                = self::cards_table();
		list( $where, $args ) = $this->where( $filters );
		$limit                = \max( 1, \min( 500, (int) ( $filters['limit'] ?? 50 ) ) );
		$offset               = \max( 0, (int) ( $filters['offset'] ?? 0 ) );
		$args[]               = $limit;
		$args[]               = $offset;
		return $this->cards( $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE {$where} ORDER BY id DESC LIMIT %d OFFSET %d", $args ), ARRAY_A ) ); // phpcs:ignore WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- table name from $wpdb->prefix; $where holds only placeholders.
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param array<string,mixed> $filters Filters.
	 * @return int
	 */
	public function count( array $filters ): int {
		global $wpdb;
		$table                = self::cards_table();
		list( $where, $args ) = $this->where( $filters );
		$sql                  = "SELECT COUNT(*) FROM {$table} WHERE {$where}"; // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix; $where holds only placeholders.
		return (int) $wpdb->get_var( array() === $args ? $sql : $wpdb->prepare( $sql, $args ) ); // phpcs:ignore WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber,WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- prepared when it has arguments.
	}

	/**
	 * {@inheritDoc}
	 *
	 * @param string $now 'Y-m-d H:i:s' UTC.
	 * @return array{live:int,expired:int,disabled:int,reserved:int}
	 */
	public function liability( string $now ): array {
		global $wpdb;
		$table = self::cards_table();
		$sum   = static function ( string $condition, array $args ) use ( $wpdb, $table ): int {
			$sql = "SELECT COALESCE(SUM(balance_pence),0) FROM {$table} WHERE {$condition}"; // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name from $wpdb->prefix; $condition is a constant string of placeholders.
			return (int) $wpdb->get_var( array() === $args ? $sql : $wpdb->prepare( $sql, $args ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- prepared when it has arguments.
		};
		return array(
			'live'     => $sum( "status = 'active' AND (expires_at IS NULL OR expires_at > %s)", array( $now ) ),
			'expired'  => $sum( "status = 'active' AND expires_at IS NOT NULL AND expires_at <= %s", array( $now ) ),
			'disabled' => $sum( "status = 'disabled'", array() ),
			'reserved' => (int) $wpdb->get_var( "SELECT COALESCE(SUM(reserved_pence),0) FROM {$table} WHERE status = 'active'" ), // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- constant query, table name from $wpdb->prefix.
		);
	}

	/**
	 * Build the WHERE clause (placeholders only) and its arguments for the admin filters.
	 *
	 * @param array<string,mixed> $filters Filters.
	 * @return array{0:string,1:array<int,mixed>}
	 */
	private function where( array $filters ): array {
		global $wpdb;
		$where = array( '1=1' );
		$args  = array();

		$status = isset( $filters['status'] ) ? (string) $filters['status'] : '';
		if ( \in_array( $status, array( 'active', 'disabled', 'refunded' ), true ) ) {
			$where[] = 'status = %s';
			$args[]  = $status;
		}

		$term = isset( $filters['s'] ) ? \trim( (string) $filters['s'] ) : '';
		if ( '' !== $term ) {
			$like    = '%' . $wpdb->esc_like( $term ) . '%';
			$clauses = array( 'code_last4 = %s', 'purchaser_email LIKE %s', 'recipient_email LIKE %s', 'recipient_name LIKE %s', 'sender_name LIKE %s' );
			$args[]  = \strtoupper( $term );
			\array_push( $args, $like, $like, $like, $like );
			if ( \ctype_digit( $term ) ) {
				$clauses[] = 'purchaser_order_id = %d';
				$clauses[] = 'id = %d';
				\array_push( $args, (int) $term, (int) $term );
			}
			$where[] = '(' . \implode( ' OR ', $clauses ) . ')';
		}

		return array( \implode( ' AND ', $where ), $args );
	}

	/**
	 * Convert a domain card array to DB columns (0 ids become NULL where unique).
	 *
	 * @param array<string,mixed> $row Card columns.
	 * @return array<string,mixed>
	 */
	private function to_db( array $row ): array {
		if ( \array_key_exists( 'order_item_id', $row ) && 0 === (int) $row['order_item_id'] ) {
			$row['order_item_id'] = null;
		}
		return $row;
	}

	/**
	 * Cast a raw DB row to the domain card shape.
	 *
	 * @param array<string,mixed>|null $row Raw row.
	 * @return array<string,mixed>|null
	 */
	private function card( ?array $row ): ?array {
		if ( null === $row ) {
			return null;
		}
		foreach ( array( 'id', 'initial_pence', 'balance_pence', 'reserved_pence', 'purchaser_order_id', 'order_item_id', 'unit', 'purchaser_user_id', 'reissue_count' ) as $key ) {
			$row[ $key ] = (int) ( $row[ $key ] ?? 0 );
		}
		return $row;
	}

	/**
	 * Cast many card rows.
	 *
	 * @param array<int,array<string,mixed>>|null $rows Raw rows.
	 * @return array<int,array<string,mixed>>
	 */
	private function cards( ?array $rows ): array {
		return \array_map( fn( $row ) => $this->card( $row ), (array) $rows );
	}

	/**
	 * Cast ledger rows.
	 *
	 * @param array<int,array<string,mixed>>|null $rows Raw rows.
	 * @return array<int,array<string,mixed>>
	 */
	private function ledger_rows( ?array $rows ): array {
		return \array_map(
			static function ( array $row ): array {
				foreach ( array( 'id', 'card_id', 'amount_pence', 'delta_pence', 'reserved_delta_pence', 'balance_after_pence', 'order_id', 'actor_id' ) as $key ) {
					$row[ $key ] = (int) $row[ $key ];
				}
				return $row;
			},
			(array) $rows
		);
	}
}
