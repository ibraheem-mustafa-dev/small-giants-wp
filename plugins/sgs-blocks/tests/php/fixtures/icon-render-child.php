<?php
/**
 * Child-process renderer for IconRenderTest: renders the real src/blocks/icon/render.php with a parsed block whose
 * `linkUrl` may be bound to Site Info, the way core hands it over (the bound value already resolved into the
 * attributes), so the render's own stubs never collide with another test's.
 *
 * Input: one CLI argument, the path of a JSON spec:
 *   attributes  block attributes
 *   bind        Site Info key `linkUrl` is bound to, or ''
 *   site_info   the `sgs_site_info` option
 *   admin       is_admin()
 *   rest        a REST request
 *   context     the request's `context` query value
 *   can_edit    current_user_can( 'edit_posts' )
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

function is_admin(): bool {
	return ! empty( $GLOBALS['icon_spec']['admin'] );
}
function wp_is_serving_rest_request(): bool {
	return ! empty( $GLOBALS['icon_spec']['rest'] );
}
function current_user_can( string $cap ): bool {
	return 'edit_posts' === $cap && ! empty( $GLOBALS['icon_spec']['can_edit'] );
}
function wp_doing_ajax(): bool {
	return false;
}

$GLOBALS['icon_spec'] = $spec;
putenv( 'SGS_QA_OPTIONS=' . json_encode( array( 'sgs_site_info' => $spec['site_info'] ?? array() ) ) ); // phpcs:ignore
if ( isset( $spec['context'] ) ) {
	$_GET['context'] = (string) $spec['context'];
}

$plugin = dirname( __DIR__, 3 );
define( 'ABSPATH', $plugin . '/' );
define( 'SGS_BLOCKS_PATH', $plugin . '/' );
require_once $plugin . '/scripts/qa/lib/wp-stubs.php';
require_once $plugin . '/includes/class-sgs-site-info-binding.php';
require_once $plugin . '/includes/render-helpers.php';

$attributes = is_array( $spec['attributes'] ?? null ) ? $spec['attributes'] : array();
$bind       = (string) ( $spec['bind'] ?? '' );
$block      = array(
	'blockName' => 'sgs/icon',
	'attrs'     => $attributes,
);
if ( '' !== $bind ) {
	$block['attrs']['metadata'] = array(
		'bindings' => array(
			'linkUrl' => array(
				'source' => 'sgs/site-info',
				'args'   => array( 'key' => $bind ),
			),
		),
	);
	// What core does before render.php runs: the binding's value replaces the attribute.
	$attributes['linkUrl'] = \SGS\Blocks\Sgs_Site_Info_Binding::get_value( array( 'key' => $bind ), null, 'linkUrl' );
}
$content = '';

ob_start();
try {
	require $plugin . '/src/blocks/icon/render.php';
	$html = (string) ob_get_clean();
	echo json_encode( array( 'ok' => true, 'html' => $html ) ); // phpcs:ignore
} catch ( \Throwable $e ) {
	ob_end_clean();
	echo json_encode( array( 'ok' => false, 'error' => $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine() ) ); // phpcs:ignore
}
