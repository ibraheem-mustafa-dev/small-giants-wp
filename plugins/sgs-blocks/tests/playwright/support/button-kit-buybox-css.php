<?php
/**
 * Prints the CSS the buy box prints for its two built-in buttons' kit settings, for the browser check
 * (button-kit/contentAlignLift.check.mjs).
 *
 * Usage: php button-kit-buybox-css.php '<buy box attributes json>' '<global custom settings json>'
 * Output: {"css": "...", "openerClasses": "..."} where `css` is the Add to Cart's kit CSS (the call src/blocks/buybox/render.php
 * makes, under `.sgs-bb-X.wp-block-sgs-buybox`) followed by the flow opener's, and `openerClasses` is what the opener carries beside
 * `buybox__add-to-cart--flow-opener`.
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
$root_sel                          = '.sgs-bb-X.wp-block-sgs-buybox';

// Add to Cart's rules as src/blocks/buybox/render.php prints them (the one shared call).
$add_to_cart_css = sgs_buybox_add_to_cart_kit_css( $attributes, $root_sel );

echo wp_json_encode( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	array(
		'css'           => $add_to_cart_css . sgs_buybox_flow_opener_kit_css( $attributes, sgs_buybox_flow_opener_selector( $root_sel . ' ' ) ),
		'openerClasses' => sgs_buybox_flow_opener_kit_classes( $attributes ),
	)
);
