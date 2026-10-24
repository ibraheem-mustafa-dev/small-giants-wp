<?php
/**
 * Standalone test: a header or footer row can retime or switch off its scroll animations (Track R r3-trans, item 4).
 *
 * `header-behaviours.css` gives `.is-row-collapse-mode` (the scroll-hide collapse) and `.is-row-shrink-active` a fixed
 * 200ms transition. `rowShrinkDuration` and `rowShrinkEasing` retime both, `rowAnimate` off removes both (and zeroes the
 * timing the logo and shrinking headings read), and the defaults print nothing, so the stylesheet's 200ms stands.
 * Runs the REAL `sgs_row_shrink_settings_css()`. Negative controls: the defaults, and `rowAnimate` true.
 *
 * Usage: php plugins/sgs-blocks/tests/php/run-row-animate-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );

require_once dirname( __DIR__, 2 ) . '/includes/helpers-row-behaviour.php';

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};
$sel = '.uid';

$default = sgs_row_shrink_settings_css( $sel, array() );
$check( '' === $default, 'negative control: no setting prints nothing, so the stylesheet 200ms stands (got: ' . $default . ')' );

$explicit = sgs_row_shrink_settings_css( $sel, array( 'rowAnimate' => true ) );
$check( '' === $explicit, 'negative control: rowAnimate true prints nothing' );

$timed = sgs_row_shrink_settings_css( $sel, array( 'rowShrinkDuration' => 400 ) );
$check( str_contains( $timed, '.uid.is-row-collapse-mode{transition:background-color 400ms' ) && str_contains( $timed, 'block-size 400ms' ), 'a duration retimes the scroll-hide collapse (got: ' . $timed . ')' );
$check( str_contains( $timed, '.uid.is-row-shrink-active{transition:background-color 400ms' ), 'and the shrink' );

$curve = sgs_row_shrink_settings_css( $sel, array( 'rowShrinkEasing' => 'linear' ) );
$check( str_contains( $curve, '.uid.is-row-collapse-mode{transition:background-color 200ms linear' ), 'a curve alone keeps 200ms and retimes the collapse (got: ' . $curve . ')' );

$off = sgs_row_shrink_settings_css( $sel, array( 'rowAnimate' => false, 'rowShrinkDuration' => 400 ) );
$check( str_contains( $off, '.uid.is-row-collapse-mode' ) && str_contains( $off, '{transition:none;}' ), 'rowAnimate off removes the collapse and shrink transitions (got: ' . $off . ')' );
$check( str_contains( $off, '--sgs-row-shrink-duration:0ms' ), 'and zeroes the timing the logo and headings read' );
$check( ! str_contains( $off, '400ms' ), 'off wins over a stored duration' );

echo "RESULT {$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );
