<?php
/**
 * PHPUnit bootstrap for SGS Blocks plugin tests.
 *
 * Loads the WordPress test infrastructure, then loads the plugin under test.
 *
 * Usage:
 *   WP_TESTS_DIR=/path/to/wordpress-tests-lib phpunit
 *
 * If WP_TESTS_DIR is not set, we fall back to /tmp/wordpress-tests-lib
 * which is where the WordPress test installer writes the suite by default.
 *
 * @package SGS\Blocks\Tests
 */

// Plugin root (two levels above this file: tests/php/ → tests/ → plugin root).
define( 'SGS_BLOCKS_TESTS_DIR', __DIR__ );
define( 'SGS_BLOCKS_PLUGIN_DIR', dirname( __DIR__, 2 ) );

// Locate WordPress test suite.
$_tests_dir = getenv( 'WP_TESTS_DIR' );

if ( ! $_tests_dir ) {
	$_tests_dir = rtrim( sys_get_temp_dir(), '/\\' ) . '/wordpress-tests-lib';
}

if ( ! file_exists( $_tests_dir . '/includes/functions.php' ) ) {
	echo 'ERROR: Cannot find WordPress test suite at ' . $_tests_dir . PHP_EOL;
	echo 'Set WP_TESTS_DIR to point to a valid WordPress test suite installation.' . PHP_EOL;
	echo PHP_EOL;
	echo 'Quick setup:' . PHP_EOL;
	echo '  git clone https://github.com/WordPress/wordpress-develop.git /tmp/wordpress-src' . PHP_EOL;
	echo '  cp /tmp/wordpress-src/tests/phpunit/includes /tmp/wordpress-tests-lib/includes -r' . PHP_EOL;
	echo '  # Or use bin/install-wp-tests.sh (requires mysqladmin)' . PHP_EOL;
	exit( 1 );
}

// Give access to tests_add_filter() function.
require_once $_tests_dir . '/includes/functions.php';

/**
 * Manually load the SGS Blocks plugin before WordPress is fully set up.
 * tests_add_filter() queues this onto muplugins_loaded so WordPress is
 * bootstrapped before we try to use any WP functions.
 */
function _sgs_blocks_load_plugin(): void {
	require SGS_BLOCKS_PLUGIN_DIR . '/sgs-blocks.php';
}

tests_add_filter( 'muplugins_loaded', '_sgs_blocks_load_plugin' );

// Bootstrap the WP testing environment (sets up DB, loads WP core, etc.).
require $_tests_dir . '/includes/bootstrap.php';
