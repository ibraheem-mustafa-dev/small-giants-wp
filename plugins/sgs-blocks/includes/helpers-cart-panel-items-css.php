<?php
/**
 * Mini-cart panel scoped CSS for the optional item-row and footer additions: the
 * quantity stepper's look, and the settings that only print when chosen.
 *
 * Required from helpers-cart-panel-css.php. Every rule here prints nothing while its
 * setting is at its default, so a cart that never opts in renders the same CSS as before.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Scoped CSS for the quantity stepper (itemQtyStyle "stepper").
 *
 * The stepper's pill is `.sgs-cart__item-stepper`; its buttons and number inherit the
 * pill's text colour and typography, so one set of controls styles all three.
 *
 * @param array  $attributes Block attributes.
 * @param string $p          The panel selector prefix, `.{uid}.sgs-cart__panel`.
 * @return string[] CSS rule strings.
 */
function sgs_cart_qty_stepper_css( array $attributes, string $p ): array {
	if ( 'stepper' !== ( $attributes['itemQtyStyle'] ?? 'input' ) ) {
		return array();
	}
	$sel = $p . ' .sgs-cart__item-stepper';
	$css = array();

	$css[] = sgs_text_states_css( $sel, $attributes, array( 'base' => 'itemQtyColour' ) );
	$css[] = sgs_fill_states_css( $sel, $attributes, array( 'base' => 'itemQtyBg' ) );

	$border = sgs_border_element_decls(
		$attributes,
		'itemQty',
		$sel,
		array(
			'colour' => array( 'base' => 'itemQtyBorderColour' ),
			'radius' => false,
		)
	);
	if ( $border['base'] ) {
		$css[] = $sel . '{' . implode( ';', $border['base'] ) . ';}';
	}
	if ( $border['tablet'] ) {
		$css[] = sgs_emit_tier_decls( $sel, array( 'tablet' => $border['tablet'] ) );
	}
	if ( $border['mobile'] ) {
		$css[] = sgs_emit_tier_decls( $sel, array( 'mobile' => $border['mobile'] ) );
	}
	$css = array_merge( $css, $border['rules'] );

	if ( is_array( $attributes['itemQtyHeight'] ?? null ) && array() !== $attributes['itemQtyHeight'] ) {
		$css[] = sgs_emit_responsive_css(
			$sel,
			array(
				array(
					'value'        => $attributes['itemQtyHeight'],
					'css'          => '--sgs-cart-qty-height',
					'unit_default' => 'px',
				),
			)
		);
	}

	return array_values( array_filter( $css ) );
}

/**
 * Scoped CSS for the "View cart" button or link: its text colour at rest and on hover or keyboard focus.
 * Its typography prints through the panel's shared typography loop, and the stacked layout and the link
 * look are stylesheet classes the markup carries (`sgs-cart__panel-view--link`, `sgs-cart__panel-actions--stacked`).
 *
 * @param array  $attributes Block attributes.
 * @param string $p          The panel selector prefix, `.{uid}.sgs-cart__panel`.
 * @return string[] CSS rule strings.
 */
function sgs_cart_view_cart_css( array $attributes, string $p ): array {
	return array_values(
		array_filter(
			array(
				sgs_text_states_css(
					$p . ' .sgs-cart__panel-view',
					$attributes,
					array(
						'base'  => 'panelViewColour',
						'hover' => 'panelViewColourHover',
					)
				),
			)
		)
	);
}
