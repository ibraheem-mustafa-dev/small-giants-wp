<?php
/**
 * Standalone render test for the sgs/media block — converged native-attr styling.
 *
 * phpcs:disable -- WPCS production rules do not apply to this CLI test harness.
 *
 * Bootstraps the REAL src render.php (which pulls in the real render-helpers.php
 * chain) behind a minimal WordPress-function stub set, then asserts the naked
 * <img> render emits the native styling attributes correctly:
 *   - max-height:440px           (unit-embedded string, D1 — was dropped by is_numeric)
 *   - @media(max-width:767px) max-height:380px  (D3 mobile breakpoint 767, was 599)
 *   - border-radius:16px on the <img>           (D2 — native style.border.radius, was unread)
 *
 * Run from repo root:
 *   php plugins/sgs-blocks/scripts/tests/test-media-render.php
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
// Minimal WordPress-function stubs (only what the naked-image path touches).
// ---------------------------------------------------------------------------
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $u ) { return (string) $u; }
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
}
if ( ! function_exists( '__' ) ) {
	function __( $t, $d = 'default' ) { return $t; }
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $v ) { return abs( (int) $v ); }
}
if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( $t ) { return trim( (string) $t ); }
}
if ( ! function_exists( 'tag_escape' ) ) {
	function tag_escape( $t ) { return preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) $t ); }
}
if ( ! function_exists( 'wp_kses_post' ) ) {
	function wp_kses_post( $t ) { return (string) $t; }
}
if ( ! function_exists( 'wp_kses' ) ) {
	function wp_kses( $t, $a = array() ) { return (string) $t; }
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $d ) { return json_encode( $d ); }
}
if ( ! function_exists( 'wp_get_attachment_image_src' ) ) {
	function wp_get_attachment_image_src( $id, $s = 'full' ) { return false; }
}
if ( ! function_exists( 'wp_get_attachment_image_srcset' ) ) {
	function wp_get_attachment_image_srcset( $id, $s = 'full' ) { return false; }
}
if ( ! function_exists( 'wp_get_attachment_image_sizes' ) ) {
	function wp_get_attachment_image_sizes( $id, $s = 'full' ) { return false; }
}
if ( ! function_exists( 'wp_get_attachment_url' ) ) {
	function wp_get_attachment_url( $id ) { return ''; }
}
if ( ! function_exists( 'get_post_mime_type' ) ) {
	function get_post_mime_type( $id ) { return ''; }
}
if ( ! function_exists( 'wp_parse_url' ) ) {
	function wp_parse_url( $u, $c = -1 ) { return parse_url( $u, $c ); }
}
if ( ! function_exists( 'get_block_wrapper_attributes' ) ) {
	function get_block_wrapper_attributes( $extra = array() ) {
		$parts = array();
		$cls   = 'wp-block-sgs-media' . ( ! empty( $extra['class'] ) ? ' ' . $extra['class'] : '' );
		$parts[] = 'class="' . $cls . '"';
		if ( ! empty( $extra['id'] ) ) {
			$parts[] = 'id="' . $extra['id'] . '"';
		}
		if ( ! empty( $extra['style'] ) ) {
			$parts[] = 'style="' . $extra['style'] . '"';
		}
		return implode( ' ', $parts );
	}
}

// ---------------------------------------------------------------------------
// Render the block.
// ---------------------------------------------------------------------------
$attributes = array(
	'mediaType'       => 'image',
	'imageUrl'        => 'x.jpg',
	'imageAlt'        => 'a',
	'maxHeight'       => '440px',
	'maxHeightMobile' => '380px',
	'style'           => array( 'border' => array( 'radius' => '16px' ) ),
	'objectFit'       => 'cover',
);
$content = '';
$block   = new class {
	public $parsed_block = array( 'attrs' => array() );
};

$render_php = dirname( __DIR__, 2 ) . '/src/blocks/media/render.php';

ob_start();
require $render_php;
$html = ob_get_clean();

// ---------------------------------------------------------------------------
// Assertions.
// ---------------------------------------------------------------------------
$checks = array(
	'D1 base max-height:440px present'          => ( false !== strpos( $html, 'max-height:440px' ) ),
	'D3 mobile breakpoint @media(max-width:767px)' => ( false !== strpos( $html, '@media(max-width:767px)' ) ),
	'D3 mobile max-height:380px present'        => ( false !== strpos( $html, 'max-height:380px' ) ),
	'D2 border-radius:16px present (native style.border.radius)' => ( false !== strpos( $html, 'border-radius:16px' ) ),
	'no legacy 599px breakpoint'                => ( false === strpos( $html, '599px' ) ),
);

$fail = 0;
echo "---- rendered output ----\n" . $html . "\n-------------------------\n";
foreach ( $checks as $label => $ok ) {
	echo ( $ok ? '[PASS] ' : '[FAIL] ' ) . $label . "\n";
	if ( ! $ok ) {
		$fail++;
	}
}
echo "\n" . ( 0 === $fail ? 'ALL PASS' : $fail . ' FAILURE(S)' ) . "\n";
exit( 0 === $fail ? 0 : 1 );
