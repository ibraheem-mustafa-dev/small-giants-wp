<?php
/**
 * Child-process renderer for MegaAsideBlockLinkTest: renders the real src/blocks/mega-aside/render.php, then runs the
 * block-link filter over the output the way core's `render_block` does.
 *
 * Input: one CLI argument, the path of a JSON spec: `attributes` (block attributes), `content` (the inner blocks' HTML).
 * Output: JSON { ok, html, error }.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals -- CLI test child, not shipped code.

$spec = json_decode( (string) file_get_contents( $argv[1] ?? '' ), true );
if ( ! is_array( $spec ) ) {
	echo json_encode( array( 'ok' => false, 'error' => 'bad spec' ) ); // phpcs:ignore
	exit( 1 );
}

if ( ! function_exists( 'untrailingslashit' ) ) {
	function untrailingslashit( $value ) {
		return rtrim( (string) $value, '/' );
	}
}

$plugin = dirname( __DIR__, 3 );
define( 'ABSPATH', $plugin . '/' );
define( 'SGS_BLOCKS_PATH', $plugin . '/' );
require_once $plugin . '/scripts/qa/lib/wp-stubs.php';
require_once $plugin . '/includes/render-helpers.php';
require_once $plugin . '/includes/hover-effects/block-link.php';

$attributes = is_array( $spec['attributes'] ?? null ) ? $spec['attributes'] : array();
$content    = (string) ( $spec['content'] ?? '' );

ob_start();
try {
	require $plugin . '/src/blocks/mega-aside/render.php';
	$html = (string) ob_get_clean();
	$html = \SGS\Blocks\inject_block_link( $html, array( 'blockName' => 'sgs/mega-aside', 'attrs' => $attributes ) );
	echo json_encode( array( 'ok' => true, 'html' => $html ) ); // phpcs:ignore
} catch ( \Throwable $e ) {
	ob_end_clean();
	echo json_encode( array( 'ok' => false, 'error' => $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine() ) ); // phpcs:ignore
}
