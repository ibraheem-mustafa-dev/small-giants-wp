<?php
/**
 * Standalone runner for the add-on price list's server-authoritative
 * resolver (Spec 43 FR-43-17/18): plugins/sgs-blocks/includes/addon-price-list/functions.php.
 *
 * Exercises sgs_addon_resolve()'s validation (unknown group, unknown key,
 * duplicate group, malformed input, happy path, total) by stubbing
 * get_option() so the REAL functions.php runs unmodified against a fixture
 * price list — nothing here is a copy of the shipped logic.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-addon-price-list-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// ── WordPress/WooCommerce stubs (only what functions.php actually calls) ──

/** @var array<int,array<string,mixed>> $GLOBALS['test_addon_option'] Fixture option value, set per test below. */
$GLOBALS['test_addon_option'] = array();

if ( ! function_exists( 'get_option' ) ) {
	function get_option( string $name, $default = false ) {
		return 'sgs_addon_price_list' === $name ? $GLOBALS['test_addon_option'] : $default;
	}
}
if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( string $key ): string {
		$key = strtolower( $key );
		return preg_replace( '/[^a-z0-9_-]/', '', $key ) ?? '';
	}
}
if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( string $text ): string {
		return trim( strip_tags( $text ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.strip_tags_strip_tags -- CLI stub, not shipped code.
	}
}
if ( ! function_exists( 'wc_format_decimal' ) ) {
	function wc_format_decimal( $number, $dp = false ) {
		return number_format( (float) $number, false === $dp ? 2 : (int) $dp, '.', '' );
	}
}
if ( ! function_exists( '__' ) ) {
	function __( string $text, string $domain = 'default' ): string {
		return $text;
	}
}
if ( ! class_exists( 'WP_Error' ) ) {
	// Minimal stand-in for WordPress's own class — only the two methods
	// functions.php's callers (and this runner) actually use.
	class WP_Error {
		/** @var string */
		private $code;
		/** @var string */
		private $message;

		public function __construct( string $code = '', string $message = '' ) {
			$this->code    = $code;
			$this->message = $message;
		}

		public function get_error_code(): string {
			return $this->code;
		}

		public function get_error_message(): string {
			return $this->message;
		}
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/addon-price-list/functions.php';

use function SGS\Blocks\sgs_addon_resolve;
use function SGS\Blocks\sgs_addon_summary;
use function SGS\Blocks\sgs_addon_group;
use function SGS\Blocks\sgs_addon_price_list;

$pass = 0;
$fail = 0;

function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
	} else {
		++$fail;
		echo "FAIL  $label\n";
	}
}

// ════════════════════════════════════════════════════════════════════════════
// Fixture — the Ward End Eye Care lens list shape (Spec 43 FR-43-17/18).
// ════════════════════════════════════════════════════════════════════════════
$GLOBALS['test_addon_option'] = array(
	array(
		'key'     => 'lens-use',
		'label'   => "What they're for",
		'options' => array(
			array( 'key' => 'distance', 'label' => 'Distance', 'price' => '59.00' ),
			array( 'key' => 'reading', 'label' => 'Reading', 'price' => '59.00' ),
			array( 'key' => 'varifocal', 'label' => 'Varifocal', 'price' => '129.00' ),
		),
	),
	array(
		'key'     => 'lens-finish',
		'label'   => 'Finish',
		'options' => array(
			array( 'key' => 'tint', 'label' => 'Tinted to match', 'price' => '0.00' ),
			array( 'key' => 'pol', 'label' => 'Polarised', 'price' => '40.00' ),
		),
	),
);

// ── Reads ──────────────────────────────────────────────────────────────────

ok( 2 === count( sgs_addon_price_list() ), 'sgs_addon_price_list(): returns both fixture groups' );
ok( null !== sgs_addon_group( 'lens-use' ) && 'lens-use' === sgs_addon_group( 'lens-use' )['key'], 'sgs_addon_group(): finds an existing group by key' );
ok( null === sgs_addon_group( 'no-such-group' ), 'sgs_addon_group(): an unknown key returns null, not a fatal' );

// ── Happy path + total ───────────────────────────────────────────────────

$happy = sgs_addon_resolve(
	array(
		array( 'group' => 'lens-use', 'key' => 'varifocal' ),
		array( 'group' => 'lens-finish', 'key' => 'pol' ),
	)
);
ok( ! is_wp_error_stub( $happy ), 'happy path: two valid pairs resolve without error' );
if ( ! is_wp_error_stub( $happy ) ) {
	ok( 2 === count( $happy['lines'] ), 'happy path: two resolved lines' );
	ok( 129.0 === $happy['lines'][0]['price'] && 40.0 === $happy['lines'][1]['price'], 'happy path: each line carries the LIST price, never a client-sent one' );
	ok( 169.0 === $happy['total'], 'happy path: total = 129.00 + 40.00 = 169.00' );
	ok(
		'Varifocal · Polarised' === sgs_addon_summary( $happy['lines'] ),
		'sgs_addon_summary(): labels joined with " · ", e.g. "Varifocal · Polarised" (found: ' . sgs_addon_summary( $happy['lines'] ) . ')'
	);
}

// ── Unknown group ─────────────────────────────────────────────────────────

$unknown_group = sgs_addon_resolve( array( array( 'group' => 'does-not-exist', 'key' => 'x' ) ) );
ok( is_wp_error_stub( $unknown_group ), 'an unknown group is rejected' );
ok( is_wp_error_stub( $unknown_group ) && 'sgs_addon_unknown_group' === $unknown_group->get_error_code(), 'unknown group: correct error code' );

// ── Unknown key within a real group ──────────────────────────────────────

$unknown_key = sgs_addon_resolve( array( array( 'group' => 'lens-use', 'key' => 'bifocal' ) ) );
ok( is_wp_error_stub( $unknown_key ), 'an unknown option key inside a real group is rejected' );
ok( is_wp_error_stub( $unknown_key ) && 'sgs_addon_unknown_option' === $unknown_key->get_error_code(), 'unknown option: correct error code' );

// ── Duplicate group (two options from the same group) ────────────────────

$duplicate = sgs_addon_resolve(
	array(
		array( 'group' => 'lens-use', 'key' => 'distance' ),
		array( 'group' => 'lens-use', 'key' => 'reading' ),
	)
);
ok( is_wp_error_stub( $duplicate ), 'two options from the SAME group is rejected (one choice per group)' );
ok( is_wp_error_stub( $duplicate ) && 'sgs_addon_duplicate_group' === $duplicate->get_error_code(), 'duplicate group: correct error code' );

// ── Malformed input ───────────────────────────────────────────────────────

ok( is_wp_error_stub( sgs_addon_resolve( array( array( 'group' => 'lens-use' ) ) ) ), 'malformed input: missing "key" is rejected' );
ok( is_wp_error_stub( sgs_addon_resolve( array( array( 'key' => 'distance' ) ) ) ), 'malformed input: missing "group" is rejected' );
ok( is_wp_error_stub( sgs_addon_resolve( array( 'not-an-array' ) ) ), 'malformed input: a non-array pair is rejected, not a fatal' );
ok( is_wp_error_stub( sgs_addon_resolve( array( array( 'group' => array( 'x' ), 'key' => 'distance' ) ) ) ), 'malformed input: a non-scalar group value is rejected' );
ok( is_wp_error_stub( sgs_addon_resolve( array( array( 'group' => '', 'key' => 'distance' ) ) ) ), 'malformed input: an empty group string is rejected' );

// ── Empty selection ───────────────────────────────────────────────────────

$empty = sgs_addon_resolve( array() );
ok( ! is_wp_error_stub( $empty ) && array() === $empty['lines'] && 0.0 === $empty['total'], 'an empty pair list resolves to zero lines and a zero total, not an error (a flow with no add-on steps chosen yet)' );

// ── Never trusts a client-sent price/label ────────────────────────────────

$spoofed = sgs_addon_resolve( array( array( 'group' => 'lens-use', 'key' => 'distance', 'price' => '0.01', 'label' => 'Free lenses!' ) ) );
ok( ! is_wp_error_stub( $spoofed ) && 59.0 === $spoofed['total'] && 'Distance' === $spoofed['lines'][0]['label'], 'a client-sent price/label on the pair is IGNORED — the list price (59.00) and list label ("Distance") win' );

// ── sgs_addon_summary() edge cases ────────────────────────────────────────

ok( '' === sgs_addon_summary( array() ), 'sgs_addon_summary(): an empty line set gives an empty string' );

/**
 * Minimal WP_Error-shaped check without requiring WordPress's real class —
 * functions.php returns `new \WP_Error(...)`, so define a matching stub.
 */
function is_wp_error_stub( $thing ): bool {
	return $thing instanceof WP_Error;
}

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
