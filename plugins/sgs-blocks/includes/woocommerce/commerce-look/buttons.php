<?php
/**
 * Cart and Checkout look: the primary button's height, padding and edge (its type is a text group, typography.php).
 *
 * The button is the one the theme's woocommerce.css paints from the primary button preset (Proceed to checkout on the
 * cart, Place order on the checkout); these settings override the preset on that block only.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/selectors.php';
require_once __DIR__ . '/cards.php';
require_once dirname( __DIR__, 2 ) . '/helpers-button-preset.php';

/**
 * The button rules for one block.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text: the button's preset motion and the set edge, height and padding; '' when no `sgsButton*` setting is set.
 */
function sgs_commerce_look_button_css( array $attrs, string $block, string $root ): string {
	$button = sgs_commerce_look_selector( 'button_primary', $block, $root );
	if ( '' === $button || ! sgs_commerce_look_has_any( $attrs, array( 'sgsButton' ) ) ) {
		return '';
	}
	return sgs_button_preset_css( $button, 'primary', false ) . sgs_commerce_look_button_edge_css( $attrs, $button ) . sgs_emit_responsive_css(
		$button,
		array(
			array(
				'value'        => $attrs['sgsButtonMinHeight'] ?? null,
				'css'          => 'min-height',
				'unit_default' => 'px',
			),
			array(
				'value'        => $attrs['sgsButtonPadding'] ?? null,
				'css'          => 'padding',
				'box'          => true,
				'unit_default' => 'px',
			),
		)
	);
}
