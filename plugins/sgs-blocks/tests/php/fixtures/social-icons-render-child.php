<?php
/**
 * Child-process renderer for SocialIconsRenderTest: renders a real sgs/social-icons row the way core does. Each
 * sgs/icon child gets the block context social-icons/block.json::providesContext names (the row's attributes with
 * the block.json defaults applied), renders through the real src/blocks/icon/render.php, and the row's
 * src/blocks/social-icons/render.php then wraps the concatenated children.
 *
 * Input: one CLI argument, the path of a JSON spec:
 *   attributes  the row's stored attributes
 *   children    list of { attributes, bind } (bind: the Site Info key linkUrl is bound to, or '')
 *   site_info   the `sgs_site_info` option
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
	return false;
}
function wp_is_serving_rest_request(): bool {
	return false;
}
function current_user_can( string $cap ): bool {
	return false;
}
function wp_doing_ajax(): bool {
	return false;
}

/**
 * The two properties of core's WP_Block that the icon and row renders read.
 */
final class WP_Block {
	/** @var array */
	public $parsed_block = array();
	/** @var array */
	public $context = array();
}

putenv( 'SGS_QA_OPTIONS=' . json_encode( array( 'sgs_site_info' => $spec['site_info'] ?? array() ) ) ); // phpcs:ignore

$plugin = dirname( __DIR__, 3 );
define( 'ABSPATH', $plugin . '/' );
define( 'SGS_BLOCKS_PATH', $plugin . '/' );
require_once $plugin . '/scripts/qa/lib/wp-stubs.php';
require_once $plugin . '/includes/class-sgs-site-info-binding.php';
require_once $plugin . '/includes/render-helpers.php';

$row_meta = json_decode( (string) file_get_contents( $plugin . '/src/blocks/social-icons/block.json' ), true );
$row_attr = is_array( $spec['attributes'] ?? null ) ? $spec['attributes'] : array();
foreach ( $row_meta['attributes'] as $name => $schema ) {
	if ( ! array_key_exists( $name, $row_attr ) && array_key_exists( 'default', $schema ) ) {
		$row_attr[ $name ] = $schema['default'];
	}
}
$context = array();
foreach ( $row_meta['providesContext'] as $context_name => $attr_name ) {
	if ( array_key_exists( $attr_name, $row_attr ) ) {
		$context[ $context_name ] = $row_attr[ $attr_name ];
	}
}

try {
	$inner = '';
	foreach ( (array) ( $spec['children'] ?? array() ) as $child ) {
		$attributes = is_array( $child['attributes'] ?? null ) ? $child['attributes'] : array();
		$bind       = (string) ( $child['bind'] ?? '' );
		$parsed     = array(
			'blockName' => 'sgs/icon',
			'attrs'     => $attributes,
		);
		if ( '' !== $bind ) {
			$parsed['attrs']['metadata'] = array(
				'bindings' => array(
					'linkUrl' => array(
						'source' => 'sgs/site-info',
						'args'   => array( 'key' => $bind ),
					),
				),
			);
			$attributes['linkUrl'] = \SGS\Blocks\Sgs_Site_Info_Binding::get_value( array( 'key' => $bind ), null, 'linkUrl' );
		}
		$block               = new WP_Block();
		$block->parsed_block = $parsed;
		$block->context      = $context;
		$content             = '';
		ob_start();
		require $plugin . '/src/blocks/icon/render.php';
		$inner .= "\n" . (string) ob_get_clean() . "\n";
	}

	$attributes = $row_attr;
	$content    = $inner;
	$block      = array(
		'blockName' => 'sgs/social-icons',
		'attrs'     => $spec['attributes'] ?? array(),
	);
	ob_start();
	require $plugin . '/src/blocks/social-icons/render.php';
	$html = (string) ob_get_clean();
	echo json_encode( array( 'ok' => true, 'html' => $html ) ); // phpcs:ignore
} catch ( \Throwable $e ) {
	while ( ob_get_level() > 0 ) {
		ob_end_clean();
	}
	echo json_encode( array( 'ok' => false, 'error' => $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine() ) ); // phpcs:ignore
}
