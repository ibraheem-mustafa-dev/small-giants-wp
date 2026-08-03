<?php
/**
 * Standalone render test for sgs/mega-aside — box-object `asideBorderWidth`
 * conversion proof (box-object interface contract, `.claude/plans/2026-07-09-
 * box-object-interface-contract.md`).
 *
 * phpcs:disable -- WPCS production rules do not apply to this CLI test harness.
 *
 * Bootstraps the REAL src render.php (which pulls in the REAL render-helpers.php
 * chain, including the real sgs_box_object_shorthand/sgs_css_length_sanitise) behind
 * a minimal WordPress-function stub set, then asserts a DISTINCT value per side
 * actually reaches the emitted scoped CSS as 4 distinct declarations — proving the
 * object shape round-trips through render.php, not just that the build is green.
 *
 * Run from repo root:
 *   php plugins/sgs-blocks/scripts/tests/test-mega-aside-border-render.php
 *
 * Exit 0 = all pass (GREEN). Exit 1 = failures (RED).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

// ---------------------------------------------------------------------------
// Minimal WordPress-function stubs (only what the mega-aside render path +
// its render-helpers.php chain touch).
// ---------------------------------------------------------------------------
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
}
if ( ! function_exists( '__' ) ) {
	function __( $t, $d = 'default' ) { return $t; }
}
if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( $t ) { return trim( (string) $t ); }
}
if ( ! function_exists( 'sanitize_html_class' ) ) {
	function sanitize_html_class( $t ) { return preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $t ); }
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $d ) { return json_encode( $d ); }
}
if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	function wp_strip_all_tags( $t ) { return strip_tags( (string) $t ); }
}
if ( ! function_exists( 'get_block_wrapper_attributes' ) ) {
	function get_block_wrapper_attributes( $extra = array() ) {
		$parts = array();
		$cls   = 'wp-block-sgs-mega-aside' . ( ! empty( $extra['class'] ) ? ' ' . $extra['class'] : '' );
		$parts[] = 'class="' . $cls . '"';
		foreach ( $extra as $k => $v ) {
			if ( 'class' === $k ) {
				continue;
			}
			$parts[] = $k . '="' . esc_attr( (string) $v ) . '"';
		}
		return implode( ' ', $parts );
	}
}
// sgs_colour_value / sgs_css_length_sanitise / sgs_box_object_shorthand /
// sgs_emit_responsive_css come from the REAL includes/render-helpers.php chain
// required by render.php itself — not stubbed, so this proves the real helper
// code, not a test double.

// ---------------------------------------------------------------------------
// Render the block with a DISTINCT value per side (proves object shape, not
// just a uniform round-trip that a scalar-coercion bug could fake).
// ---------------------------------------------------------------------------
$attributes = array(
	'asideFormat'       => 'feature',
	'asideBg'           => '',
	'asidePadding'      => array(),
	'asideRadius'       => '',
	'asideBorderColour' => '#112233',
	'asideBorderWidth'  => array(
		'top'    => '1px',
		'right'  => '2px',
		'bottom' => '3px',
		'left'   => '4px',
	),
);
$content = '<p>child</p>';
$block   = new class {
	public $parsed_block = array( 'attrs' => array() );
};

$render_php = dirname( __DIR__, 2 ) . '/src/blocks/mega-aside/render.php';

ob_start();
require $render_php;
$html = ob_get_clean();

// ---------------------------------------------------------------------------
// Assertions — all 4 distinct side widths present as ONE shorthand decl
// (border-width:1px 2px 3px 4px, TRBL order per sgs_box_object_shorthand),
// plus border-style + the resolved border-colour, on the scoped selector.
// ---------------------------------------------------------------------------
$checks = array(
	'per-side shorthand "1px 2px 3px 4px" present' => ( false !== strpos( $html, 'border-width:1px 2px 3px 4px' ) ),
	'border-style:solid present'                    => ( false !== strpos( $html, 'border-style:solid' ) ),
	'border-color uses resolved colour #112233'     => ( false !== strpos( $html, 'border-color:#112233' ) ),
	'no old shorthand "border:" 3-value form leaked' => ( false === strpos( $html, 'border:1px' ) ),
);

$fail = 0;
echo "---- rendered output ----\n" . $html . "\n-------------------------\n";
foreach ( $checks as $label => $ok ) {
	echo ( $ok ? '[PASS] ' : '[FAIL] ' ) . $label . "\n";
	if ( ! $ok ) {
		$fail++;
	}
}

// ---------------------------------------------------------------------------
// Second pass: all-zero default → NO border declaration at all (honest-
// absence contract preserved from the pre-conversion scalar behaviour).
// ---------------------------------------------------------------------------
$attributes['asideBorderWidth'] = array(
	'top'    => '0px',
	'right'  => '0px',
	'bottom' => '0px',
	'left'   => '0px',
);
ob_start();
require $render_php;
$html_zero = ob_get_clean();
$zero_ok   = ( false === strpos( $html_zero, 'border-width:' ) );
echo ( $zero_ok ? '[PASS] ' : '[FAIL] ' ) . "all-zero default emits NO border-width declaration\n";
if ( ! $zero_ok ) {
	$fail++;
}

echo "\n" . ( 0 === $fail ? 'ALL PASS' : $fail . ' FAILURE(S)' ) . "\n";
exit( 0 === $fail ? 0 : 1 );
