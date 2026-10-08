<?php
/**
 * Standalone test: a border width with no chosen style paints SOLID, and an
 * explicit style still wins — includes/helpers-border-style.php and the real
 * emitters that read through it.
 *
 * Covers the shared helpers, sgs/container's real render.php border section
 * (the owner's report: width + colour on some sides painted nothing), the
 * button-element helper (CTA / back / close buttons) and sgs/account's card.
 *
 * Negative control: `--negative-control` defines the pre-fix resolver (an
 * unset style falls back to 'none') before the helpers load; the suite must
 * then FAIL. A normal run spawns that mode itself and fails if it passes.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-border-default-style-standalone.php
 * Exit 0 all pass, 1 any failure.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ . '/' );

$negative = in_array( '--negative-control', $argv, true );
if ( $negative ) {
	// The behaviour before the fix: anything not explicitly chosen meant no border.
	function sgs_border_style_keyword( $raw ): string {
		$allowed = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
		return in_array( $raw, $allowed, true ) ? $raw : 'none';
	}
}

function add_action() {}
function add_filter() {}
function __( $text ) {
	return $text;
}
function esc_attr( $s ) {
	return htmlspecialchars( (string) $s, ENT_QUOTES );
}
function wp_json_encode( $v ) {
	return json_encode( $v );
}
function wp_get_global_settings() {
	return array();
}
function sanitize_key( $k ) {
	return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $k ) );
}

$plugin = dirname( __DIR__, 2 );
require $plugin . '/includes/render-helpers.php';
require $plugin . '/includes/account/helpers-account-render-css.php';

$failures = 0;
$passes   = 0;
function ok( bool $cond, string $label, string $detail = '' ): void {
	global $failures, $passes;
	if ( $cond ) {
		++$passes;
		echo "PASS  {$label}\n";
	} else {
		++$failures;
		echo "FAIL  {$label}" . ( '' !== $detail ? "  => {$detail}" : '' ) . "\n";
	}
}

// 1) The resolver.
ok( 'solid' === sgs_border_style_keyword( '' ), "keyword: '' resolves to solid" );
ok( 'solid' === sgs_border_style_keyword( null ), 'keyword: null resolves to solid' );
ok( 'solid' === sgs_border_style_keyword( 'bogus;color:red' ), 'keyword: unknown value resolves to solid' );
ok( 'dashed' === sgs_border_style_keyword( 'dashed' ), 'keyword: explicit dashed kept' );
ok( 'none' === sgs_border_style_keyword( 'none' ), 'keyword: explicit none kept' );

// 2) The shared box emitter.
$two_sides = array( 'top' => '4px', 'left' => '4px' );
$decls     = sgs_border_box_decls( $two_sides, '' );
ok( array( 'border-style:solid', 'border-width:4px 0 0 4px' ) === $decls, 'box: width-only on two sides paints solid, other sides 0', implode( ';', $decls ) );
$decls = sgs_border_box_decls( $two_sides, 'dashed' );
ok( array( 'border-style:dashed', 'border-width:4px 0 0 4px' ) === $decls, 'box: explicit dashed wins', implode( ';', $decls ) );
ok( array() === sgs_border_box_decls( $two_sides, 'none' ), 'box: explicit none paints nothing' );
ok( array() === sgs_border_box_decls( array(), 'dashed' ), 'box: no width paints nothing (G5)' );
ok( array() === sgs_border_box_decls( array( 'top' => array( 'x' ) ), '' ), 'box: malformed side ignored' );

// 3) sgs/container's real render.php border section, sliced between its own
// section markers and run with the attribute shape SgsBorderControl writes:
// borderWidth {top,left} + borderColour, borderStyle left at its '' default.
$src   = (string) file_get_contents( $plugin . '/src/blocks/container/render.php' );
$start = strpos( $src, '// ── Wrapper border' );
$end   = strpos( $src, '// ── Text align' );
ok( false !== $start && false !== $end, 'container: border section markers found' );
$segment = substr( $src, (int) $start, (int) $end - (int) $start );
$run_container = static function ( array $attributes ) use ( $segment ): string {
	$sgs_container_supports_uid     = 'sgs-cst-test';
	$sgs_container_supports_classes = array();
	$sgs_container_supports_css     = '';
	eval( $segment ); // Real shipped code, sliced verbatim.
	return $sgs_container_supports_css;
};
$css = $run_container( array( 'borderWidth' => $two_sides, 'borderColour' => '#ff0000', 'borderStyle' => '' ) );
echo "      container default style => {$css}\n";
ok( false !== strpos( $css, 'border-style:solid;border-width:4px 0 0 4px' ), 'container: width + colour with default style paints solid', $css );
ok( false !== strpos( $css, 'border-color:#ff0000' ), 'container: colour emitted', $css );
$css = $run_container( array( 'borderWidth' => $two_sides, 'borderColour' => '#ff0000', 'borderStyle' => 'dashed' ) );
echo "      container dashed        => {$css}\n";
ok( false !== strpos( $css, 'border-style:dashed' ), 'container: explicit dashed wins', $css );
$css = $run_container( array( 'borderWidth' => array(), 'borderColour' => '#ff0000', 'borderStyle' => '' ) );
ok( false === strpos( $css, 'border-width' ) && false === strpos( $css, 'border-style' ), 'container: no width emits no width and no style (no border paints)', $css );
ok( false !== strpos( $css, 'border-color:#ff0000' ), 'container: a colour set without a width still prints, for a variant stylesheet border to take', $css );

// 4) Button-element helper (product-card CTA, choice-flow back, modal close …).
$cta = sgs_button_element_style_css( array( 'ctaBorderWidth' => array( 'bottom' => '3px' ), 'ctaBorderStyle' => '' ), 'cta', '.x' );
ok( false !== strpos( $cta, 'border-style:solid' ), 'button-element: width with no style paints solid', $cta );
$cta = sgs_button_element_style_css( array( 'ctaBorderWidth' => array( 'bottom' => '3px' ), 'ctaBorderStyle' => 'dotted' ), 'cta', '.x' );
ok( false !== strpos( $cta, 'border-style:dotted' ), 'button-element: explicit dotted wins', $cta );

// 5) sgs/account card border.
$card = sgs_account_card_border_shape_css( array( 'cardBorderWidth' => array( 'top' => '2px' ), 'cardBorderStyle' => '' ), '.c' );
ok( '.c{border-style:solid;border-width:2px 0 0 0;}' === $card, 'account: width with no style paints solid', $card );

echo "\n{$passes} passed, {$failures} failed" . ( $negative ? ' (negative-control mode)' : '' ) . "\n";

if ( ! $negative ) {
	$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __FILE__ ) . ' --negative-control';
	exec( $cmd, $out, $code );
	if ( 0 === $code ) {
		echo "FAIL  negative control: the suite still passed with the pre-fix resolver — it cannot detect the bug\n";
		exit( 1 );
	}
	echo "PASS  negative control: the pre-fix resolver turns the suite red (exit {$code})\n";
}

exit( $failures > 0 ? 1 : 0 );
