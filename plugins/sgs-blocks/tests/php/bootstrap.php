<?php
/**
 * PHPUnit bootstrap for SGS Blocks plugin tests.
 *
 * This bootstrap is self-contained: it does NOT require a live WordPress
 * installation or the WP test suite.  Tests use plain PHPUnit\Framework\TestCase
 * and test the plugin's file structure, JSON configuration, and PHP class
 * contracts directly.
 *
 * Run with:
 *   vendor/bin/phpunit --configuration phpunit.xml.dist
 *
 * @package SGS\Blocks\Tests
 */

// ── Autoloader ───────────────────────────────────────────────────────────────
// Composer autoloader — looks in own vendor/ first, then falls back to the
// canonical project root vendor/ (used when running from a git worktree).
$sgs_autoload = dirname( __DIR__, 2 ) . '/vendor/autoload.php';
if ( ! file_exists( $sgs_autoload ) ) {
    // Worktree: seven levels up from tests/php/ reaches the main project root.
    $sgs_autoload = dirname( __DIR__, 7 ) . '/plugins/sgs-blocks/vendor/autoload.php';
}

if ( ! file_exists( $sgs_autoload ) ) {
	fwrite(
		STDERR,
		'ERROR: vendor/autoload.php not found.' . PHP_EOL .
		'Run `composer install` first.' . PHP_EOL
	);
	exit( 1 );
}

require_once $sgs_autoload;

// ── Plugin root constants ─────────────────────────────────────────────────────
define( 'SGS_BLOCKS_TESTS_DIR', __DIR__ );
define( 'SGS_BLOCKS_PLUGIN_DIR', dirname( __DIR__, 2 ) );
define( 'SGS_BLOCKS_VERSION', '0.1.0' );

// ── Minimal WordPress stubs ───────────────────────────────────────────────────
// Only the constants and functions that the tests themselves reference.
// We do NOT load the plugin code (which requires a running WP environment).

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', SGS_BLOCKS_PLUGIN_DIR . '/' );
}

if ( ! defined( 'WP_PLUGIN_DIR' ) ) {
	define( 'WP_PLUGIN_DIR', dirname( SGS_BLOCKS_PLUGIN_DIR ) );
}

// Stub: wp_enqueue_style() — no-op in unit tests; dashicon enqueue tracking.
if ( ! function_exists( 'wp_enqueue_style' ) ) {
    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- WP stub.
    function wp_enqueue_style( string $handle ): void { // phpcs:ignore
		$GLOBALS['sgs_test_enqueued_styles'][] = $handle;
	}
}

// Stub: get_block_wrapper_attributes() — merges attrs into an HTML attr string.
if ( ! function_exists( 'get_block_wrapper_attributes' ) ) {
    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- WP stub.
    function get_block_wrapper_attributes( array $extra_attrs = array() ): string { // phpcs:ignore
		$extra_attrs['class'] = trim( ( $extra_attrs['class'] ?? '' ) . ' wp-block-sgs-icon' );
		$parts                = array();
		foreach ( $extra_attrs as $key => $value ) {
			$parts[] = htmlspecialchars( (string) $key, ENT_QUOTES, 'UTF-8' )
				. '="' . htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' ) . '"';
		}
		return implode( ' ', $parts );
	}
}

// Stub: esc_attr(), esc_html(), esc_url() — used by render helpers.
if ( ! function_exists( 'esc_attr' ) ) {
    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- WP stub.
    function esc_attr( $text ): string { // phpcs:ignore
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_html' ) ) {
    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- WP stub.
    function esc_html( $text ): string { // phpcs:ignore
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_url' ) ) {
    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- WP stub.
    function esc_url( $url ): string { // phpcs:ignore
		return filter_var( (string) $url, FILTER_SANITIZE_URL ) ?: '';
	}
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- WP stub.
    function wp_strip_all_tags( string $string ): string { // phpcs:ignore
		return strip_tags( $string );
	}
}

// ── WordPress function stubs for render.php inclusion tests ──────────────────
require_once __DIR__ . '/stubs/wp-functions.php';
