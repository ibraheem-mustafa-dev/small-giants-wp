<?php
/**
 * Standalone runner for ShopLoadMoreButtonTest: prints what `SGS\Theme\shop_load_more_preset_css()` returns for a site's
 * theme settings, in a clean process.
 *
 * Usage: php run-shop-load-more-preset-standalone.php <case.json>
 * Case: { "settings": { "custom": {...} }, "plugin": bool } (`plugin` false leaves the blocks plugin's button helpers unloaded).
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );

require dirname( __DIR__, 2 ) . '/scripts/qa/lib/wp-stubs.php';
$case = json_decode( (string) file_get_contents( $argv[1] ), true, 512, JSON_THROW_ON_ERROR );
$GLOBALS['sgs_qa_global_settings'] = (array) ( $case['settings'] ?? array() );
if ( ! empty( $case['plugin'] ) ) {
	foreach ( array( 'helpers-global-settings', 'helpers-button-preset-names', 'helpers-button-preset' ) as $file ) {
		require_once dirname( __DIR__, 2 ) . '/includes/' . $file . '.php';
	}
}
require dirname( __DIR__, 4 ) . '/theme/sgs-theme/inc/shop-load-more-settings.php';
echo json_encode( array( 'css' => \SGS\Theme\shop_load_more_preset_css() ), JSON_UNESCAPED_SLASHES );
