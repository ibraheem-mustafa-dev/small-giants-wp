<?php
/**
 * Tests for Sgs_Site_Info_Binding — standalone CLI test script.
 *
 * phpcs:disable -- WPCS production rules do not apply to this CLI test harness.
 *
 * Stubs every WordPress function the class calls so the file runs outside a
 * full WordPress bootstrap.
 *
 * Run from repo root:
 *   php plugins/sgs-blocks/scripts/tests/test_site_info_binding.php
 *
 * Exit 0 = all pass. Exit 1 = failures.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// ---------------------------------------------------------------------------
// All code uses bracketed namespace blocks so PHP can mix namespaces cleanly.
// Block 1: global namespace — WordPress stubs + test runner.
// Block 2: SGS\Blocks namespace — Wave 1B stub class + require of class under test.
// Block 3: global namespace — test execution.
// ---------------------------------------------------------------------------

namespace { // Block 1: global namespace — WordPress stubs.

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

	if ( ! function_exists( 'add_action' ) ) {
		function add_action( string $hook, callable $callback ): void {}
	}

	if ( ! function_exists( 'register_block_bindings_source' ) ) {
		function register_block_bindings_source( string $name, array $args ): void {
			$GLOBALS['_sgs_test_last_binding'] = [ 'name' => $name, 'args' => $args ];
		}
	}

	if ( ! function_exists( 'current_user_can' ) ) {
		function current_user_can( string $cap ): bool {
			return (bool) ( $GLOBALS['_sgs_test_user_can'][ $cap ] ?? false );
		}
	}

	if ( ! function_exists( 'esc_html' ) ) {
		function esc_html( string $text ): string {
			return htmlspecialchars( $text, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		}
	}

	if ( ! function_exists( 'esc_url' ) ) {
		function esc_url( string $url ): string {
			return filter_var( $url, FILTER_SANITIZE_URL ) ?: '';
		}
	}

	if ( ! function_exists( 'admin_url' ) ) {
		function admin_url( string $path = '' ): string {
			return 'https://example.com/wp-admin/' . ltrim( $path, '/' );
		}
	}

	if ( ! function_exists( '__' ) ) {
		function __( string $text, string $domain = 'default' ): string {
			return $text;
		}
	}

	if ( ! function_exists( 'sanitize_key' ) ) {
		function sanitize_key( string $key ): string {
			return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $key ) ) ?? '';
		}
	}
} // end global namespace block.

// ---------------------------------------------------------------------------
// Back to SGS\Blocks namespace — declare the Wave 1B stub BEFORE loading the
// binding class, so class_exists( 'SGS\Blocks\Sgs_Site_Info' ) returns true.
// ---------------------------------------------------------------------------

namespace SGS\Blocks {

	if ( ! class_exists( __NAMESPACE__ . '\Sgs_Site_Info' ) ) {
		/**
		 * Test double for Sgs_Site_Info (Wave 1B).
		 * Reads from $GLOBALS['_sgs_test_site_info_store'] with dot-notation.
		 */
		class Sgs_Site_Info {
			public static function get( string $key ): mixed {
				$store = $GLOBALS['_sgs_test_site_info_store'] ?? [];

				if ( array_key_exists( $key, $store ) ) {
					return $store[ $key ];
				}

				// Dot-notation traversal.
				$parts   = explode( '.', $key );
				$current = $store;
				foreach ( $parts as $part ) {
					if ( ! is_array( $current ) || ! array_key_exists( $part, $current ) ) {
						return null;
					}
					$current = $current[ $part ];
				}
				return $current;
			}
		}
	}

	// Load the class under test (now Sgs_Site_Info stub already exists).
	// __DIR__ = .../sgs-blocks/scripts/tests — go up 2 to reach sgs-blocks/.
	$_binding_file = dirname( __DIR__, 2 ) . '/includes/class-sgs-site-info-binding.php';
	if ( ! file_exists( $_binding_file ) ) {
		echo 'FATAL: class-sgs-site-info-binding.php not found at ' . $_binding_file . PHP_EOL;
		exit( 1 );
	}
	require_once $_binding_file;

} // end SGS\Blocks namespace block.

// ---------------------------------------------------------------------------
// Test runner — global namespace for simplicity.
// ---------------------------------------------------------------------------

namespace {

	$_pass     = 0;
	$_fail     = 0;
	$_failures = [];

	function t_equals( string $name, mixed $expected, mixed $actual ): void {
		global $_pass, $_fail, $_failures;
		if ( $expected === $actual ) {
			++$_pass;
			echo '  PASS  ' . $name . PHP_EOL;
		} else {
			++$_fail;
			$_failures[] = $name;
			echo '  FAIL  ' . $name . PHP_EOL;
			echo '        expected: ' . var_export( $expected, true ) . PHP_EOL;
			echo '        actual:   ' . var_export( $actual, true ) . PHP_EOL;
		}
	}

	function t_contains( string $name, string $needle, string $haystack ): void {
		global $_pass, $_fail, $_failures;
		if ( str_contains( $haystack, $needle ) ) {
			++$_pass;
			echo '  PASS  ' . $name . PHP_EOL;
		} else {
			++$_fail;
			$_failures[] = $name;
			echo '  FAIL  ' . $name . PHP_EOL;
			echo '        needle:   ' . $needle . PHP_EOL;
			echo '        haystack: ' . $haystack . PHP_EOL;
		}
	}

	// Shorthand alias.
	function binding_get( string $key ): string {
		return \SGS\Blocks\Sgs_Site_Info_Binding::get_value( [ 'key' => $key ], [], 'content' );
	}

	// -------------------------------------------------------------------------
	echo PHP_EOL . 'SGS Site Info Binding — test suite' . PHP_EOL;
	echo str_repeat( '-', 50 ) . PHP_EOL;

	// T1 — Populated key returns correctly escaped value.
	echo PHP_EOL . 'T1: Populated key — escaped value returned' . PHP_EOL;

	$GLOBALS['_sgs_test_site_info_store'] = [ 'phone' => '+44 121 000 0000' ];
	$result = binding_get( 'phone' );
	t_contains( 'phone value contains tel: prefix', 'tel:', $result );

	$GLOBALS['_sgs_test_site_info_store'] = [ 'tagline' => 'Fresh every day <b>bold</b>' ];
	$result = binding_get( 'tagline' );
	t_equals( 'tagline HTML is escaped', 'Fresh every day &lt;b&gt;bold&lt;/b&gt;', $result );

	// T2 — Empty store returns hint anchor with admin URL and correct emoji.
	echo PHP_EOL . 'T2: Empty key — escaped hint anchor returned' . PHP_EOL;
	$GLOBALS['_sgs_test_site_info_store'] = [];

	$r = binding_get( 'phone' );
	t_contains( 'phone hint has <a href', '<a href', $r );
	t_contains( 'phone hint contains admin page slug', 'sgs-site-info', $r );
	t_contains( 'phone hint has 📞 emoji', '📞', $r );
	t_contains( 'phone hint has deep-link #phone fragment', '#phone', $r );

	$r = binding_get( 'email' );
	t_contains( 'email hint has ✉️ emoji', '✉️', $r );

	$r = binding_get( 'address' );
	t_contains( 'address hint has 📍 emoji', '📍', $r );

	$r = binding_get( 'opening_hours' );
	t_contains( 'opening_hours hint has 🕐 emoji', '🕐', $r );

	$r = binding_get( 'copyright' );
	t_contains( 'copyright hint has © symbol', '©', $r );

	$r = binding_get( 'tagline' );
	t_contains( 'tagline hint has 💬 emoji', '💬', $r );

	$r = binding_get( 'custom_field' );
	t_contains( 'unknown key hint has ✏️ emoji', '✏️', $r );

	// T3 — Dot-notation key resolves via stub.
	echo PHP_EOL . 'T3: Dot-notation key resolution' . PHP_EOL;

	$GLOBALS['_sgs_test_site_info_store'] = [
		'socials' => [ 'facebook' => 'https://facebook.com/example' ],
	];
	$r = binding_get( 'socials.facebook' );
	t_contains( 'dot-notation socials.facebook resolves', 'facebook.com/example', $r );

	$GLOBALS['_sgs_test_site_info_store'] = [
		'opening_hours' => [ 'monday' => '9am - 5pm' ],
	];
	$r = binding_get( 'opening_hours.monday' );
	t_contains( 'dot-notation opening_hours.monday resolves', '9am', $r );

	// T4 — URL prefixing.
	echo PHP_EOL . 'T4: URL prefix — scheme added when absent' . PHP_EOL;

	$r = \SGS\Blocks\Sgs_Site_Info_Binding::prefix_url_for_key( 'email', 'foo@bar.com' );
	t_equals( 'email gets mailto: prefix', 'mailto:foo@bar.com', $r );

	$r = \SGS\Blocks\Sgs_Site_Info_Binding::prefix_url_for_key( 'phone', '+44 121 000 0000' );
	t_equals( 'phone gets tel: prefix', 'tel:+44 121 000 0000', $r );

	$r = \SGS\Blocks\Sgs_Site_Info_Binding::prefix_url_for_key( 'socials.facebook', 'facebook.com/x' );
	t_equals( 'social gets https:// prefix', 'https://facebook.com/x', $r );

	// T5 — URL prefix skipped when scheme already present.
	echo PHP_EOL . 'T5: URL prefix — skipped when scheme present' . PHP_EOL;

	$r = \SGS\Blocks\Sgs_Site_Info_Binding::prefix_url_for_key( 'socials.facebook', 'https://facebook.com/x' );
	t_equals( 'https:// not double-prefixed', 'https://facebook.com/x', $r );

	$r = \SGS\Blocks\Sgs_Site_Info_Binding::prefix_url_for_key( 'email', 'mailto:already@there.com' );
	t_equals( 'mailto: not double-prefixed', 'mailto:already@there.com', $r );

	$r = \SGS\Blocks\Sgs_Site_Info_Binding::prefix_url_for_key( 'phone', 'tel:+44123' );
	t_equals( 'tel: not double-prefixed', 'tel:+44123', $r );

	// T6 — canUserEditValue capability gate.
	echo PHP_EOL . 'T6: canUserEditValue capability gate' . PHP_EOL;

	\SGS\Blocks\Sgs_Site_Info_Binding::register_source();
	$registered_args = $GLOBALS['_sgs_test_last_binding']['args'] ?? [];
	$can_edit_cb     = $registered_args['can_user_edit_value'] ?? null;

	if ( ! is_callable( $can_edit_cb ) ) {
		t_equals( 'can_user_edit_value callback registered', true, false );
	} else {
		$GLOBALS['_sgs_test_user_can'] = [ 'edit_theme_options' => true ];
		t_equals( 'admin (edit_theme_options=true) can edit', true, $can_edit_cb() );

		$GLOBALS['_sgs_test_user_can'] = [ 'edit_theme_options' => false ];
		t_equals( 'editor (edit_theme_options=false) cannot edit', false, $can_edit_cb() );
	}

	// -------------------------------------------------------------------------
	echo PHP_EOL . str_repeat( '-', 50 ) . PHP_EOL;
	$total = $_pass + $_fail;
	printf( 'Results: %d/%d passed' . PHP_EOL, $_pass, $total );

	if ( $_fail > 0 ) {
		echo PHP_EOL . 'Failures:' . PHP_EOL;
		foreach ( $_failures as $f ) {
			echo '  - ' . $f . PHP_EOL;
		}
		exit( 1 );
	}

	echo 'All tests passed.' . PHP_EOL;
	exit( 0 );

} // end global namespace block.
