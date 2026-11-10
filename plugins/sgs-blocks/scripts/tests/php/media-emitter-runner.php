<?php
/**
 * Runs the C3 emitters of the media atoms for the cases in a JSON file and prints `{ caseId: css }`. The Node parity
 * test (`scripts/tests/test-media-emitter-parity.mjs`) compares this output with the JS emitters byte for byte.
 *
 * Usage: php media-emitter-runner.php <cases.json>
 *
 * @package SGS\Blocks
 */

define( 'ABSPATH', dirname( __DIR__, 3 ) . '/' );

if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $s ) { return $s; } // phpcs:ignore
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $s ) { return $s; } // phpcs:ignore
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $s ) { return $s; } // phpcs:ignore
}
if ( ! function_exists( '__' ) ) {
	function __( $s, $d = null ) { return $s; } // phpcs:ignore
}
if ( ! function_exists( 'esc_html__' ) ) {
	function esc_html__( $s, $d = null ) { return $s; } // phpcs:ignore
}
if ( ! function_exists( '_doing_it_wrong' ) ) {
	function _doing_it_wrong( $f, $m, $v ) {} // phpcs:ignore
}

$sgs_plugin = dirname( __DIR__, 3 );
require_once $sgs_plugin . '/includes/media/media-values.php';
foreach ( glob( $sgs_plugin . '/includes/media/atoms/*.php' ) as $sgs_file ) {
	require_once $sgs_file;
}
require_once $sgs_plugin . '/includes/media/emit-none.php';
require_once $sgs_plugin . '/includes/media/render-sources.php';
require_once $sgs_plugin . '/includes/media/render-chrome.php';

$cases = json_decode( (string) file_get_contents( $argv[1] ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
$out   = array();
foreach ( $cases['cases'] as $case ) {
	$fn = 'sgs_media_atom_' . str_replace( '-', '_', $case['atom'] ) . '_emit';
	if ( ! function_exists( $fn ) ) {
		$out[ $case['id'] ] = null;
		continue;
	}
	$out[ $case['id'] ] = $fn( $case['slot'], $case['attrs'], $case['uid'], (bool) $case['helper'] );
}
// The print order the renderer uses: `render-slot.php::sgs_media_atom_emitter_ids()` sorts the defined ids.
$out['__order'] = array();
foreach ( get_defined_functions()['user'] as $sgs_fn ) {
	if ( preg_match( '/^sgs_media_atom_(.+)_emit$/', $sgs_fn, $sgs_m ) ) {
		$out['__order'][] = $sgs_m[1];
	}
}
sort( $out['__order'] );
$out['__lengths'] = array();
foreach ( $cases['lengths'] ?? array() as $i => $raw ) {
	$out['__lengths'][ $i ] = array(
		'length' => sgs_media_length( $raw, array( 'auto', 'none' ) ),
		'colour' => sgs_media_colour( $raw ),
		'gradient' => sgs_media_gradient( $raw ),
		'url'    => sgs_media_url( $raw ),
	);
}
// The helper decision (§7.3) for each case: the JS twin is `mediaPreview.js::needsHelper`.
$out['__helpers'] = array();
foreach ( $cases['helpers'] ?? array() as $case ) {
	$motion                          = $case['motion'] ?? array();
	$out['__helpers'][ $case['id'] ] = sgs_media_needs_helper(
		(string) $case['prefix'],
		$case['attrs'],
		array(
			'effects'  => $motion['effects'] ?? array(),
			'entrance' => $motion['entrance'] ?? '',
			'hover'    => array( 'scale' => $motion['hoverScale'] ?? 0 ),
		)
	);
}
echo wp_json_encode_stub( $out );

/**
 * JSON without escaping slashes or unicode, so strings compare byte for byte.
 *
 * @param mixed $value Value.
 * @return string
 */
function wp_json_encode_stub( $value ): string { // phpcs:ignore
	return (string) json_encode( $value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
}
