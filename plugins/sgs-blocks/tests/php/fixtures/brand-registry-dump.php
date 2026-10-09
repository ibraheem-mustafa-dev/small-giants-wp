<?php
/**
 * Prints what the PHP side derives from the brand registry, for tests/js/brand-registry-parity.test.js to compare
 * with the editor's twins: the registry as read, each brand's paint (D5), accessible names and the length
 * allowlist for a fixed set of inputs (read as JSON from argv[1]).
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
	'registry' => array(),
	'paint'    => array(),
	'names'    => array(),
	'lengths'  => array(),
);
foreach ( sgs_brand_registry() as $slug => $brand ) {
	$out['registry'][] = array(
		'slug'        => $slug,
		'label'       => $brand['label'],
		'siteInfoKey' => $brand['siteInfoKey'],
		'autoLabel'   => $brand['autoLabel'],
		'colour'      => $brand['colour'],
		'logoGradient' => $brand['logoGradient'],
		'groundGradient' => $brand['groundGradient'],
	);
	$out['paint'][ $slug ] = array(
		'plain' => sgs_brand_paint( $brand, false ),
		'fixed' => sgs_brand_paint( $brand, true ),
		'glyph' => sgs_brand_paint( $brand, false, 'brand-glyph' ),
		'glyphFixed' => sgs_brand_paint( $brand, true, 'brand-glyph' ),
		'hold' => sgs_brand_paint_hold( sgs_brand_paint( $brand, false ) ),
	);
}
foreach ( (array) ( $input['names'] ?? array() ) as $case ) {
	$glyph           = '' !== (string) ( $case['glyph'] ?? '' ) ? sgs_brand_by_slug( (string) $case['glyph'] ) : null;
	$out['names'][] = sgs_icon_accessible_name( (string) ( $case['ariaLabel'] ?? '' ), (string) ( $case['boundKey'] ?? '' ), $glyph, (string) ( $case['url'] ?? '' ) );
}
foreach ( (array) ( $input['lengths'] ?? array() ) as $raw ) {
	$out['lengths'][] = sgs_icon_length_value( $raw, 512 );
}
echo json_encode( $out ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode
