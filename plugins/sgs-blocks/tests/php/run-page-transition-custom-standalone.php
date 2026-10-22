<?php
/**
 * Standalone tests for the custom page-transition duration and easing (Spec 38 FR-38-19).
 *
 * A custom duration or easing always wins over the style's own; empty means the style. Invalid values are refused.
 *
 *   php plugins/sgs-blocks/tests/php/run-page-transition-custom-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-motion-easing.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-motion-registry.php';

use SGS\Blocks\SGS_Motion_Registry as R;

$fail = 0;
function t_eq( $expected, $actual, string $label ): void {
	global $fail;
	if ( $expected === $actual ) {
		echo "PASS  {$label}\n";
		return;
	}
	++$fail;
	echo "FAIL  {$label}\n      expected: " . var_export( $expected, true ) . "\n      actual:   " . var_export( $actual, true ) . "\n";
}

// Duration: whole milliseconds 1 to 5000, else 0 (use the style).
t_eq( 380, R::sanitise_transition_duration( '380' ), 'digit string kept' );
t_eq( 380, R::sanitise_transition_duration( 380 ), 'integer kept' );
foreach ( array( '', '0', '-5', '0.3', '380ms', '5001', 'abc', null, 3.5, array() ) as $bad ) {
	t_eq( 0, R::sanitise_transition_duration( $bad ), 'duration refused: ' . var_export( $bad, true ) );
}

// Easing: a named curve, or a strict cubic-bezier with x in 0..1.
t_eq( 'ease-out', R::sanitise_transition_easing( 'ease-out' ), 'named easing kept' );
t_eq( 'cubic-bezier(0.22, 1, 0.36, 1)', R::sanitise_transition_easing( 'cubic-bezier(0.22,1,0.36,1)' ), 'cubic-bezier normalised' );
t_eq( 'cubic-bezier(0.2, -0.5, 0.4, 1.5)', R::sanitise_transition_easing( 'cubic-bezier( 0.2 , -0.5 , 0.4 , 1.5 )' ), 'y overshoot allowed' );
foreach ( array( 'custom', 'bogus', 'cubic-bezier(1.2,0,0.2,1)', 'cubic-bezier(0,0,0.2)', 'cubic-bezier(0,0,0.2,1);x', 'cubic-bezier(a,0,0,1)', 'url(x)', '', null ) as $bad ) {
	t_eq( '', R::sanitise_transition_easing( $bad ), 'easing refused: ' . var_export( $bad, true ) );
}

// Output: the preset's own values apply when empty; custom values always win.
t_eq(
	'::view-transition-old(root){animation:220ms var(--wp--custom--easing--default, cubic-bezier(0.4,0,0.2,1)) both sgs-vt-fade-out}::view-transition-new(root){animation:220ms var(--wp--custom--easing--default, cubic-bezier(0.4,0,0.2,1)) both sgs-vt-fade-in}',
	R::transition_css( 'fade', 0, '' ),
	'fade preset defaults'
);
t_eq( true, false !== strpos( R::transition_css( 'slide', 0, '' ), 'animation:260ms' ), 'slide preset 260ms' );
$custom = R::transition_css( 'fade', 380, 'ease-out' );
t_eq( true, false !== strpos( $custom, 'animation:380ms var(--wp--custom--easing--ease-out, ease-out) both sgs-vt-fade-out' ), 'custom duration and named easing win (fade)' );
t_eq( true, false !== strpos( R::transition_css( 'slide', 500, 'cubic-bezier(0.22, 1, 0.36, 1)' ), 'animation:500ms cubic-bezier(0.22, 1, 0.36, 1) both sgs-vt-slide-in' ), 'custom duration and curve win (slide)' );
t_eq( '', R::transition_css( 'none', 380, 'ease-out' ), 'none has no CSS' );

exit( $fail > 0 ? 1 : 0 );
