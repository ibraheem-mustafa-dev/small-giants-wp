<?php
/**
 * The gift-card code-hashing key is dedicated, stable and independent of the WordPress salts
 * (Spec 27, FR-27-GC3).
 *
 * Salts live in wp-config.php, not the database. A key derived from them would strand every issued
 * card when salts rotate or when a database is copied to a site with different salts. The scenarios
 * run in child processes (tests/php/support/gift-card-key-harness.php).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\TestCase;

#[Group( 'sgs_gift_card' )]
final class GiftCardCodeKeyTest extends TestCase {

	/** @var array<string,mixed> */
	private static array $r = array();

	/** @var array<string,mixed> */
	private static array $constant = array();

	/**
	 * Run the harness and decode its JSON.
	 *
	 * @param string $flag Optional harness flag.
	 * @return array<string,mixed>
	 */
	private static function run_harness( string $flag = '' ): array {
		$script = __DIR__ . '/support/gift-card-key-harness.php';
		$out    = array();
		$code   = 0;
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ( '' === $flag ? '' : ' ' . $flag ) . ' 2>&1', $out, $code );
		$json = json_decode( implode( "\n", $out ), true );
		if ( 0 !== $code || ! is_array( $json ) ) {
			self::fail( 'Harness failed: ' . implode( "\n", $out ) );
		}
		return $json;
	}

	public static function setUpBeforeClass(): void {
		self::$r        = self::run_harness();
		self::$constant = self::run_harness( '--constant' );
	}

	public function test_the_key_is_created_once_and_is_stable_across_calls(): void {
		$this->assertFalse( self::$r['option_before'], 'No key existed before the first use.' );
		$this->assertTrue( self::$r['first_is_hex64'], '32 random bytes, hex encoded.' );
		$this->assertTrue( self::$r['stable'], 'The same key on every call.' );
		$this->assertTrue( self::$r['stored_matches'] );
		$this->assertSame( 1, self::$r['add_calls_after_three_reads'], 'Created once; later reads do not add again.' );
	}

	public function test_a_key_that_cannot_be_stored_is_refused_never_handed_out(): void {
		$r = self::run_harness( '--store-fails' );
		$this->assertTrue( $r['threw'], 'default_key() must refuse when the key cannot be stored' );
		$this->assertArrayNotHasKey( 'key', $r );
		$this->assertFalse( $r['stored'] );
	}

	public function test_the_key_option_is_not_autoloaded(): void {
		$this->assertFalse( self::$r['autoload'] );
	}

	public function test_an_existing_key_is_never_overwritten(): void {
		$this->assertTrue( self::$r['create_again_returns_first'], 'A second create keeps the first value.' );
		$this->assertTrue( self::$r['option_still_first'] );
		$this->assertTrue( self::$r['race_loser_gets_winner'], 'A concurrent first request that loses the add reads back the winner.' );
	}

	public function test_two_sites_get_independent_keys_negative_control(): void {
		$this->assertTrue( self::$r['independent_sites_differ'], 'The key is random, not a fixed string.' );
	}

	public function test_the_wp_config_constant_beats_the_option(): void {
		$this->assertTrue( self::$constant['constant_mode'] );
		$this->assertSame( 'constant-key-from-wp-config', self::$constant['key'] );
		$this->assertSame( 'key-from-the-database', self::$constant['option_after'], 'The option is left untouched.' );
		$this->assertSame( 0, self::$constant['add_calls'], 'With the constant defined nothing is created.' );
	}

	public function test_without_the_constant_the_option_is_used_negative_control(): void {
		$this->assertFalse( self::$r['constant_mode'] );
		$this->assertTrue( self::$r['stored_matches'] );
	}

	public function test_a_card_issued_under_the_key_is_found_after_the_wordpress_salts_change(): void {
		$this->assertTrue( self::$r['found_after_salt_change'] );
		$this->assertTrue( self::$r['key_unchanged_by_salt'] );
	}

	public function test_the_old_salt_derived_scheme_would_have_stranded_the_card_negative_control(): void {
		$this->assertTrue( self::$r['old_scheme_would_break'], 'Deriving the key from wp_salt() changes it when the salt changes, which is the failure being prevented.' );
	}

	public function test_default_key_no_longer_reads_the_salts_and_the_key_is_created_with_the_tables(): void {
		$code = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/gift-card/class-gift-card-code.php' );
		$this->assertStringNotContainsString( 'wp_salt', $code );
		$this->assertStringContainsString( "'sgs_gift_card_code_key'", $code );
		$this->assertStringContainsString( 'SGS_GIFT_CARD_CODE_KEY', $code );
		$this->assertStringContainsString( 'add_option(', $code );
		$tables = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/gift-card/class-gift-card-tables.php' );
		$this->assertStringContainsString( 'Gift_Card_Code::default_key()', $tables, 'The key is created when the tables install or upgrade.' );
	}
}
