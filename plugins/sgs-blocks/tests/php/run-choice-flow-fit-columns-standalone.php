<?php
/**
 * Standalone tests for includes/choice-flow-showcase.php: the fit-to-screen class and the wide-container option columns.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-choice-flow-fit-columns-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals, WordPress.Security.EscapeOutput.OutputNotEscaped, Squiz.Commenting

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

require dirname( __DIR__, 2 ) . '/includes/choice-flow-showcase.php';

$fail = 0;
function check( string $label, bool $ok ): void {
	global $fail;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $ok ) {
		++$fail;
	}
}

check( 'showcase defaults to fitting the screen', 'sgs-choice-flow--fit-screen' === sgs_choice_flow_fit_class( array( 'flowLayout' => 'showcase' ) ) );
check( 'showcase with fitToScreen true fits', 'sgs-choice-flow--fit-screen' === sgs_choice_flow_fit_class( array( 'flowLayout' => 'showcase', 'fitToScreen' => true ) ) );
check( 'showcase with fitToScreen false does not fit', '' === sgs_choice_flow_fit_class( array( 'flowLayout' => 'showcase', 'fitToScreen' => false ) ) );
check( 'compact never fits', '' === sgs_choice_flow_fit_class( array( 'flowLayout' => 'compact' ) ) );

$sel = '.sgs-cf-1';
check( 'default columns emit nothing', '' === sgs_choice_flow_wide_columns_css( array(), $sel ) );
check( 'two columns emit nothing', '' === sgs_choice_flow_wide_columns_css( array( 'optionColumnsWide' => 2 ), $sel ) );
check( 'out of range emits nothing', '' === sgs_choice_flow_wide_columns_css( array( 'optionColumnsWide' => 9 ), $sel ) );
$css = sgs_choice_flow_wide_columns_css( array( 'optionColumnsWide' => 3 ), $sel );
check( 'three columns print a container rule from 2200px', str_contains( $css, '@container sgs-choice-flow-showcase (min-width: 2200px)' ) && str_contains( $css, 'grid-template-columns:repeat(3,minmax(0,1fr))' ) && str_contains( $css, $sel ) );
check( 'four columns print four tracks', str_contains( sgs_choice_flow_wide_columns_css( array( 'optionColumnsWide' => 4 ), $sel ), 'repeat(4,' ) );

$render   = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/choice-flow/render.php' );
$showcase = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/choice-flow-showcase.php' );
check( 'render.php prints the fit class on the root', str_contains( $render, 'sgs_choice_flow_fit_class( $attributes )' ) );
check( 'render.php collects the showcase CSS', str_contains( $render, 'sgs_choice_flow_showcase_css( $attributes, $root_sel )' ) );
check( 'the showcase CSS includes the wide-container columns', 1 === preg_match( '/return \$css \. sgs_choice_flow_media_size_css\([^;]*sgs_choice_flow_wide_columns_css\( \$attributes, \$root_sel \);/', $showcase ) );
check( 'NEGATIVE CONTROL: the wiring check fails without the fit class', ! str_contains( str_replace( 'sgs_choice_flow_fit_class( $attributes )', '', $render ), 'sgs_choice_flow_fit_class( $attributes )' ) );

echo $fail ? "\n{$fail} FAILED\n" : "\nAll passed\n";
exit( $fail ? 1 : 0 );
