<?php
/**
 * Prints the CSS the buy box prints for its flow opener's kit settings, for the browser check (button-kit/openerHover.check.mjs).
 *
 * Usage: php button-kit-opener-css.php '<flowOpener* attributes json>' '<global custom settings json>'
 * Output: {"css": "...", "classes": "..."} where `classes` is what the opener carries beside `buybox__add-to-cart--flow-opener`.
 */

define( 'ABSPATH', dirname( __DIR__, 3 ) . '/' );
define( 'SGS_BLOCKS_PATH', ABSPATH );
define( 'SGS_BLOCKS_VERSION', 't' );
require ABSPATH . 'scripts/qa/lib/wp-stubs.php';
require ABSPATH . 'includes/render-helpers.php';
require_once ABSPATH . 'includes/helpers-button-preset.php';
require_once ABSPATH . 'includes/helpers-button-style.php';
require_once ABSPATH . 'includes/buybox-linked-flow.php';

$GLOBALS['sgs_qa_global_settings'] = json_decode( $argv[2] ?? '{}', true );
$attributes                        = json_decode( $argv[1] ?? '{}', true );

echo wp_json_encode( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	array(
		'css'     => sgs_buybox_flow_opener_kit_css( $attributes, sgs_buybox_flow_opener_selector( '.sgs-bb-X.wp-block-sgs-buybox ' ) ),
		'classes' => sgs_buybox_flow_opener_kit_classes( $attributes ),
	)
);
