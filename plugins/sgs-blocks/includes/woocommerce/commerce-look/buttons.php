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

/**
 * The button rules for one block.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text; '' when no button setting is set.
 */
function sgs_commerce_look_button_css( array $attrs, string $block, string $root ): string {
	$button = sgs_commerce_look_selector( 'button_primary', $block, $root );
	if ( '' === $button ) {
		return '';
	}
	return sgs_commerce_look_button_edge_css( $attrs, $button ) . sgs_emit_responsive_css(
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
