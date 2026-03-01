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
// Composer autoloader (provides PHPUnit + any future autoloaded classes).
$autoload = dirname( __DIR__, 2 ) . '/vendor/autoload.php';

if ( ! file_exists( $autoload ) ) {
    fwrite(
        STDERR,
        'ERROR: vendor/autoload.php not found.' . PHP_EOL .
        'Run `composer install` first.' . PHP_EOL
    );
    exit( 1 );
}

require_once $autoload;

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
