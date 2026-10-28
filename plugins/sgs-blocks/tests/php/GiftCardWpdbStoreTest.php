<?php
/**
 * The production store: transaction, row lock and prepared statements (Spec 27, FR-27-GC2).
 *
 * Drives the REAL Gift_Card_Wpdb_Store and Gift_Card_Ledger against a recording fake of
 * `$wpdb`, then asserts the SQL order: START TRANSACTION, the card read FOR UPDATE, the
 * ledger insert, the card update, COMMIT. This proves the lock is taken in the production
 * path; it does not replace a run against MySQL (see the go-live steps).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\TestCase;
use SGS\Blocks\Gift_Card\Gift_Card_Ledger;
use SGS\Blocks\Gift_Card\Gift_Card_Settings;
use SGS\Blocks\Gift_Card\Gift_Card_Wpdb_Store;

require_once __DIR__ . '/support/gift-card-domain.php';
require_once dirname( __DIR__, 2 ) . '/includes/gift-card/class-gift-card-wpdb-store.php';

if ( ! defined( 'ARRAY_A' ) ) {
	define( 'ARRAY_A', 'ARRAY_A' );
}

/**
 * Records every query; answers the card and ledger reads from canned data.
 */
final class Gift_Card_Fake_Wpdb {
	public string $prefix     = 'wp_';
	public int $insert_id     = 0;
	public string $last_error = '';
	/** @var array<int,string> */
	public array $log = array();
	/** @var array<string,mixed>|null */
	public ?array $card_row = null;

	public function prepare( string $sql, ...$args ): string {
		if ( 1 === count( $args ) && is_array( $args[0] ) ) {
			$args = $args[0];
		}
		$i = 0;
		return (string) preg_replace_callback(
			'/%[ds]/',
			function ( array $m ) use ( &$i, $args ) {
				$v = $args[ $i++ ];
				return '%d' === $m[0] ? (string) (int) $v : "'" . addslashes( (string) $v ) . "'";
			},
			$sql
		);
	}

	public function esc_like( string $s ): string {
		return addcslashes( $s, '_%\\' );
	}

	public function query( string $sql ) {
		$this->log[] = $sql;
		return 1;
	}

	public function get_row( string $sql, $output = null ) {
		$this->log[] = $sql;
		return $this->card_row;
	}

	public function get_results( string $sql, $output = null ) {
		$this->log[] = $sql;
		return array();
	}

	public function get_var( string $sql ) {
		$this->log[] = $sql;
		return 0;
	}

	public function insert( string $table, array $data ) {
		$this->log[]     = 'INSERT ' . $table . ' ' . json_encode( $data );
		$this->insert_id = 77;
		return 1;
	}

	public function update( string $table, array $data, array $where ) {
		$this->log[] = 'UPDATE ' . $table . ' ' . json_encode( $data ) . ' WHERE ' . json_encode( $where );
		return 1;
	}
}

#[Group( 'sgs_gift_card' )]
final class GiftCardWpdbStoreTest extends TestCase {

	private Gift_Card_Fake_Wpdb $db;

	/** @var mixed */
	private $previous;

	protected function setUp(): void {
		$this->previous     = $GLOBALS['wpdb'] ?? null;
		$this->db           = new Gift_Card_Fake_Wpdb();
		$this->db->card_row = array(
			'id'                 => '5',
			'code_hash'          => str_repeat( 'a', 64 ),
			'code_last4'         => 'ABCD',
			'status'             => 'active',
			'initial_pence'      => '4000',
			'balance_pence'      => '4000',
			'reserved_pence'     => '0',
			'currency'           => 'GBP',
			'expires_at'         => '2099-01-01 00:00:00',
			'purchaser_order_id' => '0',
			'order_item_id'      => null,
			'unit'               => '1',
			'purchaser_user_id'  => '0',
			'purchaser_email'    => '',
			'recipient_name'     => '',
			'recipient_email'    => '',
			'message'            => '',
			'sender_name'        => '',
			'send_on'            => null,
			'delivery_method'    => 'email',
			'delivered_at'       => null,
			'reissue_count'      => '0',
			'created_at'         => '2026-01-01 00:00:00',
			'updated_at'         => '2026-01-01 00:00:00',
		);
		$GLOBALS['wpdb']    = $this->db;
	}

	protected function tearDown(): void {
		$GLOBALS['wpdb'] = $this->previous;
	}

	/** Index of the first log entry containing $needle, or -1. */
	private function at( string $needle ): int {
		foreach ( $this->db->log as $i => $line ) {
			if ( false !== strpos( $line, $needle ) ) {
				return $i;
			}
		}
		return -1;
	}

	public function test_a_redemption_locks_the_card_row_before_it_writes_anything(): void {
		$ledger = new Gift_Card_Ledger( new Gift_Card_Wpdb_Store(), new Gift_Card_Settings() );
		$ledger->hold( 5, 900, 1500, 1700000000 );

		$begin         = $this->at( 'START TRANSACTION' );
		$lock          = $this->at( 'FOR UPDATE' );
		$ledger_insert = $this->at( 'INSERT wp_sgs_gift_card_ledger' );
		$update        = $this->at( 'UPDATE wp_sgs_gift_cards' );
		$commit        = $this->at( 'COMMIT' );

		foreach ( array( $begin, $lock, $ledger_insert, $update, $commit ) as $i ) {
			$this->assertGreaterThanOrEqual( 0, $i, implode( "\n", $this->db->log ) );
		}
		$this->assertLessThan( $lock, $begin );
		$this->assertLessThan( $ledger_insert, $lock, 'The lock must come before the first write.' );
		$this->assertLessThan( $commit, $update );
		$this->assertStringContainsString( 'WHERE id = 5 FOR UPDATE', $this->db->log[ $lock ] );
		$this->assertSame( -1, $this->at( 'ROLLBACK' ) );
	}

	public function test_a_refusal_rolls_back_and_writes_nothing(): void {
		$ledger = new Gift_Card_Ledger( new Gift_Card_Wpdb_Store(), new Gift_Card_Settings() );
		try {
			$ledger->hold( 5, 900, 999999, 1700000000 ); // More than the 40.00 balance.
			$this->fail( 'Expected a refusal.' );
		} catch ( SGS\Blocks\Gift_Card\Gift_Card_Exception $e ) {
			$this->assertSame( 'insufficient', $e->reason() );
		}
		$this->assertGreaterThan( $this->at( 'FOR UPDATE' ), $this->at( 'ROLLBACK' ) );
		$this->assertSame( -1, $this->at( 'COMMIT' ) );
		$this->assertSame( -1, $this->at( 'INSERT wp_sgs_gift_card_ledger' ) );
	}

	public function test_a_plain_read_takes_no_lock_negative_control(): void {
		( new Gift_Card_Wpdb_Store() )->find( 5 );
		$this->assertSame( -1, $this->at( 'FOR UPDATE' ) );
		$this->assertSame( -1, $this->at( 'START TRANSACTION' ) );
	}

	public function test_nested_transactions_join_the_outer_one(): void {
		$store = new Gift_Card_Wpdb_Store();
		$store->transaction(
			function () use ( $store ) {
				$store->transaction( fn() => $store->find( 5, true ) );
			}
		);
		$begins = count( array_filter( $this->db->log, fn( $l ) => 'START TRANSACTION' === $l ) );
		$this->assertSame( 1, $begins );
		$this->assertSame( 1, count( array_filter( $this->db->log, fn( $l ) => 'COMMIT' === $l ) ) );
	}

	public function test_every_variable_query_is_prepared_and_values_are_never_concatenated(): void {
		$store = new Gift_Card_Wpdb_Store();
		$store->find_by_hash( "x' OR '1'='1" );
		$store->search(
			array(
				's'      => "O'Brien%",
				'status' => 'active',
				'limit'  => 10,
			)
		);
		$joined = implode( "\n", $this->db->log );
		$this->assertStringContainsString( "code_hash = 'x\\' OR \\'1\\'=\\'1'", $joined, 'The quote is escaped by prepare().' );
		$this->assertStringContainsString( "O\\'Brien", $joined );

		$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/gift-card/class-gift-card-wpdb-store.php' );
		$this->assertSame( 0, preg_match( '/\$wpdb->(get_row|get_results|get_var)\(\s*"[^"]*\$(?!table|where|condition)[a-z_]+/i', $source ), 'No variable other than a table name or placeholder clause inside a raw query string.' );
		$this->assertStringContainsString( '$wpdb->prepare(', $source );
	}

	public function test_the_ledger_table_has_no_update_or_delete(): void {
		$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/gift-card/class-gift-card-wpdb-store.php' );
		$this->assertDoesNotMatchRegularExpression( '/(UPDATE|DELETE\s+FROM)\s+\{?\$?\{?ledger/i', $source );
		$this->assertDoesNotMatchRegularExpression( '/\$wpdb->(update|delete)\(\s*self::ledger_table\(\)/', $source, 'The ledger is append-only.' );
		$this->assertMatchesRegularExpression( '/\$wpdb->insert\(\s*self::ledger_table\(\)/', $source );
	}
}
