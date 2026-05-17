<?php
/**
 * Tests for Sgs_Site_Info — PHPUnit-shape unit tests.
 *
 * Run with: vendor/bin/phpunit plugins/sgs-blocks/scripts/tests/test_site_info.php
 *
 * These tests use a lightweight WP function stub layer defined at the bottom of
 * this file so they can run without a full WordPress bootstrap. Each test class
 * resets the in-memory option store between runs via Wp_Options_Stub::reset().
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// ---------------------------------------------------------------------------
// Minimal WordPress function stubs (no WP bootstrap needed).
// ---------------------------------------------------------------------------

/**
 * In-memory store simulating wp_options for test isolation.
 */
class Wp_Options_Stub {
	/** @var array<string,mixed> */
	private static array $store = array();

	/** @var bool Simulates whether the current user has the required capability. */
	public static bool $user_can = true;

	/** Reset all state between tests. */
	public static function reset(): void {
		self::$store  = array();
		self::$user_can = true;
	}

	public static function get( string $key, $fallback = false ) {
		return array_key_exists( $key, self::$store ) ? self::$store[ $key ] : $fallback;
	}

	public static function update( string $key, $value ): bool {
		self::$store[ $key ] = $value;
		return true;
	}

	public static function add( string $key, $value ): bool {
		if ( ! array_key_exists( $key, self::$store ) ) {
			self::$store[ $key ] = $value;
		}
		return true;
	}
}

if ( ! function_exists( 'get_option' ) ) {
	function get_option( $key, $fallback = false ) {
		return Wp_Options_Stub::get( $key, $fallback );
	}
}
if ( ! function_exists( 'update_option' ) ) {
	function update_option( $key, $value, $autoload = null ): bool {
		return Wp_Options_Stub::update( $key, $value );
	}
}
if ( ! function_exists( 'add_option' ) ) {
	function add_option( $key, $value = '', $deprecated = '', $autoload = 'yes' ): bool {
		return Wp_Options_Stub::add( $key, $value );
	}
}
if ( ! function_exists( 'current_user_can' ) ) {
	function current_user_can( string $cap ): bool {
		return Wp_Options_Stub::$user_can;
	}
}
if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( $str ): string {
		return strip_tags( (string) $str );
	}
}
if ( ! function_exists( 'sanitize_email' ) ) {
	function sanitize_email( $email ): string {
		return filter_var( (string) $email, FILTER_SANITIZE_EMAIL );
	}
}
if ( ! function_exists( 'esc_url_raw' ) ) {
	function esc_url_raw( $url ): string {
		return filter_var( (string) $url, FILTER_SANITIZE_URL );
	}
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $str ): string {
		return htmlspecialchars( (string) $str, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $url ): string {
		return filter_var( (string) $url, FILTER_SANITIZE_URL );
	}
}
if ( ! function_exists( 'wp_kses' ) ) {
	function wp_kses( $str, $allowed_tags ): string {
		// Stub: strip all tags not in the allowed list.
		$tags = array_keys( $allowed_tags );
		return strip_tags( (string) $str, '<' . implode( '><', $tags ) . '>' );
	}
}
if ( ! function_exists( 'add_filter' ) ) {
	function add_filter(): void {}
}
if ( ! function_exists( 'version_compare' ) ) {
	// Native PHP version_compare is available; no stub needed.
}
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', '/tmp/' );
}

// ---------------------------------------------------------------------------
// Load the class under test.
// ---------------------------------------------------------------------------
require_once __DIR__ . '/../../includes/class-sgs-site-info.php';

use SGS\Blocks\Sgs_Site_Info;

// ---------------------------------------------------------------------------
// Bootstrap PHPUnit if available; otherwise use a minimal assertion runner.
// ---------------------------------------------------------------------------
if ( class_exists( 'PHPUnit\Framework\TestCase' ) ) {

	class Test_Sgs_Site_Info extends \PHPUnit\Framework\TestCase {
		protected function setUp(): void {
			Wp_Options_Stub::reset();
			Sgs_Site_Info::register();
		}

		// --- Round-trip: well-known flat key ---
		public function test_set_and_get_flat_key(): void {
			$result = Sgs_Site_Info::set( 'phone', '+44 121 000 0000' );
			$this->assertTrue( $result );
			$this->assertSame( '+44 121 000 0000', Sgs_Site_Info::get( 'phone' ) );
		}

		// --- Round-trip: dot-notation sub-key ---
		public function test_set_and_get_dot_notation(): void {
			Sgs_Site_Info::set( 'socials.facebook', 'https://facebook.com/example' );
			$this->assertSame( 'https://facebook.com/example', Sgs_Site_Info::get( 'socials.facebook' ) );
		}

		// --- all() returns raw associative array ---
		public function test_all_returns_raw_array(): void {
			Sgs_Site_Info::set( 'tagline', 'Fresh every day' );
			$all = Sgs_Site_Info::all();
			$this->assertIsArray( $all );
			$this->assertSame( 'Fresh every day', $all['tagline'] );
		}

		// --- Capability blocked: non-admin cannot write ---
		public function test_set_blocked_for_non_admin(): void {
			Wp_Options_Stub::$user_can = false;
			$result = Sgs_Site_Info::set( 'phone', '0800 000 000' );
			$this->assertFalse( $result );
			// Confirm nothing was written.
			$this->assertSame( '', Sgs_Site_Info::get( 'phone' ) );
		}

		// --- Reserved key denylist blocks set() ---
		public function test_set_reserved_key_blocked(): void {
			$result = Sgs_Site_Info::set( 'sgs_framework_version', '1.0' );
			$this->assertFalse( $result );
		}

		// --- Invalid key pattern blocks set() ---
		public function test_set_script_tag_key_blocked(): void {
			$result = Sgs_Site_Info::set( '<script>', 'xss' );
			$this->assertFalse( $result );
		}

		// --- Invalid key: uppercase blocked ---
		public function test_set_uppercase_key_blocked(): void {
			$result = Sgs_Site_Info::set( 'Phone', 'test' );
			$this->assertFalse( $result );
		}

		// --- Escaping wrapper: get_esc_html ---
		public function test_get_esc_html_escapes_output(): void {
			// Bypass sanitiser by writing directly to the stub store.
			update_option( 'sgs_site_info', array( 'tagline' => '<b>Bold & "quoted"</b>' ) );
			$escaped = Sgs_Site_Info::get_esc_html( 'tagline' );
			$this->assertStringContainsString( '&lt;b&gt;', $escaped );
			$this->assertStringContainsString( '&amp;', $escaped );
		}

		// --- Escaping wrapper: get_esc_url ---
		public function test_get_esc_url_escapes_output(): void {
			Sgs_Site_Info::set( 'socials.facebook', 'https://facebook.com/test' );
			$url = Sgs_Site_Info::get_esc_url( 'socials.facebook' );
			$this->assertNotEmpty( $url );
			$this->assertStringStartsWith( 'https', $url );
		}

		// --- Fallback returned when key absent ---
		public function test_get_returns_fallback_for_missing_key(): void {
			$this->assertSame( 'default_val', Sgs_Site_Info::get( 'missing_key', 'default_val' ) );
		}

		// --- reset() wipes the store ---
		public function test_reset_wipes_store(): void {
			Sgs_Site_Info::set( 'phone', '01234 567890' );
			Sgs_Site_Info::reset();
			$this->assertSame( array(), Sgs_Site_Info::all() );
		}

		// --- reset() blocked for non-admin ---
		public function test_reset_blocked_for_non_admin(): void {
			Sgs_Site_Info::set( 'phone', '01234 567890' );
			Wp_Options_Stub::$user_can = false;
			$result = Sgs_Site_Info::reset();
			$this->assertFalse( $result );
			$this->assertSame( '01234 567890', Sgs_Site_Info::get( 'phone' ) );
		}

		// --- migrate_schema() records version ---
		public function test_migrate_schema_records_version(): void {
			Sgs_Site_Info::migrate_schema();
			$this->assertSame( Sgs_Site_Info::SCHEMA_VERSION, Sgs_Site_Info::schema_version() );
		}

		// --- migrate_schema() is idempotent ---
		public function test_migrate_schema_idempotent(): void {
			Sgs_Site_Info::migrate_schema();
			Sgs_Site_Info::migrate_schema();
			$this->assertSame( Sgs_Site_Info::SCHEMA_VERSION, Sgs_Site_Info::schema_version() );
		}
	}
} else {

	// ---------------------------------------------------------------------------
	// Minimal fallback runner when PHPUnit is not installed.
	// ---------------------------------------------------------------------------
	function run_tests(): void {
		$passed = 0;
		$failed = 0;

		$cases = array(
			'round_trip_flat_key' => function () {
				Wp_Options_Stub::reset();
				Sgs_Site_Info::register();
				assert( Sgs_Site_Info::set( 'phone', '+44 121 000 0000' ) === true );
				assert( Sgs_Site_Info::get( 'phone' ) === '+44 121 000 0000' );
			},
			'round_trip_dot_notation' => function () {
				Wp_Options_Stub::reset();
				Sgs_Site_Info::register();
				Sgs_Site_Info::set( 'socials.facebook', 'https://facebook.com/example' );
				assert( Sgs_Site_Info::get( 'socials.facebook' ) === 'https://facebook.com/example' );
			},
			'non_admin_blocked' => function () {
				Wp_Options_Stub::reset();
				Sgs_Site_Info::register();
				Wp_Options_Stub::$user_can = false;
				assert( Sgs_Site_Info::set( 'phone', '0800' ) === false );
				assert( Sgs_Site_Info::get( 'phone' ) === '' );
			},
			'reserved_key_blocked' => function () {
				Wp_Options_Stub::reset();
				Sgs_Site_Info::register();
				assert( Sgs_Site_Info::set( 'sgs_framework_version', '1.0' ) === false );
			},
			'script_key_blocked' => function () {
				Wp_Options_Stub::reset();
				Sgs_Site_Info::register();
				assert( Sgs_Site_Info::set( '<script>', 'xss' ) === false );
			},
			'get_esc_html_escapes' => function () {
				Wp_Options_Stub::reset();
				Sgs_Site_Info::register();
				update_option( 'sgs_site_info', array( 'tagline' => '<b>Bold</b>' ) );
				$val = Sgs_Site_Info::get_esc_html( 'tagline' );
				assert( str_contains( $val, '&lt;b&gt;' ) );
			},
			'get_esc_url_returns_url' => function () {
				Wp_Options_Stub::reset();
				Sgs_Site_Info::register();
				Sgs_Site_Info::set( 'socials.facebook', 'https://facebook.com/test' );
				$url = Sgs_Site_Info::get_esc_url( 'socials.facebook' );
				assert( str_starts_with( $url, 'https' ) );
			},
			'all_returns_array' => function () {
				Wp_Options_Stub::reset();
				Sgs_Site_Info::register();
				Sgs_Site_Info::set( 'tagline', 'Test' );
				$all = Sgs_Site_Info::all();
				assert( is_array( $all ) );
				assert( $all['tagline'] === 'Test' );
			},
			'reset_wipes_store' => function () {
				Wp_Options_Stub::reset();
				Sgs_Site_Info::register();
				Sgs_Site_Info::set( 'phone', '01234 567890' );
				Sgs_Site_Info::reset();
				assert( Sgs_Site_Info::all() === array() );
			},
			'migrate_schema_records_version' => function () {
				Wp_Options_Stub::reset();
				Sgs_Site_Info::register();
				Sgs_Site_Info::migrate_schema();
				assert( Sgs_Site_Info::schema_version() === Sgs_Site_Info::SCHEMA_VERSION );
			},
		);

		foreach ( $cases as $name => $fn ) {
			try {
				$fn();
				echo "PASS: {$name}\n";
				++$passed;
			} catch ( \Throwable $e ) {
				echo "FAIL: {$name} — {$e->getMessage()}\n";
				++$failed;
			}
		}

		echo "\n{$passed} passed, {$failed} failed.\n";
		exit( $failed > 0 ? 1 : 0 );
	}

	run_tests();
}
