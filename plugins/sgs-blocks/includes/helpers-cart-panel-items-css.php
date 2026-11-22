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

/**
 * Scoped CSS for the note under the subtotal (its colour; its typography prints through the panel's shared
 * typography loop) and the free-delivery band (fill, border, padding).
 *
 * The band's border is the shared border assembler over a width box, so a client sets only the bottom width for a
 * line under the band. Nothing set prints nothing.
 *
 * @param array  $attributes Block attributes.
 * @param string $p          The panel selector prefix, `.{uid}.sgs-cart__panel`.
 * @return string[] CSS rule strings.
 */
function sgs_cart_footer_band_css( array $attributes, string $p ): array {
	$css   = array();
	$css[] = sgs_text_states_css( $p . ' .sgs-cart__panel-tax-note', $attributes, array( 'base' => 'panelTaxNoteColour' ) );

	$band  = $p . ' .sgs-cart__free-delivery';
	$css[] = sgs_fill_states_css( $band, $attributes, array( 'base' => 'freeDeliveryBandBg' ) );

	$border = sgs_border_element_decls(
		$attributes,
		'freeDeliveryBand',
		$band,
		array(
			'colour' => array( 'base' => 'freeDeliveryBandBorderColour' ),
			'radius' => false,
		)
	);
	if ( $border['base'] ) {
		$css[] = $band . '{' . implode( ';', $border['base'] ) . ';}';
	}
	if ( $border['tablet'] ) {
		$css[] = sgs_emit_tier_decls( $band, array( 'tablet' => $border['tablet'] ) );
	}
	if ( $border['mobile'] ) {
		$css[] = sgs_emit_tier_decls( $band, array( 'mobile' => $border['mobile'] ) );
	}
	$css = array_merge( $css, $border['rules'] );

	if ( is_array( $attributes['freeDeliveryBandPadding'] ?? null ) && array() !== $attributes['freeDeliveryBandPadding'] ) {
		$css[] = sgs_emit_responsive_css(
			$band,
			array(
				array(
					'value'        => $attributes['freeDeliveryBandPadding'],
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
			)
		);
	}

	return array_values( array_filter( $css ) );
}

/**
 * Scoped CSS for the drawer's extra looks that are more than one declaration on one element: the text Remove link's
 * decoration, the empty basket's vertical place, the gift box's and gift fields' borders, the helper line's colour, and
 * the upsell button's border, fill and hover. Their sizes, paddings, radii, fills and type print through the panel's
 * shared loops (helpers-cart-panel-css.php::sgs_cart_panel_css). Nothing set prints nothing.
 *
 * @param array  $attributes Block attributes.
 * @param string $p          The panel selector prefix, `.{uid}.sgs-cart__panel`.
 * @return string[] CSS rule strings.
 */
function sgs_cart_drawer_extras_css( array $attributes, string $p ): array {
	$css = array();

	// A text decoration on the Remove link draws its own line, so the bottom border the stylesheet draws goes.
	if ( '' !== (string) ( $attributes['itemRemoveTextDecoration'] ?? '' ) ) {
		$css[] = $p . ' .sgs-cart__item-remove.sgs-cart__item-remove--text{border-bottom-width:0;}';
	}

	// Centred: the empty basket takes the free height of the item list (a flex column) above and below it.
	if ( 'center' === ( $attributes['panelEmptyPlacement'] ?? '' ) ) {
		$css[] = $p . ' .sgs-cart__panel-empty{margin-top:auto;margin-bottom:auto;}';
	}

	// The helper line is drawn faded by default; a chosen colour is drawn at full strength.
	$help = sgs_colour_value( trim( (string) ( $attributes['giftHelpColour'] ?? '' ) ) );
	if ( '' !== $help ) {
		$css[] = $p . ' .sgs-cart__panel-gift-help{color:' . $help . ';opacity:1;}';
	}

	// Borders of the gift box, both gift fields and the upsell button, each through the shared border assembler.
	$gift_box_sel = $p . ' .sgs-cart__panel-gift';
	$gift_box     = sgs_border_element_decls(
		$attributes,
		'giftBox',
		$gift_box_sel,
		array(
			'colour' => array( 'base' => 'giftBoxBorderColour' ),
			'radius' => false,
		)
	);
	$gift_field_sel = $p . ' .sgs-cart__panel-gift-to,' . $p . ' .sgs-cart__panel-gift-message';
	$gift_field     = sgs_border_element_decls(
		$attributes,
		'giftField',
		$gift_field_sel,
		array(
			'colour' => array( 'base' => 'giftFieldBorderColour' ),
			'radius' => false,
		)
	);
	$upsell_add_sel = $p . ' .sgs-cart__panel-upsell-add';
	$upsell_add     = sgs_border_element_decls(
		$attributes,
		'upsellButton',
		$upsell_add_sel,
		array(
			'colour' => array( 'base' => 'upsellButtonBorderColour' ),
			'radius' => false,
		)
	);
	foreach ( array(
		array( $gift_box_sel, $gift_box ),
		array( $gift_field_sel, $gift_field ),
		array( $upsell_add_sel, $upsell_add ),
	) as list( $sel, $border ) ) {
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
	}

	$button = $p . ' .sgs-cart__panel-upsell-add';
	$css[]  = sgs_fill_states_css(
		$button,
		$attributes,
		array(
			'base'  => 'upsellButtonBg',
			'hover' => 'upsellButtonBgHover',
		)
	);
	$css[]  = sgs_text_states_css(
		$button,
		$attributes,
		array(
			'base'  => 'upsellButtonColour',
			'hover' => 'upsellButtonColourHover',
		)
	);

	return array_values( array_filter( $css ) );
}
