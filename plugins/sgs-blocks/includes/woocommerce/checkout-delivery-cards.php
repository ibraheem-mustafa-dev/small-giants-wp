<?php
/**
 * Checkout delivery cards: hands `assets/js/checkout-delivery-cards.js` to pages that render the Checkout block.
 *
 * With WooCommerce's block Local pickup on, the Checkout block draws a Ship / Collect toggle; the script gives each
 * option its price and description and folds the step that repeats it (see the script). Two optional wording keys of the
 * block's `sgsCheckoutStrings` attribute: `shipLabel` renames the toggle's "Ship" option (a client-side translation
 * filter, added before the block mounts) and `collectionLabel` and `deliveryLabel` are the order summary's delivery line while Collect or
 * Ship is chosen. A site without the toggle sees no change.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\sgs_checkout_delivery_cards_inject', 14, 2 );

/**
 * Plain text of one wording key.
 *
 * @param array<string, mixed> $attrs Block attributes.
 * @param string               $key   Key of `sgsCheckoutStrings`.
 * @return string '' when unset.
 */
function sgs_checkout_delivery_cards_text( array $attrs, string $key ): string {
	$strings = is_array( $attrs['sgsCheckoutStrings'] ?? null ) ? $attrs['sgsCheckoutStrings'] : array();
	return isset( $strings[ $key ] ) && is_scalar( $strings[ $key ] ) ? trim( sanitize_text_field( (string) $strings[ $key ] ) ) : '';
}

/**
 * The script that renames the toggle's "Ship" option.
 *
 * @param string $label Client's text.
 * @return string JavaScript, '' when the label is empty.
 */
function sgs_checkout_delivery_cards_ship_script( string $label ): string {
	if ( '' === $label ) {
		return '';
	}
	$json = wp_json_encode( $label, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE );
	return 'if ( ! window.sgsShipLabelApplied && window.wp && window.wp.hooks ) { window.sgsShipLabelApplied = true; '
		. 'window.wp.hooks.addFilter( "i18n.gettext_woocommerce", "sgs/checkout-ship-label", function ( translation, text ) { '
		. 'return "Ship" === text && document.querySelector( ".wp-block-woocommerce-checkout" ) ? ' . $json . ' : translation; } ); }';
}

/**
 * Render-block filter: enqueue the script when the Checkout block renders.
 *
 * @param mixed $block_content Rendered block HTML.
 * @param mixed $block         Parsed block.
 * @return mixed
 */
function sgs_checkout_delivery_cards_inject( $block_content, $block ) {
	if ( ! is_array( $block ) || 'woocommerce/checkout' !== ( $block['blockName'] ?? '' ) ) {
		return $block_content;
	}
	if ( ! defined( 'SGS_BLOCKS_PATH' ) || ! defined( 'SGS_BLOCKS_URL' ) ) {
		return $block_content;
	}
	$file = SGS_BLOCKS_PATH . 'assets/js/checkout-delivery-cards.js';
	if ( ! file_exists( $file ) ) {
		return $block_content;
	}
	$attrs = is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();
	if ( ! wp_script_is( 'sgs-checkout-delivery-cards', 'registered' ) ) {
		wp_register_script( 'sgs-checkout-delivery-cards', SGS_BLOCKS_URL . 'assets/js/checkout-delivery-cards.js', array( 'wp-data', 'wp-i18n' ), (string) filemtime( $file ), true );
		$config = array(
			/* translators: %s is the pickup address. */
			'collectFrom'     => __( 'Collect from %s', 'sgs-blocks' ),
			'collectionLabel' => sgs_checkout_delivery_cards_text( $attrs, 'collectionLabel' ),
			'deliveryLabel'   => sgs_checkout_delivery_cards_text( $attrs, 'deliveryLabel' ),
		);
		wp_add_inline_script(
			'sgs-checkout-delivery-cards',
			'window.sgsDeliveryCards = ' . wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE ) . ';',
			'before'
		);
	}
	wp_enqueue_script( 'sgs-checkout-delivery-cards' );
	$ship = sgs_checkout_delivery_cards_ship_script( sgs_checkout_delivery_cards_text( $attrs, 'shipLabel' ) );
	if ( '' !== $ship ) {
		if ( ! wp_script_is( 'wp-i18n', 'done' ) ) {
			wp_add_inline_script( 'wp-i18n', $ship, 'after' );
		} else {
			wp_add_inline_script( 'sgs-checkout-delivery-cards', $ship, 'before' );
		}
	}
	return $block_content;
}
