<?php
/**
 * Standalone runner for SpacingSweepTest: runs scripts/lib/spacing-sweep.php in a clean process.
 *
 * Usage: php run-spacing-sweep-standalone.php <cases.json>
 * Each case: { "fn": "attrs" | "content", "attrs": {...}, "content": "...", "blocks": [...] }.
 * Output: one JSON object of results by case name. `serialize_block_attributes` is the core function's own body (blocks.php).
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );

require dirname( __DIR__, 2 ) . '/scripts/lib/spacing-sweep.php';

if ( ! function_exists( 'serialize_block_attributes' ) ) {
	function serialize_block_attributes( $block_attributes ) {
		$encoded = json_encode( $block_attributes, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		$encoded = preg_replace( '/--/', '\\u002d\\u002d', $encoded );
		$encoded = preg_replace( '/</', '\\u003c', $encoded );
		$encoded = preg_replace( '/>/', '\\u003e', $encoded );
		$encoded = preg_replace( '/&/', '\\u0026', $encoded );
		return preg_replace( '/\\\\"/', '\\u0022', $encoded );
	}
}

$cases = json_decode( (string) file_get_contents( $argv[1] ), true, 512, JSON_THROW_ON_ERROR );
$out   = array();
foreach ( $cases as $name => $case ) {
	if ( 'attrs' === $case['fn'] ) {
		$out[ $name ] = sgs_spacing_sweep_attrs( (array) $case['attrs'] );
	} else {
		$out[ $name ] = sgs_spacing_sweep_content( $case['content'], $case['blocks'] );
	}
}
echo json_encode( $out );
