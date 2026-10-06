<?php
/**
 * Standalone tests for includes/helpers-tokens.php::sgs_transition_vars.
 *
 * A transition duration is a non-negative whole number of milliseconds. A value of any other shape ("0.25s", "0.3",
 * "1s") is REFUSED and the declared default (300ms) applies; it is never reduced to its digits. A valid integer, a
 * digit string and a legitimate zero pass through unchanged.
 *
 *   php plugins/sgs-blocks/tests/php/run-transition-vars-standalone.php
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
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path ) {
		return null;
	}
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';

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

function duration_of( $value ): string {
	return sgs_transition_vars( array( 'transitionDuration' => $value ) )[0];
}

// The stripping behaviour: every non-digit deleted, the survivors re-read as milliseconds.
function sgs_transition_duration_strip_stub( $value ): string {
	$ms = preg_replace( '/[^0-9]/', '', (string) $value );
	return '--sgs-transition-duration:' . ( '' !== $ms ? $ms : '300' ) . 'ms';
}

$default = '--sgs-transition-duration:300ms';

// Refusal: a decimal or a unit-suffixed value falls back to the default, never to a stripped number.
foreach ( array( '0.25s', '0.3', '1s', '250ms', '-5', '1e3', ' 250', 'abc', '', 0.3, 0.25, -250 ) as $bad ) {
	t_eq( $default, duration_of( $bad ), 'refused, default applies: ' . var_export( $bad, true ) );
}
t_eq( $default, sgs_transition_vars( array() )[0], 'absent attribute takes the default' );

// Not over-suppressing: valid whole milliseconds pass through unchanged, and a real zero survives.
t_eq( '--sgs-transition-duration:250ms', duration_of( '250' ), 'digit string 250 stays 250ms' );
t_eq( '--sgs-transition-duration:250ms', duration_of( 250 ), 'integer 250 stays 250ms' );
t_eq( '--sgs-transition-duration:250ms', duration_of( 250.0 ), 'integral float 250.0 stays 250ms' );
t_eq( '--sgs-transition-duration:0ms', duration_of( '0' ), 'digit string 0 stays 0ms' );
t_eq( '--sgs-transition-duration:0ms', duration_of( 0 ), 'integer 0 stays 0ms' );
t_eq( '--sgs-transition-duration:1000ms', duration_of( '1000' ), 'digit string 1000 stays 1000ms' );

// Easing is unaffected.
$vars = sgs_transition_vars( array( 'transitionDuration' => '0.3', 'transitionEasing' => 'linear' ) );
t_eq( array( $default, '--sgs-transition-easing:linear' ), $vars, 'a refused duration leaves a valid easing intact' );

// Negative control: the stripping behaviour mangles each decimal (so the refusal cases above go red if it returns).
$caught = 0;
foreach ( array( '0.25s', '0.3', '1s' ) as $bad ) {
	if ( sgs_transition_duration_strip_stub( $bad ) !== $default ) {
		++$caught;
	}
}
t_eq( 3, $caught, 'negative control: the stripping stub is caught by all 3 decimal cases' );

echo $fail ? "Transition vars: {$fail} failed\n" : "Transition vars: all passed\n";
exit( $fail > 0 ? 1 : 0 );
