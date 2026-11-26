<?php
/**
 * Standalone test: with no block registry (the CSS render harness has none), the separators
 * options still come from the block's own block.json, so a block draws the lines it offers.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-separators-caps-disk-standalone.php
 *
 * @package SGS\Blocks
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

$plugin = dirname( __DIR__, 2 );
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', $plugin . '/' );
}
if ( class_exists( 'WP_Block_Type_Registry' ) ) {
	echo "FAIL  this test needs a process with no block registry\n";
	exit( 1 );
}

require_once $plugin . '/includes/helpers-tokens.php';
require_once $plugin . '/includes/class-sgs-breakpoints.php';
require_once $plugin . '/includes/helpers-responsive.php';
require_once $plugin . '/includes/helpers-css-safety.php';
require_once $plugin . '/includes/helpers-hover-state.php';
require_once $plugin . '/includes/helpers-separators-css.php';

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

$declared = 0;
foreach ( glob( $plugin . '/src/blocks/*/block.json' ) as $file ) {
	$data = json_decode( (string) file_get_contents( $file ), true );
	foreach ( (array) ( $data['supports']['sgs']['separators'] ?? array() ) as $attribute => $entry ) {
		++$declared;
		$caps = sgs_separators_caps( $data['name'], $attribute );
		$same = array_values( $entry['axes'] ) === $caps['axes']
			&& (bool) $entry['edges'] === $caps['edges']
			&& (bool) $entry['hover'] === $caps['hover']
			&& (bool) $entry['sweep'] === $caps['sweep'];
		ok( $same, $data['name'] . "::$attribute is read from block.json with no registry" );
	}
}
ok( $declared >= 15, "every declaring block was checked ($declared entries)" );
ok( array() === sgs_separators_caps( 'sgs/heading' )['axes'], 'a block that declares nothing offers no axes' );
ok( array() === sgs_separators_caps( 'sgs/not-a-block' )['axes'], 'an unknown block offers no axes' );
ok( array() === sgs_separators_caps( '../../etc/passwd' )['axes'], 'a block name that is not sgs/<slug> reads no file' );

echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
