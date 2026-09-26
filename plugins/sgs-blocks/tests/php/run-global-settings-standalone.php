<?php
/**
 * Standalone test: includes/helpers-global-settings.php::sgs_global_custom_setting().
 *
 * The stand-in wp_get_global_settings() copies core's real fallback
 * (wp-includes/global-styles-and-settings.php: `_wp_array_get( $settings, $path,
 * $settings )`), so a missing path returns the WHOLE settings array. NEGATIVE
 * CONTROL: the old nested-path read of a missing key comes back non-empty.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-global-settings-standalone.php
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );

$GLOBALS['sgs_test_settings'] = array(
	'appearanceTools' => true,
	'custom'          => array( 'shadowColour' => '#112233', 'dark' => array( 'text' => '#eeeeee' ) ),
);

function wp_get_global_settings( $path = array() ) {
	$settings = $GLOBALS['sgs_test_settings'];
	$value    = $settings;
	foreach ( $path as $key ) {
		if ( ! is_array( $value ) || ! array_key_exists( $key, $value ) ) {
			return $settings; // core: _wp_array_get( $settings, $path, $settings ).
		}
		$value = $value[ $key ];
	}
	return $value;
}

require dirname( __DIR__, 2 ) . '/includes/helpers-global-settings.php';

$failures = 0;
$passes   = 0;
function ok( bool $cond, string $label ): void {
	global $failures, $passes;
	if ( $cond ) {
		++$passes;
		echo "PASS  {$label}\n";
	} else {
		++$failures;
		echo "FAIL  {$label}\n";
	}
}

ok( array( 'text' => '#eeeeee' ) === sgs_global_custom_setting( 'dark' ), 'a present key returns its value' );
ok( '#112233' === sgs_global_custom_setting( 'shadowColour' ), 'a present scalar key returns its value' );
ok( null === sgs_global_custom_setting( 'darkInk' ), 'a missing key returns null' );
ok( null === sgs_global_custom_setting( 'appearanceTools' ), 'a top-level settings key is never mistaken for a custom key' );

$GLOBALS['sgs_test_settings'] = array( 'appearanceTools' => true );
ok( null === sgs_global_custom_setting( 'dark' ), 'no settings.custom at all returns null' );

// NEGATIVE CONTROL: the nested-path form this helper replaces.
$GLOBALS['sgs_test_settings'] = array( 'appearanceTools' => true, 'custom' => array() );
$old = wp_get_global_settings( array( 'custom', 'dark' ) );
ok( is_array( $old ) && ! empty( $old ), 'NEGATIVE CONTROL: the old nested read of a missing key returns the whole (non-empty) settings array' );

echo "\n==== {$passes} passed, {$failures} failed ====\n";
exit( $failures > 0 ? 1 : 0 );
