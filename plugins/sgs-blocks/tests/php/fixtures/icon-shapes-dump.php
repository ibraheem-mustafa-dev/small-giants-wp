<?php
/**
 * Prints what the PHP side derives from the icon shape registry, for tests/js/icon-shapes-parity.test.js to compare
 * with the editor's twins: the outlines as read, the shape list, the width-only rule, each outline's SVG, the stroke
 * for a fixed set of border inputs and the two length validators (inputs read as JSON from argv[1]).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals -- CLI test fixture, not shipped code.

$plugin = dirname( __DIR__, 3 );
define( 'ABSPATH', $plugin . '/' );
if ( ! function_exists( '__' ) ) {
	function __( string $text, string $domain = 'default' ): string { // phpcs:ignore
		return $text;
	}
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string { // phpcs:ignore
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $n ): int { // phpcs:ignore
		return abs( (int) $n );
	}
}
require_once $plugin . '/includes/helpers-icon.php';

$input = json_decode( (string) file_get_contents( $argv[1] ?? '' ), true );
$input = is_array( $input ) ? $input : array();

$out = array(
	'outlines'   => array_values( sgs_icon_outline_shapes() ),
	'slugs'      => sgs_icon_shape_slugs(),
	'width_only' => array(),
	'svg'        => array(),
	'strokes'    => array(),
	'lengths'    => array(),
	'singles'    => array(),
);
foreach ( array_merge( sgs_icon_shape_slugs(), array( 'heart', '' ) ) as $slug ) {
	$out['width_only'][ '' === $slug ? '(empty)' : $slug ] = sgs_icon_shape_width_only( $slug );
	$out['svg'][ '' === $slug ? '(empty)' : $slug ]        = sgs_icon_outline_svg( $slug, 'CLIP' );
}
foreach ( (array) ( $input['strokes'] ?? array() ) as $case ) {
	$out['strokes'][] = sgs_icon_outline_stroke( $case['box'] ?? null, $case['style'] ?? '' );
}
foreach ( (array) ( $input['lengths'] ?? array() ) as $raw ) {
	$out['lengths'][] = sgs_css_length_value( $raw );
	$out['singles'][] = sgs_css_single_length_value( $raw );
}
echo json_encode( $out ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode
